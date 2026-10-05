/**
 * Morph catalog + named strains. OWNER: lane "genetics".
 *
 * Both are DERIVED from a species' existing genetics — there is no second inheritance model here:
 *  - a phenotype is the rule set the existing expression layer selects (genetics.matchRules: one base + its overlays);
 *  - the catalog enumerates every genotype with Hardy–Weinberg weights from the allele `frequency` values (exactly what
 *    rollGenome draws for market stock) and groups them by phenotype → every reachable morph, how often sellers stock
 *    it, and its tier. Grouped by base colour it is the "colour tree"; each overlay combination hangs off its base.
 *  - named strains (species data `genetics.strains`) are recipes over rule ids (requires / excludes), so they are
 *    order-independent and match whatever the genetics express. validateStrains keeps the recipes honest.
 * Everything here is pure (no RNG, no state) and cached per species.
 */
import type { Genome, MorphStrain, PhenotypeRule, Potentials, Rarity, SpeciesDefinition, LocusDefinition } from '@/types';
import { MORPH_TIER_MIN_SHARE, RARITY_TIERS } from '@/data/rarity';
import { composeMorphName, matchRules, normalizeGenome, predictOffspringPhenotypes, ruleMatch, selectRules, type RuleMatches } from './genetics';
import { mulberry32, hashString } from '../rng';

// ───────────────────────────── tiers ─────────────────────────────

/** Tier for a share (0..1) of market stock. */
export function tierForShare(share: number): Rarity {
  for (const [tier, min] of MORPH_TIER_MIN_SHARE) if (share >= min) return tier;
  return 'legendary';
}

/** 0 = common … 4 = legendary. */
export function tierRank(t: Rarity | undefined): number {
  const i = t ? RARITY_TIERS.indexOf(t) : -1;
  return i < 0 ? 0 : i;
}

// ───────────────────────────── catalog ─────────────────────────────

/** One expressed phenotype: a rule set and how often market stock shows it. */
export interface CatalogPhenotype {
  key: string;
  baseId: string | null;
  overlayIds: string[];
  /** Base first (when any), then overlays in rule order. */
  ruleIds: string[];
  morphName: string;
  /** Share of market stock (0..1). */
  frequency: number;
}

/** One morph (by composed name — the name the encyclopedia and discoveries use). */
export interface CatalogEntry {
  morphName: string;
  /** Colour-tree group: the base rule's name. */
  group: string;
  /** Rule ids this morph shows (base first) — for recipe hints. */
  traitIds: string[];
  phenotypes: CatalogPhenotype[];
  frequency: number;
  tier: Rarity;
  /** Named strains this morph satisfies, primary first. */
  strains: MorphStrain[];
}

export interface CatalogGroup {
  name: string;
  baseId: string | null;
  frequency: number;
  entries: CatalogEntry[];
}

export interface MorphCatalog {
  speciesId: string;
  /** Every reachable morph: groups in base-rule order, most common first within a group. */
  entries: CatalogEntry[];
  groups: CatalogGroup[];
  byName: ReadonlyMap<string, CatalogEntry>;
  phenotypes: CatalogPhenotype[];
  /** Derived tier of every named strain (its explicit `tier` wins when set). */
  strainTiers: ReadonlyMap<string, Rarity>;
  /** Exact enumeration (true), or a seeded sample for an unusually large genotype space (false). */
  exact: boolean;
}

/** Largest genotype space enumerated exactly (fancy guppy, the biggest today, is ~66k). */
const MAX_EXACT_GENOTYPES = 400_000;
const SAMPLE_GENOTYPES = 60_000;
const NEUTRAL: Potentials = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };

