/**
 * Shared helpers for tests/sim/shows-*.test.ts. OWNER: lane "shows".
 */
import type { Creature, GameState, Show, ShowTier } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import type { StarterId } from '@/data/species';
import { SHOW_TIERS } from '@/data/shows';
import { ensureShowsState } from '@/sim/shows';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { refreshTankCache } from '@/sim/world';

/** A fresh game with the show circuit open (every tier, unless `tiers` says otherwise) and the tutorial done. */
export function showGame(starterId: StarterId = 'betta', seed = 1234, tiers: ShowTier[] = ['club', 'regional', 'national', 'international']): GameState {
  const p = previewStarters(seed)[starterId];
  const g = newGame({ starterId, starterName: p.name, seed, starterCreature: p });
  g.progress.tutorial.done = true;
  g.finance.money = 100000;
  for (const t of tiers) if (!g.progress.unlocked.includes(SHOW_TIERS[t].unlockKey)) g.progress.unlocked.push(SHOW_TIERS[t].unlockKey);
  // settle past the new-home window
  g.clock.hour += 30;
  for (const c of Object.values(g.creatures)) {
    c.acquiredHour -= 30;
    c.bornHour -= 30;
    if (c.life) c.life.settledSinceHour = undefined;
  }
  for (const id of g.tankOrder) refreshTankCache(g, g.tanks[id]);
  return g;
}

export function starterOf(g: GameState): Creature {
  return Object.values(g.creatures).find((c) => c.isStarter)!;
}

/** Make an animal look well kept: healthy, calm, fed, conditioned and bonded. */
export function wellKept(c: Creature, over: Partial<{ health: number; stress: number; hunger: number; conditioning: number; bond: number; injury: number }> = {}): Creature {
  c.stats.health = over.health ?? 100;
  c.stats.stress = over.stress ?? 12;
  c.stats.hunger = over.hunger ?? 25;
  c.illness = undefined;
  c.life = { ...(c.life ?? {}), conditioning: over.conditioning ?? 45, bond: over.bond ?? 50, injury: over.injury ?? 0, settledSinceHour: undefined };
  c.repro.stage = 'idle';
  c.repro.carryingUntilHour = undefined;
  return c;
}

/** Add an adult of a species to a tank, with optional potentials. */
export function addAdult(g: GameState, speciesId: string, tankId: string, pots: Partial<Creature['genome']['potentials']> = {}, ageDays?: number, sex?: 'male' | 'female'): Creature {
  const rng = simRng(g);
  const c = createCreature(g, rng, speciesId, { ageDays, sex });
  Object.assign(c.genome.potentials, pots);
  addCreature(g, c, tankId);
  c.acquiredHour = g.clock.hour - 48;
  wellKept(c);
  return c;
}

/** Put a hand-made show on the calendar (judged `inHours` from now; entries close 3 h before). */
export function addShow(g: GameState, tier: ShowTier, classIds: string[], opts: { inHours?: number; field?: number; purse?: number; fee?: number; seed?: number } = {}): Show {
  const s = ensureShowsState(g);
  const judgingHour = g.clock.hour + (opts.inHours ?? 10);
  s.seq += 1;
  const show: Show = {
    id: `show-test-${s.seq}`,
    serial: s.seq,
    name: `Test ${SHOW_TIERS[tier].name} Show ${s.seq}`,
    host: 'Test Aquarium Club',
    tier,
    classes: classIds.map((classId) => ({ classId, purse: opts.purse ?? SHOW_TIERS[tier].purse[0], field: opts.field ?? SHOW_TIERS[tier].field[0] })),
    fee: opts.fee ?? 10,
    announcedHour: g.clock.hour,
    deadlineHour: judgingHour - 3,
    judgingHour,
    judge: 'T. Tester',
    status: 'open',
    seed: opts.seed ?? 4242 + s.seq,
  };
  s.shows.push(show);
  return show;
}

/** Potentials for a "remarkable" show animal. */
export const TOP = { size: 98, color: 99, pattern: 99, structure: 99 };
