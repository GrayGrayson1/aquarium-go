// Special creature visual registrations (axolotl, seahorse, invertebrates, amphibians). OWNER: lane "critterart".
import { registerCreatureVisual } from '../registry';
import { createAxolotl } from './axolotl';
import { createSeahorse } from './seahorse';
import { createHermitCrab, createScarletHermitCrab } from './hermit';
import { createDwarfFrog } from './frog';
import { createElegantStarfish, createSandSiftingStarfish } from './starfish';
import { createBubbleTipAnemone } from './anemone';
import { createTuxedoUrchin } from './urchin';
import { createEmeraldCrab } from './crab';
import { createFightingConch } from './conch';
import { createAstraeaSnail, createCerithSnail, createMexicanTurboSnail, createMysterySnail, createNassariusSnail, createNeriteSnail, createRamshornSnail, createTrochusSnail } from './snail';
import { createAmanoShrimp, createCherryShrimp, createCleanerShrimp, createDwarfCrayfish, createGhostShrimp, createMantisShrimp, createPeppermintShrimp } from './shrimp';

registerCreatureVisual('axolotl', createAxolotl);
registerCreatureVisual('lined_seahorse', createSeahorse);
registerCreatureVisual('cherry_shrimp', createCherryShrimp);
registerCreatureVisual('amano_shrimp', createAmanoShrimp);
registerCreatureVisual('cleaner_shrimp', createCleanerShrimp);
registerCreatureVisual('peppermint_shrimp', createPeppermintShrimp);
registerCreatureVisual('mystery_snail', createMysterySnail);
registerCreatureVisual('nerite_snail', createNeriteSnail);
registerCreatureVisual('trochus_snail', createTrochusSnail);
registerCreatureVisual('mexican_turbo_snail', createMexicanTurboSnail); // chunk 16
registerCreatureVisual('astraea_snail', createAstraeaSnail);
registerCreatureVisual('cerith_snail', createCerithSnail);
registerCreatureVisual('nassarius_snail', createNassariusSnail);
registerCreatureVisual('elegant_starfish', createElegantStarfish);
registerCreatureVisual('fighting_conch', createFightingConch);
// chunk 16 waves B and C
registerCreatureVisual('sand_sifting_starfish', createSandSiftingStarfish);
registerCreatureVisual('bubbletip_anemone', createBubbleTipAnemone);
registerCreatureVisual('tuxedo_urchin', createTuxedoUrchin);
registerCreatureVisual('emerald_crab', createEmeraldCrab);
registerCreatureVisual('ghost_shrimp', createGhostShrimp);
registerCreatureVisual('ramshorn_snail', createRamshornSnail);
registerCreatureVisual('dwarf_crayfish', createDwarfCrayfish);
registerCreatureVisual('peacock_mantis_shrimp', createMantisShrimp);
registerCreatureVisual('hermit_crab', createHermitCrab);
registerCreatureVisual('scarlet_hermit_crab', createScarletHermitCrab); // chunk 16
registerCreatureVisual('african_dwarf_frog', createDwarfFrog);
