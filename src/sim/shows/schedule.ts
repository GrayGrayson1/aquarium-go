/**
 * The show calendar: a rolling, deterministic schedule of upcoming shows (about one a game day, judged in the
 * afternoon), with 3–5 visible at any time. OWNER: lane "shows".
 *
 * Tiers open progressively (Club → Regional → National → International). Once a tier is open its shows join the
 * rotation; the next locked tier occasionally appears as a teaser so the player can see what they're working
 * towards. Classes favour the species the player keeps (and can buy), plus a few aspirational ones.
 */
import type { GameState, Show, ShowClass, ShowTier, ShowsState } from '@/types';
import { SHOW_CLASSES, SHOW_GAP_H, SHOW_HOSTS, SHOW_JUDGES, SHOW_TIERS, SHOW_TIER_ORDER, SHOWS_VISIBLE, CLUB_SHOW_TITLES, JUDGING_HOUR, type ShowClassDef } from '@/data/shows';
import { findSpecies } from '@/data/species';
import { isSpeciesAvailable } from '../economy/shop';
import { creatureFitsClass, tankFitsClass, tierAtLeast } from './eligibility';
import { showsId, showsRng } from './state';
import type { Rng } from '../rng';
import { HOURS_PER_DAY } from '../time';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

export const tierOpen = (state: GameState, tier: ShowTier) => state.progress.unlocked.includes(SHOW_TIERS[tier].unlockKey);

/** Upcoming (not yet judged) shows, soonest first. */
export function upcoming(s: ShowsState): Show[] {
  return s.shows.filter((x) => x.status === 'open').sort((a, b) => a.judgingHour - b.judgingHour);
}

/** How strongly the calendar should feature a class for this player right now. */
function classAffinity(state: GameState, def: ShowClassDef): number {
  if (def.kind === 'aquascape') {
    if (!state.progress.unlocked.includes(def.requires ?? 'photo_contests')) return 0.12;
    const fits = state.tankOrder.some((id) => {
      const t = state.tanks[id];
      return !!t && tankFitsClass(state, def, t);
    });
    return fits ? 2.6 : 0.9;
  }
  let adults = 0;
  let young = 0;
  for (const c of Object.values(state.creatures)) {
    if (c.status !== 'alive' && c.status !== 'listed') continue;
    if (!creatureFitsClass(def, c)) continue;
    if (c.lifeStage === 'adult' || c.lifeStage === 'elder') adults++;
    else young++;
  }
  const openK = def.open ? 0.75 : 1;
  if (adults > 0) return (3 + Math.min(2, adults * 0.2)) * openK;
  if (young > 0) return 2 * openK;
  if (def.species?.some((id) => findSpecies(id) && isSpeciesAvailable(state, id))) return 1;
  return def.open ? 0.8 : 0.3;
}

function pickTier(state: GameState, s: ShowsState, rng: Rng): ShowTier {
  const open = SHOW_TIER_ORDER.filter((t) => t === 'club' || tierOpen(state, t));
  const items: { tier: ShowTier; w: number }[] = open.map((t) => ({ tier: t, w: SHOW_TIERS[t].weight }));
  const up = upcoming(s);
  // never two International (or three National) shows on the calendar at once
  const count = (t: ShowTier) => up.filter((x) => x.tier === t).length;
  for (const it of items) {
    if (it.tier === 'international' && count('international') >= 1) it.w = 0;
    if (it.tier === 'national' && count('national') >= 2) it.w = 0;
  }
  // a teaser for the next tier once shows are open (never more than one on the calendar)
  const locked = SHOW_TIER_ORDER.find((t) => t !== 'club' && !tierOpen(state, t));
  if (locked && tierOpen(state, 'club') && !up.some((x) => !tierOpen(state, x.tier))) items.push({ tier: locked, w: 0.22 });
  const pick = rng.weighted(items, (i) => i.w);
  return pick?.tier ?? 'club';
}

