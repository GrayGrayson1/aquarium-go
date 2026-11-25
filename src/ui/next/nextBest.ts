/**
 * chunk 21 (C, "What next?") — the most useful things to do now, best first. One button in the tank bar opens them
 * (WhatNext.tsx); this module only ranks. It re-derives no rule of its own: every line comes from a helper the game
 * already has (the bell's tank attention and its fix links, the guide's step and "Show me", Operations' Problems,
 * the shows' and research's own checks, the shared shop's pool), so "What next?" always agrees with them.
 *
 * Pure over (GameState, context), node-safe and unit-tested (nextBest.test.ts). It writes nothing; the helpers it
 * reuses read two settings themselves: the temperature unit in a tank's status line, and "no guide in a shared shop".
 *
 * The order, by rule (each rule's own order in brackets; ties by key, compared code unit by code unit, never by locale):
 *  1. danger   A tank in danger: the bell's red (the sim's status: starving, harmed by the water, seriously ill,
 *              failing; and gear working against its animals). Its most urgent line, with that line's fix
 *              (`fixForAttention`, the link the tank card and the bell give it). [tank order]
 *  2. guide    The first-hour guide's current step while it runs and its card is shown: with Settings › Guide hints
 *              off the rest of the UI treats the guide as not running (the panels' aside rule, the toasts), and so
 *              does this (chunk 21 review S4). It does what the guide card's own button does (`showMe`, or the
 *              Market when no animal is left to show). While the guide runs only rules 1 to 4 are listed, so nothing
 *              pulls the player away from it; rule 3's "Open the Market" is left out when the guide's step already
 *              goes there (its way to money stays), and
 *              rule 4 when the step is itself a feeding step (each would be the same thing twice). [one]
 *  3. empty    An empty aquarium (chunk 21 review S2): no tank at all → Build › Tanks, in the tank bar's words ("No
 *              tank · Buy one"); tanks but no animal in them → the Market, in the guide's words ("Friends come to see
 *              your animals…", "Open the Market"). Either becomes the way to money when even the cheapest tank, or
 *              the cheapest animal in the shop that fits a tank, costs more than the player can spend. [one]
 *  4. hungry   A tank with a very hungry animal (the sim's "very hungry" line, hunger 70 and up, ANIMAL_THRESHOLDS):
 *              Feed, Target feed or Buy food, as its fix link says. [tank order]
 *  5. care     Any other tank the bell marks amber (water to watch, food running low, failed or worn gear, gear that
 *              can't help, Auto-feed paused, a struggling plant): its first line's fix. The brief's list didn't name
 *              watch-level tank problems; they come after hungry animals and before anything optional. [tank order]
 *  6. expiring Something that won't wait: bids on the player's listings (they lapse within minutes of real time);
 *              the show whose entries close soonest, within SHOW_SOON_HOURS, that the player can enter (the show's
 *              own closed check, a class an animal or tank of theirs is eligible for, the fee affordable, nothing of
 *              theirs entered in it yet); the Prismatic or rare animal (the Market dot's rule) leaving the shop
 *              soonest, within OFFER_SOON_HOURS, that they can buy (its species open to them, a tank of its water,
 *              affordable). The game keeps no list of offers a player is watching, so "an offer you are watching" is
 *              read as the rare stock the Market's dot already points at. [bids, then soonest first]
 *  7. ready    Something to collect or decide: quest rewards to claim; new show results; an automation problem
 *              (Operations' Problems, at most two); young that need a hand (the clutch card's own warnings, at most
 *              two); in a shared shop, money requests the player may answer (`asksFor`). [that order]
 *  8. unlock   Moving up a facility level, else the cheapest research project that can start now (none running, and
 *              one that still teaches something), when the player can pay for it. [that order]
 *  9. quest    The active board quest nearest done, at least half way (QUEST_NEAR). [most done first]
 * 10. collect  The collection, at the address COLLECTION_ADDRESS (always last; with nothing else, the sheet says all
 *              is well and offers it). Left out while the guide runs.
 *
 * Never something the player can't do: a purchase is checked against what they can spend (`spendable`: nothing while
 * in debt, as the game pauses purchases then; in a shared shop no more than their own limit, `canSpend`). Something
 * optional (a show's fee, a rare animal, a facility move, research) is suggested only when it costs at most half of
 * that (OPTIONAL_SHARE), so "What next?" never talks a player into spending the money their animals' food needs; a
 * care fix may use all of it. Locked species, show tiers and research are left out by the sim's own checks. A fix
 * that buys food or gear the player can't afford becomes "Open Finances" with the reason (in a shared shop, for a
 * member who doesn't spend freely, "Ask for money", which opens the shop's dropdown where Money is). The Staff's flags
 * name broken gear and sick animals, which rules 1 and 5 already cover. OWNER: lane "next" (chunk 21).
 */
