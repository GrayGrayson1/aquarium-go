/**
 * Encyclopedia morph matching. The species data lists hand-written morph labels ("Red Veiltail", "Yellow",
 * "Black Moor (Black Telescope)", "Yellow Tang (no morphs; individual variation)") while the sim composes a creature's
 * morphName from its phenotype rules ("Red Butterfly Veiltail", "Yellow Marble Double Tail"), so an exact string
 * compare almost never matches. A curated chip counts as seen when every word of it (or of one of its bracketed
 * aliases) occurs in a morph the player has discovered for that species. Pure helpers; no sim/RNG impact.
 */
import type { SpeciesDefinition } from '@/types';

const NO_MORPHS_RE = /\((?:no morphs|natural|individual|shells vary|juvenile|behavioural)/i;
const STOP = new Set(['and', 'the', 'of', 'no', 'morphs']);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[\s\-–&/,;:()]+/)
    .filter((w) => w && !STOP.has(w));
}

/** Word sets a chip can be matched by: its label without brackets, plus each bracketed alias ("Black Telescope"). */
function chipAlternatives(label: string): string[][] {
  const main = tokens(label.replace(/\([^)]*\)/g, ' '));
  const alts = [...label.matchAll(/\(([^)]*)\)/g)].map((m) => tokens(m[1])).filter((t) => t.length > 0);
  return [main, ...alts].filter((t) => t.length > 0);
}

/** Morph names the player has discovered for this species (without the "speciesId:" prefix), in discovery order. */
export function discoveredMorphNames(discoveredMorphs: readonly string[], speciesId: string): string[] {
  const prefix = `${speciesId}:`;
  const out: string[] = [];
  for (const m of discoveredMorphs) {
    if (!m.startsWith(prefix)) continue;
    const name = m.slice(prefix.length).trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/** Species whose only "morph" entries are notes like "(no morphs; individual variation)". */
export function hasNoNamedMorphs(sp: Pick<SpeciesDefinition, 'visualMorphs'>): boolean {
  return sp.visualMorphs.length > 0 && sp.visualMorphs.every((m) => NO_MORPHS_RE.test(m));
}

/** The bracketed note of a "no morphs" entry, e.g. "individual variation". */
export function noMorphsNote(sp: Pick<SpeciesDefinition, 'visualMorphs'>): string {
  const m = sp.visualMorphs[0]?.match(/\(([^)]*)\)/)?.[1] ?? '';
  return m.replace(/^no morphs[;,]?\s*/i, '').trim();
}

/**
 * Which curated visualMorphs chips the player has seen. A chip matches a discovered morph when all of the chip's
 * words appear in that morph's words (the species' common name counts too, since composed names drop it:
 * "Red-Orange" is a seen "Red-Orange Comet"). A chip that needs the common name's words to match is turned down when
 * the morph carries a word that marks it as another chip — a word of that chip in neither the common name nor this
 * chip ("Grey Watchman" is not a Yellow Watchman, "Fire Red" is not a Red Cherry, "High Orange" is not the plain
 * Coral Beauty). Chips spelled out in the morph's own words always count (a "Yellow Marble Double Tail" betta shows
 * Yellow, Marble and Double Tail).
 */
export function seenMorphChips(sp: Pick<SpeciesDefinition, 'id' | 'commonName' | 'visualMorphs'>, discoveredMorphs: readonly string[]): Set<string> {
  const names = discoveredMorphNames(discoveredMorphs, sp.id);
  const common = new Set(tokens(sp.commonName));
  const own = names.map((n) => new Set(tokens(n)));
  const sets = own.map((set) => new Set([...set, ...common]));
  const chips = sp.visualMorphs.map((label) => ({ label, alts: chipAlternatives(label), words: new Set(chipAlternatives(label).flat()) }));
  const seen = new Set<string>();
  for (const chip of chips) {
    const marksOther = (i: number) => chips.some((other) => other !== chip && [...other.words].some((w) => !common.has(w) && !chip.words.has(w) && own[i].has(w)));
    const matches = (i: number) =>
      chip.alts.some((alt) => alt.every((w) => own[i].has(w)) || (alt.every((w) => sets[i].has(w)) && !marksOther(i)));
    if (names.some((_n, i) => matches(i))) seen.add(chip.label);
  }
  return seen;
}
