/**
 * chunk 13 (SHARED-SHOPS.md §7.2, §7.3) — a visit to a club's shared shop, from opening to leaving.
 *
 * Opening (from the club card or the title screen): your own aquarium is saved first and the device records it
 * (src/persistence/sharedAway.ts); the shared mode goes on (src/state/sharedMode.ts: nothing saves, the loop stops), the
 * shared dispatcher replaces the solo one, and the connection wakes the server and joins. Inside, the screens show the
 * replica's copy with this player's own marks laid over it. Leaving ("Back to my aquarium", a closing, the error
 * boundary) closes the connection, puts the solo dispatcher back and loads your own save, whose clock moves on by the
 * time spent in the shop, so nothing catches up; or goes back to the title screen when you came from there.
 *
 * The owner creates the club's shop through the new-game screens (`beginCreate`): their own aquarium is saved first,
 * the starter screens show, and naming it opens the shop with `create`. OWNER: lane "social".
 */
import type { GameState } from '@/types';
import type { CommandResult } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { inSharedShop, setSharedMode } from '@/state/sharedMode';
import { devToolsAllowed } from '@/state/devTools';
import { soloDispatch } from '@/game/dispatch';
import { share } from '@/game/fastMutate';
import { defaultFocus } from '@/sim/catchUp';
import {
  clearSharedAway,
  isSharedShop,
  listSaves,
  loadAndResume,
  markSharedAway,
  readSharedAway,
  saveCurrentGame,
  autosaveRefused,
  sharedAwayHeartbeat,
  useResume,
} from '@/persistence';
import { SHARED_SHOP_SERVER, STUB_SHOP_SERVER, socialService } from '@/social';
import type { ClosingMessage } from '@/types/shared';
import { socialMode } from '../online/mode';
import { sendNow, useCloud } from '../online/cloudSync';
import { setSharedMarkHandler, type Mark } from '../common/marks';
import { SharedConnection, type ConnectionDeps, type JoinAs, type Welcome } from './connection';
import { SharedDispatcher } from './dispatch';
import { SharedActivity, toastPopup } from './activity';
import { asksFor } from '@/sim/pool';
import { overlayMarks, readMarks, recordMark, type SharedMarks } from './marks';
import { clearSharedPhotos, photoArrived, photosReconnected, setPhotoRequester } from './photos';
import { cachedShops, forgetSharedShops } from './shopsCache';
import { INITIAL_VISIT, mayPause, patchShared, useShared, type SharedClosing } from './store';
import { SHARED_WORDS as W } from './words';

const HEARTBEAT_MS = 10_000;

/**
 * The shared-shop server this session pairs with: the live one online, the stub one beside the local Social stub
 * (where the developer tools are allowed, `?shops=http://127.0.0.1:<port>` names another stub server: e2e's restart).
 */
export function sharedServerBase(): string | null {
  const mode = socialMode();
  if (mode === 'online') return SHARED_SHOP_SERVER;
  if (mode !== 'stub') return null;
  const other = devToolsAllowed() && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('shops') : null;
  return other && /^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(other) ? other : STUB_SHOP_SERVER;
}

// ── the shops this device has opened (the title screen's button, the first-time card) ─────────────────────────────

export const SHARED_OPENED_KEY = 'aquarium-go.shared-opened.v1';

export interface OpenedShop {
  club: string;
  clubName: string;
  shop: string;
  at: number;
}

export function openedShops(): OpenedShop[] {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(SHARED_OPENED_KEY) ?? '[]') as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is OpenedShop => !!x && typeof x.club === 'string' && typeof x.clubName === 'string' && typeof x.shop === 'string' && typeof x.at === 'number').sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

/** Remember an opened shop; true when this device hadn't opened it before (the first-time card). */
function noteOpened(club: string, clubName: string, shop: string): boolean {
  const list = openedShops();
  const first = !list.some((x) => x.club === club);
  const next = [{ club, clubName, shop, at: Date.now() }, ...list.filter((x) => x.club !== club)].slice(0, 5);
  try {
    globalThis.localStorage?.setItem(SHARED_OPENED_KEY, JSON.stringify(next));
  } catch {
    /* the title button and the first-time card only */
  }
  return first;
}

