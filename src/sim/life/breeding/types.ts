/**
 * Internal contracts for the species breeding modules. OWNER: lane "breeding".
 *
 * Every `BreedingSystemId` maps to one `BreedingModule` (see ./registry.ts). A module owns the per-creature state
 * machine (`repro.stage`), while ./clutch.ts runs the shared egg → larvae → fry → juvenile pipeline using the
 * module's `RearingPlan`.
 */
import type { BreedingSystemId, Clutch, Creature, FoodTag, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import type { TankHabitat } from '@/sim/aquascape';
import type { IncidentRisk } from '@/sim/compat';

/** Lazily computed, per-tank-substep facts shared by every module and clutch in that tank. */
export interface TankInfo {
  habitat(): TankHabitat;
  /** Stocking load in "adult-equivalent bioload units" / tank capacity (1 = full). */
  loadRatio(): number;
  /** Surface agitation 0..~2 from filters, airstones, powerheads (bubble nests need < SURFACE_CALM_MAX). */
  agitation(): number;
  /** Compat-lane incident risks that target eggs/fry/juveniles (youngOnly). */
  youngRisks(): IncidentRisk[];
}

export interface StepEnv {
  state: GameState;
  tank: Tank;
  species: SpeciesDefinition;
  /** Living creatures of this species in this tank (any age). */
  members: Creature[];
  /** Game hour at the start of this sub-step. */
  hour: number;
  /** Sub-step length in game hours (≤ 1). */
  dt: number;
  ctx: SimContext;
  info: TankInfo;
}

export type NaturalFood = 'infusoria' | 'biofilm' | 'copepods' | 'algae';

export interface RearingPhase {
  stage: 'larvae' | 'fry';
  /** Fraction of `fryRearingHours` spent in this phase. */
  frac: number;
  /** Foods the young eat in this phase (any one is enough). */
  foods: FoodTag[];
  /** Food the tank produces on its own (planted/mature/live-rock tanks). */
  natural: NaturalFood[];
  /** Clutch visual while in this phase ('keep' = leave as is, e.g. betta larvae hang in the bubble nest). */
  visual: Clutch['visual'] | 'keep';
  /** Plural noun for messages: 'larvae', 'fry', 'shrimplets', 'baby snails'. */
  label: string;
}

export interface RearingPlan {
  phases: RearingPhase[];
  /** Predator tags that match the eggs (see src/data/species/tags.ts). */
  eggTags: string[];
  /** Predator tags that match the hatched young. */
  youngTags: string[];
  /** Adult conspecifics (other than a guarding parent) eat the eggs. */
  parentsEatEggs: boolean;
  /** Eggs need a tending parent (fanning, mouthing, nest repair); unguarded eggs fungus. */
  guardEggs: boolean;
  /** The guarding parent turns into a predator once fry are free-swimming (betta male). */
  guardianEatsFry: boolean;
  /** The guardian keeps tending the hatched young (betta larvae in the nest, pleco wrigglers in the cave). */
  guardYoung?: boolean;
  /** Larvae drift in open water: lost to filters/skimmers/tankmates unless reared in a nursery. */
  planktonic: boolean;
  /** Eggs hatch only after lights-out (clownfish). */
  hatchAtNight: boolean;
  /** False = larvae cannot be reared in this game yet (marine shrimp larvae); the clutch is lost with an explanation. */
  larvaeViable: boolean;
  /** Sibling cannibalism capacity (young per gallon) — axolotl larvae nip and eat each other when crowded. */
  cannibalPerGallon?: number;
  /** Starvation severity multiplier (seahorse fry starve fastest). */
  starveSeverity: number;
  /** 0..1 how much dense cover shelters the young from predators (moss-dwelling shrimplets, livebearer fry). */
  coverShelter: number;
  /** Fraction of the rearing time the young live on their yolk sac (no feeding needed). */
  yolkFrac: number;
  /** Explanation used when `larvaeViable` is false. */
  nonViableText?: string;
}

/** Everything a module needs to judge whether a pair can breed right now. */
export interface CheckCtx {
  state: GameState;
  sp: SpeciesDefinition;
  a: Creature;
  b: Creature;
  /** Resolved roles (hermaphrodites: a/b in order). */
  male: Creature;
  female: Creature;
  /** Tank where the breeding would happen (null = not decidable yet). */
  tank: Tank | null;
  hour: number;
  reasons: string[];
  steps: string[];
  /** Subset of reasons that also prevent Start breeding (the rest can be fixed while the pair is together). */
  startBlockers: string[];
  /** Called from startBreeding: co-location is being arranged by the action. */
  forStart: boolean;
}

export interface StatusOut {
  label: string;
  detail?: string;
  progress?: number;
}

export interface BreedingModule {
  id: BreedingSystemId;
  /** False for systems that cannot be bred in this build (explanations only). */
  breedable: boolean;
  plan: RearingPlan;
  /** The keeper introduces the partner with Start breeding (betta) — co-location is not required beforehand. */
  introducedByKeeper?: boolean;
  /** Short explanation shown when the system is not breedable / special. */
  explain?(sp: SpeciesDefinition): string;
  step(env: StepEnv): void;
  check(cc: CheckCtx): void;
  /** After startBreeding co-located the pair: set up species-appropriate stages. Returns a message. */
  start?(state: GameState, male: Creature, female: Creature, tank: Tank, hour: number): string;
  /** DEV: put a ready pair straight into the stage just before the main event. Returns a message. */
  force(state: GameState, male: Creature, female: Creature, tank: Tank, hour: number): string;
  /** Clutch phase change hook (hatch / free-swimming) for species-specific messages. Return true if handled. */
  onPhase?(state: GameState, clutch: Clutch, tank: Tank, sp: SpeciesDefinition, hour: number, ctx: SimContext): boolean;
  /** Optional stage label override for the creature card. */
  status?(state: GameState, c: Creature, sp: SpeciesDefinition, hour: number): StatusOut | null;
}
