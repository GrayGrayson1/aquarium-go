/**
 * Persistent game-state contract. OWNER: core (orchestrator).
 * Lanes may ADD optional fields (document them in your final report). Never rename/remove existing fields —
 * they are persisted in saves (see src/persistence/migrations.ts).
 *
 * Time: all `*Hour` fields are GAME hours since the save started (float). See src/sim/time.ts.
 */
import type { CreatureVisualParams, WaterClass, Environment, CompatVerdict, FoodTag, SubstrateKind } from './species';

export type Id = string;

// ───────────────────────────────── Creatures ─────────────────────────────────

export type Sex = 'male' | 'female' | 'unknown';
export type LifeStage = 'egg' | 'larva' | 'fry' | 'juvenile' | 'adult' | 'elder';

/** Heritable potentials, 0..100. Never confuse with dynamic stats. */
export interface Potentials {
  size: number;
  color: number; // colour expression
  pattern: number; // pattern / marking quality
  structure: number; // species-specific form: fins, gills, body
  fertility: number;
  hardiness: number;
  temperament: number; // 0 = very shy/placid ... 100 = very bold/assertive
  curiosity: number;
}

export interface Genome {
  /** locusId -> two alleles */
  alleles: Record<string, [string, string]>;
  potentials: Potentials;
  /** lane:lifecycle — spontaneous allele switches that happened when THIS genome was inherited (rare; logged in history). */
  mutations?: { locusId: string; from: string; to: string }[];
}

/** Dynamic, non-heritable condition. 0..100 unless noted. */
export interface CreatureStats {
  health: number;
  hunger: number; // 0 = full, 100 = starving
  stress: number; // 0 = calm, 100 = panicking
  energy: number;
  social: number; // social comfort
  comfort: number; // environmental comfort (water/habitat)
  breedingReadiness: number;
  enrichment: number; // 0 = bored, 100 = stimulated
}

export type PersonalityTag =
  | 'bold'
  | 'shy'
  | 'explorer'
  | 'food_obsessed'
  | 'glass_curious'
  | 'nest_builder'
  | 'homebody'
  | 'social'
  | 'solitary'
  | 'night_owl'
  | 'showoff'
  | 'easily_startled'
  | 'patient_feeder'
  | 'competitive_feeder'
  | 'decor_inspector';

export type ReproRole = 'male' | 'female' | 'undifferentiated' | 'transitioning_female';

/** Per-creature reproduction state; species breeding modules interpret `stage`. */
export interface ReproState {
  stage: string; // e.g. 'idle' | 'conditioning' | 'courting' | 'nest_building' | 'gravid' | 'pregnant' | 'guarding' | 'resting'
  stageSinceHour: number;
  partnerId?: Id;
  lastSpawnHour?: number;
  clutchId?: Id; // clutch this animal is guarding/carrying
  /** Seahorse male pregnancy / shrimp berried etc. */
  carryingUntilHour?: number;
  /** Protandrous species: hierarchy rank in its tank (0 = dominant). */
  rank?: number;
  totalClutches: number;
  totalOffspringRaised: number;
  /** lane:breeding — 0..1 progress through the current stage (pregnancy → belly swell, laying, sex change, courtship). */
  progress?: number;
  /** lane:breeding — 0..1 bubble-nest size (betta) / nest-site cleaning (clownfish, cave spawners). */
  nestProgress?: number;
  /** lane:breeding — tank-local position of this animal's nest (bubble nest, cleaned rock, cave). */
  nestAnchor?: { x: number; y: number; z: number };
  /** lane:breeding — seahorse morning greetings / clownfish pair-bond days with partnerId. */
  bond?: number;
  lastGreetingDay?: number;
  /** lane:breeding — 0..1 harassment suffered from a breeding partner (betta female left in with the male). */
  harassment?: number;
  /** lane:breeding — highest escalation warning already emitted (throttles event spam). */
  warnLevel?: number;
  /** lane:breeding — livebearer broods remaining from stored sperm (bounded). */
  storedBroods?: number;
  /** lane:breeding — planned end of a timed stage (courtship, laying, sex change). */
  stageEndsHour?: number;
}

export interface CreatureEvent {
  hour: number;
  kind: 'born' | 'acquired' | 'moved' | 'named' | 'bred' | 'illness' | 'recovered' | 'milestone' | 'sold' | 'listed' | 'visitor_wow' | 'sex_change' | 'photo' | 'note';
  text: string;
}

export interface Creature {
  id: Id;
  speciesId: string;
  name: string;
  /** Observable sex (may be 'unknown' until sexVisibleAtDays). Clownfish start male. */
  sex: Sex;
  /** Hidden true reproductive role (revealed by breeding/maturity). */
  reproRole: ReproRole;
  bornHour: number; // may be negative for animals older than the save
  lifeStage: LifeStage;
  sizeCm: number;
  tankId: Id | null; // null = in transit / holding
  genome: Genome;
  /** Resolved appearance (from genome + individual variation). Cached; recompute via genetics.resolveAppearance. */
  appearance: CreatureVisualParams;
  morphName: string;
  personality: PersonalityTag[];
  stats: CreatureStats;
  repro: ReproState;
  lineage: {
    motherId: Id | null;
    fatherId: Id | null;
    generation: number; // 0 = market stock
    lineId: string; // breeding line key
    breederName: string; // 'Your shop' or NPC breeder
  };
  captiveBred: boolean;
  acquiredHour: number;
  purchasePrice: number;
  status: 'alive' | 'dead' | 'sold' | 'listed';
  deathCause?: string;
  history: CreatureEvent[]; // capped (keep last ~40)
  /** Favourite zone learned from behaviour (for creature card flavour). */
  favoriteSpot?: string;
  /** Highest single visitor-wow count. */
  visitorWows: number;
  illness?: { kind: string; severity: number; sinceHour: number };
  /** Revealed genetics precision (0 = bands only; 1 = allele-level via research). */
  geneticsRevealed?: number;
  isStarter?: boolean;
  favorite?: boolean;
  /** lane:lifecycle — metabolism/welfare bookkeeping owned by src/sim/life (diet, bond, injuries, warnings). */
  life?: CreatureLifeMeta;
  /** lane:shows — show ribbons, class wins and titles (Champion / Grand Champion). Absent until its first show. */
  awards?: CreatureAwards;
}

