/**
 * Audit 2026-11-17 (J15): a species' name inside a sentence. Common names are written in Title Case ("German Blue
 * Ram"); in running text they are lower case ("a german blue ram"), except the proper nouns in them: "German blue
 * ram", "African dwarf frog", "Banggai cardinalfish", "Endler’s livebearer", "Mexican turbo snail", "Amano shrimp",
 * "White Cloud Mountain minnow". Pure; usable from src/sim.
 */
const PROPER = /\b(german|african|banggai|endler[’']s|mexican|amano|white cloud mountain)\b/g;

const capWords = (s: string) =>
  s
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');

/** "German Blue Ram" → "German blue ram"; "Neon Tetra" → "neon tetra". */
export function lowerName(name: string): string {
  return name.toLowerCase().replace(PROPER, capWords);
}
