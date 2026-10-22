/**
 * The shared shops' database (SHARED-SHOPS.md §6): the `server_*` functions, through Supabase's API with the
 * publishable key (as `anon`), each given the server's password first (ADR-0047; the migration
 * supabase/migrations/20261021000000_shared_shops.sql refuses every call without it). Node's own `fetch`, no library.
 * The password travels only in a POST body, never in a URL or a header (which logs may keep), and never appears in an
 * error. The stub (./stub.ts) implements the same interface in memory.
 */

export type Encoding = 'gzip-base64' | 'json';

export interface ShopMeta {
  club_id: string;
  shop_name: string;
  created_by: string | null;
  pausers: string[];
  revision: number;
  schema_version: number;
  build: string;
  saved_at: number;
  left_at: number | null;
  hour: number;
  day: number;
  money: number;
}

export interface ShopRow {
  meta: ShopMeta;
  encoding: Encoding;
  body: string;
}

/** A club member as the server sees them (`server_member`). */
export interface MemberInfo {
  name: string;
  /** The game's owner (profiles.is_owner). */
  owner: boolean;
  pause: boolean;
  /** The club has a shared shop. */
  shop: boolean;
}

/** What a save writes besides the body. */
export interface ShopSave {
  club: string;
  holder: string;
  expected: number;
  shopName: string;
  schemaVersion: number;
  build: string;
  savedAt: number;
  leftAt: number | null;
  hour: number;
  day: number;
  money: number;
  encoding: Encoding;
  body: string;
}

export type CreateResult = { ok: true; revision: number } | { ok: false; reason: 'exists' };
export type PutResult = { ok: true; revision: number } | { ok: false; reason: 'missing' | 'lease' | 'too_new' | 'conflict'; revision?: number };
export type TakeResult = { ok: true; until_ms: number } | { ok: false; reason: 'missing' | 'held' };

export interface UsageRow {
  month: string;
  bytes_out: number;
  awake_seconds: number;
  closed: 'cap' | 'hours' | null;
}

export interface Store {
  member(user: string, club: string): Promise<MemberInfo | null>;
  shopGet(club: string): Promise<ShopRow | null>;
  shopCreate(club: string, user: string, save: Omit<ShopSave, 'club' | 'holder' | 'expected' | 'leftAt'>): Promise<CreateResult>;
  shopPut(save: ShopSave): Promise<PutResult>;
  shopTake(club: string, holder: string, seconds: number): Promise<TakeResult>;
  shopRelease(club: string, holder: string): Promise<boolean>;
  setPausers(club: string, users: string[]): Promise<string[]>;
  photoPut(club: string, hash: string, mime: string, data: string): Promise<boolean>;
  photoGet(club: string, hash: string): Promise<{ mime: string; data: string } | null>;
  photoHashes(club: string): Promise<{ hash: string; at: number }[]>;
  photosDelete(club: string, hashes: string[]): Promise<number>;
  usageAdd(month: string, bytes: number, seconds: number): Promise<UsageRow>;
}

/** The store's methods, for the rooms' calls from their workers (./rooms.ts). */
export const STORE_CALLS = ['member', 'shopGet', 'shopCreate', 'shopPut', 'shopTake', 'shopRelease', 'setPausers', 'photoPut', 'photoGet', 'photoHashes', 'photosDelete', 'usageAdd'] as const satisfies readonly (keyof Store)[];

/** Bytes a request's headers add, roughly (method, path, host, the key's header, content type and length, TLS records aside). */
export const REQUEST_HEADER_BYTES = 420;

export class StoreError extends Error {}

/**
 * The Supabase store. `meter` hears the bytes of every request it sends (outbound data counts toward Render's free
 * 5 GB and the shops' 2 GB cap, §5.7).
 */
export function supabaseStore(project: { url: string; publishableKey: string }, key: string, meter: (bytes: number) => void = () => {}): Store {
  const base = `${project.url.replace(/\/$/, '')}/rest/v1/rpc/`;
  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const body = JSON.stringify({ p_key: key, ...args });
    meter(Buffer.byteLength(body) + REQUEST_HEADER_BYTES);
    let res: Response;
    try {
      res = await fetch(base + fn, {
        method: 'POST',
        headers: { apikey: project.publishableKey, 'content-type': 'application/json', accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      throw new StoreError(`${fn}: ${e instanceof Error ? e.name : 'network error'}`);
    }
    const text = await res.text();
    if (!res.ok) {
      let message = `${res.status}`;
      try {
        const j = JSON.parse(text) as { message?: unknown };
        if (typeof j.message === 'string') message = `${res.status} ${j.message.slice(0, 80)}`;
      } catch {
        // not JSON: the status says enough
      }
      throw new StoreError(`${fn}: ${message}`);
    }
    return (text ? JSON.parse(text) : null) as T;
  }
  return {
    member: (user, club) => rpc('server_member', { p_user: user, p_club: club }),
    shopGet: (club) => rpc('server_shop_get', { p_club: club }),
    shopCreate: (club, user, s) =>
      rpc('server_shop_create', {
        p_club: club,
        p_user: user,
        p_name: s.shopName,
        p_schema_version: s.schemaVersion,
        p_build: s.build,
        p_saved_at: s.savedAt,
        p_hour: s.hour,
        p_day: s.day,
        p_money: s.money,
        p_encoding: s.encoding,
        p_body: s.body,
      }),
    shopPut: (s) =>
      rpc('server_shop_put', {
        p_club: s.club,
        p_holder: s.holder,
        p_expected: s.expected,
        p_shop_name: s.shopName,
        p_schema_version: s.schemaVersion,
        p_build: s.build,
        p_saved_at: s.savedAt,
        p_left_at: s.leftAt,
        p_hour: s.hour,
        p_day: s.day,
        p_money: s.money,
        p_encoding: s.encoding,
        p_body: s.body,
      }),
    shopTake: (club, holder, seconds) => rpc('server_shop_take', { p_club: club, p_holder: holder, p_seconds: seconds }),
    shopRelease: (club, holder) => rpc('server_shop_release', { p_club: club, p_holder: holder }),
    setPausers: (club, users) => rpc('server_set_pausers', { p_club: club, p_pausers: users }),
    photoPut: (club, hash, mime, data) => rpc('server_photo_put', { p_club: club, p_hash: hash, p_mime: mime, p_data: data }),
    photoGet: (club, hash) => rpc('server_photo_get', { p_club: club, p_hash: hash }),
    photoHashes: (club) => rpc('server_photo_hashes', { p_club: club }),
    photosDelete: (club, hashes) => rpc('server_photos_delete', { p_club: club, p_hashes: hashes }),
    usageAdd: (month, bytes, seconds) => rpc('server_usage_add', { p_month: month, p_bytes: Math.round(bytes), p_seconds: Math.round(seconds) }),
  };
}
