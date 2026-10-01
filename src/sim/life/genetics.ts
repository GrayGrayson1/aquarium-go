/**
 * Genetics: genome rolls, Mendelian inheritance, phenotype/appearance resolution, genetics disclosure.
 * OWNER: lane "lifecycle". Signatures of rollGenome / inheritGenome / resolvePhenotype / describeGenetics are
 * contracts (breeding lane + UI call them).
 *
 * Model (simplified, labelled as such in species data):
 *  - Each locus carries two alleles drawn from market frequencies.
 *  - Locus modes:
 *      mendelian  — a dominance ladder: the allele with the highest `dominance` present is expressed; lower ones are
 *                   carried hidden ("het"). An `any` rule condition only matches when that allele is actually expressed.
 *      codominant — every copy counts (one copy = Snowflake, two copies = Platinum).
 *      additive   — copies add up: a `hom` rule is fully expressed with two copies and half-expressed with one
 *                   (visual blend, no name), giving natural intermediates.
 *  - Phenotype rules: the first matching `base` rule wins; then every matching `overlay` applies in order.
 *  - Potentials (0..100) are heritable quantitative traits: offspring = mid-parent (slight regression to the mean)
 *    + noise. Rare spontaneous mutations switch one allele to another allele of the same locus and are flagged.
 */
import type { Genome, SpeciesDefinition, CreatureVisualParams, Potentials, LocusDefinition, PhenotypeRule } from '@/types';
import type { Rng } from '../rng';
import { mulberry32 } from '../rng';
import { adjustHex, isHexColor, mixHex } from './color';
import { morphTitle } from '../economy/util';

// ───────────────────────────────── constants ─────────────────────────────────

export const POTENTIAL_KEYS: (keyof Potentials)[] = ['size', 'color', 'pattern', 'structure', 'fertility', 'hardiness', 'temperament', 'curiosity'];
/** Quality-like potentials (market stock bias applies). */
export const QUALITY_KEYS: (keyof Potentials)[] = ['size', 'color', 'pattern', 'structure', 'fertility', 'hardiness'];
/** Behavioural tendencies (no "better" direction; never biased by stock tier). */
export const TENDENCY_KEYS: (keyof Potentials)[] = ['temperament', 'curiosity'];

/** Chance per locus per offspring of a spontaneous allele switch. */
export const MUTATION_RATE_PER_LOCUS = 0.004;

export type PotentialBand = 'Ordinary' | 'Promising' | 'Exceptional' | 'Remarkable';

export function bandOf(v: number): PotentialBand {
  if (v >= 90) return 'Remarkable';
  if (v >= 75) return 'Exceptional';
  if (v >= 55) return 'Promising';
  return 'Ordinary';
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);
const clampP = (v: number, lo = 0, hi = 100) => Math.round(clamp(v, lo, hi));

// ───────────────────────────────── genotype helpers ─────────────────────────────────

export function mostCommonAllele(locus: LocusDefinition): string {
  let best = locus.alleles[0];
  for (const a of locus.alleles) if (a.frequency > best.frequency) best = a;
  return best?.id ?? '?';
}

/** The allele pair for a locus, repairing missing/unknown alleles with the most common allele. */
export function allelePair(locus: LocusDefinition, genome: Genome): [string, string] {
  const raw = genome.alleles?.[locus.id];
  const fallback = mostCommonAllele(locus);
  const valid = (id: string | undefined) => (id && locus.alleles.some((a) => a.id === id) ? id : fallback);
  return [valid(raw?.[0]), valid(raw?.[1])];
}

function alleleDef(locus: LocusDefinition, id: string) {
  return locus.alleles.find((a) => a.id === id);
}

function dominanceOf(locus: LocusDefinition, id: string): number {
  return alleleDef(locus, id)?.dominance ?? 0;
}

/** Alleles that show in the phenotype (mendelian: the top of the dominance ladder; otherwise every allele present). */
export function expressedAlleles(locus: LocusDefinition, pair: [string, string]): string[] {
  if (locus.mode !== 'mendelian') return pair[0] === pair[1] ? [pair[0]] : [pair[0], pair[1]];
  const d0 = dominanceOf(locus, pair[0]);
  const d1 = dominanceOf(locus, pair[1]);
  if (pair[0] === pair[1] || d0 === d1) return pair[0] === pair[1] ? [pair[0]] : [pair[0], pair[1]];
  return [d0 > d1 ? pair[0] : pair[1]];
}

