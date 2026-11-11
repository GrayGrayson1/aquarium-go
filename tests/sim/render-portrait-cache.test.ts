// @vitest-environment node
/**
 * lane:render (BACKLOG B-181) — the portrait cache has a cap: past it the portraits nothing is showing go, least
 * recently used first, and their blob URLs are released. What is on screen, or was handed to a caller that keeps the
 * URL, is never dropped.
 */
import { describe, it, expect } from 'vitest';
import { PORTRAIT_CACHE_MAX, evictPortraits, portraitCacheSize, prewarmPortraits, clearPortraitCache } from '@/render/portraits';

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

  it('the module keeps its own cache to the cap (here with no WebGL, where every portrait is an empty entry)', () => {
    clearPortraitCache();
    // subjects no species matches: each is stored at once as "no portrait", with nobody showing it
    prewarmPortraits(
      Array.from({ length: PORTRAIT_CACHE_MAX + 50 }, (_, i) => ({ speciesId: `no_such_species_${i}` })),
      64,
    );
    expect(portraitCacheSize()).toBe(PORTRAIT_CACHE_MAX);
    clearPortraitCache();
    expect(portraitCacheSize()).toBe(0);
  });
});
