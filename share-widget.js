/**
 * share-widget.js — Floating Share Widget
 * Bottom-left corner: shows PWA share URL + copy/share/install actions.
 * Per-app URL read from <meta name="share-url"> or falls back to window.SHARE_URL.
 */
(function () {
  'use strict';

  /* ─── Config ─────────────────────────────────────────────────── */
  function getShareUrl() {
    var m = document.querySelector('meta[name="share-url"]');
    if (m && m.content) return m.content;
    return window.SHARE_URL || 'https://cadger808.codeberg.page/glowai';
  }
  function getShareTitle() {
    var m = document.querySelector('meta[name="application-name"]');
    return (m && m.content) ? m.content : (document.title || 'App');
  }
  function getShareText() {
    var m = document.querySelector('meta[name="description"]');
    return (m && m.content) ? m.content : 'Check out this free AI app!';
  }
  function getApkUrl() {
    var m = document.querySelector('meta[name="apk-url"]');
    return (m && m.content) ? m.content : '';
  }

  /* ─── Styles ──────────────────────────────────────────────────── */
  var CSS = [
    '.sw-wrap{position:fixed;bottom:22px;left:18px;z-index:99998;display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif}',
    /* FAB button */
    '.sw-fab{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:2px solid rgba(255,255,255,0.15);box-shadow:0 4px 20px rgba(0,0,0,0.45);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;outline:none}',
    '.sw-fab:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,0.55)}',
    '.sw-fab svg{width:24px;height:24px}',
    /* Popup card */
    '.sw-card{background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px;width:240px;box-shadow:0 8px 32px rgba(0,0,0,0.6);display:none;flex-direction:column;gap:10px}',
    '.sw-card.open{display:flex}',
    '.sw-label{color:rgba(255,255,255,0.5);font-size:10px;letter-spacing:.08em;text-transform:uppercase;margin:0}',
    '.sw-url{color:#fff;font-size:12px;word-break:break-all;background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;line-height:1.4;margin:0}',
    '.sw-actions{display:flex;gap:8px}',
    '.sw-btn{flex:1;padding:9px 0;border-radius:10px;border:none;cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.02em;transition:opacity .15s}',
    '.sw-btn:hover{opacity:.85}',
    '.sw-btn.copy{background:rgba(255,255,255,0.1);color:#fff}',
    '.sw-btn.share{background:linear-gradient(135deg,var(--sw-accent,#6366f1),var(--sw-accent2,#8b5cf6));color:#fff}',
    '.sw-install{width:100%;padding:9px 0;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:rgba(255,255,255,0.7);font-size:12px;font-weight:600;cursor:pointer;transition:background .15s,color .15s;display:none}',
    '.sw-install:hover{background:rgba(255,255,255,0.08);color:#fff}',
    '.sw-install.visible{display:block}',
    '.sw-download{width:100%;padding:9px 0;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.85);font-size:12px;font-weight:600;cursor:pointer;transition:background .15s,color .15s;text-decoration:none;display:none;text-align:center;line-height:2}',
    '.sw-download.visible{display:block}',
    '.sw-download:hover{background:rgba(255,255,255,0.14);color:#fff}',
    '.sw-toast{position:fixed;bottom:90px;left:18px;background:rgba(30,30,50,0.95);color:#fff;padding:8px 14px;border-radius:10px;font-size:13px;z-index:100000;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;pointer-events:none}',
    '.sw-toast.show{opacity:1;transform:translateY(0)}'
  ].join('');

  /* ─── Build DOM ───────────────────────────────────────────────── */
  function build() {
    if (document.getElementById('sw-wrap')) return;

    var url    = getShareUrl();
    var title  = getShareTitle();
    var text   = getShareText();
    var apkUrl = getApkUrl();

    // Accent color from meta (matches per-app brand) or default purple
    var accentMeta = document.querySelector('meta[name="theme-color"]');
    var accent = (accentMeta && accentMeta.content) ? accentMeta.content : '#6366f1';

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'sw-wrap';
    wrap.className = 'sw-wrap';
    wrap.style.setProperty('--sw-accent', accent);
    wrap.style.setProperty('--sw-accent2', accent + 'bb');

    var card = document.createElement('div');
    card.className = 'sw-card';
    card.innerHTML =
      '<p class="sw-label">Share this app</p>' +
      '<p class="sw-url">' + url + '</p>' +
      '<div class="sw-actions">' +
        '<button class="sw-btn copy" id="sw-copy">Copy link</button>' +
        (navigator.share ? '<button class="sw-btn share" id="sw-share">Share</button>' : '') +
      '</div>' +
      '<button class="sw-install" id="sw-install">+ Add to Home Screen</button>' +
      (apkUrl ? '<a class="sw-download visible" id="sw-download" href="' + apkUrl + '" target="_blank" rel="noopener">&#11015; Download APK</a>' : '');

    var fab = document.createElement('button');
    fab.className = 'sw-fab';
    fab.setAttribute('aria-label', 'Share app');
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>' +
        '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
      '</svg>';

    wrap.appendChild(card);
    wrap.appendChild(fab);
    document.body.appendChild(wrap);

    // Toast
    var toast = document.createElement('div');
    toast.className = 'sw-toast';
    toast.id = 'sw-toast';
    document.body.appendChild(toast);

    /* ─── Install prompt ──────────────────────────────────────── */
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      var btn = document.getElementById('sw-install');
      if (btn) btn.classList.add('visible');
    });
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'sw-install' && deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
      }
    });

    /* ─── Toggle ──────────────────────────────────────────────── */
    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      card.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) card.classList.remove('open');
    });

    /* ─── Copy ────────────────────────────────────────────────── */
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'sw-copy') {
        try {
          navigator.clipboard.writeText(url).then(function () {
            showSwToast('Link copied!');
          }).catch(function () { legacyCopy(url); });
        } catch (_) { legacyCopy(url); }
      }
    });

    /* ─── Web Share ───────────────────────────────────────────── */
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'sw-share') {
        navigator.share({ title: title, text: text, url: url }).catch(function () {});
      }
    });
  }

  function showSwToast(msg) {
    var t = document.getElementById('sw-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function legacyCopy(url) {
    var el = document.createElement('textarea');
    el.value = url;
    el.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); showSwToast('Link copied!'); } catch (_) {}
    el.remove();
  }

  /* ─── Init ────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  // Also expose legacy helper so existing callsites still work
  window.shareGlowAI = function () {
    var url   = getShareUrl();
    var title = getShareTitle();
    var text  = getShareText();
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () { legacyCopy(url); });
    } else {
      legacyCopy(url);
    }
  };

})();
