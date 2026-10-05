/**
 * lane:genetics (GEN-013, ADR-0005 decision 4) — the rarity report behind `npm run report:rarity`: per species, the
 * morph-catalog entries and named strains in each tier and the share of seller stock in each tier, plus totals. It
 * counts today's tier rule (morphCatalog / tierForShare) and never re-derives it.
 */
import { describe, it, expect } from 'vitest';
import type { Rarity } from '@/types';
import { listSpecies } from '@/data/species';
import { MORPH_TIER_MIN_SHARE, RARITY_TIERS } from '@/data/rarity';
import { morphCatalog, tierForShare } from '@/sim/life/morphCatalog';
import { rarityReport, type TierCounts } from '@/sim/life/rarityReport';

const sum = (c: TierCounts) => RARITY_TIERS.reduce((s, t) => s + c[t], 0);

describe('GEN-013: rarity report', () => {
  const report = rarityReport();

  it('covers the whole species registry, in registry order', () => {
    expect(report.species.map((r) => r.speciesId)).toEqual(listSpecies().map((s) => s.id));
    expect(report.totals.species).toBe(listSpecies().length);
  });

  it('per species, the tier counts sum to the catalog size and the strain count', () => {
    for (const sp of listSpecies()) {
      const row = report.species.find((r) => r.speciesId === sp.id)!;
      expect(row.entries, sp.id).toBe(morphCatalog(sp).entries.length);
      expect(sum(row.entriesByTier), sp.id).toBe(row.entries);
      expect(row.strains, sp.id).toBe((sp.genetics.strains ?? []).length);
      expect(sum(row.strainsByTier), sp.id).toBe(row.strains);
      expect(row.strainsWithExplicitTier, sp.id).toBe((sp.genetics.strains ?? []).filter((s) => s.tier).length);
    }
  });

  it('counts the catalog tiers today’s rule gives (tierForShare of each entry’s stock share)', () => {
    for (const sp of listSpecies()) {
      const row = report.species.find((r) => r.speciesId === sp.id)!;
      const expected = Object.fromEntries(RARITY_TIERS.map((t) => [t, 0])) as TierCounts;
      for (const e of morphCatalog(sp).entries) expected[tierForShare(e.frequency)] += 1;
      expect(row.entriesByTier, sp.id).toEqual(expected);
    }
  });

  it('lists the tiers in RARITY_TIERS order (common → legendary) everywhere', () => {
    expect(report.tiers).toEqual(RARITY_TIERS);
    expect(report.thresholds.map(([t]) => t)).toEqual(MORPH_TIER_MIN_SHARE.map(([t]) => t));
    const keys = (c: TierCounts) => Object.keys(c) as Rarity[];
    for (const r of report.species) {
      expect(keys(r.entriesByTier), r.speciesId).toEqual([...RARITY_TIERS]);
      expect(keys(r.strainsByTier), r.speciesId).toEqual([...RARITY_TIERS]);
      expect(keys(r.stockShareByTier), r.speciesId).toEqual([...RARITY_TIERS]);
    }
    expect(keys(report.totals.entriesByTier)).toEqual([...RARITY_TIERS]);
    expect(keys(report.totals.strainsByTier)).toEqual([...RARITY_TIERS]);
    expect(keys(report.totals.meanStockShareByTier)).toEqual([...RARITY_TIERS]);
  });

  it('stock shares lie in 0..1 and sum to 1 per species (and for the cross-species mean)', () => {
    for (const r of report.species) {
      for (const t of RARITY_TIERS) {
        expect(r.stockShareByTier[t], `${r.speciesId} ${t}`).toBeGreaterThanOrEqual(0);
        expect(r.stockShareByTier[t], `${r.speciesId} ${t}`).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(sum(r.stockShareByTier) - 1), r.speciesId).toBeLessThan(1e-9);
      // a tier with no entries holds no stock
      for (const t of RARITY_TIERS) if (r.entriesByTier[t] === 0) expect(r.stockShareByTier[t], `${r.speciesId} ${t}`).toBe(0);
    }
    expect(Math.abs(sum(report.totals.meanStockShareByTier) - 1)).toBeLessThan(1e-9);
  });

  it('totals are the sums over the species', () => {
    const rows = report.species;
    expect(report.totals.entries).toBe(rows.reduce((s, r) => s + r.entries, 0));
    expect(report.totals.strains).toBe(rows.reduce((s, r) => s + r.strains, 0));
    expect(report.totals.strainsWithExplicitTier).toBe(rows.reduce((s, r) => s + r.strainsWithExplicitTier, 0));
    for (const t of RARITY_TIERS) {
      expect(report.totals.entriesByTier[t], t).toBe(rows.reduce((s, r) => s + r.entriesByTier[t], 0));
      expect(report.totals.strainsByTier[t], t).toBe(rows.reduce((s, r) => s + r.strainsByTier[t], 0));
      expect(report.totals.meanStockShareByTier[t], t).toBeCloseTo(rows.reduce((s, r) => s + r.stockShareByTier[t], 0) / rows.length, 12);
    }
    expect(rarityReport([]).totals).toEqual({
      species: 0,
      entries: 0,
      entriesByTier: { common: 0, uncommon: 0, rare: 0, very_rare: 0, legendary: 0 },
      strains: 0,
      strainsByTier: { common: 0, uncommon: 0, rare: 0, very_rare: 0, legendary: 0 },
      strainsWithExplicitTier: 0,
      meanStockShareByTier: { common: 0, uncommon: 0, rare: 0, very_rare: 0, legendary: 0 },
    });
  });

  it('is deterministic: two calls agree, and so does a catalog rebuilt from scratch', () => {
    expect(rarityReport()).toEqual(rarityReport());
    // fresh ids miss the per-species catalog cache, so every catalog is enumerated again
    const fresh = rarityReport(listSpecies().map((sp) => ({ ...sp, id: `${sp.id}__report_fresh` })));
    expect(fresh.species.map((r) => ({ ...r, speciesId: r.speciesId.replace(/__report_fresh$/, '') }))).toEqual(report.species);
    expect(fresh.totals).toEqual(report.totals);
  });

  it('betta, pinned from the current data: 240 morphs at 1 / 9 / 21 / 39 / 170, 9 strains, 3.1% of stock legendary', () => {
    const betta = report.species.find((r) => r.speciesId === 'betta')!;
    expect(betta.exactCatalog).toBe(true);
    expect(betta.entries).toBe(240);
    expect(betta.entriesByTier).toEqual({ common: 1, uncommon: 9, rare: 21, very_rare: 39, legendary: 170 });
    expect(betta.strains).toBe(9);
    expect(betta.strainsByTier).toEqual({ common: 0, uncommon: 1, rare: 4, very_rare: 0, legendary: 4 });
    expect(betta.strainsWithExplicitTier).toBe(9);
    expect(betta.stockShareByTier.common).toBeCloseTo(0.195075, 6);
    expect(betta.stockShareByTier.uncommon).toBeCloseTo(0.4633765, 6);
    expect(betta.stockShareByTier.rare).toBeCloseTo(0.2229091, 6);
    expect(betta.stockShareByTier.very_rare).toBeCloseTo(0.087273, 6);
    expect(betta.stockShareByTier.legendary).toBeCloseTo(0.0313664, 6);
  });
});
