// Sanjeevni PWA Service Worker — Runtime Caching & Offline App Shell
const CACHE_NAME = 'sanjeevni-shell-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const API_PREFIXES = [
  '/visit', '/visits', '/patients', '/chat', '/llm', '/auth',
  '/predict', '/explain', '/model-card', '/fhir', '/audit',
  '/cohort', '/feedback', '/report', '/history', '/simulate', '/health'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Only handle same-origin requests and never intercept API calls
  if (url.origin !== self.location.origin) return;
  if (API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  // 1. Network-first for HTML navigation with offline fallback to index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResp) => {
          if (networkResp && networkResp.ok) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResp;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // 2. Cache-first for /assets/* and static assets (JS, CSS, SVG, WAV, JSON, PNG)
  const isAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|svg|png|jpg|jpeg|webp|woff2?|wav|json)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResp) => {
        if (cachedResp) return cachedResp;
        return fetch(event.request).then((networkResp) => {
          if (networkResp && networkResp.ok) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResp;
        });
      })
    );
  }
});
