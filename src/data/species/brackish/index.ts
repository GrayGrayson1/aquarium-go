/** Brackish species barrel. OWNER: lane "brackish". The estuary chapter unlocked by the Brackish Estuaries research. */
import type { SpeciesDefinition } from '@/types';
import { figureEightPuffer } from './figure_eight_puffer';
import { bumblebeeGoby } from './bumblebee_goby';
import { sailfinMolly } from './sailfin_molly';
import { bandedArcherfish } from './banded_archerfish';

export { figureEightPuffer, bumblebeeGoby, sailfinMolly, bandedArcherfish };

/** All brackish species, in roster order. */
export const BRACKISH_SPECIES: SpeciesDefinition[] = [figureEightPuffer, bumblebeeGoby, sailfinMolly, bandedArcherfish];