/** Unordered allele pairs of a locus with their Hardy–Weinberg probability from market frequencies. */
function locusStates(locus: LocusDefinition): { pair: [string, string]; p: number }[] {
  const al = locus.alleles;
  if (!al.length) return [{ pair: ['?', '?'], p: 1 }];
  const w = al.map((a) => Math.max(0, a.frequency));
  let total = w.reduce((s, x) => s + x, 0);
  if (!(total > 0)) {
    w.fill(1);
    total = w.length;
  }
  const out: { pair: [string, string]; p: number }[] = [];
  for (let i = 0; i < al.length; i++) {
    for (let j = i; j < al.length; j++) {
      const p = ((w[i] / total) * (w[j] / total)) * (i === j ? 1 : 2);
      if (p > 0) out.push({ pair: [al[i].id, al[j].id], p });
    }
  }
  return out;
}

const CATALOGS = new Map<string, MorphCatalog>();

/** The species' full morph catalog (cached; computed on first use). */
export function morphCatalog(species: SpeciesDefinition): MorphCatalog {
  const hit = CATALOGS.get(species.id);
  if (hit) return hit;
  const built = buildCatalog(species);
  CATALOGS.set(species.id, built);
  return built;
}

/**
 * Per-rule scorers over locus-state indices. Each condition's truth table is computed by ruleMatch ITSELF on that one
 * condition (it only reads its own locus), and a rule's score is the minimum over its conditions — exactly how
 * ruleMatch combines them (any miss → 0, else any half → 0.5, else 1). So the catalog selects rules identically to
 * matchRules without re-running the full matcher for each of up to ~66k genotypes.
 */
function ruleScorer(species: SpeciesDefinition, states: { pair: [string, string] }[][]): (idx: readonly number[]) => (rule: PhenotypeRule) => number {
  const loci = species.genetics.loci;
  const locusIndex = new Map(loci.map((l, i) => [l.id, i] as const));
  const tables = new Map<PhenotypeRule, { li: number; t: number[] }[] | null>();
  for (const rule of species.genetics.phenotypes) {
    const conds: { li: number; t: number[] }[] = [];
    let never = false;
    for (const cond of rule.when) {
      const li = locusIndex.get(cond.locus);
      if (li === undefined) {
        never = true;
        break;
      }
      const single: PhenotypeRule = { ...rule, when: [cond] };
      conds.push({ li, t: states[li].map((st) => ruleMatch(species, { alleles: { [cond.locus]: st.pair }, potentials: NEUTRAL }, single)) });
    }
    tables.set(rule, never ? null : conds);
  }
  return (idx) => (rule) => {
    const conds = tables.get(rule);
    if (conds === null || conds === undefined) return 0;
    let s = 1;
    for (const c of conds) {
      const v = c.t[idx[c.li]];
      if (v < s) s = v;
      if (s <= 0) return 0;
    }
    return s;
  };
}

