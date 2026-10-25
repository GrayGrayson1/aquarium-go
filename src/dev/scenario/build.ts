/**
 * buildScenario: a recipe → a game (chunk 15, ADR-0051). Pure (no store, no React): the lab, `?scenario=`, the
 * headless script and the tests all build through it. It builds what it can and reports the rest (`issues`), never
 * throws on a bad recipe, since bad setups are what the owner wants to test. Same recipe and seed, same world.
 *
 * Every built world goes through the real save path (encodeRecord → decodeRecord, whose migrate step runs
 * repairState) and the loaded copy is what's returned, so a scenario is always a game the player's own save path
 * would load. A repair it needed is reported as a warning (the tests hold the presets to none).
 */
import type { Clutch, Creature, EquipmentInstance, GameState, Genome, Show, ShopOffer, ShowTier, Tank, WaterClass, WaterState } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { addCreature, assignPrismatic, createCreature, forcePrismatic, recordFinds, registerDiscovery, rollGenome } from '@/sim/life';
import { forcedPrismaticPending } from '@/sim/life/rareVariants';
import { eligibleIllnesses, illnessDef, ILLNESSES } from '@/sim/life/illness';
import { moduleFor } from '@/sim/life/breeding/registry';
import { createClutch } from '@/sim/life/breeding/clutch';
import { pickSite, type SiteKind } from '@/sim/life/breeding/common';
import { devForceBreeding } from '@/sim/life/breeding/actions';
import { simRng, visualRng } from '@/sim/rng';
import { nextId } from '@/sim/ids';
import { touchResidents } from '@/sim/residents';
import { advanceWorld, flushSimDebt, refreshTankCache } from '@/sim/world';
import { dayOf, hourOfDay } from '@/sim/time';
import { installEquipment, tuneEquipmentForSpecies } from '@/sim/care';
import { placeDecor } from '@/sim/aquascape';
import { initialLivingState } from '@/sim/aquascape/placement';
import { initialFacility, settleStartingProgress, tutorialSkip, unlock } from '@/sim/facility';
import { initMarket, createListing, suggestPricing, forceBuyerVisit, devOpenMarket } from '@/sim/economy';
import { creatureValue } from '@/sim/economy/valuation';
import { nicePrice } from '@/sim/economy/util';
import { addStaffDirect } from '@/sim/staff';
import { ensureStaff } from '@/sim/staff/common';
import { installFoodRoom, installRooms, installWaterRoom, setManualMode } from '@/sim/automation';
import { createLine } from '@/sim/production';
import { ensureShowsState, enterShow, classCandidates, creatureFitsClass, creatureShowReasons } from '@/sim/shows';
import { encodeRecord, decodeRecord } from '@/persistence/serialize';
import { findSpecies, STARTER_IDS, type StarterId } from '@/data/species';
import { TANK_TIER_BY_ID, getTankTier } from '@/data/catalog/tanks';
import { EQUIPMENT, getEquipmentDef } from '@/data/catalog/equipment';
import { getDecorDef } from '@/data/catalog/decor';
import { SUBSTRATES } from '@/data/catalog/substrates';
import { FOODS } from '@/data/catalog/foods';
import { RESEARCH } from '@/data/research';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { getFacilityLevel } from '@/data/facilities';
import { STAFF_CAPACITY, STAFF_ROLES, STAFF_TRAITS, STOCK_BUDGET, STAFF_MAX_SKILL } from '@/data/staff';
import { SHOW_CLASSES, SHOW_TIERS } from '@/data/shows';
import { decorateTank, ensureFacility, matchWaterToStock, dominantSpecies, placeOrGrow, sexFor, tierForGallons } from '../fixtures/core-helpers';
import { deepMerge, isPlainObject } from './patch';
import { findNonFinite } from '../fixtures/core-testkit';
import { genesForMorph, morphNames } from './genes';
import type { AnimalRecipe, EquipmentRecipe, ScenarioRecipe, TankRecipe, YoungRecipe } from './recipe';
import { RECIPE_FORMAT, RECIPE_VERSION } from './recipe';

export type IssueLevel = 'error' | 'warning' | 'note';

/** Something the build couldn't do as asked (`error`: that part was skipped), or worth knowing. */
export interface BuildIssue {
  level: IssueLevel;
  /** Where in the recipe (`tanks[0].animals[1].species`). */
  at: string;
  message: string;
}

export interface BuildResult {
  state: GameState;
  issues: BuildIssue[];
  /** Recipe names → the game's ids. */
  tanks: Record<string, string>;
  animals: Record<string, string>;
  /** The tank to open on, and the view. */
  focusTankId: string | null;
  view: 'tank' | 'facility';
  /** Game hours the build ran the world forward (eggs that had to be laid, the warm-up). */
  hoursRun: number;
  /** What the save path repaired (empty for a legal world). */
  repairs: string[];
}

export interface BuildEnv {
  /** The fixture registry (`fixture:<name>` bases): the lab passes the lazily loaded one, Node code imports it. */
  fixtures?: Record<string, () => GameState>;
  /** The game on screen (`current` base). */
  current?: GameState | null;
  /** A trial build for the lab's warnings: skip the runs forward (eggs to be laid, the warm-up). */
  trial?: boolean;
  /** Real time for the save's stamps (default Date.now()); not part of the world. */
  now?: number;
}

/** The most a build runs the world forward for a warm-up, and for eggs to be laid. */
export const MAX_WARMUP_HOURS = 24 * 30;
export const MAX_SPAWN_HOURS = 72;
const MAX_ANIMALS_PER_ENTRY = 200;
/** The furthest day a recipe can start on, and the most money (either way) it can set. */
const MAX_DAY = 36_500;
const MAX_MONEY = 1e12;
const NEUTRAL_POTENTIALS = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
const STAFF_NAMES = ['Rosa Duarte', 'Sam Okafor', 'Mei Lin', 'Theo Grant', 'Ava Silva', 'Jonah Reyes', 'Priya Nair', 'Leo Brandt', 'Ines Moreau', 'Kofi Mensah'];

/** The water's numbers a recipe may set, and the range each is kept in. */
export const WATER_RANGES: Record<string, [number, number]> = {
  tempC: [0, 40],
  pH: [4, 10],
  ammonia: [0, 20],
  nitrite: [0, 20],
  nitrate: [0, 500],
  oxygen: [0, 1],
  salinitySG: [1, 1.04],
  gh: [0, 40],
  kh: [0, 30],
  detritus: [0, 100],
  algae: [0, 100],
  clarity: [0, 1],
  bioMaturity: [0, 1],
  foodInWater: [0, 100],
  level: [0.3, 1],
};

const STAT_KEYS = ['health', 'hunger', 'stress', 'energy', 'social', 'comfort', 'breedingReadiness', 'enrichment'] as const;
const WATER_CLASSES: WaterClass[] = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted', 'marine_fowlr', 'marine_live_rock', 'reef', 'brackish'];
const PURPOSES = ['display', 'nursery', 'quarantine', 'breeding'];
const LIGHT_PRESETS = ['daylight', 'warm', 'planted', 'reef_actinic', 'reef_full', 'moonlight', 'sunset', 'cool'];
const BACKDROPS = ['black', 'deep_blue', 'frosted', 'none', 'rock_3d'];
const SEX_PLANS = ['male', 'female', 'unknown', 'pair', 'mixed', 'females', 'auto'];
/** Where each breeding system's free eggs sit, and how they look. */
const EGGS: Partial<Record<string, { visual: Clutch['visual']; site: SiteKind }>> = {
  bubble_nest: { visual: 'bubble_nest', site: 'surface' },
  egg_scatter_cover: { visual: 'eggs_scattered', site: 'plants_low' },
  substrate_spawner: { visual: 'eggs_adhesive', site: 'glass' },
  cave_spawner: { visual: 'eggs_adhesive', site: 'cave' },
  snail_egg_clutch: { visual: 'snail_clutch', site: 'above_water' },
  egg_layer_generic: { visual: 'eggs_scattered', site: 'plants_low' },
  clownfish_substrate: { visual: 'eggs_adhesive', site: 'host_rock' },
  axolotl_spermatophore: { visual: 'egg_strands', site: 'plants_mid' },
};

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** The sex a plan names for the `k`th animal (male, female, or alternating for a pair or mix), else null. */
function namedSex(plan: string, k: number): 'male' | 'female' | null {
  if (plan === 'male' || plan === 'female') return plan;
  if (plan === 'females') return 'female';
  if (plan === 'pair' || plan === 'mixed') return k % 2 === 0 ? 'male' : 'female';
  return null;
}

/** A short id-safe form of a name (the scenario's save id). */
export function slugOf(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'scenario'
  );
}

class Builder {
  readonly issues: BuildIssue[] = [];
  // no prototype: a tank or animal called "constructor" or "toString" is just a name
  readonly tanks: Record<string, string> = Object.create(null) as Record<string, string>;
  readonly animals: Record<string, string> = Object.create(null) as Record<string, string>;
  g: GameState;
  private readonly breedQueue: { at: string; ids: string[]; mode: 'ready' | 'spawned' }[] = [];
  hoursRun = 0;

  constructor(
    readonly r: ScenarioRecipe,
    readonly env: BuildEnv,
  ) {
    this.g = this.base();
  }