/** lane:lifecycle — per-creature bookkeeping for the life simulation. All optional; safe to omit in old saves. */
export interface CreatureLifeMeta {
  /** Recently eaten food by tag (decays over ~2 game-days). Breeding reads this for conditioning. */
  recentDiet?: Partial<Record<FoodTag, number>>;
  /** 0..100 conditioning from rich/live foods (decays). */
  conditioning?: number;
  lastAteHour?: number;
  /** Food units eaten in the most recent feeding sub-step (UI: "ate well" / "missed out"). */
  lastMealUnits?: number;
  /** 0..100 familiarity with the keeper (observing, photos, target feeding). Flavour only. */
  bond?: number;
  /** 0..10 sensitisation from recent glass taps (repeated taps escalate stress; decays). */
  tapSensitivity?: number;
  /** 0..100 physical injury from fights/nips (heals over time when conditions are good). */
  injury?: number;
  /** Recent health damage by cause (decays) — used to explain declines and deaths. */
  damage?: Record<string, number>;
  /** One-shot / throttled warnings: key -> game hour last emitted. */
  warned?: Record<string, number>;
  /** Priority at the next feeding (target feeding) until this game hour. */
  targetFedUntil?: number;
  /** Recent keeper interactions (decaying count, diminishing enrichment returns). */
  interactions?: number;
  /** Game hour the creature last arrived in its current tank (acclimation stress after moves). */
  settledSinceHour?: number;
}

/** Eggs/fry batches — individual animals are only minted when juveniles are raised. */
export interface Clutch {
  id: Id;
  speciesId: string;
  tankId: Id;
  motherId: Id | null;
  fatherId: Id | null;
  laidHour: number;
  stage: 'eggs' | 'in_pouch' | 'larvae' | 'fry';
  count: number;
  nextStageHour: number;
  /** 0..1 accumulated survival multiplier. */
  survival: number;
  guardedById?: Id;
  /** Tank-local position for visuals (eggs on a rock, bubble nest at surface...). */
  anchor?: { x: number; y: number; z: number };
  visual: 'eggs_adhesive' | 'eggs_scattered' | 'bubble_nest' | 'egg_strands' | 'pouch' | 'berried' | 'fry_cloud' | 'snail_clutch';
  notes?: string;
  /** lane:breeding — eggs laid/born in total (count = round(initialCount × survival)). */
  initialCount?: number;
  /** lane:breeding — game hour the current clutch stage began (progress bars). */
  stageSinceHour?: number;
  /** lane:breeding — 0..1 how well the larvae/fry are currently fed with suitable (live) foods. */
  fed?: number;
  /** lane:breeding — breeding line key the juveniles will carry. */
  lineId?: string;
  /** lane:breeding — estimated losses by cause (for the clutch card). */
  losses?: { predation: number; starvation: number; water: number; crowding: number; fungus: number };
  /** lane:breeding — one-shot warnings already emitted for this clutch. */
  flags?: string[];
  /** lane:breeding — additional visual anchors (axolotl eggs on several plants, puffer eggs through the moss). */
  extraAnchors?: { x: number; y: number; z: number }[];
  /** lane:breeding — eggs that can never hatch here (nerite eggs in freshwater, unfertilised). */
  infertile?: boolean;
  /** lane:breeding — eggs still to be laid (axolotl females lay singly over several hours). */
  pendingEggs?: number;
}

// ───────────────────────────────── Tanks ─────────────────────────────────

export interface WaterState {
  tempC: number;
  pH: number;
  ammonia: number; // ppm (total ammonia nitrogen, game abstraction)
  nitrite: number; // ppm
  nitrate: number; // ppm
  oxygen: number; // 0..1 abstraction (1 = saturated)
  salinitySG: number; // 1.000 for freshwater
  gh: number; // dGH
  kh: number; // dKH
  /** Detritus / organic load 0..100. */
  detritus: number;
  /** Algae coverage 0..100. */
  algae: number;
  /** Water clarity 0..1 (1 = crystal). */
  clarity: number;
  /** Biological filtration maturity 0..1 (bacterial colony established). */
  bioMaturity: number;
  /** Uneaten food mass in the water column (abstract units). */
  foodInWater: number;
  /** Food by tag currently available (for species-appropriate distribution). */
  foodByTag?: Partial<Record<FoodTag, number>>;
  /** Water level fraction 0..1 (evaporation). */
  level: number;
  /**
   * lane:waterlab — food reserved for one target-fed creature (tongs / pipette). Only that creature can eat it
   * (consumeFood(..., creatureId)) until it is released to everyone after ~1 game hour.
   */
  targetFeed?: { creatureId: Id; units: number; tags: FoodTag[]; hour: number };
  /**
   * lane:waterlab — a sudden change (e.g. a large temperature-mismatched water change). The life lane may add stress
   * while clock.hour < untilHour. severity 0..1.
   */
  shock?: { hour: number; untilHour: number; severity: number; reason: string };
  /** lane:waterlab — internal water-sim bookkeeping (optional; absent in old saves). */
  lab?: WaterLabState;
}

