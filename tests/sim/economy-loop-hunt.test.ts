/**
 * chunk 7 (REL-022; BACKLOG B-130) — a seeded hunt for value-creating loops among the economy's instant actions.
 *
 * Many short random sequences of buying (livestock, tanks, equipment, decor), selling (quick-sell, frags to the store,
 * decor sold back), listing and withdrawing, converting water and fragging, with no game time passing between them.
 * After each sequence the world is worth no more than it began with, where "worth" is money plus what the game's own
 * instant sales would pay for everything owned (`liquidated`, on a copy of the world: listings withdrawn, every animal
 * quick-sold, a frag cut from every piece ready for one, every other piece of decor sold back, every frag sold to the
 * store). A sequence that ends worth more fails, named by its seed and its steps. B-124 and B-162 involve time and
 * sales, so they keep their own tests in economy-loops.test.ts.
 *
 * What "worth" leaves out: tanks, installed or stored equipment, stored decor and consumables (food, salt, eggs), since
 * the game has no instant sale for them; an action that made them cheaply would be invisible here. A future instant
 * sale of any of them joins both the pool below and `liquidated`.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, WaterClass } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { mulberry32, hashString, type Rng } from '@/sim/rng';
import { settleTanks } from '@/sim/settle';
import { buyOffer, buyTank, buyEquipment, quickSell, quickSellFrags, createListing, withdrawListing, devOpenMarket, devStepEconomy, previewListing } from '@/sim/economy';
import { placeDecor, removeDecor, takeFrag } from '@/sim/aquascape';
import { convertWaterClass } from '@/sim/tankOps';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { DECOR } from '@/data/catalog/decor';
import { WATER_CLASS_LABEL } from '@/data/tankLabels';

const WATER = Object.keys(WATER_CLASS_LABEL) as WaterClass[];
const SEQUENCES = 300;
const STEPS = 10;

function start(): GameState {
  const g = FIXTURES.frags_reef();
  g.isShowcase = false;
  devOpenMarket(g);
  devStepEconomy(g, 0.5);
  g.finance.money = 50_000;
  settleTanks(g, g.tankOrder); // nothing owed: no time passes from here on
  return g;
}

const alive = (g: GameState) => Object.values(g.creatures).filter((c) => c.status === 'alive');
const pick = <T,>(rng: Rng, xs: readonly T[]): T | undefined => (xs.length ? xs[Math.floor(rng.next() * xs.length)] : undefined);

/**
 * Money plus what the game's instant sales would pay for everything owned, measured on a copy. Store prices fall a
 * little with each sale (frag saturation, animal demand) and no time passes to restore them, so everything is sold in
 * one batch per kind, at today's prices: the most any order of sales could fetch.
 */
function liquidated(src: GameState): number {
  const g = structuredClone(src);
  for (const l of g.market.listings) if (l.status === 'active') withdrawListing(g, l.id);
  const animals = alive(g).map((c) => c.id);
  if (animals.length) expect(quickSell(g, animals).ok).toBe(true);
  // a grown piece ready for a cut is worth its frag as well (a bought piece is never ready at once: it starts below the
  // growth a cut needs, so this only counts growth that has already happened); cuts go to an emptied rack, so a full
  // one can't block them
  const stored = g.inventory.frags ?? [];
  g.inventory.frags = [];
  for (const id of g.tankOrder) for (const d of [...g.tanks[id].decor]) takeFrag(g, id, d.id);
  // planted frags join the batch below; every other piece is sold back
  for (const id of g.tankOrder) for (const d of [...g.tanks[id].decor]) removeDecor(g, id, d.id, !d.frag);
  g.inventory.frags = [...stored, ...(g.inventory.frags ?? [])];
  const frags = g.inventory.frags.map((f) => f.id);
  if (frags.length) expect(quickSellFrags(g, frags).ok).toBe(true);
  return g.finance.money;
}

