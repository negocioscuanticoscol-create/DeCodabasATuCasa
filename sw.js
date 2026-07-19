/* Fresco a tu Casa — Service Worker
   Estrategia: network-first (datos siempre frescos), con respaldo en caché
   si la red se cae. Nunca cachea las llamadas a Supabase (para no mostrar
   datos viejos de pedidos, catálogo, etc.). */
const CACHE = 'fresco-v5';
const SHELL = ['./', './index.html', './dashboard.html', './manifest.webmanifest', './manifest-admin.webmanifest', './icon-192.png', './icon-512.png', './icon-admin-192.png', './icon-admin-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // solo GET
  const url = new URL(req.url);
  // No interceptar APIs externas (Supabase, CDNs dinámicos): siempre red directa
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        // guarda una copia para uso offline (solo respuestas válidas del mismo origen)
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