/** lane:waterlab — internal bookkeeping for src/sim/water. Other lanes may read but should not write these. */
export interface WaterLabState {
  /** Mass-weighted average age (game hours) of uneaten food. Food starts rotting after ~45 min. */
  foodAgeH?: number;
  /** mg ammonia-N released per unit of uneaten food when it rots (mass-weighted over what was fed). */
  foodWaste?: number;
  /** 0.25..1 fraction of the filter's potential bacterial colony that is populated (adapts to the waste load). */
  colony?: number;
  /** Smoothed waste input, mg ammonia-N per hour (animals + rotting food + detritus). */
  wasteRate?: number;
  /** Waste units queued by addWaste() since the last water step. */
  pendingWaste?: number;
  /** 0..1 recent instability (temperature / pH / salinity swings), exponential moving average. */
  swing?: number;
  /** Conditioner binds ammonia/nitrite (less toxic) until this game hour. */
  detoxUntilHour?: number;
  /** lane:fix-water — ammonia (ppm TAN) held bound by conditioner: not toxic, not on the test kit, released at expiry. */
  boundAmmonia?: number;
  /** lane:fix-water — nitrite (ppm) held bound by conditioner (see boundAmmonia). */
  boundNitrite?: number;
  /** 0..1 plant fertiliser level (decays over a few days). */
  fertilizer?: number;
  /** 0..1 reef elements (calcium / alkalinity / trace) — consumed by corals, restored by supplements & water changes. */
  reefElements?: number;
  /** 0..1 copepod / micro-fauna population (live rock, refugium, mature planted tanks). */
  pods?: number;
  /** Dissolved CO₂ mg/L (derived). */
  co2?: number;
  /** Heater and chiller are fighting each other right now. */
  conflict?: boolean;
  /** Game hour the filter was last cleaned. */
  lastFilterCleanHour?: number;
  /** Game hour the autofeeder last dispensed. */
  lastAutofeedHour?: number;
  /** Throttle for warning events: key -> game hour last emitted. */
  warned?: Record<string, number>;
  /** Previous step values for swing detection. */
  prevTemp?: number;
  prevPH?: number;
  prevSG?: number;
  /** lane:w2-sim — temperature (°C) the filter bacteria are acclimated to; follows the water over ~2 game days. */
  bioTempC?: number;
}

export type EquipmentKind =
  | 'filter'
  | 'heater'
  | 'chiller'
  | 'fan'
  | 'light'
  | 'airstone'
  | 'powerhead'
  | 'skimmer'
  | 'ato'
  | 'co2'
  | 'autofeeder'
  | 'uv'
  | 'refugium'
  | 'wavemaker'
  | 'lid';

export interface EquipmentInstance {
  id: Id;
  defId: string; // key into src/data/catalog/equipment.ts
  installedHour: number;
  condition: number; // 0..1 wear; failures more likely when low
  on: boolean;
  /** Target setting (heater/chiller °C, light intensity 0..1, flow 0..1...). */
  setting?: number;
  failed?: boolean;
  /** lane:waterlab — how it failed: 'off' (stopped) or 'stuck_on' (heater thermostat stuck — overheats until switched off). */
  failMode?: 'off' | 'stuck_on';
  /** lane:waterlab — bacteria carried by filter media when removed; seeds the next tank it is installed in. */
  bio?: { maturity: number; sinceHour: number };
}

export interface DecorInstance {
  id: Id;
  defId: string; // key into src/data/catalog/decor.ts
  /** Tank-local position (metres). y is usually substrate height (0) for floor items. */
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale: number;
  seed: number;
  /** Plants/corals grow; 0..1 */
  growth?: number;
  health?: number; // plants/corals 0..100
  /** lane:frags — set when this piece is a frag/cutting taken from a parent colony (see src/sim/aquascape/frags.ts). */
  frag?: DecorFragInfo;
  /** lane:frags — parent colony: no growth and no new cuts before this game hour (healing after a cut). */
  recoverUntilHour?: number;
  /** lane:frags — frags/cuttings taken from this piece so far. */
  fragsTaken?: number;
}

/** lane:frags — provenance and grow-out state of a frag or cutting. All optional except takenHour. */
export interface DecorFragInfo {
  /** Decor instance it was cut from (may no longer exist). */
  parentId?: Id;
  /** Game hour it was cut. */
  takenHour: number;
  /** Provenance line shown to buyers, e.g. "Blue Reef Studio line". */
  lineName?: string;
  /** 1 = cut from a bought colony, 2 = cut from a colony you grew from a frag, ... */
  generation?: number;
  /** Scale when planted and the colony size it grows toward (the colony physically enlarges as it grows). */
  startScale?: number;
  targetScale?: number;
  /** Game hour it was first planted in a tank (healing starts; a healed frag on its plug is worth more). */
  plantedHour?: number;
  /** Game hour it grew out into a full colony (it then behaves like any colony). */
  grownHour?: number;
}

export type LightPreset = 'daylight' | 'warm' | 'planted' | 'reef_actinic' | 'reef_full' | 'moonlight' | 'sunset' | 'cool';

export interface TankLighting {
  preset: LightPreset;
  intensity: number; // 0..1.5
  /** Game-hour-of-day lights turn on/off. */
  onHour: number;
  offHour: number;
  moonlight: boolean;
}

export type TankPurpose = 'display' | 'nursery' | 'quarantine' | 'breeding';
export type BackdropKind = 'black' | 'deep_blue' | 'frosted' | 'none' | 'rock_3d';

