// Plume — mise en cache pour fonctionner hors connexion.
const CACHE = 'plume-v3';
const CORE = ['./', 'index.html', 'styles.css', 'content.js', 'conj.js', 'math.js', 'app.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'plume-audio').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord (pour recevoir les mises à jour), cache si hors connexion.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Voix : cache d'abord (elles ne changent jamais pour un même nom de fichier).
  if (e.request.url.includes('/audio/') && e.request.url.endsWith('.mp3')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open('plume-audio').then(c => c.put(e.request, copy)); }
      return res;
    })));
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
