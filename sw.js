// GlowAI Service Worker — offline-first, push-ready, silent updates
// Aloha from Pearl City!

const CACHE_VERSION = 'glowai-v4';
const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './app.js',
  './onboarding.js',
  './scan.js',
  './routine.js',
  './advisor.js',
  './progress.js',
  './avatar-widget.js',
  './share-widget.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: cache shell and activate immediately
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(APP_SHELL).catch(err => {
        console.error('[GlowAI SW] Precache failed:', err);
      });
      await self.skipWaiting();
    })()
  );
});

// Activate: clean stale caches, claim all tabs
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Fetch strategy:
//   Anthropic API → pass through (never intercept)
//   Everything else → cache-first with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.includes('anthropic.com')) return;

  event.respondWith(cacheFirstWithNetwork(request));
});

async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Revalidate in background
    fetch(request).then(async res => {
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(request, res);
      }
    }).catch(() => {});
    return cached;
  }

  try {
    const res = await fetch(request);
    if (res.ok && res.status < 400 && res.type === 'basic') {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, res.clone());
    }
    return res;
  } catch (_) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./offline.html');
      return fallback || new Response('<h1>GlowAI is offline</h1>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('', { status: 408 });
  }
}

// Silent auto-update: new SW activates immediately on SKIP_WAITING
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Push notifications for routine reminders + AI skin updates
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'GlowAI';
  const options = {
    body: data.body || 'Time for your skin check-in.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || 'glowai-notification',
    data: { url: data.url || './' },
    actions: data.actions || []
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// Periodic background sync for routine schedule updates
self.addEventListener('periodicsync', event => {
  if (event.tag === 'glowai-routine-refresh') {
    event.waitUntil(refreshRoutineCache());
  }
});

async function refreshRoutineCache() {
  try {
    const cache = await caches.open(CACHE_VERSION);
    const res = await fetch('./app.js');
    if (res.ok) await cache.put('./app.js', res);
  } catch (_) {}
}
