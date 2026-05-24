// SBD Tracker Service Worker
const CACHE_NAME = 'sbd-tracker-v1';
const ASSETS = [
  '/index.html',
  '/manifest.json',
];

// ── Install: cache core assets ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network first, fallback to cache ───────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'SBD Tracker', {
      body: data.body || 'Tid til træning!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'sbd-workout',
      renotify: true,
      data: { url: '/index.html' },
      actions: [
        { action: 'open', title: 'Åbn tracker' },
        { action: 'dismiss', title: 'Senere' },
      ],
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('/index.html');
    })
  );
});

// ── Scheduled local notifications via message ─────────────────────────────────
// The app sends a message with notification data and delay in ms
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'sbd-workout',
        renotify: true,
        data: { url: '/index.html' },
        actions: [
          { action: 'open', title: 'Åbn tracker' },
          { action: 'dismiss', title: 'Senere' },
        ],
      });
    }, delayMs);
  }
});
