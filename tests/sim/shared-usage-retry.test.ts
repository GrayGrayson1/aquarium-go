// @vitest-environment node
/**
 * The shared-shop server's meters (server/usage.ts; SHARED-SHOPS.md §5.7) while the database can't be reached: a count
 * that is full asks the database once, then waits before it asks again, instead of asking with every frame the server
 * sends. Nothing counted is lost: it goes with the next flush that lands.
 */
import { describe, it, expect } from 'vitest';
import { Usage, FLUSH_BYTES, FLUSH_RETRY_MS, WIRE_FACTOR, monthOf } from '../../server/usage';
import type { Store, UsageRow } from '../../server/store';

/** A store whose only call is the meters'; `down` makes it fail as an unreachable database does. */
function meterStore() {
  const s = { down: false, calls: [] as { month: string; bytes: number; seconds: number }[], total: 0 };
  const store = {
    usageAdd: async (month: string, bytes: number, seconds: number): Promise<UsageRow> => {
      s.calls.push({ month, bytes, seconds });
      if (s.down) throw new Error('usageAdd: TimeoutError');
      s.total += bytes;
      return { month, bytes_out: s.total, awake_seconds: seconds, closed: null };
    },
  } as unknown as Store;
  return { s, store };
}

/** Let a flush that `count` started (and didn't wait for) finish. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const FULL = Math.ceil(FLUSH_BYTES / WIRE_FACTOR);

describe('the meters while the database is down', () => {
  it('a full count asks once, not again with every frame, and again once the wait is over', async () => {
    let t = Date.UTC(2026, 10, 11, 12, 0, 0);
    const { s, store } = meterStore();
    const usage = new Usage(store, () => t);
    s.down = true;
    usage.count('steps', FULL);
    await settle();
    expect(s.calls).toHaveLength(1);
    // a busy shop: a thousand more frames while the database is still down
    for (let i = 0; i < 1000; i++) {
      usage.count('steps', 500);
      await Promise.resolve();
    }
    await settle();
    expect(s.calls, 'no request per frame').toHaveLength(1);
    t += FLUSH_RETRY_MS - 1;
    usage.count('steps', 500);
    await settle();
    expect(s.calls, 'not before the wait is over').toHaveLength(1);
    t += 1;
    usage.count('steps', 500);
    await settle();
    expect(s.calls, 'once the wait is over').toHaveLength(2);
  });

  it('nothing counted is lost: the first flush that lands carries all of it, and full counts flush at once again', async () => {
    let t = Date.UTC(2026, 10, 11, 12, 0, 0);
    const { s, store } = meterStore();
    const usage = new Usage(store, () => t);
    s.down = true;
    usage.count('steps', FULL);
    await settle();
    usage.count('steps', 1000);
    usage.count('http', 234);
    await settle();
    expect(s.total).toBe(0);
    expect(usage.estimate().bytes).toBeCloseTo((FULL + 1234) * WIRE_FACTOR, 3);
    // the database is back
    s.down = false;
    t += FLUSH_RETRY_MS;
    await usage.flush();
    expect(s.total).toBeCloseTo((FULL + 1234) * WIRE_FACTOR, 3);
    expect(usage.row).toMatchObject({ month: monthOf(t) });
    // and a count that fills up again goes at once: the wait was the failure's, not a new rule
    const before = s.calls.length;
    usage.count('steps', FULL);
    await settle();
    expect(s.calls).toHaveLength(before + 1);
  });

  it('the timed flush and a flush asked for by name still go whenever they are called', async () => {
    let t = Date.UTC(2026, 10, 11, 12, 0, 0);
    const { s, store } = meterStore();
    const usage = new Usage(store, () => t);
    s.down = true;
    usage.count('steps', FULL);
    await settle();
    expect(s.calls).toHaveLength(1);
    await usage.flush(); // shutdown's, or the tests'
    expect(s.calls).toHaveLength(2);
    t += 5 * 60_000;
    usage.tick();
    await settle();
    expect(s.calls).toHaveLength(3);
  });
});