function buildCatalog(species: SpeciesDefinition): MorphCatalog {
  const loci = species.genetics.loci;
  const rulesById = new Map(species.genetics.phenotypes.map((r) => [r.id, r] as const));
  const records = new Map<string, CatalogPhenotype>();
  const g: Genome = { alleles: {}, potentials: NEUTRAL };
  const record = (weight: number, m: RuleMatches) => {
    const overlayIds = m.overlays.map((o) => o.id);
    const key = `${m.base?.id ?? ''}|${overlayIds.join(',')}`;
    const cur = records.get(key);
    if (cur) {
      cur.frequency += weight;
      return;
    }
    records.set(key, {
      key,
      baseId: m.base?.id ?? null,
      overlayIds,
      ruleIds: m.base ? [m.base.id, ...overlayIds] : overlayIds,
      morphName: composeMorphName(species, m.base, m.overlays),
      frequency: weight,
    });
  };

  const states = loci.map(locusStates);
  const total = states.reduce((n, s) => n * s.length, 1);
  const exact = total <= MAX_EXACT_GENOTYPES;
  if (exact) {
    const scorer = ruleScorer(species, states);
    const idx = new Array<number>(loci.length).fill(0);
    const score = scorer(idx);
    for (let n = 0; n < total; n++) {
      let rem = n;
      let weight = 1;
      for (let i = 0; i < loci.length; i++) {
        const opts = states[i];
        idx[i] = rem % opts.length;
        rem = Math.floor(rem / opts.length);
        weight *= opts[idx[i]].p;
      }
      record(weight, selectRules(species, score));
    }
  } else {
    // Defensive: a seeded sample (deterministic per species) if a future species' space is too large to walk.
    const rng = mulberry32(hashString(`catalog:${species.id}`));
    for (let n = 0; n < SAMPLE_GENOTYPES; n++) {
      for (const locus of loci) {
        const draw = () => (locus.alleles.length ? rng.weighted(locus.alleles, (a) => a.frequency).id : '?');
        g.alleles[locus.id] = [draw(), draw()];
      }
      record(1 / SAMPLE_GENOTYPES, matchRules(species, g));
    }
  }

  const phenotypes = [...records.values()];
  // Named-strain tiers: explicit, or from how often stock shows the combination.
  const strains = species.genetics.strains ?? [];
  const strainTiers = new Map<string, Rarity>();
  for (const s of strains) {
    let share = 0;
    for (const ph of phenotypes) if (strainMatches(s, new Set(ph.ruleIds))) share += ph.frequency;
    strainTiers.set(s.id, s.tier ?? tierForShare(share));
  }

  // Group phenotypes by composed name (two rule sets can read the same — "Fire Red"), then by base colour.
  const byName = new Map<string, CatalogEntry>();
  const baseOrder = new Map<string | null, number>();
  species.genetics.phenotypes.filter((r) => r.layer === 'base').forEach((r, i) => baseOrder.set(r.id, i));
  for (const ph of [...phenotypes].sort((a, b) => b.frequency - a.frequency)) {
    const cur = byName.get(ph.morphName);
    if (cur) {
      cur.phenotypes.push(ph);
      cur.frequency += ph.frequency;
      for (const id of ph.ruleIds) if (!cur.traitIds.includes(id)) cur.traitIds.push(id);
      continue;
    }
    const base = ph.baseId ? rulesById.get(ph.baseId) : undefined;
    byName.set(ph.morphName, { morphName: ph.morphName, group: base?.name ?? 'Unnamed', traitIds: [...ph.ruleIds], phenotypes: [ph], frequency: ph.frequency, tier: 'common', strains: [] });
  }
  const groups = new Map<string, CatalogGroup>();
  for (const e of byName.values()) {
    e.tier = tierForShare(e.frequency);
    const ids = new Set<string>();
    for (const ph of e.phenotypes) for (const id of ph.ruleIds) ids.add(id);
    // strains every phenotype of this name satisfies, ranked (primary first)
    e.strains = rankStrains(
      strains.filter((s) => e.phenotypes.some((ph) => strainMatches(s, new Set(ph.ruleIds)))),
      strains,
      (s) => strainTiers.get(s.id),
    );
    const baseId = e.phenotypes[0].baseId;
    let grp = groups.get(e.group);
    if (!grp) groups.set(e.group, (grp = { name: e.group, baseId, frequency: 0, entries: [] }));
    grp.entries.push(e);
    grp.frequency += e.frequency;
  }
  const orderOf = (grp: CatalogGroup) => baseOrder.get(grp.baseId) ?? Number.MAX_SAFE_INTEGER;
  const groupList = [...groups.values()].sort((a, b) => orderOf(a) - orderOf(b) || a.name.localeCompare(b.name));
  for (const grp of groupList) grp.entries.sort((a, b) => b.frequency - a.frequency || a.morphName.localeCompare(b.morphName));
  return {
    speciesId: species.id,
    entries: groupList.flatMap((grp) => grp.entries),
    groups: groupList,
    byName,
    phenotypes,
    strainTiers,
    exact,
  };
}

/** Catalog entry for a creature's morph name (undefined for names the genetics can no longer produce). */
export function catalogEntry(species: SpeciesDefinition, morphName: string): CatalogEntry | undefined {
  return morphCatalog(species).byName.get(morphName);
}

