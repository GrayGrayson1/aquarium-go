/**
 * Who did it, and first one wins (SHARED-SHOPS.md §4.3). Only a shared shop's commands carry an actor; a solo game
 * never reaches anything here.
 *
 * - The events a command emits are tagged with its sender, on every copy, so the log is the same everywhere; an
 *   action that emits no event gets one line, its own message, also tagged.
 * - Buying, selling, moving and taking carry what their sender saw. A command whose expectation no longer holds is
 *   refused on every copy, naming the member whose command changed it in the last 30 seconds, but a change the same
 *   sender made with an earlier command doesn't count (two quick moves of one fish both work).
 * - Settings are last-writer-wins; when another member changed the same one in the last 30 seconds, the result says
 *   who (`noteBy`), for the sender's screen.
 *
 * The memory of who touched what (`GameState.touches`) is part of the shop's state, so a member who joins from a
 * snapshot decides exactly as the others do. Its times are the server's clock, stamped on each command (`at`).
 */
import type { Creature, GameState, SharedTouch } from '@/types';
import { emitEvent } from '../context';
import type { Command } from './kinds';
import type { CommandResult } from './apply';

/** The member who sent a command: their id and name, and when the server received it (real ms). */
export interface Actor {
  id: string;
  name: string;
  at: number;
}

/** How long a touch names its member (§4.3). */
export const TOUCH_MS = 30_000;
/** At most this many touches are kept (ten busy members for 30 seconds fit easily). */
export const MAX_TOUCHES = 200;

/** What a touched thing is called in a refusal. */
type Noun = 'fish' | 'clutch' | 'offer' | 'listing' | 'bid' | 'frag' | 'decoration' | 'stored piece' | 'equipment' | 'candidate' | 'keeper' | 'line' | 'tank';

/** One thing a command found changed: its memory key and its noun. */
interface Stale {
  key: string;
  noun: Noun;
}

const own = <T>(rec: Record<string, T> | undefined, id: string): T | undefined => (rec && Object.hasOwn(rec, id) ? rec[id] : undefined);
const gone = (s: string | undefined) => s === 'dead' || s === 'sold';

