const CACHE = "swipetris-v7";
const ASSETS = ["/", "/index.html", "/landing.css", "/landing.js", "/play", "/play.html", "/style.css", "/app.js", "/manifest.json", "/icon.svg", "/vendor/alpinejs.esm.js", "/vendor/three.module.min.js", "/vendor/three.core.min.js", "/vendor/RoundedBoxGeometry.js"];

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
  if (url.pathname.startsWith("/api/")) return; // always network
  e.respondWith(caches.match(e.request).then((hit) => hit ?? fetch(e.request)));
});
