/**
 * Species data contract. OWNER: core (orchestrator). Lanes may ADD optional fields; never rename/remove.
 *
 * All species content lives in src/data/species/*.ts — never inside UI or render components.
 * Every numeric husbandry value must be traceable to `sourceReferences`.
 */

export type Environment = 'freshwater' | 'marine' | 'brackish';

/**
 * Aquarium class a tank is configured as. Brackish is architected but not fully represented in the first build.
 */
export type WaterClass =
  | 'freshwater_cool'
  | 'freshwater_tropical'
  | 'freshwater_planted'
  | 'marine_fowlr' // fish-only
  | 'marine_live_rock' // fish-only with live rock
  | 'reef'
  | 'brackish';

export interface Range {
  min: number;
  max: number;
}

/** Tolerated range (min/max) plus the ideal band inside it. */
export interface ParamRange extends Range {
  idealMin: number;
  idealMax: number;
}

export type SafetyLevel = 'safe' | 'mostly_safe' | 'caution' | 'unsafe';
export type FlowLevel = 'very_low' | 'low' | 'moderate' | 'high';
export type LightLevel = 'dim' | 'moderate' | 'bright';
export type ActivityZone = 'surface' | 'upper' | 'middle' | 'lower' | 'bottom' | 'substrate' | 'glass' | 'decor' | 'all';
export type Temperament = 'peaceful' | 'semi_aggressive' | 'aggressive' | 'predatory';
export type Diet = 'carnivore' | 'omnivore' | 'herbivore' | 'planktivore' | 'detritivore' | 'photosynthetic';
export type FeedingStyle =
  | 'surface'
  | 'midwater'
  | 'bottom'
  | 'grazer'
  | 'hunter'
  | 'ambush'
  | 'target_fed'
  | 'picker'
  | 'scavenger';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
export type CreatureCategory = 'fish' | 'amphibian' | 'invertebrate' | 'coral' | 'anemone';
export type SubstrateKind = 'bare' | 'fine_sand' | 'sand' | 'fine_gravel' | 'gravel' | 'aragonite' | 'planted_soil' | 'large_pebbles';

/** Keys the food catalog uses. A species accepts foods whose tags intersect `foods`. */
export type FoodTag =
  | 'flake'
  | 'pellet_small'
  | 'pellet_sinking'
  | 'pellet_large'
  | 'bloodworm'
  | 'brine_shrimp'
  | 'mysis'
  | 'daphnia'
  | 'earthworm'
  | 'snail_live'
  | 'algae_wafer'
  | 'vegetable'
  | 'nori'
  | 'copepod_live'
  | 'coral_food'
  | 'biofilm'
  | 'detritus'
  | 'infusoria'
  | 'baby_brine';

export type SocialKind =
  | 'solitary' // keep alone (conspecifics likely fight)
  | 'solitary_or_pair'
  | 'pair' // prefers bonded pair
  | 'pair_hierarchy' // clownfish-style: pair with dominance hierarchy
  | 'harem'
  | 'group' // loose group
  | 'shoal' // loose shoal, needs numbers
  | 'school' // tight school, needs numbers
  | 'colony'; // invert colonies (shrimp, snails)

export interface SocialRule {
  kind: SocialKind;
  /** Minimum group size before the animal is stressed by isolation. 1 = fine alone. */
  minGroup: number;
  /** Group size at which social comfort is maximal. */
  idealGroup: number;
  /** Optional hard ceiling per 10 gallons (territorial species). */
  maxPer10Gallons?: number;
  note?: string;
}

export type ConspecificOutcome = 'ok' | 'tension' | 'fight' | 'lethal';

export interface SameSpeciesRule {
  maleMale: ConspecificOutcome;
  femaleFemale: ConspecificOutcome;
  /** Mixed-sex behaviour outside controlled breeding. */
  mixed: 'ok' | 'courtship_ok' | 'breeding_only_temporary' | 'harassment';
  /** For species where sex is not yet visible / not applicable. */
  juvenile: ConspecificOutcome;
  note?: string;
}

