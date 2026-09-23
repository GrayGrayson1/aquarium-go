/**
 * lane:w2-ui — small features wired from the UI: the "Hire your first staff member" board quest (q_first_staff) and
 * the creature card's Feed row food choice (creatureFoodChoice, same suitability rule as the feed picker + feedTank).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { makeContext } from '@/sim/context';
import { feedTank } from '@/sim/care';
import { findSpecies } from '@/data/species';
import { getFoodDef } from '@/data/catalog/foods';
import { QUEST_BY_ID } from '@/data/quests';
import * as F from '@/sim/facility';
import { hireStaff } from '@/sim/staff';
import { staffShop } from '@/dev/fixtures/staff';
import { creatureFoodChoice } from '@/ui/common/foodStock';

function progress(g: GameState, hours = 0.1): void {
  const ctx = makeContext(g, hours);
  F.stepProgression(g, hours, ctx);
  g.clock.hour += hours;
}

describe('w2-ui: "Hire your first staff member" quest', () => {
  it('is a modest, one-off board quest gated on the staff unlock', () => {
    const q = QUEST_BY_ID.q_first_staff;
    expect(q).toBeTruthy();
    expect(q.repeatable).toBeFalsy();
    expect(q.requires).toContainEqual({ type: 'unlocked', key: 'staff' });
    expect(q.reward.money ?? 0).toBeGreaterThan(0);
    expect(q.reward.money ?? 0).toBeLessThanOrEqual(150);
    expect(q.reward.reputation ?? 0).toBeLessThanOrEqual(5);
  });

  it('is not eligible before staff unlock (hobby room)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Buddy', seed: 5 });
    const met = F.evalCond(g, { type: 'unlocked', key: 'staff' }, {});
    expect(met.met).toBe(false);
  });

  it('completes when the Staff tab hire raises the hired_staff flag', () => {
    const g = staffShop();
    expect(g.progress.unlocked).toContain('staff');
    g.progress.tutorial.done = true;
    g.progress.quests = g.progress.quests.filter((q) => q.id === 'tutorial');
    g.progress.quests.push({ id: 'q_first_staff', status: 'active', progress: 0, startedHour: g.clock.hour });
    progress(g);
    expect(g.progress.quests.find((q) => q.id === 'q_first_staff')?.status).toBe('active');
    // what StaffTab's Hire button does: hire, then raise the flag in the same mutation
    const cand = g.staff!.candidates.find((c) => c.role === 'aquarist') ?? g.staff!.candidates[0];
    const r = hireStaff(g, cand.id);
    expect(r.ok).toBe(true);
    F.tutorialAdvance(g, 'hired_staff');
    progress(g);
    expect(g.progress.quests.find((q) => q.id === 'q_first_staff')?.status).toBe('complete');
  });
});

describe('w2-ui: creature card Feed row', () => {
  it('offers only foods the animal eats, and every one of them is accepted by feedTank', () => {
    for (const starter of ['lined_seahorse', 'betta', 'axolotl', 'pea_puffer', 'ocellaris_clownfish'] as const) {
      const g = newGame({ starterId: starter, starterName: 'Pip', seed: 11 });
      // stock the cupboard with a bit of everything the game sells
      for (const id of ['flakes', 'micro_pellets', 'bloodworm_frozen', 'mysis_frozen', 'brine_frozen', 'earthworm', 'sinking_pellets', 'live_copepods']) if (getFoodDef(id)) g.inventory.foods[id] = 5;
      const c = Object.values(g.creatures).find((x) => x.isStarter)!;
      const sp = findSpecies(c.speciesId)!;
      const choice = creatureFoodChoice(g, c.id)!;
      expect(choice.inStock.length).toBeGreaterThan(0);
      for (const f of choice.inStock) {
        expect(getFoodDef(f.id)!.tags.some((t) => sp.foods.includes(t))).toBe(true);
        const r = feedTank(structuredClone(g), c.tankId!, f.id, { targetCreatureId: c.id });
        expect(r.ok, `${starter} ← ${f.id}: ${r.message}`).toBe(true);
      }
    }
  });

  it('with nothing suitable in stock, suggests the cheapest pack it eats (one-tap buy)', () => {
    const g = newGame({ starterId: 'lined_seahorse', starterName: 'Pip', seed: 11 });
    g.inventory.foods = { flakes: 10 };
    const c = Object.values(g.creatures).find((x) => x.isStarter)!;
    const sp = findSpecies(c.speciesId)!;
    const choice = creatureFoodChoice(g, c.id)!;
    expect(choice.inStock).toEqual([]);
    expect(choice.restockId).toBeTruthy();
    expect(getFoodDef(choice.restockId!)!.tags.some((t) => sp.foods.includes(t))).toBe(true);
    expect(choice.restockPrice).toBeGreaterThan(0);
  });
});
