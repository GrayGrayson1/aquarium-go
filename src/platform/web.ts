/**
 * The browser platform (0.5 design §14). OWNER: lane "platform".
 *
 * The only place the game calls the browser's notification, clipboard and share APIs (tests/sim/platform-web.test.ts
 * scans the rest of src for direct calls). Globals are read when they are used, never at import, so this module loads
 * in Node and tests can fake them.
 *
 * - Notifications: permission() maps Notification.permission, and is 'unsupported' without window.Notification.
 *   request() is the only call that asks; call it from a click handler, never at boot. show() needs 'granted'. It
 *   shows through the service worker's registration when there is one (phones and Android Chrome require that) and
 *   otherwise constructs a Notification. A tap reaches onOpen through Notification.onclick, or as a
 *   NotificationClickMessage that public/sw.js posts to the page. No schedule or cancelAll: a web page can't notify
 *   after it is closed.
 * - Clipboard: navigator.clipboard.writeText, then a hidden-textarea execCommand('copy'); false when both fail (the UI
 *   then shows the text selected for a manual copy).
 * - Share: present only when navigator.share is.
 * - Lifecycle: pause on visibilitychange to hidden or on pagehide, resume on visibilitychange to visible or on
 *   pageshow. Each subscriber hears one pause per trip away and one resume per return (closing a tab fires both
 *   visibilitychange and pagehide; the first load fires pageshow with nothing to resume from).
 * - Storage: no storageCandidates, so persistence keeps its own detection.
 */
import type { NotificationPort, NotifyPermission, Platform, PlatformNotification } from './types';

/**
 * The icon on system notifications, under the build's base path (`/aquarium-go/` on Pages): the favicon, the only icon
 * the repo ships (§12.6 asks for a 192 px PNG of it; use that once public/ has one).
 */
export const APP_ICON = `${import.meta.env.BASE_URL}favicon.svg`;

/** What public/sw.js posts to the page (`client.postMessage`) when a notification it showed is clicked. */
export const NOTIFICATION_CLICK = 'notification-click';
export interface NotificationClickMessage {
  type: typeof NOTIFICATION_CLICK;
  route: string | null;
}

const win = () => (typeof window === 'undefined' ? undefined : window);
const nav = (): Partial<Navigator> | undefined => (typeof navigator === 'undefined' ? undefined : navigator);
const doc = () => (typeof document === 'undefined' ? undefined : document);

/** The Notification constructor, when this browser has one. */
function notificationApi(): typeof Notification | undefined {
  const w = win();
  if (!w || !('Notification' in w)) return undefined;
  return typeof w.Notification === 'function' ? w.Notification : undefined;
}

const asPermission = (p: unknown): NotifyPermission => (p === 'granted' || p === 'denied' ? p : 'default');

/** The page's service-worker registration, if any. Not `serviceWorker.ready`: that never settles without one. */
async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  const sw = nav()?.serviceWorker;
  if (!sw) return undefined;
  try {
    return (await sw.getRegistration()) ?? undefined;
  } catch {
    return undefined; // SecurityError in some private modes and sandboxed frames
  }
}

/** The route a service-worker message carries, or undefined when the message isn't a notification click. */
function clickedRoute(data: unknown): string | null | undefined {
  if (!data || typeof data !== 'object' || (data as { type?: unknown }).type !== NOTIFICATION_CLICK) return undefined;
  const route = (data as { route?: unknown }).route;
  return typeof route === 'string' ? route : null;
}

