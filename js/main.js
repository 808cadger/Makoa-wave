// main.js — Makoa~Wave app controller
// Aloha from Pearl City!

const glowApp = (() => {
  'use strict';

  function init() {
    glowRouter.init();

    // Splash → language picker (first time) or search (returning user)
    setTimeout(() => {
      if (glowState.language) {
        glowRouter.show('search');
        glowSearch.init();
      } else {
        glowRouter.show('language');
        glowLang.init();
      }
    }, 1200);

    // Re-init search screen whenever it becomes active
    glowRouter.onNavigate(screen => {
      if (screen === 'search') glowSearch.init();
      if (screen === 'language') glowLang.init();
    });
  }

  return { init };
})();

// ── Boot ──────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', glowApp.init);
} else {
  glowApp.init();
}
