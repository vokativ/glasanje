// Offline service worker for a minimal application shell. Navigation is
// network-first so HTML refreshes when connected; cached same-origin GET assets
// are cache-first after their first successful fetch.
// This is not a complete offline mirror: uncached or cross-origin requests still
// need the network, and offline navigation can only fall back to `/index.html`.

const CACHE_NAME = 'glasanje-offline-v5';

// Cache contents have no age or size policy. Change this version deliberately
// when a stale precached asset must be invalidated.

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

// This worker owns the origin's Cache Storage: activating a new version deletes
// every cache except `CACHE_NAME`, so unrelated caches must not share this origin.
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

  // For HTML navigation requests, use network-first with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

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
      });
    })
  );
});
