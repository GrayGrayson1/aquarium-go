// @vitest-environment node
/**
 * chunk 21 (review S8) — the Collection's morph catalogs are built in slices, never all at once: a catalog built a slice
 * at a time is exactly the one built in one go, morphCatalog finishes a build begun in slices, the background queue
 * builds what a screen asks for without building anything during the call, and the Collection says it is counting
 * (building nothing itself) until they are ready. Its own file, so no catalog is cached before it starts.
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { buildMorphCatalog, catalogReady, morphCatalog, warmCatalog } from '@/sim/life/morphCatalog';
import { catalogsReady, requestCatalogs, STEP } from '@/ui/panels/encyclopedia/catalogWarmup';
import { CATALOG_SPECIES, percentCatalogs } from '@/ui/panels/encyclopedia/collection';
import { CollectionView } from '@/ui/panels/encyclopedia/CollectionView';

describe('the Collection’s catalogs, built in slices', () => {
  it('the view says it is counting until every catalog is built, and building them is not its job', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 12345 });
    const before = CATALOG_SPECIES.filter(catalogReady).length;
    expect(catalogsReady(CATALOG_SPECIES)).toBe(false);
    const html = renderToStaticMarkup(
      createElement(CollectionView, { g, open: null, onOpen: () => {}, reveal: 0, availability: () => ({ text: '', available: false }), onSpeciesPage: () => {}, onOffer: () => {} }),
    );
    expect(html).toContain('Counting your collection…');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('data-testid="collection-card-');
    expect(CATALOG_SPECIES.filter(catalogReady).length).toBe(before);
    // the subtitle's percentage needs only the found species' catalogs
    expect(percentCatalogs(g).map((sp) => sp.id)).toEqual(['betta']);
  });

  it('a catalog built a slice at a time is the one built in one go, exactly', () => {
    for (const id of ['betta', 'fancy_guppy', 'koi', 'cherry_shrimp', 'axolotl', 'ocellaris_clownfish']) {
      const sp = getSpecies(id);
      expect(buildMorphCatalog(sp, 997)).toEqual(buildMorphCatalog(sp));
    }
  });

  it('warmCatalog walks a step at a time; morphCatalog finishes a build begun in slices with the same result', () => {
    const platy = getSpecies('platy');
    expect(catalogReady(platy)).toBe(false);
    let calls = 1;
    while (!warmCatalog(platy, STEP)) calls++;
    expect(calls).toBeGreaterThan(1);
    expect(catalogReady(platy)).toBe(true);
    expect(morphCatalog(platy)).toEqual(buildMorphCatalog(platy));
    const swordtail = getSpecies('swordtail');
    expect(warmCatalog(swordtail, 10)).toBe(false);
    expect(catalogReady(swordtail)).toBe(false);
    expect(morphCatalog(swordtail)).toEqual(buildMorphCatalog(swordtail));
    expect(warmCatalog(swordtail, 10)).toBe(true);
  });

  it('requestCatalogs builds nothing in the call, then builds the rest in the background', async () => {
    const want = [getSpecies('medaka'), getSpecies('discus'), getSpecies('platy')];
    expect(requestCatalogs(want)).toBe(false);
    expect(catalogReady(want[0])).toBe(false);
    expect(catalogReady(want[1])).toBe(false);
    await vi.waitFor(() => expect(catalogsReady(want)).toBe(true), { timeout: 15_000, interval: 20 });
    expect(requestCatalogs(want)).toBe(true);
  });
});
