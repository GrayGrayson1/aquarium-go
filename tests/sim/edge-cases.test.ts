/**
 * Spec §28 edge cases — coverage map + the cases that had no dedicated test. OWNER: polish-gameplay.
 *
 * Existing coverage (file :: test):
 *   freshwater animal in salt water ........ waterlab-water :: 'freshwater animals in salt water are a hard fail'
 *                                              waterlab-compat :: 'environmentGate blocks freshwater ↔ marine'
 *   marine animal in fresh water ........... waterlab-compat :: 'environmentGate blocks freshwater ↔ marine'
 *                                              market-shop :: 'hard-blocks an environment mismatch (marine animal into freshwater)'
 *   tank too small for adult ............... waterlab-compat :: 'tank size is judged at ADULT size, even for juveniles'
 *   juvenile outgrows tank ................. lifecycle-metabolism :: 'a juvenile outgrowing a small tank triggers a warning'
 *   heater / chiller conflict .............. waterlab-water :: 'heater and chiller fighting each other raises a warning and costs more'
 *   filter capacity insufficient ........... THIS FILE
 *   tank not cycled ........................ waterlab-water :: 'an uncycled tank spikes while a cycled one with the same load stays clean'
 *                                              market-shop :: 'adding stock to an uncycled tank is allowed but warned'
 *   salinity drift ......................... waterlab-water :: 'salinity exists only for salt tanks, rises with evaporation, and top-off restores it'
 *   overfeeding waste spike ................ waterlab-water :: 'overfeeding an empty tank raises ammonia as the food rots'
 *                                              waterlab-care :: 'overfeeding warns the player' (+ THIS FILE: two foods ≠ overfeeding)
 *   many animals at once ................... waterlab-water :: 'overcrowding raises stocking load and lowers stability' (+ THIS FILE via buyOffer)
 *   predator + prey ........................ waterlab-compat :: 'predatory fish swallow tank mates that fit in their mouth'
 *                                              lifecycle-incidents :: 'predation removes the prey with an explained, gentle log line'
 *   goldfish + shrimp ...................... waterlab-compat :: 'goldfish + dwarf shrimp → high risk, …'; species-fw :: 'goldfish vs dwarf shrimp is high risk …'
 *   multiple male bettas ................... waterlab-compat :: 'two male bettas → incompatible (critical)'
 *   betta pair left too long ............... breeding-rules :: 'the male harasses the spent female with escalating warnings, stress and injury'
 *   pea puffers without cover .............. THIS FILE
 *   seahorse + fast feeder ................. waterlab-compat :: 'seahorse + fast, aggressive feeder → feeding-competition reason'
 *                                              lifecycle-metabolism :: 'a slow seahorse gets less food than a fast feeder in the same tank'
 *   clownfish hierarchy .................... breeding-rules :: 'exactly one female emerges; when she is removed the top-ranked male transitions'
 *   warm axolotl tank ...................... lifecycle-metabolism :: 'an axolotl in a warm tank loses health and the keeper is told why'
 *   axolotl + fine gravel .................. waterlab-compat :: 'axolotl + gravel → ingestion warning; fine sand is fine' (+ THIS FILE: fine_gravel)
 *   lone schooling fish .................... waterlab-compat :: 'a schooling species kept below its minimum group gets a warning'
 *   packed territorial fish ................ THIS FILE
 *   same temperature, clashing temperament . waterlab-compat :: 'compatible temperature but incompatible temperament'
 *   soft-water fish in hard water .......... THIS FILE (new: compat now reads the tank's actual pH)
 *   offspring exceed nursery capacity ...... breeding-rules :: 'nursery capacity caps the juveniles minted; the rest are rehomed'
 *   listed animal dies / gets sick ......... market-auction :: 'a listed creature dying cancels its listing with an event', '… falling ill …'
 *   tank changes after listing ............. market-auction :: 'editing a listed tank flags the change; buyers re-evaluate; stale bids cannot be exploited'
 *   auction with no bids ................... market-auction :: 'a listing that receives no bids expires with advice'
 *   accept bid with unlisted attached inventory  market-auction :: 'animals added after listing are not sold …' (+ THIS FILE: gear, decor, eggs,
 *                                              and relocation never into water that's too warm)
 *   selling the final tank ................. market-auction :: 'selling a whole tank deletes it, transfers exactly its contents, and the game continues'
 *   going broke ............................ market-finance :: 'going broke is graceful: debt, warnings with suggestions, purchases blocked, then a one-time club loan'
 *   save during a breeding event ........... core-persistence :: 'preserves creature ids, lineage, listings and breeding state' (+ THIS FILE: resume mid-pregnancy)
 *   old save after migration ............... core-migration :: 'upgrades the synthetic v0 legacy save', '… can be simulated'
 *   1,000-gallon aquarium .................. core-perf :: 'the big facility advances a day quickly …'; facility-visitors :: 'a gorgeous, ethical 20-gallon outscores a messy 1,000-gallon tank'
 *                                              (+ playthrough-starters long game builds one through normal play)
 *   dozens of off-screen tanks ............. core-lod :: '30 tanks: off-focus tanks accumulate sim debt and a flush resolves it'; core-perf :: 'dozens of tanks advance 7 days in < 10 s'
 *   visitor path blocked / tank removed while viewed, rapid tap spam ... facility-progression / facility-visitors / lifecycle tests (render/UI items
 *   such as audio permission, network, reduced motion and touch are covered by tests/e2e).
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature, creaturesInTank } from '@/sim/life';
import { getWaterReport } from '@/sim/water';
import { previewAddition, evaluateTank } from '@/sim/compat';
import { feedTank, installEquipment } from '@/sim/care';
import { placeDecor } from '@/sim/aquascape';
import { buyOffer, generateOffer, createListing, acceptBid, forceBuyerVisit, devOpenMarket, devStepEconomy } from '@/sim/economy';
import { createClutch } from '@/sim/life/breeding/clutch';
import { stateHash, encodeRecord, decodeRecord } from '@/persistence';
import { getSpecies } from '@/data/species';

function game(starterId: Parameters<typeof newGame>[0]['starterId'] = 'betta', seed = 21): GameState {
  const g = newGame({ starterId, starterName: 'Edge', seed });
  g.finance.money = 5000;
  return g;
}

function add(g: GameState, tankId: string, speciesId: string, n: number, opts: { sex?: 'male' | 'female'; ageDays?: number } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(addCreature(g, createCreature(g, simRng(g), speciesId, { ageDays: opts.ageDays ?? 30, sex: opts.sex }), tankId));
  return out;
}

describe('edge cases (spec §28): water & husbandry', () => {
  it('filter capacity insufficient: the report names the filter as the problem and says what to do', () => {
    const g = game();
    const t = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
    add(g, t.id, 'neon_tetra', 10);
    const calm = getWaterReport(g, t.id).params.find((p) => p.key === 'filtration')!;
    expect(calm.status).toBe('good');
    add(g, t.id, 'comet_goldfish', 6);
    const r = getWaterReport(g, t.id);
    const f = r.params.find((p) => p.key === 'filtration')!;
    expect(f.status).toBe('danger');
    expect(f.reason).toMatch(/Filter capacity is insufficient/);
    expect(f.advice).toMatch(/second filter|larger/);
    expect(r.status).toBe('danger');
  });

  it('two sensible portions of different foods are not flagged as overfeeding', () => {
    const g = game();
    const t = createTank(g, 'g55', 'freshwater_planted', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
    add(g, t.id, 'neon_tetra', 10);
    add(g, t.id, 'panda_corydoras', 6);
    g.inventory.foods = { flake_tropical: 200, sinking_pellets: 200 };
    const a = feedTank(g, t.id, 'flake_tropical');
    const b = feedTank(g, t.id, 'sinking_pellets');
    expect(a.ok && b.ok).toBe(true);
    expect(b.message).not.toMatch(/more than they can eat/);
    expect(g.log.some((e) => /Overfeeding/.test(e.text))).toBe(false);
    // …but dumping a second flake portion on top of the first still is.
    const c = feedTank(g, t.id, 'flake_tropical', { servings: 60 });
    expect(c.message).toMatch(/more than they can eat/);
  });

  it('many animals at once through the shop: allowed, but the stocking load and compatibility say so', () => {
    const g = game();
    const t = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
    const rng = simRng(g);
    const before = g.finance.money;
    let paid = 0;
    for (let i = 0; i < 4; i++) {
      const o = generateOffer(g, rng, 'neon_tetra', { expiresHour: g.clock.hour + 24 })!;
      g.market.stock.push(o);
      paid += o.price;
      expect(buyOffer(g, o.id, t.id).ok).toBe(true);
    }
    expect(g.finance.money).toBeCloseTo(before - paid, 5);
    expect(creaturesInTank(g, t.id).length).toBeGreaterThanOrEqual(12);
    const r = getWaterReport(g, t.id);
    expect(r.stockingLoad).toBeGreaterThan(1);
    expect(r.params.find((p) => p.key === 'stocking')!.status).not.toBe('good');
    advanceWorld(g, 24, { focusTankId: t.id });
    expect(Number.isFinite(t.water.ammonia)).toBe(true);
    expect(creaturesInTank(g, t.id).every((c) => Number.isFinite(c.stats.health))).toBe(true);
  });

  it('pea puffers without cover: the preview warns they turn stressed and aggressive; dense planting clears it', () => {
    const g = game('pea_puffer');
    const bare = createTank(g, 'g20L', 'freshwater_planted', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
    const rep = previewAddition(g, bare.id, { speciesId: 'pea_puffer', count: 3 });
    const cover = rep.reasons.find((r) => /cover/i.test(r.text));
    expect(cover, rep.reasons.map((r) => r.text).join(' / ')).toBeDefined();
    expect(cover!.text).toMatch(/aggressive|stressed/);
    // The hand-built starter tank is densely planted: no cover complaint there.
    const home = g.tankOrder[0];
    const planted = previewAddition(g, home, { speciesId: 'pea_puffer', count: 1 });
    expect(planted.reasons.some((r) => /want dense cover/i.test(r.text))).toBe(false);
  });

  it('territorial fish packed together: too many pea puffers for the gallons is a warning with the space per fish', () => {
    const g = game('pea_puffer');
    const t = createTank(g, 'g10', 'freshwater_planted', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
    add(g, t.id, 'pea_puffer', 6);
    const rep = evaluateTank(g, t.id);
    const crowd = rep.reasons.find((r) => /Too many pea puffers/.test(r.text));
    expect(crowd, rep.reasons.map((r) => r.text).join(' / ')).toBeDefined();
    expect(crowd!.severity).toBe('warning');
    expect(crowd!.text).toMatch(/territorial/);
  });

  it('soft-water fish in hard, alkaline water: the preview reads the tank’s actual pH', () => {
    const g = game();
    const t = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 } });
    t.water.pH = 7.9;
    const rep = previewAddition(g, t.id, { speciesId: 'cardinal_tetra', count: 8 });
    const ph = rep.reasons.find((r) => r.category === 'chemistry' && /pH/.test(r.text));
    expect(ph, rep.reasons.map((r) => r.text).join(' / ')).toBeDefined();
    expect(ph!.severity).toBe('warning');
    expect(ph!.text).toMatch(/too alkaline for cardinal tetras/);
    t.water.pH = 6.8;
    expect(previewAddition(g, t.id, { speciesId: 'cardinal_tetra', count: 8 }).reasons.some((r) => r.category === 'chemistry' && /pH/.test(r.text))).toBe(false);
  });

  it('axolotl on fine gravel gets the ingestion warning (sand is the safe choice)', () => {
    const g = game('axolotl');
    const t = createTank(g, 'g20L', 'freshwater_cool', { cycled: true, placement: { x: 1.2, z: 0, rotY: 0 }, substrate: { kind: 'fine_gravel', depthCm: 4, color: '#8a7' } });
    const rep = previewAddition(g, t.id, { speciesId: 'axolotl', count: 1 });
    expect(rep.reasons.some((r) => /swallow|gravel/i.test(r.text))).toBe(true);
  });
});

describe('edge cases (spec §28): market & saves', () => {
  function shop(seed: number): GameState {
    const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
    devOpenMarket(g);
    devStepEconomy(g, 0.5);
    g.finance.money = 800;
    return g;
  }
  /** Let buyers re-evaluate (edits after listing withdraw stale bids), then accept the best fresh offer. */
  function sellTank(g: GameState, listingId: string) {
    const l = g.market.listings.find((x) => x.id === listingId)!;
    let res = { ok: false, message: 'no bids' };
    for (let attempt = 0; attempt < 6 && !res.ok; attempt++) {
      devStepEconomy(g, 0.5);
      for (let i = 0; i < 80 && !l.bids.some((b) => b.status === 'open'); i++) forceBuyerVisit(g, l.id);
      const bid = l.bids.filter((b) => b.status === 'open').sort((a, b) => b.amount - a.amount)[0];
      if (!bid) continue;
      res = acceptBid(g, l.id, bid.id);
      if (!res.ok && !/withdrew|changed/.test(res.message)) break;
    }
    return res;
  }

  it('accepting a bid keeps the gear and decor added after listing, and says where the eggs went', () => {
    const g = shop(61);
    const tankId = g.tankOrder[0];
    const tank = g.tanks[tankId];
    const listedEq = tank.equipment.map((e) => e.id);
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 48 });
    expect(r.ok).toBe(true);
    // After listing: a spare airstone from storage, a new plant, and a clutch of eggs.
    const spare = { id: 'eq_spare', defId: 'airstone', installedHour: g.clock.hour, condition: 1, on: true };
    g.inventory.equipment.push(spare);
    const inst = installEquipment(g, tankId, 'airstone', { fromInventory: true, instanceId: 'eq_spare' });
    const placed = placeDecor(g, tankId, 'java_fern', { x: 0.25, z: 0.02 });
    expect(inst.ok, inst.message).toBe(true);
    expect(placed.ok, placed.message).toBe(true);
    const mochi = Object.values(g.creatures).find((c) => c.isStarter)!;
    createClutch(g, { sp: getSpecies('axolotl'), tank, mother: mochi, father: null, hour: g.clock.hour, stage: 'eggs', count: 120, visual: 'egg_strands', nextStageHour: g.clock.hour + 100 });
    const sold = sellTank(g, r.listingId!);
    expect(sold.ok, sold.message).toBe(true);
    expect(g.tanks[tankId]).toBeUndefined();
    expect(g.inventory.equipment.some((e) => e.id === 'eq_spare')).toBe(true);
    expect(g.inventory.decor.some((d) => d.id === placed.decorId)).toBe(true);
    // Only the post-listing items came back; the listed kit went with the tank.
    expect(g.inventory.equipment.some((e) => listedEq.includes(e.id))).toBe(false);
    expect(g.log.some((e) => /You kept what you added after listing .*Airstone, Java Fern\. They’re in storage/.test(e.text))).toBe(true);
    expect(g.log.some((e) => /120 eggs in .* went with the aquarium/.test(e.text))).toBe(true);
    expect(Object.values(g.clutches).some((cl) => cl.tankId === tankId)).toBe(false);
  });

  it('an unlisted animal is never parked in water that is too warm for it — the sale waits instead', () => {
    const g = shop(62);
    const tankId = g.tankOrder[0];
    const r = createListing(g, { kind: 'tank', tankId, reserve: 0, durationHours: 48 });
    const newcomer = add(g, tankId, 'axolotl', 1)[0];
    const warm = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 1.5, z: 1, rotY: 0 } });
    warm.water.tempC = 26;
    const blocked = sellTank(g, r.listingId!);
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain(newcomer.name);
    expect(newcomer.tankId).toBe(tankId);
    // A cool tank is fine.
    const cool = createTank(g, 'g20L', 'freshwater_cool', { cycled: true, placement: { x: -1.5, z: 1, rotY: 0 } });
    cool.water.tempC = 17;
    expect(sellTank(g, r.listingId!).ok).toBe(true);
    expect(newcomer.tankId).toBe(cool.id);
  });

  it('saving in the middle of a pregnancy and loading resumes to exactly the same birth', () => {
    const g = newGame({ starterId: 'lined_seahorse', starterName: 'Atlas', seed: 505 });
    g.isShowcase = false; // decodeRecord normalises this flag; keep the hashes comparable
    const home = g.tankOrder[0];
    const atlas = Object.values(g.creatures).find((c) => c.isStarter)!;
    add(g, home, 'lined_seahorse', 1, { sex: 'female', ageDays: 26 });
    g.inventory.foods.mysis_frozen = 200;
    const care = (s: GameState, h: number) => {
      // target-feed twice a day, like the tutorial teaches
      if (Math.abs((s.clock.hour % 24) - 9) < 0.5 || Math.abs((s.clock.hour % 24) - 18) < 0.5) {
        for (const c of Object.values(s.creatures)) if (c.tankId === home && c.status === 'alive') feedTank(s, home, 'mysis_frozen', { targetCreatureId: c.id });
      }
      advanceWorld(s, h, { focusTankId: home });
    };
    for (let i = 0; i < 24 * 12 && atlas.repro.stage !== 'pregnant'; i++) care(g, 1);
    expect(atlas.repro.stage).toBe('pregnant');
    const saved = decodeRecord(encodeRecord(g, 'auto').text).state;
    const run = (s: GameState) => {
      for (let i = 0; i < 24 * 9; i++) care(s, 1);
      return s;
    };
    const a = run(g);
    const b = run(saved);
    expect(stateHash(b)).toBe(stateHash(a));
    const births = (s: GameState) => s.log.filter((e) => /gave birth/.test(e.text)).length;
    expect(births(a)).toBeGreaterThan(0);
    expect(births(b)).toBe(births(a));
  });
});
