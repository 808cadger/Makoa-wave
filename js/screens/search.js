// search.js — Makoa~Wave event/company search screen
// Aloha from Pearl City!

// #ASSUMPTION: ClaudeAPI, glowState, glowRouter, showToast are loaded before this file

const glowSearch = (() => {
  'use strict';

  let _currentUrl = '';
  let _currentName = '';

  // ── Init ─────────────────────────────────────────────────────────

  function init() {
    // Update language badge
    const lang = glowState.language || 'English';
    const flagEl = document.getElementById('search-lang-flag');
    const nameEl = document.getElementById('search-lang-name');

    // Get flag emoji from the lang chip
    const chip = document.querySelector(`.lang-chip[data-lang="${lang}"]`);
    const flagText = chip ? chip.childNodes[0]?.textContent || '' : '🌐';
    if (flagEl) flagEl.textContent = flagText;
    if (nameEl) nameEl.textContent = lang;

    // Load recent searches
    _renderRecent();

    // Focus input
    setTimeout(() => document.getElementById('search-input')?.focus(), 300);
  }

  // ── Find ──────────────────────────────────────────────────────────

  async function find() {
    const input = document.getElementById('search-input');
    const query = input?.value?.trim() || '';
    if (!query) { _showError('Type a company or event name first'); return; }

    _clearError();
    _hideResult();
    _setLoading(true);

    try {
      const lang = glowState.language || 'English';
      const data = await ClaudeAPI.lookup({ query, language: lang });

      if (!data?.url) throw new Error('No website found for that name');

      _currentUrl  = data.url;
      _currentName = data.name || query;

      _showResult(_currentName, _currentUrl);
      _saveRecent(_currentName, _currentUrl);
      _renderRecent();

    } catch (err) {
      const msg = err.circuitOpen
        ? 'Service unavailable — try again shortly'
        : err.timeout
          ? 'Search timed out — check your connection'
          : err.message || 'Could not find that website';
      _showError(msg);
    } finally {
      _setLoading(false);
    }
  }

  // ── Open ──────────────────────────────────────────────────────────

  function open(url) {
    const target = url || _currentUrl;
    if (!target) return;
    // Capacitor: open in system browser; web: new tab
    if (window.Capacitor?.isNativePlatform?.()) {
      // #ASSUMPTION: @capacitor/browser is available; fallback to window.open
      if (window.CapacitorBrowser) {
        window.CapacitorBrowser.open({ url: target });
      } else {
        window.open(target, '_blank', 'noopener');
      }
    } else {
      window.open(target, '_blank', 'noopener');
    }
  }

  // ── Recent searches ───────────────────────────────────────────────

  function _saveRecent(name, url) {
    let recent = glowState.recentSearches || [];
    // Remove duplicate
    recent = recent.filter(r => r.url !== url);
    // Prepend
    recent.unshift({ name, url, ts: Date.now() });
    // Keep last 5
    glowState.recentSearches = recent.slice(0, 5);
    glowState.persist();
  }

  function _renderRecent() {
    const recent = glowState.recentSearches || [];
    const wrap = document.getElementById('recent-wrap');
    const list = document.getElementById('recent-list');
    if (!wrap || !list) return;

    if (!recent.length) { wrap.style.display = 'none'; return; }

    wrap.style.display = 'block';
    list.innerHTML = recent.map(r => `
      <div class="recent-item" onclick="glowSearch.open('${_esc(r.url)}')">
        <span class="recent-name">${_esc(r.name)}</span>
        <span class="recent-url">${_esc(r.url)}</span>
      </div>
    `).join('');
  }

  // ── UI helpers ────────────────────────────────────────────────────

  function _setLoading(on) {
    const btn     = document.getElementById('search-btn');
    const overlay = document.getElementById('analyzing');
    if (btn) btn.disabled = on;
    if (overlay) overlay.style.display = on ? 'flex' : 'none';
  }

  function _showResult(name, url) {
    document.getElementById('result-name').textContent = name;
    document.getElementById('result-url').textContent  = url;
    document.getElementById('search-result').style.display = 'block';
  }

  function _hideResult() {
    document.getElementById('search-result').style.display = 'none';
  }

  function _showError(msg) {
    const el = document.getElementById('search-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function _clearError() {
    const el = document.getElementById('search-error');
    if (el) el.style.display = 'none';
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { find, open, init };
})();
