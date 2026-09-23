/** Shared builders for the frag tests (lane "frags"). Not a test file itself. */
import { expect } from 'vitest';
import type { GameState, Tank, DecorInstance } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { placeDecor, stepTankDecor } from '@/sim/aquascape';

export function unlockAll(g: GameState): void {
  for (const k of Object.keys(UNLOCK_KEYS)) if (!g.progress.unlocked.includes(k)) g.progress.unlocked.push(k);
}

/** A clownfish save with everything unlocked and an empty, cycled 40 gal reef. */
export function reefGame(seed = 99): { g: GameState; t: Tank } {
  const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed });
  unlockAll(g);
  g.finance.money = 100_000;
  const t = createTank(g, 'g40B', 'reef', { cycled: true, name: 'Reef' });
  return { g, t };
}

/** A betta save with an empty, cycled 40 gal planted tank. */
export function plantedGame(seed = 7): { g: GameState; t: Tank } {
  const g = newGame({ starterId: 'betta', starterName: 'Mochi', seed });
  unlockAll(g);
  g.finance.money = 10_000;
  const t = createTank(g, 'g40B', 'freshwater_planted', { cycled: true, name: 'Planted' });
  t.water.nitrate = 12;
  return { g, t };
}

export function place(g: GameState, t: Tank, defId: string, x: number, z: number, scale = 1.2, growth = 1): DecorInstance {
  const r = placeDecor(g, t.id, defId, { x, z, scale, rotY: 0.3 });
  expect(r.ok, r.message).toBe(true);
  const inst = t.decor.find((d) => d.id === r.decorId)!;
  inst.growth = growth;
  inst.health = 95;
  return inst;
}

/** Step the tank's decor hour by hour (the clock moves first, as in the world stepper's window). */
export function hours(g: GameState, t: Tank, n: number): void {
  for (let i = 0; i < n; i++) {
    g.clock.hour += 1;
    stepTankDecor(g, t, 1);
  }
}
