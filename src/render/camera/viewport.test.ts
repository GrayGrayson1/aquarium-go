import { describe, expect, it } from 'vitest';
import { computeFreeRect, computeMenuRect, type FreeRect, type Occlusion } from './viewport';

const none = (): Occlusion => ({ left: 0, right: 0, top: 0, bottom: 0 });
const rect = (): FreeRect => ({ x0: 0, y0: 0, x1: 0, y1: 0 });

describe('free viewport', () => {
  it('in game keeps the HUD reserve and honours a side sheet', () => {
    const r = computeFreeRect(1440, 900, { ...none(), right: 420 }, true, rect());
    expect(r.x1).toBe(1020);
    expect(r.y0).toBeGreaterThan(0);
    expect(r.y1).toBeLessThan(900);
  });

  it('a left sheet on desktop keeps the tool-rail strip on the right clear (lane:qa-visual)', () => {
    const r = computeFreeRect(1440, 900, { ...none(), left: 420 }, true, rect());
    expect(r.x0).toBe(420);
    expect(r.x1).toBeLessThanOrEqual(1440 - 90);
    const phone = computeFreeRect(390, 844, { ...none(), left: 200 }, true, rect());
    expect(phone.x1).toBe(390);
  });

  it('ignores a sheet that would leave too little of the canvas', () => {
    const r = computeFreeRect(1440, 900, { ...none(), right: 1200 }, true, rect());
    expect(r.x1).toBe(1440);
  });

  it('portrait menus frame the tank in the band above the copy', () => {
    const title = computeMenuRect(390, 844, none(), 'title', rect());
    const starter = computeMenuRect(390, 844, none(), 'starter', rect());
    expect(title.x0).toBe(0);
    expect(title.x1).toBe(390);
    expect(title.y0).toBeGreaterThan(0);
    expect(title.y1).toBeLessThan(844 * 0.6);
    // the starter pick has its detail block higher up the screen
    expect(starter.y1).toBeLessThan(title.y1);
  });

  it('landscape menus keep the whole canvas', () => {
    const r = computeMenuRect(1440, 900, none(), 'title', rect());
    expect(r).toEqual({ x0: 0, y0: 0, x1: 1440, y1: 900 });
  });

  it('measured [data-occlude] blocks on a menu win over the fallback band', () => {
    const r = computeMenuRect(390, 844, { ...none(), bottom: 500 }, 'starter', rect());
    expect(r.y0).toBe(0);
    expect(r.y1).toBe(344);
  });
});
