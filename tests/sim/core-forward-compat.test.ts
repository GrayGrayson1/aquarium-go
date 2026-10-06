// @vitest-environment node
/**
 * lane:core (PERSIST-003 forward safety, ADR-0005 decision 1 "good saves going forward"; PERSIST-011;
 * security-data-2 M3, code-architecture-game-2 m1 and m2) — a newer build can add catalog items without a schema
 * change (PERSIST-007), so a schema-1 save can carry equipment, decor, frag, research and starter ids this build
 * doesn't know. repairState keeps those well-formed records exactly as saved, the world steps around them, and a save
 * from this build writes them back unchanged. Only an id that isn't a usable key (not a string, empty, or an inherited
 * Object name) is dropped or reset, and every such repair leaves a note.
 */
import { describe, it, expect } from 'vitest';
import { FIXTURES } from '@/dev/fixtures';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { acceptBid, buyTank, createListing, devOpenMarket, forceBuyerVisit } from '@/sim/economy';
import { decodeRecord, encodeRecord, repairState, stateHash, SCHEMA_VERSION } from '@/persistence';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getDecorDef } from '@/data/catalog/decor';
import { getResearch } from '@/data/research';
import { findSpecies } from '@/data/species';

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Records a newer build might write: their catalog ids don't exist in this build. */
const FUTURE = {
  equipment: { id: 'eq_future', defId: 'future_filter_2027', installedHour: 0, condition: 1, on: true },
  decor: { id: 'dc_future', defId: 'future_arch_2027', x: 0.01, y: 0, z: 0.01, rotY: 0, scale: 1, seed: 7 },
  storedEquipment: { id: 'eq_future_stored', defId: 'future_heater_2027', installedHour: 0, condition: 1, on: false },
  storedDecor: { id: 'dc_future_stored', defId: 'future_rock_2027', x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 8 },
  storedFrag: { id: 'dc_future_frag', defId: 'future_coral_2027', x: 0, y: 0, z: 0, rotY: 0, scale: 0.5, seed: 9, growth: 0.2, health: 90, frag: { takenHour: 0 } },
  listedFrag: { id: 'dc_future_listed', defId: 'future_moss_2027', x: 0, y: 0, z: 0, rotY: 0, scale: 0.5, seed: 10, growth: 0.3, health: 92, frag: { takenHour: 0 } },
  research: 'future_project_2027',
  starter: 'future_starter_2027',
};

/** The frags_market fixture (frags planted, stored and listed) saved by a newer build that added the FUTURE items. */
function futureSave(): { save: Json; tankId: string; listingId: string } {
  const save = JSON.parse(JSON.stringify(FIXTURES['frags_market']())) as Json;
  const tankId: string = save.tankOrder[0];
  const listing = save.market.listings.find((l: Json) => l.kind === 'frag' && l.status === 'active');
  save.tanks[tankId].equipment.push(structuredClone(FUTURE.equipment));
  save.tanks[tankId].decor.push(structuredClone(FUTURE.decor));
  save.inventory.equipment.push(structuredClone(FUTURE.storedEquipment));
  save.inventory.decor.push(structuredClone(FUTURE.storedDecor));
  (save.inventory.frags ??= []).push(structuredClone(FUTURE.storedFrag));
  listing.fragItems.push(structuredClone(FUTURE.listedFrag));
  save.progress.research.activeId = FUTURE.research;
  save.starterId = FUTURE.starter;
  save.progress.tutorial.starterId = FUTURE.starter;
  return { save, tankId, listingId: listing.id };
}

const has = (list: Json[] | undefined, rec: { id: string; defId: string }) => (list ?? []).some((r) => r.id === rec.id && r.defId === rec.defId);

