// onboard.js — GlowAI 3-step onboarding
// Aloha from Pearl City! 🌺

const glowOnboard = (() => {
  let _step = 0;
  const TOTAL = 3;

  function next() {
    _step++;
    if (_step >= TOTAL) { finish(); return; }
    _show(_step);
  }

  function skip() {
    finish();
  }

  function finish() {
    localStorage.setItem('glow_onboarded', '1');
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

  return { next, skip, finish };
})();
