/**
 * Shows & championships: the show circuit, entering, judging, prizes, titles and trophies. OWNER: lane "shows".
 *
 *   state.ts        lazy init, the circuit's own RNG stream, ids
 *   schedule.ts     rolling calendar (about one show a game day; tiers open progressively)
 *   eligibility.ts  class matching + the humane rules (healthy, settled adults only)
 *   judging.ts      class standards → scores, the judge's card, chances against a tier's field
 *   titles.ts       Champion / Grand Champion, valuation and exhibit hooks (leaf module)
 *
 * stepShows(state, dt, ctx) runs every world sub-step (src/sim/world.ts). It is deterministic and robust to any dt:
 * offline catch-up judges every show that passed (in order) and the calendar only ever schedules forward.
 */
import type { Creature, CreatureRibbon, GameState, Show, ShowEntry, ShowPlacing, ShowTier, ShowsState, Tank, TrophyRecord } from '@/types';
import type { SimContext } from '../context';
import { emitEvent } from '../context';
import type { ActionResult } from '../care';
import { SHOW_CLASS_BY_ID, SHOW_TIERS, SHOW_RULES, PRIZE_SPLIT, PLACE_SHARE, ENTRY_XP_SHARE, SHOWS_KEPT, ENTRIES_KEPT, TROPHIES_KEPT, RIBBONS_KEPT, EXHIBITOR_SURNAMES, EXHIBIT_NAMES, SCAPE_NAMES, type ShowClassDef } from '@/data/shows';
import { earn, spend } from '../economy/finance';
import { addMastery, addReputation, bumpCounter, isUnlocked, evalCond } from '../facility/progression';
import { pushHistory } from '../life/step';
import { ensureShowsState, subRng } from './state';
import { refillCalendar, tierOpen } from './schedule';
import { creatureFitsClass, creatureShowReasons, tankShowReasons, tierAtLeast } from './eligibility';
import { assessCreature, assessTank, buildCard, judgeEye, fieldChances, scoreBand, chanceWord, type EntryAssessment } from './judging';
import { emptyAwards, qualifiedTitles, TITLE_LABEL, titledName } from './titles';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';

export { ensureShowsState } from './state';
export { upcoming as upcomingShows, tierOpen } from './schedule';
export { creatureFitsClass, creatureShowReasons, tankShowReasons, tankClassReasons, pendingEntryFor, livingDecorCounts } from './eligibility';
export { assessCreature, assessTank, fieldChances, scoreBand, chanceWord, biotopeRegion, primeFactor, normCdf, JUDGE_SD } from './judging';
export type { EntryAssessment, ScoredCriterion } from './judging';
export { TITLE_LABEL, TITLE_PREFIX, topTitle, titledName, qualifiedTitles, winsAtOrAbove, totalWins, showValueFactors, showsExhibitBoost, emptyAwards } from './titles';

const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo);
const PLACE_WORD = ['1st', '2nd', '3rd', 'Honourable Mention'];

