/**
 * Tutorial chains (one per starter) and the rolling quest board. OWNER: lane "facility".
 *
 * Tutorial flags the UI / AI / camera should send via `tutorialAdvance(state, flag)` (src/sim/facility):
 *   'camera_moved'        camera orbited/zoomed by the player
 *   'fed'                 player fed a tank (the sim also counts `feeds`)
 *   'opened_tank_card'    tank card opened ('read_water' / 'read_param:<key>' also accepted)
 *   'decor_placed'        a decor item placed (the sim also counts `decor_placed`)
 *   'observed:<behaviour>' the AI saw the focused starter perform a signature behaviour on screen, e.g.
 *                         'observed:gill_flick', 'observed:fin_flare', 'observed:bubble_nest', 'observed:hover',
 *                         'observed:hover_scan', 'observed:host_nestle', 'observed:pair_swim', 'observed:hitch', 'observed:snick_feed'
 *   'opened_market'       market panel opened
 *   'opened_research' | 'opened_visitors' | 'opened_build'   panels opened (the preview step accepts any)
 *
 * Body text placeholders: {name} = starter creature's name, {species} = common name (lower case),
 * {temp} / {salinity} = the starter species' ideal band, formatted exactly like the tank card ("24.5–28.0 °C").
 *
 * Tutorial steps only count progress made AFTER the step starts: flags must be raised during the step, `relative`
 * counter objectives are measured from the step's start (ProgressState.tutorial.stepBaselines), and the upgrade step
 * needs reputation earned during it. So a slower player who already had three friend visits still gets to read
 * "First money" and "Word gets around" instead of jumping from 8/11 to 11/11. (Feeding / placing decor before those
 * steps still counts — the player did the thing; only passive accumulation must happen during the step.) While a
 * step waits on friends, they drop by sooner (see TUTORIAL_FRIEND_GAP_H in src/sim/facility/visitors.ts).
 */
import type { MasteryTrack } from '@/types';
import { SCAPED_EDITS, type Cond } from './unlocks';
import type { UnlockKey } from './unlockKeys';

export type Objective =
  /** Any of these tutorial flags. `fallbackHours`: auto-complete after this many game hours on the step. */
  | { type: 'flag'; anyOf: string[]; fallbackHours?: number }
  /** Counter reaches `min` (relative = counted from when the quest / tutorial step started). */
  | { type: 'counter'; key: string; min: number; relative?: boolean; label?: string }
  /** Reputation of at least `min`, and (tutorial) at least `gain` of it earned since the step started. */
  | { type: 'reputation'; min: number; gain?: number; label?: string }
  | { type: 'cond'; cond: Cond; label?: string }
  | { type: 'any'; of: Objective[] };

export interface Reward {
  money?: number;
  reputation?: number;
  unlocks?: UnlockKey[];
  mastery?: { track: MasteryTrack; xp: number };
  foods?: Record<string, number>;
}

export interface TutorialStepDef {
  id: string;
  title: string;
  body: string;
  objective: Objective;
  /** data-tutorial-id of the element to highlight. */
  hintTarget: string;
  reward?: Reward;
  /** Short line toasted when completed. */
  done?: string;
}

export interface QuestDef {
  id: string;
  title: string;
  body: string;
  objective: Objective;
  reward: Reward;
  /** Board eligibility. */
  requires: Cond[];
  /** May reappear after being claimed (targets scale with each repeat). */
  repeatable?: boolean;
  /** Relative weight when drawing new board quests. */
  weight?: number;
  icon?: string;
}

// ───────────────────────────── tutorial chains ─────────────────────────────

interface StarterFlavour {
  meet: string;
  camera: string;
  feed: [string, string];
  /** Tool the feed step points at (seahorses are target-fed). */
  feedHint?: string;
  water: [string, string];
  habitat: [string, string];
  /** Decor ids the habitat step suggests (Build panel can feature them; tests check they always fit). */
  habitatPicks: string[];
  observe: [string, string, string[]];
  upgrade: [string, string, UnlockKey[]];
  preview: string;
  food: Record<string, number>;
}