export interface Tank {
  id: Id;
  name: string;
  tierId: string; // key into src/data/catalog/tanks.ts
  waterClass: WaterClass;
  environment: Environment;
  purpose: TankPurpose;
  /** Facility floor placement (metres, facility space). */
  placement: { x: number; z: number; rotY: number };
  water: WaterState;
  equipment: EquipmentInstance[];
  decor: DecorInstance[];
  substrate: { kind: SubstrateKind; depthCm: number; color: string };
  backdrop: BackdropKind;
  lighting: TankLighting;
  /** Tank was set up with mature/pre-cycled media. */
  createdHour: number;
  /** Cached derived stats (recomputed by sim; never trust as source of truth). */
  cache: {
    stockingLoad: number; // 0..>1 (1 = fully stocked)
    beauty: number; // 0..100
    welfare: number; // 0..100
    exhibitScore: number; // 0..100
    stability: number; // 0..100
    /**
     * Overall tank status: the WORST of the water (waterStatus), the animals' welfare (animalStatus: starving, sick,
     * badly stressed, dying) and food in stock (out of food → at least 'watch'). `statusReason` explains it.
     */
    status: 'good' | 'watch' | 'danger';
    compatVerdict: CompatVerdict;
    /** core — water-only status (the water report's status). Absent in old saves until the next tank step. */
    waterStatus?: 'good' | 'watch' | 'danger';
    /** core — worst animal-welfare status in the tank (starving/sick/badly stressed/dying → danger). */
    animalStatus?: 'good' | 'watch' | 'danger';
    /** core — food in stock for this tank's fed animals ('low' ≈ fewer than 4 meals left, 'out' = none they eat). */
    foodLevel?: 'ok' | 'low' | 'out';
    /** core — one line explaining `status` when it isn't 'good' ("Ember is starving — feed right away."). */
    statusReason?: string;
    /** core — which part `statusReason` comes from. */
    statusSource?: 'water' | 'animals' | 'food';
    /** core — every current reason, most urgent first (UI may show the first two). */
    statusReasons?: string[];
  };
  listingId?: Id;
  /** Visitor info sign placed. */
  signage: boolean;
  /** Game hour when the tank last had a water change / maintenance. */
  lastMaintenanceHour: number;
  /** Glass tap pressure (decays). */
  tapPressure: number;
  notes?: string;
  /** Core LOD scheduler: game hours accumulated but not yet simulated for this tank. */
  simDebtHours?: number;
  /** lane:breeding — spawning cues: hourly temperature log (cooling trigger) and live/conditioning foods seen. */
  breedingEnv?: {
    tempLog: number[];
    lastLogHour: number;
    /** A ~2 °C cool-down was detected; the "rainy season" cue lasts until this hour. */
    coolCueUntilHour?: number;
    coolDropC?: number;
    /** Food tag → last game hour it was offered in this tank. */
    foodSeen?: Partial<Record<FoodTag, number>>;
    /** Throttled tank-level breeding tips: key → game hour last emitted. */
    warned?: Record<string, number>;
  };
}

// ───────────────────────────────── Economy ─────────────────────────────────

export type BuyerArchetype =
  | 'beginner'
  | 'experienced_keeper'
  | 'breeder'
  | 'collector'
  | 'aquascaper'
  | 'family'
  | 'public_aquarium'
  | 'conservation'
  | 'bargain_hunter';

export interface BuyerProfile {
  id: Id;
  name: string;
  archetype: BuyerArchetype;
  budget: number;
  /** Weights 0..2 applied to valuation factors. */
  prefs: {
    rarity: number;
    lineage: number;
    beauty: number;
    health: number;
    easyCare: number;
    size: number;
    visitorAppeal: number;
    price: number; // price sensitivity
  };
  favoriteSpecies: string[];
  patience: number; // 0..1
  reputationWithPlayer: number; // -1..1
  avatarSeed: number;
}

export type ListingKind = 'creature' | 'group' | 'pair' | 'juveniles' | 'tank' | 'frag' /* lane:frags */;

export interface Bid {
  id: Id;
  buyerId: Id;
  amount: number;
  message: string;
  createdHour: number;
  expiresHour: number;
  status: 'open' | 'accepted' | 'declined' | 'expired' | 'countered' | 'withdrawn';
  /** Set when the player countered. */
  counterAmount?: number;
  counterResponseHour?: number;
  /** lane:market — buyer display name + archetype copied at bid time (buyers can leave the pool). */
  buyerName?: string;
  archetype?: BuyerArchetype;
  /** lane:market — HIDDEN buyer ceiling (their private value); resolves counters. Never show in UI. */
  ceiling?: number;
  /** lane:market — system note, e.g. "Below your reserve — declined automatically". */
  note?: string;
  /** lane:market — the buyer's reply to the player's counter. */
  response?: string;
  /** lane:market — the player opened the counter form: no expiry or change of heart before this game hour. */
  holdUntilHour?: number;
  /** lane:fix-econ — when the current negotiation hold began; the total hold is capped from here (S03-08). */
  holdStartHour?: number;
}

export interface ListingSnapshot {
  valuation: number; // expected fair value at listing time
  healthScore: number;
  beautyScore: number;
  careDifficulty: string;
  lineageSummary: string;
  summary: string;
  photo?: string; // data URL (may be stripped from saves)
  creatureIds: Id[];
  tankId?: Id;
  /** lane:market — valuation range + what buyers were shown (misrepresentation checks compare against these). */
  low?: number;
  high?: number;
  welfare?: number;
  compatVerdict?: CompatVerdict;
  waterStatus?: 'good' | 'watch' | 'danger';
  gallons?: number;
  speciesIds?: string[];
  /** lane:market — fingerprint of tank equipment/decor at listing time (change detection). */
  signature?: string;
}

