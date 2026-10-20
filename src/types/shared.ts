/**
 * Shared shops' messages (SHARED-SHOPS.md §3.3): JSON text frames, except snapshots (a binary frame: a tag byte, then
 * the shop's JSON, gzipped unless the browser asked for plain). Chunk 10's prototype uses this subset; chunk 12 adds
 * the account token, the build identity, `create`, `token`, `grant` and photos.
 */
import type { Command } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';

/** A binary frame's first byte. */
export const FRAME_SNAPSHOT_GZIP = 1;
export const FRAME_SNAPSHOT_PLAIN = 2;

export interface SharedMember {
  id: string;
  name: string;
  /** On screen and in use (§5.5). */
  here: boolean;
}

export type ClientMessage =
  | { t: 'hello'; build: string; club: string; name: string; plain?: boolean }
  | { t: 'cmd'; id: number; c: Command }
  | { t: 'view'; tank: string | null }
  | { t: 'here' }
  | { t: 'away' }
  | { t: 'input' }
  | { t: 'resync' };

export type ClosingReason = 'cap' | 'hours' | 'full' | 'build' | 'updating' | 'removed' | 'elsewhere' | 'fault' | 'restart' | 'outofstep';

export type ServerMessage =
  | { t: 'welcome'; you: string; members: SharedMember[]; n: number; full: string[] }
  | { t: 'steps'; s: SharedStep[] }
  | { t: 'reject'; id: number; why: string }
  | { t: 'members'; members: SharedMember[] }
  | { t: 'closing'; why: ClosingReason };
