// @vitest-environment node
/**
 * lane:render (BACKLOG B-181) — the portrait cache has a cap: past it the portraits nothing is showing go, least
 * recently used first, and their blob URLs are released. What is on screen, or was handed to a caller that keeps the
 * URL, is never dropped.
 */
import { describe, it, expect } from 'vitest';
import { PORTRAIT_CACHE_MAX, evictPortraits, portraitCacheSize, portraitCached, portraitKey, prewarmPortraits, clearPortraitCache, showPortrait } from '@/render/portraits';

const cacheOf = (n: number): Map<string, string | null> => new Map(Array.from({ length: n }, (_, i) => [`k${i}`, `blob:portrait-${i}`] as [string, string]));

describe('B-181: the portrait cache is capped', () => {
  it('under the cap nothing goes', () => {
    const cache = cacheOf(5);
    const released: string[] = [];
    expect(evictPortraits(cache, () => false, 5, (u) => released.push(u))).toBe(0);
    expect(cache.size).toBe(5);
    expect(released).toEqual([]);
  });

  it('past the cap the oldest go first, down to the cap, and each blob URL is released once', () => {
    const cache = cacheOf(8);
    const released: string[] = [];
    expect(evictPortraits(cache, () => false, 5, (u) => released.push(u))).toBe(3);
    expect([...cache.keys()]).toEqual(['k3', 'k4', 'k5', 'k6', 'k7']);
    expect(released).toEqual(['blob:portrait-0', 'blob:portrait-1', 'blob:portrait-2']);
  });

  it('a portrait in use is never dropped, however old; the next oldest goes instead', () => {
    const cache = cacheOf(8);
    const released: string[] = [];
    const shown = new Set(['k0', 'k2']);
    expect(evictPortraits(cache, (k) => shown.has(k), 5, (u) => released.push(u))).toBe(3);
    expect([...cache.keys()]).toEqual(['k0', 'k2', 'k5', 'k6', 'k7']);
    expect(released).toEqual(['blob:portrait-1', 'blob:portrait-3', 'blob:portrait-4']);
  });

  it('when everything is in use the cache stays over the cap rather than drop what is on screen', () => {
    const cache = cacheOf(8);
    const released: string[] = [];
    expect(evictPortraits(cache, () => true, 5, (u) => released.push(u))).toBe(0);
    expect(cache.size).toBe(8);
    expect(released).toEqual([]);
  });

  it('only blob URLs are released: a data URL or a portrait that could not be made just goes', () => {
    const cache = new Map<string, string | null>([
      ['a', null],
      ['b', 'data:image/png;base64,AAAA'],
      ['c', 'blob:portrait-c'],
      ['d', 'blob:portrait-d'],
    ]);
    const released: string[] = [];
    expect(evictPortraits(cache, () => false, 1, (u) => released.push(u))).toBe(3);
    expect([...cache.keys()]).toEqual(['d']);
    expect(released).toEqual(['blob:portrait-c']);
  });

  /** Subjects no species matches: each is stored at once as "no portrait" (an entry with no picture), nobody showing it. */
  const nobody = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ speciesId: `no_such_species_${from + i}` }));

  it('the module keeps its own cache to the cap (entries for subjects it cannot draw, which need no WebGL)', () => {
    clearPortraitCache();
    prewarmPortraits(nobody(0, PORTRAIT_CACHE_MAX + 50), 64);
    expect(portraitCacheSize()).toBe(PORTRAIT_CACHE_MAX);
    expect(portraitCached(portraitKey({ speciesId: 'no_such_species_0' }, 64)!), 'the oldest went').toBe(false);
    expect(portraitCached(portraitKey({ speciesId: `no_such_species_${PORTRAIT_CACHE_MAX + 49}` }, 64)!), 'the newest stayed').toBe(true);
    clearPortraitCache();
    expect(portraitCacheSize()).toBe(0);
  });

  it('a portrait on screen stays in the module\'s cache past the cap, from the commit that showed it until it is gone', () => {
    clearPortraitCache();
    prewarmPortraits(nobody(0, 3), 64);
    const first = portraitKey({ speciesId: 'no_such_species_0' }, 64)!;
    const second = portraitKey({ speciesId: 'no_such_species_1' }, 64)!;
    // two mounted portraits show the first (the hook's layout effect calls this), nothing shows the second
    const offA = showPortrait(first);
    const offB = showPortrait(first);
    prewarmPortraits(nobody(1000, PORTRAIT_CACHE_MAX + 10), 64);
    expect(portraitCached(first), 'shown: kept, however old').toBe(true);
    expect(portraitCached(second), 'not shown: gone').toBe(false);
    // one of the two goes: still shown
    offA();
    offA(); // a cleanup that runs twice counts once
    prewarmPortraits(nobody(3000, PORTRAIT_CACHE_MAX + 10), 64);
    expect(portraitCached(first), 'still shown by the other').toBe(true);
    // the last one goes: it can be dropped like any other, oldest first
    offB();
    prewarmPortraits(nobody(5000, PORTRAIT_CACHE_MAX + 10), 64);
    expect(portraitCached(first), 'no longer shown: gone with the next trim').toBe(false);
    expect(portraitCacheSize()).toBe(PORTRAIT_CACHE_MAX);
    clearPortraitCache();
  });
});
