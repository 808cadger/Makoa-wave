(function () {

  // App metadata — auto-detected from manifest.json or page title
  function getAppName() {
    var el = document.querySelector('meta[name="application-name"]');
    if (el) return el.content;
    try {
      // try manifest
      var link = document.querySelector('link[rel="manifest"]');
      if (!link) return document.title || 'App';
    } catch(e) {}
    return document.title || 'App';
  }

  function getShareURL() {
    // Use canonical or current URL
    var canon = document.querySelector('link[rel="canonical"]');
    return canon ? canon.href : window.location.href;
  }

  var CSS = [
    '.shw{position:fixed;bottom:20px;left:16px;z-index:99999}',
    '.shw-btn{width:40px;height:40px;border-radius:50%;background:#0a0e1a;border:1px solid #4fc3f7;',
    'color:#4fc3f7;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 0 12px rgba(79,195,247,0.4);transition:transform 0.15s,box-shadow 0.15s}',
    '.shw-btn:hover{transform:scale(1.1);box-shadow:0 0 20px rgba(79,195,247,0.6)}',
    '.shw-btn:active{transform:scale(0.92)}',
    '.shw-toast{position:fixed;bottom:70px;left:16px;background:#0a0e1a;border:1px solid #4fc3f7;',
    'color:#e3f2fd;font-size:9px;padding:5px 10px;border-radius:8px;opacity:0;pointer-events:none;',
    'transition:opacity 0.3s;z-index:99999}',
    '.shw-toast.show{opacity:1}',
  ].join('');

  function build() {
    if (document.getElementById('shw-btn')) return;

    if (!document.getElementById('shw-css')) {
      var s = document.createElement('style');
      s.id = 'shw-css'; s.textContent = CSS;
      document.head.appendChild(s);
    }

    var wrap = document.createElement('div');
    wrap.className = 'shw';

    var btn = document.createElement('button');
    btn.id = 'shw-btn';
    btn.className = 'shw-btn';
    btn.setAttribute('aria-label', 'Share this app');
    btn.innerHTML = '&#8679;'; // ↗ share icon

    var toast = document.createElement('div');
    toast.className = 'shw-toast';
    toast.textContent = 'Link copied!';

    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    document.body.appendChild(toast);

    btn.addEventListener('click', function () {
      var name = getAppName();
      var url  = getShareURL();
      var text = 'Check out ' + name + ' — ' + url;

      // Native share sheet (Android/iOS) — works in Capacitor
      if (navigator.share) {
        navigator.share({ title: name, text: text, url: url })
          .catch(function () {}); // user dismissed — ignore
        return;
      }

      // Fallback: copy to clipboard then show toast
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          showToast(toast);
        }).catch(function () {
          fallbackShare(name, url);
        });
      } else {
        fallbackShare(name, url);
      }
    });
  }

  function showToast(toast) {
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }

  function fallbackShare(name, url) {
    // Open SMS + email chooser as last resort
    var encoded = encodeURIComponent(name + ' — ' + url);
    var a = document.createElement('a');
    a.href = 'mailto:?subject=' + encodeURIComponent(name) + '&body=' + encoded;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

})();
