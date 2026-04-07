// router.js — GlowAI Hash-Based Screen Router
// Aloha from Pearl City!

const glowRouter = (() => {
  'use strict';

  const _screens = ['splash', 'onboarding', 'scan'];
  let _current = null;
  let _onNavigate = null;

  function show(name) {
    if (!_screens.includes(name)) {
      console.warn('[GlowAI] Unknown screen:', name);
      return;
    }
    // Hide all screens
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    // Show target
    const el = document.getElementById(name);
    if (el) el.classList.add('active');
    _current = name;
    // Update hash without triggering hashchange
    if (location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
    // Notify listeners
    if (_onNavigate) _onNavigate(name);
  }

  function current() {
    return _current;
  }

  function onNavigate(fn) {
    _onNavigate = fn;
  }

  // Listen for hash changes (browser back/forward)
  function _handleHash() {
    const hash = location.hash.replace('#', '');
    if (hash && _screens.includes(hash)) {
      show(hash);
    }
  }

  function init() {
    window.addEventListener('hashchange', _handleHash);
  }

  return { show, current, onNavigate, init };
})();
