/**
 * chunk 8 (ADR-0038; docs/agent/design/ONLINE-STAGE1.md §5.2) — the Social service on Supabase: the players' build
 * once a project is configured (src/social/project.ts). OWNER: lane "social".
 *
 * Every call maps onto one database function (supabase/migrations/20261019000000_stage1.sql, §4.3); the browser
 * touches no table. The client comes from a dynamic `import('@supabase/supabase-js')`, so the library is its own chunk
 * and loads on the first Social call, never on the title screen. supabase-js keeps the session's tokens in
 * localStorage under `aquarium-go.auth.v1`, never the password (SOC-002). Sign-up checks the form first (the email
 * and password, the name, the age box, a code given), then the server checks the code, the box and the name (its
 * sign-up trigger; a refusal is `invite`). It doesn't ask `resolve_invite` first: that one stops answering everyone
 * for a while after many wrong codes (ADR-0042), and sign-up must still work then. Trades stay "open later" (ADR-0034): `trades()` answers [] without
 * a call. A call that gets no answer within 20 s, or a 5xx, is a network error (a paused or unreachable project: the
 * game says so and plays on).
 */
import { snapshot } from '../data';
import {
  CLUB_BLURB_MAX,
  isSocialError,
  normalizeCode,
  validClubName,
  validCredentials,
  validDisplayName,
  type Club,
  type CloudSaveMeta,
  type CloudUploadResult,
  type FriendAquarium,
  type FriendRequest,
  type LeaderboardRow,
  type SocialError,
  type SocialService,
  type SocialUser,
} from '../service';
import type { OnlineProject } from '../project';
import type { PlayerStanding } from '../standing';

/** Where supabase-js keeps the session (tokens, never the password). */
export const AUTH_STORAGE_KEY = 'aquarium-go.auth.v1';
const TIMEOUT_MS = 20_000;

/** An auth or database error as supabase-js reports it (the fields this file reads). */
export interface SupabaseErrorLike {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
}

/** The slice of a supabase-js client this service uses (a fake one in tests). */
export interface SupabaseLike {
  auth: {
    getSession(): Promise<{ data: { session: unknown | null }; error: SupabaseErrorLike | null }>;
    signInWithPassword(c: { email: string; password: string }): Promise<{ data: unknown; error: SupabaseErrorLike | null }>;
    signUp(c: { email: string; password: string; options: { data: Record<string, unknown> } }): Promise<{ data: { session: unknown | null } | null; error: SupabaseErrorLike | null }>;
    signOut(o: { scope: 'local' }): Promise<{ error: SupabaseErrorLike | null }>;
    /** chunk 9 (B2): supabase-js's auth events, which reach every tab of the site. */
    onAuthStateChange?(cb: (event: string, session: { user?: { id?: unknown } } | null) => void): { data: { subscription: { unsubscribe(): void } } };
  };
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: SupabaseErrorLike | null; status?: number }>;
}

export interface SupabaseServiceOptions {
  /** Make the client (default: supabase-js, loaded on first use). */
  client?: () => Promise<SupabaseLike>;
  /** The player's own numbers, sent before a leaderboard is read (null: no game). */
  standing?: () => PlayerStanding | null;
  /** Where the session lives (default localStorage). Tests pass a fake. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  timeoutMs?: number;
}

const fail = (code: SocialError['code']): SocialError => ({ code });

/** The supabase-js client for a project (its own chunk). */
export async function loadSupabaseClient(project: OnlineProject, storage?: SupabaseServiceOptions['storage']): Promise<SupabaseLike> {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(project.url, project.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: AUTH_STORAGE_KEY, ...(storage ? { storage } : {}) },
  }) as unknown as SupabaseLike;
}

const NETWORK_TEXT = /failed to fetch|networkerror|load failed|network request failed|fetch failed|timed out|timeout/i;

/** No answer, a gateway or server error, or a rate limit: the network message ("try again in a moment"). */
export function isNetworkFailure(e: SupabaseErrorLike | null | undefined, status?: number): boolean {
  if (!e) return false;
  const st = e.status ?? status;
  if (e.name === 'AuthRetryableFetchError') return true;
  if (st === 0 || (typeof st === 'number' && (st >= 500 || st === 429))) return true;
  return NETWORK_TEXT.test(e.message ?? '');
}

