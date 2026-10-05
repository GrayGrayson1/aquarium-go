/**
 * Prismatic showcase (lane:genetics): visual QA for the ultra-rare shimmer — Prismatic animals beside ordinary ones of
 * the same species, across both render families (fish shader and critter shader), plus a Prismatic shop offer.
 *   prismatic_showcase  Opal the Prismatic betta (focused), an axolotl grotto and a guppy + cherry shrimp community
 * Showcase world: never saved. Deterministic (fixed seed; the shimmer is assigned through the dev force, not luck).
 */
import type { Creature, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { assignPrismatic, forcePrismatic, recordFinds } from '@/sim/life';
import { generateOffer } from '@/sim/economy';
import { simRng } from '@/sim/rng';
import { addPlacedTank, decorateTank, ensureFacility, finishTank, stockTank, tierForGallons, unlockEverything } from './core-helpers';

function shimmer(g: GameState, c: Creature | undefined): void {
  if (!c) return;
  forcePrismatic(c.lineage.breederName === 'Your shop' ? 'bred' : 'shop', 1);
  assignPrismatic(g, c, c.lineage.breederName === 'Your shop' ? 'bred' : 'shop');
  recordFinds(g, c);
}

export function buildPrismaticShowcase(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Opal', seed: 424242, shopName: 'Prism Aquatics' });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = true;
  ensureFacility(g, 'specialty_shop');
  unlockEverything(g);
  g.finance.money = 20_000;
  shimmer(g, Object.values(g.creatures).find((c) => c.isStarter));

  const grotto = addPlacedTank(g, tierForGallons(29), 'freshwater_cool', 'Axolotl Grotto');
  decorateTank(g, grotto, 'axolotl');
  const axolotls = stockTank(g, grotto.id, [{ species: 'axolotl', count: 2, sex: 'pair' }]);
  shimmer(g, axolotls[0]);
  finishTank(g, grotto);

  const community = addPlacedTank(g, tierForGallons(29), 'freshwater_tropical', 'Prism Community');
  decorateTank(g, community, 'betta');
  const stocked = stockTank(g, community.id, [
    { species: 'fancy_guppy', count: 5, sex: 'mixed' },
    { species: 'cherry_shrimp', count: 6, sex: 'auto' },
  ]);
  shimmer(g, stocked.find((c) => c.speciesId === 'fancy_guppy'));
  shimmer(g, stocked.find((c) => c.speciesId === 'cherry_shrimp'));
  finishTank(g, community);

  // a Prismatic at the front of the shop (priced by the shop's own valuation)
  forcePrismatic('shop', 1);
  const offer = generateOffer(g, simRng(g), 'betta', { expiresHour: g.clock.hour + 24 * 3 });
  if (offer) g.market.stock.unshift(offer);
  forcePrismatic('shop', 0);
  return g;
}
