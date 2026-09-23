/**
 * Show balance: typical scores and placings per tier, measured with real judging. OWNER: lane "shows".
 *
 *   • every starter, well kept (after the bot's opening days), at Club shows
 *   • the bot player's own animals (src/dev/fixtures/playthrough.ts) after 40 game days
 *   • a selectively bred line (best 2 of 24 offspring per generation, F0 → F8) against each tier's field
 *   • purse and fee ranges per tier
 *
 * Targets: a well-kept starter can win at Club (and usually takes a ribbon in its best class); Regional needs a few
 * generations of breeding, National ~F5+, International remarkable animals. Purses matter but stay well below
 * what selling animals and visitors earn. Run with SHOWS_LOG=1 to print the tables.
 */
import { describe, it, expect } from 'vitest';
import type { Creature, GameState, ShowTier } from '@/types';
import { SHOW_CLASSES, SHOW_TIERS, SHOW_TIER_ORDER, type ShowClassDef } from '@/data/shows';
import { STARTER_IDS, getSpecies } from '@/data/species';
import { assessCreature, creatureFitsClass, enterShow, fieldChances } from '@/sim/shows';
import { advanceWorld } from '@/sim/world';
import { runPlaythrough } from '@/dev/fixtures/playthrough';
import { inheritGenome, rollGenome } from '@/sim/life/genetics';
import { mulberry32 } from '@/sim/rng';
import { showGame, starterOf, wellKept, addAdult, addShow } from './shows-helpers';

const LOG = !!process.env.SHOWS_LOG;
const log = (...a: unknown[]) => LOG && console.log(...a);
const midField = (t: ShowTier) => (SHOW_TIERS[t].field[0] + SHOW_TIERS[t].field[1]) / 2;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** The animal's best class (highest expected score) among classes it fits. */
function bestClass(g: GameState, c: Creature): { def: ShowClassDef; expected: number } | null {
  let best: { def: ShowClassDef; expected: number } | null = null;
  for (const def of SHOW_CLASSES) {
    if (!creatureFitsClass(def, c)) continue;
    const e = assessCreature(g, c, def).expected;
    if (!best || e > best.expected) best = { def, expected: e };
  }
  return best;
}

/** Enter `c` in `n` real club shows (fresh fields each time) and tally placings. */
function simulateShows(g: GameState, c: Creature, classId: string, tier: ShowTier, n: number): { wins: number; ribbons: number; places: number[]; avgScore: number } {
  let wins = 0;
  let ribbons = 0;
  let total = 0;
  const places: number[] = [];
  for (let i = 0; i < n; i++) {
    wellKept(c, { bond: c.life?.bond ?? 45, conditioning: 45, stress: 12 });
    c.repro.stage = 'idle';
    if (c.awards) c.awards.lastShowHour = undefined;
    const show = addShow(g, tier, [classId], { field: Math.round(midField(tier)), seed: 1000 + i * 7919 });
    const r = enterShow(g, show.id, classId, c.id);
    if (!r.ok) throw new Error(r.message);
    advanceWorld(g, 10.5);
    const e = g.shows!.entries.find((x) => x.showId === show.id)!;
    if (e.status !== 'judged') continue;
    places.push(e.rank!);
    total += e.score!;
    if (e.rank === 1) wins++;
    if (e.rank! <= 3) ribbons++;
  }
  return { wins, ribbons, places, avgScore: total / Math.max(1, places.length) };
}

