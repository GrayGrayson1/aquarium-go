/*
 * Aquarium Go's service worker (0.5 spec §12.6; BACKLOG B-117, B-199). Hand-written, no build step.
 *
 * It only routes taps on system notifications: no fetch, cache or push handlers, so it never serves or caches a page
 * (or version.json). src/platform/web.ts registers it once notification permission is granted, with the build's base
 * path as its scope (`/aquarium-go/` on GitHub Pages).
 *
 * A tap focuses a game window inside this scope and posts { type: 'notification-click', route } to it; with none open
 * it opens the game at `?notification=1#<route>`, and the page's link boot opens the save, then the route, with the
 * "Opened from your notification" banner (src/ui/notify/deliver.ts reads and drops the flag).
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // take over game windows that were open before the worker existed, so their taps come back to them (B-117)
  event.waitUntil(self.clients.claim());
});

/** A notification's route as an address hash ('#/shop/fish/offer_k3'), or null when it names none. */
function routeOf(notification) {
  const data = notification && notification.data;
  const route = data && typeof data.route === 'string' ? data.route : null;
  if (!route) return null;
  if (route.startsWith('#/')) return route;
  if (route.startsWith('/')) return `#${route}`;
  return null;
}

async function openGame(route) {
  const scope = self.registration.scope;
  // includeUncontrolled: a window opened before this worker took control is still the game (B-117)
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const mine = windows.filter((c) => typeof c.url === 'string' && c.url.startsWith(scope));
  const target = mine.find((c) => c.focused) || mine[0];
  if (target) {
    try {
      await target.focus();
    } catch (e) {
      /* the browser may refuse focus; the message still opens the screen */
    }
    target.postMessage({ type: 'notification-click', route });
    return;
  }
  await self.clients.openWindow(route ? `${scope}?notification=1${route}` : scope);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openGame(routeOf(event.notification)));
});