const FLAVOURS: Record<string, StarterFlavour> = {
  axolotl: {
    meet: '{name} is a young axolotl, a salamander that never leaves the water. Say hello.',
    camera: 'Drag to orbit the tank, then scroll or pinch to lean in. Axolotls love resting on the sand, so look low.',
    feed: ['Dinner, axolotl style', 'Tap Feed and drop an earthworm near {name}. Axolotls hunt by smell and suction, so food on the bottom works best.'],
    water: ['Keep it cool', 'Open the tank card and check the temperature. Axolotls come from cold mountain lakes and are happiest at {temp}.'],
    habitat: ['Somewhere shady', 'Axolotls dislike bright light. Add a cave or a plant from Build so {name} has a shady retreat.'],
    habitatPicks: ['terracotta_cave', 'anubias_nana', 'java_fern'],
    observe: ['Watch the gills', 'Watch {name}’s feathery gills. Every so often they flick to push fresh water across them.', ['observed:gill_flick', 'observed:walk', 'observed:surface_gulp']],
    upgrade: ['Room to grow', 'Earn a little more reputation to unlock the 40-gallon breeder. Axolotl pairs need lots of floor space.', ['tank_40']],
    preview: 'Axolotls breed after a gentle cool-down, and one day a shop could welcome paying visitors. Take a look at Research to see the path ahead.',
    food: { earthworm: 4 },
  },
  betta: {
    meet: '{name} is a betta, a labyrinth fish that gulps air from the surface. Say hello.',
    camera: 'Drag to orbit and scroll or pinch to lean in. Bring your finger near the glass and bettas will often follow it.',
    feed: ['Surface snack', 'Tap Feed, pick micro pellets and tap the water once — one tap is a small meal. Bettas feed at the surface, and little and often beats one big meal.'],
    water: ['Warm and still', 'Open the tank card and check the temperature. Bettas are tropical and like {temp} with a gentle filter.'],
    habitat: ['A leaf to lounge on', 'Add a broad-leaf plant or some floating cover from Build. Bettas rest near the surface and build their nests under cover.'],
    habitatPicks: ['anubias_nana', 'floating_plants', 'java_fern'],
    observe: ['Watch for a flare', 'Keep watching. When {name} sees something new he spreads his fins wide, and a contented male may start a bubble nest.', ['observed:fin_flare', 'observed:bubble_nest', 'observed:display']],
    upgrade: ['A nursery', 'Earn a little more reputation to unlock nursery tanks. They are the first step toward raising your own betta line.', ['nursery']],
    preview: 'A pair is only introduced briefly, then the male guards the nest alone. Take a look at Research to plan your line and your first shop.',
    food: { bloodworm_frozen: 4 },
  },
  pea_puffer: {
    meet: '{name} is a pea puffer, the world’s smallest pufferfish and a tiny, determined hunter.',
    camera: 'Drag to orbit and zoom right in. Pea puffers watch you back, each eye swivelling on its own.',
    feed: ['The hunt', 'Tap Feed and offer frozen bloodworms or a live snail. Pea puffers hunt food that looks alive and ignore flakes.'],
    water: ['Clean water, tiny fish', 'Open the tank card and check the ammonia. In a small tank with a messy eater, waste has to stay near zero.'],
    habitat: ['Break the sightlines', 'Add a plant or a piece of wood from Build. Dense cover keeps puffers calm and stops them squabbling.'],
    habitatPicks: ['java_moss', 'cryptocoryne', 'cholla_wood'],
    observe: ['Hover and scan', 'Watch {name} hover like a tiny helicopter while each eye scans in a different direction.', ['observed:hover', 'observed:hover_scan', 'observed:independent_eye_scan', 'observed:stalk', 'observed:hunt']],
    upgrade: ['Room for a group', 'Earn a little more reputation to unlock the 40-gallon breeder. That is enough planted space for a small puffer group.', ['tank_40']],
    preview: 'Pea puffers scatter their eggs in dense plants. Take a look at Research to plan for breeding and your first shop.',
    food: { live_snails: 4 },
  },
  ocellaris_clownfish: {
    meet: '{name} is an ocellaris clownfish. Every one starts life male, and the dominant fish of a pair becomes female.',
    camera: 'Drag to orbit and zoom in, then watch for that famous side-to-side waddle.',
    feed: ['Midwater snack', 'Tap Feed and drop marine pellets or mysis. Clownfish snap their food from the middle of the water.'],
    water: ['Salt matters', 'Open the tank card and check the salinity. Clownfish need a steady {salinity}.'],
    habitat: ['A home base', 'Add a rock or a reef-safe decoration from Build. Clownfish claim one spot as home, and they do not need an anemone.'],
    habitatPicks: ['live_rock', 'rubble', 'chaetomorpha'],
    observe: ['Home zone', 'Watch {name} waddle back and forth around a favourite spot. That spot is its hosting zone.', ['observed:host_zone', 'observed:host_nestle', 'observed:waddle_swim', 'observed:pair_swim', 'observed:hosting']],
    upgrade: ['Better life support', 'Earn a little more reputation to unlock better filters, heaters and reef-capable lights.', ['gear_tier2']],
    preview: 'When two young clownfish pair up, the larger one turns female. Take a look at Research to plan the reef path and your first shop.',
    food: { mysis_frozen: 4 },
  },
  lined_seahorse: {
    meet: '{name} is a lined seahorse. In seahorses the males carry the young, in a pouch.',
    camera: 'Drag to orbit and zoom in slowly. Seahorses are calm, unhurried animals, so move gently.',
    feed: ['Slow food', 'Choose Target feed and offer frozen mysis right to {name}. Seahorses are slow, deliberate eaters — target feeding makes sure {name} gets a full share before anything else can snatch it.'],
    feedHint: 'tool-target-feed',
    water: ['Gentle and salty', 'Open the tank card and check the salinity. Seahorses need stable marine water ({salinity}) and very gentle flow.'],
    habitat: ['Hitching posts', 'Add a plant, a soft branch or some décor from Build. Seahorses wrap their tails around it to rest.'],
    habitatPicks: ['hitching_post', 'red_ogo', 'chaetomorpha'],
    observe: ['The hitch', 'Watch {name} curl that tail around a hitching post and settle, eyes scanning independently.', ['observed:hitch', 'observed:hitched', 'observed:snick_feed']],
    upgrade: ['A nursery', 'Earn a little more reputation to unlock nursery tanks. Seahorse fry are tiny and need a safe place to grow.', ['nursery']],
    preview: 'Courting seahorses dance at dawn, and then the male gives birth. Take a look at Research to plan your first shop.',
    food: { mysis_frozen: 6 },
  },
};

