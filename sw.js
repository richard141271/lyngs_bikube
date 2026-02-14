const C='biekoloni-v1';
const ASSETS=[
  './',
  'index.html',
  'styles.css',
  'map.js',
  'bees.js',
  'game.js',
  'pwa.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))) .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  e.respondWith(
    caches.match(r).then(cached=>cached||fetch(r).then(resp=>{
      const copy=resp.clone();
      caches.open(C).then(c=>c.put(r,copy)).catch(()=>{});
      return resp;
    }).catch(()=>cached||Response.error()))
  );
});
