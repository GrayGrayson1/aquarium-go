/**
 * Chunk 10's dev-only connection to a shared-shop server (SHARED-SHOPS.md §3.3): it joins a shop (chunk 12: with a
 * sign-in token, a stub one on the stub server, and the build's identity), feeds the
 * server's steps to a headless replica (src/game/sharedLoop.ts), asks for a snapshot when the replica falls out of
 * step, and counts what it receives. The e2e tests (tests/e2e/shared/) and scripts/shared-measure.ts drive it from a
 * page; the game itself never imports it. Chunk 13 replaces it with the real connection in src/ui/shared.
 */
import type { GameState } from '@/types';
import type { Command } from '@/sim/commands';
import { SharedReplica, type OutOfStep } from '@/game/sharedLoop';
import { FRAME_SNAPSHOT_GZIP, SHARED_BUILD, type ClientMessage, type ServerMessage, type SharedMember } from '@/types/shared';

export interface SharedClientStats {
  /** Bytes and frames received, by message (`snapshot` for the binary frames). */
  bytes: Record<string, number>;
  frames: Record<string, number>;
  snapshots: number;
  resyncs: number;
  outOfStep: { why: OutOfStep; detail: string }[];
  rejects: { id: number; why: string }[];
  /** A command's round trip: sent, until the step that carries it is applied here (ms). */
  rtt: number[];
  /** Applying one `steps` message (ms), the longest. */
  maxBatchMs: number;
  closing: string | null;
}

export interface SharedClient {
  readonly replica: SharedReplica;
  you: string;
  members: SharedMember[];
  readonly stats: SharedClientStats;
  /** Send a command; its id. */
  send(c: Command): number;
  view(tank: string | null): void;
  /** The owner gives or takes pause and speed (§5.4). */
  grant(user: string, pause: boolean): void;
  here(): void;
  away(): void;
  close(): void;
  /** The replica's copy (null until the first snapshot). */
  state(): GameState | null;
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

const textBytes = (s: string) => new TextEncoder().encode(s).length;

/** Join `club`'s shop on the server at `url` (ws:// or wss://…/shop) as `token`'s player; resolves once the first snapshot is loaded. */
export function connectShared(url: string, club: string, token: string, opts: { plain?: boolean } = {}): Promise<SharedClient> {
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  const replica = new SharedReplica();
  const stats: SharedClientStats = { bytes: {}, frames: {}, snapshots: 0, resyncs: 0, outOfStep: [], rejects: [], rtt: [], maxBatchMs: 0, closing: null };
  const sentAt = new Map<number, number>();
  let nextId = 1;
  let pendingWelcome: Extract<ServerMessage, { t: 'welcome' }> | null = null;
  /** Messages that arrive while a snapshot decompresses wait, in order. */
  let queue: Promise<void> = Promise.resolve();
  const tell = (m: ClientMessage) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  };
  const client: SharedClient = {
    replica,
    you: '',
    members: [],
    stats,
    send(c) {
      const id = nextId++;
      sentAt.set(id, performance.now());
      tell({ t: 'cmd', id, c });
      return id;
    },
    view: (tank) => tell({ t: 'view', tank }),
    grant: (user, pause) => tell({ t: 'grant', user, pause }),
    here: () => tell({ t: 'here' }),
    away: () => tell({ t: 'away' }),
    close: () => ws.close(),
    state: () => replica.state,
  };
  replica.onOutOfStep = (why, detail) => {
    stats.outOfStep.push({ why, detail });
    stats.resyncs++;
    tell({ t: 'resync' });
  };
  const count = (kind: string, bytes: number) => {
    stats.bytes[kind] = (stats.bytes[kind] ?? 0) + bytes;
    stats.frames[kind] = (stats.frames[kind] ?? 0) + 1;
  };
  return new Promise((resolve, reject) => {
    let ready = false;
    ws.onopen = () => tell({ t: 'hello', token, build: SHARED_BUILD, club, plain: opts.plain });
    ws.onerror = () => {
      if (!ready) reject(new Error(`could not connect to ${url}`));
    };
    ws.onclose = () => {
      if (!ready) reject(new Error(`closed before joining (${stats.closing ?? 'no reason'})`));
    };
    ws.onmessage = (ev: MessageEvent<string | ArrayBuffer>) => {
      const data = ev.data;
      queue = queue.then(async () => {
        if (typeof data !== 'string') {
          const bytes = new Uint8Array(data);
          count('snapshot', bytes.length);
          const body = bytes.subarray(1);
          const json = bytes[0] === FRAME_SNAPSHOT_GZIP ? await gunzip(body) : new TextDecoder().decode(body);
          const w = pendingWelcome;
          if (!w) return;
          pendingWelcome = null;
          replica.load(JSON.parse(json) as GameState, w.n, w.full);
          stats.snapshots++;
          if (!ready) {
            ready = true;
            resolve(client);
          }
          return;
        }
        const m = JSON.parse(data) as ServerMessage;
        count(m.t, textBytes(data));
        switch (m.t) {
          case 'welcome':
            pendingWelcome = m;
            client.you = m.you.id;
            client.members = m.members;
            break;
          case 'members':
            client.members = m.members;
            break;
          case 'steps': {
            const t0 = performance.now();
            replica.apply(m.s);
            const done = performance.now();
            stats.maxBatchMs = Math.max(stats.maxBatchMs, done - t0);
            for (const s of m.s)
              for (const sc of s.cmds ?? [])
                if (sc.by === client.you && sc.id !== undefined && sentAt.has(sc.id)) {
                  stats.rtt.push(done - sentAt.get(sc.id)!);
                  sentAt.delete(sc.id);
                }
            break;
          }
          case 'reject':
            stats.rejects.push({ id: m.id, why: m.why });
            break;
          case 'closing':
            stats.closing = m.why;
            break;
        }
      });
    };
  });
}
