/**
 * Attention & notification rules — the pure, node-safe helpers behind every HUD dot, the bell badge and the alerts
 * drawer, so they always agree. OWNER: lane "notify".
 *
 *  - TANK ATTENTION is live state, never a "read" flag. A tank's dot is amber (watch) or red (danger) while something
 *    there needs a look, and it clears itself the moment the problem is fixed. Sources: the sim's tank status
 *    (`cache.status` — water, animal welfare, out of food), food running low, failed equipment, and running gear that
 *    leaves the animals in that tank without something they need (lane "fit" verdicts, see `gearFitItems`).
 *  - NEWS is "new until viewed": unread log events (the bell's number), show results judged after
 *    `shows.resultsSeenHour`, research finished since the Research panel was last open, a newly unlocked feature that
 *    was never opened. Bids waiting for an answer are live (they go when answered or expired).
 *  - CLEAR ALL hides the drawer's events up to now (`notify.logClearedSeq`) and marks them read. It never deletes log
 *    entries: progression (`progress.scan.logSeq`), exhibit scoring, the welcome-back card and duplicate checks all
 *    scan the log. The full history stays in the Log panel.
 */
import type { Creature, DecorInstance, EquipmentInstance, GameEvent, GameState, NotifyState, Tank } from '@/types';
import type { StatusLevel } from '@/types/reports';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { tankFoodOutlook } from '@/sim/tankStatus';
import { unseenResults } from '@/sim/shows';
import { tankGearIssues, FIT_TONE } from '@/sim/care/fit'; // lane "fit" verdicts
import { tankStatusReason } from './tankStatus';

const attempt = <T>(fn: () => T, fallback: T): T => {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
};

// ───────────────────────────── tank attention ─────────────────────────────

export type AttentionLevel = StatusLevel;
/** Where in the tank card the player should look. */
export type AttentionTab = 'water' | 'gear' | 'life';
export type AttentionSource = 'water' | 'animals' | 'food' | 'gear' | 'fit';

export interface AttentionItem {
  level: 'watch' | 'danger';
  source: AttentionSource;
  /** One plain sentence ("Ammonia is rising", "The 50 W Heater has failed — repair or replace it."). */
  text: string;
  /** Tank card tab that deals with it (null: handled elsewhere, e.g. food is bought in the Market). */
  tab: AttentionTab | null;
  equipmentId?: string;
  /** A shorter line for tight spots (tank card header, Tanks panel rows) when `text` is long; the tab has the detail. */
  short?: string;
}

export interface TankAttention {
  level: AttentionLevel;
  /** Most urgent first. */
  items: AttentionItem[];
  /** Tank card tabs with something to look at (for the tab dots). */
  tabs: Partial<Record<AttentionTab, 'watch' | 'danger'>>;
  /** Tooltip / aria text: "Watch — Ammonia is rising · Food is running low". Empty when all is well. */
  label: string;
}

const RANK: Record<AttentionLevel, number> = { good: 0, watch: 1, danger: 2 };
export const worseLevel = <T extends AttentionLevel>(a: T, b: T): T => (RANK[b] > RANK[a] ? b : a);
const level = (v: unknown): AttentionLevel => (v === 'danger' || v === 'watch' ? v : 'good');
export const ATTENTION_WORD: Record<AttentionLevel, string> = { good: 'Healthy', watch: 'Watch', danger: 'Danger' };

const GOOD: TankAttention = { level: 'good', items: [], tabs: {}, label: '' };

const isOn = (e: EquipmentInstance) => e.on !== false && !e.failed;

// ── lane "fit": installed gear that isn't helping ──
/**
 * Running gear that leaves this tank's animals without something they need — an autofeeder in a tank of frozen-food
 * eaters, a filter outflow too strong for seahorses, CO₂ with no plants… — as items for the Equipment tab. The
 * verdicts are lane "fit"'s (`tankGearIssues(…, { attentionOnly: true })`, src/sim/care/fit.ts): the same sentence
 * the tank card shows beside that gear, coloured by its FIT_TONE (harmful → danger, otherwise watch). Memoised per
 * (equipment on/off/settings, residents, decor pieces, foods in stock) and refreshed for drift (temperatures, fry
 * stages) every few seconds, one tank at a time, so the HUD selectors can call it on every store update.
 */
