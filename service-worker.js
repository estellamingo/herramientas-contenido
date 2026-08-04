const CACHE_NAME='daedalus-v9-1-20260804';
const APP_SHELL=[
  "./README_PWA.md",
  "./assets/fonts/Montserrat-Bold.otf",
  "./assets/fonts/Montserrat-ExtraBold.otf",
  "./assets/fonts/Montserrat-Regular.otf",
  "./assets/fonts/Raleway-Black.otf",
  "./assets/fonts/Raleway-ExtraBold.otf",
  "./assets/fonts/Raleway-Regular.otf",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/daedalus.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/templates/fge-comunicado.svg",
  "./assets/vendor/jszip.min.js",
  "./comunicado.html",
  "./config.json",
  "./css/fonts.css",
  "./css/styles.css",
  "./index.html",
  "./js/app.js",
  "./js/core/engine.js",
  "./js/core/parser.js",
  "./js/core/templateStore.js",
  "./js/engine.js",
  "./js/exporter.js",
  "./js/exporters/exporter.js",
  "./js/parser.js",
  "./js/templateStore.js",
  "./manifest.webmanifest",
  "./titulares.html",
  "./version.json"
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;

  const isNavigation=event.request.mode==='navigate';
  if(isNavigation){
    event.respondWith(
      fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
      return response;
    }))
  );
});
