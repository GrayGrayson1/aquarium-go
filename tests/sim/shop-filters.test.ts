// @vitest-environment node
/**
 * lane:ui-panels — the Shop's filters (0.5 spec §7.2, MKT-002): Prismatic only, Rare genes (visible rarity before the
 * Genetics Lab, hidden carriers of `rare` alleles after it), the environment chips unchanged, AND-combined, and counts.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, ShopOffer } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, assignPrismatic, forcePrismatic } from '@/sim/life';
import { findSpecies } from '@/data/species';
import { fitsEnvironment } from '@/sim/compat/salinity';
import { offerMatches, envMatches, filtersActive } from '@/ui/panels/market/shopFilters';
import { DEFAULT_SHOP_FILTERS, type ShopFilters } from '@/ui/nav/routes';

const P = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
const f = (patch: Partial<ShopFilters> = {}): ShopFilters => ({ ...DEFAULT_SHOP_FILTERS, ...patch });

function game(lab = false): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 51 });
  g.market.stock = [];
  if (lab) g.progress.unlocked.push('genetics_lab');
  return g;
}

let seq = 0;
function offer(g: GameState, speciesId: string, alleles?: Record<string, [string, string]>, prismatic = false): ShopOffer {
  const c = createCreature(g, simRng(g), speciesId, alleles ? { genome: { alleles, potentials: { ...P } } } : {});
  if (prismatic) {
    forcePrismatic('shop', 1);
    assignPrismatic(g, c, 'shop');
  }
  const o: ShopOffer = { id: `offer_t${++seq}`, kind: 'creature', speciesId, creatures: [c], price: 20, seller: 'Test', expiresHour: g.clock.hour + 48 };
  g.market.stock.push(o);
  return o;
}

const plainBetta = { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'C'], metallic: ['std', 'std'] } as Record<string, [string, string]>;

describe('offerMatches', () => {
  it('the default filters show every offer', () => {
    const g = game();
    const all = [offer(g, 'betta', plainBetta), offer(g, 'ocellaris_clownfish'), offer(g, 'neon_tetra')];
    expect(all.every((o) => offerMatches(g, o, f()))).toBe(true);
    expect(filtersActive(f())).toBe(false);
    expect(filtersActive(f({ rare: true }))).toBe(true);
  });

  it('Prismatic only keeps offers with a Prismatic animal', () => {
    const g = game();
    const plain = offer(g, 'betta', plainBetta);
    const shimmer = offer(g, 'mystery_snail', undefined, true);
    expect(offerMatches(g, plain, f({ prismatic: true }))).toBe(false);
    expect(offerMatches(g, shimmer, f({ prismatic: true }))).toBe(true);
  });

  it('Rare genes before the lab: visibly rare morphs and strains only, never hidden carriers', () => {
    const g = game(false);
    const common = offer(g, 'betta', plainBetta); // Red Veiltail, common
    const rareMorph = offer(g, 'betta', { color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'] }); // rare, Royal Butterfly Halfmoon strain
    const cambodian = offer(g, 'betta', { ...plainBetta, cambodian: ['c', 'c'] }); // Red Cambodian Veiltail, very rare
    const carrier = offer(g, 'betta', { ...plainBetta, cambodian: ['C', 'c'] }); // looks common, carries Cambodian
    expect(offerMatches(g, common, f({ rare: true }))).toBe(false);
    expect(offerMatches(g, rareMorph, f({ rare: true }))).toBe(true);
    expect(offerMatches(g, cambodian, f({ rare: true }))).toBe(true);
    expect(offerMatches(g, carrier, f({ rare: true }))).toBe(false);
  });

  it('Rare genes after the lab adds hidden carriers of rare alleles (B-136: opaque white and double tail too)', () => {
    const g = game(true);
    const carrier = offer(g, 'betta', { ...plainBetta, cambodian: ['C', 'c'] });
    const onRoyal = offer(g, 'betta', { ...plainBetta, color: ['royal', 'royal'], cambodian: ['c', 'c'] }); // Cambodian can't show on royal
    const white = offer(g, 'betta', { ...plainBetta, color: ['yellow', 'white'] });
    const double = offer(g, 'betta', { ...plainBetta, fins: ['crown', 'double'] });
    const notRare = offer(g, 'betta', { ...plainBetta, color: ['red', 'royal'] }); // carries royal: not a rare allele
    const misbar = offer(g, 'ocellaris_clownfish', { snow: ['wt', 'wt'], mel: ['O', 'O'], misbar: ['N', 'mb'] });
    for (const o of [carrier, onRoyal, white, double, misbar]) expect(offerMatches(g, o, f({ rare: true })), o.id).toBe(true);
    expect(offerMatches(g, notRare, f({ rare: true }))).toBe(false);
  });

  it('the environment chips filter exactly as before, and every filter must hold', () => {
    const g = game();
    const betta = offer(g, 'betta', plainBetta);
    const clown = offer(g, 'ocellaris_clownfish');
    expect(offerMatches(g, betta, f({ env: 'marine' }))).toBe(false);
    expect(offerMatches(g, clown, f({ env: 'marine' }))).toBe(true);
    // "Fits my tanks": the starter tank is freshwater
    for (const o of [betta, clown]) {
      const sp = findSpecies(o.speciesId)!;
      const before = g.tankOrder.some((id) => fitsEnvironment(sp, g.tanks[id].environment));
      expect(envMatches(g, sp, 'fits')).toBe(before);
      expect(offerMatches(g, o, f({ env: 'fits' }))).toBe(before);
    }
    const shimmerClown = offer(g, 'ocellaris_clownfish', undefined, true);
    expect(offerMatches(g, shimmerClown, f({ prismatic: true, env: 'freshwater' }))).toBe(false);
    expect(offerMatches(g, shimmerClown, f({ prismatic: true, env: 'marine' }))).toBe(true);
  });

  it('counts: visible of in stock', () => {
    const g = game();
    offer(g, 'betta', plainBetta);
    offer(g, 'betta', { color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'] });
    offer(g, 'ocellaris_clownfish');
    const visible = g.market.stock.filter((o) => offerMatches(g, o, f({ rare: true })));
    expect(`${visible.length} of ${g.market.stock.length}`).toBe('1 of 3');
  });
});
