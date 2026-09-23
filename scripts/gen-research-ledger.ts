/**
 * Generates docs/RESEARCH_SOURCES.md from the species database so the ledger can never drift from the data.
 * Run: npx vite-node scripts/gen-research-ledger.ts
 */
import { writeFileSync } from 'node:fs';
import { ALL_SPECIES } from '../src/data/species';

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const lines: string[] = [];
lines.push('# Research Sources — Species Ledger');
lines.push('');
lines.push('Generated from `src/data/species/**` by `scripts/gen-research-ledger.ts`, so it always matches what ships in the game.');
lines.push('Full per-species research notes (facts used, conflicts, visual notes) live in');
lines.push('[`docs/research/freshwater.md`](research/freshwater.md), [`docs/research/marine.md`](research/marine.md) and [`docs/research/brackish.md`](research/brackish.md).'); // lane:brackish
lines.push('');
lines.push('## Source hierarchy');
lines.push('');
lines.push('- **Tier 1:** university husbandry/research programmes (e.g. University of Kentucky Ambystoma Genetic Stock Center), FishBase, Animal Diversity Web, government/university extension (UF IFAS), accredited public aquariums (Monterey Bay Aquarium), IUCN/CITES, peer-reviewed papers.');
lines.push('- **Tier 2:** veterinarian-reviewed care sheets (PetMD), long-established references, major specialty retailers for practical parameters (Aquarium Co-Op, LiveAquaria).');
lines.push('- **Tier 3:** experienced hobbyist sources, used only for edge cases and never to overrule stronger sources.');
lines.push('');
lines.push('Compatibility-critical claims (predation, serious aggression, major husbandry mismatch) use two sources where possible. Uncertainty is recorded in each species’ `confidenceNotes` rather than invented as certainty.');
lines.push('');
lines.push('## Cross-cutting science');
lines.push('');
lines.push('| Topic | Source | Tier | Used for |');
lines.push('|---|---|---|---|');
lines.push('| Nitrification (ammonia → nitrite → nitrate), biofilters | University of Florida IFAS Extension — ammonia & nitrification in aquatic systems | 1 | Water-chemistry model, cycling, free-NH₃ toxicity vs pH/temperature |');
lines.push('| Tank stability & welfare framing | RSPCA fish environment guidance | 2 | Volume-dependent stability, welfare model |');
lines.push('| Practical freshwater compatibility | Aquarium Co-Op care guides | 2 | Tank sizes, tank-mate cautions |');
lines.push('| Practical marine parameters, reef safety | LiveAquaria species pages | 2 | Minimum tank sizes, reef-safety, temperament |');
lines.push('');
lines.push(`## Species (${ALL_SPECIES.length})`);
lines.push('');
lines.push('| Species | Scientific name | Env | Sources (tier) | Confidence notes |');
lines.push('|---|---|---|---|---|');
for (const sp of ALL_SPECIES) {
  const src = sp.sourceReferences
    .map((r) => (r.url ? `[${esc(r.title)}](${r.url}) (T${r.tier})` : `${esc(r.title)} (T${r.tier})`))
    .join('<br>');
  const conf = sp.confidenceNotes.length ? esc(sp.confidenceNotes.join(' · ')) : '—';
  lines.push(`| **${esc(sp.commonName)}** (\`${sp.id}\`) | *${esc(sp.scientificName)}* | ${sp.environment} | ${src} | ${conf} |`);
}
lines.push('');
lines.push('## Facts used per species');
lines.push('');
for (const sp of ALL_SPECIES) {
  lines.push(`### ${sp.commonName} — *${sp.scientificName}*`);
  lines.push('');
  for (const r of sp.sourceReferences) {
    lines.push(`- **${r.title}** (Tier ${r.tier})${r.url ? ` — ${r.url}` : ''}`);
    if (r.facts.length) lines.push(`  - Facts: ${r.facts.join('; ')}`);
  }
  if (sp.exceptionRules.length) {
    lines.push(`- Compatibility rules encoded: ${sp.exceptionRules.map((e) => `${e.other} → ${e.verdictFloor ?? 'risk'} (“${e.reason}”)`).join('; ')}`);
  }
  lines.push('');
}
writeFileSync(new URL('../docs/RESEARCH_SOURCES.md', import.meta.url), lines.join('\n'));
console.log(`wrote RESEARCH_SOURCES.md with ${ALL_SPECIES.length} species`);
