/** Freshwater species barrel. OWNER: lane "species-fw". Export every non-starter freshwater species here. */
import type { SpeciesDefinition } from '@/types';
import { cherryShrimp } from './cherry_shrimp';
import { cometGoldfish } from './comet_goldfish';
import { fancyGoldfish } from './fancy_goldfish';
import { neonTetra } from './neon_tetra';
import { pandaCorydoras } from './panda_corydoras';
import { mysterySnail } from './mystery_snail';
import { neriteSnail } from './nerite_snail';
import { fancyGuppy } from './fancy_guppy';
import { endlersLivebearer } from './endlers_livebearer';
import { amanoShrimp } from './amano_shrimp';
import { otocinclus } from './otocinclus';
import { whiteCloudMinnow } from './white_cloud_minnow';
import { medaka } from './medaka';
import { honeyGourami } from './honey_gourami';
import { kuhliLoach } from './kuhli_loach';
import { hillstreamLoach } from './hillstream_loach';
import { bristlenosePleco } from './bristlenose_pleco';
import { africanDwarfFrog } from './african_dwarf_frog';
import { cardinalTetra } from './cardinal_tetra';
import { dwarfCrayfish } from './dwarf_crayfish';
import { discus } from './discus';
// chunk 16 (ADR-0052), wave C
import { freshwaterAngelfish } from './freshwater_angelfish';
import { germanBlueRam } from './german_blue_ram';
import { harlequinRasbora } from './harlequin_rasbora';
import { zebraDanio } from './zebra_danio';
import { platy } from './platy';
import { swordtail } from './swordtail';
import { dwarfGourami } from './dwarf_gourami';
import { ghostShrimp } from './ghost_shrimp';
import { ramshornSnail } from './ramshorn_snail';
// chunk 17 (ADR-0053), wave A
import { oscar } from './oscar';
import { clownLoach } from './clown_loach';
import { blackGhostKnifefish } from './black_ghost_knifefish';
import { fahakaPuffer } from './fahaka_puffer';
import { ornateBichir } from './ornate_bichir';
import { silverArowana } from './silver_arowana';
// chunk 17 (ADR-0053), wave B
import { koi } from './koi';
// chunk 17, wave D
import { motoroStingray } from './motoro_stingray';

export {
  cherryShrimp,
  cometGoldfish,
  fancyGoldfish,
  neonTetra,
  pandaCorydoras,
  mysterySnail,
  neriteSnail,
  fancyGuppy,
  endlersLivebearer,
  amanoShrimp,
  otocinclus,
  whiteCloudMinnow,
  medaka,
  honeyGourami,
  kuhliLoach,
  hillstreamLoach,
  bristlenosePleco,
  africanDwarfFrog,
  cardinalTetra,
  dwarfCrayfish,
  discus,
  freshwaterAngelfish,
  germanBlueRam,
  harlequinRasbora,
  zebraDanio,
  platy,
  swordtail,
  dwarfGourami,
  ghostShrimp,
  ramshornSnail,
  oscar,
  clownLoach,
  blackGhostKnifefish,
  fahakaPuffer,
  ornateBichir,
  silverArowana,
  koi,
  motoroStingray,
};

/** All non-starter freshwater species (the three freshwater starters are exported from the species root). */
export const FRESHWATER_SPECIES: SpeciesDefinition[] = [
  cherryShrimp,
  cometGoldfish,
  fancyGoldfish,
  neonTetra,
  pandaCorydoras,
  mysterySnail,
  neriteSnail,
  fancyGuppy,
  endlersLivebearer,
  amanoShrimp,
  otocinclus,
  whiteCloudMinnow,
  medaka,
  honeyGourami,
  kuhliLoach,
  hillstreamLoach,
  bristlenosePleco,
  africanDwarfFrog,
  cardinalTetra,
  dwarfCrayfish,
  discus,
  freshwaterAngelfish,
  germanBlueRam,
  harlequinRasbora,
  zebraDanio,
  platy,
  swordtail,
  dwarfGourami,
  ghostShrimp,
  ramshornSnail,
  // chunk 17 (ADR-0053), wave A
  oscar,
  clownLoach,
  blackGhostKnifefish,
  fahakaPuffer,
  ornateBichir,
  silverArowana,
  // chunk 17, wave B
  koi,
  // chunk 17, wave D
  motoroStingray,
];
