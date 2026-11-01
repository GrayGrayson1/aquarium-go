// @vitest-environment node
/**
 * chunk 18 (ADR-0054) — the owner's overview and deletes. On the local stub: only the owner may call them (`forbidden`);
 * a deleted club leaves Clubs, its invite and its shared shop (the stub shop server is asked to forget it), a deleted
 * player and a removed friend leave Friends and the requests, the owner's own account can't be deleted here, and the
 * deletes outlive a reload and a sign-out (they're the server's, not the account's). On Supabase: each call is one
 * database function with its argument, the overview is mapped (no email), and the database's `forbidden` comes
 * through. And the Manage card's sizes and dates.
 */
import { describe, it, expect } from 'vitest';
import { createLocalSocialStub, createSupabaseSocialService, HIGHLAND_ID, VALID_INVITE, SOCIAL_STORAGE_KEY, type SupabaseLike } from '@/social';
import { SOCIAL_DELETED_KEY } from '@/social/localStub';
import { toOwnerOverview } from '@/social/supabase/service';
import { dayMonth, formatSize } from '@/ui/panels/social/copy';

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; dump(): Record<string, string> };
function memory(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), dump: () => Object.fromEntries(m) };
}

const PASSWORD = 'correct horse battery';

/** A stub with a fake stub shop server: `shops` it lists, and the clubs it was asked to forget. */
function rig(kv = memory()) {
  const shops = new Map<string, { name: string; day: number; bytes: number }>([[HIGHLAND_ID, { name: 'Highland Shop', day: 4, bytes: 120_000 }]]);
  const forgotten: string[] = [];
  const fetchFake = (async (url: string) => {
    const u = new URL(url);
    if (u.pathname === '/stub/shops/delete') {
      const club = u.searchParams.get('club') ?? '';
      forgotten.push(club);
      const deleted = shops.delete(club);
      return { ok: true, json: async () => ({ deleted }) };
    }
    return { ok: true, json: async () => [...shops].map(([club, s]) => ({ club, name: s.name, day: s.day, money: 100, playedAt: 1, bytes: s.bytes })) };
  }) as unknown as typeof fetch;
  const make = () => createLocalSocialStub({ storage: kv, latency: [0, 0], sharedServer: 'http://127.0.0.1:4396', fetch: fetchFake });
  return { kv, shops, forgotten, make, s: make() };
}

