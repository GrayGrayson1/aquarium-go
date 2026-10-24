/**
 * The scenario recipe (chunk 15, ADR-0051): a versioned JSON description of a setup, which `buildScenario` turns into
 * a game. Every field is optional except where noted; names (a tank's, an animal's) are how the rest of the recipe
 * refers to things. docs/SCENARIOS.md documents the format for the owner and for agents.
 */
import type {
  BackdropKind,
  CreatureStats,
  FacilityLevelId,
  GameSpeed,
  LightPreset,
  MasteryTrack,
  Potentials,
  StaffRole,
  StaffTrait,
  SubstrateKind,
  TankPurpose,
  WaterClass,
  WaterState,
} from '@/types';
import type { SexPlan } from '../fixtures/core-helpers';

export const RECIPE_FORMAT = 'aquarium-go-scenario';
export const RECIPE_VERSION = 1;

/** A range a check expects a number to be in (both ends included). */
export interface Range {
  min?: number;
  max?: number;
}

/**
 * Where the scenario starts:
 * - `blank`: an empty shop, everything unlocked and its guide finished (the default; ADR-0051 decision 2);
 * - `starter:<id>`: a new game with that starter, its guide on (axolotl, betta, pea_puffer, ocellaris_clownfish,
 *   lined_seahorse);
 * - `fixture:<name>`: one of the dev fixtures (`__AQ.fixtures()` lists them);
 * - `current`: a copy of the game on screen (the lab only; a link or the headless script can't use it).
 */
export type RecipeBase = 'blank' | 'current' | `starter:${string}` | `fixture:${string}`;

/** The water's numbers (any of them); the rest come from the tank's class and its animals. */
export type WaterValues = Partial<
  Pick<WaterState, 'tempC' | 'pH' | 'ammonia' | 'nitrite' | 'nitrate' | 'oxygen' | 'salinitySG' | 'gh' | 'kh' | 'detritus' | 'algae' | 'clarity' | 'bioMaturity' | 'foodInWater' | 'level'>
>;

/** A piece of equipment: a catalogue id or a kind (`heater`, `filter` …), and how it is. */
export interface EquipmentRecipe {
  /** A catalogue id (`heater_100w`) or a kind (`heater`): a kind changes the tank's own unit of that kind. */
  id: string;
  /** Broken: `off` (stopped) or `stuck_on` (a heater whose thermostat stuck). */
  failed?: 'off' | 'stuck_on';
  /** Wear, 0 (worn out) to 1 (new). */
  condition?: number;
  on?: boolean;
  /** Its setting: a heater's or chiller's °C, a light's or pump's 0 to 1. */
  setting?: number;
  /** Take it out of the tank instead. */
  remove?: boolean;
}

/** A decor piece placed by hand (tank-local metres; the centre of the floor is 0, 0). */
export interface DecorRecipe {
  id: string;
  x?: number;
  /** Height above the substrate (only with `exact`). */
  y?: number;
  z?: number;
  rotY?: number;
  scale?: number;
  /** Place it exactly as given, without the game's layout check (a captured tank uses this). */
  exact?: boolean;
}

