/**
 * The Social service (0.5 spec §13.6). OWNER: lane "social".
 *
 * Everything social goes through this interface, implemented by a local stub (./localStub.ts: dev mode and every e2e
 * build) and, from chunk 8, by the Supabase service (./supabase: the players' build once a project is configured;
 * ADR-0038, docs/agent/design/ONLINE-STAGE1.md §5). The UI reaches the service only through ./index.ts
 * (`socialService()`). All social data lives outside the save.
 *
 * Beyond §13.6: a club the player belongs to carries the month they joined (ADR-0034 decision 3), `addFriend` rejects
 * a code that matches no one, and `news()` says how many trades and club items the player hasn't seen (the Social dot,
 * §5.4; SOC-004 A5). Chunk 8 adds sign-up details (a club's invite code, the name friends see, the 13-and-over box;
 * ADR-0039, ADR-0040), the owner's clubs and their invite codes, friend requests, account deletion, the player's
 * standing report and the online save (§5.1).
 */

export interface SocialUser {
  id: string;
  email: string;
  displayName: string;
  friendCode: string;
  /** chunk 8 (ADR-0040 decision 2) — the owner's account: may create clubs and sees their invite codes. */
  isOwner?: boolean;
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
  /** chunk 8 — only on clubs the player created (the owner's): the club's invite code, which is also its sign-up code. */
  inviteCode?: string;
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
  /** chunk 8 — null: no likes count (the real service has no likes yet; the tile drops the count). */
  likes: number | null;
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

/**
 * Why a call failed: bad input ('invalid') or no connection ('network'; the stub can fake it). Chunk 8 (§5.1): a wrong
 * email or password ('credentials'), an email that has an account ('taken'), an invite code that opens nothing
 * ('invite'), the age box not ticked ('age'), a name that isn't 1 to 30 characters ('name'), and a call only the owner
 * may make ('forbidden'). Chunk 9 (B2): the session belongs to another account than the one the game named
 * ('account': another tab signed out and in as someone else).
 */
export interface SocialError {
  code: SocialErrorCode;
}

export const SOCIAL_ERROR_CODES = ['invalid', 'network', 'credentials', 'taken', 'invite', 'age', 'name', 'forbidden', 'account'] as const;
export type SocialErrorCode = (typeof SOCIAL_ERROR_CODES)[number];

export const isSocialError = (e: unknown): e is SocialError => !!e && typeof e === 'object' && (SOCIAL_ERROR_CODES as readonly unknown[]).includes((e as SocialError).code);

/** chunk 8 — what sign-up asks besides the email and password (ADR-0039 decision 4, ADR-0040 decision 2). */
export interface SignUpDetails {
  /** "Name friends see": 1 to 30 characters after trimming. */
  displayName: string;
  /** A club's invite code (also how the new player joins that club). */
  inviteCode: string;
  /** "I'm 13 or older, or I'm a parent or guardian signing up for my child." */
  ageConfirmed: boolean;
}

/** chunk 8 — someone who added the player by friend code and isn't added back yet. */
export interface FriendRequest {
  id: string;
  name: string;
  createdAt: string;
}

/** chunk 8 — the player's own numbers, sent so friends and club members can rank them (ADR-0038: trusted). */
export interface StandingReport {
  shopName: string;
  gallons: number;
  collectionValue: number;
  prismatics: number;
  showWins: number;
  /** A small JPEG or WebP data URL of the aquarium (≤ 200,000 characters); omitted to keep the last one. */
  snapshot?: string | null;
}

/** chunk 8 (§6) — what the server knows about the account's online save, without its body. */
export interface CloudSaveMeta {
  /** Goes up by one with every write; 0 never appears (no row). */
  revision: number;
  saveId: string;
  schemaVersion: number;
  /** The writing device's clock when it saved (ms). */
  savedAt: number;
  hour: number;
  shopName: string;
  day: number;
  money: number;
}

export type CloudEncoding = 'gzip-base64' | 'json';

/** chunk 8 — a save as it travels: `exportSaveText`'s text, gzipped and base64'd where the browser can. */
export interface CloudBody {
  encoding: CloudEncoding;
  body: string;
}

export type CloudUpload = Omit<CloudSaveMeta, 'revision'> & CloudBody;

/** chunk 8 — the answer to an upload: written, or refused because the online copy is newer-built or moved on. */
export type CloudUploadResult = { ok: true; revision: number } | { ok: false; reason: 'too_new' | 'conflict'; meta: CloudSaveMeta | null };

export interface SocialNews {
  /** Trades the player hasn't seen yet. */
  trades: number;
  /** New club items (an event, a post) the player hasn't seen yet. */
  clubs: number;
}

export interface SocialService {
  currentUser(): Promise<SocialUser | null>;
  /** Rejects with `{ code: 'invalid' | 'credentials' | 'network' }`. */
  signIn(email: string, password: string): Promise<SocialUser>;
  /** chunk 8 — rejects with `invalid` (the email or password), `name`, `age`, `invite`, `taken` or `network`. */
  signUp(email: string, password: string, details: SignUpDetails): Promise<SocialUser>;
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
  /** chunk 8 — the owner makes a club (`forbidden` for anyone else; `invalid` unless the name is 2 to 40 characters). */
  createClub(name: string, blurb: string): Promise<Club>;
  /** chunk 8 — who added the player and isn't added back yet, newest first. */
  friendRequests(): Promise<FriendRequest[]>;
  /** chunk 8 — add them back (`invalid` unless they asked). */
  acceptFriend(id: string): Promise<void>;
  /** chunk 8 — remove the account and everything the server keeps for it, then sign out on this device. */
  deleteAccount(): Promise<void>;
  /** chunk 8 — send the player's own numbers (and maybe a new picture). */
  reportStanding(r: StandingReport): Promise<void>;
  /**
   * chunk 8 (§6) — the online save's meta, or null when the account has none. Chunk 9 (B2): the three online-save calls
   * name the account the game believes is signed in, and reject with `account` when the session is someone else's.
   */
  cloudMeta(account: string): Promise<CloudSaveMeta | null>;
  /** chunk 8 — the online save with its body, or null. */
  cloudDownload(account: string): Promise<(CloudBody & { meta: CloudSaveMeta }) | null>;
  /** chunk 8 — write the online save if its revision is still `expected` (0: none yet). */
  cloudUpload(save: CloudUpload, expected: number, account: string): Promise<CloudUploadResult>;
  /**
   * chunk 9 (B2) — call `cb` with the account now signed in on this device (null: none) when that may have changed
   * outside this tab's own calls, as when another tab signs out or in. Returns the unsubscribe.
   */
  onSessionChange?(cb: (account: string | null) => void): () => void;
}

/** chunk 8 — the name rule (sign-up, the server's check): 1 to 30 characters after trimming. */
export const validDisplayName = (name: string): boolean => {
  const n = name.trim().length;
  return n >= 1 && n <= 30;
};

/** chunk 8 — the club name rule (the owner's "Create club", the server's check): 2 to 40 characters after trimming. */
export const validClubName = (name: string): boolean => {
  const n = name.trim().length;
  return n >= 2 && n <= 40;
};

/** chunk 8 — a club's blurb is at most 80 characters. */
export const CLUB_BLURB_MAX = 80;

/** The sign-in rule (stub and future server alike, §13.2): an email shaped like x@y.z and a password of 8+ characters. */
export function validCredentials(email: string, password: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 8;
}

/** An invite code as typed or pasted, in its canonical form ("highland-4821 " → "HIGHLAND-4821"). */
export const normalizeCode = (code: string): string => code.trim().toUpperCase();

/**
 * Does this look like an invite code, as opposed to a club name being searched for? A club's word, a dash, and four
 * letters (FRIENDS-KDWX: the owner, 2026-10-19, ADR-0042) or, for the stub's sample, digits (HIGHLAND-4821).
 */
export const looksLikeInvite = (text: string): boolean => /^[A-Z]{2,10}-(?:[A-Z]{4}|\d{3,})$/.test(normalizeCode(text));

/** chunk 8 — an invite code's four letters: no I or O, so a code read out loud can't be misheard (ADR-0042). */
export const INVITE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * A friend code's shape (MYAQUA-7Q2): letters and digits, a dash, three letters or digits. Chunk 8: one to twelve
 * before the dash (a two-letter name such as "Al" makes "AL-7Q2", here and on the server).
 */
export const looksLikeFriendCode = (text: string): boolean => /^[A-Z0-9]{1,12}-[A-Z0-9]{3}$/.test(normalizeCode(text));
