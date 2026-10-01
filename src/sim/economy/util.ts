/**
 * Small helpers shared by the economy modules. OWNER: lane "market".
 */
import type { Difficulty, GameState, Rarity, SpeciesDefinition } from '@/types';
import { findSpecies } from '@/data/species';

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number): number => clamp(v, 0, 1);
/** Replace NaN/Infinity with a fallback. */
export const finite = (v: number | undefined | null, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
export const roundCents = (v: number): number => Math.round(finite(v) * 100) / 100;

/** Shop-like whole-dollar rounding that scales with magnitude. */
export function nicePrice(v: number): number {
  const x = finite(v);
  if (x <= 0) return 0;
  if (x < 20) return Math.max(1, Math.round(x));
  if (x < 250) return Math.round(x);
  if (x < 1000) return Math.round(x / 5) * 5;
  if (x < 10000) return Math.round(x / 10) * 10;
  return Math.round(x / 50) * 50;
}

/** "$1,240" / "$12.50" — locale-independent. */
export function fmtMoney(v: number): string {
  const x = finite(v);
  const neg = x < 0;
  const abs = Math.abs(x);
  const whole = Math.floor(abs + 1e-9);
  const cents = Math.round((abs - whole) * 100);
  const w = String(cents === 100 ? whole + 1 : whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const c = cents > 0 && cents < 100 && abs < 100 ? `.${String(cents).padStart(2, '0')}` : '';
  return `${neg ? '−' : ''}$${w}${c}`;
}

export const dayIndex = (hour: number): number => Math.floor(hour / 24);

/** True if the hour-of-day mark (e.g. 8 = 8 AM) lies in (start, end]. */
export function crossedHourOfDay(start: number, end: number, mark: number): boolean {
  return Math.floor((end - mark) / 24) > Math.floor((start - mark) / 24);
}

export function pushCapped<T>(arr: T[], item: T, cap: number): void {
  arr.push(item);
  if (arr.length > cap) arr.splice(0, arr.length - cap);
}

/** Deep copy of plain JSON data (works on immer drafts). */
export function clonePlain<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export function speciesName(id: string): string {
  return findSpecies(id)?.commonName ?? id.replace(/_/g, ' ');
}

/**
 * Plural of a name, keeping its capitalisation ("Banggai cardinalfish", "Otocinclus", "Watchman gobies").
 * Invariant plurals: -fish, -shrimp, fry, species, and Latin-style -us / -is / -ss names (otocinclus, chromis,
 * discus, corydoras) — never "otocincluss" or "chromiss".
 */
export function pluralPhrase(name: string): string {
  const n = name;
  if (/(fish|shrimp|fry|species|us|is|ss|corydoras|sheep)$/i.test(n)) return n;
  if (/(ch|sh|x|z)$/i.test(n)) return `${n}es`;
  if (/[^aeiou]y$/i.test(n)) return `${n.slice(0, -1)}ies`;
  return `${n}s`;
}

/** Lower-case plural of a species common name ("neon tetras", "clownfish", "cherry shrimp", "gobies"). */
export function pluralName(commonName: string): string {
  return pluralPhrase(commonName.toLowerCase());
}

/**
 * A tank name in running text with the right article: "the 20 Gallon Long", "the Reef" — but "Ember’s Tank" and
 * "My Tank" take no article ("the Ember’s Tank" is wrong).
 */
export function theTank(name: string | undefined, capital = false): string {
  const n = (name ?? '').trim() || 'tank';
  if (/[’']s\b/.test(n) || /^(my|your|our|his|her|their)\b/i.test(n)) return capital ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  return `${capital ? 'The' : 'the'} ${n}`;
}

export function speciesPlural(id: string): string {
  const sp = findSpecies(id);
  return sp ? pluralName(sp.commonName) : id.replace(/_/g, ' ');
}

export function speciesSingular(id: string): string {
  return (findSpecies(id)?.commonName ?? id.replace(/_/g, ' ')).toLowerCase();
}

export const DIFFICULTY_INDEX: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2, expert: 3 };
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Beginner-friendly',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert only',
};
export const RARITY_SCORE: Record<Rarity, number> = { common: 0.1, uncommon: 0.35, rare: 0.6, very_rare: 0.8, legendary: 1 };

export function difficultyIndex(sp: SpeciesDefinition | undefined): number {
  return sp ? DIFFICULTY_INDEX[sp.difficulty] ?? 1 : 1;
}

/** Visitor popularity may be stored 0..1 or 0..100 by the facility lane — normalise to 0..1. */
export function normPopularity(p: number | undefined): number {
  const v = finite(p ?? 0);
  return clamp01(v > 1 ? v / 100 : v);
}

/**
 * Exhibit popularity relative to neutral, from the facility lane's visitor stats (0..100, 50 = neutral).
 * Returns −0.5..+0.5 (0 when too few visitors have seen the tank to know).
 */
export function exhibitPopularity(state: GameState, tankId: string): number {
  const e = state.visitors?.exhibit?.[tankId];
  if (!e || finite(e.views, 0) < 10) return 0;
  return clamp(normPopularity(e.popularity) - 0.5, -0.5, 0.5);
}

/** Illness severity may be 0..1 or 0..100 — normalise to 0..1. */
export function normSeverity(s: number | undefined): number {
  const v = finite(s ?? 0);
  return clamp01(v > 1 ? v / 100 : v);
}

export const now = (state: GameState): number => state.clock.hour;

/**
 * "a" or "an" for a word or phrase, by its first sound: "an ocellaris", "an axolotl", "an 8-gallon", "an 18-gallon",
 * "an hour" — but "a unicorn", "a European", "a one-off", "a 100-gallon". A heuristic, good for names and numbers.
 */
export function aOrAn(phrase: string | number): 'a' | 'an' {
  const w = String(phrase ?? '')
    .trim()
    .replace(/^[“"'‘(\[]+/, '');
  if (!w) return 'a';
  const num = /^\d[\d,]*/.exec(w);
  if (num) {
    const d = num[0].replace(/,/g, '');
    if (d[0] === '8') return 'an'; // eight, eighty, eight hundred…
    // eleven / eighteen (and eleven/eighteen thousand, million)
    if ((d.length === 2 || d.length === 5 || d.length === 8) && /^1[18]/.test(d)) return 'an';
    return 'a';
  }
  const lower = w.toLowerCase();
  if (/^(hour|honest|honou?r|heir)/.test(lower)) return 'an';
  // Vowel letters with a consonant sound: "a unicorn", "a uniform", "a useful", "a European", "a one-off".
  if (/^(uni(?!n)|use|usu|uti|ura|ure|uro|eu|ewe|one\b|once)/.test(lower)) return 'a';
  return /^[aeiou]/.test(lower) ? 'an' : 'a';
}

/** "an ocellaris clownfish" / "A betta" — the phrase with the right indefinite article. */
export function withArticle(phrase: string | number, capital = false): string {
  const a = aOrAn(phrase);
  return `${capital ? (a === 'an' ? 'An' : 'A') : a} ${phrase}`;
}

/**
 * Fix the article written directly before placeholders in a template ("a {species}", "A {morph}", "an {x}") for the
 * value that will fill it, so "I didn’t know a {species}…" reads "I didn’t know an ocellaris clownfish…".
 */
export function fixArticles(template: string, valueOf: (key: string) => string | number | undefined): string {
  return template.replace(/\b([Aa])n? \{(\w+)\}/g, (m, a: string, k: string) => {
    const v = valueOf(k);
    if (v === undefined || v === '') return m;
    const art = aOrAn(v);
    return `${a === 'A' ? (art === 'an' ? 'An' : 'A') : art} {${k}}`;
  });
}

/** Fill "{key}" placeholders (fixing "a"/"an" before them). Unknown keys are left as-is. */
export function fill(template: string, vars: Record<string, string | number | undefined>): string {
  return fixArticles(template, (k) => vars[k]).replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    return v === undefined || v === '' ? m : String(v);
  });
}

export function capitalise(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

export function lowerFirst(s: string): string {
  if (!s.length) return s;
  // keep "I" / "I'm" / proper-noun-looking first words as-is
  if (/^I\b|^I'/.test(s)) return s;
  return s[0].toLowerCase() + s.slice(1);
}

export function stripEnd(s: string): string {
  return s.replace(/[.!\s]+$/, '');
}

/** Drop a word the morph name already said, e.g. inside a "(…)" aside: "Wild (Banded Brown) Banded" → "Wild (Banded Brown)". */
function dedupeMorphWords(morph: string): string {
  const tokens = morph.match(/\([^)]*\)|\S+/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    const ws = t.replace(/[()]/g, ' ').toLowerCase().split(/\s+/).filter(Boolean);
    if (!t.startsWith('(') && ws.length === 1 && seen.has(ws[0])) continue;
    for (const w of ws) seen.add(w);
    out.push(t);
  }
  return out.join(' ');
}

/**
 * "Golden Albino" + "Axolotl" → "Golden Albino Axolotl"; overlapping words merge
 * ("Red Cherry" + "Cherry Shrimp" → "Red Cherry Shrimp"; "Skunk Cleaner" + "Skunk Cleaner Shrimp" → "Skunk Cleaner Shrimp").
 */
export function morphTitle(morphName: string | undefined, commonName: string): string {
  const morph = dedupeMorphWords((morphName ?? '').trim());
  if (!morph || /^wild type$/i.test(morph)) return commonName;
  const m = morph.split(/\s+/);
  const c = commonName.split(/\s+/);
  if (commonName.toLowerCase().includes(morph.toLowerCase())) return commonName;
  // The morph already spells out the species ("Royal Richly coloured Gramma" for a Royal Gramma): use it as is.
  let at = 0;
  for (const w of m) if (at < c.length && w.toLowerCase() === c[at].toLowerCase()) at++;
  if (at === c.length && c.length > 1) return morph;
  for (let k = Math.min(m.length, c.length); k >= 1; k--) {
    const tail = m.slice(m.length - k).join(' ').toLowerCase();
    const head = c.slice(0, k).join(' ').toLowerCase();
    if (tail === head) return [...m, ...c.slice(k)].join(' ');
  }
  // The morph repeats part of the species name elsewhere ("Peppermint Richly coloured" + "Peppermint Shrimp",
  // "Red Honey (Sunset)" + "Honey Gourami"): drop the repeated words, keep any "(…)" aside at the end →
  // "Richly coloured Peppermint Shrimp", "Red Honey Gourami (Sunset)".
  // A shortened species word counts as repeated too ("Banggai Cardinal" for a Banggai Cardinalfish), and a descriptive
  // overlay trailing the repeated words moves to the front as a unit: "Banggai Cardinal Heavily spotted" →
  // "Heavily spotted Banggai Cardinalfish", never "Cardinal Heavily spotted Banggai Cardinalfish".
  const cl = c.map((w) => w.toLowerCase());
  const repeated = (w: string) => {
    const k = w.toLowerCase();
    return cl.includes(k) || (k.length >= 4 && cl.some((x) => x.length > k.length && x.startsWith(k)));
  };
  const parens = morph.match(/\([^)]*\)/g) ?? [];
  const core = morph.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  let last = -1;
  core.forEach((w, i) => {
    if (repeated(w)) last = i;
  });
  if (last >= 0) {
    const lead = core.slice(0, last).filter((w) => !repeated(w));
    const trail = core.slice(last + 1);
    return [...trail, ...lead, ...c, ...parens].join(' ');
  }
  return `${morph} ${commonName}`;
}