export function gearFitItems(g: GameState, tank: Tank): AttentionItem[] {
  const gear = tank.equipment;
  if (!gear?.length || !gear.some(isOn)) return NO_ITEMS;
  let sig = `${residentsSig(g, tank.id)}|${decorSig(tank.decor)}|${stockSig(g.inventory?.foods)}|`;
  for (const e of gear) sig += `${e.id}${e.on === false ? 0 : 1}${e.failed ? 1 : 0}${e.setting ?? ''},`;
  const now = clockMs();
  const hit = FIT_MEMO.get(tank.id);
  if (hit && hit.sig === sig) {
    // nothing changed: refresh for drift only now and then, one tank at a time (a big facility's whole pass is ~5 ms)
    if (now - hit.at < FIT_REFRESH_MS || now - lastDriftRefresh < 50) return hit.items;
    lastDriftRefresh = now;
  }
  const items = attempt(() => fitVerdictsFor(g, tank), NO_ITEMS);
  if (FIT_MEMO.size > 400) FIT_MEMO.clear();
  FIT_MEMO.set(tank.id, { sig, items, at: now });
  return items;
}

function fitVerdictsFor(g: GameState, tank: Tank): AttentionItem[] {
  const issues = tankGearIssues(g, tank.id, { attentionOnly: true });
  if (!issues.length) return NO_ITEMS;
  return issues.map((i) => ({
    level: FIT_TONE[i.verdict.level] === 'danger' ? 'danger' : 'watch',
    source: 'fit',
    tab: 'gear',
    equipmentId: i.equipmentId,
    text: `${i.name}: ${i.verdict.text}`,
    short: `The ${i.name} ${FIT_SHORT[i.verdict.level]} — see Equipment.`,
  }));
}

const FIT_SHORT: Record<string, string> = { ok: 'needs a look', partial: 'only partly helps these animals', useless: 'can’t help these animals', harmful: 'is working against these animals' };
const FIT_REFRESH_MS = 3000;
let lastDriftRefresh = -Infinity;
const clockMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const NO_ITEMS: AttentionItem[] = [];
/** tank id → last verdicts, keyed by what they depend on (another save's same-id tank has other residents). */
const FIT_MEMO = new Map<string, { sig: string; items: AttentionItem[]; at: number }>();
/** Which foods are in stock at all (eating from a bag changes the cupboard object every feed, not this). */
const STOCK_SIG = new WeakMap<Record<string, number>, string>();
function stockSig(foods: Record<string, number> | undefined): string {
  if (!foods) return '';
  let v = STOCK_SIG.get(foods);
  if (v === undefined) {
    v = Object.keys(foods)
      .filter((k) => (foods[k] ?? 0) >= 1)
      .sort()
      .join(',');
    STOCK_SIG.set(foods, v);
  }
  return v;
}
/** What decor is in the tank (growing plants change the array every tick, not this). */
const DECOR_SIG = new WeakMap<DecorInstance[], string>();
function decorSig(decor: DecorInstance[] | undefined): string {
  if (!decor?.length) return '';
  let v = DECOR_SIG.get(decor);
  if (v === undefined) {
    let h = 2166136261;
    for (const d of decor) for (let i = 0; i < d.defId.length; i++) h = Math.imul(h ^ d.defId.charCodeAt(i), 16777619);
    v = `${decor.length}:${(h >>> 0).toString(36)}`;
    DECOR_SIG.set(decor, v);
  }
  return v;
}
/** Who lives in each tank (count + a hash of their ids), built once per `state.creatures` object (new every sim tick). */
const RESIDENTS_SIG = new WeakMap<Record<string, Creature>, Map<string, string>>();
function residentsSig(g: GameState, tankId: string): string {
  const all = g.creatures ?? {};
  let m = RESIDENTS_SIG.get(all);
  if (!m) {
    const ids = new Map<string, string[]>();
    for (const c of Object.values(all)) {
      if (!c?.tankId || (c.status !== 'alive' && c.status !== 'listed')) continue;
      let l = ids.get(c.tankId);
      if (!l) ids.set(c.tankId, (l = []));
      l.push(c.id);
    }
    m = new Map();
    for (const [id, l] of ids) {
      l.sort();
      let h = 2166136261;
      for (const x of l) for (let i = 0; i < x.length; i++) h = Math.imul(h ^ x.charCodeAt(i), 16777619);
      m.set(id, `${l.length}:${(h >>> 0).toString(36)}`);
    }
    RESIDENTS_SIG.set(all, m);
  }
  return m.get(tankId) ?? '0';
}