export type BreedingSystemId =
  | 'axolotl_spermatophore'
  | 'bubble_nest'
  | 'egg_scatter_cover' // pea puffer, tetras, danios, white clouds
  | 'clownfish_substrate' // protandrous pair, adhesive eggs, male tends
  | 'seahorse_pouch' // male pregnancy
  | 'livebearer' // guppy, endler
  | 'shrimp_berried' // neocaridina: female carries eggs
  | 'shrimp_larval_marine' // amano / cleaner: larvae need brackish/marine rearing — hard
  | 'snail_egg_clutch' // mystery snail above waterline, nerite needs brackish
  | 'substrate_spawner' // corydoras T-position, eggs on glass
  | 'cave_spawner' // bristlenose, kuhli
  | 'mouthbrooder' // banggai cardinal (male mouthbrooding)
  | 'egg_layer_generic'
  | 'fragmentation' // corals
  | 'not_in_game'; // documented but not breedable in first build

export interface BreedingProfile {
  system: BreedingSystemId;
  /** 0..1, how hard to achieve in the game. */
  difficulty: number;
  /** Game-days from birth until sexual maturity (compressed time — see docs/GAME_DESIGN.md). */
  maturityDays: number;
  clutchSize: Range;
  /** Game-hours from spawn to hatch / birth. */
  incubationHours: number;
  /** Game-hours for larvae/fry until juveniles can be individually tracked. */
  fryRearingHours: number;
  cooldownDays: number;
  /** Conditions that must be met; the breeding engine interprets these keys. */
  conditions: {
    minTempC?: number;
    maxTempC?: number;
    needsPartner: boolean;
    needsCover?: boolean;
    needsSurfaceCalm?: boolean; // bubble nests
    needsNestSite?: boolean; // clownfish/cave spawners
    needsConditioningFood?: FoodTag[];
    coolingTrigger?: boolean; // axolotl temperature drop cue
    minTankGallons?: number;
  };
  /** Fraction of eggs/fry lost per rearing stage without a nursery/separation. */
  predationWithoutNursery: number;
  nurseryRequired: boolean;
  /** Max individual juveniles that can be raised per clutch before capacity limits (game abstraction). */
  maxRaisedPerClutch: number;
  notes: string;
}

export type SexSystem = 'gonochoristic' | 'protandrous' | 'protogynous' | 'simultaneous_hermaphrodite' | 'not_applicable';
export type ParentalCare = 'none' | 'male' | 'female' | 'both' | 'male_pouch' | 'male_mouth';

export interface Lifecycle {
  /** Compressed game-days. */
  juvenileDays: number;
  adultDays: number;
  lifespanDays: number;
  /** Day at which sex can be visually determined (axolotl ~ late; clownfish: never fixed). */
  sexVisibleAtDays: number;
  /** Size at hatch/birth in cm. */
  hatchSizeCm: number;
}

export interface UnlockRequirement {
  /** Unlock ids (progress.unlocked must include all). Empty = available from start. */
  requires: string[];
  /** Human-readable hint shown on locked cards. */
  hint: string;
}

/** Visual parameters consumed by creature renderers & portraits. Colors are CSS hex strings. */
export type PatternKind =
  | 'solid'
  | 'bands' // clownfish-style vertical bars
  | 'bars' // thin vertical bars
  | 'spots'
  | 'speckled'
  | 'marble'
  | 'butterfly' // betta: body color with band at fin edges
  | 'bicolor'
  | 'dalmatian'
  | 'grizzle'
  | 'lateral_stripe' // neon/cardinal
  | 'mottled'
  | 'reticulated'
  | 'koi'
  | 'dragon_scale'
  | 'lined' // seahorse fine white lines
  | 'saddle'
  | 'none';

