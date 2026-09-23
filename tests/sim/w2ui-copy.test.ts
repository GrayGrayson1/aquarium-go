/**
 * lane:w2-ui — copy fixes: buyer messages read as plurals for pairs, groups, juvenile batches and frag packs; one
 * real-time format for bid expiry; no "24 h" / "1 d 0 h" / "1 days" at unit edges; a/an before vowel sounds.
 */
import { describe, it, expect } from 'vitest';
import type { BuyerArchetype, GameState, Creature, Sex } from '@/types';
import { mulberry32, simRng } from '@/sim/rng';
import { newGame } from '@/sim/newGame';
import { createCreature, addCreature } from '@/sim/life';
import { createListing, devOpenMarket, devStepEconomy, forceBuyerVisit } from '@/sim/economy';
import { composeBidMessage, counterReply, buyNowMessage, withdrawMessage, saleFeedback, type Aspect, type MsgVars } from '@/sim/economy/messages';
import { BUYER_ARCHETYPE_IDS } from '@/data/buyers';
import { formatSpan, realIn, realAgo } from '@/ui/panels/common/format';
import { realIn as showsRealIn } from '@/ui/panels/shows/util';

const ASPECTS: Aspect[] = ['rarity', 'lineage', 'beauty', 'health', 'easyCare', 'size', 'visitorAppeal'];

/** Singular-only phrasing that must never reach a pair / group / juveniles / frag-pack listing. */
const SINGULAR = [
  /\bnamed it\b/i,
  /\b(check on|photograph(ing)?|pick|collect|grow|buy(ing)?|take|watch|hiding in|care of) it\b(?! or leave it)/i, // the idiom is fine
  // (not "$45 it is." / "It has been listed a while" / "it's a common variety": those are about the price, listing, variety)
  /\bit (looks|would|will|arrived|needs|sounds|opened)\b/i,
  /\bit is (a bit|more|not|already)\b/i,
  /\bit has (some|a lot)\b/i,
  /\bit['’]s (still|only|a small|a common piece)\b/i,
  /\ba (genuinely )?beautiful animal\b/i,
  /\ba larger animal\b/i,
  /\benjoy the animal\b/i,
  /\bthat is a beautiful piece\b/i,
  /\bhave not seen one\b/i,
];

function all(archetype: BuyerArchetype, vars: MsgVars, isFrag: boolean, seed: number, n = 120): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const like = ASPECTS[i % ASPECTS.length];
    const concern = ASPECTS[(i * 3 + 1) % ASPECTS.length];
    out.push(
      composeBidMessage(rng, {
        archetype,
        isTank: false,
        isFrag,
        likes: [like, ASPECTS[(i + 2) % ASPECTS.length]],
        concerns: concern === like || i % 3 === 0 ? [] : [concern],
        indifferent: i % 4 === 0 ? 'size' : undefined,
        favourite: i % 5 === 0,
        stale: i % 7 === 0,
        overBudget: i % 6 === 0,
        vars,
      }),
    );
    out.push(counterReply(rng, archetype, (['accept', 'split', 'hold', 'walk'] as const)[i % 4], { ...vars, amount: '$40', counter: '$45' }));
    out.push(buyNowMessage(rng, archetype, vars));
    out.push(withdrawMessage(rng, archetype, (['changed', 'water', 'sick', 'lost_interest'] as const)[i % 4], vars));
    out.push(saleFeedback(rng, archetype, (['good', 'unhealthy', 'misrep'] as const)[i % 3], vars));
  }
  return out;
}

const manyAnimals = (lot: string): MsgVars => ({ species: 'axolotls', name: lot, morph: 'Golden Albino', gallons: '', org: 'Tidewater Discovery Centre', scope: 'animal', many: '1', lot });
const oneAnimal: MsgVars = { species: 'axolotls', name: 'Mochi', morph: 'Golden Albino', gallons: '', org: 'Tidewater Discovery Centre', scope: 'animal' };

