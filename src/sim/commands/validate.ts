/**
 * `validateCommand` (SHARED-SHOPS.md §4.1): a value from the network checked against the catalogue, before the server
 * forwards it or any copy applies it. A known kind, each argument's type and range, the total size; only the
 * argument's own properties are read, and an id that names something every object inherits (`__proto__`,
 * `constructor`, `toString`…) is refused, so no lookup in the game's records can reach a prototype (chunk 10's
 * review). Returns a fresh object holding only the known fields, or null.
 */
import type { Command, CommandKind } from './kinds';

type Field =
  | { t: 'id' }
  | { t: 'ids'; max: number }
  | { t: 'str'; max: number }
  | { t: 'bool' }
  | { t: 'num'; min: number; max: number }
  | { t: 'int'; min: number; max: number }
  | { t: 'ints'; max: number; lo: number; hi: number }
  | { t: 'enum'; of: readonly string[] }
  | { t: 'speed' }
  | { t: 'rules' }
  | { t: 'keep' };
/** A field the command may leave out. */
type Opt = Field & { opt: true };

/** Every field of every kind (TypeScript checks the table covers each kind's arguments). */
type Schema = { [K in CommandKind]: { [F in Exclude<keyof Extract<Command, { k: K }>, 'k' | 'flag'>]-?: Field | Opt } };

/** Ids in the game are short; anything longer is malformed. */
const MAX_ID = 80;
/** A list of animals, frags or traits in one command (a whole tank's residents). */
const MAX_LIST = 500;
/** Money, prices and amounts. */
const MONEY = 1e9;
/** Facility floor coordinates (metres) and angles (radians). */
const COORD = 1e4;
/** The whole command as JSON: a listing with its photo may be larger (§3.3, §4.4). */
export const MAX_COMMAND_CHARS = 16 * 1024;
export const MAX_LISTING_CHARS = 48 * 1024;

const ZONES = ['surface', 'middle', 'bottom'] as const;
const WATER_CLASSES = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted', 'marine_fowlr', 'marine_live_rock', 'reef', 'brackish'] as const;
const LINE_RULES = ['pauseWhenFull', 'keepPrismatic', 'autoList'] as const;

const id: Field = { t: 'id' };
const bool: Field = { t: 'bool' };
const name: Field = { t: 'str', max: 120 };
const coord: Field = { t: 'num', min: -COORD, max: COORD };
const opt = <F extends Field>(f: F): F & { opt: true } => ({ ...f, opt: true });
const en = (of: readonly string[]): Field => ({ t: 'enum', of });
const money: Field = { t: 'num', min: 0, max: MONEY };
const hour: Field = { t: 'num', min: 0, max: 24 };

