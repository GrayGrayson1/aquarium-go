/**
 * What an offer's genetics show the player (0.5 spec §7.2, §7.3, §7.4.1): the Genes rows with their rule summaries and
 * copies chips, the Genes footer, the card's strain / "New gene" / "Carries" chips and the Rare genes test. Pure (no
 * store, no RNG), so it is unit-tested directly. Disclosure follows the one reveal rule (`geneticsRevealLevel`, §9.1):
 * callers pass `labOwned` = that level ≥ 1. OWNER: lane "ui-panels" (lane:genetics).
 */
import type { Creature, GameState, Genome, LocusDefinition, PhenotypeRule, Rarity, SpeciesDefinition } from '@/types';
import { allelePair, expressedAlleles, matchRules, normalizeGenome, predictOffspringPhenotypes, ruleMatch, selectRules, type RuleMatches } from '@/sim/life/genetics';
import { morphTierOf, strainOf, strainTier, tierRank } from '@/sim/life/morphCatalog';
import { pluralName } from '@/sim/economy/util';

/** Genes added in 0.5, per species: they get the "NEW" tag, the "New gene · " prefix and the card chip. Drop in 0.6. */
export const NEW_LOCI: Readonly<Record<string, readonly string[]>> = { betta: ['cambodian', 'metallic'] };

export function isNewLocus(sp: SpeciesDefinition, locusId: string): boolean {
  return NEW_LOCI[sp.id]?.includes(locusId) ?? false;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The gene's noun, singular and plural, from its name (ADR-0020 decision 4). */
export function locusNoun(locus: LocusDefinition): [string, string] {
  const n = locus.name.toLowerCase();
  if (/colou?r|hue|tone/.test(n)) return ['colour', 'colours'];
  if (/pattern/.test(n)) return ['pattern', 'patterns'];
  if (/fin|tail/.test(n)) return ['fin type', 'fin types'];
  if (/\bline\b/.test(n)) return ['line', 'lines'];
  if (/body type|form/.test(n)) return ['form', 'forms'];
  return ['version', 'versions'];
}

function alleleName(locus: LocusDefinition, id: string): string {
  return locus.alleles.find((a) => a.id === id)?.name ?? id;
}

/** The phenotype rule a single allele of this locus stands for (e.g. betta `c` → "Cambodian"), if any. */
export function traitRule(sp: SpeciesDefinition, locusId: string, allele: string, count?: 'hom' | 'het' | 'any'): PhenotypeRule | undefined {
  const hits = sp.genetics.phenotypes.filter((r) => r.when.some((w) => w.locus === locusId && w.allele === allele && w.count !== 'none' && (!count || w.count === count)));
  // the rule that needs nothing else from this locus reads best ("Marble", not a rule that also excludes others)
  return hits.sort((a, b) => a.when.length - b.when.length)[0];
}

/** Display name of an allele's trait: its phenotype rule's name when one exists ("Opaque White"), else the allele's. */
export function traitName(sp: SpeciesDefinition, locus: LocusDefinition, allele: string): string {
  return traitRule(sp, locus.id, allele)?.name ?? alleleName(locus, allele);
}

function shownRuleIds(sp: SpeciesDefinition, g: Genome): Set<string> {
  const m = matchRules(sp, normalizeGenome(sp, g));
  return new Set([...(m.base ? [m.base.id] : []), ...m.overlays.map((o) => o.id)]);
}

/** Plural of a species' common name for running text ("bettas", "cherry shrimp", "fancy guppies", "discus"). */
export function speciesPlural(sp: SpeciesDefinition): string {
  return pluralName(sp.commonName);
}

/** A look: the rules a genome expresses and how strongly (base, half bases, overlay weights), as one key. */
function lookKey(m: RuleMatches): string {
  return [m.base?.id ?? '', ...m.partialBases.map((r) => `~${r.id}`), ...m.overlayWeights.map((o) => `${o.rule.id}:${o.weight}`)].join('|');
}

/** Per species: the unordered allele pairs of each locus, and for every look the pairs some genotype with it holds. */
interface LookTable {
  pairs: [string, string][][];
  byLook: Map<string, Set<number>[]>;
}

const LOOK_TABLES = new Map<string, LookTable | null>();
/** Above this many genotypes the table isn't built (none today: bettas have 72,900) and rows fall back to one locus. */
const MAX_LOOK_GENOTYPES = 400_000;
const NEUTRAL_POTENTIALS = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };

