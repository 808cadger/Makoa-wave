// app.js — GlowAI clean slate
// Aloha from Pearl City! 🌺

// ── State ──────────────────────────────────────────────
const glowState = {
  apiKey:      localStorage.getItem('glow_apikey') || '',
  demoMode:    localStorage.getItem('glow_demo') === '1',
  scanHistory: JSON.parse(localStorage.getItem('glow_scans') || '[]'),
  currentResult: null,
};

// ── App controller ──────────────────────────────────────
const glowApp = (() => {

  function init() {
    const keyEl = document.getElementById('settings-apikey');
    if (keyEl && glowState.apiKey) keyEl.value = glowState.apiKey;
    _syncDemoBtn();

    // Splash → scan
    setTimeout(() => {
      document.getElementById('splash').classList.remove('active');
      document.getElementById('scan').classList.add('active');
      _initFloatIcons();
    }, 2200);
  }

  function saveSettings() {
    const val = document.getElementById('settings-apikey')?.value.trim() || '';
    if (val) {
      glowState.apiKey = val;
      localStorage.setItem('glow_apikey', val);
      showToast('API key saved ✓');
    }
    closeSheet('settings-sheet');
  }

  function toggleDemo() {
    glowState.demoMode = !glowState.demoMode;
    localStorage.setItem('glow_demo', glowState.demoMode ? '1' : '0');
    _syncDemoBtn();
    showToast(glowState.demoMode ? 'Demo mode on ✓' : 'Demo mode off');
  }

  function _syncDemoBtn() {
    const btn = document.getElementById('btn-demo');
    if (!btn) return;
    btn.textContent = glowState.demoMode ? 'Disable Demo Mode' : 'Enable Demo Mode';
    btn.classList.toggle('on', glowState.demoMode);
  }

  function resetApp() {
    if (!confirm('Reset all scan data?')) return;
    ['glow_apikey','glow_demo','glow_scans'].forEach(k => localStorage.removeItem(k));
    // Also clear icon positions
    Object.keys(localStorage).filter(k => k.startsWith('glow_pos_')).forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  // ── Floating icon drag ─────────────────────────────────
  const _defaultPos = {
    'float-camera':   { right: 22, bottom: 200 },
    'float-settings': { right: 22, bottom: 130 },
    'float-history':  { left:  22, bottom: 130 },
    'float-concerns': { left:  22, bottom: 200 },
    'float-analyze':  { left:  22, bottom: 60  },
  };

  function _initFloatIcons() {
    document.querySelectorAll('.float-icon').forEach(el => {
      const key    = el.dataset.key;
      const saved  = _loadPos(key);
      const pos    = saved || _defaultPos[key] || { right: 22, bottom: 130 };
      _applyPos(el, pos);
      _makeDraggable(el, key);
    });
  }

  function _applyPos(el, pos) {
    el.style.left   = pos.left   !== undefined ? (typeof pos.left   === 'number' ? pos.left   + 'px' : pos.left)   : '';
    el.style.right  = pos.right  !== undefined ? (typeof pos.right  === 'number' ? pos.right  + 'px' : pos.right)  : '';
    el.style.top    = pos.top    !== undefined ? (typeof pos.top    === 'number' ? pos.top    + 'px' : pos.top)    : '';
    el.style.bottom = pos.bottom !== undefined ? (typeof pos.bottom === 'number' ? pos.bottom + 'px' : pos.bottom) : '';
  }

  function _makeDraggable(el, key) {
    let sx, sy, ex, ey, dragging = false, moved = false;

    function start(cx, cy) {
      const r = el.getBoundingClientRect();
      sx = cx; sy = cy; ex = r.left; ey = r.top;
      dragging = true; moved = false;
      el.style.transition = 'none';
      // Convert to top/left absolute
      el.style.right = ''; el.style.bottom = '';
      el.style.left = ex + 'px'; el.style.top = ey + 'px';
    }

    function move(cx, cy) {
      if (!dragging) return;
      const dx = cx - sx, dy = cy - sy;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      if (!moved) return;
      const nx = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  ex + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, ey + dy));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      el.style.transition = '';
      if (moved) _savePos(key, { left: parseInt(el.style.left), top: parseInt(el.style.top) });
    }

    el.addEventListener('touchstart', e => { start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener('touchmove',  e => { move(e.touches[0].clientX,  e.touches[0].clientY); e.preventDefault(); }, { passive: false });
    el.addEventListener('touchend',   e => {
      const wasMoved = moved;
      end();
      // If it was a tap (no drag), fire the action
      if (!wasMoved) _tapAction(key);
    });

    el.addEventListener('mousedown', e => { start(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup',   () => {
      const wasMoved = moved;
      end();
      if (!wasMoved && dragging === false && el.matches(':hover')) _tapAction(key);
    });
  }

  function _tapAction(key) {
    switch (key) {
      case 'float-camera':   glowScan.openCamera();           break;
      case 'float-settings': openSheet('settings-sheet');     break;
      case 'float-history':  openSheet('history-sheet');      break;
      case 'float-concerns': openSheet('concerns-sheet');     break;
      case 'float-analyze':  glowScan.analyze();              break;
    }
  }

  function _savePos(key, pos) {
    try { localStorage.setItem('glow_pos_' + key, JSON.stringify(pos)); } catch(e) {}
  }
  function _loadPos(key) {
    try { const v = localStorage.getItem('glow_pos_' + key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
  }

  return { init, saveSettings, toggleDemo, resetApp };
})();

// ── Sheet helpers ───────────────────────────────────────
function openSheet(id) {
  document.getElementById('sheet-overlay').classList.add('open');
  if (id === 'history-sheet') _renderHistory();
  document.getElementById(id).classList.add('open');
}
function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.querySelectorAll('.sheet.open').length) {
    document.getElementById('sheet-overlay').classList.remove('open');
  }
}
function closeAllSheets() {
  document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open'));
  document.getElementById('sheet-overlay').classList.remove('open');
}

// ── Toast ───────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── History ─────────────────────────────────────────────
function _renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  const scans = glowState.scanHistory;
  if (!scans.length) {
    list.innerHTML = `<div style="color:#aaa;text-align:center;padding:40px 0;font-size:14px">No scans yet — take your first photo!</div>`;
    return;
  }
  list.innerHTML = [...scans].reverse().map((s, i) => {
    const date  = new Date(s.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const thumb = s.photo
      ? `<img class="hist-thumb" src="${s.photo}" alt="">`
      : `<div class="hist-placeholder">✨</div>`;
    const realIdx = scans.length - 1 - i;
    return `<div class="hist-item" onclick="glowScan.loadHistory(${realIdx})">
      ${thumb}
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;color:#111">${s.skinType || 'Skin Scan'}</div>
        <div class="hist-date">${date}</div>
      </div>
      <div class="hist-score">${s.score ?? '—'}</div>
    </div>`;
  }).join('');
}

// ── Init ────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', glowApp.init);
} else {
  glowApp.init();
}
