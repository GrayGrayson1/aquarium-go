// @vitest-environment node
/**
 * lane:core (chunk 4 review; the B-168 class) — simRng(state) is one stream: every draw continues from state.rngState.
 * A generator made earlier, while other code drew (a tank settled for a move during a step, a sale settling its tanks),
 * used to replay the numbers already drawn and write its own state back, discarding the other draws.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { mulberry32, simRng } from '@/sim/rng';

const stateAt = (rngState: number) => ({ rngState }) as GameState;

describe('simRng is one stream', () => {
  it('a lone generator draws exactly what mulberry32 does from the same state, and stores where it ended', () => {
    const s = stateAt(987654321);
    const ref = mulberry32(987654321);
    const rng = simRng(s);
    const got = [rng.next(), rng.range(2, 5), rng.int(1, 6), rng.chance(0.5), rng.gauss(), rng.pick(['a', 'b', 'c'])];
    const want = [ref.next(), ref.range(2, 5), ref.int(1, 6), ref.chance(0.5), ref.gauss(), ref.pick(['a', 'b', 'c'])];
    expect(got).toEqual(want);
    expect(s.rngState).toBe(ref.state());
    expect(rng.state()).toBe(ref.state());
  });

  it('two generators made from the same state and drawn in turn continue each other, never replaying a number', () => {
    const s = stateAt(42);
    const early = simRng(s); // e.g. the world systems' generator
    const late = simRng(s); // e.g. a settled tank's step, drawing in between
    const interleaved = [early.next(), late.next(), late.next(), early.next()];
    const ref = mulberry32(42);
    expect(interleaved).toEqual([ref.next(), ref.next(), ref.next(), ref.next()]);
    expect(new Set(interleaved).size).toBe(4);
    expect(s.rngState).toBe(ref.state());
  });

  it('a generator follows a state that other code moved on (no write-back of a stale state)', () => {
    const s = stateAt(7);
    const rng = simRng(s);
    rng.next();
    const other = simRng(s);
    for (let i = 0; i < 5; i++) other.next();
    const after = s.rngState;
    const ref = mulberry32(after);
    expect(rng.next()).toBe(ref.next());
    expect(s.rngState).toBe(ref.state());
  });
});
