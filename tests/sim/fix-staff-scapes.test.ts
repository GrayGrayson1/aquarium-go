/**
 * Fix lane STAFF — aquascape shows and placement regressions.
 *
 *   S05-01 / G2-01  the gifted starter layout (untouched, grown in, or three token nudges) is a club-level entry at
 *                   best; a layout of the player's own placing earns full composition credit; 1 mm nudges are not
 *                   layout edits.
 *   S05-06          "to storage" then "place free" keeps a coral's healing timer / frag lineage and grants no mastery.
 *   S05-08          epiphytes riding on moved hardscape obey the glass.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, ShowTier } from '@/types';
import type { StarterId } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { moveDecor, placeDecor, removeDecor, beautyScore, giftedLayoutShare, scapeCritique, checkPlacement, placementLimits, takeFrag, fragEligibility } from '@/sim/aquascape';
import { assessTank, fieldChances, tankShowReasons } from '@/sim/shows';
import { SHOW_CLASS_BY_ID, SHOW_TIERS } from '@/data/shows';
import { STARTER_IDS } from '@/data/species';
import { getDecorDef } from '@/data/catalog/decor';
import { scapeEditsKey, counterValue } from '@/sim/facility/progression';
import { advanceWorld } from '@/sim/world';
import { tankDims } from '@/sim/tankSpace';

const midField = (t: ShowTier) => Math.round((SHOW_TIERS[t].field[0] + SHOW_TIERS[t].field[1]) / 2);

function starterGame(starterId: StarterId, seed = 11): GameState {
  const g = newGame({ starterId, starterName: 'X', seed, shopName: 'T' });
  g.finance.money = 1e6;
  advanceWorld(g, 2, { focusTankId: g.tankOrder[0] });
  return g;
}

function chances(g: GameState, tankId: string, classId: string) {
  const t = g.tanks[tankId];
  const a = assessTank(g, t, SHOW_CLASS_BY_ID[classId]);
  return { expected: a.expected, club: fieldChances('club', a.expected, midField('club')), regional: fieldChances('regional', a.expected, midField('regional')), national: fieldChances('national', a.expected, midField('national')) };
}

describe('S05-01 / G2-01 — the gifted starter layout is a club-level aquascape entry at best', () => {
  it('every starter tank, grown in, is out of the running at Regional and National', () => {
    for (const id of STARTER_IDS) {
      const g = starterGame(id);
      const t = g.tanks[g.tankOrder[0]];
      for (const d of t.decor) if (d.growth !== undefined) d.growth = 1;
      expect(giftedLayoutShare(g, t), `${id} gifted share`).toBeGreaterThanOrEqual(0.75);
      for (const cid of ['scape_nano', 'scape_planted', 'scape_reef', 'scape_biotope']) {
        const def = SHOW_CLASS_BY_ID[cid];
        if (tankShowReasons(g, t, def).some((r) => !/your own layouts/.test(r))) continue; // class-shape reasons
        const c = chances(g, t.id, cid);
        expect(c.club.ribbon, `${id} ${cid} club ribbon`).toBeGreaterThan(0.4);
        expect(c.regional.win, `${id} ${cid} regional win`).toBeLessThan(0.1);
        expect(c.national.win, `${id} ${cid} national win`).toBeLessThan(0.005);
      }
    }
  });

  it('a millimetre nudge is not a layout edit; a real move is', () => {
    const g = starterGame('betta');
    const t = g.tanks[g.tankOrder[0]];
    const key = scapeEditsKey(t.id);
    // a piece with room to travel 5 cm to the right
    const d = t.decor.find((i) => checkPlacement(g, t, i.defId, { x: i.x + 0.05, z: i.z, rotY: i.rotY + 1, scale: i.scale * 1.2 }, { excludeId: i.id, purchase: 'none' }).ok)!;
    expect(d).toBeTruthy();
    const { x, z, rotY, scale } = d;
    expect(moveDecor(g, t.id, d.id, { x: x + 0.001, z }).ok).toBe(true);
    expect(counterValue(g, key)).toBe(0);
    expect(moveDecor(g, t.id, d.id, { x, z, rotY: rotY + 0.1 }).ok).toBe(true);
    expect(counterValue(g, key)).toBe(0);
    expect(moveDecor(g, t.id, d.id, { x: x + 0.05, z }).ok).toBe(true);
    expect(counterValue(g, key)).toBe(1);
    expect(moveDecor(g, t.id, d.id, { x: x + 0.05, z, rotY: rotY + 1 }).ok).toBe(true);
    expect(counterValue(g, key)).toBe(2);
    expect(moveDecor(g, t.id, d.id, { x: x + 0.05, z, scale: scale * 1.2 }).ok).toBe(true);
    expect(counterValue(g, key)).toBe(3);
  });

  it('three token nudges leave the tank ineligible and the beauty goals unmet', () => {
    const g = starterGame('betta');
    const t = g.tanks[g.tankOrder[0]];
    let n = 0;
    for (const d of t.decor) if (n < 3 && moveDecor(g, t.id, d.id, { x: d.x + 0.001, z: d.z }).ok) n++;
    expect(n).toBe(3);
    expect(tankShowReasons(g, t, SHOW_CLASS_BY_ID.scape_nano).join(' ')).toMatch(/your own layouts/);
  });

  it('the same layout scores far higher as the scaper’s own work than as the gifted one', () => {
    const g = starterGame('betta');
    const t = g.tanks[g.tankOrder[0]];
    for (const d of t.decor) if (d.growth !== undefined) d.growth = 1;
    const gifted = assessTank(g, t, SHOW_CLASS_BY_ID.scape_nano);
    // the identical layout in a save whose starter template is a different one reads as the player's own placing
    const own = assessTank({ ...g, starterId: 'axolotl' }, t, SHOW_CLASS_BY_ID.scape_nano);
    expect(giftedLayoutShare({ starterId: 'axolotl' }, t)).toBeLessThan(0.15);
    const pts = (a: typeof gifted) => a.criteria.find((c) => c.key === 'composition')!.points;
    expect(pts(own)).toBeGreaterThan(pts(gifted) * 4);
    expect(own.expected).toBeGreaterThan(75);
    expect(gifted.notes.some((n) => /layout the tank came with/.test(n.text))).toBe(true);
    expect(own.notes.some((n) => /layout the tank came with/.test(n.text))).toBe(false);
  });

  it('a layout of the player’s own placing beats a random one, and maturity matters', () => {
    const g = starterGame('betta', 3);
    const t = g.tanks[g.tankOrder[0]];
    t.decor = [];
    const dims = tankDims(t);
    // a deliberate nano layout: spider wood on the left third, stones, a stem backdrop, epiphytes, a carpet in front
    // (tank-local metres in a 10-gal: L 0.508, W 0.254)
    const plan: [string, number, number, number, number][] = [
      ['spider_wood', -0.09, -0.02, 0.3, 0.8],
      ['river_stone', 0.09, 0.05, 0.9, 0.8],
      ['river_stone', 0.15, -0.01, 1.7, 0.6],
      ['rotala', -0.19, -0.08, 0, 0.8],
      ['rotala', -0.1, -0.085, 0, 0.75],
      ['vallisneria', 0.04, -0.085, 0, 0.5],
      ['ludwigia', 0.16, -0.08, 0, 0.75],
      ['java_fern', -0.08, -0.03, 0.5, 0.8],
      ['anubias_nana', -0.13, 0.01, 1.0, 0.7],
      ['java_moss', -0.06, 0.01, 0, 0.7],
      ['cryptocoryne', 0.03, 0.0, 0.3, 0.8],
      ['monte_carlo', 0.05, 0.075, 0, 0.8],
      ['dwarf_hairgrass', -0.03, 0.08, 0, 0.7],
    ];
    for (const [id, x, z, rotY, scale] of plan) {
      const p = { x, z, rotY, scale };
      const c = checkPlacement(g, t, id, p, { purchase: 'buy' });
      expect(c.ok, `${id}: ${c.message} (L ${dims.L})`).toBe(true);
      expect(placeDecor(g, t.id, id, p).ok).toBe(true);
    }
    expect(t.decor.length).toBeGreaterThanOrEqual(10);
    expect(giftedLayoutShare(g, t)).toBeLessThan(0.2);
    const grow = (v: number) => t.decor.forEach((d) => d.growth !== undefined && (d.growth = v));
    grow(0.35);
    const fresh = chances(g, t.id, 'scape_nano');
    grow(1);
    const grown = chances(g, t.id, 'scape_nano');
    expect(grown.expected).toBeGreaterThan(fresh.expected + 5);
    expect(grown.club.win).toBeGreaterThan(0.5);
    // a hand-planned layout is a contender at Regional; National still needs contest craft
    expect(grown.regional.ribbon).toBeGreaterThan(0.3);
    expect(grown.national.win).toBeLessThan(0.3);
    const crit = scapeCritique(t, beautyScore(g, t));
    expect(crit.composition).toBeGreaterThan(0.6);
    expect(crit.composition).toBeLessThan(1);
  });
});

describe('S05-06 — storage round trips', () => {
  it('placing an owned piece grants no mastery and does not count as new material', () => {
    const g = starterGame('betta');
    const t = g.tanks[g.tankOrder[0]];
    const stone = t.decor.find((d) => d.defId === 'river_stone')!;
    const m0 = g.progress.mastery.aquascaping;
    const placed0 = counterValue(g, 'decorPlaced');
    for (let i = 0; i < 20; i++) {
      expect(removeDecor(g, t.id, stone.id).ok).toBe(true);
      const r = placeDecor(g, t.id, 'river_stone', { x: stone.x, z: stone.z, rotY: stone.rotY, scale: stone.scale }, true);
      expect(r.ok).toBe(true);
    }
    expect(g.progress.mastery.aquascaping).toBe(m0);
    expect(counterValue(g, 'decorPlaced')).toBe(placed0);
    // buying new material still builds mastery
    expect(placeDecor(g, t.id, 'river_stone', { x: 0.0, z: 0.1, scale: 0.5 }).ok).toBe(true);
    expect(g.progress.mastery.aquascaping).toBeGreaterThan(m0);
  });

  it('a coral healing after a cut keeps its timer, frag count and lineage through storage', () => {
    const g = starterGame('ocellaris_clownfish');
    const t = g.tanks[g.tankOrder[0]];
    t.waterClass = 'reef';
    g.progress.unlocked.push('decor_corals_lps', 'decor_corals_soft', 'frags');
    const r = placeDecor(g, t.id, 'hammer_coral', { x: 0.05, z: 0.05, scale: 1 });
    expect(r.ok).toBe(true);
    const coral = t.decor.find((d) => d.id === r.decorId)!;
    coral.growth = 0.9;
    coral.health = 95;
    coral.frag = { takenHour: 0, lineName: 'Test line', generation: 2, grownHour: 5 };
    const cut = takeFrag(g, t.id, coral.id);
    expect(cut.ok, cut.message).toBe(true);
    const healing = coral.recoverUntilHour;
    expect(healing).toBeGreaterThan(g.clock.hour);
    const taken = coral.fragsTaken;
    expect(removeDecor(g, t.id, coral.id).ok).toBe(true);
    expect(placeDecor(g, t.id, 'hammer_coral', { x: 0.05, z: 0.05, scale: 1 }, true).ok).toBe(true);
    const back = t.decor.find((d) => d.defId === 'hammer_coral')!;
    expect(back.recoverUntilHour).toBe(healing);
    expect(back.fragsTaken).toBe(taken);
    expect(back.frag?.lineName).toBe('Test line');
    expect(back.frag?.generation).toBe(2);
    expect(back.growth).toBeCloseTo(coral.growth, 5);
    expect(fragEligibility(g, t, back).code).toBe('recovering');
  });
});

describe('S05-08 — riders obey the glass', () => {
  it('a fern tied to wood pushed against a wall stays inside its own limits', () => {
    const g = starterGame('betta');
    const t = g.tanks[g.tankOrder[0]];
    t.tierId = 'g75';
    t.decor = [];
    const wood = placeDecor(g, t.id, 'spider_wood', { x: 0, z: 0, scale: 1.3 });
    expect(wood.ok).toBe(true);
    const fern = placeDecor(g, t.id, 'java_fern', { x: 0.12, z: 0, scale: 1 });
    expect(fern.ok).toBe(true);
    const f = t.decor.find((d) => d.id === fern.decorId)!;
    const w = t.decor.find((d) => d.id === wood.decorId)!;
    const lim = placementLimits(t, getDecorDef('spider_wood')!, w.scale, w.rotY);
    expect(moveDecor(g, t.id, w.id, { x: lim.maxX, z: 0 }).ok).toBe(true);
    const own = placementLimits(t, getDecorDef('java_fern')!, f.scale, f.rotY);
    expect(Math.abs(f.x)).toBeLessThanOrEqual(own.maxX + 1e-6);
    expect(Math.abs(f.z)).toBeLessThanOrEqual(own.maxZ + 1e-6);
    expect(checkPlacement(g, t, 'java_fern', { x: f.x, z: f.z, rotY: f.rotY, scale: f.scale }, { excludeId: f.id, purchase: 'none' }).ok).toBe(true);
    // still riding the wood
    expect(Math.abs(f.x - w.x)).toBeLessThan(0.2);
  });
});
