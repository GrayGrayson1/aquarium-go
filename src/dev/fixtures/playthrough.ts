/**
 * Headless "bot player" for balance sweeps. OWNER: polish-gameplay.
 *
 * Plays one starter the way a careful, reasonably quick player would, through the real sim mutators only
 * (no stat edits): follows the tutorial, feeds twice a day, fixes WATCH/DANGER water, opens the market, buys a
 * mate, follows the breeding hints (cooling cue, heater nudges, nest rock, introductions, separations), moves
 * eggs/fry to a nursery, feeds the young, sells offspring and spare animals, builds a second tank, upgrades the
 * facility and opens to visitors. Everything is recorded in a timeline for tests/sim/playthrough-*.test.ts.
 *
 * Time model: 1 real second at 1× = 0.1 game hour, so 10 real minutes ≈ 60 game hours (2.5 days) and one real hour
 * ≈ 15 game days. The bot checks in once per game hour (≈10 real seconds), acting on whatever needs attention.
 */
import type { Clutch, Creature, FoodDef, GameState, Tank, WaterClass } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { feedTank, waterChange, topOff, cleanTank, repairEquipment, setEquipment } from '@/sim/care';
import { getWaterReport } from '@/sim/water';
import {
  tutorialAdvance,
  tutorialStepId,
  claimQuest,
  activeQuests,
  facilityUpgradeInfo,
  upgradeFacility,
  setOpenToPublic,
  isUnlocked,
  toggleSignage,
  startResearch,
  researchList,
} from '@/sim/facility';
import { buyOffer, buyTank, buyFood, buySalt, createListing, acceptBid, quickSell, suggestPricing, bestOpenBid, tankKitPrice, dailyOperatingCost, quickSellQuote } from '@/sim/economy';
import { placeDecor, checkPlacement } from '@/sim/aquascape';
import { breedingCheck, creaturesInTank } from '@/sim/life';
import { startBreeding, separateCreature, moveClutch } from '@/sim/life/breeding/actions';
import { moduleFor } from '@/sim/life/breeding/registry';
import { currentPhase, isCarried } from '@/sim/life/breeding/clutch';
import { previewAddition } from '@/sim/compat';
import { tutorialChain, habitatPicks } from '@/data/quests';
import { FOODS } from '@/data/catalog/foods';
import { getDecorDef } from '@/data/catalog/decor';
import { TANK_TIERS, TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { findSpecies, getSpecies, type StarterId } from '@/data/species';
import { FACILITY_LEVEL_ORDER } from '@/data/facilities';

export type Milestone =
  | 'first_money'
  | 'market_opened'
  | 'tutorial_done'
  | 'mate_bought'
  | 'second_tank'
  | 'nursery_ready'
  | 'first_spawn'
  | 'first_juveniles'
  | 'first_sale'
  | 'first_offspring_sale'
  | 'shop_unlocked'
  | 'specialty_shop'
  | 'aquarium_store'
  | 'showroom'
  | 'destination'
  | 'grand_hall'
  | 'first_visitor'
  | 'in_debt'
  | 'loan';

export interface DaySample {
  day: number;
  money: number;
  reputation: number;
  level: string;
  tanks: number;
  alive: number;
  dead: number;
  young: number;
  clutches: number;
  births: number;
  sales: number;
  unlocks: number;
  income: number;
  expenses: number;
  opCost: number;
  tutorial: string;
}

export interface PlaythroughOptions {
  starterId: StarterId;
  seed?: number;
  /** Game days to simulate. */
  days: number;
  /** Stop early when this returns true (checked every game hour). */
  until?: (state: GameState) => boolean;
  /** Keep playing past the early game: bigger tanks, research, more exhibits (long-game sweep). */
  longGame?: boolean;
}

export interface PlaythroughResult {
  state: GameState;
  samples: DaySample[];
  /** Game hour (since the save started at hour 8) each milestone was first reached. */
  milestones: Partial<Record<Milestone, number>>;
  deaths: { hour: number; name: string; speciesId: string; cause: string; young: boolean }[];
  actions: { hour: number; text: string }[];
  /** Most repeated event texts (digits normalised), for log-spam checks. */
  spam: { text: string; count: number }[];
  eventCount: number;
  /** Every event emitted during the run (the in-state log is capped at 300). */
  events: { kind: string; text: string; toast?: boolean; hour: number }[];
  toastCount: number;
  /** Bot-observed errors (actions that failed unexpectedly). */
  problems: string[];
}

const START_HOUR = 8;
const FEED_EVERY_H = 12;
const YOUNG_FEED_EVERY_H = 6;
const WATER_FIX_COOLDOWN_H = 8;
const WATER_LOOK_EVERY_H = 3;

const isAlive = (c: Creature | undefined): c is Creature => !!c && (c.status === 'alive' || c.status === 'listed');
const adultish = (c: Creature) => c.lifeStage === 'adult' || c.lifeStage === 'elder';

class Bot {
  state: GameState;
  opts: PlaythroughOptions;
  milestones: Partial<Record<Milestone, number>> = {};
  actions: { hour: number; text: string }[] = [];
  problems: string[] = [];
  lastFed: Record<string, number> = {};
  lastWaterFix: Record<string, number> = {};
  lastWaterLook: Record<string, number> = {};
  homeId: string;
  mateTankId: string | null = null;
  nurseryId: string | null = null;
  displayId: string | null = null;
  coolUntil: number | null = null;
  coolRestore: Record<string, number> = {};
  lastListingHour = -999;
  listedIds = new Set<string>();
  /** Expired (unsold) listings already handled. */
  relisted = new Set<string>();
  deaths: PlaythroughResult['deaths'] = [];
  seenDead = new Set<string>();

  constructor(opts: PlaythroughOptions) {
    this.opts = opts;
    const seed = opts.seed ?? 12345;
    const preview = previewStarters(seed)[opts.starterId];
    this.state = newGame({ starterId: opts.starterId, starterName: preview.name, seed, starterCreature: preview });
    this.homeId = this.state.tankOrder[0];
  }

  get hour() {
    return this.state.clock.hour;
  }

  note(text: string) {
    this.actions.push({ hour: this.hour, text });
  }

  mark(m: Milestone) {
    if (this.milestones[m] === undefined) this.milestones[m] = this.hour;
  }

  starter(): Creature | undefined {
    return Object.values(this.state.creatures).find((c) => c.isStarter && isAlive(c));
  }

  // ─────────────────────────── main check-in ───────────────────────────

  act() {
    const s = this.state;
    this.scanMilestones();
    this.tutorial();
    this.claimQuests();
    this.maintainEquipment();
    this.water();
    this.feed();
    this.market();
    this.breeding();
    this.clutches();
    this.sell();
    this.expand();
    if (s.finance.money < 0) this.mark('in_debt');
  }

  scanMilestones() {
    const s = this.state;
    if (s.finance.ledger.some((e) => e.amount > 0)) this.mark('first_money');
    if (s.progress.tutorial.done) this.mark('tutorial_done');
    if (s.progress.tutorial.flags.opened_market) this.mark('market_opened');
    if (Object.keys(s.clutches).length > 0 || (s.progress.counters.spawns ?? 0) > 0 || (s.progress.counters.pregnancies ?? 0) > 0) this.mark('first_spawn');
    if ((s.progress.counters.births ?? 0) > 0 || Object.values(s.creatures).some((c) => c.lineage.generation >= 1 && c.lineage.breederName === 'Your shop')) this.mark('first_juveniles');
    if ((s.market.history ?? []).length > 0) this.mark('first_sale');
    if (isUnlocked(s, 'facility_specialty_shop')) this.mark('shop_unlocked');
    const lvl = FACILITY_LEVEL_ORDER.indexOf(s.facility.level);
    for (const id of FACILITY_LEVEL_ORDER.slice(1, lvl + 1)) this.mark(id as Milestone);
    if ((s.visitors.totalVisitors ?? 0) >= 1) this.mark('first_visitor');
    if (s.finance.loan) this.mark('loan');
    for (const c of Object.values(s.creatures)) {
      if (c.status === 'dead' && !this.seenDead.has(c.id)) {
        this.seenDead.add(c.id);
        this.deaths.push({ hour: this.hour, name: c.name, speciesId: c.speciesId, cause: c.deathCause ?? 'unknown', young: !adultish(c) });
      }
    }
  }

  // ─────────────────────────── tutorial & quests ───────────────────────────

  tutorial() {
    const s = this.state;
    const id = tutorialStepId(s);
    if (!id) return;
    const step = tutorialChain(s.progress.tutorial.starterId).find((x) => x.id === id);
    if (!step) return;
    if (id === 'habitat') {
      this.placeHabitat(this.homeId, habitatPicks(s.progress.tutorial.starterId));
      return;
    }
    if (id === 'feed') return; // feeding loop handles it
    if (step.objective.type === 'flag') {
      // A player takes a little while on each step; the AI reports the starter's signature behaviour when seen.
      const since = this.hour - (s.progress.tutorial.stepStartedHour ?? this.hour);
      if (id === 'observe' && since < 0.5) return;
      tutorialAdvance(s, step.objective.anyOf[0]);
      if (id === 'market') this.mark('market_opened');
    }
  }

  claimQuests() {
    for (const q of activeQuests(this.state)) {
      if (q.status !== 'complete') continue;
      const r = claimQuest(this.state, q.id);
      if (r.ok) this.note(`Claimed quest "${q.title}": ${r.message}`);
    }
  }

  placeHabitat(tankId: string, prefer?: string[]): boolean {
    const s = this.state;
    const tank = s.tanks[tankId];
    if (!tank) return false;
    const marine = tank.environment === 'marine';
    const ids = prefer ?? (marine ? ['hitching_post', 'live_rock', 'rubble', 'gorgonian', 'live_rock_arch', 'chaetomorpha'] : ['anubias_nana', 'java_fern', 'terracotta_cave', 'cryptocoryne', 'java_moss', 'stone_cave', 'amazon_sword', 'spider_wood', 'river_stone']);
    // Prefer pieces the tank doesn't have yet.
    const have = new Set(tank.decor.map((d) => d.defId));
    const order = [...ids.filter((d) => !have.has(d)), ...ids.filter((d) => have.has(d))];
    for (const defId of order) {
      const def = getDecorDef(defId);
      if (!def || s.finance.money < def.price + 5) continue;
      for (const x of [0.1, -0.1, 0.2, -0.2, 0.0, 0.25, -0.25, 0.3, -0.3, 0.4, -0.4]) {
        for (const z of [0.05, -0.05, 0.0, 0.08, -0.08]) {
          const chk = checkPlacement(s, tank, defId, { x, z, rotY: 0, scale: 1 }, { purchase: 'buy' });
          if (!chk.ok) continue;
          const r = placeDecor(s, tankId, defId, { x, z, rotY: 0, scale: chk.scale });
          if (r.ok) {
            this.note(`Placed ${def.name} in ${tank.name}`);
            return true;
          }
        }
      }
    }
    return false;
  }

  // ─────────────────────────── care ───────────────────────────

  maintainEquipment() {
    const s = this.state;
    for (const id of s.tankOrder) {
      const t = s.tanks[id];
      for (const eq of t?.equipment ?? []) {
        if (eq.failed || eq.condition < 0.3) {
          const r = repairEquipment(s, id, eq.id);
          if (r.ok) this.note(r.message);
        }
      }
    }
  }

  water() {
    const s = this.state;
    for (const id of s.tankOrder) {
      const t = s.tanks[id];
      if (!t) continue;
      const salty = t.environment === 'marine';
      // Top off evaporation (salt tanks promptly — salinity climbs; fresh ones before the filter sucks air).
      if (t.water.level < (salty ? 0.97 : 0.93)) topOff(s, id);
      if (salty && s.inventory.salt < 4 && s.finance.money > 20) buySalt(s, 5);
      if (this.hour - (this.lastWaterFix[id] ?? -999) < WATER_FIX_COOLDOWN_H) continue;
      // A player glances at each tank's status every few game hours (≈30 real seconds), not every tick.
      if (this.hour - (this.lastWaterLook[id] ?? -999) < WATER_LOOK_EVERY_H) continue;
      this.lastWaterLook[id] = this.hour;
      const rep = getWaterReport(s, id);
      if (rep.status === 'good') continue;
      const bad = rep.params.filter((p) => p.status !== 'good').map((p) => p.key);
      const issues = rep.issues.map((i) => `${i.text} ${i.advice ?? ''}`).join(' ').toLowerCase();
      let did = false;
      if (bad.includes('temp')) {
        const lead = this.leadSpecies(id);
        if (lead) {
          const mid = (lead.tempC.idealMin + lead.tempC.idealMax) / 2;
          for (const eq of t.equipment) {
            const d = eq.defId;
            if (d.includes('heater')) setEquipment(s, id, eq.id, { setting: Math.min(mid, lead.tempC.idealMax - 0.5), on: true });
            if (d.includes('chiller')) setEquipment(s, id, eq.id, { setting: Math.max(mid + 1, lead.tempC.idealMin + 1), on: true });
          }
          did = true;
        }
      }
      if (bad.some((k) => ['ammonia', 'nitrite', 'nitrate', 'ph', 'kh', 'gh', 'clarity', 'oxygen'].includes(k)) || (bad.includes('salinity') && t.water.salinitySG < 1.02)) {
        const r = waterChange(s, id, 0.25);
        if (r.ok) {
          this.note(`Water change in ${t.name} (${bad.join(', ')})`);
          did = true;
        } else if (salty && /salt/.test(r.message) && s.finance.money > 20) {
          buySalt(s, 5);
          waterChange(s, id, 0.25);
          did = true;
        }
      }
      if (bad.includes('algae') || /algae/.test(issues)) {
        cleanTank(s, id, 'glass');
        did = true;
      }
      if (/detritus|gravel|vacuum/.test(issues)) {
        cleanTank(s, id, 'gravel');
        did = true;
      }
      if (/filter.*(clog|dirty|clean)/.test(issues)) {
        cleanTank(s, id, 'filter');
        did = true;
      }
      if (did) this.lastWaterFix[id] = this.hour;
    }
  }

  leadSpecies(tankId: string) {
    const cs = creaturesInTank(this.state, tankId);
    const c = cs.find((x) => x.isStarter) ?? cs.find(adultish) ?? cs[0];
    return c ? findSpecies(c.speciesId) : undefined;
  }

  /** Foods (by catalog def) the given species eat. */
  foodsFor(speciesIds: string[], youngTags?: string[]): FoodDef[] {
    const out: FoodDef[] = [];
    for (const f of FOODS) {
      if (!isUnlocked(this.state, f.unlock)) continue;
      if (youngTags) {
        if (f.tags.some((t) => youngTags.includes(t))) out.push(f);
        continue;
      }
      if (speciesIds.every((sid) => f.tags.some((t) => findSpecies(sid)?.foods.includes(t)))) out.push(f);
    }
    return out;
  }

  ensureFood(food: FoodDef, min = 6): boolean {
    const s = this.state;
    if ((s.inventory.foods[food.id] ?? 0) >= min) return true;
    if (s.finance.money < food.price + 2) return (s.inventory.foods[food.id] ?? 0) > 0;
    const r = buyFood(s, food.id, 1);
    if (r.ok) this.note(r.message);
    return (s.inventory.foods[food.id] ?? 0) > 0;
  }

  /** Cheapest-per-nutrition staple a species eats (live/small packs only when nothing else fits). */
  stapleFor(speciesId: string): FoodDef | undefined {
    const opts = this.foodsFor([speciesId]);
    const cost = (f: FoodDef) => f.price / f.servingsPerPack / Math.max(1, f.nutrition) + (f.servingsPerPack <= 24 ? 1 : 0);
    return opts.sort((a, b) => cost(a) - cost(b))[0];
  }

  /** A conditioning food the species eats (breeding pairs get it every other meal). */
  conditioningFor(speciesId: string): FoodDef | undefined {
    const sp = getSpecies(speciesId);
    const tags = new Set<string>(sp.breeding.conditions.needsConditioningFood ?? []);
    if (!tags.size) return undefined;
    return this.foodsFor([speciesId])
      .filter((f) => f.tags.some((t) => tags.has(t)))
      .sort((a, b) => a.price / a.servingsPerPack - b.price / b.servingsPerPack)[0];
  }

  feedCount: Record<string, number> = {};

  feed() {
    const s = this.state;
    for (const id of s.tankOrder) {
      const t = s.tanks[id];
      if (!t) continue;
      const cs = creaturesInTank(s, id);
      const young = Object.values(s.clutches).filter((cl) => cl.tankId === id);
      const needsYoungFood = young.filter((cl) => cl.stage === 'larvae' || cl.stage === 'fry');
      // young (clutch) feeding: live foods every 6 h
      if (needsYoungFood.length && this.hour - (this.lastFed[`y:${id}`] ?? -999) >= YOUNG_FEED_EVERY_H) {
        for (const cl of needsYoungFood) {
          const sp = findSpecies(cl.speciesId);
          if (!sp) continue;
          const phase = currentPhase(cl, moduleFor(sp));
          if (!phase || !phase.foods.length) continue;
          const opts = this.foodsFor([], phase.foods).sort((a, b) => a.price / a.servingsPerPack - b.price / b.servingsPerPack);
          const f = opts.find((x) => (s.inventory.foods[x.id] ?? 0) > 0) ?? opts[0];
          if (f && this.ensureFood(f, 3)) feedTank(s, id, f.id, { servings: 1 });
        }
        this.lastFed[`y:${id}`] = this.hour;
      }
      if (!cs.length) continue;
      const hod = ((this.hour % 24) + 24) % 24;
      if (hod < 7 || hod > 22) continue; // people feed in the daytime
      const since = this.hour - (this.lastFed[id] ?? -999);
      // A player sees "hungry" on the creature cards and feeds again (not more than every 4 h).
      const hungry = cs.some((c) => c.stats.hunger > 45);
      // lane:qa-final — animals on a fast hunger clock (seahorses: "two or three times a day") get a last meal before
      // lights-out when the afternoon top-up came early; otherwise the night is ~15 h and they wake "very hungry".
      const lastMeal = hod >= 20 && since >= 4 && cs.some((c) => getSpecies(c.speciesId).hungerHours <= 12);
      if (since < FEED_EVERY_H && !(hungry && since >= 4) && !lastMeal) continue;
      // Don't pile food on top of uneaten food (the overfeeding tip): wait for it to clear.
      if (since < FEED_EVERY_H && (t.water.foodInWater ?? 0) > 0.5) continue;
      const n = (this.feedCount[id] = (this.feedCount[id] ?? 0) + 1);
      // Slowest feeders first, each species gets its own staple (bottom feeders get sinking food).
      const species = [...new Set(cs.map((c) => c.speciesId))].sort((a, b) => getSpecies(a).feedingSpeed - getSpecies(b).feedingSpeed);
      const fedFoods = new Set<string>();
      for (const sid of species) {
        const sp = getSpecies(sid);
        const mine = cs.filter((c) => c.speciesId === sid);
        if (since < FEED_EVERY_H && !mine.some((c) => c.stats.hunger > 45) && !(lastMeal && getSpecies(sid).hungerHours <= 12)) continue;
        const pair = Object.values(s.creatures).filter((c) => isAlive(c) && c.speciesId === sid && adultish(c) && c.tankId).length >= 2;
        const cond = pair && n % 2 === 0 ? this.conditioningFor(sid) : undefined;
        const f = cond ?? this.stapleFor(sid);
        if (!f) {
          this.problems.push(`no food for ${sid}`);
          continue;
        }
        if (fedFoods.has(f.id)) continue;
        if (!this.ensureFood(f, 12)) continue;
        // Slow feeders sharing a tank with faster species are target-fed (tongs / pipette).
        const others = cs.some((c) => c.speciesId !== sid && getSpecies(c.speciesId).feedingSpeed > sp.feedingSpeed + 0.2);
        if (others && sp.feedingSpeed < 0.3) {
          for (const c of cs.filter((x) => x.speciesId === sid)) feedTank(s, id, f.id, { targetCreatureId: c.id });
        } else {
          const r = feedTank(s, id, f.id);
          if (!r.ok) this.problems.push(`feed ${sid}: ${r.message}`);
        }
        fedFoods.add(f.id);
      }
      this.lastFed[id] = this.hour;
    }
  }

  // ─────────────────────────── market: mate, nursery, display ───────────────────────────

  reserveCash(): number {
    return Math.max(40, dailyOperatingCost(this.state).total * 4);
  }

  market() {
    const s = this.state;
    if (!s.progress.tutorial.flags.opened_market && !s.progress.tutorial.done) return;
    const st = this.starter();
    if (!st) return;
    const sp = getSpecies(st.speciesId);
    // Mate / companion for the starter.
    const mates = Object.values(s.creatures).filter((c) => isAlive(c) && c.speciesId === st.speciesId && c.id !== st.id && c.lineage.breederName !== 'Your shop');
    if (mates.length === 0) {
      const want = sp.sexSystem === 'gonochoristic' ? (st.sex === 'male' ? 'female' : st.sex === 'female' ? 'male' : undefined) : undefined;
      const offers = s.market.stock
        .filter((o) => o.speciesId === st.speciesId && o.creatures.length <= 2)
        .filter((o) => !want || o.creatures.some((c) => c.sex === want))
        .sort((a, b) => a.price - b.price);
      for (const o of offers) {
        const idx = want ? [o.creatures.findIndex((c) => c.sex === want)] : [0];
        const cand = o.creatures[idx[0]];
        const home = s.tanks[this.homeId];
        const verdict = previewAddition(s, home.id, { speciesId: o.speciesId, sex: cand.sex, sizeCm: cand.sizeCm }).verdict;
        const own = verdict === 'high_risk' || verdict === 'incompatible';
        const unit = o.creatures.length > 1 ? (o.unitPrice ?? o.price) : o.price;
        let tankCost = 0;
        if (own && !this.mateTankId) tankCost = tankKitPrice(this.smallTier(home), home.waterClass, true).total;
        if (s.finance.money < unit + tankCost + this.reserveCash()) continue;
        let target = home.id;
        if (own) {
          if (!this.mateTankId) {
            const r = buyTank(s, this.smallTier(home), home.waterClass, undefined, { seeded: true, name: `${cand.sex === 'female' ? 'Her' : 'Mate'} tank` });
            if (!r.ok || !r.tankId) {
              this.problems.push(`mate tank: ${r.message}`);
              continue;
            }
            this.mateTankId = r.tankId;
            this.furnish(r.tankId, home);
            this.note(r.message);
            this.mark('second_tank');
          }
          target = this.mateTankId;
        }
        const r = buyOffer(s, o.id, target, o.creatures.length > 1 ? idx : undefined);
        if (r.ok) {
          this.note(`Mate: ${r.message} (verdict in home tank: ${verdict})`);
          this.mark('mate_bought');
          break;
        } else this.problems.push(`buy mate: ${r.message}`);
      }
    }
  }

  smallTier(home: Tank): string {
    // Smallest tier that suits the starter species (≥ its min tank / breeding size).
    const st = this.starter();
    const sp = st ? getSpecies(st.speciesId) : undefined;
    const min = Math.max(sp?.recommendedMinTankGallons ?? 10, sp?.breeding.conditions.minTankGallons ?? 0, 10);
    const tier = TANK_TIERS.filter((t) => isUnlocked(this.state, t.unlock) && t.gallons >= min).sort((a, b) => a.gallons - b.gallons)[0];
    return tier?.id ?? home.tierId;
  }

  /** Give a new tank the starter tank's temperature tuning and a little cover. */
  furnish(tankId: string, like: Tank) {
    const s = this.state;
    const t = s.tanks[tankId];
    for (const eq of t.equipment) {
      const src = like.equipment.find((e) => e.defId.split('_')[0] === eq.defId.split('_')[0] && e.setting !== undefined);
      if (src && src.setting !== undefined) eq.setting = src.setting;
    }
    this.placeHabitat(tankId);
  }

  ensureNursery(forSpecies: string, fromTank: Tank): string | null {
    const s = this.state;
    if (this.nurseryId && s.tanks[this.nurseryId]) return this.nurseryId;
    // A tank with no adults (other than the display) can serve.
    for (const id of s.tankOrder) {
      if (id === fromTank.id || id === this.homeId || id === this.mateTankId) continue;
      const t = s.tanks[id];
      if (t.environment !== fromTank.environment) continue;
      if (creaturesInTank(s, id).some(adultish)) continue;
      this.nurseryId = id;
      return id;
    }
    const tier = this.smallTier(fromTank);
    const price = tankKitPrice(tier, fromTank.waterClass, true).total;
    if (s.finance.money < price + 15) return null;
    const r = buyTank(s, tier, fromTank.waterClass, undefined, { seeded: true, name: 'Nursery' });
    if (!r.ok || !r.tankId) {
      this.problems.push(`nursery: ${r.message}`);
      return null;
    }
    s.tanks[r.tankId].purpose = 'nursery';
    this.furnish(r.tankId, fromTank);
    this.nurseryId = r.tankId;
    this.note(`Nursery: ${r.message}`);
    this.mark('nursery_ready');
    this.mark('second_tank');
    void forSpecies;
    return r.tankId;
  }

  // ─────────────────────────── breeding ───────────────────────────

  breeding() {
    const s = this.state;
    const st = this.starter();
    if (!st) return;
    const sp = getSpecies(st.speciesId);
    const mod = moduleFor(sp);
    const mates = Object.values(s.creatures).filter((c) => isAlive(c) && c.speciesId === st.speciesId && c.id !== st.id && adultish(c) && c.lineage.breederName !== 'Your shop');
    // restore a temporary cooling cue
    if (this.coolUntil !== null && this.hour >= this.coolUntil) {
      for (const [key, v] of Object.entries(this.coolRestore)) {
        const [tid, eid] = key.split('|');
        if (s.tanks[tid]) setEquipment(s, tid, eid, { setting: v });
      }
      this.coolRestore = {};
      this.coolUntil = null;
      this.note('Restored chiller after the cooling cue');
    }
    for (const m of mates) {
      const chk = breedingCheck(s, st.id, m.id);
      const step = chk.nextStep ?? '';
      if (mod.introducedByKeeper) {
        // Betta: introduce the conditioned female to the male's finished nest; separate her after spawning.
        const male = st.sex === 'male' ? st : m;
        const female = male === st ? m : st;
        if (female.repro.stage === 'spent' || (female.repro.harassment ?? 0) > 0.25) {
          const back = this.mateTankId && female.tankId !== this.mateTankId ? this.mateTankId : null;
          if (back) {
            const r = separateCreature(s, female.id, back);
            this.note(`Separate female: ${r.message}`);
          }
          continue;
        }
        if (male.repro.stage === 'nest_ready' && female.tankId !== male.tankId && chk.ok) {
          const r = startBreeding(s, female.id, male.id);
          this.note(`Start breeding: ${r.message}`);
        }
        continue;
      }
      if (m.tankId !== st.tankId) continue;
      // Follow the hints a player would read on the breeding card.
      const onlyCue = chk.reasons.length === 1 && /seasonal cue/.test(chk.reasons[0]);
      if (onlyCue && /Chill the water by ~2/.test(step) && this.coolUntil === null) {
        const t = s.tanks[st.tankId!];
        const ch = t.equipment.find((e) => e.defId.includes('chiller'));
        if (ch && ch.setting !== undefined) {
          this.coolRestore[`${t.id}|${ch.id}`] = ch.setting;
          setEquipment(s, t.id, ch.id, { setting: ch.setting - 2.5 });
          this.coolUntil = this.hour + 36;
          this.note(`Cooling cue: chiller ${ch.setting + 2.5} → ${ch.setting} °C`);
        }
      }
      const warm = /(?:Warm the tank|Nudge the heater up) to about (\d+(?:\.\d+)?) °C/.exec(step);
      if (warm) {
        const t = s.tanks[st.tankId!];
        const h = t.equipment.find((e) => e.defId.includes('heater'));
        if (h) {
          setEquipment(s, t.id, h.id, { setting: Number(warm[1]) + 0.5, on: true });
          this.note(`Heater nudged to ${Number(warm[1]) + 0.5} °C for breeding`);
        }
      }
      if (/Add a flat rock/.test(step) && !this.flags.nestRock) {
        this.flags.nestRock = this.placeHabitat(st.tankId!, ['slate_stack', 'live_rock', 'rubble', 'river_stone']);
      }
    }
  }

  flags: Record<string, boolean> = {};

  clutches() {
    const s = this.state;
    const starterSp = this.state.starterId;
    for (const cl of Object.values(s.clutches)) {
      // The bot only manages its starter's breeding line; other species' spawns in exhibits take their chances.
      if (cl.speciesId !== starterSp) continue;
      const sp = findSpecies(cl.speciesId);
      if (!sp) continue;
      const mod = moduleFor(sp);
      const tank = s.tanks[cl.tankId];
      if (!tank || cl.infertile) continue;
      if (isCarried(cl) || (cl.pendingEggs ?? 0) > 0) continue;
      if (cl.tankId === this.nurseryId) continue;
      const adults = creaturesInTank(s, tank.id).filter(adultish);
      if (adults.length === 0 || tank.purpose === 'nursery') continue;
      // Betta: the male tends eggs and larvae in the nest; move the brood once the fry swim free.
      if (mod.plan.guardYoung && cl.guardedById && cl.stage !== 'fry') continue;
      const nursery = this.ensureNursery(cl.speciesId, tank);
      if (!nursery) continue;
      const r = moveClutch(s, cl.id, nursery);
      this.note(`Move clutch: ${r.message}`);
    }
  }

  // ─────────────────────────── selling ───────────────────────────

  sell() {
    const s = this.state;
    if (!isUnlocked(s, 'market_listings')) return;
    // Accept good bids.
    for (const l of s.market.listings) {
      if (l.status !== 'active') continue;
      const best = bestOpenBid(l);
      if (!best) continue;
      const expect = l.lastValuation ?? l.snapshot.valuation;
      const closing = l.endsHour - this.hour < 3 || this.hour >= l.endsHour;
      if (best.amount >= expect * 0.9 || (closing && best.amount >= l.reserve) || this.hour - best.createdHour > 3) {
        const r = acceptBid(s, l.id, best.id);
        if (r.ok) {
          this.note(`Sold: ${r.message}`);
          if (l.creatureIds.some((id) => s.creatures[id]?.lineage.breederName === 'Your shop')) this.mark('first_offspring_sale');
        }
      }
    }
    // A listing that ended without a sale: a careful player lists those animals again (lane:w2-sim).
    for (const l of s.market.listings) {
      if (l.status !== 'expired' || this.relisted.has(l.id)) continue;
      this.relisted.add(l.id);
      for (const id of l.creatureIds) if (s.creatures[id]?.status === 'alive') this.listedIds.delete(id);
      this.note(`Relisting after no sale: ${l.title}`);
    }
    // List home-bred juveniles once they have grown a little (keep one of each clutch as a future breeder).
    if (this.hour - this.lastListingHour < 2) return;
    const bred = Object.values(s.creatures).filter((c) => c.status === 'alive' && c.lineage.breederName === 'Your shop' && c.lineage.generation >= 1 && !this.listedIds.has(c.id));
    const groups = new Map<string, Creature[]>();
    for (const c of bred) {
      if (c.lifeStage !== 'juvenile' && !adultish(c)) continue;
      const age = (this.hour - c.bornHour) / 24;
      const sp = getSpecies(c.speciesId);
      if (c.lifeStage === 'juvenile' && age < sp.lifecycle.juvenileDays * 0.5) continue;
      const key = `${c.speciesId}|${c.lineage.motherId}|${Math.floor(c.bornHour / 24)}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(c);
    }
    for (const [, cs] of groups) {
      // Valuable animals sell best one at a time; cheap ones as a batch / group.
      const each = suggestPricing(s, { kind: 'creature', creatureIds: [cs[0].id] }).expected;
      const lots: Creature[][] = each >= 40 || cs.length === 1 ? cs.map((c) => [c]) : [cs];
      for (const lot of lots) {
        const kind = lot.length === 1 ? 'creature' : lot.every((c) => c.lifeStage === 'juvenile') ? 'juveniles' : 'group';
        const ids = lot.map((c) => c.id);
        const pr = suggestPricing(s, { kind, creatureIds: ids });
        if (pr.expected <= 0) continue;
        const r = createListing(s, { kind, creatureIds: ids, reserve: Math.round(pr.expected * 0.7), durationHours: 24 });
        if (r.ok) {
          for (const id of ids) this.listedIds.add(id);
          this.lastListingHour = this.hour;
          this.note(`Listed ${ids.length} × ${lot[0].speciesId} (expected $${Math.round(pr.expected)})`);
        } else this.problems.push(`list: ${r.message}`);
      }
    }
  }

  // ─────────────────────────── expansion ───────────────────────────

  expand() {
    const s = this.state;
    const info = facilityUpgradeInfo(s);
    if (info.next && info.canUpgrade && s.finance.money >= info.cost + this.reserveCash() + 50) {
      const r = upgradeFacility(s);
      if (r.ok) {
        this.note(`Upgrade: ${r.message}`);
        if (isUnlocked(s, 'visitors') && !s.facility.openToPublic) setOpenToPublic(s, true);
      }
    }
    if (s.facility.level !== 'hobby_room' && !s.facility.openToPublic && isUnlocked(s, 'visitors')) setOpenToPublic(s, true);
    // Signs on exhibits once a shop is open.
    if (s.facility.level !== 'hobby_room') {
      for (const id of s.tankOrder) {
        const t = s.tanks[id];
        if (!t.signage && t.purpose === 'display' && creaturesInTank(s, id).length && s.finance.money > 120 && isUnlocked(s, 'signage')) toggleSignage(s, id);
      }
    }
    // The long-game policy starts once the shop is open (before that the early-game plan is the same for everyone).
    if (!this.opts.longGame || s.facility.level === 'hobby_room') return;
    this.longGame();
  }

  /**
   * Long-game policy: work toward the next facility level. Save for it when only money is missing; otherwise add
   * stocked exhibits (tank-count goals), research the big-tank engineering projects, and build the showpiece tanks.
   */
  longGame() {
    const s = this.state;
    const info = facilityUpgradeInfo(s);
    const unmet = info.requirements.filter((r) => !r.met);
    const moneyOnly = !!info.next && unmet.length > 0 && unmet.every((r) => r.label.startsWith('$'));
    const upgradeCost = info.next?.upgradeCost ?? 0;
    // Keep every exhibit stocked (a player keeps their displays alive).
    if (this.hour - (this.flagsNum.lastStock ?? -999) >= 24) {
      this.flagsNum.lastStock = this.hour;
      for (const id of s.tankOrder) {
        if (!this.exhibits.has(id)) continue; // never the starter's own tanks
        if (creaturesInTank(s, id).length < 3) this.stockDisplay(id, moneyOnly ? upgradeCost : 0);
      }
    }
    if (moneyOnly) return; // saving up for the move
    const spare = s.finance.money - this.reserveCash() - 150;
    // Research only what the path needs (big-tank engineering) or when rich.
    if (!s.progress.research.activeId) {
      const want = ['acrylic_engineering', 'grand_display', 'public_education', 'life_support_2'];
      const rs = researchList(s).filter((r) => r.status === 'available' && r.affordable);
      const pick = rs.find((r) => want.includes(r.def.id) && spare > r.def.cost) ?? rs.find((r) => spare > r.def.cost * 3 + upgradeCost);
      if (pick) {
        const r = startResearch(s, pick.def.id);
        if (r.ok) this.note(r.message);
      }
    }
    if (this.hour - (this.flagsNum.lastTankBuy ?? -999) < 24) return;
    const wc: WaterClass = s.tanks[this.homeId]?.environment === 'marine' ? 'marine_live_rock' : 'freshwater_tropical';
    const needTanks = unmet.find((r) => /^\d+ tanks?$/.test(r.label));
    const needBig = unmet.find((r) => /gal tank/.test(r.label));
    const bigUnlocked = TANK_TIERS.filter((t) => isUnlocked(s, t.unlock)).sort((a, b) => b.gallons - a.gallons);
    let tierId: string | undefined;
    if (needBig) {
      const min = Number(/(\d+)\+ gal/.exec(needBig.label)?.[1] ?? 0);
      tierId = bigUnlocked.find((t) => t.gallons >= min)?.id;
    } else if (needTanks) {
      // cheapest decent exhibit: a 29-gal community / reef tank
      tierId = bigUnlocked.filter((t) => t.gallons >= 20).sort((a, b) => a.gallons - b.gallons)[0]?.id;
    } else if (!info.next && isUnlocked(s, 'tank_1000') && !Object.values(s.tanks).some((t) => t.tierId === 'g1000')) {
      tierId = 'g1000';
    } else if (info.next === null || spare > upgradeCost * 1.5) {
      tierId = bigUnlocked.find((t) => !Object.values(s.tanks).some((x) => x.tierId === t.id))?.id;
    }
    if (!tierId) return;
    const price = tankKitPrice(tierId, wc, true).total;
    if (spare < price + 300) return;
    const r = buyTank(s, tierId, wc, undefined, { seeded: true, name: `${TANK_TIER_BY_ID[tierId].gallons} gal exhibit` });
    if (!r.ok || !r.tankId) {
      this.problems.push(`long game tank: ${r.message}`);
      this.flagsNum.lastTankBuy = this.hour;
      return;
    }
    this.flagsNum.lastTankBuy = this.hour;
    this.exhibits.add(r.tankId);
    this.note(`Long game: ${r.message}`);
    for (let i = 0; i < 5; i++) this.placeHabitat(r.tankId);
    this.stockDisplay(r.tankId, 0);
  }

  flagsNum: Record<string, number> = {};
  /** Display tanks the long-game policy built and stocks (the starter's own tanks are left alone). */
  exhibits = new Set<string>();

  /**
   * Stock an exhibit the way a careful curator would: ONE species per display, a whole group at or above its minimum
   * group size, only if the preview is clean (no warnings), and a species not already shown elsewhere (visitors tire
   * of repeats). Top up an existing display with more of the same species.
   */
  stockDisplay(tankId: string, keep: number) {
    const s = this.state;
    const here = creaturesInTank(s, tankId);
    const resident = here[0]?.speciesId;
    const shown = new Set<string>();
    for (const id of this.exhibits) for (const c of creaturesInTank(s, id)) shown.add(c.speciesId);
    const offers = [...s.market.stock]
      .filter((o) => !resident || o.speciesId === resident)
      .filter((o) => {
        const sp = findSpecies(o.speciesId);
        return !!sp && here.length + o.creatures.length >= (sp.social?.minGroup ?? 1) && (sp.category === 'fish' || !!resident);
      })
      .sort((a, b) => Number(shown.has(a.speciesId)) - Number(shown.has(b.speciesId)) || b.creatures.length - a.creatures.length || a.price - b.price);
    for (const o of offers) {
      if (s.finance.money < o.price + this.reserveCash() + keep) continue;
      let rep = previewAddition(s, tankId, { speciesId: o.speciesId, count: o.creatures.length });
      // A player reads the cautions and adds the hides / cover first.
      for (let i = 0; i < 4 && rep.reasons.some((x) => /hiding|cover/.test(x.text)); i++) {
        if (!this.placeHabitat(tankId)) break;
        rep = previewAddition(s, tankId, { speciesId: o.speciesId, count: o.creatures.length });
      }
      if (rep.reasons.some((x) => x.severity === 'warning' || x.severity === 'critical') || (rep.verdict !== 'excellent' && rep.verdict !== 'usually_compatible')) continue;
      const r = buyOffer(s, o.id, tankId);
      if (r.ok) {
        this.note(`Stocked: ${r.message}`);
        return;
      }
    }
  }
}

function normaliseText(t: string): string {
  return t
    .replace(/\$[\d,.]+/g, '$N')
    .replace(/\d+(\.\d+)?/g, 'N')
    .slice(0, 90);
}

/** Play a starter headlessly and return the recorded timeline. */
export function runPlaythrough(opts: PlaythroughOptions): PlaythroughResult {
  const bot = new Bot(opts);
  const s = bot.state;
  const samples: DaySample[] = [];
  const totalHours = opts.days * 24;
  let lastDay = 0;
  const sample = () => {
    const day = Math.floor((s.clock.hour - START_HOUR) / 24);
    const creatures = Object.values(s.creatures);
    const daily = s.finance.daily[s.finance.daily.length - 1];
    samples.push({
      day,
      money: Math.round(s.finance.money),
      reputation: Math.round(s.progress.reputation * 10) / 10,
      level: s.facility.level,
      tanks: s.tankOrder.length,
      alive: creatures.filter(isAlive).length,
      dead: creatures.filter((c) => c.status === 'dead').length,
      young: Object.values(s.clutches).reduce((a, c) => a + c.count, 0),
      clutches: Object.keys(s.clutches).length,
      births: s.progress.counters.births ?? 0,
      sales: s.market.history.length,
      unlocks: s.progress.unlocked.length,
      income: Math.round(daily?.income ?? 0),
      expenses: Math.round(daily?.expenses ?? 0),
      opCost: Math.round(dailyOperatingCost(s).total * 10) / 10,
      tutorial: s.progress.tutorial.done ? 'done' : tutorialStepId(s) ?? '-',
    });
  };
  sample();
  const events: { kind: string; text: string; toast?: boolean; hour: number }[] = [];
  const seen = new Set<string>();
  const collect = () => {
    for (const e of s.log) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      events.push({ kind: e.kind, text: e.text, toast: e.toast, hour: e.hour });
    }
  };
  collect();
  for (let h = 0; h < totalHours; h++) {
    bot.act();
    advanceWorld(s, 1, { focusTankId: bot.homeId });
    collect();
    const day = Math.floor((s.clock.hour - START_HOUR) / 24);
    if (day > lastDay) {
      lastDay = day;
      sample();
    }
    if (opts.until?.(s)) break;
  }
  bot.scanMilestones();
  const counts = new Map<string, number>();
  let toasts = 0;
  for (const e of events) {
    const k = `${e.kind}: ${normaliseText(e.text)}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (e.toast) toasts++;
  }
  const spam = [...counts.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  return {
    state: s,
    samples,
    milestones: bot.milestones,
    deaths: bot.deaths,
    actions: bot.actions,
    spam,
    eventCount: events.length,
    events,
    toastCount: toasts,
    problems: [...new Set(bot.problems)],
  };
}

/** Human-readable summary of a run (hours → real minutes at 1×). */
export function formatPlaythrough(r: PlaythroughResult, label: string): string {
  const realMin = (h: number | undefined) => (h === undefined ? '—' : `${((h - START_HOUR) / 6).toFixed(0)} min (d${((h - START_HOUR) / 24).toFixed(1)})`);
  const lines: string[] = [];
  lines.push(`══ ${label} ══`);
  const order: Milestone[] = ['first_money', 'market_opened', 'mate_bought', 'second_tank', 'nursery_ready', 'first_spawn', 'first_juveniles', 'first_sale', 'first_offspring_sale', 'tutorial_done', 'shop_unlocked', 'specialty_shop', 'first_visitor', 'aquarium_store', 'showroom', 'destination', 'grand_hall', 'in_debt', 'loan'];
  lines.push(order.filter((m) => r.milestones[m] !== undefined).map((m) => `${m}=${realMin(r.milestones[m])}`).join(' · '));
  lines.push('day  money   rep  level           tanks alive dead young births sales  in/out  op   tut');
  for (const x of r.samples) {
    lines.push(
      `${String(x.day).padStart(3)} ${String(x.money).padStart(6)} ${String(x.reputation).padStart(6)} ${x.level.padEnd(15)} ${String(x.tanks).padStart(5)} ${String(x.alive).padStart(5)} ${String(x.dead).padStart(4)} ${String(x.young).padStart(5)} ${String(x.births).padStart(6)} ${String(x.sales).padStart(5)} ${`${x.income}/${x.expenses}`.padStart(8)} ${String(x.opCost).padStart(5)} ${x.tutorial}`,
    );
  }
  if (r.deaths.length) lines.push(`deaths: ${r.deaths.map((d) => `${d.name} (${d.speciesId}${d.young ? ', young' : ''}) d${((d.hour - START_HOUR) / 24).toFixed(1)}: ${d.cause}`).join('; ')}`);
  if (r.problems.length) lines.push(`bot problems: ${r.problems.join(' | ')}`);
  lines.push(`events ${r.eventCount} (${r.toastCount} toasts); most repeated: ${r.spam.slice(0, 6).map((x) => `${x.count}× ${x.text}`).join(' || ')}`);
  return lines.join('\n');
}