import type { GameState, Tank } from '@/types';
import type { Route } from '../nav/routes';
import { fixForAttention, type FixLink, type FixTo } from '../common/fixLinks';
import { tankAttention, unseenShowResults, type AttentionItem } from '../common/notify';
import { TANK_STATUS_WORD } from '../common/tankStatus';
import { currentCoachStep, friendWait } from '../tutorial/guideText';
import { opsSnapshot } from '../common/ops';
import { issueViews, whenText } from '../panels/operations/issues';
import { visiblyRare } from '../panels/market/offerGenetics';
import { foodName } from '../common/format';
import { formatMoney } from '../kit';
import { SHARED_WORDS } from '../shared/words';
import { getWaterReport } from '@/sim/water';
import { getFoodDef } from '@/data/catalog/foods';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { equipmentOfKind } from '@/data/catalog/equipment';
import { findSpecies } from '@/data/species';
import { lowerName } from '@/data/speciesWords';
import { activeQuests, facilityUpgradeInfo, isUnlocked, researchList } from '@/sim/facility';
import { isSpeciesAvailable } from '@/sim/economy';
import { environmentGate } from '@/sim/compat';
import { isPrismatic } from '@/sim/life/rareVariants';
import { morphDisplayName } from '@/sim/life/genetics';
import { clutchStatus } from '@/sim/life/breeding/status';
import { classEligibleCounts, showClosedReason, upcomingShows } from '@/sim/shows';
import { asksFor, canSpend, spendsFreely } from '@/sim/pool';
import { HOURS_PER_DAY } from '@/sim/time';

/** The rules, best first (the header says what each one is). */
export type NextRule = 'danger' | 'guide' | 'empty' | 'hungry' | 'care' | 'expiring' | 'ready' | 'unlock' | 'quest' | 'collect';
export const NEXT_RULES: readonly NextRule[] = ['danger', 'guide', 'empty', 'hungry', 'care', 'expiring', 'ready', 'unlock', 'quest', 'collect'];
const RANK: Record<NextRule, number> = { danger: 0, guide: 1, empty: 2, hungry: 3, care: 4, expiring: 5, ready: 6, unlock: 7, quest: 8, collect: 9 };
/** The rules listed while the first-hour guide runs (and its card is shown). */
const WITH_GUIDE: ReadonlySet<NextRule> = new Set<NextRule>(['danger', 'guide', 'empty', 'hungry']);

/** Where the Collection lives (feature A's route; until it exists the router opens the Encyclopedia instead). */
export const COLLECTION_ADDRESS = '#/encyclopedia/collection';
/** A show whose entries close within this many game hours counts as closing soon (2 game days, 8 real minutes at 1×). */
export const SHOW_SOON_HOURS = 48;
/** A rare offer leaving the shop within this many game hours counts as leaving soon (3 real minutes at 1×). */
export const OFFER_SOON_HOURS = 12;
/** Something optional is suggested only when it costs at most this share of what the player can spend. */
export const OPTIONAL_SHARE = 0.5;
/** At most this many automation problems, and this many clutches, are listed (the rest are a tap away there). */
const MAX_PER_SOURCE = 2;

