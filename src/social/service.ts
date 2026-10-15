/**
 * The Social service (0.5 spec §13.6). OWNER: lane "social".
 *
 * There is no server in 0.5: everything social goes through this interface, implemented by a local stub
 * (./localStub.ts), so the UI, routes and states are real and a backend can be swapped in later without UI changes.
 * The UI reaches the service only through ./index.ts (`socialService()`). All social data lives outside the save, and
 * the whole Social stub is reachable only in dev mode until a real backend exists (ADR-0005 decision 3, SOC-011).
 *
 * Beyond §13.6: a club the player belongs to carries the month they joined (ADR-0034 decision 3), `addFriend` rejects
 * a code that matches no one, and `news()` says how many trades and club items the player hasn't seen (the Social dot,
 * §5.4; SOC-004 A5).
 */

export interface SocialUser {
  id: string;
  email: string;
  displayName: string;
  friendCode: string;
}

export interface Club {
  id: string;
  name: string;
  initials: string;
  /** The avatar's gradient, top-left to bottom-right. */
  colors: [string, string];
  members: number;
  blurb: string;
  nextEvent?: { title: string; when: string };
  /** lane:social (ADR-0034 decision 3) — a club the player belongs to: the month they joined, `YYYY-MM`. */
  joined?: string;
}

export interface TradeOffer {
  id: string;
  from: string;
  gives: string;
  wants: string;
  createdAt: string;
}

export interface FriendAquarium {
  id: string;
  owner: string;
  title: string;
  /** null: not a home tank (a public aquarium). */
  gallons: number | null;
  likes: number;
  snapshotUrl: string;
  updatedAt: string;
}

export type LeaderboardKind = 'collection_value' | 'prismatics' | 'show_wins';
export const LEADERBOARD_KINDS: readonly LeaderboardKind[] = ['collection_value', 'prismatics', 'show_wins'];

export interface LeaderboardRow {
  rank: number;
  name: string;
  value: number;
  me?: boolean;
}

/** Why a call failed: bad input ('invalid') or no connection ('network', a real backend only; the stub can fake it). */
export interface SocialError {
  code: 'invalid' | 'network';
}

export const isSocialError = (e: unknown): e is SocialError => !!e && typeof e === 'object' && ((e as SocialError).code === 'invalid' || (e as SocialError).code === 'network');

export interface SocialNews {
  /** Trades the player hasn't seen yet. */
  trades: number;
  /** New club items (an event, a post) the player hasn't seen yet. */
  clubs: number;
}

export interface SocialService {
  currentUser(): Promise<SocialUser | null>;
  /** Rejects with `{ code: 'invalid' | 'network' }`. */
  signIn(email: string, password: string): Promise<SocialUser>;
  signUp(email: string, password: string): Promise<SocialUser>;
  signOut(): Promise<void>;
  clubs(): Promise<{ mine: Club[]; suggested: Club[] }>;
  /** null = expired or unknown. */
  resolveInvite(code: string): Promise<{ club: Club; alreadyMember: boolean } | null>;
  joinClub(clubId: string): Promise<void>;
  trades(): Promise<TradeOffer[]>;
  friendsAquariums(): Promise<FriendAquarium[]>;
  /** Rejects with `{ code: 'invalid' }` when the code matches no one. */
  addFriend(code: string): Promise<void>;
  leaderboard(kind: LeaderboardKind): Promise<{ rows: LeaderboardRow[]; me: LeaderboardRow }>;
  /** lane:social — unseen trades and club items (the Social dot). */
  news(): Promise<SocialNews>;
  /** lane:social — the player has looked at Social's trades and clubs: what's there now is seen. */
  markSeen(): Promise<void>;
}

/** The sign-in rule (stub and future server alike, §13.2): an email shaped like x@y.z and a password of 8+ characters. */
export function validCredentials(email: string, password: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 8;
}

/** An invite code as typed or pasted, in its canonical form ("highland-4821 " → "HIGHLAND-4821"). */
export const normalizeCode = (code: string): string => code.trim().toUpperCase();

/** Does this look like an invite code (WORD-1234), as opposed to a club name being searched for? */
export const looksLikeInvite = (text: string): boolean => /^[A-Z]{2,}-\d{3,}$/.test(normalizeCode(text));

/** A friend code's shape (MYAQUA-7Q2): letters and digits, a dash, three letters or digits. */
export const looksLikeFriendCode = (text: string): boolean => /^[A-Z0-9]{3,12}-[A-Z0-9]{3}$/.test(normalizeCode(text));