/**
 * The tank's dot colour — cheap enough for a store selector (no reports, no text). Worst of the sim status, food
 * running low, failed gear and gear that isn't helping.
 */
export function tankAttentionLevel(g: GameState, tankId: string): AttentionLevel {
  const t = g.tanks[tankId];
  if (!t) return 'good';
  let w = level(t.cache?.status);
  if (w === 'danger') return w;
  const food = t.cache?.foodLevel;
  if (food === 'low' || food === 'out' || t.equipment?.some((e) => e.failed)) w = 'watch';
  for (const it of gearFitItems(g, t)) w = worseLevel(w, it.level);
  return w;
}

const ANIMAL_WORDS = /\b(starv|hungry|ill\b|unwell|stress|health|injur|recover|weak|sick|dying)/i;
function classify(text: string): AttentionSource {
  if (/\bfood\b|\beats\b/i.test(text)) return 'food';
  if (ANIMAL_WORDS.test(text)) return 'animals';
  return 'water';
}
const TAB_OF: Record<AttentionSource, AttentionTab | null> = { water: 'water', animals: 'life', food: null, gear: 'gear', fit: 'gear' };

/** Everything that needs a look in this tank, with reasons — for tooltips, the drawer, the tank card and Tanks panel. */
export function tankAttention(g: GameState, tankId: string): TankAttention {
  const t = g.tanks[tankId];
  if (!t) return GOOD;
  const c = t.cache ?? ({} as Partial<Tank['cache']>);
  const status = level(c.status);
  const items: AttentionItem[] = [];
  // 1. the sim's own reasons (water, animals, out of food), most urgent first
  const reasons = status === 'good' ? [] : attempt(() => tankStatusReason(g, tankId, { sep: '\n' }), '').split('\n').map((r) => r.trim()).filter(Boolean);
  reasons.forEach((text, i) => {
    const source = i === 0 && c.statusSource ? (c.statusSource as AttentionSource) : classify(text);
    items.push({ level: status as 'watch' | 'danger', source, text, tab: TAB_OF[source] });
  });
  if (status !== 'good' && !reasons.length) items.push({ level: status, source: (c.statusSource as AttentionSource) ?? 'water', text: 'Needs attention', tab: TAB_OF[(c.statusSource as AttentionSource) ?? 'water'] });
  const said = reasons.join(' ');
  // 2. food running low (the sim reports "out" itself; "low" never changes the status)
  if ((c.foodLevel === 'low' || c.foodLevel === 'out') && !/\bfood\b/i.test(said)) {
    const o = attempt(() => tankFoodOutlook(g, tankId), null);
    const base = (o?.text ?? (c.foodLevel === 'out' ? 'Out of food these animals eat' : 'Food is running low')).replace(/\.$/, '');
    const buy = o?.restockId ? getFoodDef(o.restockId)?.name : undefined;
    items.push({ level: 'watch', source: 'food', text: `${base} — ${buy ? `buy ${buy}` : 'restock'} in Market › Supplies.`, tab: null });
  }
  // 3. failed equipment (unless the status line already names it)
  for (const e of t.equipment ?? []) {
    if (!e.failed) continue;
    const name = getEquipmentDef(e.defId)?.name ?? 'Equipment';
    if (said.includes(name)) continue;
    const text = e.failMode === 'stuck_on' ? `The ${name} is stuck on — switch it off, then repair it.` : `The ${name} has failed — repair or replace it.`;
    items.push({ level: 'watch', source: 'gear', text, tab: 'gear', equipmentId: e.id });
  }
  // 4. gear that can't help these animals (lane "fit")
  for (const it of gearFitItems(g, t)) if (!said.includes(it.text)) items.push(it);
  if (!items.length) return GOOD;
  items.sort((a, b) => RANK[b.level] - RANK[a.level]);
  const lvl = items.reduce<AttentionLevel>((w, it) => worseLevel(w, it.level), 'good');
  const tabs: TankAttention['tabs'] = {};
  const bump = (tab: AttentionTab, l: 'watch' | 'danger') => (tabs[tab] = worseLevel(tabs[tab] ?? 'watch', l));
  // the water / life tabs follow the sim's own split when it has one (older saves: the items' sources)
  const ws = level(c.waterStatus);
  const an = level(c.animalStatus);
  if (ws !== 'good') bump('water', ws);
  if (an !== 'good') bump('life', an);
  for (const it of items) {
    if (!it.tab) continue;
    if ((it.tab === 'water' && c.waterStatus !== undefined) || (it.tab === 'life' && c.animalStatus !== undefined)) continue;
    bump(it.tab, it.level);
  }
  return { level: lvl, items, tabs, label: `${ATTENTION_WORD[lvl]} — ${items.map((i) => i.text.replace(/\.$/, '')).join(' · ')}` };
}

