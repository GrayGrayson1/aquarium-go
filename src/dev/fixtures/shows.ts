/**
 * Shows fixtures (registered in ./index.ts). OWNER: lane "shows".
 *   shows-demo   the hobby room with the show circuit open: judged results with judge's cards, a pending entry,
 *                a titled starter and a trophy shelf on the wall
 *   shows-hall   the big_facility grand hall with a full trophy cabinet and a Grand Champion on display
 * Results come from real judging (src/sim/shows); a few extra trophies are added so the shelf shows every kind.
 */
import type { Creature, GameState, Show, ShowTier, TrophyRecord } from '@/types';
import { advanceWorld, refreshTankCache } from '@/sim/world';
import { ensureShowsState, enterShow, classCandidates, creatureFitsClass, emptyAwards } from '@/sim/shows';
import { SHOW_CLASSES, SHOW_TIERS } from '@/data/shows';
import { scapeEditsKey } from '@/sim/facility';
import { FACILITY_FIXTURES } from './facility';
import { CORE_FIXTURES } from './core-fixtures';

function openCircuit(g: GameState, tiers: ShowTier[], extra: string[] = []): void {
  for (const t of tiers) if (!g.progress.unlocked.includes(SHOW_TIERS[t].unlockKey)) g.progress.unlocked.push(SHOW_TIERS[t].unlockKey);
  for (const k of extra) if (!g.progress.unlocked.includes(k)) g.progress.unlocked.push(k);
}

/** Healthy, calm, bonded, settled — ready for the bench. */
function groom(c: Creature, bond = 60): void {
  c.stats.health = 100;
  c.stats.stress = 10;
  c.stats.hunger = 22;
  c.illness = undefined;
  c.life = { ...(c.life ?? {}), bond: Math.max(bond, c.life?.bond ?? 0), conditioning: 55, injury: 0, settledSinceHour: undefined };
  c.acquiredHour = Math.min(c.acquiredHour, -200);
  if (c.repro) c.repro.stage = 'idle';
  if (c.awards) c.awards.lastShowHour = undefined;
}

function handShow(g: GameState, tier: ShowTier, classIds: string[], inHours: number, name: string): Show {
  const s = ensureShowsState(g);
  s.seq += 1;
  const judgingHour = g.clock.hour + inHours;
  const show: Show = {
    id: `show-${s.seq.toString(36)}`,
    serial: s.seq,
    name,
    host: name,
    tier,
    classes: classIds.map((classId, i) => ({ classId, purse: Math.round((SHOW_TIERS[tier].purse[0] + SHOW_TIERS[tier].purse[1]) / 2 / SHOW_TIERS[tier].step + i) * SHOW_TIERS[tier].step, field: SHOW_TIERS[tier].field[0] + 1 })),
    fee: tier === 'club' ? 12 : 60,
    announcedHour: g.clock.hour,
    deadlineHour: judgingHour - SHOW_TIERS[tier].closeBeforeH,
    judgingHour,
    judge: tier === 'club' ? 'E. Harlow' : 'R. Takahashi',
    status: 'open',
    seed: 90210 + s.seq * 31,
  };
  s.shows.push(show);
  return show;
}

/** The class an animal shows best in (highest expected score). */
function bestClassFor(g: GameState, show: Show, c: Creature): string | null {
  let best: { id: string; e: number } | null = null;
  for (const cl of show.classes) {
    const x = classCandidates(g, show, cl.classId).find((k) => k.id === c.id && k.eligible);
    if (x && (!best || x.expected > best.e)) best = { id: cl.classId, e: x.expected };
  }
  return best?.id ?? null;
}

function trophy(g: GameState, t: Omit<TrophyRecord, 'id' | 'hour'>, hoursAgo: number): void {
  const s = ensureShowsState(g);
  s.seq += 1;
  s.trophies.push({ ...t, id: `tro-${s.seq.toString(36)}`, hour: g.clock.hour - hoursAgo });
}

function classesFor(c: Creature): string[] {
  return SHOW_CLASSES.filter((d) => creatureFitsClass(d, c)).map((d) => d.id);
}

