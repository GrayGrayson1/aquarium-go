// @vitest-environment node
/**
 * Chunk 11 (SHARE-001, SHARED-SHOPS.md §4.1, §9.1): every player action is a command, and a command does exactly what
 * the interface's closure did. For each kind: applying the command gives the same `stateHash` as calling its
 * `src/sim` function the way the closure called it (written out again here from the interface's old code, not from
 * apply.ts); the command survives `JSON.parse(JSON.stringify(cmd))` and `validateCommand` unchanged; and the sample's
 * outcome (worked, or refused by the game's own rule) is pinned, so a sample that stops reaching its action is noticed.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { deepClone } from '@/sim/clone';
import { stateHash } from '@/persistence/hash';
import { applyCommand, COMMAND_KINDS, validateCommand, WATER_CHANGER_ID, type Command, type CommandKind } from '@/sim/commands';
import { cleanTank, dose, feedTank, installEquipment, removeEquipment, repairEquipment, setEquipment, setLighting, topOff, waterChange } from '@/sim/care';
import { autoFeedPatch } from '@/sim/care/autofeed';
import { buyEggs, buyEquipment, buyFood, buyOffer, buySalt, buyTank } from '@/sim/economy/purchases';
import { acceptBid, counterBid, createListing, declineBid, holdBidForCounter, quickSell, quickSellFrags, withdrawListing } from '@/sim/economy/listings';
import { findFreeSpot, placeTank, setAdmission, setOpenToPublic, toggleSignage, upgradeFacility } from '@/sim/facility';
import { cancelResearch, claimQuest, startResearch, tutorialAdvance, tutorialSkip } from '@/sim/facility/progression';
import { changeSubstrate, convertWaterClass, renameTank, setBackdrop, setTankPurpose } from '@/sim/tankOps';
import { moveDecor, placeDecor, removeDecor } from '@/sim/aquascape';
import { plantFrag, takeFrag } from '@/sim/aquascape/frags';
import { moveCreature, notePhoto, noteInteraction, registerGlassTap, renameCreature, toggleFavorite } from '@/sim/life/actions';
import { moveClutch, separateCreature, startBreeding } from '@/sim/life/breeding/actions';
import { addCulture, addReservoir, setStockOrders, upgradePrep, waitForLine } from '@/sim/automation';
import { holdAll, resumeAll, setHold } from '@/sim/automation/hold';
import { assignTank, autoAssignAll, fireStaff, hireStaff, setStockBudget } from '@/sim/staff/roster';
import { addQuarantineTank, createLine, endLine, setKeepRules, setLinePair, setLineRule, setLineRunning, setLineTank } from '@/sim/production';
import { enterShow, withdrawEntry } from '@/sim/shows';
import { lineFarm } from './support/production';

type World = 'panels' | 'big' | 'line' | 'shows';
const BUILD: Record<World, () => GameState> = {
  panels: () => FIXTURES.panels(),
  big: () => FIXTURES.big_facility(),
  line: () => lineFarm().g,
  shows: () => FIXTURES['shows-demo'](),
};
const WORLDS = new Map<World, GameState>();
/** A world as a shared shop holds it: through JSON, so no key holds `undefined` to begin with (§3.2 rule 10). */
const world = (w: World): GameState => {
  if (!WORLDS.has(w)) WORLDS.set(w, JSON.parse(JSON.stringify(BUILD[w]())));
  return deepClone(WORLDS.get(w)!);
};

/** Paths (ids folded to `*`) of keys holding `undefined`: a snapshot drops them, so no command may leave one. */
function undefinedKeys(o: unknown, path = '', out: string[] = []): string[] {
  if (o === null || typeof o !== 'object' || out.length > 20) return out;
  if (Array.isArray(o)) o.forEach((v) => undefinedKeys(v, `${path}[]`, out));
  else
    for (const [k, v] of Object.entries(o)) {
      const p = `${path}.${/^[a-z]+_[0-9a-z]+$/.test(k) ? '*' : k}`;
      if (v === undefined) out.push(p);
      else undefinedKeys(v, p, out);
    }
  return out;
}