/** Where an action goes: something the router or an existing UI action already understands. */
export type NextTo =
  /** A fix link (goFix): a tank card's control, a panel at a spot, an animal's card or the food picker. */
  | { kind: 'fix'; to: FixTo }
  /** A route (the router's `go`). */
  | { kind: 'route'; route: Route }
  /** An address only (a route another feature owns, such as the Collection). */
  | { kind: 'address'; hash: string }
  /** The guide card's "Show me" for its current step (TutorialCoach's `showMe`). */
  | { kind: 'guide'; action: string }
  /** The shared shop's dropdown, where Money (requests, asking) is. */
  | { kind: 'shared' };

export interface NextAction {
  /** Stable and unique: the rule and what it is about ("danger:tank_1", "guide:feed", "collect"). */
  key: string;
  rule: NextRule;
  /** A short line above the title: the tank and its status word, or the place it opens ("Research › Quests"). */
  where?: string;
  /** What to do, in a few words ("Feed Ember", "Water change", "Claim your reward"). */
  title: string;
  /** Why, in one line (usually the game's own line for it). */
  why: string;
  to: NextTo;
}

export interface NextContext {
  /** A mouse: the guide says "Click", not "Tap" (FINE_POINTER). */
  fine?: boolean;
  /** In a shared shop: who this player is (spending limits, who may answer requests). Absent or null: a solo game. */
  member?: { id: string; owner: boolean } | null;
  /**
   * Settings › Guide hints (absent: on). Off, the guide card is hidden and the rest of the UI treats the guide as not
   * running (the panels' aside rule, the toasts): so does this, with no guide step and nothing held back for it.
   */
  hints?: boolean;
}

interface Ranked extends NextAction {
  /** The order within its rule (tank index, hours left…). */
  sub: number;
}

