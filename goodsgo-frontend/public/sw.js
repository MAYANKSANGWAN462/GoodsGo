// Minimal service worker — satisfies Chrome PWA installability criteria.
// All requests pass through to the network; no caching side-effects.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // Only intercept same-origin and http(s) requests; skip chrome-extension etc.
  if (!e.request.url.startsWith('http')) return;
  e.respondWith(fetch(e.request));
});
