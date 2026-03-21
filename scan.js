/**
 * scan.js — GlowAI Skin Scan & Results
 *
 * Handles:
 *  - Photo selection (camera capture / file picker / drag-and-drop)
 *  - Claude API call (vision if photo, text tool-call if text-only)
 *  - Parsing JSON result → results screen
 *  - Save/history management
 *  - Demo mode responses
 */

const scanModule = (() => {
  // ═══════════════════════════════════════════════
  //  PHOTO MANAGEMENT
  // ═══════════════════════════════════════════════
  let _photoDataUrl = null;

  /** Open the hidden file input (called by upload zone tap) */
  function openFilePicker() {
    const input = document.getElementById('scan-file-input');
    if (!input) return;
    input.value = '';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setPhoto(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /** Set the currently staged photo and update UI */
  function setPhoto(dataUrl) {
    _photoDataUrl = dataUrl;
    const preview = document.getElementById('scan-photo-preview');
    const img     = document.getElementById('scan-photo-img');
    const zone    = document.getElementById('scan-upload-zone');
    if (preview) preview.classList.remove('hidden');
    if (img)     img.src = dataUrl;
    if (zone)    zone.classList.add('hidden');
  }

  /** Clear staged photo */
  function clearPhoto() {
    _photoDataUrl = null;
    const preview = document.getElementById('scan-photo-preview');
    const img     = document.getElementById('scan-photo-img');
    const zone    = document.getElementById('scan-upload-zone');
    if (preview) preview.classList.add('hidden');
    if (img)     img.src = '';
    if (zone)    zone.classList.remove('hidden');
  }

  // ═══════════════════════════════════════════════
  //  SUBMIT SCAN
  // ═══════════════════════════════════════════════
  async function submit() {
    const descInput = document.getElementById('scan-input');
    const desc      = descInput?.value.trim() || '';
    const hasPhoto  = !!_photoDataUrl;

    if (!desc && !hasPhoto) {
      descInput?.focus();
      return;
    }

    const btn       = document.getElementById('scan-submit');
    const analyzing = document.getElementById('scan-analyzing');
    const errEl     = document.getElementById('scan-error');

    btn.disabled = true;
    analyzing.classList.remove('hidden');
    errEl.classList.add('hidden');

    try {
      let result;
      if (state.demoMode) {
        await delay(1800);
        result = _buildDemoResult(desc, hasPhoto);
      } else if (hasPhoto) {
        result = await _callVision(_photoDataUrl, desc);
      } else {
        result = await _callTextAnalysis(desc);
      }

      // Persist scan entry
      const entry = {
        id:              Date.now(),
        date:            new Date().toISOString(),
        description:     desc || '(Photo scan)',
        photo:           _photoDataUrl,
        analysis:        result.summary || '',
        score:           result.score   || 0,
        concerns:        result.concerns || [],
        recommendations: result.recommendations || [],
      };

      state.scanHistory.push(entry);
      if (state.scanHistory.length > 30) state.scanHistory.shift();
      state.currentScan = entry;
      saveState();

      // Clear form
      if (descInput) descInput.value = '';
      clearPhoto();
      renderHistory();

      // Show results screen
      _populateResults(result);
      showScreen('results');

    } catch(e) {
      errEl.textContent = 'Analysis failed: ' + (e.message || 'Unknown error. Check your API key.');
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      analyzing.classList.add('hidden');
    }
  }

  // ─── Save result button ──────────────────────
  function saveResult() {
    showToast('Scan saved to your history ✨');
    showScreen('scan');
  }

  // ═══════════════════════════════════════════════
  //  RESULTS SCREEN
  // ═══════════════════════════════════════════════
  function _populateResults(result) {
    const score = result.score ?? 0;

    // ── Big animated score ring ──
    const arc   = document.getElementById('results-score-arc');
    const numEl = document.getElementById('results-score-num');
    const circumference = 2 * Math.PI * 68; // ≈427

    if (arc) {
      const offset = circumference - (score / 100) * circumference;
      // Set color based on score
      if (score >= 75) {
        arc.setAttribute('stroke', 'url(#rGrad)');
      } else if (score >= 50) {
        arc.setAttribute('stroke', '#E6C96B');
      } else {
        arc.setAttribute('stroke', '#E06B6B');
      }
      arc.style.transition = 'none';
      arc.style.strokeDashoffset = String(circumference);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)';
        arc.style.strokeDashoffset = String(offset);
      }));
    }
    if (numEl) {
      let cur = 0; const step = score / (1200 / 16);
      numEl.textContent = '0';
      const t = setInterval(() => {
        cur = Math.min(score, cur + step);
        numEl.textContent = String(Math.round(cur));
        if (cur >= score) clearInterval(t);
      }, 16);
    }

    // ── Summary ──
    const summaryEl = document.getElementById('results-summary');
    if (summaryEl) summaryEl.textContent = result.summary || '';

    // ── Concerns ──
    const concernsEl = document.getElementById('results-concerns');
    if (concernsEl) {
      const concerns = result.concerns || [];
      if (!concerns.length) {
        concernsEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No specific concerns detected — your skin is looking great!</div>`;
      } else {
        concernsEl.innerHTML = concerns.map(c => `
          <div class="concern-card">
            <div class="concern-name">${escHtml(c.name)}</div>
            <div class="concern-bar-track">
              <div class="concern-bar-fill" style="width:${c.score || 0}%"></div>
            </div>
            <div class="concern-expl">${escHtml(c.explanation || '')}</div>
          </div>`).join('');
        // Animate bars after paint
        setTimeout(() => {
          concernsEl.querySelectorAll('.concern-bar-fill').forEach((bar, i) => {
            const target = concerns[i]?.score || 0;
            bar.style.width = '0%';
            setTimeout(() => { bar.style.width = target + '%'; }, 50 + i * 80);
          });
        }, 100);
      }
    }

    // ── Recommendations ──
    const recsEl = document.getElementById('results-recs');
    if (recsEl) {
      const recs = result.recommendations || [];
      if (!recs.length) {
        recsEl.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Keep up your current routine — you're doing amazing!</div>`;
      } else {
        recsEl.innerHTML = recs.map((r, i) => `
          <div class="rec-card">
            <div class="rec-step">${i + 1}</div>
            <div>
              <div class="rec-action">${escHtml(r.action)}</div>
              <div class="rec-why">${escHtml(r.why)}</div>
            </div>
          </div>`).join('');
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  CLAUDE API — VISION
  // ═══════════════════════════════════════════════
  async function _callVision(dataUrl, textDesc) {
    const base64    = dataUrl.split(',')[1];
    const mediaType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
    const p         = state.profile || {};

    const systemPrompt = `You are GlowAI, an expert AI esthetician. Analyze skin photos scientifically and return ONLY valid JSON. No prose outside the JSON.`;
    const userContent = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
    ];
    if (textDesc) userContent.push({ type: 'text', text: textDesc });
    userContent.push({ type: 'text', text: `Analyze this person's skin thoroughly. Profile: ${p.skinType || 'unknown'} skin, tone: ${p.skinTone || 'unknown'}, concerns: ${p.concerns?.join(', ') || 'none'}.

Return ONLY this JSON structure:
{
  "score": <0-100 overall skin health>,
  "summary": "<2 sentence warm encouraging summary>",
  "concerns": [
    { "name": "<concern>", "score": <0-100 severity>, "explanation": "<2 sentence explanation>" }
  ],
  "recommendations": [
    { "step": 1, "action": "<specific product/step>", "why": "<1 sentence science reason>" }
  ]
}

Include 3-5 concerns and 3-5 recommendations. Return ONLY the JSON object.` });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawText = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════
  //  CLAUDE API — TEXT ANALYSIS
  // ═══════════════════════════════════════════════
  async function _callTextAnalysis(desc) {
    const p = state.profile || {};
    const systemPrompt = `You are GlowAI, an expert AI esthetician. Analyze skin descriptions and return ONLY valid JSON. No prose outside JSON.`;
    const prompt = `Analyze this skin description for a user with ${p.skinType || 'combination'} skin (tone: ${p.skinTone || 'unknown'}, concerns: ${p.concerns?.join(', ') || 'general wellness'}).

Description: "${desc}"

Return ONLY this JSON:
{
  "score": <0-100>,
  "summary": "<2 sentence warm summary>",
  "concerns": [
    { "name": "<concern>", "score": <0-100 severity>, "explanation": "<2 sentences>" }
  ],
  "recommendations": [
    { "step": 1, "action": "<specific action>", "why": "<1 sentence>" }
  ]
}

3-5 concerns, 3-5 recommendations. Return ONLY the JSON.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawText = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
    return JSON.parse(jsonMatch[0]);
  }

  // ═══════════════════════════════════════════════
  //  DEMO MODE RESULTS
  // ═══════════════════════════════════════════════
  function _buildDemoResult(desc, hasPhoto) {
    const d  = (desc || '').toLowerCase();
    const p  = state.profile || { skinType: 'Combination', concerns: [] };
    const st = (p.skinType || 'Combination').toLowerCase();

    // Score varies by description keywords
    let score = 68;
    if (d.includes('dry') || d.includes('flak') || d.includes('tight')) score = 54;
    else if (d.includes('breakout') || d.includes('acne') || d.includes('pimple')) score = 47;
    else if (d.includes('glow') || d.includes('good') || d.includes('great')) score = 82;
    else if (d.includes('oily') || d.includes('shine')) score = 61;
    else if (hasPhoto) score = 71;

    // Concerns vary by skin type
    const drynessConcern = { name: 'Dehydration', score: d.includes('dry') ? 72 : 35, explanation: 'Skin barrier may be compromised, leading to transepidermal water loss. Layering a humectant serum before moisturizer will significantly improve comfort.' };
    const acneConcern    = { name: 'Acne & Breakouts', score: d.includes('breakout') || d.includes('acne') ? 68 : 28, explanation: 'Active blemish activity suggests excess sebum and C. acnes proliferation. BHA exfoliation and niacinamide will address both causes.' };
    const oilConcern     = { name: 'Excess Sebum', score: d.includes('oily') || st === 'oily' ? 65 : 30, explanation: 'Overactive sebaceous glands are producing excess sebum, particularly in the T-zone. Niacinamide 10% is clinically proven to reduce sebum by 65% over 8 weeks.' };
    const textureConcern = { name: 'Uneven Texture', score: 44, explanation: 'Surface cell turnover may be sluggish, leading to micro-roughness and dullness. A gentle AHA exfoliant 2× per week will smooth and brighten over 4 weeks.' };
    const poreConcern    = { name: 'Enlarged Pores', score: st === 'oily' || st === 'combination' ? 55 : 30, explanation: 'Pores appear enlarged due to sebum accumulation and reduced skin elasticity. Regular BHA use will unclog and visually minimize pore appearance.' };

    const concerns = [drynessConcern, acneConcern, textureConcern, poreConcern, oilConcern]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // Recommendations
    const cleanserRec = {
      step: 1,
      action: st === 'oily' ? 'La Roche-Posay Effaclar Gel Cleanser — 60-second AM/PM cleanse' : 'CeraVe Hydrating Facial Cleanser — gentle 60-second cleanse',
      why: 'pH-balanced cleansing removes debris without stripping the barrier, preventing rebound oil production.',
    };
    const serumRec = {
      step: 2,
      action: p.concerns?.includes('Dark Spots') ? 'Vitamin C serum 15% (L-ascorbic acid) — apply AM on damp skin' : 'Niacinamide 10% + Zinc 1% serum — apply AM and PM',
      why: 'Niacinamide regulates sebum, reduces redness, and minimizes pores — your all-in-one treatment active.',
    };
    const moisturiserRec = {
      step: 3,
      action: st === 'oily' ? 'Neutrogena Hydro Boost Water Gel — pea-sized amount AM/PM' : 'CeraVe Moisturizing Cream — apply on slightly damp skin',
      why: 'Ceramide-rich moisturizers repair and reinforce the lipid barrier, reducing water loss and improving skin comfort.',
    };
    const spfRec = {
      step: 4,
      action: 'EltaMD UV Clear SPF 46 — generous application every morning, reapply every 2 hours outdoors',
      why: 'SPF is your single most impactful anti-aging step — UV is responsible for 80% of visible aging.',
    };
    const treatmentRec = {
      step: 5,
      action: d.includes('acne') || d.includes('breakout') ? 'Paula\'s Choice 2% BHA Liquid Exfoliant — 3× per week PM' : 'The Ordinary Retinol 0.3% — start 2× per week PM, avoid eyes',
      why: d.includes('acne') || d.includes('breakout') ? 'Salicylic acid penetrates and dissolves sebum plugs from inside the pore, preventing future breakouts.' : 'Retinol accelerates cell turnover and stimulates collagen synthesis — the gold standard for texture and aging.',
    };

    const summary = hasPhoto
      ? `Your skin looks ${score >= 75 ? 'healthy and vibrant' : score >= 55 ? 'balanced with some areas to address' : 'like it needs a little extra care right now'} — and that's completely normal. ${score >= 70 ? 'You\'re doing a great job.' : 'Small targeted changes in your routine will make a big difference.'} Let's keep you glowing! 🌸`
      : `Based on your description, your ${p.skinType || 'skin'} is ${score >= 75 ? 'doing great with just a few areas to watch' : score >= 55 ? 'in good shape with some targeted needs' : 'telling you it needs a bit more TLC right now'}. The recommendations below will help you make the most progress in the shortest time.`;

    return {
      score,
      summary,
      concerns,
      recommendations: [cleanserRec, serumRec, moisturiserRec, spfRec, treatmentRec],
    };
  }

  // ═══════════════════════════════════════════════
  //  HISTORY RENDERING (on scan tab)
  // ═══════════════════════════════════════════════
  function renderHistory() {
    const list  = document.getElementById('scan-history-list');
    const title = document.getElementById('scan-history-title');
    if (!list) return;

    if (!state.scanHistory.length) {
      list.innerHTML = '';
      if (title) title.style.display = 'none';
      return;
    }
    if (title) title.style.display = '';

    const recent = [...state.scanHistory].reverse().slice(0, 8);
    list.innerHTML = recent.map(s => {
      const date    = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const preview = (s.description || '(Photo scan)').slice(0, 50) + ((s.description || '').length > 50 ? '…' : '');
      return `
        <div class="scan-history-item">
          <div class="scan-history-header" onclick="_scanToggle(this, '${s.id}')">
            <div>
              <div class="scan-history-date">${date}${s.score ? ` · Score ${s.score}` : ''}</div>
              <div class="scan-history-preview">${escHtml(preview)}</div>
            </div>
            <div class="scan-history-chevron" id="chev-${s.id}">▼</div>
          </div>
          <div class="scan-history-body hidden" id="scan-body-${s.id}">
            ${s.photo ? `<img class="scan-entry-photo" src="${s.photo}" alt="Skin scan">` : ''}
            <div class="scan-result-label">Description</div>
            <div class="scan-result-text">${escHtml(s.description || '(Photo scan)')}</div>
            ${s.analysis ? `<div class="scan-result-label">AI Analysis</div><div class="scan-result-text">${escHtml(s.analysis)}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ─── Toggle scan history item ────────────────
  window._scanToggle = function(header, id) {
    const body = document.getElementById(`scan-body-${id}`);
    const chev = document.getElementById(`chev-${id}`);
    if (!body) return;
    body.classList.toggle('hidden');
    if (chev) chev.classList.toggle('open');
  };

  // ─── Public API ───────────────────────────────
  return { openFilePicker, setPhoto, clearPhoto, submit, saveResult, renderHistory };
})();