/** The first thing this command expects that no longer holds, or null. */
export function staleOf(state: GameState, cmd: Command): Stale | null {
  const fish = (id: string, ok: (c: Creature) => boolean): Stale | null => {
    const c = own(state.creatures, id);
    return c && ok(c) ? null : { key: `c:${id}`, noun: 'fish' };
  };
  const listing = (lid: string, bid?: string): Stale | null => {
    const l = state.market.listings.find((x) => x.id === lid);
    if (!l || l.status !== 'active') return { key: `l:${lid}`, noun: 'listing' };
    if (bid !== undefined && !(l.bids ?? []).some((b) => b.id === bid && b.status === 'open')) return { key: `b:${bid}`, noun: 'bid' };
    return null;
  };
  const decor = (tid: string, did: string): Stale | null => (own(state.tanks, tid)?.decor.some((d) => d.id === did) ? null : { key: `d:${did}`, noun: 'decoration' });
  const frag = (fid: string): Stale | null => ((state.inventory.frags ?? []).some((f) => f.id === fid) ? null : { key: `f:${fid}`, noun: 'frag' });
  switch (cmd.k) {
    case 'moveCreature':
    case 'separateCreature':
      return cmd.from === undefined ? null : fish(cmd.creature, (c) => !gone(c.status) && (c.tankId ?? '') === cmd.from);
    case 'moveClutch': {
      if (cmd.from === undefined) return null;
      const cl = own(state.clutches, cmd.clutch);
      return cl && cl.tankId === cmd.from ? null : { key: `cl:${cmd.clutch}`, noun: 'clutch' };
    }
    case 'quickSell':
      for (const id of cmd.creatures) {
        const s = fish(id, (c) => c.status === 'alive');
        if (s) return s;
      }
      return null;
    case 'createListing':
      for (const id of cmd.creatures ?? []) {
        const s = fish(id, (c) => c.status === 'alive');
        if (s) return s;
      }
      for (const id of cmd.frags ?? []) {
        const s = frag(id);
        if (s) return s;
      }
      if (cmd.tank !== undefined && !own(state.tanks, cmd.tank)) return { key: `t:${cmd.tank}`, noun: 'tank' };
      return null;
    case 'buyOffer': {
      // the offer, and the animals the sender saw: each still in it (apply.ts buys them by id, wherever a partial sale
      // moved them), and all of it when they bought it whole
      const o = state.market.stock.find((x) => x.id === cmd.offer);
      const stale: Stale = { key: `o:${cmd.offer}`, noun: 'offer' };
      if (!o) return stale;
      if (cmd.saw === undefined) return null;
      if (!cmd.picks && o.creatures.length !== cmd.saw.length) return stale;
      return cmd.saw.every((id) => o.creatures.some((c) => c.id === id)) ? null : stale;
    }
    case 'placeDecor':
      // the sender saw one in storage: the last one may have been placed since (then it would buy a new one)
      return cmd.fromStorage && !state.inventory.decor.some((d) => d.defId === cmd.def) ? { key: `ds:${cmd.def}`, noun: 'stored piece' } : null;
    case 'withdrawListing':
      return listing(cmd.listing);
    case 'acceptBid':
    case 'declineBid':
    case 'counterBid':
      return listing(cmd.listing, cmd.bid);
    case 'takeFrag':
    case 'moveDecor':
    case 'removeDecor':
      return decor(cmd.tank, cmd.decor);
    case 'plantFrag':
      return frag(cmd.frag);
    case 'quickSellFrags':
      for (const id of cmd.frags) {
        const s = frag(id);
        if (s) return s;
      }
      return null;
    case 'removeEquipment':
    case 'repairEquipment':
      return own(state.tanks, cmd.tank)?.equipment.some((e) => e.id === cmd.equip) ? null : { key: `e:${cmd.equip}`, noun: 'equipment' };
    case 'installEquipment':
      return state.inventory.equipment.some((e) => e.id === cmd.instance) ? null : { key: `e:${cmd.instance}`, noun: 'equipment' };
    case 'hireStaff':
      return (state.staff?.candidates ?? []).some((c) => c.id === cmd.candidate) ? null : { key: `s:${cmd.candidate}`, noun: 'candidate' };
    case 'fireStaff':
      return (state.staff?.roster ?? []).some((m) => m.id === cmd.staff) ? null : { key: `s:${cmd.staff}`, noun: 'keeper' };
    case 'endLine':
      return (state.production?.lines ?? []).some((l) => l.id === cmd.line) ? null : { key: `ln:${cmd.line}`, noun: 'line' };
    default:
      return null;
  }
}

/** What a successful command did to which things, for the memory: [key, verb]. */
function touchesOf(state: GameState, cmd: Command, res: CommandResult): [string, string][] {
  switch (cmd.k) {
    case 'placeDecor':
      return res.fromStorage ? [[`ds:${cmd.def}`, 'placed']] : [];
    case 'moveCreature':
    case 'separateCreature':
      return [[`c:${cmd.creature}`, 'moved']];
    case 'moveClutch':
      return [[`cl:${cmd.clutch}`, 'moved']];
    case 'quickSell':
      return cmd.creatures.map((id) => [`c:${id}`, 'sold']);
    case 'createListing':
      return [...(cmd.creatures ?? []).map((id): [string, string] => [`c:${id}`, 'listed']), ...(cmd.frags ?? []).map((id): [string, string] => [`f:${id}`, 'listed'])];
    case 'buyOffer':
      return [[`o:${cmd.offer}`, 'bought']];
    case 'withdrawListing':
      return [[`l:${cmd.listing}`, 'withdrew']];
    case 'acceptBid': {
      const l = state.market.listings.find((x) => x.id === cmd.listing);
      return [[`l:${cmd.listing}`, 'sold'], [`b:${cmd.bid}`, 'accepted'], ...(l?.creatureIds ?? []).map((id): [string, string] => [`c:${id}`, 'sold'])];
    }
    case 'declineBid':
      return [[`b:${cmd.bid}`, 'declined']];
    case 'counterBid':
      return [[`b:${cmd.bid}`, 'answered']];
    case 'takeFrag':
      return [[`d:${cmd.decor}`, 'took a frag from']];
    case 'moveDecor':
      return [[`d:${cmd.decor}`, 'moved']];
    case 'removeDecor':
      return [[`d:${cmd.decor}`, cmd.sell ? 'sold' : 'removed']];
    case 'plantFrag':
      return [[`f:${cmd.frag}`, 'planted']];
    case 'quickSellFrags':
      return cmd.frags.map((id) => [`f:${id}`, 'sold']);
    case 'removeEquipment':
      return [[`e:${cmd.equip}`, 'removed']];
    case 'repairEquipment':
      return [[`e:${cmd.equip}`, 'repaired']];
    case 'installEquipment':
      return [[`e:${cmd.instance}`, 'installed']];
    case 'hireStaff':
      return [[`s:${cmd.candidate}`, 'hired']];
    case 'fireStaff':
      return [[`s:${cmd.staff}`, 'let go']];
    case 'endLine':
      return [[`ln:${cmd.line}`, 'ended']];
    default:
      return [];
  }
}