/** Reputation the tutorial's "upgrade" step asks for (about one more friend visit — a few game hours — after "Word gets around"). */
export const TUTORIAL_UPGRADE_REP = 12;
/** …and reputation that must be earned DURING the step (≈ one friend visit), so it never completes unread. */
export const TUTORIAL_UPGRADE_GAIN = 2;
// lane:qa-play — the upgrade bodies no longer quote "(12 or more)": most players already have 12+ by then, and the
// coach's progress line shows the real target ("8/12 reputation" or "0/2 reputation earned on this step"). The betta
// feed step asks for ONE tap: two or three default portions in 10 gallons clouded the water (tank → Watch).

/** Decor the habitat step suggests for a starter (the Build panel can feature these first). */
export function habitatPicks(starterId: string): string[] {
  return (FLAVOURS[starterId] ?? FLAVOURS.betta).habitatPicks;
}

function chainFor(f: StarterFlavour): TutorialStepDef[] {
  return [
    // No `done` toast: this step completes on the first tick, right after the "Welcome home" celebration.
    { id: 'meet', title: 'Meet {name}', body: f.meet, objective: { type: 'flag', anyOf: ['opened_creature_card'], fallbackHours: 8 }, hintTarget: 'creature-name', done: 'Nice to meet you, {name}!' },
    { id: 'camera', title: 'Have a look around', body: f.camera, objective: { type: 'flag', anyOf: ['camera_moved', 'camera_zoomed', 'camera_mode'], fallbackHours: 10 }, hintTarget: 'scene', done: 'Lovely view.' },
    { id: 'feed', title: f.feed[0], body: f.feed[1], objective: { type: 'any', of: [{ type: 'flag', anyOf: ['fed', 'target_fed'] }, { type: 'counter', key: 'feeds', min: 1 }] }, hintTarget: f.feedHint ?? 'tool-feed', done: '{name} ate well.', reward: { mastery: { track: 'husbandry', xp: 10 } } },
    { id: 'water', title: f.water[0], body: f.water[1], objective: { type: 'flag', anyOf: ['opened_tank_card', 'read_water', 'read_param:temp', 'read_param:salinity', 'read_param:ammonia', 'opened_water'], fallbackHours: 16 }, hintTarget: 'tank-card-toggle', done: 'The water is in good shape.' },
    { id: 'habitat', title: f.habitat[0], body: f.habitat[1], objective: { type: 'any', of: [{ type: 'flag', anyOf: ['decor_placed'] }, { type: 'counter', key: 'decor_placed', min: 1 }] }, hintTarget: 'dock-build', done: 'A better home.', reward: { mastery: { track: 'aquascaping', xp: 15 } } },
    { id: 'observe', title: f.observe[0], body: f.observe[1], objective: { type: 'flag', anyOf: f.observe[2], fallbackHours: 5 }, hintTarget: 'scene', done: 'You’re learning {name}’s habits.' },
    { id: 'first_money', title: 'A visitor!', body: 'A friend has heard about {name} and wants to visit. Keep the water healthy and they may leave a tip.', objective: { type: 'any', of: [{ type: 'counter', key: 'friend_visits', min: 1, relative: true }, { type: 'counter', key: 'sales', min: 1, relative: true }] }, hintTarget: 'hud-money', done: 'Your first money from the hobby!', reward: { foods: f.food } },
    { id: 'market', title: 'The market', body: 'Open the Market to browse captive-bred stock and see what buyers pay for well-kept animals.', objective: { type: 'flag', anyOf: ['opened_market'], fallbackHours: 24 }, hintTarget: 'dock-market', done: 'You can now list animals for sale.', reward: { unlocks: ['market_listings'] } },
    { id: 'first_goal', title: 'Word gets around', body: 'Keep {name}’s tank looking lovely and the water healthy while two more friends drop by. (Once you have animals to spare, a small sale in the Market counts too.)', objective: { type: 'any', of: [{ type: 'counter', key: 'friend_visits', min: 2, relative: true, label: 'more friend visits' }, { type: 'counter', key: 'sales', min: 1, relative: true, label: 'sale' }] }, hintTarget: 'hud-money', done: 'Word is getting around.', reward: { money: 40, reputation: 3 } },
    { id: 'upgrade', title: f.upgrade[0], body: f.upgrade[1], objective: { type: 'reputation', min: TUTORIAL_UPGRADE_REP, gain: TUTORIAL_UPGRADE_GAIN, label: 'reputation' }, hintTarget: 'dock-build', done: 'New upgrade unlocked!', reward: { unlocks: f.upgrade[2] } },
    { id: 'preview', title: 'The road ahead', body: f.preview, objective: { type: 'flag', anyOf: ['opened_research', 'opened_visitors', 'opened_build', 'opened_panel:research', 'opened_panel:visitors'], fallbackHours: 20 }, hintTarget: 'dock-research', done: 'Tutorial complete. The quest board is open!', reward: { money: 60, reputation: 5 } },
  ];
}

