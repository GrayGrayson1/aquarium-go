/**
 * The command catalogue (SHARED-SHOPS.md §4.1): one plain object for each player action, holding only ids, numbers,
 * strings, booleans and small plain objects, so it survives `JSON.parse(JSON.stringify(cmd))` unchanged and a browser
 * can send it to the shared-shop server. Every kind may carry the guide `flag` its action raised from the interface
 * (`act(…, { flag })`), raised once the action succeeds.
 *
 * Fields named `from` are what the sender saw (first one wins, §4.3): the tank an animal or a clutch was in. In a solo
 * game they are ignored; in a shared shop a command whose expectation no longer holds is refused on every copy.
 */
import type { BackdropKind, GameSpeed, HoldSystem, LightPreset, ListingKind, PoolTier, SubstrateKind, TankPurpose, WaterClass } from '@/types';
import type { LineStage } from '../production';

export type FeedZone = 'surface' | 'middle' | 'bottom';
export type CleanWhat = 'gravel' | 'glass' | 'filter';
export type Additive = 'bacteria' | 'conditioner' | 'salt' | 'buffer' | 'fertilizer' | 'coral_supplement';
export type LineRule = 'pauseWhenFull' | 'keepPrismatic' | 'autoList';

type Kinds =
  // ── care and the tank ──
  | { k: 'feedTank'; tank: string; food: string; zone?: FeedZone; target?: string }
  | { k: 'waterChange'; tank: string; fraction: number; coolBy?: number }
  | { k: 'topOff'; tank: string }
  | { k: 'cleanTank'; tank: string; what: CleanWhat }
  | { k: 'dose'; tank: string; additive: Additive }
  | { k: 'setEquipment'; tank: string; equip: string; on?: boolean; setting?: number }
  | { k: 'setAutoFeed'; tank: string; equip: string; on: boolean }
  | { k: 'buyEquipment'; tank: string; def: string }
  | { k: 'buyAutoClean'; tank: string }
  | { k: 'installEquipment'; tank: string; def: string; instance: string }
  | { k: 'repairEquipment'; tank: string; equip: string }
  | { k: 'removeEquipment'; tank: string; equip: string }
  | { k: 'setLighting'; tank: string; preset?: LightPreset; intensity?: number; onHour?: number; offHour?: number; moonlight?: boolean }
  | { k: 'setSignage'; tank: string; on: boolean }
  | { k: 'renameTank'; tank: string; name: string }
  | { k: 'setTankPurpose'; tank: string; purpose: TankPurpose }
  | { k: 'convertWaterClass'; tank: string; wc: WaterClass }
  | { k: 'changeSubstrate'; tank: string; kind: SubstrateKind; color?: string }
  | { k: 'setBackdrop'; tank: string; backdrop: BackdropKind }
  | { k: 'buyTank'; tier: string; wc: WaterClass; seeded: boolean; x?: number; z?: number; rotY?: number }
  | { k: 'placeTank'; tank: string; x: number; z: number; rotY: number }
  // `fromStorage`: the sender saw a piece in storage (it's placed from there, else bought; first one wins on the last)
  | { k: 'placeDecor'; tank: string; def: string; x: number; z: number; rotY?: number; scale?: number; fromStorage?: boolean }
  | { k: 'moveDecor'; tank: string; decor: string; x: number; z: number; rotY?: number; scale?: number }
  | { k: 'removeDecor'; tank: string; decor: string; sell: boolean }
  | { k: 'takeFrag'; tank: string; decor: string }
  | { k: 'plantFrag'; tank: string; frag: string; x?: number; z?: number; rotY?: number; rack?: boolean }
  | { k: 'quickSellFrags'; frags: string[] }
  | { k: 'glassTap'; tank: string; intensity: number }
  | { k: 'noteInteraction'; creature: string; kind: 'observe' | 'follow' }
  | { k: 'notePhoto'; creature: string }
  // ── animals ──
  | { k: 'moveCreature'; creature: string; to: string; from?: string }
  | { k: 'separateCreature'; creature: string; to: string; from?: string }
  | { k: 'moveClutch'; clutch: string; to: string; from?: string }
  | { k: 'startBreeding'; a: string; b: string; tank?: string }
  | { k: 'renameCreature'; creature: string; name: string }
  | { k: 'setFavorite'; creature: string; on: boolean }
  | { k: 'quickSell'; creatures: string[] }
  // ── the shop and supplies ──
  // `saw`: the ids of the animals bought, as the sender saw the offer (a partial sale reorders what's left)
  | { k: 'buyOffer'; offer: string; tank: string; picks?: number[]; saw?: string[] }
  | { k: 'buyFood'; food: string; packs: number }
  | { k: 'buySalt'; kg: number }
  | { k: 'buyEggs'; tins: number }
  // ── the market ──
  | {
      k: 'createListing';
      kind: ListingKind;
      creatures?: string[];
      tank?: string;
      frags?: string[];
      reserve: number;
      buyNow?: number;
      hours: number;
      title?: string;
      photo?: string;
    }
  | { k: 'withdrawListing'; listing: string }
  | { k: 'acceptBid'; listing: string; bid: string }
  | { k: 'declineBid'; listing: string; bid: string }
  | { k: 'counterBid'; listing: string; bid: string; amount: number }
  | { k: 'holdBid'; listing: string; bid: string }
  // ── the facility ──
  | { k: 'upgradeFacility' }
  | { k: 'upgradePrep' }
  | { k: 'addReservoir' }
  | { k: 'addCulture'; kind: 'cone' | 'jar' }
  | { k: 'setOpenToPublic'; open: boolean }
  | { k: 'setAdmission'; price: number }
  // ── staff ──
  | { k: 'hireStaff'; candidate: string }
  | { k: 'fireStaff'; staff: string }
  | { k: 'assignTank'; staff: string; tank: string; on: boolean }
  | { k: 'autoAssignAll' }
  | { k: 'setStockBudget'; amount: number }
  | { k: 'setStockOrders'; on: boolean }
  // ── production lines ──
  | {
      k: 'createLine';
      mother: string;
      father: string;
      breed: string;
      raise: string;
      quarantine: string;
      keep: string;
      breedFor?: string;
      name?: string;
      rules?: Partial<Record<LineRule, boolean>>;
      /** The keep tank's sort rules (`rules.keep`). */
      sort?: { traits: string[]; count: number }[];
    }
  | { k: 'endLine'; line: string }
  | { k: 'setLineRunning'; line: string; on: boolean }
  | { k: 'setLineRule'; line: string; rule: LineRule; on: boolean }
  | { k: 'setKeepRules'; line: string; rules: { traits: string[]; count: number }[] }
  | { k: 'setLinePair'; line: string; a: string; b: string }
  | { k: 'setLineTank'; line: string; stage: LineStage; tank: string; replace?: string }
  | { k: 'addQuarantineTank'; line: string; seeded: boolean }
  | { k: 'waitForLine'; line: string }
  // ── manual mode ──
  | { k: 'holdAll' }
  | { k: 'resumeAll' }
  | { k: 'setHold'; sys: HoldSystem; on: boolean }
  // ── research and quests ──
  | { k: 'startResearch'; project: string }
  | { k: 'cancelResearch' }
  | { k: 'claimQuest'; quest: string }
  // ── shows ──
  | { k: 'enterShow'; show: string; cls: string; subject: string }
  | { k: 'withdrawEntry'; entry: string }
  // ── the money pool (chunk 14, ADR-0050; a shared shop only: src/sim/pool.ts) ──
  | { k: 'askMoney'; amount: number; note?: string }
  | { k: 'cancelAsk'; ask: string }
  | { k: 'answerAsk'; ask: string; yes: boolean }
  // `member`: the account id; `name`: the member's name as the sender saw it (the alerts line)
  | { k: 'giveMoney'; member: string; name: string; amount: number }
  | { k: 'setSpending'; member: string; name: string; tier: PoolTier; allowance?: number }
  | { k: 'setApprover'; member: string; name: string; on: boolean }
  // ── the clock and the guide ──
  | { k: 'setSpeed'; speed: GameSpeed }
  // its own field isn't `flag`: that is the guide flag every kind may carry, raised once more after the action
  | { k: 'raiseFlag'; name: string }
  | { k: 'tutorialNext' }
  | { k: 'tutorialSkip' };

/** A player action as data. */
export type Command = Kinds & { flag?: string };
export type CommandKind = Command['k'];
export type CommandOf<K extends CommandKind> = Extract<Command, { k: K }>;
