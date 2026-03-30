/**
 * scan.js — GlowAI Skin Scan & Results
 * Aloha from Pearl City! 🌺
 *
 * Handles:
 *  - Photo selection (camera capture / file picker / drag-and-drop)
 *  - Claude API call (vision if photo, text tool-call if text-only)
 *  - Parsing JSON result → results screen
 *  - Save/history management
 *  - Demo mode responses
 *
 * #ASSUMPTION: FileReader API available on Samsung Galaxy A9 Brave WebView
 * #ASSUMPTION: Camera permission granted via AndroidManifest.xml before this runs
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
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => setPhoto(ev.target.result);
      reader.onerror = () => console.error('GlowAI: Failed to read image file');
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
      const clientName = document.getElementById('scan-client-name')?.value.trim() || 'Client';
      const entry = {
        id:              Date.now(),
        date:            new Date().toISOString(),
        clientName,
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
      const clientNameInput = document.getElementById('scan-client-name');
      if (clientNameInput) clientNameInput.value = '';
      clearPhoto();
      renderHistory();

      // Show results screen
      _populateResults(result);
      showScreen('results');

    } catch(e) {
      const s = e.status;
      let msg;
      if (e.circuitOpen)    msg = 'Service temporarily paused — try again in a moment.';
      else if (s === 401)   msg = 'Invalid API key — tap ⚙️ Settings to update it.';
      else if (s === 429)   msg = 'Too many requests — wait a moment, then try again.';
      else if (s === 529)   msg = 'Claude is overloaded right now — try again shortly.';
      else if (s >= 500)    msg = 'Claude is having a moment — try again in a few seconds.';
      else if (e.timeout)   msg = 'Request timed out — check your connection and retry.';
      else                  msg = 'Analysis failed: ' + (e.message || 'Unknown error. Check your API key.');
      errEl.textContent = msg;
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
    const circumference = 427; // matches stroke-dasharray="427" in HTML SVG

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

    // #ASSUMPTION: esthetician is performing this scan on a client, not themselves
    const clientName = document.getElementById('scan-client-name')?.value.trim() || 'the client';
    const systemPrompt = `You are GlowAI, an expert AI esthetician assistant used by licensed skin care professionals. Analyze client skin photos with clinical precision. Use professional esthetician terminology. Return ONLY valid JSON — no prose outside the JSON.`;
    const userContent = [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
    ];
    if (textDesc) userContent.push({ type: 'text', text: textDesc });
    userContent.push({ type: 'text', text: `Analyze this client's skin for a professional consultation. Client profile: ${p.skinType || 'unknown'} skin type, concerns: ${p.concerns?.join(', ') || 'none stated'}.

Return ONLY this JSON:
{
  "score": <0-100 overall skin health score>,
  "summary": "<2 sentence clinical summary using professional esthetician language — identify skin type, key findings, and overall assessment>",
  "concerns": [
    { "name": "<clinical concern name>", "score": <0-100 severity>, "explanation": "<2 sentence professional explanation including root cause and treatment rationale>" }
  ],
  "recommendations": [
    { "step": 1, "action": "<specific professional treatment or retail product recommendation>", "why": "<1 sentence clinical rationale>" }
  ]
}

Include 3-5 concerns ranked by severity. Include 3-5 recommendations — prioritize professional treatments (chemical peels, extractions, facials, LED) over retail. Return ONLY the JSON.` });

    const data = await ClaudeAPI.call(state.apiKey, {
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
    const rawText = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Malformed JSON in AI response');
    }
  }

  // ═══════════════════════════════════════════════
  //  CLAUDE API — TEXT ANALYSIS
  // ═══════════════════════════════════════════════
  async function _callTextAnalysis(desc) {
    const p = state.profile || {};
    // #ASSUMPTION: esthetician is describing a client's skin, not their own
    const systemPrompt = `You are GlowAI, an expert AI esthetician assistant used by licensed skin care professionals. Analyze client skin descriptions with clinical precision. Use professional esthetician terminology. Return ONLY valid JSON — no prose outside JSON.`;
    const prompt = `Analyze this client skin description for a professional consultation. Client has ${p.skinType || 'combination'} skin, known concerns: ${p.concerns?.join(', ') || 'none stated'}.

Esthetician's observation: "${desc}"

Return ONLY this JSON:
{
  "score": <0-100 overall skin health>,
  "summary": "<2 sentence clinical summary using professional esthetician language — identify findings and overall assessment>",
  "concerns": [
    { "name": "<clinical concern name>", "score": <0-100 severity>, "explanation": "<2 sentence professional explanation with root cause and treatment rationale>" }
  ],
  "recommendations": [
    { "step": 1, "action": "<specific professional treatment or product recommendation>", "why": "<1 sentence clinical rationale>" }
  ]
}

3-5 concerns ranked by severity. 3-5 recommendations — prioritize professional treatments over retail products. Return ONLY the JSON.`;

    const data = await ClaudeAPI.call(state.apiKey, {
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response from AI');
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Malformed JSON in AI response');
    }
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
    const drynessConcern = { name: 'Transepidermal Water Loss', score: d.includes('dry') ? 72 : 35, explanation: 'Compromised lipid barrier integrity is allowing elevated TEWL, reducing skin moisture content and resilience. Humectant layering (hyaluronic acid on damp skin) followed by an occlusive moisturizer will restore barrier function within 2–3 weeks.' };
    const acneConcern    = { name: 'Active Acne & Congestion', score: d.includes('breakout') || d.includes('acne') ? 68 : 28, explanation: 'Active lesion activity indicates excess sebum production and C. acnes proliferation within the follicle. Salicylic acid (BHA) 2% will penetrate the pore to dissolve sebum plugs; niacinamide 10% will suppress the inflammatory response concurrently.' };
    const oilConcern     = { name: 'Sebaceous Hyperactivity', score: d.includes('oily') || st === 'oily' ? 65 : 30, explanation: 'Overactive sebaceous glands are generating excess sebum output, particularly in the T-zone. Niacinamide 10% is clinically demonstrated to reduce sebum secretion by 65% over 8 weeks through follicular receptor modulation.' };
    const textureConcern = { name: 'Impaired Surface Texture', score: 44, explanation: 'Reduced epidermal cell turnover rate is producing micro-roughness and surface dullness. Glycolic acid (AHA) 7–10% applied 2× weekly will accelerate desquamation, revealing smoother, more luminous skin within 4 weeks.' };
    const poreConcern    = { name: 'Dilated Follicular Ostia', score: st === 'oily' || st === 'combination' ? 55 : 30, explanation: 'Pore dilation is secondary to sebum accumulation and progressive loss of perifollicular elastin. Consistent BHA exfoliation will remove intra-follicular debris, while retinoids will restore surrounding collagen and elastin tone over 12 weeks.' };

    const concerns = [drynessConcern, acneConcern, textureConcern, poreConcern, oilConcern]
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // Recommendations
    const cleanserRec = {
      step: 1,
      action: st === 'oily' ? 'La Roche-Posay Effaclar Purifying Foaming Gel — 60-second AM/PM cleanse' : 'CeraVe Hydrating Facial Cleanser — gentle 60-second cleanse, AM/PM',
      why: 'pH 5.5-balanced cleansing preserves the acid mantle while removing sebum, SPF, and environmental debris. Eliminates barrier disruption and prevents compensatory sebum rebound.',
    };
    const serumRec = {
      step: 2,
      action: p.concerns?.includes('Dark Spots') ? 'SkinCeuticals C E Ferulic (L-Ascorbic Acid 15%) — apply AM on clean damp skin before SPF' : 'The Ordinary Niacinamide 10% + Zinc 1% — apply AM and PM after toner',
      why: p.concerns?.includes('Dark Spots') ? 'L-Ascorbic Acid 15% with Ferulic Acid provides 8× enhanced photoprotection, inhibits tyrosinase-mediated melanin synthesis, and upregulates Type I collagen expression.' : 'Niacinamide 10% is clinically proven to reduce sebum secretion by 65%, suppress inflammatory cytokines, and stimulate ceramide synthesis for barrier repair — the most efficient multi-tasking treatment active.',
    };
    const moisturiserRec = {
      step: 3,
      action: st === 'oily' ? 'Neutrogena Hydro Boost Water Gel — apply pea-sized amount to damp skin AM/PM' : 'CeraVe Moisturizing Cream (ceramide complex) — apply to damp skin AM/PM',
      why: 'Ceramide-dominant formulation restores the lipid bilayer, reduces transepidermal water loss by up to 40%, and seals in active ingredients. Damp-skin application enhances absorption by 3×.',
    };
    const spfRec = {
      step: 4,
      action: 'EltaMD UV Clear Broad-Spectrum SPF 46 — apply 2mg/cm² as final AM step; reapply every 2 hours in direct sun',
      why: 'Broad-spectrum UVA/UVB protection prevents 95%+ of photoaging damage. UV radiation drives 80–90% of visible aging signs including fine lines, hyperpigmentation, and collagen degradation.',
    };
    const treatmentRec = {
      step: 5,
      action: d.includes('acne') || d.includes('breakout') ? 'Paula\'s Choice 2% BHA Liquid Exfoliant — apply 3× per week PM after cleansing, leave-on' : 'The Ordinary Retinol 0.3% in Squalane — 2× per week PM; avoid periorbital area',
      why: d.includes('acne') || d.includes('breakout') ? 'Salicylic acid (lipid-soluble BHA) penetrates the follicle to dissolve sebum plugs, suppress C. acnes proliferation, and reduce post-inflammatory hyperpigmentation risk.' : 'Retinol upregulates epidermal cell turnover and stimulates dermal collagen synthesis. Begin at 2× weekly; increase by one session every 2 weeks as tolerance develops. Full retinization typically achieved in 8–12 weeks.',
    };

    const summary = hasPhoto
      ? `Visual assessment indicates ${score >= 75 ? 'good overall skin health with minor optimization opportunities' : score >= 55 ? 'moderate condition with several addressable concerns' : 'active concerns requiring targeted clinical intervention'}. ${score >= 70 ? 'Current protocol is producing positive outcomes.' : 'Targeted protocol adjustments will produce measurable improvement within 6–8 weeks.'} Full clinical recommendations are detailed below.`
      : `Clinical assessment based on esthetician observation: ${p.skinType || 'combination'} skin presentation with ${score >= 75 ? 'strong overall condition and minor maintenance needs' : score >= 55 ? 'moderate concerns requiring targeted treatment actives' : 'active concerns requiring structured clinical intervention'}. Evidence-based treatment recommendations below are sequenced by clinical priority.`;

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
    const list   = document.getElementById('scan-history-list');
    const header = document.getElementById('scan-history-header');
    if (!list) return;

    if (!state.scanHistory.length) {
      list.innerHTML = '';
      if (header) header.style.display = 'none';
      return;
    }
    if (header) header.style.display = 'flex';

    // #ASSUMPTION: filter input value is always a plain string (no regex injection risk — used as substring match only)
    const filterRaw = (document.getElementById('scan-client-filter')?.value || '').trim().toLowerCase();
    const all = [...state.scanHistory].reverse();
    const filtered = filterRaw
      ? all.filter(s => (s.clientName || '').toLowerCase().includes(filterRaw))
      : all.slice(0, 12);

    if (!filtered.length) {
      list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:10px 4px">No scans match "${escHtml(filterRaw)}"</div>`;
      return;
    }

    list.innerHTML = filtered.map(s => {
      const date    = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const preview = (s.description || '(Photo scan)').slice(0, 50) + ((s.description || '').length > 50 ? '…' : '');
      const nameTag = s.clientName
        ? `<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.7px;color:var(--primary);margin-bottom:2px">${escHtml(s.clientName)}</div>`
        : '';
      return `
        <div class="scan-history-item">
          <div class="scan-history-header" onclick="_scanToggle(this, '${s.id}')">
            <div style="flex:1;min-width:0">
              ${nameTag}
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