/** Recessive alleles carried but not shown (mendelian loci only). */
export function hiddenAlleles(species: SpeciesDefinition, genome: Genome): { locus: LocusDefinition; allele: string }[] {
  const out: { locus: LocusDefinition; allele: string }[] = [];
  for (const locus of species.genetics.loci) {
    if (locus.mode !== 'mendelian') continue;
    const pair = allelePair(locus, genome);
    const shown = expressedAlleles(locus, pair);
    for (const a of new Set(pair)) if (!shown.includes(a)) out.push({ locus, allele: a });
  }
  return out;
}

/** Fill missing loci / invalid alleles / broken potentials. Returns a NEW genome (never mutates the input). */
export function normalizeGenome(species: SpeciesDefinition, genome: Genome | undefined): Genome {
  const alleles: Genome['alleles'] = {};
  const src: Genome = genome ?? { alleles: {}, potentials: {} as Potentials };
  for (const locus of species.genetics.loci) alleles[locus.id] = allelePair(locus, src);
  const potentials = {} as Potentials;
  for (const k of POTENTIAL_KEYS) {
    const v = src.potentials?.[k];
    potentials[k] = typeof v === 'number' && Number.isFinite(v) ? clampP(v) : 50;
  }
  const out: Genome = { alleles, potentials };
  if (src.mutations?.length) out.mutations = src.mutations.map((m) => ({ ...m }));
  return out;
}

// ───────────────────────────────── rolls & inheritance ─────────────────────────────────

/** Roll a market-stock genome using locus allele frequencies; `bias` (-1..1) skews quality potentials. */
export function rollGenome(species: SpeciesDefinition, rng: Rng, bias = 0): Genome {
  const b = clamp(bias, -1, 1);
  const alleles: Genome['alleles'] = {};
  for (const locus of species.genetics.loci) {
    const draw = () => (locus.alleles.length ? rng.weighted(locus.alleles, (a) => a.frequency).id : '?');
    alleles[locus.id] = [draw(), draw()];
  }
  const potentials = {} as Potentials;
  for (const k of QUALITY_KEYS) potentials[k] = clampP(50 + b * 18 + rng.gauss() * 14, 1, 99);
  for (const k of TENDENCY_KEYS) potentials[k] = clampP(50 + rng.gauss() * 20, 2, 98);
  // Most individuals have one thing that stands out — that is what makes them "someone".
  if (rng.chance(0.3 + 0.25 * Math.max(0, b))) {
    const k = rng.pick(QUALITY_KEYS);
    potentials[k] = clampP(potentials[k] + rng.range(10, 25), 1, 99);
  }
  return { alleles, potentials };
}

/** Offspring genome: one allele from each parent per locus; potentials = mid-parent + noise (+ rare mutation). */
export function inheritGenome(species: SpeciesDefinition, mother: Genome, father: Genome, rng: Rng): Genome {
  const alleles: Genome['alleles'] = {};
  const mutations: NonNullable<Genome['mutations']> = [];
  for (const locus of species.genetics.loci) {
    const m = allelePair(locus, mother);
    const f = allelePair(locus, father);
    const pair: [string, string] = [m[rng.next() < 0.5 ? 0 : 1], f[rng.next() < 0.5 ? 0 : 1]];
    if (locus.alleles.length > 1 && rng.chance(MUTATION_RATE_PER_LOCUS)) {
      const slot = rng.next() < 0.5 ? 0 : 1;
      const from = pair[slot];
      const parental = new Set([...m, ...f]);
      // Plausible only: never conjure a fictional allele neither parent carries.
      const candidates = locus.alleles.filter((a) => a.id !== from && (!a.fictional || parental.has(a.id)));
      if (candidates.length) {
        const to = rng.weighted(candidates, (a) => a.frequency + 0.02).id;
        pair[slot] = to;
        mutations.push({ locusId: locus.id, from, to });
      }
    }
    alleles[locus.id] = pair;
  }
  const potentials = {} as Potentials;
  const mp = normalizeGenome(species, mother).potentials;
  const fp = normalizeGenome(species, father).potentials;
  for (const k of POTENTIAL_KEYS) {
    const mid = (mp[k] + fp[k]) / 2;
    const tendency = TENDENCY_KEYS.includes(k);
    // Slight regression toward the population mean + Mendelian sampling noise.
    const v = mid + (50 - mid) * 0.12 + rng.gauss() * (tendency ? 10 : 7);
    potentials[k] = clampP(v);
  }
  const out: Genome = { alleles, potentials };
  if (mutations.length) out.mutations = mutations;
  return out;
}