/**
 * Every genotype of the species, grouped by look: which allele pairs of each locus occur under each look. Built once
 * per species with the engine's own rule selection (selectRules over per-condition ruleMatch tables, as the morph
 * catalog does), so it agrees with resolveMorph exactly.
 */
function lookTable(sp: SpeciesDefinition): LookTable | null {
  if (LOOK_TABLES.has(sp.id)) return LOOK_TABLES.get(sp.id)!;
  const loci = sp.genetics.loci;
  const pairs = loci.map((l) => {
    const out: [string, string][] = [];
    for (let i = 0; i < l.alleles.length; i++) for (let j = i; j < l.alleles.length; j++) out.push([l.alleles[i].id, l.alleles[j].id]);
    return out.length ? out : ([['?', '?']] as [string, string][]);
  });
  const total = pairs.reduce((n, p) => n * p.length, 1);
  if (total > MAX_LOOK_GENOTYPES) {
    LOOK_TABLES.set(sp.id, null);
    return null;
  }
  // each rule condition's truth over its own locus's pairs (ruleMatch on that one condition)
  const conds = new Map<PhenotypeRule, { li: number; t: number[] }[]>();
  for (const r of sp.genetics.phenotypes) {
    conds.set(
      r,
      r.when.map((w) => {
        const li = loci.findIndex((l) => l.id === w.locus);
        return { li, t: li < 0 ? [] : pairs[li].map((pair) => ruleMatch(sp, { alleles: { [w.locus]: pair }, potentials: NEUTRAL_POTENTIALS }, { ...r, when: [w] })) };
      }),
    );
  }
  const idx = new Array<number>(loci.length).fill(0);
  const score = (r: PhenotypeRule): number => {
    let m = 1;
    for (const c of conds.get(r) ?? []) {
      if (c.li < 0) return 0;
      const v = c.t[idx[c.li]];
      if (v < m) m = v;
      if (m === 0) return 0;
    }
    return m;
  };
  const byLook = new Map<string, Set<number>[]>();
  for (let n = 0; n < total; n++) {
    let rem = n;
    for (let i = 0; i < loci.length; i++) {
      idx[i] = rem % pairs[i].length;
      rem = Math.floor(rem / pairs[i].length);
    }
    const key = lookKey(selectRules(sp, score));
    let sets = byLook.get(key);
    if (!sets) byLook.set(key, (sets = loci.map(() => new Set<number>())));
    for (let i = 0; i < loci.length; i++) sets[i].add(idx[i]);
  }
  const table = { pairs, byLook };
  LOOK_TABLES.set(sp.id, table);
  return table;
}

/**
 * The allele pairs of a locus that some animal with exactly this look could carry. Before the Genetics Lab a row may
 * only say what all of them share, so two animals that look alike read alike (no leak).
 */
function lookalikePairs(sp: SpeciesDefinition, g: Genome, locus: LocusDefinition): [string, string][] {
  const li = sp.genetics.loci.indexOf(locus);
  const table = lookTable(sp);
  const sets = table?.byLook.get(lookKey(matchRules(sp, g)));
  if (table && sets) return [...sets[li]].map((k) => table.pairs[li][k]);
  // fallback (no table): vary this locus alone, every other locus as it is
  const key = lookKey(matchRules(sp, g));
  const out: [string, string][] = [];
  for (const pair of table?.pairs[li] ?? lookTablePairs(locus)) if (lookKey(matchRules(sp, { ...g, alleles: { ...g.alleles, [locus.id]: pair } })) === key) out.push(pair);
  return out;
}

function lookTablePairs(locus: LocusDefinition): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < locus.alleles.length; i++) for (let j = i; j < locus.alleles.length; j++) out.push([locus.alleles[i].id, locus.alleles[j].id]);
  return out;
}

// ───────────────────────────── Genes rows (§7.4.1) ─────────────────────────────

export type CopiesKind = 'known' | 'hidden' | 'revealed';

