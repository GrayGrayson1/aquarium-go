// @vitest-environment node
/**
 * Chunk 11 (SHARED-SHOPS.md §3.2 rule 10): a shared copy holds no key whose value is `undefined`. A snapshot (JSON)
 * drops such a key and a joiner adds it back at the end of the object when it's set again, so the copies' key orders
 * would part. The sim deletes keys instead; this walks the state after every step of a few shops (breeding ones,
 * whose guards and partners come and go) and after the player actions that end a guard or a pair (the fresh
 * review's probe, scripts/_audit/review-chunk11/p2-undefined.ts). The catalogue test checks every command once, and the
 * lockstep test the end of its runs.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { applyCommand } from '@/sim/commands';
import { runSharedStep } from '@/sim/sharedStep';

/** Paths (ids folded to `*`) of keys holding `undefined`. */
export function undefinedKeys(o: unknown, path = '', out: string[] = []): string[] {
  if (o === null || typeof o !== 'object' || out.length > 20) return out;
  if (Array.isArray(o)) o.forEach((v) => undefinedKeys(v, `${path}[]`, out));
  else
    for (const [k, v] of Object.entries(o)) {
      const p = `${path}.${/^[a-z]+_[0-9a-z]+$/.test(k) ? '*' : k}`;
      if (v === undefined) out.push(p);
      else undefinedKeys(v, p, out);
    }
  return out;
}
const json = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const actor = { id: 'm_a', name: 'A', at: 1 };

/** Every step's leftover undefined keys, with the step they first appeared at. */
function steps(g: GameState, hours: number): string[] {
  let s = g;
  const seen: string[] = [];
  for (let n = 1; n <= Math.round(hours / 0.25); n++) {
    s = runSharedStep(s, { n, h: 0.25 }, s.tankOrder.slice(0, 4)).state;
    for (const p of undefinedKeys(s)) if (!seen.some((x) => x.startsWith(p))) seen.push(`${p} (step ${n})`);
  }
  return seen;
}

const sameWater = (g: GameState, from: string) => g.tankOrder.find((id) => id !== from && g.tanks[id].waterClass === g.tanks[from].waterClass) ?? g.tankOrder.find((id) => id !== from)!;

describe('chunk 11: no key holds undefined (SHARED-SHOPS.md §3.2 rule 10)', () => {
  for (const [name, hours] of [
    ['breeding_betta', 72],
    ['breeding_clownfish', 72],
    ['breeding_axolotl', 48],
    ['breeding_seahorse', 48],
    ['playthrough_betta', 24],
  ] as const)
    it(`${name}: after every step of ${hours} game hours`, () => {
      expect(steps(json(FIXTURES[name]()), hours)).toEqual([]);
    }, 60_000);

  it('a guarding betta male moved off his nest: after the move and every step', () => {
    const g = json(FIXTURES.breeding_betta());
    const male = Object.values(g.creatures).find((c) => c.speciesId === 'betta' && c.repro.stage === 'guarding')!;
    expect(male).toBeDefined();
    expect(applyCommand(g, { k: 'moveCreature', creature: male.id, to: sameWater(g, male.tankId!), from: male.tankId! }, actor).ok).toBe(true);
    expect(undefinedKeys(g)).toEqual([]);
    expect(steps(g, 2)).toEqual([]);
  });

  it("a clownfish's mate sold: after the sale and every step", () => {
    const g = json(FIXTURES.breeding_clownfish());
    const male = Object.values(g.creatures).find((c) => c.speciesId === 'ocellaris_clownfish' && c.repro.partnerId && c.reproRole !== 'female')!;
    expect(male).toBeDefined();
    expect(applyCommand(g, { k: 'quickSell', creatures: [male.repro.partnerId!] }, actor).ok).toBe(true);
    expect(undefinedKeys(g)).toEqual([]);
    expect(steps(g, 2)).toEqual([]);
  });
});
