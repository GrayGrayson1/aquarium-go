/**
 * Dev fixtures: named GameState builders used by ?fixture=<name> and ?showcase=<starterId>, tests and sandboxes.
 * Any lane may ADD a fixture file here and register it below (append only).
 */
import type { GameState } from '@/types';
// lane:perf2 — makeShowcase lives in ./showcase.ts so the title screen doesn't pull this whole registry into the main
// bundle. The app loads this registry lazily through ./lazy.ts; tests and scripts may keep importing it directly.
import { makeShowcase } from './showcase';
export { makeShowcase };

export const FIXTURES: Record<string, () => GameState> = {
  axolotl: () => makeShowcase('axolotl'),
  betta: () => makeShowcase('betta'),
  pea_puffer: () => makeShowcase('pea_puffer'),
  ocellaris_clownfish: () => makeShowcase('ocellaris_clownfish'),
  lined_seahorse: () => makeShowcase('lined_seahorse'),
};

export function registerFixture(name: string, build: () => GameState): void {
  FIXTURES[name] = build;
}

// lane:core fixtures (big_facility, community_fw, marine_reef, stress_school, offline_test, core_legacy_v0)
import { CORE_FIXTURES } from './core-fixtures';
for (const [name, build] of Object.entries(CORE_FIXTURES)) registerFixture(name, build);

// lane:ui-panels fixtures (panels = paused mid-game shop for panel QA, panels_live = same at 1×)
import { buildPanelsFixture } from '@/ui/panels/dev/fixtures';
registerFixture('panels', () => buildPanelsFixture({ paused: true }));
registerFixture('panels_live', () => buildPanelsFixture({ paused: false }));

// lane:facility fixtures (facility_hobby, facility_shop, facility_store, facility_showroom, facility_destination, facility_grand)
import { FACILITY_FIXTURES } from './facility';
for (const [name, build] of Object.entries(FACILITY_FIXTURES)) registerFixture(name, build);

// lane:breeding fixtures (breeding_betta, breeding_betta_fry, breeding_axolotl, breeding_clownfish, breeding_seahorse)
import { BREEDING_FIXTURES } from './breeding';
for (const [name, build] of Object.entries(BREEDING_FIXTURES)) registerFixture(name, build);

// lane:behavior fixtures (behavior-lab, behavior-reef, behavior-crowd, behavior-oddballs, behavior-predators)
import { behaviorLab, behaviorReef, behaviorCrowd, behaviorOddballs, behaviorPredators } from './behavior-lab';
registerFixture('behavior-lab', behaviorLab);
registerFixture('behavior-reef', behaviorReef);
registerFixture('behavior-crowd', behaviorCrowd);
registerFixture('behavior-oddballs', behaviorOddballs);
registerFixture('behavior-predators', behaviorPredators);

// polish-gameplay: bot-played saves (playthrough_<starter>) — each starter 30 game days into a careful playthrough
// (tutorial done, a mate, a nursery, first sales). Built lazily when the fixture is requested.
import { runPlaythrough } from './playthrough';
import { STARTER_IDS } from '@/data/species';
for (const id of STARTER_IDS) registerFixture(`playthrough_${id}`, () => runPlaythrough({ starterId: id, seed: 1234, days: 30 }).state);

// lane:brackish fixtures (brackish_estuary = 90 gal archerfish + molly mangrove tank, brackish_puffer, brackish_gobies)
import { BRACKISH_FIXTURES } from './brackish';
for (const [name, build] of Object.entries(BRACKISH_FIXTURES)) registerFixture(name, build);

// lane:frags fixtures (frags_reef = reef with colonies + a frag rack, frags_planted = planted grow-out with cuttings, frags_market = frag pack with bids)
import { FRAG_FIXTURES } from './frags';
for (const [name, build] of Object.entries(FRAG_FIXTURES)) registerFixture(name, build);

// lane:staff fixtures (staff_store = store with a keeper team, stock manager and docent; staff_shop = fresh hiring pool).
// big_facility is re-registered staffed + stocked (a late-game grand hall runs on staff; no "No food left" alerts).
import { STAFF_FIXTURES, staffUpLateGame } from './staff';
import { bigFacility } from './core-fixtures';
for (const [name, build] of Object.entries(STAFF_FIXTURES)) registerFixture(name, build);
registerFixture('big_facility', () => staffUpLateGame(bigFacility()));

// lane:shows fixtures (shows-demo = hobby room with results, a pending entry and a trophy shelf; shows-hall = the grand
// hall with a full trophy cabinet). shows-hall dresses whatever big_facility is registered (staffed, above).
import { buildShowsDemo, buildShowsHall } from './shows';
registerFixture('shows-demo', buildShowsDemo);
registerFixture('shows-hall', () => buildShowsHall(FIXTURES.big_facility()));

// lane:genetics fixture (prismatic_showcase = Prismatic betta, axolotl, guppy and cherry shrimp beside ordinary ones, plus a Prismatic shop offer)
import { buildPrismaticShowcase } from './prismatic';
registerFixture('prismatic_showcase', buildPrismaticShowcase);
