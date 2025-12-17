const CACHE_NAME = 'hof-cache-v3'; 
const ASSETS_TO_CACHE = [
  './',             // Changed to relative path for better compatibility
  './index.html',
  './view.html',
  './app.js',
  './config.js',
];

// 1. Install Event - With Debugging
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Using map instead of addAll lets us see which specific file fails
      return Promise.all(
        ASSETS_TO_CACHE.map((url) => {
          return cache.add(url).catch((error) => {
            console.error(`[SW] Could not cache: ${url} - check if the file exists!`);
          });
        })
      );
    })
  );
});

// 2. Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// 4. Fetch Event (Network-First Strategy)
self.addEventListener('fetch', (e) => {
  // Skip caching for Firebase/external hits to avoid errors
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (e.request.mode === 'navigate') return caches.match('./index.html');
        });
      })
  );
});
