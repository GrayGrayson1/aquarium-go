/**
 * Web delivery of system notifications (0.5 spec §12.4–§12.6). OWNER: lane "notify".
 *
 * - Source: new entries in the game's log (the stream the toasts read). A loaded save's backlog never notifies.
 * - Shown only when permission is granted, the category is on, quiet hours don't hold it, and the page is open but
 *   not focused (`document.visibilityState === 'visible' && !document.hasFocus()`): when it's focused the in-game toast
 *   is enough, and while it's hidden the game loop is paused, so nothing happens to tell. Rules: ./rules.ts.
 * - Through `platform().notifications` (src/platform), never the browser API directly. Once permission is granted the
 *   platform prepares click delivery (the web registers public/sw.js).
 * - A tap opens its route with the "Opened from your notification" banner: in this window, or in a new one the
 *   service worker opened at `?notification=1#<route>` (read here at startup, then dropped from the address).
 * - The permission is asked only from a click ("Turn on" in Settings › Notifications or the Alerts drawer footer),
 *   never at launch (§12.4).
 */
import { create } from 'zustand';
import type { GameEvent, GameState } from '@/types';
import { platform, type NotifyPermission, type PlatformNotification } from '@/platform';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { go, useNav } from '../nav/router';
import { parseRoute, type Route } from '../nav/routes';
import { notifyPrefs, useNotifyPrefs } from './prefs';
import { decide, emptyRateState, planNotification, TEST_NOTIFICATION, type NotifyPrefs, type RateState, type RuleLookups } from './rules';

// ───────────────────────────── permission ─────────────────────────────

/** The permission as the UI shows it, re-read when the page regains focus (the player may change it in the browser). */
export const useNotifyPermission = create<{ permission: NotifyPermission }>(() => ({ permission: readPermission() }));

function readPermission(): NotifyPermission {
  try {
    return platform().notifications.permission();
  } catch {
    return 'unsupported';
  }
}

export const refreshNotifyPermission = (): void => {
  const permission = readPermission();
  if (useNotifyPermission.getState().permission !== permission) useNotifyPermission.setState({ permission });
};

/**
 * "Turn on" (§12.4): ask the browser, from the click handler that called this. Granted: the category defaults, the
 * "Notifications on" toast and click delivery; denied shows the Denied callout; a dismissed prompt stays "Not asked".
 */
export async function requestNotifications(): Promise<NotifyPermission> {
  let permission: NotifyPermission;
  try {
    permission = await platform().notifications.request();
  } catch {
    permission = readPermission();
  }
  useNotifyPermission.setState({ permission });
  if (permission === 'granted') {
    useNotifyPrefs.getState().applyDefaults();
    useUI.getState().toast('You’ll hear about rare stock, care and sales', 'info', { label: 'Notifications on', detail: 'Choose exactly what below.' });
    void platform().notifications.prepare?.();
  }
  return permission;
}

/** How long "Send test" waits before the test notification (§12.5: "Arrives in a couple of seconds"). */
export const TEST_DELAY_MS = 1500;

/** "Send test" (§12.5): granted, the test notification after ~1.5 s, even with the game focused; otherwise a toast. */
export function sendTestNotification(): boolean {
  if (readPermission() !== 'granted') {
    useUI.getState().toast('Turn notifications on first', 'info');
    return false;
  }
  setTimeout(() => {
    void platform().notifications.show({ id: `test-${Date.now()}`, title: TEST_NOTIFICATION.title, body: TEST_NOTIFICATION.body, route: null, category: 'test' });
  }, TEST_DELAY_MS);
  return true;
}

// ───────────────────────────── delivery ─────────────────────────────

export interface DeliveryEnv {
  permission: NotifyPermission;
  /** The page is visible but not focused (the only time a system notification shows). */
  away: boolean;
  prefs: NotifyPrefs;
  rate: RateState;
  /** Real time (ms) and the device's local minutes of the day. */
  now: number;
  minutes: number;
  look: RuleLookups;
}

