/**
 * Shared shops' messages (SHARED-SHOPS.md §3.3): JSON text frames, except snapshots and photos (binary frames: a tag
 * byte, then the shop's JSON, gzipped unless the browser asked for plain; or a photo, §4.4). Chunk 12 adds the
 * account token, the build identity, `create`, `token`, `grant` and photos to chunk 10's subset.
 */
import type { Command } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';
import type { OfflineSummary } from '@/sim/catchUp';

/** A binary frame's first byte. */
export const FRAME_SNAPSHOT_GZIP = 1;
export const FRAME_SNAPSHOT_PLAIN = 2;
/** A photo (§4.4): the tag, the hash's 64 hex characters, a type byte (PHOTO_TYPES), then the image's bytes. */
export const FRAME_PHOTO = 3;
export const PHOTO_TYPES = ['', 'image/webp', 'image/jpeg'] as const;

/** A stored listing photo's reference in a shared shop (§4.4): `p:` and the image's SHA-256 in lowercase hex. */
export const PHOTO_REF = /^p:[0-9a-f]{64}$/;

declare const __SHARED_BUILD_HASH__: string | undefined;
declare const __APP_VERSION__: string | undefined;

/**
 * The build's identity (§5.1): a hash of everything every copy runs to stay in step (the simulation, the data, the
 * types, the pure persistence files), stamped by vite.sharedBuild.ts into the game and the server, and the release
 * version, which says which side is newer. Builds with the same hash play together.
 */
export interface SharedBuild {
  hash: string;
  version: string;
}

export const SHARED_BUILD: SharedBuild = {
  hash: typeof __SHARED_BUILD_HASH__ === 'string' && __SHARED_BUILD_HASH__ ? __SHARED_BUILD_HASH__ : 'dev',
  version: typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '0.0.0',
};

export interface SharedMember {
  /** The player's account id: the same on every visit, so first one wins knows their own earlier commands. */
  id: string;
  name: string;
  /** On screen and in use (§5.5). */
  here: boolean;
  /** May pause and change the speed (§5.4). */
  pause: boolean;
}

/** What the server tells a member they may do. */
export interface SharedYou {
  id: string;
  name: string;
  /** The game's owner: creates shops, grants pause and speed. */
  owner: boolean;
  pause: boolean;
}

export type ClientMessage =
  | { t: 'hello'; token: string; build: SharedBuild; club: string; plain?: boolean }
  /**
   * The owner makes the club's shop (§3.3, ADR-0045 decision 5): the new-game screens' shop name, starter and its name,
   * and the seed the starters were previewed with, so the shop's starter is the one the owner saw.
   */
  | { t: 'create'; token: string; build: SharedBuild; club: string; name: string; starter: string; starterName: string; seed?: number; plain?: boolean }
  | { t: 'cmd'; id: number; c: Command }
  | { t: 'view'; tank: string | null }
  | { t: 'here' }
  | { t: 'away' }
  | { t: 'input' }
  | { t: 'token'; token: string }
  | { t: 'resync' }
  | { t: 'grant'; user: string; pause: boolean }
  | { t: 'photo'; hash: string };

/**
 * Why the server closes a connection (§8). `gone`: the club has no shared shop (it was removed, or never made), a case
 * chunk 13 still needs words for (SHARED-SHOPS.md §8, "Words still to approve").
 */
export type ClosingReason = 'cap' | 'hours' | 'full' | 'build' | 'updating' | 'removed' | 'elsewhere' | 'fault' | 'restart' | 'outofstep' | 'gone';

/**
 * Why a command wasn't applied (§3.3): `forbidden`, pause or speed without permission (§5.4); `malformed`, it failed
 * `validateCommand` or the server's own checks; `rate`, too many actions; `failed`, it threw on the server.
 */
export type RejectReason = 'forbidden' | 'malformed' | 'rate' | 'failed';

/**
 * Why the server ends a connection with no words to show (chunk 12): `sign-in`, the token can't be checked (refresh the
 * session and try again); `away`, away 10 minutes (reconnect when the player is back); `protocol`, a message the server
 * refuses (a bug); `server`, the database didn't answer (reconnect with the usual waits). It comes as a message because
 * Render's proxy doesn't pass the server's close frames on.
 */
export type ByeReason = 'sign-in' | 'away' | 'protocol' | 'server';

export interface ClosingMessage {
  t: 'closing';
  why: ClosingReason;
  /** `cap`, `hours`: the day shared shops open again (`YYYY-MM-DD`). */
  until?: string;
  /** `fault`, `restart`: when the shop was last saved (real ms). */
  savedAt?: number;
}

export type ServerMessage =
  /** chunk 13: `shop.owner`, the owner's name (the approved "Only {owner} and the people they choose…"). */
  | { t: 'welcome'; you: SharedYou; shop: { club: string; name: string; owner?: string }; members: SharedMember[]; n: number; full: string[]; catchUp?: OfflineSummary }
  /** chunk 13: `at`, the server's clock (real ms) when it sent them, so a browser can tell it has fallen behind (§7.6). */
  | { t: 'steps'; s: SharedStep[]; at?: number }
  | { t: 'reject'; id: number; why: RejectReason }
  | { t: 'members'; members: SharedMember[] }
  | ClosingMessage
  | { t: 'bye'; why: ByeReason };
