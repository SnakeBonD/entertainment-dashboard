"use strict";

const CACHE_PREFIX = "snakebond-entertainment-";
const CACHE_NAME = `${CACHE_PREFIX}v1.0.0`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/pwa-icon.svg",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png",
  "./css/style.css",
  "./js/favorites.js",
  "./js/catalog.js",
  "./js/availability.js",
  "./js/preferences.js",
  "./js/personalization.js",
  "./js/recommendations.js",
  "./js/app.js",
  "./js/pwa.js",
  "./data/platforms.json",
  "./data/platform-metadata.json",
  "./data/recommendations.json",
  "./data/schedule.json",
  "./data/catalogue.json",
  "./data/archive.json",
  "./data/radio-france.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request, navigationFallback = false) {
  try {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Réponse ${response.status}`);

    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (navigationFallback) {
      const home = await caches.match("./index.html");
      if (home) return home;
    }

    return new Response("Ressource indisponible hors ligne.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request, request.mode === "navigate"));
});