const SCHEMA: Schema = {
  feedTank: { tank: id, food: id, zone: opt(en(ZONES)), target: opt(id) },
  waterChange: { tank: id, fraction: { t: 'num', min: 0.000001, max: 1 }, coolBy: opt({ t: 'num', min: 0, max: 40 }) },
  topOff: { tank: id },
  cleanTank: { tank: id, what: en(['gravel', 'glass', 'filter']) },
  dose: { tank: id, additive: en(['bacteria', 'conditioner', 'salt', 'buffer', 'fertilizer', 'coral_supplement']) },
  setEquipment: { tank: id, equip: id, on: opt(bool), setting: opt({ t: 'num', min: -1000, max: 1000 }) },
  setAutoFeed: { tank: id, equip: id, on: bool },
  buyEquipment: { tank: id, def: id },
  buyAutoClean: { tank: id },
  installEquipment: { tank: id, def: id, instance: id },
  repairEquipment: { tank: id, equip: id },
  removeEquipment: { tank: id, equip: id },
  setLighting: {
    tank: id,
    preset: opt(en(['daylight', 'warm', 'planted', 'reef_actinic', 'reef_full', 'moonlight', 'sunset', 'cool'])),
    intensity: opt({ t: 'num', min: 0, max: 10 }),
    onHour: opt(hour),
    offHour: opt(hour),
    moonlight: opt(bool),
  },
  setSignage: { tank: id, on: bool },
  renameTank: { tank: id, name },
  setTankPurpose: { tank: id, purpose: en(['display', 'nursery', 'quarantine', 'breeding']) },
  convertWaterClass: { tank: id, wc: en(WATER_CLASSES) },
  changeSubstrate: { tank: id, kind: en(['bare', 'fine_sand', 'sand', 'fine_gravel', 'gravel', 'aragonite', 'planted_soil', 'large_pebbles']), color: opt({ t: 'str', max: 32 }) },
  setBackdrop: { tank: id, backdrop: en(['black', 'deep_blue', 'frosted', 'none', 'rock_3d']) },
  buyTank: { tier: id, wc: en(WATER_CLASSES), seeded: bool, x: opt(coord), z: opt(coord), rotY: opt(coord) },
  placeTank: { tank: id, x: coord, z: coord, rotY: coord },
  placeDecor: { tank: id, def: id, x: coord, z: coord, rotY: opt(coord), scale: opt({ t: 'num', min: 0, max: 100 }) },
  moveDecor: { tank: id, decor: id, x: coord, z: coord, rotY: opt(coord), scale: opt({ t: 'num', min: 0, max: 100 }) },
  removeDecor: { tank: id, decor: id, sell: bool },
  takeFrag: { tank: id, decor: id },
  plantFrag: { tank: id, frag: id, x: opt(coord), z: opt(coord), rotY: opt(coord), rack: opt(bool) },
  quickSellFrags: { frags: { t: 'ids', max: MAX_LIST } },
  glassTap: { tank: id, intensity: { t: 'num', min: 0, max: 10 } },
  noteInteraction: { creature: id, kind: en(['observe', 'follow']) },
  notePhoto: { creature: id },
  moveCreature: { creature: id, to: id, from: opt(id) },
  separateCreature: { creature: id, to: id, from: opt(id) },
  moveClutch: { clutch: id, to: id, from: opt(id) },
  startBreeding: { a: id, b: id, tank: opt(id) },
  renameCreature: { creature: id, name },
  setFavorite: { creature: id, on: bool },
  quickSell: { creatures: { t: 'ids', max: MAX_LIST } },
  buyOffer: { offer: id, tank: id, picks: opt({ t: 'ints', max: MAX_LIST, lo: 0, hi: 10_000 }) },
  buyFood: { food: id, packs: { t: 'int', min: 1, max: 1000 } },
  buySalt: { kg: { t: 'num', min: 0, max: 10_000 } },
  buyEggs: { tins: { t: 'int', min: 1, max: 1000 } },
  createListing: {
    kind: en(['creature', 'group', 'pair', 'juveniles', 'tank', 'frag']),
    creatures: opt({ t: 'ids', max: MAX_LIST }),
    tank: opt(id),
    frags: opt({ t: 'ids', max: MAX_LIST }),
    reserve: money,
    buyNow: opt(money),
    hours: { t: 'num', min: 0, max: 10_000 },
    title: opt(name),
    photo: opt({ t: 'str', max: MAX_LISTING_CHARS }),
  },
  withdrawListing: { listing: id },
  acceptBid: { listing: id, bid: id },
  declineBid: { listing: id, bid: id },
  counterBid: { listing: id, bid: id, amount: money },
  holdBid: { listing: id, bid: id },
  upgradeFacility: {},
  upgradePrep: {},
  addReservoir: {},
  addCulture: { kind: en(['cone', 'jar']) },
  setOpenToPublic: { open: bool },
  setAdmission: { price: money },
  hireStaff: { candidate: id },
  fireStaff: { staff: id },
  assignTank: { staff: id, tank: id, on: bool },
  autoAssignAll: {},
  setStockBudget: { amount: money },
  setStockOrders: { on: bool },
  createLine: { mother: id, father: id, breed: id, raise: id, quarantine: id, keep: id, breedFor: opt(id), name: opt(name), rules: opt({ t: 'rules' }), sort: opt({ t: 'keep' }) },
  endLine: { line: id },
  setLineRunning: { line: id, on: bool },
  setLineRule: { line: id, rule: en(LINE_RULES), on: bool },
  setKeepRules: { line: id, rules: { t: 'keep' } },
  setLinePair: { line: id, a: id, b: id },
  setLineTank: { line: id, stage: en(['breed', 'raise', 'quarantine', 'keep']), tank: id, replace: opt(id) },
  addQuarantineTank: { line: id, seeded: bool },
  waitForLine: { line: id },
  holdAll: {},
  resumeAll: {},
  setHold: { sys: en(['water', 'salt', 'food', 'feeders', 'lines']), on: bool },
  startResearch: { project: id },
  cancelResearch: {},
  claimQuest: { quest: id },
  enterShow: { show: id, cls: id, subject: id },
  withdrawEntry: { entry: id },
  setSpeed: { speed: { t: 'speed' } },
  raiseFlag: { flag: { t: 'str', max: 64 } },
  tutorialNext: {},
  tutorialSkip: {},
};