  issue(level: IssueLevel, at: string, message: string): void {
    this.issues.push({ level, at, message });
  }

  get hour(): number {
    return this.g.clock.hour;
  }

  // ───────────── the base ─────────────

  private seed(): number {
    const s = this.r.seed;
    return num(s) ? Math.floor(Math.abs(s)) >>> 0 || 1 : 1;
  }

  private blankShop(): GameState {
    const seed = this.seed();
    const g = newGame({ starterId: 'betta', starterName: 'Lab', seed, shopName: this.r.shop?.name ?? 'Scenario Lab' });
    g.tanks = {};
    g.tankOrder = [];
    g.creatures = {};
    g.clutches = {};
    g.log = [];
    g.finance.money = 0;
    g.inventory = { foods: {}, salt: 0, equipment: [], decor: [] };
    g.market.stock = [];
    const p = g.progress;
    p.discoveredSpecies = [];
    p.discoveredMorphs = [];
    p.discoveredStrains = [];
    p.prismaticFinds = [];
    p.achievements = [];
    touchResidents();
    return g;
  }

  private base(): GameState {
    const base = this.r.base ?? 'blank';
    if (base === 'blank') return this.blankShop();
    if (base.startsWith('starter:')) {
      const id = base.slice('starter:'.length);
      if ((STARTER_IDS as readonly string[]).includes(id)) {
        const seed = this.seed();
        const preview = previewStarters(seed)[id as StarterId];
        const g = newGame({ starterId: id as StarterId, starterName: preview.name, seed, starterCreature: preview, ...(this.r.shop?.name ? { shopName: this.r.shop.name } : {}) });
        return g;
      }
      this.issue('error', 'base', `There's no starter called "${id}" (${STARTER_IDS.join(', ')}); started from a blank shop.`);
      return this.blankShop();
    }
    if (base.startsWith('fixture:')) {
      const name = base.slice('fixture:'.length);
      const build = this.env.fixtures?.[name];
      if (build) {
        try {
          const g = build();
          g.isShowcase = false;
          return g;
        } catch (e) {
          this.issue('error', 'base', `The fixture "${name}" failed to build (${(e as Error).message}); started from a blank shop.`);
          return this.blankShop();
        }
      }
      this.issue('error', 'base', this.env.fixtures ? `There's no fixture called "${name}"; started from a blank shop.` : `Fixtures aren't available here; started from a blank shop.`);
      return this.blankShop();
    }
    if (base === 'current') {
      if (this.env.current) {
        const g = structuredClone(this.env.current);
        g.isShowcase = false;
        delete g.offlineGrace;
        return g;
      }
      this.issue('error', 'base', 'There is no game on screen to copy (the "current" base works only in the lab); started from a blank shop.');
      return this.blankShop();
    }
    this.issue('error', 'base', `Unknown base "${String(base)}" (blank, starter:<id>, fixture:<name> or current); started from a blank shop.`);
    return this.blankShop();
  }

  private get blank(): boolean {
    return (this.r.base ?? 'blank') === 'blank';
  }

  // ───────────── the shop ─────────────

  shop(): void {
    const g = this.g;
    const s = this.r.shop ?? {};
    const at = 'shop';
    if (s.name !== undefined) {
      if (str(s.name)) g.shopName = s.name.slice(0, 40);
      else this.issue('error', `${at}.name`, 'The shop name must be text.');
    }
    // the clock first: everything made afterwards is stamped with the scenario's own hour
    let moved = false;
    if (s.day !== undefined || s.hour !== undefined) {
      if (num(s.day) && (s.day < 1 || s.day > MAX_DAY)) this.issue('warning', `${at}.day`, `day is kept between 1 and ${MAX_DAY}.`);
      const day = num(s.day) ? clamp(Math.floor(s.day), 1, MAX_DAY) : dayOf(g.clock.hour);
      const hod = num(s.hour) ? clamp(s.hour, 0, 23.99) : this.blank ? 9 : hourOfDay(g.clock.hour);
      const target = (day - 1) * 24 + hod;
      if (target + 1e-9 < g.clock.hour) this.issue('warning', `${at}.day`, `The game is already at day ${dayOf(g.clock.hour)}; the clock can't go back, so it stays.`);
      else if (target > g.clock.hour) {
        g.clock.hour = target;
        moved = true;
      }
    } else if (this.blank) {
      g.clock.hour = 9; // a blank shop opens at 9 AM on day 1
      moved = true;
    }
    if (moved) {
      g.visitors.today = { day: dayOf(g.clock.hour), count: 0, revenue: 0, tips: 0, satisfactionSum: 0 };
      delete g.visitors.live;
      delete g.progress.scan;
      g.progress.tutorial.stepStartedHour = g.clock.hour;
    }

    if (s.facility !== undefined) {
      const def = getFacilityLevel(s.facility);
      if (!def || def.id !== s.facility) this.issue('error', `${at}.facility`, `Unknown facility level "${String(s.facility)}" (hobby_room, specialty_shop, aquarium_store, showroom, destination, grand_hall).`);
      else if (g.tankOrder.length) ensureFacility(g, s.facility);
      else g.facility = { ...initialFacility(s.facility), ...(g.facility.water ? { water: g.facility.water } : {}), ...(g.facility.food ? { food: g.facility.food } : {}) };
    }

    const unlocks = s.unlocks ?? (this.blank ? 'all' : undefined);
    if (unlocks === 'all') for (const k of Object.keys(UNLOCK_KEYS)) unlock(g, k, { silent: true });
    else if (unlocks === 'none') g.progress.unlocked = [];
    else if (Array.isArray(unlocks)) {
      for (const k of unlocks) {
        if (typeof k === 'string' && Object.hasOwn(UNLOCK_KEYS, k)) unlock(g, k, { silent: true });
        else this.issue('error', `${at}.unlocks`, `Unknown unlock key "${String(k)}".`);
      }
    } else if (unlocks !== undefined) this.issue('error', `${at}.unlocks`, 'unlocks must be "all", "none" or a list of unlock keys.');

    // a blank shop finishes all research only when it unlocks everything (research grants unlocks of its own)
    const research = s.research ?? (this.blank && (unlocks === 'all' || unlocks === undefined) ? 'all' : undefined);
    const ids = research === 'all' ? RESEARCH.map((d) => d.id) : Array.isArray(research) ? research : [];
    if (research !== undefined && research !== 'all' && !Array.isArray(research)) this.issue('error', `${at}.research`, 'research must be "all" or a list of project ids.');
    for (const id of ids) this.finishResearch(id, `${at}.research`);
    if (s.waterRoom) this.finishResearch('central_water_supply', `${at}.waterRoom`);
    if (s.foodRoom) {
      this.finishResearch('breeding_program', `${at}.foodRoom`);
      this.finishResearch('central_water_supply', `${at}.foodRoom`);
      this.finishResearch('live_food_cultures', `${at}.foodRoom`);
    }
    if (s.researching) {
      const def = RESEARCH.find((d) => d.id === s.researching!.id);
      if (!def) this.issue('error', `${at}.researching`, `Unknown research project "${String(s.researching.id)}".`);
      else if (g.progress.research.completed.includes(def.id)) this.issue('warning', `${at}.researching`, `${def.name} is already finished.`);
      else {
        g.progress.research.activeId = def.id;
        g.progress.research.progressHours = clamp(num(s.researching.hoursDone) ? s.researching.hoursDone : 0, 0, def.hours - 0.25);
        g.progress.counters._research_paid = def.cost;
      }
    }
    if (g.facility.water === undefined && g.progress.unlocked.includes('water_room')) installWaterRoom(g, g.clock.hour);
    if (g.facility.food === undefined && g.progress.unlocked.includes('live_food_room')) installFoodRoom(g);
    installRooms(g);
    g.notify = { ...(g.notify ?? {}), researchSeen: g.progress.research.completed.length };

    if (s.reputation !== undefined) {
      if (num(s.reputation)) g.progress.reputation = clamp(s.reputation, 0, 1000);
      else this.issue('error', `${at}.reputation`, 'reputation must be a number from 0 to 1000.');
    }
    if (s.mastery !== undefined) {
      for (const [k, v] of Object.entries(s.mastery)) {
        if (Object.hasOwn(g.progress.mastery, k) && num(v)) g.progress.mastery[k as keyof typeof g.progress.mastery] = Math.max(0, v);
        else this.issue('error', `${at}.mastery.${k}`, 'Mastery tracks are husbandry, breeding, aquascaping, marine, business and exhibition, each a number of points.');
      }
    }
    const guide = s.guide ?? (this.blank ? 'done' : undefined);
    if (guide === 'done' && !g.progress.tutorial.done) tutorialSkip(g);
    else if (guide === 'on' && g.progress.tutorial.done) this.issue('warning', `${at}.guide`, 'The guide is already finished in this base; start from a starter (base "starter:<id>") to play it.');
    else if (guide !== undefined && guide !== 'done' && guide !== 'on') this.issue('error', `${at}.guide`, 'guide must be "done" or "on".');

    let money = s.money ?? (this.blank ? 50_000 : undefined);
    if (money !== undefined) {
      if (num(money)) {
        if (money !== clamp(money, -MAX_MONEY, MAX_MONEY)) this.issue('warning', `${at}.money`, `money is kept between -$${MAX_MONEY.toLocaleString('en-US')} and $${MAX_MONEY.toLocaleString('en-US')}.`);
        money = clamp(money, -MAX_MONEY, MAX_MONEY);
        g.finance.money = Math.round(money * 100) / 100;
        if (money < 0) g.finance.debtSinceHour ??= g.clock.hour;
        else delete g.finance.debtSinceHour;
      } else this.issue('error', `${at}.money`, 'money must be a number.');
    }
    const lvl = g.facility.level;
    if (s.openToPublic !== undefined || (this.blank && lvl !== 'hobby_room')) {
      const open = s.openToPublic ?? true;
      if (open && lvl === 'hobby_room') this.issue('warning', `${at}.openToPublic`, 'A hobby room never opens to the public.');
      g.facility.openToPublic = open && lvl !== 'hobby_room';
      if (g.facility.openToPublic) unlock(g, 'visitors', { silent: true });
    }
    if (s.admission !== undefined) {
      if (num(s.admission)) g.facility.admission = clamp(Math.round(s.admission), 0, 40);
      else this.issue('error', `${at}.admission`, 'admission must be a number (0 to 40).');
    }
    if (s.manualMode) setManualMode(g, 'all', true);
    this.inventoryFoods();
  }