function createWebNotifications(): NotificationPort {
  const openers = new Set<(route: string | null) => void>();
  let swListener: ((e: MessageEvent) => void) | null = null;
  let swTarget: ServiceWorkerContainer | null = null;

  const emitOpen = (route: string | null) => {
    for (const cb of [...openers]) {
      try {
        cb(route);
      } catch (e) {
        if (typeof console !== 'undefined') console.warn('[aquarium-go] notification open handler failed', e);
      }
    }
  };

  return {
    permission() {
      const N = notificationApi();
      return N ? asPermission(N.permission) : 'unsupported';
    },

    async request() {
      const N = notificationApi();
      if (!N) return 'unsupported';
      try {
        return asPermission((await N.requestPermission()) ?? N.permission);
      } catch {
        return asPermission(N.permission);
      }
    },

    async show(n: PlatformNotification) {
      const N = notificationApi();
      if (!N || asPermission(N.permission) !== 'granted') return false;
      const options: NotificationOptions = { body: n.body, tag: n.category, icon: APP_ICON, data: { route: n.route } };
      const reg = await registration();
      if (reg) {
        try {
          await reg.showNotification(n.title, options);
          return true;
        } catch {
          /* the worker isn't active yet, or refused: the page's own Notification may still work */
        }
      }
      try {
        const shown = new N(n.title, options);
        shown.onclick = () => {
          win()?.focus?.();
          emitOpen(n.route);
          shown.close();
        };
        return true;
      } catch {
        return false; // e.g. Android Chrome, which allows only service-worker notifications
      }
    },

    onOpen(cb) {
      openers.add(cb);
      // One service-worker listener serves every subscriber; it goes when the last one unsubscribes.
      const sw = swListener ? undefined : nav()?.serviceWorker;
      if (sw) {
        swListener = (e: MessageEvent) => {
          const route = clickedRoute(e.data);
          if (route !== undefined) emitOpen(route);
        };
        swTarget = sw;
        sw.addEventListener('message', swListener);
      }
      return () => {
        openers.delete(cb);
        if (openers.size || !swListener || !swTarget) return;
        swTarget.removeEventListener('message', swListener);
        swListener = null;
        swTarget = null;
      };
    },
  };
}

/** The pre-Clipboard-API copy: select the text in an invisible textarea and run execCommand('copy'). */
function copyWithTextarea(text: string): boolean {
  const d = doc();
  if (!d?.body || typeof d.execCommand !== 'function') return false;
  const before = d.activeElement as HTMLElement | null;
  const area = d.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', ''); // no on-screen keyboard on phones
  area.setAttribute('aria-hidden', 'true');
  Object.assign(area.style, { position: 'fixed', top: '0', left: '0', opacity: '0', pointerEvents: 'none' });
  d.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, text.length); // iOS selects nothing in a readonly field without this
    return d.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    d.body.removeChild(area);
    before?.focus?.(); // give focus back to the button that asked
  }
}

async function writeClipboard(text: string): Promise<boolean> {
  const clip = nav()?.clipboard;
  if (clip && typeof clip.writeText === 'function') {
    try {
      await clip.writeText(text);
      return true;
    } catch {
      /* refused (no focus, permissions policy): try the old way */
    }
  }
  return copyWithTextarea(text);
}

async function shareSheet(data: { title: string; url: string }): Promise<boolean> {
  const n = nav();
  if (typeof n?.share !== 'function') return false;
  try {
    await n.share({ title: data.title, url: data.url });
    return true;
  } catch {
    return false; // AbortError when the player closes the sheet; NotAllowedError without a user gesture
  }
}

/** One lifecycle subscription: `cb` runs on the transitions of its kind only (see the header). */
function watchLifecycle(kind: 'pause' | 'resume', cb: () => void): () => void {
  const d = doc();
  const w = win();
  let away = d?.visibilityState === 'hidden';
  const pause = () => {
    if (away) return;
    away = true;
    if (kind === 'pause') cb();
  };
  const resume = () => {
    if (!away) return;
    away = false;
    if (kind === 'resume') cb();
  };
  const onVisibility = () => (d?.visibilityState === 'hidden' ? pause() : resume());
  d?.addEventListener('visibilitychange', onVisibility);
  w?.addEventListener('pagehide', pause);
  w?.addEventListener('pageshow', resume);
  return () => {
    d?.removeEventListener('visibilitychange', onVisibility);
    w?.removeEventListener('pagehide', pause);
    w?.removeEventListener('pageshow', resume);
  };
}

export function createWebPlatform(): Platform {
  const p: Platform = {
    kind: 'web',
    notifications: createWebNotifications(),
    clipboard: { write: writeClipboard },
    lifecycle: {
      onPause: (cb) => watchLifecycle('pause', cb),
      onResume: (cb) => watchLifecycle('resume', cb),
    },
  };
  if (typeof nav()?.share === 'function') p.share = shareSheet;
  return p;
}
