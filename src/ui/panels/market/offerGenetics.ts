/**
 * What an offer's genetics show the player (0.5 spec §7.2, §7.3, §7.4.1): the Genes rows with their rule summaries and
 * copies chips, the Genes footer, the card's strain / "New gene" / "Carries" chips and the Rare genes test. Pure (no
 * store, no RNG), so it is unit-tested directly. Disclosure follows the one reveal rule (`geneticsRevealLevel`, §9.1):
 * callers pass `labOwned` = that level ≥ 1. OWNER: lane "ui-panels" (lane:genetics).
 */
import type { Creature, GameState, Genome, LocusDefinition, PhenotypeRule, Rarity, SpeciesDefinition } from '@/types';
import { allelePair, expressedAlleles, matchRules, normalizeGenome, predictOffspringPhenotypes } from '@/sim/life/genetics';
import { morphTierOf, strainOf, strainTier, tierRank } from '@/sim/life/morphCatalog';

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

/** Plural of a species' common name for running text ("bettas", "cherry shrimp"). */
export function speciesPlural(sp: SpeciesDefinition): string {
  const n = sp.commonName.toLowerCase();
  return /(shrimp|fish|sheep|koi)$/i.test(n) ? n : /(s|x|ch|sh)$/i.test(n) ? `${n}es` : `${n}s`;
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

/** The locus' conditional rule ("Cambodian needs red") as " · only shows on red bettas", or ''. */
function conditionalSuffix(sp: SpeciesDefinition, locus: LocusDefinition): string {
  for (const r of sp.genetics.phenotypes) {
    if (!r.when.some((w) => w.locus === locus.id && w.count !== 'none')) continue;
    const other = r.when.find((w) => w.locus !== locus.id && w.count === 'any');
    if (!other) continue;
    const ol = sp.genetics.loci.find((l) => l.id === other.locus);
    if (!ol) continue;
    return ` · only shows on ${lower(alleleName(ol, other.allele))} ${speciesPlural(sp)}`;
  }
  return '';
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
 * A mendelian allele the animal carries but doesn't show. Visible when a rule in the phenotype needs it (axolotl d/d
 * shows inside White Albino). Otherwise hidden when it has a trait rule that isn't showing (unless it tops its ladder,
 * where its base rule may simply lose to another), or, with no rule, when the dominance ladder hides it. So a
 * heterozygous recessive is hidden, and so is Cambodian on a non-red betta.
 */
function isHiddenAllele(sp: SpeciesDefinition, locus: LocusDefinition, a: string, pair: [string, string], shownRules: ReadonlySet<string>): boolean {
  const needed = sp.genetics.phenotypes.some((r) => shownRules.has(r.id) && r.when.some((w) => w.locus === locus.id && w.allele === a && w.count !== 'none'));
  if (needed) return false;
  const top = Math.max(...locus.alleles.map((x) => x.dominance));
  const dom = locus.alleles.find((x) => x.id === a)?.dominance ?? 0;
  if (traitRule(sp, locus.id, a)) return dom < top;
  return !expressedAlleles(locus, pair).includes(a);
}

const copiesWord = (n: number) => (n === 0 ? 'no copies' : n === 1 ? '1 copy' : '2 copies');
const KNOWN_TITLE = 'The visible trait already proves this';
const HIDDEN_TITLE = 'Second copy hidden until the Genetics Lab';

/** One row per locus, in data order. `labOwned`: the reveal level is 1 (the Genetics Lab is researched). */
export function geneRows(sp: SpeciesDefinition, genome: Genome, labOwned: boolean): GeneRow[] {
  const g = normalizeGenome(sp, genome);
  const shownRules = shownRuleIds(sp, g);
  return sp.genetics.loci.map((locus) => {
    const pair = allelePair(locus, g);
    const isNew = isNewLocus(sp, locus.id);
    const base = { locusId: locus.id, label: locus.name, isNew };
    const common = mostCommon(locus);
    if (locus.mode !== 'mendelian') {
      // additive and codominant copies always show: count the allele that isn't the common one
      const v = pair.find((a) => a !== common) ?? variantAllele(locus);
      const n = pair.filter((a) => a === v).length;
      const trait = n > 0 ? (traitRule(sp, locus.id, v, n === 2 ? 'hom' : 'het')?.name ?? alleleName(locus, v)) : alleleName(locus, common);
      return { ...base, trait, summary: ruleSummary(sp, locus, v), copies: { kind: 'known', text: copiesWord(n), title: KNOWN_TITLE } };
    }
    // what the phenotype shows of this locus (Cambodian on a royal betta shows nothing: the row reads "Normal body")
    const visible = [...new Set(pair)].filter((a) => !isHiddenAllele(sp, locus, a, pair, shownRules));
    const named = visible.length ? visible : [common];
    const trait = named.map((a) => alleleName(locus, a)).join(' / ');
    const summary = ruleSummary(sp, locus, named[0]);
    const minDom = Math.min(...locus.alleles.map((a) => a.dominance));
    const dom = (a: string) => locus.alleles.find((x) => x.id === a)?.dominance ?? 0;
    // the phenotype proves the copies: two different alleles both showing, or one at the bottom of the ladder
    if (visible.length === 2) return { ...base, trait, summary, copies: { kind: 'known', text: '1 copy', title: KNOWN_TITLE } };
    if (visible.length === 1 && dom(visible[0]) === minDom) return { ...base, trait, summary, copies: { kind: 'known', text: '2 copies', title: KNOWN_TITLE } };
    if (!labOwned) return { ...base, trait, summary, copies: { kind: 'hidden', text: '+ ?', title: HIDDEN_TITLE } };
    if (isNew) {
      // a 0.5 gene counts its own (rare) allele: "no copies" / "carries Cambodian" / "2 copies"
      const v = locus.alleles.find((a) => a.rare)?.id ?? variantAllele(locus);
      const n = pair.filter((a) => a === v).length;
      return { ...base, trait, summary, copies: { kind: 'revealed', text: n === 1 ? `carries ${alleleName(locus, v)}` : copiesWord(n), rare: n > 0 && !!locus.alleles.find((a) => a.id === v)?.rare } };
    }
    const hidden = pair.find((a) => !visible.includes(a));
    if (!hidden || pair[0] === pair[1]) return { ...base, trait, summary, copies: { kind: 'revealed', text: '2 copies' } };
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

/** "about 3 in 8": the simplest fraction with a denominator up to 16 within 1% of the share. */
export function aboutFraction(share: number): string {
  let best = { n: 1, d: 1, err: Infinity };
  for (let d = 2; d <= 16; d++) {
    const n = Math.max(1, Math.round(share * d));
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
  const carried = carriedTraits(sp, c.genome);
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
    if (best) return { kind: 'lab', text: `Genetics Lab: ${Pronoun} carries ${trait.name}: paired with ${best.name}, about ${aboutFraction(best.share)} young would be ${shownAs(sp, trait)}.` };
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
