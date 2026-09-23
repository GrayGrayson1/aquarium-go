// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import {
  simulateOffline,
  offlineHoursFor,
  loadAndResume,
  saveGame,
  setStorageBackend,
  createMemoryBackend,
  GRACE_HEALTH_FLOOR,
} from '@/persistence';
import { OFFLINE_CAP_HOURS, GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { communityFw, offlineTest } from '@/dev/fixtures/core-fixtures';
import { findNonFinite } from '@/dev/fixtures/core-testkit';

const DAY_MS = 24 * 3600 * 1000;

beforeEach(() => setStorageBackend(createMemoryBackend()));

describe('core offline progress', () => {
  it('converts real time at 1× and caps it', () => {
    expect(offlineHoursFor(10_000).hours).toBeCloseTo(10 * GAME_HOURS_PER_REAL_SECOND);
    expect(offlineHoursFor(3 * DAY_MS).hours).toBe(OFFLINE_CAP_HOURS);
    expect(offlineHoursFor(3 * DAY_MS).uncapped).toBeGreaterThan(OFFLINE_CAP_HOURS);
    expect(offlineHoursFor(-5).hours).toBe(0);
  });

  it('simulates exactly the capped hours and removes the grace flag', () => {
    const g = newGame({ starterId: 'axolotl', starterName: 'Away', seed: 31 });
    const start = g.clock.hour;
    const s = simulateOffline(g, 7 * DAY_MS);
    expect(s.hours).toBe(OFFLINE_CAP_HOURS);
    expect(s.capped).toBe(true);
    expect(g.clock.hour).toBeCloseTo(start + OFFLINE_CAP_HOURS, 6);
    expect(g.offlineGrace).toBeUndefined();
    expect(g.log.some((e) => e.text.startsWith('While you were away'))).toBe(true);
    for (const t of Object.values(g.tanks)) expect(t.simDebtHours ?? 0).toBe(0);
  });

  it('grace period: nothing dies even in terrible conditions', () => {
    const g = communityFw();
    for (const c of Object.values(g.creatures)) {
      c.stats.health = 3;
      c.stats.hunger = 100;
      c.stats.stress = 100;
    }
    for (const t of Object.values(g.tanks)) Object.assign(t.water, { ammonia: 6, nitrite: 4, oxygen: 0.1, tempC: 34 });
    const alive = Object.values(g.creatures).filter((c) => c.status === 'alive').map((c) => c.id);
    const s = simulateOffline(g, 30 * DAY_MS);
    expect(s.hours).toBe(OFFLINE_CAP_HOURS);
    for (const id of alive) {
      expect(g.creatures[id]?.status, `creature ${id}`).toBe('alive');
      expect(g.creatures[id].stats.health).toBeGreaterThanOrEqual(GRACE_HEALTH_FLOOR);
    }
    expect(g.log.some((e) => e.kind === 'death')).toBe(false);
    expect(findNonFinite(g)).toEqual([]);
  });

  it('a paused game accumulates no offline time', () => {
    const g = newGame({ starterId: 'betta', starterName: 'P', seed: 5 });
    g.clock.speed = 0;
    const h = g.clock.hour;
    expect(simulateOffline(g, 2 * DAY_MS).hours).toBe(0);
    expect(g.clock.hour).toBe(h);
  });

  it('loadAndResume loads, catches up, and makes it the running game', async () => {
    const g = offlineTest();
    const lastTick = g.lastTickRealMs;
    await saveGame(g, 'slot1');
    const r = await loadAndResume('slot1', { now: lastTick + 2 * DAY_MS });
    expect(r.ok).toBe(true);
    expect(r.summary?.hours).toBe(OFFLINE_CAP_HOURS);
    const running = useGame.getState().game!;
    expect(running.saveId).toBe(g.saveId);
    expect(running.clock.hour).toBeCloseTo(g.clock.hour + OFFLINE_CAP_HOURS, 6);
    expect(running.lastTickRealMs).toBe(lastTick + 2 * DAY_MS);
    expect(useUI.getState().screen).toBe('game');
    expect(Object.values(running.creatures).every((c) => c.status !== 'dead')).toBe(true);
  });

  it('loadAndResume reports a friendly error for an empty slot', async () => {
    const r = await loadAndResume('slot3', { apply: false });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