  private finishResearch(id: unknown, at: string): void {
    const def = RESEARCH.find((d) => d.id === id);
    if (!def) {
      this.issue('error', at, `Unknown research project "${String(id)}".`);
      return;
    }
    const p = this.g.progress;
    for (const k of def.grants) unlock(this.g, k, { silent: true });
    if (!p.research.completed.includes(def.id)) p.research.completed.push(def.id);
    if (p.research.activeId === def.id) {
      delete p.research.activeId;
      p.research.progressHours = 0;
    }
  }

  private inventoryFoods(): void {
    const g = this.g;
    const inv = this.r.shop?.inventory ?? {};
    const at = 'shop.inventory';
    const foods = inv.foods ?? (this.blank ? 'plenty' : undefined);
    if (foods === 'plenty') {
      for (const f of FOODS) g.inventory.foods[f.id] = Math.max(g.inventory.foods[f.id] ?? 0, 200);
      g.inventory.salt = Math.max(g.inventory.salt, 100);
      g.inventory.brineShrimpEggs = Math.max(g.inventory.brineShrimpEggs ?? 0, 100);
    } else if (isPlainObject(foods)) {
      for (const [id, n] of Object.entries(foods)) {
        if (!FOODS.some((f) => f.id === id)) this.issue('error', `${at}.foods.${id}`, `Unknown food "${id}".`);
        else if (!num(n) || n < 0) this.issue('error', `${at}.foods.${id}`, 'A food amount must be a number of servings, 0 or more.');
        else g.inventory.foods[id] = Math.floor(n);
      }
    } else if (foods !== undefined) this.issue('error', `${at}.foods`, 'foods must be "plenty" or servings by food id.');
    if (inv.salt !== undefined) {
      if (num(inv.salt) && inv.salt >= 0) g.inventory.salt = inv.salt;
      else this.issue('error', `${at}.salt`, 'salt must be kilograms, 0 or more.');
    }
    if (inv.brineShrimpEggs !== undefined) {
      if (num(inv.brineShrimpEggs) && inv.brineShrimpEggs >= 0) g.inventory.brineShrimpEggs = Math.floor(inv.brineShrimpEggs);
      else this.issue('error', `${at}.brineShrimpEggs`, 'brineShrimpEggs must be scoops, 0 or more.');
    }
  }

  /** Spare equipment and decor in storage (after the tanks, so automatic decor never takes a spare piece). */
  inventorySpares(): void {
    const g = this.g;
    const inv = this.r.shop?.inventory ?? {};
    for (const [i, id] of (inv.equipment ?? []).entries()) {
      if (!getEquipmentDef(id)) {
        this.issue('error', `shop.inventory.equipment[${i}]`, `Unknown equipment "${String(id)}".`);
        continue;
      }
      g.inventory.equipment.push({ id: nextId(g, 'eq'), defId: id, installedHour: g.clock.hour, condition: 1, on: true });
    }
    const rng = visualRng('scenario:spares');
    for (const [i, id] of (inv.decor ?? []).entries()) {
      if (!getDecorDef(id)) {
        this.issue('error', `shop.inventory.decor[${i}]`, `Unknown decor "${String(id)}".`);
        continue;
      }
      g.inventory.decor.push({ id: nextId(g, 'dc'), defId: id, x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1 + Math.floor(rng.next() * 0x7ffffffe) });
    }
  }

  // ───────────── tanks ─────────────

  allTanks(): void {
    const list = this.r.tanks ?? [];
    if (!Array.isArray(list)) {
      this.issue('error', 'tanks', 'tanks must be a list.');
      return;
    }
    list.forEach((t, i) => {
      if (!isPlainObject(t)) this.issue('error', `tanks[${i}]`, 'Each tank must be an object.');
      else this.tank(t as unknown as TankRecipe, `tanks[${i}]`);
    });
  }

  private tank(t: TankRecipe, at: string): void {
    const g = this.g;
    const name = str(t.name) ? t.name.slice(0, 40) : `Tank ${g.tankOrder.length + 1}`;
    if (!str(t.name)) this.issue('warning', `${at}.name`, `A tank needs a name (the rest of the recipe refers to it by name); called it "${name}".`);
    if (this.tanks[name]) this.issue('warning', `${at}.name`, `Two tanks are called "${name}"; references go to the first.`);
    const animals = Array.isArray(t.animals) ? t.animals : [];
    const kinds = animals.map((a, k) => {
      const sp = isPlainObject(a) && str(a.species) ? findSpecies(a.species) : undefined;
      if (!sp) this.issue('error', `${at}.animals[${k}].species`, `Unknown species "${String(isPlainObject(a) ? a.species : a)}".`);
      return sp;
    });
    const first = kinds.find((k) => !!k);
    let wc: WaterClass = first?.waterClasses[0] ?? 'freshwater_tropical';
    if (t.water !== undefined) {
      if (WATER_CLASSES.includes(t.water)) wc = t.water;
      else this.issue('error', `${at}.water`, `Unknown water "${String(t.water)}" (${WATER_CLASSES.join(', ')}); used ${wc}.`);
    }
    const needs = Math.max(10, ...kinds.map((k) => k?.recommendedMinTankGallons ?? 0));
    let tierId = tierForGallons(needs);
    if (typeof t.size === 'string') {
      if (Object.hasOwn(TANK_TIER_BY_ID, t.size)) tierId = t.size;
      else this.issue('error', `${at}.size`, `Unknown tank size "${t.size}" (g5, g10, g20L, g29, g40B, g55, g75, g90, g125, g180, g240, g300, g500, g600, g800, g1000, or gallons); used ${tierId}.`);
    } else if (num(t.size)) tierId = tierForGallons(t.size);
    else if (t.size !== undefined) this.issue('error', `${at}.size`, 'size must be a tier id or gallons.');
    const gallons = getTankTier(tierId).gallons;

    const subst = this.substrate(t, at);
    const tank = createTank(g, tierId, wc, {
      name,
      cycled: t.cycled ?? true,
      placement: placeOrGrow(g, tierId),
      withDefaultEquipment: !t.bareEquipment,
      ...(t.purpose !== undefined && PURPOSES.includes(t.purpose) ? { purpose: t.purpose } : {}),
      ...(t.backdrop !== undefined && BACKDROPS.includes(t.backdrop) ? { backdrop: t.backdrop } : {}),
      ...(subst ? { substrate: subst } : {}),
    });
    if (t.purpose !== undefined && !PURPOSES.includes(t.purpose)) this.issue('error', `${at}.purpose`, `Unknown purpose "${String(t.purpose)}" (${PURPOSES.join(', ')}).`);
    if (t.backdrop !== undefined && !BACKDROPS.includes(t.backdrop)) this.issue('error', `${at}.backdrop`, `Unknown backdrop "${String(t.backdrop)}" (${BACKDROPS.join(', ')}).`);
    this.tanks[name] ??= tank.id;
    // an established tank (its biofilm and plants have had time), unless the recipe says new
    const age = num(t.ageDays) ? clamp(t.ageDays, 0, 3650) : t.cycled === false ? 0 : 30;
    if (t.ageDays !== undefined && !num(t.ageDays)) this.issue('error', `${at}.ageDays`, 'ageDays must be game days, 0 or more.');
    tank.createdHour = g.clock.hour - age * 24;

    this.decor(tank, t, at);
    animals.forEach((a, k) => {
      if (kinds[k]) this.group(tank, a, `${at}.animals[${k}]`, gallons);
    });
    if (t.matchWater !== false) matchWaterToStock(g, tank);
    const main = dominantSpecies(g, tank.id);
    if (main) tuneEquipmentForSpecies(g, tank.id, main);
    this.equipment(tank, t, at);
    this.water(tank, t, at);
    this.lights(tank, t, at);
    (Array.isArray(t.young) ? t.young : []).forEach((y, k) => this.young(tank, y, `${at}.young[${k}]`));
    if (t.patch !== undefined) for (const p of deepMerge(tank as unknown as Record<string, unknown>, t.patch, `${at}.patch`)) this.issue('error', `${at}.patch`, p);
    refreshTankCache(g, tank);
  }

