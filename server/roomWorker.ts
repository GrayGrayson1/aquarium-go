/**
 * One shop's worker thread (SHARED-SHOPS.md §3.2 rule 9): every module-level cache, index and registry of the
 * simulation belongs to this shop alone, as in a browser. Mode `room` runs a room's host (./host.ts), which reaches
 * the database only through the main thread, so this thread starts with an empty environment and never holds the
 * server's password; mode `replay` builds the cross-engine replay's step log from a stub shop and exits.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { stepLog } from './replay';
import { RoomHost } from './host';
import type { FromRoom, ToRoom } from './protocol';
import { decodeRecord } from '@/persistence/serialize';

const port = parentPort!;
const data = workerData as { mode: 'room' } | { mode: 'replay'; text: string; speed: 1 | 3 | 10; hours: number };

if (data.mode === 'replay') {
  const t0 = performance.now();
  const log = stepLog(decodeRecord(data.text, 'The shop').state, { speed: data.speed, hours: data.hours });
  port.postMessage({ t: 'replay', log, ms: performance.now() - t0 });
} else {
  new RoomHost({
    post: (m: FromRoom) => port.postMessage(m),
    on: (handler) => port.on('message', (m: ToRoom) => handler(m)),
  });
}
