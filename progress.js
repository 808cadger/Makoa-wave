/**
 * progress.js — GlowAI Progress Tracking
 *
 * Handles:
 *  - Stats row: total scans, average score, best score, current streak
 *  - Animated SVG line chart of last 10 scan scores
 *  - Scan history list with mini score circles and thumbnails
 *  - Delete scan (long-press or confirm dialog)
 *  - Empty state
 */

const progressModule = (() => {
  // ═══════════════════════════════════════════════
  //  COMPARE MODE STATE  // Aloha from Pearl City!
  // ═══════════════════════════════════════════════
  let _compareMode = false;
  let _compareSelected = []; // up to 2 realIdx values

  // ═══════════════════════════════════════════════
  //  RENDER ENTRY POINT
  // ═══════════════════════════════════════════════
  function render() {
    _renderStats();
    _renderChart();
    _injectCompareButton();
    _renderHistory();
  }

  // ═══════════════════════════════════════════════
  //  STATS ROW
  // ═══════════════════════════════════════════════
  function _renderStats() {
    const scans = state.scanHistory;
    const scores = scans.map(s => s.score).filter(s => typeof s === 'number' && s > 0);

    const totalScans  = scans.length;
    const avgScore    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const bestScore   = scores.length ? Math.max(...scores) : null;
    const streak      = state.routine.streak || 0;

    const el = (id, val) => {
      const e = document.getElementById(id);
      if (e) e.textContent = val != null ? String(val) : '—';
    };
    el('stat-scans',  totalScans);
    el('stat-avg',    avgScore);
    el('stat-best',   bestScore);
    el('stat-streak', streak);
  }

  // ═══════════════════════════════════════════════
  //  COMPARE BUTTON INJECTION
  // ═══════════════════════════════════════════════
  function _injectCompareButton() {
    const old = document.getElementById('compare-btn-wrap');
    if (old) old.remove();
    if (state.scanHistory.length < 2) return;

    const histWrap = document.getElementById('progress-history');
    if (!histWrap) return;

    const btnWrap = document.createElement('div');
    btnWrap.id = 'compare-btn-wrap';
    btnWrap.style.cssText = 'padding:0 0 10px;display:flex;justify-content:flex-end';

    if (_compareMode) {
      const hint = _compareSelected.length === 1
        ? 'Select 1 more scan'
        : 'Tap 2 scans to compare';
      btnWrap.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;width:100%">
          <span style="font-size:12px;color:var(--text-muted);flex:1;padding-left:2px">${hint}</span>
          <button onclick="progressModule.cancelCompare()"
            style="padding:7px 16px;border-radius:20px;border:1px solid rgba(196,120,138,0.4);
                   background:transparent;color:var(--text-muted);font-size:12px;cursor:pointer;
                   transition:all 0.2s cubic-bezier(0.4,0,0.2,1)">
            Cancel
          </button>
        </div>`;
    } else {
      btnWrap.innerHTML = `
        <button onclick="progressModule.startCompare()"
          style="padding:7px 18px;border-radius:20px;border:1px solid rgba(196,120,138,0.45);
                 background:rgba(196,120,138,0.08);color:var(--primary);font-size:12px;font-weight:600;
                 cursor:pointer;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);letter-spacing:0.3px">
          Compare Scans
        </button>`;
    }

    histWrap.parentNode.insertBefore(btnWrap, histWrap);
  }

  // ─── Toggle compare mode ─────────────────────
  function startCompare() {
    _compareMode = true;
    _compareSelected = [];
    _injectCompareButton();
    _renderHistory();
  }

  function cancelCompare() {
    _compareMode = false;
    _compareSelected = [];
    _injectCompareButton();
    _renderHistory();
  }

  function _selectForCompare(realIdx) {
    const pos = _compareSelected.indexOf(realIdx);
    if (pos > -1) {
      _compareSelected.splice(pos, 1);
    } else {
      if (_compareSelected.length >= 2) _compareSelected.shift();
      _compareSelected.push(realIdx);
    }

    if (_compareSelected.length === 2) {
      const sorted = [..._compareSelected].sort((a, b) => a - b);
      _compareMode = false;
      _compareSelected = [];
      _injectCompareButton();
      _renderHistory();
      _openCompareOverlay(sorted[0], sorted[1]); // older=left, newer=right
      return;
    }

    _injectCompareButton();
    _renderHistory();
  }

  // ─── Before/after comparison overlay ────────
  function _openCompareOverlay(idxOlder, idxNewer) {
    const before = state.scanHistory[idxOlder]; // older scan
    const after  = state.scanHistory[idxNewer]; // newer scan
    if (!before || !after) return;

    const dateOlder = new Date(before.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dateNewer = new Date(after.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const scoreDelta = (after.score && before.score) ? after.score - before.score : null;
    const deltaLabel = scoreDelta != null
      ? (scoreDelta > 0 ? `+${scoreDelta} improvement` : scoreDelta < 0 ? `${scoreDelta} decline` : 'No change')
      : '';
    const deltaColor = scoreDelta > 0 ? '#7EC8A0' : scoreDelta < 0 ? '#E06B6B' : 'var(--text-muted)';

    const ov = document.createElement('div');
    ov.id = 'compare-overlay';
    ov.style.cssText = `
      position:fixed;inset:0;z-index:400;background:#0A0510;
      display:flex;flex-direction:column;
      animation:fadeIn 0.22s ease;
      user-select:none;-webkit-user-select:none`;

    // Header
    const header = `
      <div style="padding:calc(var(--safe-top,0px) + 14px) 18px 12px;
                  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
                  border-bottom:1px solid rgba(255,255,255,0.07)">
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.88);letter-spacing:0.2px">
          Skin Comparison
        </div>
        <button id="compare-close-btn"
          style="width:32px;height:32px;border-radius:50%;border:none;
                 background:rgba(255,255,255,0.09);color:white;font-size:14px;
                 cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>`;

    // Slider arena — before image behind, after image clipped
    const beforeSrc = before.photo || '';
    const afterSrc  = after.photo  || '';
    const hasPhotos = !!(beforeSrc && afterSrc);

    const sliderArena = `
      <div id="compare-arena" style="flex:1;position:relative;overflow:hidden;cursor:ew-resize">
        ${hasPhotos ? `
          <img id="compare-img-before" src="${beforeSrc}"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
                   pointer-events:none">
          <img id="compare-img-after" src="${afterSrc}"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
                   clip-path:inset(0 50% 0 0);pointer-events:none;
                   transition:clip-path 0.05s linear">
        ` : `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
                      flex-direction:column;gap:12px;color:var(--text-muted)">
            <div style="font-size:36px;opacity:0.35">🌸</div>
            <div style="font-size:13px;opacity:0.6">No photos available for these scans</div>
            <div style="font-size:12px;opacity:0.45">Scores: ${before.score || '—'} → ${after.score || '—'}</div>
          </div>
        `}

        <!-- Drag handle -->
        <div id="compare-handle" style="
          position:absolute;top:0;bottom:0;left:50%;width:3px;
          background:rgba(255,255,255,0.85);transform:translateX(-50%);
          pointer-events:none;box-shadow:0 0 12px rgba(0,0,0,0.6);
          ${hasPhotos ? '' : 'display:none'}">
          <div style="
            position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:34px;height:34px;border-radius:50%;
            background:white;box-shadow:0 2px 10px rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
            font-size:14px;color:#222;pointer-events:none">⇔</div>
        </div>

        <!-- Labels -->
        <div style="position:absolute;top:14px;left:14px;
                    padding:4px 10px;border-radius:12px;
                    background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
                    font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);
                    pointer-events:none">
          Before · ${dateOlder}${before.score ? ` · ${before.score}` : ''}
        </div>
        <div style="position:absolute;top:14px;right:14px;
                    padding:4px 10px;border-radius:12px;
                    background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
                    font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);
                    pointer-events:none">
          After · ${dateNewer}${after.score ? ` · ${after.score}` : ''}
        </div>
      </div>`;

    // Footer
    const footer = `
      <div style="padding:13px 20px;padding-bottom:calc(13px + var(--safe-bottom,0px));
                  border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0;
                  display:flex;align-items:center;justify-content:space-between">
        <div>
          ${scoreDelta != null ? `
            <div style="font-size:18px;font-weight:800;color:${deltaColor};
                        font-family:'Cormorant Garamond',serif">${deltaLabel}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
              ${before.score} → ${after.score} over ${Math.round((new Date(after.date) - new Date(before.date)) / 86400000)} days
            </div>
          ` : `<div style="font-size:13px;color:var(--text-muted)">Drag the handle to compare</div>`}
        </div>
        <button class="btn-primary" style="padding:9px 22px;font-size:13px"
          onclick="document.getElementById('compare-overlay').remove()">
          Done
        </button>
      </div>`;

    ov.innerHTML = header + sliderArena + footer;
    document.body.appendChild(ov);

    // Wire close button
    ov.querySelector('#compare-close-btn').addEventListener('click', () => ov.remove());

    if (!hasPhotos) return;

    // ─── Drag mechanics ─────────────────────────
    const arena   = ov.querySelector('#compare-arena');
    const afterImg = ov.querySelector('#compare-img-after');
    const handle  = ov.querySelector('#compare-handle');
    let dragging  = false;

    // #ASSUMPTION: arena offsetLeft is ~0 since it's full-width
    const setDivider = (clientX) => {
      const rect = arena.getBoundingClientRect();
      let pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      afterImg.style.clipPath  = `inset(0 ${(100 - pct).toFixed(1)}% 0 0)`;
      handle.style.left        = `${pct}%`;
    };

    arena.addEventListener('mousedown', (e) => { dragging = true; setDivider(e.clientX); });
    window.addEventListener('mousemove', (e) => { if (dragging) setDivider(e.clientX); });
    window.addEventListener('mouseup',   () => { dragging = false; });

    arena.addEventListener('touchstart', (e) => { dragging = true; setDivider(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchmove',  (e) => { if (dragging) setDivider(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend',   () => { dragging = false; });
  }

  // ═══════════════════════════════════════════════
  //  SCORE TREND CHART
  // ═══════════════════════════════════════════════
  function _renderChart() {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;

    // Grab last 10 scored scans
    const scored = state.scanHistory
      .filter(s => typeof s.score === 'number' && s.score > 0)
      .slice(-10);

    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 300;
    const H   = 80;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);

    if (scored.length < 2) {
      // Not enough data — draw placeholder
      ctx.fillStyle = 'rgba(196,120,138,0.25)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan your skin to build your trend chart', W / 2, H / 2 + 4);
      return;
    }

    const minV = Math.max(0,   Math.min(...scored.map(s => s.score)) - 8);
    const maxV = Math.min(100, Math.max(...scored.map(s => s.score)) + 8);
    const range = maxV - minV || 1;

    const pts = scored.map((s, i) => ({
      x: (i / (scored.length - 1)) * (W - 24) + 12,
      y: H - 12 - ((s.score - minV) / range) * (H - 24),
    }));

    // Gradient area fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(196,120,138,0.4)');
    grad.addColorStop(1, 'rgba(196,120,138,0.02)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i-1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[pts.length-1].x, H);
    ctx.lineTo(pts[0].x, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Glow line
    ctx.shadowColor = 'rgba(196,120,138,0.7)';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i-1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = '#C4788A';
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Dots + score labels
    pts.forEach((pt, i) => {
      // Dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#EDB8C8';
      ctx.fill();
      ctx.strokeStyle = '#C4788A';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Score label above each dot
      ctx.fillStyle = 'rgba(242,235,240,0.7)';
      ctx.font      = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(scored[i].score), pt.x, pt.y - 8);
    });

    // Animate draw using clip path trick
    _animateChartDraw(canvas, ctx, pts, H, W);
  }

  /**
   * Animate the line drawing by revealing it left-to-right using
   * a clip rectangle that expands over 800ms.
   * Uses an offscreen canvas snapshot + drawImage so the clip is respected.
   */
  function _animateChartDraw(canvas, ctx, pts, H, W) {
    const total = 800;
    const start = performance.now();
    const DPR   = window.devicePixelRatio || 1;

    // Snapshot the already-drawn chart into an offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width  = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(canvas, 0, 0);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / total);
      const revealW  = progress * W;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, revealW, H);
      ctx.clip();
      // drawImage respects the clip path; putImageData does not
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height, 0, 0, W, H);
      ctx.restore();

      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ═══════════════════════════════════════════════
  //  SCAN HISTORY LIST
  // ═══════════════════════════════════════════════
  function _renderHistory() {
    const wrap = document.getElementById('progress-history');
    if (!wrap) return;

    if (!state.scanHistory.length) {
      wrap.innerHTML = `
        <div class="empty-progress">
          <div class="empty-progress-icon">✨</div>
          <div class="empty-progress-title">No scans yet</div>
          <div class="empty-progress-sub">Start scanning your skin daily to build your progress history. Even quick text descriptions count!</div>
          <button class="btn-primary" style="max-width:220px;margin:20px auto 0;display:block" onclick="showScreen('scan')">Scan My Skin →</button>
        </div>`;
      return;
    }

    const items = [...state.scanHistory].reverse().map((s, displayIdx) => {
      const realIdx    = state.scanHistory.length - 1 - displayIdx;
      const date       = new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const topConcern = s.concerns?.[0]?.name || (s.description ? s.description.slice(0, 40) + (s.description.length > 40 ? '…' : '') : '(Photo scan)');
      const score      = s.score || 0;
      const miniColor  = score >= 75 ? '#C4788A' : score >= 50 ? '#E6C96B' : '#E06B6B';

      const isSelected  = _compareSelected.includes(realIdx);
      const clickAction = _compareMode
        ? `progressModule._selectForCompare(${realIdx})`
        : `progressModule.viewScan(${realIdx})`;
      const cardBorder  = _compareMode && isSelected
        ? 'outline:2px solid #C4788A;outline-offset:2px;'
        : '';
      const selCircle   = _compareMode ? `
        <div style="
          position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;
          border:2px solid ${isSelected ? '#C4788A' : 'rgba(255,255,255,0.3)'};
          background:${isSelected ? '#C4788A' : 'transparent'};
          display:flex;align-items:center;justify-content:center;
          font-size:10px;color:white;z-index:1;pointer-events:none;
          transition:all 0.18s cubic-bezier(0.4,0,0.2,1)">
          ${isSelected ? '✓' : ''}
        </div>` : '';

      return `
        <div class="history-card" style="position:relative;${cardBorder}"
          onclick="${clickAction}"
          ${_compareMode ? '' : `oncontextmenu="progressModule.deleteScan(event, ${realIdx})"`}>
          ${selCircle}
          <div class="history-thumb">
            ${s.photo ? `<img src="${s.photo}" alt="Scan">` : '🌸'}
          </div>
          <div class="history-info">
            <div class="history-date">${date}</div>
            <div class="history-concern">${escHtml(topConcern)}</div>
          </div>
          ${score > 0 ? `
          <svg class="mini-score" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
            <circle cx="20" cy="20" r="16" fill="none" stroke="${miniColor}" stroke-width="3"
              stroke-dasharray="${2 * Math.PI * 16}" stroke-dashoffset="${2 * Math.PI * 16 * (1 - score / 100)}"
              transform="rotate(-90 20 20)" stroke-linecap="round"/>
            <text x="20" y="24" text-anchor="middle" fill="#F2EBF0" font-size="10" font-weight="800" font-family="Inter,sans-serif">${score}</text>
          </svg>` : ''}
        </div>`;
    }).join('');

    wrap.innerHTML = items;
  }

  // ─── View individual scan ───────────────────
  function viewScan(idx) {
    const s = state.scanHistory[idx];
    if (!s) return;
    const date = new Date(s.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const overlay = document.createElement('div');
    overlay.id = 'scan-detail-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);z-index:300;display:flex;flex-direction:column;animation:fadeIn 0.25s ease';
    const _closeOverlay = () => {
      overlay.style.transition = 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.4,0,1,1)';
      overlay.style.opacity    = '0';
      overlay.style.transform  = 'translateY(18px)';
      setTimeout(() => overlay.remove(), 230);
    };
    overlay.innerHTML = `
      <div style="padding:calc(var(--safe-top,0px) + 16px) 20px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.85)">${date}</div>
        <button id="scan-detail-close-x"
          style="width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      ${s.photo ? `<img src="${s.photo}" style="width:100%;max-height:45vh;object-fit:contain;flex-shrink:0">` : ''}
      <div style="flex:1;overflow-y:auto;padding:16px 20px 40px">
        ${s.score > 0 ? `<div style="text-align:center;margin-bottom:16px;font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--accent)">Score: ${s.score}</div>` : ''}
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--primary);margin-bottom:6px">Description</div>
        <div style="font-size:14px;color:var(--text);line-height:1.65;margin-bottom:16px">${escHtml(s.description || '(Photo scan)')}</div>
        ${s.analysis ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--primary);margin-bottom:6px">AI Analysis</div>
        <div style="font-size:14px;color:var(--text-muted);line-height:1.65">${escHtml(s.analysis)}</div>` : ''}
      </div>
      <div style="padding:12px 20px;padding-bottom:calc(12px + var(--safe-bottom,0px));border-top:1px solid var(--border);display:flex;gap:10px;flex-shrink:0">
        <button class="btn-secondary" style="flex:1" onclick="progressModule.deleteScanFromDetail(${idx})">Delete</button>
        <button class="btn-primary" style="flex:2" id="scan-detail-close-btn">Close</button>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('scan-detail-close-x')?.addEventListener('click', _closeOverlay);
    document.getElementById('scan-detail-close-btn')?.addEventListener('click', _closeOverlay);
  }

  // ─── Delete scan ────────────────────────────
  function deleteScan(event, idx) {
    event.preventDefault();
    if (!confirm('Delete this scan? This cannot be undone.')) return;
    _doDelete(idx);
  }

  function deleteScanFromDetail(idx) {
    if (!confirm('Delete this scan? This cannot be undone.')) return;
    const ov = document.getElementById('scan-detail-overlay');
    if (ov) {
      ov.style.transition = 'opacity 0.22s ease';
      ov.style.opacity    = '0';
      setTimeout(() => { ov.remove(); _doDelete(idx); }, 230);
    } else {
      _doDelete(idx);
    }
  }

  function _doDelete(idx) {
    state.scanHistory.splice(idx, 1);
    saveState();
    render();
    showToast('Scan deleted');
  }

  // ─── Public API ───────────────────────────────
  return {
    render,
    viewScan,
    deleteScan,
    deleteScanFromDetail,
    startCompare,
    cancelCompare,
    _selectForCompare,
  };
})();
