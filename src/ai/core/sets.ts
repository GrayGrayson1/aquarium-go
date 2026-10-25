/**
 * Behaviour-set profiles: locomotion, body envelope, idle activity weights and signature habits per BehaviorSetId.
 * Species data (speeds, turn rates, zones, curiosity…) comes from `species.behaviorTraits`; these profiles decide
 * HOW an animal of that body plan moves and what it tends to do. OWNER: lane "behavior".
 */
import type { BehaviorSetId } from '@/types';
import { SURF_ALL, SURF_DECOR, SURF_FLOOR, SURF_GLASS } from './env';

export type Loco = 'swim' | 'upright' | 'crawl' | 'walk' | 'sessile';

export type ActId =
  | 'cruise'
  | 'school'
  | 'patrol'
  | 'hover'
  | 'rest'
  | 'sleep'
  | 'hide'
  | 'inspect_glass'
  | 'follow_pointer'
  | 'inspect_decor'
  | 'inspect_tap'
  | 'forage'
  | 'graze'
  | 'feed'
  | 'hunt'
  | 'startle'
  | 'retreat'
  | 'breathe'
  | 'display'
  | 'glass_surf'
  | 'court'
  | 'spawn'
  | 'nest_build'
  | 'guard'
  | 'host'
  | 'hitch'
  | 'pair_follow'
  | 'visit_cleaner'
  | 'clean_station'
  | 'cleaning'
  | 'perch'
  | 'burrow'
  | 'float'
  | 'beg'
  | 'crawl_explore'
  | 'reposition'
  | 'gasp'
  | 'dead'
  | 'brood'
  | 'spit' // lane:brackish — archerfish water-jet shot (src/ai/core/spit.ts)
  | 'sand_dive' // chunk 16 — a badly frightened wrasse dives into the sand bed and stays buried a while (src/ai/core/sand.ts)
  | 'chase' // chunk 16 — a territorial fish (blenny, damsel, ram) darts at an intruder near its home and swims back (reef.ts)
  | 'wander' // chunk 16 — a living anemone creeps toward a spot it likes, then settles for good (anemone.ts)
  | 'still';

export interface BodyEnvelope {
  /** Half extents in body lengths: x along the head axis, y up, z sideways. */
  hx: number;
  hy: number;
  hz: number;
}

/** 'sand' (chunk 16): darts like 'dart'; a hard fright dives into the sand bed instead (wrasse; see sand.ts).
 * 'shelter' (chunk 16): dashes straight into cover — a hole in the rock (blenny), its own patch (damsel), the crevice it
 * lives in (emerald crab, scuttling sideways). */
export type StartleStyle = 'dart' | 'tailflip' | 'retract' | 'burrow' | 'freeze' | 'sand' | 'shelter';
/** 'sand' (chunk 16): sleeps buried in the sand bed (wrasse); a tank without one: wedged in rockwork ('cave'). */
export type RestStyle = 'bottom' | 'leaf' | 'hover' | 'hitch' | 'cling' | 'burrow' | 'cave' | 'host' | 'sand';

/** Chunk 16 — a sand-dwelling crawler that digs itself into a sand bed (see sand.ts). */
export interface BuryProfile {
  /** How deep it sits when dug in, in body half-heights below its normal resting height: 1 = the body's middle at the
   * sand line (a half-buried conch), 2 = the top of the shell flush with the sand (a Nassarius, siphon up). */
  depth: number;
  /** Digging in / coming up, in half-heights per second. */
  dig: number;
  rise: number;
}

/** Chunk 16 — a lurching gait (fighting conch): the foot vaults the shell `dist` body lengths in `hop` seconds, then
 * it pauses before the next vault — as long as it takes to keep to the speed asked of it, but at least `pause[0]` and
 * at most 2.5 × `pause[1]` seconds. */
export interface LurchGait {
  dist: number;
  hop: number;
  pause: [number, number];
}

