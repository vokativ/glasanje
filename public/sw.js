// Offline service worker for a minimal application shell. Navigation is
// network-first so HTML refreshes when connected; cached same-origin GET assets
// are cache-first after their first successful fetch.
// This is not a complete offline mirror: uncached or cross-origin requests still
// need the network, and offline navigation can only fall back to `/index.html`.

const CACHE_NAME = 'glasanje-offline-v7';

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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_PRECACHE))
  );
});

// Let the installed worker wait until existing pages close. Application drafts
// are memory-only; skipWaiting/clients.claim would controllerchange-reload them.
// Once no old controlled page remains, activation removes the previous cache.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : undefined)
    ))
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  // Public procedure files can be revised independently of the application
  // shell. Always revalidate them; never pin legal/contact guidance in Cache Storage.
  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname.startsWith('/pracenje/')
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

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
