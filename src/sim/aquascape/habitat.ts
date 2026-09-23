/**
 * Habitat aggregation: what the decor + substrate of a tank offer the animals living in it.
 * OWNER: lane "aquascape". Consumed by compat, welfare, breeding and the UI.
 */
import type { GameState, Tank, DecorDef, DecorInstance } from '@/types';
import { getDecorDef, isLiving, isFloating } from '@/data/catalog/decor';
import { getTankTier } from '@/data/catalog/tanks';

export interface TankHabitat {
  hides: number;
  /** 0..1 plant/visual cover density (normalised for tank size). */
  cover: number;
  /** 0..1 line-of-sight breaking. */
  sightBreak: number;
  hitching: number;
  grazing: number;
  enrichment: number;
  nitrateUptake: number;
  oxygen: number;
  /** Host anemone / host coral present. */
  hasHost: boolean;
  nestSites: number;
  /** Hazards present: sharp decor, ingestible gravel, etc. */
  hazards: { sharp: boolean; ingestible: boolean };
  /** Corals present by type (for reef-safety checks). */
  corals: { soft: number; lps: number; sps: number; zoanthid: number; mushroom: number; gsp: number };
  // ── lane:aquascape additions (optional extras; everything above is the stable contract) ──
  /** Cave-type dens (cave anchors): plecos, kuhlis, axolotls. */
  caves?: number;
  /** Leaf hammocks near the surface / on broad leaves (betta rest spots). */
  leafRests?: number;
  /** 0..1 shade/cover at the surface from floating plants (bettas, bubble nests, skittish fish). */
  surfaceCover?: number;
  /** Anemones present (true hosts, not surrogate corals). */
  anemones?: number;
  /** Sources of sharp decor, for plain-language explanations. */
  sharpItems?: string[];
  /** 0..1 how much of the middle water column is open swimming space. */
  openWater?: number;
  /** Rest spots on/against decor (bottom dwellers, seahorses, bettas). */
  restSpots?: number;
  /** Number of decor items. */
  itemCount?: number;
}

export function emptyHabitat(): TankHabitat {
  return {
    hides: 0,
    cover: 0,
    sightBreak: 0,
    hitching: 0,
    grazing: 0,
    enrichment: 0,
    nitrateUptake: 0,
    oxygen: 0,
    hasHost: false,
    nestSites: 0,
    hazards: { sharp: false, ingestible: false },
    corals: { soft: 0, lps: 0, sps: 0, zoanthid: 0, mushroom: 0, gsp: 0 },
    caves: 0,
    leafRests: 0,
    surfaceCover: 0,
    anemones: 0,
    sharpItems: [],
    openWater: 1,
    restSpots: 0,
    itemCount: 0,
  };
}

/** How much a living item currently contributes (young / unhealthy plants give less cover). */
export function vitality(inst: DecorInstance, def: DecorDef): number {
  if (!isLiving(def)) {
    if (def.visual === 'botanical_almond_leaf') return 0.4 + 0.6 * ((inst.health ?? 100) / 100);
    return 1;
  }
  const g = inst.growth ?? 0.6;
  const h = (inst.health ?? 90) / 100;
  return Math.max(0, (0.35 + 0.65 * g) * (0.3 + 0.7 * h));
}

const sizeFactor = (scale: number) => Math.max(0.2, scale) ** 1.5;

/** Aggregate habitat features of a tank's decor + substrate (compat, welfare, breeding all use this). */
export function tankHabitat(state: GameState | null, tank: Tank): TankHabitat {
  const out = emptyHabitat();
  let gallons = 20;
  try {
    gallons = getTankTier(tank.tierId).gallons;
  } catch {
    /* unknown tier — keep default */
  }
  const per10 = 10 / Math.max(1, gallons);
  let cover = 0;
  let sight = 0;
  let surface = 0;
  let volume = 0;
  for (const inst of tank.decor) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    out.itemCount! += 1;
    const v = vitality(inst, def);
    const sf = sizeFactor(inst.scale);
    const hb = def.habitat;
    const hideScale = Math.min(1.6, Math.max(0.5, inst.scale));
    out.hides += hb.hides * hideScale * (isLiving(def) ? v : 1);
    cover += hb.cover * sf * v;
    sight += hb.sightBreak * sf * v;
    out.hitching += hb.hitching * Math.min(1.5, Math.max(0.6, inst.scale)) * (isLiving(def) ? Math.max(0.5, v) : 1);
    out.grazing += hb.grazing * sf;
    out.enrichment += hb.enrichment * Math.min(1.5, inst.scale);
    out.nitrateUptake += hb.nitrateUptake * sf * v;
    out.oxygen += hb.oxygen * sf * v;
    if (isFloating(def)) surface += hb.cover * sf * v;
    volume += def.size.w * def.size.d * def.size.h * inst.scale ** 3;
    for (const an of def.anchors) {
      if (an.kind === 'host') out.hasHost = true;
      if (an.kind === 'nest_site') out.nestSites += an.capacity;
      if (an.kind === 'cave') {
        out.nestSites += 1;
        out.caves! += 1;
      }
      if (an.kind === 'leaf_rest') out.leafRests! += 1;
      if (an.kind === 'rest') out.restSpots! += 1;
    }
    if (def.category === 'anemone') out.anemones! += 1;
    if (def.hazards?.sharp) {
      out.hazards.sharp = true;
      if (!out.sharpItems!.includes(def.name)) out.sharpItems!.push(def.name);
    }
    if (def.hazards?.ingestible) out.hazards.ingestible = true;
    if (def.coralType && def.category === 'coral') out.corals[def.coralType] += 1;
  }
  const k = tank.substrate.kind;
  if (k === 'gravel' || k === 'fine_gravel') out.hazards.ingestible = true;
  out.cover = clamp01(cover * per10);
  out.sightBreak = clamp01(sight * per10);
  out.surfaceCover = clamp01(surface * per10 * 1.4);
  out.enrichment = clamp01(out.enrichment * Math.sqrt(per10) * 0.6);
  out.hides = round2(out.hides);
  out.hitching = round2(out.hitching);
  out.grazing = round2(out.grazing * per10);
  out.nitrateUptake = round3(out.nitrateUptake * per10);
  out.oxygen = round3(out.oxygen * per10);
  // open water: decor volume vs. water volume (very rough, but monotonic and cheap)
  const waterM3 = gallons * 0.003785;
  out.openWater = clamp01(1 - (volume * 0.55) / Math.max(0.005, waterM3 * 0.6));
  return out;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;