// ── ids from a world ──
const tankWith = (g: GameState, ok: (t: GameState['tanks'][string]) => boolean = () => true) => g.tankOrder.map((id) => g.tanks[id]).find(ok)!;
const fishIn = (g: GameState) => Object.values(g.creatures).find((c) => c.status === 'alive' && c.tankId && !c.isStarter)!;
const otherTank = (g: GameState, not: string) => g.tankOrder.find((id) => id !== not)!;
const firstFood = (g: GameState) => Object.keys(g.inventory.foods).find((f) => (g.inventory.foods[f] ?? 0) >= 1)!;
const activeListing = (g: GameState) => g.market.listings.find((l) => l.status === 'active' && (l.bids ?? []).some((b) => b.status === 'open'))!;
const openBid = (g: GameState) => activeListing(g).bids!.find((b) => b.status === 'open')!;
const line = (g: GameState) => g.production!.lines[0];
/** A decoration the game lets you take a frag from (found on a copy). */
const fraggable = (g: GameState): Command & { k: 'takeFrag' } =>
  g.tankOrder.flatMap((t) => g.tanks[t].decor.map((d): Command & { k: 'takeFrag' } => ({ k: 'takeFrag', tank: t, decor: d.id }))).find((c) => applyCommand(deepClone(g), c).ok)!;

interface Case {
  w: World;
  /** Set the world up the same way before both runs (a spare piece in storage, a frag to plant). */
  prep?: (g: GameState) => void;
  cmd: (g: GameState) => Command;
  /** The interface's old closure, written out: `act((d) => buyTank(d, …))`. */
  direct: (d: GameState, c: never) => unknown;
  /** Did the sample's action work (true), or did the game refuse it by its own rule (false)? */
  ok: boolean;
}

