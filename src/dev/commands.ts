/**
 * Dev/debug commands (backend for the dev panel + window.__AQ). OWNER: lane "core".
 * Every command is safe to call with no game running (it no-ops) and goes through `mutate`.
 */
import type { GameState, WaterState, ShopOffer, Creature, WaterClass, GameSpeed } from '@/types';
import { mutateGame, getGame, useGame } from '@/state/game';
import { useUI, type ViewMode } from '@/state/ui';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { simRng } from '@/sim/rng';
import { nextId } from '@/sim/ids';
import { createCreature, assignPrismatic, forcePrismatic, recordFinds } from '@/sim/life';
import { creatureValue } from '@/sim/economy/valuation';
import { nicePrice } from '@/sim/economy/util';
import { devAgeCreature, devForceBreeding } from '@/sim/life/actions';
import { environmentGate } from '@/sim/compat';
import { earn, spend } from '@/sim/economy';
import { unlock } from '@/sim/facility';
import { newGame, previewStarters } from '@/sim/newGame';
import { findSpecies, STARTER_IDS, type StarterId } from '@/data/species';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { stateHash } from '@/persistence/hash';
import { mutateFast } from '@/game/fastMutate';
// lane:perf2 — the fixture registry and the playthrough bot are loaded on demand (kept out of the main bundle).
import { loadFixtureRegistry } from './fixtures/lazy';
import {
  addPlacedTank,
  stockTank,
  decorateTank,
  finishTank,
  tierForGallons,
  ensureFacility,
  speciesForClass,
  placeOrGrow,
} from './fixtures/core-helpers';

export interface DevResult {
  ok: boolean;
  message: string;
  ids?: string[];
}

export interface AdvanceSummary {
  hours: number;
  moneyDelta: number;
  births: number;
  bidsReceived: number;
  deaths: number;
  newEvents: number;
}

function toast(r: DevResult): DevResult {
  try {
    useUI.getState().toast(r.message, r.ok ? 'info' : 'warning');
  } catch {
    /* ignore */
  }
  return r;
}

/** Run a mutation and hand back a plain (non-draft) result. */
function withGame<T>(fn: (d: GameState) => T, fallback: T): T {
  if (!getGame()) return fallback;
  let out: T = fallback;
  mutateGame((d) => {
    const r = fn(d);
    // Detach from the immer draft (proxies are revoked when mutate finishes).
    out = r === undefined ? r : (JSON.parse(JSON.stringify(r)) as T);
  });
  return out;
}

function focusedOrFirstTank(g: GameState): string | null {
  const f = useUI.getState().focusedTankId;
  if (f && g.tanks[f]) return f;
  return g.tankOrder[0] ?? null;
}

/** Best existing tank for a species: explicit → focused (if compatible water) → any compatible → null. */
function tankForSpecies(g: GameState, speciesId: string, explicit?: string): string | null {
  const sp = findSpecies(speciesId);
  if (!sp) return null;
  if (explicit && g.tanks[explicit]) return explicit;
  const okFor = (id: string) => {
    const t = g.tanks[id];
    if (!t) return false;
    try {
      if (!environmentGate(sp, t).ok) return false;
    } catch {
      if (sp.environment !== t.environment) return false;
    }
    return sp.waterClasses.includes(t.waterClass);
  };
  const f = useUI.getState().focusedTankId;
  if (f && okFor(f)) return f;
  return g.tankOrder.find(okFor) ?? null;
}

function makeOfferCreatures(d: GameState, speciesId: string, count: number, sex?: 'male' | 'female', ageDays?: number): Creature[] {
  const rng = simRng(d);
  const out: Creature[] = [];
  for (let i = 0; i < count; i++) out.push(createCreature(d, rng, speciesId, { sex, ageDays, captiveBred: true }));
  return out;
}

