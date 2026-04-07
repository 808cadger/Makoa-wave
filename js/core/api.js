/**
 * api.js — GlowAI Proxy Client
 * Aloha from Pearl City!
 *
 * Calls /api/scan and /api/chat on the GlowAI server.
 * The Anthropic API key never touches the browser — it lives in server/.env.
 *
 * #ASSUMPTION: server is same-origin for PWA; set GLOWAI_SERVER_URL global
 *   for Capacitor native builds pointing at an absolute URL.
 */
;(function (root) {
  'use strict'

  // Configurable base URL — override before api.js loads for Capacitor
  const BASE = (root.GLOWAI_SERVER_URL || '').replace(/\/$/, '')

  // ─── Structured logger ────────────────────────────────────────────
  const log = {
    _out (level, msg, ctx) {
      const entry = { ts: new Date().toISOString(), level, msg, ...ctx }
      if (level === 'error') console.error(JSON.stringify(entry))
      else if (level === 'warn')  console.warn(JSON.stringify(entry))
      else                        console.log(JSON.stringify(entry))
    },
    info  (msg, ctx = {}) { this._out('info',  msg, ctx) },
    warn  (msg, ctx = {}) { this._out('warn',  msg, ctx) },
    error (msg, ctx = {}) { this._out('error', msg, ctx) },
  }

  // ─── Circuit breaker ──────────────────────────────────────────────
  const CB_THRESHOLD = 5
  const CB_RESET_MS  = 60000
  const cb = { failures: 0, openUntil: 0, state: 'closed' }

  function cbAllow () {
    if (cb.state === 'open') {
      if (Date.now() < cb.openUntil) return false
      cb.state = 'half-open'
      log.info('circuit-breaker half-open')
    }
    return true
  }
  function cbSuccess () {
    cb.failures = 0
    if (cb.state !== 'closed') { cb.state = 'closed'; log.info('circuit-breaker closed') }
  }
  function cbFailure (err) {
    cb.failures++
    if (cb.failures >= CB_THRESHOLD) {
      cb.state     = 'open'
      cb.openUntil = Date.now() + CB_RESET_MS
      log.error('circuit-breaker opened', { failures: cb.failures, err: err?.message })
    }
  }

  // ─── Retry helpers ────────────────────────────────────────────────
  const RETRYABLE = new Set([408, 429, 500, 502, 503, 504])
  function isRetryable (status) { return !status || RETRYABLE.has(status) }
  function backoff (attempt) {
    return Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 500
  }

  // ─── Core proxy call ──────────────────────────────────────────────
  /**
   * @param {string} endpoint  e.g. '/api/scan'
   * @param {object} body      JSON-serialisable request body
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs=45000]
   * @param {number} [opts.maxRetries=3]
   */
  async function _call (endpoint, body, opts = {}) {
    const { timeoutMs = 45000, maxRetries = 3 } = opts
    const reqId = Math.random().toString(36).slice(2, 9)

    if (!cbAllow()) {
      const err = new Error('GlowAI API circuit breaker open — try again shortly')
      err.circuitOpen = true
      throw err
    }

    // Auth token sourced lazily so it's always current
    function getToken () {
      return (root.glowState && root.glowState.authToken) ? root.glowState.authToken : ''
    }

    let lastErr
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const wait = backoff(attempt - 1)
        log.warn('proxy retry', { reqId, attempt, waitMs: Math.round(wait), endpoint })
        await new Promise(r => setTimeout(r, wait))
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const t0 = performance.now()

      try {
        log.info('proxy request', { reqId, attempt, endpoint })

        const headers = { 'content-type': 'application/json' }
        const token = getToken()
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch(BASE + endpoint, {
          method:  'POST',
          signal:  controller.signal,
          headers,
          body:    JSON.stringify(body),
        })

        clearTimeout(timer)
        const latencyMs = Math.round(performance.now() - t0)

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          const msg  = payload.detail || `HTTP ${res.status}`
          log.warn('proxy http-error', { reqId, status: res.status, latencyMs, msg })

          // 401 → signal the app layer to re-authenticate (don't retry)
          if (res.status === 401) {
            const err = new Error(msg)
            err.status = 401
            err.unauthorized = true
            cbFailure(err)
            throw err
          }

          if (isRetryable(res.status) && attempt < maxRetries) {
            lastErr = new Error(msg); lastErr.status = res.status
            cbFailure(lastErr); continue
          }

          const err = new Error(msg); err.status = res.status
          cbFailure(err); throw err
        }

        const data = await res.json()
        cbSuccess()
        log.info('proxy ok', { reqId, latencyMs, endpoint })
        return data

      } catch (err) {
        clearTimeout(timer)
        const latencyMs = Math.round(performance.now() - t0)

        if (err.name === 'AbortError') {
          const e = new Error(`Request timed out after ${timeoutMs}ms`)
          e.timeout = true
          log.error('proxy timeout', { reqId, endpoint, latencyMs })
          cbFailure(e); lastErr = e
          if (attempt < maxRetries) continue
          throw e
        }

        if (err.unauthorized || err.circuitOpen) throw err

        if (attempt < maxRetries && !err.status) {
          log.warn('proxy network-error', { reqId, attempt, err: err.message, latencyMs })
          cbFailure(err); lastErr = err; continue
        }

        log.error('proxy unexpected-error', { reqId, err: err.message, latencyMs })
        cbFailure(err); throw err
      }
    }

    throw lastErr || new Error('Request failed after retries')
  }

  // ─── Public API ───────────────────────────────────────────────────

  /**
   * Analyze a skin photo.
   * @param {{ image_b64, media_type, skin_type, concerns }} payload
   */
  function scan (payload, opts) {
    return _call('/api/scan', payload, opts)
  }

  /**
   * Chat with the skin advisor.
   * @param {{ messages, skin_type }} payload
   */
  function chat (payload, opts) {
    return _call('/api/chat', payload, opts)
  }

  root.ClaudeAPI = { scan, chat, log, cb }

})(typeof window !== 'undefined' ? window : this)
