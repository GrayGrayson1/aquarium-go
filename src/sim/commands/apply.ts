/**
 * Applying a command: the same `src/sim` function the interface's closure called, with the same arguments, so a
 * command does exactly what its closure did (tests/sim/commands-catalogue.test.ts checks each kind's `stateHash`
 * against the direct call). What an action used to read from the game inside the closure is worked out here, from the
 * state it applies to.
 */
import type { GameState } from '@/types';
import type { ActionResult } from '../care';
import { cleanTank, dose, feedTank, installEquipment, removeEquipment, repairEquipment, setEquipment, setLighting, topOff, waterChange } from '../care';
import { autoFeedPatch } from '../care/autofeed';
import { buyEggs, buyEquipment, buyFood, buyOffer, buySalt, buyTank } from '../economy/purchases';
import { acceptBid, counterBid, createListing, declineBid, holdBidForCounter, quickSell, quickSellFrags, withdrawListing, type ListingSpec } from '../economy/listings';
import { placeTank, setAdmission, setOpenToPublic, toggleSignage, upgradeFacility } from '../facility/actions';
import { cancelResearch, claimQuest, startResearch, tutorialAdvance, tutorialSkip } from '../facility/progression';
import { changeSubstrate, convertWaterClass, renameTank, setBackdrop, setTankPurpose } from '../tankOps';
import { moveDecor, placeDecor, removeDecor } from '../aquascape';
import { plantFrag, takeFrag } from '../aquascape/frags';
import { moveCreature, notePhoto, noteInteraction, registerGlassTap, renameCreature, toggleFavorite } from '../life/actions';
import { moveClutch, separateCreature, startBreeding } from '../life/breeding/actions';
import { addCulture, addReservoir, setStockOrders, upgradePrep, waitForLine } from '../automation';
import { holdAll, resumeAll, setHold } from '../automation/hold';
import { assignTank, autoAssignAll, fireStaff, hireStaff, setStockBudget } from '../staff/roster';
import { addQuarantineTank, createLine, endLine, setKeepRules, setLinePair, setLineRule, setLineRunning, setLineTank } from '../production';
import { enterShow, withdrawEntry } from '../shows';
import type { Command } from './kinds';

/** The Auto Water Changer's equipment id (`buyAutoClean`). */
export const WATER_CHANGER_ID = 'auto_water_changer';

/**
 * What applying a command returns: its action's `ActionResult`, plus what callers used to read from the game right
 * after the action (a new tank's id, the servings a feed used, the copies left in storage), so no caller has to.
 */
export interface CommandResult extends ActionResult {
  /** The action itself returns nothing (a toggle, a note): the interface words its own feedback, as it did. */
  noResult?: boolean;
  tankId?: string;
  tankName?: string;
  tierName?: string;
  price?: number;
  restartDay?: number;
  listingId?: string;
  lineId?: string;
  decorId?: string;
  fragId?: string;
  entryId?: string;
  total?: number;
  /** `feedTank`: the servings that left the inventory. */
  servingsUsed?: number;
  /** `notePhoto`: a story line was added. */
  added?: boolean;
  /** `placeDecor`: copies of that piece still in storage, and whether this one came from there. */
  left?: number;
  fromStorage?: boolean;
  /** A shared shop's setting another member changed in the last 30 seconds (§4.3): who, for the sender's note. */
  noteBy?: string;
  /** A shared shop's refusal because what the sender saw has changed (first one wins, §4.3), and who changed it. */
  conflict?: { by?: string; name?: string };
}

const done = (): CommandResult => ({ ok: true, message: '', noResult: true });
const own = <T>(rec: Record<string, T> | undefined, id: string): T | undefined => (rec && Object.hasOwn(rec, id) ? rec[id] : undefined);

