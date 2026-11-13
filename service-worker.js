// MON ANNÉE — fonctionnement hors connexion.
// À chaque modification des fichiers de l'application, augmente le numéro de version ci-dessous.
const CACHE = 'mon-annee-v1';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'style.css',
  'app.js', 'core.js', 'ui.js', 'common.js', 'domains.js', 'reviews.js', 'profile.js',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Cache d'abord (rapide et hors ligne), mise à jour silencieuse en arrière-plan.
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