export interface CreatureVisualParams {
  bodyColor: string;
  bodyColor2: string; // secondary / gradient
  bellyColor: string;
  finColor: string;
  finColor2: string; // fin edge / band
  accentColor: string; // stripes, spots, bands
  eyeColor: string;
  pattern: PatternKind;
  patternScale: number; // 0.5..2
  patternContrast: number; // 0..1
  /** Per-individual seed so pattern placement is unique and stable. */
  patternSeed: number;
  /** lane:lifecycle — 0..1 how even/symmetrical markings are (from the pattern potential). Renderers may use it to jitter spacing/edges. */
  patternRegularity?: number;
  iridescence: number; // 0..1
  metallic: number; // 0..1
  translucency: number; // 0..1 (shrimp, glassy fins)
  /** Species-specific fin form id, e.g. betta 'halfmoon'|'veiltail'|'crowntail'|'plakat'|'double_tail'. */
  finType: string;
  finLength: number; // multiplier ~0.6..1.6
  bodyDepth: number; // multiplier ~0.85..1.15
  gillFullness: number; // axolotl frond fullness 0..1.5
  /** Axolotl gill fronds / other soft appendages. */
  gillColor?: string;
  /** Only for clearly-labelled fictional cosmetic variants. */
  glow?: number;
}

export interface LocusDefinition {
  id: string;
  name: string;
  alleles: {
    id: string;
    name: string;
    /** Higher value dominates in 'mendelian' mode. */
    dominance: number;
    /** Relative frequency in captive-bred market stock. */
    frequency: number;
    fictional?: boolean;
  }[];
  mode: 'mendelian' | 'codominant' | 'additive';
  note?: string;
}

export interface PhenotypeRule {
  id: string;
  name: string; // morph name shown to players, e.g. "Leucistic", "Halfmoon", "Snowflake"
  /** All conditions must match. hom=two copies, het=exactly one, any=at least one, none=zero. */
  when: { locus: string; allele: string; count: 'hom' | 'het' | 'any' | 'none' }[];
  visual: Partial<CreatureVisualParams>;
  /** base: first matching base rule wins. overlay: every matching overlay is applied in order after the base. */
  layer: 'base' | 'overlay';
  /** 0..1 market rarity contribution. */
  rarity: number;
  fictional?: boolean;
  note?: string;
}

export interface GeneticsDefinition {
  loci: LocusDefinition[];
  phenotypes: PhenotypeRule[];
  /** Defaults merged under every phenotype. */
  baseVisual: CreatureVisualParams;
  /** Individual colour jitter strength (0..1). */
  variation: number;
  notes: string;
}

/** AI lane keys behaviour implementations off this id. */
export type BehaviorSetId =
  | 'axolotl'
  | 'betta'
  | 'pea_puffer'
  | 'clownfish'
  | 'seahorse'
  | 'schooling_small'
  | 'livebearer'
  | 'surface_dweller'
  | 'bottom_forager' // corydoras
  | 'algae_grazer' // otocinclus, pleco
  | 'loach_eel' // kuhli
  | 'hillstream'
  | 'gourami'
  | 'shrimp_dwarf'
  | 'shrimp_cleaner'
  | 'snail'
  | 'frog_aquatic'
  | 'goldfish'
  | 'crayfish'
  | 'cichlid_discus'
  | 'reef_basslet' // royal gramma
  | 'dartfish' // firefish
  | 'goby_burrow' // watchman goby
  | 'goby_perch' // clown goby
  | 'cardinal_hover' // banggai
  | 'chromis'
  | 'tang'
  | 'angelfish_dwarf'
  | 'rabbitfish'
  | 'dragonet'
  | 'hermit_crab'
  | 'mantis_shrimp'
  | 'lionfish'
  | 'grouper'
  | 'archerfish' // lane:brackish — surface-cruising shoal that spits water jets at insects above the surface
  | 'sessile'; // corals/anemones

export interface BehaviorTraits {
  /** Cruising speed in body lengths per second. */
  cruiseSpeed: number;
  /** Burst speed in body lengths per second. */
  burstSpeed: number;
  /** Radians per second. */
  turnRate: number;
  hoverTendency: number; // 0..1
  schoolingTightness: number; // 0..1
  restOnBottom: number; // 0..1
  hitching: number; // 0..1 (seahorse)
  burrowing: number; // 0..1
  glassSurfing: number; // 0..1 (stress indicator, not a reward)
  /** Baseline curiosity toward the player/glass (personality modifies). */
  curiosity: number; // 0..1
  /** Nocturnality 0=diurnal 1=nocturnal. */
  nocturnal: number;
  /** Visual scale multiplier for LOD/pick radius; defaults to 1. */
  pickRadiusMul?: number;
}