/** A shop that's gone: off the title screen. */
function forgetOpened(club: string): void {
  try {
    globalThis.localStorage?.setItem(SHARED_OPENED_KEY, JSON.stringify(openedShops().filter((x) => x.club !== club)));
  } catch {
    /* ignore */
  }
}

// ── the visit ──────────────────────────────────────────────────────────────────────────────────────────────────

interface Visit {
  conn: SharedConnection;
  disp: SharedDispatcher;
  activity: SharedActivity;
  /** The copy as last published (structural sharing with the replica), before the marks go over it. */
  base: GameState | null;
  marks: SharedMarks;
  created: boolean;
  /** The welcome-back summary already shown this visit (a welcome repeats it for 2 minutes). */
  catchUp: string | null;
  /** The batch being applied carried a command (its publish counts as a player action; a time step's doesn't). */
  hadCommand: boolean;
  /** This batch's steps, settled once its copy is on screen (follow-ups read the store, as in a solo game). */
  toSettle: { step: SharedStep; results: CommandResult[] }[];
  offs: (() => void)[];
}

let visit: Visit | null = null;
/** This visit wrote the device's record of your own aquarium waiting (opening from the title writes none). */
let awayRecorded = false;
/** A leave under way: a second one (a closing as Back is pressed) waits for it rather than starting again. */
let leaving: Promise<void> | null = null;
/** An opening under way (its checks, the save): a second click starts nothing (the confirmation pass's blocker). */
let opening = false;

export interface OpenOptions {
  from: 'game' | 'title';
  /** The card's name for the shop, shown until the server says. */
  shopName?: string;
  /** The owner's new shop (the new-game screens' choices). */
  create?: Extract<JoinAs, { kind: 'create' }>;
  /** Your own aquarium was saved already (the owner's create saved it before the starter screens). */
  saved?: boolean;
}

const timer = (ms: number, fn: () => void): (() => void) => {
  const h = setTimeout(fn, ms);
  return () => clearTimeout(h);
};

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

