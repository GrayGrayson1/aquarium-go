/**
 * chunk 13 (SHARED-SHOPS.md §3.2 rule 11, §7) — a shared shop's visit, as the screens show it: which club, where the
 * player came from, the connection's phase, who is there, and a closing to explain. Not saved; never in `GameState`.
 * `src/state/sharedMode.ts` is the one flag the other layers read. OWNER: lane "social".
 */
import { create } from 'zustand';
import type { ClosingReason, SharedMember, SharedYou } from '@/types/shared';

/**
 * - `checking`: signed in, and shops open this month? (nothing on screen but busy buttons; nothing woken yet);
 * - `saving`: your own aquarium is being saved first;
 * - `waking`: the server is waking (its `/health`);
 * - `joining`: connected, waiting for the shop (the server may be catching it up);
 * - `open`: the shop is on screen;
 * - `reconnecting`: the connection dropped and is being made again (the shop stays on screen, frozen);
 * - `rejoining`: the player came back (a hidden tab, away too long) and the shop is being fetched again;
 * - `closed`: the server closed it for a reason the player is told (`closed`).
 */
export type SharedPhase = 'idle' | 'checking' | 'saving' | 'waking' | 'joining' | 'open' | 'reconnecting' | 'rejoining' | 'closed';

/** The shop is on screen (connected, or getting the connection back). */
export const onScreen = (p: SharedPhase): boolean => p === 'open' || p === 'reconnecting' || p === 'rejoining';

export interface SharedClosing {
  /** The server's reason (§8), or `signedOut`: this player's sign-in couldn't be had (ADR-0049). */
  why: ClosingReason | 'signedOut';
  until?: string;
  savedAt?: number;
}

/** A line over the shop while it catches up: a fresh snapshot, or a device that can't keep up (§7.6). */
export type SharedNotice = 'catchingUp' | 'slow' | null;

export interface SharedVisit {
  phase: SharedPhase;
  club: { id: string; name: string } | null;
  /** The shop's name, once the server says it (or the card did). */
  shopName: string;
  /** The owner's name, for "Only {owner} and the people they choose…". */
  ownerName: string;
  from: 'game' | 'title';
  you: SharedYou | null;
  members: SharedMember[];
  closing: SharedClosing | null;
  notice: SharedNotice;
  /** "Still here?" is up (§7.5). */
  stillHere: boolean;
  /** The first-time card is up. */
  firstTime: boolean;
  /** The owner is creating the club's shop (the new-game screens, then the connection). */
  creating: boolean;
}

export const INITIAL_VISIT: SharedVisit = {
  phase: 'idle',
  club: null,
  shopName: '',
  ownerName: '',
  from: 'game',
  you: null,
  members: [],
  closing: null,
  notice: null,
  stillHere: false,
  firstTime: false,
  creating: false,
};

export const useShared = create<SharedVisit>(() => ({ ...INITIAL_VISIT }));

export const patchShared = (p: Partial<SharedVisit>): void => useShared.setState(p);

/** May this player pause and change the speed (§5.4)? */
export const mayPause = (v: Pick<SharedVisit, 'you' | 'members'> = useShared.getState()): boolean => {
  const you = v.you;
  if (!you) return false;
  if (you.owner) return true;
  return v.members.find((m) => m.id === you.id)?.pause ?? you.pause;
};
