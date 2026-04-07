// main.js — GlowAI app controller + auth flow
// Aloha from Pearl City!

const glowApp = (() => {
  'use strict';

  // ── Init ────────────────────────────────────────────────

  function init() {
    glowRouter.init();
    _syncDemoBtn();
    _updateAccountPanel();

    setTimeout(() => {
      if (glowState.onboarded) {
        glowRouter.show('scan');
        glowFloatIcons.init();
      } else {
        glowRouter.show('onboarding');
      }
    }, 2200);
  }

  function enterScan() {
    glowRouter.show('scan');
    glowFloatIcons.init();
  }

  // ── Auth flow ────────────────────────────────────────────

  async function authSubmit(mode) {
    const emailEl = document.getElementById('auth-email');
    const passEl  = document.getElementById('auth-password');
    const btnEl   = document.getElementById('auth-login-btn');
    const errEl   = document.getElementById('auth-error');

    const email    = emailEl?.value.trim()  || '';
    const password = passEl?.value          || '';

    if (!email || !password) {
      _showAuthError('Email and password required');
      return;
    }
    if (password.length < 8) {
      _showAuthError('Password must be at least 8 characters');
      return;
    }

    if (btnEl)  { btnEl.disabled = true; btnEl.textContent = mode === 'login' ? 'Signing in...' : 'Creating account...'; }
    if (errEl)  errEl.classList.add('hidden');

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Authentication failed');
      }

      const data = await res.json();
      glowState.authToken = data.access_token;
      glowState.userEmail = data.email;

      if (passEl) passEl.value = '';
      _updateAccountPanel();
      closeSheet('settings-sheet');
      showToast(mode === 'login' ? 'Welcome back ✨' : 'Account created ✨');
    } catch (e) {
      _showAuthError(e.message);
    } finally {
      if (btnEl) { btnEl.disabled = false; btnEl.textContent = mode === 'login' ? 'Sign In' : 'Create Account'; }
    }
  }

  function logout() {
    glowState.authToken = '';
    glowState.userEmail = '';
    _updateAccountPanel();
    closeSheet('settings-sheet');
    showToast('Signed out');
  }

  // Called when server returns 401 — token expired or revoked
  function sessionExpired() {
    glowState.authToken = '';
    glowState.userEmail = '';
    _updateAccountPanel();
    openSheet('settings-sheet');
    showToast('Session expired — please sign in again');
  }

  // ── Settings helpers ─────────────────────────────────────

  function toggleDemo() {
    glowState.demoMode = !glowState.demoMode;
    _syncDemoBtn();
    showToast(glowState.demoMode ? 'Demo mode on ✓' : 'Demo mode off');
  }

  function resetApp() {
    if (!confirm('Reset all scan data and sign out?')) return;
    glowState.reset();
    Object.keys(localStorage)
      .filter(k => k.startsWith('glow_pos_'))
      .forEach(k => localStorage.removeItem(k));
    location.reload();
  }

  // ── Private helpers ──────────────────────────────────────

  function _updateAccountPanel() {
    const authed    = !!glowState.authToken;
    const authPanel = document.getElementById('auth-panel');
    const accPanel  = document.getElementById('account-panel');
    const accEmail  = document.getElementById('account-email');

    if (authPanel)  authPanel.style.display  = authed ? 'none'  : 'block';
    if (accPanel)   accPanel.style.display   = authed ? 'block' : 'none';
    if (accEmail)   accEmail.textContent      = glowState.userEmail || '';
    _syncDemoBtn();
  }

  function _syncDemoBtn() {
    document.querySelectorAll('[data-demo-btn]').forEach(btn => {
      btn.textContent = glowState.demoMode ? 'Disable Demo Mode' : 'Demo Mode';
      btn.classList.toggle('on', glowState.demoMode);
    });
  }

  function _showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }

  return { init, enterScan, authSubmit, logout, sessionExpired, toggleDemo, resetApp };
})();

// ── Boot ──────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', glowApp.init);
} else {
  glowApp.init();
}
