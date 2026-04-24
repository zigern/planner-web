/* planqly pwa worker: network-first with no app-level cache */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Keep runtime deterministic: always prefer network and never write custom caches.
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