/** What to show for these new log events (pure apart from updating `env.rate`; tests/sim/notify-deliver.test.ts). */
export function notificationsFor(events: readonly GameEvent[], env: DeliveryEnv): PlatformNotification[] {
  if (env.permission !== 'granted' || !env.away) return [];
  const out: PlatformNotification[] = [];
  for (const e of events) {
    const plan = planNotification(e, env.look);
    if (!plan) continue;
    const d = decide(plan, env.prefs, env.rate, env.now, env.minutes);
    if (d.show) out.push({ id: e.id, title: d.title, body: d.body, route: plan.route, category: plan.category });
  }
  return out;
}

export const lookupsFor = (g: GameState): RuleLookups => ({ hour: g.clock.hour, tankName: (id) => g.tanks[id]?.name ?? null });

const pageAway = (): boolean => typeof document !== 'undefined' && document.visibilityState === 'visible' && !document.hasFocus();
const localMinutes = (): number => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/** Only an offer shows "Opened from your notification" (§7.4); other screens open plainly. */
const opensOffer = (r: Route): boolean => r.kind === 'panel' && !!r.target?.startsWith('offer:');

/** Open a notification's route (an offer with the banner). Before a game is on screen it waits for one (`pending`). */
export function openNotificationRoute(route: string | null): void {
  const parsed = route ? parseRoute(route) : null;
  if (!parsed) return;
  const fromNotification = opensOffer(parsed.route);
  if (useUI.getState().screen === 'game') go(parsed.route, { filters: parsed.filters, fromNotification });
  else useNav.setState({ pending: parsed, fromNotification });
}

/** A window the service worker opened for a tap: `?notification=1` marks it (the route is the hash). */
function takeLaunchFlag(): void {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const q = new URLSearchParams(location.search);
  if (!q.has('notification')) return;
  q.delete('notification');
  const search = q.toString();
  try {
    history.replaceState(history.state, '', `${location.pathname}${search ? `?${search}` : ''}${location.hash}`);
  } catch {
    /* ignore: the flag only adds the banner */
  }
  const parsed = parseRoute(location.hash);
  if (parsed && opensOffer(parsed.route)) useNav.setState({ fromNotification: true });
}

let started = false;

/** Start delivery (UIRoot calls it once). Returns the cleanup (tests). */
export function startNotifications(): () => void {
  if (started) return () => {};
  started = true;
  takeLaunchFlag();
  const offs: (() => void)[] = [];
  const rate = emptyRateState();
  let seen: { saveId: string; idCounter: number; ids: Set<string> } | null = null;

  const onGame = (game: GameState | null) => {
    if (!game || game.isShowcase) return;
    if (!seen || seen.saveId !== game.saveId || game.idCounter < seen.idCounter) {
      // a new or loaded aquarium (or an older save of this one, whose new events will reuse ids): its log is history
      seen = { saveId: game.saveId, idCounter: game.idCounter, ids: new Set(game.log.map((e) => e.id)) };
      return;
    }
    seen.idCounter = game.idCounter;
    const fresh: GameEvent[] = [];
    for (let i = Math.max(0, game.log.length - 40); i < game.log.length; i++) {
      const e = game.log[i];
      if (seen.ids.has(e.id)) continue;
      seen.ids.add(e.id);
      fresh.push(e);
    }
    if (seen.ids.size > 800) seen.ids = new Set(game.log.map((e) => e.id));
    if (!fresh.length) return;
    const list = notificationsFor(fresh, { permission: readPermission(), away: pageAway(), prefs: notifyPrefs(), rate, now: Date.now(), minutes: localMinutes(), look: lookupsFor(game) });
    for (const n of list) void platform().notifications.show(n);
  };
  onGame(useGame.getState().game);
  offs.push(useGame.subscribe((s, p) => {
    if (s.game !== p.game) onGame(s.game);
  }));
  offs.push(platform().notifications.onOpen(openNotificationRoute));
  if (typeof window !== 'undefined') {
    const onFocus = () => {
      refreshNotifyPermission();
      useNotifyPrefs.getState().reload();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    offs.push(() => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    });
  }
  // already granted on an earlier visit: make sure taps can reach this window
  if (readPermission() === 'granted') void platform().notifications.prepare?.();
  return () => {
    started = false;
    for (const off of offs) off();
  };
}
