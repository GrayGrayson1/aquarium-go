/**
 * The local Social stub (0.5 spec §13.6): canned data (./data.ts), 300–600 ms of fake latency, and a small record in
 * localStorage under `aquarium-go.social.v1`. OWNER: lane "social". It serves dev mode and every e2e build (chunk 8,
 * ONLINE-STAGE1.md §5.4); players get the Supabase service (./supabase) once a project is configured.
 *
 * Rules: the password is never stored, anywhere (SOC-002); the stored value is `{ email, displayName, joinedClubIds,
 * joinedMonths }` (§13.6's list plus the month each club was joined, ADR-0034 decision 3), plus, only when set, `owner`
 * and the clubs the owner created (`createdClubs`, chunk 8); `HIGHLAND-4821` is the one sample invite that resolves
 * (a created club's code resolves too), every other code is expired; sign-up needs one of those codes, a name and the
 * age box, and joins that club; the player's leaderboard row comes from the save (./standing.ts, through `standing`);
 * nothing here touches the game state or the save. The online save lives under `aquarium-go.social.cloud.v1`, for the
 * account that wrote it; Delete my account clears both records.
 *
 * Test and dev hooks beyond the interface: `setOffline` makes every call reject with `{ code: 'network' }` (SOC-010),
 * `pushTrade` and `pushClubNews` deliver something new (the Social dot, SOC-004 A5), and (chunk 8) `setOwner`,
 * `pushFriendRequest`, `setCloud` and `cloud` play the owner, a friend and "another device". Unseen news, friend
 * requests and accepted friends are kept in memory: the canned trades count as seen.
 */
import { CLUBS, FRIENDS, LEADERS, TRADES, VALID_INVITE, snapshot } from './data';
import {
  CLUB_BLURB_MAX,
  INVITE_LETTERS,
  looksLikeFriendCode,
  normalizeCode,
  validClubName,
  validCredentials,
  validDisplayName,
  type Club,
  type CloudBody,
  type CloudSaveMeta,
  type CloudUpload,
  type CloudUploadResult,
  type FriendAquarium,
  type FriendRequest,
  type LeaderboardKind,
  type LeaderboardRow,
  type SignUpDetails,
  type SocialError,
  type SocialNews,
  type SocialService,
  type SocialUser,
  type StandingReport,
  type TradeOffer,
} from './service';
import type { PlayerStanding } from './standing';

export const SOCIAL_STORAGE_KEY = 'aquarium-go.social.v1';
/** chunk 8 — the stub's online save (the server's copy, on this device). */
export const SOCIAL_CLOUD_KEY = 'aquarium-go.social.cloud.v1';

/** What the stub keeps on the device (never a password). */
export interface StoredSocial {
  email: string;
  displayName: string;
  joinedClubIds: string[];
  /** clubId → `YYYY-MM`, the month it was joined (ADR-0034 decision 3). */
  joinedMonths: Record<string, string>;
  /** chunk 8 — the owner's account (a dev hook sets it); absent otherwise. */
  owner?: boolean;
  /** chunk 8 — clubs this account created, with their invite codes; absent when none. */
  createdClubs?: Club[];
}