export interface GeneRow {
  locusId: string;
  label: string;
  isNew: boolean;
  /** The expressed allele (or trait) name, bold in the row. */
  trait: string;
  summary: string;
  copies: { kind: CopiesKind; text: string; title?: string; rare?: boolean };
}

/**
 * " · only shows on red bettas" when every rule that shows this locus needs the same allele of another locus showing
 * (Cambodian needs red); '' when any rule shows it without that condition.
 */
function conditionalSuffix(sp: SpeciesDefinition, locus: LocusDefinition): string {
  // every rule the gene takes part in, "none" conditions included (cherry density shapes Blue Dream that way)
  const rules = sp.genetics.phenotypes.filter((r) => r.when.some((w) => w.locus === locus.id));
  if (!rules.length) return '';
  const needs = (r: PhenotypeRule) => r.when.filter((w) => w.locus !== locus.id && w.count === 'any').map((w) => `${w.locus}|${w.allele}`);
  const shared = needs(rules[0]).find((k) => rules.every((r) => needs(r).includes(k)));
  if (!shared) return '';
  const [otherLocus, allele] = shared.split('|');
  const ol = sp.genetics.loci.find((l) => l.id === otherLocus);
  return ol ? ` · only shows on ${lower(alleleName(ol, allele))} ${speciesPlural(sp)}` : '';
}

/** The rule summary for a locus, given the allele the row names (§7.4.1). */
export function ruleSummary(sp: SpeciesDefinition, locus: LocusDefinition, shown: string): string {
  const prefix = isNewLocus(sp, locus.id) ? 'New gene · ' : '';
  const [noun, nouns] = locusNoun(locus);
  let text: string;
  if (locus.mode === 'mendelian') {
    const d = locus.alleles.find((a) => a.id === shown)?.dominance ?? 0;
    const above = locus.alleles.filter((a) => a.dominance > d);
    if (!above.length) text = `Dominant over every other ${noun}`;
    else if (above.length === 1) text = `Recessive to ${above[0].name}`;
    else if (above.length === 2) text = `Recessive to ${above[0].name} and ${above[1].name}`;
    else text = `Recessive to most ${nouns}`;
  } else if (locus.mode === 'codominant') {
    const v = variantAllele(locus, shown);
    const het = traitRule(sp, locus.id, v, 'het')?.name ?? alleleName(locus, v);
    const hom = traitRule(sp, locus.id, v, 'hom')?.name ?? alleleName(locus, v);
    text = `Codominant · one copy ${het}, two ${hom}`;
  } else {
    const v = variantAllele(locus, shown);
    text = `Additive · two copies = ${traitRule(sp, locus.id, v, 'hom')?.name ?? alleleName(locus, v)}`;
  }
  return `${prefix}${text}${conditionalSuffix(sp, locus)}`;
}

/** For additive / codominant loci: the allele that isn't the most common one (the "copies" a chip counts). */
function variantAllele(locus: LocusDefinition, preferred?: string): string {
  const common = mostCommon(locus);
  if (preferred && preferred !== common) return preferred;
  return locus.alleles.find((a) => a.id !== common)?.id ?? common;
}

function mostCommon(locus: LocusDefinition): string {
  return [...locus.alleles].sort((a, b) => b.frequency - a.frequency)[0]?.id ?? '?';
}

/**
 * A mendelian allele the animal carries but doesn't show: an allele with a trait rule shows only when a rule in the
 * phenotype needs it (axolotl d/d shows inside White Albino); one without a rule shows when the dominance ladder
 * expresses it. So a heterozygous recessive is hidden, and so is Cambodian on a non-red betta.
 */
function isHiddenAllele(sp: SpeciesDefinition, locus: LocusDefinition, a: string, pair: [string, string], shownRules: ReadonlySet<string>): boolean {
  const needed = sp.genetics.phenotypes.some((r) => shownRules.has(r.id) && r.when.some((w) => w.locus === locus.id && w.allele === a && w.count !== 'none'));
  if (needed) return false;
  if (traitRule(sp, locus.id, a)) return true;
  return !expressedAlleles(locus, pair).includes(a);
}

/** The row's trait when this gene leaves no trace on the animal's look (owner's wording, ADR-0021). */
export const MASKED_TRAIT = 'Can’t be seen on this animal';

