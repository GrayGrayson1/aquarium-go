/**
 * Fix lane LIFE — protogynous sex change (S02-02): two clown gobies kept together produce one male, so the species
 * sold as a "juvenile pair — the larger one will become the male" can actually breed.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { breedingCheck } from '@/sim/life/breeding';

vi.setConfig({ testTimeout: 240_000 });

function gobyTank(seed: number, n: number, ageDays = 20): { g: GameState; ids: string[] } {
  const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed });
  const tank = createTank(g, 'g20L', 'reef', { cycled: true, name: 'Goby Reef' });
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push(addCreature(g, createCreature(g, simRng(g), 'clown_goby', { ageDays }), tank.id).id);
  return { g, ids };
}

function tendDays(g: GameState, days: number): void {
  for (let d = 0; d < days; d++) {
    for (const c of Object.values(g.creatures)) {
      if (c.status !== 'alive') continue;
      c.stats.hunger = Math.min(c.stats.hunger, 20);
      c.stats.health = Math.max(c.stats.health, 90);
      c.stats.stress = Math.min(c.stats.stress, 30);
    }
    for (const t of Object.values(g.tanks)) {
      t.water.ammonia = 0;
      t.water.nitrite = 0;
      for (const eq of t.equipment) eq.failed = false;
    }
    advanceWorld(g, 24, { forceFull: true });
  }
}

describe('S02-02 — protogynous clown goby', () => {
  it('two mature females kept together: the dominant one becomes the male within a few days', () => {
    const { g, ids } = gobyTank(4242, 2);
    tendDays(g, 8);
    const roles = ids.map((id) => g.creatures[id].reproRole).sort();
    expect(roles).toEqual(['female', 'male']);
    const male = ids.map((id) => g.creatures[id]).find((c) => c.reproRole === 'male')!;
    expect(male.sex).toBe('male');
    expect(male.history.some((h) => h.kind === 'sex_change')).toBe(true);
    expect(g.log.some((e) => /has become the male of the group/.test(e.text))).toBe(true);
    const check = breedingCheck(g, ids[0], ids[1]);
    expect(check.reasons.join(' ')).not.toMatch(/can’t change back/);
  });

  it('a group of three ends up with exactly one male', () => {
    const { g, ids } = gobyTank(99, 3);
    tendDays(g, 10);
    expect(ids.filter((id) => g.creatures[id].reproRole === 'male')).toHaveLength(1);
  });

  it('a lone female never changes', () => {
    const { g, ids } = gobyTank(7, 1);
    tendDays(g, 10);
    expect(g.creatures[ids[0]].reproRole).toBe('female');
  });
});