export interface Listing {
  id: Id;
  kind: ListingKind;
  title: string;
  creatureIds: Id[];
  tankId?: Id;
  reserve: number;
  buyNow?: number;
  createdHour: number;
  endsHour: number;
  status: 'active' | 'sold' | 'expired' | 'withdrawn' | 'invalidated';
  bids: Bid[];
  interest: number; // 0..1 buyer interest meter
  snapshot: ListingSnapshot;
  /** Set if contents changed after listing (death, removal, edits). */
  changedSinceListing?: string;
  soldTo?: Id;
  soldFor?: number;
  /** lane:fix-panels — game hour the listing closed (sold, withdrawn, expired, invalidated); `endsHour` keeps the scheduled end. */
  closedHour?: number;
  /** lane:market — advice shown when a listing expires or is invalidated. */
  advice?: string;
  /** lane:market — 0..1 listing appeal (drives buyer arrivals). */
  appeal?: number;
  /** lane:market — latest re-evaluated fair value (bids are repriced relative to this). */
  lastValuation?: number;
  /** lane:market — issue keys already reported (e.g. 'sick:<id>', 'dead:<id>', 'water', 'decor'). */
  alerts?: string[];
  /** lane:fix-econ — why no buyer can complete this sale right now (an unlisted animal with nowhere to go); cleared when it can (S03-07). */
  blocked?: string;
  /** lane:market — closing notes for the UI (why it sold/expired/was invalidated). */
  outcome?: string;
  /** lane:frags — kind 'frag': the frags/cuttings held for this listing (returned to storage if it doesn't sell). */
  fragItems?: DecorInstance[];
}

/** Livestock/equipment offers available to buy right now. */
export interface ShopOffer {
  id: Id;
  kind: 'creature' | 'group';
  speciesId: string;
  /** Pre-rolled individuals (kept out of state.creatures until bought). */
  creatures: Creature[];
  price: number;
  seller: string;
  expiresHour: number;
  note?: string;
  /** lane:market — offer tier (UI badge) and display label ("Group of 8 neon tetras"). */
  tier?: 'standard' | 'breeder' | 'rare' | 'special';
  label?: string;
  /** lane:market — price per animal when buying only part of a group (creatureIndexes). */
  unitPrice?: number;
}

/** lane:market — a temporary demand swing for one species (shown in the market UI). */
export interface MarketTrend {
  speciesId: string;
  text: string;
  /** Demand delta applied when the trend started (+ craze, − glut). */
  delta: number;
  startHour: number;
  untilHour: number;
}

export interface LedgerEntry {
  hour: number;
  amount: number; // + income, − expense
  category:
    | 'livestock_sale'
    | 'tank_sale'
    | 'admission'
    | 'tips'
    | 'quest'
    | 'award'
    | 'livestock_purchase'
    | 'tank_purchase'
    | 'equipment'
    | 'decor'
    | 'food'
    | 'consumables'
    | 'operating'
    | 'facility'
    | 'research'
    | 'other';
  memo: string;
}

export interface DailySummary {
  day: number;
  income: number;
  expenses: number;
  visitors: number;
  sales: number;
}

// ───────────────────────────────── Facility & visitors ─────────────────────────────────

export type FacilityLevelId = 'hobby_room' | 'specialty_shop' | 'aquarium_store' | 'showroom' | 'destination' | 'grand_hall';

export interface FacilityState {
  level: FacilityLevelId;
  /** Floor bounds in metres (x: width, z: depth), origin at room centre. */
  width: number;
  depth: number;
  /** Visitors enabled (after first shop unlock). */
  openToPublic: boolean;
  admission: number;
  /** Game-hour-of-day open/close. */
  openHour: number;
  closeHour: number;
  /** Non-tank floor objects: benches, signs, plants, counters. */
  fixtures: { id: Id; kind: string; x: number; z: number; rotY: number }[];
}

export interface VisitorReaction {
  hour: number;
  tankId?: Id;
  creatureId?: Id;
  text: string;
  mood: 'wow' | 'happy' | 'neutral' | 'bored' | 'concerned';
}

export interface VisitorsState {
  today: { day: number; count: number; revenue: number; tips: number; satisfactionSum: number };
  history: { day: number; count: number; revenue: number; avgSatisfaction: number }[];
  reactions: VisitorReaction[]; // capped
  exhibit: Record<Id, { popularity: number; views: number; wows: number; lastFeatured?: number }>;
  /** Lifetime counters. */
  totalVisitors: number;
  /** lane:facility — live crowd estimate + visitor-sim scratch (optional: absent in old saves). */
  live?: VisitorLiveState;
}

/** lane:facility — live visitor simulation state (see src/sim/facility/visitors.ts). */
export interface VisitorLiveState {
  /** Estimated people inside right now (Little's law: arrival rate × dwell time, capped by capacity). */
  occupancy: number;
  /** Current admitted arrivals per game hour. */
  arrivalRate: number;
  /** 0..1+ crowding (occupancy / capacity). */
  crowding: number;
  /** Fractional arrivals carried between steps. */
  carry: number;
  /** Revenue waiting to be banked (flushed to the ledger via economy.earn about once per game hour). */
  pendingAdmission: number;
  pendingTips: number;
  pendingDonations: number;
  lastFlushHour: number;
  /** Archetype mix of recent arrivals (for 3D crowd variety): archetype -> share 0..1. */
  mix: Record<string, number>;
  /** Tanks visitors currently cannot reach (blocked aisle). */
  unreachable: Id[];
  /** Hobby-room friend / neighbour visit in progress. */
  friend?: { name: string; kind: 'friend' | 'neighbour' | 'kids'; tankId: Id; untilHour: number; party: number };
  nextFriendHour?: number;
  /** tankId -> game hour of the last "can't reach" warning (throttle). */
  warnedHour?: Record<Id, number>;
  /** Concerned-visitor reputation loss taken today (capped). */
  concernLossToday?: number;
  /** lane:facility — reaction lines still allowed this quarter hour (refilled per game hour, not per step). */
  reactionBudget?: number;
}

