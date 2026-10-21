/**
 * window.__AQ — scripted access for e2e tests, QA screenshots and the dev console. OWNER: lane "core".
 * lane:core (PLAT-005) — the write calls exist only in a dev build or a ?dev=1 session (src/state/devTools.ts);
 * otherwise only the read-only diagnostics of READ_ONLY_KEYS (QA scripts open the game with ?dev=1).
 * Other lanes may add their own keys at runtime (`window.__AQ.myThing = ...`); this module merges, never replaces.
 *
 * Main helpers:
 *   __AQ.newGame(starterId, name?, seed?)   start a game (skips onboarding)
 *   __AQ.loadFixture(name, view?)           load a registered fixture (returns a Promise: the registry is lazy)
 *   __AQ.state() / summary() / getMoney() / listCreatures(tankId?)
 *   __AQ.advance(hours)                     simulate time now (returns a summary)
 *   __AQ.act(name, ...args)                 run a sim action through mutate, e.g. act('createListing', spec)
 *   __AQ.save(slot) / loadAndResume(slot) / listSaves() / continueGame()
 *   __AQ.fps(ms) / frameStats(ms)           rAF frame sampler
 *   __AQ.stats()                            game-loop diagnostics; memory() → performance.memory
 *   __AQ.dev.*                              all dev commands (src/dev/commands.ts)
 */
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { devToolsAllowed } from '@/state/devTools';
import { runtime } from '@/runtime/tankRuntime';
import { dev } from './commands';
// lane:perf2 — only the light helpers ship in the main bundle; the fixture registry is fetched on demand.
import { largestTankId } from './fixtures/showcase';
import { loadFixtureRegistry, fixtureBootPending } from './fixtures/lazy';
import { getLoopStats } from '@/game/loopStats';
import { autosaveNow } from '@/game/useAutosave';
import {
  saveCurrentGame,
  loadAndResume,
  continueGame,
  listSaves,
  deleteSave,
  loadGame,
  saveGame,
  exportSaveText,
  importSaveText,
  stateHash,
  storage,
  useResume,
} from '@/persistence';
import * as economy from '@/sim/economy';
import * as care from '@/sim/care';
import * as aquascape from '@/sim/aquascape';
import * as facility from '@/sim/facility';
import * as lifeActions from '@/sim/life/actions';
import * as compat from '@/sim/compat';
import * as production from '@/sim/production'; // lane:production (chunk 4)
import * as automation from '@/sim/automation'; // lane:automation (chunk 5)
import { facilityOverflow } from '@/render/camera/facilityOverflow';
import { navBootPending } from '@/ui/nav/router';
import { localStub } from '@/social'; // lane:social (chunk 6)
import { setSimFault } from '@/game/simHealth'; // lane:core (chunk 6, B-002)
import { loadSocialUser, refreshSocialNews } from '@/ui/panels/social/socialStore';
import { checkOnline, cloudSyncNow, useCloud } from '@/ui/online/cloudSync'; // chunk 8 (REL-032)
import { decodeSaveBody, type CloudSaveMeta } from '@/social';
import type { Command, CommandResult } from '@/sim/commands';
import { inSharedShop } from '@/state/sharedMode'; // chunk 13
import { useShared } from '@/ui/shared/store';
import { devQuiet, leaveSharedShop, openSharedShop } from '@/ui/shared/session';

/** chunk 13 (SHARED-SHOPS.md §7.3): the developer tools write nothing in a shared shop (only commands reach it). */
function noSharedWrites<F extends (...a: never[]) => unknown>(fn: F): F {
  return ((...a: Parameters<F>) => {
    if (inSharedShop()) throw new Error('The developer tools change nothing in a shared shop.');
    return fn(...a);
  }) as F;
}

/** Every function of `o`, refusing in a shared shop. */
function guardAll<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) out[k] = typeof v === 'function' ? noSharedWrites(v as (...a: never[]) => unknown) : v;
  return out as T;
}

declare global {
  interface Window {
    __AQ?: Record<string, unknown>;
  }
}