export interface AttentionSummary {
  watch: number;
  danger: number;
  total: number;
  worst: AttentionLevel;
}

/** Tanks needing a look, by level (bell colour, Tanks dock dot). */
export function attentionSummary(g: GameState): AttentionSummary {
  let watch = 0;
  let danger = 0;
  for (const id of g.tankOrder) {
    const l = tankAttentionLevel(g, id);
    if (l === 'danger') danger++;
    else if (l === 'watch') watch++;
  }
  return { watch, danger, total: watch + danger, worst: danger ? 'danger' : watch ? 'watch' : 'good' };
}

/**
 * The tank switcher's cue for OTHER tanks: which arrow reaches the most urgent one soonest (ties: the nearer, then
 * "next"). Null when no other tank needs a look.
 */
export function nearestAttention(g: GameState, focusedId: string | null): { dir: 1 | -1; tankId: string; level: 'watch' | 'danger'; steps: number } | null {
  const order = g.tankOrder;
  const n = order.length;
  const at = order.indexOf(focusedId ?? '');
  let best: { dir: 1 | -1; tankId: string; level: 'watch' | 'danger'; steps: number } | null = null;
  // from the focused tank (or, with none, from just before the first) walk k steps forward; k steps forward is n - k back
  const span = at < 0 ? n : n - 1;
  for (let k = 1; k <= span; k++) {
    const id = order[(at + k + n) % n];
    const l = tankAttentionLevel(g, id);
    if (l === 'good' || id === focusedId) continue;
    const back = at < 0 ? Infinity : n - k;
    const dir: 1 | -1 = k <= back ? 1 : -1;
    const steps = Math.min(k, back);
    if (!best || RANK[l] > RANK[best.level] || (l === best.level && (steps < best.steps || (steps === best.steps && dir === 1 && best.dir === -1)))) best = { dir, tankId: id, level: l, steps };
  }
  return best;
}

// ───────────────────────────── the event log ─────────────────────────────

/** The bookkeeping block, validated (a hand-edited or damaged save may hold anything here). */
export function notifyState(g: GameState): NotifyState {
  const n = g.notify as unknown;
  if (!n || typeof n !== 'object') return {};
  const o = n as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  return { logClearedSeq: num(o.logClearedSeq), logClearedHour: num(o.logClearedHour), researchSeen: num(o.researchSeen) };
}

function ensureNotify(d: GameState): NotifyState {
  if (!d.notify || typeof d.notify !== 'object') d.notify = {};
  return d.notify;
}