const copiesWord = (n: number) => (n === 0 ? 'no copies' : n === 1 ? '1 copy' : '2 copies');
const KNOWN_TITLE = 'The visible trait already proves this';
const HIDDEN_TITLE = 'Second copy hidden until the Genetics Lab';

/** One row per locus, in data order. `labOwned`: the reveal level is 1 (the Genetics Lab is researched). */
export function geneRows(sp: SpeciesDefinition, genome: Genome, labOwned: boolean): GeneRow[] {
  const g = normalizeGenome(sp, genome);
  return sp.genetics.loci.map((locus): GeneRow => {
    const pair = allelePair(locus, g);
    const isNew = isNewLocus(sp, locus.id);
    const base = { locusId: locus.id, label: locus.name, isNew };
    const common = mostCommon(locus);
    const inOrder = (ids: Iterable<string>) => {
      const set = new Set(ids);
      return locus.alleles.map((a) => a.id).filter((id) => set.has(id));
    };
    // what every look-alike pair shares is what the look proves; one look-alike pair means the copies are known
    const lookalikes = lookalikePairs(sp, g, locus);
    const proven = inOrder(locus.alleles.map((a) => a.id).filter((id) => lookalikes.every((p) => p.includes(id))));
    const known = lookalikes.length === 1;
    const hiddenChip = { kind: 'hidden' as const, text: '+ ?', title: HIDDEN_TITLE };
    const masked: GeneRow = { ...base, trait: MASKED_TRAIT, summary: '', copies: hiddenChip };
    if (locus.mode !== 'mendelian') {
      // additive and codominant copies show, wherever the gene shows at all: count the allele that isn't the common one
      // (in the locus's order, so h/p and p/h read alike; two different ones are both named, one copy each)
      const variants = inOrder(pair.filter((a) => a !== common));
      const v = variants[variants.length - 1] ?? variantAllele(locus);
      const n = pair.filter((a) => a === v).length;
      const trait = variants.length === 2 ? variants.map((a) => alleleName(locus, a)).join(' / ') : n > 0 ? (traitRule(sp, locus.id, v, n === 2 ? 'hom' : 'het')?.name ?? alleleName(locus, v)) : alleleName(locus, common);
      const row: GeneRow = { ...base, trait, summary: ruleSummary(sp, locus, v), copies: { kind: 'known', text: copiesWord(n), title: KNOWN_TITLE } };
      if (labOwned || known) return row;
      // the look doesn't settle it (density on a wild-type shrimp): before the lab, only what the look proves
      if (!proven.length) return masked;
      return { ...base, trait: proven.map((a) => alleleName(locus, a)).join(' / '), summary: ruleSummary(sp, locus, proven[0]), copies: hiddenChip };
    }
    const knownChip = { kind: 'known' as const, text: pair[0] === pair[1] ? '2 copies' : '1 copy', title: KNOWN_TITLE };
    if (!labOwned) {
      if (!proven.length) return masked;
      const trait = proven.map((a) => alleleName(locus, a)).join(' / ');
      return { ...base, trait, summary: ruleSummary(sp, locus, proven[0]), copies: known ? knownChip : hiddenChip };
    }
    // after the lab: the genotype as the dominance ladder reads it, with every copy named
    const shown = inOrder(expressedAlleles(locus, pair));
    const trait = shown.map((a) => alleleName(locus, a)).join(' / ');
    const summary = ruleSummary(sp, locus, shown[0]);
    if (known) return { ...base, trait, summary, copies: knownChip };
    if (isNew) {
      // a 0.5 gene counts its own (rare) allele: "no copies" / "carries Cambodian" / "2 copies"
      const v = locus.alleles.find((a) => a.rare)?.id ?? variantAllele(locus);
      const n = pair.filter((a) => a === v).length;
      return { ...base, trait, summary, copies: { kind: 'revealed', text: n === 1 ? `carries ${alleleName(locus, v)}` : copiesWord(n), rare: n > 0 && !!locus.alleles.find((a) => a.id === v)?.rare } };
    }
    if (pair[0] === pair[1]) return { ...base, trait, summary, copies: { kind: 'revealed', text: '2 copies' } };
    const hidden = pair.find((a) => !shown.includes(a));
    if (!hidden) return { ...base, trait, summary, copies: { kind: 'revealed', text: '1 copy' } };
    return { ...base, trait, summary, copies: { kind: 'revealed', text: `carries ${alleleName(locus, hidden)}`, rare: !!locus.alleles.find((a) => a.id === hidden)?.rare } };
  });
}

