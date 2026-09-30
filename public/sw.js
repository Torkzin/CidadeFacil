const CACHE_NAME = "cidadefacil-shell-v2";
const OFFLINE_URLS = ["/offline", "/cidadao/offline", "/cidadao"];
const STATIC_ASSETS = [
  ...OFFLINE_URLS,
  "/manifest-cidadao.webmanifest",
  "/manifest-gestao.webmanifest",
  "/icons/cidadao/icon-192.png",
  "/icons/cidadao/icon-512.png",
  "/icons/gestao/icon-192.png",
  "/icons/gestao/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => {
      const pathname = new URL(event.request.url).pathname;
      return caches.match(pathname.startsWith("/cidadao") ? "/cidadao/offline" : "/offline");
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
