const CACHE = "swipetris-v30";
const ASSETS = ["/", "/index.html", "/landing.css", "/landing.js", "/bg.js", "/play", "/play.html", "/about", "/about.html", "/scores", "/scores.html", "/scores.js", "/style.css", "/app.js", "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/qr.svg", "/fonts/press-start-2p-latin-400-normal.woff2", "/fonts/jetbrains-mono-latin-400-normal.woff2", "/fonts/jetbrains-mono-latin-700-normal.woff2", "/fonts/jetbrains-mono-latin-800-normal.woff2", "/vendor/alpinejs.esm.js", "/vendor/three.module.min.js", "/vendor/three.core.min.js", "/vendor/RoundedBoxGeometry.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/") || e.request.method !== "GET") return; // always network
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // App-shell HTML must be fresh on every online launch. Serving it stale
      // first meant a PWA needed a second launch before it saw a deployment.
      if (e.request.mode === "navigate") {
        try {
          const res = await fetch(e.request);
          if (res.ok && url.origin === location.origin) cache.put(e.request, res.clone());
          return res;
        } catch {
          return (await cache.match(e.request)) ?? Response.error();
        }
      }
      const hit = await cache.match(e.request);
      const refresh = fetch(e.request)
        .then((res) => {
          if (res.ok && url.origin === location.origin) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit ?? refresh;
    })
  );
});
