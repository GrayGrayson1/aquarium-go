/**
 * Round-3 UI-A (T-1) — "a new version is ready": the pure rules behind UpdatePrompt (build id, version.json URL and
 * parsing). The prompt itself, the save-then-reload and the emitted version.json were checked against a production
 * build in the browser.
 */
import { describe, it, expect } from 'vitest';
import { BUILD_ID, isNewBuild, parseBuildId, versionUrl, fetchLiveBuildId, checkGate, CHECK_GAP_MS, CHECK_BURST_MS } from '@/ui/hud/updateCheck';

describe('update check', () => {
  it('tests and the dev server run as "dev" and never ask the network', async () => {
    expect(BUILD_ID).toBe('dev');
    expect(await fetchLiveBuildId('/')).toBeNull();
  });

  it('only a different, well-formed deployed id counts as new', () => {
    expect(isNewBuild('abc1234-mup1', 'abc1234-mup9')).toBe(true);
    expect(isNewBuild('abc1234-mup1', 'abc1234-mup1')).toBe(false);
    expect(isNewBuild('abc1234-mup1', null)).toBe(false);
    expect(isNewBuild('dev', 'abc1234-mup9')).toBe(false);
    expect(parseBuildId({ id: 'c92f981-mup19l01' })).toBe('c92f981-mup19l01');
    for (const bad of [null, 'c92f981', {}, { id: 42 }, { id: '' }, { id: '<script>' }, { id: 'x'.repeat(65) }]) expect(parseBuildId(bad)).toBeNull();
  });

  it('asks next to index.html, under the Pages base path, past every cache', () => {
    expect(versionUrl('/', 5)).toBe('/version.json?t=5');
    expect(versionUrl('/AquariumGo/', 5)).toBe('/AquariumGo/version.json?t=5');
    expect(versionUrl('./', 5)).toBe('./version.json?t=5');
    expect(versionUrl('/AquariumGo', 5)).toBe('/AquariumGo/version.json?t=5');
  });

  it('a return inside the 15 s gap is answered when the gap ends, never dropped; one return asks once', () => {
    let t = 0;
    const timers: { fn: () => void; at: number }[] = [];
    const runs: number[] = [];
    const gate = checkGate(
      () => runs.push(t),
      () => t,
      { set: (fn, ms) => timers.push({ fn, at: t + ms }), clear: () => {} },
    );
    const advance = (ms: number) => {
      const end = t + ms;
      for (const x of timers.splice(0).sort((a, b) => a.at - b.at)) {
        if (x.at > end) timers.push(x);
        else {
          t = x.at;
          x.fn();
        }
      }
      t = end;
    };
    gate.ask(); // the first look
    expect(runs).toEqual([0]);
    advance(300);
    gate.ask(); // focus + visibilitychange of the same return
    expect(runs).toEqual([0]);
    advance(7_000);
    gate.ask(); // a real return 7 s later: waits for the gap, then asks
    gate.ask();
    expect(runs).toEqual([0]);
    advance(CHECK_GAP_MS);
    expect(runs).toEqual([0, CHECK_GAP_MS]);
    advance(CHECK_GAP_MS + CHECK_BURST_MS);
    gate.ask(); // past the gap: at once
    expect(runs.length).toBe(3);
    expect(runs[2]).toBe(t);
  });
});
