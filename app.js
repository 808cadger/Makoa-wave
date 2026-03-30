/**
 * app.js — GlowAI Core State & App Shell
 * Aloha from Pearl City! 🌺
 *
 * Responsibilities:
 *  - Global state object (single source of truth)
 *  - localStorage persistence helpers
 *  - showScreen() + nav management
 *  - Home screen rendering (score ring, sparkline, brief, quick actions)
 *  - Toast, utility functions
 *  - Boot sequence
 */

// Perf timing — SLO target P95 < 200ms boot
const perf = { start: performance.now() };

// ═══════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════
// #ASSUMPTION: localStorage is available (Capacitor WebView + Brave both support it)
const state = {
  /** @type {{name:string,age:number|null,gender:string,skinType:string,skinTone:string,concerns:string[],lifestyle:{sleep:string,water:string,stress:string,diet:string}}|null} */
  profile: null,
  /** @type {string} */
  apiKey: '',
  /** @type {string} */
  currentScreen: 'splash',
  /** @type {object|null} — latest scan result object */
  currentScan: null,
  /** @type {boolean} */
  demoMode: true,
  // Internal state
  scanHistory: [],    // [{ id, date, description, photo, analysis, score, concerns, recommendations }]
  skinScores: [],     // [{ date, score }]
  routine: { am: [], pm: [], streak: 0, lastCompleted: null },
  routineLog: [],     // [dateString]
  chatHistory: [],    // [{ role, content } | { role:'tool', toolName, content }]
  profilePhoto: null, // base64 data URL
  runningAnalysis: false,
  advisorOpened: false,
  activeTab: 'am',
  lastBriefDate: null,
};

// ═══════════════════════════════════════════════
//  PROFILE HELPERS
// ═══════════════════════════════════════════════
function getProfile()       { return state.profile; }
function saveProfile(p)     { state.profile = p; _saveProfileKey(); }
function _saveProfileKey()  { try { localStorage.setItem('glowai_profile', JSON.stringify(state.profile)); } catch(e) {} }

function getApiKey()        { return state.apiKey; }
function saveApiKey(k) {
  state.apiKey = k;
  state.demoMode = !(k && k.startsWith('sk-'));
  try { localStorage.setItem('glowai_apikey', k); } catch(e) {}
}

// ═══════════════════════════════════════════════
//  PERSISTENCE
// ═══════════════════════════════════════════════
function saveState() {
  try {
    if (state.profile)      localStorage.setItem('glowai_profile',      JSON.stringify(state.profile));
    if (state.apiKey)       localStorage.setItem('glowai_apikey',       state.apiKey);
    localStorage.setItem('glowai_scans',        JSON.stringify(state.scanHistory));
    localStorage.setItem('glowai_scores',       JSON.stringify(state.skinScores));
    localStorage.setItem('glowai_routine_am',   JSON.stringify(state.routine.am));
    localStorage.setItem('glowai_routine_pm',   JSON.stringify(state.routine.pm));
    localStorage.setItem('glowai_routine_log',  JSON.stringify({ streak: state.routine.streak, lastCompleted: state.routine.lastCompleted }));
    localStorage.setItem('glowai_chat',         JSON.stringify(state.chatHistory));
    if (state.profilePhoto) localStorage.setItem('glowai_profilephoto', state.profilePhoto);
    if (state.lastBriefDate) localStorage.setItem('glowai_brief_date',  state.lastBriefDate);
    localStorage.setItem('glowai_onboarded', state.profile ? '1' : '0');
  } catch(e) {
    if (e.name === 'QuotaExceededError') showToast('Storage full — some history may not have saved.');
  }
}

