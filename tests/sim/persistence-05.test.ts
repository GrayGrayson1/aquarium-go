/**
 * lane:core (chunk 3; 0.5 spec §15, §20.1; PERSIST-006's automation part, AUTO-018 A2) — the Auto Water Changer's two
 * last-run hours in a save: kept when they are finite numbers, removed with a repair note when they aren't, and
 * nothing at all when absent (the stateHash of a save without them is unchanged). A 0.5 game round-trips with no
 * repairs and the same hash twice over. Production lines (chunk 4) add their cases here.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { installEquipment } from '@/sim/care';
import { advanceWorld } from '@/sim/world';
import { encodeRecord, decodeRecord, stateHash } from '@/persistence';
import { repairState } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';

const roundTrip = (g: GameState) => decodeRecord(encodeRecord(g, 'auto').text);

function game(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 21 });
  g.isShowcase = false;
  return g;
}

describe('PERSIST-006: the lab hours', () => {
  it('a 0.5 game with the device, after it ran, round-trips with no repairs and the same hash twice', () => {
    const g = game();
    const id = g.tankOrder[0];
    g.progress.unlocked.push('gear_autofeeder');
    expect(installEquipment(g, id, 'auto_water_changer', { purchased: true }).ok).toBe(true);
    advanceWorld(g, 30, { forceFull: true });
    expect(g.tanks[id].water.lab?.lastAutoChangeHour).toBeDefined();
    expect(g.tanks[id].water.lab?.lastAutoScrapeHour).toBeDefined();
    const once = roundTrip(g);
    expect(once.repairs).toEqual([]);
    const twice = roundTrip(once.state);
    expect(twice.repairs).toEqual([]);
    expect(stateHash(twice.state)).toBe(stateHash(once.state));
    expect(once.state.tanks[id].water.lab?.lastAutoChangeHour).toBe(g.tanks[id].water.lab?.lastAutoChangeHour);
  });

  it('a non-finite hour is removed with a note; the other stays', () => {
    const g = game();
    const id = g.tankOrder[0];
    const lab = (g.tanks[id].water.lab ??= {});
    lab.lastAutoChangeHour = 'soon' as unknown as number;
    lab.lastAutoScrapeHour = g.clock.hour - 2;
    const raw = clonePlain(g) as unknown as Record<string, unknown>;
    const repairs = repairState(raw);
    const fixed = (raw as unknown as GameState).tanks[id].water.lab!;
    expect(repairs).toContain(`tank ${id}.water.lab.lastAutoChangeHour: soon, removed`);
    expect(fixed.lastAutoChangeHour).toBeUndefined();
    expect(fixed.lastAutoScrapeHour).toBe(g.clock.hour - 2);
    // JSON has no Infinity or NaN (the serializer writes non-finite numbers as 0); a null in the file is repaired
    const nulled = clonePlain(g) as unknown as Record<string, unknown>;
    ((nulled as unknown as GameState).tanks[id].water.lab as Record<string, unknown>).lastAutoChangeHour = null;
    expect(repairState(nulled)).toContain(`tank ${id}.water.lab.lastAutoChangeHour: null, removed`);
  });

  it('an hour after the save’s clock is removed too (it would stop the device and keep keepers away for good)', () => {
    const g = game();
    const id = g.tankOrder[0];
    const lab = (g.tanks[id].water.lab ??= {});
    lab.lastAutoChangeHour = g.clock.hour + 500;
    lab.lastAutoScrapeHour = g.clock.hour;
    const raw = clonePlain(g) as unknown as Record<string, unknown>;
    expect(repairState(raw)).toContain(`tank ${id}.water.lab.lastAutoChangeHour: ${g.clock.hour + 500}, removed`);
    const fixed = (raw as unknown as GameState).tanks[id].water.lab!;
    expect(fixed.lastAutoChangeHour).toBeUndefined();
    expect(fixed.lastAutoScrapeHour).toBe(g.clock.hour);
  });

  it('absent hours need no repair and leave the stateHash as it was', () => {
    const g = game();
    const id = g.tankOrder[0];
    const before = stateHash(g);
    const withUndefined = clonePlain(g);
    const lab = (withUndefined.tanks[id].water.lab ??= {});
    lab.lastAutoChangeHour = undefined;
    lab.lastAutoScrapeHour = undefined;
    expect(stateHash(withUndefined)).toBe(before);
    expect(roundTrip(g).repairs).toEqual([]);
  });

  it('a fresh game needs no repairs', () => {
    expect(roundTrip(game()).repairs).toEqual([]);
  });
});
