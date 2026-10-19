// @vitest-environment node
/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §5.2, §8.1; REL-028, REL-030; SOC-002 extended) — the Supabase service
 * against a fake client that records `auth.*` and `rpc` calls and answers as Supabase does: each method's call and
 * mapping, every error mapping, sign-up's checks and metadata, trades without a call, friends' pictures only as embedded
 * images, the standing sent before a leaderboard, the online save's calls. Then the real supabase-js client on a fake
 * fetch and a fake storage: after sign-in and sign-up no stored value contains the password.
 */
import { describe, it, expect, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseSocialService, AUTH_STORAGE_KEY, type SupabaseLike, type SocialService } from '@/social';
import { isNetworkFailure, mapAuthError, mapRpcError, safeSnapshot } from '@/social/supabase/service';

const PROJECT = { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' };
const PASSWORD = 'correct horse battery';
const ME = { id: 'u1', email: 'sam@example.com', display_name: 'Sam', friend_code: 'SAM-7Q2', is_owner: false };

type Answer = { data?: unknown; error?: { message?: string; code?: string; status?: number; name?: string } | null; status?: number };

/** A fake client: `answers` per rpc name (a function of the args, or a value); auth answers settable. */
function fake(answers: Record<string, Answer | ((args: Record<string, unknown> | undefined) => Answer)> = {}) {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const auth = {
    session: null as unknown,
    signInError: null as Answer['error'],
    signUpError: null as Answer['error'],
    signUpSession: true,
    signOutError: null as Answer['error'],
    getSessionError: null as Answer['error'],
  };
  const authCalls: { fn: string; arg?: unknown }[] = [];
  const client: SupabaseLike = {
    auth: {
      getSession: async () => {
        authCalls.push({ fn: 'getSession' });
        return { data: { session: auth.session }, error: auth.getSessionError ?? null };
      },
      signInWithPassword: async (c) => {
        authCalls.push({ fn: 'signInWithPassword', arg: c });
        if (!auth.signInError) auth.session = { user: { id: 'u1' } };
        return { data: {}, error: auth.signInError ?? null };
      },
      signUp: async (c) => {
        authCalls.push({ fn: 'signUp', arg: c });
        if (!auth.signUpError && auth.signUpSession) auth.session = { user: { id: 'u1' } };
        return { data: { session: auth.signUpError || !auth.signUpSession ? null : auth.session }, error: auth.signUpError ?? null };
      },
      signOut: async (o) => {
        authCalls.push({ fn: 'signOut', arg: o });
        auth.session = null;
        return { error: auth.signOutError ?? null };
      },
    },
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      const a = answers[fn];
      const r = typeof a === 'function' ? a(args) : (a ?? { data: null });
      return { data: r.data ?? null, error: r.error ?? null, status: r.status ?? (r.error ? 400 : 200) };
    },
  };
  return { client, calls, auth, authCalls };
}

const service = (f: ReturnType<typeof fake>, extra: Parameters<typeof createSupabaseSocialService>[1] = {}): SocialService => createSupabaseSocialService(PROJECT, { client: async () => f.client, ...extra });
const DETAILS = { displayName: '  Sam ', inviteCode: ' friends-4821 ', ageConfirmed: true };
const CLUB = { id: 'c1', name: 'Aquarium Go Friends', initials: 'AG', colors: ['#2f55d4', '#16247a'], members: 3, blurb: 'Friends and family of Aquarium Go', joined: '2026-10', invite_code: 'FRIENDS-4821' };

