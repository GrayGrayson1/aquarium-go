// @vitest-environment node
/**
 * lane:fix-core — offline / resume regressions from the audit:
 *   P5-02  the grace floors never make anything better than it was when saved (reload used to heal a dying tank)
 *   P7-10  a quick reload catches up quietly: no welcome-back card, toast or log line under a real minute away
 *   S06-02 the welcome-back card pauses the clock; dismissing it resumes the saved speed
 *   P5-11  the summary is dropped when another game takes over (no stale card on a New Game)
 *   P5-09  a tab hidden for a long spell catches up when it comes back, like Continue would
 *   P6-08  UI toasts are dropped when another game takes over
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import {
  simulateOffline,
  loadAndResume,
  saveGame,
  setStorageBackend,
  createMemoryBackend,
  resetSaveSession,
  useResume,
  catchUpAfterHidden,
  saveCurrentGame,
  loadGameDetailed,
  OFFLINE_MIN_REAL_MS,
  OFFLINE_HIDDEN_MIN_MS,
  GRACE_HEALTH_FLOOR,
  GRACE_MAX_HUNGER,
  GRACE_MAX_TOXIN_PPM,
} from '@/persistence';
import { OFFLINE_CAP_HOURS } from '@/sim/time';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { communityFw } from '@/dev/fixtures/core-fixtures';
import { resetFastMutate } from '@/game/fastMutate';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { starterAquascape } from '@/sim/aquascape';
import { installEquipment, setEquipment } from '@/sim/care';
import { simRng } from '@/sim/rng';

const MIN = 60_000;
const HOUR = 3600_000;

function dying() {
  const g = communityFw();
  g.isShowcase = false;
  for (const c of Object.values(g.creatures)) {
    c.stats.health = 4;
    c.stats.hunger = 97;
  }
  for (const t of Object.values(g.tanks)) Object.assign(t.water, { ammonia: 3.5, nitrite: 2.5, oxygen: 0.3, level: 0.7 });
  return g;
}

beforeEach(() => {
  setStorageBackend(createMemoryBackend());
  resetSaveSession();
  resetFastMutate();
  useGame.getState().setGame(null);
  useResume.setState({ summary: null });
  useUI.setState({ screen: 'title', toasts: [] });
});

describe('P5-02: no free healing on resume', () => {
  it('a 2-second reload leaves a dying tank exactly as dying', () => {
    const g = dying();
    const s = simulateOffline(g, 2000);
    expect(s.hours).toBeGreaterThan(0);
    for (const c of Object.values(g.creatures)) {
      if (c.status !== 'alive') continue;
      expect(c.stats.health).toBeLessThanOrEqual(4 + 1e-9);
      expect(c.stats.hunger).toBeLessThanOrEqual(97 + 1e-9); // R03-04: staff feeding during the catch-up counts
    }
    for (const t of Object.values(g.tanks)) {
      expect(t.water.ammonia).toBeGreaterThan(GRACE_MAX_TOXIN_PPM * 2);
      expect(t.water.oxygen).toBeLessThan(0.55);
      expect(t.water.level).toBeLessThan(0.9);
    }
  });

  it('a long absence holds a dying tank where it was — alive, but no better than the save', () => {
    const g = dying();
    const alive = Object.values(g.creatures).filter((c) => c.status === 'alive').map((c) => c.id);
    const s = simulateOffline(g, 8 * HOUR);
    expect(s.hours).toBe(OFFLINE_CAP_HOURS);
    for (const id of alive) {
      const c = g.creatures[id];
      expect(c.status).toBe('alive');
      expect(c.stats.health).toBeCloseTo(4, 6);
      expect(c.stats.hunger).toBeLessThanOrEqual(97 + 1e-9); // never hungrier than saved; feeding still counts (R03-04)
    }
    for (const t of Object.values(g.tanks)) {
      expect(t.water.ammonia).toBeLessThanOrEqual(3.5 + 1e-9);
      expect(t.water.nitrite).toBeLessThanOrEqual(2.5 + 1e-9);
      expect(t.water.oxygen).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(t.water.level).toBeGreaterThanOrEqual(0.7 - 1e-9);
    }
  });

  it('a healthy tank still gets the usual floors (nothing dies, health never below the floor)', () => {
    const g = communityFw();
    g.isShowcase = false;
    for (const t of Object.values(g.tanks)) Object.assign(t.water, { ammonia: 6, nitrite: 4, oxygen: 0.1, tempC: 34 });
    const alive = Object.values(g.creatures).filter((c) => c.status === 'alive').map((c) => c.id);
    simulateOffline(g, 30 * 24 * HOUR);
    for (const id of alive) {
      expect(g.creatures[id].status).toBe('alive');
      expect(g.creatures[id].stats.health).toBeGreaterThanOrEqual(GRACE_HEALTH_FLOOR);
      expect(g.creatures[id].stats.hunger).toBeLessThanOrEqual(GRACE_MAX_HUNGER);
    }
    // the water was saved at 6 ppm: held at no worse than that (not cleaned to the 0.5 watch level for free)
    for (const t of Object.values(g.tanks)) expect(t.water.ammonia).toBeLessThanOrEqual(6 + 1e-9);
  });
});

describe('R03-04: feeding during the catch-up counts for animals saved outside the grace limits', () => {
  function feederTank(hunger: number, health: number) {
    const s = newGame({ starterId: 'betta', starterName: 'T', seed: 5 });
    for (const id of Object.keys(s.creatures)) delete s.creatures[id];
    for (const id of [...s.tankOrder]) delete s.tanks[id];
    s.tankOrder = [];
    s.isShowcase = false;
    s.clock.speed = 1;
    s.inventory.foods = { flake_tropical: 2000 };
    const tank = createTank(s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 0, z: 0, rotY: 0 } });
    tank.decor = starterAquascape(s, 'generic', tank);
    installEquipment(s, tank.id, 'autofeeder', { purchased: true });
    setEquipment(s, tank.id, tank.equipment.find((e) => e.defId === 'autofeeder')!.id, { setting: 2 });
    const rng = simRng(s);
    for (let i = 0; i < 6; i++) addCreature(s, createCreature(s, rng, 'neon_tetra', { ageDays: 40 }), tank.id);
    for (const c of Object.values(s.creatures)) Object.assign(c.stats, { hunger, health });
    return s;
  }
  const alive = (s: ReturnType<typeof feederTank>) => Object.values(s.creatures).filter((c) => c.status === 'alive');

  it('an autofed tank saved hungry comes back fed', () => {
    const s = feederTank(80, 60);
    simulateOffline(s, 2 * HOUR);
    for (const c of alive(s)) expect(c.stats.hunger).toBeLessThan(70);
  });

  it('a starving, critically ill tank is fed but never healed past what the catch-up earned', () => {
    const s = feederTank(98, 10);
    simulateOffline(s, 2 * HOUR);
    // the same tank saved healthy shows what feeding earns over the catch-up: the sick tank recovers no faster
    const ref = feederTank(80, 60);
    simulateOffline(ref, 2 * HOUR);
    const earned = Math.max(...alive(ref).map((c) => c.stats.health - 60));
    for (const c of alive(s)) {
      expect(c.stats.hunger).toBeLessThan(98);
      expect(c.stats.health).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(c.stats.health).toBeLessThanOrEqual(10 + earned + 1e-6); // P-3: real recovery counts, the floor never adds
    }
  });

  it('an unfed, critically ill tank comes back exactly as it was saved', () => {
    const s = feederTank(98, 10);
    for (const t of Object.values(s.tanks)) t.equipment = t.equipment.filter((e) => e.defId !== 'autofeeder');
    simulateOffline(s, 2 * HOUR);
    for (const c of alive(s)) {
      expect(c.stats.hunger).toBeCloseTo(98, 6);
      expect(c.stats.health).toBeCloseTo(10, 6);
    }
  });
});

describe('P7-10: quick reloads are quiet', () => {
  it('no log line under a minute, a "game time" line after', () => {
    const a = newGame({ starterId: 'betta', starterName: 'Quiet', seed: 21 });
    simulateOffline(a, 5000);
    expect(a.log.some((e) => e.text.startsWith('While you were away'))).toBe(false);
    const b = newGame({ starterId: 'betta', starterName: 'Loud', seed: 21 });
    simulateOffline(b, OFFLINE_MIN_REAL_MS + 1000);
    const line = b.log.find((e) => e.text.startsWith('While you were away'));
    expect(line?.text).toMatch(/of game time/);
  });

  it('loadAndResume publishes no card for a 4-second reload but still catches up', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Reload', seed: 22 });
    g.clock.speed = 10;
    const hour = g.clock.hour;
    const now = Date.now();
    g.lastTickRealMs = now - 4000;
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    const r = await loadAndResume('auto', { now });
    expect(r.ok).toBe(true);
    expect(r.summary!.hours).toBeCloseTo(0.4, 6);
    expect(useResume.getState().summary).toBeNull();
    expect(useGame.getState().game!.clock.hour).toBeCloseTo(hour + 0.4, 6);
    expect(useGame.getState().game!.clock.speed).toBe(10); // keeps the saved speed when there is no card
  });
});

describe('S06-02: the welcome-back card pauses the clock', () => {
  it('pauses on resume and restores the saved speed when the card is dismissed', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Card', seed: 23 });
    g.clock.speed = 10;
    const now = Date.now();
    g.lastTickRealMs = now - 3 * HOUR;
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    const r = await loadAndResume('auto', { now });
    expect(r.ok).toBe(true);
    const summary = useResume.getState().summary;
    expect(summary).toBeTruthy();
    expect(summary!.resumeSpeed).toBe(10);
    expect(useGame.getState().game!.clock.speed).toBe(0);
    useResume.getState().clear();
    expect(useResume.getState().summary).toBeNull();
    expect(useGame.getState().game!.clock.speed).toBe(10);
  });

  it('does not override a speed the player already chose while the card was up', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Card2', seed: 24 });
    g.clock.speed = 3;
    const now = Date.now();
    g.lastTickRealMs = now - 2 * HOUR;
    await saveGame(g, 'auto');
    await loadAndResume('auto', { now });
    useGame.getState().mutate((d) => {
      d.clock.speed = 1;
    });
    useResume.getState().clear();
    expect(useGame.getState().game!.clock.speed).toBe(1);
  });
});

describe('R03-03: the card’s pause is never saved', () => {
  it('open the card, leave without dismissing it: the save keeps the speed and the next absence still passes time', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Glance', seed: 25 });
    g.clock.speed = 3;
    const now = Date.now();
    g.lastTickRealMs = now - 6 * HOUR;
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    await loadAndResume('auto', { now });
    useUI.setState({ screen: 'game' });
    expect(useGame.getState().game!.clock.speed).toBe(0); // the card is up
    expect((await saveCurrentGame('auto', { flush: true })).ok).toBe(true); // phone locked: hidden autosave
    expect(useGame.getState().game!.clock.speed).toBe(0); // the live game stays paused under the card
    const stored = await loadGameDetailed('auto');
    expect(stored.state!.clock.speed).toBe(3);
    const r2 = await loadAndResume('auto', { now: Date.now() + 12 * HOUR });
    expect(r2.summary!.hours).toBeGreaterThan(0);
    expect(useResume.getState().summary?.resumeSpeed).toBe(3);
  });
});

describe('P5-11 / P6-08: nothing from the previous aquarium leaks into the next', () => {
  it('drops the summary and pending toasts when another game takes over', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Stale', seed: 25 });
    const now = Date.now();
    g.lastTickRealMs = now - 2 * HOUR;
    await saveGame(g, 'auto');
    await loadAndResume('auto', { now });
    expect(useResume.getState().summary).toBeTruthy();
    useUI.getState().toast('111 fry are free-swimming!', 'celebrate');
    expect(useUI.getState().toasts.length).toBe(1);
    useGame.getState().setGame(newGame({ starterId: 'axolotl', starterName: 'Fresh', seed: 26 }));
    expect(useResume.getState().summary).toBeNull();
    expect(useUI.getState().toasts).toEqual([]);
  });
});

describe('P5-09: a long hidden spell catches up on return', () => {
  function running(speed: 1 | 3 | 10 | 0 = 1) {
    const g = newGame({ starterId: 'betta', starterName: 'Hidden', seed: 27 });
    g.isShowcase = false;
    g.clock.speed = speed;
    useGame.getState().setGame(g);
    useUI.setState({ screen: 'game' });
    return g;
  }

  it('a short break just pauses (no jump, no card)', () => {
    const g = running();
    const hour = g.clock.hour;
    expect(catchUpAfterHidden(OFFLINE_HIDDEN_MIN_MS - 1000)).toBeNull();
    expect(useGame.getState().game!.clock.hour).toBe(hour);
    expect(useResume.getState().summary).toBeNull();
  });

  it('a long break runs the bounded catch-up with the card', () => {
    const g = running(10);
    const hour = g.clock.hour;
    const s = catchUpAfterHidden(6 * MIN);
    expect(s).toBeTruthy();
    expect(s!.uncappedHours).toBeCloseTo(36, 6);
    expect(s!.hours).toBe(OFFLINE_CAP_HOURS);
    const now = useGame.getState().game!;
    expect(now.clock.hour).toBeCloseTo(hour + OFFLINE_CAP_HOURS, 6);
    expect(now.clock.speed).toBe(0);
    expect(useResume.getState().summary?.resumeSpeed).toBe(10);
    expect(now.offlineGrace).toBeUndefined();
    expect(catchUpAfterHidden(7 * 24 * HOUR)).toBeNull(); // paused by the card: nothing more happens
  });

  it('a paused game and a showcase never catch up', () => {
    running(0);
    expect(catchUpAfterHidden(HOUR)).toBeNull();
    const g = running(1);
    g.isShowcase = true;
    useGame.getState().setGame({ ...g });
    expect(catchUpAfterHidden(HOUR)).toBeNull();
  });
});
