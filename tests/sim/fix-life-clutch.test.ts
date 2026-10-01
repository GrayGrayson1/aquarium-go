/**
 * Fix lane LIFE — clutch pipeline regressions: an axolotl mother who leaves mid-lay (sold / dies) no longer leaves a
 * zombie "still being laid" clutch behind (P2-01); minted young are always juveniles (S02-06).
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState, WaterClass } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { devForceBreeding, moveClutch } from '@/sim/life/breeding/actions';
import { quickSell } from '@/sim/economy';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';
import { moduleFor } from '@/sim/life/breeding/registry';
import { isMature } from '@/sim/life/breeding/common';
import { ALL_SPECIES } from '@/data/species';

vi.setConfig({ testTimeout: 240_000 });

function tend(g: GameState): void {
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    c.stats.health = Math.max(c.stats.health, 90);
  }
}

/** New axolotl game with a pair; advance until the female is laying with eggs still pending. */
function layingAxolotl(seed: number): { g: GameState; motherId: string; clutchId: string } {
  const preview = previewStarters(seed).axolotl;
  const g = newGame({ starterId: 'axolotl', starterName: preview.name, seed, starterCreature: preview });
  g.progress.unlocked.push('market_listings');
  const s = Object.values(g.creatures).find((c) => c.isStarter)!;
  addCreature(g, createCreature(g, simRng(g), 'axolotl', { sex: s.sex === 'male' ? 'female' : 'male', ageDays: 26, name: 'Axel' }), s.tankId!);
  devForceBreeding(g, s.id);
  for (let h = 0; h < 80; h++) {
    tend(g);
    advanceWorld(g, 1, { forceFull: true });
    const f = Object.values(g.creatures).find((c) => c.repro.stage === 'laying');
    if (f?.repro.clutchId && (g.clutches[f.repro.clutchId]?.pendingEggs ?? 0) > 0) return { g, motherId: f.id, clutchId: f.repro.clutchId };
  }
  throw new Error('never started laying');
}

function runDays(g: GameState, days: number): void {
  for (let h = 0; h < 24 * days; h += 6) {
    tend(g);
    advanceWorld(g, 6, { forceFull: true });
  }
}

describe('P2-01 — axolotl clutch when the mother leaves mid-lay', () => {
  it('quick-selling the mother before any egg is placed resolves the clutch instead of leaving it "still being laid"', () => {
    const { g, motherId, clutchId } = layingAxolotl(5151);
    expect(g.clutches[clutchId].count).toBe(0);
    expect(quickSell(g, [motherId]).ok).toBe(true);
    runDays(g, 2);
    expect(g.clutches[clutchId]).toBeUndefined();
    expect(g.log.some((e) => /left for a new home before laying/.test(e.text))).toBe(true);
  });

  it('a mother that dies mid-lay leaves the eggs she already placed, which hatch and can be moved', () => {
    const { g, motherId, clutchId } = layingAxolotl(5151);
    // Let her place some eggs first.
    for (let h = 0; h < 30 && g.clutches[clutchId].count < 5; h++) {
      tend(g);
      advanceWorld(g, 1, { forceFull: true });
    }
    const laid = g.clutches[clutchId].count;
    expect(laid).toBeGreaterThan(0);
    expect(g.clutches[clutchId].pendingEggs ?? 0).toBeGreaterThan(0);
    g.creatures[motherId].status = 'dead';
    g.creatures[motherId].deathCause = 'test';
    const nursery = createTank(g, 'g20L', 'freshwater_cool', { cycled: true, name: 'Nursery' });
    nursery.purpose = 'nursery';
    runDays(g, 1);
    const cl = g.clutches[clutchId];
    expect(cl).toBeDefined();
    expect(cl.pendingEggs ?? 0).toBe(0);
    expect(cl.initialCount).toBe(laid);
    expect(moveClutch(g, clutchId, nursery.id).ok).toBe(true);
    runDays(g, 12);
    // The clutch has progressed past eggs (hatched) or fully resolved — never stuck at "eggs, still being laid".
    const after = g.clutches[clutchId];
    if (after) expect(after.stage).not.toBe('eggs');
  });
});

describe('S02-06 — minted young are always juveniles', () => {
  it('every breedable species arrives immature even after a long rearing pipeline', () => {
    for (const sp of ALL_SPECIES) {
      const mod = moduleFor(sp);
      if (!mod.breedable || !mod.plan.larvaeViable) continue;
      const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
      const wc: WaterClass = sp.environment === 'marine' ? 'reef' : sp.environment === 'brackish' ? 'brackish' : 'freshwater_tropical';
      const tank = createTank(g, 'g75', wc, { cycled: true, name: 'Nursery' });
      tank.purpose = 'nursery';
      const mom = createCreature(g, simRng(g), sp.id, { sex: 'female', ageDays: sp.breeding.maturityDays + 5 });
      const dad = createCreature(g, simRng(g), sp.id, { sex: 'male', ageDays: sp.breeding.maturityDays + 5 });
      addCreature(g, mom, null);
      addCreature(g, dad, null);
      const back = (sp.breeding.system === 'livebearer' ? 0 : sp.breeding.incubationHours) + sp.breeding.fryRearingHours;
      const cl = createClutch(g, { sp, tank, mother: mom, father: dad, hour: g.clock.hour - back, stage: 'fry', count: 3, visual: 'fry_cloud', nextStageHour: g.clock.hour });
      const kid = mintJuveniles(g, cl, tank, sp, g.clock.hour, null)[0];
      if (!kid) continue;
      expect(kid.lifeStage, sp.id).toBe('juvenile');
      expect(isMature(kid, sp, g.clock.hour), sp.id).toBe(false);
      expect(kid.sizeCm / sp.adultSizeCm, sp.id).toBeLessThan(0.9);
    }
  });
});