/** Sequence number of a log id (`ev_1a` → 46), or null for an id of another shape. */
export function logSeq(id: string): number | null {
  const m = /_([0-9a-z]+)$/.exec(id ?? '');
  if (!m) return null;
  const n = parseInt(m[1], 36);
  return Number.isFinite(n) ? n : null;
}

/** Hidden from the drawer by "Clear all"? */
export function isCleared(g: GameState, e: GameEvent, ns: NotifyState = notifyState(g)): boolean {
  if (ns.logClearedSeq === undefined && ns.logClearedHour === undefined) return false;
  const s = logSeq(e.id);
  if (s !== null && ns.logClearedSeq !== undefined) return s <= ns.logClearedSeq;
  return ns.logClearedHour !== undefined && e.hour <= ns.logClearedHour;
}

/** The drawer's event list: newest first, cleared ones left out, optionally only some kinds. */
export function drawerEvents(g: GameState, kinds: GameEvent['kind'][] | null = null, limit = 40): GameEvent[] {
  const ns = notifyState(g);
  const out: GameEvent[] = [];
  for (let i = g.log.length - 1; i >= 0 && out.length < limit; i--) {
    const e = g.log[i];
    if (!e || isCleared(g, e, ns)) continue;
    if (kinds && !kinds.includes(e.kind)) continue;
    out.push(e);
  }
  return out;
}

const ALERT_KINDS: GameEvent['kind'][] = ['warning', 'danger', 'death'];
/** News worth a number on the bell: anything that was toasted, and every warning / danger / death. */
export const isNews = (e: GameEvent): boolean => !!e.toast || ALERT_KINDS.includes(e.kind);

export interface UnreadNews {
  count: number;
  /** Most serious unread kind: 'danger' (danger/death), 'watch' (warning) or 'news'. Null when nothing is unread. */
  worst: 'danger' | 'watch' | 'news' | null;
}

const NEWS_RANK = { news: 0, watch: 1, danger: 2 } as const;

/** Unread, uncleared news (the bell's number). */
export function unreadNews(g: GameState): UnreadNews {
  const ns = notifyState(g);
  let count = 0;
  let worst: UnreadNews['worst'] = null;
  for (let i = g.log.length - 1; i >= 0; i--) {
    const e = g.log[i];
    if (!e || e.read || !isNews(e) || isCleared(g, e, ns)) continue;
    count++;
    const w = e.kind === 'danger' || e.kind === 'death' ? 'danger' : e.kind === 'warning' ? 'watch' : 'news';
    if (!worst || NEWS_RANK[w] > NEWS_RANK[worst]) worst = w;
  }
  return { count, worst };
}

/** Mark every event read (the drawer's "Mark read", and closing the drawer). */
export function markAllRead(d: GameState): void {
  for (const e of d.log) if (!e.read) e.read = true;
}

/**
 * "Clear all": hide every event logged so far from the drawer and mark them read. Nothing is deleted (see the
 * header); events logged afterwards show as usual. Tank alerts are live and clear themselves once fixed.
 */
export function clearAllEvents(d: GameState): void {
  markAllRead(d);
  let max = -1;
  for (const e of d.log) {
    const s = logSeq(e.id);
    if (s !== null && s > max) max = s;
  }
  const n = ensureNotify(d);
  // ids come from one counter that only grows (nextId), so everything logged later has a larger sequence
  n.logClearedSeq = Math.max(n.logClearedSeq ?? -1, max, Number.isFinite(d.idCounter) ? d.idCounter : -1);
  n.logClearedHour = d.clock.hour;
}

/** Events the drawer would still show (for "Clear all" being enabled). */
export const hasDrawerEvents = (g: GameState): boolean => drawerEvents(g, null, 1).length > 0;

// ───────────────────────────── "new until viewed" ─────────────────────────────

/** Judged (or scratched) show results the player hasn't opened yet. */
export function unseenShowResults(g: GameState): number {
  if (g.isShowcase) return 0;
  return attempt(() => unseenResults(g), 0);
}

