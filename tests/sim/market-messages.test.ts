import { describe, it, expect } from 'vitest';
import type { BuyerArchetype } from '@/types';
import { mulberry32 } from '@/sim/rng';
import { composeBidMessage, templateCount, type Aspect } from '@/sim/economy';
import { BUYER_ARCHETYPE_IDS } from '@/data/buyers';

const ASPECTS: Aspect[] = ['rarity', 'lineage', 'beauty', 'health', 'easyCare', 'size', 'visitorAppeal'];

function sample(archetype: BuyerArchetype, isTank: boolean, n: number, seed: number): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const like = ASPECTS[i % ASPECTS.length];
    const concern = ASPECTS[(i * 3 + 1) % ASPECTS.length];
    out.push(
      composeBidMessage(rng, {
        archetype,
        isTank,
        likes: [like],
        concerns: concern === like ? [] : [concern],
        indifferent: i % 4 === 0 ? 'rarity' : undefined,
        favourite: i % 5 === 0,
        stale: i % 7 === 0,
        changed: i % 11 === 0,
        overBudget: i % 6 === 0,
        vars: {
          species: 'axolotls',
          name: isTank ? 'Mochi’s Tank' : 'Mochi',
          morph: i % 2 ? 'Golden Albino' : '',
          gallons: isTank ? '20' : '',
          org: 'Tidewater Discovery Centre',
          scope: isTank ? 'tank' : 'animal',
        },
      }),
    );
  }
  return out;
}

describe('market: buyer message bank', () => {
  it('has 50+ template fragments per archetype', () => {
    for (const a of BUYER_ARCHETYPE_IDS) expect(templateCount(a)).toBeGreaterThanOrEqual(50);
  });

  it('composes 50+ distinct messages per archetype, for animals and for tanks', () => {
    for (const a of BUYER_ARCHETYPE_IDS) {
      for (const isTank of [false, true]) {
        const msgs = sample(a, isTank, 200, 17 + a.length);
        expect(new Set(msgs).size).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it('never leaks placeholders or scope tags, and stays readable', () => {
    for (const a of BUYER_ARCHETYPE_IDS) {
      for (const isTank of [false, true]) {
        for (const m of sample(a, isTank, 150, 99)) {
          expect(m).not.toMatch(/\{\w+\}/);
          expect(m).not.toMatch(/\[(tank|animal)\]/);
          expect(m).toMatch(/^[A-Z"']/);
          expect(m.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('explains preferences in the way the design asks for', () => {
    const rng = mulberry32(5);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      seen.add(
        composeBidMessage(rng, {
          archetype: 'aquascaper',
          isTank: true,
          likes: ['beauty'],
          concerns: [],
          indifferent: 'rarity',
          vars: { species: 'axolotls', name: 'Tank', morph: '', gallons: '20', scope: 'tank' },
        }),
      );
    }
    expect([...seen].some((m) => /aquascape is gorgeous/i.test(m) && /don't care much about rare morphs/i.test(m))).toBe(true);
    const lineage = new Set<string>();
    for (let i = 0; i < 400; i++) {
      lineage.add(
        composeBidMessage(rng, {
          archetype: 'breeder',
          isTank: true,
          likes: ['lineage'],
          concerns: ['size'],
          vars: { species: 'axolotls', name: 'Tank', morph: '', gallons: '20', scope: 'tank' },
        }),
      );
    }
    expect([...lineage].some((m) => /lineage on the axolotls, but the tank is smaller than I'd like/i.test(m))).toBe(true);
  });
});
