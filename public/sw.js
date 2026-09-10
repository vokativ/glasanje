// Offline Service Worker for the application.
// Caches the application shell, fonts, and form template for offline use.

const CACHE_NAME = 'glasanje-offline-v4';

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/assets/rotunda-serbica-envelope.webp',
  '/assets/Roboto-Regular.ttf',
  '/assets/Zahtev-za-glasanje-u-inostranstvu-2026-09-10.pdf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache same-origin static assets on the fly
        if (
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback to cached index.html for SPA navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') as Promise<Response>;
        }
        throw new Error('Мрежа није доступна');
      });
    })
  );
});