  private substrate(t: TankRecipe, at: string): Tank['substrate'] | null {
    if (t.substrate === undefined) return null;
    const kind = typeof t.substrate === 'string' ? t.substrate : isPlainObject(t.substrate) ? t.substrate.kind : undefined;
    const def = SUBSTRATES.find((s) => s.kind === kind);
    if (!def) {
      this.issue('error', `${at}.substrate`, `Unknown substrate "${String(kind)}" (${SUBSTRATES.map((s) => s.kind).join(', ')}).`);
      return null;
    }
    const o: { depthCm?: unknown; color?: unknown } = typeof t.substrate === 'string' ? {} : t.substrate;
    return { kind: def.kind, depthCm: num(o.depthCm) ? clamp(o.depthCm, 0, 15) : def.kind === 'bare' ? 0 : 4, color: str(o.color) ? o.color : def.colors[0] };
  }

  private decor(tank: Tank, t: TankRecipe, at: string): void {
    const g = this.g;
    const d = t.decor ?? 'auto';
    if (Array.isArray(d) && d.includes('auto')) {
      this.decor(tank, { ...t, decor: 'auto' }, at);
      this.decor(tank, { ...t, decor: d.filter((x) => x !== 'auto') }, at);
      return;
    }
    if (d === 'auto') {
      // decorateTank places from storage when it holds the same piece: keep the shop's spares out of its reach
      const spares = g.inventory.decor;
      g.inventory.decor = [];
      decorateTank(g, tank);
      g.inventory.decor = spares;
      return;
    }
    if (d === 'none') return;
    if (!Array.isArray(d)) {
      this.issue('error', `${at}.decor`, 'decor must be "auto", "none" or a list of decor ids.');
      return;
    }
    const tier = getTankTier(tank.tierId);
    const L = tier.dimsIn.l * 0.0254;
    const W = tier.dimsIn.w * 0.0254;
    d.forEach((piece, k) => {
      const spec = typeof piece === 'string' ? { id: piece } : isPlainObject(piece) ? piece : null;
      const def = spec && str(spec.id) ? getDecorDef(spec.id) : undefined;
      if (!spec || !def) {
        this.issue('error', `${at}.decor[${k}]`, `Unknown decor "${String(spec?.id ?? piece)}".`);
        return;
      }
      if (!def.environments.includes(tank.environment)) this.issue('warning', `${at}.decor[${k}]`, `${def.name} isn't made for ${tank.environment} tanks.`);
      const rng = visualRng(`${tank.id}:recipe:${k}`);
      if (spec.exact) {
        tank.decor.push({
          ...initialLivingState(def),
          id: nextId(g, 'dc'),
          defId: def.id,
          x: num(spec.x) ? clamp(spec.x, -L / 2, L / 2) : 0,
          y: num(spec.y) ? clamp(spec.y, 0, tier.dimsIn.h * 0.0254) : 0,
          z: num(spec.z) ? clamp(spec.z, -W / 2, W / 2) : 0,
          rotY: num(spec.rotY) ? spec.rotY : 0,
          scale: num(spec.scale) ? clamp(spec.scale, 0.1, 5) : 1,
          seed: 1 + Math.floor(rng.next() * 0x7ffffffe),
        });
        return;
      }
      // the game's own placement check first (a spot that fits), a few tries, else placed as given
      for (let tries = 0; tries < 8; tries++) {
        const pos = {
          x: num(spec.x) && tries === 0 ? spec.x : (rng.next() * 2 - 1) * Math.max(0.02, L / 2 - 0.08),
          z: num(spec.z) && tries === 0 ? spec.z : (rng.next() * 2 - 1) * Math.max(0.02, W / 2 - 0.08),
          rotY: num(spec.rotY) ? spec.rotY : rng.next() * Math.PI * 2,
          ...(num(spec.scale) ? { scale: spec.scale } : {}),
        };
        g.inventory.decor.push({ id: nextId(g, 'dc'), defId: def.id, x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1 + Math.floor(rng.next() * 0x7ffffffe) });
        const res = placeDecor(g, tank.id, def.id, pos, true);
        if (res.ok) return;
        g.inventory.decor.pop();
      }
      this.issue('warning', `${at}.decor[${k}]`, `There was no room for ${def.name}.`);
    });
  }

  private group(tank: Tank, a: AnimalRecipe, at: string, gallons: number): void {
    const g = this.g;
    const sp = findSpecies(a.species)!;
    const rng = simRng(g);
    const count = num(a.count) ? clamp(Math.floor(a.count), 1, MAX_ANIMALS_PER_ENTRY) : 1;
    if (num(a.count) && a.count > MAX_ANIMALS_PER_ENTRY) this.issue('warning', `${at}.count`, `At most ${MAX_ANIMALS_PER_ENTRY} animals an entry; made ${MAX_ANIMALS_PER_ENTRY}.`);
    if (!sp.waterClasses.includes(tank.waterClass)) this.issue('warning', `${at}.species`, `${sp.commonName} don't belong in ${tank.waterClass} water (they live in ${sp.waterClasses.join(', ')}).`);
    if (gallons < sp.recommendedMinTankGallons) this.issue('warning', `${at}.species`, `${sp.commonName} need at least ${sp.recommendedMinTankGallons} gallons; "${tank.name}" holds ${gallons}.`);
    const sexPlan = a.sex ?? 'auto';
    if (!SEX_PLANS.includes(sexPlan)) this.issue('error', `${at}.sex`, `Unknown sex "${String(sexPlan)}" (${SEX_PLANS.join(', ')}); used auto.`);
    const lc = sp.lifecycle;
    const adultAge = Math.max(lc.juvenileDays, sp.breeding?.maturityDays ?? 0) + 4;
    let ageFor = (k: number) => adultAge + (k % 5);
    if (num(a.ageDays)) ageFor = () => clamp(a.ageDays!, 0.1, lc.lifespanDays * 1.2);
    else if (a.stage === 'juvenile') ageFor = (k) => Math.max(1, lc.juvenileDays * 0.5) + (k % 3) * 0.5;
    else if (a.stage === 'elder') ageFor = (k) => lc.lifespanDays * 0.85 + (k % 3);
    else if (a.stage !== undefined && a.stage !== 'adult') this.issue('error', `${at}.stage`, 'stage must be juvenile, adult or elder.');

    // genes: a morph's alleles, then any pinned ones on top
    let pinned: Genome['alleles'] | null = null;
    if (a.morph !== undefined) {
      pinned = str(a.morph) ? genesForMorph(sp, a.morph) : null;
      if (!pinned) {
        const want = String(a.morph).toLowerCase();
        const near = morphNames(sp).filter((n) => want.split(/\s+/).some((w) => w.length > 2 && n.toLowerCase().includes(w))).slice(0, 4);
        this.issue('error', `${at}.morph`, `${sp.commonName} have no morph called "${String(a.morph)}"${near.length ? ` (like: ${near.join('; ')})` : ''}.`);
      }
    }
    if (a.genes !== undefined) pinned = { ...(pinned ?? {}), ...this.genes(sp, a.genes, `${at}.genes`) };
    const pots = isPlainObject(a.potentials) ? a.potentials : null;
    if (a.potentials !== undefined && !pots) this.issue('error', `${at}.potentials`, 'potentials must be numbers by name (size, color, pattern …).');
    const nPrism = a.prismatic === true ? count : num(a.prismatic) ? clamp(Math.floor(a.prismatic), 0, count) : 0;
    const names = Array.isArray(a.names) ? a.names : str(a.name) ? [a.name] : [];
    const made: Creature[] = [];
    for (let k = 0; k < count; k++) {
      let genome: Genome | undefined;
      if (pinned || pots) {
        const rolled = rollGenome(sp, rng, 0.1);
        const potentials = { ...rolled.potentials };
        if (pots) for (const [key, v] of Object.entries(pots)) if (Object.hasOwn(NEUTRAL_POTENTIALS, key) && num(v)) potentials[key as keyof typeof potentials] = clamp(Math.round(v), 0, 100);
        genome = { alleles: { ...rolled.alleles, ...(pinned ?? {}) }, potentials };
      }
      const c = createCreature(g, rng, sp.id, {
        sex: sexFor(SEX_PLANS.includes(sexPlan) ? sexPlan : 'auto', k, sp.id),
        ageDays: ageFor(k),
        captiveBred: !a.wild,
        potentialsBias: 0.1,
        ...(genome ? { genome } : {}),
        ...(str(names[k]) ? { name: names[k] } : {}),
        tankId: tank.id,
      });
      addCreature(g, c, tank.id);
      // a sex-changing species decides for itself, unless the recipe names a sex (a bonded clownfish pair, a capture)
      const asked = SEX_PLANS.includes(sexPlan) && (sp.sexSystem === 'protandrous' || sp.sexSystem === 'protogynous') ? namedSex(sexPlan, k) : null;
      if (asked) {
        c.sex = asked;
        c.reproRole = asked;
      }
      // scenario animals are settled residents, not new arrivals (shows want 24 h in the tank)
      c.acquiredHour = Math.max(c.bornHour, g.clock.hour - 72);
      registerDiscovery(g, c);
      this.condition(c, a, at, sp);
      if (k < nPrism) {
        forcePrismatic('shop', 1);
        assignPrismatic(g, c, 'shop');
        forcePrismatic('shop', 0);
      }
      recordFinds(g, c);
      if (a.patch !== undefined) for (const p of deepMerge(c as unknown as Record<string, unknown>, a.patch, `${at}.patch`)) this.issue('error', `${at}.patch`, p);
      if (this.animals[c.name]) this.issue('note', `${at}.names`, `Two animals are called "${c.name}"; references go to the first.`);
      else this.animals[c.name] = c.id;
      made.push(c);
    }
    if (a.breed !== undefined) {
      if (a.breed !== 'ready' && a.breed !== 'spawned') this.issue('error', `${at}.breed`, 'breed must be "ready" or "spawned".');
      else if (!moduleFor(sp).breedable) this.issue('error', `${at}.breed`, `${sp.commonName} don't breed in the game yet.`);
      else this.breedQueue.push({ at: `${at}.breed`, ids: made.map((c) => c.id), mode: a.breed });
    }
  }

