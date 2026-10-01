/**
 * Fix lane LIFE — quarantine is a recovery context (S02-07): a sick schooling fish moved alone into a quarantine tank
 * recovers instead of dying of loneliness stress, and the illness advice no longer sends schooling fish there.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { moveCreature } from '@/sim/life/actions';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { getSpecies } from '@/data/species';
import { illnessDef } from '@/sim/life/illness';

vi.setConfig({ testTimeout: 240_000 });

function sickTetra(seed: number, quarantine: boolean) {
  const g: GameState = newGame({ starterId: 'betta', starterName: 'Solo', seed });
  const display = createTank(g, 'g29', 'freshwater_planted', { cycled: true, name: 'Community' });
  const q = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, name: 'Quarantine' });
  q.purpose = 'quarantine';
  q.water.pH = display.water.pH;
  q.water.tempC = display.water.tempC;
  q.water.gh = display.water.gh;
  q.water.kh = display.water.kh;
  for (const eq of q.equipment) if (eq.defId.includes('heater')) eq.setting = display.water.tempC;
  const school = [] as ReturnType<typeof createCreature>[];
  for (let i = 0; i < 8; i++) school.push(addCreature(g, createCreature(g, simRng(g), 'neon_tetra', { ageDays: 20, captiveBred: true }), display.id));
  const sick = school[0];
  sick.illness = { kind: 'ich', severity: 40, sinceHour: g.clock.hour };
  sick.stats.health = 80;
  if (quarantine) expect(moveCreature(g, sick.id, q.id).ok).toBe(true);
  g.inventory.foods['flake_tropical'] = 9999;
  let recoveredAt: number | null = null;
  const t0 = g.clock.hour;
  for (let h = 0; h < 24 * 8 && sick.status === 'alive'; h++) {
    if (h % 12 === 0) for (const id of g.tankOrder) feedTank(g, id, id === g.tankOrder[0] ? 'micro_pellets' : 'flake_tropical', {});
    for (const t of Object.values(g.tanks)) {
      t.water.ammonia = 0;
      t.water.nitrite = 0;
      t.water.nitrate = Math.min(t.water.nitrate, 10);
      for (const eq of t.equipment) eq.failed = false;
    }
    advanceWorld(g, 1, { forceFull: true });
    if (!sick.illness && recoveredAt === null) recoveredAt = g.clock.hour - t0;
  }
  return { sick, recoveredAt };
}

describe('S02-07 — quarantine trap', () => {
  it('a sick neon tetra alone in a quarantine tank recovers (faster than with the school)', () => {
    const alone = sickTetra(11, true);
    expect(alone.sick.status).toBe('alive');
    expect(alone.recoveredAt).not.toBeNull();
    const withSchool = sickTetra(11, false);
    expect(withSchool.recoveredAt).not.toBeNull();
    expect(alone.recoveredAt!).toBeLessThanOrEqual(withSchool.recoveredAt!);
  });

  it('illness advice only suggests quarantine for animals that live alone', () => {
    const ich = illnessDef('ich')!;
    expect(ich.cure(getSpecies('neon_tetra'))).not.toMatch(/quarantine/);
    expect(ich.cure(getSpecies('neon_tetra'))).toMatch(/keep it with its group/);
    expect(ich.cure(getSpecies('betta'))).toMatch(/quarantine/);
  });
});