describe('chunk 18: the owner’s deletes on the local stub', () => {
  it('everyone but the owner is refused, and nothing changes', async () => {
    const { s, kv } = rig();
    await s.signIn('you@example.com', PASSWORD);
    await expect(s.ownerOverview()).rejects.toEqual({ code: 'forbidden' });
    await expect(s.deleteClub(HIGHLAND_ID)).rejects.toEqual({ code: 'forbidden' });
    await expect(s.deleteSharedShop(HIGHLAND_ID)).rejects.toEqual({ code: 'forbidden' });
    await expect(s.deletePlayer('friend-ola')).rejects.toEqual({ code: 'forbidden' });
    await expect(s.removeFriend('friend-ola')).rejects.toEqual({ code: 'forbidden' });
    expect(kv.getItem(SOCIAL_DELETED_KEY)).toBeNull();
    expect((await s.clubs()).suggested.map((c) => c.id)).toContain(HIGHLAND_ID);
    expect((await s.friendsAquariums()).map((f) => f.id)).toContain('friend-ola');
  });

  it('the overview: every club with its shared shop, every player with the owner’s own row first', async () => {
    const { s } = rig();
    await s.signIn('owner@example.com', PASSWORD);
    s.setOwner(true);
    const o = await s.ownerOverview();
    expect(o.clubs.map((c) => c.id)).toEqual(expect.arrayContaining([HIGHLAND_ID, 'prismatic-hunters', 'nano-tank', 'reef-starter']));
    expect(o.clubs.find((c) => c.id === HIGHLAND_ID)?.shop).toEqual({ name: 'Highland Shop', day: 4, bytes: 120_000 });
    expect(o.clubs.find((c) => c.id === 'nano-tank')?.shop).toBeNull();
    expect(o.players[0]).toMatchObject({ name: 'owner', owner: true });
    expect(o.players.filter((p) => p.owner)).toHaveLength(1);
    expect(o.players.map((p) => p.id)).toContain('friend-ola');
    expect(o.bytes).toBeGreaterThan(0);
    for (const p of o.players) expect(Object.keys(p).sort()).toEqual(['bytes', 'clubs', 'createdAt', 'friendCode', 'id', 'name', 'owner', 'savedAt']); // no email
  });

  it('deleting a club takes it off Clubs and its invite, and asks the stub shop server to forget its shop', async () => {
    const { s, forgotten, shops } = rig();
    await s.signUp('owner@example.com', PASSWORD, { displayName: 'Owner', inviteCode: VALID_INVITE, ageConfirmed: true }); // in Highland
    s.setOwner(true);
    expect((await s.sharedShops()).shops.map((x) => x.club)).toEqual([HIGHLAND_ID]);
    await s.deleteClub(HIGHLAND_ID);
    expect(forgotten).toEqual([HIGHLAND_ID]);
    expect(shops.has(HIGHLAND_ID)).toBe(false);
    const { mine, suggested } = await s.clubs();
    expect([...mine, ...suggested].map((c) => c.id)).not.toContain(HIGHLAND_ID);
    expect(await s.resolveInvite(VALID_INVITE)).toBeNull();
    await expect(s.joinClub(HIGHLAND_ID)).rejects.toEqual({ code: 'invalid' });
    expect((await s.sharedShops()).shops).toEqual([]);
    expect((await s.ownerOverview()).clubs.map((c) => c.id)).not.toContain(HIGHLAND_ID);
    await s.deleteClub(HIGHLAND_ID); // already gone: nothing more
  });

  it('a club the owner made goes from their record too', async () => {
    const { s, kv } = rig();
    await s.signIn('owner@example.com', PASSWORD);
    s.setOwner(true);
    const club = await s.createClub('Night Reef', '');
    await s.deleteClub(club.id);
    const stored = JSON.parse(kv.getItem(SOCIAL_STORAGE_KEY)!);
    expect(stored.createdClubs).toBeUndefined();
    expect(stored.joinedClubIds).not.toContain(club.id);
    expect(await s.resolveInvite(club.inviteCode!)).toBeNull();
  });

  it('deleting a shared shop keeps the club', async () => {
    const { s, forgotten } = rig();
    await s.signUp('owner@example.com', PASSWORD, { displayName: 'Owner', inviteCode: VALID_INVITE, ageConfirmed: true });
    s.setOwner(true);
    await s.deleteSharedShop(HIGHLAND_ID);
    expect(forgotten).toEqual([HIGHLAND_ID]);
    expect((await s.sharedShops()).shops).toEqual([]);
    expect((await s.clubs()).mine.map((c) => c.id)).toEqual([HIGHLAND_ID]);
    expect((await s.ownerOverview()).clubs.find((c) => c.id === HIGHLAND_ID)?.shop).toBeNull();
  });

  it('deleting a player or removing a friend takes their aquarium and request away; the owner’s own account stays', async () => {
    const { s } = rig();
    await s.signIn('owner@example.com', PASSWORD);
    s.setOwner(true);
    const me = (await s.currentUser())!;
    await expect(s.deletePlayer(me.id)).rejects.toEqual({ code: 'invalid' });
    await expect(s.deletePlayer('')).rejects.toEqual({ code: 'invalid' });
    await s.deletePlayer('friend-ola');
    expect((await s.friendsAquariums()).map((f) => f.id)).not.toContain('friend-ola');
    expect((await s.ownerOverview()).players.map((p) => p.id)).not.toContain('friend-ola');
    await s.removeFriend('friend-ada');
    expect((await s.friendsAquariums()).map((f) => f.id)).not.toContain('friend-ada');
    expect((await s.ownerOverview()).players.map((p) => p.id)).toContain('friend-ada'); // a friend removed keeps their account
    const r = s.pushFriendRequest('Sam');
    expect((await s.friendRequests()).map((x) => x.id)).toEqual([r.id]);
    await s.removeFriend(r.id); // Decline
    expect(await s.friendRequests()).toEqual([]);
    expect((await s.currentUser())?.id).toBe(me.id);
  });

  it('the deletes outlive a reload and a sign-out, and the record holds only lists of ids', async () => {
    const { s, kv, make } = rig();
    await s.signIn('owner@example.com', PASSWORD);
    s.setOwner(true);
    await s.deleteClub('nano-tank');
    await s.deletePlayer('friend-teo');
    await s.removeFriend('friend-jun');
    expect(JSON.parse(kv.getItem(SOCIAL_DELETED_KEY)!)).toEqual({ clubs: ['nano-tank'], players: ['friend-teo'], friends: ['friend-jun'] });
    await s.signOut();
    const again = make();
    await again.signIn('someone@example.com', PASSWORD);
    expect((await again.clubs()).suggested.map((c) => c.id)).not.toContain('nano-tank');
    expect((await again.friendsAquariums()).map((f) => f.id)).not.toContain('friend-teo');
    kv.setItem(SOCIAL_DELETED_KEY, '{"clubs":[1,null,"reef-starter"],"players":"x"}'); // damaged: only the ids that are strings
    expect((await again.clubs()).suggested.map((c) => c.id)).toEqual(['highland-betta', 'prismatic-hunters', 'nano-tank']);
  });
});

