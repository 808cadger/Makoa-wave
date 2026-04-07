// state.js — GlowAI Centralized State Store
// Aloha from Pearl City!

const glowState = (() => {
  'use strict';

  // ── Default shape ──
  const _defaults = {
    authToken:   '',
    userEmail:   '',
    demoMode:    false,
    skinType:    '',
    onboarded:   false,
    scanHistory: [],
    currentResult: null,
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
    const saved = localStorage.getItem('glowai_state');
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
      authToken:   s.authToken,
      userEmail:   s.userEmail,
      demoMode:    s.demoMode,
      skinType:    s.skinType,
      onboarded:   s.onboarded,
      scanHistory: s.scanHistory,
    };
    try {
      localStorage.setItem('glowai_state', JSON.stringify(toSave));
    } catch (e) {
      // #ASSUMPTION: localStorage quota ~5MB; scan history photos are the main risk
      console.warn('[GlowAI] localStorage save failed:', e.message);
    }
  }

  const state = _load();

  // ── Public API ──
  return {
    get authToken()      { return state.authToken; },
    set authToken(v)     { state.authToken = v; _save(state); },

    get userEmail()      { return state.userEmail; },
    set userEmail(v)     { state.userEmail = v; _save(state); },

    get demoMode()       { return state.demoMode; },
    set demoMode(v)      { state.demoMode = v; _save(state); },

    get skinType()       { return state.skinType; },
    set skinType(v)      { state.skinType = v; _save(state); },

    get onboarded()      { return state.onboarded; },
    set onboarded(v)     { state.onboarded = v; _save(state); },

    get scanHistory()    { return state.scanHistory; },
    set scanHistory(v)   { state.scanHistory = v; _save(state); },

    // transient — not persisted
    get currentResult()  { return state.currentResult; },
    set currentResult(v) { state.currentResult = v; },

    persist() { _save(state); },

    reset() {
      Object.assign(state, _defaults);
      localStorage.removeItem('glowai_state');
    },
  };
})();