/** A group of animals of one species. */
export interface AnimalRecipe {
  species: string;
  /** How many (default 1, at most 200). */
  count?: number;
  /** male, female, unknown, or a plan: pair (male, female, male …), mixed, females, auto (the default). */
  sex?: SexPlan;
  /** Age in game days (default: a young adult). */
  ageDays?: number;
  /** Or a life stage: juvenile, adult (mature, ready to breed) or elder. */
  stage?: 'juvenile' | 'adult' | 'elder';
  /** Names in order (`name` for one); the rest are named by the game. Animals are referred to by name. */
  name?: string;
  names?: string[];
  /** Pinned genes: locus id → its two alleles (`{ "color": ["blue", "blue"] }`); the rest are the species' commonest. */
  genes?: Record<string, [string, string]>;
  /** A morph by its name (`Halfmoon Blue`); the genes that make it are found in the species' morph table. */
  morph?: string;
  /** Heritable potentials, 0 to 100 (size, color, pattern, structure, fertility, hardiness, temperament, curiosity). */
  potentials?: Partial<Potentials>;
  /** Prismatic: true for all of them, or how many. */
  prismatic?: boolean | number;
  /** Condition, 0 to 100: health, hunger (100 = starving), stress, energy, social, comfort, breedingReadiness, enrichment. */
  stats?: Partial<CreatureStats>;
  /** An illness: ich, fin_rot, fungus, swim_bladder, stress_coloration or impaction, and how bad (0 to 100). */
  illness?: { kind: string; severity?: number };
  /** Injury from fights, 0 to 100. */
  injury?: number;
  /**
   * Breeding: `ready` puts the first two (a male and a female) straight into courtship, so they spawn within hours of
   * play; `spawned` also runs the world forward until they have eggs or young (at most three game days).
   */
  breed?: 'ready' | 'spawned';
  wild?: boolean;
  favorite?: boolean;
  /** Anything else on each animal (a deep merge into the game's own record). */
  patch?: Record<string, unknown>;
}

/** Eggs, larvae or fry in a tank, without playing up to them. */
export interface YoungRecipe {
  species: string;
  stage: 'eggs' | 'larvae' | 'fry';
  count: number;
  /** The parents, by name (animals of this tank or another); otherwise the tank's adults of the species, if any. */
  mother?: string;
  father?: string;
  /** Game hours until the next stage (default: the species' own timing). */
  nextStageInHours?: number;
}

export interface TankRecipe {
  /** Required: how the rest of the recipe refers to the tank (and its name in the game). */
  name: string;
  /** A tier id (`g40B`) or gallons (the smallest tier with at least that many; default: what its animals need). */
  size?: string | number;
  /** freshwater_cool, freshwater_tropical, freshwater_planted, marine_fowlr, marine_live_rock, reef or brackish. */
  water?: WaterClass;
  purpose?: TankPurpose;
  /** A cycled tank (default true): its filter bacteria are established. */
  cycled?: boolean;
  /** How long it has been set up, in game days (default 30 for a cycled tank, 0 for an uncycled one). */
  ageDays?: number;
  /** Set the water to suit its animals first (default true), then apply `values`. */
  matchWater?: boolean;
  values?: WaterValues;
  /** Equipment to add or change; `bareEquipment` starts from none instead of the tier's own kit. */
  equipment?: (string | EquipmentRecipe)[];
  bareEquipment?: boolean;
  substrate?: SubstrateKind | { kind: SubstrateKind; depthCm?: number; color?: string };
  /**
   * `auto` (the default: a layout for its water), `none`, or pieces by id (or placed by hand); a list that includes
   * "auto" adds its pieces to the automatic layout.
   */
  decor?: 'auto' | 'none' | (string | DecorRecipe)[];
  lights?: { preset?: LightPreset; intensity?: number; on?: number; off?: number; moonlight?: boolean };
  backdrop?: BackdropKind;
  animals?: AnimalRecipe[];
  young?: YoungRecipe[];
  /** Anything else on the tank (a deep merge into the game's own record). */
  patch?: Record<string, unknown>;
}

export interface ShopRecipe {
  name?: string;
  /** The balance (negative for a shop in debt). */
  money?: number;
  /** Game day (1 = the first) and hour of the day (0 to 23.99) when it opens. */
  day?: number;
  hour?: number;
  facility?: FacilityLevelId;
  openToPublic?: boolean;
  admission?: number;
  /** `all` (a blank shop's default), `none`, or unlock keys. */
  unlocks?: 'all' | 'none' | string[];
  /** Research finished: `all`, or project ids; `researching` is the one under way. */
  research?: 'all' | string[];
  researching?: { id: string; hoursDone?: number };
  reputation?: number;
  mastery?: Partial<Record<MasteryTrack, number>>;
  /** The guide: `done` (a blank shop's default) or `on`. */
  guide?: 'done' | 'on';
  inventory?: {
    /** Food servings by id, or `plenty` (enough of every food). */
    foods?: Record<string, number> | 'plenty';
    salt?: number;
    brineShrimpEggs?: number;
    /** Spare equipment and decor in storage, by catalogue id. */
    equipment?: string[];
    decor?: string[];
  };
  /** The Water room and the Live food room (their research is finished with them). */
  waterRoom?: boolean;
  foodRoom?: boolean;
  /** Manual mode: the shop's automation holds. */
  manualMode?: boolean;
}

