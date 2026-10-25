/**
 * Genes for a morph by name (chunk 15): the recipe can ask for `"morph": "Halfmoon Blue"` instead of listing alleles.
 * The species' morph catalogue says which rules make the morph; their conditions give the alleles (everything else the
 * commonest), and the result is checked with the game's own `resolveMorph`, so a morph is only ever what the genetics
 * really produce.
 */
import type { Genome, LocusDefinition, SpeciesDefinition } from '@/types';
import { morphCatalog, type CatalogEntry } from '@/sim/life/morphCatalog';
import { mostCommonAllele, morphDisplayName, normalizeGenome, resolveMorph } from '@/sim/life/genetics';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** The catalogue entry for a name as the encyclopedia or the cards show it (case and spacing ignored). */
export function findMorph(sp: SpeciesDefinition, name: string): CatalogEntry | undefined {
  const cat = morphCatalog(sp);
  const want = norm(name);
  for (const [morphName, entry] of cat.byName) if (norm(morphName) === want || norm(morphDisplayName(sp, morphName)) === want) return entry;
  return undefined;
}

/** Every morph name the species can show (for the lab's lists and the warnings' suggestions). */
export function morphNames(sp: SpeciesDefinition): string[] {
  return [...morphCatalog(sp).byName.keys()];
}

/** The commonest allele that isn't ruled out (nor `not`), for the loci a morph says nothing about. */
function otherThan(locus: LocusDefinition, absent: ReadonlySet<string>, not?: string): string {
  const common = mostCommonAllele(locus);
  if (common !== not && !absent.has(common)) return common;
  let best: string | null = null;
  let f = -1;
  for (const a of locus.alleles) if (a.id !== not && !absent.has(a.id) && a.frequency > f) [best, f] = [a.id, a.frequency];
  return best ?? common;
}

/** Allele pairs that show this morph, or null when its name isn't one the species' genetics make. */
export function genesForMorph(sp: SpeciesDefinition, name: string): Genome['alleles'] | null {
  const entry = findMorph(sp, name);
  if (!entry) return null;
  const loci = new Map(sp.genetics.loci.map((l) => [l.id, l] as const));
  const rules = new Map(sp.genetics.phenotypes.map((r) => [r.id, r] as const));
  const phenotypes = [...entry.phenotypes].sort((a, b) => b.share - a.share);
  for (const ph of phenotypes) {
    const conds = ph.ruleIds.flatMap((id) => rules.get(id)?.when ?? []);
    const alleles: Genome['alleles'] = {};
    for (const l of sp.genetics.loci) {
      const here = conds.filter((c) => c.locus === l.id);
      const absent = new Set(here.filter((c) => c.count === 'none').map((c) => c.allele));
      const present = [...new Set(here.filter((c) => c.count !== 'none').map((c) => c.allele))];
      const filler = otherThan(l, absent, present[0]);
      if (present.length >= 2) alleles[l.id] = [present[0], present[1]]; // one copy each (marble and dragon)
      else if (present.length === 1) alleles[l.id] = here.some((c) => c.allele === present[0] && c.count === 'het') ? [present[0], filler] : [present[0], present[0]];
      else alleles[l.id] = [filler, filler];
    }
    if (shows(sp, alleles, entry.morphName)) return alleles;
    // two rules on one locus (a pattern that needs one copy each of two alleles): try every pair at those loci
    const touched = [...new Set(conds.map((c) => c.locus))].map((id) => loci.get(id)).filter((l): l is LocusDefinition => !!l);
    const found = searchPairs(sp, alleles, touched, entry.morphName);
    if (found) return found;
  }
  return null;
}

const NEUTRAL = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };

function shows(sp: SpeciesDefinition, alleles: Genome['alleles'], morphName: string): boolean {
  return resolveMorph(sp, normalizeGenome(sp, { alleles, potentials: NEUTRAL })).morphName === morphName;
}

/** At most this many genotypes are tried for one morph. */
const SEARCH_CAP = 20_000;

function searchPairs(sp: SpeciesDefinition, start: Genome['alleles'], touched: LocusDefinition[], morphName: string): Genome['alleles'] | null {
  const options = touched.map((l) => {
    const out: [string, string][] = [];
    for (let i = 0; i < l.alleles.length; i++) for (let j = i; j < l.alleles.length; j++) out.push([l.alleles[i].id, l.alleles[j].id]);
    return out;
  });
  if (options.reduce((n, o) => n * o.length, 1) > SEARCH_CAP) return null;
  const pick = { ...start };
  const walk = (k: number): boolean => {
    if (k === touched.length) return shows(sp, pick, morphName);
    for (const pair of options[k]) {
      pick[touched[k].id] = pair;
      if (walk(k + 1)) return true;
    }
    return false;
  };
  return walk(0) ? pick : null;
}
