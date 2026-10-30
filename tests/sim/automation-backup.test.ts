// @vitest-environment node
/**
 * lane:automation (chunk 5; AUTO-027 A2) — recovering from the backup slot never duplicates a line's output: a farm with
 * a running line and both facility rooms is saved mid-pipeline, saved again later (so the first save becomes the
 * backup), and the main copy is damaged. The game recovered from the backup and the main save it was written as go on
 * to the same line outputs and the same world, with no creature or listing twice.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState } from '@/types';
import { lineFarm, lineRecord } from './support/production';
import { run } from './support/automation';
import { installFoodRoom, installWaterRoom } from '@/sim/automation';
import { createMemoryBackend, decodeRecord, encodeRecord, loadGameDetailed, rawSlot, saveGame, setStorageBackend, stateHash } from '@/persistence';

beforeEach(() => {
  setStorageBackend(createMemoryBackend());
});

const ids = (g: GameState) => ({
  creatures: Object.keys(g.creatures).length,
  listed: g.market.listings.flatMap((l) => (l.status === 'active' ? l.creatureIds : [])),
});

describe('AUTO-027: recovering from the backup slot', () => {
  it('continues to the same line outputs as the main save it was, with nothing created or counted twice', async () => {
    const { g } = lineFarm(17);
    installWaterRoom(g, g.clock.hour);
    installFoodRoom(g);
    g.inventory.brineShrimpEggs = 30;
    run(g, 30); // the brood is raising, the cones are running
    await saveGame(g, 'slot1');
    const main = decodeRecord(encodeRecord(g, 'slot1').text).state; // the main save as written
    run(g, 6);
    await saveGame(g, 'slot1'); // the earlier save rotates into the backup
    await rawSlot.set('slot1', '{"damaged":'); // and the main copy is lost
    const r = await loadGameDetailed('slot1');
    expect(r.ok).toBe(true);
    expect(r.restoredFromBackup).toBe(true);
    const recovered = r.state!;
    expect(stateHash(recovered)).toBe(stateHash(main));
    for (const s of [main, recovered]) run(s, 24 * 9, 1); // past sorting and the 168 h quarantine
    const record = lineRecord(main);
    // the line really sorted, quarantined and listed in that time: a listing of its young comes only after the 168 h
    // quarantine (chunk 17: on another random stream the batch was already through and gone, so none was left to count)
    expect(record.sortedThroughHour).toBeDefined();
    expect(record.listings.length).toBeGreaterThan(0);
    expect(lineRecord(recovered)).toEqual(record);
    expect(recovered.production!.lines[0].stats).toEqual(main.production!.lines[0].stats);
    expect(stateHash(recovered)).toBe(stateHash(main));
    const listed = ids(recovered).listed;
    expect(new Set(listed).size).toBe(listed.length); // no creature in two listings
    expect(ids(recovered).creatures).toBe(ids(main).creatures);
  });
});