type AnyFn = (state: GameState, ...args: never[]) => unknown;

/** State-mutating sim actions callable via __AQ.act(name, ...args). */
const ACTIONS: Record<string, AnyFn> = {
  // economy
  buyOffer: economy.buyOffer as AnyFn,
  buyTank: economy.buyTank as AnyFn,
  buyEquipment: economy.buyEquipment as AnyFn,
  buyFood: economy.buyFood as AnyFn,
  buySalt: economy.buySalt as AnyFn,
  createListing: economy.createListing as AnyFn,
  withdrawListing: economy.withdrawListing as AnyFn,
  acceptBid: economy.acceptBid as AnyFn,
  declineBid: economy.declineBid as AnyFn,
  counterBid: economy.counterBid as AnyFn,
  quickSell: economy.quickSell as AnyFn,
  // care
  feedTank: care.feedTank as AnyFn,
  waterChange: care.waterChange as AnyFn,
  topOff: care.topOff as AnyFn,
  cleanTank: care.cleanTank as AnyFn,
  dose: care.dose as AnyFn,
  installEquipment: care.installEquipment as AnyFn,
  setLighting: care.setLighting as AnyFn,
  // aquascape
  placeDecor: aquascape.placeDecor as AnyFn,
  moveDecor: aquascape.moveDecor as AnyFn,
  removeDecor: aquascape.removeDecor as AnyFn,
  // facility
  setOpenToPublic: facility.setOpenToPublic as AnyFn,
  setAdmission: facility.setAdmission as AnyFn,
  upgradeFacility: facility.upgradeFacility as AnyFn,
  placeTank: facility.placeTank as AnyFn,
  toggleSignage: facility.toggleSignage as AnyFn,
  startResearch: facility.startResearch as AnyFn,
  claimQuest: facility.claimQuest as AnyFn,
  tutorialAdvance: facility.tutorialAdvance as AnyFn,
  tutorialSkip: facility.tutorialSkip as AnyFn,
  // life
  renameCreature: lifeActions.renameCreature as AnyFn,
  moveCreature: lifeActions.moveCreature as AnyFn,
  registerGlassTap: lifeActions.registerGlassTap as AnyFn,
  startBreeding: lifeActions.startBreeding as AnyFn,
  separateCreature: lifeActions.separateCreature as AnyFn,
  moveClutch: lifeActions.moveClutch as AnyFn,
  // production lines (chunk 4)
  createLine: production.createLine as AnyFn,
  setLineRunning: production.setLineRunning as AnyFn,
  setLineRule: production.setLineRule as AnyFn,
  setKeepRules: production.setKeepRules as AnyFn,
  setLinePair: production.setLinePair as AnyFn,
  setLineTank: production.setLineTank as AnyFn,
  addQuarantineTank: production.addQuarantineTank as AnyFn,
  endLine: production.endLine as AnyFn,
  // deep automation (chunk 5)
  setManualMode: automation.setManualMode as AnyFn,
  setStockOrders: automation.setStockOrders as AnyFn,
  waitForLine: automation.waitForLine as AnyFn,
  upgradePrep: automation.upgradePrep as AnyFn,
  addReservoir: automation.addReservoir as AnyFn,
  addCulture: automation.addCulture as AnyFn,
  buyEggs: economy.buyEggs as AnyFn,
};

/** Read-only sim queries callable via __AQ.query(name, ...args). */
const QUERIES: Record<string, AnyFn> = {
  evaluateTank: compat.evaluateTank as AnyFn,
  previewAddition: compat.previewAddition as AnyFn,
  incidentRisks: compat.incidentRisks as AnyFn,
  suggestPricing: economy.suggestPricing as AnyFn,
  tankValuation: economy.tankValuation as AnyFn,
  exhibitScore: facility.exhibitScore as AnyFn,
};

