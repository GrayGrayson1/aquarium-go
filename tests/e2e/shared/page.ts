/**
 * Chunk 10's test page (served by the e2e Vite server at /tests/e2e/shared/page.html): the shared-shop replica and the
 * dev connection on `window.__shared`, without the game. `replay` applies a server's step log through the replica
 * (fingerprints checked at once) and reports; `connect` joins a shop on a server.
 */
import { SharedReplica } from '@/game/sharedLoop';
import { connectShared } from '@/dev/sharedProto';
import { stateHash } from '@/persistence/hash';
import { evaluateTank, previewAddition } from '@/sim/compat';
import { stateReachability } from '@/sim/facility/layout';
import { beautyScore } from '@/sim/aquascape';
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

/**
 * What the interface reads between steps (compatibility with hypothetical candidates, reachability, beauty): caches
 * this copy fills and the server's doesn't, so a cache that isn't exact would show as a mismatch.
 */
function interfaceReads(g: GameState): void {
  for (const id of g.tankOrder.slice(0, 6)) {
    evaluateTank(g, id);
    const sp = Object.values(g.creatures).find((c) => c.tankId === id)?.speciesId;
    if (sp) previewAddition(g, id, { speciesId: sp, count: 2 });
    beautyScore(g, g.tanks[id]);
  }
  stateReachability(g);
}

function replay(log: StepLog, opts: { reads?: boolean } = {}): ReplayReport {
  const r = new SharedReplica((fn) => fn());
  let firstMismatch: number | null = null;
  r.onCheck = (n, ok) => {
    if (!ok && firstMismatch === null) firstMismatch = n;
  };
  r.load(JSON.parse(log.snapshot) as GameState, log.n, log.full);
  const t0 = performance.now();
  if (opts.reads) {
    for (let i = 0; i < log.steps.length; i++) {
      r.apply([log.steps[i]]);
      if (i % 3 === 0 && r.state) interfaceReads(r.state);
    }
  } else r.apply(log.steps);
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
