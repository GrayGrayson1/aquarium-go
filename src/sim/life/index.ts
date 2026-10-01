/**
 * Creature life simulation: creation, appearance, personality, metabolism, welfare, growth, death, incidents.
 * OWNER: lane "lifecycle". Exported signatures are contracts (world.ts, newGame.ts, market, breeding, UI, AI).
 * Breeding lives in ./breeding (lane "breeding") and genetics in ./genetics.ts (lane "lifecycle").
 *
 * Module map:
 *   genetics.ts    genome rolls, inheritance, phenotype + individual variation, disclosure
 *   personality.ts species-bounded tags, behaviour modifiers for the AI
 *   names.ts       charming deterministic names by species vibe
 *   growth.ts      age → stage, growth curve, sex determination
 *   welfare.ts     water/habitat/social/stress model (pure; UI explanations)
 *   illness.ts     plausible illnesses with causes + cures
 *   step.ts        per-tank metabolism/feeding/health/incidents step
 */
import type { GameState, Tank, Creature, Genome, CreatureVisualParams, SpeciesDefinition, Sex, PersonalityTag, Clutch } from '@/types';
import type { SimContext } from '../context';
import type { Rng } from '../rng';
import { getSpecies, findSpecies } from '@/data/species';
import { nextId } from '../ids';
import { normalizeGenome, resolvePhenotype as resolvePhenotypeImpl, rollGenome as rollGenomeImpl, bandOf } from './genetics';
import { computePersonalityModifiers, rollPersonalityTags, PERSONALITY_INFO } from './personality';
import { generateName, takenNames, nameRngFor } from './names';
import { ageDaysOf, initialReproRole, lifeStageFor, observableSex, sizeAtAge } from './growth';
import { stepTankCreaturesImpl, lifeMeta } from './step';
import { buildTankEnv, habitatFit, livingIn, stressFactors, waterProblemText, type StressFactor } from './welfare';
import { illnessDef } from './illness';
import { residentsOf, touchResidents } from '../residents'; // lane:perf2

export interface CreateCreatureOptions {
  sex?: Sex;
  /** Age in game-days at creation (default: young adult). */
  ageDays?: number;
  name?: string;
  tankId?: string | null;
  captiveBred?: boolean;
  /** Force genome (offspring) or partial potentials. */
  genome?: Genome;
  potentialsBias?: number; // -1..1 skew (market tiers, rare stock)
  motherId?: string | null;
  fatherId?: string | null;
  generation?: number;
  lineId?: string;
  breederName?: string;
  isStarter?: boolean;
  purchasePrice?: number;
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);

/**
 * Create a creature WITHOUT inserting it into state.creatures (market offers hold unowned creatures).
 * Use `addCreature` to insert.
 */
export function createCreature(state: GameState, rng: Rng, speciesId: string, opts: CreateCreatureOptions = {}): Creature {
  const sp = getSpecies(speciesId);
  const hour = state.clock.hour;
  const ageDays = Math.max(0, Number.isFinite(opts.ageDays) ? (opts.ageDays as number) : sp.lifecycle.juvenileDays + 2);
  const genome = opts.genome ? normalizeGenome(sp, opts.genome) : rollGenomeImpl(sp, rng, opts.potentialsBias ?? 0);
  const patternSeed = rng.int(1, 0x7fffffff);
  const { visual, morphName } = resolvePhenotypeImpl(sp, genome, patternSeed);
  const role = initialReproRole(sp, opts.sex, ageDays, rng.next());
  const sex = observableSex(sp, role, ageDays);
  const sizeCm = clamp(sizeAtAge(sp, genome, ageDays) * (0.96 + rng.next() * 0.06), 0.05, sp.adultSizeCm * 1.3);
  const personality = rollPersonalityTags(sp, genome, rng);
  // lane:w2-sim — the id comes first so the name can be drawn from the creature's own generator (never the sim RNG):
  // names are cosmetic, and changing them must not shift the simulation. Sex-matched when the sex is visible.
  const id = nextId(state, 'cr');
  const name = (opts.name ?? '').trim().slice(0, 24) || generateName(sp, nameRngFor(state, id), takenNames(state), sex);
  const breederName = opts.breederName ?? (opts.motherId || opts.fatherId ? state.shopName || 'Your shop' : 'Captive-bred stock');
  const born = !!(opts.motherId || opts.fatherId);

  const history: Creature['history'] = [];
  if (born) {
    const mom = opts.motherId ? state.creatures[opts.motherId]?.name : undefined;
    const dad = opts.fatherId ? state.creatures[opts.fatherId]?.name : undefined;
    const parents = mom && dad ? ` to ${mom} and ${dad}` : mom ? ` to ${mom}` : dad ? ` to ${dad}` : '';
    history.push({ hour, kind: 'born', text: `Born in your care${parents}.` });
  } else {
    const origin = opts.captiveBred === false ? 'Wild-collected' : 'Captive-bred';
    const spName = sp.commonName.toLowerCase();
    history.push({ hour, kind: 'acquired', text: opts.breederName ? `${origin} ${spName} from ${opts.breederName}.` : `${origin} ${spName}, raised by a hobby breeder.` });
  }
  for (const m of genome.mutations ?? []) {
    const locus = sp.genetics.loci.find((l) => l.id === m.locusId);
    const from = locus?.alleles.find((a) => a.id === m.from)?.name ?? m.from;
    const to = locus?.alleles.find((a) => a.id === m.to)?.name ?? m.to;
    history.push({ hour, kind: 'milestone', text: `Carries a spontaneous mutation: ${from} → ${to}${locus ? ` (${locus.name})` : ''}. A rare surprise!` });
  }

  const creature: Creature = {
    id,
    speciesId,
    name,
    sex,
    reproRole: role,
    bornHour: hour - ageDays * 24,
    lifeStage: lifeStageFor(sp, ageDays),
    sizeCm,
    tankId: opts.tankId ?? null,
    genome,
    appearance: visual,
    morphName,
    personality,
    stats: { health: 100, hunger: 25, stress: 18, energy: 80, social: 70, comfort: 75, breedingReadiness: 0, enrichment: 55 },
    repro: { stage: 'idle', stageSinceHour: hour, totalClutches: 0, totalOffspringRaised: 0 },
    lineage: {
      motherId: opts.motherId ?? null,
      fatherId: opts.fatherId ?? null,
      generation: opts.generation ?? 0,
      lineId: opts.lineId ?? `${speciesId}-market`,
      breederName,
    },
    captiveBred: opts.captiveBred ?? true,
    acquiredHour: hour,
    purchasePrice: opts.purchasePrice ?? 0,
    status: 'alive',
    history,
    visitorWows: 0,
    geneticsRevealed: 0,
    isStarter: opts.isStarter,
    life: opts.isStarter ? { bond: 25 } : {},
  };
  return creature;
}

