/**
 * window.__AQ — scripted access for e2e tests, QA screenshots and the dev console. OWNER: lane "core".
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

if (typeof window !== 'undefined') {
  const api: Record<string, unknown> = {
    // stores (original hooks)
    game: () => useGame.getState().game,
    mutate: useGame.getState().mutate,
    setGame: useGame.getState().setGame,
    ui: () => useUI.getState(),
    setUI: (p: Parameters<ReturnType<typeof useUI.getState>['set']>[0]) => useUI.getState().set(p),
    settings: () => useSettings.getState(),
    runtime,
    // e2e helpers
    // `ready` is defined below as a getter (lane:perf2)
    dev,
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
  window.__AQ = Object.assign(window.__AQ ?? {}, api);
  // lane:perf2 — `ready` is false while a ?fixture= URL is still loading its (lazy) fixture, so callers that wait for
  // it find the fixture in place.
  Object.defineProperty(window.__AQ, 'ready', { get: () => !fixtureBootPending(), enumerable: true, configurable: true });
}