// ───────────────────────────── hidden carriers (§7.2, §7.3) ─────────────────────────────

export interface CarriedTrait {
  locusId: string;
  allele: string;
  /** Trait name ("Cambodian", "Opaque White"). */
  name: string;
  rare: boolean;
  rule?: PhenotypeRule;
}

/**
 * Alleles the animal carries but doesn't show: present in the genome, while the trait they stand for isn't in its
 * phenotype (a heterozygous recessive, or Cambodian on a non-red betta). Additive and codominant alleles always show.
 */
export function carriedTraits(sp: SpeciesDefinition, genome: Genome): CarriedTrait[] {
  const g = normalizeGenome(sp, genome);
  const shownRules = shownRuleIds(sp, g);
  const out: CarriedTrait[] = [];
  for (const locus of sp.genetics.loci) {
    if (locus.mode !== 'mendelian') continue;
    const pair = allelePair(locus, g);
    for (const a of new Set(pair)) {
      if (!isHiddenAllele(sp, locus, a, pair, shownRules)) continue;
      const def = locus.alleles.find((x) => x.id === a);
      out.push({ locusId: locus.id, allele: a, name: traitName(sp, locus, a), rare: !!def?.rare, rule: traitRule(sp, locus.id, a) });
    }
  }
  return out;
}

/** Hidden carriers of `rare` alleles (the Rare genes filter's and the "Carries" chip's set). */
export function rareCarried(sp: SpeciesDefinition, genome: Genome): CarriedTrait[] {
  return carriedTraits(sp, genome).filter((t) => t.rare);
}

/** Visible rarity: a morph tier of rare or above, or a named strain of tier ≥ rare. */
export function visiblyRare(sp: SpeciesDefinition, c: Pick<Creature, 'morphName' | 'genome'>): boolean {
  const RARE = tierRank('rare');
  if (tierRank(morphTierOf(sp, c.morphName)) >= RARE) return true;
  const s = strainOf(sp, c.genome);
  return !!s && tierRank(strainTier(sp, s)) >= RARE;
}

/** The Rare genes test for one animal: visibly rare, or (with the lab) a hidden carrier of a rare allele. */
export function rareGenesMatch(sp: SpeciesDefinition, c: Pick<Creature, 'morphName' | 'genome'>, labOwned: boolean): boolean {
  return visiblyRare(sp, c) || (labOwned && rareCarried(sp, c.genome).length > 0);
}

/** 0.5 genes the animal expresses ("Cambodian" on a red c/c betta, "Metallic" on me/me), for "New gene · {Gene}". */
export function expressedNewGenes(sp: SpeciesDefinition, genome: Genome): string[] {
  const loci = NEW_LOCI[sp.id];
  if (!loci?.length) return [];
  const shownRules = shownRuleIds(sp, genome);
  const out: string[] = [];
  for (const id of loci) {
    for (const r of sp.genetics.phenotypes) if (shownRules.has(r.id) && r.when.some((w) => w.locus === id && w.count !== 'none') && !out.includes(r.name)) out.push(r.name);
  }
  return out;
}

/** The card's and hero's strain chip: a named strain with its tier, else the morph tier (null for Common or unknown). */
export function strainOrMorphTier(sp: SpeciesDefinition, c: Pick<Creature, 'morphName' | 'genome'>): { strain?: string; tier: Rarity } | null {
  const s = strainOf(sp, c.genome);
  if (s) return { strain: s.name, tier: strainTier(sp, s) };
  const t = morphTierOf(sp, c.morphName);
  return t && t !== 'common' ? { tier: t } : null;
}

// ───────────────────────────── Genes footer (§7.4.1) ─────────────────────────────

/**
 * "about 3 in 8": the simplest fraction with a denominator up to 16 within 1% of the share, never "n in n" (a share
 * that rounds to every youngster reads "all their young", see genesFooter).
 */
