/**
 * Chunk 10's test page (served by the e2e Vite server at /tests/e2e/shared/page.html): the shared-shop replica and the
 * dev connection on `window.__shared`, without the game. `replay` applies a server's step log through the replica
 * (fingerprints checked at once) and reports; `connect` joins a shop on a server.
 */
import { SharedReplica } from '@/game/sharedLoop';
import { connectShared } from '@/dev/sharedProto';
import { stateHash } from '@/persistence/hash';
import type { GameState } from '@/types';
import type { StepLog } from '../../../server/replay';

export interface ReplayReport {
  applied: number;
  steps: number;
  checks: number;
  /** The first step whose fingerprint differed, and why the replica stopped. */
  firstMismatch: number | null;
  stalled: string | null;
  ms: number;
  ua: string;
}

function replay(log: StepLog): ReplayReport {
  const r = new SharedReplica((fn) => fn());
  let firstMismatch: number | null = null;
  r.onCheck = (n, ok) => {
    if (!ok && firstMismatch === null) firstMismatch = n;
  };
  r.load(JSON.parse(log.snapshot) as GameState, log.n, log.full);
  const t0 = performance.now();
  r.apply(log.steps);
  return {
    applied: r.n,
    steps: log.steps.length ? log.steps[log.steps.length - 1].n : 0,
    checks: r.stats.checks,
    firstMismatch,
    stalled: r.stalled,
    ms: performance.now() - t0,
    ua: navigator.userAgent,
  };
}

(window as unknown as { __shared: unknown }).__shared = { replay, connect: connectShared, stateHash, ready: true };