  /** Pinned genes, checked against the species' loci and alleles (a wrong one is named and left out). */
  private genes(sp: NonNullable<ReturnType<typeof findSpecies>>, genes: unknown, at: string): Genome['alleles'] {
    const out: Genome['alleles'] = {};
    if (!isPlainObject(genes)) {
      this.issue('error', at, 'genes must be locus → [allele, allele].');
      return out;
    }
    for (const [locusId, pair] of Object.entries(genes)) {
      const locus = sp.genetics.loci.find((l) => l.id === locusId);
      if (!locus) {
        this.issue('error', `${at}.${locusId}`, `${sp.commonName} have no gene "${locusId}" (${sp.genetics.loci.map((l) => l.id).join(', ')}).`);
        continue;
      }
      const ok = Array.isArray(pair) && pair.length === 2 && pair.every((x) => locus.alleles.some((al) => al.id === x));
      if (!ok) {
        this.issue('error', `${at}.${locusId}`, `"${locusId}" takes two of: ${locus.alleles.map((al) => al.id).join(', ')}.`);
        continue;
      }
      out[locusId] = [pair[0], pair[1]];
    }
    return out;
  }

  private condition(c: Creature, a: AnimalRecipe, at: string, sp: NonNullable<ReturnType<typeof findSpecies>>): void {
    if (a.stats !== undefined) {
      if (!isPlainObject(a.stats)) this.issue('error', `${at}.stats`, 'stats must be numbers by name (health, hunger …).');
      else
        for (const [k, v] of Object.entries(a.stats)) {
          if (!(STAT_KEYS as readonly string[]).includes(k) || !num(v)) this.issue('error', `${at}.stats.${k}`, `stats are ${STAT_KEYS.join(', ')}, each 0 to 100.`);
          else c.stats[k as (typeof STAT_KEYS)[number]] = clamp(v, 0, 100);
        }
    }
    if (a.illness !== undefined) {
      const kind = isPlainObject(a.illness) ? a.illness.kind : undefined;
      if (!str(kind) || !Object.hasOwn(ILLNESSES, kind) || !illnessDef(kind)) this.issue('error', `${at}.illness`, 'illness.kind is one of ich, fin_rot, fungus, swim_bladder, stress_coloration, impaction.');
      else {
        if (!(eligibleIllnesses(sp) as string[]).includes(kind)) this.issue('warning', `${at}.illness`, `${sp.commonName} don't normally get ${kind} in the game.`);
        c.illness = { kind, severity: num(a.illness.severity) ? clamp(a.illness.severity, 1, 100) : 40, sinceHour: this.hour };
      }
    }
    if (a.injury !== undefined) {
      if (num(a.injury)) c.life = { ...(c.life ?? {}), injury: clamp(a.injury, 0, 100) };
      else this.issue('error', `${at}.injury`, 'injury must be a number from 0 to 100.');
    }
    if (a.favorite) c.favorite = true;
  }

  private equipment(tank: Tank, t: TankRecipe, at: string): void {
    const g = this.g;
    const list = t.equipment ?? [];
    if (!Array.isArray(list)) {
      this.issue('error', `${at}.equipment`, 'equipment must be a list.');
      return;
    }
    const gallons = getTankTier(tank.tierId).gallons;
    const defFor = (id: string) => {
      const def = getEquipmentDef(id);
      if (def) return def;
      const fits = EQUIPMENT.filter((d) => d.kind === id && d.environments.includes(tank.environment));
      return fits.find((d) => gallons >= d.gallonsRange.min && gallons <= d.gallonsRange.max) ?? fits[0];
    };
    const claimed = new Set<EquipmentInstance>();
    list.forEach((raw, k) => {
      const spec: EquipmentRecipe | null = typeof raw === 'string' ? { id: raw } : isPlainObject(raw) && str(raw.id) ? raw : null;
      const where = `${at}.equipment[${k}]`;
      if (!spec) {
        this.issue('error', where, 'Each piece of equipment is an id or { "id": … }.');
        return;
      }
      const def = defFor(spec.id);
      if (spec.exact) {
        // as captured: the unit itself, even where the game's own kit has more than a hand install allows
        if (!def || def.id !== spec.id) {
          this.issue('error', where, `Unknown equipment "${spec.id}" (an exact piece needs its catalogue id).`);
          return;
        }
        const unit: EquipmentInstance = { id: nextId(g, 'eq'), defId: def.id, installedHour: g.clock.hour, condition: num(spec.condition) ? clamp(spec.condition, 0, 1) : 1, on: spec.on !== false };
        if (num(spec.setting)) unit.setting = spec.setting;
        if (spec.failed === 'off' || (spec.failed === 'stuck_on' && def.kind === 'heater')) Object.assign(unit, { failed: true, failMode: spec.failed });
        else if (spec.failed !== undefined) this.issue('error', `${where}.failed`, spec.failed === 'stuck_on' ? 'Only a heater sticks on; use "off" for anything else.' : 'failed must be "off" or "stuck_on".');
        tank.equipment.push(unit);
        claimed.add(unit);
        return;
      }
      const own = (e: EquipmentInstance) => !claimed.has(e) && (e.defId === spec.id || getEquipmentDef(e.defId)?.kind === spec.id);
      const changes = spec.failed !== undefined || spec.condition !== undefined || spec.on !== undefined || spec.setting !== undefined || spec.remove;
      let inst = changes ? tank.equipment.find(own) : undefined;
      if (spec.remove) {
        if (!inst) this.issue('warning', where, `"${tank.name}" has no ${spec.id} to take out.`);
        else tank.equipment = tank.equipment.filter((e) => e !== inst);
        return;
      }
      if (!inst) {
        if (!def) {
          this.issue('error', where, `Unknown equipment "${spec.id}".`);
          return;
        }
        const res = installEquipment(g, tank.id, def.id, { purchased: true });
        if (!res.ok) {
          this.issue('error', where, `${def.name}: ${res.message}`);
          return;
        }
        inst = tank.equipment[tank.equipment.length - 1];
      }
      claimed.add(inst);
      if (spec.condition !== undefined) {
        if (num(spec.condition)) inst.condition = clamp(spec.condition, 0, 1);
        else this.issue('error', `${where}.condition`, 'condition must be 0 (worn out) to 1 (new).');
      }
      if (spec.on !== undefined) inst.on = !!spec.on;
      if (spec.setting !== undefined) {
        if (num(spec.setting)) inst.setting = spec.setting;
        else this.issue('error', `${where}.setting`, 'setting must be a number.');
      }
      if (spec.failed !== undefined) {
        const kind = getEquipmentDef(inst.defId)?.kind;
        if (spec.failed !== 'off' && spec.failed !== 'stuck_on') this.issue('error', `${where}.failed`, 'failed must be "off" or "stuck_on".');
        else if (spec.failed === 'stuck_on' && kind !== 'heater') this.issue('error', `${where}.failed`, 'Only a heater sticks on; use "off" for anything else.');
        else {
          inst.failed = true;
          inst.failMode = spec.failed;
          inst.on = true;
          if (spec.condition === undefined) inst.condition = Math.min(inst.condition, 0.15);
        }
      }
    });
  }

  private water(tank: Tank, t: TankRecipe, at: string): void {
    if (t.values === undefined) return;
    if (!isPlainObject(t.values)) {
      this.issue('error', `${at}.values`, 'values must be numbers by name (ammonia, pH, tempC …).');
      return;
    }
    const w = tank.water;
    for (const [k, v] of Object.entries(t.values)) {
      const range = Object.hasOwn(WATER_RANGES, k) ? WATER_RANGES[k] : undefined;
      if (!range) {
        this.issue('error', `${at}.values.${k}`, `Water values are ${Object.keys(WATER_RANGES).join(', ')}.`);
        continue;
      }
      if (!num(v)) {
        this.issue('error', `${at}.values.${k}`, `${k} must be a number.`);
        continue;
      }
      const kept = clamp(v, range[0], range[1]);
      if (kept !== v) this.issue('warning', `${at}.values.${k}`, `${k} is kept between ${range[0]} and ${range[1]}; set to ${kept}.`);
      (w as unknown as Record<string, number>)[k] = kept;
    }
    // the water simply is like this: not a sudden swing the animals feel on the first step
    const lab: NonNullable<WaterState['lab']> = (w.lab ??= {});
    lab.prevTemp = w.tempC;
    lab.prevPH = w.pH;
    lab.prevSG = w.salinitySG;
    if (t.values.tempC !== undefined) lab.bioTempC = w.tempC;
  }