function act(name: string, ...args: unknown[]): unknown {
  if (inSharedShop()) throw new Error('The developer tools change nothing in a shared shop.');
  const fn = ACTIONS[name];
  if (!fn) throw new Error(`__AQ.act: unknown action ${name}. Known: ${Object.keys(ACTIONS).join(', ')}`);
  let out: unknown;
  useGame.getState().mutate((d) => {
    const r = (fn as (s: GameState, ...a: unknown[]) => unknown)(d, ...args);
    out = r === undefined ? r : JSON.parse(JSON.stringify(r));
  });
  return out;
}

function query(name: string, ...args: unknown[]): unknown {
  const fn = QUERIES[name];
  const g = useGame.getState().game;
  if (!fn || !g) return null;
  return JSON.parse(JSON.stringify((fn as (s: GameState, ...a: unknown[]) => unknown)(g, ...args)));
}

/** Sample frames for `ms` (default 2000) using requestAnimationFrame. */
function frameStats(ms = 2000): Promise<{ fps: number; frames: number; p95Ms: number; maxMs: number; avgMs: number }> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let frames = 0;
    let t0 = -1;
    let prev = -1;
    const loop = (t: number) => {
      if (t0 < 0) {
        t0 = prev = t;
        requestAnimationFrame(loop);
        return;
      }
      frames++;
      deltas.push(t - prev);
      prev = t;
      if (t - t0 < ms) requestAnimationFrame(loop);
      else {
        const sorted = [...deltas].sort((a, b) => a - b);
        const elapsed = t - t0;
        resolve({
          fps: (frames * 1000) / Math.max(1, elapsed),
          frames,
          p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
          maxMs: sorted[sorted.length - 1] ?? 0,
          avgMs: elapsed / Math.max(1, frames),
        });
      }
    };
    requestAnimationFrame(loop);
  });
}

function summary() {
  const g = useGame.getState().game;
  const ui = useUI.getState();
  if (!g) return { screen: ui.screen, hasGame: false };
  const focus = ui.focusedTankId ? g.tanks[ui.focusedTankId] : g.tanks[g.tankOrder[0]];
  const alive = Object.values(g.creatures).filter((c) => c.status === 'alive' || c.status === 'listed');
  return {
    screen: ui.screen,
    view: ui.view,
    panel: ui.panel,
    hasGame: true,
    isShowcase: !!g.isShowcase,
    starterId: g.starterId,
    money: g.finance.money,
    hour: g.clock.hour,
    speed: g.clock.speed,
    tanks: g.tankOrder.length,
    creatures: alive.length,
    focusedTankId: focus?.id ?? null,
    focusedEnvironment: focus?.environment ?? null,
    focusedWaterClass: focus?.waterClass ?? null,
    listings: g.market.listings.length,
    tutorial: g.progress.tutorial,
  };
}