function loadState() {
  const tryParse = (key, fallback = null) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
  };

  state.profile       = tryParse('glowai_profile');
  state.scanHistory   = tryParse('glowai_scans',       []);
  state.skinScores    = tryParse('glowai_scores',      []);
  state.chatHistory   = tryParse('glowai_chat',        []);

  const amSteps = tryParse('glowai_routine_am', []);
  const pmSteps = tryParse('glowai_routine_pm', []);
  const routineLog = tryParse('glowai_routine_log', {});
  state.routine = {
    am: amSteps,
    pm: pmSteps,
    streak: routineLog.streak || 0,
    lastCompleted: routineLog.lastCompleted || null,
  };

  // Apply API key from magic link (?key=) if present
  if (window.MagicLink) MagicLink.apply('glowai_apikey');
  const k = localStorage.getItem('glowai_apikey');
  if (k) { state.apiKey = k; state.demoMode = false; }

  state.profilePhoto = localStorage.getItem('glowai_profilephoto') || null;
  state.lastBriefDate = localStorage.getItem('glowai_brief_date') || null;
}

// ═══════════════════════════════════════════════
//  SCREEN ROUTING
// ═══════════════════════════════════════════════
const NAV_SCREENS = ['home', 'scan', 'advisor', 'progress'];

/**
 * Navigate to a named screen. Handles CSS transition,
 * nav bar visibility, and per-screen init callbacks.
 * @param {string} id - screen element id
 */
function showScreen(id) {
  const prev = document.querySelector('.screen.active');
  if (prev && prev.id !== id) window._prevScreen = prev.id;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (!el) { console.warn('showScreen: no element with id', id); return; }
  el.classList.add('active');
  state.currentScreen = id;

  // Nav bar
  const nav = document.getElementById('bottom-nav');
  if (NAV_SCREENS.includes(id)) {
    nav.classList.add('visible');
    document.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));
    const active = document.getElementById('nav-' + id);
    if (active) active.classList.add('active');
  } else {
    nav.classList.remove('visible');
  }

  // Per-screen init
  if (id === 'home')     initHome();
  if (id === 'routine')  routineModule.render();
  if (id === 'settings') settingsModule.render();
  if (id === 'scan')     scanModule.renderHistory();
  if (id === 'advisor')  advisorModule.onOpen();
  if (id === 'progress') progressModule.render();
}

// ═══════════════════════════════════════════════
//  GREETING
// ═══════════════════════════════════════════════
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ═══════════════════════════════════════════════
//  HOME INIT
// ═══════════════════════════════════════════════
function initHome() {
  if (!state.profile) return;
  const p = state.profile;

  document.getElementById('home-greeting').textContent = getGreeting() + ',';
  document.getElementById('home-name').textContent = p.name + ' ✨';

  // Avatar image
  const avatarEl = document.getElementById('home-avatar');
  if (avatarEl) {
    if (state.profilePhoto) {
      avatarEl.innerHTML = `<img src="${state.profilePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:14px">`;
    } else {
      avatarEl.textContent = '🌸';
    }
  }

  // Record today's score
  const score = _calcSkinScore();
  const today = new Date().toDateString();
  if (!state.skinScores.find(e => e.date === today)) {
    state.skinScores.push({ date: today, score });
    if (state.skinScores.length > 30) state.skinScores.shift();
    saveState();
  }

  _renderScoreRing(score);
  _renderSparkline();
  _renderContextActions();
  _renderDailyBrief();

  // Last scan
  _renderLastScan();
}

// ─── Score calculation ───────────────────────
function _calcSkinScore() {
  if (!state.profile) return 0;
  let score = 0;
  const now = Date.now();

  // Scan consistency last 7 days (35 pts)
  const recentScans = state.scanHistory.filter(s => (now - new Date(s.date).getTime()) < 7 * 86400000).length;
  score += Math.min(35, Math.round((recentScans / 7) * 35));

  // Photos taken (20 pts)
  const withPhoto = state.scanHistory.filter(s => s.photo).length;
  score += Math.min(20, Math.round((Math.min(withPhoto, 5) / 5) * 20));

  // Routine streak (25 pts)
  score += Math.min(25, Math.round((Math.min(state.routine.streak || 0, 14) / 14) * 25));

  // Profile completeness (20 pts)
  const pts = [p => p.name, p => p.skinType, p => p.concerns?.length > 0, p => p.skinTone]
    .filter(fn => fn(state.profile)).length;
  score += Math.round((pts / 4) * 20);

  return Math.min(100, score);
}