// ───────────────────────────────── phenotype ─────────────────────────────────

/** 1 = rule fully matches, 0.5 = half-expressed (additive heterozygote), 0 = no match. */
export function ruleMatch(species: SpeciesDefinition, genome: Genome, rule: PhenotypeRule): number {
  if (!rule.when.length) return 1;
  let partial = false;
  for (const cond of rule.when) {
    const locus = species.genetics.loci.find((l) => l.id === cond.locus);
    if (!locus) return 0;
    const pair = allelePair(locus, genome);
    const n = (pair[0] === cond.allele ? 1 : 0) + (pair[1] === cond.allele ? 1 : 0);
    let ok: boolean;
    switch (cond.count) {
      case 'hom':
        ok = n === 2;
        break;
      case 'het':
        ok = n === 1;
        break;
      case 'none':
        ok = n === 0;
        break;
      default:
        ok = n >= 1 && (locus.mode !== 'mendelian' || expressedAlleles(locus, pair).includes(cond.allele));
    }
    if (!ok) {
      if (locus.mode === 'additive' && cond.count === 'hom' && n === 1) partial = true;
      else return 0;
    }
  }
  return partial ? 0.5 : 1;
}

type VisualRecord = Record<string, unknown>;

function applyVisual(target: CreatureVisualParams, patch: Partial<CreatureVisualParams>, weight: number): void {
  const t = target as unknown as VisualRecord;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (weight >= 1) {
      t[k] = v;
      continue;
    }
    const cur = t[k];
    if (isHexColor(v) && isHexColor(cur)) t[k] = mixHex(cur, v, weight);
    else if (typeof v === 'number' && typeof cur === 'number') t[k] = cur + (v - cur) * weight;
    // Discrete fields (pattern kind, fin type) only change with full expression.
  }
}