// ───────────────────────────────── Progression ─────────────────────────────────

export type MasteryTrack = 'husbandry' | 'breeding' | 'aquascaping' | 'marine' | 'business' | 'exhibition';

export interface QuestState {
  id: string;
  status: 'active' | 'complete' | 'claimed';
  progress: number;
  startedHour: number;
  /** lane:facility — counter value when a relative quest started ("host 50 more visitors"). */
  baseline?: number;
  /** lane:facility — scaled target for repeatable quests (defaults to the quest definition). */
  target?: number;
}

export interface ProgressState {
  reputation: number; // 0..1000
  mastery: Record<MasteryTrack, number>; // XP per track
  unlocked: string[]; // unlock keys, see src/data/unlocks.ts
  research: { activeId?: string; progressHours: number; completed: string[] };
  achievements: string[];
  quests: QuestState[];
  tutorial: {
    starterId: string;
    step: number;
    done: boolean;
    skipped: boolean;
    flags: Record<string, boolean>;
    /** lane:facility — game hour the current step became active (drives gentle auto-advance fallbacks). */
    stepStartedHour?: number;
    /**
     * polish-gameplay — flags raised since the CURRENT step began: flag → game hour raised. Cleared whenever a step
     * completes, so a flag raised early (a betta flaring before the "observe" step, Build opened during "habitat")
     * never completes a later step. `flags` stays the all-time record. Absent in old saves.
     */
    flagHours?: Record<string, number>;
    /**
     * core — counter values (and 'reputation') when the CURRENT step began; the step's counter / reputation-gain
     * objectives only count progress made since. Reset whenever a step completes. Absent in old saves.
     */
    stepBaselines?: Record<string, number>;
  };
  counters: Record<string, number>; // e.g. feeds, waterChanges, sales, births
  discoveredSpecies: string[]; // encyclopedia
  discoveredMorphs: string[]; // `${speciesId}:${morphName}`
  /** lane:facility — incremental scan cursors so progression can react to log/market/breeding events. */
  scan?: {
    logSeq: number;
    marketHour: number;
    marketAtCursor?: number;
    day: number;
    boardRefreshHour?: number;
    birthScanHour?: number;
    /** lane:w2-sim — quest id → game hour it rotated off the board untouched (kept off for a while). */
    rotated?: Record<string, number>;
  };
}

// ───────────────────────────────── Log ─────────────────────────────────

export interface GameEvent {
  id: Id;
  hour: number;
  kind: 'info' | 'tip' | 'warning' | 'danger' | 'celebrate' | 'breeding' | 'market' | 'visitor' | 'death' | 'unlock';
  text: string;
  tankId?: Id;
  creatureId?: Id;
  listingId?: Id;
  read?: boolean;
  /** Toast it immediately. */
  toast?: boolean;
}

// ───────────────────────────────── Root ─────────────────────────────────

export type GameSpeed = 0 | 1 | 3 | 10;

export interface GameState {
  schemaVersion: number;
  saveId: string;
  seed: number;
  /** Deterministic RNG state for the simulation (see src/sim/rng.ts). */
  rngState: number;
  idCounter: number;
  createdRealMs: number;
  lastSavedRealMs: number;
  /** Real ms of the last sim tick (for bounded offline progress). */
  lastTickRealMs: number;
  clock: { hour: number; speed: GameSpeed };
  starterId: string;
  shopName: string;
  tanks: Record<Id, Tank>;
  tankOrder: Id[];
  creatures: Record<Id, Creature>;
  clutches: Record<Id, Clutch>;
  inventory: {
    foods: Record<string, number>; // foodId -> servings
    salt: number; // kg of marine salt mix
    equipment: EquipmentInstance[]; // owned but not installed
    decor: DecorInstance[]; // owned but not placed
    /** lane:frags — frags & cuttings waiting to be planted or sold (kept apart from bought decor). */
    frags?: DecorInstance[];
  };
  facility: FacilityState;
  market: {
    stock: ShopOffer[];
    listings: Listing[];
    buyers: BuyerProfile[];
    /** speciesId -> demand multiplier (0.6..1.6), random-walks daily. */
    demand: Record<string, number>;
    lastRefreshHour: number;
    history: { hour: number; kind: ListingKind; title: string; price: number; buyer: string }[];
    /** lane:market — active demand trends ("Axolotl craze at the regional expo!"). */
    trends?: MarketTrend[];
    /** lane:market — day index of the last mid-day special / demand walk; unlock count seen by the shop. */
    lastSpecialDay?: number;
    lastDemandDay?: number;
    seenUnlocks?: number;
    /** lane:market — game hours accumulated since the market last did work (it runs every ~0.1 h). */
    pendingHours?: number;
    /** lane:frags — game hours of recent frag sales to the local store (last 3 days; softens frag prices). */
    fragSaleHours?: number[];
  };
  finance: {
    money: number;
    ledger: LedgerEntry[];
    daily: DailySummary[];
    debtSinceHour?: number;
    /** lane:market — one-time aquarium-club emergency loan (repaid from 25% of daily income). */
    loan?: { amount: number; outstanding: number; takenHour: number; repaidHour?: number };
    /** lane:market — last day number (dayOf) whose operating bills were paid. */
    lastBilledDay?: number;
    /** lane:market — throttle for low-cash / debt warnings. */
    lastWarnHour?: number;
    /** lane:fix-econ — first midnight at which nothing was alive and the player could not afford a restart (P5-08). */
    strandedSinceHour?: number;
  };
  progress: ProgressState;
  visitors: VisitorsState;
  log: GameEvent[];
  /** Dev/debug toggles persisted per save. */
  dev?: { enabled: boolean };
  /** Title/starter-screen showcase world — never saved, never earns money. */
  isShowcase?: boolean;
  /**
   * lane:core — TRANSIENT (never saved). True only while persistence replays offline catch-up time
   * (see src/persistence/offline.ts). While set, the sim is under a "maintenance grace period":
   * nothing may die (floor creature health at GRACE_HEALTH_FLOOR = 20, never set status 'dead'),
   * creatures receive minimal rations (hunger capped at GRACE_MAX_HUNGER = 60 without using inventory),
   * and equipment should not fail. Core also enforces this as a safety net after every catch-up chunk.
   */
  offlineGrace?: boolean;
  /** lane:staff — hired keepers, stock manager and docents (src/sim/staff). Absent in old saves; created lazily once unlocked. */
  staff?: StaffState;
  /** lane:shows — show calendar, entries, results and trophies (src/sim/shows). Absent in old saves; created lazily. */
  shows?: ShowsState;
  /** lane:notify — notification-centre bookkeeping (src/ui/common/notify.ts). Absent in old saves; written lazily by the UI. */
  notify?: NotifyState;
}