const attempt = <T>(fn: () => T, fallback: T): T => {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
};
const byKey = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
/** The first sentence of a text ("Tap Feed. Bettas…" → "Tap Feed."). */
export function firstSentence(text: string): string {
  const t = text.trim();
  const m = /^.*?[.!?](?=\s|$)/.exec(t);
  return m ? m[0] : t;
}
const sentence = (s: string): string => {
  const t = s.trim().replace(/^./, (c) => c.toUpperCase());
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

/** What the player can spend now: nothing in debt; in a shared shop no more than their own limit. */
export function spendable(g: GameState, member?: NextContext['member']): number {
  const money = Number.isFinite(g.finance?.money) ? g.finance.money : 0;
  if (money <= 0) return 0;
  return member ? Math.min(money, attempt(() => canSpend(g, member), money)) : money;
}

// ───────────────────────────── tanks (rules 1, 4 and 5) ─────────────────────────────

/** The sim's hunger lines ("Ember is very hungry — …", "3 neon tetras are starving — …"), and who they are about. */
const HUNGRY_LINE = /\b(?:very hungry|starving)\b/;
const HUNGRY_SUBJECT = /^(.+?) (?:is|are) (?:starving|very hungry)\b/;

/** The fix's words as an action's title: the feeding ones name who to feed ("Feed Ember", "Target feed Wasabi"). */
function titleOf(fix: FixLink, item: Pick<AttentionItem, 'text'>): string {
  if (fix.to.kind === 'feed') {
    const who = HUNGRY_SUBJECT.exec(item.text)?.[1];
    if (who) return `${fix.to.target ? 'Target feed' : 'Feed'} ${who}`;
  }
  return fix.label;
}

/**
 * A fix that buys something the player can't pay for, as the way to the money instead (null: it's affordable, or
 * buys nothing). Food: the pack's price; gear: the cheapest unit of that kind open to the player.
 */
function unaffordable(g: GameState, fix: FixLink, money: number, member: NextContext['member']): { title: string; why: string; to: NextTo } | null {
  if (fix.to.kind !== 'panel') return null;
  const target = fix.to.target ?? '';
  let price = 0;
  let what = '';
  if (target.startsWith('food:')) {
    const def = getFoodDef(target.slice(5));
    if (!def) return null;
    price = def.price;
    what = `Not enough money for ${foodName(def.id)} (${formatMoney(def.price)} a pack).`;
  } else if (fix.to.panel === 'build' && target.startsWith('equipment:')) {
    const kind = target.split(':')[2];
    const cheapest = attempt(() => equipmentOfKind(kind as Parameters<typeof equipmentOfKind>[0]).find((d) => !d.unlock || isUnlocked(g, d.unlock)), undefined);
    if (!cheapest) return null;
    price = cheapest.price;
    what = `Not enough money for ${fix.label.replace(/^Buy /, '')} (from ${formatMoney(cheapest.price)}).`;
  } else return null;
  if (price <= money) return null;
  return moneyWay(g, what, member);
}

/**
 * The way to money, for something the player can't pay for (`what`: why, in a sentence): Finances, where the ways to
 * raise cash are; in debt, the bell's debt line; a shared shop's member with a limit asks the shop instead (Money).
 */
function moneyWay(g: GameState, what: string, member: NextContext['member']): { title: string; why: string; to: NextTo } {
  if (g.finance.money < 0) what = 'Not enough money: purchases are paused while you’re in debt.';
  if (member && !attempt(() => spendsFreely(g, member), true)) return { title: SHARED_WORDS.askForMoney, why: what, to: { kind: 'shared' } };
  return { title: 'Open Finances', why: what, to: { kind: 'route', route: { kind: 'panel', panel: 'finances' } } };
}

/** One tank's action for an attention line: the line's fix as the title, the line as the why. */
function tankAction(g: GameState, tank: Tank, item: AttentionItem, rule: NextRule, sub: number, money: number, member: NextContext['member']): Ranked {
  const report = item.source === 'water' || item.source === 'animals' ? attempt(() => getWaterReport(g, tank.id), null) : null;
  const fix = attempt(() => fixForAttention(g, tank, item, report), null);
  const level = item.level === 'danger' ? 'danger' : 'watch';
  const where = `${tank.name} · ${TANK_STATUS_WORD[level]}`;
  const base = { key: `${rule}:${tank.id}`, rule, where, sub };
  if (!fix) return { ...base, title: 'Open the tank card', why: sentence(item.text), to: { kind: 'route', route: { kind: 'tankCard', tankId: tank.id, tab: item.tab ?? 'water' } } };
  const poor = unaffordable(g, fix, money, member);
  if (poor) return { ...base, ...poor };
  return { ...base, title: titleOf(fix, item), why: sentence(item.text), to: { kind: 'fix', to: fix.to } };
}

function tankActions(g: GameState, money: number, member: NextContext['member']): Ranked[] {
  const out: Ranked[] = [];
  g.tankOrder.forEach((id, i) => {
    const tank = g.tanks[id];
    if (!tank) return;
    const att = attempt(() => tankAttention(g, id), null);
    if (!att || att.level === 'good' || !att.items.length) return;
    const danger = att.items.find((it) => it.level === 'danger');
    const hungry = att.items.find((it) => (it.source === 'animals' || it.source === 'food') && HUNGRY_LINE.test(it.text));
    if (danger) out.push(tankAction(g, tank, danger, 'danger', i, money, member));
    else if (hungry) out.push(tankAction(g, tank, hungry, 'hungry', i, money, member));
    else out.push(tankAction(g, tank, att.items[0], 'care', i, money, member));
  });
  return out;
}

// ───────────────────────────── the guide (rule 2) ─────────────────────────────

/** The guide card's own button for a step (TutorialCoach: Target feed for slow feeders, Follow on the "watch" step). */
export function guideShowMe(step: { id: string; hintTarget: string; body: string }): string {
  const target = step.hintTarget === 'tool-feed' && /target-feed/i.test(step.body) ? 'tool-target-feed' : step.hintTarget;
  return step.id === 'observe' && target === 'scene' ? 'follow-starter' : target;
}

function guideAction(g: GameState, ctx: NextContext): Ranked | null {
  if (ctx.hints === false) return null; // (Guide hints off: the guide is out of sight, so it isn't "running" here)
  const cur = attempt(() => currentCoachStep(g, !!ctx.fine), null);
  if (!cur) return null;
  const wait = attempt(() => friendWait(g, cur.step.id), null);
  const where = `Guide · ${cur.shownIndex + 1} of ${cur.shownTotal}`;
  // (the card's own way forward when no animal is left to show: the Market)
  const to: NextTo = wait?.action === 'market' ? { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'shop' } } : { kind: 'guide', action: guideShowMe(cur.step) };
  return { key: `guide:${cur.step.id}`, rule: 'guide', where, title: cur.title, why: wait?.text ?? firstSentence(cur.body), to, sub: 0 };
}

