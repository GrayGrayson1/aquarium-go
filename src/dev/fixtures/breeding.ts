/**
 * lane:breeding fixtures — real mid-breeding states produced by running the simulation (not hand-built), so the
 * renderers/AI/UI can iterate on nests, eggs, pouches and fry:
 *   breeding_betta      bubble nest with eggs, male guarding (female already moved out)
 *   breeding_betta_fry  free-swimming betta fry in the nest tank
 *   breeding_axolotl    axolotl eggs laid singly across the plants ('egg_strands' + extraAnchors)
 *   breeding_clownfish  adhesive orange eggs beside the rock/host, male fanning ('guarding')
 *   breeding_seahorse   pregnant male ~60% through (repro.progress drives the pouch swell)
 * Usage: ?fixture=breeding_betta (add &dev=1 for the dev panel).
 */
import type { GameState } from '@/types';
import type { StarterId as SId } from '@/data/species';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { placeOrGrow } from './core-helpers';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { devForceBreeding, separateCreature } from '@/sim/life/breeding/actions';
import { noteBreedingFood } from '@/sim/life/breeding';


function base(starterId: SId, seed: number): GameState {
  const preview = previewStarters(seed)[starterId];
  return newGame({ starterId, starterName: preview.name, seed, starterCreature: preview });
}

/** Keep the fixture animals comfortable while time is fast-forwarded. */
function pamper(g: GameState): void {
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive') continue;
    c.stats.hunger = Math.min(c.stats.hunger, 15);
    c.stats.health = Math.max(c.stats.health, 90);
  }
  for (const t of Object.values(g.tanks)) {
    t.water.ammonia = 0;
    t.water.nitrite = 0;
    for (const eq of t.equipment) eq.failed = false;
  }
}

function forward(g: GameState, maxHours: number, until: () => boolean, feed: Parameters<typeof noteBreedingFood>[2] = []): void {
  for (let h = 0; h < maxHours && !until(); h += 1) {
    pamper(g);
    for (const id of g.tankOrder) if (feed.length) noteBreedingFood(g, id, feed);
    advanceWorld(g, 1, { forceFull: true });
  }
}

const starterOf = (g: GameState) => Object.values(g.creatures).find((c) => c.isStarter)!;
const hasClutch = (g: GameState, sp: string) => Object.values(g.clutches).some((c) => c.speciesId === sp);

function safe(build: () => GameState, fallback: SId): () => GameState {
  return () => {
    try {
      return build();
    } catch (e) {
      console.warn('breeding fixture failed; falling back to the showcase', e);
      return base(fallback, 424242);
    }
  };
}

function bettaNest(untilFry: boolean): GameState {
  const g = base('betta', 5150);
  const male = starterOf(g);
  // lane:facrender — on a proper floor spot (it sat at the room origin, in front of the starter tank)
  const side = createTank(g, 'g10', 'freshwater_planted', { cycled: true, name: 'Recovery Tank', placement: placeOrGrow(g, 'g10') });
  devForceBreeding(g, male.id);
  forward(g, 16, () => hasClutch(g, 'betta'), ['bloodworm']);
  const female = male.repro.partnerId ? g.creatures[male.repro.partnerId] : undefined;
  if (female && female.tankId === male.tankId) separateCreature(g, female.id, side.id);
  if (untilFry) {
    forward(g, 60, () => Object.values(g.clutches).some((c) => c.speciesId === 'betta' && c.stage === 'fry'), ['infusoria']);
    separateCreature(g, male.id, side.id);
  } else forward(g, 4, () => false);
  return g;
}

function axolotlEggs(): GameState {
  const g = base('axolotl', 5151);
  const f = starterOf(g);
  const tank = g.tanks[f.tankId!];
  addCreature(g, createCreature(g, simRng(g), 'axolotl', { sex: f.sex === 'male' ? 'female' : 'male', ageDays: 26, name: 'Axel' }), tank.id);
  devForceBreeding(g, f.id);
  forward(g, 60, () => Object.values(g.creatures).some((c) => c.speciesId === 'axolotl' && c.repro.stage === 'resting' && c.repro.totalClutches > 0));
  return g;
}

function clownEggs(): GameState {
  const g = base('ocellaris_clownfish', 5152);
  const s = starterOf(g);
  devForceBreeding(g, s.id);
  forward(g, 48, () => hasClutch(g, 'ocellaris_clownfish'));
  forward(g, 6, () => false);
  return g;
}

function seahorsePregnant(): GameState {
  const g = base('lined_seahorse', 5153);
  const s = starterOf(g);
  const tank = g.tanks[s.tankId!];
  if (!Object.values(g.creatures).some((c) => c !== s && c.speciesId === 'lined_seahorse')) {
    addCreature(g, createCreature(g, simRng(g), 'lined_seahorse', { sex: s.sex === 'female' ? 'male' : 'female', ageDays: 26, name: 'Seraphina' }), tank.id);
  }
  devForceBreeding(g, s.id);
  forward(g, 12, () => Object.values(g.creatures).some((c) => c.repro.stage === 'pregnant'), ['copepod_live']);
  forward(g, 200, () => Object.values(g.creatures).some((c) => c.repro.stage === 'pregnant' && (c.repro.progress ?? 0) >= 0.6), ['mysis']);
  return g;
}

export const BREEDING_FIXTURES: Record<string, () => GameState> = {
  breeding_betta: safe(() => bettaNest(false), 'betta'),
  breeding_betta_fry: safe(() => bettaNest(true), 'betta'),
  breeding_axolotl: safe(axolotlEggs, 'axolotl'),
  breeding_clownfish: safe(clownEggs, 'ocellaris_clownfish'),
  breeding_seahorse: safe(seahorsePregnant, 'lined_seahorse'),
};
