/**
 * A browser's copy of a shared shop (SHARED-SHOPS.md §3.1, §3.2): it applies the server's steps in order through the
 * same step block as the server (src/sim/sharedStep.ts) and compares the server's fingerprints with its own in idle
 * time, so a drift is caught within one fingerprint. Chunk 10's replica is headless (the dev connection,
 * src/dev/sharedProto.ts, drives it, and the replay test); chunk 13 publishes it to the game store.
 */
import type { GameState } from '@/types';
import { runSharedStep, type SharedStep } from '@/sim/sharedStep';
import { deepClone } from '@/sim/clone';
import { stateHash } from '@/persistence/hash';

export type OutOfStep = 'fingerprint' | 'gap' | 'error';

export interface ReplicaStats {
  steps: number;
  /** Time spent in step blocks (ms), and the longest one. */
  stepMs: number;
  maxStepMs: number;
  /** Fingerprints compared, and the time spent on them (ms). */
  checks: number;
  checkMs: number;
  mismatches: number;
}

type Idle = (fn: () => void) => void;

/** Run `fn` when the browser is idle (within 2 s), or soon where it can't say. */
export const whenIdle: Idle = (fn) => {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 2000 });
  else setTimeout(fn, 0);
};

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : 0);

export class SharedReplica {
  state: GameState | null = null;
  /** The last step applied. */
  n = 0;
  /** The full-detail list in force. */
  full: string[] = [];
  /** Out of step: stops applying until the next snapshot. */
  stalled: OutOfStep | null = null;
  readonly stats: ReplicaStats = { steps: 0, stepMs: 0, maxStepMs: 0, checks: 0, checkMs: 0, mismatches: 0 };
  /** Called once each time the copy falls out of step (ask the server for a snapshot). */
  onOutOfStep: (why: OutOfStep, detail: string) => void = () => {};
  /** Called after each fingerprint check (tests and the measurements). */
  onCheck: (n: number, ok: boolean) => void = () => {};
  /** Bumped by each snapshot, so a check queued before it is dropped. */
  private generation = 0;

  constructor(private readonly idle: Idle = whenIdle) {}

  /** Start again from a snapshot: the copy after step `n`, with the full-detail list then in force. */
  load(state: GameState, n: number, full: readonly string[]): void {
    this.state = state;
    this.n = n;
    this.full = [...full];
    this.stalled = null;
    this.generation++;
  }

  /** Apply steps in order. Steps the copy already has (they crossed a snapshot) are skipped. */
  apply(steps: readonly SharedStep[]): void {
    for (const step of steps) {
      if (!this.state || this.stalled) return;
      if (step.n <= this.n) continue;
      if (step.n !== this.n + 1) return this.fail('gap', `expected step ${this.n + 1}, got ${step.n}`);
      if (step.full) this.full = [...step.full];
      const t0 = now();
      try {
        runSharedStep(this.state, step, this.full);
      } catch (e) {
        return this.fail('error', `step ${step.n}: ${e instanceof Error ? e.message : String(e)}`);
      }
      const ms = now() - t0;
      this.stats.steps++;
      this.stats.stepMs += ms;
      this.stats.maxStepMs = Math.max(this.stats.maxStepMs, ms);
      this.n = step.n;
      if (step.fp) this.check(step.n, step.fp);
    }
  }

  /** Copy now (cheap), hash in idle time (about 9 ms on a big shop): later steps don't wait for it. */
  private check(n: number, fp: string): void {
    const copy = deepClone(this.state!);
    const gen = this.generation;
    this.idle(() => {
      if (gen !== this.generation) return;
      const t0 = now();
      const mine = stateHash(copy);
      this.stats.checks++;
      this.stats.checkMs += now() - t0;
      const ok = mine === fp;
      this.onCheck(n, ok);
      if (!ok && !this.stalled) {
        this.stats.mismatches++;
        this.fail('fingerprint', `step ${n}: ${mine} != ${fp}`);
      }
    });
  }

  private fail(why: OutOfStep, detail: string): void {
    this.stalled = why;
    this.onOutOfStep(why, detail);
  }
}