/** Is the guide's step a feeding step (its button opens the food or Target feed)? */
const feedingStep = (a: NextAction): boolean => a.to.kind === 'guide' && (a.to.action === 'tool-feed' || a.to.action === 'tool-target-feed');

// ───────────────────────────── an empty aquarium (rule 3) ─────────────────────────────

/** The tank bar's words when there is no tank ("No tank · Buy one", TankBar.tsx). */
export const NO_TANK_TITLE = 'No tank · Buy one';
/** The guide's words when there is no animal to see (guideText.ts `friendWait`) and its button's ("Open the Market"). */
export const NO_ANIMALS_WHY = 'Friends come to see your animals, and there are none to see. Bring one home from the Market.';

function emptyAction(g: GameState, money: number, member: NextContext['member']): Ranked | null {
  const tanks = g.tankOrder.map((id) => g.tanks[id]).filter((t): t is Tank => !!t);
  if (!tanks.length) {
    const cheapest = TANK_TIERS.filter((t) => !t.unlock || attempt(() => isUnlocked(g, t.unlock), false)).reduce<number>((m, t) => Math.min(m, t.price), Infinity);
    const base = { key: 'empty:tank', rule: 'empty' as const, where: 'Build › Tanks', sub: 0 };
    if (Number.isFinite(cheapest) && cheapest > money) return { ...base, ...moneyWay(g, `Not enough money for a tank (from ${formatMoney(cheapest)}).`, member) };
    return { ...base, title: NO_TANK_TITLE, why: 'There’s no tank in your aquarium.', to: { kind: 'route', route: { kind: 'panel', panel: 'build', tab: 'tanks' } } };
  }
  const here = new Set(tanks.map((t) => t.id));
  if (Object.values(g.creatures).some((c) => (c.status === 'alive' || c.status === 'listed') && !!c.tankId && here.has(c.tankId))) return null;
  // the cheapest animal in the shop the player could keep (its species open to them, a tank of its water)
  let cheapest = Infinity;
  for (const o of g.market?.stock ?? []) {
    const sp = findSpecies(o.speciesId);
    if (!sp || !attempt(() => isSpeciesAvailable(g, sp.id), false)) continue;
    if (!tanks.some((t) => attempt(() => environmentGate(sp, t).ok, false))) continue;
    cheapest = Math.min(cheapest, o.unitPrice ?? o.price, o.price);
  }
  const base = { key: 'empty:animals', rule: 'empty' as const, where: 'Market', sub: 0 };
  if (Number.isFinite(cheapest) && cheapest > money) return { ...base, ...moneyWay(g, `Not enough money for an animal (from ${formatMoney(cheapest)}).`, member) };
  return { ...base, title: 'Open the Market', why: NO_ANIMALS_WHY, to: { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'shop' } } };
}

// ───────────────────────────── expiring (rule 6) ─────────────────────────────

