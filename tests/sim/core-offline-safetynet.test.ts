// @vitest-environment node
/**
 * The grace safety net must hold even if a lane ignores `state.offlineGrace`.
 * Here the life step is replaced with a hostile one that kills everything it touches.
 */
import { describe, it, expect, vi } from 'vitest';
import type { GameState, Tank } from '@/types';

vi.mock('@/sim/life', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/sim/life')>();
  return {
    ...orig,
    stepTankCreatures: (state: GameState, tank: Tank) => {
      for (const c of Object.values(state.creatures)) {
        if (c.tankId === tank.id && c.status === 'alive') {
          c.status = 'dead';
          c.deathCause = 'hostile test step';
          c.stats.health = 0;
          state.log.push({ id: `ev_kill_${c.id}_${state.log.length}`, hour: state.clock.hour, kind: 'death', text: `${c.name} died`, creatureId: c.id });
        }
      }
    },
  };
});

const { simulateOffline, GRACE_HEALTH_FLOOR } = await import('@/persistence');
const { newGame } = await import('@/sim/newGame');
const { stockTank } = await import('@/dev/fixtures/core-helpers');

describe('core offline grace safety net', () => {
  it('revives animals a lane killed during catch-up and drops their death notices', () => {
    const g = newGame({ starterId: 'pea_puffer', starterName: 'Safe', seed: 404 });
    stockTank(g, g.tankOrder[0], [{ species: 'pea_puffer', count: 3 }]);
    const alive = Object.values(g.creatures).filter((c) => c.status === 'alive').map((c) => c.id);
    const s = simulateOffline(g, 24 * 3600 * 1000);
    expect(s.deathsPrevented).toBeGreaterThan(0);
    for (const id of alive) {
      expect(g.creatures[id].status).toBe('alive');
      expect(g.creatures[id].deathCause).toBeUndefined();
      expect(g.creatures[id].stats.health).toBeGreaterThanOrEqual(GRACE_HEALTH_FLOOR);
    }
    expect(g.log.filter((e) => e.kind === 'death')).toEqual([]);
    expect(g.offlineGrace).toBeUndefined();
  });
});
