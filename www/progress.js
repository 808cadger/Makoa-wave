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
  //  RENDER ENTRY POINT
  // ═══════════════════════════════════════════════
  function render() {
    _renderStats();
    _renderChart();
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
   */
  function _animateChartDraw(canvas, ctx, pts, H, W) {
    const total  = 800;
    const start  = performance.now();
    const img    = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / total);
      const revealW  = progress * W;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, revealW, H);
      ctx.clip();
      ctx.putImageData(img, 0, 0);
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
      const realIdx = state.scanHistory.length - 1 - displayIdx;
      const date    = new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const topConcern = s.concerns?.[0]?.name || (s.description ? s.description.slice(0, 40) + (s.description.length > 40 ? '…' : '') : '(Photo scan)');
      const score      = s.score || 0;
      const miniColor  = score >= 75 ? '#C4788A' : score >= 50 ? '#E6C96B' : '#E06B6B';

      return `
        <div class="history-card" onclick="progressModule.viewScan(${realIdx})" oncontextmenu="progressModule.deleteScan(event, ${realIdx})">
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
    overlay.innerHTML = `
      <div style="padding:calc(var(--safe-top,0px) + 16px) 20px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.85)">${date}</div>
        <button onclick="document.getElementById('scan-detail-overlay').remove()"
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
        <button class="btn-primary" style="flex:2" onclick="document.getElementById('scan-detail-overlay').remove()">Close</button>
      </div>`;
    document.body.appendChild(overlay);
  }

  // ─── Delete scan ────────────────────────────
  function deleteScan(event, idx) {
    event.preventDefault();
    if (!confirm('Delete this scan? This cannot be undone.')) return;
    _doDelete(idx);
  }

  function deleteScanFromDetail(idx) {
    if (!confirm('Delete this scan? This cannot be undone.')) return;
    document.getElementById('scan-detail-overlay')?.remove();
    _doDelete(idx);
  }

  function _doDelete(idx) {
    state.scanHistory.splice(idx, 1);
    saveState();
    render();
    showToast('Scan deleted');
  }

  // ─── Public API ───────────────────────────────
  return { render, viewScan, deleteScan, deleteScanFromDetail };
})();