/** The kinds the catalogue knows (tests walk them). */
export const COMMAND_KINDS = Object.keys(SCHEMA) as CommandKind[];

/** A guide flag: a short word with an optional `:detail` (`opened_market`, `read_param:temp`, `observed:schooling`). */
const FLAG = /^[A-Za-z0-9_]{1,40}(:[A-Za-z0-9_ .-]{1,40})?$/;

/** Is this an id the game could hold, and not a name every object inherits? */
export function isSafeId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_ID && !(v in Object.prototype) && v !== '__proto__' && !/[\u0000-\u001f]/.test(v);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const plain = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const get = (o: Record<string, unknown>, k: string): unknown => (Object.hasOwn(o, k) ? o[k] : undefined);

/** The checked value of one field, or `BAD`. */
const BAD = Symbol('bad');
function check(f: Field, v: unknown): unknown {
  switch (f.t) {
    case 'id':
      return isSafeId(v) ? v : BAD;
    case 'ids':
      return Array.isArray(v) && v.length <= f.max && v.every(isSafeId) ? [...v] : BAD;
    case 'str':
      return typeof v === 'string' && v.length <= f.max ? v : BAD;
    case 'bool':
      return typeof v === 'boolean' ? v : BAD;
    case 'num':
      return isNum(v) && v >= f.min && v <= f.max ? v : BAD;
    case 'int':
      return Number.isInteger(v) && (v as number) >= f.min && (v as number) <= f.max ? v : BAD;
    case 'ints':
      return Array.isArray(v) && v.length <= f.max && v.every((x) => Number.isInteger(x) && x >= f.lo && x <= f.hi) ? [...v] : BAD;
    case 'enum':
      return typeof v === 'string' && f.of.includes(v) ? v : BAD;
    case 'speed':
      return v === 0 || v === 1 || v === 3 || v === 10 ? v : BAD;
    case 'rules': {
      if (!plain(v)) return BAD;
      const out: Record<string, boolean> = {};
      for (const k of Object.keys(v)) {
        if (!(LINE_RULES as readonly string[]).includes(k) || typeof v[k] !== 'boolean') return BAD;
        out[k] = v[k] as boolean;
      }
      return out;
    }
    case 'keep': {
      if (!Array.isArray(v) || v.length > 20) return BAD;
      const out: { traits: string[]; count: number }[] = [];
      for (const r of v) {
        if (!plain(r)) return BAD;
        const traits = check({ t: 'ids', max: 20 }, get(r, 'traits'));
        const count = get(r, 'count');
        if (traits === BAD || !Number.isInteger(count) || (count as number) < 0 || (count as number) > 1000) return BAD;
        out.push({ traits: traits as string[], count: count as number });
      }
      return out;
    }
  }
}

export function validateCommand(x: unknown): Command | null {
  if (!plain(x)) return null;
  const k = get(x, 'k');
  if (typeof k !== 'string' || !Object.hasOwn(SCHEMA, k)) return null;
  const fields = SCHEMA[k as CommandKind] as Record<string, Field | Opt>;
  const out: Record<string, unknown> = { k };
  for (const [name, f] of Object.entries(fields)) {
    const v = get(x, name);
    if (v === undefined) {
      if ('opt' in f) continue;
      return null;
    }
    const c = check(f, v);
    if (c === BAD) return null;
    out[name] = c;
  }
  if (k === 'raiseFlag' && !FLAG.test(out.flag as string)) return null;
  const flag = get(x, 'flag');
  if (flag !== undefined) {
    if (typeof flag !== 'string' || !FLAG.test(flag)) return null;
    out.flag = flag;
  }
  if (JSON.stringify(out).length > (k === 'createListing' ? MAX_LISTING_CHARS : MAX_COMMAND_CHARS)) return null;
  return out as Command;
}