/** Insert a creature into state (and its tank). */
export function addCreature(state: GameState, c: Creature, tankId: string | null): Creature {
  if (!state.creatures[c.id]) c.acquiredHour = Math.max(c.acquiredHour ?? state.clock.hour, state.clock.hour);
  c.tankId = tankId;
  state.creatures[c.id] = c;
  touchResidents(); // lane:perf2 — a new resident: drop the step's residents index
  return c;
}

/** Record a creature's species + morph in the encyclopedia progress (deduped). Call when buying/birthing. */
export function registerDiscovery(state: GameState, c: Creature): void {
  const p = state.progress;
  if (!p.discoveredSpecies.includes(c.speciesId)) p.discoveredSpecies.push(c.speciesId);
  const key = `${c.speciesId}:${c.morphName}`;
  if (!p.discoveredMorphs.includes(key)) p.discoveredMorphs.push(key);
}

/** Resolve appearance from genome (+ per-individual variation). */
export function resolveAppearance(species: SpeciesDefinition, genome: Genome, patternSeed: number): { visual: CreatureVisualParams; morphName: string } {
  const r = resolvePhenotypeImpl(species, genome, patternSeed);
  return { visual: r.visual, morphName: r.morphName };
}

/** Roll 1–3 species-appropriate personality tags. */
export function rollPersonality(species: SpeciesDefinition, genome: Genome, rng: Rng): PersonalityTag[] {
  return rollPersonalityTags(species, genome, rng);
}

/** Metabolism, feeding from the water column, waste, welfare, health, growth, ageing, death, incidents. */
export function stepTankCreatures(state: GameState, tank: Tank, dt: number, ctx: SimContext): void {
  stepTankCreaturesImpl(state, tank, dt, ctx);
}

/** Living creatures in a tank. */
export function creaturesInTank(state: GameState, tankId: string): Creature[] {
  return residentsOf(state, tankId); // lane:perf2 — per-step index inside a sim step, a plain scan outside (same result)
}

export function clutchesInTank(state: GameState, tankId: string): Clutch[] {
  return Object.values(state.clutches).filter((c) => c.tankId === tankId);
}

/** Human-readable potential band. */
export function potentialBand(v: number): 'Ordinary' | 'Promising' | 'Exceptional' | 'Remarkable' {
  return bandOf(v);
}

export { stepTankBreeding, breedingCheck, breedingStatus } from './breeding';
export { rollGenome, inheritGenome, resolvePhenotype, describeGenetics, predictOffspringMorphs, morphDisplayName, describeLocus, hiddenAlleles, structureLabel, temperamentWord, curiosityWord } from './genetics';
export { PERSONALITY_INFO, allowedTags as allowedPersonalityTags } from './personality';
export { generateName, suggestNames, nameMoodsFor } from './names';
export { ageDaysOf, lifeStageFor, sizeAtAge, adultSizeFor, sizePotentialFactor, gallonsNeededNow } from './growth';
export { appetiteOf, breedingReadinessTarget, pushHistory, killCreature, HUNGER_PER_HUNGER_HOURS, CONDITIONING_TAGS } from './step';
export { ILLNESSES, illnessDef } from './illness';
export { stressFactors, habitatFit, speciesWaterView } from './welfare';

