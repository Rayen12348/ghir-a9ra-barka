// Offline copy of ghir-a9ra-barka, so a session stays smooth on bad Wi-Fi or none at all.
// scripts/build.mjs fills in VERSION and PRECACHE (the site, every note, the data).
//
//  - pages, scripts, notes, data: network first (fresh when online), with a 4 s
//    timeout, then the copy kept here;
//  - PDFs and attachments: the copy kept here at once, refreshed in the background
//    (kept after the first time they are opened);
//  - fonts and Mermaid (pinned version) from their CDNs: kept after the first use;
//  - anything else on another server (the "ajouts" server above all) is not touched.
const VERSION = '__VERSION__';
const PRECACHE = '__PRECACHE__';
const SHELL = `cozy-shell-${VERSION}`;
const FILES = 'cozy-files';
const FONTS = 'cozy-fonts';
const CDN = 'cozy-cdn';
const TIMEOUT = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Batches of 8 so a phone on a weak connection isn't flooded.
    for (let i = 0; i < PRECACHE.length; i += 8) {
      await Promise.all(PRECACHE.slice(i, i + 8).map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await cache.put(url, res);
        } catch { /* offline during install: it will be cached on first use */ }
      }));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('cozy-shell-') && key !== SHELL) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/sw.js')) return;
    if (url.pathname.includes('/files/')) event.respondWith(cacheThenRefresh(req, FILES));
    else if (url.pathname.includes('/vendor/')) event.respondWith(cacheThenRefresh(req, SHELL));
    else event.respondWith(networkFirst(event, req));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheThenRefresh(req, FONTS));
  } else if (url.hostname === 'cdn.jsdelivr.net' && /@\d+\.\d+\.\d+\//.test(url.pathname)) {
    // Mermaid, pinned to an exact version: never changes, so the kept copy is enough.
    event.respondWith(cacheFirst(req, CDN));
  }
});

// The page and the hash routes (#/n/…) all live in index.html.
const keyOf = (req) => (req.mode === 'navigate' ? new URL('./', self.location).href : req.url.split('?')[0]);

async function networkFirst(event, req) {
  const cache = await caches.open(SHELL);
  const key = keyOf(req);
  const network = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') event.waitUntil(cache.put(key, res.clone()));
    return res;
  });
  network.catch(() => {});
  const cached = () => cache.match(key, { ignoreSearch: true }).then((hit) => hit ?? (req.mode === 'navigate' ? cache.match('index.html') : null));
  // Slow network: answer from the copy after TIMEOUT (the fetch still updates it).
  const late = new Promise((resolve) => setTimeout(() => cached().then((hit) => hit && resolve(hit)), TIMEOUT));
  try {
    return await Promise.race([network, late]);
  } catch {
    return (await cached()) ?? new Response('Hors ligne, et cette page n’a pas encore été gardée sur cet appareil.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function cacheThenRefresh(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  if (hit) {
    network.catch(() => {});
    return hit;
  }
  return network;
}