  private lights(tank: Tank, t: TankRecipe, at: string): void {
    const l = t.lights;
    if (l === undefined) return;
    if (!isPlainObject(l)) {
      this.issue('error', `${at}.lights`, 'lights must be { preset, intensity, on, off, moonlight }.');
      return;
    }
    const lt = tank.lighting;
    if (l.preset !== undefined) {
      if (LIGHT_PRESETS.includes(l.preset)) lt.preset = l.preset;
      else this.issue('error', `${at}.lights.preset`, `Light presets are ${LIGHT_PRESETS.join(', ')}.`);
    }
    if (num(l.intensity)) lt.intensity = clamp(l.intensity, 0, 1.5);
    if (num(l.on)) lt.onHour = clamp(l.on, 0, 23.75);
    if (num(l.off)) lt.offHour = clamp(l.off, 0.25, 24);
    if (l.moonlight !== undefined) lt.moonlight = !!l.moonlight;
  }

  private young(tank: Tank, y: YoungRecipe, at: string): void {
    const g = this.g;
    const sp = isPlainObject(y) && str(y.species) ? findSpecies(y.species) : undefined;
    if (!sp) {
      this.issue('error', `${at}.species`, `Unknown species "${String(isPlainObject(y) ? y.species : y)}".`);
      return;
    }
    const mod = moduleFor(sp);
    if (!mod.breedable) {
      this.issue('error', `${at}.species`, `${sp.commonName} don't breed in the game yet.`);
      return;
    }
    const count = num(y.count) ? clamp(Math.floor(y.count), 1, 2000) : 0;
    if (!count) {
      this.issue('error', `${at}.count`, 'count must be 1 or more.');
      return;
    }
    const parent = (name: string | undefined, sex: 'male' | 'female'): Creature | null => {
      if (name !== undefined) {
        const id = this.animals[name];
        if (!id) this.issue('error', at, `There's no animal called "${name}" (yet: parents are made before their young).`);
        return id ? g.creatures[id] : null;
      }
      return Object.values(g.creatures).find((c) => c.tankId === tank.id && c.speciesId === sp.id && c.status === 'alive' && c.sex === sex && c.lifeStage !== 'juvenile') ?? null;
    };
    const mother = parent(y.mother, 'female');
    const father = parent(y.father, 'male');
    const hour = g.clock.hour;
    let stage: Clutch['stage'];
    let visual: Clutch['visual'];
    let next: number;
    let anchor = pickSite(tank, 'midwater', `${tank.id}:young:${at}`).anchor;
    if (y.stage === 'eggs') {
      const eggs = EGGS[sp.breeding.system];
      if (!eggs) {
        this.issue('error', `${at}.stage`, `${sp.commonName} carry their young, so there are no loose eggs: ask for fry, or "breed": "spawned" on a pair.`);
        return;
      }
      stage = 'eggs';
      visual = eggs.visual;
      next = hour + (num(y.nextStageInHours) ? Math.max(0.25, y.nextStageInHours) : sp.breeding.incubationHours);
      anchor = pickSite(tank, eggs.site, `${tank.id}:eggs:${at}`).anchor;
    } else if (y.stage === 'larvae' || y.stage === 'fry') {
      let phase = mod.plan.phases.find((p) => p.stage === y.stage);
      if (!phase) {
        phase = mod.plan.phases[0];
        if (!phase) {
          this.issue('error', `${at}.stage`, `${sp.commonName} have no young stage to start from.`);
          return;
        }
        this.issue('note', `${at}.stage`, `${sp.commonName} young go straight to ${phase.stage}; made ${phase.stage}.`);
      }
      stage = phase.stage as Clutch['stage'];
      visual = phase.visual === 'keep' ? 'fry_cloud' : (phase.visual as Clutch['visual']);
      next = hour + (num(y.nextStageInHours) ? Math.max(0.25, y.nextStageInHours) : Math.max(1, phase.frac * sp.breeding.fryRearingHours));
    } else {
      this.issue('error', `${at}.stage`, 'stage must be eggs, larvae or fry.');
      return;
    }
    createClutch(g, { sp, tank, mother, father, hour, stage, count, visual, nextStageHour: next, anchor });
  }

  // ───────────── after the tanks ─────────────

  breeding(): void {
    const g = this.g;
    for (const q of this.breedQueue) {
      const alive = q.ids.map((id) => g.creatures[id]).filter((c): c is Creature => !!c && c.status === 'alive');
      if (!alive.length) continue;
      const res = devForceBreeding(g, alive[0].id);
      if (!res.ok) this.issue('warning', q.at, res.message);
      else if (alive.length < 2) this.issue('note', q.at, `${res.message} (with a partner the game added)`);
    }
  }

  /** `spawned`: run the world forward until each pair has eggs or young (at most MAX_SPAWN_HOURS). */
  spawnRuns(): void {
    const g = this.g;
    const wanted = this.breedQueue.filter((q) => q.mode === 'spawned');
    if (!wanted.length) return;
    const has = (q: (typeof wanted)[number]) =>
      Object.values(g.clutches).some((cl) => q.ids.includes(cl.motherId ?? '') || q.ids.includes(cl.fatherId ?? '') || q.ids.includes(cl.guardedById ?? '')) ||
      q.ids.some((id) => g.creatures[id]?.repro.stage === 'pregnant');
    let h = 0;
    while (h < MAX_SPAWN_HOURS && !wanted.every(has)) {
      advanceWorld(g, 1, { forceFull: true });
      h++;
    }
    this.hoursRun += h;
    for (const q of wanted) if (!has(q)) this.issue('warning', q.at, `No eggs or young within ${MAX_SPAWN_HOURS} game hours: the pair may need better conditions (the creature card says why).`);
    if (h) this.issue('note', 'breed', `Ran ${h} game hours for the eggs to be laid.`);
  }

  staff(): void {
    const g = this.g;
    const list = this.r.staff ?? [];
    if (!Array.isArray(list)) {
      this.issue('error', 'staff', 'staff must be a list.');
      return;
    }
    list.forEach((s, i) => {
      const at = `staff[${i}]`;
      if (!isPlainObject(s) || !Object.hasOwn(STAFF_ROLES, String(s.role))) {
        this.issue('error', `${at}.role`, 'role must be aquarist, stock_manager or docent.');
        return;
      }
      const role = s.role;
      const roster = g.staff?.roster ?? [];
      if (role === 'stock_manager' && roster.some((m) => m.role === 'stock_manager')) {
        this.issue('error', `${at}.role`, 'A shop has one stock manager.');
        return;
      }
      if (!g.progress.unlocked.includes('staff')) this.issue('warning', at, 'Staff aren’t unlocked in this shop (they need a specialty shop or bigger).');
      const cap = STAFF_CAPACITY[g.facility.level] ?? 0;
      if (roster.length >= cap) this.issue('warning', at, `A ${g.facility.level} has room for ${cap} staff; this makes ${roster.length + 1}.`);
      let trait = s.trait ?? 'quick_learner';
      if (!Object.hasOwn(STAFF_TRAITS, trait) || !STAFF_TRAITS[trait].roles.includes(role)) {
        this.issue('error', `${at}.trait`, `A ${role} can have: ${Object.values(STAFF_TRAITS).filter((tr) => tr.roles.includes(role)).map((tr) => tr.id).join(', ')}; used quick_learner.`);
        trait = 'quick_learner';
      }
      const skill = num(s.skill) ? clamp(Math.round(s.skill), 1, STAFF_MAX_SKILL) : 3;
      addStaffDirect(g, { name: str(s.name) ? s.name.slice(0, 32) : STAFF_NAMES[roster.length % STAFF_NAMES.length], role, skill, trait });
    });
    if (this.r.stockBudget !== undefined) {
      if (!num(this.r.stockBudget)) this.issue('error', 'stockBudget', 'stockBudget must be dollars a day.');
      else ensureStaff(g).stockBudget = clamp(Math.round(this.r.stockBudget), 0, STOCK_BUDGET[g.facility.level].max);
    }
  }

  market(): void {
    const g = this.g;
    const m = this.r.market;
    // the shop's own stock for this facility, unlocks and day (the base's market was made at its own start)
    if (this.blank || this.r.base?.startsWith('starter:') || this.r.shop?.unlocks || this.r.shop?.facility || this.r.shop?.day !== undefined) {
      g.market.stock = g.market.stock.filter((o) => o.expiresHour > g.clock.hour);
      initMarket(g);
    }
    if (!m) return;
    if (!isPlainObject(m)) {
      this.issue('error', 'market', 'market must be an object.');
      return;
    }
    if (m.clearStock) g.market.stock = [];
    // at the front of the shop, in the recipe's order
    const offers = (Array.isArray(m.offers) ? m.offers : []).map((o, i) => this.offer(o, `market.offers[${i}]`)).filter((o): o is ShopOffer => !!o);
    g.market.stock.unshift(...offers);
    (Array.isArray(m.listings) ? m.listings : []).forEach((l, i) => this.listing(l, `market.listings[${i}]`));
    if (m.demand !== undefined) {
      for (const [id, v] of Object.entries(isPlainObject(m.demand) ? m.demand : {})) {
        if (!findSpecies(id)) this.issue('error', `market.demand.${id}`, `Unknown species "${id}".`);
        else if (!num(v)) this.issue('error', `market.demand.${id}`, 'Demand is a number from 0.6 to 1.6.');
        else g.market.demand[id] = clamp(v, 0.6, 1.6);
      }
    }
  }