describe('chunk 18: the owner’s calls on Supabase', () => {
  function fake(answers: Record<string, { data?: unknown; error?: { message: string } }>) {
    const calls: { fn: string; args?: Record<string, unknown> }[] = [];
    const client = {
      auth: { getSession: async () => ({ data: { session: null }, error: null }), signInWithPassword: async () => ({ data: {}, error: null }), signUp: async () => ({ data: null, error: null }), signOut: async () => ({ error: null }) },
      rpc: async (fn: string, args?: Record<string, unknown>) => {
        calls.push({ fn, args });
        const a = answers[fn] ?? {};
        return { data: a.data ?? null, error: a.error ?? null, status: a.error ? 400 : 200 };
      },
    } as unknown as SupabaseLike;
    return { calls, service: createSupabaseSocialService({ url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' }, { client: async () => client }) };
  }

  it('one database function each, with its argument', async () => {
    const f = fake({});
    await f.service.deleteClub('c1');
    await f.service.deleteSharedShop('c2');
    await f.service.deletePlayer('u3');
    await f.service.removeFriend('u4');
    expect(f.calls).toEqual([
      { fn: 'owner_delete_club', args: { p_club: 'c1' } },
      { fn: 'owner_delete_shop', args: { p_club: 'c2' } },
      { fn: 'owner_delete_player', args: { p_user: 'u3' } },
      { fn: 'owner_remove_friend', args: { p_id: 'u4' } },
    ]);
  });

  it('the overview, mapped; the database’s forbidden and invalid come through', async () => {
    const data = {
      clubs: [
        { id: 'c1', name: 'Aquarium Go Friends', initials: 'AG', colors: ['#2f55d4', '#16247a'], members: '3', created_at: '2026-10-19', shop: { name: 'Friends Shop', day: 12, bytes: '2048' } },
        { id: 'c2', name: 'Night Reef', initials: 'NR', colors: ['#2f55d4', '#16247a'], members: 1, created_at: '2026-10-20', shop: null },
      ],
      players: [{ id: 'u1', name: 'Sam', friend_code: 'SAM-7Q2', owner: true, created_at: '2026-10-19', saved_at: '2026-10-31', clubs: 2, bytes: 5000 }, { id: 'u2', name: 'Al', friend_code: 'AL-K4M', owner: false, created_at: '2026-10-20', saved_at: null, clubs: 0, bytes: 0 }],
      bytes: 23_400_000,
    };
    const f = fake({ owner_overview: { data } });
    const o = await f.service.ownerOverview();
    expect(f.calls).toEqual([{ fn: 'owner_overview', args: undefined }]);
    expect(o).toEqual({
      clubs: [
        { id: 'c1', name: 'Aquarium Go Friends', initials: 'AG', colors: ['#2f55d4', '#16247a'], members: 3, createdAt: '2026-10-19', shop: { name: 'Friends Shop', day: 12, bytes: 2048 } },
        { id: 'c2', name: 'Night Reef', initials: 'NR', colors: ['#2f55d4', '#16247a'], members: 1, createdAt: '2026-10-20', shop: null },
      ],
      players: [
        { id: 'u1', name: 'Sam', friendCode: 'SAM-7Q2', owner: true, createdAt: '2026-10-19', savedAt: '2026-10-31', clubs: 2, bytes: 5000 },
        { id: 'u2', name: 'Al', friendCode: 'AL-K4M', owner: false, createdAt: '2026-10-20', savedAt: null, clubs: 0, bytes: 0 },
      ],
      bytes: 23_400_000,
    });
    await expect(fake({ owner_overview: { error: { message: 'forbidden' } } }).service.ownerOverview()).rejects.toEqual({ code: 'forbidden' });
    await expect(fake({ owner_delete_player: { error: { message: 'invalid' } } }).service.deletePlayer('me')).rejects.toEqual({ code: 'invalid' });
    await expect(fake({ owner_overview: { data: null } }).service.ownerOverview()).rejects.toEqual({ code: 'invalid' });
    expect(toOwnerOverview({ clubs: 'x', players: [null, { id: 'u', saved_at: 'soon' }], bytes: 'n' })).toEqual({ clubs: [], players: [{ id: 'u', name: '', friendCode: '', owner: false, createdAt: '', savedAt: null, clubs: 0, bytes: 0 }], bytes: 0 });
  });
});

describe('chunk 18: the Manage card’s sizes and dates', () => {
  it('sizes in KB, MB and GB, never "0.0" for something there', () => {
    expect(formatSize(0)).toBe('0 KB');
    expect(formatSize(NaN)).toBe('0 KB');
    expect(formatSize(12)).toBe('1 KB');
    expect(formatSize(412_000)).toBe('412 KB');
    expect(formatSize(999_499)).toBe('999 KB');
    expect(formatSize(999_500)).toBe('1.0 MB');
    expect(formatSize(1_840_000)).toBe('1.8 MB');
    expect(formatSize(2_300_000_000)).toBe('2.3 GB');
  });

  it('dates as the day and the English month, whatever the device’s locale', () => {
    expect(dayMonth('2026-10-19')).toBe('19 October');
    expect(dayMonth('2026-11-01')).toBe('1 November');
    expect(dayMonth('')).toBe('');
  });
});
