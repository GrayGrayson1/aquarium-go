/**
 * Test support (not a test file): run a scenario with no equipment breakdowns. A breakdown is a roll on the shared
 * random stream, so runs that walk the stream differently (another step size, another hire, more species in the shop)
 * break down in different places and at different times. A test that compares such runs, or needs a tank's devices
 * working for days, and isn't about breakdowns turns them off with this: every failure rate (or only those of `ids`)
 * is 0 while `fn` runs and is put back afterwards, even if it throws. `fn` must be synchronous.
 */
import { EQUIPMENT } from '@/data/catalog/equipment';

export function withoutBreakdowns<T>(fn: () => T, ids?: readonly string[]): T {
  const defs = EQUIPMENT.filter((d) => d.stats.failureRate !== undefined && (!ids || ids.includes(d.id)));
  const saved = defs.map((d) => d.stats.failureRate);
  for (const d of defs) d.stats.failureRate = 0;
  try {
    return fn();
  } finally {
    defs.forEach((d, i) => (d.stats.failureRate = saved[i]));
  }
}
