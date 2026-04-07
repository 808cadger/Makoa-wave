// events.js — GlowAI Pub/Sub Event Bus
// Aloha from Pearl City!

const glowEvents = (() => {
  'use strict';

  const _listeners = {};

  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(f => f !== fn);
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(fn => {
      try { fn(data); } catch (e) {
        console.error(`[GlowAI] Event handler error (${event}):`, e);
      }
    });
  }

  return { on, off, emit };
})();