  private offer(o: NonNullable<NonNullable<ScenarioRecipe['market']>['offers']>[number], at: string): ShopOffer | null {
    const g = this.g;
    const sp = isPlainObject(o) && str(o.species) ? findSpecies(o.species) : undefined;
    if (!sp) {
      this.issue('error', `${at}.species`, `Unknown species "${String(isPlainObject(o) ? o.species : o)}".`);
      return null;
    }
    const rng = simRng(g);
    const count = num(o.count) ? clamp(Math.floor(o.count), 1, 50) : 1;
    const creatures: Creature[] = [];
    const pinned = o.genes !== undefined ? this.genes(sp, o.genes, `${at}.genes`) : null;
    const ageDays = num(o.ageDays) ? clamp(o.ageDays, 0.1, sp.lifecycle.lifespanDays * 1.2) : undefined;
    for (let k = 0; k < count; k++) {
      const genome = pinned ? { alleles: { ...pinned }, potentials: { ...NEUTRAL_POTENTIALS } } : undefined;
      creatures.push(createCreature(g, rng, sp.id, { ...(o.sex === 'male' || o.sex === 'female' ? { sex: o.sex } : {}), ...(ageDays !== undefined ? { ageDays } : {}), captiveBred: true, ...(genome ? { genome } : {}) }));
    }
    if (o.prismatic) {
      forcePrismatic('shop', 1);
      assignPrismatic(g, creatures[0], 'shop');
      forcePrismatic('shop', 0);
    }
    const valued = Math.max(1, nicePrice(creatures.reduce((sum, c) => sum + creatureValue(g, c).total, 0) * (o.prismatic ? 1.4 : 1.15)));
    const price = num(o.price) ? Math.max(0, Math.round(o.price)) : valued;
    return {
      id: nextId(g, 'offer'),
      kind: count > 1 ? 'group' : 'creature',
      speciesId: sp.id,
      creatures,
      price,
      seller: 'Scenario Supply',
      expiresHour: g.clock.hour + 24 * 7,
      ...(o.prismatic ? { tier: 'rare' as const, note: 'Prismatic!' } : {}),
      ...(count > 1 ? { unitPrice: Math.max(1, nicePrice((price / count) * 1.12)) } : {}),
    };
  }

  private listing(l: NonNullable<NonNullable<ScenarioRecipe['market']>['listings']>[number], at: string): void {
    const g = this.g;
    if (!isPlainObject(l) || !Array.isArray(l.animals) || !l.animals.length) {
      this.issue('error', `${at}.animals`, 'A listing names the animals for sale.');
      return;
    }
    const ids: string[] = [];
    for (const n of l.animals) {
      const id = this.animals[String(n)];
      if (!id) this.issue('error', `${at}.animals`, `There's no animal called "${String(n)}".`);
      else ids.push(id);
    }
    if (!ids.length) return;
    const cs = ids.map((id) => g.creatures[id]);
    const oneSpecies = cs.every((c) => c.speciesId === cs[0].speciesId);
    const kind = cs.length === 1 ? 'creature' : oneSpecies && cs.every((c) => c.lifeStage === 'juvenile') ? 'juveniles' : oneSpecies && cs.length === 2 && cs[0].sex !== cs[1].sex ? 'pair' : 'group';
    devOpenMarket(g);
    const priced = suggestPricing(g, { kind, creatureIds: ids });
    const reserve = num(l.reserve) ? Math.max(0, Math.round(l.reserve)) : priced.reserve;
    const res = createListing(g, { kind, creatureIds: ids, reserve, durationHours: num(l.hours) ? l.hours : 48 });
    if (!res.ok || !res.listingId) {
      this.issue('error', at, res.message);
      return;
    }
    const listing = g.market.listings.find((x) => x.id === res.listingId)!;
    const amounts = Array.isArray(l.bids) ? l.bids.filter(num) : [];
    const want = num(l.bids) ? clamp(Math.floor(l.bids), 0, 12) : amounts.length;
    const openBids = () => listing.bids.filter((b) => b.status === 'open');
    for (let tries = 0; openBids().length < want && tries < want * 8; tries++) {
      const before = listing.bids.length;
      const waiting = openBids().length;
      forceBuyerVisit(g, listing.id);
      const bid = listing.bids.length > before ? listing.bids[listing.bids.length - 1] : null;
      const amount = amounts[waiting];
      if (!bid || amount === undefined) continue;
      // the recipe's amount on the game's own buyer (one the reserve turned away still bids, as asked)
      bid.amount = Math.max(1, Math.round(amount));
      bid.ceiling = Math.max(bid.ceiling ?? 0, bid.amount);
      bid.status = 'open';
      delete bid.note;
      if (bid.amount < listing.reserve) this.issue('warning', `${at}.bids`, `A bid of $${bid.amount} is below the reserve of $${listing.reserve}.`);
    }
    if (openBids().length < want) this.issue('warning', `${at}.bids`, `Only ${openBids().length} of ${want} buyers bid (the rest passed).`);
    if (num(l.buyNow)) listing.buyNow = Math.max(listing.reserve, Math.round(l.buyNow));
  }

  shows(): void {
    const g = this.g;
    const sh = this.r.shows;
    if (!sh) return;
    if (!isPlainObject(sh)) {
      this.issue('error', 'shows', 'shows must be { entries, showDay }.');
      return;
    }
    const s = ensureShowsState(g);
    const made: { judgingHour: number }[] = [];
    (Array.isArray(sh.entries) ? sh.entries : []).forEach((e, i) => {
      const at = `shows.entries[${i}]`;
      const id = isPlainObject(e) ? this.animals[String(e.animal)] : undefined;
      if (!id) {
        this.issue('error', `${at}.animal`, `There's no animal called "${String(isPlainObject(e) ? e.animal : e)}".`);
        return;
      }
      const asked: unknown = isPlainObject(e) && e.tier !== undefined ? e.tier : 'club';
      if (typeof asked !== 'string' || !Object.hasOwn(SHOW_TIERS, asked)) {
        this.issue('error', `${at}.tier`, 'tier is club, regional, national or international.');
        return;
      }
      const tier = asked as ShowTier;
      const c = g.creatures[id];
      const tdef = SHOW_TIERS[tier];
      for (const k of ['shows', tdef.unlockKey]) if (!g.progress.unlocked.includes(k)) this.issue('warning', at, `The ${tier} shows aren't unlocked (${k}); unlocked for the scenario.`), unlock(g, k, { silent: true });
      const classes = SHOW_CLASSES.filter((d) => d.kind === 'livestock' && creatureFitsClass(d, c)).map((d) => d.id);
      if (!classes.length) {
        this.issue('error', at, `No show class takes ${c.name}.`);
        return;
      }
      s.seq += 1;
      const judgingHour = Math.ceil(g.clock.hour) + tdef.closeBeforeH + 2;
      const show: Show = {
        id: `show-${s.seq.toString(36)}`,
        serial: s.seq,
        name: `Scenario ${tier[0].toUpperCase()}${tier.slice(1)} Show`,
        host: 'Scenario Lab',
        tier,
        classes: classes.slice(0, 4).map((classId, k) => ({ classId, purse: Math.round((tdef.purse[0] + tdef.purse[1]) / 2 / tdef.step + k) * tdef.step, field: tdef.field[0] + 1 })),
        fee: tier === 'club' ? 12 : 60,
        announcedHour: g.clock.hour,
        deadlineHour: judgingHour - tdef.closeBeforeH,
        judgingHour,
        judge: 'E. Harlow',
        status: 'open',
        seed: 90210 + s.seq * 31,
      };
      s.shows.push(show);
      let best: { id: string; e: number } | null = null;
      for (const cl of show.classes) {
        const x = classCandidates(g, show, cl.classId).find((k) => k.id === c.id && k.eligible);
        if (x && (!best || x.expected > best.e)) best = { id: cl.classId, e: x.expected };
      }
      if (!best) {
        this.issue('error', at, `${c.name} can't be entered: ${creatureShowReasons(g, c).join('; ') || 'not eligible'}.`);
        return;
      }
      const res = enterShow(g, show.id, best.id, c.id);
      if (!res.ok) this.issue('error', at, res.message);
      else made.push(show);
    });
    if (sh.showDay) {
      const next = made.length ? Math.min(...made.map((x) => x.judgingHour)) : s.shows.filter((x) => x.status === 'open' && x.judgingHour > g.clock.hour).reduce((a, x) => Math.min(a, x.judgingHour), Infinity);
      if (Number.isFinite(next)) g.clock.hour = Math.max(g.clock.hour, next - 1);
      else this.issue('warning', 'shows.showDay', 'There is no show to wait for.');
    }
  }