/**
 * lane:notify — what the player has cleared or looked at. UI-only bookkeeping: the sim never reads it, and nothing is
 * ever deleted from `log` (progression, exhibits and the welcome-back card scan it), so "Clear all" only hides.
 */
export interface NotifyState {
  /** Events whose id sequence (`ev_<base36>`) is at or below this are hidden from the alerts drawer ("Clear all"). */
  logClearedSeq?: number;
  /** Game hour of the last "Clear all" (fallback for an event id without a readable sequence). */
  logClearedHour?: number;
  /** `progress.research.completed.length` when the Research panel was last open (finished projects after it are "new"). */
  researchSeen?: number;
}

// ───────────────────────────────── Staff (lane:staff) ─────────────────────────────────

/** lane:staff — what a staff member does. Aquarists care for assigned tanks, the stock manager reorders supplies, docents teach visitors. */
export type StaffRole = 'aquarist' | 'stock_manager' | 'docent';

/** lane:staff — one short personality/work trait per person (see src/data/staff.ts for copy and effects). */
export type StaffTrait =
  | 'meticulous'
  | 'gentle_hands'
  | 'algae_hunter'
  | 'reef_minded'
  | 'quick_learner'
  | 'early_bird'
  | 'planner'
  | 'thrifty'
  | 'great_with_kids'
  | 'storyteller';

/** lane:staff — what one person has done today (reset lazily when the day changes). */
export interface StaffDay {
  day: number;
  feeds: number;
  /** Distinct tanks fed today. */
  tanksFed: string[];
  waterChanges: number;
  cleanings: number;
  topOffs: number;
  orders: number;
  spent: number;
  talks: number;
  /** Plain-language problems today ("No food for the seahorses in Seahorse Gallery"). */
  issues: string[];
  /** Latest task (UI "what they did" line; render uses it to walk to the tank). */
  last?: { hour: number; kind: 'feed' | 'water' | 'glass' | 'topoff' | 'order' | 'talk'; tankId?: string; text: string };
}

/** lane:staff — a hired staff member or a candidate in the hiring pool. */
export interface StaffMember {
  id: Id;
  name: string;
  role: StaffRole;
  /** 1..5 (stars). */
  skill: number;
  trait: StaffTrait;
  /** Daily wage ($), billed at midnight with the operating costs. */
  wage: number;
  avatarSeed: number;
  /** Game hour hired (candidates: hour they joined the pool). */
  hiredHour: number;
  /** Days of experience toward the next skill level. */
  xp: number;
  /** Aquarists: tanks in their care. Docents: exhibits they present. */
  tankIds: Id[];
  /** Consecutive midnights their wage could not be paid (leave at STAFF_NOTICE_DAYS). */
  unpaidDays?: number;
  today?: StaffDay;
  /** Lifetime totals (card flavour). */
  totals?: { feeds: number; waterChanges: number; cleanings: number; orders: number; spent: number; talks: number; days: number };
}

/** lane:staff — a keeper feeding, recorded so the tank view can drop the food in visibly (capped ring). */
export interface StaffFeedEvent {
  seq: number;
  hour: number;
  tankId: Id;
  foodId: string;
  staffId: Id;
  servings: number;
  targetCreatureId?: Id;
}

/** lane:staff — facility staff. Optional on GameState; created lazily by src/sim/staff once the 'staff' unlock is earned. */
export interface StaffState {
  roster: StaffMember[];
  candidates: StaffMember[];
  /** Game hour the candidate pool next refreshes. */
  nextPoolHour: number;
  /** Id / event sequence counter (independent of state.idCounter). */
  seq: number;
  /** Staff's own deterministic RNG stream (mulberry32 state) so hiring never shifts the main sim's random sequence. */
  rng: number;
  /** Stock manager's daily spending limit ($). */
  stockBudget: number;
  /** Money the stock manager has spent on `day`. */
  stockSpent: { day: number; amount: number };
  /** Recent keeper feeds (newest last, capped). */
  feeds: StaffFeedEvent[];
  /** Docent talks: exhibit + time window (newest last, capped). */
  talks: { hour: number; untilHour: number; tankId: Id; staffId: Id }[];
  /** Per-tank care bookkeeping: last keeper water change (game hour). */
  care: Record<Id, { lastWaterChange?: number; lastFed?: number; lastBuffer?: number }>;
  /** Throttled warnings: key -> game hour last emitted. */
  warned: Record<string, number>;
  /** People who left (for the log / UI "former staff" note), newest last, capped. */
  departed?: { name: string; role: StaffRole; hour: number; reason: 'fired' | 'unpaid' }[];
}

