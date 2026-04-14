// language.js — Makoa~Wave language picker screen
// Aloha from Pearl City!

const glowLang = (() => {
  'use strict';

  // #ASSUMPTION: glowState and glowRouter are loaded before this file

  function pick(btn) {
    const lang = btn.dataset.lang;
    const flag = btn.querySelector('span')?.previousSibling?.textContent || '';
    glowState.language = lang;
    glowState.languageFlag = btn.textContent.trim().charAt(0) + btn.textContent.trim().charAt(1);
    glowState.persist();
    glowRouter.show('search');
  }

  function init() {
    // Highlight previously selected language
    const saved = glowState.language;
    if (!saved) return;
    document.querySelectorAll('.lang-chip').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.lang === saved);
    });
  }

  return { pick, init };
})();