/** A setting's memory key: last-writer-wins, with a note when another member just changed it. Null: not a setting. */
export function settingKey(cmd: Command): string | null {
  switch (cmd.k) {
    case 'setEquipment':
    case 'setAutoFeed':
      return `set:eq:${cmd.equip}`;
    case 'setLighting':
      return `set:light:${cmd.tank}`;
    case 'setSignage':
      return `set:sign:${cmd.tank}`;
    case 'renameTank':
      return `set:tname:${cmd.tank}`;
    case 'setTankPurpose':
      return `set:purpose:${cmd.tank}`;
    case 'setBackdrop':
      return `set:backdrop:${cmd.tank}`;
    case 'renameCreature':
      return `set:cname:${cmd.creature}`;
    case 'setFavorite':
      return `set:fav:${cmd.creature}`;
    case 'setOpenToPublic':
      return 'set:open';
    case 'setAdmission':
      return 'set:admission';
    case 'setStockBudget':
      return 'set:budget';
    case 'setStockOrders':
      return 'set:orders';
    case 'setLineRunning':
      return `set:lrun:${cmd.line}`;
    case 'setLineRule':
      return `set:lrule:${cmd.line}:${cmd.rule}`;
    case 'setKeepRules':
      return `set:lkeep:${cmd.line}`;
    case 'assignTank':
      return `set:assign:${cmd.staff}:${cmd.tank}`;
    case 'holdAll':
    case 'resumeAll':
      return 'set:hold';
    case 'setHold':
      return `set:hold:${cmd.sys}`;
    case 'setSpeed':
      return 'set:speed';
    default:
      return null;
  }
}

/**
 * What a thing looks like now, as far as first one wins cares (its tank, its status, whether it's still there): a
 * touch keeps the mark its command left, so the sender's own earlier change is told apart from a change made after it
 * (by the game itself, which leaves no touch).
 */
function markOf(state: GameState, key: string): string {
  const i = key.indexOf(':');
  const kind = key.slice(0, i);
  const id = key.slice(i + 1);
  switch (kind) {
    case 'c': {
      const c = own(state.creatures, id);
      return c ? `${c.status}|${c.tankId ?? ''}` : '-';
    }
    case 'cl':
      return own(state.clutches, id)?.tankId ?? '-';
    case 'o':
      return state.market.stock.find((o) => o.id === id)?.creatures.map((c) => c.id).join(',') ?? '-';
    case 'l':
      return state.market.listings.find((l) => l.id === id)?.status ?? '-';
    case 'b':
      for (const l of state.market.listings) for (const b of l.bids ?? []) if (b.id === id) return b.status;
      return '-';
    case 'd':
      return state.tankOrder.find((t) => state.tanks[t]?.decor.some((d) => d.id === id)) ?? '-';
    case 'f':
      return (state.inventory.frags ?? []).some((f) => f.id === id) ? 'stored' : '-';
    case 'e':
      return state.tankOrder.find((t) => state.tanks[t]?.equipment.some((e) => e.id === id)) ?? (state.inventory.equipment.some((e) => e.id === id) ? 'stored' : '-');
    case 's':
      return (state.staff?.candidates ?? []).some((c) => c.id === id) ? 'candidate' : (state.staff?.roster ?? []).some((m) => m.id === id) ? 'roster' : '-';
    case 'ln':
      return (state.production?.lines ?? []).some((l) => l.id === id) ? 'line' : '-';
    case 'ds':
      return String(state.inventory.decor.filter((d) => d.defId === id).length);
    case 't':
      return own(state.tanks, id) ? 'tank' : '-';
    default:
      return '';
  }
}

