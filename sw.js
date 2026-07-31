/* Tombstone service worker.
 *
 * The previous site at this domain was a PWA and registered a service worker
 * at /sw.js. Browsers that installed it will keep asking for this path, and a
 * stale worker can happily serve the old app over the top of this one.
 *
 * So this file exists only to kill itself: it takes control, drops every cache
 * the old app left behind, unregisters, and reloads any open tab so the visitor
 * lands on the real site. Do not build a real service worker here without
 * deliberately handling that migration.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try {
      var names = await caches.keys();
      await Promise.all(names.map(function (n) { return caches.delete(n); }));
    } catch (e) {}

    await self.registration.unregister();

    var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(function (c) { c.navigate(c.url); });
  })());
});
