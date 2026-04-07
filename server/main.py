# main.py — GlowAI FastAPI proxy server
# Aloha from Pearl City!
#
# Run: uvicorn main:app --reload --port 8000
# The Anthropic API key never leaves this process.

import json
import re

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from auth import get_current_user, router as auth_router
from config import settings
from database import User

# ── Rate limiter ──────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ── App ───────────────────────────────────────────────────

app = FastAPI(title="GlowAI API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)

# ── Constants ─────────────────────────────────────────────

_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_VERSION = "2023-06-01"
_VISION_MODEL = "claude-opus-4-6"
_CHAT_MODEL   = "claude-sonnet-4-6"

# System prompt lives server-side — not visible to clients
_SCAN_SYSTEM = """You are GlowAI, a friendly and knowledgeable pocket esthetician. \
Your personality is calm, warm, non-shaming, and inclusive — like a trusted friend \
who happens to know a lot about skincare.

Tone rules:
- Use gentle, encouraging language. Prefer "your skin looks like it's craving hydration" \
over "you have dehydrated skin."
- Use qualifying language: "likely", "possible", "appears to be", "from what I can see."
- If photo quality is low: "I'm having trouble reading this clearly — a photo near \
natural light would help."

Safety rules (non-negotiable):
- NEVER diagnose medical conditions. Assess visible skin characteristics only.
- If concern suggests a medical issue: "That sounds like something worth showing a \
dermatologist — I'm not the right tool for this one."
- Always include a patch-test reminder for new product recommendations.
- Never recommend undiluted essential oils, lemon juice, baking soda, or known irritants.
- Include "Preliminary read — not a medical diagnosis." in your summary.

Skin language:
- No "problem skin", "bad skin", or "anti-aging" as a fear hook.
- All skin tones, genders, budgets welcome.
- Suggest budget-friendly alternatives alongside premium options.

Return ONLY valid JSON — no markdown, no explanation."""

# ── Request / response models ─────────────────────────────

class ScanRequest(BaseModel):
    image_b64:  str
    media_type: str = "image/jpeg"
    skin_type:  str = ""
    concerns:   list[str] = []

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    skin_type: str = ""

# ── Helpers ───────────────────────────────────────────────

async def _call_anthropic(payload: dict) -> dict:
    """Call Anthropic and return the raw response dict. Raises 502 on failure."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                _ANTHROPIC_URL,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": _ANTHROPIC_VERSION,
                    "content-type": "application/json",
                },
                json=payload,
            )
        if not resp.is_success:
            body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            detail = body.get("error", {}).get("message") or f"Anthropic HTTP {resp.status_code}"
            raise HTTPException(status_code=502, detail=detail)
        return resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Anthropic API timed out")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Upstream error: {e}")


def _extract_json(raw: str) -> dict:
    """Extract the first JSON object from Claude's text response."""
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise HTTPException(status_code=502, detail="AI returned unparseable response")
    try:
        return json.loads(match.group())
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"AI JSON parse error: {e}")

# ── Endpoints ─────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "GlowAI"}


@app.post("/api/scan")
@limiter.limit("10/hour")
async def scan(
    request: Request,
    body: ScanRequest,
    current_user: User = Depends(get_current_user),
):
    """Vision endpoint — analyze a skin photo. Rate-limited to 10/hour per IP."""
    # #ASSUMPTION: base64 image is JPEG, under ~4MB when decoded
    if len(body.image_b64) > 6_000_000:  # ~4.5MB decoded
        raise HTTPException(status_code=413, detail="Image too large — max ~4MB")

    skin_ctx  = f" The user's skin type is {body.skin_type}." if body.skin_type else ""
    concern_ctx = f" They mentioned these concerns: {', '.join(body.concerns)}." if body.concerns else ""

    user_text = (
        f"Look at this skin photo and give a gentle, honest read.{skin_ctx}{concern_ctx}\n\n"
        "Return ONLY this JSON:\n"
        "{\n"
        '  "skinType": "<Dry|Oily|Combination|Normal|Sensitive|Mature>",\n'
        '  "score": <0-100>,\n'
        '  "summary": "<2-3 warm sentences ending with: Preliminary read — not a medical diagnosis.>",\n'
        '  "concerns": [{"name":"<plain-English>","score":<0-100>,"explanation":"<2 gentle sentences>"}],\n'
        '  "recommendations": [{"step":1,"action":"<include budget-friendly option>","why":"<1 warm sentence>"}]\n'
        "}\n"
        "3-5 concerns, 3-5 recommendations. Return ONLY JSON."
    )

    payload = {
        "model":      _VISION_MODEL,
        "max_tokens": 1500,
        "system":     _SCAN_SYSTEM,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type":       "base64",
                        "media_type": body.media_type,
                        "data":       body.image_b64,
                    },
                },
                {"type": "text", "text": user_text},
            ],
        }],
    }

    data  = await _call_anthropic(payload)
    raw   = "".join(b["text"] for b in data.get("content", []) if b.get("type") == "text").strip()
    return _extract_json(raw)


@app.post("/api/chat")
@limiter.limit("30/hour")
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Advisor chat endpoint. Rate-limited to 30/hour per IP."""
    skin_ctx = f" The user's skin type is {body.skin_type}." if body.skin_type else ""
    system = (
        "You are GlowAI, a warm and knowledgeable pocket esthetician. "
        "Give practical, gentle skincare advice. Never diagnose medical conditions. "
        f"Always recommend a dermatologist for medical concerns.{skin_ctx}"
    )

    payload = {
        "model":      _CHAT_MODEL,
        "max_tokens": 800,
        "system":     system,
        "messages":   [m.model_dump() for m in body.messages],
    }

    data = await _call_anthropic(payload)
    text = "".join(b["text"] for b in data.get("content", []) if b.get("type") == "text").strip()
    return {"reply": text}