export function aboutFraction(share: number): string {
  let best = { n: 1, d: 1, err: Infinity };
  for (let d = 2; d <= 16; d++) {
    const n = Math.min(d - 1, Math.max(1, Math.round(share * d)));
    const err = Math.abs(n / d - share);
    if (err < best.err - 0.01) best = { n, d, err };
  }
  return `${best.n} in ${best.d}`;
}

export type GenesFooter = { kind: 'locked' | 'lab' | 'none'; text: string };

/**
 * The footer under the Genes rows. `rows` are geneRows(); `partners` are the player's animals of the same species the
 * lab advice may pair with (opposite sex, alive) — the first that gives this trait wins.
 */
export function genesFooter(sp: SpeciesDefinition, c: Pick<Creature, 'sex' | 'genome'>, rows: GeneRow[], labOwned: boolean, partners: readonly Pick<Creature, 'name' | 'sex' | 'genome'>[] = []): GenesFooter {
  const allKnown = rows.every((r) => r.copies.kind === 'known');
  // advice is about recessives the animal carries (an allele that only lost to another gene's look isn't one)
  const recessive = (t: CarriedTrait) => {
    const l = sp.genetics.loci.find((x) => x.id === t.locusId);
    return !!l && (l.alleles.find((a) => a.id === t.allele)?.dominance ?? 0) < Math.max(...l.alleles.map((a) => a.dominance));
  };
  const carried = carriedTraits(sp, c.genome).filter(recessive);
  if (allKnown || (labOwned && carried.length === 0)) {
    const additiveOnly = sp.genetics.loci.length > 0 && sp.genetics.loci.every((l) => l.mode !== 'mendelian');
    return { kind: 'none', text: additiveOnly ? 'Nothing hidden: additive traits always show their copies.' : 'Nothing hidden: every trait here shows its copies.' };
  }
  if (!labOwned) return { kind: 'locked', text: 'What it carries stays hidden until you research the Genetics Lab.' };
  const trait = [...carried].sort((a, b) => Number(b.rare) - Number(a.rare))[0];
  const Pronoun = c.sex === 'male' ? 'He' : c.sex === 'female' ? 'She' : 'It';
  const him = c.sex === 'male' ? 'him' : c.sex === 'female' ? 'her' : 'it';
  if (trait.rule) {
    let best: { name: string; share: number } | null = null;
    for (const p of partners) {
      const mother = c.sex === 'female' ? c.genome : p.genome;
      const father = c.sex === 'female' ? p.genome : c.genome;
      const ph = predictOffspringPhenotypes(sp, mother, father);
      if (!ph) continue;
      const share = ph.filter((o) => o.overlayIds.includes(trait.rule!.id) || o.baseId === trait.rule!.id).reduce((s, o) => s + o.chance, 0);
      if (share > 0 && (!best || share > best.share)) best = { name: p.name, share };
    }
    // "all their young" (ADR-0021) when practically every youngster shows it
    if (best) return { kind: 'lab', text: `Genetics Lab: ${Pronoun} carries ${trait.name}: paired with ${best.name}, ${best.share >= 0.97 ? 'all their' : `about ${aboutFraction(best.share)}`} young would be ${shownAs(sp, trait)}.` };
  }
  return { kind: 'lab', text: `Genetics Lab: Pair ${him} with another ${trait.name} carrier for about 1 in 4 ${trait.name} young.` };
}

/** How a trait reads on its young: "Red Cambodian" when it needs another trait to show, else just "Cambodian". */
function shownAs(sp: SpeciesDefinition, t: CarriedTrait): string {
  const other = t.rule?.when.find((w) => w.locus !== t.locusId && w.count === 'any');
  if (!other) return t.name;
  const needs = traitRule(sp, other.locus, other.allele, 'any');
  return needs ? `${needs.name} ${t.name}` : t.name;
}

/** The player's animals a shop animal could be paired with for the lab advice: same species, opposite sex, alive. */
export function labPartners(g: GameState, speciesId: string, sex: Creature['sex']): Creature[] {
  return Object.values(g.creatures).filter((x) => x.speciesId === speciesId && x.status === 'alive' && x.tankId && (sex === 'male' ? x.sex === 'female' : sex === 'female' ? x.sex === 'male' : false));
}
