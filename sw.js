const CACHE='woot-scout-v1';
const APP=['/','/index.html','/styles.css','/app.js','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/api/')) return;
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res;})));
});