/** chunk 8 — the stub's online save: whose it is, its meta and its body. */
export interface StoredCloud extends CloudBody {
  email: string;
  meta: CloudSaveMeta;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface LocalStubOptions {
  /** Where the record lives (default: localStorage when there is one, else memory). */
  storage?: KV | null;
  /** Fake latency in ms, [min, max] (default [300, 600]). */
  latency?: readonly [number, number];
  /** For the latency and new invite codes only (default Math.random). */
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
  /** chunk 8 — make the signed-in account the owner's (or not). */
  setOwner(on: boolean): void;
  /** chunk 8 — someone adds the player by friend code; returns the request. */
  pushFriendRequest(name?: string): FriendRequest;
  /** chunk 8 — "another device" writes the online save: `meta` (revision included) and the save's text. */
  setCloud(meta: CloudSaveMeta, text: string): void;
  /** chunk 8 — the online save as stored (body as sent), or null. */
  cloud(): StoredCloud | null;
  /** chunk 8 — the last standing the game reported (tests). */
  lastStanding(): StandingReport | null;
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
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** A created club as stored, or null when it isn't one (the device's storage is untrusted). */
function readClub(v: unknown): Club | null {
  if (!v || typeof v !== 'object') return null;
  const c = v as Record<string, unknown>;
  if (typeof c.id !== 'string' || !c.id.startsWith('club-') || typeof c.name !== 'string' || !validClubName(c.name) || typeof c.inviteCode !== 'string') return null;
  const colors = Array.isArray(c.colors) && c.colors.length === 2 && c.colors.every(isColor) ? (c.colors as [string, string]) : (['#2fc4b2', '#127567'] as [string, string]);
  return {
    id: c.id,
    name: c.name.trim(),
    initials: typeof c.initials === 'string' && /^[A-Z0-9]{1,2}$/.test(c.initials) ? c.initials : initialsOf(c.name),
    colors,
    members: typeof c.members === 'number' && Number.isFinite(c.members) && c.members >= 1 ? Math.floor(c.members) : 1,
    blurb: typeof c.blurb === 'string' ? c.blurb.slice(0, CLUB_BLURB_MAX) : '',
    inviteCode: normalizeCode(c.inviteCode),
  };
}

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
  const created = Array.isArray(r.createdClubs) ? r.createdClubs.map(readClub).filter((c): c is Club => !!c) : [];
  const known = new Set([...CLUBS.map((c) => c.id), ...created.map((c) => c.id)]);
  const ids = Array.isArray(r.joinedClubIds) ? r.joinedClubIds.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];
  const months: Record<string, string> = {};
  if (r.joinedMonths && typeof r.joinedMonths === 'object') for (const id of ids) if (isMonth((r.joinedMonths as Record<string, unknown>)[id])) months[id] = (r.joinedMonths as Record<string, string>)[id];
  const out: StoredSocial = { email: r.email, displayName: typeof r.displayName === 'string' && r.displayName ? r.displayName : displayNameOf(r.email), joinedClubIds: [...new Set(ids)], joinedMonths: months };
  if (r.owner === true) out.owner = true;
  if (created.length) out.createdClubs = created;
  return out;
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

/** chunk 8 — a club's initials: the first letters of its first two words ("Aquarium Go Friends" → "AG"). */
export function initialsOf(name: string): string {
  const words = name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? 'C').slice(0, 2)) || 'C';
}

/** chunk 8 — an invite code's word: the club name's first word, letters A–Z, 2 to 10 of them, else CLUB (§4.3); then a dash and four letters (ADR-0042). */
export function inviteWordOf(name: string): string {
  const w = (name.trim().split(/\s+/)[0] ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10);
  return w.length >= 2 ? w : 'CLUB';
}

/** chunk 8 — the avatar gradients a new club picks from (the server's palette, ONLINE-STAGE1.md §4.1). */
export const CLUB_COLORS: readonly [string, string][] = [
  ['#2f55d4', '#16247a'],
  ['#9b7bf0', '#5b3aa8'],
  ['#2fc4b2', '#127567'],
  ['#f0845a', '#a8402a'],
  ['#e8608f', '#b03565'],
  ['#e0b040', '#a87818'],
];

/** chunk 9 — the account in a stored record's text, or null. */
const accountIn = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const s = readStored({ getItem: () => raw, setItem: () => {}, removeItem: () => {} });
  return s ? userOf(s).id : null;
};

const userOf = (s: StoredSocial): SocialUser => ({ id: `local:${s.email.trim().toLowerCase()}`, email: s.email, displayName: s.displayName, friendCode: friendCodeFor(s.email), ...(s.owner ? { isOwner: true } : {}) });

const monthOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const fail = (code: SocialError['code']): SocialError => ({ code });

const isMeta = (m: unknown): m is CloudSaveMeta => {
  if (!m || typeof m !== 'object') return false;
  const o = m as Record<string, unknown>;
  return ['revision', 'schemaVersion', 'savedAt', 'hour', 'day', 'money'].every((k) => typeof o[k] === 'number' && Number.isFinite(o[k])) && typeof o.saveId === 'string' && typeof o.shopName === 'string';
};

