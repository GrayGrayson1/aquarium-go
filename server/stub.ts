/**
 * In-memory accounts and storage for the shared-shop server (SHARED-SHOPS.md §5.1, `SHOPS_STUB=1`): the unit tests,
 * e2e and dev run the real server against these instead of Supabase, with the same rules as the migration's `server_*`
 * functions (the lease, the revision, a newer schema never written over, the caps). Never used with a key.
 *
 * A stub token names its player: `stub:<id>:<name>`, or `stub:<id>:<name>:owner` for the game's owner. Clubs are made
 * by the tests (`addClub`), or open to every stub player: the stub shops built from the dev fixtures
 * (scripts/shared-stub-shops.ts), one club each, named after the shop, for e2e and the cross-engine replay.
 */
import type { Auth, Who } from './auth';
import type { CreateResult, MemberInfo, PutResult, ShopRow, ShopSave, Store, TakeResult, UsageRow } from './store';
import { availableShops, loadShopText } from './shops';

export const STUB_BYTES_CAP = 2_000_000_000;
export const STUB_SECONDS_CAP = 1_440_000;

const TOKEN = /^stub:([A-Za-z0-9_-]{1,40}):([^:]{1,30})(:owner)?$/;

interface StubUser {
  name: string;
  owner: boolean;
}

interface StubClub {
  /** Members by id; null: every stub player is one. */
  members: Set<string> | null;
  shop: (ShopRow & { lease: { holder: string; until: number } | null }) | null;
  photos: Map<string, { mime: string; data: string; at: number }>;
}

export class StubWorld {
  readonly users = new Map<string, StubUser>();
  readonly clubs = new Map<string, StubClub>();
  readonly usage = new Map<string, UsageRow>();
  /** Calls made, by name (tests read them). */
  readonly calls: Record<string, number> = {};
  /** Make the next calls of these names fail (tests). */
  readonly failing = new Set<string>();
  bytesCap = STUB_BYTES_CAP;
  secondsCap = STUB_SECONDS_CAP;
  /**
   * chunk 13 — a club nobody added counts as one open to every stub player, with no shop until the owner makes one: the
   * game's local Social stub has its own clubs (`highland-betta` …, and the ones its owner creates), and dev and e2e
   * play their shops here (server/main.ts turns it on; the unit tests add their clubs).
   */
  openClubs = false;
  /** The database's clock (real ms); tests may move it. */
  now: () => number = Date.now;

  /** A club with these members (ids); its shop, if `shop` is given, as a save's text. */
  addClub(id: string, members: string[] | null, shop?: { text: string; name?: string; pausers?: string[]; savedAt?: number; leftAt?: number | null }): void {
    this.clubs.set(id, { members: members ? new Set(members) : null, shop: null, photos: new Map() });
    if (shop) this.putShopText(id, shop.text, shop);
  }

  /** Store a shop from a save's text (a header line, then the JSON), as `server_shop_create` would. */
  putShopText(club: string, text: string, opts: { name?: string; pausers?: string[]; savedAt?: number; leftAt?: number | null } = {}): void {
    const c = this.clubs.get(club);
    if (!c) throw new Error(`no club ${club}`);
    const meta = headerMeta(text);
    c.shop = {
      meta: {
        club_id: club,
        shop_name: opts.name ?? meta.shopName ?? club,
        created_by: null,
        pausers: opts.pausers ?? [],
        revision: (c.shop?.meta.revision ?? 0) + 1,
        schema_version: meta.schemaVersion ?? 1,
        build: 'stub',
        saved_at: opts.savedAt ?? meta.savedAt ?? this.now(),
        left_at: opts.leftAt ?? null,
        hour: meta.hour ?? 0,
        day: meta.day ?? 1,
        money: meta.money ?? 0,
      },
      encoding: 'json',
      body: text,
      lease: c.shop?.lease ?? null,
    };
  }

  /** chunk 13 — every club with a shop, as the game's club cards show it (`GET /stub/shops`). */
  listShops(): { club: string; name: string; day: number; money: number; playedAt: number }[] {
    const out: { club: string; name: string; day: number; money: number; playedAt: number }[] = [];
    for (const [club, c] of this.clubs) if (c.shop) out.push({ club, name: c.shop.meta.shop_name, day: c.shop.meta.day, money: c.shop.meta.money, playedAt: c.shop.meta.saved_at });
    return out;
  }

  /** The club, or (`openClubs`) a new one open to every stub player. */
  private clubOf(club: string): StubClub | undefined {
    let c = this.clubs.get(club);
    if (!c && this.openClubs && /^[A-Za-z0-9_-]{1,80}$/.test(club)) {
      c = { members: null, shop: null, photos: new Map() };
      this.clubs.set(club, c);
    }
    return c;
  }

  /** The stub shops (dev fixtures) as clubs open to every stub player. */
  addStubShops(dir?: string): string[] {
    const names = availableShops(dir);
    for (const n of names) this.addClub(n, null, { text: loadShopText(n, dir), name: n, savedAt: this.now() });
    return names;
  }

  private call(name: string): void {
    this.calls[name] = (this.calls[name] ?? 0) + 1;
    if (this.failing.has(name)) throw new Error(`${name}: stub failure`);
  }

  readonly auth: Auth = {
    verify: async (token: string): Promise<Who | null> => {
      this.call('verify');
      const m = typeof token === 'string' ? TOKEN.exec(token) : null;
      if (!m) return null;
      const user = `u_${m[1]}`;
      this.users.set(user, { name: m[2], owner: Boolean(m[3]) });
      return { user, exp: this.now() + 3_600_000 };
    },
  };

