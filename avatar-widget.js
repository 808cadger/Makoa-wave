(function () {

  /* ── Greetings ─────────────────────────────────────────────── */
  var LINES = [
    "Hello there! The Force is with you.",
    "May the Force guide you, Padawan.",
    "Do. Or do not. There is no try.",
    "Your focus determines your reality.",
    "The Force is strong with this one.",
    "Patience, young Padawan.",
    "A Jedi uses the Force for knowledge.",
    "In the Force, there are no accidents.",
    "Luminous beings are we.",
    "Fear leads to the dark side.",
    "Size matters not.",
    "Always pass on what you have learned.",
    "Feel the Force flowing through you.",
    "The greatest teacher, failure is.",
    "Truly wonderful, the mind of a builder is.",
  ];

  var idx = -1;
  function nextLine() {
    var n; do { n = Math.floor(Math.random() * LINES.length); } while (n === idx);
    idx = n; return LINES[n];
  }

  /* ── Open Perplexity ───────────────────────────────────────── */
  function openPerplexity(query) {
    var url = query
      ? 'https://www.perplexity.ai/search?q=' + encodeURIComponent(query)
      : 'https://www.perplexity.ai';
    // _system opens native browser in Capacitor/Cordova
    var w = window.open(url, '_system');
    if (!w) { window.location.href = url; }
  }

  /* ── CSS ───────────────────────────────────────────────────── */
  var CSS = [
    '.swa{position:fixed;bottom:20px;right:16px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:sans-serif}',
    '.swa-bubble{background:#0a0e1a;border:1px solid #4fc3f7;border-radius:12px 12px 3px 12px;color:#e3f2fd;font-size:9px;line-height:1.4;max-width:170px;padding:8px 10px;word-break:break-word;position:relative}',
    '.swa-bubble:after{content:"";position:absolute;bottom:-8px;right:14px;border:4px solid transparent;border-top-color:#4fc3f7}',
    '.swa-msg{display:block;margin-bottom:6px;min-height:10px}',
    '.swa-bar{display:flex;align-items:center;gap:4px;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.35);border-radius:20px;padding:3px 7px}',
    '.swa-bar input{flex:1;background:transparent;border:none;outline:none;color:#e3f2fd;font-size:9px;min-width:0;caret-color:#4fc3f7}',
    '.swa-bar input::placeholder{color:rgba(179,229,252,0.4)}',
    '.swa-go{background:none;border:none;color:#4fc3f7;font-size:11px;cursor:pointer;padding:0;line-height:1}',
    '.swa-more{display:block;text-align:right;font-size:8px;color:#4fc3f7;margin-top:5px;cursor:pointer;opacity:0.7;text-decoration:underline}',
    '.swa-droid{width:60px;height:60px;cursor:pointer;filter:drop-shadow(0 0 8px rgba(79,195,247,0.5))}',
    '@keyframes swa-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '@keyframes swa-glow{0%,100%{opacity:1}50%{opacity:0.3}}',
    '@keyframes swa-blink{0%,88%,100%{opacity:1}94%{opacity:0}}',
    '.swa-droid{animation:swa-bob 3s ease-in-out infinite}',
    '.swa-eye{animation:swa-glow 2s ease-in-out infinite}',
    '.swa-ant{animation:swa-blink 2s ease-in-out infinite}',
  ].join('');

  /* ── SVG droid ─────────────────────────────────────────────── */
  var SVG = '<svg width="60" height="74" viewBox="0 0 60 74" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="16" y="52" width="7" height="16" rx="3" fill="#90a4ae"/>'
    + '<rect x="37" y="52" width="7" height="16" rx="3" fill="#90a4ae"/>'
    + '<rect x="13" y="64" width="12" height="4" rx="2" fill="#607d8b"/>'
    + '<rect x="35" y="64" width="12" height="4" rx="2" fill="#607d8b"/>'
    + '<rect x="12" y="28" width="36" height="28" rx="7" fill="#1a237e"/>'
    + '<rect x="12" y="28" width="36" height="28" rx="7" fill="url(#bg)"/>'
    + '<line x1="19" y1="34" x2="19" y2="50" stroke="#4fc3f7" stroke-width="0.7" opacity="0.5"/>'
    + '<line x1="41" y1="34" x2="41" y2="50" stroke="#4fc3f7" stroke-width="0.7" opacity="0.5"/>'
    + '<circle cx="30" cy="42" r="4" fill="#4fc3f7" opacity="0.9"/>'
    + '<circle cx="30" cy="42" r="2.5" fill="#e3f2fd"/>'
    + '<path d="M12 26 Q12 8 30 8 Q48 8 48 26 Z" fill="#1565c0"/>'
    + '<path d="M12 26 Q12 8 30 8 Q48 8 48 26 Z" fill="url(#dg)"/>'
    + '<path d="M14 20 Q30 15 46 20" stroke="#4fc3f7" stroke-width="1.2" fill="none" opacity="0.5"/>'
    + '<circle cx="30" cy="18" r="6" fill="#0d1b2a"/>'
    + '<circle class="swa-eye" cx="30" cy="18" r="4" fill="#4fc3f7"/>'
    + '<circle cx="30" cy="18" r="2.5" fill="#e3f2fd"/>'
    + '<circle cx="28.5" cy="16.5" r="0.8" fill="white" opacity="0.8"/>'
    + '<circle cx="17" cy="18" r="2" fill="#37474f"/><circle cx="17" cy="18" r="1.2" fill="#4fc3f7" opacity="0.7"/>'
    + '<circle cx="43" cy="18" r="2" fill="#37474f"/><circle cx="43" cy="18" r="1.2" fill="#4fc3f7" opacity="0.7"/>'
    + '<line x1="30" y1="8" x2="30" y2="3" stroke="#78909c" stroke-width="1.5"/>'
    + '<circle class="swa-ant" cx="30" cy="2" r="2" fill="#f44336"/>'
    + '<rect x="6" y="32" width="6" height="16" rx="3" fill="#263238"/>'
    + '<rect x="4" y="43" width="9" height="4" rx="2" fill="#37474f"/>'
    + '<rect x="48" y="32" width="6" height="16" rx="3" fill="#263238"/>'
    + '<rect x="47" y="43" width="9" height="4" rx="2" fill="#37474f"/>'
    + '<defs>'
    + '<linearGradient id="bg" x1="12" y1="28" x2="48" y2="56" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#1565c0" stop-opacity="0.8"/><stop offset="100%" stop-color="#0d1b2a"/></linearGradient>'
    + '<linearGradient id="dg" x1="12" y1="8" x2="48" y2="26" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#42a5f5" stop-opacity="0.25"/><stop offset="100%" stop-color="#1565c0" stop-opacity="0"/></linearGradient>'
    + '</defs></svg>';

  /* ── Type writer ───────────────────────────────────────────── */
  var timer = null;
  var charTimer = null;

  function typeText(el, text, done) {
    clearInterval(charTimer);
    el.textContent = '';
    var i = 0;
    charTimer = setInterval(function () {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(charTimer); if (done) done(); }
    }, 30);
  }

  /* ── Build widget ──────────────────────────────────────────── */
  function build() {
    var root = document.getElementById('sw-avatar');
    if (!root) return;

    // Inject CSS once
    if (!document.getElementById('swa-css')) {
      var s = document.createElement('style');
      s.id = 'swa-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }

    var wrap = document.createElement('div');
    wrap.className = 'swa';

    /* bubble */
    var bubble = document.createElement('div');
    bubble.className = 'swa-bubble';

    var msg = document.createElement('span');
    msg.className = 'swa-msg';

    /* search bar */
    var bar = document.createElement('div');
    bar.className = 'swa-bar';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Ask Perplexity…';

    var go = document.createElement('button');
    go.className = 'swa-go';
    go.textContent = '›';

    bar.appendChild(inp);
    bar.appendChild(go);

    /* tap for more */
    var more = document.createElement('span');
    more.className = 'swa-more';
    more.textContent = 'tap for more ›';

    bubble.appendChild(msg);
    bubble.appendChild(bar);
    bubble.appendChild(more);

    /* droid */
    var droid = document.createElement('div');
    droid.className = 'swa-droid';
    droid.innerHTML = SVG;

    wrap.appendChild(bubble);
    wrap.appendChild(droid);
    root.appendChild(wrap);

    /* ── actions ── */
    function search() {
      openPerplexity(inp.value.trim());
    }

    go.onclick = search;
    inp.onkeydown = function (e) { if (e.key === 'Enter') search(); };

    // "tap for more" → Perplexity with query or homepage
    more.onclick = function () {
      openPerplexity(inp.value.trim());
    };

    // droid tap → new greeting
    droid.onclick = function () { showGreeting(); };

    function showGreeting() {
      clearTimeout(timer);
      typeText(msg, nextLine(), function () {
        timer = setTimeout(showGreeting, 10000);
      });
    }

    setTimeout(showGreeting, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  window.SWAvatar = { open: openPerplexity };

})();