export interface SetProfile {
  loco: Loco;
  body: BodyEnvelope;
  /** Surfaces a crawler may walk on. */
  crawlMask: number;
  /** Crawlers/walkers that can also swim short distances (axolotl, shrimp, oto…). */
  canSwim: boolean;
  /** 0..1 ability to drift sideways/backwards without turning (hovering fish, seahorse). */
  hover: number;
  maxPitch: number;
  /** Tail-beat frequency multiplier (waddling clownfish > 1, graceful betta < 1). */
  tailFreq: number;
  /** Base idle activity weights for the planner. */
  acts: Partial<Record<ActId, number>>;
  school?: boolean;
  /** Loose group following conspecifics (shoal) without tight boids. */
  shoal?: boolean;
  /** Seconds between surface air gulps [min,max] (labyrinth fish, axolotl, corydoras, frogs). */
  airBreath?: [number, number];
  rest: RestStyle;
  startle: StartleStyle;
  /** Species-independent startle sensitivity multiplier. */
  startleSens: number;
  /** Crawler gait when moving. */
  crawlGait?: 'walk' | 'crawl' | 'hop';
  /** Orient belly toward nearby rock (royal gramma hanging under ledges). */
  hugRock?: boolean;
  /** Territory radius in body lengths for home-bound animals. */
  territoryBL?: number;
  /** Fish that swim close above the substrate most of the time. */
  bottomHugger?: boolean;
  /** Sessile/very slow creatures that ignore separation from fish. */
  ignoreFish?: boolean;
  // ── chunk 16 ──
  /** Swims by rowing with the pectoral fins (labriform: wrasses): the pectorals beat at cruise, the tail folds and
   * joins in only for bursts (cosmetics: rt.flutter, rt.ai.tailDrive). */
  labriform?: boolean;
  /** Forages by picking: many short stops low over rock and sand, a few quick pecks at each (wrasse). */
  picker?: boolean;
  /** Turns in this many hours before the lights go off and gets up this long after they come on (a wrasse is in the
   * sand before the other fish settle and comes out after they are up). */
  bedtime?: { early: number; late: number };
  /** Digs into a sand bed while resting / buried (conch, Nassarius). */
  bury?: BuryProfile;
  /** Flat, wide, radially symmetric crawler (sea star): its body envelope is a disc of radius max(hx, hz) that lies
   * flat on the surface it is on and rolls round the corner where two surfaces meet (loco.ts projectFlat). */
  flatBody?: boolean;
  /** Moves in vaults with pauses between them instead of a steady glide (fighting conch). */
  lurch?: LurchGait;
  /** Buried scavenger that smells food lying anywhere on the floor and comes up for it (Nassarius). */
  smellsFood?: boolean;
  // ── chunk 16, wave B ──
  /** Out only at night: spends the light hours asleep in shelter — wedged in its crevice (emerald crab) or under the
   * sand (sand-sifting star) — and comes out when the lights go off. */
  nightOnly?: boolean;
  /** A crawler that rests and sleeps wedged into a rock crevice (a cave or hide anchor) instead of where it stops. */
  creviceRest?: boolean;
  /** A fish that grazes film algae off rock and glass in bouts, face to the surface (lawnmower blenny). */
  surfaceGrazer?: boolean;
  /** Chases intruders off its home patch: 'kin' — only its own kind (another blenny); 'fish' — any fish that comes
   * close and is not much bigger (damsel, ram). Needs territoryBL. */
  chases?: 'kin' | 'fish';
  /** A living anemone: creeps about until it finds a spot it likes, then stays put; opens and closes; hosts clownfish
   * (anemone.ts). */
  anemone?: boolean;
  /** A crawler on rock rests on the rock as drawn, inside the collider box round it (rockshape.ts; loco stepCrawl). */
  meshCling?: boolean;
}

const FISH: BodyEnvelope = { hx: 0.5, hy: 0.14, hz: 0.07 };

const base = (p: Partial<SetProfile> & Pick<SetProfile, 'acts'>): SetProfile => ({
  loco: 'swim',
  body: FISH,
  crawlMask: 0,
  canSwim: true,
  hover: 0.3,
  maxPitch: 0.65,
  tailFreq: 1,
  rest: 'hover',
  startle: 'dart',
  startleSens: 1,
  ...p,
});