const C: Record<CommandKind, Case> = {
  feedTank: { w: 'big', cmd: (g) => ({ k: 'feedTank', tank: fishIn(g).tankId!, food: firstFood(g), zone: 'surface' }), direct: (d, c: Command & { k: 'feedTank' }) => feedTank(d, c.tank, c.food, { zone: c.zone }), ok: true },
  waterChange: { w: 'big', cmd: (g) => ({ k: 'waterChange', tank: g.tankOrder[0], fraction: 0.25, coolBy: 5 }), direct: (d, c: Command & { k: 'waterChange' }) => waterChange(d, c.tank, 0.25, { newWaterTempC: Math.max(4, (d.tanks[c.tank]?.water.tempC ?? 18) - 5) }), ok: true },
  topOff: { w: 'big', cmd: (g) => ({ k: 'topOff', tank: g.tankOrder[1] }), direct: (d, c: Command & { k: 'topOff' }) => topOff(d, c.tank), ok: true },
  cleanTank: { w: 'big', cmd: (g) => ({ k: 'cleanTank', tank: g.tankOrder[2], what: 'glass' }), direct: (d, c: Command & { k: 'cleanTank' }) => cleanTank(d, c.tank, 'glass'), ok: true },
  dose: { w: 'big', cmd: (g) => ({ k: 'dose', tank: g.tankOrder[0], additive: 'conditioner' }), direct: (d, c: Command & { k: 'dose' }) => dose(d, c.tank, 'conditioner'), ok: true },
  setEquipment: {
    w: 'big',
    cmd: (g) => ({ k: 'setEquipment', tank: g.tankOrder[0], equip: g.tanks[g.tankOrder[0]].equipment[0].id, on: false }),
    direct: (d, c: Command & { k: 'setEquipment' }) => setEquipment(d, c.tank, c.equip, { on: false }),
    ok: true,
  },
  setAutoFeed: {
    w: 'line',
    cmd: (g) => {
      const t = tankWith(g, (x) => x.equipment.some((e) => e.defId === 'autofeeder'));
      return { k: 'setAutoFeed', tank: t.id, equip: t.equipment.find((e) => e.defId === 'autofeeder')!.id, on: false };
    },
    direct: (d, c: Command & { k: 'setAutoFeed' }) => {
      const live = d.tanks[c.tank]?.equipment.find((e) => e.id === c.equip);
      return setEquipment(d, c.tank, c.equip, live ? autoFeedPatch(live, false) : { on: false });
    },
    ok: true,
  },
  buyEquipment: { w: 'big', cmd: (g) => ({ k: 'buyEquipment', tank: g.tankOrder[0], def: 'autofeeder' }), direct: (d, c: Command & { k: 'buyEquipment' }) => buyEquipment(d, c.tank, 'autofeeder'), ok: true },
  buyAutoClean: {
    w: 'big',
    cmd: (g) => ({ k: 'buyAutoClean', tank: g.tankOrder[3] }),
    direct: (d, c: Command & { k: 'buyAutoClean' }) => {
      const res = buyEquipment(d, c.tank, WATER_CHANGER_ID);
      if (!res.ok) return res;
      const inst = d.tanks[c.tank]?.equipment.find((e) => e.defId === WATER_CHANGER_ID);
      if (inst && !inst.on) setEquipment(d, c.tank, inst.id, { on: true });
      return res;
    },
    ok: true,
  },
  installEquipment: {
    w: 'big',
    prep: (g) => void removeEquipment(g, g.tankOrder[0], g.tanks[g.tankOrder[0]].equipment.at(-1)!.id),
    cmd: (g) => ({ k: 'installEquipment', tank: g.tankOrder[0], def: g.inventory.equipment[0].defId, instance: g.inventory.equipment[0].id }),
    direct: (d, c: Command & { k: 'installEquipment' }) => installEquipment(d, c.tank, c.def, { instanceId: c.instance, fromInventory: true }),
    ok: true,
  },
  repairEquipment: {
    w: 'big',
    prep: (g) => void (g.tanks[g.tankOrder[0]].equipment[0].condition = 0.4),
    cmd: (g) => ({ k: 'repairEquipment', tank: g.tankOrder[0], equip: g.tanks[g.tankOrder[0]].equipment[0].id }),
    direct: (d, c: Command & { k: 'repairEquipment' }) => repairEquipment(d, c.tank, c.equip),
    ok: true,
  },
  removeEquipment: {
    w: 'big',
    cmd: (g) => ({ k: 'removeEquipment', tank: g.tankOrder[4], equip: g.tanks[g.tankOrder[4]].equipment.at(-1)!.id }),
    direct: (d, c: Command & { k: 'removeEquipment' }) => removeEquipment(d, c.tank, c.equip),
    ok: true,
  },
  setLighting: { w: 'big', cmd: (g) => ({ k: 'setLighting', tank: g.tankOrder[0], preset: 'warm', intensity: 0.8 }), direct: (d, c: Command & { k: 'setLighting' }) => setLighting(d, c.tank, { preset: 'warm', intensity: 0.8 }), ok: true },
  setSignage: { w: 'big', cmd: (g) => ({ k: 'setSignage', tank: g.tankOrder[0], on: !g.tanks[g.tankOrder[0]].signage }), direct: (d, c: Command & { k: 'setSignage' }) => toggleSignage(d, c.tank), ok: true },
  renameTank: { w: 'big', cmd: (g) => ({ k: 'renameTank', tank: g.tankOrder[0], name: 'Probe' }), direct: (d, c: Command & { k: 'renameTank' }) => renameTank(d, c.tank, 'Probe'), ok: true },
  setTankPurpose: { w: 'big', cmd: (g) => ({ k: 'setTankPurpose', tank: g.tankOrder[0], purpose: 'nursery' }), direct: (d, c: Command & { k: 'setTankPurpose' }) => setTankPurpose(d, c.tank, 'nursery'), ok: true },
  convertWaterClass: {
    w: 'line',
    prep: (g) => void buyTank(g, 'g10', 'freshwater_tropical', undefined, { seeded: false }),
    cmd: (g) => ({ k: 'convertWaterClass', tank: g.tankOrder.at(-1)!, wc: 'freshwater_planted' }),
    direct: (d, c: Command & { k: 'convertWaterClass' }) => convertWaterClass(d, c.tank, 'freshwater_planted'),
    ok: true,
  },
  changeSubstrate: { w: 'big', cmd: (g) => ({ k: 'changeSubstrate', tank: g.tankOrder[0], kind: 'sand' }), direct: (d, c: Command & { k: 'changeSubstrate' }) => changeSubstrate(d, c.tank, 'sand', undefined), ok: true },
  setBackdrop: { w: 'big', cmd: (g) => ({ k: 'setBackdrop', tank: g.tankOrder[0], backdrop: 'deep_blue' }), direct: (d, c: Command & { k: 'setBackdrop' }) => setBackdrop(d, c.tank, 'deep_blue'), ok: true },
  buyTank: {
    w: 'line',
    cmd: (g) => {
      const spot = findFreeSpot(g, 'g10')!;
      return { k: 'buyTank', tier: 'g10', wc: 'freshwater_tropical', seeded: true, x: spot.x, z: spot.z, rotY: spot.rotY };
    },
    direct: (d, c: Command & { k: 'buyTank' }) => buyTank(d, 'g10', 'freshwater_tropical', { x: c.x!, z: c.z!, rotY: c.rotY! }, { seeded: true }),
    ok: true,
  },
  placeTank: {
    w: 'line',
    cmd: (g) => {
      const spot = findFreeSpot(g, g.tanks[g.tankOrder[0]].tierId)!;
      return { k: 'placeTank', tank: g.tankOrder[0], x: spot.x, z: spot.z, rotY: spot.rotY };
    },
    direct: (d, c: Command & { k: 'placeTank' }) => placeTank(d, c.tank, c.x, c.z, c.rotY),
    ok: true,
  },
  placeDecor: {
    w: 'big',
    cmd: (g) => ({ k: 'placeDecor', tank: g.tankOrder[0], def: g.tanks[g.tankOrder[0]].decor[0].defId, x: 0.01, z: 0.01, rotY: 0.3, scale: 1 }),
    direct: (d, c: Command & { k: 'placeDecor' }) => placeDecor(d, c.tank, c.def, { x: 0.01, z: 0.01, rotY: 0.3, scale: 1 }, d.inventory.decor.some((x) => x.defId === c.def)),
    ok: true,
  },
  moveDecor: {
    w: 'big',
    cmd: (g) => ({ k: 'moveDecor', tank: g.tankOrder[0], decor: g.tanks[g.tankOrder[0]].decor[0].id, x: -0.02, z: 0.02, rotY: 0, scale: 1 }),
    direct: (d, c: Command & { k: 'moveDecor' }) => moveDecor(d, c.tank, c.decor, { x: -0.02, z: 0.02, rotY: 0, scale: 1 }),
    ok: true,
  },
  removeDecor: { w: 'big', cmd: (g) => ({ k: 'removeDecor', tank: g.tankOrder[0], decor: g.tanks[g.tankOrder[0]].decor[0].id, sell: true }), direct: (d, c: Command & { k: 'removeDecor' }) => removeDecor(d, c.tank, c.decor, true), ok: true },
  takeFrag: { w: 'big', cmd: (g) => fraggable(g), direct: (d, c: Command & { k: 'takeFrag' }) => takeFrag(d, c.tank, c.decor), ok: true },
  plantFrag: {
    w: 'big',
    prep: (g) => void applyCommand(g, fraggable(g)),
    cmd: (g) => ({ k: 'plantFrag', tank: fraggable(g).tank, frag: g.inventory.frags![0].id, x: 0.02, z: -0.02, rotY: 0 }),
    direct: (d, c: Command & { k: 'plantFrag' }) => plantFrag(d, c.tank, c.frag, { x: 0.02, z: -0.02, rotY: 0 }, {}),
    ok: true,
  },
  quickSellFrags: {
    w: 'big',
    prep: (g) => void applyCommand(g, fraggable(g)),
    cmd: (g) => ({ k: 'quickSellFrags', frags: [g.inventory.frags![0].id] }),
    direct: (d, c: Command & { k: 'quickSellFrags' }) => quickSellFrags(d, c.frags),
    ok: true,
  },
  glassTap: { w: 'big', cmd: (g) => ({ k: 'glassTap', tank: g.tankOrder[0], intensity: 0.5 }), direct: (d, c: Command & { k: 'glassTap' }) => registerGlassTap(d, c.tank, 0.5), ok: true },
  noteInteraction: { w: 'big', cmd: (g) => ({ k: 'noteInteraction', creature: fishIn(g).id, kind: 'observe' }), direct: (d, c: Command & { k: 'noteInteraction' }) => noteInteraction(d, c.creature, 'observe'), ok: true },
  notePhoto: { w: 'big', cmd: (g) => ({ k: 'notePhoto', creature: fishIn(g).id }), direct: (d, c: Command & { k: 'notePhoto' }) => notePhoto(d, c.creature), ok: true },
  moveCreature: {
    w: 'big',
    cmd: (g) => {
      const c = fishIn(g);
      return { k: 'moveCreature', creature: c.id, to: otherTank(g, c.tankId!), from: c.tankId! };
    },
    direct: (d, c: Command & { k: 'moveCreature' }) => moveCreature(d, c.creature, c.to),
    ok: true,
  },
  separateCreature: {
    w: 'big',
    cmd: (g) => {
      const c = fishIn(g);
      return { k: 'separateCreature', creature: c.id, to: otherTank(g, c.tankId!), from: c.tankId! };
    },
    direct: (d, c: Command & { k: 'separateCreature' }) => separateCreature(d, c.creature, c.to),
    ok: true,
  },
  moveClutch: {
    w: 'panels',
    cmd: (g) => {
      const cl = Object.values(g.clutches)[0];
      const to = g.tankOrder.find((id) => id !== cl.tankId && g.tanks[id].waterClass === g.tanks[cl.tankId].waterClass)!;
      return { k: 'moveClutch', clutch: cl.id, to, from: cl.tankId };
    },
    direct: (d, c: Command & { k: 'moveClutch' }) => moveClutch(d, c.clutch, c.to),
    ok: true,
  },
  startBreeding: {
    w: 'line',
    cmd: (g) => ({ k: 'startBreeding', a: line(g).pair.motherId, b: line(g).pair.fatherId }),
    direct: (d, c: Command & { k: 'startBreeding' }) => startBreeding(d, c.a, c.b, undefined),
    ok: false,
  },
  renameCreature: { w: 'big', cmd: (g) => ({ k: 'renameCreature', creature: fishIn(g).id, name: 'Probe' }), direct: (d, c: Command & { k: 'renameCreature' }) => renameCreature(d, c.creature, 'Probe'), ok: true },
  setFavorite: { w: 'big', cmd: (g) => ({ k: 'setFavorite', creature: fishIn(g).id, on: !fishIn(g).favorite }), direct: (d, c: Command & { k: 'setFavorite' }) => toggleFavorite(d, c.creature), ok: true },
  quickSell: { w: 'big', cmd: (g) => ({ k: 'quickSell', creatures: [fishIn(g).id] }), direct: (d, c: Command & { k: 'quickSell' }) => quickSell(d, c.creatures), ok: true },
  buyOffer: {
    w: 'big',
    // an offer and a tank the game lets you buy it into (found on a copy)
    cmd: (g) => g.market.stock.flatMap((o) => g.tankOrder.map((tank): Command => ({ k: 'buyOffer', offer: o.id, tank }))).find((x) => applyCommand(deepClone(g), x).ok)!,
    direct: (d, c: Command & { k: 'buyOffer' }) => buyOffer(d, c.offer, c.tank, undefined),
    ok: true,
  },
  buyFood: { w: 'big', cmd: (g) => ({ k: 'buyFood', food: firstFood(g), packs: 1 }), direct: (d, c: Command & { k: 'buyFood' }) => buyFood(d, c.food, 1), ok: true },
  buySalt: { w: 'big', cmd: () => ({ k: 'buySalt', kg: 5 }), direct: (d) => buySalt(d, 5), ok: true },
  buyEggs: { w: 'line', cmd: () => ({ k: 'buyEggs', tins: 1 }), direct: (d) => buyEggs(d, 1), ok: true },
  createListing: {
    w: 'line',
    cmd: (g) => ({ k: 'createListing', kind: 'creature', creatures: [fishIn(g).id], reserve: 10, hours: 24, title: 'Probe' }),
    direct: (d, c: Command & { k: 'createListing' }) => createListing(d, { kind: 'creature', creatureIds: c.creatures, tankId: undefined, fragIds: undefined, reserve: 10, buyNow: undefined, durationHours: 24, title: 'Probe', photo: undefined }),
    ok: true,
  },
  withdrawListing: { w: 'panels', cmd: (g) => ({ k: 'withdrawListing', listing: activeListing(g).id }), direct: (d, c: Command & { k: 'withdrawListing' }) => withdrawListing(d, c.listing), ok: true },
  acceptBid: { w: 'panels', cmd: (g) => ({ k: 'acceptBid', listing: activeListing(g).id, bid: openBid(g).id }), direct: (d, c: Command & { k: 'acceptBid' }) => acceptBid(d, c.listing, c.bid), ok: true },
  declineBid: { w: 'panels', cmd: (g) => ({ k: 'declineBid', listing: activeListing(g).id, bid: openBid(g).id }), direct: (d, c: Command & { k: 'declineBid' }) => declineBid(d, c.listing, c.bid), ok: true },
  counterBid: {
    w: 'panels',
    cmd: (g) => ({ k: 'counterBid', listing: activeListing(g).id, bid: openBid(g).id, amount: Math.min(activeListing(g).buyNow ?? Infinity, Math.round(openBid(g).amount * 1.1)) }),
    direct: (d, c: Command & { k: 'counterBid' }) => counterBid(d, c.listing, c.bid, c.amount),
    ok: true,
  },
  holdBid: { w: 'panels', cmd: (g) => ({ k: 'holdBid', listing: activeListing(g).id, bid: openBid(g).id }), direct: (d, c: Command & { k: 'holdBid' }) => holdBidForCounter(d, c.listing, c.bid), ok: true },
  upgradeFacility: { w: 'panels', cmd: () => ({ k: 'upgradeFacility' }), direct: (d) => upgradeFacility(d), ok: false },
  upgradePrep: { w: 'shows', cmd: () => ({ k: 'upgradePrep' }), direct: (d) => upgradePrep(d), ok: true },
  addReservoir: { w: 'shows', cmd: () => ({ k: 'addReservoir' }), direct: (d) => addReservoir(d), ok: true },
  addCulture: { w: 'shows', cmd: () => ({ k: 'addCulture', kind: 'cone' }), direct: (d) => addCulture(d, 'cone'), ok: true },
  setOpenToPublic: { w: 'big', cmd: (g) => ({ k: 'setOpenToPublic', open: !g.facility.openToPublic }), direct: (d) => setOpenToPublic(d, !d.facility.openToPublic), ok: true },
  setAdmission: { w: 'big', cmd: () => ({ k: 'setAdmission', price: 12 }), direct: (d) => setAdmission(d, 12), ok: true },
  hireStaff: {
    w: 'big',
    prep: (g) => void fireStaff(g, g.staff!.roster[0].id),
    cmd: (g) => ({ k: 'hireStaff', candidate: g.staff!.candidates[0].id }),
    direct: (d, c: Command & { k: 'hireStaff' }) => {
      const r = hireStaff(d, c.candidate);
      if (r.ok && !d.progress.tutorial.flags?.hired_staff) tutorialAdvance(d, 'hired_staff');
      return r;
    },
    ok: true,
  },
  fireStaff: { w: 'big', cmd: (g) => ({ k: 'fireStaff', staff: g.staff!.roster[0].id }), direct: (d, c: Command & { k: 'fireStaff' }) => fireStaff(d, c.staff), ok: true },
  assignTank: {
    w: 'big',
    cmd: (g) => {
      const m = g.staff!.roster.find((x) => x.role === 'aquarist')!;
      return { k: 'assignTank', staff: m.id, tank: g.tankOrder.find((t) => !m.tankIds.includes(t))!, on: true };
    },
    direct: (d, c: Command & { k: 'assignTank' }) => assignTank(d, c.staff, c.tank, true),
    ok: true,
  },
  autoAssignAll: { w: 'big', cmd: () => ({ k: 'autoAssignAll' }), direct: (d) => autoAssignAll(d), ok: true },
  setStockBudget: { w: 'big', cmd: () => ({ k: 'setStockBudget', amount: 50 }), direct: (d) => setStockBudget(d, 50), ok: true },
  setStockOrders: { w: 'big', cmd: () => ({ k: 'setStockOrders', on: false }), direct: (d) => setStockOrders(d, false), ok: true },
  createLine: {
    w: 'line',
    cmd: (g) => {
      const l = line(g);
      return { k: 'createLine', mother: l.pair.motherId, father: l.pair.fatherId, breed: l.tanks.breed, raise: l.tanks.raise, quarantine: l.tanks.quarantine[0], keep: l.tanks.keep, name: 'Probe line', rules: { autoList: false }, sort: [] };
    },
    direct: (d, c: Command & { k: 'createLine' }) => createLine(d, { motherId: c.mother, fatherId: c.father, tanks: { breed: c.breed, raise: c.raise, quarantine: c.quarantine, keep: c.keep }, name: 'Probe line', rules: { autoList: false, keep: [] } }),
    ok: false,
  },
  endLine: { w: 'line', cmd: (g) => ({ k: 'endLine', line: line(g).id }), direct: (d, c: Command & { k: 'endLine' }) => endLine(d, c.line), ok: true },
  setLineRunning: { w: 'line', cmd: (g) => ({ k: 'setLineRunning', line: line(g).id, on: false }), direct: (d, c: Command & { k: 'setLineRunning' }) => setLineRunning(d, c.line, false), ok: true },
  setLineRule: { w: 'line', cmd: (g) => ({ k: 'setLineRule', line: line(g).id, rule: 'autoList', on: false }), direct: (d, c: Command & { k: 'setLineRule' }) => setLineRule(d, c.line, 'autoList', false), ok: true },
  setKeepRules: {
    w: 'line',
    cmd: (g) => ({ k: 'setKeepRules', line: line(g).id, rules: [{ traits: [], count: 2 }] }),
    direct: (d, c: Command & { k: 'setKeepRules' }) => setKeepRules(d, c.line, [{ traitIds: [], count: 2 }]),
    ok: true,
  },
  setLinePair: {
    w: 'line',
    cmd: (g) => ({ k: 'setLinePair', line: line(g).id, a: line(g).pair.motherId, b: line(g).pair.fatherId }),
    direct: (d, c: Command & { k: 'setLinePair' }) => setLinePair(d, c.line, c.a, c.b),
    ok: true,
  },
  setLineTank: {
    w: 'line',
    cmd: (g) => ({ k: 'setLineTank', line: line(g).id, stage: 'keep', tank: line(g).tanks.keep }),
    direct: (d, c: Command & { k: 'setLineTank' }) => setLineTank(d, c.line, 'keep', c.tank, undefined),
    ok: true,
  },
  addQuarantineTank: { w: 'line', cmd: (g) => ({ k: 'addQuarantineTank', line: line(g).id, seeded: true }), direct: (d, c: Command & { k: 'addQuarantineTank' }) => addQuarantineTank(d, c.line, true), ok: true },
  waitForLine: { w: 'line', cmd: (g) => ({ k: 'waitForLine', line: line(g).id }), direct: (d, c: Command & { k: 'waitForLine' }) => waitForLine(d, c.line), ok: true },
  holdAll: { w: 'line', cmd: () => ({ k: 'holdAll' }), direct: (d) => holdAll(d), ok: true },
  resumeAll: { w: 'line', prep: (g) => holdAll(g), cmd: () => ({ k: 'resumeAll' }), direct: (d) => resumeAll(d), ok: true },
  setHold: { w: 'line', cmd: () => ({ k: 'setHold', sys: 'food', on: true }), direct: (d) => setHold(d, 'food', true), ok: true },
  startResearch: {
    w: 'panels',
    prep: (g) => void cancelResearch(g),
    cmd: () => ({ k: 'startResearch', project: 'coldwater_systems' }),
    direct: (d, c: Command & { k: 'startResearch' }) => startResearch(d, c.project),
    ok: true,
  },
  cancelResearch: { w: 'panels', cmd: () => ({ k: 'cancelResearch' }), direct: (d) => cancelResearch(d), ok: true },
  claimQuest: { w: 'panels', cmd: (g) => ({ k: 'claimQuest', quest: g.progress.quests[0].id }), direct: (d, c: Command & { k: 'claimQuest' }) => claimQuest(d, c.quest), ok: true },
  enterShow: { w: 'shows', cmd: (g) => ({ k: 'enterShow', show: 'no_such_show', cls: 'no_class', subject: fishIn(g).id }), direct: (d, c: Command & { k: 'enterShow' }) => enterShow(d, c.show, c.cls, c.subject), ok: false },
  withdrawEntry: { w: 'shows', cmd: (g) => ({ k: 'withdrawEntry', entry: g.shows!.entries.find((e) => e.status === 'entered')!.id }), direct: (d, c: Command & { k: 'withdrawEntry' }) => withdrawEntry(d, c.entry), ok: true },
  setSpeed: {
    w: 'big',
    cmd: () => ({ k: 'setSpeed', speed: 3 }),
    direct: (d) => {
      d.clock.speed = 3;
    },
    ok: true,
  },
  raiseFlag: { w: 'panels', cmd: () => ({ k: 'raiseFlag', flag: 'opened_market' }), direct: (d) => tutorialAdvance(d, 'opened_market'), ok: true },
  tutorialNext: { w: 'panels', cmd: () => ({ k: 'tutorialNext' }), direct: (d) => tutorialAdvance(d), ok: true },
  tutorialSkip: { w: 'panels', cmd: () => ({ k: 'tutorialSkip' }), direct: (d) => tutorialSkip(d), ok: true },
};

