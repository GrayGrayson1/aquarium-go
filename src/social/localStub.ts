/**
 * The local Social stub (0.5 spec §13.6): canned data (./data.ts), 300–600 ms of fake latency, and a small record in
 * localStorage under `aquarium-go.social.v1`. OWNER: lane "social".
 *
 * Rules: the password is never stored, anywhere (SOC-002); the stored value is `{ email, displayName, joinedClubIds,
 * joinedMonths }` (§13.6's list plus the month each club was joined, ADR-0034 decision 3); `HIGHLAND-4821` is the only
 * invite that resolves, every other code is expired; the player's leaderboard row comes from the save
 * (./standing.ts, through `standing`); nothing here touches the game state or the save.
 *
 * Test and dev hooks beyond the interface: `setOffline` makes every call reject with `{ code: 'network' }` (SOC-010),
 * `pushTrade` and `pushClubNews` deliver something new (the Social dot, SOC-004 A5). Unseen news is kept in memory: the
 * canned trades count as seen.
 */
import { CLUBS, FRIENDS, LEADERS, TRADES, VALID_INVITE } from './data';
import { looksLikeFriendCode, normalizeCode, validCredentials, type Club, type LeaderboardKind, type LeaderboardRow, type SocialError, type SocialNews, type SocialService, type SocialUser, type TradeOffer } from './service';
import type { PlayerStanding } from './standing';

export const SOCIAL_STORAGE_KEY = 'aquarium-go.social.v1';

/** What the stub keeps on the device (never a password). */
export interface StoredSocial {
  email: string;
  displayName: string;
  joinedClubIds: string[];
  /** clubId → `YYYY-MM`, the month it was joined (ADR-0034 decision 3). */
  joinedMonths: Record<string, string>;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface LocalStubOptions {
  /** Where the record lives (default: localStorage when there is one, else memory). */
  storage?: KV | null;
  /** Fake latency in ms, [min, max] (default [300, 600]). */
  latency?: readonly [number, number];
  /** For the latency only (default Math.random). */
  random?: () => number;
  /** The player's own numbers, from the save (null: no game). */
  standing?: () => PlayerStanding | null;
  /** The device's clock, for the month a club is joined (default: now). */
  now?: () => Date;
}

export interface LocalSocialStub extends SocialService {
  setOffline(on: boolean): void;
  pushTrade(t: TradeOffer): void;
  pushClubNews(): void;
}

function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

function defaultStorage(): KV {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* blocked storage: keep it in memory */
  }
  return memoryKV();
}

const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);