export function buildShowsDemo(): GameState {
  const g = FACILITY_FIXTURES.facility_hobby();
  g.finance.money = Math.max(g.finance.money, 900);
  g.progress.reputation = Math.max(g.progress.reputation, 70);
  openCircuit(g, ['club', 'regional'], ['photo_contests']);
  // the facility fixture opens everything: close the top tiers (a locked teaser shows on the calendar) and the
  // genetics lab (so the entry flow shows quality bands, not exact scores)
  g.progress.unlocked = g.progress.unlocked.filter((k) => !['shows_national', 'shows_international', 'genetics_lab'].includes(k));
  const alive = Object.values(g.creatures).filter((c) => c.status === 'alive' && (c.lifeStage === 'adult' || c.lifeStage === 'elder'));
  for (const c of alive) groom(c, c.isStarter ? 72 : 40);
  for (const id of g.tankOrder) {
    g.progress.counters[scapeEditsKey(id)] = 4; // the player's own layouts
    refreshTankCache(g, g.tanks[id]);
  }
  advanceWorld(g, 1);
  const star = alive.find((c) => c.isStarter) ?? alive[0];
  const others = alive.filter((c) => c !== star);
  const nano = g.tankOrder.map((id) => g.tanks[id]).find((t) => t && (t.decor?.length ?? 0) >= 3);
  // three judged shows: two club, one regional
  const plan: { tier: ShowTier; name: string; entrants: Creature[]; scape?: boolean }[] = [
    { tier: 'club', name: 'Riverside Aquarium Club Table Show', entrants: [star, ...others.slice(0, 1)] },
    { tier: 'club', name: 'Willow Creek Aquarium Society Open Show', entrants: [star], scape: true },
    { tier: 'regional', name: 'The 14th Lakeshore Aquatic Fair', entrants: [star, ...others.slice(1, 2)] },
  ];
  for (const p of plan) {
    const ids = new Set<string>();
    for (const c of p.entrants) for (const id of classesFor(c).slice(0, 2)) ids.add(id);
    if (p.scape) ids.add('scape_nano');
    const show = handShow(g, p.tier, [...ids].slice(0, 4), 6, p.name);
    for (const c of p.entrants) {
      groom(c, c.isStarter ? 72 : 40);
      const cls = bestClassFor(g, show, c);
      if (cls) enterShow(g, show.id, cls, c.id);
    }
    if (p.scape && nano) enterShow(g, show.id, 'scape_nano', nano.id);
    advanceWorld(g, 7);
  }
  // the starter's record: a Champion with a few wins at Regional (flavour for the card + shelf)
  const a = (star.awards ??= emptyAwards());
  a.wins.regional = Math.max(3, a.wins.regional ?? 0);
  a.wins.club = Math.max(2, a.wins.club ?? 0);
  if (!a.titles.includes('champion')) a.titles.push('champion');
  a.placings = Math.max(a.placings, 6);
  const past = (h: number, tier: ShowTier, place: 1 | 2 | 3 | 4, cls: string, show: string, bis = false) => ({ hour: g.clock.hour - h, showId: 'show-past', showName: show, tier, classId: cls, className: cls, place, bestInShow: bis || undefined, score: 70 + (4 - place) * 3 });
  a.ribbons = [past(260, 'regional', 1, 'Halfmoon betta', 'The 12th Tri-County Aquarium Expo', true), past(200, 'regional', 1, 'Halfmoon betta', 'The 9th Valley Aquarists’ Open'), past(150, 'club', 2, 'Open freshwater', 'Old Mill Aquarists Table Show'), ...a.ribbons].slice(-12);
  a.bestInShow = Math.max(1, a.bestInShow);
  trophy(g, { kind: 'cup', tier: 'regional', place: 1, bestInShow: true, showName: 'The 12th Tri-County Aquarium Expo', className: 'Halfmoon betta', subject: star.name }, 260);
  trophy(g, { kind: 'cup', tier: 'regional', place: 1, showName: 'The 9th Valley Aquarists’ Open', className: 'Halfmoon betta', subject: star.name }, 200);
  trophy(g, { kind: 'rosette', tier: 'club', place: 2, showName: 'Old Mill Aquarists Table Show', className: 'Open freshwater', subject: star.name }, 150);
  if (nano) trophy(g, { kind: 'plaque', tier: 'regional', place: 1, showName: 'The 7th Midlands Aquarium Show', className: 'Nano scape', subject: nano.name }, 120);
  // one pending entry on the calendar
  const s = ensureShowsState(g);
  const next = s.shows.filter((x) => x.status === 'open' && x.deadlineHour > g.clock.hour + 2).sort((x, y) => x.judgingHour - y.judgingHour);
  outer: for (const show of next) {
    for (const c of others) {
      groom(c, 40);
      const cls = bestClassFor(g, show, c);
      if (cls && enterShow(g, show.id, cls, c.id).ok) break outer;
    }
  }
  s.resultsSeenHour = g.clock.hour - 10; // the last result shows as "New"
  g.clock.speed = 1;
  return g;
}