/** Tier of a morph by how often market stock shows it (undefined when the name is not in the catalog). */
export function morphTierOf(species: SpeciesDefinition, morphName: string): Rarity | undefined {
  return catalogEntry(species, morphName)?.tier;
}

/** Trait rule ids the player has seen, from their discovered morph names (for "???" recipe hints). */
export function seenTraitIds(species: SpeciesDefinition, discoveredNames: Iterable<string>): Set<string> {
  const cat = morphCatalog(species);
  const out = new Set<string>();
  for (const n of discoveredNames) for (const id of cat.byName.get(n)?.traitIds ?? []) out.add(id);
  return out;
}

// ───────────────────────────── named strains ─────────────────────────────

/** True when a phenotype (its expressed rule ids, any order) satisfies a strain recipe. */
export function strainMatches(s: MorphStrain, ruleIds: ReadonlySet<string>): boolean {
  if (!s.requires.length) return false;
  for (const r of s.requires) if (!ruleIds.has(r)) return false;
  for (const r of s.excludes ?? []) if (ruleIds.has(r)) return false;
  return true;
}

/** Primary first: more required traits, then higher priority, then rarer tier, then data order. */
function rankStrains(matches: MorphStrain[], all: readonly MorphStrain[], tierOf: (s: MorphStrain) => Rarity | undefined): MorphStrain[] {
  return [...matches].sort(
    (a, b) =>
      b.requires.length - a.requires.length ||
      (b.priority ?? 0) - (a.priority ?? 0) ||
      tierRank(tierOf(b)) - tierRank(tierOf(a)) ||
      all.indexOf(a) - all.indexOf(b),
  );
}

/** Tier of a named strain (explicit, or derived from the catalog). */
export function strainTier(species: SpeciesDefinition, s: MorphStrain): Rarity {
  return s.tier ?? morphCatalog(species).strainTiers.get(s.id) ?? 'common';
}

/** Every strain a set of expressed rule ids satisfies, primary first. Order-independent. */
export function matchStrains(species: SpeciesDefinition, ruleIds: Iterable<string>): MorphStrain[] {
  const strains = species.genetics.strains ?? [];
  if (!strains.length) return [];
  const set = new Set(ruleIds);
  const hits = strains.filter((s) => strainMatches(s, set));
  if (hits.length < 2) return hits;
  // explicit tiers rank without building the catalog (valuation stays cheap); derived ones need it
  return rankStrains(hits, strains, (s) => strainTier(species, s));
}

const STRAIN_CACHE = new Map<string, MorphStrain[]>();
const STRAIN_CACHE_MAX = 6000;

/** Every strain a genome expresses, primary first (cached per species + genotype). */
export function strainsOf(species: SpeciesDefinition, genome: Genome | undefined): MorphStrain[] {
  if (!species.genetics.strains?.length) return [];
  const g = normalizeGenome(species, genome);
  let sig = species.id;
  for (const locus of species.genetics.loci) {
    const p = g.alleles[locus.id];
    sig += `|${p[0]}${p[1]}`;
  }
  const hit = STRAIN_CACHE.get(sig);
  if (hit) return hit;
  const m = matchRules(species, g);
  const out = matchStrains(species, [...(m.base ? [m.base.id] : []), ...m.overlays.map((o) => o.id)]);
  if (STRAIN_CACHE.size >= STRAIN_CACHE_MAX) STRAIN_CACHE.clear();
  STRAIN_CACHE.set(sig, out);
  return out;
}

/** The genome's primary named strain, if any. */
export function strainOf(species: SpeciesDefinition, genome: Genome | undefined): MorphStrain | undefined {
  return strainsOf(species, genome)[0];
}

