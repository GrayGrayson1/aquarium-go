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
// chunk 16 wave A: a friend's reef (ADR-0052)
import { emperorAngelfish } from './emperor_angelfish';
import { sailfinTang } from './sailfin_tang';
import { chocolateTang } from './chocolate_tang';
import { lyretailAnthias } from './lyretail_anthias';
import { melanurusWrasse } from './melanurus_wrasse';
import { maroonClownfish } from './maroon_clownfish';
import { elegantStarfish } from './elegant_starfish';
import { fightingConch } from './fighting_conch';
import { scarletHermitCrab } from './scarlet_hermit_crab';
import { mexicanTurboSnail } from './mexican_turbo_snail';
import { nassariusSnail } from './nassarius_snail';
import { astraeaSnail } from './astraea_snail';
import { cerithSnail } from './cerith_snail';
// chunk 16 wave B: reef favourites
import { flameAngelfish } from './flame_angelfish';
import { sixlineWrasse } from './sixline_wrasse';
import { lawnmowerBlenny } from './lawnmower_blenny';
import { flameHawkfish } from './flame_hawkfish';
import { yellowtailDamselfish } from './yellowtail_damselfish';
import { emeraldCrab } from './emerald_crab';
import { tuxedoUrchin } from './tuxedo_urchin';
import { sandSiftingStarfish } from './sand_sifting_starfish';
import { bubbletipAnemone } from './bubbletip_anemone';
// chunk 17 (ADR-0053), wave C: big marine fish
import { blueTang } from './blue_tang';
import { nasoTang } from './naso_tang';
import { queenAngelfish } from './queen_angelfish';
import { clownTriggerfish } from './clown_triggerfish';
import { pantherGrouper } from './panther_grouper';

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
  emperorAngelfish,
  sailfinTang,
  chocolateTang,
  lyretailAnthias,
  melanurusWrasse,
  maroonClownfish,
  elegantStarfish,
  fightingConch,
  scarletHermitCrab,
  mexicanTurboSnail,
  nassariusSnail,
  astraeaSnail,
  cerithSnail,
  flameAngelfish,
  sixlineWrasse,
  lawnmowerBlenny,
  flameHawkfish,
  yellowtailDamselfish,
  emeraldCrab,
  tuxedoUrchin,
  sandSiftingStarfish,
  bubbletipAnemone,
  blueTang,
  nasoTang,
  queenAngelfish,
  clownTriggerfish,
  pantherGrouper,
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
  emperorAngelfish,
  sailfinTang,
  chocolateTang,
  lyretailAnthias,
  melanurusWrasse,
  maroonClownfish,
  elegantStarfish,
  fightingConch,
  scarletHermitCrab,
  mexicanTurboSnail,
  nassariusSnail,
  astraeaSnail,
  cerithSnail,
  flameAngelfish,
  sixlineWrasse,
  lawnmowerBlenny,
  flameHawkfish,
  yellowtailDamselfish,
  emeraldCrab,
  tuxedoUrchin,
  sandSiftingStarfish,
  bubbletipAnemone,
  // chunk 17, wave C
  blueTang,
  nasoTang,
  queenAngelfish,
  clownTriggerfish,
  pantherGrouper,
];