describe('show balance', () => {
  it('a well-kept starter can win at Club, and higher tiers need breeding', () => {
    const rows: string[] = [];
    let clubWinSum = 0;
    for (const id of STARTER_IDS) {
      const g = showGame(id, 1234, ['club', 'regional', 'national', 'international']);
      const c = wellKept(starterOf(g), { bond: 45, conditioning: 45 });
      const best = bestClass(g, c)!;
      const ch = SHOW_TIER_ORDER.map((t) => fieldChances(t, best.expected, midField(t)));
      clubWinSum += ch[0].win;
      rows.push(`${id.padEnd(20)} ${best.def.short.padEnd(18)} ${best.expected.toFixed(1).padStart(5)}  ${SHOW_TIER_ORDER.map((t, i) => `${t}: win ${pct(ch[i].win)} / ribbon ${pct(ch[i].ribbon)}`).join('  ')}`);
      // targets: a ribbon is likely at club; regional wins are rare without breeding
      expect(ch[0].ribbon, `${id} club ribbon`).toBeGreaterThanOrEqual(0.55);
      expect(ch[1].win, `${id} regional win`).toBeLessThan(0.3);
      expect(ch[2].win, `${id} national win`).toBeLessThan(0.02);
    }
    expect(clubWinSum / STARTER_IDS.length).toBeGreaterThan(0.25);
    log('\nWell-kept starters (bond 45) — best class, expected score, chances by tier\n' + rows.join('\n'));
  });

  it('real judging over 30 club shows: the betta starter takes ribbons and wins some', () => {
    const g = showGame('betta', 1234, ['club']);
    const c = wellKept(starterOf(g), { bond: 45 });
    const best = bestClass(g, c)!;
    const r = simulateShows(g, c, best.def.id, 'club', 30);
    log(`\nBetta starter, 30 club shows in ${best.def.short}: avg score ${r.avgScore.toFixed(1)}, wins ${r.wins}, ribbons ${r.ribbons}, placings ${r.places.join(',')}`);
    expect(r.ribbons).toBeGreaterThanOrEqual(15);
    expect(r.wins).toBeGreaterThanOrEqual(5);
    expect(r.wins).toBeLessThan(30);
  });

  it('the bot player’s own animals after 40 days (no deliberate show breeding)', () => {
    const rows: string[] = [];
    for (const id of ['betta', 'axolotl', 'ocellaris_clownfish'] as const) {
      const g = runPlaythrough({ starterId: id, seed: 1234, days: 40 }).state;
      const adults = Object.values(g.creatures).filter((c) => (c.status === 'alive' || c.status === 'listed') && (c.lifeStage === 'adult' || c.lifeStage === 'elder'));
      for (const c of adults) {
        const b = bestClass(g, c);
        if (!b) continue;
        const ch = SHOW_TIER_ORDER.map((t) => fieldChances(t, b.expected, midField(t)));
        rows.push(`${id.padEnd(20)} ${c.name.padEnd(10)} F${c.lineage.generation} ${b.def.short.padEnd(18)} ${b.expected.toFixed(1).padStart(5)}  club ${pct(ch[0].win)}/${pct(ch[0].ribbon)}  regional ${pct(ch[1].win)}/${pct(ch[1].ribbon)}  national ${pct(ch[2].win)}/${pct(ch[2].ribbon)}`);
        expect(Number.isFinite(b.expected)).toBe(true);
      }
    }
    log('\nBot-played saves at day 40 (win / ribbon)\n' + rows.join('\n'));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('a selectively bred line climbs the tiers generation by generation', () => {
    const rows: string[] = [];
    const reach: Record<string, Partial<Record<ShowTier, number>>> = {};
    for (const [speciesId, classId] of [
      ['betta', 'open_fw'],
      ['axolotl', 'axolotl_morph'],
      ['fancy_guppy', 'guppy_endler'],
      ['discus', 'discus'],
    ] as const) {
      const g = showGame('betta', 55);
      const sp = getSpecies(speciesId);
      const def = SHOW_CLASSES.find((d) => d.id === classId)!;
      const rng = mulberry32(99);
      const probe = addAdult(g, speciesId, g.tankOrder[0], {}, sp.lifecycle.juvenileDays + sp.lifecycle.adultDays * 0.6);
      probe.sizeCm = sp.adultSizeCm; // grown out
      const score = (gm: Creature['genome']) => {
        probe.genome = gm;
        probe.sizeCm = sp.adultSizeCm * (0.82 + 0.36 * gm.potentials.size / 100);
        wellKept(probe, { bond: 70, conditioning: 70, stress: 8 });
        return assessCreature(g, probe, def).expected;
      };
      let pair = [rollGenome(sp, rng, 0.2), rollGenome(sp, rng, 0.2)];
      const line: string[] = [];
      reach[speciesId] = {};
      for (let gen = 0; gen <= 8; gen++) {
        if (gen > 0) {
          const kids = Array.from({ length: 24 }, () => inheritGenome(sp, pair[0], pair[1], rng)).sort((a, b) => score(b) - score(a));
          pair = [kids[0], kids[1]];
        }
        const s = Math.max(score(pair[0]), score(pair[1]));
        line.push(`F${gen} ${s.toFixed(0)}`);
        for (const t of SHOW_TIER_ORDER) if (reach[speciesId][t] === undefined && fieldChances(t, s, midField(t)).win >= 0.3) reach[speciesId][t] = gen;
      }
      rows.push(`${speciesId.padEnd(12)} ${line.join('  ')}   first gen with ≥30% win: ${SHOW_TIER_ORDER.map((t) => `${t} F${reach[speciesId][t] ?? '–'}`).join(', ')}`);
    }
    log('\nSelective breeding (best of 24 per generation; bond 70) — expected score by generation\n' + rows.join('\n'));
    // regional within a few generations, national later, international only for the best lines
    for (const [sid, r] of Object.entries(reach)) {
      expect(r.club, `${sid} club`).toBeLessThanOrEqual(1);
      expect(r.regional ?? 99, `${sid} regional`).toBeLessThanOrEqual(5);
      expect(r.regional ?? 99, `${sid} regional`).toBeGreaterThanOrEqual(1);
      expect(r.national ?? 99, `${sid} national`).toBeGreaterThanOrEqual(3);
    }
  });

  it('purses and fees sit in the designed ranges', () => {
    const rows: string[] = [];
    for (const t of SHOW_TIER_ORDER) {
      const d = SHOW_TIERS[t];
      const feeLo = d.purse[0] * d.feeFrac[0];
      const feeHi = d.purse[1] * d.feeFrac[1];
      rows.push(`${t.padEnd(14)} purse $${d.purse[0].toLocaleString()}–$${d.purse[1].toLocaleString()} per class, fee ≈ $${Math.round(feeLo)}–$${Math.round(feeHi)}, 1st takes 55%`);
      expect(d.feeFrac[0]).toBeGreaterThanOrEqual(0.1);
      expect(d.feeFrac[1]).toBeLessThanOrEqual(0.2);
    }
    expect(SHOW_TIERS.club.purse).toEqual([40, 150]);
    expect(SHOW_TIERS.regional.purse).toEqual([250, 800]);
    expect(SHOW_TIERS.national.purse).toEqual([1500, 5000]);
    expect(SHOW_TIERS.international.purse).toEqual([8000, 25000]);
    log('\nPurses and fees\n' + rows.join('\n'));
  });
});
