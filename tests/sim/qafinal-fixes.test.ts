/**
 * lane:qa-final — logic behind the final QA pass: the overfeeding tip vs target feeding and keeper rounds, food in
 * background (summary-LOD) tanks, the playthrough bot's seahorse meals, fasting mouthbrooders, the late-game critic
 * toast cap, the creature card's food order and a skipped guide's quest.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { advanceWorld } from '@/sim/world';
import { feedTank } from '@/sim/care';
import { staffStoreWorld } from '@/dev/fixtures/staff';
import { runPlaythrough } from '@/dev/fixtures/playthrough';
import { creatureFoodChoice } from '@/ui/common/foodStock';
import { activeQuests } from '@/sim/facility';

const overfeedTips = (g: GameState) => g.log.filter((e) => /^Overfeeding /.test(e.text));
const alive = (g: GameState, tankId: string) => Object.values(g.creatures).filter((c) => c.tankId === tankId && c.status === 'alive');

describe('overfeeding tip', () => {
  it('never fires for keeper rounds (big_facility, 3 game days)', () => {
    const g = FIXTURES.big_facility();
    advanceWorld(g, 72);
    expect(overfeedTips(g)).toEqual([]);
    expect((g.staff?.feeds ?? []).length).toBeGreaterThan(0);
  });

  it('a round of target feeding (one portion per seahorse) is not overfeeding; ten portions for one is', () => {
    const g = staffStoreWorld(4242);
    const tank = Object.values(g.tanks).find((t) => t.name === 'Seahorse Forest')!;
    for (const c of alive(g, tank.id)) c.stats.hunger = 30;
    g.inventory.foods.mysis_frozen = 200;
    const horses = alive(g, tank.id).filter((c) => c.speciesId === 'lined_seahorse');
    expect(horses.length).toBeGreaterThanOrEqual(2);
    // Add a few more seahorses' worth of tong portions: every one is sized for its animal.
    for (const h of horses) {
      const r = feedTank(g, tank.id, 'mysis_frozen', { targetCreatureId: h.id });
      expect(r.ok).toBe(true);
      expect(r.message).not.toMatch(/more than they can eat/);
    }
    expect(overfeedTips(g)).toEqual([]);
    const r = feedTank(g, tank.id, 'mysis_frozen', { targetCreatureId: horses[0].id, servings: 10 });
    expect(r.message).toMatch(/more than they can eat/);
    expect(overfeedTips(g)).toHaveLength(1);
  });

  it('a keeper-sized feed that is too much says so in its result but never logs or toasts the tip', () => {
    const g = staffStoreWorld(4243);
    const tank = Object.values(g.tanks).find((t) => t.name === 'Betta Row')!;
    g.inventory.foods.flake_tropical = 200;
    const r = feedTank(g, tank.id, 'flake_tropical', { servings: 40, byStaff: true });
    expect(r.message).toMatch(/more than they can eat/);
    expect(overfeedTips(g)).toEqual([]);
    // The same tap by the player does warn.
    feedTank(g, tank.id, 'flake_tropical', { servings: 40 });
    expect(overfeedTips(g)).toHaveLength(1);
  });
});

describe('background tanks eat their food before it rots', () => {
  it('a meal dropped into a summary-LOD tank is eaten about as well as in the focused tank', () => {
    const run = (forceFull: boolean) => {
      const g = FIXTURES.big_facility();
      const tankId = g.tankOrder[g.tankOrder.length - 1]; // beyond the reduced-LOD budget → summary (4 h chunks)
      const cs = alive(g, tankId).filter((c) => c.stats && c.speciesId);
      for (const c of cs) c.stats.hunger = 70;
      const food = Object.keys(g.inventory.foods).find((id) => {
        const r = feedTank(structuredClone(g), tankId, id);
        return r.ok && !/Nothing in this tank eats it/.test(r.message);
      })!;
      expect(feedTank(g, tankId, food).ok).toBe(true);
      advanceWorld(g, 4, { forceFull });
      const hs = alive(g, tankId).map((c) => c.stats.hunger);
      return hs.reduce((a, b) => a + b, 0) / Math.max(1, hs.length);
    };
    const summary = run(false);
    const full = run(true);
    expect(summary).toBeLessThan(full + 12);
    expect(summary).toBeLessThan(55);
  });
});

describe('playthrough bot', () => {
  it('a seahorse keeper feeding two or three times a day never wakes them "very hungry" (seed 1234, 20 days)', () => {
    const r = runPlaythrough({ starterId: 'lined_seahorse', seed: 1234, days: 20 });
    expect(r.events.filter((e) => /very hungry/.test(e.text))).toEqual([]);
  });
});

describe('mouthbrooders', () => {
  it('a brooding Banggai male fasts through the brood without starving (and the tank never says "feed right away" for him)', () => {
    const g = FIXTURES.big_facility();
    let broodHours = 0;
    let minHealth = 100;
    let maxHunger = 0;
    let told = 0;
    for (let i = 0; i < 24 * 9; i++) {
      advanceWorld(g, 1, { focusTankId: g.tankOrder[0] });
      for (const c of Object.values(g.creatures)) {
        if (c.speciesId !== 'banggai_cardinalfish' || c.repro?.stage !== 'brooding') continue;
        broodHours++;
        minHealth = Math.min(minHealth, c.stats.health);
        maxHunger = Math.max(maxHunger, c.stats.hunger);
        const t = g.tanks[c.tankId!];
        if (new RegExp(`${c.name} is (starving|very hungry)`).test(t.cache.statusReason ?? '')) told++;
      }
    }
    expect(broodHours).toBeGreaterThan(100); // the fixture's pair spawns on day 2 and broods ~160 h
    expect(maxHunger).toBeLessThan(80);
    expect(minHealth).toBeGreaterThan(90);
    expect(told).toBe(0);
    expect(Object.values(g.creatures).filter((c) => c.speciesId === 'banggai_cardinalfish' && c.status === 'dead')).toEqual([]);
  });
});

describe('late-game toasts', () => {
  it('critic praise pops up at most once a game day across a big venue (every visit still logged)', () => {
    const g = FIXTURES.big_facility();
    const seen = new Set(g.log.map((e) => e.id));
    const praise: { toast?: boolean; hour: number }[] = [];
    for (let i = 0; i < 72; i++) {
      advanceWorld(g, 1, { focusTankId: g.tankOrder[0] });
      for (const e of g.log) if (!seen.has(e.id)) {
        seen.add(e.id);
        if (/^A visiting critic praised/.test(e.text)) praise.push(e);
      }
    }
    const toasted = praise.filter((e) => e.toast);
    expect(praise.length).toBeGreaterThan(toasted.length);
    expect(toasted.length).toBeLessThanOrEqual(3);
    // (the venue's daily rollover resets it: at most one per calendar game day)
    const days = toasted.map((e) => Math.floor(e.hour / 24));
    expect(new Set(days).size).toBe(days.length);
  });
});

describe('small UI-facing rules', () => {
  it('the creature card offers a reef fish marine food before goldfish or axolotl pellets', () => {
    const g = FIXTURES.big_facility();
    const reef = g.tankOrder.map((id) => g.tanks[id]).find((t) => t.environment === 'marine')!;
    const fish = alive(g, reef.id).find((c) => c.speciesId === 'green_chromis') ?? alive(g, reef.id)[0];
    g.inventory.foods.goldfish_pellets = 5000; // plenty of the wrong kind in the cupboard
    const choice = creatureFoodChoice(g, fish.id)!;
    expect(choice.inStock.length).toBeGreaterThan(0);
    expect(choice.inStock[0].id).not.toMatch(/^(goldfish|axolotl)_/);
  });

  it('a guide skipped by setting the flags (fixtures, old saves) leaves no "First steps" quest on the board', () => {
    const g = FIXTURES.big_facility();
    expect(g.progress.tutorial.skipped).toBe(true);
    expect(activeQuests(g).some((q) => q.id === 'tutorial')).toBe(false);
  });
});
