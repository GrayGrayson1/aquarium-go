/**
 * Who a member is (SHARED-SHOPS.md §5.3): the server asks Supabase Auth who a player's access token belongs to (`GET
 * /auth/v1/user` with the publishable key) and keeps the answer until the token expires, so a reconnect costs no
 * call. Supabase refreshes tokens hourly; the browser sends the new one (`{t:'token'}`), which must name the same
 * player. The stub (./stub.ts) implements the same interface for tests and dev.
 */

export interface Who {
  user: string;
  /** When the token stops being valid (real ms). */
  exp: number;
}

export interface Auth {
  verify(token: string): Promise<Who | null>;
}

/** The token's expiry from its payload (already checked by Supabase), or an hour from now. */
function expiryOf(token: string, now: number): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: unknown };
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) return Math.min(payload.exp * 1000, now + 3_600_000);
  } catch {
    // not a JWT we can read: an hour at most
  }
  return now + 3_600_000;
}

const MAX_CACHED = 1000;

export function supabaseAuth(project: { url: string; publishableKey: string }, meter: (bytes: number) => void = () => {}, now: () => number = Date.now): Auth {
  const cache = new Map<string, Who>();
  return {
    async verify(token) {
      if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return null;
      const t = now();
      const hit = cache.get(token);
      if (hit && hit.exp > t) return hit;
      meter(token.length + 300);
      let res: Response;
      try {
        res = await fetch(`${project.url.replace(/\/$/, '')}/auth/v1/user`, {
          headers: { apikey: project.publishableKey, authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        return null;
      }
      if (!res.ok) {
        await res.body?.cancel();
        return null;
      }
      const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
      if (!body || typeof body.id !== 'string') return null;
      const who: Who = { user: body.id, exp: expiryOf(token, t) };
      if (cache.size >= MAX_CACHED) for (const [k, v] of cache) if (v.exp <= t || cache.size >= MAX_CACHED) cache.delete(k);
      cache.set(token, who);
      return who;
    },
  };
}
