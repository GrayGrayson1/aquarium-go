/**
 * Catalog contracts (tanks, equipment, decor, foods). OWNER: core. Lanes may ADD optional fields.
 */
import type { EquipmentKind } from './game';
import type { Environment, FoodTag, SubstrateKind, WaterClass } from './species';

export interface TankTier {
  id: string; // e.g. 'g20L'
  gallons: number;
  name: string; // "20 Gallon Long"
  /** Real-world interior dimensions in inches (length x width/depth x height). */
  dimsIn: { l: number; w: number; h: number };
  price: number;
  /** Unlock key required (empty = available). */
  unlock: string | null;
  material: 'glass' | 'acrylic' | 'panoramic';
  /** Glass thickness in mm (visual + value). */
  glassMm: number;
  /** Includes stand/cabinet visual. */
  standStyle: 'desk' | 'cabinet' | 'rack' | 'built_in' | 'plinth';
  /** Base daily electricity/upkeep abstraction before equipment. */
  baseUpkeep: number;
  blurb: string;
}

export type EquipmentTier = 1 | 2 | 3;

export interface EquipmentDef {
  id: string;
  kind: EquipmentKind;
  name: string;
  tier: EquipmentTier;
  price: number;
  /** Daily running cost. */
  upkeep: number;
  unlock: string | null;
  environments: Environment[]; // where it can be installed
  /** Recommended tank gallons range for the device. */
  gallonsRange: { min: number; max: number };
  /** Kind-specific numbers; the water sim lane interprets these. */
  stats: {
    /** filter: gallons-per-hour turnover; also biological capacity units. */
    flowGph?: number;
    bioCapacity?: number; // waste units processed per hour at full maturity
    mechanical?: number; // 0..1 detritus removal efficiency
    /** heater/chiller: watts-ish capacity; degrees C per hour for a 20 gal tank. */
    power?: number;
    /** light: PAR-ish 0..1, and spectrum */
    par?: number;
    spectrum?: 'warm' | 'daylight' | 'planted' | 'actinic' | 'full_reef';
    /** skimmer/uv/refugium: nutrient export 0..1 */
    export?: number;
    /** oxygenation contribution 0..1 */
    aeration?: number;
    /** surface agitation 0..1 (bettas prefer calm) */
    agitation?: number;
    /** default target setting */
    defaultSetting?: number;
    failureRate?: number; // per game-day probability at condition 1
  };
  /** Visual kind key for the props renderer. */
  visual: string;
  description: string;
}

export type DecorCategory = 'hardscape' | 'plant' | 'coral' | 'anemone' | 'ornament' | 'enrichment' | 'substrate_feature';

export interface DecorAnchorTemplate {
  kind: 'hide' | 'hitch' | 'perch' | 'nest_site' | 'rest' | 'graze' | 'host' | 'cave' | 'leaf_rest' | 'burrow';
  /** Offset in decor-local metres (before scale/rotation), y up from base. */
  offset: [number, number, number];
  capacity: number;
}

export interface DecorDef {
  id: string;
  name: string;
  category: DecorCategory;
  price: number;
  unlock: string | null;
  environments: Environment[];
  /** Allowed classes; empty = any class in the environments. */
  waterClasses?: WaterClass[];
  /** Base footprint/height in metres at scale 1 (w along x, d along z, h up). */
  size: { w: number; d: number; h: number };
  scaleRange: [number, number];
  /** Contributions to habitat (per item at scale 1). */
  habitat: {
    hides: number; // hiding places
    cover: number; // 0..1 plant/visual cover density contribution per 10 gallons
    sightBreak: number; // 0..1 line-of-sight breaking
    nitrateUptake: number; // plants: nitrate removal per hour
    oxygen: number; // plants/photosynthesis
    grazing: number; // biofilm/algae surfaces for grazers
    enrichment: number; // 0..1
    hitching: number; // seahorse hitching posts
  };
  /** Sharp/rough decor harms long-finned fish; small grains are ingestion risk (axolotl). */
  hazards?: { sharp?: boolean; ingestible?: boolean; toxicToMarine?: boolean };
  /** Aquascape beauty contribution weight. */
  beauty: number;
  /** Visual generator key for the decor renderer, e.g. 'rock_seiryu', 'driftwood_spider', 'plant_anubias'. */
  visual: string;
  /** Plants/corals: light need 0..1; corals: 'soft'|'lps'|'sps' style difficulty */
  lightNeed?: number;
  coralType?: 'soft' | 'lps' | 'sps' | 'zoanthid' | 'mushroom' | 'gsp';
  anchors: DecorAnchorTemplate[];
  /** Colors for the renderer (optional palette hints). */
  palette?: string[];
  description: string;
  /** lane:frags — how the keeper propagates it (overrides the defaults in src/data/catalog/propagation.ts). */
  propagation?: Partial<DecorPropagation>;
}

/** lane:frags — frag/cutting rules for a living decor piece (see src/data/catalog/propagation.ts). */
export interface DecorPropagation {
  /** false = the keeper can't (or shouldn't) cut it; `why` explains. */
  can: boolean;
  /** Button label: "Take frag", "Take cutting", "Divide rhizome", "Trim portion", "Split"… */
  action: string;
  /** What you get: "frag", "cutting bundle", "rhizome division", "portion"… */
  noun: string;
  /** One line on the real practice. */
  how: string;
  /** Why it can't be propagated (when can = false). */
  why?: string;
  /** Minimum growth (0..1) of the parent before a cut. */
  minGrowth: number;
  /** Growth the parent loses per cut. */
  cost: number;
  /** Game hours the parent heals (no growth, no new cuts). */
  recoveryHours: number;
  /** Growth a fresh frag/cutting starts at. */
  startGrowth: number;
  /** A fresh frag's market value as a fraction of the def's price (before condition/demand). */
  valueFraction: number;
}

export interface SubstrateDef {
  kind: SubstrateKind;
  name: string;
  price: number; // per 10 gallons
  environments: Environment[];
  grainMm: number;
  colors: string[];
  unlock: string | null;
  description: string;
}

export interface FoodDef {
  id: string;
  name: string;
  tags: FoodTag[];
  /** Price per pack. */
  price: number;
  servingsPerPack: number;
  /** How it moves in the water: floats, sinks slowly, sinks fast, live swimmer, target-fed. */
  delivery: 'floating' | 'slow_sink' | 'fast_sink' | 'live' | 'target';
  /** Nutrition per serving (hunger reduction units). */
  nutrition: number;
  /** Waste added if uneaten per serving. */
  waste: number;
  /** Enrichment value (live foods, hunting). */
  enrichment: number;
  /** Conditioning value for breeding readiness. */
  conditioning: number;
  unlock: string | null;
  color: string; // particle color
  description: string;
}