export interface SourceRef {
  id: string; // key into docs/RESEARCH_SOURCES.md
  title: string;
  url?: string;
  tier: 1 | 2 | 3;
  facts: string[]; // which facts this source supports
}

export interface Encyclopedia {
  summary: string;
  nativeHabitat: string;
  socialStructure: string;
  tankNeeds: string;
  compatibilityNotes: string;
  breedingOverview: string;
  conservationNote: string;
  funFact: string;
  inGameBehavior: string;
}

/** Explicit pairwise rule layered on top of the data-driven evaluator. */
export interface CompatExceptionRule {
  /** Other species id, or a tag prefixed with 'tag:' (matches otherSpecies.preyTags/predatorTags/group). */
  other: string;
  verdictFloor?: CompatVerdict; // cannot be better than this
  reason: string;
  /** Probability-ish per game-day of an incident if kept together (predation, fights). */
  incidentRisk?: number;
  mitigatedBy?: ('cover' | 'hides' | 'tank_size' | 'target_feeding' | 'nursery' | 'sight_breaks')[];
}

export type CompatVerdict = 'excellent' | 'usually_compatible' | 'conditional' | 'high_risk' | 'incompatible';

export interface SpeciesDefinition {
  id: string;
  commonName: string;
  scientificName: string;
  category: CreatureCategory;
  /** Family-ish grouping used for visitor fatigue, encyclopedia sections, and same-genus conflict. */
  group: string;
  genus: string;
  environment: Environment;
  /** Tank classes this species is appropriate for. */
  waterClasses: WaterClass[];
  nativeRegion: string;
  isStarter: boolean;
  starterIdentity?: string; // e.g. "The Regenerator"
  starterBlurb?: string;

  adultSizeCm: number;
  recommendedMinTankGallons: number;
  recommendedFootprint: { minLengthIn: number; minWidthIn: number };
  activeSwimmer: boolean;
  bioload: number; // relative waste output at adult size (1 = ~a 5cm community fish)

  tempC: ParamRange;
  pH: ParamRange;
  salinitySG: ParamRange | null;
  gh: Range | null; // dGH
  kh: Range | null; // dKH

  flowPreference: FlowLevel;
  lightPreference: LightLevel;
  diet: Diet;
  foods: FoodTag[];
  feedingStyle: FeedingStyle;
  /** 0..1 how fast it gets to food. */
  feedingSpeed: number;
  /** 0..1 how hard it competes / bullies at feeding. */
  feedingAggression: number;
  /** Game-hours a well-fed adult takes to become hungry. */
  hungerHours: number;

  activityZone: ActivityZone[];
  temperament: Temperament;
  territoriality: number; // 0..1
  aggression: number; // 0..1 toward other species
  finNipper: number; // 0..1
  hasLongFins: boolean;
  social: SocialRule;
  sameSpeciesRule: SameSpeciesRule;

  /** Tags of animals this one may eat, e.g. ['shrimp','snail','small_fish','fry','eggs','crustacean']. */
  predatorTags: string[];
  /** Tags this animal is, e.g. ['shrimp','crustacean','invertebrate','small_fish']. */
  preyTags: string[];
  /** Heuristic: prey of up to this length (cm) can be swallowed/killed. */
  maxLikelyPreySizeCm: number;

  shrimpSafe: SafetyLevel;
  snailSafe: SafetyLevel;
  frySafe: SafetyLevel;
  plantSafe: SafetyLevel;
  reefSafe: SafetyLevel;
  coralRisk: number; // 0..1
  anemoneRelationship: 'host_seeker' | 'neutral' | 'avoids' | 'prey_risk' | 'harms_anemone' | 'not_applicable';