export interface StaffRecipe {
  role: StaffRole;
  name?: string;
  /** Skill, 1 to the role's highest. */
  skill?: number;
  trait?: StaffTrait;
}

export interface OfferRecipe {
  species: string;
  count?: number;
  sex?: 'male' | 'female';
  ageDays?: number;
  price?: number;
  prismatic?: boolean;
  genes?: Record<string, [string, string]>;
}

export interface ListingRecipe {
  /** The animals for sale, by name. */
  animals: string[];
  /** The lowest price taken (default: the game's suggested price). */
  reserve?: number;
  buyNow?: number;
  /** Bids waiting on it: how many (the game's own buyers), or amounts. */
  bids?: number | number[];
  hours?: number;
}

export interface MarketRecipe {
  /** Livestock offers at the front of the shop. */
  offers?: OfferRecipe[];
  /** Clear the shop's own stock first. */
  clearStock?: boolean;
  listings?: ListingRecipe[];
  /** Demand by species, 0.6 to 1.6 (1 = normal). */
  demand?: Record<string, number>;
}

export interface ShowsRecipe {
  /** Enter animals (by name) in the next show of the tier they can enter (`club` by default). */
  entries?: { animal: string; tier?: 'club' | 'regional' | 'national' | 'international' }[];
  /** Move the clock to that show's day, an hour before judging. */
  showDay?: boolean;
}

/** What should be true after some hours (the headless script and tests report pass or fail). */
export interface CheckRecipe {
  /** A label for the report. */
  name?: string;
  /** Game hours after the scenario opens (after any warm-up). */
  afterHours: number;
  /** Only this tank (water and animals) and only this species (animals). */
  tank?: string;
  species?: string;
  alive?: Range;
  births?: Range;
  deaths?: Range;
  clutches?: Range;
  money?: Range;
  sales?: Range;
  ammonia?: Range;
  nitrite?: Range;
  nitrate?: Range;
  tempC?: Range;
  pH?: Range;
  oxygen?: Range;
  /** The average health, hunger and stress of the animals counted. */
  health?: Range;
  hunger?: Range;
  stress?: Range;
}

/** A production line: a pair (by name) and its four tanks (by name), as the Production panel makes one. */
export interface LineRecipe {
  mother: string;
  father: string;
  breed: string;
  raise: string;
  quarantine: string;
  keep: string;
  name?: string;
}

export interface ScenarioRecipe {
  format?: typeof RECIPE_FORMAT;
  /** Required: the recipe format's version (1). */
  version: number;
  /** Required: the scenario's name (shown in the game while it plays). */
  name: string;
  notes?: string;
  /** Same recipe and seed, same world (default 1). */
  seed?: number;
  base?: RecipeBase;
  shop?: ShopRecipe;
  tanks?: TankRecipe[];
  staff?: StaffRecipe[];
  /** The stock manager's daily budget. */
  stockBudget?: number;
  market?: MarketRecipe;
  shows?: ShowsRecipe;
  lines?: LineRecipe[];
  /** Run the world forward this many game hours before it opens (at most 30 days). */
  warmupHours?: number;
  /** How it opens: the tank in view (by name), the tank or the room, and the speed (default 0: paused). */
  open?: { tank?: string; view?: 'tank' | 'facility'; speed?: GameSpeed };
  checks?: CheckRecipe[];
  /** Anything else in the game (a deep merge into the built game, checked by the save path). */
  patch?: Record<string, unknown>;
}
