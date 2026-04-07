// onboard.js — GlowAI 3-step onboarding with skin type picker
// Aloha from Pearl City!

const glowOnboard = (() => {
  'use strict';

  let _step = 0;
  const TOTAL = 3;

  function pickType(el) {
    document.querySelectorAll('.ob-type-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    glowState.skinType = el.dataset.type;
    const btn = document.getElementById('ob-type-next');
    if (btn) btn.disabled = false;
  }

  function next() {
    if (_step === 0) {
      const selected = document.querySelector('.ob-type-chip.selected');
      if (!selected) { showToast('Tap a skin type first'); return; }
    }
    _step++;
    if (_step >= TOTAL) { finish(); return; }
    _show(_step);
  }

  function skip() {
    if (!glowState.skinType) glowState.skinType = 'Combination';
    finish();
  }

  function finish() {
    glowState.onboarded = true;
    glowApp.enterScan();
  }

  function _show(i) {
    document.querySelectorAll('.ob-step').forEach((el, idx) => {
      el.classList.toggle('active', idx === i);
    });
    document.querySelectorAll('.ob-dot').forEach((el, idx) => {
      el.classList.toggle('on', idx === i);
    });
    _step = i;
  }

  return { next, skip, finish, pickType };
})();