type Step = { name: string; run: (g: GameState, rng: Rng) => string };
const STEPS_POOL: Step[] = [
  {
    name: 'buy livestock',
    run: (g, rng) => {
      const o = pick(rng, g.market.stock.filter((x) => x.expiresHour > g.clock.hour));
      const t = pick(rng, g.tankOrder);
      return o && t ? `${o.id}→${t}: ${buyOffer(g, o.id, t).ok}` : 'none';
    },
  },
  {
    name: 'buy tank',
    run: (g, rng) => {
      const tier = pick(rng, TANK_TIERS)!;
      const wc = pick(rng, WATER)!;
      return `${tier.id}/${wc}: ${buyTank(g, tier.id, wc, undefined, { seeded: rng.next() < 0.5 }).ok}`;
    },
  },
  {
    name: 'buy equipment',
    run: (g, rng) => {
      const t = pick(rng, g.tankOrder);
      const e = pick(rng, EQUIPMENT)!;
      return t ? `${e.id}→${t}: ${buyEquipment(g, t, e.id).ok}` : 'none';
    },
  },
  {
    name: 'place decor',
    run: (g, rng) => {
      const t = pick(rng, g.tankOrder);
      const d = pick(rng, DECOR)!;
      return t ? `${d.id}→${t}: ${placeDecor(g, t, d.id, { x: rng.range(-0.3, 0.3), z: rng.range(-0.2, 0.2), rotY: 0, scale: 1 }).ok}` : 'none';
    },
  },
  {
    name: 'sell decor back',
    run: (g, rng) => {
      const t = pick(rng, g.tankOrder.filter((id) => g.tanks[id].decor.length));
      const d = t ? pick(rng, g.tanks[t].decor) : undefined;
      return t && d ? `${d.defId}@${t}: ${removeDecor(g, t, d.id, true).ok}` : 'none';
    },
  },
  {
    name: 'take a frag',
    run: (g, rng) => {
      const t = pick(rng, g.tankOrder.filter((id) => g.tanks[id].decor.length));
      const d = t ? pick(rng, g.tanks[t].decor) : undefined;
      return t && d ? `${d.defId}@${t}: ${takeFrag(g, t, d.id).ok}` : 'none';
    },
  },
  {
    name: 'sell frags to the store',
    run: (g, rng) => {
      const f = pick(rng, g.inventory.frags ?? []);
      return f ? `${f.defId}: ${quickSellFrags(g, [f.id]).ok}` : 'none';
    },
  },
  {
    name: 'quick-sell an animal',
    run: (g, rng) => {
      const c = pick(rng, alive(g));
      return c ? `${c.speciesId}: ${quickSell(g, [c.id]).ok}` : 'none';
    },
  },
  {
    name: 'list an animal',
    run: (g, rng) => {
      const c = pick(rng, alive(g));
      if (!c) return 'none';
      const pv = previewListing(g, { kind: 'creature', creatureIds: [c.id] });
      return `${c.speciesId}: ${createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: pv.suggestedReserve, buyNow: rng.next() < 0.5 ? pv.suggestedBuyNow : 0, durationHours: 24 }).ok}`;
    },
  },
  {
    name: 'withdraw a listing',
    run: (g, rng) => {
      const l = pick(rng, g.market.listings.filter((x) => x.status === 'active'));
      return l ? `${l.id}: ${withdrawListing(g, l.id).ok}` : 'none';
    },
  },
  {
    name: 'convert water',
    run: (g, rng) => {
      const t = pick(rng, g.tankOrder);
      const wc = pick(rng, WATER)!;
      return t ? `${t}→${wc}: ${convertWaterClass(g, t, wc).ok}` : 'none';
    },
  },
];

describe('B-130 (REL-022): no sequence of instant economy actions creates value', () => {
  it(`${SEQUENCES} seeded sequences of ${STEPS} steps each end worth no more than they began`, () => {
    const base = start();
    const hour = base.clock.hour;
    const worth0 = liquidated(base);
    expect(worth0).toBeGreaterThan(base.finance.money); // the fixture owns animals and decor worth something
    const gains: string[] = [];
    let ran = 0;
    for (let seq = 0; seq < SEQUENCES; seq++) {
      const rng = mulberry32(hashString(`loop-hunt-${seq}`));
      const g = structuredClone(base);
      const log: string[] = [];
      for (let i = 0; i < STEPS; i++) {
        const step = pick(rng, STEPS_POOL)!;
        log.push(`${step.name} (${step.run(g, rng)})`);
      }
      expect(g.clock.hour).toBe(hour);
      ran++;
      const worth = liquidated(g);
      if (worth > worth0 + 0.5) gains.push(`seq ${seq}: +${(worth - worth0).toFixed(2)} after ${log.join(' → ')}`);
    }
    expect(ran).toBe(SEQUENCES);
    expect(gains, gains.join('\n')).toEqual([]);
  });
});