/** Chance of each named strain among a pairing's young (primary strain per phenotype; exact enumeration). */
export function predictOffspringStrains(species: SpeciesDefinition, mother: Genome, father: Genome): { strain: MorphStrain; chance: number }[] {
  if (!species.genetics.strains?.length) return [];
  const ph = predictOffspringPhenotypes(species, mother, father);
  if (!ph) return [];
  const tally = new Map<string, { strain: MorphStrain; chance: number }>();
  for (const p of ph) {
    const s = matchStrains(species, p.baseId ? [p.baseId, ...p.overlayIds] : p.overlayIds)[0];
    if (!s) continue;
    const cur = tally.get(s.id);
    if (cur) cur.chance += p.chance;
    else tally.set(s.id, { strain: s, chance: p.chance });
  }
  return [...tally.values()].sort((a, b) => b.chance - a.chance);
}

// ───────────────────────────── validation ─────────────────────────────

export interface StrainIssue {
  strainId: string;
  message: string;
}

/**
 * Check a species' strain recipes against its genetics: duplicate ids/names, unknown rule ids, requires/excludes
 * conflicts, two required bases (only one base can win), identical recipes, recipes no genotype can satisfy, and
 * phenotypes where two strains tie for the canonical name. Empty for a healthy species.
 */
export function validateStrains(species: SpeciesDefinition): StrainIssue[] {
  const strains = species.genetics.strains ?? [];
  if (!strains.length) return [];
  const issues: StrainIssue[] = [];
  const rules = new Map<string, PhenotypeRule>(species.genetics.phenotypes.map((r) => [r.id, r]));
  const ids = new Set<string>();
  const names = new Set<string>();
  const recipes = new Map<string, string>();
  for (const s of strains) {
    if (ids.has(s.id)) issues.push({ strainId: s.id, message: `duplicate strain id "${s.id}"` });
    ids.add(s.id);
    const nm = s.name.trim().toLowerCase();
    if (!nm) issues.push({ strainId: s.id, message: 'strain has no name' });
    else if (names.has(nm)) issues.push({ strainId: s.id, message: `duplicate strain name "${s.name}"` });
    names.add(nm);
    if (!s.requires.length) issues.push({ strainId: s.id, message: 'strain requires no traits' });
    for (const r of [...s.requires, ...(s.excludes ?? [])]) if (!rules.has(r)) issues.push({ strainId: s.id, message: `unknown phenotype rule "${r}"` });
    const clash = s.requires.filter((r) => (s.excludes ?? []).includes(r));
    if (clash.length) issues.push({ strainId: s.id, message: `requires and excludes ${clash.join(', ')}` });
    const bases = s.requires.filter((r) => rules.get(r)?.layer === 'base');
    if (bases.length > 1) issues.push({ strainId: s.id, message: `requires two base colours (${bases.join(', ')}) — only one base can show` });
    const recipe = `${[...s.requires].sort().join('+')}|${[...(s.excludes ?? [])].sort().join('+')}`;
    const twin = recipes.get(recipe);
    if (twin) issues.push({ strainId: s.id, message: `same recipe as "${twin}"` });
    else recipes.set(recipe, s.id);
  }
  if (issues.length) return issues; // reachability needs well-formed recipes
  const cat = morphCatalog(species);
  const sets = cat.phenotypes.map((ph) => new Set(ph.ruleIds));
  for (const s of strains) {
    if (!sets.some((set) => strainMatches(s, set))) issues.push({ strainId: s.id, message: 'no genotype expresses this combination (unreachable)' });
  }
  const reported = new Set<string>();
  for (const set of sets) {
    const hits = strains.filter((s) => strainMatches(s, set));
    if (hits.length < 2) continue;
    const [a, b] = rankStrains(hits, strains, (s) => cat.strainTiers.get(s.id));
    const tie = a.requires.length === b.requires.length && (a.priority ?? 0) === (b.priority ?? 0) && tierRank(cat.strainTiers.get(a.id)) === tierRank(cat.strainTiers.get(b.id));
    const key = `${a.id}|${b.id}`;
    if (tie && !reported.has(key)) {
      reported.add(key);
      issues.push({ strainId: a.id, message: `ties with "${b.id}" as the canonical strain of one phenotype — set a priority` });
    }
  }
  return issues;
}