/** The stored record, or null when there is none or it isn't one of ours (the device's storage is untrusted). */
export function readStored(kv: KV): StoredSocial | null {
  let raw: unknown;
  try {
    raw = JSON.parse(kv.getItem(SOCIAL_STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.email !== 'string' || !r.email) return null;
  const known = new Set(CLUBS.map((c) => c.id));
  const ids = Array.isArray(r.joinedClubIds) ? r.joinedClubIds.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];
  const months: Record<string, string> = {};
  if (r.joinedMonths && typeof r.joinedMonths === 'object') for (const id of ids) if (isMonth((r.joinedMonths as Record<string, unknown>)[id])) months[id] = (r.joinedMonths as Record<string, string>)[id];
  return { email: r.email, displayName: typeof r.displayName === 'string' && r.displayName ? r.displayName : displayNameOf(r.email), joinedClubIds: [...new Set(ids)], joinedMonths: months };
}

const displayNameOf = (email: string): string => email.trim().split('@')[0] || email.trim();

/** A small stable hash (FNV-1a) for the friend code. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "you@example.com" → "YOU-7Q2": the name's letters (up to six) and three characters from the address. */
export function friendCodeFor(email: string): string {
  const letters = displayNameOf(email).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'AQUA';
  let h = hash(email.trim().toLowerCase());
  let tail = '';
  for (let i = 0; i < 3; i++) {
    tail += CODE_CHARS[h % CODE_CHARS.length];
    h = Math.floor(h / CODE_CHARS.length);
  }
  return `${letters}-${tail}`;
}

const userOf = (s: StoredSocial): SocialUser => ({ id: `local:${s.email.trim().toLowerCase()}`, email: s.email, displayName: s.displayName, friendCode: friendCodeFor(s.email) });

const monthOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const fail = (code: SocialError['code']): SocialError => ({ code });

export function createLocalSocialStub(opts: LocalStubOptions = {}): LocalSocialStub {
  const kv = opts.storage ?? defaultStorage();
  const [lo, hi] = opts.latency ?? [300, 600];
  const random = opts.random ?? Math.random;
  const now = opts.now ?? (() => new Date());
  let offline = false;
  const trades: TradeOffer[] = [...TRADES];
  const seenTrades = new Set(trades.map((t) => t.id));
  let clubNews = 0;

  /** Every call waits like a network round trip, then fails while "offline". */
  async function call<T>(fn: () => T): Promise<T> {
    const ms = lo + (hi - lo) * random();
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    if (offline) throw fail('network');
    return fn();
  }

  const read = () => readStored(kv);
  const write = (s: StoredSocial) => kv.setItem(SOCIAL_STORAGE_KEY, JSON.stringify({ email: s.email, displayName: s.displayName, joinedClubIds: s.joinedClubIds, joinedMonths: s.joinedMonths }));
  const signedIn = (): StoredSocial => {
    const s = read();
    if (!s) throw fail('invalid');
    return s;
  };
  const withJoined = (c: Club, s: StoredSocial | null): Club => (s?.joinedMonths[c.id] ? { ...c, joined: s.joinedMonths[c.id] } : { ...c });

  const signIn = (email: string, password: string) =>
    call(() => {
      if (!validCredentials(email, password)) throw fail('invalid');
      const e = email.trim();
      const had = read();
      const s: StoredSocial = had && had.email.toLowerCase() === e.toLowerCase() ? had : { email: e, displayName: displayNameOf(e), joinedClubIds: [], joinedMonths: {} };
      write(s);
      return userOf(s);
    });

  return {
    currentUser: () =>
      call(() => {
        const s = read();
        return s ? userOf(s) : null;
      }),
    signIn,
    signUp: signIn,
    signOut: () => call(() => kv.removeItem(SOCIAL_STORAGE_KEY)),
    clubs: () =>
      call(() => {
        const s = read();
        const mine = new Set(s?.joinedClubIds ?? []);
        return { mine: CLUBS.filter((c) => mine.has(c.id)).map((c) => withJoined(c, s)), suggested: CLUBS.filter((c) => !mine.has(c.id)).map((c) => ({ ...c })) };
      }),
    resolveInvite: (code) =>
      call(() => {
        if (normalizeCode(code) !== VALID_INVITE) return null;
        const s = read();
        const club = CLUBS.find((c) => c.id === 'highland-betta')!;
        return { club: withJoined(club, s), alreadyMember: !!s?.joinedClubIds.includes(club.id) };
      }),
    joinClub: (clubId) =>
      call(() => {
        const s = signedIn();
        if (!CLUBS.some((c) => c.id === clubId)) throw fail('invalid');
        if (!s.joinedClubIds.includes(clubId)) {
          s.joinedClubIds.push(clubId);
          s.joinedMonths[clubId] = monthOf(now());
          write(s);
        }
      }),
    trades: () => call(() => trades.map((t) => ({ ...t }))),
    friendsAquariums: () => call(() => FRIENDS.map((f) => ({ ...f }))),
    addFriend: (code) =>
      call(() => {
        const s = signedIn();
        if (!looksLikeFriendCode(code) || normalizeCode(code) === friendCodeFor(s.email)) throw fail('invalid');
      }),
    leaderboard: (kind: LeaderboardKind) =>
      call(() => {
        const st = opts.standing?.() ?? null;
        const mine = Math.max(0, st?.[kind] ?? 0);
        const leaders = LEADERS[kind];
        // the player ranks after everyone with as much (the screens: one Prismatic is 9th, behind four others with one)
        const ahead = leaders.filter((l) => l.value >= mine).length;
        const me: LeaderboardRow = { rank: ahead + 1, name: st?.name ?? '', value: mine, me: true };
        // the top four of the ranking with the player in it (the named leaders head every list)
        const rows: LeaderboardRow[] = [];
        let next = 0;
        for (let rank = 1; rows.length < 4; rank++) {
          if (rank === me.rank) rows.push(me);
          else if (next < leaders.length) rows.push({ rank, name: leaders[next].name, value: leaders[next++].value });
          else break;
        }
        return { rows, me };
      }),
    news: () => call((): SocialNews => ({ trades: trades.filter((t) => !seenTrades.has(t.id)).length, clubs: clubNews })),
    markSeen: () =>
      call(() => {
        for (const t of trades) seenTrades.add(t.id);
        clubNews = 0;
      }),
    setOffline: (on) => {
      offline = on;
    },
    pushTrade: (t) => {
      trades.unshift({ ...t });
    },
    pushClubNews: () => {
      clubNews++;
    },
  };
}
