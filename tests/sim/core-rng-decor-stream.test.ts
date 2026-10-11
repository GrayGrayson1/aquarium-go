// @vitest-environment node
/**
 * lane:core (B-168) — inside a tank step, coral nipping draws from the step's ctx.rng instead of opening a second
 * simRng(state) on the same stored state (which made the creature step replay its draws and rewound rngState).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState, Tank } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { stepTankDecor } from '@/sim/aquascape';
import { simRng, type Rng } from '@/sim/rng';
import { getDecorDef } from '@/data/catalog/decor';
import { createCreature, addCreature } from '@/sim/life';
import { incidentRisks } from '@/sim/compat';

function reefWithNipper(): { g: GameState; tank: Tank } {
  const g = FIXTURES.marine_reef();
  const tank = g.tankOrder.map((id) => g.tanks[id]).find((t) => t.decor.some((d) => getDecorDef(d.defId)?.category === 'coral'))!;
  // the fixture's only coral is a gorgonian, which nippers leave alone: add a zoanthid colony
  tank.decor.push({ id: 'decor_zoa_test', defId: 'zoanthids', x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 7, growth: 0.5, health: 90 });
  for (let i = 0; i < 2; i++) addCreature(g, createCreature(g, simRng(g), 'coral_beauty', { ageDays: 40 }), tank.id);
  return { g, tank };
}

describe('coral nipping uses the tank step’s stream (B-168)', () => {
  it('draws only from the rng it is given, never from a fresh simRng(state)', () => {
    const { g, tank } = reefWithNipper();
    expect(incidentRisks(g, tank.id).some((r) => r.kind === 'coral_nip')).toBe(true);
    let draws = 0;
    const base = simRng({ ...g, rngState: 12345 } as GameState);
    const counting: Rng = new Proxy(base, { get: (t, k) => (typeof t[k as keyof Rng] === 'function' ? (...a: unknown[]) => (draws++, (t[k as keyof Rng] as (...x: unknown[]) => unknown)(...a)) : t[k as keyof Rng]) });
    const before = g.rngState;
    stepTankDecor(g, tank, 24, g.clock.hour - 24, counting);
    expect(draws).toBeGreaterThan(0);
    expect(g.rngState).toBe(before);
  });

  it('the world step hands the decor step its own ctx.rng', () => {
    expect(readFileSync(join(process.cwd(), 'src/sim/world.ts'), 'utf8')).toContain('stepTankDecor(state, tank, dt, ctx.hour, ctx.rng)');
  });

  it('decor steps given the world stream are deterministic and advance it', () => {
    // the same step twice from the same state agrees (determinism), and rngState moves on
    const a = reefWithNipper();
    const b = reefWithNipper();
    expect(b.g.rngState).toBe(a.g.rngState);
    const start = a.g.rngState;
    stepTankDecor(a.g, a.tank, 24, a.g.clock.hour - 24, simRng(a.g));
    stepTankDecor(b.g, b.tank, 24, b.g.clock.hour - 24, simRng(b.g));
    expect(a.g.rngState).toBe(b.g.rngState);
    expect(a.g.rngState).not.toBe(start);
  });
});
