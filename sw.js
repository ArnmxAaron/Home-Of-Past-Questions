const CACHE_NAME = 'hof-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/view.html',
  '/app.js',
  '/config.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Return cache if found, otherwise fetch from network
      return response || fetch(e.request).catch(() => {
        // Fallback if both fail (offline and not cached)
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});