describe('chunk 11: the command catalogue (SHARE-001, SHARED-SHOPS.md §4.1)', () => {
  it('has a case for every kind, and the catalogue lists every kind its type names', () => {
    expect(Object.keys(C).sort()).toEqual([...COMMAND_KINDS].sort());
    expect(COMMAND_KINDS.length).toBeGreaterThanOrEqual(80);
  });

  for (const kind of COMMAND_KINDS) {
    it(`${kind}: the command does what the closure did, and survives the network`, () => {
      const c = C[kind];
      const a = world(c.w);
      c.prep?.(a);
      const b = deepClone(a);
      const cmd = c.cmd(a);
      // the wire: plain JSON, and the checks every value from the network goes through
      const wire = JSON.parse(JSON.stringify(cmd));
      expect(wire).toEqual(cmd);
      expect(validateCommand(wire)).toEqual(cmd);
      const res = applyCommand(a, wire);
      const ok = c.direct(b, cmd as never) as { ok?: boolean } | undefined;
      expect(stateHash(a)).toBe(stateHash(b));
      expect(res.ok, `${kind}: ${res.message}`).toBe(c.ok);
      expect(undefinedKeys(a), kind).toEqual([]);
      if (ok && typeof ok === 'object' && 'ok' in ok) expect(ok.ok).toBe(res.ok);
    });
  }

  it("a command's guide flag is raised once its action works, not when the game refuses it", () => {
    const g = world('big');
    applyCommand(g, { k: 'buySalt', kg: 5, flag: 'probe_flag_ok' });
    expect(g.progress.tutorial.flags.probe_flag_ok).toBe(true);
    applyCommand(g, { k: 'topOff', tank: 'no_such_tank', flag: 'probe_flag_refused' });
    expect(g.progress.tutorial.flags.probe_flag_refused).toBeUndefined();
  });
});

