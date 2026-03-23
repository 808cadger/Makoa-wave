/* magic-link.js — One-tap API key sharing
 * Usage:
 *   MagicLink.apply('my_app_apikey')  — call in init(); saves ?key= param to localStorage
 *   MagicLink.copy('my_app_apikey')   — call from Settings button; copies shareable URL
 *
 * #ASSUMPTION: API key starts with 'sk-ant-' for basic validation
 * #ASSUMPTION: Codeberg Pages serves over HTTPS so clipboard API is available
 */
(function () {
  'use strict';

  // Read ?key= on load, stash it, clean URL immediately
  var _pending = null;
  try {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('key');
    if (raw && raw.startsWith('sk-ant-')) {
      _pending = raw;
      params.delete('key');
      var clean = location.pathname + (params.toString() ? '?' + params.toString() : '') + location.hash;
      history.replaceState({}, '', clean);
    }
  } catch (e) {}

  function _toast(msg) {
    if (typeof showToast === 'function') { showToast(msg); return; }
    // fallback: tiny self-removing div
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2000);
  }

  window.MagicLink = {
    /**
     * Call in app init — saves pending key from URL to localStorage.
     * @param {string} storageKey  e.g. 'glowai_apikey'
     * @returns {boolean} true if a key was applied
     */
    apply: function (storageKey) {
      if (!_pending) return false;
      try { localStorage.setItem(storageKey, _pending); } catch (e) {}
      _pending = null;
      _toast('API key applied from magic link ✓');
      return true;
    },
    /**
     * Call from a Settings button — copies a shareable URL with ?key= to clipboard.
     * @param {string} storageKey  e.g. 'glowai_apikey'
     */
    copy: function (storageKey) {
      var k = '';
      try { k = localStorage.getItem(storageKey) || ''; } catch (e) {}
      if (!k) { _toast('Save an API key in Settings first.'); return; }
      var url = location.origin + location.pathname + '?key=' + encodeURIComponent(k);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          _toast('Magic link copied! Share it to auto-fill your key.');
        }).catch(function () { _fallbackCopy(url); });
      } else { _fallbackCopy(url); }
    },
  };

  function _fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); _toast('Magic link copied!'); } catch (e) { _toast('Copy manually: ' + text); }
    ta.remove();
  }
})();