function pickClasses(state: GameState, tier: ShowTier, rng: Rng): ShowClassDef[] {
  const t = SHOW_TIERS[tier];
  const n = rng.int(t.classes[0], t.classes[1]);
  const pool = SHOW_CLASSES.filter((c) => tierAtLeast(tier, c.minTier)).map((def) => ({ def, w: classAffinity(state, def) }));
  const out: ShowClassDef[] = [];
  // Club shows always offer at least one class the player can enter today, if there is one.
  const owned = pool.filter((p) => p.w >= 2.2);
  if (tier === 'club' && owned.length) {
    const first = rng.weighted(owned, (p) => p.w);
    out.push(first.def);
  }
  let aquascapes = out.filter((d) => d.kind === 'aquascape').length;
  while (out.length < n) {
    const left = pool.filter((p) => !out.includes(p.def) && !(p.def.kind === 'aquascape' && aquascapes >= 2));
    if (!left.length) break;
    const p = rng.weighted(left, (x) => x.w);
    out.push(p.def);
    if (p.def.kind === 'aquascape') aquascapes++;
  }
  // stable, readable order: livestock first, then aquascapes (schedule order within each)
  return [...out.filter((d) => d.kind === 'livestock'), ...out.filter((d) => d.kind === 'aquascape')];
}

const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step);

function makeShow(state: GameState, s: ShowsState, rng: Rng, after: number): Show {
  const tier = pickTier(state, s, rng);
  const t = SHOW_TIERS[tier];
  // judged in the afternoon of a day roughly SHOW_GAP_H after the previous show
  const target = after + rng.range(SHOW_GAP_H[0], SHOW_GAP_H[1]);
  const day = Math.floor(target / HOURS_PER_DAY);
  let judgingHour = day * HOURS_PER_DAY + rng.range(JUDGING_HOUR[0], JUDGING_HOUR[1]);
  if (judgingHour < after + SHOW_GAP_H[0] * 0.6) judgingHour += HOURS_PER_DAY;
  judgingHour = Math.round(judgingHour * 4) / 4;
  const defs = pickClasses(state, tier, rng);
  const classes: ShowClass[] = defs.map((def) => ({
    classId: def.id,
    purse: roundTo(rng.range(t.purse[0], t.purse[1]), t.step),
    field: rng.int(t.field[0], t.field[1]),
  }));
  const avgPurse = classes.reduce((a, c) => a + c.purse, 0) / Math.max(1, classes.length);
  const feeStep = Math.max(1, t.step / 5);
  const fee = roundTo(avgPurse * rng.range(t.feeFrac[0], t.feeFrac[1]), feeStep);
  const hosts = SHOW_HOSTS[tier];
  const lastHost = [...s.shows].reverse().find((x) => x.tier === tier)?.host;
  const host = rng.pick(hosts.filter((h) => h !== lastHost).length ? hosts.filter((h) => h !== lastHost) : hosts);
  const serial = s.seq + 1;
  const name = tier === 'club' ? `${host} ${rng.pick(CLUB_SHOW_TITLES)}` : `The ${ordinal(6 + ((serial * 7 + hosts.indexOf(host) * 13) % 38))} ${host}`;
  const id = showsId(s, 'show');
  return {
    id,
    serial,
    name,
    host,
    tier,
    classes,
    fee,
    announcedHour: state.clock.hour,
    deadlineHour: judgingHour - t.closeBeforeH,
    judgingHour,
    judge: rng.pick(SHOW_JUDGES),
    status: 'open',
    seed: rng.int(1, 0x7fffffff),
  };
}

/** Keep SHOWS_VISIBLE upcoming shows on the calendar. Shows are only ever scheduled after `now`. */
export function refillCalendar(state: GameState, s: ShowsState, now: number): void {
  let guard = 0;
  while (upcoming(s).filter((x) => x.judgingHour > now).length < SHOWS_VISIBLE && guard++ < SHOWS_VISIBLE + 2) {
    const rng = showsRng(s);
    const after = Math.max(s.cursorHour, now);
    const show = makeShow(state, s, rng, after);
    s.shows.push(show);
    s.cursorHour = show.judgingHour;
  }
}
