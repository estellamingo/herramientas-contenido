const CACHE_NAME = 'daedalus-v8-shell';
const APP_SHELL = [
  './',
  './index.html',
  './comunicado.html',
  './titulares.html',
  './config.json',
  './css/styles.css',
  './js/app.js',
  './js/engine.js',
  './js/parser.js',
  './js/exporter.js',
  './js/templateStore.js',
  './js/core/engine.js',
  './js/core/parser.js',
  './js/core/templateStore.js',
  './js/exporters/exporter.js',
  './assets/templates/fge-comunicado.svg',
  './assets/icons/daedalus.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        return response;
      });
    })
  );
});