/** The whole scripted API: e2e tests, QA screenshots and the dev console (a dev build, or a ?dev=1 session). */
export function debugApi(): Record<string, unknown> {
  return {
    // stores (original hooks)
    game: () => useGame.getState().game,
    mutate: noSharedWrites(useGame.getState().mutate),
    setGame: noSharedWrites(useGame.getState().setGame),
    // chunk 13 — a player action as the interface sends it (a command through the installed dispatcher: the solo one,
    // or a shared shop's); resolves with its result once it has settled
    cmd: (c: Command) => new Promise<CommandResult | null>((resolve) => useGame.getState().dispatch(c, (r) => resolve(r ? JSON.parse(JSON.stringify(r)) : r))),
    // chunk 13 — a shared shop's visit (e2e): what the screens show, and opening or leaving it as the cards do
    shared: {
      visit: () => JSON.parse(JSON.stringify(useShared.getState())),
      open: (club: { id: string; name: string }, from: 'game' | 'title' = 'game') => openSharedShop(club, { from }),
      leave: () => leaveSharedShop(),
      /** As if the player had been quiet for `ms` ("Still here?", §7.5), without waiting half an hour. */
      quiet: (ms: number) => devQuiet(ms),
    },
    ui: () => useUI.getState(),
    setUI: (p: Parameters<ReturnType<typeof useUI.getState>['set']>[0]) => useUI.getState().set(p),
    settings: () => useSettings.getState(),
    // room view: does the frame clip the exhibit row (L-8)?
    facilityOverflow,
    runtime,
    // e2e helpers
    // `ready` is defined below as a getter (lane:perf2)
    dev: guardAll(dev as unknown as Record<string, unknown>),
    // lane:core (chunk 6, B-002) — make every tick fail (the banner after three in a row)
    failSim: (on: boolean) => setSimFault(on),
    // lane:social (chunk 6) — the local Social stub's test hooks: go offline (SOC-010), something new arrives (SOC-004 A5)
    social: {
      offline: (on: boolean) => localStub()?.setOffline(on),
      pushTrade: () => {
        localStub()?.pushTrade({ id: `trade-dev-${Date.now()}`, from: 'Priya', gives: 'offers a Prismatic Halfmoon Betta', wants: 'for two Golden Axolotls', createdAt: new Date().toISOString() });
        return refreshSocialNews();
      },
      pushClubNews: () => {
        localStub()?.pushClubNews();
        return refreshSocialNews();
      },
      // chunk 8 (ONLINE-STAGE1.md §5.4) — play the owner, a friend and "another device" against the stub
      setOwner: async (on = true) => {
        localStub()?.setOwner(on);
        await loadSocialUser(true);
      },
      pushFriendRequest: (name?: string) => localStub()?.pushFriendRequest(name) ?? null,
      /** Write the online save as another device would: `meta` (revision included) and the save's text. */
      setCloud: (meta: CloudSaveMeta, text: string) => localStub()?.setCloud(meta, text),
      /** The online save as the stub holds it: its meta and the save's text (unpacked). */
      cloud: async () => {
        const c = localStub()?.cloud() ?? null;
        return c ? { meta: c.meta, encoding: c.encoding, text: await decodeSaveBody(c) } : null;
      },
      cloudSyncNow: () => cloudSyncNow(),
      cloudCheck: () => checkOnline(),
      /** The loop's state (status, prompt, syncedAt). */
      cloudState: () => ({ ...useCloud.getState() }),
    },
    fixtures: () => loadFixtureRegistry().then((r) => Object.keys(r)), // lane:perf2 — async (lazy registry)
    newGame: (starterId?: Parameters<typeof dev.newGame>[0], name?: string, seed?: number) => dev.newGame(starterId, name, seed),
    loadFixture: (name: string, view?: 'tank' | 'facility') => dev.loadFixture(name, view),
    focusLargestTank: () => {
      const g = useGame.getState().game;
      const id = g ? largestTankId(g) : null;
      if (id) dev.focusTank(id, 'tank');
      return id;
    },
    state: () => useGame.getState().game,
    summary,
    getMoney: () => useGame.getState().game?.finance.money ?? null,
    advance: (hours: number) => dev.advanceTime(hours),
    listCreatures: (tankId?: string) => {
      const g = useGame.getState().game;
      if (!g) return [];
      return Object.values(g.creatures)
        .filter((c) => (tankId ? c.tankId === tankId : true))
        .map((c) => ({
          id: c.id,
          name: c.name,
          speciesId: c.speciesId,
          tankId: c.tankId,
          status: c.status,
          sex: c.sex,
          lifeStage: c.lifeStage,
          health: c.stats.health,
          hunger: c.stats.hunger,
          generation: c.lineage.generation,
          isStarter: !!c.isStarter,
        }));
    },
    act,
    query,
    actions: () => Object.keys(ACTIONS),
    hash: () => dev.snapshotHash(),
    // persistence
    save: (slot = 'slot1') => saveCurrentGame(slot, { toast: false }),
    autosave: () => autosaveNow('dev'),
    loadAndResume: (slot = 'auto') => loadAndResume(slot).then((r) => ({ ok: r.ok, error: r.error, summary: r.summary ?? null, restoredFromBackup: !!r.restoredFromBackup, migratedFrom: r.migratedFrom })),
    continueGame: () => continueGame().then((r) => ({ ok: r.ok, slot: r.slot, error: r.error, summary: r.summary ?? null })),
    listSaves: () => listSaves(),
    /** Test helper: pretend a stored save was last played `ms` ago (the running game always stamps "now"). */
    backdateSave: async (slot: string, ms: number) => {
      const g = await loadGame(slot);
      if (!g) return false;
      g.lastTickRealMs = Date.now() - ms;
      g.lastSavedRealMs = g.lastTickRealMs;
      return (await saveGame(g, slot)).ok;
    },
    deleteSave: (slot: string) => deleteSave(slot),
    exportText: () => {
      const g = useGame.getState().game;
      return g ? exportSaveText(g) : null;
    },
    importText: (text: string, slot?: string) => importSaveText(text, slot).then((r) => ({ ok: r.ok, error: r.error, slot: r.slot })),
    storageBackend: () => storage.backendName(),
    resumeSummary: () => useResume.getState().summary,
    stateHash: () => {
      const g = useGame.getState().game;
      return g ? stateHash(g) : '';
    },
    // perf
    fps: (ms = 2000) => frameStats(ms).then((s) => s.fps),
    frameStats,
    stats: () => getLoopStats(),
    memory: () => {
      const m = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return m ? { used: m.usedJSHeapSize, total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit } : null;
    },
  };
}

