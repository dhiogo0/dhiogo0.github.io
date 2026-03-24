const CACHE = 'racha-facil-v2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/icons/icon.svg',
  '/assets/icons/og-image.svg',
  '/src/app.js',
  '/src/data/constants.js',
  '/src/utils/storage.js',
  '/src/utils/toast.js',
  '/src/utils/helpers.js',
  '/src/logic/balance.js',
  '/src/state/store.js',
  '/src/components/header.js',
  '/src/components/players.js',
  '/src/components/config.js',
  '/src/components/drawing.js',
  '/src/components/teams.js',
  '/src/components/history.js',
  '/src/components/profile.js',
  '/src/components/bottomnav.js',
];

/* ── Install: pre-cache app shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

/* ── Activate: remove old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Google Fonts: stale-while-revalidate
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const fetched = fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Same-origin: cache-first, network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
          return res;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});
