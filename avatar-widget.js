(function () {
  'use strict';

  /* ─── API key ──────────────────────────────────────────────────── */
  function getApiKey() {
    if (window.SWAvatarApiKey) return window.SWAvatarApiKey;
    try {
      var keys = Object.keys(localStorage);
      for (var i = 0; i < keys.length; i++) {
        var v = localStorage.getItem(keys[i]);
        if (v && v.startsWith('sk-ant-')) return v;
      }
    } catch (e) {}
    return '';
  }

  /* ─── Context ──────────────────────────────────────────────────── */
  function getCtx() {
    var el = document.getElementById('sw-avatar');
    if (el && el.dataset.context) return el.dataset.context;
    var m = document.querySelector('meta[name="description"]');
    return m ? m.content : '';
  }
  function getAppName() {
    var el = document.querySelector('meta[name="application-name"]');
    if (el) return el.content;
    return document.title || 'this app';
  }

  /* ─── Quick options (context-aware) ───────────────────────────── */
  function getOptions() {
    var ctx = getCtx().toLowerCase();
    if (ctx.includes('skin') || ctx.includes('glow')) return [
      'Analyze my skin type', 'Best morning routine', 'Top ingredients for me', 'What causes breakouts?'
    ];
    if (ctx.includes('job') || ctx.includes('resume') || ctx.includes('career')) return [
      'Improve my resume', 'Interview tips', 'Salary negotiation', 'Cover letter help'
    ];
    if (ctx.includes('travel') || ctx.includes('booking')) return [
      'Pack for my trip', 'Visa requirements', 'Best travel insurance', 'Local customs tips'
    ];
    if (ctx.includes('legal') || ctx.includes('court')) return [
      'Explain this motion', 'Filing deadlines', 'What is discovery?', 'Pro se tips'
    ];
    if (ctx.includes('farm') || ctx.includes('crop')) return [
      'Soil health tips', 'Pest control help', 'Best crops this season', 'Water schedule'
    ];
    if (ctx.includes('fraud')) return [
      'Red flags to watch', 'Report fraud steps', 'Protect my accounts', 'Check this message'
    ];
    return [
      'How does this work?', 'Give me a tip', 'What can you do?', 'Best features here'
    ];
  }

  /* ─── Jedi greetings ───────────────────────────────────────────── */
  var GREETS = [
    'The Force is with you. How can I help?',
    'Ask me anything, young Padawan.',
    'Ready to assist. What do you need?',
    'Your question is my command.',
    'Much to learn, I can help.',
    'Use the Force — or just ask me.',
  ];
  var _gi = -1;
  function nextGreet() {
    var n; do { n = Math.floor(Math.random() * GREETS.length); } while (n === _gi);
    _gi = n; return GREETS[n];
  }

  /* ─── CSS ──────────────────────────────────────────────────────── */
  var CSS = [
    '.jd{position:fixed;bottom:22px;right:18px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-family:-apple-system,BlinkMacSystemFont,"Inter",sans-serif}',
    '.jd-bubble{background:#0a0e1a;border:1px solid #4fc3f7;border-radius:16px 16px 4px 16px;',
    'color:#e3f2fd;font-size:12px;line-height:1.55;max-width:230px;padding:10px 13px;',
    'word-break:break-word;box-shadow:0 4px 20px rgba(79,195,247,0.2);',
    'animation:jdPop 0.22s cubic-bezier(0.34,1.56,0.64,1)}',
    '.jd-bubble.hidden{display:none}',
    '.jd-bubble.error{border-color:#f44336;color:#ffcdd2}',
    '.jd-opts{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;max-width:260px;',
    'animation:jdFade 0.2s ease}',
    '.jd-opts.hidden{display:none}',
    '.jd-opt{background:#0a0e1a;border:1px solid rgba(79,195,247,0.45);border-radius:20px;',
    'color:#b3e5fc;font-size:10px;padding:5px 11px;cursor:pointer;white-space:nowrap;',
    'transition:background 0.15s,border-color 0.15s;user-select:none}',
    '.jd-opt:hover{background:rgba(79,195,247,0.1);border-color:#4fc3f7}',
    '.jd-opt:active{transform:scale(0.94)}',
    '.jd-row{display:flex;align-items:center;gap:7px;background:#0a0e1a;border:1px solid rgba(79,195,247,0.4);',
    'border-radius:24px;padding:6px 6px 6px 13px;width:230px;',
    'box-shadow:0 4px 16px rgba(79,195,247,0.15);animation:jdFade 0.2s ease}',
    '.jd-row.hidden{display:none}',
    '.jd-inp{flex:1;background:transparent;border:none;outline:none;color:#e3f2fd;font-size:11px;',
    'caret-color:#4fc3f7;min-width:0}',
    '.jd-inp::placeholder{color:rgba(179,229,252,0.35)}',
    '.jd-send{width:28px;height:28px;border-radius:50%;background:#4fc3f7;border:none;',
    'color:#0a0e1a;font-size:14px;font-weight:700;cursor:pointer;display:flex;',
    'align-items:center;justify-content:center;flex-shrink:0;transition:transform 0.15s,background 0.15s}',
    '.jd-send:active{transform:scale(0.88)}',
    '.jd-send:disabled{background:rgba(79,195,247,0.3);cursor:not-allowed}',
    '.jd-icon{width:52px;height:52px;border-radius:50%;background:#0a0e1a;',
    'border:1.5px solid #4fc3f7;display:flex;align-items:center;justify-content:center;',
    'cursor:pointer;box-shadow:0 0 16px rgba(79,195,247,0.35);',
    'transition:box-shadow 0.2s,transform 0.2s;flex-shrink:0}',
    '.jd-icon:hover{box-shadow:0 0 28px rgba(79,195,247,0.55)}',
    '.jd-icon:active{transform:scale(0.9)}',
    '.jd-icon.open{border-color:#4fc3f7;box-shadow:0 0 28px rgba(79,195,247,0.6)}',
    '.jd-dots{display:inline-flex;gap:3px;align-items:center;padding:2px 0}',
    '.jd-dots span{width:5px;height:5px;border-radius:50%;background:#4fc3f7;',
    'animation:jdBounce 1s ease-in-out infinite}',
    '.jd-dots span:nth-child(2){animation-delay:0.15s}',
    '.jd-dots span:nth-child(3){animation-delay:0.3s}',
    '@keyframes jdPop{0%{opacity:0;transform:scale(0.85) translateY(8px)}100%{opacity:1;transform:scale(1) translateY(0)}}',
    '@keyframes jdFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes jdBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}',
    '@keyframes jdBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '.jd-icon{animation:jdBob 3s ease-in-out infinite}',
    '.jd-icon.open{animation:none}',
  ].join('');

  /* ─── SVG droid ────────────────────────────────────────────────── */
  var DROID_SVG = '<svg width="30" height="36" viewBox="0 0 60 72" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="12" y="28" width="36" height="28" rx="7" fill="#0d1b2a"/>'
    + '<rect x="12" y="28" width="36" height="28" rx="7" fill="url(#a)"/>'
    + '<circle cx="30" cy="42" r="5" fill="#4fc3f7" opacity="0.9"/>'
    + '<circle cx="30" cy="42" r="3" fill="#e3f2fd"/>'
    + '<path d="M12 26 Q12 8 30 8 Q48 8 48 26 Z" fill="#1565c0"/>'
    + '<circle cx="30" cy="18" r="5" fill="#0d1b2a"/>'
    + '<circle cx="30" cy="18" r="3.5" fill="#4fc3f7"/>'
    + '<circle cx="30" cy="18" r="2" fill="#e3f2fd"/>'
    + '<circle cx="28" cy="16.5" r="0.7" fill="white" opacity="0.8"/>'
    + '<line x1="30" y1="8" x2="30" y2="3" stroke="#78909c" stroke-width="1.5"/>'
    + '<circle cx="30" cy="2" r="2" fill="#f44336"/>'
    + '<rect x="6" y="32" width="6" height="14" rx="3" fill="#263238"/>'
    + '<rect x="48" y="32" width="6" height="14" rx="3" fill="#263238"/>'
    + '<defs><linearGradient id="a" x1="12" y1="28" x2="48" y2="56" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0%" stop-color="#1565c0" stop-opacity="0.9"/>'
    + '<stop offset="100%" stop-color="#0d1b2a"/></linearGradient></defs></svg>';

  /* ─── Demo answers (no API key) ───────────────────────────────── */
  var DEMO = [
    'This is a demo response — add your Claude API key in Settings to get real AI answers. May the Force guide you!',
    'Demo mode active. Enter your Claude API key (sk-ant-...) in the app Settings to unlock live answers.',
    'I\'m running on demo power right now. Add your API key in Settings and I\'ll answer for real.',
    'No API key detected — head to Settings and enter your Claude key to activate live AI.',
  ];
  var _di = -1;
  function demoAnswer() {
    var n; do { n = Math.floor(Math.random() * DEMO.length); } while (n === _di);
    _di = n; return DEMO[n];
  }

  /* ─── User-friendly error messages ────────────────────────────── */
  function friendlyError(status, msg) {
    if (status === 401) return 'Invalid API key — tap ⚙️ Settings to update it.';
    if (status === 429) return 'Too many requests — wait a moment, then try again.';
    if (status === 529) return 'Claude is overloaded right now — try again shortly.';
    if (status >= 500)  return 'Claude is having a moment — try again in a few seconds.';
    if (msg && msg.includes('timeout')) return 'Request timed out — check your connection and retry.';
    if (msg && msg.includes('network')) return 'Connection error — check your internet and try again.';
    return 'Something went wrong — please try again.';
  }

  /* ─── Streaming Claude call ────────────────────────────────────── */
  // #ASSUMPTION: browser supports ReadableStream and TextDecoder (all modern browsers do)
  // #ASSUMPTION: api.anthropic.com SSE format stays stable (documented API contract)
  async function askStream(question, onChunk, onDone, onError) {
    var apiKey = getApiKey();
    if (!apiKey) { onDone(demoAnswer()); return; }

    // #ASSUMPTION: 500 chars is enough for an avatar question; long inputs waste tokens
    if (question.length > 500) question = question.slice(0, 500);

    var sys = 'You are a helpful AI assistant in ' + getAppName() + ', ' + (getCtx() || 'a helpful app')
      + '. Answer in 2-3 sentences max. Be direct and clear. Add one brief encouraging note at the end.';

    // Use ClaudeAPI circuit breaker if available, else direct streaming fetch
    // #ASSUMPTION: ClaudeAPI is loaded before this widget (api-client.js is first in index.html)
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 30000);

    try {
      var res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 220,
          stream: true,
          system: sys,
          messages: [{ role: 'user', content: question }]
        })
      });

      clearTimeout(timer);

      if (!res.ok) {
        onError(friendlyError(res.status, ''));
        return;
      }

      if (!res.body) { onError('No response body from AI'); return; }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var full = '';
      var buf = '';

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        buf += decoder.decode(result.value, { stream: true });
        var lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete last line in buffer
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (!line.startsWith('data: ')) continue;
          var data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            var parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta && parsed.delta.type === 'text_delta') {
              full += parsed.delta.text;
              onChunk(full);
            }
          } catch (e) { /* ignore malformed SSE line */ }
        }
      }

      onDone(full || 'No answer returned.');

    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') { onError(friendlyError(0, 'timeout')); return; }
      onError(friendlyError(0, 'network'));
    }
  }

  /* ─── Build ────────────────────────────────────────────────────── */
  function build() {
    var root = document.getElementById('sw-avatar');
    if (!root) return;

    if (!document.getElementById('jd-css')) {
      var s = document.createElement('style');
      s.id = 'jd-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }

    var wrap   = document.createElement('div'); wrap.className = 'jd';
    var bubble = document.createElement('div'); bubble.className = 'jd-bubble hidden';
    var bubText = document.createElement('span');
    bubble.appendChild(bubText);
    bubble.onclick = function () { bubble.classList.add('hidden'); bubble.classList.remove('error'); };

    var opts = document.createElement('div'); opts.className = 'jd-opts hidden';
    getOptions().forEach(function (label) {
      var chip = document.createElement('button'); chip.className = 'jd-opt';
      chip.textContent = label;
      chip.onclick = function () { submit(label); };
      opts.appendChild(chip);
    });

    var row  = document.createElement('div');  row.className  = 'jd-row hidden';
    var inp  = document.createElement('input'); inp.className  = 'jd-inp';
    inp.type = 'text'; inp.placeholder = 'Ask anything…'; inp.maxLength = 500;
    var send = document.createElement('button'); send.className = 'jd-send'; send.textContent = '↑';
    row.appendChild(inp); row.appendChild(send);

    var icon = document.createElement('div'); icon.className = 'jd-icon';
    icon.innerHTML = DROID_SVG;

    wrap.appendChild(bubble);
    wrap.appendChild(opts);
    wrap.appendChild(row);
    wrap.appendChild(icon);
    root.appendChild(wrap);

    var isOpen = false;
    icon.onclick = function () {
      isOpen = !isOpen;
      icon.classList.toggle('open', isOpen);
      opts.classList.toggle('hidden', !isOpen);
      row.classList.toggle('hidden', !isOpen);
      if (isOpen && bubble.classList.contains('hidden')) {
        bubble.classList.remove('hidden');
        bubText.textContent = nextGreet();
      }
      if (isOpen) setTimeout(function () { inp.focus(); }, 50);
    };

    function setLoading(on) {
      send.disabled = on;
      inp.disabled = on;
      if (on) {
        bubble.classList.remove('hidden', 'error');
        bubble.innerHTML = '<div class="jd-dots"><span></span><span></span><span></span></div>';
        bubText = null;
      }
    }

    function submit(question) {
      question = (question || inp.value).trim();
      if (!question) return;
      inp.value = '';
      setLoading(true);

      // Reset bubble for streaming output
      bubble.innerHTML = '';
      var span = document.createElement('span');
      bubble.appendChild(span);
      // Re-assign bubText after clearing
      var activeBubText = span;

      askStream(
        question,
        function onChunk(fullSoFar) {
          // Stream text in as it arrives — no typewriter delay needed
          activeBubText.textContent = fullSoFar;
          bubble.classList.remove('hidden');
        },
        function onDone(full) {
          activeBubText.textContent = full;
          bubble.classList.remove('hidden');
          send.disabled = false;
          inp.disabled = false;
        },
        function onError(msg) {
          bubble.innerHTML = '';
          var errSpan = document.createElement('span');
          errSpan.textContent = msg;
          bubble.appendChild(errSpan);
          bubble.classList.remove('hidden');
          bubble.classList.add('error');
          send.disabled = false;
          inp.disabled = false;
        }
      );
    }

    send.onclick = function () { submit(inp.value); };
    inp.onkeydown = function (e) { if (e.key === 'Enter' && !send.disabled) submit(inp.value); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  window.JediBot = { ask: function(q, cb) { askStream(q, function(){}, cb, cb); } };

})();
