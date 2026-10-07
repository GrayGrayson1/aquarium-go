/**
 * Vitest setup (vitest.config.ts setupFiles; ADR-0010, BF-002). Changes no test.
 *
 * A Vitest worker reports progress to the main process over RPC, and each call starts a 60 s reply timer. The runner
 * goes from one test to the next on microtasks only, so a file of long synchronous simulation tests (e.g.
 * playthrough-starters, ~62 s on a slower machine) never lets the worker's event loop read the reply: when the loop
 * frees up, the timer fires first and Vitest reports "Timeout calling onTaskUpdate", failing a run in which every test
 * passed. Waiting for setImmediate after each test lets the loop pass through its I/O phase, where the reply is read.
 */
import { afterEach } from 'vitest';

/**
 * The real setImmediate, taken when this file loads: a test that left fake timers on past its own afterEach would
 * otherwise hang this hook for its full timeout (BACKLOG B-011).
 */
const realSetImmediate = globalThis.setImmediate;

afterEach(() => new Promise<void>((resolve) => realSetImmediate(resolve)));