// ─── Score ring ──────────────────────────────
function _renderScoreRing(score) {
  const circumference = 2 * Math.PI * 60; // ≈377
  const arc    = document.getElementById('score-ring-arc');
  const numEl  = document.getElementById('score-ring-num');
  const tArrow = document.getElementById('score-trend-arrow');
  const tLabel = document.getElementById('score-trend-label');
  const sBadge = document.getElementById('score-streak-label');
  if (!arc || !numEl) return;

  // Stroke color by score band
  if (score >= 75) {
    arc.setAttribute('stroke', 'url(#scoreGrad)');
  } else if (score >= 50) {
    arc.setAttribute('stroke', '#E6C96B');
  } else {
    arc.setAttribute('stroke', '#E06B6B');
  }

  // Animate ring fill
  const offset = circumference - (score / 100) * circumference;
  arc.style.transition = 'none';
  arc.style.strokeDashoffset = String(circumference);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    arc.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.2,0.64,1)';
    arc.style.strokeDashoffset = String(offset);
  }));

  // Count-up animation
  let cur = 0;
  const step = score / (1000 / 16);
  numEl.textContent = '0';
  const timer = setInterval(() => {
    cur = Math.min(score, cur + step);
    numEl.textContent = String(Math.round(cur));
    if (cur >= score) clearInterval(timer);
  }, 16);

  // Trend vs previous day
  let trend = '→', trendText = 'Calculating...';
  if (state.skinScores.length >= 2) {
    const prev = state.skinScores[state.skinScores.length - 2]?.score ?? 0;
    const diff = score - prev;
    if (diff > 3)       { trend = '↑'; trendText = `+${diff} pts from yesterday`; }
    else if (diff < -3) { trend = '↓'; trendText = `${diff} pts from yesterday`; }
    else                { trend = '→'; trendText = 'Holding steady'; }
  } else {
    trendText = 'First score today!';
  }
  if (tArrow) tArrow.textContent = trend;
  if (tLabel) tLabel.textContent = trendText;

  const streak = state.routine.streak || 0;
  if (sBadge) sBadge.textContent = streak > 0 ? `🔥 ${streak}-day streak` : 'Start your streak today!';
}

