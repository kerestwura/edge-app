// EDGE PWA Service Worker — minimal, for installability
const CACHE_NAME = 'edge-v1';

// Install — cache the shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first, no aggressive caching
self.addEventListener('fetch', (event) => {
  // Let all requests go to network normally
  // This keeps the app fresh without offline complexity
  event.respondWith(fetch(event.request));
});
