/**
 * Where a room's host runs (SHARED-SHOPS.md §3.2 rule 9): its own worker thread in the server, so every
 * module-level cache of the simulation belongs to one shop; or, for the unit tests, this thread (`inline`), with the
 * same messages both ways. A worker starts with an empty environment: it never sees the server's password.
 */
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { RoomHost, type HostClock, type HostTimers } from './host';
import type { FromRoom, ToRoom } from './protocol';

export interface RoomRunner {
  send(m: ToRoom): void;
  onMessage(fn: (m: FromRoom) => void): void;
  onError(fn: (e: Error) => void): void;
  terminate(): void;
}

const WORKER = (): string => fileURLToPath(new URL('./roomWorker.js', import.meta.url));

export function workerRunner(): RoomRunner {
  const w = new Worker(WORKER(), { workerData: { mode: 'room' }, env: {} });
  return {
    send: (m) => w.postMessage(m),
    onMessage: (fn) => void w.on('message', fn),
    onError: (fn) => void w.on('error', fn),
    terminate: () => void w.terminate(),
  };
}

/** The host in this thread: each message delivered on a later turn, as a worker's would be. */
export function inlineRunner(clock?: HostClock, timers?: HostTimers): RoomRunner {
  let toMain: (m: FromRoom) => void = () => {};
  let toHost: (m: ToRoom) => void = () => {};
  let ended = false;
  const host = new RoomHost(
    {
      post: (m) => queueMicrotask(() => !ended && toMain(m)),
      on: (h) => (toHost = h),
    },
    clock,
    timers,
  );
  return {
    send: (m) => queueMicrotask(() => !ended && toHost(m)),
    onMessage: (fn) => (toMain = fn),
    onError: () => {},
    terminate: () => {
      ended = true;
      host.dispose();
    },
  };
}
