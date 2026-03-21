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

  const SYSTEM_PROMPT = `You are GlowAI, an expert AI esthetician and skincare scientist. You have deep knowledge of dermatology, cosmetic chemistry, skincare actives, and personalized routine building. You are warm, encouraging, science-backed, and never alarmist.

ALWAYS use your tools proactively:
- When user describes their skin → use analyze_skin_profile FIRST
- After analysis → chain recommend_products
- When building or updating a routine → use build_routine
- When any ingredient is mentioned → use explain_ingredient
- When reviewing progress → use track_skin_progress

Use 2-4 tools per response. Never give generic advice — base everything on the user's specific profile and scan history.`;

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
        errEl.textContent = 'Error: ' + (e.message || 'Something went wrong. Check your API key in Settings.');
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
    switch (toolName) {
      case 'analyze_skin_profile': return { success: true, skin_type: input.skin_type || 'unknown', concerns: input.concerns || [], status: 'Skin profile analyzed.' };
      case 'recommend_products':   return { success: true, skin_type: input.skin_type, concerns: input.concerns, status: 'Product recommendations ready.' };
      case 'build_routine':        return { success: true, skin_type: input.skin_type, concerns: input.concerns, status: 'Routine structure built.' };
      case 'explain_ingredient':   return { success: true, ingredient: input.ingredient, skin_type: input.skin_type || 'all', status: 'Ingredient data retrieved.' };
      case 'track_skin_progress':  return { success: true, entries_analyzed: (input.history || []).length, weeks: input.weeks || 4, status: 'Progress trends calculated.' };
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

    const reply = `Welcome ${p.name}! 🌸 I've completed your full skin profile analysis and built your personalized routine.

**Your ${p.skinType || 'skin'} Profile Summary:**
Your skin has been assessed and I've identified your key concerns — ${p.concerns?.slice(0,2).join(' and ') || 'general skin wellness'}. Here's your personalized plan:

**Key Ingredients for your skin:**
- **Niacinamide 10%** — regulates sebum, minimizes pores, reduces redness (AM + PM)
- **Hyaluronic Acid** — multi-weight hydration without heaviness (AM)
- **Vitamin C 15%** — brightening + antioxidant protection (AM, before SPF)
- **${p.skinType === 'Sensitive' ? 'Azelaic Acid 10%' : 'Retinol 0.3%'}** — ${p.skinType === 'Sensitive' ? 'gentle multi-tasker for redness and texture' : 'cell turnover, texture, anti-aging'} (PM, 2–3× per week)

Your complete AM/PM routine is now ready in the **Routine** tab! Each step is ordered for maximum ingredient efficacy. Ask me anything — about your skin, ingredients, or how you're feeling today. 💕`;

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
      'vitamin c': `**Vitamin C (L-Ascorbic Acid)**\n\nThe most research-backed antioxidant in skincare. Neutralizes UV free radicals, inhibits melanin synthesis (fades dark spots), and stimulates collagen by 80% at 10% concentration.\n\n**Best for you (${p.skinType} skin):** L-Ascorbic Acid 15% in pH < 3.5, or Ascorbyl Glucoside 2% (more stable, gentler).\n\n**Power combo:** Pair with Vitamin E + Ferulic acid — this combination enhances photoprotection by 8×. Apply AM before SPF. Store in a dark, cool place to prevent oxidation.`,
      niacinamide: `**Niacinamide (Vitamin B3)**\n\nOne of the most versatile and well-tolerated actives. At 10%, proven to regulate sebum production by 65%, minimize pore appearance, reduce redness and inflammation, and fade hyperpigmentation via ceramide synthesis.\n\n**For ${p.skinType} skin:** 10% is the sweet spot. Both AM and PM use is safe and effective.\n\n**The best news:** Compatible with almost everything — retinol, AHAs, BHAs, Vitamin C. A true workhorse ingredient for ${p.skinType} skin.`,
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
      ? `**Your Skin Progress — ${count} Journal ${count === 1 ? 'Entry' : 'Entries'}**\n\nHere's what I see in your skin journey so far:\n\n**What's working:**\nYour consistency with logging is already building the data foundation I need to spot patterns. Keep it up!\n\n**Trends (based on ${count} ${count === 1 ? 'entry' : 'entries'}):**\n${count >= 3 ? '- Your skin descriptions show growing awareness of your skin\'s daily cycles.\n- I\'m beginning to identify your trigger patterns — continue logging for 7 more days for clearer insights.' : '- Log your skin daily for 7 days and I\'ll give you a full trend report with specific pattern findings.'}\n\n**Focus for this week:**\nBased on your ${p.skinType} skin and concerns (${p.concerns?.slice(0,2).join(', ') || 'general wellness'}), prioritize ${p.concerns?.includes('Acne & Breakouts') ? 'morning BHA use and keeping your hands off your face' : p.concerns?.includes('Dryness') ? 'double-cleansing gently and sealing in moisture while skin is still damp' : 'consistent morning SPF and evening treatment step'}. 🌸`
      : `You haven't logged any skin check-ins yet! Head to the **Scan** tab and describe how your skin looks and feels today. Even a quick note counts. After 3+ entries, I can track your progress, identify triggers, and refine your routine recommendations.\n\nThink of it as a skin diary powered by AI — the more you share, the smarter my advice gets. 🌸`;

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

    _addMsg('ai', `I've built your complete AM/PM routine based on your **${p.skinType}** skin and your concerns (${p.concerns?.slice(0,2).join(', ') || 'general wellness'})!\n\nHead to the **Routine** tab to see your personalized steps. Your morning routine focuses on protection and hydration — ending with SPF as your armor. Your evening routine prioritizes repair, treatment, and barrier recovery overnight.\n\nTip: Complete your routine every day to build your streak! 🔥 Consistency is the #1 predictor of results.`);
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

    const reply = `Great question! Based on your **${p.skinType}** skin and your concerns around ${p.concerns?.slice(0,2).join(' and ') || 'skin health'}, here's my personalized take:\n\nYour skin is telling a story, and understanding it is the first step to transformation.\n\n**My top 3 recommendations for you:**\n1. **Barrier health first** — a compromised barrier amplifies every other concern. Prioritize ceramide-rich moisturizer AM and PM.\n2. **Targeted treatment** — ${p.concerns?.includes('Acne & Breakouts') ? 'Salicylic acid (BHA) 2% for active blemishes, applied after toner on alternating nights' : p.concerns?.includes('Dark Spots') ? 'Vitamin C 15% every morning before SPF — your brightening powerhouse' : 'Niacinamide 10% daily — the most versatile active for your skin type'}\n3. **Non-negotiable SPF** — SPF 50 daily, even indoors. UV penetrates windows and is responsible for 80% of visible aging.\n\nWant me to go deeper on any ingredient, explain your last scan, or update your routine? Just ask! 💕`;

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
