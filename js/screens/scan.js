// scan.js — GlowAI scan screen: camera, vision, results
// Aloha from Pearl City!

const glowScan = (() => {
  'use strict';

  let _photo  = null;
  let _stream = null;

  // ── Photo capture ────────────────────────────────────────

  function tapZone() {
    if (!_photo && !_stream) openCamera();
    else if (_stream) captureVideo();
  }

  async function openCamera() {
    // #ASSUMPTION: getUserMedia available on https:// or localhost; falls back to file input
    if (!navigator.mediaDevices?.getUserMedia) {
      document.getElementById('scan-file').click();
      return;
    }
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const vid = document.getElementById('scan-video');
      vid.srcObject = _stream;
      vid.style.display = 'block';
      document.getElementById('scan-placeholder').style.display = 'none';
      document.getElementById('cam-capture-btn').style.display = 'block';
      document.getElementById('cam-cancel-btn').style.display  = 'block';
    } catch (err) {
      _stream = null;
      document.getElementById('scan-file').click();
    }
  }

  function captureVideo() {
    const vid    = document.getElementById('scan-video');
    const canvas = document.getElementById('scan-canvas');
    canvas.width  = vid.videoWidth  || 640;
    canvas.height = vid.videoHeight || 480;
    canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
    // #ASSUMPTION: resizing to 1024px keeps payload under ~500KB for vision API
    const dataUrl = _canvasToJpeg(canvas, 1024);
    stopCamera();
    setPhoto(dataUrl);
  }

  // Resize canvas to maxDim, return JPEG data URL — synchronous, canvas-only
  function _canvasToJpeg(canvas, maxDim) {
    const w = canvas.width, h = canvas.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    if (scale >= 1) return canvas.toDataURL('image/jpeg', 0.88);
    const out = document.createElement('canvas');
    out.width  = Math.round(w * scale);
    out.height = Math.round(h * scale);
    out.getContext('2d').drawImage(canvas, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', 0.88);
  }

  function stopCamera() {
    if (_stream) {
      _stream.getTracks().forEach(t => t.stop());
      _stream = null;
    }
    const vid = document.getElementById('scan-video');
    vid.srcObject = null;
    vid.style.display = 'none';
    document.getElementById('cam-capture-btn').style.display = 'none';
    document.getElementById('cam-cancel-btn').style.display  = 'none';
    const ph = document.getElementById('scan-placeholder');
    if (!_photo) ph.style.display = 'flex';
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
    const img  = document.getElementById('scan-photo');
    const ph   = document.getElementById('scan-placeholder');
    const ring = document.getElementById('ring-light');
    const back = document.getElementById('photo-back-btn');
    const bar  = document.getElementById('analyze-bar');
    img.src = dataUrl;
    img.style.display = 'block';
    if (ph)   ph.style.display   = 'none';
    if (ring) ring.classList.add('active');
    if (back) back.style.display = 'block';
    if (bar)  bar.classList.add('show');
  }

  function clearPhoto() {
    _photo = null;
    stopCamera();
    const img  = document.getElementById('scan-photo');
    const ph   = document.getElementById('scan-placeholder');
    const ring = document.getElementById('ring-light');
    const back = document.getElementById('photo-back-btn');
    const bar  = document.getElementById('analyze-bar');
    img.src = ''; img.style.display = 'none';
    if (ph)   ph.style.display      = 'flex';
    if (ring) ring.classList.remove('active');
    if (back) back.style.display    = 'none';
    if (bar)  bar.classList.remove('show');
  }

  // ── Analyze ──────────────────────────────────────────────

  async function analyze() {
    if (!_photo && !glowState.demoMode) {
      showToast('Add a photo first 📷');
      return;
    }
    if (!glowState.authToken && !glowState.demoMode) {
      openSheet('settings-sheet');
      showToast('Sign in to analyze your skin ✨');
      return;
    }

    const overlay = document.getElementById('analyzing');
    const errEl   = document.getElementById('results-error');
    const bar     = document.getElementById('analyze-bar');
    overlay.classList.add('show');
    if (bar)   bar.classList.remove('show');
    if (errEl) errEl.classList.add('hidden');

    try {
      let result;
      if (glowState.demoMode || !glowState.authToken) {
        await new Promise(r => setTimeout(r, 1900));
        result = _buildDemoResult();
      } else {
        result = await _callVision(_photo);
      }
      glowState.currentResult = result;
      _renderResults(result);
      overlay.classList.remove('show');
      openSheet('results-sheet');
    } catch (e) {
      overlay.classList.remove('show');
      console.error('[GlowAI] analyze error', e);
      if (e.unauthorized) {
        glowApp.sessionExpired();
        return;
      }
      const msg = e.status === 429   ? 'Rate limit — try again in a few minutes'
                : e.status === 413   ? 'Photo too large — try a smaller image'
                : e.circuitOpen      ? 'Service unavailable — reload and try again'
                : `Analysis failed: ${e.message || 'check console'}`;
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); openSheet('results-sheet'); }
      else showToast(msg);
    }
  }

  // ── Server-proxied vision call ───────────────────────────

  async function _callVision(dataUrl) {
    const base64    = dataUrl.split(',')[1];
    const mediaType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
    // System prompt + model selection live server-side in server/main.py
    return ClaudeAPI.scan({
      image_b64:  base64,
      media_type: mediaType,
      skin_type:  glowState.skinType,
      concerns:   _selectedConcerns(),
    });
  }

  // ── Demo result ──────────────────────────────────────────

  function _buildDemoResult() {
    const sel     = _selectedConcerns();
    const hasAcne = sel.includes('Acne');
    const hasDry  = sel.includes('Dryness');
    const hasOily = sel.includes('Oiliness');
    const skinType = hasOily ? 'Oily' : hasDry ? 'Dry' : 'Combination';
    const score    = hasAcne ? 52 : hasDry ? 62 : 74;

    return {
      skinType, score,
      summary: `Your skin looks like it has a ${skinType.toLowerCase()} profile — ${score >= 70 ? 'pretty balanced overall, with a couple of areas that would appreciate a little extra attention' : 'a few concerns worth addressing gently, and the good news is simple changes usually make a real difference'}. ${score >= 70 ? 'You\'re doing more right than wrong — a few small tweaks could take things up a notch.' : 'A consistent gentle routine for 4–6 weeks tends to shift things noticeably.'} Preliminary read — not a medical diagnosis.`,
      concerns: [
        {
          name: hasAcne ? 'Some Congestion & Breakouts' : 'Light Surface Congestion',
          score: hasAcne ? 68 : 30,
          explanation: hasAcne ? 'Your skin appears to be producing a bit more oil than it can clear easily — totally common and very workable. A gentle BHA (salicylic acid) a few times a week can help, alongside a calming niacinamide serum.' : 'There\'s a little congestion visible, likely just some trapped sebum. A mild BHA cleanser a couple of times a week usually clears this up without over-stripping.',
        },
        {
          name: hasDry ? 'Your Skin Is Thirsty' : 'Barrier Could Use Some Love',
          score: hasDry ? 72 : 28,
          explanation: hasDry ? 'Your skin looks like it\'s craving moisture — it may be losing water faster than it\'s retaining it. Applying moisturizer to slightly damp skin and locking it in with a gentle occlusive usually helps within a week or two.' : 'Your barrier seems a little stressed — possibly from over-washing or environmental factors. Simplifying your routine and adding a ceramide moisturizer tends to calm things down quickly.',
        },
        {
          name: 'A Little Uneven Texture',
          score: 44,
          explanation: 'Your skin\'s surface looks slightly uneven — this is really common and nothing to worry about. A gentle AHA exfoliant once or twice a week usually smooths things out over 3–4 weeks.',
        },
        {
          name: hasOily ? 'Enlarged-Looking Pores' : 'Pores Are a Little Visible',
          score: hasOily ? 58 : 34,
          explanation: 'Pores look a little enlarged — often from oil buildup rather than actual pore size, which means they\'re very manageable. Consistent gentle cleansing and a BHA exfoliant twice a week can make a noticeable difference.',
        },
      ],
      recommendations: [
        { step: 1, action: hasOily ? 'Gentle foaming cleanser AM/PM — try La Roche-Posay Effaclar Gel (or budget: Cetaphil Oily Skin Cleanser)' : 'Hydrating cleanser AM/PM — try CeraVe Hydrating Cleanser (budget-friendly and widely available)', why: 'A pH-balanced cleanser is the foundation of everything. Cleanse for about 60 seconds — your skin will feel the difference. Patch test on your inner wrist first if it\'s new.' },
        { step: 2, action: 'Niacinamide serum AM + PM — try The Ordinary Niacinamide 10% + Zinc (very affordable)', why: 'Niacinamide is one of the gentlest, most well-researched ingredients for balancing sebum and calming the skin. Most people tolerate it really well.' },
        { step: 3, action: hasDry ? 'Rich moisturizer applied to slightly damp skin — try CeraVe Moisturizing Cream' : 'Lightweight gel moisturizer — try Neutrogena Hydro Boost (or budget: Simple Kind to Skin moisturizer)', why: 'Moisturizer on slightly damp skin traps hydration inside. This one step alone can change how your skin feels within a few days.' },
        { step: 4, action: 'SPF 30+ every single morning — try EltaMD UV Clear SPF 46 (or budget: Bondi Sands SPF 50 Fragrance Free)', why: 'Sunscreen is the single most effective thing you can do for your skin long-term. No pressure, but try to make it the last step every AM.' },
        { step: 5, action: hasAcne ? 'BHA exfoliant 2–3× per week PM — try Paula\'s Choice 2% BHA Liquid (budget: The Ordinary Salicylic 2% Solution)' : 'Optional: gentle AHA exfoliant 1–2× per week PM — try The Ordinary AHA 30% + BHA 2% Peeling Solution (start slowly)', why: hasAcne ? 'A leave-on BHA helps clear congestion without scrubbing. Start slowly — once a week — and build up. Always patch test first.' : 'A mild chemical exfoliant once a week can smooth texture noticeably over 3–4 weeks. Patch test, and skip if your skin feels sensitive.' },
      ],
    };
  }

  // ── Render results ───────────────────────────────────────

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
      badge.textContent   = (result.skinType || '') + ' Skin';
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

  // ── History ──────────────────────────────────────────────

  function saveResult() {
    if (!glowState.currentResult) return;
    const entry = {
      date:     new Date().toISOString(),
      photo:    _photo,
      score:    glowState.currentResult.score,
      skinType: glowState.currentResult.skinType,
      result:   glowState.currentResult,
    };
    const hist = glowState.scanHistory;
    hist.push(entry);
    glowState.scanHistory = hist;  // triggers persist
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

  // ── Helpers ──────────────────────────────────────────────

  function _selectedConcerns() {
    return [...document.querySelectorAll('#concern-chips .c-chip.on')].map(c => c.dataset.val);
  }

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { tapZone, openCamera, captureVideo, stopCamera, onFileChange, setPhoto, clearPhoto, analyze, saveResult, loadHistory };
})();
