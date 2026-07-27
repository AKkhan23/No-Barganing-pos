/* No Bargaining POS — Service Worker v3 */
const CACHE = "nb-pos-static-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache API calls or auth
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/service-worker.js") return;

  // Only cache static assets (JS, CSS, images, fonts)
  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/i.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
        return cached || fetched;
      })
    );
    return;
  }

  // Navigation / HTML — always network, no cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
