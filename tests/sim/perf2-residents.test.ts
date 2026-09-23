// @vitest-environment node
/**
 * lane:perf2 — the per-step tank → residents index (src/sim/residents.ts) must never change a sim result.
 *
 * - A/B: the same worlds run with the index OFF (plain scans, the old code path) and ON give bit-identical states.
 * - VERIFY: long staffed / breeding / market worlds run with every indexed lookup cross-checked against a fresh scan
 *   (throws on the first stale answer — e.g. a join path that forgot touchResidents()).
 * - Scope rules: no index outside a scope; leavers drop out by themselves; joins need touchResidents().
 */
import { describe, it, expect, afterEach } from 'vitest';
import type { GameState } from '@/types';
import { advanceWorld, flushSimDebt } from '@/sim/world';
import { stateHash } from '@/persistence';
import { creaturesInTank } from '@/sim/life';
import {
  allResidents,
  residentIndexMode,
  residentIndexStats,
  residentsOf,
  setResidentIndexMode,
  touchResidents,
  withResidentIndex,
} from '@/sim/residents';
import { bigFacility, communityFw, marineReef } from '@/dev/fixtures/core-fixtures';
import { staffStore, staffUpLateGame } from '@/dev/fixtures/staff';
import { buildShowsDemo, buildShowsHall } from '@/dev/fixtures/shows';
import { BREEDING_FIXTURES } from '@/dev/fixtures/breeding';
import { runPlaythrough } from '@/dev/fixtures/playthrough';

const initialMode = residentIndexMode();
afterEach(() => setResidentIndexMode(initialMode));

/** Game-loop-like driving: short slices, the focus hopping between tanks (tank view ↔ room), a final flush. */
function drive(g: GameState, hours: number, slice = 0.25): GameState {
  const order = g.tankOrder;
  let t = 0;
  let i = 0;
  while (t < hours - 1e-9) {
    const focus = i % 7 === 6 ? null : order[Math.floor(i / 7) % Math.max(1, order.length)] ?? null;
    const dt = Math.min(slice, hours - t);
    advanceWorld(g, dt, { focusTankId: focus });
    t += dt;
    i++;
  }
  flushSimDebt(g);
  return g;
}

function runBoth(build: () => GameState, hours: number, slice?: number): { off: string; on: string } {
  setResidentIndexMode('off');
  const off = stateHash(drive(build(), hours, slice));
  setResidentIndexMode('on');
  const on = stateHash(drive(build(), hours, slice));
  return { off, on };
}

const WORLDS: [string, () => GameState, number][] = [
  ['big facility (staffed + shows hall)', () => buildShowsHall(staffUpLateGame(bigFacility())), 36],
  ['community freshwater', communityFw, 72],
  ['marine reef', marineReef, 72],
  ['staffed store', staffStore, 72],
  ['shows demo', buildShowsDemo, 72],
  ...Object.entries(BREEDING_FIXTURES).map(([name, build]): [string, () => GameState, number] => [name, build, 24 * 6]),
];

describe('perf2 residents index', () => {
  it.each(WORLDS)('A/B: %s gives the identical state with the index on and off', (_name, build, hours) => {
    const { off, on } = runBoth(build, hours);
    expect(on).toBe(off);
  }, 180_000);

  it('A/B: a scripted playthrough (buying, selling, breeding, moving) is identical with the index on and off', () => {
    for (const starterId of ['ocellaris_clownfish', 'pea_puffer'] as const) {
      setResidentIndexMode('off');
      const a = runPlaythrough({ starterId, seed: 4242, days: 20, longGame: true });
      setResidentIndexMode('on');
      const b = runPlaythrough({ starterId, seed: 4242, days: 20, longGame: true });
      expect(stateHash(b.state)).toBe(stateHash(a.state));
      expect(b.deaths).toEqual(a.deaths);
      expect(b.actions).toEqual(a.actions);
    }
  }, 180_000);

  it('VERIFY: every indexed lookup matches a fresh scan through long busy worlds', () => {
    setResidentIndexMode('verify');
    const v0 = residentIndexStats.verified;
    drive(buildShowsHall(staffUpLateGame(bigFacility())), 24 * 3, 0.5);
    for (const build of Object.values(BREEDING_FIXTURES)) drive(build(), 24 * 10, 1);
    for (const starterId of ['betta', 'axolotl', 'lined_seahorse'] as const) runPlaythrough({ starterId, seed: 99, days: 16, longGame: true });
    expect(residentIndexStats.verified - v0).toBeGreaterThan(1000);
  }, 240_000);

  it('scope rules: plain scans outside a scope, leavers drop out, joins need a touch', () => {
    setResidentIndexMode('on');
    const g = communityFw();
    const tankId = g.tankOrder[0];
    const before = creaturesInTank(g, tankId);
    expect(before.length).toBeGreaterThan(2);
    // Outside a scope: always a live scan.
    const b0 = residentIndexStats.builds;
    residentsOf(g, tankId);
    expect(residentIndexStats.builds).toBe(b0);

    withResidentIndex(g, () => {
      const first = residentsOf(g, tankId);
      expect(first).toEqual(before);
      expect(residentIndexStats.builds).toBe(b0 + 1);
      // Fresh arrays: a caller sorting its copy can't disturb the next caller.
      first.reverse();
      expect(residentsOf(g, tankId)).toEqual(before);
      // Leaving (death) needs no bookkeeping.
      const dead = before[0];
      dead.status = 'dead';
      expect(residentsOf(g, tankId)).toEqual(before.slice(1));
      expect(allResidents(g)).not.toContain(dead);
      // Joining without a touch is exactly what verify mode catches…
      setResidentIndexMode('verify');
      residentsOf(g, tankId); // (mode change dropped the index: rebuilds, consistent)
      dead.status = 'alive';
      expect(() => residentsOf(g, tankId)).toThrow(/stale index/);
      // …and a touch fixes.
      touchResidents();
      expect(residentsOf(g, tankId)).toEqual(before);
      // Replacing the creatures map wholesale is detected by identity.
      g.creatures = { ...g.creatures };
      expect(residentsOf(g, tankId)).toEqual(before);
    });
  });

  it('a touch inside a nested scope for another world also retires the outer index', () => {
    setResidentIndexMode('verify');
    const a = communityFw();
    const b = marineReef();
    const tankA = a.tankOrder[0];
    withResidentIndex(a, () => {
      const inA = residentsOf(a, tankA);
      const mover = inA[0];
      const other = a.tankOrder.find((id) => id !== tankA);
      expect(other).toBeTruthy();
      withResidentIndex(b, () => {
        residentsOf(b, b.tankOrder[0]);
        mover.tankId = other!; // a join into `other` in world A, announced while B's scope is active
        touchResidents();
      });
      expect(residentsOf(a, other!)).toContain(mover);
      expect(residentsOf(a, tankA)).not.toContain(mover);
    });
  });
});
