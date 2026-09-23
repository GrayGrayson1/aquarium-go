// Special creature visual registrations (axolotl, seahorse, invertebrates, amphibians). OWNER: lane "critterart".
import { registerCreatureVisual } from '../registry';
import { createAxolotl } from './axolotl';
import { createSeahorse } from './seahorse';
import { createHermitCrab } from './hermit';
import { createDwarfFrog } from './frog';
import { createMysterySnail, createNeriteSnail, createTrochusSnail } from './snail';
import { createAmanoShrimp, createCherryShrimp, createCleanerShrimp, createDwarfCrayfish, createMantisShrimp, createPeppermintShrimp } from './shrimp';

registerCreatureVisual('axolotl', createAxolotl);
registerCreatureVisual('lined_seahorse', createSeahorse);
registerCreatureVisual('cherry_shrimp', createCherryShrimp);
registerCreatureVisual('amano_shrimp', createAmanoShrimp);
registerCreatureVisual('cleaner_shrimp', createCleanerShrimp);
registerCreatureVisual('peppermint_shrimp', createPeppermintShrimp);
registerCreatureVisual('mystery_snail', createMysterySnail);
registerCreatureVisual('nerite_snail', createNeriteSnail);
registerCreatureVisual('trochus_snail', createTrochusSnail);
registerCreatureVisual('dwarf_crayfish', createDwarfCrayfish);
registerCreatureVisual('peacock_mantis_shrimp', createMantisShrimp);
registerCreatureVisual('hermit_crab', createHermitCrab);
registerCreatureVisual('african_dwarf_frog', createDwarfFrog);