/** An auth error → the game's code (sign-in and sign-up). */
export function mapAuthError(e: SupabaseErrorLike, during: 'signIn' | 'signUp'): SocialError {
  const code = e.code ?? '';
  if (code === 'invalid_credentials') return fail('credentials');
  if (code === 'user_already_exists' || code === 'email_exists') return fail('taken');
  if (during === 'signUp' && (e.status === 500 || code === 'unexpected_failure') && /database error saving new user/i.test(e.message ?? '')) return fail('invite'); // the server's sign-up check refused it
  if (code === 'weak_password' || code === 'email_address_invalid' || code === 'validation_failed') return fail('invalid');
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return fail('network');
  if (isNetworkFailure(e)) return fail('network');
  return fail(during === 'signIn' ? 'credentials' : 'network');
}

/** A database function's error → the game's code (the functions raise invalid, forbidden or not_signed_in). */
export function mapRpcError(e: SupabaseErrorLike, status?: number): SocialError {
  const msg = (e.message ?? '').trim();
  if (msg === 'forbidden') return fail('forbidden');
  if (msg === 'account') return fail('account'); // chunk 9 (B2): the session is another account's
  if (msg === 'invalid' || msg === 'not_signed_in') return fail('invalid');
  if (isNetworkFailure(e, status)) return fail('network');
  // a bad uuid (22P02), a refused call (42501), a missing function: the request itself was wrong
  return fail('invalid');
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : v; // bigint columns may arrive as strings
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isObj) : []);

