const CACHE = "tutoring-schedule-v1";
const ASSETS = ["../", "../index.html", "../src/main.js", "../src/styles/main.css", "../data/tutors.csv", "../data/lessons_export.csv"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