async function health(url: string): Promise<{ closed: 'cap' | 'hours' | null; until: string | null } | null> {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = setTimeout(() => ctl?.abort(), 75_000); // a cold start takes up to about a minute (§11)
  try {
    const res = await fetch(url, { cache: 'no-store', ...(ctl ? { signal: ctl.signal } : {}) });
    if (!res.ok) return null;
    const v = (await res.json()) as { closed?: unknown; until?: unknown };
    return { closed: v.closed === 'cap' || v.closed === 'hours' ? v.closed : null, until: typeof v.until === 'string' ? v.until : null };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Save your own aquarium and record that it waits (§7.2). False (with the save's own words) when it couldn't be. */
async function parkOwnGame(club: string, from: 'game' | 'title'): Promise<boolean> {
  const g = useGame.getState().game;
  // from the title there's no aquarium to keep, and a record left by a browser closed inside a shop stays for its save
  // chunk 15: nor in a scenario lab world (never saved over the player's autosave; the player's own game is in it already)
  if (from === 'title' || !g || g.isShowcase || isSharedShop(g) || autosaveRefused(g.saveId)) return true;
  const res = await saveCurrentGame('auto', { flush: true, toast: false });
  if (!res.ok) {
    useUI.getState().toast(res.message, 'danger');
    return false;
  }
  markSharedAway(club, g.saveId, 'game');
  awayRecorded = true;
  void sendNow().catch(() => {}); // with its online copy, as any save (the 2-minute gap would fall inside the shop)
  return true;
}

/**
 * Before anything wakes the server (§5.7: any request does, and closed shops mustn't): a player signed out, or shops
 * closed for the month, get the line at once. A visit that parked your own aquarium already (the owner's create) goes
 * back to it. True when the visit may go on.
 */
async function mayOpen(club: { id: string; name: string }, from: 'game' | 'title', parked: boolean): Promise<boolean> {
  const svc = socialService();
  const token = svc.accessToken ? await svc.accessToken().then((t) => t, () => undefined) : null;
  let closing: SharedClosing | null = token === null ? { why: 'signedOut' } : null;
  if (!closing) {
    const shops = await cachedShops(() => svc.sharedShops()).catch(() => null);
    if (shops?.closed) closing = { why: shops.closed, ...(shops.reopens ? { until: shops.reopens } : {}) };
  }
  if (!closing) return true;
  patchShared({ ...INITIAL_VISIT, club, from, closing, phase: 'closed' });
  if (parked) await returnToOwnGame(from);
  return false;
}

/**
 * The owner creates the club's shop: save their own aquarium, then the new-game screens titled "New shared shop"
 * (src/ui/screens: the onboarding's `shared`), whose last step calls `openSharedShop` with `create`.
 */
export async function beginCreate(club: { id: string; name: string }): Promise<boolean> {
  if (visit || opening || inSharedShop()) return false;
  opening = true;
  try {
    patchShared({ ...INITIAL_VISIT, phase: 'saving', club, from: 'game', creating: true });
    if (!(await parkOwnGame(club.id, 'game'))) {
      patchShared({ ...INITIAL_VISIT });
      return false;
    }
    patchShared({ phase: 'idle' });
    return true;
  } finally {
    opening = false;
  }
}

/** The owner backed out of the new-game screens: back to their own aquarium, as it was. */
export async function cancelCreate(): Promise<void> {
  if (visit) return;
  patchShared({ ...INITIAL_VISIT });
  await returnToOwnGame('game');
}

/** Open a club's shared shop. */
export async function openSharedShop(club: { id: string; name: string }, opts: OpenOptions): Promise<void> {
  if (visit || opening) return;
  const base = sharedServerBase();
  if (!base) return;
  opening = true;
  try {
    await open(club, opts, base);
  } catch (e) {
    console.warn('[shared] opening failed', e);
    if (!visit) patchShared({ ...INITIAL_VISIT });
  } finally {
    opening = false;
  }
}

async function open(club: { id: string; name: string }, opts: OpenOptions, base: string): Promise<void> {
  // a phase first, before any wait: the cards' and the title's buttons go busy at once (no card for the checks)
  patchShared({ ...INITIAL_VISIT, phase: 'checking', club, from: opts.from, shopName: opts.shopName ?? '', creating: !!opts.create });
  if (!(await mayOpen(club, opts.from, !!opts.saved))) return;
  patchShared({ phase: 'saving' });
  if (!opts.saved && !(await parkOwnGame(club.id, opts.from))) {
    patchShared({ ...INITIAL_VISIT });
    return;
  }
  useCloud.setState({ prompt: null });
  useResume.setState({ summary: null });
  setSharedMode(club.id);
  const svc = socialService();
  const deps: ConnectionDeps = {
    base,
    club: club.id,
    socket: (url) => {
      const ws = new WebSocket(url);
      return ws as unknown as ReturnType<ConnectionDeps['socket']>;
    },
    health,
    token: async (o) => (svc.accessToken ? svc.accessToken(o) : null),
    onToken: svc.onAccessToken ? (cb) => svc.onAccessToken!(cb) : undefined,
    gunzip,
    canGunzip: typeof DecompressionStream === 'function',
    wall: () => Date.now(),
    now: () => performance.now(),
    after: timer,
    hidden: () => typeof document !== 'undefined' && document.hidden,
  };
  let v!: Visit;
  const conn = new SharedConnection(
    deps,
    {
      phase: (p) => patchShared({ phase: p }),
      welcome: (w, first) => welcomed(v, w, first),
      applied: () => {
        // the copy first, then the results: a follow-up reads the store, which then holds what its command did
        try {
          publish(v, v.hadCommand);
        } finally {
          v.hadCommand = false;
          for (const { step, results } of v.toSettle.splice(0)) v.disp.settleStep(step, results);
        }
      },
      step: (step, results) => {
        if (step.cmds?.length || step.post?.length) v.hadCommand = true;
        if (step.cmds?.length) v.toSettle.push({ step, results });
        v.activity.step(step, results); // the pop-ups read this step's own copy (money before and after)
      },
      resync: () => v.disp.resyncAsked(),
      reject: (id, why, spend) => v.disp.reject(id, why, spend),
      members: (members) => patchShared({ members }),
      closing: (m) => void closed(m),
      signedOut: () => void leaveSharedShop({ closing: { why: 'signedOut' } }),
      photo: photoArrived,
      notice: (n) => patchShared({ notice: n }),
      stillHere: (on) => patchShared({ stillHere: on }),
      dropped: () => v.disp.dropped(),
    },
    opts.create ?? { kind: 'hello' },
  );
  const disp = new SharedDispatcher({
    sender: () => conn,
    mayPause: () => mayPause(),
    ownerName: () => useShared.getState().ownerName,
    note: (text) => useUI.getState().toast(text, 'info'),
    now: () => performance.now(),
    after: timer,
  });
  const activity = new SharedActivity({
    you: () => conn.you,
    owner: () => !!useShared.getState().you?.owner,
    state: () => conn.replica.state,
    popup: toastPopup,
    focusedTank: () => (useUI.getState().view === 'tank' ? useUI.getState().focusedTankId : null),
  });
  v = { conn, disp, activity, base: null, marks: {}, created: !!opts.create, catchUp: null, hadCommand: false, toSettle: [], offs: [] };
  visit = v;
  opening = false; // from here `visit` guards; Back during the wake must let Open start again at once
  useGame.getState().installDispatch(disp.dispatch);
  setPhotoRequester((hash) => {
    if (!conn.open) return false;
    conn.photo(hash);
    return true;
  });
  wire(v);
  await conn.start();
}

/** The player's input, the tab's visibility, the tank on screen and the heartbeat, for this visit. */
function wire(v: Visit): void {
  if (typeof window === 'undefined') return;
  const onInput = () => v.conn.noteInput();
  for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) window.addEventListener(ev, onInput, { passive: true, capture: true });
  const onVisibility = () => v.conn.visibility(document.hidden);
  document.addEventListener('visibilitychange', onVisibility);
  const offView = useUI.subscribe((s, p) => {
    if (s.focusedTankId !== p.focusedTankId || s.view !== p.view) v.conn.view(s.view === 'tank' ? s.focusedTankId : null);
  });
  const beat = setInterval(() => awayRecorded && sharedAwayHeartbeat(), HEARTBEAT_MS);
  v.offs.push(
    () => {
      for (const ev of ['pointerdown', 'keydown', 'wheel'] as const) window.removeEventListener(ev, onInput, { capture: true });
    },
    () => document.removeEventListener('visibilitychange', onVisibility),
    offView,
    () => clearInterval(beat),
  );
}

/** Show the replica's copy, this player's marks over it. `actions`: a command may be in it (views keyed on actions). */
function publish(v: Visit, actions: boolean): void {
  const s = v.conn.replica.state;
  if (!s || visit !== v) return;
  v.base = share(v.base, s) as GameState;
  useGame.getState().setGame(overlayMarks(v.base, v.marks), { actions });
}

function welcomed(v: Visit, w: Welcome, first: boolean): void {
  if (visit !== v) return;
  const you = w.you;
  const club = useShared.getState().club ?? { id: w.shop.club, name: w.shop.club };
  v.marks = readMarks(club.id, you.id);
  setSharedMarkHandler((m: Mark) => {
    const g = useGame.getState().game;
    if (!g || visit !== v) return;
    v.marks = recordMark(club.id, you.id, m, g);
    publish(v, false);
  });
  v.base = null; // a snapshot replaces the whole copy
  v.activity.reset();
  publish(v, true);
  // steps applied before this snapshot whose batch never settled (a publish that threw) settle with their results
  for (const { step, results } of v.toSettle.splice(0)) v.disp.settleStep(step, results);
  // what this copy sent before asking for the shop again is in this snapshot; its steps were skipped here
  if (!first) v.disp.resynced();
  const ownerName = w.shop.owner ?? (you.owner ? you.name : useShared.getState().ownerName);
  patchShared({ you, members: w.members, shopName: w.shop.name || useShared.getState().shopName, ownerName, creating: false });
  const summary = w.catchUp && w.catchUp.hours > 0 ? JSON.stringify(w.catchUp) : null;
  if (summary && summary !== v.catchUp) {
    v.catchUp = summary;
    useResume.setState({ summary: w.catchUp });
  }
  photosReconnected();
  if (!first) return;
  const g = v.conn.replica.state!;
  useUI.getState().set({
    screen: 'game',
    view: 'tank',
    focusedTankId: defaultFocus(g),
    panel: null,
    panelTarget: null,
    tool: 'none',
    selectedCreatureId: null,
    followCreatureId: null,
    partyMode: false,
    photoMode: false,
    hudHidden: false,
    pendingStarterId: null,
  });
  const firstTime = noteOpened(club.id, club.name, w.shop.name);
  patchShared({ firstTime });
  if (v.created) useUI.getState().toast(W.created, 'success');
  // chunk 14 (ADR-0050): an approver opening the shop hears about the requests waiting for them
  const waiting = asksFor(g, { id: you.id, owner: you.owner }).length;
  if (waiting) useUI.getState().toast(W.waitingInMoney(waiting), 'info');
}

/** The server closed the visit: back where the player came from, and say why (§8). */
async function closed(m: ClosingMessage): Promise<void> {
  const closing: SharedClosing = { why: m.why, ...(m.until ? { until: m.until } : {}), ...(m.savedAt !== undefined ? { savedAt: m.savedAt } : {}) };
  const club = useShared.getState().club;
  if ((m.why === 'gone' || m.why === 'removed') && club) forgetOpened(club.id); // off the title screen
  await leaveSharedShop({ closing });
}

/**
 * Leave the shop: the connection closes, the solo dispatcher comes back, and your own aquarium loads with no catch-up
 * for the time away (or the title screen, when you came from there). `closing`: the server's reason, shown after.
 */
export function leaveSharedShop(o: { closing?: SharedClosing } = {}): Promise<void> {
  if (leaving) return leaving;
  // nothing to leave (a second Back after a closing took the player back already)
  if (!visit && !inSharedShop()) return Promise.resolve();
  leaving = leave(o).finally(() => {
    leaving = null;
  });
  return leaving;
}

async function leave(o: { closing?: SharedClosing }): Promise<void> {
  const v = visit;
  const from = useShared.getState().from;
  const club = useShared.getState().club;
  if (v) {
    visit = null;
    v.conn.close();
    v.disp.close();
    for (const off of v.offs) off();
  }
  if (awayRecorded) sharedAwayHeartbeat();
  forgetSharedShops(); // the club cards show the shop's new day and money
  setSharedMarkHandler(null);
  setPhotoRequester(null);
  clearSharedPhotos();
  useGame.getState().installDispatch(soloDispatch);
  if (isSharedShop(useGame.getState().game)) useGame.getState().setGame(null);
  setSharedMode(null);
  patchShared({ ...INITIAL_VISIT, club: o.closing ? club : null, closing: o.closing ?? null, phase: o.closing ? 'closed' : 'idle' });
  await returnToOwnGame(from);
}

/** Your own aquarium again, as it was when you left it (or the title screen). */
async function returnToOwnGame(from: 'game' | 'title'): Promise<void> {
  const ours = awayRecorded;
  awayRecorded = false;
  const away = ours ? readSharedAway() : null;
  if (from === 'title' || !away?.saveId) {
    if (ours) clearSharedAway();
    useUI.getState().set({ screen: 'title', panel: null });
    return;
  }
  // the save that waited, wherever it is now (another tab may have autosaved another aquarium meanwhile)
  const saves = await listSaves().catch(() => []);
  const slot = saves.filter((m) => m.saveId === away.saveId && !m.previousOf).sort((a, b) => b.savedAt - a.savedAt)[0]?.slot ?? 'auto';
  const r = await loadAndResume(slot).catch(() => null);
  if (!r?.ok) {
    if (r?.error) useUI.getState().toast(r.error, 'danger');
    useUI.getState().set({ screen: 'title', panel: null });
  }
}

/** The closing card was read. */
export function dismissClosing(): void {
  patchShared({ ...INITIAL_VISIT });
}

/** The player is still here ("Still here?" answered). */
export function stillHere(): void {
  visit?.conn.noteInput();
  patchShared({ stillHere: false });
}

/** The owner gives or takes pause and speed (§5.4). */
export function grantPause(user: string, pause: boolean): void {
  visit?.conn.grant(user, pause);
}

/** Tests and the dev tools: as if the player had been quiet for `ms` ("Still here?", §7.5). */
export function devQuiet(ms: number): void {
  visit?.conn.quiet(ms);
}

/** Is a visit under way (opening or open)? */
export const visiting = (): boolean => visit !== null;