/** Behaviour modifiers derived from personality + potentials (0..1). The AI lane consumes these. */
export interface PersonalityModifiers {
  boldness: number;
  curiosity: number;
  activity: number;
  sociability: number;
  feedingDrive: number;
  startle: number;
  nocturnal: number;
  displayDrive: number;
}

export function personalityModifiers(c: Creature): PersonalityModifiers {
  return computePersonalityModifiers(c);
}

/** One-line personality description for cards: "Bold · Glass Curious — comes to the front glass to watch you." */
export function describePersonality(c: Creature): string {
  const tags = c.personality ?? [];
  if (!tags.length) return '';
  const labels = tags.map((t) => PERSONALITY_INFO[t]?.label ?? t).join(' · ');
  const blurb = PERSONALITY_INFO[tags[0]]?.blurb ?? '';
  return blurb ? `${labels} — ${blurb.charAt(0).toLowerCase()}${blurb.slice(1)}` : labels;
}

export interface CreatureWellbeing {
  status: 'good' | 'watch' | 'danger';
  /** "Thriving", "Very hungry", "Water too warm"… */
  headline: string;
  /** Plain-language notes, most important first (each ends with advice when there is some). */
  notes: string[];
  stress: StressFactor[];
}

/** Plain-language welfare summary for creature cards (GOOD / WATCH / DANGER + why + what to do). */
export function creatureWellbeing(state: GameState, c: Creature): CreatureWellbeing {
  const sp = findSpecies(c.speciesId);
  if (c.status === 'dead') return { status: 'danger', headline: 'Passed away', notes: c.deathCause ? [c.deathCause] : [], stress: [] };
  if (!sp) return { status: 'watch', headline: 'Unknown species', notes: [], stress: [] };
  const s = c.stats;
  const notes: string[] = [];
  let danger = false;
  let watch = false;
  const tank = c.tankId ? state.tanks[c.tankId] : undefined;
  let factors: StressFactor[] = [];
  if (tank) {
    const env = buildTankEnv(state, tank, livingIn(state, tank.id), state.clock.hour);
    const wv = env.water.get(sp.id);
    const problem = wv && wv.harm > 0.05 ? waterProblemText(wv, c.name) : null;
    if (problem) {
      notes.push(problem);
      danger = true;
    }
    factors = stressFactors(state, env, c, sp, state.clock.hour).filter((f) => f.amount >= 5);
    const fit = habitatFit(env, sp, env.groups.get(sp.id)?.n ?? 1);
    for (const n of fit.notes.slice(0, 2)) notes.push(`Habitat: ${n}.`);
  }
  if (s.hunger >= 90) {
    notes.unshift('Starving — feed right away.');
    danger = true;
  } else if (s.hunger >= 70) {
    // lane:qa-play — ahead of the habitat notes (after a water danger): hunger is the fix to make right now, and the
    // card's headline is the first note ("Watch · Habitat" read oddly beside a nearly empty hunger bar).
    notes.splice(danger ? 1 : 0, 0, 'Very hungry — time to feed.');
    watch = true;
  } else if (s.hunger >= 55) notes.push('Getting peckish.');
  if (c.illness) {
    const def = illnessDef(c.illness.kind);
    if (def) notes.unshift(`Ill with ${def.name(sp)}: ${def.symptom} ${def.cure(sp)}`);
    if (c.illness.severity > 60) danger = true;
    else watch = true;
  }
  if ((c.life?.injury ?? 0) > 20) {
    notes.push('Healing from injuries — check for aggressive or nipping tank mates.');
    watch = true;
  }
  if (s.stress > 55 && factors.length) {
    notes.push(`Stressed — mainly ${factors[0].label}.`);
    watch = true;
    if (s.stress > 80) danger = true;
  }
  if (s.health < 40) danger = true;
  else if (s.health < 75) watch = true;
  const status: CreatureWellbeing['status'] = danger ? 'danger' : watch ? 'watch' : 'good';
  let headline: string;
  if (status === 'good') headline = s.stress < 25 && s.enrichment > 55 && s.comfort > 75 ? 'Thriving' : 'Doing well';
  // First clause of the first note; split on sentence ends only, so decimals ("1.35 ppm") survive.
  else headline = (notes[0] ?? (status === 'danger' ? 'Needs help' : 'Keep an eye on this one')).split(/\.(?=\s|$)|[:—]/)[0].trim();
  return { status, headline, notes, stress: factors };
}

/** Age in game days (UI helper). */
export function creatureAge(state: GameState, c: Creature): number {
  return ageDaysOf(c, state.clock.hour);
}

/** Internal: ensure a creature has the lifecycle bookkeeping object (for other lanes that add bumps). */
export function ensureLifeMeta(c: Creature): NonNullable<Creature['life']> {
  return lifeMeta(c);
}
