/** Marine species barrel. OWNER: lane "species-marine". Export every non-starter marine species here. */
import type { SpeciesDefinition } from '@/types';
import { cleanerShrimp } from './cleaner_shrimp';
import { hermitCrab } from './hermit_crab';
import { trochusSnail } from './trochus_snail';
import { royalGramma } from './royal_gramma';
import { firefish } from './firefish';
import { greenChromis } from './green_chromis';
import { banggaiCardinalfish } from './banggai_cardinalfish';
import { watchmanGoby } from './watchman_goby';
import { peppermintShrimp } from './peppermint_shrimp';
import { clownGoby } from './clown_goby';
import { yellowTang } from './yellow_tang';
import { koleTang } from './kole_tang';
import { coralBeauty } from './coral_beauty';
import { foxfaceRabbitfish } from './foxface_rabbitfish';
import { mandarinDragonet } from './mandarin_dragonet';
import { peacockMantisShrimp } from './peacock_mantis_shrimp';
import { dwarfLionfish } from './dwarf_lionfish';
import { miniatusGrouper } from './miniatus_grouper';

export {
  cleanerShrimp,
  hermitCrab,
  trochusSnail,
  royalGramma,
  firefish,
  greenChromis,
  banggaiCardinalfish,
  watchmanGoby,
  peppermintShrimp,
  clownGoby,
  yellowTang,
  koleTang,
  coralBeauty,
  foxfaceRabbitfish,
  mandarinDragonet,
  peacockMantisShrimp,
  dwarfLionfish,
  miniatusGrouper,
};

/** Non-starter marine species, in roster priority order. The marine starters live in ../ocellaris_clownfish.ts and ../lined_seahorse.ts. */
export const MARINE_SPECIES: SpeciesDefinition[] = [
  cleanerShrimp,
  hermitCrab,
  trochusSnail,
  royalGramma,
  firefish,
  greenChromis,
  banggaiCardinalfish,
  watchmanGoby,
  peppermintShrimp,
  clownGoby,
  yellowTang,
  koleTang,
  coralBeauty,
  foxfaceRabbitfish,
  mandarinDragonet,
  peacockMantisShrimp,
  dwarfLionfish,
  miniatusGrouper,
];