/** A friend's picture: only an embedded JPEG or WebP (never a remote address; PERSIST-004), else the drawn one. */
const SNAPSHOT_RE = /^data:image\/(jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const safeSnapshot = (v: unknown): string => (typeof v === 'string' && v.length <= 200_000 && SNAPSHOT_RE.test(v) ? v : snapshot('planted'));

export function toUser(v: unknown): SocialUser | null {
  if (!isObj(v) || typeof v.id !== 'string') return null;
  return { id: v.id, email: str(v.email), displayName: str(v.display_name), friendCode: str(v.friend_code), ...(v.is_owner === true ? { isOwner: true } : {}) };
}

export function toClub(v: Record<string, unknown>): Club {
  const colors = Array.isArray(v.colors) && v.colors.length === 2 ? ([str(v.colors[0], '#2fc4b2'), str(v.colors[1], '#127567')] as [string, string]) : (['#2fc4b2', '#127567'] as [string, string]);
  return {
    id: str(v.id),
    name: str(v.name),
    initials: str(v.initials, '?'),
    colors,
    members: num(v.members),
    blurb: str(v.blurb),
    ...(typeof v.joined === 'string' ? { joined: v.joined } : {}),
    ...(typeof v.invite_code === 'string' ? { inviteCode: v.invite_code } : {}),
  };
}

export function toMeta(v: unknown): CloudSaveMeta | null {
  if (!isObj(v)) return null;
  return { revision: num(v.revision), saveId: str(v.save_id), schemaVersion: num(v.schema_version), savedAt: num(v.saved_at), hour: num(v.hour), shopName: str(v.shop_name), day: num(v.day), money: num(v.money) };
}

const toRow = (v: unknown): LeaderboardRow | null => (isObj(v) ? { rank: num(v.rank), name: str(v.name), value: num(v.value), ...(v.me === true ? { me: true } : {}) } : null);

export function createSupabaseSocialService(project: OnlineProject, opts: SupabaseServiceOptions = {}): SocialService {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  let clientP: Promise<SupabaseLike> | null = null;
  // chunk 9 (B2): who hears of sign-ins and sign-outs (onSessionChange); supabase-js's own events are attached when a
  // real call first makes the client, so listening alone never loads the library on the title screen (the review's note 1)
  const sessionCbs = new Set<(account: string | null) => void>();
  let authAttached = false;
  const attachAuth = (c: SupabaseLike): SupabaseLike => {
    if (authAttached || !c.auth.onAuthStateChange) return c;
    authAttached = true;
    // a refocus repeats SIGNED_IN with the same account, which the listener ignores
    c.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') for (const cb of [...sessionCbs]) cb(sessionAccount(session));
    });
    return c;
  };
  const client = (): Promise<SupabaseLike> => {
    clientP ??= (opts.client ?? (() => loadSupabaseClient(project, opts.storage)))().then(attachAuth).catch((e) => {
      clientP = null; // the chunk didn't load (offline): try again next time
      throw e;
    });
    return clientP.catch(() => {
      throw fail('network');
    });
  };

  /** No answer in time is a network error. */
  function timed<T>(p: PromiseLike<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(fail('network')), timeoutMs);
      Promise.resolve(p).then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(isSocialError(e) ? e : fail('network'));
        },
      );
    });
  }

  async function rpc(fn: string, args?: Record<string, unknown>): Promise<unknown> {
    const c = await client();
    const { data, error, status } = await timed(c.rpc(fn, args));
    if (error) throw mapRpcError(error, status);
    return data;
  }

  async function me(): Promise<SocialUser | null> {
    return toUser(await rpc('me'));
  }

  /** Signed in, but the account is gone (deleted on another device): forget the session here. */
  async function forget(): Promise<void> {
    try {
      const c = await client();
      const { error } = await timed(c.auth.signOut({ scope: 'local' }));
      if (error) (opts.storage ?? globalThis.localStorage)?.removeItem(AUTH_STORAGE_KEY);
    } catch {
      try {
        (opts.storage ?? globalThis.localStorage)?.removeItem(AUTH_STORAGE_KEY);
      } catch {
        /* nothing more to do */
      }
    }
  }

  async function report(): Promise<void> {
    const st = opts.standing?.() ?? null;
    if (!st) return;
    await rpc('report_standing', { p_shop_name: st.name, p_gallons: Math.max(0, Math.round(st.gallons ?? 0)), p_collection: Math.max(0, Math.round(st.collection_value)), p_prismatics: st.prismatics, p_show_wins: st.show_wins, p_snapshot: null });
  }

  return {
    currentUser: async () => {
      const c = await client();
      const { data, error } = await timed(c.auth.getSession());
      if (error) {
        if (isNetworkFailure(error)) throw fail('network');
        await forget(); // a session that can't be refreshed (expired, or the account was deleted)
        return null;
      }
      if (!data.session) return null;
      const u = await me();
      if (!u) await forget();
      return u;
    },
    signIn: async (email, password) => {
      if (!validCredentials(email, password)) throw fail('invalid');
      const c = await client();
      const { error } = await timed(c.auth.signInWithPassword({ email: email.trim(), password }));
      if (error) throw mapAuthError(error, 'signIn');
      const u = await me();
      if (!u) throw fail('credentials');
      return u;
    },
    signUp: async (email, password, details) => {
      if (!validCredentials(email, password)) throw fail('invalid');
      if (!validDisplayName(details.displayName)) throw fail('name');
      if (!details.ageConfirmed) throw fail('age');
      const code = normalizeCode(details.inviteCode);
      if (!code) throw fail('invite');
      const c = await client();
      const { data, error } = await timed(c.auth.signUp({ email: email.trim(), password, options: { data: { invite_code: code, display_name: details.displayName.trim(), age_ok: true } } }));
      if (error) throw mapAuthError(error, 'signUp');
      if (!data?.session) {
        // confirmation is off (supabase/config.toml), so a session comes back; if not, sign in as the account just made
        const r = await timed(c.auth.signInWithPassword({ email: email.trim(), password }));
        if (r.error) throw mapAuthError(r.error, 'signIn');
      }
      const u = await me();
      if (!u) throw fail('network');
      return u;
    },
    signOut: async () => {
      const c = await client();
      const { error } = await timed(c.auth.signOut({ scope: 'local' })); // this device only
      if (error && isNetworkFailure(error)) throw fail('network');
    },
    clubs: async () => {
      const d = await rpc('my_clubs');
      return { mine: list(isObj(d) ? d.mine : null).map(toClub), suggested: list(isObj(d) ? d.suggested : null).map(toClub) };
    },
    resolveInvite: async (code) => {
      const c = normalizeCode(code);
      if (!c) return null;
      const d = await rpc('resolve_invite', { p_code: c });
      // the server's brake on wrong codes holds (ADR-0042): not "no such club", so the network message (try again)
      if (isObj(d) && d.braked === true) throw fail('network');
      if (!isObj(d) || !isObj(d.club)) return null;
      return { club: toClub(d.club), alreadyMember: d.already_member === true };
    },
    joinClub: async (clubId) => {
      await rpc('join_club', { p_club: clubId });
    },
    trades: async () => [],
    friendsAquariums: async () =>
      list(await rpc('friends_aquariums')).map(
        (f): FriendAquarium => ({ id: str(f.id), owner: str(f.owner), title: str(f.title), gallons: f.gallons === null ? null : num(f.gallons), likes: null, snapshotUrl: safeSnapshot(f.snapshot), updatedAt: str(f.updated_at) }),
      ),
    addFriend: async (code) => {
      await rpc('add_friend', { p_code: normalizeCode(code) });
    },
    leaderboard: async (kind) => {
      try {
        await report();
      } catch (e) {
        if (isObj(e) && e.code === 'network') throw e;
        /* the board still reads; the last numbers stand */
      }
      const d = await rpc('leaderboard', { p_kind: kind });
      const me = isObj(d) ? toRow(d.me) : null;
      if (!me) throw fail('invalid');
      return { rows: (Array.isArray((d as Record<string, unknown>).rows) ? ((d as Record<string, unknown>).rows as unknown[]) : []).map(toRow).filter((r): r is LeaderboardRow => !!r), me: { ...me, me: true } };
    },
    news: async () => {
      const d = await rpc('news');
      return { trades: 0, clubs: isObj(d) ? num(d.clubs) : 0 };
    },
    markSeen: async () => {
      await rpc('mark_seen');
    },
    createClub: async (name, blurb) => {
      if (!validClubName(name) || blurb.trim().length > CLUB_BLURB_MAX) throw fail('invalid');
      const d = await rpc('create_club', { p_name: name.trim(), p_blurb: blurb.trim() });
      if (!isObj(d)) throw fail('invalid');
      return toClub(d);
    },
    friendRequests: async () => list(await rpc('friend_requests')).map((r): FriendRequest => ({ id: str(r.id), name: str(r.name), createdAt: str(r.created_at) })),
    acceptFriend: async (id) => {
      await rpc('accept_friend', { p_id: id });
    },
    deleteAccount: async () => {
      await rpc('delete_my_account');
      await forget();
    },
    reportStanding: async (r) => {
      await rpc('report_standing', {
        p_shop_name: r.shopName,
        p_gallons: Math.max(0, Math.round(r.gallons)),
        p_collection: Math.max(0, Math.round(r.collectionValue)),
        p_prismatics: Math.max(0, Math.round(r.prismatics)),
        p_show_wins: Math.max(0, Math.round(r.showWins)),
        p_snapshot: r.snapshot ?? null,
      });
    },
    // chunk 9 (B2): the twins that refuse any account but the one the game names
    cloudMeta: async (account) => toMeta(await rpc('save_meta_for', { p_account: account })),
    cloudDownload: async (account) => {
      const d = await rpc('get_save_for', { p_account: account });
      if (!isObj(d)) return null;
      const meta = toMeta(d.meta);
      const encoding = d.encoding === 'gzip-base64' || d.encoding === 'json' ? d.encoding : null;
      if (!meta || !encoding || typeof d.body !== 'string') return null;
      return { meta, encoding, body: d.body };
    },
    cloudUpload: async (save, expected, account) => {
      const d = await rpc('put_save_for', {
        p_account: account,
        p_expected: expected,
        p_save_id: save.saveId,
        p_schema_version: save.schemaVersion,
        p_saved_at: Math.round(save.savedAt),
        p_hour: save.hour,
        p_shop_name: save.shopName.slice(0, 60),
        p_day: Math.round(save.day),
        p_money: save.money,
        p_encoding: save.encoding,
        p_body: save.body,
      });
      if (!isObj(d)) throw fail('invalid');
      if (d.ok === true) return { ok: true, revision: num(d.revision) };
      const reason = d.reason === 'too_new' ? 'too_new' : 'conflict';
      return { ok: false, reason, meta: toMeta(d.meta) } satisfies CloudUploadResult;
    },
    onSessionChange: (cb) => {
      // supabase-js tells every tab of a sign-in or sign-out (its events cross tabs), once a call has made the client
      sessionCbs.add(cb);
      // and the session's own key, which another tab rewrites (a storage event fires only in the other tabs; a key of
      // null is that tab clearing all storage, the session with it)
      let onStorage: ((e: StorageEvent) => void) | null = null;
      if (!opts.storage && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        onStorage = (e: StorageEvent) => {
          if (e.key === null) return cb(null);
          if (e.key !== AUTH_STORAGE_KEY) return;
          const was = storedAccount(e.oldValue);
          const now = storedAccount(e.newValue);
          if (was !== now) cb(now);
        };
        window.addEventListener('storage', onStorage);
      }
      return () => {
        sessionCbs.delete(cb);
        if (onStorage) window.removeEventListener('storage', onStorage);
      };
    },
  };
}

/** The account a supabase-js session belongs to, or null. */
const sessionAccount = (session: unknown): string | null => {
  const user = isObj(session) ? session.user : null;
  return isObj(user) && typeof user.id === 'string' ? user.id : null;
};

/** The account in a stored session (supabase-js keeps it as JSON under AUTH_STORAGE_KEY), or null. */
function storedAccount(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return sessionAccount(JSON.parse(raw));
  } catch {
    return null;
  }
}
