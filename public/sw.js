/* ══════════════════════════════════════════
   NINJA9IT · Service Worker
══════════════════════════════════════════ */

const CACHE = 'ninja9it-v1';

const PRECACHE = [
  '/',
  '/menu',
  '/order',
  '/services',
  '/css/style.css',
  '/js/main.js',
  '/logo.jpg',
  '/service.png',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap'
];

// Install – cache core assets
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate – clean old caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch – network first, fall back to cache
self.addEventListener('fetch', function (e) {
  // Skip non-GET and cross-origin admin/api requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/admin') || e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then(function (response) {
        // Cache successful responses for static assets
        if (response.ok && (
          e.request.url.includes('/css/') ||
          e.request.url.includes('/js/') ||
          e.request.url.endsWith('.jpg') ||
          e.request.url.endsWith('.png') ||
          e.request.url.endsWith('.webp')
        )) {
          var clone = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return response;
      })
      .catch(function () {
        return caches.match(e.request).then(function (cached) {
          return cached || caches.match('/');
        });
      })
  );
});