function expiringActions(g: GameState, spare: number): Ranked[] {
  const out: Ranked[] = [];
  const now = g.clock.hour;
  // bids waiting for an answer on the player's listings (bidsAwaiting's count)
  let bids = 0;
  for (const l of g.market?.listings ?? []) if (l.status === 'active') for (const b of l.bids ?? []) if (b.status === 'open') bids++;
  if (bids > 0)
    out.push({
      key: 'expiring:bids',
      rule: 'expiring',
      where: 'Market › My listings',
      title: bids === 1 ? 'Answer a bid' : `Answer ${bids} bids`,
      why: bids === 1 ? 'A buyer is waiting on one of your listings. Bids don’t wait long.' : 'Buyers are waiting on your listings. Bids don’t wait long.',
      to: { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'listings' } },
      // (bids come first in this rule: they lapse in real minutes, whatever the game clock says)
      sub: -1,
    });
  // the show closing soonest that the player can enter
  const s = g.shows;
  if (s) {
    for (const show of attempt(() => upcomingShows(s), [])) {
      const left = show.deadlineHour - now;
      if (!(left > 0) || left > SHOW_SOON_HOURS) continue;
      if (attempt(() => showClosedReason(g, show), 'closed')) continue;
      if (s.entries.some((e) => e.showId === show.id && e.status === 'entered')) continue;
      if (show.fee > spare) continue;
      const counts = attempt(() => classEligibleCounts(g, show), {} as Record<string, { eligible: number }>);
      if (!Object.values(counts).some((c) => c.eligible > 0)) continue;
      out.push({
        key: `expiring:show:${show.id}`,
        rule: 'expiring',
        where: 'Shows',
        title: `Enter ${show.name}`,
        why: `Entries close ${whenText(show.deadlineHour, now)}.`,
        to: { kind: 'route', route: { kind: 'panel', panel: 'shows', tab: 'upcoming', target: `show:${show.id}` } },
        sub: left,
      });
      break;
    }
  }
  // the Prismatic or rare animal leaving the shop soonest that the player can buy
  let offer: Ranked | null = null;
  for (const o of g.market?.stock ?? []) {
    const left = o.expiresHour - now;
    if (!(left > 0) || left > OFFER_SOON_HOURS) continue;
    if (offer && (left > offer.sub || (left === offer.sub && byKey(`expiring:offer:${o.id}`, offer.key) >= 0))) continue;
    const sp = findSpecies(o.speciesId);
    if (!sp) continue;
    const prism = o.creatures.some(isPrismatic);
    const lead = prism ? null : o.creatures.find((c) => attempt(() => visiblyRare(sp, c), false));
    if (!prism && !lead) continue;
    if (!attempt(() => isSpeciesAvailable(g, sp.id), false)) continue;
    if (Math.min(o.price, o.unitPrice ?? o.price) > spare) continue;
    if (!g.tankOrder.some((id) => !!g.tanks[id] && attempt(() => environmentGate(sp, g.tanks[id]).ok, false))) continue;
    offer = {
      key: `expiring:offer:${o.id}`,
      rule: 'expiring',
      where: 'Market',
      // (the Market dot's own words for it)
      title: prism ? `Prismatic ${lowerName(sp.commonName)} in the shop` : `Rare stock: ${morphDisplayName(sp, lead!.morphName)}`,
      why: `In the shop until ${whenText(o.expiresHour, now)}.`,
      to: { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'shop', target: `offer:${o.id}` } },
      sub: left,
    };
  }
  if (offer) out.push(offer);
  return out;
}

// ───────────────────────────── ready to collect or decide (rule 7) ─────────────────────────────