export const TUTORIAL_CHAINS: Record<string, TutorialStepDef[]> = Object.fromEntries(Object.entries(FLAVOURS).map(([id, f]) => [id, chainFor(f)]));

export function tutorialChain(starterId: string): TutorialStepDef[] {
  return TUTORIAL_CHAINS[starterId] ?? TUTORIAL_CHAINS.betta;
}

/** Reward for claiming the finished tutorial quest ('tutorial'). */
export const TUTORIAL_QUEST_REWARD: Reward = { money: 100, reputation: 5 };

// ───────────────────────────── quest board ─────────────────────────────

const unlockedCond = (key: string): Cond => ({ type: 'unlocked', key });

export const QUESTS: QuestDef[] = [
  { id: 'q_feed_routine', title: 'Feeding routine', body: 'Feed your animals 10 times — little and often beats one big meal.', objective: { type: 'counter', key: 'feeds', min: 10, relative: true }, reward: { money: 40, mastery: { track: 'husbandry', xp: 20 } }, requires: [], repeatable: true, weight: 0.7, icon: 'Utensils' },
  { id: 'q_water_changes', title: 'Fresh water', body: 'Do 3 partial water changes to keep nitrate low.', objective: { type: 'counter', key: 'waterChanges', min: 3, relative: true }, reward: { money: 60, mastery: { track: 'husbandry', xp: 30 } }, requires: [], repeatable: true, weight: 0.8, icon: 'Droplets' },
  { id: 'q_water_good_3d', title: 'Steady as she goes', body: 'Keep every tank’s water GOOD for 3 days in a row.', objective: { type: 'counter', key: 'water_good_streak', min: 3, label: 'days in a row' }, reward: { money: 150, reputation: 8 }, requires: [], repeatable: true, weight: 1, icon: 'ShieldCheck' },
  { id: 'q_beauty_70', title: 'Showpiece', body: 'Aquascape a tank yourself (place or move at least 3 pieces) to a beauty score of 70.', objective: { type: 'cond', cond: { type: 'beauty', min: 70, scaped: SCAPED_EDITS } }, reward: { money: 120, reputation: 6, mastery: { track: 'aquascaping', xp: 40 } }, requires: [], weight: 1.2, icon: 'Sparkles' },
  { id: 'q_beauty_85', title: 'Gallery quality', body: 'Aquascape a tank yourself (place or move at least 3 pieces) to a beauty score of 85.', objective: { type: 'cond', cond: { type: 'beauty', min: 85, scaped: SCAPED_EDITS } }, reward: { money: 400, reputation: 15, mastery: { track: 'aquascaping', xp: 80 } }, requires: [{ type: 'reputation', min: 100 }], weight: 1, icon: 'Gem' },
  { id: 'q_second_tank', title: 'A second tank', body: 'Set up a second aquarium. Quarantine, nursery or a whole new community.', objective: { type: 'cond', cond: { type: 'tanks', min: 2 } }, reward: { money: 100, reputation: 4 }, requires: [], weight: 1.4, icon: 'Plus' },
  { id: 'q_species_3', title: 'Community', body: 'Keep 3 different species at once, and make sure they’re compatible.', objective: { type: 'cond', cond: { type: 'owns_species', min: 3 } }, reward: { money: 150, reputation: 6 }, requires: [], weight: 1, icon: 'Fish' },
  { id: 'q_species_8', title: 'Collector', body: 'Keep 8 different species at once.', objective: { type: 'cond', cond: { type: 'owns_species', min: 8 } }, reward: { money: 600, reputation: 15 }, requires: [{ type: 'owns_species', min: 3 }], weight: 0.8, icon: 'Library' },
  { id: 'q_breed_first', title: 'First generation', body: 'Raise a clutch of babies of your own.', objective: { type: 'counter', key: 'births', min: 1, relative: true }, reward: { money: 200, reputation: 10, mastery: { track: 'breeding', xp: 60 } }, requires: [], weight: 1.2, icon: 'Egg' },
  { id: 'q_breed_more', title: 'A proven line', body: 'Raise 3 more clutches.', objective: { type: 'counter', key: 'births', min: 3, relative: true }, reward: { money: 450, reputation: 15, mastery: { track: 'breeding', xp: 120 } }, requires: [{ type: 'counter', key: 'births', min: 1 }], repeatable: true, weight: 0.8, icon: 'GitBranch' },
  { id: 'q_morphs', title: 'Colour collector', body: 'Discover 4 different morphs.', objective: { type: 'cond', cond: { type: 'morphs', min: 4 } }, reward: { money: 250, reputation: 8 }, requires: [], weight: 0.7, icon: 'Palette' },
  { id: 'q_sell_creature', title: 'Happy customer', body: 'Sell an animal to a buyer who will care for it.', objective: { type: 'counter', key: 'sales', min: 1, relative: true }, reward: { money: 50, reputation: 4, mastery: { track: 'business', xp: 25 } }, requires: [unlockedCond('market_listings')], repeatable: true, weight: 1, icon: 'HandCoins' },
  { id: 'q_sell_tank', title: 'Turnkey aquarium', body: 'Sell a whole aquarium for $500 or more.', objective: { type: 'cond', cond: { type: 'counter', key: 'best_tank_sale', min: 500 } }, reward: { money: 250, reputation: 12, mastery: { track: 'business', xp: 80 } }, requires: [unlockedCond('tank_auctions')], weight: 1, icon: 'Package' },
  { id: 'q_sell_tank_big', title: 'Masterpiece sale', body: 'Sell a whole aquarium for $5,000 or more.', objective: { type: 'cond', cond: { type: 'counter', key: 'best_tank_sale', min: 5000 } }, reward: { money: 1500, reputation: 30, mastery: { track: 'business', xp: 200 } }, requires: [unlockedCond('tank_auctions'), { type: 'facility', level: 'aquarium_store' }], weight: 0.8, icon: 'Trophy' },
  { id: 'q_friends', title: 'Show and tell', body: 'Host 3 friend visits in your hobby room.', objective: { type: 'counter', key: 'friend_visits', min: 3, relative: true }, reward: { money: 60, reputation: 5 }, requires: [], weight: 0.8, icon: 'Users' },
  { id: 'q_open_shop', title: 'Open your doors', body: 'Move into a specialty shop and welcome paying visitors.', objective: { type: 'cond', cond: { type: 'facility', level: 'specialty_shop' } }, reward: { money: 300, reputation: 10 }, requires: [unlockedCond('facility_specialty_shop')], weight: 3, icon: 'Store' },
  { id: 'q_visitors_50', title: 'Busy week', body: 'Host 50 visitors.', objective: { type: 'counter', key: 'visitors', min: 50, relative: true }, reward: { money: 250, reputation: 10, mastery: { track: 'exhibition', xp: 40 } }, requires: [unlockedCond('visitors')], repeatable: true, weight: 1.2, icon: 'Users' },
  { id: 'q_wows', title: 'Jaw-droppers', body: 'Earn 10 “wow” reactions from visitors.', objective: { type: 'counter', key: 'wows', min: 10, relative: true }, reward: { money: 200, reputation: 10 }, requires: [unlockedCond('visitors')], repeatable: true, weight: 1, icon: 'Star' },
  { id: 'q_signage', title: 'Teach them', body: 'Put educational signs on 3 exhibits.', objective: { type: 'counter', key: 'signs_active', min: 3 }, reward: { money: 120, reputation: 6, mastery: { track: 'exhibition', xp: 30 } }, requires: [unlockedCond('signage'), { type: 'tanks', min: 3 }], weight: 1, icon: 'BookOpen' },
  { id: 'q_satisfied', title: 'Five-star day', body: 'Finish a day with 20+ visitors and average satisfaction of 75 or more.', objective: { type: 'counter', key: 'five_star_days', min: 1, relative: true }, reward: { money: 300, reputation: 12 }, requires: [unlockedCond('visitors')], repeatable: true, weight: 0.9, icon: 'Smile' },
  { id: 'q_research', title: 'Keep learning', body: 'Complete a research project.', objective: { type: 'counter', key: 'research_done', min: 1, relative: true }, reward: { money: 150, reputation: 6 }, requires: [], repeatable: true, weight: 0.8, icon: 'FlaskConical' },
  { id: 'q_marine', title: 'Into the blue', body: 'Set up a marine aquarium.', objective: { type: 'cond', cond: { type: 'tanks', min: 1, env: 'marine' } }, reward: { money: 200, reputation: 8, mastery: { track: 'marine', xp: 40 } }, requires: [unlockedCond('marine_basics')], weight: 1, icon: 'Waves' },
  { id: 'q_reef', title: 'Living reef', body: 'Set up a reef aquarium.', objective: { type: 'cond', cond: { type: 'tanks', min: 1, reef: true } }, reward: { money: 400, reputation: 12, mastery: { track: 'marine', xp: 80 } }, requires: [unlockedCond('reef')], weight: 1.2, icon: 'Flower2' },
  { id: 'q_estuary', title: 'A splash of salt', body: 'Set up a brackish estuary aquarium.', objective: { type: 'cond', cond: { type: 'tanks', min: 1, env: 'brackish' } }, reward: { money: 250, reputation: 8, mastery: { track: 'husbandry', xp: 40 } }, requires: [unlockedCond('brackish')], weight: 1, icon: 'Droplets' }, // lane:brackish
  { id: 'q_big_tank', title: 'Go big', body: 'Set up a tank of 125 gallons or more.', objective: { type: 'cond', cond: { type: 'tanks', min: 1, minGallons: 125 } }, reward: { money: 500, reputation: 12 }, requires: [unlockedCond('tank_125')], weight: 1.2, icon: 'Maximize' },
  { id: 'q_store', title: 'Expand the store', body: 'Upgrade to an aquarium store.', objective: { type: 'cond', cond: { type: 'facility', level: 'aquarium_store' } }, reward: { money: 800, reputation: 15 }, requires: [unlockedCond('facility_aquarium_store')], weight: 3, icon: 'Building' },
  { id: 'q_showroom', title: 'Lights down', body: 'Open a public showroom.', objective: { type: 'cond', cond: { type: 'facility', level: 'showroom' } }, reward: { money: 2000, reputation: 20 }, requires: [unlockedCond('facility_showroom')], weight: 3, icon: 'Building2' },
  { id: 'q_destination', title: 'Worth the trip', body: 'Become a destination aquarium.', objective: { type: 'cond', cond: { type: 'facility', level: 'destination' } }, reward: { money: 5000, reputation: 25 }, requires: [unlockedCond('facility_destination')], weight: 3, icon: 'MapPin' },
  { id: 'q_grand_hall', title: 'The Grand Hall', body: 'Open the Grand Hall.', objective: { type: 'cond', cond: { type: 'facility', level: 'grand_hall' } }, reward: { money: 12000, reputation: 40 }, requires: [unlockedCond('facility_grand_hall')], weight: 3, icon: 'Landmark' },
  { id: 'q_grand_display', title: 'A thousand gallons', body: 'Build a 1,000-gallon grand display.', objective: { type: 'cond', cond: { type: 'tanks', min: 1, minGallons: 1000 } }, reward: { money: 8000, reputation: 40 }, requires: [unlockedCond('tank_1000')], weight: 3, icon: 'Crown' },
  // lane:shows — shows appear on the board once you've looked at the Shows panel (flag set when it opens)
  { id: 'q_first_show', title: 'Best foot forward', body: 'Enter a show. A healthy, settled adult that trusts you shows best.', objective: { type: 'counter', key: 'show_entries', min: 1, relative: true }, reward: { money: 60, reputation: 4, mastery: { track: 'exhibition', xp: 25 } }, requires: [unlockedCond('shows'), { type: 'flag', flag: 'opened_shows' }], weight: 1.5, icon: 'Trophy' },
  // lane:w2-ui — staff appear on the board once they unlock (first shop). 'hired_staff' is raised by the Staff tab's
  // Hire button (and synced there for saves that already have a team), so a pre-existing roster still completes it.
  { id: 'q_first_staff', title: 'An extra pair of hands', body: 'Hire your first staff member in Visitors › Staff. An aquarist feeds and cleans on their rounds; the bond with your animals stays yours.', objective: { type: 'cond', cond: { type: 'flag', flag: 'hired_staff', label: 'Hire a staff member' } }, reward: { money: 100, reputation: 4, mastery: { track: 'business', xp: 25 } }, requires: [unlockedCond('staff')], weight: 2, icon: 'UserPlus' },
  { id: 'q_show_ribbon', title: 'Ribbon day', body: 'Place 1st, 2nd or 3rd in any show class.', objective: { type: 'counter', key: 'show_ribbons', min: 1, relative: true }, reward: { money: 150, reputation: 6, mastery: { track: 'breeding', xp: 40 } }, requires: [unlockedCond('shows'), { type: 'counter', key: 'show_entries', min: 1 }], repeatable: true, weight: 0.9, icon: 'Award' },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** Number of simultaneous board quests (completed-but-unclaimed quests keep their slot). */
export const QUEST_BOARD_SIZE = 3;