// ─── 7-day sparkline ─────────────────────────
function _renderSparkline() {
  const canvas = document.getElementById('sparkline-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 300;
  const DPR = window.devicePixelRatio || 1;
  canvas.width  = W * DPR;
  canvas.height = 54 * DPR;
  ctx.scale(DPR, DPR);
  const w = W, h = 54;
  ctx.clearRect(0, 0, w, h);

  // Build 7-day array
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toDateString();
    const entry = state.skinScores.find(e => e.date === d);
    days.push(entry ? entry.score : null);
  }

  if (!days.some(v => v !== null)) {
    // Placeholder dots
    ctx.fillStyle = 'rgba(196,120,138,0.3)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc((i / 6) * (w - 20) + 10, h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  // Fill nulls forward
  let last = days.find(v => v !== null) || 50;
  const filled = days.map(v => { if (v !== null) { last = v; return v; } return last; });

  const minV = Math.max(0,   Math.min(...filled) - 5);
  const maxV = Math.min(100, Math.max(...filled) + 5);
  const range = maxV - minV || 1;

  const pts = filled.map((v, i) => ({
    x: (i / 6) * (w - 20) + 10,
    y: h - 8 - ((v - minV) / range) * (h - 16),
  }));

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(196,120,138,0.35)');
  grad.addColorStop(1, 'rgba(196,120,138,0.01)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.lineTo(pts[pts.length-1].x, h);
  ctx.lineTo(pts[0].x, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Glow line
  ctx.shadowColor = 'rgba(196,120,138,0.7)';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2;
    ctx.bezierCurveTo(cpx, pts[i-1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = '#C4788A';
  ctx.lineWidth   = 2.5;
  ctx.stroke();
  ctx.shadowBlur  = 0;

  // Dots for actual data points
  pts.forEach((pt, i) => {
    if (days[i] === null) return;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#EDB8C8';
    ctx.fill();
  });
}

// ─── Context-aware quick actions ─────────────
function _renderContextActions() {
  const wrap = document.getElementById('home-quick-actions');
  if (!wrap) return;
  const h = new Date().getHours();
  let actions;
  if (h >= 5 && h < 11) {
    actions = [
      { icon: '🌅', label: 'Morning Scan',  screen: 'scan' },
      { icon: '☀️', label: 'AM Routine',    screen: 'routine' },
      { icon: '💬', label: 'Ask GlowAI',   screen: 'advisor' },
    ];
  } else if (h >= 11 && h < 17) {
    actions = [
      { icon: '🔍', label: 'Midday Check',  screen: 'scan' },
      { icon: '📈', label: 'Progress',      screen: 'progress' },
      { icon: '💬', label: 'Ask GlowAI',   screen: 'advisor' },
    ];
  } else if (h >= 17 && h < 22) {
    actions = [
      { icon: '🌙', label: 'Evening Scan',  screen: 'scan' },
      { icon: '🌙', label: 'PM Routine',    screen: 'routine' },
      { icon: '📈', label: 'Review',        screen: 'progress' },
    ];
  } else {
    actions = [
      { icon: '🌙', label: 'Night Log',     screen: 'scan' },
      { icon: '📋', label: 'Tomorrow Prep', screen: 'routine' },
      { icon: '💬', label: 'Ask GlowAI',   screen: 'advisor' },
    ];
  }
  wrap.innerHTML = actions.map(a => `
    <div class="quick-btn" onclick="showScreen('${a.screen}')">
      <div class="quick-btn-icon">${a.icon}</div>
      <div class="quick-btn-label">${a.label}</div>
    </div>`).join('');
}

// ─── Daily brief ─────────────────────────────
function _renderDailyBrief() {
  const wrap = document.getElementById('home-brief-wrap');
  if (!wrap) return;
  const today = new Date().toDateString();
  if (state.lastBriefDate === today) { wrap.innerHTML = ''; return; }

  const h = new Date().getHours();
  const timeGreeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const p = state.profile || { name: '', skinType: 'Combination', concerns: [] };

  const briefs = [
    `Your skin is telling a story! For your ${p.skinType || 'skin'} type, today's priority is ${p.concerns?.includes('Acne & Breakouts') ? 'keeping your hands off your face and using a BHA cleanser.' : p.concerns?.includes('Dryness') ? 'layering a humectant serum before your moisturizer.' : 'consistent SPF — it\'s your #1 anti-aging step.'} Small consistent steps build beautiful skin over time.`,
    `Skin tip for today: ${p.skinType === 'Oily' ? 'Niacinamide 10% regulates sebum and minimizes pores — apply AM and PM.' : p.skinType === 'Dry' ? 'Apply your moisturizer to slightly damp skin to lock in 3x more hydration.' : 'A gentle exfoliant 2× per week keeps your glow going without stripping your barrier.'} Keep up the amazing work!`,
    `${state.scanHistory.length > 0 ? `Your last skin log was ${new Date(state.scanHistory[state.scanHistory.length-1].date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}. Regular tracking helps spot patterns in your skin.` : 'You haven\'t logged your skin yet today. Head to Scan and describe how your skin is feeling — even a 10-second note helps!'} Consistency is the secret ingredient. 🌸`,
  ];

  const briefText = briefs[Math.floor(Math.random() * briefs.length)];

  wrap.innerHTML = `
    <div class="brief-card" id="brief-card">
      <div class="brief-card-header">
        <div class="brief-card-title">✨ Your GlowAI Daily Brief</div>
        <button class="brief-dismiss" onclick="dismissBrief()">✕</button>
      </div>
      <div class="brief-greeting">${timeGreeting}, ${p.name || 'gorgeous'}!</div>
      <div class="brief-text" id="brief-text"></div>
    </div>`;

  // Typewriter effect
  const textEl = document.getElementById('brief-text');
  if (!textEl) return;

  let i = 0;
  const cursor = '<span class="brief-cursor"></span>';
  const type = () => {
    if (!document.getElementById('brief-text')) return;
    if (i <= briefText.length) {
      textEl.innerHTML = escHtml(briefText.slice(0, i)) + cursor;
      i++;
      setTimeout(type, 18);
    } else {
      textEl.innerHTML = escHtml(briefText);
    }
  };
  setTimeout(type, 300);

  // Live Claude brief (replaces typewriter text)
  if (!state.demoMode && state.apiKey) {
    _generateLiveBrief(textEl, p);
  }
}

async function _generateLiveBrief(textEl, p) {
  try {
    const prompt = `In 2-3 sentences, give ${p.name || 'the user'} a personalized skincare brief for ${new Date().toLocaleDateString('en-US',{weekday:'long'})}. Skin type: ${p.skinType}. Concerns: ${p.concerns?.join(', ') || 'none'}. Lifestyle: sleep ${p.lifestyle?.sleep}, water ${p.lifestyle?.water}, stress ${p.lifestyle?.stress}. Be warm, specific, science-backed. No lists — flowing prose only.`;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const liveText = data.content?.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
    if (!liveText || !document.getElementById('brief-text')) return;

    // Re-type with live text
    let i = 0;
    const cursor = '<span class="brief-cursor"></span>';
    textEl.innerHTML = cursor;
    const type = () => {
      if (!document.getElementById('brief-text')) return;
      if (i <= liveText.length) {
        textEl.innerHTML = escHtml(liveText.slice(0, i)) + cursor;
        i++;
        setTimeout(type, 18);
      } else {
        textEl.innerHTML = escHtml(liveText);
      }
    };
    type();
  } catch(e) { /* use demo text already shown */ }
}

function dismissBrief() {
  state.lastBriefDate = new Date().toDateString();
  saveState();
  const card = document.getElementById('brief-card');
  if (card) {
    card.style.transition = 'opacity 0.3s, transform 0.3s';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      const w = document.getElementById('home-brief-wrap');
      if (w) w.innerHTML = '';
    }, 320);
  }
}

// ─── Last scan card ──────────────────────────
function _renderLastScan() {
  const wrap = document.getElementById('home-last-scan');
  if (!wrap) return;
  const last = state.scanHistory[state.scanHistory.length - 1];
  if (!last) {
    wrap.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No scans yet — log your skin to get started!</div>`;
    return;
  }
  const date = new Date(last.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const preview = (last.description || '(Photo scan)').slice(0, 80) + ((last.description || '').length > 80 ? '…' : '');
  const analysisSnippet = last.analysis
    ? `<div class="scan-result-label" style="margin-top:10px">AI Insight</div>
       <div class="last-scan-text" style="color:var(--text-muted)">${escHtml(last.analysis.slice(0, 140))}…</div>`
    : '';
  wrap.innerHTML = `
    <div class="last-scan-card" onclick="showScreen('scan')">
      <div class="last-scan-meta">
        <div class="last-scan-date">${date}</div>
        <div class="last-scan-badge">${last.score ? `Score: ${last.score}` : 'Analyzed'}</div>
      </div>
      <div class="last-scan-text">${escHtml(preview)}</div>
      ${analysisSnippet}
    </div>`;
}

// ═══════════════════════════════════════════════
//  QUICK SCAN FROM HOME HERO
// ═══════════════════════════════════════════════
async function quickScanFromHome() {
  try {
    const Cam = window.Capacitor?.Plugins?.Camera;
    if (Cam) {
      const photo = await Cam.getPhoto({
        quality: 85, allowEditing: false,
        resultType: 'dataUrl', source: 'CAMERA', direction: 'FRONT',
      });
      if (photo?.dataUrl) {
        state.currentScan = { photo: photo.dataUrl };
        showScreen('scan');
        scanModule.setPhoto(photo.dataUrl);
        return;
      }
    } else {
      // PWA: file picker with capture hint
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.capture = 'user';
      input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          showScreen('scan');
          scanModule.setPhoto(ev.target.result);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
  } catch(e) {
    if (e.message && !e.message.toLowerCase().includes('cancel')) {
      showToast('Could not open camera');
    }
  }
  showScreen('scan');
}

// ═══════════════════════════════════════════════
//  STATUS HELPER
// ═══════════════════════════════════════════════
function setStatus(msg) {
  const el = document.getElementById('home-status');
  if (el) el.textContent = msg;
}

// ═══════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════
function showToast(msg, durationMs = 3000) {
  // Deduplicate — don't stack same message
  const existing = [...document.querySelectorAll('.glow-toast')];
  if (existing.some(t => t.textContent === msg)) return;
  // Cap at 2 — remove oldest if needed
  if (existing.length >= 2) existing[0].remove();
  const offset = document.querySelectorAll('.glow-toast').length * 52;
  const t = document.createElement('div');
  t.className = 'glow-toast';
  t.style.cssText = [
    'position:fixed', `bottom:calc(var(--safe-bottom,0px) + ${24 + offset}px)`,
    'left:50%', 'transform:translateX(-50%)',
    'background:var(--card)', 'border:1px solid var(--border)',
    'color:var(--text)', 'padding:11px 18px',
    'border-radius:50px', 'font-size:13px', 'font-weight:600',
    'z-index:999', 'white-space:nowrap',
    'animation:fadeIn 0.3s ease',
    'box-shadow:0 4px 20px rgba(0,0,0,0.4)',
  ].join(';');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, durationMs);
}

// ═══════════════════════════════════════════════
//  RESET / CLEAR
// ═══════════════════════════════════════════════
function resetApp() {
  [
    'glowai_profile', 'glowai_apikey', 'glowai_scans', 'glowai_scores',
    'glowai_routine_am', 'glowai_routine_pm', 'glowai_routine_log',
    'glowai_chat', 'glowai_profilephoto', 'glowai_brief_date', 'glowai_onboarded',
    'glowai_nav_pos',
  ].forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
  location.reload();
}

// ═══════════════════════════════════════════════
//  HTML ESCAPE UTILITY
// ═══════════════════════════════════════════════
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Format markdown-lite (bold, bullets, newlines) for chat bubbles
function formatMsg(text) {
  return escHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n/g, '<br>');
}

// Simple delay Promise
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
//  SETTINGS MODULE
// ═══════════════════════════════════════════════
const settingsModule = (() => {
  function render() {
    const p = state.profile;
    if (!p) return;

    // Avatar
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
      if (state.profilePhoto) {
        avatarEl.innerHTML = `<img src="${state.profilePhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:24px"><div class="cam-badge">📷</div>`;
      } else {
        avatarEl.innerHTML = `🌸<div class="cam-badge">📷</div>`;
      }
    }

    // Profile text
    const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val || '—'; };
    setEl('settings-name',    p.name);
    setEl('settings-sub',     `${p.skinType || ''}${p.skinTone ? ' · ' + p.skinTone : ''}${p.age ? ' · Age ' + p.age : ''}`);
    setEl('s-name-row',       p.name + (p.age ? ', ' + p.age : ''));
    setEl('s-skintype-row',   p.skinType || '—');
    setEl('s-concerns-row',   p.concerns?.join(', ') || 'None selected');
    setEl('s-lifestyle-row',  [p.lifestyle?.sleep, p.lifestyle?.water, p.lifestyle?.stress].filter(Boolean).join(' · ') || 'Not set');

    // API key
    const keyInput = document.getElementById('api-key-input');
    if (keyInput) keyInput.value = state.apiKey || '';

    // Demo banner
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) demoBanner.classList.toggle('hidden', !state.demoMode);

    _injectEditBtn();
  }

  function handleApiKeyInput() {
    const val = document.getElementById('api-key-input')?.value.trim() || '';
    saveApiKey(val);
    const demoBanner = document.getElementById('demo-banner');
    if (demoBanner) demoBanner.classList.toggle('hidden', !state.demoMode);
    if (!state.demoMode) showToast('API key saved — live mode active ✨');
  }

  function toggleKeyVis() {
    const input = document.getElementById('api-key-input');
    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  }

  async function captureProfilePhoto() {
    try {
      const Cam = window.Capacitor?.Plugins?.Camera;
      if (Cam) {
        const photo = await Cam.getPhoto({
          quality: 85, allowEditing: true,
          resultType: 'dataUrl', source: 'PROMPT', direction: 'FRONT',
        });
        if (photo?.dataUrl) {
          state.profilePhoto = photo.dataUrl;
          saveState();
          render();
          showToast('Profile photo updated ✨');
        }
      } else {
        // Browser fallback — file picker
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            state.profilePhoto = ev.target.result;
            saveState();
            render();
            showToast('Profile photo updated ✨');
          };
          reader.readAsDataURL(file);
        };
        input.click();
      }
    } catch(e) {
      if (e.message && !e.message.toLowerCase().includes('cancel')) {
        showToast('Could not access camera');
      }
    }
  }

  function clearData() {
    if (!confirm('Clear all GlowAI data? This cannot be undone.')) return;
    resetApp();
  }

  function _injectEditBtn() {
    if (document.getElementById('settings-edit-profile-btn')) return;
    const section = document.getElementById('s-lifestyle-row')?.closest('.settings-card');
    if (!section) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:4px 12px 12px';
    wrap.innerHTML = `<button id="settings-edit-profile-btn" onclick="settingsModule.editProfile()"
      class="btn-secondary" style="width:100%;margin-top:4px">✏️ Edit Profile</button>`;
    section.appendChild(wrap);
  }

  function editProfile() {
    const p = state.profile;
    if (!p) return;
    const skinTypes   = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
    const allConcerns = ['Acne & Breakouts','Dryness','Dark Spots','Oily Skin','Redness','Uneven Texture','Fine Lines','Large Pores','Sensitivity','Dullness'];

    const overlay = document.createElement('div');
    overlay.id = 'edit-profile-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);backdrop-filter:blur(6px);z-index:300;display:flex;flex-direction:column;animation:fadeIn 0.25s ease;overflow-y:auto';
    overlay.innerHTML = `
      <div style="padding:calc(var(--safe-top,0px)+16px) 20px 14px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700">Edit Profile</div>
        <button onclick="document.getElementById('edit-profile-overlay').remove()"
          style="width:34px;height:34px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div style="flex:1;padding:0 20px calc(40px + var(--safe-bottom,0px));display:flex;flex-direction:column;gap:22px">
        <div>
          <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--primary);display:block;margin-bottom:8px">Name</label>
          <input id="edit-name" value="${escHtml(p.name || '')}"
            style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;color:var(--text);font-size:15px;box-sizing:border-box;outline:none"
            placeholder="Your name">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--primary);display:block;margin-bottom:10px">Skin Type</label>
          <div id="edit-skintype" style="display:flex;flex-wrap:wrap;gap:8px">
            ${skinTypes.map(st => `<button onclick="document.getElementById('edit-skintype').querySelectorAll('button').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')" class="select-chip ${p.skinType === st ? 'selected' : ''}" data-type="${st}">${st}</button>`).join('')}
          </div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--primary);display:block;margin-bottom:10px">Concerns <span style="color:var(--text-muted);font-weight:400;font-size:10px">(tap to toggle)</span></label>
          <div id="edit-concerns" style="display:flex;flex-wrap:wrap;gap:8px">
            ${allConcerns.map(c => `<button onclick="this.classList.toggle('selected')" class="select-chip ${p.concerns?.includes(c) ? 'selected' : ''}" data-val="${c}">${c}</button>`).join('')}
          </div>
        </div>
        <button onclick="settingsModule._saveEditProfile()" class="btn-primary" style="margin-top:4px">Save Changes</button>
      </div>`;
    document.body.appendChild(overlay);
  }

  function _saveEditProfile() {
    const overlay = document.getElementById('edit-profile-overlay');
    if (!overlay) return;
    const name = overlay.querySelector('#edit-name')?.value.trim();
    if (!name) { showToast('Please enter your name'); return; }
    const skinTypeBtn = [...overlay.querySelectorAll('#edit-skintype button')].find(b => b.classList.contains('selected'));
    const concerns    = [...overlay.querySelectorAll('#edit-concerns button.selected')].map(b => b.dataset.val);
    state.profile = { ...state.profile, name, skinType: skinTypeBtn?.dataset.type || state.profile?.skinType, concerns };
    saveState();
    overlay.remove();
    render();
    showToast('Profile updated ✨');
  }

  return { render, handleApiKeyInput, toggleKeyVis, captureProfilePhoto, clearData, editProfile, _saveEditProfile, _injectEditBtn };
})();

// ═══════════════════════════════════════════════
//  NAV DRAG (floating side nav repositioning)
// ═══════════════════════════════════════════════
function initNavDrag() {
  const nav = document.getElementById('bottom-nav');
  let startX, startY, startLeft, startTop, dragging = false;

  const saved = localStorage.getItem('glowai_nav_pos');
  if (saved) {
    try {
      const { left, top } = JSON.parse(saved);
      nav.style.right     = 'auto';
      nav.style.transform = 'none';
      nav.style.left      = left + 'px';
      nav.style.top       = top  + 'px';
    } catch(e) {}
  }

  nav.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const r = nav.getBoundingClientRect();
    startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    startLeft = r.left; startTop = r.top;
    dragging = false;
  }, { passive: true });

  nav.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!dragging && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    dragging = true;
    e.preventDefault();
    const newLeft = Math.max(0, Math.min(window.innerWidth  - nav.offsetWidth,  startLeft + dx));
    const newTop  = Math.max(0, Math.min(window.innerHeight - nav.offsetHeight, startTop  + dy));
    nav.style.right = 'auto'; nav.style.transform = 'none';
    nav.style.left = newLeft + 'px'; nav.style.top = newTop + 'px';
  }, { passive: false });

  nav.addEventListener('touchend', () => {
    if (dragging) {
      try { localStorage.setItem('glowai_nav_pos', JSON.stringify({ left: parseInt(nav.style.left), top: parseInt(nav.style.top) })); } catch(e) {}
      dragging = false;
    }
  });

  nav.addEventListener('click', e => {
    if (dragging) { e.stopPropagation(); dragging = false; }
  }, true);
}

// ═══════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════
function _initOfflineBanner() {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = [
    'position:fixed', 'top:calc(var(--safe-top,0px) + 8px)', 'left:50%',
    'transform:translateX(-50%)', 'background:#2a1a1a', 'border:1px solid #5c2c2c',
    'color:#FCA5A5', 'padding:8px 18px', 'border-radius:50px',
    'font-size:12px', 'font-weight:700', 'z-index:9999',
    'display:none', 'white-space:nowrap', 'letter-spacing:0.3px',
  ].join(';');
  banner.textContent = '⚡ No internet connection';
  document.body.appendChild(banner);

  const update = () => {
    banner.style.display = navigator.onLine ? 'none' : 'block';
    if (navigator.onLine && banner._wasOffline) showToast('Back online ✨');
    banner._wasOffline = !navigator.onLine;
  };
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

function initApp() {
  loadState();
  showScreen('splash');
  initNavDrag();
  _initOfflineBanner();

  setTimeout(() => {
    if (state.profile) {
      showScreen('home');
    } else {
      showScreen('onboard1');
    }
  }, 2400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
