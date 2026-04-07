# auth.py — GlowAI JWT auth + user CRUD + FastAPI router
# Aloha from Pearl City!

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from config import settings
from database import User, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer()

# ── Password helpers ──────────────────────────────────────

def hash_password(plain: str) -> str:
    return _pwd.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)

# ── JWT helpers ───────────────────────────────────────────

def create_token(email: str) -> str:
    exp = datetime.utcnow() + timedelta(days=settings.access_token_expire_days)
    return jwt.encode(
        {"sub": email, "exp": exp},
        settings.secret_key,
        algorithm=settings.algorithm,
    )

def decode_token(token: str) -> str:
    """Returns email or raises HTTPException 401."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str | None = payload.get("sub")
        if not email:
            raise ValueError("no sub")
        return email
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# ── FastAPI dependency ────────────────────────────────────

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    email = decode_token(creds.credentials)
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ── Request / response models ─────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    email: str

# ── Routes ────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=req.email, hashed_pw=hash_password(req.password))
    db.add(user)
    db.commit()
    return AuthResponse(access_token=create_token(req.email), email=req.email)


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    # Constant-time check even on missing user to prevent timing attacks
    if not user or not verify_password(req.password, user.hashed_pw):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return AuthResponse(access_token=create_token(req.email), email=req.email)
