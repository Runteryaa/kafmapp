const CACHE_NAME = 'kafmap-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/kafmap.svg',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Bypass cache for API requests, Auth, and non-GET requests
  if (
    event.request.method !== 'GET' || 
    url.includes('kafmapdb.runte.workers.dev') || 
    url.includes('appwrite.io') ||
    url.includes('overpass-api.de') ||
    url.includes('geojs.io')
  ) {
    return;
  }

  // Handle HTML navigation requests (NETWORK FIRST)
  if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, update cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If offline, serve cached HTML or offline.html
          return caches.match(event.request).then(cached => cached || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Handle other resources (JS, CSS, Images) - STALE WHILE REVALIDATE
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // Silently fail network if offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});