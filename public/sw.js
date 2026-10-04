const VERSION = "twogether-v9";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const PAGE_CACHE = `${VERSION}-pages`;

// Shell pages are fetched one by one so a single 404 (hosts differ in how
// they map /home → /home.html) can't abort the whole install like
// cache.addAll() did.
const APP_SHELL = [
  "/",
  "/auth",
  "/home",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, await cleanResponse(res));
          } catch {
            // Offline during install — the runtime cache fills in later.
          }
        }),
      );
      // No automatic skipWaiting: activating mid-session swapped chunks
      // under a running page. The update banner asks first (SKIP_WAITING);
      // otherwise the new version takes over on the next cold start.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("twogether-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => undefined);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

/**
 * Safari refuses to render a navigation answered with a response that was
 * itself redirected ("Response served by service worker has redirections").
 * Hosts like Cloudflare Pages redirect /home.html → /home, so copy the body
 * into a fresh, non-redirected Response before caching or serving it.
 */
async function cleanResponse(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

function pageKey(url) {
  const path = url.pathname.replace(/\.html$/, "").replace(/\/$/, "");
  return path || "/";
}

async function handleNavigation(event) {
  const url = new URL(event.request.url);
  const key = pageKey(url);
  try {
    const preloaded = await event.preloadResponse;
    const network = preloaded || (await fetch(event.request));
    const res = await cleanResponse(network);
    if (res.ok) {
      const copy = res.clone();
      caches.open(PAGE_CACHE).then((c) => c.put(key, copy));
    }
    return res;
  } catch {
    const cached =
      (await caches.match(key, { ignoreSearch: true })) ??
      (await caches.match(key + ".html", { ignoreSearch: true }));
    if (cached) return cached;
    // Unknown page while offline: boot the splash, which restores the route
    // client-side, instead of showing a random cached page.
    return (
      (await caches.match("/", { ignoreSearch: true })) ??
      (await caches.match("/home")) ??
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Hashed build assets never change → cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // RSC payloads used by client-side navigation, icons, fonts, images →
  // network-first so a deploy is picked up immediately, cache as fallback
  // for offline use.
  if (
    url.searchParams.has("_rsc") ||
    url.pathname.endsWith(".txt") ||
    url.pathname.startsWith("/icons/") ||
    request.destination === "font" ||
    request.destination === "image" ||
    request.destination === "style" ||
    request.destination === "script"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? Response.error()),
    );
  }
});
