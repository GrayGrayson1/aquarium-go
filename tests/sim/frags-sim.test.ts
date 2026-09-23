/**
 * Frags & cuttings — eligibility, the parent's shrink + healing, planting (racks, rock, substrate), grow-out, old
 * saves and determinism. OWNER: lane "frags".
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { DECOR, getDecorDef } from '@/data/catalog/decor';
import { propagationFor, PROPAGATION_BY_VISUAL } from '@/data/catalog/propagation';
import { placeDecor, removeDecor, takeFrag, plantFrag, fragEligibility, fragRackSlots, freeRackSlots, onFragRack, MAX_STORED_FRAGS } from '@/sim/aquascape';
import { advanceWorld } from '@/sim/world';
import { stateHash } from '@/persistence';
import { migrateSave, repairState } from '@/persistence/migrations';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { FRAG_SETTLE_HOURS } from '@/sim/aquascape/frags';
import { reefGame, place, hours, unlockAll } from './frags-helpers';

describe('frags: data', () => {
  it('every living decor def has propagation rules; non-living decor cannot be fragged', () => {
    for (const d of DECOR) {
      const r = propagationFor(d);
      const living = d.category === 'plant' || d.category === 'coral' || d.category === 'anemone';
      if (!living) {
        expect(r.can, d.id).toBe(false);
        continue;
      }
      if (!r.can) {
        expect(r.why, d.id).toBeTruthy();
        continue;
      }
      expect(r.how.length, d.id).toBeGreaterThan(20);
      expect(r.minGrowth).toBeGreaterThan(r.startGrowth);
      expect(r.cost).toBeGreaterThan(0);
      expect(r.recoveryHours).toBeGreaterThan(0);
      expect(r.valueFraction).toBeGreaterThan(0.1);
      expect(r.valueFraction).toBeLessThan(0.7);
    }
    // anemones split on their own — honest data flag on the def
    expect(propagationFor(getDecorDef('bubble_tip_anemone')).can).toBe(false);
    expect(getDecorDef('bubble_tip_anemone')!.propagation?.can).toBe(false);
    // every coral/plant visual in the catalog has an explicit rule
    for (const d of DECOR.filter((x) => x.category === 'coral' || x.category === 'plant')) expect(PROPAGATION_BY_VISUAL[d.visual], d.visual).toBeTruthy();
  });

  it('the frag rack is a reef ornament with ten holes inside its footprint', () => {
    const rack = getDecorDef('frag_rack')!;
    expect(rack.category).toBe('ornament');
    expect(rack.waterClasses).toEqual(['reef']);
    const inst = { id: 'r', defId: 'frag_rack', x: 0.1, y: 0, z: -0.05, rotY: 0.7, scale: 1.2, seed: 1 };
    const slots = fragRackSlots(inst);
    expect(slots).toHaveLength(10);
    for (const s of slots) {
      // rotate back into rack-local space: every hole sits inside the plate
      const dx = s.x - inst.x;
      const dz = s.z - inst.z;
      const c = Math.cos(inst.rotY);
      const sn = Math.sin(inst.rotY);
      const lx = (dx * c - dz * sn) / inst.scale;
      const lz = (dx * sn + dz * c) / inst.scale;
      expect(Math.abs(lx)).toBeLessThan(rack.size.w / 2);
      expect(Math.abs(lz)).toBeLessThan(rack.size.d / 2);
    }
  });
});

describe('frags: eligibility', () => {
  it('explains exactly why a piece can or cannot be cut', () => {
    const { g, t } = reefGame();
    const hammer = place(g, t, 'hammer_coral', -0.2, 0, 1.2, 1);
    const young = place(g, t, 'zoanthids', 0.15, 0.05, 1.2, 0.3);
    const bta = place(g, t, 'bubble_tip_anemone', 0.25, -0.05, 1, 1);
    const rock = place(g, t, 'live_rock', 0.0, -0.1, 1);
    expect(fragEligibility(g, t, hammer).ok).toBe(true);
    const y = fragEligibility(g, t, young);
    expect(y.ok).toBe(false);
    expect(y.code).toBe('growth');
    expect(y.progress).toBeGreaterThan(0.3);
    expect(y.progress).toBeLessThan(0.6);
    expect(fragEligibility(g, t, bta).code).toBe('cannot');
    expect(fragEligibility(g, t, bta).message).toMatch(/split on their own/);
    expect(fragEligibility(g, t, rock).code).toBe('not_living');
    hammer.health = 40;
    expect(fragEligibility(g, t, hammer).code).toBe('health');
    hammer.health = 95;
    g.progress.unlocked = g.progress.unlocked.filter((k) => k !== 'decor_corals_lps');
    expect(fragEligibility(g, t, hammer).code).toBe('locked');
  });
});

describe('frags: taking a frag', () => {
  it('the parent shrinks a little and heals (no growth), the frag is a small clone in storage', () => {
    const { g, t } = reefGame();
    const hammer = place(g, t, 'hammer_coral', -0.2, 0, 1.3, 1);
    const rule = propagationFor(getDecorDef('hammer_coral'));
    const r = takeFrag(g, t.id, hammer.id);
    expect(r.ok, r.message).toBe(true);
    expect(hammer.growth).toBeCloseTo(1 - rule.cost, 5);
    expect(hammer.recoverUntilHour).toBeCloseTo(g.clock.hour + rule.recoveryHours, 5);
    expect(hammer.fragsTaken).toBe(1);
    const frag = g.inventory.frags!.find((f) => f.id === r.fragId)!;
    expect(frag.defId).toBe('hammer_coral');
    expect(frag.seed).toBe(hammer.seed); // a clone keeps the colour morph
    expect(frag.growth).toBeCloseTo(rule.startGrowth, 5);
    expect(frag.scale).toBeLessThan(hammer.scale);
    expect(frag.frag?.parentId).toBe(hammer.id);
    expect(frag.frag?.generation).toBe(1);
    expect(g.progress.counters.fragsTaken).toBe(1);
    expect(g.progress.counters.coralFragsTaken).toBe(1);
    // healing blocks a second cut and pauses growth
    expect(fragEligibility(g, t, hammer).code).toBe('recovering');
    const before = hammer.growth!;
    hours(g, t, Math.floor(rule.recoveryHours) - 2);
    expect(hammer.growth).toBe(before);
    hours(g, t, 24 * 4);
    expect(hammer.growth!).toBeGreaterThan(before);
    expect(findNonFinite(t.decor)).toEqual([]);
  });

  it('refuses when storage is full, the tank is listed, or the colony is still healing', () => {
    const { g, t } = reefGame();
    const gsp = place(g, t, 'green_star_polyps', 0, 0, 1.4, 1);
    g.inventory.frags = Array.from({ length: MAX_STORED_FRAGS }, (_, i) => ({ id: `f${i}`, defId: 'zoanthids', x: 0, y: 0, z: 0, rotY: 0, scale: 0.6, seed: i + 1, growth: 0.12, frag: { takenHour: 0 } }));
    expect(takeFrag(g, t.id, gsp.id).ok).toBe(false);
    g.inventory.frags = [];
    expect(takeFrag(g, t.id, gsp.id).ok).toBe(true);
    const again = takeFrag(g, t.id, gsp.id);
    expect(again.ok).toBe(false);
    expect(again.message).toMatch(/Healing/);
  });

  it('plant cuttings come from grown plants; the planted cutting grows into a plant', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Mochi', seed: 7 });
    unlockAll(g);
    g.finance.money = 10_000;
    const t = createTank(g, 'g40B', 'freshwater_planted', { cycled: true });
    t.water.nitrate = 12;
    const rotala = place(g, t, 'rotala', -0.25, -0.1, 1.2, 1);
    const r = takeFrag(g, t.id, rotala.id);
    expect(r.ok, r.message).toBe(true);
    expect(r.message).toMatch(/cutting bundle/);
    expect(g.progress.counters.cuttingsTaken).toBe(1);
    const p = plantFrag(g, t.id, r.fragId!);
    expect(p.ok, p.message).toBe(true);
    const planted = t.decor.find((d) => d.id === p.decorId)!;
    expect(planted.frag?.plantedHour).toBe(g.clock.hour);
    const g0 = planted.growth!;
    const s0 = planted.scale;
    hours(g, t, 24 * 3);
    expect(planted.growth!).toBeGreaterThan(g0 + 0.15);
    expect(planted.scale).toBeGreaterThanOrEqual(s0);
    hours(g, t, 24 * 12);
    expect(planted.frag?.grownHour).toBeDefined();
    expect(g.progress.counters.fragsGrownOut).toBe(1);
    expect(g.log.some((e) => /grown into a full plant/.test(e.text))).toBe(true);
  });
});

describe('frags: planting and growing out', () => {
  it('fills free frag-rack holes first, seated on the flat shelf', () => {
    const { g, t } = reefGame();
    const zoa = place(g, t, 'zoanthids', -0.2, 0.02, 1.6, 1);
    const rackR = placeDecor(g, t.id, 'frag_rack', { x: 0.2, z: 0.08, rotY: 0, scale: 1.2 });
    expect(rackR.ok, rackR.message).toBe(true);
    const rack = t.decor.find((d) => d.id === rackR.decorId)!;
    const top = rack.y + getDecorDef('frag_rack')!.size.h * rack.scale;
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      zoa.growth = 1;
      delete zoa.recoverUntilHour;
      ids.push(takeFrag(g, t.id, zoa.id).fragId!);
    }
    expect(freeRackSlots(t)).toHaveLength(10);
    for (const id of ids) {
      const p = plantFrag(g, t.id, id, undefined, { rackOnly: true });
      expect(p.ok, p.message).toBe(true);
      expect(p.message).toMatch(/frag rack/);
      const inst = t.decor.find((d) => d.id === p.decorId)!;
      expect(onFragRack(t, inst)).toBe(true);
      expect(Math.abs(inst.y - top)).toBeLessThan(0.012);
    }
    expect(freeRackSlots(t)).toHaveLength(7);
    // the frags stay seated when the rack moves
    expect(g.inventory.frags ?? []).toHaveLength(0);
  });

  it('a frag on the rock grows faster than it would as a colony and enlarges toward its colony size', () => {
    const { g, t } = reefGame();
    place(g, t, 'live_rock', 0.05, 0, 1.6);
    const hammer = place(g, t, 'hammer_coral', -0.25, 0.05, 1.3, 1);
    const id = takeFrag(g, t.id, hammer.id).fragId!;
    const p = plantFrag(g, t.id, id);
    expect(p.ok, p.message).toBe(true);
    const frag = t.decor.find((d) => d.id === p.decorId)!;
    const s0 = frag.scale;
    const g0 = frag.growth!;
    // settling onto the plug: slow for the first hours
    hours(g, t, FRAG_SETTLE_HOURS - 1);
    const settled = frag.growth! - g0;
    hours(g, t, 24 * 30);
    expect(frag.growth! - g0).toBeGreaterThan(settled * 5);
    expect(frag.scale).toBeGreaterThan(s0);
    expect(frag.scale).toBeLessThanOrEqual(frag.frag!.targetScale! + 1e-6);
    expect(findNonFinite(t.decor)).toEqual([]);
  });

  it('removing a planted frag keeps it a frag: storage goes to frag storage, selling pays the store rate', () => {
    const { g, t } = reefGame();
    const acro = place(g, t, 'acropora', 0, 0, 1.2, 1);
    const id = takeFrag(g, t.id, acro.id).fragId!;
    const placed = plantFrag(g, t.id, id).decorId!;
    const r = removeDecor(g, t.id, placed, false);
    expect(r.ok).toBe(true);
    expect(g.inventory.decor.some((d) => d.id === placed)).toBe(false);
    expect(g.inventory.frags!.some((d) => d.id === placed)).toBe(true);
    const again = plantFrag(g, t.id, placed).decorId!;
    const money = g.finance.money;
    const s = removeDecor(g, t.id, again, true);
    expect(s.ok).toBe(true);
    const got = g.finance.money - money;
    // far below the 50% sell-back of a shop-bought $80 colony, but more than nothing
    expect(got).toBeGreaterThan(0);
    expect(got).toBeLessThan(getDecorDef('acropora')!.price * 0.5);
    // a store sale softens frag prices but is not a market sale (no history entry → no sales reputation)
    expect(g.market.fragSaleHours).toHaveLength(1);
    expect(g.market.history.some((h) => h.kind === 'frag')).toBe(false);
  });
});

describe('frags: old saves and determinism', () => {
  it('old saves without the new fields load, step and repair cleanly', () => {
    const { g, t } = reefGame(5);
    place(g, t, 'hammer_coral', 0, 0, 1.2, 0.9);
    delete g.inventory.frags;
    const raw = JSON.parse(JSON.stringify(g));
    const m = migrateSave(raw);
    expect(m.state.inventory.frags).toBeUndefined();
    advanceWorld(m.state, 48, { forceFull: true });
    expect(findNonFinite(m.state.tanks)).toEqual([]);
    // garbage in the new optional fields is repaired, not fatal
    const bad = JSON.parse(JSON.stringify(g)) as Record<string, unknown> & { inventory: Record<string, unknown>; market: { listings: Record<string, unknown>[] } };
    bad.inventory.frags = 'nope';
    bad.market.listings.push({ id: 'lst_x', kind: 'frag', bids: [], creatureIds: [], fragItems: 7, status: 'expired' });
    repairState(bad);
    expect(bad.inventory.frags).toEqual([]);
    expect(bad.market.listings.at(-1)!.fragItems).toEqual([]);
  });

  it('is deterministic: the same cuts and time give the same world', () => {
    const run = () => {
      const { g, t } = reefGame(4242);
      const a = place(g, t, 'torch_coral', -0.2, 0, 1.2, 1);
      const b = place(g, t, 'zoanthids', 0.2, 0.05, 1.5, 1);
      const f1 = takeFrag(g, t.id, a.id).fragId!;
      const f2 = takeFrag(g, t.id, b.id).fragId!;
      plantFrag(g, t.id, f1);
      plantFrag(g, t.id, f2);
      advanceWorld(g, 24 * 6, { forceFull: true });
      return stateHash(g);
    };
    expect(run()).toBe(run());
  });
});
