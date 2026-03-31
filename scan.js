// scan.js — GlowAI scan + results
// Aloha from Pearl City! 🌺

const glowScan = (() => {
  let _photo = null;

  // ── Photo ────────────────────────────────────────────
  function tapZone() {
    if (!_photo) openCamera();
  }

  function openCamera() {
    document.getElementById('scan-file').click();
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function setPhoto(dataUrl) {
    _photo = dataUrl;
    const img   = document.getElementById('scan-photo');
    const ph    = document.getElementById('scan-placeholder');
    const btn   = document.getElementById('float-analyze');
    const ring  = document.getElementById('ring-light');
    img.src     = dataUrl;
    img.style.display = 'block';
    if (ph)   ph.style.display  = 'none';
    if (btn)  btn.classList.add('show');
    if (ring) ring.classList.add('active');
  }

  function clearPhoto() {
    _photo = null;
    const img  = document.getElementById('scan-photo');
    const ph   = document.getElementById('scan-placeholder');
    const btn  = document.getElementById('float-analyze');
    const ring = document.getElementById('ring-light');
    img.src = ''; img.style.display = 'none';
    if (ph)   ph.style.display  = 'flex';
    if (btn)  btn.classList.remove('show');
    if (ring) ring.classList.remove('active');
  }

  // ── Analyze ──────────────────────────────────────────
  async function analyze() {
    if (!_photo && !glowState.demoMode) {
      showToast('Add a photo first 📷');
      return;
    }
    if (!glowState.apiKey && !glowState.demoMode) {
      openSheet('settings-sheet');
      showToast('Enter your API key first ⚙️');
      return;
    }

    const overlay = document.getElementById('analyzing');
    const errEl   = document.getElementById('results-error');
    overlay.classList.add('show');
    if (errEl) errEl.classList.add('hidden');

    try {
      let result;
      if (glowState.demoMode || !glowState.apiKey) {
        await new Promise(r => setTimeout(r, 1900));
        result = _buildDemoResult();
      } else {
        result = await _callVision(_photo);
      }
      glowState.currentResult = result;
      _renderResults(result);
      overlay.classList.remove('show');
      openSheet('results-sheet');
    } catch(e) {
      overlay.classList.remove('show');
      const msg = e.status === 401 ? 'Invalid API key — check Settings ⚙️'
                : e.status === 429 ? 'Too many requests — try again shortly'
                : 'Analysis failed: ' + (e.message || 'Unknown error');
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); openSheet('results-sheet'); }
      else showToast(msg);
    }
  }

  // ── Claude vision API ────────────────────────────────
  async function _callVision(dataUrl) {
    const base64    = dataUrl.split(',')[1];
    const mediaType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
    const flagged   = _selectedConcerns();

    // #ASSUMPTION: B2B esthetician tool — clinical language is expected
    const system = `You are GlowAI, an expert AI esthetician. Analyze client skin photos with clinical precision. Return ONLY valid JSON.`;

    const content = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text:
        `Analyze this client's skin for a professional consultation.${flagged.length ? ` Esthetician-flagged concerns: ${flagged.join(', ')}.` : ''}

Return ONLY this JSON:
{
  "skinType": "<Dry | Oily | Combination | Normal | Sensitive | Mature>",
  "score": <0-100>,
  "summary": "<2 sentence clinical summary: state skin type, key findings, overall assessment>",
  "concerns": [
    { "name": "<concern>", "score": <0-100 severity>, "explanation": "<2 sentences: root cause + treatment rationale>" }
  ],
  "recommendations": [
    { "step": 1, "action": "<specific treatment or product>", "why": "<1 sentence clinical rationale>" }
  ]
}
3-5 concerns ranked by severity. 3-5 recommendations — prioritize professional treatments. Return ONLY JSON.`
      }
    ];

    const data = await ClaudeAPI.call(glowState.apiKey, {
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content }],
    });

    const raw   = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid AI response');
    return JSON.parse(match[0]);
  }

  // ── Demo result ──────────────────────────────────────
  function _buildDemoResult() {
    const sel     = _selectedConcerns();
    const hasAcne = sel.includes('Acne');
    const hasDry  = sel.includes('Dryness');
    const hasOily = sel.includes('Oiliness');
    const skinType = hasOily ? 'Oily' : hasDry ? 'Dry' : 'Combination';
    const score    = hasAcne ? 52 : hasDry ? 62 : 74;

    return {
      skinType,
      score,
      summary: `Visual assessment confirms ${skinType.toLowerCase()} skin type with ${score >= 70 ? 'good overall condition and minor optimization opportunities' : 'moderate active concerns requiring targeted clinical intervention'}. ${score >= 70 ? 'Current protocol shows positive outcomes with enhancement potential.' : 'A structured evidence-based protocol will produce measurable improvement in 6–8 weeks.'}`,
      concerns: [
        {
          name: hasAcne ? 'Active Acne & Congestion' : 'Mild Surface Congestion',
          score: hasAcne ? 68 : 30,
          explanation: 'Excess sebum production and C. acnes proliferation within follicles driving active lesion formation. Salicylic acid (BHA) 2% penetrates pores to dissolve plugs; niacinamide 10% suppresses the inflammatory response concurrently.',
        },
        {
          name: hasDry ? 'Transepidermal Water Loss' : 'Mild Barrier Compromise',
          score: hasDry ? 72 : 28,
          explanation: 'Compromised lipid barrier integrity allowing elevated moisture loss and reduced resilience. Humectant layering on damp skin followed by occlusive moisturizer restores barrier function within 2–3 weeks.',
        },
        {
          name: 'Impaired Surface Texture',
          score: 44,
          explanation: 'Reduced epidermal cell turnover producing micro-roughness and dullness. AHA exfoliation 2× weekly accelerates desquamation, revealing smoother, more luminous skin within 4 weeks.',
        },
        {
          name: 'Dilated Follicular Ostia',
          score: hasOily ? 58 : 34,
          explanation: 'Pore dilation secondary to sebum accumulation and loss of perifollicular elastin. Consistent BHA exfoliation removes intra-follicular debris; retinoids restore collagen and elastin tone over 12 weeks.',
        },
      ],
      recommendations: [
        { step: 1, action: hasOily ? 'La Roche-Posay Effaclar Foaming Gel — 60s cleanse AM/PM' : 'CeraVe Hydrating Facial Cleanser — gentle 60s cleanse AM/PM', why: 'pH-balanced cleansing preserves acid mantle while removing sebum, SPF, and environmental debris without triggering rebound.' },
        { step: 2, action: 'The Ordinary Niacinamide 10% + Zinc 1% — apply AM and PM after toner', why: 'Niacinamide 10% clinically reduces sebum secretion by 65%, suppresses inflammatory cytokines, and stimulates ceramide synthesis.' },
        { step: 3, action: hasDry ? 'CeraVe Moisturizing Cream — apply to damp skin AM/PM' : 'Neutrogena Hydro Boost Water Gel — pea-sized amount on damp skin AM/PM', why: 'Ceramide-dominant formulation restores lipid bilayer and reduces transepidermal water loss by up to 40%.' },
        { step: 4, action: 'EltaMD UV Clear SPF 46 — 2mg/cm² as final AM step; reapply every 2h outdoors', why: 'Broad-spectrum protection prevents 95%+ of photoaging. UV radiation drives 80–90% of visible aging signs.' },
        { step: 5, action: hasAcne ? "Paula's Choice 2% BHA Liquid — 3× weekly PM, leave-on" : 'The Ordinary Retinol 0.3% in Squalane — 2× weekly PM', why: hasAcne ? 'Salicylic acid penetrates follicle to dissolve sebum plugs and suppress C. acnes proliferation.' : 'Retinol upregulates cell turnover and stimulates dermal collagen; full retinization in 8–12 weeks.' },
      ],
    };
  }

  // ── Render results ───────────────────────────────────
  function _renderResults(result) {
    const score = result.score ?? 0;
    const arc   = document.getElementById('score-arc');
    const numEl = document.getElementById('score-num');
    const circ  = 377;

    if (arc) {
      const offset = circ - (score / 100) * circ;
      arc.style.transition = 'none';
      arc.style.strokeDashoffset = String(circ);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.2,0.64,1)';
        arc.style.strokeDashoffset = String(offset);
      }));
    }
    if (numEl) {
      let cur = 0; const step = score / (1200 / 16);
      const t = setInterval(() => {
        cur = Math.min(score, cur + step);
        numEl.textContent = String(Math.round(cur));
        if (cur >= score) clearInterval(t);
      }, 16);
    }

    const badge = document.getElementById('results-skin-type');
    if (badge) {
      badge.textContent  = (result.skinType || '') + ' Skin';
      badge.style.display = result.skinType ? 'inline-block' : 'none';
    }

    const summaryEl = document.getElementById('results-summary');
    if (summaryEl) summaryEl.textContent = result.summary || '';

    const concernsEl = document.getElementById('results-concerns');
    if (concernsEl) {
      const cs = result.concerns || [];
      concernsEl.innerHTML = cs.length
        ? cs.map(c => `
          <div class="concern-card">
            <div class="concern-name">${_esc(c.name)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:0%"></div></div>
            <div class="concern-expl">${_esc(c.explanation || '')}</div>
          </div>`).join('')
        : `<div style="color:#aaa;font-size:13px;padding:8px 0">No significant concerns — great skin!</div>`;

      setTimeout(() => {
        concernsEl.querySelectorAll('.bar-fill').forEach((bar, i) => {
          setTimeout(() => { bar.style.width = (cs[i]?.score || 0) + '%'; }, 60 + i * 80);
        });
      }, 120);
    }

    const recsEl = document.getElementById('results-recs');
    if (recsEl) {
      const rs = result.recommendations || [];
      recsEl.innerHTML = rs.map(r => `
        <div class="rec-card">
          <div class="rec-num">${r.step}</div>
          <div>
            <div class="rec-action">${_esc(r.action)}</div>
            <div class="rec-why">${_esc(r.why)}</div>
          </div>
        </div>`).join('');
    }
  }

  // ── Save / load history ──────────────────────────────
  function saveResult() {
    if (!glowState.currentResult) return;
    const entry = {
      date:     new Date().toISOString(),
      photo:    _photo,
      score:    glowState.currentResult.score,
      skinType: glowState.currentResult.skinType,
      result:   glowState.currentResult,
    };
    glowState.scanHistory.push(entry);
    try { localStorage.setItem('glow_scans', JSON.stringify(glowState.scanHistory)); } catch(e) {}
    showToast('Report saved ✓');
    closeSheet('results-sheet');
  }

  function loadHistory(index) {
    const item = glowState.scanHistory[index];
    if (!item) return;
    if (item.photo) setPhoto(item.photo);
    glowState.currentResult = item.result;
    _renderResults(item.result);
    closeAllSheets();
    setTimeout(() => openSheet('results-sheet'), 280);
  }

  // ── Helpers ──────────────────────────────────────────
  function _selectedConcerns() {
    return [...document.querySelectorAll('#concern-chips .c-chip.on')].map(c => c.dataset.val);
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { tapZone, openCamera, onFileChange, setPhoto, clearPhoto, analyze, saveResult, loadHistory };
})();
