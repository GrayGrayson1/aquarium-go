/**
 * Audit 2026-11-17, area D (the animals): choosing them, whether they fit, how they fare, why they die, and whether
 * the game says what each one needs. One describe per finding.
 */
import { describe, it, expect } from 'vitest';
import type { CompatReport, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { previewAddition } from '@/sim/compat';

const texts = (r: CompatReport) => r.reasons.map((x) => x.text).join('\n');
const base = (): GameState => newGame({ starterId: 'betta', starterName: 'Test', seed: 777 });

describe('D1: a shop offer is previewed with its own animals’ sexes', () => {
  it('a male & female pair reads as a pair that may court, not as two of unknown sex', () => {
    const s = base();
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const rng = simRng(s);
    const pair = [createCreature(s, rng, 'german_blue_ram', { sex: 'male', ageDays: 200 }), createCreature(s, rng, 'german_blue_ram', { sex: 'female', ageDays: 200 })];
    expect(pair.map((c) => c.sex)).toEqual(['male', 'female']);
    const r = previewAddition(s, tank.id, { speciesId: 'german_blue_ram', creatures: pair });
    expect(texts(r)).toMatch(/A male and a female — they may court and breed/);
    expect(texts(r)).not.toMatch(/sexes aren't visible/);
    // the offer's animals aren't in the game yet: they never count as residents being moved
    expect(r.reasons.every((x) => !(x.creatureIds ?? []).some((id) => pair.some((c) => c.id === id)))).toBe(true);
  });

  it('a pea puffer trio (1 male, 2 females) shows the harassment rule the tank card shows after buying', () => {
    const s = base();
    const tank = createTank(s, 'g20L', 'freshwater_tropical', { cycled: true });
    const rng = simRng(s);
    const trio = [createCreature(s, rng, 'pea_puffer', { sex: 'male', ageDays: 200 }), createCreature(s, rng, 'pea_puffer', { sex: 'female', ageDays: 200 }), createCreature(s, rng, 'pea_puffer', { sex: 'female', ageDays: 200 })];
    const r = previewAddition(s, tank.id, { speciesId: 'pea_puffer', creatures: trio });
    expect(texts(r)).toMatch(/Male pea puffers harass females/);
  });
});