describe('PERSIST-003 / PERSIST-011: a newer save keeps the catalog ids this build does not know', () => {
  it('the future ids really are unknown here, and the save uses this build’s schema', () => {
    for (const r of [FUTURE.equipment, FUTURE.storedEquipment]) expect(getEquipmentDef(r.defId)).toBeUndefined();
    for (const r of [FUTURE.decor, FUTURE.storedDecor, FUTURE.storedFrag, FUTURE.listedFrag]) expect(getDecorDef(r.defId)).toBeUndefined();
    expect(getResearch(FUTURE.research)).toBeUndefined();
    expect(findSpecies(FUTURE.starter)).toBeUndefined();
    const { save, listingId } = futureSave();
    expect(save.schemaVersion).toBe(SCHEMA_VERSION);
    expect(listingId).toBeTruthy();
  });

  it('loads with no repair note, and every future record is kept exactly as saved', () => {
    const { save, tankId, listingId } = futureSave();
    const d = decodeRecord(JSON.stringify(save));
    expect(d.repairs).toEqual([]);
    const s = d.state as Json;
    expect(s.tanks[tankId].equipment).toContainEqual(FUTURE.equipment);
    expect(s.tanks[tankId].decor).toContainEqual(FUTURE.decor);
    expect(s.inventory.equipment).toContainEqual(FUTURE.storedEquipment);
    expect(s.inventory.decor).toContainEqual(FUTURE.storedDecor);
    expect(s.inventory.frags).toContainEqual(FUTURE.storedFrag);
    expect(s.market.listings.find((l: Json) => l.id === listingId).fragItems).toContainEqual(FUTURE.listedFrag);
    expect(s.progress.research.activeId).toBe(FUTURE.research);
    expect(s.starterId).toBe(FUTURE.starter);
    expect(s.progress.tutorial.starterId).toBe(FUTURE.starter);
  });

  it('round-trips unchanged: save, load and save again keep the stateHash, with nothing to repair', () => {
    const { save, tankId } = futureSave();
    const first = decodeRecord(JSON.stringify(save));
    const again = decodeRecord(encodeRecord(first.state, 'auto').text);
    expect(again.repairs).toEqual([]);
    expect(stateHash(again.state)).toBe(stateHash(first.state));
    const s = again.state as Json;
    expect(s.tanks[tankId].equipment).toContainEqual(FUTURE.equipment);
    expect(s.inventory.frags).toContainEqual(FUTURE.storedFrag);
    expect(s.progress.research.activeId).toBe(FUTURE.research);
  });

  it('a second repair finds nothing to fix', () => {
    const first = decodeRecord(JSON.stringify(futureSave().save));
    expect(repairState(structuredClone(first.state))).toEqual([]);
  });

  it('the world steps 24 game hours around them without throwing, and keeps them', () => {
    const { save, tankId } = futureSave();
    const s = decodeRecord(JSON.stringify(save)).state as Json;
    const hour0 = s.clock.hour;
    expect(() => {
      for (let h = 0; h < 24; h += 0.5) advanceWorld(s, 0.5, { focusTankId: tankId });
    }).not.toThrow();
    expect(s.clock.hour).toBeCloseTo(hour0 + 24, 6);
    expect(Number.isFinite(s.finance.money)).toBe(true);
    expect(has(s.tanks[tankId].equipment, FUTURE.equipment)).toBe(true);
    expect(has(s.tanks[tankId].decor, FUTURE.decor)).toBe(true);
    expect(has(s.inventory.equipment, FUTURE.storedEquipment)).toBe(true);
    expect(has(s.inventory.decor, FUTURE.storedDecor)).toBe(true);
    expect(has(s.inventory.frags, FUTURE.storedFrag)).toBe(true);
    expect(s.starterId).toBe(FUTURE.starter);
    // research.activeId is not checked here: the research step closes a project it doesn't know, as v0.4.0 did.
  });
});

