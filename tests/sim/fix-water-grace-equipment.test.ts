// @vitest-environment node
/**
 * lane:core (S0 review) — the offline-grace contract in src/persistence/offline.ts says equipment should not fail
 * during the catch-up, but the wear step rolled failures there too. Wear still accrues; only the failure is skipped.
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { simulateOffline } from '@/persistence';
import type { GameState } from '@/types';

/** A tank with 400 worn-out heaters: outside the grace period at least one fails within 12 game hours. */
function rig(seed: number): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Wear', seed });
  const tank = g.tanks[g.tankOrder[0]];
  const heater = tank.equipment.find((e) => e.defId === 'heater_50w');
  expect(heater).toBeDefined();
  for (let i = 0; i < 400; i++) tank.equipment.push({ ...structuredClone(heater!), id: `eq_wear_${i}`, condition: 0, on: true, failed: false });
  return g;
}

const failed = (g: GameState) => Object.values(g.tanks).flatMap((t) => t.equipment ?? []).filter((e) => e.failed).length;

describe('PERSIST-012: equipment during the offline grace', () => {
  it('nothing fails while catching up, though wear still accrues', () => {
    const g = rig(7);
    simulateOffline(g, 12 * 3600 * 1000);
    expect(failed(g)).toBe(0);
    const worn = g.tanks[g.tankOrder[0]].equipment!.find((e) => e.defId === 'heater_50w' && e.id !== 'eq_wear_0');
    expect(worn!.condition).toBeLessThan(1);
  });

  it('the same rig does fail outside the grace period, so the check above is meaningful', () => {
    const g = rig(7);
    advanceWorld(g, 12, { focusTankId: g.tankOrder[0] });
    expect(failed(g)).toBeGreaterThan(0);
  });
});
