/**
 * onboarding.js — GlowAI 7-Step Onboarding Flow
 *
 * Manages the multi-step Q&A onboarding with:
 *  - Name (step 1)
 *  - Age stepper + gender chips (step 2)
 *  - Skin type grid (step 3)
 *  - Skin tone swatches (step 4)
 *  - Concerns multi-select chips (step 5)
 *  - Lifestyle chips (step 6)
 *  - API key + finish (step 7)
 */

const onboarding = (() => {
  // ─── Internal state ───────────────────────────
  let _age    = 25;
  let _gender = '';
  let _skinType = '';
  let _skinTone = '';

  // ─── Age stepper ──────────────────────────────
  function adjustAge(delta) {
    _age = Math.max(13, Math.min(99, _age + delta));
    const display = document.getElementById('ob-age-display');
    const hidden  = document.getElementById('ob-age');
    if (display) display.textContent = _age;
    if (hidden)  hidden.value        = String(_age);
  }

  // ─── Gender chips ─────────────────────────────
  function selectGender(el) {
    document.querySelectorAll('#ob-gender .gender-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    _gender = el.dataset.val;
  }

  // ─── Skin type ────────────────────────────────
  function selectSkinType(el) {
    document.querySelectorAll('#ob-skintype .skin-type-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    _skinType = el.dataset.type;
  }

  // ─── Skin tone ────────────────────────────────
  function selectTone(el) {
    document.querySelectorAll('#ob-tone .skin-tone-item').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    _skinTone = el.dataset.tone;
  }

  // ─── Concerns multi-select (max 5) ────────────
  function toggleConcern(el) {
    const maxSelect = 5;
    const selected = document.querySelectorAll('#ob-concerns .select-chip.selected');
    if (!el.classList.contains('selected') && selected.length >= maxSelect) {
      _shakeBanner('ob-concerns', 'Maximum 5 concerns');
      return;
    }
    el.classList.toggle('selected');
  }

  // ─── Single-select chips ──────────────────────
  function selectOne(el, groupId) {
    document.querySelectorAll(`#${groupId} .select-chip`).forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  }

  // ─── Validation + step navigation ─────────────
  function next(step) {
    switch (step) {
      case 1: {
        const name = document.getElementById('ob-name')?.value.trim();
        if (!name) {
          _shake('ob-name');
          return;
        }
        // #ASSUMPTION: esthetician enters their own name here (not the client's)
        if (!state.profile) state.profile = {};
        state.profile.name = name;
        showScreen('onboard3'); // skip age/gender (step 2)
        break;
      }
      case 3: {
        if (!_skinType) {
          _shakeBanner('ob-skintype', 'Please select a default skin type');
          return;
        }
        if (!state.profile) state.profile = {};
        state.profile.skinType = _skinType;
        showScreen('onboard5'); // skip skin tone (step 4)
        break;
      }
      case 5: {
        if (!state.profile) state.profile = {};
        const concerns = [...document.querySelectorAll('#ob-concerns .select-chip.selected')]
          .map(c => c.dataset.val);
        state.profile.concerns = concerns;
        showScreen('onboard7'); // skip lifestyle (step 6)
        break;
      }
      default:
        break;
    }
  }

  // ─── Finish onboarding ────────────────────────
  function finish() {
    const keyInput = document.getElementById('ob-apikey');
    const keyVal   = keyInput?.value.trim() || '';

    if (keyVal) {
      saveApiKey(keyVal);
    }
    // Profile must at minimum have a name by now
    if (!state.profile?.name) {
      showToast('Please go back and enter your name.');
      showScreen('onboard1');
      return;
    }

    // Mark onboarded
    localStorage.setItem('glowai_onboarded', '1');
    saveState();

    // Kick off advisor intake on first open
    state.advisorOpened = false;

    showScreen('home');
  }

  // ─── Shake helpers ────────────────────────────
  function _shake(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.borderColor = 'var(--primary)';
    el.focus?.();
    el.style.transition = 'transform 0.1s';
    let count = 0;
    const interval = setInterval(() => {
      el.style.transform = count % 2 === 0 ? 'translateX(6px)' : 'translateX(-6px)';
      count++;
      if (count >= 6) {
        clearInterval(interval);
        el.style.transform = '';
      }
    }, 60);
  }

  function _shakeBanner(wrapId, message) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;
    // Flash border
    wrap.style.outline = '2px solid var(--primary)';
    wrap.style.borderRadius = '12px';
    setTimeout(() => { wrap.style.outline = ''; }, 1200);
    showToast(message);
  }

  // ─── Public API ───────────────────────────────
  return { next, finish, adjustAge, selectGender, selectSkinType, selectTone, toggleConcern, selectOne };
})();
