/**
 * Balance robustness: the careful bot on six more seeds per starter. OWNER: lane "w2-sim".
 *
 * tests/sim/playthrough-starters.test.ts pins the documented timelines on three seeds. This file checks that the
 * core promises don't hinge on those seeds' luck: before the round-2 sim fixes, a different random draw (even just
 * different names) could leave an axolotl keeper's pair in chronically ammonia-laden water, a board of quests nobody
 * could finish, or an unsold batch of juveniles fighting in the nursery. Sweep (123 seeds × 5 starters, see the
 * w2-sim report): every seed reaches the shop in 39–130 real minutes, with no adult deaths, debt or loans.
 * Seeds here are arbitrary (not chosen for margin).
 */
import { describe, it, expect } from 'vitest';
import { runPlaythrough, type PlaythroughResult } from '@/dev/fixtures/playthrough';
import { STARTER_IDS } from '@/data/species';

const START = 8;
const REAL_HOUR = 15 * 24;
const H = (r: PlaythroughResult, m: keyof PlaythroughResult['milestones']) => (r.milestones[m] === undefined ? Infinity : r.milestones[m]! - START);

describe('balance robustness: the core promises hold on more seeds', () => {
  for (const id of STARTER_IDS) {
    it(`${id}: shop in ~1–2 real hours, offspring sold, nobody dies, no debt — seeds 3, 8, 13, 21, 34, 55`, () => {
      for (const seed of [3, 8, 13, 21, 34, 55]) {
        const r = runPlaythrough({ starterId: id, seed, days: 36 });
        const tag = `${id} seed ${seed}`;
        expect(H(r, 'first_spawn'), `${tag} breeding`).toBeLessThanOrEqual(REAL_HOUR);
        expect(H(r, 'first_offspring_sale'), `${tag} offspring sale`).toBeLessThanOrEqual(2 * REAL_HOUR);
        expect(H(r, 'specialty_shop'), `${tag} shop`).toBeGreaterThanOrEqual(0.6 * REAL_HOUR);
        expect(H(r, 'specialty_shop'), `${tag} shop`).toBeLessThanOrEqual(2.25 * REAL_HOUR);
        expect(r.milestones.in_debt, `${tag} debt`).toBeUndefined();
        expect(r.milestones.loan, `${tag} loan`).toBeUndefined();
        expect(r.deaths.filter((d) => !d.young), `${tag} deaths`).toEqual([]);
        expect(r.problems, `${tag} bot problems`).toEqual([]);
      }
    });
  }
});
