/**
 * Fish visual registrations. OWNER: lane "fishart".
 * Every roster species with visual 'fish' registers a procedural body plan here; the generic fish is the fallback
 * for anything unknown (so nothing ever renders as primitive geometry).
 */
import { registerCreatureVisual, registerFallbackVisual } from '../registry';
import { fishFactory, type PlanFn } from './common';
import { genericPlan } from './generic';
import { bettaPlan } from './betta';
import { peaPufferPlan } from './pea_puffer';
import { clownfishPlan } from './clownfish';
import { plan as fancy_guppy } from './fancy_guppy';
import { plan as endlers_livebearer } from './endlers_livebearer';
import { plan as neon_tetra } from './neon_tetra';
import { plan as cardinal_tetra } from './cardinal_tetra';
import { plan as white_cloud_minnow } from './white_cloud_minnow';
import { plan as medaka } from './medaka';
import { plan as panda_corydoras } from './panda_corydoras';
import { plan as otocinclus } from './otocinclus';
import { plan as kuhli_loach } from './kuhli_loach';
import { plan as hillstream_loach } from './hillstream_loach';
import { plan as honey_gourami } from './honey_gourami';
import { plan as bristlenose_pleco } from './bristlenose_pleco';
import { plan as fancy_goldfish } from './fancy_goldfish';
import { plan as comet_goldfish } from './comet_goldfish';
import { plan as discus } from './discus';
import { plan as royal_gramma } from './royal_gramma';
import { plan as firefish } from './firefish';
import { plan as watchman_goby } from './watchman_goby';
import { plan as clown_goby } from './clown_goby';
import { plan as banggai_cardinalfish } from './banggai_cardinalfish';
import { plan as green_chromis } from './green_chromis';
import { plan as yellow_tang } from './yellow_tang';
import { plan as kole_tang } from './kole_tang';
import { plan as coral_beauty } from './coral_beauty';
import { plan as foxface_rabbitfish } from './foxface_rabbitfish';
import { plan as mandarin_dragonet } from './mandarin_dragonet';
import { plan as dwarf_lionfish } from './dwarf_lionfish';
import { plan as miniatus_grouper } from './miniatus_grouper';
// lane:brackish — estuary species
import { figureEightPufferPlan } from './figure_eight_puffer';
import { plan as bumblebee_goby } from './bumblebee_goby';
import { plan as sailfin_molly } from './sailfin_molly';
import { plan as banded_archerfish } from './banded_archerfish';

const reg = (id: string, plan: PlanFn) => registerCreatureVisual(id, fishFactory(plan, genericPlan));

reg('betta', bettaPlan);
reg('pea_puffer', peaPufferPlan);
reg('ocellaris_clownfish', clownfishPlan);
reg('fancy_guppy', fancy_guppy);
reg('endlers_livebearer', endlers_livebearer);
reg('neon_tetra', neon_tetra);
reg('cardinal_tetra', cardinal_tetra);
reg('white_cloud_minnow', white_cloud_minnow);
reg('medaka', medaka);
reg('panda_corydoras', panda_corydoras);
reg('otocinclus', otocinclus);
reg('kuhli_loach', kuhli_loach);
reg('hillstream_loach', hillstream_loach);
reg('honey_gourami', honey_gourami);
reg('bristlenose_pleco', bristlenose_pleco);
reg('fancy_goldfish', fancy_goldfish);
reg('comet_goldfish', comet_goldfish);
reg('discus', discus);
reg('royal_gramma', royal_gramma);
reg('firefish', firefish);
reg('watchman_goby', watchman_goby);
reg('clown_goby', clown_goby);
reg('banggai_cardinalfish', banggai_cardinalfish);
reg('green_chromis', green_chromis);
reg('yellow_tang', yellow_tang);
reg('kole_tang', kole_tang);
reg('coral_beauty', coral_beauty);
reg('foxface_rabbitfish', foxface_rabbitfish);
reg('mandarin_dragonet', mandarin_dragonet);
reg('dwarf_lionfish', dwarf_lionfish);
reg('miniatus_grouper', miniatus_grouper);
// lane:brackish
reg('figure_eight_puffer', figureEightPufferPlan);
reg('bumblebee_goby', bumblebee_goby);
reg('sailfin_molly', sailfin_molly);
reg('banded_archerfish', banded_archerfish);

registerFallbackVisual(fishFactory(genericPlan));