/** `base`: the big_facility world to dress (index.ts passes the registered, staffed one). */
export function buildShowsHall(base?: GameState): GameState {
  const g = base ?? CORE_FIXTURES.big_facility();
  openCircuit(g, ['club', 'regional', 'national', 'international'], ['photo_contests', 'genetics_lab']);
  const s = ensureShowsState(g);
  const star = Object.values(g.creatures).find((c) => c.status === 'alive' && c.lifeStage === 'adult' && c.tankId === g.tankOrder[0]) ?? Object.values(g.creatures).find((c) => c.status === 'alive');
  if (star) {
    const a = (star.awards ??= emptyAwards());
    a.wins = { club: 2, regional: 3, national: 3, international: 1 };
    a.titles = ['champion', 'grand_champion'];
    a.placings = 11;
    a.bestInShow = 2;
    a.shown = 14;
  }
  const who = star?.name ?? 'Tango';
  const list: [TrophyRecord['kind'], ShowTier, 1 | 2 | 3 | 4, boolean, string][] = [
    ['cup', 'international', 1, true, 'World Aquatic Championship'],
    ['cup', 'international', 1, false, 'Pacific Rim Aquatic Open'],
    ['bowl', 'international', 1, false, 'International Living Aquarium Awards'],
    ['cup', 'national', 1, true, 'National Aquarium Championships'],
    ['cup', 'national', 1, false, 'Fin & Frond National'],
    ['bowl', 'national', 1, false, 'Grand National Fish & Aquascape Show'],
    ['cup', 'regional', 1, false, 'Tri-County Aquarium Expo'],
    ['plaque', 'regional', 1, false, 'Lakeshore Aquatic Fair'],
    ['cup', 'regional', 1, false, 'Valley Aquarists’ Open'],
    ['rosette', 'national', 2, false, 'Aquarists’ Guild National Championship'],
    ['rosette', 'regional', 2, false, 'Midlands Aquarium Show'],
    ['rosette', 'regional', 3, false, 'Highland Aquatic Fair'],
    ['rosette', 'club', 1, false, 'Riverside Aquarium Club Table Show'],
    ['rosette', 'club', 1, false, 'Old Mill Aquarists Open Show'],
    ['rosette', 'club', 4, false, 'Northgate Fish Club Evening Show'],
    ['rosette', 'club', 3, false, 'Lantern Bay Aquarists Table Show'],
  ];
  list.forEach(([kind, tier, place, bis, show], i) => trophy(g, { kind, tier, place, bestInShow: bis || undefined, showName: show, className: kind === 'bowl' || kind === 'plaque' ? 'Reef scape' : 'Open marine', subject: kind === 'bowl' || kind === 'plaque' ? 'Grand Reef' : who }, 500 - i * 25));
  s.stats = { entered: 22, placings: 16, wins: 11, bestInShow: 2, prize: 61850 };
  if (g.tankOrder[0]) s.tankAwards[g.tankOrder[0]] = { wins: 3, placings: 4, best: 'Reef scape — 1st, International', bestTier: 'international', lastHour: g.clock.hour - 100 };
  return g;
}

export const SHOWS_FIXTURES: Record<string, () => GameState> = {
  'shows-demo': buildShowsDemo,
  'shows-hall': () => buildShowsHall(),
};