  lines(): void {
    const list = this.r.lines;
    if (list === undefined) return;
    if (!Array.isArray(list)) {
      this.issue('error', 'lines', 'lines must be a list.');
      return;
    }
    list.forEach((ln, i) => {
      const at = `lines[${i}]`;
      if (!isPlainObject(ln)) {
        this.issue('error', at, 'Each production line is an object.');
        return;
      }
      const animal = (n: unknown) => this.animals[String(n)];
      const tank = (n: unknown) => this.tanks[String(n)];
      const ids = { motherId: animal(ln.mother), fatherId: animal(ln.father) };
      const tanks = { breed: tank(ln.breed), raise: tank(ln.raise), quarantine: tank(ln.quarantine), keep: tank(ln.keep) };
      const missing = [...Object.entries(ids).filter(([, v]) => !v).map(([k]) => k.replace('Id', '')), ...Object.entries(tanks).filter(([, v]) => !v).map(([k]) => k)];
      if (missing.length) {
        this.issue('error', at, `A line needs a mother and a father (by name) and four tanks: breed, raise, quarantine, keep (missing: ${missing.join(', ')}).`);
        return;
      }
      const res = createLine(this.g, { ...ids, tanks, ...(str(ln.name) ? { name: ln.name } : {}) } as Parameters<typeof createLine>[1]);
      if (!res.ok) this.issue('error', at, res.message);
    });
  }

  /**
   * The patch, tried on a copy first: a world the save path can't load is refused (built without the patch, and the
   * error says why); what the save path repairs is reported. Whether the game can play it is tested once, on the
   * finished world (build()).
   */
  patch(): void {
    if (this.r.patch === undefined) return;
    const trial = structuredClone(this.g);
    const problems = deepMerge(trial as unknown as Record<string, unknown>, this.r.patch, 'patch');
    for (const p of problems) this.issue('error', 'patch', p);
    let loaded: ReturnType<typeof decodeRecord>;
    try {
      loaded = decodeRecord(encodeRecord(trial, 'scenario').text, 'This scenario');
    } catch (e) {
      this.issue('error', 'patch', `The patch makes a world the game can't load (${(e as Error).message}); built without it.`);
      return;
    }
    // the world as the save path loads it: what that had to repair is said here
    for (const r of loaded.repairs) this.issue('warning', 'patch', `The save check repaired what the patch did: ${r}`);
    this.g = loaded.state;
  }

  warmup(): void {
    const g = this.g;
    const want = this.r.warmupHours;
    if (want === undefined) return;
    if (!num(want) || want < 0) {
      this.issue('error', 'warmupHours', 'warmupHours must be game hours, 0 or more.');
      return;
    }
    let left = Math.min(want, MAX_WARMUP_HOURS);
    if (want > MAX_WARMUP_HOURS) this.issue('warning', 'warmupHours', `At most ${MAX_WARMUP_HOURS} hours of warm-up; ran ${MAX_WARMUP_HOURS}.`);
    const focusTankId = this.focus().focusTankId ?? undefined;
    while (left > 1e-9) {
      const step = Math.min(6, left);
      advanceWorld(g, step, { focusTankId });
      left -= step;
      this.hoursRun += step;
    }
    flushSimDebt(g);
  }

  private opened: { focusTankId: string | null; view: 'tank' | 'facility' } | null = null;

  focus(): { focusTankId: string | null; view: 'tank' | 'facility' } {
    if (this.opened) return this.opened;
    const o = isPlainObject(this.r.open) ? this.r.open : {};
    const byName = o.tank !== undefined ? this.tanks[String(o.tank)] : undefined;
    if (o.tank !== undefined && !byName) this.issue('error', 'open.tank', `There's no tank called "${String(o.tank)}".`);
    this.opened = { focusTankId: byName ?? this.g.tankOrder[0] ?? null, view: o.view === 'facility' ? 'facility' : 'tank' };
    return this.opened;
  }

  finish(): void {
    const g = this.g;
    for (const id of g.tankOrder) if (g.tanks[id]) refreshTankCache(g, g.tanks[id]);
    touchResidents();
    settleStartingProgress(g);
    const speed = isPlainObject(this.r.open) ? this.r.open.speed : undefined;
    if (speed !== undefined && ![0, 1, 3, 10].includes(speed as number)) this.issue('error', 'open.speed', 'speed is 0 (paused), 1, 3 or 10.');
    g.clock.speed = speed !== undefined && [0, 1, 3, 10].includes(speed as number) ? (speed as GameState['clock']['speed']) : 0;
    const now = this.env.now ?? Date.now();
    g.createdRealMs = now;
    g.lastSavedRealMs = now;
    g.lastTickRealMs = now;
    g.saveId = `scenario_${slugOf(this.r.name)}_${this.seed().toString(36)}_${now.toString(36)}`;
  }
}

/** The recipe's shape before building: an error for what makes it unusable, else null. */
export function recipeProblem(input: unknown): string | null {
  if (!isPlainObject(input)) return 'A recipe is a JSON object.';
  if (input.format !== undefined && input.format !== RECIPE_FORMAT) return `"format" must be "${RECIPE_FORMAT}".`;
  if (input.version !== RECIPE_VERSION) return typeof input.version === 'number' && input.version > RECIPE_VERSION ? `This recipe is version ${input.version}, newer than this build reads (${RECIPE_VERSION}).` : `"version" must be ${RECIPE_VERSION}.`;
  if (!str(input.name)) return 'A recipe needs a "name".';
  return null;
}

/** Build a recipe into a game. Never throws for a bad recipe: what it couldn't do is in `issues`. */
export function buildScenario(input: unknown, env: BuildEnv = {}): BuildResult {
  // a Prismatic forced from the dev panel is for the game on screen: set it aside, so it neither lands in this world
  // (the base's market rolls its stock) nor is used up by it, and put it back after
  const pending = { shop: forcedPrismaticPending('shop'), bred: forcedPrismaticPending('bred') };
  forcePrismatic('shop', 0);
  forcePrismatic('bred', 0);
  try {
    return build(input, env);
  } finally {
    forcePrismatic('shop', pending.shop);
    forcePrismatic('bred', pending.bred);
  }
}

function build(input: unknown, env: BuildEnv): BuildResult {
  const problem = recipeProblem(input);
  const recipe: ScenarioRecipe = problem ? { version: RECIPE_VERSION, name: 'Scenario' } : (input as ScenarioRecipe);
  const b = new Builder(recipe, env);
  if (problem) b.issue('error', 'recipe', `${problem} Built a blank shop.`);
  const step = (name: string, fn: () => void) => {
    try {
      fn();
    } catch (e) {
      b.issue('error', name, `The game refused part of the ${name}: ${(e as Error).message}`);
    }
  };
  step('shop', () => b.shop());
  step('tanks', () => b.allTanks());
  step('shop', () => b.inventorySpares());
  step('breed', () => b.breeding());
  step('staff', () => b.staff());
  step('market', () => b.market());
  step('lines', () => b.lines());
  step('shows', () => b.shows());
  step('patch', () => b.patch());
  if (!env.trial) {
    step('breed', () => b.spawnRuns());
    step('warmup', () => b.warmup());
  }
  let open: ReturnType<Builder['focus']> = { focusTankId: null, view: 'tank' };
  step('open', () => (open = b.focus()));
  // finishing, the save path and, for a patched world, a moment of play (every tank at full detail, on a copy; never
  // in a trial build, since stepping any world clears the sim's shared caches and the lab's trial builds run beside the
  // game on screen): a patched world that fails any of them is built again without the patches
  let decoded: ReturnType<typeof decodeRecord>;
  try {
    b.finish();
    // the save writes a number that isn't one as 0: say where, rather than quietly
    for (const path of findNonFinite(b.g, '$', [], 10)) b.issue('warning', 'save', `${path.replace(/^\$\./, '').replace(/ = .*$/, '')} isn't a number; the save writes 0.`);
    decoded = decodeRecord(encodeRecord(b.g, 'scenario', b.g.lastSavedRealMs).text, 'This scenario');
    if (!env.trial && usesPatch(recipe)) advanceWorld(structuredClone(decoded.state), 0.25, { forceFull: true });
  } catch (e) {
    if (!usesPatch(recipe)) throw e;
    const again = build(withoutPatches(recipe), env);
    again.issues.unshift({ level: 'error', at: 'patch', message: `A patch makes a world the game can't finish, load or play (${(e as Error).message}); built without the patches.` });
    return again;
  }
  for (const r of decoded.repairs) b.issue('warning', 'save', `The save check repaired: ${r}`);
  return { state: decoded.state, issues: b.issues, tanks: b.tanks, animals: b.animals, ...open, hoursRun: b.hoursRun, repairs: decoded.repairs };
}

const hasPatch = (o: unknown) => isPlainObject(o) && o.patch !== undefined;

/** Does the recipe patch the game, a tank or an animal anywhere? */
function usesPatch(r: ScenarioRecipe): boolean {
  return hasPatch(r) || (Array.isArray(r.tanks) && r.tanks.some((t) => hasPatch(t) || (isPlainObject(t) && Array.isArray(t.animals) && t.animals.some(hasPatch))));
}

/** The recipe with every patch taken out. */
function withoutPatches(r: ScenarioRecipe): ScenarioRecipe {
  const copy = structuredClone(r);
  delete copy.patch;
  for (const t of Array.isArray(copy.tanks) ? copy.tanks : []) {
    if (!isPlainObject(t)) continue;
    delete t.patch;
    for (const a of Array.isArray(t.animals) ? t.animals : []) if (isPlainObject(a)) delete a.patch;
  }
  return copy;
}
