// state.js — Makoa~Wave Centralized State Store
// Aloha from Pearl City!

const glowState = (() => {
  'use strict';

  // ── Default shape ──
  const _defaults = {
    language:       '',
    languageFlag:   '',
    recentSearches: [],
    currentResult:  null,
  };

  // ── Load from localStorage, migrating legacy keys ──
  function _load() {
    const s = Object.assign({}, _defaults);

    // Migrate legacy keys from pre-auth version
    const oldDemo  = localStorage.getItem('glow_demo');
    const oldType  = localStorage.getItem('glow_skin_type');
    const oldBoard = localStorage.getItem('glow_onboarded');
    const oldScans = localStorage.getItem('glow_scans');

    // Load new unified key first
    const saved = localStorage.getItem('makoa_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(s, parsed);
      } catch (e) {
        // corrupted — start fresh
      }
    }

    // Legacy overrides (migration path — one-time)
    if (oldDemo)  s.demoMode  = oldDemo === '1';
    if (oldType)  s.skinType  = oldType;
    if (oldBoard) s.onboarded = oldBoard === '1';
    if (oldScans) {
      try { s.scanHistory = JSON.parse(oldScans); } catch (e) {}
    }

    // Clean up legacy keys after migration
    if (oldDemo || oldType || oldBoard || oldScans) {
      ['glow_demo', 'glow_skin_type', 'glow_onboarded', 'glow_scans', 'glow_apikey'].forEach(k =>
        localStorage.removeItem(k),
      );
      Object.keys(localStorage).filter(k => k.startsWith('glow_pos_')).forEach(k =>
        localStorage.removeItem(k),
      );
      _save(s);
    }

    return s;
  }

  // ── Persist to localStorage ──
  function _save(s) {
    const toSave = {
      language:       s.language,
      languageFlag:   s.languageFlag,
      recentSearches: s.recentSearches,
    };
    try {
      localStorage.setItem('makoa_state', JSON.stringify(toSave));
    } catch (e) {
      console.warn('[Makoa~Wave] localStorage save failed:', e.message);
    }
  }

  const state = _load();

  // ── Public API ──
  return {
    get language()        { return state.language; },
    set language(v)       { state.language = v; _save(state); },

    get languageFlag()    { return state.languageFlag; },
    set languageFlag(v)   { state.languageFlag = v; _save(state); },

    get recentSearches()  { return state.recentSearches; },
    set recentSearches(v) { state.recentSearches = v; _save(state); },

    // transient
    get currentResult()   { return state.currentResult; },
    set currentResult(v)  { state.currentResult = v; },

    persist() { _save(state); },

    reset() {
      Object.assign(state, _defaults);
      localStorage.removeItem('makoa_state');
    },
  };
})();
