const CACHE = "trueque-v1";
self.addEventListener("install", (e: any) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/index.html", "/icon.svg", "/manifest.webmanifest"])));
});
self.addEventListener("fetch", (e: any) => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (request.url.startsWith(self.location.origin) && !request.url.includes("/api")) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }))
    );
  }
});