export const SET_PROFILES: Record<BehaviorSetId, SetProfile> = {
  axolotl: base({
    loco: 'walk',
    body: { hx: 0.5, hy: 0.066, hz: 0.12 },
    crawlMask: SURF_FLOOR,
    canSwim: true,
    hover: 0.25,
    maxPitch: 0.75,
    tailFreq: 0.75,
    acts: { crawl_explore: 4.4, rest: 1.35, inspect_glass: 1.6, inspect_decor: 1.0, cruise: 0.5 },
    airBreath: [110, 300],
    rest: 'bottom',
    startle: 'dart',
    startleSens: 0.45,
    crawlGait: 'walk',
    ignoreFish: false,
  }),
  betta: base({
    body: { hx: 0.5, hy: 0.17, hz: 0.07 },
    hover: 0.55,
    maxPitch: 0.8,
    tailFreq: 0.72,
    acts: { cruise: 3, hover: 1.6, rest: 1, inspect_glass: 1.5, display: 1.1, inspect_decor: 0.7 },
    airBreath: [45, 130],
    rest: 'leaf',
    startleSens: 0.8,
  }),
  pea_puffer: base({
    body: { hx: 0.5, hy: 0.26, hz: 0.22 },
    hover: 1,
    maxPitch: 0.55,
    tailFreq: 1.15,
    acts: { hover: 4, cruise: 1.4, inspect_decor: 2.2, inspect_glass: 2, rest: 0.5 },
    rest: 'leaf',
    startleSens: 1,
  }),
  clownfish: base({
    body: { hx: 0.5, hy: 0.2, hz: 0.09 },
    hover: 0.6,
    maxPitch: 0.6,
    tailFreq: 1.55,
    acts: { host: 4.5, cruise: 0.9, inspect_glass: 1, display: 0.25 },
    rest: 'host',
    territoryBL: 4,
    startleSens: 0.8,
  }),
  seahorse: base({
    loco: 'upright',
    body: { hx: 0.18, hy: 0.42, hz: 0.1 },
    hover: 1,
    maxPitch: 0,
    tailFreq: 1,
    acts: { hitch: 7, cruise: 1, inspect_decor: 0.4, inspect_glass: 0.4 },
    rest: 'hitch',
    startle: 'freeze',
    startleSens: 0.5,
  }),
  schooling_small: base({
    body: { hx: 0.5, hy: 0.13, hz: 0.06 },
    hover: 0.2,
    tailFreq: 1,
    acts: { school: 7, forage: 0.8, rest: 0.25, inspect_glass: 0.3 },
    school: true,
    startleSens: 1.2,
  }),
  livebearer: base({
    body: { hx: 0.5, hy: 0.15, hz: 0.07 },
    hover: 0.35,
    tailFreq: 1.1,
    acts: { cruise: 3, display: 1.4, forage: 1.1, inspect_glass: 0.8, hover: 0.5 },
    shoal: true,
    startleSens: 1.1,
  }),
  surface_dweller: base({
    body: { hx: 0.5, hy: 0.12, hz: 0.07 },
    hover: 0.3,
    tailFreq: 1.05,
    acts: { cruise: 3, hover: 1, forage: 0.6 },
    shoal: true,
    startleSens: 1.15,
  }),
  bottom_forager: base({
    body: { hx: 0.5, hy: 0.2, hz: 0.12 },
    hover: 0.45,
    maxPitch: 0.95,
    tailFreq: 1.3,
    acts: { forage: 5, rest: 1.1, cruise: 1.2 },
    shoal: true,
    airBreath: [70, 260],
    rest: 'bottom',
    bottomHugger: true,
    startleSens: 1,
  }),
  algae_grazer: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.12, hz: 0.16 },
    crawlMask: SURF_ALL,
    canSwim: true,
    hover: 0.4,
    tailFreq: 1.2,
    acts: { graze: 6, rest: 1, hide: 0.8 },
    rest: 'cling',
    crawlGait: 'crawl',
    startleSens: 0.8,
    meshCling: true, // chunk 16 — on modelled rock, on the rock as drawn (rockshape.ts)
  }),
  loach_eel: base({
    body: { hx: 0.5, hy: 0.06, hz: 0.05 },
    hover: 0.3,
    maxPitch: 0.8,
    tailFreq: 2.1,
    acts: { hide: 4, forage: 3, rest: 1, cruise: 0.8 },
    rest: 'cave',
    bottomHugger: true,
    startleSens: 1,
  }),
  hillstream: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.08, hz: 0.22 },
    crawlMask: SURF_ALL,
    canSwim: true,
    hover: 0.3,
    tailFreq: 1.3,
    acts: { graze: 6, rest: 1.2 },
    rest: 'cling',
    crawlGait: 'crawl',
    startleSens: 0.9,
    meshCling: true, // chunk 16 — on modelled rock, on the rock as drawn (rockshape.ts)
  }),
  gourami: base({
    body: { hx: 0.5, hy: 0.2, hz: 0.07 },
    hover: 0.7,
    maxPitch: 0.7,
    tailFreq: 0.8,
    acts: { cruise: 2.5, hover: 2, inspect_decor: 2, inspect_glass: 1.2, rest: 0.5 },
    airBreath: [60, 190],
    rest: 'leaf',
    startleSens: 0.9,
  }),
  shrimp_dwarf: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.16, hz: 0.1 },
    crawlMask: SURF_FLOOR | SURF_DECOR,
    canSwim: true,
    hover: 0.5,
    tailFreq: 1.6,
    acts: { graze: 6, crawl_explore: 2, cruise: 0.45 },
    rest: 'cling',
    startle: 'tailflip',
    startleSens: 0.9,
    crawlGait: 'walk',
    ignoreFish: true,
    meshCling: true, // chunk 16 — on modelled rock, on the rock as drawn (rockshape.ts)
  }),
  shrimp_cleaner: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.16, hz: 0.12 },
    crawlMask: SURF_FLOOR | SURF_DECOR | SURF_GLASS,
    canSwim: true,
    hover: 0.5,
    tailFreq: 1.4,
    acts: { clean_station: 6, graze: 1.5, crawl_explore: 1 },
    rest: 'cave',
    startle: 'tailflip',
    startleSens: 0.7,
    crawlGait: 'walk',
    ignoreFish: true,
    meshCling: true, // chunk 16 — on modelled rock, on the rock as drawn (rockshape.ts)
  }),
  snail: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.2, hz: 0.36 },
    crawlMask: SURF_ALL,
    canSwim: false,
    hover: 0,
    tailFreq: 0.35,
    acts: { graze: 6, crawl_explore: 2, rest: 1 },
    rest: 'cling',
    startle: 'retract',
    startleSens: 0.35,
    crawlGait: 'crawl',
    ignoreFish: true,
    meshCling: true, // chunk 16 — on modelled rock, on the rock as drawn (rockshape.ts)
  }),
  frog_aquatic: base({
    body: { hx: 0.5, hy: 0.1, hz: 0.3 },
    hover: 0.8,
    maxPitch: 1.25,
    tailFreq: 0.9,
    acts: { float: 3, rest: 3, cruise: 0.7, forage: 1.6 },
    airBreath: [60, 200],
    rest: 'bottom',
    bottomHugger: true,
    startleSens: 0.8,
  }),
  goldfish: base({
    body: { hx: 0.5, hy: 0.28, hz: 0.15 },
    hover: 0.5,
    maxPitch: 0.8,
    tailFreq: 0.9,
    acts: { forage: 4, cruise: 3, inspect_decor: 1 },
    shoal: true,
    startleSens: 0.8,
  }),
  crayfish: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.17, hz: 0.2 },
    crawlMask: SURF_FLOOR | SURF_DECOR,
    canSwim: false,
    hover: 0,
    tailFreq: 1.2,
    acts: { crawl_explore: 3, hide: 1.4, forage: 2.4 },
    rest: 'cave',
    startle: 'tailflip',
    startleSens: 0.8,
    crawlGait: 'walk',
    ignoreFish: true,
  }),
  cichlid_discus: base({
    body: { hx: 0.5, hy: 0.45, hz: 0.07 },
    hover: 0.6,
    maxPitch: 0.5,
    tailFreq: 0.7,
    acts: { cruise: 3, hover: 2.5, forage: 0.5, inspect_glass: 0.7 },
    shoal: true,
    startleSens: 0.9,
  }),
  reef_basslet: base({
    body: { hx: 0.5, hy: 0.17, hz: 0.08 },
    hover: 0.85,
    tailFreq: 1.1,
    acts: { perch: 5, hide: 1, cruise: 0.6, inspect_glass: 0.5 },
    rest: 'cave',
    hugRock: true,
    territoryBL: 5,
    startleSens: 0.9,
  }),
  dartfish: base({
    body: { hx: 0.5, hy: 0.12, hz: 0.07 },
    hover: 1,
    tailFreq: 1.1,
    acts: { burrow: 6, cruise: 0.35 },
    rest: 'burrow',
    startle: 'burrow',
    startleSens: 1.2,
  }),
  goby_burrow: base({
    body: { hx: 0.5, hy: 0.14, hz: 0.1 },
    hover: 0.6,
    tailFreq: 1.2,
    acts: { burrow: 6, forage: 1.2 },
    rest: 'burrow',
    startle: 'burrow',
    bottomHugger: true,
    startleSens: 1,
  }),
  goby_perch: base({
    body: { hx: 0.5, hy: 0.18, hz: 0.1 },
    hover: 0.7,
    tailFreq: 1.2,
    acts: { perch: 7, cruise: 0.3 },
    rest: 'cave',
    startleSens: 0.9,
  }),
  cardinal_hover: base({
    body: { hx: 0.5, hy: 0.3, hz: 0.08 },
    hover: 1,
    tailFreq: 0.8,
    acts: { hover: 6, cruise: 0.8 },
    shoal: true,
    startleSens: 0.8,
  }),
  chromis: base({
    body: { hx: 0.5, hy: 0.22, hz: 0.07 },
    hover: 0.4,
    tailFreq: 1.2,
    acts: { school: 5, forage: 1 },
    school: true,
    startleSens: 1.1,
  }),
  tang: base({
    body: { hx: 0.5, hy: 0.36, hz: 0.07 },
    hover: 0.45,
    tailFreq: 0.9,
    acts: { patrol: 5, inspect_decor: 2, cruise: 1 },
    startleSens: 0.8,
  }),
  angelfish_dwarf: base({
    body: { hx: 0.5, hy: 0.25, hz: 0.07 },
    hover: 0.6,
    tailFreq: 1.1,
    acts: { inspect_decor: 4, cruise: 2, hide: 1 },
    rest: 'cave',
    startleSens: 0.9,
  }),
  rabbitfish: base({
    body: { hx: 0.5, hy: 0.3, hz: 0.07 },
    hover: 0.5,
    tailFreq: 0.9,
    acts: { inspect_decor: 3, cruise: 3, hover: 1 },
    startleSens: 0.8,
  }),
  dragonet: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.14, hz: 0.2 },
    crawlMask: SURF_FLOOR | SURF_DECOR,
    canSwim: true,
    hover: 0.8,
    tailFreq: 0.9,
    acts: { forage: 6, crawl_explore: 1 },
    rest: 'cave',
    crawlGait: 'hop',
    startleSens: 0.7,
  }),
  hermit_crab: base({
    loco: 'crawl',
    body: { hx: 0.45, hy: 0.2, hz: 0.4 },
    crawlMask: SURF_FLOOR | SURF_DECOR | SURF_GLASS,
    canSwim: false,
    hover: 0,
    tailFreq: 1.4,
    acts: { crawl_explore: 3, forage: 3, rest: 0.8 },
    rest: 'cling',
    startle: 'retract',
    startleSens: 0.6,
    crawlGait: 'walk',
    ignoreFish: true,
    meshCling: true, // chunk 16 — on modelled rock, on the rock as drawn (rockshape.ts)
  }),
  mantis_shrimp: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.12, hz: 0.12 },
    crawlMask: SURF_FLOOR | SURF_DECOR,
    canSwim: false,
    hover: 0,
    tailFreq: 1.6,
    acts: { burrow: 6, forage: 1.5 },
    rest: 'burrow',
    startle: 'burrow',
    startleSens: 0.9,
    crawlGait: 'walk',
    ignoreFish: true,
  }),
  lionfish: base({
    body: { hx: 0.5, hy: 0.25, hz: 0.1 },
    hover: 0.9,
    maxPitch: 0.7,
    tailFreq: 0.7,
    acts: { hover: 4, perch: 2, cruise: 1 },
    rest: 'cave',
    startleSens: 0.4,
  }),
  grouper: base({
    body: { hx: 0.5, hy: 0.22, hz: 0.1 },
    hover: 0.6,
    tailFreq: 0.8,
    acts: { perch: 4, cruise: 2, rest: 1 },
    rest: 'cave',
    territoryBL: 3,
    startleSens: 0.5,
  }),
  // lane:brackish — archerfish: a loose shoal cruising just under the surface, scanning the air for insects.
  archerfish: base({
    body: { hx: 0.5, hy: 0.2, hz: 0.08 },
    hover: 0.6,
    // everyday swimming stays level-ish; the steep aim (50–65°) is allowed only while shooting (ctrl.pitchCap)
    maxPitch: 0.6,
    tailFreq: 0.9,
    acts: { cruise: 3.2, hover: 1.8, inspect_glass: 0.7, inspect_decor: 0.45 },
    shoal: true,
    startleSens: 0.8,
  }),
  // chunk 16 — melanurus wrasse: rows itself about low over rock and sand all day, picking at pods, worms and pest
  // snails (lots of short stops and pecks), noses round the decor; dives head-first into the sand at dusk and on a hard
  // fright, and sleeps buried (in rockwork when the tank has no sand bed)
  wrasse: base({
    body: { hx: 0.5, hy: 0.13, hz: 0.07 },
    hover: 0.65,
    maxPitch: 0.7,
    tailFreq: 0.75,
    acts: { forage: 5.5, inspect_decor: 2.4, cruise: 1.4, hover: 0.35 },
    rest: 'sand',
    startle: 'sand',
    startleSens: 1.05,
    labriform: true,
    picker: true,
    bedtime: { early: 0.6, late: 0.75 },
  }),
  // chunk 16 — elegant sea star: glides on its tube feet over glass, rock and sand grazing film algae — long stays on one
  // patch, slow drifts to the next; never swims, lies flat on whatever it is on; a scare only stops it
  starfish: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.08, hz: 0.5 },
    crawlMask: SURF_ALL,
    canSwim: false,
    hover: 0,
    maxPitch: 0,
    tailFreq: 0.25,
    acts: { graze: 7, crawl_explore: 1.1, rest: 0.8 },
    rest: 'cling',
    startle: 'freeze',
    startleSens: 0.25,
    crawlGait: 'crawl',
    ignoreFish: true,
    flatBody: true,
    meshCling: true,
  }),
  // chunk 16 — fighting conch: a sand-bed grazer that vaults its shell forward on its sickle-shaped operculum, pauses,
  // vaults again; rests (much of the day) half-buried; startled, it pulls into its shell
  conch: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.3, hz: 0.35 },
    crawlMask: SURF_FLOOR,
    canSwim: false,
    hover: 0,
    maxPitch: 0,
    tailFreq: 0.4,
    acts: { graze: 5, crawl_explore: 1.4, rest: 2.6 },
    rest: 'cling',
    startle: 'retract',
    startleSens: 0.5,
    crawlGait: 'hop',
    ignoreFish: true,
    bury: { depth: 1, dig: 0.3, rise: 0.8 },
    lurch: { dist: 0.38, hop: 0.45, pause: [0.9, 2.6] },
  }),
  // chunk 16 — Nassarius: lies buried in the sand with only its siphon up; smells food landing anywhere on the floor,
  // erupts from the sand and races to it, eats, wanders a little and digs back in; some roam the sand at night
  snail_sand: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.2, hz: 0.36 },
    crawlMask: SURF_FLOOR,
    canSwim: false,
    hover: 0,
    maxPitch: 0,
    tailFreq: 0.5,
    acts: { burrow: 6, crawl_explore: 0.8 },
    rest: 'burrow',
    startle: 'burrow',
    startleSens: 0.45,
    crawlGait: 'crawl',
    ignoreFish: true,
    bury: { depth: 2, dig: 0.55, rise: 2.4 },
    smellsFood: true,
  }),
  // ── chunk 16, wave B ──
  // tuxedo urchin: a spiny ball sitting on its mouth, gliding on its tube feet over rock, glass and sand, rasping
  // coralline and film algae; by day more often parked, or wedged into a crevice; a scare only stops it (spines stiff)
  urchin: base({
    loco: 'crawl',
    body: { hx: 0.42, hy: 0.22, hz: 0.42 },
    crawlMask: SURF_ALL,
    canSwim: false,
    hover: 0,
    maxPitch: 0,
    tailFreq: 0.2,
    acts: { graze: 6, crawl_explore: 0.9, rest: 1.1, hide: 0.5 },
    rest: 'cave',
    startle: 'freeze',
    startleSens: 0.3,
    crawlGait: 'crawl',
    ignoreFish: true,
    flatBody: true,
    creviceRest: true,
    meshCling: true,
  }),
  // sand-sifting star: under the sand all day; at night it roams the sand bed, digging in here and there to feed, and
  // goes back under at dawn (and when frightened). Only on the floor; on a bed it cannot dig into it just lies flat
  starfish_sand: base({
    loco: 'crawl',
    // (a floor walker's footprint is its centre disc (hz) plus a nose and a tail sample along the heading (hx): a round
    // star is no longer than it is wide — short hx; its flat disc is max(hx, hz) across all the same)
    body: { hx: 0.2, hy: 0.06, hz: 0.5 },
    crawlMask: SURF_FLOOR,
    canSwim: false,
    hover: 0,
    maxPitch: 0,
    tailFreq: 0.3,
    acts: { crawl_explore: 3, forage: 4, rest: 0.5 },
    rest: 'cling',
    startle: 'burrow',
    startleSens: 0.4,
    crawlGait: 'crawl',
    ignoreFish: true,
    flatBody: true,
    nightOnly: true,
    bury: { depth: 2.4, dig: 0.3, rise: 0.9 },
  }),
  // emerald crab: wedged into a rock crevice all day; out at night picking bubble and hair algae off the rock with its
  // spoon-tipped claws; scuttles sideways when it hurries; startled, it dashes back into the rock
  crab: base({
    loco: 'crawl',
    body: { hx: 0.4, hy: 0.2, hz: 0.5 },
    crawlMask: SURF_FLOOR | SURF_DECOR | SURF_GLASS,
    canSwim: false,
    hover: 0,
    tailFreq: 1.6,
    acts: { graze: 5, crawl_explore: 1.8, forage: 1.4, rest: 0.5 },
    rest: 'cave',
    startle: 'shelter',
    startleSens: 0.75,
    crawlGait: 'walk',
    ignoreFish: true,
    nightOnly: true,
    creviceRest: true,
    meshCling: true,
  }),
  // lawnmower blenny: perches on rock and glass propped on its pelvic fins, head up, eyes swivelling; hops from perch to
  // perch in short swims, grazes the film algae off rock and glass in bouts; chases other blennies off; sleeps in a
  // crevice; startled, it darts into a hole
  blenny: base({
    body: { hx: 0.5, hy: 0.12, hz: 0.09 },
    hover: 0.55,
    maxPitch: 0.9,
    tailFreq: 1.15,
    acts: { perch: 6, graze: 3, cruise: 0.3 },
    rest: 'cave',
    startle: 'shelter',
    startleSens: 0.9,
    territoryBL: 7,
    surfaceGrazer: true,
    chases: 'kin',
  }),
  // flame hawkfish: sits on the tops and edges of the rock on its thick pectoral rays, watching; pounces on food in a
  // short quick dart and goes back to a perch (often the same one); hardly ever cruises; sleeps in a crevice
  hawkfish: base({
    body: { hx: 0.5, hy: 0.2, hz: 0.1 },
    hover: 0.5,
    maxPitch: 0.7,
    tailFreq: 1,
    acts: { perch: 7, cruise: 0.25, hover: 0.25 },
    rest: 'cave',
    startleSens: 0.6,
  }),
  // yellowtail damsel: hovers over its own patch of rock, ducking in and out of it, chases intruders a short way and comes
  // back; a loose group in a big tank (each with its own patch); sleeps in the rock; startled, it dives into its patch
  damsel: base({
    body: { hx: 0.5, hy: 0.25, hz: 0.08 },
    hover: 0.7,
    maxPitch: 0.6,
    tailFreq: 1.2,
    acts: { host: 5.5, forage: 0.9, cruise: 0.5 },
    rest: 'cave',
    startle: 'shelter',
    startleSens: 1,
    territoryBL: 3,
    chases: 'fish',
  }),
  // German blue ram: hovers low over the bed in short stop-and-go glides, takes mouthfuls of sand and spits them out,
  // keeps to a home (a flat stone or a cave) and drives off fish that come close; a pair keeps together; sleeps low by
  // its home
  cichlid_dwarf: base({
    body: { hx: 0.5, hy: 0.3, hz: 0.08 },
    hover: 0.75,
    maxPitch: 0.65,
    tailFreq: 0.9,
    acts: { forage: 4.5, host: 2.4, hover: 0.8, cruise: 0.5 },
    rest: 'bottom',
    startleSens: 0.9,
    territoryBL: 5,
    bottomHugger: true,
    chases: 'fish',
  }),
  // bubble-tip anemone (living): its foot holds rock, glass or sand; until it finds a spot it likes (foot on rock or in a
  // crevice, crown up in the light) it creeps on, slowly, then stays put for good; closes up at night and when
  // disturbed, now and then deflates and fills again; clownfish host in it (anemone.ts)
  anemone: base({
    loco: 'crawl',
    body: { hx: 0.5, hy: 0.2, hz: 0.5 },
    crawlMask: SURF_ALL,
    canSwim: false,
    hover: 0,
    maxPitch: 0,
    tailFreq: 0.15,
    acts: { still: 1 },
    rest: 'cling',
    startle: 'retract',
    startleSens: 0.35,
    crawlGait: 'crawl',
    ignoreFish: true,
    flatBody: true,
    anemone: true,
    meshCling: true,
  }),
  sessile: base({
    loco: 'sessile',
    body: { hx: 0.4, hy: 0.4, hz: 0.4 },
    canSwim: false,
    hover: 0,
    tailFreq: 0.2,
    acts: { still: 1 },
    rest: 'cling',
    startle: 'retract',
    startleSens: 0.3,
    ignoreFish: true,
  }),
};

export function setProfile(id: string): SetProfile {
  return (SET_PROFILES as Record<string, SetProfile>)[id] ?? SET_PROFILES.livebearer;
}

/** Median durations (seconds) per idle activity; actual durations are randomised log-normally. */
export const ACT_DURATION: Partial<Record<ActId, number>> = {
  cruise: 13,
  school: 22,
  patrol: 30,
  hover: 8,
  rest: 18,
  sleep: 40,
  hide: 16,
  inspect_glass: 9,
  inspect_decor: 7,
  forage: 12,
  graze: 22,
  display: 5,
  host: 22,
  hitch: 40,
  pair_follow: 20,
  perch: 25,
  burrow: 30,
  float: 14,
  beg: 9,
  crawl_explore: 14,
  reposition: 12,
  clean_station: 40,
  nest_build: 18,
  spit: 20, // lane:brackish (the act sets its own duration)
  sand_dive: 30, // chunk 16 (the act sets its own buried time)
  chase: 6, // chunk 16 (the act ends when it is back home)
  wander: 1e9, // chunk 16 (until the anemone settles)
  still: 1e9,
};
