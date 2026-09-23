import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { STARTER_IDS, listSpecies, type StarterId } from '@/data/species';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { DECOR, getDecorDef } from '@/data/catalog/decor';
import { createTank } from '@/sim/tanks';
import { tankDims, decorCollider, decorAnchors } from '@/sim/tankSpace';
import {
  placeDecor,
  moveDecor,
  removeDecor,
  beautyScore,
  tankHabitat,
  stepTankDecor,
  checkPlacement,
  substrateHeightAt,
  SELL_BACK_FRACTION,
} from '@/sim/aquascape';

function game(starter: StarterId = 'betta', seed = 1234): GameState {
  return newGame({ starterId: starter, starterName: 'Test', seed });
}
function firstTank(g: GameState): Tank {
  return g.tanks[g.tankOrder[0]];
}

describe('aquascape catalog', () => {
  it('has ~45 unique, well-formed decor defs', () => {
    expect(DECOR.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(DECOR.map((d) => d.id));
    expect(ids.size).toBe(DECOR.length);
    for (const d of DECOR) {
      expect(d.size.w).toBeGreaterThan(0);
      expect(d.size.h).toBeGreaterThan(0);
      expect(d.scaleRange[0]).toBeLessThan(d.scaleRange[1]);
      expect(d.environments.length).toBeGreaterThan(0);
      for (const a of d.anchors) {
        // anchors must sit inside the visual bounding box
        expect(Math.abs(a.offset[0])).toBeLessThanOrEqual(d.size.w / 2 + 1e-6);
        expect(Math.abs(a.offset[2])).toBeLessThanOrEqual(d.size.d / 2 + 1e-6);
        expect(a.offset[1]).toBeGreaterThanOrEqual(0);
        expect(a.offset[1]).toBeLessThanOrEqual(d.size.h + 1e-6);
      }
    }
  });
  it('corals (other than the hardy gorgonian) are reef-only and gated', () => {
    for (const d of DECOR.filter((x) => x.category === 'coral' && x.id !== 'gorgonian')) {
      expect(d.waterClasses).toEqual(['reef']);
      expect(d.unlock).toMatch(/decor_corals_/);
    }
    expect(getDecorDef('bubble_tip_anemone')!.anchors.some((a) => a.kind === 'host')).toBe(true);
    expect(getDecorDef('lava_rock')!.hazards?.sharp).toBe(true);
  });
});

describe('tankHabitat', () => {
  it('sums decor contributions and normalises cover per 10 gallons', () => {
    const g = game('betta');
    const t = firstTank(g);
    t.decor = [];
    const empty = tankHabitat(g, t);
    expect(empty.hides).toBe(0);
    expect(empty.cover).toBe(0);
    expect(empty.hasHost).toBe(false);
    g.finance.money = 10000;
    expect(placeDecor(g, t.id, 'java_fern', { x: -0.1, z: 0 }).ok).toBe(true);
    expect(placeDecor(g, t.id, 'stone_cave', { x: 0.12, z: 0.0 }).ok).toBe(true);
    const h = tankHabitat(g, t);
    expect(h.hides).toBeGreaterThan(1.4);
    expect(h.cover).toBeGreaterThan(0);
    expect(h.nestSites).toBeGreaterThanOrEqual(1);
    expect(h.caves).toBe(1);
    // same items in a bigger tank give less cover density
    const big = createTank(g, 'g55', 'freshwater_planted');
    g.progress.unlocked.push('tank_55');
    expect(placeDecor(g, big.id, 'java_fern', { x: -0.1, z: 0 }).ok).toBe(true);
    const hb = tankHabitat(g, big);
    const t2 = { ...t, decor: t.decor.filter((d) => d.defId === 'java_fern') };
    expect(hb.cover).toBeLessThan(tankHabitat(g, t2).cover);
  });
  it('flags hazards: sharp decor and ingestible gravel', () => {
    const g = game('axolotl');
    const t = firstTank(g);
    expect(tankHabitat(g, t).hazards.ingestible).toBe(false);
    t.substrate.kind = 'fine_gravel';
    expect(tankHabitat(g, t).hazards.ingestible).toBe(true);
    t.decor = [];
    g.finance.money = 1000;
    expect(placeDecor(g, t.id, 'lava_rock', { x: 0.3, z: 0.08 }).ok).toBe(true);
    const h = tankHabitat(g, t);
    expect(h.hazards.sharp).toBe(true);
    expect(h.sharpItems).toContain('Lava Rock');
  });
  it('counts corals by type and hosts', () => {
    const g = game('ocellaris_clownfish');
    const t = firstTank(g);
    t.waterClass = 'reef';
    g.progress.unlocked.push('decor_corals_soft', 'decor_corals_lps', 'decor_anemones');
    g.finance.money = 5000;
    expect(placeDecor(g, t.id, 'zoanthids', { x: 0.28, z: 0.04 }).ok).toBe(true);
    expect(placeDecor(g, t.id, 'torch_coral', { x: -0.3, z: 0.08 }).ok).toBe(true);
    const h = tankHabitat(g, t);
    expect(h.corals.zoanthid).toBe(1);
    expect(h.corals.lps).toBe(1);
    expect(h.hasHost).toBe(true);
  });
});

describe('placement validation', () => {
  it('rejects out-of-bounds, wrong environment, locked items and unaffordable items', () => {
    const g = game('betta');
    const t = firstTank(g);
    const d = tankDims(t);
    t.decor = [];
    g.finance.money = 1000;
    expect(placeDecor(g, t.id, 'river_stone', { x: d.L / 2, z: 0 }).ok).toBe(false);
    expect(placeDecor(g, t.id, 'live_rock', { x: 0, z: 0 }).message).toMatch(/saltwater/);
    expect(placeDecor(g, t.id, 'dragon_stone', { x: 0.1, z: 0.05 }).message).toMatch(/Locked/);
    g.finance.money = 3;
    const r = placeDecor(g, t.id, 'seiryu_stone', { x: 0.1, z: 0.05 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/money/);
    expect(g.finance.money).toBe(3);
  });
  it('rejects corals outside reef tanks and anemones before unlock', () => {
    const g = game('ocellaris_clownfish');
    const t = firstTank(g);
    g.finance.money = 5000;
    g.progress.unlocked.push('decor_corals_soft');
    expect(placeDecor(g, t.id, 'zoanthids', { x: 0.28, z: 0.04 }).message).toMatch(/reef/);
    expect(placeDecor(g, t.id, 'bubble_tip_anemone', { x: 0.28, z: 0.04 }).message).toMatch(/Locked/);
    g.progress.unlocked.push('decor_anemones');
    expect(placeDecor(g, t.id, 'bubble_tip_anemone', { x: 0.28, z: 0.04 }).ok).toBe(true);
  });
  it('charges money, counts placements, rejects heavy overlaps and too-tall items', () => {
    const g = game('betta');
    const t = firstTank(g);
    t.decor = [];
    g.finance.money = 500;
    const r = placeDecor(g, t.id, 'seiryu_stone', { x: 0.1, z: 0.02 });
    expect(r.ok).toBe(true);
    expect(g.finance.money).toBe(500 - getDecorDef('seiryu_stone')!.price);
    expect(g.progress.counters.decorPlaced).toBe(1);
    expect(placeDecor(g, t.id, 'seiryu_stone', { x: 0.102, z: 0.021 }).message).toMatch(/Overlaps/);
    // a plant may grow right against the stone
    expect(placeDecor(g, t.id, 'cryptocoryne', { x: 0.1, z: 0.03 }).ok).toBe(true);
    // vallisneria at scale 1.4 is taller than a 10 gallon: plants are trimmed to fit under the surface…
    const val = placeDecor(g, t.id, 'vallisneria', { x: -0.12, z: -0.02, scale: 1.4 });
    expect(val.ok, val.message).toBe(true);
    expect(t.decor.find((d) => d.id === val.decorId)!.scale).toBeLessThan(1.4);
    // …but hardscape that would break the surface is refused
    expect(placeDecor(g, t.id, 'spider_wood', { x: 0.0, z: 0.0, scale: 1.6 }).message).toMatch(/tall/);
  });
  it('places owned items from inventory without charging; epiphytes sit on hardscape', () => {
    const g = game('betta');
    const t = firstTank(g);
    t.decor = [];
    g.finance.money = 500;
    const w = placeDecor(g, t.id, 'spider_wood', { x: 0, z: 0 });
    expect(w.ok).toBe(true);
    const fern = placeDecor(g, t.id, 'java_fern', { x: 0.01, z: 0.0 });
    expect(fern.ok).toBe(true);
    const f = t.decor.find((x) => x.id === fern.decorId)!;
    expect(f.y).toBeGreaterThan(substrateHeightAt(t, f.x, f.z) + 0.02);
    // move the wood: the fern rides along
    const before = { x: f.x, z: f.z };
    expect(moveDecor(g, t.id, w.decorId!, { x: -0.1, z: 0 }).ok).toBe(true);
    expect(f.x).toBeCloseTo(before.x - 0.1, 3);
    // remove to storage then place from storage
    const money = g.finance.money;
    expect(removeDecor(g, t.id, w.decorId!).ok).toBe(true);
    expect(g.inventory.decor.length).toBe(1);
    expect(placeDecor(g, t.id, 'spider_wood', { x: 0.05, z: 0 }, true).ok).toBe(true);
    expect(g.finance.money).toBe(money);
    expect(g.inventory.decor.length).toBe(0);
    // sell back at 50%
    const id = t.decor.find((x) => x.defId === 'spider_wood')!.id;
    expect(removeDecor(g, t.id, id, true).ok).toBe(true);
    expect(g.finance.money).toBe(money + Math.round(getDecorDef('spider_wood')!.price * SELL_BACK_FRACTION));
  });
});

describe('starter aquascapes', () => {
  for (const sid of STARTER_IDS) {
    it(`${sid}: every item is valid, in bounds, under the surface and non-overlapping`, () => {
      const g = game(sid, 99);
      const t = firstTank(g);
      const d = tankDims(t);
      expect(t.decor.length).toBeGreaterThanOrEqual(8);
      g.progress.unlocked.push('decor_premium', 'decor_corals_soft', 'decor_corals_lps', 'decor_anemones');
      for (const inst of t.decor) {
        const def = getDecorDef(inst.defId)!;
        expect(def).toBeTruthy();
        const chk = checkPlacement(g, t, inst.defId, inst, { excludeId: inst.id, purchase: 'none' });
        expect(chk.ok, `${inst.defId}: ${chk.message}`).toBe(true);
        const col = decorCollider(inst, def);
        expect(Math.abs(col.center[0]) + col.radius[0]).toBeLessThanOrEqual(d.L / 2 + 1e-6);
        expect(Math.abs(col.center[2]) + col.radius[2]).toBeLessThanOrEqual(d.W / 2 + 1e-6);
        expect(col.center[1] + col.radius[1]).toBeLessThanOrEqual(d.waterY + 0.003);
        for (const a of decorAnchors(inst, def)) expect(a.pos.every(Number.isFinite)).toBe(true);
      }
      // meets the starter's habitat needs
      const h = tankHabitat(g, t);
      if (sid === 'axolotl') expect(h.hides).toBeGreaterThanOrEqual(2);
      if (sid === 'betta') {
        expect(h.leafRests).toBeGreaterThanOrEqual(2);
        expect(h.hazards.sharp).toBe(false);
      }
      if (sid === 'pea_puffer') expect(h.cover).toBeGreaterThanOrEqual(0.8);
      if (sid === 'lined_seahorse') expect(h.hitching).toBeGreaterThanOrEqual(8);
      if (sid === 'ocellaris_clownfish') expect(h.openWater).toBeGreaterThan(0.5);
    });
  }
  it('is deterministic for a seed and varies between seeds', () => {
    const a = firstTank(game('betta', 7)).decor;
    const b = firstTank(game('betta', 7)).decor;
    const c = firstTank(game('betta', 8)).decor;
    expect(a).toEqual(b);
    expect(a.map((x) => x.x)).not.toEqual(c.map((x) => x.x));
  });
});

describe('beauty score', () => {
  it('ranks empty < starter layout, penalises clutter, and gives actionable tips', () => {
    for (const sid of STARTER_IDS) {
      const g = game(sid, 5);
      const t = firstTank(g);
      const starter = beautyScore(g, t);
      const empty = beautyScore(g, { ...t, decor: [] });
      expect(starter.score, sid).toBeGreaterThan(empty.score + 30);
      expect(starter.score, sid).toBeGreaterThanOrEqual(65);
      expect(empty.tips.length).toBeGreaterThan(0);
      expect(starter.factors.length).toBeGreaterThan(6);
    }
    const g = game('betta', 5);
    const t = firstTank(g);
    const base = beautyScore(g, t).score;
    // cram in lots of ornaments & stones
    g.finance.money = 100000;
    g.progress.unlocked.push('decor_premium');
    let placed = 0;
    for (let i = 0; i < 60 && placed < 14; i++) {
      const x = -0.2 + (i % 8) * 0.055;
      const z = -0.09 + Math.floor(i / 8) * 0.045;
      const id = i % 2 ? 'ceramic_ruins' : 'river_stone';
      if (placeDecor(g, t.id, id, { x, z, scale: id === 'ceramic_ruins' ? 0.6 : 0.5 }).ok) placed++;
    }
    const cluttered = beautyScore(g, t);
    expect(cluttered.score).toBeLessThan(base);
    expect(cluttered.tips.join(' ')).toMatch(/clutter|remove|stone|harmony|lane/i);
  });
  it('prefers a focal point on the thirds over dead centre', () => {
    const g = game('axolotl', 5);
    const t = firstTank(g);
    t.decor = [];
    g.finance.money = 1000;
    placeDecor(g, t.id, 'spider_wood', { x: -0.13, z: -0.03 });
    const thirds = beautyScore(g, t);
    const off = thirds.factors.find((f) => f.label === 'Focal point')!.value;
    moveDecor(g, t.id, t.decor[0].id, { x: 0, z: -0.03 });
    const centred = beautyScore(g, t);
    expect(centred.factors.find((f) => f.label === 'Focal point')!.value).toBeLessThan(off);
    expect(centred.tips.join(' ')).toMatch(/off-centre/);
  });
  it('drops with algae', () => {
    const g = game('betta', 5);
    const t = firstTank(g);
    const clean = beautyScore(g, t).score;
    t.water.algae = 80;
    t.water.clarity = 0.6;
    const dirty = beautyScore(g, t);
    expect(dirty.score).toBeLessThan(clean - 5);
    expect(dirty.tips.join(' ')).toMatch(/Algae/);
  });
});

describe('living decor', () => {
  it('plants grow with light and stall in the dark; nitrate is taken up', () => {
    const g = game('betta', 3);
    const t = firstTank(g);
    for (const d of t.decor) if (d.growth !== undefined) d.growth = 0.3;
    t.water.nitrate = 20;
    const lit = structuredClone(g);
    const lt = firstTank(lit);
    const dark = structuredClone(g);
    const dt = firstTank(dark);
    dt.lighting.intensity = 0;
    lt.lighting.onHour = 0;
    lt.lighting.offHour = 24;
    dt.lighting.onHour = 0;
    dt.lighting.offHour = 24;
    for (let i = 0; i < 24; i++) {
      stepTankDecor(lit, lt, 1);
      stepTankDecor(dark, dt, 1);
      lit.clock.hour += 1;
      dark.clock.hour += 1;
    }
    const avg = (tk: Tank) => {
      const xs = tk.decor.filter((d) => d.growth !== undefined).map((d) => d.growth!);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(avg(lt)).toBeGreaterThan(0.4);
    expect(avg(dt)).toBeLessThan(avg(lt) - 0.08);
    expect(lt.water.nitrate).toBeLessThan(20);
    const vall = lt.decor.find((d) => d.defId === 'vallisneria')!;
    const anub = lt.decor.find((d) => d.defId === 'anubias_nana')!;
    expect(vall.growth!).toBeGreaterThan(anub.growth!); // fast vs slow grower
  });
  it('is robust to long steps (no NaN, values clamped)', () => {
    const g = game('ocellaris_clownfish', 3);
    const t = firstTank(g);
    t.water.salinitySG = 1.012; // terrible for marine life
    stepTankDecor(g, t, 6);
    stepTankDecor(g, t, 48);
    for (const d of t.decor) {
      if (d.health !== undefined) {
        expect(Number.isFinite(d.health)).toBe(true);
        expect(d.health).toBeGreaterThanOrEqual(0);
        expect(d.health).toBeLessThanOrEqual(100);
      }
      if (d.growth !== undefined) expect(d.growth).toBeLessThanOrEqual(1);
    }
    const macro = t.decor.find((d) => d.defId === 'red_ogo')!;
    expect(macro.health!).toBeLessThan(96);
  });
  it('coral-nipping fish damage coral colonies (compat coral_nip incidents)', () => {
    const nipper = listSpecies((s) => s.environment === 'marine' && s.category === 'fish' && ((s.coralRisk ?? 0) >= 0.2 || s.reefSafe === 'caution' || s.reefSafe === 'unsafe')).sort((a, b) => (b.coralRisk ?? 0) - (a.coralRisk ?? 0))[0];
    expect(nipper, 'a coral-nipping marine fish exists').toBeTruthy();
    if (!nipper) return;
    const g = game('ocellaris_clownfish', 11);
    const t = firstTank(g);
    t.waterClass = 'reef';
    g.progress.unlocked.push('decor_corals_soft', 'decor_corals_lps', nipper.unlock.requires[0] ?? '');
    g.finance.money = 5000;
    const r = placeDecor(g, t.id, 'hammer_coral', { x: 0.29, z: 0.05 });
    expect(r.ok, r.message).toBe(true);
    const coral = t.decor.find((d) => d.id === r.decorId)!;
    addCreature(g, createCreature(g, simRng(g), nipper.id, { ageDays: 60 }), t.id);
    // keep the water perfect so only nipping can hurt it
    coral.health = 100;
    let minHealth = 100;
    for (let i = 0; i < 240; i++) {
      t.water.nitrate = 5;
      t.water.tempC = 25.5;
      t.water.salinitySG = 1.025;
      t.water.kh = 8.5;
      t.water.ammonia = 0;
      stepTankDecor(g, t, 12);
      g.clock.hour += 12;
      minHealth = Math.min(minHealth, coral.health!);
    }
    expect(minHealth).toBeLessThan(95);
    expect(g.log.some((e) => /nipped/.test(e.text))).toBe(true);
  });
  it('corals suffer in poor water and almond leaves break down', () => {
    const g = game('betta', 3);
    const t = firstTank(g);
    const leaf = t.decor.find((d) => d.defId === 'almond_leaf')!;
    stepTankDecor(g, t, 24 * 7);
    expect(leaf.health!).toBeLessThan(60);
    const m = game('ocellaris_clownfish', 3);
    const mt = firstTank(m);
    mt.waterClass = 'reef';
    m.progress.unlocked.push('decor_corals_lps');
    m.finance.money = 1000;
    const r = placeDecor(m, mt.id, 'acropora', { x: 0.28, z: 0.05 });
    expect(r.ok, r.message).toBe(true);
    const acro = mt.decor.find((d) => d.id === r.decorId)!;
    mt.water.nitrate = 60;
    mt.water.tempC = 31;
    stepTankDecor(m, mt, 24);
    expect(acro.health!).toBeLessThan(70);
  });
});