// ───────────────────────────────── Shows (lane:shows) ─────────────────────────────────

/** lane:shows — show tiers, lowest to highest (Club → Regional → National → International). */
export type ShowTier = 'club' | 'regional' | 'national' | 'international';

/** lane:shows — Champion: 3 class wins at Regional or higher. Grand Champion: a Champion with 3 wins at National or higher. */
export type CreatureTitle = 'champion' | 'grand_champion';

/** lane:shows — one placing earned by an animal (newest last, capped). place 4 = Honourable Mention. */
export interface CreatureRibbon {
  hour: number;
  showId: string;
  showName: string;
  tier: ShowTier;
  classId: string;
  className: string;
  place: 1 | 2 | 3 | 4;
  bestInShow?: boolean;
  score: number;
}

/** lane:shows — an animal's show record (Creature.awards). */
export interface CreatureAwards {
  ribbons: CreatureRibbon[];
  /** Class wins by tier (lifetime). */
  wins: Partial<Record<ShowTier, number>>;
  /** Lifetime placings (1st–3rd and Honourable Mentions). */
  placings: number;
  bestInShow: number;
  /** Shows entered and judged (lifetime). */
  shown: number;
  titles: CreatureTitle[];
  /** Game hour of its last show (animals rest a day between shows). */
  lastShowHour?: number;
}

/** lane:shows — one line of a class's published results. */
export interface ShowPlacing {
  place: number;
  name: string;
  exhibitor: string;
  score: number;
  mine?: boolean;
  entryId?: string;
}

/** lane:shows — one class at one show. */
export interface ShowClass {
  /** Key into SHOW_CLASSES (src/data/shows.ts). */
  classId: string;
  /** Total prize money for the class ($; 1st 55%, 2nd 27%, 3rd 18%). */
  purse: number;
  /** Other exhibitors expected in the class. */
  field: number;
  /** After judging: the top placings (plus the player's entries). */
  results?: ShowPlacing[];
  /** Entries judged in the class (other exhibitors + the player's). */
  entrants?: number;
}

/** lane:shows — a scheduled (or judged) show on the circuit. */
export interface Show {
  id: string;
  serial: number;
  name: string;
  host: string;
  tier: ShowTier;
  classes: ShowClass[];
  /** Entry fee per entry ($). */
  fee: number;
  announcedHour: number;
  /** Entries close at this game hour. */
  deadlineHour: number;
  judgingHour: number;
  judge: string;
  status: 'open' | 'judged';
  /** Per-show deterministic seed (other exhibitors + judge variance). */
  seed: number;
  bestInShow?: ShowPlacing & { classId: string };
}

/** lane:shows — one scored criterion on a judge's card. */
export interface JudgeCriterion {
  key: string;
  label: string;
  points: number;
  max: number;
}

/** lane:shows — the judge's card every entry gets back. */
export interface JudgeCard {
  judge: string;
  /** 3–5 plain-language reasons. */
  lines: string[];
  criteria: JudgeCriterion[];
}

/** lane:shows — one of the player's entries (pending, judged, scratched or withdrawn). */
export interface ShowEntry {
  id: string;
  showId: string;
  classId: string;
  kind: 'creature' | 'tank';
  /** Creature id or tank id. */
  subjectId: string;
  /** Display name at entry time (kept for results after a sale). */
  name: string;
  speciesId?: string;
  /** Show name + tier at entry time (results outlive the show record, which is pruned sooner). */
  showName?: string;
  tier?: ShowTier;
  fee: number;
  enteredHour: number;
  status: 'entered' | 'judged' | 'scratched' | 'withdrawn';
  judgedHour?: number;
  score?: number;
  /** Rank in the class (1 = winner). */
  rank?: number;
  of?: number;
  /** 1–3 = ribbons, 4 = Honourable Mention. */
  ribbon?: 1 | 2 | 3 | 4;
  bestInShow?: boolean;
  prize?: number;
  reputation?: number;
  card?: JudgeCard;
  /** Why it was scratched (unwell on show day, sold…). */
  note?: string;
  /** Titles earned at this show. */
  titles?: CreatureTitle[];
}

/** lane:shows — a trophy or rosette on the facility's trophy shelf / cabinet. */
export interface TrophyRecord {
  id: string;
  kind: 'rosette' | 'cup' | 'plaque' | 'bowl';
  tier: ShowTier;
  place: 1 | 2 | 3 | 4;
  bestInShow?: boolean;
  showName: string;
  className: string;
  subject: string;
  hour: number;
}

/** lane:shows — the show circuit. Optional on GameState; created lazily by src/sim/shows. */
export interface ShowsState {
  /** Shows' own deterministic RNG stream (mulberry32 state), so the circuit never shifts the main sim's sequence. */
  rng: number;
  /** Id / serial counter (independent of state.idCounter). */
  seq: number;
  /** The next show is scheduled after this game hour. */
  cursorHour: number;
  shows: Show[];
  entries: ShowEntry[];
  trophies: TrophyRecord[];
  /** Aquascape awards by tank id. */
  tankAwards: Record<Id, { wins: number; placings: number; best?: string; bestTier?: ShowTier; lastHour: number }>;
  stats: { entered: number; placings: number; wins: number; bestInShow: number; prize: number };
  /** UI: results judged after this game hour are "new". */
  resultsSeenHour?: number;
}
