/**
 * routine.js — GlowAI AM/PM Routine Module
 *
 * Handles:
 *  - AM / PM tab switching
 *  - Routine step rendering with checkbox animations
 *  - Complete Day → streak tracking
 *  - Generate New Routine (Claude API or demo defaults)
 *  - Streak badge in header
 */

const routineModule = (() => {
  // ─── Tab state ────────────────────────────────
  let _activeTab = 'am';
  let _generating = false;

  // ═══════════════════════════════════════════════
  //  TAB SWITCH
  // ═══════════════════════════════════════════════
  function switchTab(tab) {
    _activeTab = tab;
    state.activeTab = tab;
    document.getElementById('tab-am').classList.toggle('active', tab === 'am');
    document.getElementById('tab-pm').classList.toggle('active', tab === 'pm');
    render();
  }

  // ═══════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════
  function render() {
    _renderStreakBadge();
    _renderStreakBanner();
    _renderSteps();
    _renderGenBtn();
    _renderCompleteBtn();
  }

  // ─── Streak badge in header ──────────────────
  function _renderStreakBadge() {
    const badge = document.getElementById('routine-streak-badge');
    if (!badge) return;
    const streak = state.routine.streak || 0;
    badge.textContent = `🔥 ${streak} day${streak !== 1 ? 's' : ''}`;
    if (streak >= 7) {
      badge.style.background = 'rgba(196,120,138,0.22)';
      badge.style.borderColor = 'rgba(196,120,138,0.5)';
    }
  }

  // ─── Streak banner ───────────────────────────
  function _renderStreakBanner() {
    const el = document.getElementById('routine-streak-banner');
    if (!el) return;
    const streak = state.routine.streak || 0;
    const steps  = state.routine[_activeTab] || [];
    el.innerHTML = `
      <div class="streak-banner">
        <div class="streak-fire">🔥</div>
        <div>
          <div class="streak-banner-text">${streak} day streak</div>
          <div class="streak-banner-sub">${streak === 0 ? 'Complete today to start your streak!' : streak >= 7 ? 'Incredible consistency — your skin is loving this!' : 'Keep the momentum going!'}</div>
        </div>
        ${steps.length ? `<button class="complete-day-btn" onclick="routineModule.completeDay()">Complete Day</button>` : ''}
      </div>`;
  }

  // ─── Routine steps ───────────────────────────
  function _renderSteps() {
    const stepsEl = document.getElementById('routine-steps');
    if (!stepsEl) return;
    const steps = state.routine[_activeTab] || [];

    if (!steps.length) {
      stepsEl.innerHTML = `
        <div class="empty-routine">
          <div class="empty-routine-icon">📋</div>
          <div class="empty-routine-title">No ${_activeTab.toUpperCase()} routine yet</div>
          <div class="empty-routine-sub">Chat with GlowAI to build your personalized ${_activeTab === 'am' ? 'morning' : 'evening'} routine, or tap "Generate" below to create one now based on your skin profile.</div>
          <button class="btn-primary" onclick="showScreen('advisor')">Ask GlowAI ✨</button>
        </div>`;
      return;
    }

    const allChecked = steps.every(s => s.completed);
    stepsEl.innerHTML = steps.map((s, i) => `
      <div class="routine-step ${s.completed ? 'completed' : ''}" id="step-${_activeTab}-${i}">
        <div class="step-check ${s.completed ? 'checked' : ''}" onclick="routineModule.toggleStep(${i})"></div>
        <div style="flex:1">
          <div class="step-num">Step ${s.step || i + 1}</div>
          <div class="step-type">${escHtml(s.type || '')}</div>
          <div class="step-product" style="${s.completed ? 'text-decoration:line-through;opacity:0.6' : ''}">${escHtml(s.product || s.name || '')}</div>
          <div class="step-instruction">${escHtml(s.instruction || s.instructions || '')}</div>
        </div>
      </div>`).join('');

    if (allChecked && steps.length) {
      stepsEl.innerHTML += `
        <div style="text-align:center;padding:20px;background:rgba(107,175,138,0.1);border:1px solid rgba(107,175,138,0.25);border-radius:16px;margin-top:8px;animation:slideDown 0.4s cubic-bezier(0.16,1,0.3,1)">
          <div style="font-size:32px;margin-bottom:8px">🎉</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#6BAF8A">All done!</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Amazing work — your skin thanks you!</div>
        </div>`;
    }
  }

  // ─── Generate button ─────────────────────────
  function _renderGenBtn() {
    const wrap = document.getElementById('routine-gen-btn-wrap');
    if (!wrap) return;
    wrap.innerHTML = `
      <button class="gen-routine-btn" id="gen-routine-btn" onclick="routineModule.generateRoutine()" ${_generating ? 'disabled' : ''}>
        ${_generating ? '⟳ Generating...' : '✨ Generate Personalized Routine'}
      </button>`;
  }

  // ─── Complete Day button ─────────────────────
  function _renderCompleteBtn() {
    const wrap  = document.getElementById('routine-complete-btn-wrap');
    const steps = state.routine[_activeTab] || [];
    if (!wrap || !steps.length) return;
    const allDone = steps.every(s => s.completed);
    if (allDone) {
      wrap.innerHTML = `
        <button class="btn-primary" style="background:linear-gradient(135deg,#6BAF8A,#4CAF82);margin-top:8px" onclick="routineModule.completeDay()">
          ✓ Mark Day Complete 🔥
        </button>`;
    } else {
      wrap.innerHTML = '';
    }
  }

  // ═══════════════════════════════════════════════
  //  TOGGLE STEP
  // ═══════════════════════════════════════════════
  function toggleStep(idx) {
    const steps = state.routine[_activeTab];
    if (!steps?.[idx]) return;
    steps[idx].completed = !steps[idx].completed;
    saveState();
    render();
  }

  // ═══════════════════════════════════════════════
  //  COMPLETE DAY
  // ═══════════════════════════════════════════════
  function completeDay() {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (state.routine.lastCompleted === today) {
      showToast('Already completed today! Come back tomorrow 🌸');
      return;
    }

    // Streak logic
    if (state.routine.lastCompleted === yesterday) {
      state.routine.streak = (state.routine.streak || 0) + 1;
    } else {
      state.routine.streak = 1;
    }
    state.routine.lastCompleted = today;

    // Reset checkboxes for tomorrow
    ['am', 'pm'].forEach(tab => {
      (state.routine[tab] || []).forEach(s => { s.completed = false; });
    });

    saveState();
    render();

    // Celebration toast
    const streak = state.routine.streak;
    const messages = [
      `🔥 ${streak} day streak! You're glowing!`,
      `🔥 ${streak} days strong! Your skin loves you!`,
      `✨ Day ${streak} complete — consistency is beauty!`,
    ];
    showToast(messages[Math.floor(Math.random() * messages.length)]);
  }

  // ═══════════════════════════════════════════════
  //  GENERATE ROUTINE (Claude API or demo)
  // ═══════════════════════════════════════════════
  async function generateRoutine() {
    if (_generating) return;
    _generating = true;
    _renderGenBtn();

    try {
      if (state.demoMode || !state.apiKey) {
        await delay(1600);
        _injectDefaultRoutine(state.profile || { skinType: 'Combination', concerns: [] });
      } else {
        await _callClaudeRoutine();
      }
      saveState();
      render();
      showToast('Your personalized routine is ready! ✨');
    } catch(e) {
      showToast('Could not generate routine: ' + (e.message || 'Try again'));
    } finally {
      _generating = false;
      _renderGenBtn();
    }
  }

  // ─── Claude routine call ─────────────────────
  async function _callClaudeRoutine() {
    const p = state.profile || {};
    const prompt = `Build a complete personalized AM and PM skincare routine for someone with the following profile:
- Skin type: ${p.skinType || 'Combination'}
- Skin tone: ${p.skinTone || 'not specified'}
- Concerns: ${p.concerns?.join(', ') || 'general wellness'}
- Lifestyle: sleep ${p.lifestyle?.sleep || 'unknown'}, water ${p.lifestyle?.water || 'unknown'}, stress ${p.lifestyle?.stress || 'unknown'}, diet ${p.lifestyle?.diet || 'unknown'}

Return ONLY this JSON (no prose outside JSON):
{
  "am": [
    { "step": 1, "type": "Cleanser", "product": "<product name>", "instruction": "<specific 1-2 sentence instruction>" }
  ],
  "pm": [
    { "step": 1, "type": "Cleanser", "product": "<product name>", "instruction": "<specific 1-2 sentence instruction>" }
  ]
}

AM must have 5-6 steps, PM must have 5-6 steps.
AM steps: Cleanser → Toner → Serum → Eye Cream → Moisturizer → SPF
PM steps: Oil Cleanser → Cleanser → Treatment/Exfoliant (2x/week) → Serum/Retinol → Eye Cream → Night Cream

Be specific with real product names. Tailor to the user's skin type and concerns. Return ONLY the JSON.`;

    const data = await ClaudeAPI.call(state.apiKey, {
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      messages:   [{ role: 'user', content: prompt }],
    });
    const rawText = data.content?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned an unexpected format — tap Generate to retry.');
    const result = JSON.parse(jsonMatch[0]);
    state.routine.am = (result.am || []).map((s, i) => ({ ...s, completed: false, step: s.step || i + 1 }));
    state.routine.pm = (result.pm || []).map((s, i) => ({ ...s, completed: false, step: s.step || i + 1 }));
  }

  // ─── Default routine by skin type ────────────
  function _injectDefaultRoutine(p) {
    const st = (p.skinType || 'Combination').toLowerCase();
    const hasConcernAcne = p.concerns?.some(c => c.toLowerCase().includes('acne') || c.toLowerCase().includes('breakout'));
    const hasConcernAge  = p.concerns?.some(c => c.toLowerCase().includes('line') || c.toLowerCase().includes('wrinkle') || c.toLowerCase().includes('aging'));
    const isSensitive    = st === 'sensitive';
    const isDry          = st === 'dry';
    const isOily         = st === 'oily';

    state.routine.am = [
      {
        step: 1, type: 'Cleanser',
        product: isOily ? 'La Roche-Posay Effaclar Gel Cleanser' : isDry ? 'CeraVe Hydrating Facial Cleanser' : 'Cetaphil Gentle Skin Cleanser',
        instruction: 'Massage gently onto damp skin for 60 seconds. Rinse with lukewarm water. Pat dry with a clean towel.',
        completed: false,
      },
      {
        step: 2, type: 'Toner',
        product: isSensitive ? 'Avène Thermal Spring Water Spray' : 'COSRX AHA/BHA Clarifying Treatment Toner',
        instruction: 'Apply with fingers or cotton pad. Pat gently into skin — never rub. Allow 30 seconds to absorb.',
        completed: false,
      },
      {
        step: 3, type: 'Serum',
        product: hasConcernAcne ? 'The Ordinary Niacinamide 10% + Zinc 1%' : hasConcernAge ? 'TruSkin Vitamin C Serum 20%' : 'The Ordinary Niacinamide 10% + Zinc 1%',
        instruction: 'Apply 3–4 drops to face and neck. Press gently into skin — do not rub. Allow 60 seconds to fully absorb before next step.',
        completed: false,
      },
      {
        step: 4, type: 'Eye Cream',
        product: 'Kiehl\'s Creamy Eye Treatment with Avocado',
        instruction: 'Use ring finger to tap gently around the orbital bone. Never tug or pull the delicate eye area.',
        completed: false,
      },
      {
        step: 5, type: 'Moisturizer',
        product: isOily ? 'Neutrogena Hydro Boost Water Gel' : isDry ? 'CeraVe Moisturizing Cream' : 'Belif The True Cream Aqua Bomb',
        instruction: 'Apply a pea-to-nickel sized amount. Focus on any drier areas. Allow to absorb 1–2 minutes before SPF.',
        completed: false,
      },
      {
        step: 6, type: 'SPF',
        product: 'EltaMD UV Clear Broad-Spectrum SPF 46',
        instruction: 'Apply generously as your final morning step. Reapply every 2 hours if outdoors. This is non-negotiable — SPF prevents 80% of visible aging.',
        completed: false,
      },
    ];

    state.routine.pm = [
      {
        step: 1, type: 'Oil Cleanser',
        product: 'DHC Deep Cleansing Oil',
        instruction: 'First cleanse: massage onto dry skin to dissolve SPF and makeup. Add a little water to emulsify, then rinse thoroughly.',
        completed: false,
      },
      {
        step: 2, type: 'Cleanser',
        product: isOily ? 'La Roche-Posay Effaclar Gel Cleanser' : 'CeraVe Hydrating Facial Cleanser',
        instruction: 'Second cleanse: lather on damp skin for 60 seconds, rinse with lukewarm water. The double-cleanse ensures nothing is left behind.',
        completed: false,
      },
      {
        step: 3, type: 'Exfoliant (2×/week)',
        product: isSensitive ? 'Azelaic Acid 10% Suspension' : hasConcernAcne ? 'Paula\'s Choice 2% BHA Liquid Exfoliant' : 'The Ordinary Glycolic Acid 7% Toning Solution',
        instruction: 'Use 2–3 nights per week only. Apply to clean dry skin. Do not use on the same night as retinol.',
        completed: false,
      },
      {
        step: 4, type: 'Treatment',
        product: isSensitive ? 'Avène Cicalfate+ Restorative Serum' : hasConcernAcne ? 'Differin Adapalene Gel 0.1%' : 'The Ordinary Retinol 0.3% in Squalane',
        instruction: isSensitive
          ? 'Apply a thin layer to face and neck. Press gently — no rubbing.'
          : 'Use on nights you skip the exfoliant. Apply pea-sized amount. Start 2× per week; build to nightly over 3 months.',
        completed: false,
      },
      {
        step: 5, type: 'Eye Cream',
        product: 'Kiehl\'s Creamy Eye Treatment with Avocado',
        instruction: 'Ring finger tap around the orbital bone. Always apply eye cream before heavier night creams.',
        completed: false,
      },
      {
        step: 6, type: 'Night Cream',
        product: isDry ? 'La Roche-Posay Cicaplast Baume B5' : 'CeraVe PM Facial Moisturizing Lotion',
        instruction: isDry
          ? 'Apply generously on slightly damp skin to lock in maximum hydration overnight.'
          : 'Apply a pea-sized amount. The ceramides and hyaluronic acid work overnight to repair your barrier.',
        completed: false,
      },
    ];
  }

  // ─── Public API ───────────────────────────────
  return { render, switchTab, toggleStep, completeDay, generateRoutine, _injectDefaultRoutine };
})();