export function createLocalSocialStub(opts: LocalStubOptions = {}): LocalSocialStub {
  const kv = opts.storage ?? defaultStorage();
  const [lo, hi] = opts.latency ?? [300, 600];
  const random = opts.random ?? Math.random;
  const now = opts.now ?? (() => new Date());
  let offline = false;
  const trades: TradeOffer[] = [...TRADES];
  const seenTrades = new Set(trades.map((t) => t.id));
  let clubNews = 0;
  let requests: FriendRequest[] = [];
  let accepted: FriendAquarium[] = [];
  let standing: StandingReport | null = null;
  let requestSeq = 0;

  /** Every call waits like a network round trip, then fails while "offline". */
  async function call<T>(fn: () => T): Promise<T> {
    const ms = lo + (hi - lo) * random();
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    if (offline) throw fail('network');
    return fn();
  }

  const read = () => readStored(kv);
  const write = (s: StoredSocial) =>
    kv.setItem(
      SOCIAL_STORAGE_KEY,
      JSON.stringify({ email: s.email, displayName: s.displayName, joinedClubIds: s.joinedClubIds, joinedMonths: s.joinedMonths, ...(s.owner ? { owner: true } : {}), ...(s.createdClubs?.length ? { createdClubs: s.createdClubs } : {}) }),
    );
  const signedIn = (): StoredSocial => {
    const s = read();
    if (!s) throw fail('invalid');
    return s;
  };
  /** chunk 9 (B2): signed in, and as `account` (another tab may have switched the record to someone else). */
  const signedInAs = (account: string): StoredSocial => {
    const s = signedIn();
    if (userOf(s).id !== account) throw fail('account');
    return s;
  };
  const withJoined = (c: Club, s: StoredSocial | null): Club => (s?.joinedMonths[c.id] ? { ...c, joined: s.joinedMonths[c.id] } : { ...c });
  /** The sample clubs and this account's own (the latter keep their invite codes). */
  const allClubs = (s: StoredSocial | null): Club[] => [...CLUBS, ...(s?.createdClubs ?? [])];
  /** The club an invite code opens: the sample one, or one this account created. */
  const clubForCode = (code: string, s: StoredSocial | null): Club | null => {
    const c = normalizeCode(code);
    if (c === VALID_INVITE) return CLUBS.find((x) => x.id === 'highland-betta')!;
    return s?.createdClubs?.find((x) => x.inviteCode === c) ?? null;
  };
  const readCloud = (email: string): StoredCloud | null => {
    try {
      const raw = JSON.parse(kv.getItem(SOCIAL_CLOUD_KEY) ?? 'null') as Partial<StoredCloud> | null;
      if (!raw || typeof raw !== 'object' || raw.email?.toLowerCase() !== email.toLowerCase() || !isMeta(raw.meta) || typeof raw.body !== 'string' || (raw.encoding !== 'json' && raw.encoding !== 'gzip-base64')) return null;
      return raw as StoredCloud;
    } catch {
      return null;
    }
  };
  const writeCloud = (c: StoredCloud) => kv.setItem(SOCIAL_CLOUD_KEY, JSON.stringify(c));

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
    signUp: (email: string, password: string, details: SignUpDetails) =>
      call(() => {
        if (!validCredentials(email, password)) throw fail('invalid');
        if (!validDisplayName(details.displayName)) throw fail('name');
        if (!details.ageConfirmed) throw fail('age');
        const club = clubForCode(details.inviteCode, read());
        if (!club) throw fail('invite');
        const e = email.trim();
        const had = read();
        const keep = had && had.email.toLowerCase() === e.toLowerCase() ? had : null;
        const s: StoredSocial = { ...(keep ?? { email: e, joinedClubIds: [], joinedMonths: {} }), displayName: details.displayName.trim() };
        if (!s.joinedClubIds.includes(club.id)) {
          s.joinedClubIds = [...s.joinedClubIds, club.id];
          s.joinedMonths = { ...s.joinedMonths, [club.id]: monthOf(now()) };
        }
        write(s);
        return userOf(s);
      }),
    signOut: () => call(() => kv.removeItem(SOCIAL_STORAGE_KEY)),
    clubs: () =>
      call(() => {
        const s = read();
        const mine = new Set(s?.joinedClubIds ?? []);
        const clubs = allClubs(s);
        return { mine: clubs.filter((c) => mine.has(c.id)).map((c) => withJoined(c, s)), suggested: clubs.filter((c) => !mine.has(c.id)).map((c) => ({ ...c })) };
      }),
    resolveInvite: (code) =>
      call(() => {
        const s = read();
        const club = clubForCode(code, s);
        if (!club) return null;
        const shown = withJoined(club, s);
        delete shown.inviteCode; // the code is in the link already; only "Your club" lists the owner's codes
        return { club: shown, alreadyMember: !!s?.joinedClubIds.includes(club.id) };
      }),
    joinClub: (clubId) =>
      call(() => {
        const s = signedIn();
        if (!allClubs(s).some((c) => c.id === clubId)) throw fail('invalid');
        if (!s.joinedClubIds.includes(clubId)) {
          s.joinedClubIds.push(clubId);
          s.joinedMonths[clubId] = monthOf(now());
          write(s);
        }
      }),
    trades: () => call(() => trades.map((t) => ({ ...t }))),
    friendsAquariums: () => call(() => [...accepted, ...FRIENDS].map((f) => ({ ...f }))),
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
    createClub: (name, blurb) =>
      call(() => {
        const s = signedIn();
        if (!s.owner) throw fail('forbidden');
        if (!validClubName(name) || blurb.trim().length > CLUB_BLURB_MAX) throw fail('invalid');
        const taken = new Set([VALID_INVITE, ...(s.createdClubs ?? []).map((c) => c.inviteCode)]);
        let code = '';
        do code = `${inviteWordOf(name)}-${Array.from({ length: 4 }, () => INVITE_LETTERS[Math.floor(random() * INVITE_LETTERS.length) % INVITE_LETTERS.length]).join('')}`;
        while (taken.has(code));
        const id = `club-${(s.createdClubs?.length ?? 0) + 1}-${hash(code).toString(36)}`;
        const club: Club = { id, name: name.trim(), initials: initialsOf(name), colors: CLUB_COLORS[hash(name.trim()) % CLUB_COLORS.length], members: 1, blurb: blurb.trim(), inviteCode: code };
        s.createdClubs = [...(s.createdClubs ?? []), club];
        s.joinedClubIds = [...s.joinedClubIds, id];
        s.joinedMonths = { ...s.joinedMonths, [id]: monthOf(now()) };
        write(s);
        return { ...club, joined: s.joinedMonths[id] };
      }),
    friendRequests: () =>
      call(() => {
        signedIn();
        return requests.map((r) => ({ ...r }));
      }),
    acceptFriend: (id) =>
      call(() => {
        signedIn();
        const r = requests.find((x) => x.id === id);
        if (!r) throw fail('invalid');
        requests = requests.filter((x) => x.id !== id);
        // the friend's name as the tile's title (the real service sends their shop's name; no new copy for the stub)
        accepted = [{ id: r.id, owner: r.name, title: r.name, gallons: 20, likes: null, snapshotUrl: snapshot('planted'), updatedAt: r.createdAt }, ...accepted];
      }),
    deleteAccount: () =>
      call(() => {
        const s = signedIn();
        if (readCloud(s.email)) kv.removeItem(SOCIAL_CLOUD_KEY);
        kv.removeItem(SOCIAL_STORAGE_KEY);
        requests = [];
        accepted = [];
        standing = null;
      }),
    reportStanding: (r) =>
      call(() => {
        signedIn();
        standing = { ...r };
      }),
    // chunk 9 (B2): as the server's twins, only for the account the game names
    cloudMeta: (account) =>
      call(() => {
        const c = readCloud(signedInAs(account).email);
        return c ? { ...c.meta } : null;
      }),
    cloudDownload: (account) =>
      call(() => {
        const c = readCloud(signedInAs(account).email);
        return c ? { meta: { ...c.meta }, encoding: c.encoding, body: c.body } : null;
      }),
    cloudUpload: (save: CloudUpload, expected: number, account: string) =>
      call((): CloudUploadResult => {
        const s = signedInAs(account);
        const c = readCloud(s.email);
        // PERSIST-014 on the server: a newer build's online save is never written over
        if (c && c.meta.schemaVersion > save.schemaVersion) return { ok: false, reason: 'too_new', meta: { ...c.meta } };
        if ((c?.meta.revision ?? 0) !== expected) return { ok: false, reason: 'conflict', meta: c ? { ...c.meta } : null };
        const { encoding, body, ...meta } = save;
        const revision = (c?.meta.revision ?? 0) + 1;
        writeCloud({ email: s.email, meta: { ...meta, revision }, encoding, body });
        return { ok: true, revision };
      }),
    // chunk 9 (B2): another tab signing out or in rewrites the record, and this tab hears of it (as the real service)
    onSessionChange: (cb) => {
      if (kv !== globalThis.localStorage || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {};
      const onStorage = (e: StorageEvent) => {
        if (e.key === null) return cb(null); // that tab cleared all storage
        if (e.key !== SOCIAL_STORAGE_KEY) return;
        const was = accountIn(e.oldValue);
        const now = accountIn(e.newValue);
        if (was !== now) cb(now);
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    },
    setOffline: (on) => {
      offline = on;
    },
    pushTrade: (t) => {
      trades.unshift({ ...t });
    },
    pushClubNews: () => {
      clubNews++;
    },
    setOwner: (on) => {
      const s = read();
      if (!s) return;
      if (on) s.owner = true;
      else delete s.owner;
      write(s);
    },
    pushFriendRequest: (name = 'Sam') => {
      const r: FriendRequest = { id: `request-${++requestSeq}`, name, createdAt: now().toISOString() };
      requests = [r, ...requests];
      return { ...r };
    },
    setCloud: (meta, text) => {
      const s = read();
      if (s) writeCloud({ email: s.email, meta: { ...meta }, encoding: 'json', body: text });
    },
    cloud: () => {
      const s = read();
      return s ? readCloud(s.email) : null;
    },
    lastStanding: () => (standing ? { ...standing } : null),
  };
}
