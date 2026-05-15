const CACHE_NAME = "tesi-clinica-v2";
const OFFLINE_FALLBACK = "/questionario/index.html";

const APP_SHELL = [
  "/questionario/",
  "/questionario/index.html",
  "/questionario/admin.html",
  "/questionario/domande-aperte.html",
  "/questionario/igrs.html",
  "/questionario/ecr.html",
  "/questionario/pbs.html",
  "/questionario/informativa-studio.html",
  "/questionario/informativa-privacy.html",
  "/questionario/styles.css",
  "/questionario/app.js",
  "/questionario/domande-aperte.js",
  "/questionario/igrs.js",
  "/questionario/ecr.js",
  "/questionario/pbs.js",
  "/questionario/fs.js",
  "/questionario/speech.js",
  "/questionario/firebase-config.js",
  "/questionario/icons/icon-192.png",
  "/questionario/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;
          const fallback = await caches.match(OFFLINE_FALLBACK);
          if (fallback) return fallback;
          return Response.error();
        })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith("/manifest.webmanifest")) {
      event.respondWith(fetch(req, { cache: "no-store" }));
      return;
    }

    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
  }
});