describe('PERSIST-011: what repairState still changes, it notes (code-architecture-game-2 m2)', () => {
  it('ids that are not usable keys are dropped or reset, each with a note, and a second repair finds nothing', () => {
    const g = JSON.parse(JSON.stringify(newGame({ starterId: 'betta', starterName: 'Notes', seed: 4343 }))) as Json;
    const tankId: string = g.tankOrder[0];
    g.tanks[tankId].equipment.push({ id: 'eq_number', defId: 42, installedHour: 0, condition: 1, on: true }, { id: 'eq_none', installedHour: 0, condition: 1, on: true });
    g.inventory.decor.push({ id: 'dc_empty', defId: '', x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1 });
    g.starterId = 7;
    g.progress.tutorial.starterId = null;
    g.progress.research.activeId = 12;
    g.progress.quests.push({ status: 'active', progress: 0, startedHour: 0 });
    g.market.listings.push({ id: 'ls_badtank', kind: 'tank', title: 'Bad', status: 'sold', tankId: 5, creatureIds: [], bids: [], reserve: 0, createdHour: 0, endsHour: 1, interest: 0, snapshot: { valuation: 0, healthScore: 0, beautyScore: 0, careDifficulty: '', lineageSummary: '', summary: '', creatureIds: [] } });
    const repairs = repairState(g);
    const noted = (re: RegExp) => repairs.some((r) => re.test(r));
    expect(g.tanks[tankId].equipment.some((e: Json) => e.id === 'eq_number' || e.id === 'eq_none')).toBe(false);
    expect(noted(new RegExp(`^tank ${tankId}: 2 equipment without a valid id removed$`))).toBe(true);
    expect(g.inventory.decor.some((d: Json) => d.id === 'dc_empty')).toBe(false);
    expect(noted(/^inventory: 1 decor without a valid id removed$/)).toBe(true);
    expect(g.starterId).toBe('betta');
    expect(noted(/^starterId: 7 is not a valid id → betta$/)).toBe(true);
    expect(g.progress.tutorial.starterId).toBe('betta');
    expect(noted(/^progress\.tutorial\.starterId: null is not a valid id → betta$/)).toBe(true);
    expect(g.progress.research.activeId).toBeUndefined();
    expect(noted(/^progress\.research\.activeId: 12 is not a valid id, removed$/)).toBe(true);
    expect(g.progress.quests.every((q: Json) => typeof q.id === 'string')).toBe(true);
    expect(noted(/^progress\.quests: 1 without an id removed$/)).toBe(true);
    expect(g.market.listings.find((l: Json) => l.id === 'ls_badtank').tankId).toBeUndefined();
    expect(noted(/^listing ls_badtank: tankId 5 is not a valid id, removed$/)).toBe(true);
    expect(repairState(g)).toEqual([]);
  });

  it('a sold aquarium’s listing keeps the id of the tank it sold: reloading changes nothing', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Seller', seed: 31337 });
    devOpenMarket(g);
    g.finance.money = 5000;
    const bought = buyTank(g, 'g10', 'freshwater_planted');
    expect(bought.ok).toBe(true);
    const listed = createListing(g, { kind: 'tank', tankId: bought.tankId!, reserve: 0, durationHours: 72 });
    expect(listed.ok).toBe(true);
    let sold = false;
    for (let i = 0; i < 20 && !sold; i++) {
      forceBuyerVisit(g, listed.listingId!);
      const bid = g.market.listings.find((l) => l.id === listed.listingId)!.bids.find((b) => b.status === 'open');
      if (bid) sold = acceptBid(g, listed.listingId!, bid.id).ok;
    }
    expect(sold).toBe(true);
    expect(g.tanks[bought.tankId!]).toBeUndefined();
    const before = g.market.listings.find((l) => l.id === listed.listingId)!;
    expect(before.tankId).toBe(bought.tankId);
    const d = decodeRecord(encodeRecord(g, 'auto').text);
    expect(d.repairs).toEqual([]);
    expect(d.state.market.listings.find((l) => l.id === listed.listingId)!.tankId).toBe(bought.tankId);
  });
});