describe('buyer messages: one animal vs a batch', () => {
  it('pairs, groups and juvenile batches never read as a single animal', () => {
    for (const lot of ['this pair', 'this group', 'these juveniles']) {
      for (const a of BUYER_ARCHETYPE_IDS) {
        const msgs = all(a, manyAnimals(lot), false, 7 + a.length + lot.length);
        for (const m of msgs) {
          for (const re of SINGULAR) expect(m, `${a} / ${lot}: ${m}`).not.toMatch(re);
          expect(m).not.toMatch(/Mochi/);
          expect(m).not.toMatch(/\{\w+\}|\[(tank|animal|frag|coral|plant|one|many)\]/);
          expect(m).toMatch(/^[A-Z"'{\d$]/);
        }
      }
    }
  });

  it('batches still get varied, specific wording (they/them, "this pair")', () => {
    const joined = BUYER_ARCHETYPE_IDS.flatMap((a) => all(a, manyAnimals('this pair'), false, 3 + a.length)).join('\n');
    expect(joined).toMatch(/\b(they|them)\b/i);
    expect(joined).toMatch(/this pair/);
    expect(new Set(all('family', manyAnimals('these juveniles'), false, 11, 200)).size).toBeGreaterThan(50);
  });

  it('a single animal keeps its singular, named wording', () => {
    const joined = BUYER_ARCHETYPE_IDS.flatMap((a) => all(a, oneAnimal, false, 5 + a.length)).join('\n');
    expect(joined).toMatch(/Mochi/);
    expect(joined).toMatch(/\bit\b/i);
    expect(joined).not.toMatch(/\[(one|many)\]/);
    // the family opener that started this: singular for one animal, plural for a batch
    const fam1 = all('family', oneAnimal, false, 21, 400).join('\n');
    const famN = all('family', manyAnimals('these juveniles'), false, 21, 400).join('\n');
    expect(fam1).toMatch(/The kids named it already/);
    expect(famN).not.toMatch(/named it/);
    expect(famN).toMatch(/The kids have already named them/);
  });

  it('frag packs read as plurals, single frags as singular', () => {
    for (const fragType of ['coral', 'plant', 'mixed'] as const) {
      const pack: MsgVars = { species: 'hammer coral frags', name: 'these frags', morph: '', gallons: '', scope: 'frag', fragType, many: '1', lot: 'these frags' };
      const one: MsgVars = { species: 'hammer coral frags', name: 'this frag', morph: '', gallons: '', scope: 'frag', fragType };
      for (const a of BUYER_ARCHETYPE_IDS) {
        for (const m of all(a, pack, true, 13 + a.length, 60)) {
          for (const re of SINGULAR) expect(m, `${a} / ${fragType} pack: ${m}`).not.toMatch(re);
          expect(m).not.toMatch(/\{\w+\}|\[(tank|animal|frag|coral|plant|one|many)\]/);
        }
      }
      const single = BUYER_ARCHETYPE_IDS.flatMap((a) => all(a, one, true, 17 + a.length, 60)).join('\n');
      expect(single).toMatch(/\bit\b/i);
    }
  });

  it('a real group listing gets plural buyer messages end to end (msgVars)', () => {
    const g: GameState = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 77 });
    devOpenMarket(g);
    devStepEconomy(g, 0.5);
    const animal = (sex?: Sex): Creature => {
      const c = createCreature(g, simRng(g), 'axolotl', { sex, ageDays: 40 });
      c.stats.health = 100;
      delete c.illness;
      return addCreature(g, c, g.tankOrder[0]);
    };
    const group = [animal(), animal(), animal(), animal()];
    const r = createListing(g, { kind: 'group', creatureIds: group.map((c) => c.id), reserve: 0, durationHours: 48 });
    expect(r.ok, r.message).toBe(true);
    const l = () => g.market.listings.find((x) => x.id === r.listingId)!;
    for (let i = 0; i < 120 && l().bids.length < 12 && l().status === 'active'; i++) forceBuyerVisit(g, r.listingId!);
    expect(l().bids.length).toBeGreaterThan(0);
    for (const b of l().bids) {
      const m = b.message ?? '';
      for (const re of SINGULAR) expect(m, m).not.toMatch(re);
      for (const c of group) expect(m).not.toContain(c.name);
    }
  });
});

describe('time copy', () => {
  it('formatSpan never shows "24 h", "60 min" or "1 d 24 h" at unit edges', () => {
    expect(formatSpan(23.6)).toBe('1 day');
    expect(formatSpan(24)).toBe('1 day');
    expect(formatSpan(23.4)).toBe('23 h');
    expect(formatSpan(0.995)).toBe('1 h');
    expect(formatSpan(0.5)).toBe('30 min');
    expect(formatSpan(47.7)).toBe('2 days');
    expect(formatSpan(30)).toBe('1 d 6 h');
    expect(formatSpan(120)).toBe('5 days');
    expect(formatSpan(Number.NaN)).toBe('1 min');
    for (let h = 0; h < 200; h += 0.37) expect(formatSpan(h)).not.toMatch(/\b24 h\b|\b60 min\b|\b1 days\b|\b0 h\b/);
  });

  it('bid times read in one real-time format (like Shows): 1 game hour = 10 real seconds', () => {
    expect(realIn(24)).toBe('about 4 min');
    expect(realIn(23.6)).toBe('about 4 min');
    expect(realIn(18)).toBe('about 3 min');
    expect(realIn(0.5)).toBe('under a minute');
    expect(realIn(360)).toBe('about 1 h');
    expect(realIn(-3)).toBe('under a minute');
    expect(realAgo(0.2)).toBe('just now');
    expect(realAgo(12)).toBe('about 2 min ago');
    expect(showsRealIn).toBe(realIn);
  });
});
