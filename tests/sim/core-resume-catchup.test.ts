// @vitest-environment node
/**
 * lane:core (B-001, the loadAndResume part of S0 review M01 alongside PERSIST-009; security-data-1 SD-10,
 * security-data-2 m4, code-architecture-game-2 m8) — loadAndResume runs the offline catch-up on a copy. When the
 * catch-up throws part-way, the save resumes exactly as it was loaded: never half caught up, which the next autosave
 * would then write back.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import { OFFLINE_CAP_HOURS } from '@/sim/time';
import { createMemoryBackend, loadAndResume, loadGameDetailed, saveGame, setStorageBackend, stateHash } from '@/persistence';
import { useGame } from '@/state/game';

/** advanceWorld calls left before the mocked one throws (Infinity: never). */
const failAfter = vi.hoisted(() => ({ calls: Infinity }));

vi.mock('@/sim/world', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/sim/world')>();
  return {
    ...real,
    advanceWorld: (...args: Parameters<typeof real.advanceWorld>) => {
      if (failAfter.calls <= 0) throw new Error('catch-up chunk failed');
      failAfter.calls--;
      return real.advanceWorld(...args);
    },
  };
});

const DAY_MS = 24 * 3600 * 1000;

beforeEach(() => {
  failAfter.calls = Infinity;
  setStorageBackend(createMemoryBackend());
  useGame.getState().setGame(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  failAfter.calls = Infinity;
});

describe('PERSIST-009 (B-001): loadAndResume never adopts a catch-up that failed part-way', () => {
  it('the save resumes exactly as it was loaded, without the half-done catch-up', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Resume', seed: 707 });
    await saveGame(g, 'slot1');
    const loaded = await loadGameDetailed('slot1');
    expect(loaded.ok).toBe(true);
    const decoded = loaded.state!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    failAfter.calls = 3; // three catch-up chunks run, the fourth throws
    const now = g.lastTickRealMs + 2 * DAY_MS;
    const r = await loadAndResume('slot1', { now });
    expect(r.ok).toBe(true);
    expect(failAfter.calls).toBe(0); // the catch-up really ran part-way before it failed
    expect(r.summary).toBeUndefined();
    const running = useGame.getState().game!;
    expect(running).toBe(r.state);
    expect(running.clock.hour).toBe(decoded.clock.hour);
    expect(stateHash(running)).toBe(stateHash(decoded));
    expect(running.offlineGrace).toBeUndefined();
    expect(running.lastTickRealMs).toBe(now);
    expect(warn).toHaveBeenCalled();
  });

  it('control: the same load without the failure does catch up', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Resume', seed: 707 });
    await saveGame(g, 'slot1');
    const decoded = (await loadGameDetailed('slot1')).state!;
    const r = await loadAndResume('slot1', { now: g.lastTickRealMs + 2 * DAY_MS });
    expect(r.ok).toBe(true);
    expect(r.summary?.hours).toBe(OFFLINE_CAP_HOURS);
    expect(useGame.getState().game!.clock.hour).toBeCloseTo(decoded.clock.hour + OFFLINE_CAP_HOURS, 6);
  });
});
