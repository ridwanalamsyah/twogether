/**
 * Self-uninstalling service worker.
 *
 * Earlier versions of this app cached the splash shell. To avoid stale-shell
 * issues on devices that already registered an old SW, this version simply
 * unregisters itself and clears all caches. The app's offline data is in
 * IndexedDB — it doesn't depend on the SW.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        const regs = await self.registration.unregister();
        const clientList = await self.clients.matchAll({ type: "window" });
        for (const c of clientList) {
          c.navigate(c.url).catch(() => undefined);
        }
        return regs;
      } catch {
        return undefined;
      }
    })(),
  );
});

self.addEventListener("fetch", () => {
  // Pass through — no caching, no interception.
});
