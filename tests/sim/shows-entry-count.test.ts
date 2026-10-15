/**
 * chunk 6 (B-175, the review's M75) — entering a show and withdrawing for a full refund no longer counts as entering:
 * the "show_entries" counter (the "Enter a show" quest, $60 and 4 reputation once) moves when the judges see an entry,
 * so a withdrawn one never counts, nor a scratched one (also refunded); a judged one does. OWNER: lane "shows".
 */
import { describe, it, expect } from 'vitest';
import { enterShow, withdrawEntry } from '@/sim/shows';
import { advanceWorld } from '@/sim/world';
import { showGame, starterOf, wellKept, addShow } from './shows-helpers';

const entries = (g: ReturnType<typeof showGame>) => g.progress.counters.show_entries ?? 0;

describe('B-175: a withdrawn show entry is not an entry', () => {
  it('enter, withdraw before entries close: refunded, and the counter has not moved, even after show day', () => {
    const g = showGame();
    const c = wellKept(starterOf(g));
    const show = addShow(g, 'club', ['open_fw'], { fee: 10 });
    const money = g.finance.money;
    const before = entries(g);
    const r = enterShow(g, show.id, 'open_fw', c.id);
    expect(r.ok, r.message).toBe(true);
    expect(entries(g)).toBe(before);
    expect(withdrawEntry(g, r.entryId!).ok).toBe(true);
    expect(g.finance.money).toBe(money);
    advanceWorld(g, 12);
    expect(entries(g)).toBe(before);
  });

  it('an entry the judges see counts once', () => {
    const g = showGame();
    const c = wellKept(starterOf(g), { bond: 95, conditioning: 90, stress: 5 });
    const show = addShow(g, 'club', ['open_fw'], { fee: 10 });
    const before = entries(g);
    expect(enterShow(g, show.id, 'open_fw', c.id).ok).toBe(true);
    advanceWorld(g, 12);
    expect(g.shows!.entries.find((e) => e.showId === show.id)?.status).toBe('judged');
    expect(entries(g)).toBe(before + 1);
  });
});
