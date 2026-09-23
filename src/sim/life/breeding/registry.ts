/** BreedingSystemId → module. OWNER: lane "breeding". */
import type { BreedingSystemId, SpeciesDefinition } from '@/types';
import type { BreedingModule } from './types';
import { axolotlModule } from './systems/axolotl';
import { bubbleNestModule } from './systems/bubbleNest';
import { clownfishModule } from './systems/clownfish';
import { seahorseModule } from './systems/seahorse';
import { livebearerModule } from './systems/livebearer';
import { shrimpBerriedModule, shrimpLarvalMarineModule } from './systems/shrimp';
import { eggScatterModule, substrateSpawnerModule, caveSpawnerModule, mouthbrooderModule, snailClutchModule, genericEggLayerModule } from './systems/spawners';
import { fragmentationModule, notInGameModule } from './systems/inert';

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
      not_in_game: notInGameModule,
    };
  }
  return MODULES;
}

export function moduleFor(sp: SpeciesDefinition): BreedingModule {
  return modules()[sp.breeding?.system] ?? notInGameModule;
}

export function moduleById(id: BreedingSystemId): BreedingModule {
  return modules()[id] ?? notInGameModule;
}