export const dev = {
  addMoney(amount: number): DevResult {
    if (!Number.isFinite(amount) || amount === 0) return { ok: false, message: 'Amount must be a non-zero number' };
    return withGame<DevResult>(
      (d) => {
        if (amount > 0) earn(d, amount, 'other', 'Dev funds');
        else spend(d, -amount, 'other', 'Dev debit', true);
        return { ok: true, message: `${amount > 0 ? '+' : '−'}$${Math.abs(amount).toLocaleString()}` };
      },
      { ok: false, message: 'No game running' },
    );
  },

  unlockAll(): DevResult {
    return withGame<DevResult>(
      (d) => {
        for (const key of Object.keys(UNLOCK_KEYS)) {
          try {
            unlock(d, key, { silent: true });
          } catch {
            if (!d.progress.unlocked.includes(key)) d.progress.unlocked.push(key);
          }
        }
        return { ok: true, message: `Unlocked ${Object.keys(UNLOCK_KEYS).length} keys` };
      },
      { ok: false, message: 'No game running' },
    );
  },

  /**
   * Spawn creatures of a species into `tankId`, else the focused tank (if the water suits it), else any suitable tank,
   * else a newly created tank sized for the species.
   */
  spawnSpecies(speciesId: string, tankId?: string, opts: { sex?: 'male' | 'female'; count?: number; ageDays?: number } = {}): DevResult {
    const sp = findSpecies(speciesId);
    if (!sp) return toast({ ok: false, message: `Unknown species “${speciesId}”` });
    const count = Math.max(1, Math.min(200, Math.floor(opts.count ?? 1)));
    return withGame<DevResult>(
      (d) => {
        let target = tankForSpecies(d, speciesId, tankId);
        let created = false;
        if (!target) {
          const tier = tierForGallons(Math.max(10, sp.recommendedMinTankGallons));
          const wc: WaterClass = sp.waterClasses[0] ?? (sp.environment === 'marine' ? 'marine_live_rock' : 'freshwater_tropical');
          const t = addPlacedTank(d, tier, wc, `${sp.commonName} Tank`, placeOrGrow(d, tier));
          decorateTank(d, t);
          target = t.id;
          created = true;
        }
        const made = stockTank(d, target, [{ species: speciesId, count, sex: opts.sex ?? 'auto', ageDays: opts.ageDays }]);
        finishTank(d, d.tanks[target]);
        return {
          ok: made.length > 0,
          message: `Spawned ${made.length} × ${sp.commonName}${created ? ' in a new tank' : ''}`,
          ids: made.map((c) => c.id),
        };
      },
      { ok: false, message: 'No game running' },
    );
  },

  ageCreature(creatureId: string, days: number): DevResult {
    return withGame<DevResult>((d) => devAgeCreature(d, creatureId, days), { ok: false, message: 'No game running' });
  },

  forceBreeding(creatureId: string): DevResult {
    return withGame<DevResult>((d) => devForceBreeding(d, creatureId), { ok: false, message: 'No game running' });
  },

  setWater(tankId: string, patch: Partial<WaterState>) {
    mutateGame((d) => {
      const t = d.tanks[tankId];
      if (t) Object.assign(t.water, patch);
    });
  },

  /**
   * Advance game time by `hours` (in ≤6 h chunks, focused tank at full fidelity), then flush background sim debt.
   * One mutation; returns what happened.
   */
  advanceTime(hours: number): AdvanceSummary {
    const empty: AdvanceSummary = { hours: 0, moneyDelta: 0, births: 0, bidsReceived: 0, deaths: 0, newEvents: 0 };
    if (!Number.isFinite(hours) || hours <= 0) return empty;
    const g = getGame();
    if (!g) return empty;
    const focusTankId = focusedOrFirstTank(g);
    // Heavy: run on a plain working copy (no Immer drafts), one store update.
    return mutateFast((d) => {
      const startHour = d.clock.hour;
      const money = d.finance.money;
      const before = new Set(Object.keys(d.creatures));
      const aliveBefore = new Set(Object.values(d.creatures).filter((c) => c.status === 'alive' || c.status === 'listed').map((c) => c.id));
      const logBefore = new Set(d.log.map((e) => e.id));
      let remaining = Math.min(hours, 24 * 365);
      while (remaining > 1e-9) {
        const step = Math.min(6, remaining);
        advanceWorld(d, step, { focusTankId });
        remaining -= step;
      }
      flushSimDebt(d);
      d.lastTickRealMs = Date.now();
      let births = 0;
      let deaths = 0;
      for (const c of Object.values(d.creatures)) {
        if (!before.has(c.id)) births++;
        if (aliveBefore.has(c.id) && c.status === 'dead') deaths++;
      }
      let bids = 0;
      for (const l of d.market.listings) for (const b of l.bids) if (b.createdHour >= startHour - 1e-9) bids++;
      return {
        hours: d.clock.hour - startHour,
        moneyDelta: Math.round((d.finance.money - money) * 100) / 100,
        births,
        bidsReceived: bids,
        deaths,
        newEvents: d.log.filter((e) => !logBefore.has(e.id)).length,
      };
    }) ?? empty;
  },

  setSpeed(speed: 0 | 1 | 3 | 10) {
    if (![0, 1, 3, 10].includes(speed)) return;
    mutateGame((d) => {
      d.clock.speed = speed as GameSpeed;
    });
  },

  /** Add `n` extra stocked, decorated tanks (perf testing). Grows the facility floor as needed. */
  fillTestFacility(n: number): DevResult {
    const count = Math.max(0, Math.min(80, Math.floor(n)));
    if (!count) return { ok: false, message: 'n must be ≥ 1' };
    return withGame<DevResult>(
      (d) => {
        const total = d.tankOrder.length + count;
        ensureFacility(d, total > 20 ? 'grand_hall' : total > 12 ? 'destination' : total > 6 ? 'showroom' : 'aquarium_store');
        const tiers = ['g20L', 'g29', 'g40B', 'g55', 'g75', 'g90', 'g125', 'g29', 'g40B', 'g55'];
        const classes: WaterClass[] = ['freshwater_planted', 'freshwater_tropical', 'marine_live_rock', 'reef', 'freshwater_cool'];
        const ids: string[] = [];
        for (let i = 0; i < count; i++) {
          const tier = tiers[(d.tankOrder.length + i) % tiers.length];
          const wc = classes[(d.tankOrder.length + i) % classes.length];
          const t = addPlacedTank(d, tier, wc, `Test Tank ${d.tankOrder.length + 1}`);
          const env = t.environment;
          const pool = speciesForClass(wc, env);
          const perTank = 4 + ((i * 3) % 7);
          const stock = pool.length
            ? [0, 1, 2].map((k) => ({ species: pool[(i + k * 3) % pool.length], count: Math.max(1, Math.round(perTank / 3)) }))
            : [];
          stockTank(d, t.id, stock);
          decorateTank(d, t);
          finishTank(d, t);
          ids.push(t.id);
        }
        return { ok: true, message: `Added ${count} test tanks (${d.tankOrder.length} total)`, ids };
      },
      { ok: false, message: 'No game running' },
    );
  },

  /** Stable hash of the simulation state (determinism checks). */
  snapshotHash(): string {
    const g = getGame();
    return g ? stateHash(g) : '';
  },

  // ─────────── extras used by e2e / QA ───────────

  /** Start a fresh game with a starter (skips the onboarding screens). */
  newGame(starterId: StarterId = 'betta', name?: string, seed?: number): DevResult {
    if (!STARTER_IDS.includes(starterId)) return { ok: false, message: `Unknown starter ${starterId}` };
    const s = seed ?? ((Math.random() * 0xffffffff) >>> 0);
    const preview = previewStarters(s)[starterId];
    const g = newGame({ starterId, starterName: name ?? preview.name, seed: s, starterCreature: preview });
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: g.tankOrder[0] ?? null, panel: null, tool: 'none' });
    return { ok: true, message: `New ${starterId} game`, ids: [g.tankOrder[0]] };
  },

  /**
   * Play a starter headlessly with the balance bot (src/dev/fixtures/playthrough.ts) for `days` game days and load
   * the result — a realistic mid-game save (tutorial done, mate, nursery, sales, maybe a shop). The timeline is
   * returned for the console.
   */
  async playthrough(starterId: StarterId = 'betta', days = 30, seed?: number): Promise<DevResult & { timeline?: string }> {
    if (!STARTER_IDS.includes(starterId)) return { ok: false, message: `Unknown starter ${starterId}` };
    const d = Math.max(1, Math.min(400, Math.floor(days)));
    const s = seed ?? ((Math.random() * 0xffffffff) >>> 0);
    const { runPlaythrough, formatPlaythrough } = await import('./fixtures/playthrough'); // lane:perf2 — lazy
    const r = runPlaythrough({ starterId, seed: s, days: d, longGame: d > 45 });
    r.state.lastTickRealMs = Date.now();
    useGame.getState().setGame(r.state);
    useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: r.state.tankOrder[0] ?? null, panel: null, tool: 'none' });
    return { ok: true, message: `Bot-played ${starterId} for ${d} days (seed ${s})`, ids: r.state.tankOrder.slice(0, 1), timeline: formatPlaythrough(r, `${starterId} · ${d} days`) };
  },

  /** Load a registered fixture as the running game (async: the registry is its own chunk — lane:perf2). */
  async loadFixture(name: string, view: ViewMode = 'tank'): Promise<DevResult> {
    const build = (await loadFixtureRegistry())[name];
    if (!build) return { ok: false, message: `Unknown fixture ${name}` };
    const g = build();
    useGame.getState().setGame(g);
    useUI.getState().set({ screen: 'game', view, focusedTankId: g.tankOrder[0] ?? null, panel: null, tool: 'none' });
    return { ok: true, message: `Loaded fixture ${name}`, ids: g.tankOrder.slice(0, 1) };
  },

  focusTank(tankId: string, view: ViewMode = 'tank') {
    const g = getGame();
    if (!g?.tanks[tankId]) return;
    useUI.getState().set({ focusedTankId: tankId, view });
  },

  /**
   * Put a specific livestock offer at the front of the shop (e.g. to test compatibility warnings). `prismatic` makes its
   * first animal Prismatic (lane:genetics) and prices the offer by its valuation, as the shop would.
   */
  addShopOffer(speciesId: string, opts: { count?: number; sex?: 'male' | 'female'; price?: number; ageDays?: number; prismatic?: boolean } = {}): DevResult {
    const sp = findSpecies(speciesId);
    if (!sp) return { ok: false, message: `Unknown species ${speciesId}` };
    return withGame<DevResult>(
      (d) => {
        const count = Math.max(1, Math.floor(opts.count ?? 1));
        const creatures = makeOfferCreatures(d, speciesId, count, opts.sex, opts.ageDays);
        if (opts.prismatic) {
          forcePrismatic('shop', 1);
          assignPrismatic(d, creatures[0], 'shop');
        }
        const valued = opts.prismatic ? Math.max(1, nicePrice(creatures.reduce((a, c) => a + creatureValue(d, c).total, 0) * 1.4)) : Math.round(sp.baseValue * count);
        const price = opts.price ?? valued;
        const offer: ShopOffer = {
          id: nextId(d, 'offer'),
          kind: count > 1 ? 'group' : 'creature',
          speciesId,
          creatures,
          price,
          seller: 'Dev Supply',
          expiresHour: d.clock.hour + 24 * 7,
          note: opts.prismatic ? 'Prismatic! Added by dev tools' : 'Added by dev tools',
          ...(count > 1 ? { unitPrice: Math.max(1, nicePrice((price / count) * 1.12)) } : {}),
        };
        d.market.stock.unshift(offer);
        return { ok: true, message: `Offer: ${count} × ${sp.commonName}`, ids: [offer.id] };
      },
      { ok: false, message: 'No game running' },
    );
  },

  /** lane:genetics — make an owned animal Prismatic (or ordinary again with `on = false`). */
  makePrismatic(creatureId: string, on = true): DevResult {
    return withGame<DevResult>(
      (d) => {
        const c = d.creatures[creatureId];
        if (!c) return { ok: false, message: 'Not found' };
        if (!on) {
          delete c.rareVariant;
          return { ok: true, message: `${c.name} is ordinary again` };
        }
        if (c.rareVariant) return { ok: true, message: `${c.name} is already Prismatic` };
        const bred = c.lineage.breederName === 'Your shop';
        forcePrismatic(bred ? 'bred' : 'shop', 1);
        const parents = [c.lineage.motherId, c.lineage.fatherId].map((id) => (id ? d.creatures[id] : undefined));
        assignPrismatic(d, c, bred ? 'bred' : 'shop', parents);
        recordFinds(d, c);
        return { ok: true, message: `${c.name} is now Prismatic`, ids: [c.id] };
      },
      { ok: false, message: 'No game running' },
    );
  },

  /** lane:genetics — the next `n` shop animals / bred young come out Prismatic (dev state only; never saved). */
  forcePrismatic(source: 'shop' | 'bred', n = 1): DevResult {
    forcePrismatic(source, n);
    return { ok: true, message: `Next ${n} ${source === 'shop' ? 'shop animal' : 'bred youngster'}${n === 1 ? '' : 's'} will be Prismatic` };
  },

  /** Kill a creature (tests listing invalidation / death handling). */
  killCreature(creatureId: string, cause = 'Removed by dev tools'): DevResult {
    return withGame<DevResult>(
      (d) => {
        const c = d.creatures[creatureId];
        if (!c) return { ok: false, message: 'Not found' };
        c.status = 'dead';
        c.deathCause = cause;
        c.stats.health = 0;
        return { ok: true, message: `${c.name} died (${cause})` };
      },
      { ok: false, message: 'No game running' },
    );
  },

  /** Set every living creature's stats (e.g. hunger 100 to test starvation). */
  setAllStats(patch: Partial<Creature['stats']>) {
    mutateGame((d) => {
      for (const c of Object.values(d.creatures)) if (c.status === 'alive' || c.status === 'listed') Object.assign(c.stats, patch);
    });
  },
};

export type DevCommands = typeof dev;
