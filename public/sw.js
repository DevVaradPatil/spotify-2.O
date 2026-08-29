/**
 * Service worker — deliberately conservative.
 *
 * This app is authenticated and its data is per-user, so caching responses
 * aggressively would be a correctness and privacy problem: a cached page from
 * one session could be served to the next person to sign in on the device.
 *
 * So the rules are:
 *   - Only same-origin GET requests are touched at all.
 *   - Navigations are network-first and fall back to the offline page. HTML is
 *     never served from cache on a successful network trip, so a signed-out
 *     user cannot be handed a signed-in render.
 *   - Build assets under /_next/static are content-hashed and immutable, so
 *     they are safe to serve cache-first.
 *   - Everything else — API routes, Supabase, audio, images from storage — is
 *     left alone entirely.
 */

const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache anything that depends on a session.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return (
          offline ??
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      })
    );
    return;
  }

  // Content-hashed build output: the filename changes when the content does,
  // so a cache hit is always correct.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;

        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