function readyActions(g: GameState, member: NextContext['member']): Ranked[] {
  const out: Ranked[] = [];
  let sub = 0;
  // quest rewards to claim (Research › Quests: the dock's dot says the same)
  const done = attempt(() => activeQuests(g), []).filter((q) => q.status === 'complete');
  if (done.length)
    out.push({
      key: 'ready:quests',
      rule: 'ready',
      where: 'Research › Quests',
      title: done.length === 1 ? 'Claim your reward' : `Claim ${done.length} rewards`,
      why: done.length === 1 ? `Quest complete: ${done[0].title}.` : `${done.length} quests are complete.`,
      to: { kind: 'route', route: { kind: 'panel', panel: 'research', tab: 'quests' } },
      sub: sub++,
    });
  // show results not seen yet
  const results = unseenShowResults(g);
  if (results > 0)
    out.push({
      key: 'ready:results',
      rule: 'ready',
      where: 'Shows › Results',
      title: 'See your show results',
      why: `${plural(results, 'new show result')}.`,
      to: { kind: 'route', route: { kind: 'panel', panel: 'shows', tab: 'results' } },
      sub: sub++,
    });
  // automation problems (Operations' Problems, as the bell's Automation section words them)
  const desk = g.progress.unlocked.includes('operations_desk');
  const issues = attempt(() => issueViews(g, opsSnapshot(g).problems), []);
  for (const i of issues.slice(0, MAX_PER_SOURCE))
    out.push({
      key: `ready:ops:${i.key}`,
      rule: 'ready',
      where: 'Operations',
      title: i.title,
      why: sentence(i.reason),
      to: { kind: 'route', route: desk ? { kind: 'panel', panel: 'operations', tab: 'overview', target: 'view:issues' } : { kind: 'panel', panel: 'operations', tab: i.tab } },
      sub: sub++,
    });
  // young that need a hand: the clutch card's own warnings (eaten here, no room to grow, hungry)
  let clutches = 0;
  for (const id of g.tankOrder) {
    if (clutches >= MAX_PER_SOURCE) break;
    const tank = g.tanks[id];
    if (!tank) continue;
    const here = Object.values(g.clutches ?? {})
      .filter((c) => c.tankId === id && !c.infertile)
      .sort((a, b) => byKey(a.id, b.id));
    for (const cl of here) {
      if (clutches >= MAX_PER_SOURCE) break;
      const st = attempt(() => clutchStatus(g, cl.id), null);
      if (!st?.warnings.length) continue;
      clutches++;
      out.push({
        key: `ready:young:${cl.id}`,
        rule: 'ready',
        where: tank.name,
        title: 'Look after the young',
        why: sentence(st.warnings[0]),
        to: { kind: 'route', route: { kind: 'panel', panel: 'livestock', tab: 'young' } },
        sub: sub++,
      });
    }
  }
  // a shared shop: money requests this player may answer
  if (member) {
    const asks = attempt(() => asksFor(g, member), []);
    if (asks.length) {
      const a = asks[0];
      out.push({
        key: 'ready:asks',
        rule: 'ready',
        where: 'Money',
        title: asks.length === 1 ? 'Answer a money request' : `Answer ${asks.length} money requests`,
        why: `${a.name} asks for ${formatMoney(a.amount)}${a.note ? `: ${a.note}` : ''}${/[.!?…]$/.test(a.note ?? '') ? '' : '.'}`,
        to: { kind: 'shared' },
        sub: sub++,
      });
    }
  }
  return out;
}

// ───────────────────────────── unlocks and research (rule 8) ─────────────────────────────

function unlockActions(g: GameState, spare: number): Ranked[] {
  const out: Ranked[] = [];
  const up = attempt(() => facilityUpgradeInfo(g), null);
  if (up?.next && up.canUpgrade && up.cost <= spare)
    out.push({
      key: 'unlock:facility',
      rule: 'unlock',
      where: 'Build › Facility',
      title: `Move to ${up.next.name}`,
      why: `${formatMoney(up.cost)} · ${firstSentence(up.next.blurb)}`,
      to: { kind: 'route', route: { kind: 'panel', panel: 'build', tab: 'facility' } },
      sub: 0,
    });
  if (!g.progress.research?.activeId) {
    const views = attempt(() => researchList(g), []);
    const ok = views
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v.status === 'available' && !v.alreadyOwned && v.grantsNew.length > 0 && v.cost > 0 && v.cost <= spare)
      .sort((a, b) => a.v.cost - b.v.cost || a.i - b.i);
    const pick = ok[0]?.v;
    if (pick) {
      const days = Math.max(1, Math.round(pick.def.hours / HOURS_PER_DAY));
      out.push({
        key: `unlock:research:${pick.def.id}`,
        rule: 'unlock',
        where: 'Research',
        title: `Research ${pick.def.name}`,
        why: `${formatMoney(pick.cost)} · ${plural(days, 'day')} · ${firstSentence(pick.def.blurb)}`,
        to: { kind: 'route', route: { kind: 'panel', panel: 'research', tab: 'research', target: `research:${pick.def.id}` } },
        sub: 1,
      });
    }
  }
  return out;
}

