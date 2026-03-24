const CACHE = 'racha-facil-v7';

const STATIC_ASSETS = [
  '/assets/icons/icon.svg',
  '/assets/icons/og-image.svg',
  '/manifest.json',
];

/* ── Notificacao de fim de timer ── */
self.addEventListener('message', event => {
  if (event.data?.type !== 'TIMER_END') return;
  self.registration.showNotification('Fim de Jogo! ⏰', {
    body: 'O cronometro do Racha Facil acabou!',
    icon: '/assets/icons/icon.svg',
    badge: '/assets/icons/icon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'timer-end',
    renotify: true,
  });
});

/* ── Install: pre-cache only static assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
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

  // Google Fonts: cache-first (raramente mudam)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Icones e manifest: cache-first
  if (url.origin === self.location.origin && STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // JS, CSS, HTML: network-first — sempre busca versao atualizada, cai no cache se offline
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() =>
        caches.match(event.request).then(cached => cached || caches.match('/index.html'))
      )
    );
  }
});