/**
 * lane:core (PLAT-005, ADR-0005 decision 2) — what a production build offers without ?dev=1: read-only diagnostics.
 * Nothing here changes the game, the settings or a save; the state, UI and settings come back as copies.
 */
export const READ_ONLY_KEYS = [
  'game',
  'state',
  'ui',
  'settings',
  'facilityOverflow',
  'runtime',
  'fixtures',
  'summary',
  'getMoney',
  'listCreatures',
  'query',
  'actions',
  'hash',
  'listSaves',
  'exportText',
  'storageBackend',
  'resumeSummary',
  'stateHash',
  'fps',
  'frameStats',
  'stats',
  'memory',
] as const;

/** A copy of a value handed out (functions dropped), so nothing a read-only call returns is live state. */
function copyOf<T>(v: T): T {
  if (v == null || typeof v !== 'object') return v;
  try {
    return structuredClone(v);
  } catch {
    try {
      return JSON.parse(JSON.stringify(v)) as T;
    } catch {
      return null as T;
    }
  }
}
/** A store's state without its functions (they would change it), copied. */
function snapshot<T extends object>(state: T): Partial<T> {
  return copyOf(Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function')) as Partial<T>);
}
/** `fn`, returning a copy of its result (a promise's value too). */
const copying =
  (fn: (...a: unknown[]) => unknown) =>
  (...args: unknown[]): unknown => {
    const r = fn(...args);
    return r instanceof Promise ? r.then(copyOf) : copyOf(r);
  };

export function readOnlyDebugApi(full: Record<string, unknown> = debugApi()): Record<string, unknown> {
  const api: Record<string, unknown> = {};
  for (const k of READ_ONLY_KEYS) {
    const v = full[k];
    api[k] = typeof v === 'function' ? copying(v as (...a: unknown[]) => unknown) : v;
  }
  api.game = () => copyOf(useGame.getState().game);
  api.state = () => copyOf(useGame.getState().game);
  api.ui = () => snapshot(useUI.getState());
  api.settings = () => snapshot(useSettings.getState());
  api.query = (name: string, ...args: unknown[]) => {
    const fn = QUERIES[name];
    const g = copyOf(useGame.getState().game);
    if (!fn || !g) return null;
    return JSON.parse(JSON.stringify((fn as (s: GameState, ...a: unknown[]) => unknown)(g, ...args)));
  };
  return api;
}

if (typeof window !== 'undefined') {
  const api = devToolsAllowed() ? debugApi() : readOnlyDebugApi();
  window.__AQ = Object.assign(window.__AQ ?? {}, api);
  // lane:perf2 — `ready` is false while a ?fixture= URL is still loading its (lazy) fixture, so callers that wait for
  // it find the fixture in place. lane:ui-shell (chunk 1) — and while a link or a reload is opening a save.
  Object.defineProperty(window.__AQ, 'ready', { get: () => !fixtureBootPending() && !navBootPending(), enumerable: true, configurable: true });
}
