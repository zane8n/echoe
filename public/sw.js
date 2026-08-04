const CACHE = "echoe-shell-v7";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const MAX_CACHE_ENTRIES = 80;

const trimCache = async (cache) => {
  const keys = await cache.keys();
  const removable = keys.filter((key) => !APP_SHELL.includes(new URL(key.url).pathname));
  await Promise.all(removable.slice(0, Math.max(0, keys.length - MAX_CACHE_ENTRIES)).map((key) => cache.delete(key)));
};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(request);
    const network = fetch(request).then(async (response) => {
      if (response.ok && ["style", "script", "image", "font"].includes(request.destination)) {
        await cache.put(request, response.clone());
        await trimCache(cache);
      }
      return response;
    });
    if (cached) {
      event.waitUntil(network.catch(() => undefined));
      return cached;
    }
    return network;
  }));
});