describe('chunk 11: validateCommand refuses what the catalogue does not allow (§4.1)', () => {
  const good: Command = { k: 'moveCreature', creature: 'cr_1', to: 'tank_2', from: 'tank_1' };

  it('keeps a good command, and only its known fields', () => {
    expect(validateCommand(good)).toEqual(good);
    expect(validateCommand({ ...good, by: 'someone else', extra: 1 })).toEqual(good);
    expect(validateCommand({ k: 'holdAll' })).toEqual({ k: 'holdAll' });
    expect(validateCommand({ k: 'buySalt', kg: 5, flag: 'read_param:temp' })).toEqual({ k: 'buySalt', kg: 5, flag: 'read_param:temp' });
  });

  it('refuses unknown kinds, missing or mistyped fields and values out of range', () => {
    const bad: unknown[] = [
      null,
      7,
      'moveCreature',
      [good],
      {},
      { k: 'noSuchKind' },
      { k: 'toString' },
      { k: '__proto__' },
      { k: 'moveCreature', creature: 'cr_1' },
      { k: 'moveCreature', creature: 5, to: 'tank_2' },
      { k: 'buySalt', kg: -1 },
      { k: 'buySalt', kg: Infinity },
      { k: 'buySalt', kg: Number.NaN },
      { k: 'buyFood', food: 'flakes', packs: 1.5 },
      { k: 'setSpeed', speed: 2 },
      { k: 'cleanTank', tank: 't', what: 'roof' },
      { k: 'quickSell', creatures: 'cr_1' },
      { k: 'quickSell', creatures: ['cr_1', 7] },
      { k: 'quickSell', creatures: Array.from({ length: 501 }, (_, i) => `cr_${i}`) },
      { k: 'setKeepRules', line: 'l', rules: [{ traits: ['a'], count: -1 }] },
      { k: 'createLine', mother: 'a', father: 'b', breed: 'c', raise: 'd', quarantine: 'e', keep: 'f', rules: { autoList: 'yes' } },
      { k: 'createLine', mother: 'a', father: 'b', breed: 'c', raise: 'd', quarantine: 'e', keep: 'f', rules: { everything: true } },
      { k: 'renameTank', tank: 't', name: 'x'.repeat(121) },
      { k: 'buySalt', kg: 5, flag: 'bad flag!' },
      { k: 'buySalt', kg: 5, flag: 3 },
      { k: 'raiseFlag', flag: '' },
      { k: 'createListing', kind: 'creature', reserve: 1, hours: 24, photo: 'x'.repeat(48 * 1024 + 1) },
    ];
    for (const x of bad) expect(validateCommand(x), JSON.stringify(x)?.slice(0, 120)).toBeNull();
  });

  it('refuses ids that name what every object inherits, so no record lookup reaches a prototype (chunk 10’s review)', () => {
    for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '__defineGetter__', 'x\u0000y', '', 'a'.repeat(81)]) {
      expect(validateCommand({ k: 'waterChange', tank: id, fraction: 0.2 }), id).toBeNull();
      expect(validateCommand({ k: 'quickSell', creatures: ['cr_1', id] }), id).toBeNull();
    }
    // JSON's own "__proto__" key is an own property, never the prototype: the command's fields are read as own ones
    expect(validateCommand(JSON.parse('{"k":"waterChange","__proto__":{"tank":"t1","fraction":0.2}}'))).toBeNull();
    const inherited = Object.create({ tank: 't1', fraction: 0.2 });
    inherited.k = 'waterChange';
    expect(validateCommand(inherited)).toBeNull();
  });

  it('a command that is too big is refused, a listing with its photo may be larger', () => {
    expect(validateCommand({ k: 'quickSell', creatures: Array.from({ length: 450 }, (_, i) => `creature_with_a_long_id_${'x'.repeat(30)}_${i}`) })).toBeNull();
    expect(validateCommand({ k: 'createListing', kind: 'creature', creatures: ['cr_1'], reserve: 1, hours: 24, photo: 'x'.repeat(40_000) })).not.toBeNull();
  });
});
