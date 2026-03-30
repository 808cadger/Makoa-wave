/**
 * advisor.js — GlowAI AI Esthetician Chat
 *
 * Full agentic loop with Claude Tools API:
 *  - Multi-tool chaining (analyze → recommend → build_routine)
 *  - Agent task bar UI showing tool progress
 *  - Starter pill prompts
 *  - Demo mode with realistic delays and responses
 *  - Chat history persisted in state.chatHistory
 */

const advisorModule = (() => {
  // ═══════════════════════════════════════════════
  //  CLAUDE TOOLS SCHEMA
  // ═══════════════════════════════════════════════
  const TOOLS = [
    {
      name: 'analyze_skin_profile',
      description: 'Analyzes skin condition based on user description. Returns skin type assessment, active concerns with severity ratings, and personalized observations.',
      input_schema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'User description of current skin condition' },
          skin_type:   { type: 'string', description: 'Known skin type from profile' },
          concerns:    { type: 'array', items: { type: 'string' }, description: 'Known concerns from profile' },
        },
        required: ['description'],
      },
    },
    {
      name: 'recommend_products',
      description: 'Recommends specific skincare products and key ingredients based on skin profile. Returns categorized list (cleanser, toner, serum, moisturizer, SPF, treatment).',
      input_schema: {
        type: 'object',
        properties: {
          skin_type: { type: 'string' },
          concerns:  { type: 'array', items: { type: 'string' } },
          budget:    { type: 'string', enum: ['budget', 'mid-range', 'luxury', 'mixed'] },
        },
        required: ['skin_type', 'concerns'],
      },
    },
    {
      name: 'build_routine',
      description: 'Creates personalized AM and PM skincare routine with ordered steps and instructions. Automatically saves to the Routine tab.',
      input_schema: {
        type: 'object',
        properties: {
          skin_type: { type: 'string' },
          concerns:  { type: 'array', items: { type: 'string' } },
          goals:     { type: 'array', items: { type: 'string' } },
        },
        required: ['skin_type', 'concerns'],
      },
    },
    {
      name: 'explain_ingredient',
      description: 'Provides detailed explanation of a skincare ingredient: benefits, usage, concentration, skin type compatibility, and interactions.',
      input_schema: {
        type: 'object',
        properties: {
          ingredient: { type: 'string', description: 'Skincare ingredient name' },
          skin_type:  { type: 'string', description: 'User skin type for compatibility check' },
        },
        required: ['ingredient'],
      },
    },
    {
      name: 'track_skin_progress',
      description: 'Analyzes skin progress across journal entries. Returns trends, improvements, areas needing attention, and updated recommendations.',
      input_schema: {
        type: 'object',
        properties: {
          history: { type: 'array', description: 'Array of past skin journal entries' },
          weeks:   { type: 'number', description: 'Number of weeks to analyze' },
        },
        required: ['history'],
      },
    },
  ];

  // #ASSUMPTION: the user of this advisor is a licensed esthetician consulting on a client, not a consumer
  const SYSTEM_PROMPT = `You are GlowAI, an expert AI esthetician advisor used by licensed skin care professionals. You support estheticians during client consultations with clinical knowledge of dermatology, cosmetic chemistry, professional treatments, and retail recommendations.

Speak in professional esthetician language. You are a knowledgeable colleague, not a consumer app.

ALWAYS use your tools proactively:
- When client skin is described → use analyze_skin_profile FIRST
- After analysis → chain recommend_products (prioritize professional treatments: peels, extractions, LED, microdermabrasion)
- When building a home-care protocol → use build_routine
- When any ingredient is mentioned → use explain_ingredient with contraindication notes
- When reviewing client progress across scans → use track_skin_progress

Use 2-4 tools per response. Never give generic advice — base everything on the client's profile and scan history. Flag contraindications, sensitivities, and pre/post-treatment protocols proactively.`;

  // ═══════════════════════════════════════════════
  //  AGENT TASK BAR STATE
  // ═══════════════════════════════════════════════
  let _taskState = {};
  const _toolMeta = {
    analyze_skin_profile: { emoji: '🔬', label: 'Analyzing your skin...' },
    recommend_products:   { emoji: '💄', label: 'Finding products...' },
    build_routine:        { emoji: '📋', label: 'Building routine...' },
    explain_ingredient:   { emoji: '🧪', label: 'Researching ingredient...' },
    track_skin_progress:  { emoji: '📈', label: 'Tracking progress...' },
  };

  function _showTaskBar(tools) {
    _taskState = {};
    tools.forEach(t => { _taskState[t] = 'pending'; });
    _renderTaskBar();
  }
  function _startTask(name) { _taskState[name] = 'running'; _renderTaskBar(); }
  function _tickTask(name) {
    _taskState[name] = 'done'; _renderTaskBar();
    if (Object.values(_taskState).every(s => s === 'done')) {
      setTimeout(_hideTaskBar, 1500);
    }
  }
  function _hideTaskBar() { _taskState = {}; const w = document.getElementById('agent-task-bar-wrap'); if (w) w.innerHTML = ''; }

  function _renderTaskBar() {
    const wrap = document.getElementById('agent-task-bar-wrap');
    if (!wrap) return;
    const tools = Object.keys(_taskState);
    if (!tools.length) { wrap.innerHTML = ''; return; }

    const rows = tools.map(t => {
      const s    = _taskState[t];
      const meta = _toolMeta[t] || { emoji: '⚙️', label: t };
      const icon = s === 'pending' ? '<span style="color:var(--text-muted);font-size:10px">●</span>'
                 : s === 'running' ? '<span class="agent-spinner">⟳</span>'
                 :                   '<span style="color:var(--success)">✓</span>';
      return `<div class="agent-task-row ${s}">
        <div class="agent-task-row-icon">${meta.emoji}</div>
        <div class="agent-task-row-label">${meta.label}</div>
        <div class="agent-task-row-status">${icon}</div>
      </div>`;
    }).join('');

    wrap.innerHTML = `
      <div class="agent-task-bar-enhanced">
        <div class="agent-task-bar-enhanced-header">✨ GlowAI is working...</div>
        ${rows}
      </div>`;
  }

  // ═══════════════════════════════════════════════
  //  ON OPEN
  // ═══════════════════════════════════════════════
  function onOpen() {
    if (!state.advisorOpened) {
      state.advisorOpened = true;
      if (state.chatHistory.length === 0) {
        setTimeout(_runAutoIntake, 400);
      } else {
        _renderChat();
      }
    } else {
      _renderChat();
    }
  }

  async function _runAutoIntake() {
    if (!state.profile) return;
    const p = state.profile;
    _addMsg('ai', `Hi ${p.name}! 🌸 I'm GlowAI, your personal AI esthetician. Let me analyze your skin profile and build your personalized routine...`);
    const prompt = `New user profile loaded. Name: ${p.name}. Skin type: ${p.skinType}. Skin tone: ${p.skinTone || 'not specified'}. Concerns: ${p.concerns?.join(', ') || 'none specified'}. Lifestyle: sleep ${p.lifestyle?.sleep || 'unknown'}, water ${p.lifestyle?.water || 'unknown'}, stress ${p.lifestyle?.stress || 'unknown'}. Please analyze their skin profile, recommend appropriate products, and build a complete AM/PM routine. Be warm and personalized.`;
    await _callClaude(prompt, true, ['analyze_skin_profile', 'recommend_products', 'build_routine']);
  }

  async function runFullAnalysis() {
    if (state.runningAnalysis) return;
    const lastScan = state.scanHistory[state.scanHistory.length - 1];
    const prompt = `Please run a full analysis for ${state.profile?.name || 'me'}. Analyze current skin profile, recommend updated products, and rebuild the routine. ${lastScan ? 'Recent scan: ' + lastScan.description : ''}`;
    await _callClaude(prompt, false, ['analyze_skin_profile', 'recommend_products', 'build_routine']);
  }

  // ═══════════════════════════════════════════════
  //  SEND CHAT
  // ═══════════════════════════════════════════════
  function sendStarter(el) {
    const input = document.getElementById('chat-input');
    if (input) input.value = el.textContent;
    send();
  }

  async function send() {
    const input = document.getElementById('chat-input');
    const text  = input?.value.trim();
    if (!text || state.runningAnalysis) return;
    if (input) { input.value = ''; input.style.height = 'auto'; }
    const pillsEl = document.getElementById('starter-pills');
    if (pillsEl) pillsEl.style.display = 'none';
    await _callClaude(text, false);
  }

  function chatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  // ═══════════════════════════════════════════════
  //  CORE CLAUDE CALL (agentic loop)
  // ═══════════════════════════════════════════════
  async function _callClaude(userText, isIntake = false, expectedTools = []) {
    if (state.runningAnalysis) return;
    state.runningAnalysis = true;

    const sendBtn = document.getElementById('chat-send');
    if (sendBtn) sendBtn.disabled = true;

    if (!isIntake) {
      _addMsg('user', userText);
    }
    if (expectedTools.length) _showTaskBar(expectedTools);
    _addTyping();

    const errEl = document.getElementById('advisor-error');
    if (errEl) errEl.classList.add('hidden');

    try {
      if (state.demoMode) {
        await _demoResponse(userText, isIntake, expectedTools);
      } else {
        await _agenticLoop(userText, isIntake, expectedTools);
      }
    } catch(e) {
      _removeTyping();
      _hideTaskBar();
      if (errEl) {
        const s = e.status;
        let msg;
        if (e.circuitOpen)    msg = 'Service temporarily paused — try again in a moment.';
        else if (s === 401)   msg = 'Invalid API key — tap ⚙️ Settings to update it.';
        else if (s === 429)   msg = 'Too many requests — wait a moment, then try again.';
        else if (s === 529)   msg = 'Claude is overloaded right now — try again shortly.';
        else if (s >= 500)    msg = 'Claude is having a moment — try again in a few seconds.';
        else if (e.timeout)   msg = 'Request timed out — check your connection and retry.';
        else                  msg = 'Error: ' + (e.message || 'Something went wrong. Check your API key in Settings.');
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
      }
    } finally {
      state.runningAnalysis = false;
      if (sendBtn) sendBtn.disabled = false;
      saveState();
    }
  }

  // ─── Live agentic loop ───────────────────────
  async function _agenticLoop(userText, isIntake, expectedTools) {
    const messages = _buildMessages(userText, isIntake);
    let continueLoop = true;

    while (continueLoop) {
      const data = await ClaudeAPI.call(state.apiKey, {
        model:      'claude-sonnet-4-6',
        max_tokens: 8000,
        system:     SYSTEM_PROMPT,
        tools:      TOOLS,
        messages,
      });
      _removeTyping();

      if (data.stop_reason === 'tool_use') {
        const toolUses   = data.content.filter(b => b.type === 'tool_use');
        const textBlocks = data.content.filter(b => b.type === 'text' && b.text?.trim());

        if (textBlocks.length) {
          _addMsg('ai', textBlocks.map(b => b.text).join('\n'));
        }

        messages.push({ role: 'assistant', content: data.content });

        const toolResults = [];
        for (const tu of toolUses) {
          _startTask(tu.name);
          _renderChat(); _addTyping();
          await delay(300);

          const result = _processToolResult(tu.name, tu.input);
          _tickTask(tu.name);
          _removeTyping();

          // When build_routine tool is called, inject a demo routine into state
          if (tu.name === 'build_routine') {
            routineModule._injectDefaultRoutine(state.profile || { skinType: tu.input.skin_type || 'Combination', concerns: tu.input.concerns || [] });
            saveState();
          }

          _addMsg('tool', _formatToolResult(tu.name, result), tu.name);
          _renderChat(); _addTyping();

          toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
        }

        messages.push({ role: 'user', content: toolResults });

      } else {
        const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        if (text) _addMsg('ai', text);
        _removeTyping();
        _hideTaskBar();
        _renderChat();
        continueLoop = false;
      }
    }
  }

  function _buildMessages(userText, isIntake) {
    const p   = state.profile;
    const ctx = p ? `[Profile: ${p.name}, ${p.skinType} skin, tone: ${p.skinTone || 'n/a'}, concerns: ${p.concerns?.join(', ') || 'none'}, lifestyle: sleep ${p.lifestyle?.sleep || 'unknown'}, stress ${p.lifestyle?.stress || 'unknown'}. Scans: ${state.scanHistory.length}]` : '';

    const msgs = [];
    for (const m of state.chatHistory) {
      if (m.role === 'user') msgs.push({ role: 'user', content: m.content });
      else if (m.role === 'ai') msgs.push({ role: 'assistant', content: m.content });
    }

    const finalUser = ctx ? `${ctx}\n\n${userText}` : userText;
    if (!isIntake) {
      const last = msgs[msgs.length - 1];
      if (!last || last.role !== 'user') msgs.push({ role: 'user', content: finalUser });
      else last.content = finalUser;
    } else {
      msgs.push({ role: 'user', content: finalUser });
    }
    return msgs;
  }

  function _processToolResult(toolName, input) {
    const p = state.profile || {};
    switch (toolName) {
      case 'analyze_skin_profile':
        return {
          success:        true,
          skin_type:      p.skinType || input.skin_type || 'unknown',
          concerns:       p.concerns || input.concerns || [],
          age:            p.age || null,
          lifestyle:      p.lifestyle || null,
          scan_count:     state.scanHistory.length,
          last_scan_date: state.scanHistory.length ? state.scanHistory[state.scanHistory.length - 1].date : null,
          status:         'Skin profile analyzed from client record.',
        };
      case 'recommend_products':
        return {
          success:              true,
          skin_type:            p.skinType || input.skin_type,
          concerns:             p.concerns || input.concerns,
          lifestyle:            p.lifestyle || null,
          scan_history_summary: state.scanHistory.slice(-3).map(s => ({
            date: s.date, score: s.score, top_concern: s.concerns?.[0]?.name,
          })),
          status: 'Product recommendations generated from client profile.',
        };
      case 'build_routine':
        return {
          success:       true,
          skin_type:     p.skinType || input.skin_type,
          concerns:      p.concerns || input.concerns,
          routine_steps: {
            am: state.routine.am.map(s => ({ step: s.step, type: s.type, product: s.product })),
            pm: state.routine.pm.map(s => ({ step: s.step, type: s.type, product: s.product })),
          },
          status: 'Routine built and saved to Routine tab.',
        };
      case 'explain_ingredient':
        return {
          success:                 true,
          ingredient:              input.ingredient,
          skin_type_compatibility: p.skinType || input.skin_type || 'all',
          known_concerns:          p.concerns || [],
          status:                  'Ingredient data retrieved.',
        };
      case 'track_skin_progress': {
        const weeks   = input.weeks || 4;
        const history = state.scanHistory.slice(-(weeks * 7));
        const scores  = history.map(s => s.score).filter(Boolean);
        return {
          success:          true,
          entries_analyzed: history.length,
          weeks,
          avg_score:        scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          score_trend:      scores.length >= 2
            ? (scores[scores.length - 1] > scores[0] ? 'improving'
              : scores[scores.length - 1] < scores[0] ? 'declining' : 'stable')
            : 'insufficient_data',
          recent_concerns:  [...new Set(history.flatMap(s => (s.concerns || []).map(c => c.name)))].slice(0, 5),
          routine_streak:   state.routine.streak || 0,
          status:           'Progress trends calculated from scan history.',
        };
      }
      default: return { success: true, status: 'Tool executed.' };
    }
  }

  function _formatToolResult(toolName, result) {
    const labels = {
      analyze_skin_profile: '🔬 Skin Analysis Complete',
      recommend_products:   '💄 Product Recommendations Ready',
      build_routine:        '📋 Routine Built',
      explain_ingredient:   '🧪 Ingredient Analysis',
      track_skin_progress:  '📈 Progress Tracked',
    };
    return labels[toolName] || 'Tool completed';
  }

  // ═══════════════════════════════════════════════
  //  DEMO MODE RESPONSES
  // ═══════════════════════════════════════════════
  async function _demoResponse(text, isIntake, expectedTools) {
    const p  = state.profile || { name: 'there', skinType: 'Combination', concerns: [], goals: [] };
    const tl = text.toLowerCase();

    if (isIntake || expectedTools.includes('build_routine')) {
      await _demoIntake(p, expectedTools);
      return;
    }
    if (tl.includes('retinol') || tl.includes('vitamin c') || tl.includes('niacinamide') || tl.includes('ingredient') || tl.includes('aha') || tl.includes('bha') || tl.includes('spf')) {
      await _demoIngredient(p, text);
      return;
    }
    if (tl.includes('progress') || tl.includes('track') || tl.includes('improve') || tl.includes('journal')) {
      await _demoProgress(p);
      return;
    }
    if (tl.includes('routine') || tl.includes('steps') || tl.includes('build me')) {
      await _demoRoutineOnly(p);
      return;
    }
    // General advisor response
    await _demoGeneral(p, text);
  }

  async function _demoIntake(p, expectedTools) {
    const tools = expectedTools.length ? expectedTools : ['analyze_skin_profile', 'recommend_products', 'build_routine'];
    _showTaskBar(tools);

    for (let i = 0; i < tools.length; i++) {
      _startTask(tools[i]);
      await delay(1200);
      _tickTask(tools[i]);
      const labels = { analyze_skin_profile: '🔬 Skin Analysis Complete', recommend_products: '💄 Product Recommendations Ready', build_routine: '📋 Routine Built' };
      _addMsg('tool', labels[tools[i]] || 'Complete', tools[i]);
      _renderChat();
      if (i < tools.length - 1) { _addTyping(); await delay(300); _removeTyping(); }
    }

    _addTyping(); await delay(900); _removeTyping(); _hideTaskBar();

    // Build routine for this profile
    routineModule._injectDefaultRoutine(p);
    saveState();

    const reply = `Welcome, ${p.name}. I've completed a comprehensive skin analysis and generated clinical recommendations based on your **${p.skinType || 'skin'}** profile and stated concerns.

**Clinical Assessment — ${p.skinType || 'Combination'} Skin:**
Primary concerns identified: ${p.concerns?.slice(0,2).join(' and ') || 'general skin health optimization'}. Treatment protocol has been calibrated accordingly.

**Evidence-Based Active Ingredients:**
- **Niacinamide 10% + Zinc 1%** — clinically proven to reduce sebum secretion by 65%, minimize pore diameter, and suppress inflammatory pathways (AM + PM)
- **Hyaluronic Acid (multi-weight)** — draws and binds water at multiple skin depths for lasting barrier hydration (AM, on damp skin)
- **L-Ascorbic Acid 15% (pH <3.5)** — neutralizes ROS, inhibits tyrosinase-mediated melanin synthesis, stimulates Type I collagen by 80% (AM, pre-SPF)
- **${p.skinType === 'Sensitive' ? 'Azelaic Acid 10%' : 'Retinol 0.3% in Squalane'}** — ${p.skinType === 'Sensitive' ? 'reduces erythema and barrier inflammation without irritation; ideal for reactive skin types' : 'accelerates epidermal cell turnover and upregulates collagen synthesis; build from 2× to nightly over 8–12 weeks'} (PM)

Your complete AM/PM routine is ready in the **Routine** tab, sequenced for optimal ingredient absorption and efficacy. Ask me about any ingredient, treatment protocol, or client concern.`;

    _addMsg('ai', reply);
    _renderChat();
  }

  async function _demoIngredient(p, text) {
    const matches = text.match(/retinol|vitamin c|niacinamide|aha|bha|glycolic|salicylic|hyaluronic|ceramide|peptide|spf|squalane|azelaic/i);
    const ingredient = matches ? matches[0] : 'retinol';

    _showTaskBar(['explain_ingredient']);
    _startTask('explain_ingredient');
    await delay(1400);
    _tickTask('explain_ingredient');
    _addMsg('tool', '🧪 Ingredient Analysis', 'explain_ingredient');
    _renderChat(); _addTyping(); await delay(900); _removeTyping(); _hideTaskBar();

    const explanations = {
      retinol: `**Retinol (Vitamin A derivative)**\n\nRetinol is the gold standard anti-aging active, converting to retinoic acid in skin cells. It accelerates cell turnover, stimulates collagen synthesis, and unclogs pores.\n\n**For ${p.skinType} skin:** ${p.skinType === 'Sensitive' ? 'Start at 0.025% every 3rd night. Buffer with moisturizer to reduce sensitivity.' : p.skinType === 'Dry' ? 'Start at 0.1%, apply after moisturizer (the "sandwich method") to minimize dryness.' : 'Start at 0.3%, build to 1% over 3–6 months as tolerated.'}\n\n**Rules:** PM only. Mandatory SPF the next morning. Expect mild purging in weeks 2–4 — this is normal. Results take 12+ weeks.`,
      'vitamin c': `**Vitamin C (L-Ascorbic Acid)**\n\nThe most extensively researched antioxidant in professional skincare. Mechanism of action: neutralizes reactive oxygen species (ROS) from UV and environmental exposure, inhibits tyrosinase-mediated melanin synthesis (hyperpigmentation correction), and upregulates Type I collagen gene expression by 80% at 10% concentration.\n\n**Optimal formulation for ${p.skinType} skin:** L-Ascorbic Acid 15% at pH <3.5 (maximum bioavailability), or Ascorbyl Glucoside 2% (phosphate-stabilized; ideal for sensitive or reactive types).\n\n**Clinical synergy:** Combining with Vitamin E (0.5%) + Ferulic Acid (0.5%) increases photoprotective efficacy by 8× versus vitamin C alone. Apply strictly AM on clean skin before SPF. Store refrigerated or in amber packaging to prevent oxidation.`,
      niacinamide: `**Niacinamide (Vitamin B3)**\n\nOne of the most clinically validated and well-tolerated actives in professional skincare. At 10%, peer-reviewed studies confirm: sebum secretion reduction by 65% over 8 weeks, visible pore minimization, suppression of inflammatory cytokines (IL-6, IL-8), and upregulation of ceramide synthesis for barrier repair.\n\n**For ${p.skinType} skin:** 10% is the clinical sweet spot — effective across all skin types, tolerated AM and PM without adaptation period.\n\n**Compatibility:** Pairs with virtually every active — retinol, AHAs, BHAs, and L-Ascorbic Acid. Niacinamide is the most universally stackable treatment ingredient in professional esthetics.`,
      squalane: `**Squalane**\n\nA lightweight, plant-derived oil (from sugarcane or olive) that perfectly mimics your skin's natural sebum. Non-comedogenic, deeply nourishing, and barrier-protective.\n\n**For ${p.skinType} skin:** ${p.skinType === 'Oily' ? 'Surprisingly excellent for oily skin — it tricks your skin into producing less sebum.' : 'A beautiful finishing oil for your PM routine, applied as the last step.'} Squalane is one of the few oils that won't cause breakouts.`,
    };

    const key   = Object.keys(explanations).find(k => ingredient.toLowerCase().includes(k.toLowerCase()));
    const reply = key
      ? explanations[key]
      : `**${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}** is a powerful skincare active. For your ${p.skinType} skin, I'd recommend introducing it gradually — start 2× per week and monitor your skin's response. Always patch test on the inner arm first, and pair with broad-spectrum SPF 50 during the day. Want me to explain how to incorporate it into your specific routine?`;

    _addMsg('ai', reply);
    _renderChat();
  }

  async function _demoProgress(p) {
    _showTaskBar(['track_skin_progress']);
    _startTask('track_skin_progress');
    await delay(1500);
    _tickTask('track_skin_progress');
    _addMsg('tool', '📈 Progress Tracked', 'track_skin_progress');
    _renderChat(); _addTyping(); await delay(1000); _removeTyping(); _hideTaskBar();

    const count = state.scanHistory.length;
    const reply = count > 0
      ? `**Client Skin Progress — ${count} Scan ${count === 1 ? 'Entry' : 'Entries'}**\n\n**Data Collection Status:**\n${count >= 5 ? 'Sufficient entries for pattern analysis. Trend identification is active.' : `${5 - count} more ${5 - count === 1 ? 'entry' : 'entries'} needed for reliable trend analysis. Continue logging daily.`}\n\n**Clinical Observations (${count} ${count === 1 ? 'entry' : 'entries'}):**\n${count >= 3 ? '- Skin condition descriptions indicate developing pattern awareness across assessment sessions.\n- Trigger correlation analysis will be available after 7 consecutive entries.' : '- Baseline data collection in progress. Log daily for 7 days to unlock AI-powered trend reporting and trigger identification.'}\n\n**Treatment Priority This Week:**\nFor ${p.skinType} skin with ${p.concerns?.slice(0,2).join(' and ') || 'the stated concerns'}: prioritize ${p.concerns?.includes('Acne & Breakouts') ? 'BHA exfoliation (AM) and barrier protection to prevent post-inflammatory hyperpigmentation' : p.concerns?.includes('Dryness') ? 'humectant layering on damp skin and occlusive seal in the final PM step' : 'consistent broad-spectrum SPF and evening treatment active to optimize long-term outcomes'}.`
      : `No scan history recorded. Begin client assessment: capture baseline photos and clinical observations in the **Scan** tab. After 3+ entries, I can identify skin condition patterns, correlate lifestyle triggers, and provide data-driven treatment adjustments.\n\nConsistent documentation is the foundation of measurable clinical outcomes.`;

    _addMsg('ai', reply);
    _renderChat();
  }

  async function _demoRoutineOnly(p) {
    _showTaskBar(['build_routine']);
    _startTask('build_routine');
    await delay(1200);
    _tickTask('build_routine');
    _addMsg('tool', '📋 Routine Built', 'build_routine');
    _renderChat(); _addTyping(); await delay(1000); _removeTyping(); _hideTaskBar();

    routineModule._injectDefaultRoutine(p);
    saveState();

    _addMsg('ai', `A complete AM/PM protocol has been built for **${p.skinType}** skin, targeting ${p.concerns?.slice(0,2).join(' and ') || 'your primary concerns'}.\n\nView the full protocol in the **Routine** tab. The morning sequence is structured for photoprotection and hydration maintenance — culminating with SPF as the final barrier. The evening sequence prioritizes cellular repair, active treatment delivery, and overnight barrier recovery.\n\nClient adherence to a consistent regimen is the single strongest predictor of measurable clinical outcomes. Use the streak tracker to monitor compliance across sessions.`);
    _renderChat();
  }

  async function _demoGeneral(p, text) {
    _showTaskBar(['analyze_skin_profile', 'recommend_products']);
    _startTask('analyze_skin_profile');
    await delay(1100);
    _tickTask('analyze_skin_profile');
    _addMsg('tool', '🔬 Skin Analysis Complete', 'analyze_skin_profile');
    _renderChat(); _addTyping(); await delay(300);
    _startTask('recommend_products');
    await delay(1100);
    _tickTask('recommend_products');
    _removeTyping();
    _addMsg('tool', '💄 Product Recommendations Ready', 'recommend_products');
    _renderChat(); _addTyping(); await delay(900); _removeTyping(); _hideTaskBar();

    const reply = `Based on the **${p.skinType}** skin profile and documented concerns (${p.concerns?.slice(0,2).join(', ') || 'general skin optimization'}), here is my clinical assessment:\n\n**Priority Treatment Protocol:**\n1. **Barrier integrity first** — a compromised lipid barrier amplifies all other concerns and reduces active ingredient penetration. Ceramide-complex moisturizer is non-negotiable AM and PM before any treatment actives.\n2. **Targeted treatment active** — ${p.concerns?.includes('Acne & Breakouts') ? 'Salicylic acid (BHA) 2% — lipid-soluble, penetrates follicles to dissolve sebum plugs and suppress C. acnes proliferation. Apply post-toner on alternating evenings.' : p.concerns?.includes('Dark Spots') ? 'L-Ascorbic Acid 15% (AM) — inhibits tyrosinase-mediated melanin synthesis at the source. Pair with Ferulic Acid for 8× enhanced efficacy.' : 'Niacinamide 10% (AM + PM) — the most clinically versatile active: sebum regulation, pore minimization, barrier ceramide synthesis, and anti-inflammatory action in a single ingredient.'}\n3. **Broad-spectrum SPF 50 (daily, year-round)** — UV radiation is responsible for 80–90% of visible photoaging. Apply as the final AM step; reapply every 2 hours in direct sun exposure.\n\nNeed deeper analysis on any ingredient interaction, treatment protocol, or contraindication? I'm here.`;

    _addMsg('ai', reply);
    _renderChat();
  }

  // ═══════════════════════════════════════════════
  //  CHAT RENDERING HELPERS
  // ═══════════════════════════════════════════════
  function _addMsg(role, content, toolName = '') {
    state.chatHistory.push({ role, content, toolName });
    _renderChat();
  }

  function _renderChat() {
    const body = document.getElementById('chat-body');
    if (!body) return;
    let html = '';
    for (const m of state.chatHistory) {
      if (m.role === 'user') {
        html += `<div class="msg-row user">
          <div class="msg-avatar user">👤</div>
          <div class="msg-bubble">${escHtml(m.content)}</div>
        </div>`;
      } else if (m.role === 'ai') {
        html += `<div class="msg-row ai">
          <div class="msg-avatar">✨</div>
          <div class="msg-bubble">${formatMsg(m.content)}</div>
        </div>`;
      } else if (m.role === 'tool') {
        html += `<div class="msg-row ai">
          <div class="tool-card">
            <div class="tool-header">
              <span class="tool-icon">🔬</span>
              <span class="tool-name">${escHtml(m.toolName || 'Tool Result')}</span>
            </div>
            <div class="tool-result">${escHtml(m.content)}</div>
          </div>
        </div>`;
      }
    }
    body.innerHTML = html;
    body.scrollTop = body.scrollHeight;
  }

  function _addTyping() {
    const body = document.getElementById('chat-body');
    if (!body || document.getElementById('typing-row')) return;
    const el = document.createElement('div');
    el.className = 'msg-row ai'; el.id = 'typing-row';
    el.innerHTML = `<div class="msg-avatar">✨</div>
      <div class="msg-bubble"><div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div></div>`;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function _removeTyping() {
    document.getElementById('typing-row')?.remove();
  }

  // ─── Public API ───────────────────────────────
  return { onOpen, send, sendStarter, chatKeyDown, autoResize, runFullAnalysis };
})();
