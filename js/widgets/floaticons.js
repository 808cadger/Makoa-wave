// floaticons.js — GlowAI floating draggable icon system
// Aloha from Pearl City!

const glowFloatIcons = (() => {
  'use strict';

  // #ASSUMPTION: icon IDs match data-key attributes in the DOM
  const _defaultPos = {
    'float-camera':   { right: 22, bottom: 200 },
    'float-settings': { right: 22, bottom: 130 },
    'float-history':  { left:  22, bottom: 130 },
    'float-concerns': { left:  22, bottom: 200 },
    'float-analyze':  { left:  22, bottom: 60  },
  };

  function init() {
    document.querySelectorAll('.float-icon').forEach(el => {
      const key   = el.dataset.key;
      const saved = _loadPos(key);
      const pos   = saved || _defaultPos[key] || { right: 22, bottom: 130 };
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
    el.addEventListener('touchend', () => {
      const wasMoved = moved;
      end();
      if (!wasMoved) _tapAction(key);
    });

    el.addEventListener('mousedown', e => { start(e.clientX, e.clientY); e.preventDefault(); });
    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => {
      const wasMoved = moved;
      const wasOver  = el.matches(':hover');
      end();
      if (!wasMoved && wasOver) _tapAction(key);
    });
  }

  function _tapAction(key) {
    switch (key) {
      case 'float-camera':   glowScan.openCamera();       break;
      case 'float-settings': openSheet('settings-sheet'); break;
      case 'float-history':  openSheet('history-sheet');  break;
      case 'float-concerns': openSheet('concerns-sheet'); break;
      case 'float-analyze':  glowScan.analyze();          break;
    }
  }

  function _savePos(key, pos) {
    try { localStorage.setItem('glow_pos_' + key, JSON.stringify(pos)); } catch (e) {}
  }

  function _loadPos(key) {
    try {
      const v = localStorage.getItem('glow_pos_' + key);
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }

  return { init };
})();