  readonly store: Store = {
    member: async (user, club): Promise<MemberInfo | null> => {
      this.call('member');
      const c = this.clubOf(club);
      const u = this.users.get(user);
      if (!c || !u || (c.members && !c.members.has(user))) return null;
      return { name: u.name, owner: u.owner, pause: u.owner || Boolean(c.shop?.meta.pausers.includes(user)), shop: Boolean(c.shop) };
    },
    shopGet: async (club) => {
      this.call('shopGet');
      const s = this.clubs.get(club)?.shop;
      return s ? { meta: { ...s.meta, pausers: [...s.meta.pausers] }, encoding: s.encoding, body: s.body } : null;
    },
    shopCreate: async (club, user, s): Promise<CreateResult> => {
      this.call('shopCreate');
      const c = this.clubOf(club);
      const u = this.users.get(user);
      if (!c || !u?.owner || (c.members && !c.members.has(user))) throw new Error('server_shop_create: forbidden');
      if (c.shop) return { ok: false, reason: 'exists' };
      c.shop = {
        meta: { club_id: club, shop_name: s.shopName.trim(), created_by: user, pausers: [], revision: 1, schema_version: s.schemaVersion, build: s.build, saved_at: s.savedAt, left_at: null, hour: s.hour, day: s.day, money: s.money },
        encoding: s.encoding,
        body: s.body,
        lease: null,
      };
      return { ok: true, revision: 1 };
    },
    shopPut: async (s: ShopSave): Promise<PutResult> => {
      this.call('shopPut');
      const shop = this.clubs.get(s.club)?.shop;
      if (!shop) return { ok: false, reason: 'missing' };
      if (!shop.lease || shop.lease.holder !== s.holder || shop.lease.until < this.now()) return { ok: false, reason: 'lease' };
      if (shop.meta.schema_version > s.schemaVersion) return { ok: false, reason: 'too_new' };
      if (shop.meta.revision !== s.expected) return { ok: false, reason: 'conflict', revision: shop.meta.revision };
      const revision = shop.meta.revision + 1;
      Object.assign(shop.meta, { shop_name: s.shopName, revision, schema_version: s.schemaVersion, build: s.build, saved_at: s.savedAt, left_at: s.leftAt, hour: s.hour, day: s.day, money: s.money });
      shop.encoding = s.encoding;
      shop.body = s.body;
      return { ok: true, revision };
    },
    shopTake: async (club, holder, seconds): Promise<TakeResult> => {
      this.call('shopTake');
      const shop = this.clubs.get(club)?.shop;
      if (!shop) return { ok: false, reason: 'missing' };
      const now = this.now();
      if (shop.lease && shop.lease.holder !== holder && shop.lease.until >= now) return { ok: false, reason: 'held' };
      shop.lease = { holder, until: now + seconds * 1000 };
      return { ok: true, until_ms: shop.lease.until };
    },
    shopRelease: async (club, holder) => {
      this.call('shopRelease');
      const shop = this.clubs.get(club)?.shop;
      if (!shop?.lease || shop.lease.holder !== holder) return false;
      shop.lease = null;
      return true;
    },
    setPausers: async (club, users) => {
      this.call('setPausers');
      const c = this.clubs.get(club);
      if (!c?.shop) throw new Error('server_set_pausers: invalid');
      const kept = [...new Set(users)].filter((u) => this.users.has(u) && (!c.members || c.members.has(u)));
      c.shop.meta.pausers = kept;
      return [...kept];
    },
    photoPut: async (club, hash, mime, data) => {
      this.call('photoPut');
      const c = this.clubs.get(club);
      if (!c?.shop) throw new Error('server_photo_put: invalid');
      if (c.photos.has(hash)) return false;
      c.photos.set(hash, { mime, data, at: this.now() });
      return true;
    },
    photoGet: async (club, hash) => {
      this.call('photoGet');
      const p = this.clubs.get(club)?.photos.get(hash);
      return p ? { mime: p.mime, data: p.data } : null;
    },
    photoHashes: async (club) => {
      this.call('photoHashes');
      return [...(this.clubs.get(club)?.photos ?? new Map<string, { at: number }>()).entries()].map(([hash, p]) => ({ hash, at: p.at }));
    },
    photosDelete: async (club, hashes) => {
      this.call('photosDelete');
      const c = this.clubs.get(club);
      let n = 0;
      for (const h of hashes) if (c?.photos.delete(h)) n++;
      return n;
    },
    usageAdd: async (month, bytes, seconds): Promise<UsageRow> => {
      this.call('usageAdd');
      const row = this.usage.get(month) ?? { month, bytes_out: 0, awake_seconds: 0, closed: null };
      row.bytes_out += Math.round(bytes);
      row.awake_seconds += Math.round(seconds);
      if (!row.closed && row.bytes_out >= this.bytesCap) row.closed = 'cap';
      else if (!row.closed && row.awake_seconds >= this.secondsCap) row.closed = 'hours';
      this.usage.set(month, row);
      return { ...row };
    },
  };
}

/** The meta a save's header line carries (src/persistence/serialize.ts encodeRecord), read without the simulation. */
function headerMeta(text: string): { shopName?: string; schemaVersion?: number; savedAt?: number; hour?: number; day?: number; money?: number } {
  try {
    const h = JSON.parse(text.slice(0, text.indexOf('\n'))) as { schemaVersion?: number; savedAt?: number; meta?: { shopName?: string; hour?: number; day?: number; money?: number } };
    return { shopName: h.meta?.shopName, schemaVersion: h.schemaVersion, savedAt: h.savedAt, hour: h.meta?.hour, day: h.meta?.day, money: h.meta?.money };
  } catch {
    return {};
  }
}
