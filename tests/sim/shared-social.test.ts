// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §5.3, §6.3, §7.1): what the shared shop asks of the Social service. The player's access
 * token for the server (Supabase's session, refreshed on request, and each refresh heard of so the connection can send
 * it on before the old one expires); the local stub's stub token, in the exact shape the stub server signs in
 * (`stub:<id>:<name>`, `:owner`), the same for the same account; and the local stub's club cards listing the stub
 * server's shops of the clubs the player is in.
 */
import { describe, it, expect } from 'vitest';
import { createLocalSocialStub, createSupabaseSocialService, stubPlayerId, stubTokenFor, type SupabaseLike } from '@/social';

/** The stub server's own rule (server/stub.ts). */
const STUB_TOKEN = /^stub:([A-Za-z0-9_-]{1,40}):([^:]{1,30})(:owner)?$/;

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('chunk 13: the stub token', () => {
  it('has the shape the stub server signs in, whatever the name, and is the same for the same account', () => {
    for (const [name, owner] of [
      ['Ola', true],
      ['Ben: the second', false],
      ['A very long display name, really', false],
      ['   ', false],
    ] as const) {
      const t = stubTokenFor({ email: 'Ola@Example.com', displayName: name, owner });
      expect(t).toMatch(STUB_TOKEN);
      expect(t.endsWith(':owner')).toBe(owner);
    }
    expect(stubPlayerId(' ola@example.com')).toBe(stubPlayerId('OLA@example.com'));
    expect(stubPlayerId('ola@example.com')).not.toBe(stubPlayerId('ben@example.com'));
  });

  it("the local stub's access token: none signed out, the stub token signed in", async () => {
    const storage = memory();
    const stub = createLocalSocialStub({ storage, latency: [0, 0], sharedServer: null });
    expect(await stub.accessToken!()).toBeNull();
    storage.setItem('aquarium-go.social.v1', JSON.stringify({ email: 'ola@example.com', displayName: 'Ola', joinedClubIds: ['highland-betta'], joinedMonths: {}, owner: true }));
    expect(await stub.accessToken!()).toBe(stubTokenFor({ email: 'ola@example.com', displayName: 'Ola', owner: true }));
  });

  it("the local stub's club cards list the stub server's shops of the player's clubs only; none when it isn't running", async () => {
    const storage = memory();
    storage.setItem('aquarium-go.social.v1', JSON.stringify({ email: 'ola@example.com', displayName: 'Ola', joinedClubIds: ['highland-betta'], joinedMonths: {} }));
    const asked: string[] = [];
    const fetchFake = (async (url: string) => {
      asked.push(url);
      return new Response(
        JSON.stringify([
          { club: 'highland-betta', name: 'Sapphire', day: 3, money: 280, playedAt: 5 },
          { club: 'nano-tank', name: 'Not mine', day: 1, money: 300, playedAt: 1 },
        ]),
      );
    }) as unknown as typeof fetch;
    const stub = createLocalSocialStub({ storage, latency: [0, 0], sharedServer: 'http://127.0.0.1:4396/', fetch: fetchFake });
    expect(await stub.sharedShops()).toEqual({ shops: [{ club: 'highland-betta', name: 'Sapphire', day: 3, money: 280, playedAt: 5 }], closed: null, reopens: null });
    expect(asked).toEqual(['http://127.0.0.1:4396/stub/shops']);
    const down = createLocalSocialStub({ storage, latency: [0, 0], sharedServer: 'http://127.0.0.1:4396', fetch: (async () => Promise.reject(new Error('refused'))) as unknown as typeof fetch });
    expect((await down.sharedShops()).shops).toEqual([]);
  });
});

describe("chunk 13: Supabase's access token", () => {
  function fake() {
    let session: unknown = { access_token: 'tok-1', user: { id: 'u1' } };
    let listener: ((event: string, s: { user?: { id?: unknown }; access_token?: unknown } | null) => void) | null = null;
    const client = {
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        refreshSession: async () => {
          session = { access_token: 'tok-2', user: { id: 'u1' } };
          return { data: { session }, error: null };
        },
        signInWithPassword: async () => ({ data: {}, error: null }),
        signUp: async () => ({ data: { session }, error: null }),
        signOut: async () => {
          session = null;
          return { error: null };
        },
        onAuthStateChange: (cb: typeof listener) => {
          listener = cb;
          return { data: { subscription: { unsubscribe() {} } } };
        },
      },
      rpc: async () => ({ data: null, error: null, status: 200 }),
    } as unknown as SupabaseLike;
    return { client, fire: (event: string, s: { access_token?: unknown } | null) => listener?.(event, s), signOut: () => (session = null) };
  }

  it('is the session’s token, a fresh one on request, and null signed out', async () => {
    const f = fake();
    const svc = createSupabaseSocialService({ url: 'https://x.supabase.co', publishableKey: 'k' }, { client: async () => f.client });
    expect(await svc.accessToken!()).toBe('tok-1');
    expect(await svc.accessToken!({ refresh: true })).toBe('tok-2');
    f.signOut();
    expect(await svc.accessToken!()).toBeNull();
  });

  it('each refreshed token is heard of (the connection sends it on before the old one expires)', async () => {
    const f = fake();
    const svc = createSupabaseSocialService({ url: 'https://x.supabase.co', publishableKey: 'k' }, { client: async () => f.client });
    const got: string[] = [];
    const off = svc.onAccessToken!((t) => got.push(t));
    await svc.accessToken!(); // the client exists, its events attached
    f.fire('TOKEN_REFRESHED', { access_token: 'tok-9' });
    f.fire('USER_UPDATED', { access_token: 'tok-10' });
    off();
    f.fire('TOKEN_REFRESHED', { access_token: 'tok-11' });
    expect(got).toEqual(['tok-9']);
  });
});