function speciesNounWords(species: SpeciesDefinition): Set<string> {
  return new Set(species.commonName.toLowerCase().split(/[\s'-]+/).filter(Boolean));
}

/** Readable morph names: "Royal Blue Butterfly Halfmoon", "Golden Albino", "Orange Misbar Ocellaris", "Snowflake". */
export function composeMorphName(species: SpeciesDefinition, base: PhenotypeRule | null, overlays: PhenotypeRule[]): string {
  let baseName = base?.name ?? 'Wild Type';
  const overlayNames: string[] = [];
  for (const o of overlays) if (!overlayNames.includes(o.name)) overlayNames.push(o.name);
  if (!overlayNames.length) return baseName;
  const catchAll = !base || base.when.length === 0;
  if (catchAll) {
    if (/^wild[\s-]?type$/i.test(baseName.trim())) baseName = '';
    baseName = baseName.replace(/^classic\s+/i, '');
  }
  let words: string[];
  const baseWords = baseName.split(/\s+/).filter(Boolean);
  const nouns = speciesNounWords(species);
  // Single-token overlays slot in before the species noun ("Orange Ocellaris" + "Misbar" → "Orange Misbar Ocellaris");
  // descriptive ones ("Richly coloured", "Long-fin (Meteor)") read as a prefix instead of splitting the base name
  // ("Richly coloured Skunk Cleaner", never "Skunk Richly coloured Cleaner").
  const simpleOverlays = overlayNames.every((n) => !/[\s()]/.test(n));
  if (baseWords.length > 1 && nouns.has(baseWords[baseWords.length - 1].toLowerCase())) {
    words = simpleOverlays ? [...baseWords.slice(0, -1), ...overlayNames, baseWords[baseWords.length - 1]] : [...overlayNames.join(' ').split(/\s+/), ...baseWords];
  } else {
    words = [...baseWords, ...overlayNames.join(' ').split(/\s+/)];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const key = w.toLowerCase();
    if (!w || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out.join(' ') || 'Wild Type';
}

/**
 * Species + morph for listings and cards, without repeated words:
 * "Golden Albino Axolotl", "Orange Ocellaris Clownfish", "Royal Blue Butterfly Halfmoon Betta", "Axolotl" (wild type).
 */
export function morphDisplayName(species: SpeciesDefinition, morphName: string): string {
  const common = species.commonName;
  if (!morphName || /^wild[\s-]?type$/i.test(morphName.trim())) return common;
  // One shared formatter (market labels use it too): merges overlapping words and never repeats the species name
  // ("Peppermint Richly coloured" → "Richly coloured Peppermint Shrimp", "Red Honey (Sunset)" → "Red Honey Gourami (Sunset)").
  return morphTitle(morphName, common);
}

/** Morph + genetic (pre-individual-variation) visual. */
export function resolveMorph(species: SpeciesDefinition, genome: Genome): { visual: CreatureVisualParams; morphName: string; rarity: number; baseId: string | null; overlayIds: string[] } {
  const g = normalizeGenome(species, genome);
  const visual: CreatureVisualParams = { ...species.genetics.baseVisual };
  const rules = species.genetics.phenotypes;
  let base: PhenotypeRule | null = null;
  const partialBases: PhenotypeRule[] = [];
  for (const r of rules) {
    if (r.layer !== 'base') continue;
    const w = ruleMatch(species, g, r);
    if (w >= 1) {
      base = r;
      break;
    }
    if (w > 0) partialBases.push(r);
  }
  if (base) applyVisual(visual, base.visual, 1);
  for (const pb of partialBases) applyVisual(visual, pb.visual, 0.5);
  const overlays: PhenotypeRule[] = [];
  for (const r of rules) {
    if (r.layer !== 'overlay') continue;
    const w = ruleMatch(species, g, r);
    if (w >= 1) {
      applyVisual(visual, r.visual, 1);
      overlays.push(r);
    } else if (w > 0) applyVisual(visual, r.visual, 0.5);
  }
  let keep = 1 - clamp(base?.rarity ?? 0, 0, 1);
  for (const o of overlays) keep *= 1 - clamp(o.rarity, 0, 1);
  return { visual, morphName: composeMorphName(species, base, overlays), rarity: clamp(1 - keep, 0, 1), baseId: base?.id ?? null, overlayIds: overlays.map((o) => o.id) };
}

/**
 * Per-individual variation on top of the genetic morph. Deterministic from `patternSeed`.
 * Colour potential → richer saturation/iridescence; pattern potential → contrast/regularity;
 * structure potential → fin length / gill fullness / body depth within species-plausible limits.
 */
export function applyIndividualVariation(species: SpeciesDefinition, genome: Genome, visual: CreatureVisualParams, patternSeed: number): CreatureVisualParams {
  const v: CreatureVisualParams = { ...visual };
  const base = species.genetics.baseVisual;
  const r = mulberry32((patternSeed ^ 0x2c1b3c6d) >>> 0);
  const variation = clamp(species.genetics.variation, 0, 1);
  const pot = genome.potentials;
  const pc = clamp((pot?.color ?? 50) / 100, 0, 1);
  const pp = clamp((pot?.pattern ?? 50) / 100, 0, 1);
  const ps = clamp((pot?.structure ?? 50) / 100, 0, 1);

  const hueShared = r.gauss() * variation * 7;
  const lightShared = r.gauss() * variation * 0.045;
  const richness = 0.8 + 0.4 * pc;
  const rec = v as unknown as VisualRecord;
  for (const k of ['bodyColor', 'bodyColor2', 'bellyColor', 'finColor', 'finColor2', 'accentColor', 'gillColor'] as const) {
    const cur = rec[k];
    if (!isHexColor(cur)) continue;
    rec[k] = adjustHex(cur, hueShared + r.gauss() * variation * 2.5, richness * (1 + r.gauss() * variation * 0.06), lightShared + r.gauss() * variation * 0.015);
  }
  if (isHexColor(v.eyeColor)) v.eyeColor = adjustHex(v.eyeColor, r.gauss() * 3, 1, r.gauss() * 0.02);

  v.iridescence = clamp(v.iridescence * (0.7 + 0.6 * pc) + r.gauss() * 0.03, 0, 1);
  v.metallic = clamp(v.metallic * (0.85 + 0.3 * pc), 0, 1);
  v.translucency = clamp(v.translucency + r.gauss() * 0.02, 0, 1);
  v.patternContrast = clamp(v.patternContrast * (0.72 + 0.5 * pp) + r.gauss() * variation * 0.04, 0, 1);
  v.patternScale = clamp(v.patternScale * (1 + r.gauss() * variation * 0.15), 0.5, 2);
  v.patternRegularity = clamp(0.3 + 0.65 * pp + r.gauss() * 0.05, 0, 1);

  const fl = v.finLength;
  v.finLength = clamp(fl * (0.9 + 0.2 * ps + r.gauss() * 0.025), Math.max(0.6, fl * 0.85), Math.min(1.6, fl * 1.15));
  v.bodyDepth = clamp(v.bodyDepth * (0.96 + 0.08 * ps + r.gauss() * 0.02), 0.85, 1.15);
  if (v.gillFullness > 0 || base.gillFullness > 0) {
    v.gillFullness = clamp(v.gillFullness * (0.78 + 0.44 * ps + r.gauss() * 0.03), 0, 1.5);
  }
  v.patternSeed = patternSeed >>> 0;
  return v;
}

export function resolvePhenotype(species: SpeciesDefinition, genome: Genome, patternSeed: number): { visual: CreatureVisualParams; morphName: string; rarity: number } {
  const g = normalizeGenome(species, genome);
  const m = resolveMorph(species, g);
  return { visual: applyIndividualVariation(species, g, m.visual, patternSeed), morphName: m.morphName, rarity: m.rarity };
}

/**
 * Expected offspring morphs of a pairing (exact Mendelian enumeration over all loci; mutations ignored).
 * Sorted by chance, highest first. Useful for breeding previews ("25% Leucistic").
 */
export function predictOffspringMorphs(species: SpeciesDefinition, mother: Genome, father: Genome): { morphName: string; chance: number }[] {
  const loci = species.genetics.loci;
  // Per locus, the distinct unordered allele pairs a child can inherit, each with its weight (¼ per ordered combo).
  // Rule matching only counts alleles, so order never matters: at most 3 states per locus instead of 4, and a
  // shared homozygous locus collapses to one — a 7-locus medaka cross stays well within the cap.
  const options = loci.map((locus) => {
    const m = allelePair(locus, mother);
    const f = allelePair(locus, father);
    const states = new Map<string, { pair: [string, string]; weight: number }>();
    for (const a of m) {
      for (const b of f) {
        const pair: [string, string] = a <= b ? [a, b] : [b, a];
        const key = `${pair[0]}|${pair[1]}`;
        const cur = states.get(key);
        if (cur) cur.weight += 0.25;
        else states.set(key, { pair, weight: 0.25 });
      }
    }
    return [...states.values()];
  });
  const tally = new Map<string, number>();
  const pots = normalizeGenome(species, mother).potentials;
  const MAX_COMBOS = 4096;
  const total = options.reduce((n, o) => n * o.length, 1);
  if (total > MAX_COMBOS) return [{ morphName: resolveMorph(species, mother).morphName, chance: 1 }];
  const idx = new Array(loci.length).fill(0);
  for (let n = 0; n < total; n++) {
    let rem = n;
    let weight = 1;
    const alleles: Genome['alleles'] = {};
    for (let i = 0; i < loci.length; i++) {
      const opts = options[i];
      idx[i] = rem % opts.length;
      rem = Math.floor(rem / opts.length);
      const st = opts[idx[i]];
      alleles[loci[i].id] = st.pair;
      weight *= st.weight;
    }
    const name = resolveMorph(species, { alleles, potentials: pots }).morphName;
    tally.set(name, (tally.get(name) ?? 0) + weight);
  }
  return [...tally.entries()].map(([morphName, chance]) => ({ morphName, chance })).sort((a, b) => b.chance - a.chance);
}

// ───────────────────────────────── disclosure ─────────────────────────────────

export function structureLabel(species: SpeciesDefinition): string {
  if (species.genetics.baseVisual.gillFullness > 0) return 'Gill fullness';
  if (species.hasLongFins) return 'Finnage';
  if (species.category === 'invertebrate') return 'Shell & form';
  if (species.category === 'coral' || species.category === 'anemone') return 'Growth form';
  return 'Body form';
}

export function temperamentWord(v: number): string {
  if (v < 20) return 'Very shy';
  if (v < 40) return 'Shy';
  if (v < 60) return 'Even-tempered';
  if (v < 80) return 'Bold';
  return 'Very bold';
}

export function curiosityWord(v: number): string {
  if (v < 25) return 'Reserved';
  if (v < 50) return 'Mildly curious';
  if (v < 75) return 'Curious';
  return 'Very curious';
}

function alleleName(locus: LocusDefinition, id: string): string {
  return alleleDef(locus, id)?.name ?? id;
}

/** Plain-language genotype for one locus, e.g. "Pigmented · carries leucistic (het)". */
export function describeLocus(locus: LocusDefinition, pair: [string, string]): string {
  const [a, b] = pair;
  const na = alleleName(locus, a);
  const nb = alleleName(locus, b);
  if (locus.mode === 'mendelian') {
    if (a === b) return `${na} (homozygous)`;
    const shown = expressedAlleles(locus, pair);
    if (shown.length === 2) return `${na} / ${nb} (both expressed)`;
    const hidden = shown[0] === a ? nb : na;
    return `${alleleName(locus, shown[0])} · carries ${hidden.toLowerCase()} (het)`;
  }
  if (locus.mode === 'codominant') {
    if (a === b) return `${na} ×2 (homozygous)`;
    return `${na} / ${nb} (het — one copy each)`;
  }
  if (a === b) return `${na} ×2 (full expression)`;
  return `${na} + ${nb} (intermediate)`;
}

/** What the player can see about genetics at a reveal level (0 = bands only, 1 = full alleles). */
export function describeGenetics(species: SpeciesDefinition, genome: Genome, revealLevel: number): { label: string; value: string }[] {
  const g = normalizeGenome(species, genome);
  const level = clamp(revealLevel ?? 0, 0, 1);
  const exact = level >= 1;
  const p = g.potentials;
  const q = (v: number) => (exact ? `${bandOf(v)} · ${Math.round(v)}` : bandOf(v));
  const rows: { label: string; value: string }[] = [
    { label: 'Morph', value: resolveMorph(species, g).morphName },
    { label: 'Size', value: q(p.size) },
    { label: 'Colour', value: q(p.color) },
    { label: 'Pattern', value: q(p.pattern) },
    { label: structureLabel(species), value: q(p.structure) },
    { label: 'Fertility', value: q(p.fertility) },
    { label: 'Hardiness', value: q(p.hardiness) },
    { label: 'Temperament', value: exact ? `${temperamentWord(p.temperament)} · ${p.temperament}` : temperamentWord(p.temperament) },
    { label: 'Curiosity', value: exact ? `${curiosityWord(p.curiosity)} · ${p.curiosity}` : curiosityWord(p.curiosity) },
  ];
  if (level >= 0.5 && !exact) {
    const hidden = hiddenAlleles(species, g);
    rows.push({ label: 'Hidden genes', value: hidden.length ? 'Carries at least one hidden trait' : 'No hidden traits detected' });
  }
  if (exact) {
    for (const locus of species.genetics.loci) rows.push({ label: locus.name, value: describeLocus(locus, allelePair(locus, g)) });
    if (g.mutations?.length) {
      for (const m of g.mutations) {
        const locus = species.genetics.loci.find((l) => l.id === m.locusId);
        if (locus) rows.push({ label: 'Spontaneous mutation', value: `${alleleName(locus, m.from)} → ${alleleName(locus, m.to)} (${locus.name})` });
      }
    }
  }
  return rows;
}