// ───────────────────────────── a quest nearly done (rule 9) ─────────────────────────────

/** A quest at least this far along counts as "close to done". */
export const QUEST_NEAR = 0.5;

function questAction(g: GameState): Ranked | null {
  const near = attempt(() => activeQuests(g), [])
    .filter((q) => !q.isTutorial && q.status === 'active' && q.progress >= QUEST_NEAR && q.progress < 1)
    .sort((a, b) => b.progress - a.progress || byKey(a.id, b.id));
  const q = near[0];
  if (!q) return null;
  return {
    key: `quest:${q.id}`,
    rule: 'quest',
    where: 'Research › Quests',
    title: q.title,
    why: q.detail ? sentence(q.detail) : `${Math.floor(q.current)} of ${q.target} done.`,
    to: { kind: 'route', route: { kind: 'panel', panel: 'research', tab: 'quests' } },
    sub: 0,
  };
}

// ───────────────────────────── the ranking ─────────────────────────────

/** The collection: always offered last (feature A's Collection; with nothing else to do, the sheet leads with it). */
export const COLLECT_ACTION: NextAction = {
  key: 'collect',
  rule: 'collect',
  where: 'Encyclopedia',
  title: 'Grow your collection',
  why: 'See which animals and morphs you haven’t found yet.',
  to: { kind: 'address', hash: COLLECTION_ADDRESS },
};

/**
 * Everything worth doing now, best first (the header has the order and each rule). Empty for a showcase world; with
 * nothing else to do, just the collection.
 */
export function nextBestActions(g: GameState | null | undefined, ctx: NextContext = {}): NextAction[] {
  if (!g || g.isShowcase) return [];
  const member = ctx.member ?? null;
  const money = spendable(g, member);
  const all: Ranked[] = [...tankActions(g, money, member)];
  const empty = emptyAction(g, money, member);
  const guide = guideAction(g, ctx);
  let list: Ranked[];
  if (guide) {
    all.push(guide);
    // (the guide's own way to the Market when no animal is left to show is the same thing as rule 3's "Open the
    // Market"; but not as its way to money, when no animal is affordable: that one is still listed)
    const sameAsGuide = empty?.key === 'empty:animals' && guide.to.kind === 'route' && empty.to.kind === 'route' && empty.to.route.kind === 'panel' && empty.to.route.panel === 'market';
    if (empty && !sameAsGuide) all.push(empty);
    list = all.filter((a) => WITH_GUIDE.has(a.rule) && !(a.rule === 'hungry' && feedingStep(guide)));
  } else {
    if (empty) all.push(empty);
    const spare = money * OPTIONAL_SHARE;
    all.push(...expiringActions(g, spare), ...readyActions(g, member), ...unlockActions(g, spare));
    const q = questAction(g);
    if (q) all.push(q);
    all.push({ ...COLLECT_ACTION, sub: 0 });
    list = all;
  }
  list.sort((a, b) => RANK[a.rule] - RANK[b.rule] || a.sub - b.sub || byKey(a.key, b.key));
  return list.map(({ sub: _sub, ...a }) => a);
}

/** Is there anything to do besides the collection? (The sheet's "You’re all caught up" when not.) */
export const nothingUrgent = (list: readonly NextAction[]): boolean => list.every((a) => a.rule === 'collect');
