/**
 * chunk 19 (ADR-0055 decision 3, QOL-003, QOL-004) — one way to match a search: case, accents and punctuation don't
 * matter, and every word typed must appear somewhere in the item's words ("red betta" finds a "Red Plakat Betta").
 * Pure: the panels' search boxes and Find anything share it (tests/sim/qol-search.test.ts). OWNER: lane "ui-panels".
 */

/** Lower case, accents and punctuation off, spaces squeezed ("CO₂ & Planted" → "co2 planted"). */
export function fold(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/₂/g, '2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** The words of a query (folded); none for an empty or blank one. */
export function queryWords(q: string): string[] {
  const f = fold(q);
  return f ? f.split(' ') : [];
}

/** Does every word of the query start a word in (or appear in) the item's text? An empty query matches everything. */
export function matches(q: string | string[], ...fields: (string | null | undefined | false)[]): boolean {
  const words = Array.isArray(q) ? q : queryWords(q);
  if (!words.length) return true;
  const hay = ` ${fold(fields.filter(Boolean).join(' '))}`;
  return words.every((w) => hay.includes(` ${w}`) || (w.length >= 3 && hay.includes(w)));
}

/**
 * How well an item matches (higher is better), for ordering Find anything's results: a name that starts with the
 * query beats a word that starts with it, which beats a match anywhere; 0 when it doesn't match.
 */
export function score(q: string | string[], name: string, ...more: (string | null | undefined | false)[]): number {
  const words = Array.isArray(q) ? q : queryWords(q);
  if (!words.length) return 0;
  const n = fold(name);
  const phrase = words.join(' ');
  if (n === phrase) return 100;
  if (n.startsWith(phrase)) return 80;
  if (matches(words, name)) return words.every((w) => ` ${n}`.includes(` ${w}`)) ? 60 : 40;
  return matches(words, name, ...more) ? 20 : 0;
}