/** A research project finished (or was closed as learned through play) since the Research panel was last open. */
export function researchNews(g: GameState): boolean {
  if (g.isShowcase) return false;
  const r = g.progress?.research;
  const seen = notifyState(g).researchSeen;
  if (!r || seen === undefined || r.activeId) return false;
  return (r.completed?.length ?? 0) > seen;
}

/** The Research panel is open: everything finished so far has been seen. */
export function markResearchSeen(d: GameState): void {
  const n = ensureNotify(d);
  n.researchSeen = d.progress?.research?.completed?.length ?? 0;
}

/** Research panel open → does `markResearchSeen` have anything to record? (avoid a mutation per render) */
export function researchSeenStale(g: GameState): boolean {
  return notifyState(g).researchSeen !== (g.progress?.research?.completed?.length ?? 0);
}

/** Open bids on the player's active listings, waiting for an answer (live: they go when answered or expired). */
export function bidsAwaiting(g: GameState): number {
  if (g.isShowcase) return 0;
  let n = 0;
  for (const l of g.market?.listings ?? []) if (l.status === 'active') for (const b of l.bids ?? []) if (b.status === 'open') n++;
  return n;
}

/** A feature unlocked but never opened (its panel's `opened_<id>` flag is the all-time "seen" record). */
export function featureUnseen(g: GameState, panelId: string, lockKey: string | null | undefined): boolean {
  if (!lockKey || g.isShowcase) return false;
  if (!g.progress?.unlocked?.includes(lockKey)) return false;
  return !g.progress.tutorial?.flags?.[`opened_${panelId}`];
}

// ───────────────────────────── navigation dots ─────────────────────────────

export interface NavDot {
  /** 'new' is drawn amber like 'watch' (results, bids, a new feature); the label says which. */
  level: 'watch' | 'danger' | 'new';
  /** Tooltip / aria text ("2 new show results"). */
  label: string;
  /** Panel deep link the button should open while the dot shows (null: the panel's default). */
  target: string | null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Dots for the dock / sheet switcher. `items` are the dock destinations (id, label, unlock key). Tanks: another tank
 * than the one in view needs a look (amber/red, live — the one in view has its own dot on the Tank card button).
 * Shows: new results, else a never-opened Shows. Market: bids waiting for an answer. Research: a project finished
 * since it was last open. Any other gated item: unlocked but never opened.
 */
export function navDots(g: GameState, items: { id: string; label: string; lock?: string | null }[], focusedTankId: string | null = null): Record<string, NavDot> {
  const out: Record<string, NavDot> = {};
  let watch = 0;
  let danger = 0;
  let first = '';
  for (const id of g.tankOrder) {
    if (id === focusedTankId) continue;
    const l = tankAttentionLevel(g, id);
    if (l === 'good') continue;
    if (l === 'danger') danger++;
    else watch++;
    if (!first) first = g.tanks[id]?.name ?? 'A tank'; // named when it is the only one
  }
  const total = watch + danger;
  if (total > 0) {
    const other = focusedTankId && g.tanks[focusedTankId] ? ' other' : '';
    const label =
      total === 1 ? `${first} needs attention (${danger ? 'danger' : 'watch'})` : `${total}${other} tanks need attention (${[danger ? `${danger} in danger` : '', watch ? `${watch} to watch` : ''].filter(Boolean).join(', ')})`;
    out.tanks = { level: danger ? 'danger' : 'watch', label, target: null };
  }
  if (g.isShowcase) return out;
  const shows = unseenShowResults(g);
  if (shows > 0) out.shows = { level: 'new', label: plural(shows, 'new show result'), target: 'tab:results' };
  const bids = bidsAwaiting(g);
  if (bids > 0) out.market = { level: 'new', label: `${plural(bids, 'bid')} waiting for your answer`, target: 'tab:listings' };
  if (researchNews(g)) out.research = { level: 'new', label: 'Research finished — choose your next project', target: null };
  for (const it of items) if (!out[it.id] && featureUnseen(g, it.id, it.lock)) out[it.id] = { level: 'new', label: `New: ${it.label} just unlocked`, target: null };
  return out;
}