describe('accounts', () => {
  it('signs in with signInWithPassword, then reads me()', async () => {
    const f = fake({ me: { data: { ...ME, is_owner: true } } });
    const u = await service(f).signIn(' sam@example.com ', PASSWORD);
    expect(u).toEqual({ id: 'u1', email: 'sam@example.com', displayName: 'Sam', friendCode: 'SAM-7Q2', isOwner: true });
    expect(f.authCalls[0]).toEqual({ fn: 'signInWithPassword', arg: { email: 'sam@example.com', password: PASSWORD } });
    expect(f.calls.map((c) => c.fn)).toEqual(['me']);
  });

  it('a wrong email or password is `credentials`; a bad form is `invalid` without a call; no answer is `network`', async () => {
    const f = fake();
    f.auth.signInError = { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' };
    await expect(service(f).signIn('sam@example.com', PASSWORD)).rejects.toEqual({ code: 'credentials' });
    const g = fake();
    await expect(service(g).signIn('nope', 'short')).rejects.toEqual({ code: 'invalid' });
    expect(g.authCalls).toEqual([]);
    const h = fake();
    h.auth.signInError = { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' };
    await expect(service(h).signIn('sam@example.com', PASSWORD)).rejects.toEqual({ code: 'network' });
  });

  it('signs up: checks the form, then the invite code (resolve_invite), then sends the details as metadata', async () => {
    const f = fake({ resolve_invite: { data: { club: CLUB, already_member: false } }, me: { data: ME } });
    const u = await service(f).signUp('sam@example.com', PASSWORD, DETAILS);
    expect(u.displayName).toBe('Sam');
    expect(f.calls[0]).toEqual({ fn: 'resolve_invite', args: { p_code: 'FRIENDS-4821' } });
    expect(f.authCalls[0]).toEqual({ fn: 'signUp', arg: { email: 'sam@example.com', password: PASSWORD, options: { data: { invite_code: 'FRIENDS-4821', display_name: 'Sam', age_ok: true } } } });
  });

  it('sign-up’s own checks come first and call nothing: the email and password, the name, the box, an empty code', async () => {
    for (const [details, email, code] of [
      [DETAILS, 'bad', 'invalid'],
      [{ ...DETAILS, displayName: ' ' }, 'sam@example.com', 'name'],
      [{ ...DETAILS, displayName: 'x'.repeat(31) }, 'sam@example.com', 'name'],
      [{ ...DETAILS, ageConfirmed: false }, 'sam@example.com', 'age'],
      [{ ...DETAILS, inviteCode: '  ' }, 'sam@example.com', 'invite'],
    ] as const) {
      const f = fake();
      await expect(service(f).signUp(email, PASSWORD, details)).rejects.toEqual({ code });
      expect(f.authCalls).toEqual([]);
      expect(f.calls).toEqual([]);
    }
  });

  it('a code that opens nothing is `invite` before any account is made; the server refusing it is `invite` too', async () => {
    const f = fake({ resolve_invite: { data: null } });
    await expect(service(f).signUp('sam@example.com', PASSWORD, DETAILS)).rejects.toEqual({ code: 'invite' });
    expect(f.authCalls).toEqual([]);
    const g = fake({ resolve_invite: { data: { club: CLUB, already_member: false } } });
    g.auth.signUpError = { status: 500, code: 'unexpected_failure', message: 'Database error saving new user' };
    await expect(service(g).signUp('sam@example.com', PASSWORD, DETAILS)).rejects.toEqual({ code: 'invite' });
  });

  it('an email with an account is `taken` (both of Supabase’s codes)', async () => {
    for (const code of ['user_already_exists', 'email_exists']) {
      const f = fake({ resolve_invite: { data: { club: CLUB, already_member: false } } });
      f.auth.signUpError = { status: 422, code, message: 'User already registered' };
      await expect(service(f).signUp('sam@example.com', PASSWORD, DETAILS)).rejects.toEqual({ code: 'taken' });
    }
  });

  it('a sign-up that returns no session (confirmation on by mistake) signs in as the new account', async () => {
    const f = fake({ resolve_invite: { data: { club: CLUB, already_member: false } }, me: { data: ME } });
    f.auth.signUpSession = false;
    await service(f).signUp('sam@example.com', PASSWORD, DETAILS);
    expect(f.authCalls.map((c) => c.fn)).toEqual(['signUp', 'signInWithPassword']);
  });

  it('currentUser: no session is null without a call; a session reads me(); a gone account forgets the session', async () => {
    const f = fake({ me: { data: ME } });
    expect(await service(f).currentUser()).toBeNull();
    expect(f.calls).toEqual([]);
    f.auth.session = { user: { id: 'u1' } };
    expect((await service(f).currentUser())?.friendCode).toBe('SAM-7Q2');
    const g = fake({ me: { data: null } });
    g.auth.session = { user: { id: 'gone' } };
    expect(await service(g).currentUser()).toBeNull();
    expect(g.authCalls.at(-1)).toEqual({ fn: 'signOut', arg: { scope: 'local' } });
    const h = fake();
    h.auth.getSessionError = { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' };
    await expect(service(h).currentUser()).rejects.toEqual({ code: 'network' });
  });

  it('signs out on this device only; Delete my account calls delete_my_account, then signs out here', async () => {
    const f = fake();
    await service(f).signOut();
    expect(f.authCalls).toEqual([{ fn: 'signOut', arg: { scope: 'local' } }]);
    const g = fake();
    await service(g).deleteAccount();
    expect(g.calls.map((c) => c.fn)).toEqual(['delete_my_account']);
    expect(g.authCalls).toEqual([{ fn: 'signOut', arg: { scope: 'local' } }]);
  });

  it('a delete the server refuses leaves the session alone', async () => {
    const f = fake({ delete_my_account: { error: { message: 'not_signed_in', code: 'P0001' } } });
    await expect(service(f).deleteAccount()).rejects.toEqual({ code: 'invalid' });
    expect(f.authCalls).toEqual([]);
  });
});

describe('clubs, friends, leaderboards, news (§4.3)', () => {
  it('clubs: my_clubs mapped (the invite code only where the server sends it)', async () => {
    const f = fake({ my_clubs: { data: { mine: [CLUB], suggested: [{ ...CLUB, id: 'c2', name: 'Reef Night', joined: undefined, invite_code: undefined }] } } });
    const r = await service(f).clubs();
    expect(r.mine).toEqual([{ id: 'c1', name: 'Aquarium Go Friends', initials: 'AG', colors: ['#2f55d4', '#16247a'], members: 3, blurb: 'Friends and family of Aquarium Go', joined: '2026-10', inviteCode: 'FRIENDS-4821' }]);
    expect(r.suggested[0]).not.toHaveProperty('inviteCode');
    expect(r.suggested[0]).not.toHaveProperty('joined');
  });

  it('resolveInvite, joinClub, createClub, addFriend, friendRequests, acceptFriend, markSeen: one call each, mapped', async () => {
    const f = fake({
      resolve_invite: { data: { club: CLUB, already_member: true } },
      create_club: { data: CLUB },
      friend_requests: { data: [{ id: 'u2', name: 'Ola', created_at: '2026-10-19T10:00:00Z' }] },
      news: { data: { trades: 0, clubs: 2 } },
    });
    const s = service(f);
    expect(await s.resolveInvite(' friends-4821 ')).toMatchObject({ club: { id: 'c1' }, alreadyMember: true });
    await s.joinClub('c1');
    expect((await s.createClub(' Aquarium Go Friends ', ' Friends ')).inviteCode).toBe('FRIENDS-4821');
    await s.addFriend(' ola-7q2 ');
    expect(await s.friendRequests()).toEqual([{ id: 'u2', name: 'Ola', createdAt: '2026-10-19T10:00:00Z' }]);
    await s.acceptFriend('u2');
    expect(await s.news()).toEqual({ trades: 0, clubs: 2 });
    await s.markSeen();
    expect(f.calls).toEqual([
      { fn: 'resolve_invite', args: { p_code: 'FRIENDS-4821' } },
      { fn: 'join_club', args: { p_club: 'c1' } },
      { fn: 'create_club', args: { p_name: 'Aquarium Go Friends', p_blurb: 'Friends' } },
      { fn: 'add_friend', args: { p_code: 'OLA-7Q2' } },
      { fn: 'friend_requests', args: undefined },
      { fn: 'accept_friend', args: { p_id: 'u2' } },
      { fn: 'news', args: undefined },
      { fn: 'mark_seen', args: undefined },
    ]);
  });

  it('createClub checks the name first; the server’s `forbidden` and `invalid` come through', async () => {
    const f = fake({ create_club: { error: { message: 'forbidden', code: 'P0001' } } });
    await expect(service(f).createClub('A', '')).rejects.toEqual({ code: 'invalid' });
    expect(f.calls).toEqual([]);
    await expect(service(f).createClub('Reef Night', '')).rejects.toEqual({ code: 'forbidden' });
    const g = fake({ add_friend: { error: { message: 'invalid', code: 'P0001' } } });
    await expect(service(g).addFriend('NOBODY-123')).rejects.toEqual({ code: 'invalid' });
  });

  it('trades open later: [] without a call', async () => {
    const f = fake();
    expect(await service(f).trades()).toEqual([]);
    expect(f.calls).toEqual([]);
  });

  it('friends’ aquariums: no likes; a picture only when it’s an embedded JPEG or WebP, else the drawn one', async () => {
    const jpeg = 'data:image/jpeg;base64,/9j/AAAA';
    const f = fake({
      friends_aquariums: {
        data: [
          { id: 'u2', owner: 'Ola', title: 'Ola’s Reef', gallons: 120, snapshot: jpeg, updated_at: '2026-10-19T10:00:00Z' },
          { id: 'u3', owner: 'Ada', title: 'Ada', gallons: 0, snapshot: null, updated_at: '2026-10-18T10:00:00Z' },
          { id: 'u4', owner: 'Eve', title: 'Eve', gallons: 10, snapshot: 'https://tracker.example/pixel.png', updated_at: '2026-10-18T10:00:00Z' },
        ],
      },
    });
    const r = await service(f).friendsAquariums();
    expect(r.map((x) => [x.owner, x.gallons, x.likes])).toEqual([
      ['Ola', 120, null],
      ['Ada', 0, null],
      ['Eve', 10, null],
    ]);
    expect(r[0].snapshotUrl).toBe(jpeg);
    expect(r[1].snapshotUrl.startsWith('data:image/svg+xml')).toBe(true);
    expect(r[2].snapshotUrl.startsWith('data:image/svg+xml')).toBe(true); // never a remote address
    expect(safeSnapshot('data:image/png;base64,AAAA').startsWith('data:image/svg+xml')).toBe(true);
  });

  it('a leaderboard sends the player’s standing first, then reads it; my row is "me"', async () => {
    const f = fake({ leaderboard: { data: { rows: [{ rank: 1, name: 'Ola', value: '214900', me: false }, { rank: 2, name: 'Coral Corner', value: 5460, me: true }], me: { rank: 2, name: 'Coral Corner', value: 5460, me: true } } } });
    const s = service(f, { standing: () => ({ name: 'Coral Corner', collection_value: 5460.4, prismatics: 1, show_wins: 0, gallons: 40 }) });
    const r = await s.leaderboard('collection_value');
    expect(f.calls[0]).toEqual({ fn: 'report_standing', args: { p_shop_name: 'Coral Corner', p_gallons: 40, p_collection: 5460, p_prismatics: 1, p_show_wins: 0, p_snapshot: null } });
    expect(f.calls[1]).toEqual({ fn: 'leaderboard', args: { p_kind: 'collection_value' } });
    expect(r.rows).toEqual([
      { rank: 1, name: 'Ola', value: 214900 },
      { rank: 2, name: 'Coral Corner', value: 5460, me: true },
    ]);
    expect(r.me).toEqual({ rank: 2, name: 'Coral Corner', value: 5460, me: true });
  });

  it('reportStanding rounds and sends the picture when there is one', async () => {
    const f = fake();
    await service(f).reportStanding({ shopName: 'Coral Corner', gallons: 40.4, collectionValue: 99.6, prismatics: 1, showWins: 2, snapshot: 'data:image/jpeg;base64,AAAA' });
    expect(f.calls[0]).toEqual({ fn: 'report_standing', args: { p_shop_name: 'Coral Corner', p_gallons: 40, p_collection: 100, p_prismatics: 1, p_show_wins: 2, p_snapshot: 'data:image/jpeg;base64,AAAA' } });
  });
});

describe('the online save (§6)', () => {
  const META = { revision: 3, save_id: 'save_a', schema_version: 30, saved_at: 1000, hour: 50.5, shop_name: 'Coral Corner', day: 3, money: 4210.25 };

  it('cloudMeta and cloudDownload: save_meta and get_save mapped; none is null', async () => {
    const f = fake({ save_meta: { data: META }, get_save: { data: { meta: META, encoding: 'gzip-base64', body: 'H4sI' } } });
    const s = service(f);
    expect(await s.cloudMeta()).toEqual({ revision: 3, saveId: 'save_a', schemaVersion: 30, savedAt: 1000, hour: 50.5, shopName: 'Coral Corner', day: 3, money: 4210.25 });
    expect(await s.cloudDownload()).toEqual({ meta: expect.objectContaining({ revision: 3 }), encoding: 'gzip-base64', body: 'H4sI' });
    const g = fake();
    expect(await service(g).cloudMeta()).toBeNull();
    expect(await service(g).cloudDownload()).toBeNull();
  });

  it('cloudUpload: put_save with the expected revision; ok, too_new and conflict come back as they are', async () => {
    const save = { saveId: 'save_a', schemaVersion: 30, savedAt: 1000.4, hour: 50.5, shopName: 'x'.repeat(70), day: 3, money: 4210.25, encoding: 'gzip-base64' as const, body: 'H4sI' };
    const f = fake({ put_save: (args) => ({ data: args?.p_expected === 3 ? { ok: true, revision: 4 } : args?.p_expected === 9 ? { ok: false, reason: 'too_new', meta: { ...META, schema_version: 31 } } : { ok: false, reason: 'conflict', meta: META } }) });
    const s = service(f);
    expect(await s.cloudUpload(save, 3)).toEqual({ ok: true, revision: 4 });
    expect(f.calls[0]).toEqual({ fn: 'put_save', args: { p_expected: 3, p_save_id: 'save_a', p_schema_version: 30, p_saved_at: 1000, p_hour: 50.5, p_shop_name: 'x'.repeat(60), p_day: 3, p_money: 4210.25, p_encoding: 'gzip-base64', p_body: 'H4sI' } });
    expect(await s.cloudUpload(save, 9)).toEqual({ ok: false, reason: 'too_new', meta: expect.objectContaining({ schemaVersion: 31 }) });
    expect(await s.cloudUpload(save, 1)).toEqual({ ok: false, reason: 'conflict', meta: expect.objectContaining({ revision: 3 }) });
  });
});

describe('error mapping', () => {
  it('network: no answer, a gateway or server error, a rate limit, the browsers’ fetch-failure words, a timeout', async () => {
    expect(isNetworkFailure({ status: 0 })).toBe(true);
    expect(isNetworkFailure({ status: 503 })).toBe(true);
    expect(isNetworkFailure({ status: 429 })).toBe(true);
    expect(isNetworkFailure({ name: 'AuthRetryableFetchError' })).toBe(true);
    for (const m of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'fetch failed']) expect(isNetworkFailure({ message: m })).toBe(true);
    expect(isNetworkFailure({ status: 400, message: 'invalid' })).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
    const f = fake({ me: { error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 } });
    f.auth.session = { user: { id: 'u1' } };
    await expect(service(f).currentUser()).rejects.toEqual({ code: 'network' });
    // a call that never answers
    const hang: SupabaseLike = { ...f.client, rpc: () => new Promise(() => {}) };
    await expect(createSupabaseSocialService(PROJECT, { client: async () => hang, timeoutMs: 20 }).news()).rejects.toEqual({ code: 'network' });
    // the library itself didn't load (offline at first use)
    await expect(createSupabaseSocialService(PROJECT, { client: async () => Promise.reject(new Error('chunk')) }).news()).rejects.toEqual({ code: 'network' });
  });

  it('the database functions’ fixed messages, and requests that were wrong', () => {
    expect(mapRpcError({ message: 'forbidden', code: 'P0001' })).toEqual({ code: 'forbidden' });
    expect(mapRpcError({ message: 'invalid', code: 'P0001' })).toEqual({ code: 'invalid' });
    expect(mapRpcError({ message: 'not_signed_in', code: 'P0001' })).toEqual({ code: 'invalid' });
    expect(mapRpcError({ message: 'permission denied for function me', code: '42501' }, 401)).toEqual({ code: 'invalid' });
    expect(mapRpcError({ message: 'invalid input syntax for type uuid: "highland-betta"', code: '22P02' })).toEqual({ code: 'invalid' });
    expect(mapRpcError({ message: 'upstream', code: '' }, 502)).toEqual({ code: 'network' });
  });

  it('auth errors, by when they happen', () => {
    expect(mapAuthError({ code: 'invalid_credentials', status: 400 }, 'signIn')).toEqual({ code: 'credentials' });
    expect(mapAuthError({ code: 'email_exists', status: 422 }, 'signUp')).toEqual({ code: 'taken' });
    expect(mapAuthError({ code: 'weak_password', status: 422 }, 'signUp')).toEqual({ code: 'invalid' });
    expect(mapAuthError({ code: 'over_request_rate_limit', status: 429 }, 'signIn')).toEqual({ code: 'network' });
    expect(mapAuthError({ status: 500, code: 'unexpected_failure', message: 'Database error saving new user' }, 'signUp')).toEqual({ code: 'invite' });
    expect(mapAuthError({ status: 500, message: 'Database error saving new user' }, 'signIn')).toEqual({ code: 'network' });
  });
});

describe('SOC-002 on the real client: the password is never stored', () => {
  it('after sign-in and sign-up, supabase-js keeps tokens under aquarium-go.auth.v1, and nothing stored holds the password', async () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'sam@example.com', app_metadata: {}, user_metadata: { display_name: 'Sam' }, created_at: '2026-10-19T10:00:00Z' };
    const session = { access_token: 'header.payload.sig', refresh_token: 'refresh-abc', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user };
    const seen: string[] = [];
    const fetchFake = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push(url);
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
      if (url.includes('/auth/v1/token')) return json(session);
      if (url.includes('/auth/v1/signup')) return json(session);
      if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
      if (url.includes('/rest/v1/rpc/me')) return json(ME);
      if (url.includes('/rest/v1/rpc/resolve_invite')) return json({ club: CLUB, already_member: false });
      return json({ message: `unexpected ${url} ${init?.method}` }, 404);
    });
    const client = createClient(PROJECT.url, PROJECT.publishableKey, { auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, storageKey: AUTH_STORAGE_KEY, storage }, global: { fetch: fetchFake as unknown as typeof fetch } });
    const s = createSupabaseSocialService(PROJECT, { client: async () => client as unknown as SupabaseLike, storage });
    await s.signIn('sam@example.com', PASSWORD);
    expect([...store.keys()]).toEqual([AUTH_STORAGE_KEY]);
    expect(JSON.stringify([...store.entries()])).not.toContain(PASSWORD);
    expect(JSON.stringify([...store.entries()])).not.toContain('battery');
    await s.signOut();
    expect(store.has(AUTH_STORAGE_KEY)).toBe(false);
    await s.signUp('sam@example.com', PASSWORD, DETAILS);
    expect(JSON.stringify([...store.entries()])).not.toContain(PASSWORD);
    expect(seen.some((u) => u.includes('/rest/v1/rpc/resolve_invite'))).toBe(true);
    expect(seen.every((u) => u.startsWith(PROJECT.url))).toBe(true); // only the project's own address
  });
});