/** Run a command's action (not its guide flag: see `applyFlag`). */
export function applyAction(state: GameState, cmd: Command): CommandResult {
  switch (cmd.k) {
    // ── care and the tank ──
    case 'feedTank': {
      const had = state.inventory.foods[cmd.food] ?? 0;
      const target = cmd.target;
      const res: CommandResult = { ...(target ? feedTank(state, cmd.tank, cmd.food, { targetCreatureId: target }) : feedTank(state, cmd.tank, cmd.food, cmd.zone ? { zone: cmd.zone } : {})) };
      if (res.ok && target) noteInteraction(state, target, 'target_fed');
      res.servingsUsed = Math.max(0, had - (state.inventory.foods[cmd.food] ?? 0));
      return res;
    }
    case 'waterChange': {
      if (cmd.coolBy === undefined) return waterChange(state, cmd.tank, cmd.fraction);
      const coolBy = cmd.coolBy;
      return waterChange(state, cmd.tank, cmd.fraction, { newWaterTempC: Math.max(4, (own(state.tanks, cmd.tank)?.water.tempC ?? 18) - coolBy) });
    }
    case 'topOff':
      return topOff(state, cmd.tank);
    case 'cleanTank':
      return cleanTank(state, cmd.tank, cmd.what);
    case 'dose':
      return dose(state, cmd.tank, cmd.additive);
    case 'setEquipment': {
      const patch: { on?: boolean; setting?: number } = {};
      if (cmd.on !== undefined) patch.on = cmd.on;
      if (cmd.setting !== undefined) patch.setting = cmd.setting;
      return setEquipment(state, cmd.tank, cmd.equip, patch);
    }
    case 'setAutoFeed': {
      // the patch reads the live device (a legacy `setting: 0` restores the default meals, B-149)
      const live = own(state.tanks, cmd.tank)?.equipment.find((e) => e.id === cmd.equip);
      return setEquipment(state, cmd.tank, cmd.equip, live ? autoFeedPatch(live, cmd.on) : { on: cmd.on });
    }
    case 'buyEquipment':
      return buyEquipment(state, cmd.tank, cmd.def);
    case 'buyAutoClean': {
      // buy the Auto Water Changer and switch it on (DESIGN-S3D §10.3)
      const res: CommandResult = { ...buyEquipment(state, cmd.tank, WATER_CHANGER_ID) };
      if (!res.ok) return res;
      const tank = own(state.tanks, cmd.tank);
      const inst = tank?.equipment.find((e) => e.defId === WATER_CHANGER_ID);
      if (inst && !inst.on) setEquipment(state, cmd.tank, inst.id, { on: true });
      res.tankName = own(state.tanks, cmd.tank)?.name ?? '';
      return res;
    }
    case 'installEquipment':
      return installEquipment(state, cmd.tank, cmd.def, { instanceId: cmd.instance, fromInventory: true });
    case 'repairEquipment':
      return repairEquipment(state, cmd.tank, cmd.equip);
    case 'removeEquipment':
      return removeEquipment(state, cmd.tank, cmd.equip);
    case 'setLighting': {
      const patch: Parameters<typeof setLighting>[2] = {};
      if (cmd.preset !== undefined) patch.preset = cmd.preset;
      if (cmd.intensity !== undefined) patch.intensity = cmd.intensity;
      if (cmd.onHour !== undefined) patch.onHour = cmd.onHour;
      if (cmd.offHour !== undefined) patch.offHour = cmd.offHour;
      if (cmd.moonlight !== undefined) patch.moonlight = cmd.moonlight;
      return setLighting(state, cmd.tank, patch);
    }
    case 'setSignage': {
      // a setting, so two members switching it don't undo each other (§4.3): it toggles only when it differs
      const t = own(state.tanks, cmd.tank);
      if (t && !!t.signage === cmd.on) return done();
      return toggleSignage(state, cmd.tank);
    }
    case 'renameTank':
      return renameTank(state, cmd.tank, cmd.name);
    case 'setTankPurpose':
      return setTankPurpose(state, cmd.tank, cmd.purpose);
    case 'convertWaterClass':
      return convertWaterClass(state, cmd.tank, cmd.wc);
    case 'changeSubstrate':
      return changeSubstrate(state, cmd.tank, cmd.kind, cmd.color);
    case 'setBackdrop':
      return setBackdrop(state, cmd.tank, cmd.backdrop);
    case 'buyTank': {
      const at = cmd.x !== undefined && cmd.z !== undefined ? { x: cmd.x, z: cmd.z, rotY: cmd.rotY ?? 0 } : undefined;
      return buyTank(state, cmd.tier, cmd.wc, at, { seeded: cmd.seeded });
    }
    case 'placeTank':
      return placeTank(state, cmd.tank, cmd.x, cmd.z, cmd.rotY);
    case 'placeDecor': {
      // a piece in storage is placed from there, else bought (DecorEditor used to read this before the action)
      const owned = state.inventory.decor.some((d) => d.defId === cmd.def);
      const pos: { x: number; z: number; rotY?: number; scale?: number } = { x: cmd.x, z: cmd.z };
      if (cmd.rotY !== undefined) pos.rotY = cmd.rotY;
      if (cmd.scale !== undefined) pos.scale = cmd.scale;
      const res: CommandResult = { ...placeDecor(state, cmd.tank, cmd.def, pos, owned) };
      res.left = owned ? state.inventory.decor.filter((d) => d.defId === cmd.def).length : 0;
      res.fromStorage = owned;
      return res;
    }
    case 'moveDecor': {
      const pos: { x: number; z: number; rotY?: number; scale?: number } = { x: cmd.x, z: cmd.z };
      if (cmd.rotY !== undefined) pos.rotY = cmd.rotY;
      if (cmd.scale !== undefined) pos.scale = cmd.scale;
      return moveDecor(state, cmd.tank, cmd.decor, pos);
    }
    case 'removeDecor':
      return removeDecor(state, cmd.tank, cmd.decor, cmd.sell);
    case 'takeFrag':
      return takeFrag(state, cmd.tank, cmd.decor);
    case 'plantFrag': {
      const pos = cmd.x !== undefined && cmd.z !== undefined ? (cmd.rotY !== undefined ? { x: cmd.x, z: cmd.z, rotY: cmd.rotY } : { x: cmd.x, z: cmd.z }) : undefined;
      return plantFrag(state, cmd.tank, cmd.frag, pos, cmd.rack ? { rackOnly: true } : {});
    }
    case 'quickSellFrags':
      return quickSellFrags(state, cmd.frags);
    case 'glassTap':
      registerGlassTap(state, cmd.tank, cmd.intensity);
      return done();
    case 'noteInteraction':
      noteInteraction(state, cmd.creature, cmd.kind);
      return done();
    case 'notePhoto':
      return { ok: true, message: '', noResult: true, added: notePhoto(state, cmd.creature) };
    // ── animals ──
    case 'moveCreature':
      return moveCreature(state, cmd.creature, cmd.to);
    case 'separateCreature':
      return separateCreature(state, cmd.creature, cmd.to);
    case 'moveClutch':
      return moveClutch(state, cmd.clutch, cmd.to);
    case 'startBreeding':
      return startBreeding(state, cmd.a, cmd.b, cmd.tank);
    case 'renameCreature':
      return renameCreature(state, cmd.creature, cmd.name);
    case 'setFavorite': {
      const c = own(state.creatures, cmd.creature);
      if (!c || !!c.favorite !== cmd.on) toggleFavorite(state, cmd.creature);
      return done();
    }
    case 'quickSell':
      return quickSell(state, cmd.creatures);
    // ── the shop and supplies ──
    case 'buyOffer': {
      // the picks by the animals the sender saw (`saw`): a member who bought part of the offer first moved the rest
      // up the list; in a solo game they're where they were
      let picks = cmd.picks;
      const o = picks && cmd.saw ? state.market.stock.find((x) => x.id === cmd.offer) : undefined;
      if (o && cmd.saw) {
        const at = cmd.saw.map((id) => o.creatures.findIndex((c) => c.id === id));
        if (at.every((i) => i >= 0)) picks = at;
      }
      return buyOffer(state, cmd.offer, cmd.tank, picks);
    }
    case 'buyFood':
      return buyFood(state, cmd.food, cmd.packs);
    case 'buySalt':
      return buySalt(state, cmd.kg);
    case 'buyEggs':
      return buyEggs(state, cmd.tins);
    // ── the market ──
    case 'createListing': {
      const spec: ListingSpec = { kind: cmd.kind, reserve: cmd.reserve, durationHours: cmd.hours };
      if (cmd.creatures !== undefined) spec.creatureIds = cmd.creatures;
      if (cmd.tank !== undefined) spec.tankId = cmd.tank;
      if (cmd.frags !== undefined) spec.fragIds = cmd.frags;
      if (cmd.buyNow !== undefined) spec.buyNow = cmd.buyNow;
      if (cmd.title !== undefined) spec.title = cmd.title;
      if (cmd.photo !== undefined) spec.photo = cmd.photo;
      return createListing(state, spec);
    }
    case 'withdrawListing':
      return withdrawListing(state, cmd.listing);
    case 'acceptBid':
      return acceptBid(state, cmd.listing, cmd.bid);
    case 'declineBid':
      return declineBid(state, cmd.listing, cmd.bid);
    case 'counterBid':
      return counterBid(state, cmd.listing, cmd.bid, cmd.amount);
    case 'holdBid':
      return holdBidForCounter(state, cmd.listing, cmd.bid);
    // ── the facility ──
    case 'upgradeFacility':
      return upgradeFacility(state);
    case 'upgradePrep':
      return upgradePrep(state);
    case 'addReservoir':
      return addReservoir(state);
    case 'addCulture':
      return addCulture(state, cmd.kind);
    case 'setOpenToPublic':
      return setOpenToPublic(state, cmd.open);
    case 'setAdmission':
      return setAdmission(state, cmd.price);
    // ── staff ──
    case 'hireStaff': {
      const res = hireStaff(state, cmd.candidate);
      // a hire raises its guide flag itself (§4.3: `q_first_staff` pays on it), as the staff tab's hire did
      if (res.ok && !state.progress.tutorial.flags?.hired_staff) {
        try {
          tutorialAdvance(state, 'hired_staff');
        } catch {
          /* progression mid-edit */
        }
      }
      return res;
    }
    case 'fireStaff':
      return fireStaff(state, cmd.staff);
    case 'assignTank':
      return assignTank(state, cmd.staff, cmd.tank, cmd.on);
    case 'autoAssignAll':
      return autoAssignAll(state);
    case 'setStockBudget':
      return setStockBudget(state, cmd.amount);
    case 'setStockOrders':
      return setStockOrders(state, cmd.on);
    // ── production lines ──
    case 'createLine': {
      const spec: Parameters<typeof createLine>[1] = {
        motherId: cmd.mother,
        fatherId: cmd.father,
        tanks: { breed: cmd.breed, raise: cmd.raise, quarantine: cmd.quarantine, keep: cmd.keep },
      };
      if (cmd.breedFor !== undefined) spec.breedFor = cmd.breedFor;
      if (cmd.name !== undefined) spec.name = cmd.name;
      if (cmd.rules !== undefined || cmd.sort !== undefined) {
        spec.rules = { ...cmd.rules };
        if (cmd.sort !== undefined) spec.rules.keep = cmd.sort.map((r) => ({ traitIds: r.traits, count: r.count }));
      }
      return createLine(state, spec);
    }
    case 'endLine':
      return endLine(state, cmd.line);
    case 'setLineRunning':
      return setLineRunning(state, cmd.line, cmd.on);
    case 'setLineRule':
      return setLineRule(state, cmd.line, cmd.rule, cmd.on);
    case 'setKeepRules':
      return setKeepRules(state, cmd.line, cmd.rules.map((r) => ({ traitIds: r.traits, count: r.count })));
    case 'setLinePair':
      return setLinePair(state, cmd.line, cmd.a, cmd.b);
    case 'setLineTank':
      return setLineTank(state, cmd.line, cmd.stage, cmd.tank, cmd.replace);
    case 'addQuarantineTank':
      return addQuarantineTank(state, cmd.line, cmd.seeded);
    case 'waitForLine':
      return waitForLine(state, cmd.line);
    // ── manual mode (the hold functions settle the background tanks themselves, ADR-0026 decision 5) ──
    case 'holdAll':
      holdAll(state);
      return done();
    case 'resumeAll':
      resumeAll(state);
      return done();
    case 'setHold':
      setHold(state, cmd.sys, cmd.on);
      return done();
    // ── research and quests ──
    case 'startResearch':
      return startResearch(state, cmd.project);
    case 'cancelResearch':
      return cancelResearch(state);
    case 'claimQuest':
      return claimQuest(state, cmd.quest);
    // ── shows ──
    case 'enterShow':
      return enterShow(state, cmd.show, cmd.cls, cmd.subject);
    case 'withdrawEntry':
      return withdrawEntry(state, cmd.entry);
    // ── the clock and the guide ──
    case 'setSpeed':
      state.clock.speed = cmd.speed;
      return done();
    case 'raiseFlag':
      tutorialAdvance(state, cmd.name);
      return done();
    case 'tutorialNext':
      tutorialAdvance(state);
      return done();
    case 'tutorialSkip':
      tutorialSkip(state);
      return done();
  }
}

/**
 * Raise a successful command's guide flag (`act(…, { flag })` did this in a store write of its own, after the action
 * had committed: B-179). A showcase world has no guide.
 */
export function applyFlag(state: GameState, flag: string): void {
  if (!state.isShowcase) tutorialAdvance(state, flag);
}
