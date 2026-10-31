/** Brackish species barrel. OWNER: lane "brackish". The estuary chapter unlocked by the Brackish Estuaries research. */
import type { SpeciesDefinition } from '@/types';
import { figureEightPuffer } from './figure_eight_puffer';
import { bumblebeeGoby } from './bumblebee_goby';
import { sailfinMolly } from './sailfin_molly';
import { bandedArcherfish } from './banded_archerfish';
// chunk 17 (ADR-0053), wave B
import { silverMono } from './silver_mono';
import { spottedScat } from './spotted_scat';

export { figureEightPuffer, bumblebeeGoby, sailfinMolly, bandedArcherfish, silverMono, spottedScat };

/** All brackish species, in roster order. */
export const BRACKISH_SPECIES: SpeciesDefinition[] = [figureEightPuffer, bumblebeeGoby, sailfinMolly, bandedArcherfish, silverMono, spottedScat];