  hidesNeeded: number; // 0..3
  coverPreference: number; // 0..1 desired plant/decor density
  substrateRules: { preferred: SubstrateKind[]; avoid: SubstrateKind[]; note?: string };

  breeding: BreedingProfile;
  sexSystem: SexSystem;
  parentalCare: ParentalCare;
  lifecycle: Lifecycle;

  hardiness: number; // 0..1 baseline
  difficulty: Difficulty;
  baseValue: number; // $ for an ordinary healthy adult
  rarity: Rarity;
  visitorAppeal: number; // 0..1
  unlock: UnlockRequirement;
  captiveBredAvailable: boolean;
  wildCaughtNote?: string;
  conservation: { status: string; note: string };

  genetics: GeneticsDefinition;
  /** Short list of the named variants shown in the encyclopedia. Derived from phenotype rules. */
  visualMorphs: string[];

  behaviorSet: BehaviorSetId;
  behaviorTraits: BehaviorTraits;
  /** Names of special behaviours the AI lane implements (e.g. 'gill_flick', 'bubble_nest'). */
  specialBehaviors: string[];

  encyclopedia: Encyclopedia;
  sourceReferences: SourceRef[];
  confidenceNotes: string[];
  exceptionRules: CompatExceptionRule[];
  /** Special husbandry flags the compatibility/welfare engines understand. All optional. */
  special?: SpeciesSpecialNeeds;
  /** Which render lane draws this species (documentation aid). */
  visualLane?: 'fish' | 'special';
  /** Positive interspecies interactions (cleaning stations, aiptasia control, hosting). */
  positiveInteractions?: { other: string; text: string }[];
}

export interface SpeciesSpecialNeeds {
  /** Tank must have been running this many game-days (biofilm/copepods) — e.g. mandarin dragonet, otocinclus. */
  requiresMatureDays?: number;
  /** Needs a copepod population (refugium or live-rock maturity) — mandarin dragonet. */
  needsPods?: boolean;
  /** Jumps/escapes — needs a lid (bettas jump, kuhli loaches, crayfish, frogs, hillstream loaches). */
  escapeArtist?: boolean;
  /** Burrows / digs — needs sand bed depth (watchman goby, mantis shrimp). */
  burrower?: boolean;
  /** Venomous spines — keeper safety note (lionfish). */
  venomous?: boolean;
  /** Needs cool water — incompatible with tropical tanks (axolotl, white cloud prefer cooler). */
  coolWater?: boolean;
  /** Needs high flow/oxygen (hillstream loach). */
  highOxygen?: boolean;
  /** Grows too large for small tanks quickly — warn early (goldfish, tangs, groupers, plecos). */
  outgrowsSmallTanks?: boolean;
  /** Algae/biofilm grazer that starves in a spotless new tank (otocinclus, nerite). */
  needsAlgaeOrBiofilm?: boolean;
  /** Eats other fish's food off the bottom, needs sinking food (corydoras, loaches). */
  needsSinkingFood?: boolean;
  /** Breathes air at the surface — needs access to the surface (betta, gourami, axolotl gulps, frogs). */
  airBreather?: boolean;
  /** Needs a specific host or partner (clown goby with acropora, watchman goby with pistol shrimp optional). */
  hostNote?: string;
  /** Tank-wide: sensitive to copper/medications (invertebrates). */
  medicationSensitive?: boolean;
  /** Messy/high-waste feeder (goldfish, axolotl). */
  heavyWaste?: boolean;
  /** lane:species-marine — Harmed by stinging cnidarians (anemones, fire coral, strongly stinging LPS such as Euphyllia)
   *  and clamped by giant clams: seahorses. Compat/welfare should flag anemone and stinging-coral decor. */
  stingSensitive?: boolean;
  /** lane:species-marine — Should be kept as the only animal in its tank (peacock mantis shrimp). Any tank mate is at least high risk. */
  speciesOnly?: boolean;
  /** lane:species-marine — Powerful strikes can chip or crack thin glass (smashing mantis shrimp); acrylic or thick glass preferred. */
  glassStrikeRisk?: boolean;
}
