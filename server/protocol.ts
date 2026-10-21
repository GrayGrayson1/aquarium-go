/**
 * The messages between the server's main thread (./app.ts) and a room's host (./host.ts), which runs in the room's
 * own worker thread (SHARED-SHOPS.md §3.2 rule 9) or, in the unit tests, in the main thread. The host reaches the
 * database only through the main thread (`rpc`), so a worker never holds the server's password, and the main thread
 * lets a room touch only its own club's rows.
 */
import type { ClosingReason, SharedYou } from '@/types/shared';
import type { OutKind, RoomStats } from './room';
import type { Store } from './store';

export type OpenMode = { mode: 'wake' } | { mode: 'create'; user: string; name: string; starter: string; starterName: string; seed?: number };

export type ToRoom =
  | ({ t: 'open'; club: string; holder: string; build: string } & OpenMode)
  | { t: 'join'; you: SharedYou; plain: boolean }
  | { t: 'leave'; user: string }
  | { t: 'msg'; user: string; text: string }
  | { t: 'removed'; user: string }
  /** Save and close: `idle` (empty for 15 minutes) says nothing to anyone; the rest close every member with that reason. */
  | { t: 'stop'; why: ClosingReason | 'idle'; until?: string }
  | { t: 'stats'; id: number }
  | { t: 'rpc'; id: number; ok: boolean; value?: unknown; error?: string };

export type FromRoom =
  | { t: 'opened'; ok: true; name: string; pausers: string[] }
  | { t: 'opened'; ok: false; why: ClosingReason }
  | { t: 'out'; to: string[]; kind: OutKind; text?: string; bin?: Uint8Array }
  | { t: 'drop'; user: string }
  | { t: 'rpc'; id: number; fn: RoomCall; args: unknown[] }
  | { t: 'stats'; id: number; stats: RoomStats | null; cpu?: NodeJS.CpuUsage }
  | { t: 'stopped' }
  | { t: 'log'; line: string };

/** The store calls a room may make, each about its own club (the first argument). */
/** chunk 13: `member`, so a room can name its owner (welcome.shop.owner), for its own club only (the club is its second argument). */
export const ROOM_CALLS = ['shopGet', 'shopCreate', 'shopPut', 'shopTake', 'shopRelease', 'setPausers', 'photoPut', 'photoGet', 'photoHashes', 'photosDelete', 'member'] as const satisfies readonly (keyof Store)[];
export type RoomCall = (typeof ROOM_CALLS)[number];

export interface RoomPort {
  post(m: FromRoom): void;
  on(handler: (m: ToRoom) => void): void;
}
