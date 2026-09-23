/**
 * Builds compatibility members + tank context from the game state. OWNER: lane "waterlab".
 */
import type { CandidateAddition, Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { getDecorDef } from '@/data/catalog/decor';
import { computeTankEnv, expectedTempC, decorCategoryCount } from '../water/env';
import type { TankHabitat } from '../aquascape';
import { memberFrom, type CompatContext, type CompatMember, type MemberIndividual } from './engine';
import { residentsOf } from '../residents'; // lane:perf2

const isAdult = (c: Creature, sp: SpeciesDefinition) => c.lifeStage === 'adult' || c.lifeStage === 'elder' || (c.sizeCm ?? 0) >= sp.adultSizeCm * 0.75;

export function individualOf(c: Creature, sp: SpeciesDefinition): MemberIndividual {
  return { id: c.id, sizeCm: c.sizeCm > 0 ? c.sizeCm : sp.adultSizeCm * 0.6, sex: c.sex ?? 'unknown', adult: isAdult(c, sp) };
}

export function tankMembers(state: GameState, tankId: string, extra: { species: SpeciesDefinition; individuals: MemberIndividual[] }[] = [], excludeIds: string[] = []): CompatMember[] {
  const bySpecies = new Map<string, { species: SpeciesDefinition; individuals: MemberIndividual[]; candidate: boolean }>();
  for (const c of residentsOf(state, tankId)) { // lane:perf2 — per-step residents index (same members, same order)
    if (excludeIds.includes(c.id)) continue;
    const sp = findSpecies(c.speciesId);
    if (!sp) continue;
    const g = bySpecies.get(sp.id) ?? { species: sp, individuals: [], candidate: false };
    g.individuals.push(individualOf(c, sp));
    bySpecies.set(sp.id, g);
  }
  for (const e of extra) {
    const g = bySpecies.get(e.species.id) ?? { species: e.species, individuals: [], candidate: true };
    g.individuals.push(...e.individuals);
    g.candidate = true;
    bySpecies.set(e.species.id, g);
  }
  return [...bySpecies.values()].map((g) => memberFrom(g.species, g.individuals, g.candidate));
}

/** Individuals described by a purchase/move candidate. */
export function candidateIndividuals(state: GameState, cand: CandidateAddition, sp: SpeciesDefinition): MemberIndividual[] {
  if (cand.creatureIds?.length) {
    const out: MemberIndividual[] = [];
    for (const id of cand.creatureIds) {
      const c = state.creatures[id];
      if (c) out.push(individualOf(c, findSpecies(c.speciesId) ?? sp));
    }
    if (out.length) return out;
  }
  const n = Math.max(1, Math.min(100, Math.round(cand.count ?? 1)));
  const size = cand.sizeCm ?? sp.adultSizeCm * 0.8;
  const inds: MemberIndividual[] = [];
  for (let i = 0; i < n; i++) inds.push({ id: `candidate:${sp.id}:${i}`, sizeCm: size, sex: cand.sex ?? 'unknown', adult: size >= sp.adultSizeCm * 0.75 });
  return inds;
}

export function tankContext(state: GameState, tank: Tank): CompatContext {
  const env = computeTankEnv(state, tank);
  const s = env.summary;
  const par = s.par * (tank.lighting?.intensity ?? 1);
  const lightLevel = s.lights.length === 0 ? 0 : par < 0.35 ? 0 : par < 0.75 ? 1 : 2;
  const h = env.habitat as TankHabitat & { anemones?: number };
  return {
    neutral: false,
    tankId: tank.id,
    gallons: env.gallons,
    dimsIn: tierDims(tank),
    waterClass: tank.waterClass,
    environment: tank.environment,
    purpose: tank.purpose,
    habitat: env.habitat,
    substrate: { kind: tank.substrate?.kind ?? 'sand', depthCm: tank.substrate?.depthCm ?? 3 },
    flowIndex: env.flow.index,
    lightLevel,
    expectedTempC: expectedTempC(tank, s),
    salinitySG: tank.water?.salinitySG ?? null,
    pH: Number.isFinite(tank.water?.pH) ? tank.water.pH : null,
    hasLid: s.lid,
    ageDays: Math.max(0, ((state.clock?.hour ?? 0) - (tank.createdHour ?? 0)) / 24),
    bioMaturity: tank.water?.bioMaturity ?? 0,
    pods: tank.water?.lab?.pods ?? 0,
    algae: tank.water?.algae ?? 0,
    anemones: typeof h.anemones === 'number' ? h.anemones : decorCategoryCount(tank, 'anemone'),
    corals: env.corals,
    spaceCapUnits: env.spaceCapUnits,
    processCapUnits: env.processCapUnits,
    clutchSpecies: Object.values(state.clutches ?? {}).filter((c) => c.tankId === tank.id).map((c) => c.speciesId),
    stinging: stingingCount(tank),
    glassMm: tierInfo(tank)?.glassMm,
    material: tierInfo(tank)?.material,
  };
}

const STINGING_VISUAL = /hammer|torch|frogspawn|euphyllia|elegance|catalaphyllia|fire|galaxea/i;

/** Anemones plus strongly stinging corals (Euphyllia-type LPS, fire coral) in the tank's decor. */
export function stingingCount(tank: Tank): number {
  let n = 0;
  for (const d of tank.decor ?? []) {
    const def = getDecorDef(d.defId);
    if (!def) continue;
    if (def.category === 'anemone') n++;
    else if (def.category === 'coral' && (STINGING_VISUAL.test(def.visual) || STINGING_VISUAL.test(def.name) || STINGING_VISUAL.test(def.id))) n++;
  }
  return n;
}

function tierInfo(tank: Tank) {
  try {
    return getTankTier(tank.tierId);
  } catch {
    return undefined;
  }
}

function tierDims(tank: Tank): { l: number; w: number; h: number } {
  try {
    return getTankTier(tank.tierId).dimsIn;
  } catch {
    return { l: 30, w: 12, h: 12 };
  }
}

/** A generous, well-decorated hypothetical tank for pure species-vs-species checks. */
export function neutralContext(a: SpeciesDefinition, b: SpeciesDefinition): CompatContext {
  const common = a.waterClasses.find((c) => b.waterClasses.includes(c)) ?? a.waterClasses[0] ?? 'freshwater_tropical';
  const gallons = Math.max(a.recommendedMinTankGallons, b.recommendedMinTankGallons, 20) * 1.5;
  const len = Math.max(a.recommendedFootprint?.minLengthIn ?? 24, b.recommendedFootprint?.minLengthIn ?? 24, 30);
  return {
    neutral: true,
    gallons,
    dimsIn: { l: len * 1.2, w: 18, h: 18 },
    waterClass: common,
    environment: a.environment,
    purpose: 'display',
    habitat: {
      hides: 4,
      cover: 0.5,
      sightBreak: 0.5,
      hitching: 3,
      grazing: 1,
      enrichment: 0.4,
      nitrateUptake: 0.1,
      oxygen: 0.1,
      hasHost: false,
      nestSites: 2,
      hazards: { sharp: false, ingestible: false },
      corals: { soft: 0, lps: 0, sps: 0, zoanthid: 0, mushroom: 0, gsp: 0 },
    },
    substrate: { kind: a.substrateRules?.preferred?.find((k) => b.substrateRules?.preferred?.includes(k)) ?? 'sand', depthCm: 5 },
    flowIndex: null,
    lightLevel: null,
    expectedTempC: null,
    salinitySG: null,
    hasLid: true,
    ageDays: 60,
    bioMaturity: 1,
    pods: 0.6,
    algae: 10,
    anemones: 0,
    corals: 0,
    spaceCapUnits: gallons * 0.5,
    processCapUnits: gallons * 0.5,
    stinging: 0,
    glassMm: 12,
    material: 'glass',
  };
}
