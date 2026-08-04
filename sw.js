/* Oddballz HD service worker -- offline play.
 *
 * The whole point is to survive with no signal, but the failure mode of a naive
 * cache is far worse than no offline support at all: cache index.html forever and
 * the game pins whatever ?v= that copy referenced, so every future deploy is
 * invisible. In a home-screen app there is no address bar and no pull-to-refresh
 * to escape with. So the strategy is split deliberately:
 *
 *   index.html (and any navigation)  -> NETWORK FIRST, cache as fallback.
 *     It is the one file that cannot carry a ?v=, because it is the thing that
 *     declares the versions. Online, a new deploy is always picked up. Offline,
 *     the last known copy is served.
 *
 *   everything else                  -> CACHE FIRST, network fills the gaps.
 *     The CSS and JS carry ?v=, so a version bump is a different URL and misses
 *     the cache by construction. Icons and the CDN libraries never change.
 *
 * Nothing is precached beyond the entry point: the asset list would otherwise have
 * to repeat the ?v= numbers from index.html and would silently rot the first time
 * the two disagreed. Instead the first online launch caches what it actually uses.
 * The cost is that the game must be opened once with a connection before it works
 * without one, which is the normal way of things.
 *
 * SW_VERSION must be bumped alongside the ?v= in index.html. Changing it renames
 * the cache, which drops every previous entry on activate.
 */
const SW_VERSION = '1.80.0';
const CACHE = 'oddballz-hd-' + SW_VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(['./', './index.html']))
      // Never let a failed precache block installation: offline support is a
      // bonus, and a service worker stuck uninstalled is worse than none.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n.startsWith('oddballz-hd-') && n !== CACHE)
             .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET. A POST or a range request has no business in this cache.
  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate' ||
    (req.destination === 'document') ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Opaque responses (a cross-origin fetch without CORS) are cached too --
        // they cannot be inspected, but they replay offline, which is the point.
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
