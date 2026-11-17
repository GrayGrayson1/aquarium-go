/** BreedingSystemId → module. OWNER: lane "breeding". */
import type { BreedingSystemId, SpeciesDefinition } from '@/types';
import type { BreedingModule } from './types';
import { axolotlModule } from './systems/axolotl';
import { bubbleNestModule } from './systems/bubbleNest';
import { clownfishModule } from './systems/clownfish';
import { seahorseModule } from './systems/seahorse';
import { livebearerModule } from './systems/livebearer';
import { shrimpBerriedModule, shrimpLarvalMarineModule } from './systems/shrimp';
import { eggScatterModule, substrateSpawnerModule, caveSpawnerModule, mouthbrooderModule, snailClutchModule, genericEggLayerModule, cichlidSubstrateModule, damselNestModule, marineCaveSpawnerModule, brackishCaveSpawnerModule, copepodEggLayerModule, trochusModule } from './systems/spawners';
import { fragmentationModule, notInGameModule } from './systems/inert';
import { fissionModule } from './systems/fission';
import { eggCaseModule } from './systems/eggCase';
import { rayViviparousModule } from './systems/rayViviparous';

let MODULES: Record<BreedingSystemId, BreedingModule> | null = null;

function modules(): Record<BreedingSystemId, BreedingModule> {
  if (!MODULES) {
    MODULES = {
      axolotl_spermatophore: axolotlModule,
      bubble_nest: bubbleNestModule,
      egg_scatter_cover: eggScatterModule,
      clownfish_substrate: clownfishModule,
      seahorse_pouch: seahorseModule,
      livebearer: livebearerModule,
      shrimp_berried: shrimpBerriedModule,
      shrimp_larval_marine: shrimpLarvalMarineModule,
      snail_egg_clutch: snailClutchModule,
      substrate_spawner: substrateSpawnerModule,
      cave_spawner: caveSpawnerModule,
      mouthbrooder: mouthbrooderModule,
      egg_layer_generic: genericEggLayerModule,
      fragmentation: fragmentationModule,
      fission: fissionModule,
      egg_case: eggCaseModule,
      ray_viviparous: rayViviparousModule,
      cichlid_substrate: cichlidSubstrateModule,
      damsel_nest: damselNestModule,
      not_in_game: notInGameModule,
    };
  }
  return MODULES;
}

/**
 * audit E10: a few species run their system's module with their own young's foods (their notes: copepods for the marine
 * cave spawners and the mandarin, infusoria for the bumblebee goby) or their own spawning (the trochus snail). Each
 * keeps its system id; only these species are affected.
 */
let SPECIES_MODULES: Record<string, BreedingModule> | null = null;
function speciesModules(): Record<string, BreedingModule> {
  SPECIES_MODULES ??= {
    royal_gramma: marineCaveSpawnerModule,
    firefish: marineCaveSpawnerModule,
    watchman_goby: marineCaveSpawnerModule,
    bumblebee_goby: brackishCaveSpawnerModule,
    mandarin_dragonet: copepodEggLayerModule,
    trochus_snail: trochusModule,
  };
  return SPECIES_MODULES;
}

export function moduleFor(sp: SpeciesDefinition): BreedingModule {
  const own = speciesModules()[sp.id];
  if (own && own.id === sp.breeding?.system) return own;
  return modules()[sp.breeding?.system] ?? notInGameModule;
}

export function moduleById(id: BreedingSystemId): BreedingModule {
  return modules()[id] ?? notInGameModule;
}
