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
// chunk 16 wave A: a friend's reef
import { plan as emperor_angelfish } from './emperor_angelfish';
import { plan as sailfin_tang } from './sailfin_tang';
import { plan as chocolate_tang } from './chocolate_tang';
import { plan as lyretail_anthias } from './lyretail_anthias';
import { plan as melanurus_wrasse } from './melanurus_wrasse';
import { plan as maroon_clownfish } from './maroon_clownfish';
// chunk 16 wave B: reef favourites
import { plan as flame_angelfish } from './flame_angelfish';
import { plan as sixline_wrasse } from './sixline_wrasse';
import { plan as lawnmower_blenny } from './lawnmower_blenny';
import { plan as flame_hawkfish } from './flame_hawkfish';
import { plan as yellowtail_damselfish } from './yellowtail_damselfish';
// chunk 16 wave C: freshwater favourites
import { plan as freshwater_angelfish } from './freshwater_angelfish';
import { plan as dwarf_gourami } from './dwarf_gourami';
import { platyPlan, swordtailPlan } from './xiphophorus';
import { plan as german_blue_ram } from './german_blue_ram';
import { plan as zebra_danio } from './zebra_danio';
import { plan as harlequin_rasbora } from './harlequin_rasbora';
// lane:brackish — estuary species
import { figureEightPufferPlan } from './figure_eight_puffer';
import { plan as bumblebee_goby } from './bumblebee_goby';
import { plan as sailfin_molly } from './sailfin_molly';
import { plan as banded_archerfish } from './banded_archerfish';
// chunk 17 wave A: big freshwater
import { plan as oscar } from './oscar';
import { plan as clown_loach } from './clown_loach';
import { plan as black_ghost_knifefish } from './black_ghost_knifefish';
import { plan as fahaka_puffer } from './fahaka_puffer';
import { plan as ornate_bichir } from './ornate_bichir';
import { plan as silver_arowana } from './silver_arowana';
// chunk 17 wave B: koi and brackish
import { plan as koi } from './koi';
import { plan as silver_mono } from './silver_mono';
import { plan as spotted_scat } from './spotted_scat';

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
// chunk 16 wave A
reg('emperor_angelfish', emperor_angelfish);
reg('sailfin_tang', sailfin_tang);
reg('chocolate_tang', chocolate_tang);
reg('lyretail_anthias', lyretail_anthias);
reg('melanurus_wrasse', melanurus_wrasse);
reg('maroon_clownfish', maroon_clownfish);
// chunk 16 wave B
reg('flame_angelfish', flame_angelfish);
reg('sixline_wrasse', sixline_wrasse);
reg('lawnmower_blenny', lawnmower_blenny);
reg('flame_hawkfish', flame_hawkfish);
reg('yellowtail_damselfish', yellowtail_damselfish);
// chunk 16 wave C
reg('freshwater_angelfish', freshwater_angelfish);
reg('dwarf_gourami', dwarf_gourami);
reg('platy', platyPlan);
reg('swordtail', swordtailPlan);
reg('german_blue_ram', german_blue_ram);
reg('zebra_danio', zebra_danio);
reg('harlequin_rasbora', harlequin_rasbora);
// lane:brackish
reg('figure_eight_puffer', figureEightPufferPlan);
reg('bumblebee_goby', bumblebee_goby);
reg('sailfin_molly', sailfin_molly);
reg('banded_archerfish', banded_archerfish);
// chunk 17 wave A
reg('oscar', oscar);
reg('clown_loach', clown_loach);
reg('black_ghost_knifefish', black_ghost_knifefish);
reg('fahaka_puffer', fahaka_puffer);
reg('ornate_bichir', ornate_bichir);
reg('silver_arowana', silver_arowana);
// chunk 17 wave B
reg('koi', koi);
reg('silver_mono', silver_mono);
reg('spotted_scat', spotted_scat);

registerFallbackVisual(fishFactory(genericPlan));
