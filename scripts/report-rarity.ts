/**
 * Rarity report (GEN-013, ADR-0005 decision 4). For every species: how many morph-catalog entries and named strains fall
 * in each rarity tier under today's tier rule, and what share of the animals sellers stock falls in each tier. The
 * owner tunes the tiers (MORPH_TIER_MIN_SHARE in src/data/rarity.ts) from these numbers; this script changes nothing.
 * Usage: npm run report:rarity            (readable tables)
 *        npm run report:rarity -- --json  (machine-readable)
 */
import type { Rarity } from '@/types';
import { TIER_WORD } from '@/data/rarity';
import { rarityReport, type TierCounts } from '@/sim/life/rarityReport';

const report = rarityReport();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const label = (t: Rarity) => TIER_WORD[t].charAt(0).toUpperCase() + TIER_WORD[t].slice(1);
  // 1 decimal from 1% up; two significant digits below, so small tiers still compare (0.50% vs 0.46%, 0.022%).
  const pct = (x: number) => (x <= 0 ? '0%' : x >= 0.01 ? `${(100 * x).toFixed(1)}%` : x >= 1e-6 ? `${(100 * x).toPrecision(2)}%` : '<0.0001%');
  const sum = (c: TierCounts) => report.tiers.reduce((s, t) => s + c[t], 0);
  const top = report.tiers[report.tiers.length - 1];
  const short: Record<Rarity, string> = { common: 'Com', uncommon: 'Unc', rare: 'Rare', very_rare: 'VRare', legendary: 'Leg' };
  const table = (header: string[], rows: string[][]) => {
    const w = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
    const line = (r: string[]) => `  ${r.map((c, i) => (i === 0 ? c.padEnd(w[i]) : c.padStart(w[i]))).join('   ')}`;
    return [line(header), ...rows.map(line)].join('\n');
  };
  // Tiers as columns (common → legendary), one row per measure; strains only where the species has any.
  const tierTable = ({ morphs, strains, share, shareLabel }: { morphs: TierCounts; strains: TierCounts | null; share: TierCounts; shareLabel: string }) =>
    table(
      ['', ...report.tiers.map(label), 'Total'],
      [
        ['Morphs', ...report.tiers.map((t) => String(morphs[t])), String(sum(morphs))],
        ...(strains ? [['Strains', ...report.tiers.map((t) => String(strains[t])), String(sum(strains))]] : []),
        [shareLabel, ...report.tiers.map((t) => pct(share[t])), pct(sum(share))],
      ],
    );

  const rule = report.thresholds
    .map(([t, min], i) => (min > 0 ? `${label(t)} ≥ ${pct(min)}` : `${label(t)} below ${pct(report.thresholds[i - 1]?.[1] ?? 0)}`))
    .join(' · ');
  const out: string[] = [];
  out.push('Rarity report (GEN-013): how today\'s tier rule labels every species.');
  out.push(`Tier rule (MORPH_TIER_MIN_SHARE, share of the animals sellers stock): ${rule}.`);
  out.push('Morphs = morph-catalog entries per tier. Strains = named strains per tier, as the game shows them (explicit in the');
  out.push('data, else derived from the catalog). Stock = share of the animals sellers stock whose morph is in that tier.');
  for (const r of report.species) {
    out.push('');
    const notes = [`${r.entries} morph${r.entries === 1 ? '' : 's'}`, `${r.strains} named strain${r.strains === 1 ? '' : 's'}`];
    if (r.strainsWithExplicitTier) notes.push(`${r.strainsWithExplicitTier} with an explicit tier`);
    if (!r.exactCatalog) notes.push('catalog sampled, not exact');
    out.push(`${r.commonName} (${r.speciesId}): ${notes.join(', ')}`);
    out.push(tierTable({ morphs: r.entriesByTier, strains: r.strains ? r.strainsByTier : null, share: r.stockShareByTier, shareLabel: 'Stock' }));
  }
  const tot = report.totals;
  out.push('');
  out.push(`TOTAL across ${tot.species} species: ${tot.entries} morphs, ${tot.strains} named strains (${tot.strainsWithExplicitTier} with an explicit tier)`);
  out.push(tierTable({ morphs: tot.entriesByTier, strains: tot.strainsByTier, share: tot.meanStockShareByTier, shareLabel: 'Stock (mean of species)' }));

  out.push('');
  out.push(`Overview: morphs per tier, one line per species (registry order). ${short[top]} share = ${label(top)} entries / all`);
  out.push(`entries; ${short[top]} stock = share of the animals sellers stock that are ${TIER_WORD[top]}.`);
  out.push(
    table(
      ['Species', ...report.tiers.map((t) => short[t]), 'Total', `${short[top]} share`, `${short[top]} stock`],
      report.species.map((r) => [
        r.speciesId,
        ...report.tiers.map((t) => String(r.entriesByTier[t])),
        String(r.entries),
        pct(r.entries ? r.entriesByTier[top] / r.entries : 0),
        pct(r.stockShareByTier[top]),
      ]),
    ),
  );
  console.log(out.join('\n'));
}
