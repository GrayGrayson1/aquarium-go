/**
 * One shop's worker thread (SHARED-SHOPS.md §3.2 rule 9): every module-level cache, index and registry of the
 * simulation belongs to this shop alone, as in a browser. Mode `room` runs a live room for the main thread's
 * connections; mode `replay` builds the replay test's step log and exits.
 */
import { parentPort, workerData } from 'node:worker_threads';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { Room, TICK_MS, parseClientMessage } from './room';
import { stepLog } from './replay';
import type { GameState } from '@/types';
import { decodeRecord } from '@/persistence/serialize';

export type ToWorker =
  | { t: 'join'; conn: string; name: string; plain: boolean }
  | { t: 'leave'; conn: string }
  | { t: 'msg'; conn: string; text: string }
  | { t: 'stats'; id: number }
  | { t: 'stop'; why: 'cap' | 'restart' };

const port = parentPort!;
/** A wake: decoded, migrated and repaired, before anyone has the shop (§3.2 rule 10). */
const loadShop = (text: string): GameState => decodeRecord(text, 'The shop').state;
const data = workerData as { mode: 'room'; text: string } | { mode: 'replay'; text: string; speed: 1 | 3 | 10; hours: number };

if (data.mode === 'replay') {
  const t0 = performance.now();
  const log = stepLog(loadShop(data.text), { speed: data.speed, hours: data.hours });
  port.postMessage({ t: 'replay', log, ms: performance.now() - t0 });
} else {
  const room = new Room(loadShop(data.text), {
    send: (o) => {
      if (o.bin) port.postMessage({ t: 'out', ...o }, [o.bin.buffer as ArrayBuffer]);
      else port.postMessage({ t: 'out', ...o });
    },
    gzip: (s) => gzipSync(s),
    later: (ms, fn) => void setTimeout(fn, ms),
    now: () => performance.now(),
    log: (line) => console.log(`[room] ${line}`),
  });
  const timer = setInterval(() => {
    room.tick();
    if (room.stopped) {
      clearInterval(timer);
      port.postMessage({ t: 'stopped' });
    }
  }, TICK_MS);
  port.on('message', (m: ToWorker) => {
    switch (m.t) {
      case 'join':
        room.join(m.conn, m.name, m.plain);
        break;
      case 'leave':
        room.leave(m.conn);
        break;
      case 'msg': {
        const msg = parseClientMessage(m.text);
        if (msg) room.handle(m.conn, msg);
        break;
      }
      case 'stats':
        port.postMessage({ t: 'stats', id: m.id, stats: room.snapshotStats(), cpu: process.cpuUsage() });
        break;
      case 'stop':
        room.stop(m.why);
        break;
    }
  });
}
