/**
 * share-widget.js — GlowAI Share Widget
 *
 * Lightweight share helper. If loaded, attaches a share button
 * accessible from settings or wherever needed.
 * Uses Web Share API when available, falls back to clipboard copy.
 */

(function () {
  'use strict';

  const SHARE_URL = 'https://cadger808.codeberg.page/glowai';
  const SHARE_TITLE = 'GlowAI — Your AI Skincare Esthetician';
  const SHARE_TEXT  = 'Check out GlowAI — an AI-powered skincare app that analyzes your skin and builds personalized routines! 🌸';

  /**
   * Share the GlowAI PWA link using Web Share API or clipboard.
   */
  window.shareGlowAI = function () {
    if (navigator.share) {
      navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL })
        .then(() => { if (typeof showToast === 'function') showToast('Shared! 💕'); })
        .catch(() => _copyFallback());
    } else {
      _copyFallback();
    }
  };

  function _copyFallback() {
    try {
      navigator.clipboard.writeText(SHARE_URL)
        .then(() => { if (typeof showToast === 'function') showToast('Link copied to clipboard! 🌸'); })
        .catch(_legacyCopy);
    } catch(e) {
      _legacyCopy();
    }
  }

  function _legacyCopy() {
    const el = document.createElement('textarea');
    el.value = SHARE_URL;
    el.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); if (typeof showToast === 'function') showToast('Link copied! 🌸'); } catch(e) {}
    el.remove();
  }
})();