export function placeWord(rank: number): string {
  if (rank >= 1 && rank <= 4) return PLACE_WORD[rank - 1];
  const s = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return `${rank}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// ───────────────────────────── step ─────────────────────────────

/** Advance the show circuit: judge shows whose time has come, keep the calendar full. */
export function stepShows(state: GameState, dt: number, ctx: SimContext): void {
  if (state.isShowcase) return;
  const s = ensureShowsState(state);
  const end = (Number.isFinite(ctx?.hour) ? ctx.hour : state.clock.hour) + Math.max(0, Number.isFinite(dt) ? dt : 0);
  // judge every show that has reached its judging hour, oldest first (offline catch-up may pass several)
  const due = s.shows.filter((x) => x.status === 'open' && x.judgingHour <= end + 1e-9).sort((a, b) => a.judgingHour - b.judgingHour);
  for (const show of due) {
    try {
      judgeShow(state, s, show);
    } catch (e) {
      // never let one show break the world step
      show.status = 'judged';
      if (typeof console !== 'undefined') console.warn('judgeShow failed', e);
    }
  }
  refillCalendar(state, s, end);
  if (due.length) prune(s);
}

function prune(s: ShowsState): void {
  const judged = s.shows.filter((x) => x.status === 'judged');
  if (judged.length > SHOWS_KEPT) {
    const drop = new Set(judged.sort((a, b) => a.judgingHour - b.judgingHour).slice(0, judged.length - SHOWS_KEPT).map((x) => x.id));
    s.shows = s.shows.filter((x) => !drop.has(x.id));
  }
  const done = s.entries.filter((e) => e.status !== 'entered');
  if (done.length > ENTRIES_KEPT) {
    const drop = new Set(done.slice(0, done.length - ENTRIES_KEPT).map((e) => e.id));
    s.entries = s.entries.filter((e) => !drop.has(e.id));
  }
  // over the cap, the oldest minor rosettes go first — cups, bowls, plaques and wins stay on the shelf
  while (s.trophies.length > TROPHIES_KEPT) {
    let i = s.trophies.findIndex((t) => t.kind === 'rosette' && t.place > 1 && !t.bestInShow);
    if (i < 0) i = s.trophies.findIndex((t) => t.kind === 'rosette' && !t.bestInShow);
    s.trophies.splice(Math.max(0, i), 1);
  }
}

// ───────────────────────────── entering ─────────────────────────────

export interface EnterResult extends ActionResult {
  entryId?: string;
}

/** Why the player can't enter this show at all right now (tier locked, entries closed, entry limit…). */
export function showClosedReason(state: GameState, show: Show): string | null {
  const tier = SHOW_TIERS[show.tier];
  if (show.status !== 'open') return 'This show has been judged.';
  if (!isUnlocked(state, 'shows')) return 'Shows open once you finish the guide (or reach 20 reputation).';
  if (!tierOpen(state, show.tier)) return `${tier.name} shows are locked — ${UNLOCK_RULE_BY_KEY[tier.unlockKey]?.hint ?? 'keep growing your reputation.'}`;
  if (state.clock.hour >= show.deadlineHour) return 'Entries have closed — the judges have the list.';
  const mine = (state.shows?.entries ?? []).filter((e) => e.showId === show.id && e.status === 'entered').length;
  if (mine >= tier.maxEntries) return `You have the most entries allowed (${tier.maxEntries}) in this show.`;
  return null;
}

/** Enter a creature (livestock class) or a tank (aquascape class) in one class of a show. */
export function enterShow(state: GameState, showId: string, classId: string, subjectId: string): EnterResult {
  const s = ensureShowsState(state);
  const show = s.shows.find((x) => x.id === showId);
  if (!show) return { ok: false, message: 'That show is no longer on the calendar.' };
  const closed = showClosedReason(state, show);
  if (closed) return { ok: false, message: closed };
  const cls = show.classes.find((c) => c.classId === classId);
  const def = SHOW_CLASS_BY_ID[classId];
  if (!cls || !def) return { ok: false, message: 'That class isn’t offered at this show.' };
  if (def.requires && !isUnlocked(state, def.requires)) return { ok: false, message: 'Aquascape classes open with Aquascape Awards (research, or aquascape a tank yourself to beauty 85).' };
  if (s.entries.some((e) => e.showId === showId && e.subjectId === subjectId && e.status === 'entered')) return { ok: false, message: 'Already entered in this show.' };
  let name: string;
  let speciesId: string | undefined;
  if (def.kind === 'livestock') {
    const c = state.creatures[subjectId];
    if (!c) return { ok: false, message: 'That animal could not be found.' };
    if (!creatureFitsClass(def, c)) return { ok: false, message: `${c.name} doesn’t belong in ${def.short}.` };
    const reasons = creatureShowReasons(state, c);
    if (reasons.length) return { ok: false, message: `${c.name} can’t go: ${reasons[0].charAt(0).toLowerCase()}${reasons[0].slice(1)}.` };
    name = c.name;
    speciesId = c.speciesId;
  } else {
    const t = state.tanks[subjectId];
    if (!t) return { ok: false, message: 'That tank could not be found.' };
    const reasons = tankShowReasons(state, t, def);
    if (reasons.length) return { ok: false, message: `${t.name} isn’t ready: ${reasons[0].charAt(0).toLowerCase()}${reasons[0].slice(1)}.` };
    name = t.name;
  }
  if (!spend(state, show.fee, 'other', `Show entry fee — ${show.name}`)) return { ok: false, message: `The entry fee is $${show.fee} — not enough money right now.` };
  s.seq += 1;
  const entry: ShowEntry = { id: `ent-${s.seq.toString(36)}`, showId, classId, kind: def.kind === 'livestock' ? 'creature' : 'tank', subjectId, name, speciesId, showName: show.name, tier: show.tier, fee: show.fee, enteredHour: state.clock.hour, status: 'entered' };
  s.entries.push(entry);
  bumpCounter(state, 'show_entries');
  const what = def.kind === 'livestock' ? `${name} is entered in ${def.short}` : `${name} is entered in ${def.short} — the judges will visit on show day`;
  return { ok: true, message: `${what} at ${show.name}. Good luck!`, entryId: entry.id };
}

/** Withdraw a pending entry before entries close (fee refunded). */
export function withdrawEntry(state: GameState, entryId: string): ActionResult {
  const s = ensureShowsState(state);
  const e = s.entries.find((x) => x.id === entryId);
  if (!e || e.status !== 'entered') return { ok: false, message: 'That entry isn’t pending.' };
  const show = s.shows.find((x) => x.id === e.showId);
  if (show && state.clock.hour >= show.deadlineHour) return { ok: false, message: 'Entries have closed — the judges have the list.' };
  e.status = 'withdrawn';
  e.note = 'Withdrawn before entries closed — fee refunded.';
  if (e.fee > 0) earn(state, e.fee, 'other', `Show fee refund — ${show?.name ?? 'show'}`);
  return { ok: true, message: `${e.name} withdrawn — fee refunded.` };
}

/** UI: mark the Results tab as read. */
export function markShowResultsSeen(state: GameState): void {
  const s = ensureShowsState(state);
  s.resultsSeenHour = state.clock.hour;
}

// ───────────────────────────── predictions (UI) ─────────────────────────────

export interface EntryCandidate {
  kind: 'creature' | 'tank';
  id: string;
  name: string;
  eligible: boolean;
  reasons: string[];
  /** Expected score before the judge's eye (exact numbers are shown only with the genetics lab). */
  expected: number;
  band: 'Ordinary' | 'Promising' | 'Exceptional' | 'Remarkable';
  chances: { win: number; ribbon: number };
  outlook: string;
  assessment: EntryAssessment;
}

/** Every animal (or tank) that belongs in this class, eligible first, best first — with why not, when not. */
export function classCandidates(state: GameState, show: Show, classId: string): EntryCandidate[] {
  const def = SHOW_CLASS_BY_ID[classId];
  const cls = show.classes.find((c) => c.classId === classId);
  if (!def || !cls) return [];
  const out: EntryCandidate[] = [];
  const push = (kind: 'creature' | 'tank', id: string, name: string, reasons: string[], a: EntryAssessment) => {
    const chances = fieldChances(show.tier, a.expected, cls.field);
    out.push({ kind, id, name, eligible: reasons.length === 0, reasons, expected: round1(a.expected), band: scoreBand(a.expected), chances, outlook: chanceWord(chances), assessment: a });
  };
  if (def.kind === 'livestock') {
    for (const c of Object.values(state.creatures)) {
      if (c.status !== 'alive' && c.status !== 'listed') continue;
      if (!creatureFitsClass(def, c)) continue;
      let reasons = creatureShowReasons(state, c);
      if (state.shows?.entries.some((e) => e.showId === show.id && e.subjectId === c.id && e.status === 'entered')) reasons = ['Entered in this show', ...reasons.filter((r) => !r.startsWith('Already entered in'))];
      push('creature', c.id, c.name, [...new Set(reasons)], assessCreature(state, c, def));
    }
  } else {
    for (const id of state.tankOrder) {
      const t = state.tanks[id];
      if (!t) continue;
      let reasons = tankShowReasons(state, t, def);
      if (state.shows?.entries.some((e) => e.showId === show.id && e.subjectId === t.id && e.status === 'entered')) reasons = ['Entered in this show', ...reasons.filter((r) => !r.startsWith('Already entered in'))];
      push('tank', t.id, t.name, [...new Set(reasons)], assessTank(state, t, def));
    }
  }
  return out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.expected - a.expected);
}

/**
 * How many of the player's animals / tanks could enter each class of a show today (eligibility only — no scoring, so
 * it stays cheap enough for every show card on every refresh).
 */
export function classEligibleCounts(state: GameState, show: Show): Record<string, { eligible: number; fitting: number }> {
  const out: Record<string, { eligible: number; fitting: number }> = {};
  const alive = Object.values(state.creatures).filter((c) => c.status === 'alive' || c.status === 'listed');
  const entered = new Set((state.shows?.entries ?? []).filter((e) => e.showId === show.id && e.status === 'entered').map((e) => e.subjectId));
  for (const cls of show.classes) {
    const def = SHOW_CLASS_BY_ID[cls.classId];
    if (!def) continue;
    let eligible = 0;
    let fitting = 0;
    if (def.kind === 'livestock') {
      for (const c of alive) {
        if (!creatureFitsClass(def, c)) continue;
        fitting++;
        if (!entered.has(c.id) && creatureShowReasons(state, c).length === 0) eligible++;
      }
    } else {
      for (const id of state.tankOrder) {
        const t = state.tanks[id];
        if (!t) continue;
        fitting++;
        if (!entered.has(t.id) && tankShowReasons(state, t, def).length === 0) eligible++;
      }
    }
    out[cls.classId] = { eligible, fitting };
  }
  return out;
}

/** What unlocks a locked show tier (for locked cards), with the player's numbers. */
export function tierLockHint(state: GameState, tier: ShowTier): string {
  const rule = UNLOCK_RULE_BY_KEY[SHOW_TIERS[tier].unlockKey];
  if (!rule) return 'Keep growing your aquarium.';
  const cache = {};
  const missing: string[] = [];
  for (const c of rule.when) {
    const st = evalCond(state, c, cache);
    if (st.met) continue;
    if (c.type === 'reputation') missing.push(`${st.target} reputation (you have ${Math.floor(st.current)})`);
    else if (c.type === 'unlocked') missing.push(`${SHOW_TIERS[SHOW_TIER_BY_KEY[c.key] ?? 'club']?.name ?? 'earlier'} shows first`);
    else if (c.type === 'facility') missing.push(`${/^[aeiou]/i.test(st.label) ? 'an' : 'a'} ${st.label.toLowerCase()}`);
    else missing.push(st.label.charAt(0).toLowerCase() + st.label.slice(1));
  }
  return missing.length ? `Needs ${missing.join(' and ')}.` : rule.hint;
}

const SHOW_TIER_BY_KEY: Record<string, ShowTier> = Object.fromEntries((Object.keys(SHOW_TIERS) as ShowTier[]).map((t) => [SHOW_TIERS[t].unlockKey, t]));

// ───────────────────────────── judging ─────────────────────────────

function npcName(rng: ReturnType<typeof subRng>, def: ShowClassDef): { name: string; exhibitor: string } {
  const exhibitor = `${String.fromCharCode(65 + Math.floor(rng.next() * 26))}. ${rng.pick(EXHIBITOR_SURNAMES)}`;
  return { name: rng.pick(def.kind === 'aquascape' ? SCAPE_NAMES : EXHIBIT_NAMES), exhibitor };
}

/** Show-day welfare check: an entry that is no longer fit to show is scratched (fee refunded). */
function scratchReason(state: GameState, e: ShowEntry): string | null {
  if (e.kind === 'creature') {
    const c = state.creatures[e.subjectId];
    if (!c || c.status === 'dead') return `${e.name} passed away before show day.`;
    if (c.status === 'sold') return `${e.name} was sold before show day.`;
    const r = creatureShowReasons(state, c, { forJudging: true });
    if (r.length) return `${e.name} stayed home on show day — ${r[0].charAt(0).toLowerCase()}${r[0].slice(1)}.`;
    return null;
  }
  const t = state.tanks[e.subjectId];
  if (!t) return `${e.name} is no longer yours.`;
  const def = SHOW_CLASS_BY_ID[e.classId];
  const r = tankShowReasons(state, t, def ?? null, { forJudging: true });
  if (r.length) return `The judges skipped ${e.name} — ${r[0].charAt(0).toLowerCase()}${r[0].slice(1)}.`;
  return null;
}

function judgeShow(state: GameState, s: ShowsState, show: Show): void {
  const tier = SHOW_TIERS[show.tier];
  const mine = s.entries.filter((e) => e.showId === show.id && e.status === 'entered');
  const hour = show.judgingHour;
  // 1. show-day welfare check
  for (const e of mine) {
    const why = scratchReason(state, e);
    if (!why) continue;
    e.status = 'scratched';
    e.note = `${why} The club refunded the fee.`;
    e.judgedHour = hour;
    if (e.fee > 0) earn(state, e.fee, 'other', `Show fee refund — ${show.name}`);
  }
  const live = mine.filter((e) => e.status === 'entered');
  const eyeRng = subRng(show.seed, 'judge');
  const winners: (ShowPlacing & { classId: string })[] = [];
  // 2. judge each class: the other exhibitors come from the tier's field (fixed by the show's seed)
  show.classes.forEach((cls, ci) => {
    const def = SHOW_CLASS_BY_ID[cls.classId];
    if (!def) return;
    const fieldRng = subRng(show.seed, `field:${ci}:${cls.classId}`);
    const all: ShowPlacing[] = [];
    for (let i = 0; i < cls.field; i++) {
      const n = npcName(fieldRng, def);
      all.push({ place: 0, name: n.name, exhibitor: n.exhibitor, score: round1(clamp(tier.npcMean + fieldRng.gauss() * tier.npcSd, 18, 99.4)) });
    }
    for (const e of live.filter((x) => x.classId === cls.classId)) {
      let a: EntryAssessment;
      if (e.kind === 'creature') a = assessCreature(state, state.creatures[e.subjectId], def);
      else a = assessTank(state, state.tanks[e.subjectId], def);
      const eye = judgeEye(eyeRng);
      e.score = round1(clamp(a.expected + eye, 1, 100));
      e.card = buildCard(a, show.judge, e.score - round1(a.criteria.reduce((acc, c) => acc + c.points, 0)));
      all.push({ place: 0, name: e.kind === 'creature' ? titledName(state.creatures[e.subjectId]) : e.name, exhibitor: state.shopName, score: e.score, mine: true, entryId: e.id });
    }
    // ties: the player's entry is listed after an equal rival (judges favour the incumbent), then by name
    all.sort((a, b) => b.score - a.score || Number(!!a.mine) - Number(!!b.mine) || a.name.localeCompare(b.name));
    all.forEach((p, i) => (p.place = i + 1));
    cls.entrants = all.length;
    cls.results = all.filter((p) => p.place <= 4 || p.mine).slice(0, 8);
    if (all[0]) winners.push({ ...all[0], classId: cls.classId });
    for (const p of all) {
      if (!p.mine || !p.entryId) continue;
      const e = s.entries.find((x) => x.id === p.entryId);
      if (!e) continue;
      e.rank = p.place;
      e.of = all.length;
      if (p.place <= 4) e.ribbon = p.place as 1 | 2 | 3 | 4;
    }
  });
  // 3. Best in Show: the highest-scoring class winner across the show
  winners.sort((a, b) => b.score - a.score || Number(!!a.mine) - Number(!!b.mine));
  show.bestInShow = winners[0];
  show.status = 'judged';
  // 4. prizes, reputation, mastery, awards, trophies
  const avgPurse = show.classes.reduce((a, c) => a + c.purse, 0) / Math.max(1, show.classes.length);
  const lines: string[] = [];
  let anyRibbon = false;
  let focus: ShowEntry | null = null;
  for (const e of live) {
    e.status = 'judged';
    e.judgedHour = hour;
    const def = SHOW_CLASS_BY_ID[e.classId];
    const cls = show.classes.find((c) => c.classId === e.classId);
    if (!def || !cls || e.rank === undefined) continue;
    e.bestInShow = !!show.bestInShow?.mine && show.bestInShow.entryId === e.id;
    const rank = e.rank;
    const prize = rank <= 3 ? Math.round(cls.purse * PRIZE_SPLIT[rank - 1]) : 0;
    const bisPrize = e.bestInShow ? Math.round(avgPurse * tier.bisFrac) : 0;
    e.prize = prize + bisPrize;
    if (e.prize > 0) earn(state, e.prize, 'award', `Show prize — ${def.short}, ${show.name}`);
    const rep = (rank <= 4 ? tier.rep * PLACE_SHARE[rank - 1] : 0) + (e.bestInShow ? tier.rep : 0);
    e.reputation = round1(rep);
    if (rep > 0) addReputation(state, rep, '');
    const xp = tier.xp * (rank <= 4 ? PLACE_SHARE[rank - 1] : ENTRY_XP_SHARE) + (e.bestInShow ? tier.xp * 0.5 : 0);
    addMastery(state, def.kind === 'livestock' ? 'breeding' : 'aquascaping', xp * 0.7);
    addMastery(state, 'exhibition', xp * 0.3);
    s.stats.entered += 1;
    s.stats.prize += e.prize;
    if (rank <= 4) {
      s.stats.placings += 1;
      bumpCounter(state, 'show_placings');
      if (rank <= 3) bumpCounter(state, 'show_ribbons');
      anyRibbon = true;
      if (!focus || rank < (focus.rank ?? 99)) focus = e;
    }
    if (rank === 1) {
      s.stats.wins += 1;
      bumpCounter(state, 'show_class_wins');
      if (def.kind === 'aquascape' && tierAtLeast(show.tier, 'national')) bumpCounter(state, 'show_scape_top_wins');
    }
    if (rank <= 4 && show.tier === 'international') bumpCounter(state, 'show_intl_placings');
    if (e.bestInShow) {
      s.stats.bestInShow += 1;
      bumpCounter(state, 'show_bis');
    }
    if (rank <= 4) addTrophy(s, show, def, e, rank);
    if (e.kind === 'creature') recordCreature(state, show, def, e);
    else recordTank(s, show, def, e);
    const what = rank <= 4 ? `${e.bestInShow ? 'won Best in Show and ' : ''}${rank === 1 ? `won ${def.short}` : `took ${placeWord(rank)} in ${def.short}`}` : `was ${placeWord(rank)} of ${e.of} in ${def.short}`;
    lines.push(`${e.name} ${what}${e.prize ? ` ($${e.prize.toLocaleString('en-US')})` : ''}`);
  }
  if (live.length) {
    // lane:w2-ui (copy) — lead with the placing: a one-line toast used to show only the long show name
    const text = anyRibbon ? `${lines.join('; ')} at ${show.name}. The judge’s cards are in Shows.` : `${lines.join('; ')} at ${show.name} — no ribbons this time. The judge’s cards explain why.`;
    const sub = focus && focus.kind === 'creature' ? state.creatures[focus.subjectId] : null;
    emitEvent(state, { kind: anyRibbon ? 'celebrate' : 'info', text, toast: true, creatureId: sub?.id, tankId: sub?.tankId ?? (focus?.kind === 'tank' ? focus.subjectId : undefined) }, hour);
  }
  const scratched = mine.filter((e) => e.status === 'scratched');
  if (scratched.length) emitEvent(state, { kind: 'info', text: scratched.map((e) => e.note).join(' '), toast: live.length === 0 }, hour);
}

function trophyKind(show: Show, def: ShowClassDef, rank: number, bis: boolean): TrophyRecord['kind'] {
  if (bis) return 'cup';
  if (rank !== 1 || show.tier === 'club') return 'rosette';
  if (def.kind === 'aquascape') return show.tier === 'regional' ? 'plaque' : 'bowl';
  return 'cup';
}

function addTrophy(s: ShowsState, show: Show, def: ShowClassDef, e: ShowEntry, rank: number): void {
  s.seq += 1;
  s.trophies.push({
    id: `tro-${s.seq.toString(36)}`,
    kind: trophyKind(show, def, rank, !!e.bestInShow),
    tier: show.tier,
    place: rank as 1 | 2 | 3 | 4,
    bestInShow: e.bestInShow || undefined,
    showName: show.name,
    className: def.short,
    subject: e.name,
    hour: show.judgingHour,
  });
}

function recordTank(s: ShowsState, show: Show, def: ShowClassDef, e: ShowEntry): void {
  const rank = e.rank ?? 99;
  const cur = (s.tankAwards[e.subjectId] ??= { wins: 0, placings: 0, lastHour: show.judgingHour });
  cur.lastHour = show.judgingHour;
  if (rank <= 4) cur.placings += 1;
  if (rank === 1) {
    cur.wins += 1;
    const order: ShowTier[] = ['club', 'regional', 'national', 'international'];
    if (!cur.bestTier || order.indexOf(show.tier) >= order.indexOf(cur.bestTier)) {
      cur.bestTier = show.tier;
      cur.best = `${def.short} — 1st, ${SHOW_TIERS[show.tier].name}`;
    }
  }
}

function recordCreature(state: GameState, show: Show, def: ShowClassDef, e: ShowEntry): void {
  const c = state.creatures[e.subjectId];
  if (!c) return;
  const a = (c.awards ??= emptyAwards());
  a.ribbons ??= [];
  a.wins ??= {};
  a.titles ??= [];
  a.shown = (a.shown ?? 0) + 1;
  a.lastShowHour = show.judgingHour;
  const rank = e.rank ?? 99;
  if (rank <= 4) {
    a.placings = (a.placings ?? 0) + 1;
    const r: CreatureRibbon = { hour: show.judgingHour, showId: show.id, showName: show.name, tier: show.tier, classId: def.id, className: def.short, place: rank as 1 | 2 | 3 | 4, bestInShow: e.bestInShow || undefined, score: e.score ?? 0 };
    a.ribbons.push(r);
    if (a.ribbons.length > RIBBONS_KEPT) {
      // keep the best (wins, Best in Show) when trimming: drop the oldest non-win first
      const idx = a.ribbons.findIndex((x) => x.place !== 1 && !x.bestInShow);
      a.ribbons.splice(idx >= 0 ? idx : 0, 1);
    }
  }
  if (rank === 1) a.wins[show.tier] = (a.wins[show.tier] ?? 0) + 1;
  if (e.bestInShow) a.bestInShow = (a.bestInShow ?? 0) + 1;
  // history (the creature card's timeline)
  const text = rank <= 4 ? `${e.bestInShow ? 'Best in Show and ' : ''}${placeWord(rank)} in ${def.short} at ${show.name} (${e.score}).` : `Shown in ${def.short} at ${show.name} — ${placeWord(rank)} of ${e.of}.`;
  pushHistory(c, { hour: show.judgingHour, kind: rank <= 4 ? 'milestone' : 'note', text });
  // home by evening, a little unsettled from the day out — softened by a strong bond with its keeper
  const bond = clamp(c.life?.bond ?? 0, 0, 100);
  const temper = clamp(c.genome?.potentials?.temperament ?? 50, 0, 100);
  c.stats.stress = clamp(c.stats.stress + SHOW_RULES.travelStress * (1 - bond / 200) * (1.15 - temper / 300), 0, 100);
  // titles
  const earned = qualifiedTitles(a).filter((t) => !a.titles.includes(t));
  for (const t of earned) {
    a.titles.push(t);
    e.titles = [...(e.titles ?? []), t];
    bumpCounter(state, t === 'grand_champion' ? 'show_grand_champions' : 'show_champions');
    const why = t === 'grand_champion' ? 'three class wins at National or higher' : 'three class wins at Regional or higher';
    pushHistory(c, { hour: show.judgingHour, kind: 'milestone', text: `Became a ${TITLE_LABEL[t]} — ${why}.` });
    emitEvent(state, { kind: 'celebrate', text: `${c.name} is now a ${TITLE_LABEL[t]} — ${why}!`, toast: true, creatureId: c.id, tankId: c.tankId ?? undefined }, show.judgingHour);
  }
}

/** Latest judged entries (newest first) — for the Results tab and toasts. */
export function recentResults(s: ShowsState | undefined, n = 30): ShowEntry[] {
  if (!s) return [];
  // newest first; within one show, the best placing first (so the opened card is the proudest one)
  return s.entries.filter((e) => e.status === 'judged' || e.status === 'scratched').sort((a, b) => (b.judgedHour ?? b.enteredHour) - (a.judgedHour ?? a.enteredHour) || (a.rank ?? 99) - (b.rank ?? 99)).slice(0, n);
}

/** Count of results the player hasn't looked at yet (Results tab / dock badge). */
export function unseenResults(state: GameState): number {
  const s = state.shows;
  if (!s) return 0;
  const seen = s.resultsSeenHour ?? -Infinity;
  return s.entries.filter((e) => (e.status === 'judged' || e.status === 'scratched') && (e.judgedHour ?? -Infinity) > seen).length;
}

/** The subject behind an entry (creature or tank), if it still exists. */
export function entrySubject(state: GameState, e: ShowEntry): Creature | Tank | null {
  return e.kind === 'creature' ? (state.creatures[e.subjectId] ?? null) : (state.tanks[e.subjectId] ?? null);
}