/** The latest touch of `key` still inside the window at `at`. */
function lastTouch(state: GameState, key: string, at: number): SharedTouch | undefined {
  const list = state.touches ?? [];
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i];
    if (t.key === key && at - t.at <= TOUCH_MS) return t;
  }
  return undefined;
}

function remember(state: GameState, key: string, verb: string, actor: Actor): void {
  const list = (state.touches ??= []);
  const t: SharedTouch = { key, by: actor.id, name: actor.name, at: actor.at, verb };
  // a setting has no mark; nor has the last stored piece, whose placing never excuses the sender's own next one
  if (!key.startsWith('set:') && !key.startsWith('ds:')) t.mark = markOf(state, key);
  list.push(t);
  if (list.length > MAX_TOUCHES) list.splice(0, list.length - MAX_TOUCHES);
}

/** Forget touches older than the window (so the memory stays small and the same on every copy). */
function prune(state: GameState, at: number): void {
  const list = state.touches;
  if (!list?.length) return;
  let n = 0;
  while (n < list.length && at - list[n].at > TOUCH_MS) n++;
  if (n) list.splice(0, n);
  if (!list.length) delete state.touches;
}

/**
 * The refusal's words. DRAFT, for the owner (SHARED-SHOPS.md §8 lists them): §8 approves "{name} already sold that
 * fish." and the pattern ("moved that fish", "bought that offer"); the rest are the agent's, unshown until chunk 13.
 */
export function conflictText(name: string | undefined, verb: string | undefined, noun: Noun): string {
  if (name && verb) return verb === 'let go' ? `${name} already let that keeper go.` : `${name} already ${verb} that ${noun}.`;
  return `That ${noun} has changed since you looked.`;
}

/**
 * Kinds that never add a line of their own when they log nothing: quiet or repeated by nature (a bid held while the
 * counter form is open, watching, taps, the guide), or with lines of their own on screen (pause and speed, §8).
 */
const NO_LINE: ReadonlySet<string> = new Set(['holdBid', 'glassTap', 'noteInteraction', 'notePhoto', 'raiseFlag', 'tutorialNext', 'tutorialSkip', 'setSpeed']);

/**
 * Run a shared shop's command for its sender: the expectation first (refused on every copy when it fails), then the
 * action through `run`, then the memory, the setting note and the tags.
 */
export function applyAsActor(state: GameState, cmd: Command, actor: Actor, run: () => CommandResult): CommandResult {
  prune(state, actor.at);
  const stale = staleOf(state, cmd);
  if (stale) {
    const t = lastTouch(state, stale.key, actor.at);
    // the sender's own earlier change doesn't count, unless something changed it again since (the mark differs)
    const mine = !!t && t.by === actor.id && t.mark !== undefined && t.mark === markOf(state, stale.key);
    if (!mine) {
      const other = t && t.by !== actor.id ? t : undefined;
      return { ok: false, message: conflictText(other?.name, other?.verb, stale.noun), conflict: other ? { by: other.by, name: other.name } : {} };
    }
  }
  const seq0 = state.idCounter;
  const res = run();
  if (!res.ok) return res;
  for (const [key, verb] of touchesOf(state, cmd, res)) remember(state, key, verb, actor);
  const sk = settingKey(cmd);
  // a slider dragged or a budget typed sends many values: one line per member and setting in the window, not each
  let repeat = false;
  if (sk) {
    const t = lastTouch(state, sk, actor.at);
    if (t && t.by !== actor.id) res.noteBy = t.name;
    repeat = !!t && t.by === actor.id;
    remember(state, sk, 'changed', actor);
  }
  // tag what this command logged (ids come from one counter that only grows, so they're the ones above seq0)
  let tagged = false;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i];
    const seq = seqOf(e.id);
    if (seq === null || seq <= seq0) break;
    e.by = actor.id;
    e.byName = actor.name;
    tagged = true;
  }
  if (!tagged && res.message && !repeat && !NO_LINE.has(cmd.k)) {
    const e = emitEvent(state, { kind: 'info', text: res.message });
    e.by = actor.id;
    e.byName = actor.name;
  }
  return res;
}

/** The counter value inside an id (`ev_1z` → 71), or null. */
function seqOf(id: string): number | null {
  const i = id.lastIndexOf('_');
  if (i < 0) return null;
  const n = parseInt(id.slice(i + 1), 36);
  return Number.isFinite(n) ? n : null;
}
