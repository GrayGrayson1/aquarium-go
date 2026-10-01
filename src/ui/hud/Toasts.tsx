/**
 * Toasts: `ui.toasts` (UI feedback) + new `state.log` events flagged `toast: true` (sim events).
 *
 * Quiet by design — the aquarium is the hero:
 *  - They live in the free column at the top-left, under the tank switcher (beside the tank card when it is open),
 *    so they never cover a right-hand panel and barely touch the tank.
 *  - At most 3 on screen (2 on phones; 1 on a phone held sideways while a sheet is open, in the sheet's header). The
 *    rest wait in a priority queue (danger → warning → celebrations → market/visitors → routine), and stale routine
 *    news is dropped (it is always in the event log).
 *  - The lasting prompts (another tab played further, a new version is ready) head the column, above the toasts.
 *  - Bursts merge: several achievements / unlocks / bids / visitor tips inside a few seconds become one
 *    "3 new achievements" toast that opens the event log.
 *  - Routine feedback is short-lived; tutorial "step done" lines are folded into the guide card while it is visible.
 * OWNER: lane "ui-shell".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { X } from 'lucide-react';
import type { GameEvent } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { EventIcon, type AnyKind } from './eventIcons';
import { focusTank } from './AlertsPopover';
import { useShell } from '../common/shellStore';
import { MOBILE_QUERY, SHORT_LANDSCAPE_QUERY, safe, useMedia } from '../common/safe';
import { tutorialChain } from '@/data/quests';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { useDockedCard } from './cardDock';
import { SHOW_RESULT_TEXT, UNLOCK_KEY_BY_LABEL, eventLink, unlockLink, type EventLink } from './eventLinks'; // lane:notify
import { convertTempText } from '../common/format';
import { isExpired, pickShown, prio, ttlOf, PREEMPT_AFTER_MS, URGENT_PRIO } from './toastQueue';
import { UpdatePrompt, useNewBuildAvailable } from './UpdatePrompt';
import { StaleTabBanner, useStaleBanner } from '@/game/StaleTabBanner';

interface Entry {
  key: string;
  kind: AnyKind;
  /** Merge bucket (achievement, unlock, bid, visitor…) or null. */
  group: string | null;
  texts: string[];
  tankId?: string;
  creatureId?: string;
  uiIds: number[];
  /** performance.now() when the entry was created (merge window + staleness). */
  born: number;
  /** Bumped when a merge restarts the timer. */
  rev: number;
}

const MERGE_WINDOW = 6000;
/** Routine news that waited this long in the queue is dropped (it is in the event log). */
const STALE_MS = 9000;

/** Routine news that never made it on screen within STALE_MS. */
const isStale = (e: Entry, now: number, shown: ReadonlyMap<string, number>) => prio(e.kind) <= 3 && now - e.born > STALE_MS && !shown.has(e.key);

/** lane:qa-final — brood-loss warnings (adults eating a clutch, a brood lost in the display). */
const BROOD_WARNING = /\bare eating .+’s (eggs|larvae|fry|wrigglers)\b|\bis eating (her|his|their) own\b|’s brood didn’t make it\b/;

function groupOf(kind: AnyKind, text: string, busy = false): string | null {
  // lane:qa-final — a big venue's pairs spawn around the clock (a staffed big_facility: ~25 breeding toasts and ~15
  // brood warnings per game day, one every few real seconds). With 4+ tanks a burst merges into one "N breeding
  // updates" / "N brood warnings" toast that opens the log; a first home tank still gets each moment on its own.
  if (busy && kind === 'breeding') return 'breeding';
  if (busy && kind === 'warning' && BROOD_WARNING.test(text)) return 'brood';
  if (kind === 'celebrate' && text.startsWith('Achievement:')) return 'achievement';
  if (kind === 'unlock') return 'unlock';
  if (kind === 'market' && / offered /.test(text)) return 'bid';
  if (kind === 'market' && text.startsWith('New arrivals')) return 'arrivals';
  if (kind === 'visitor') return 'visitor';
  if (kind === 'tip') return 'tip';
  return null;
}

interface View {
  label?: string;
  title: string;
  detail?: string;
  /** Merged entries open the event log. */
  opensLog?: boolean;
  /** lane:w2-ui — where this news lives: clicking the toast opens that panel. */
  link?: ToastLink;
  /** lane:qa-final — headline feature unlocks (see HEADLINE_UNLOCKS) lead a merged unlock toast. */
  headline?: number;
}

// ───────────── lane:w2-ui: unlocks say where the new thing lives ─────────────
// "Unlocked: Shows & championships" alone never told a new player where Shows are. Feature unlocks now carry a short
// "where" line and open the right panel on click; show results open Shows › Results (the text says the cards are there).
// lane:notify — the link table lives in ./eventLinks, shared with the alerts drawer and the Log panel.

type ToastLink = Pick<EventLink, 'panel' | 'target' | 'where'>;

/**
 * lane:qa-final — whole new features, in order of importance. Finishing the guide unlocks Shows together with party
 * mode and nursery tanks; merged as "Party / music mode, Nursery & breeding tanks and 1 more" the Shows unlock was
 * invisible. A merged burst now names the headline feature first and opens its panel.
 */
const HEADLINE_UNLOCKS = ['shows', 'staff', 'visitors', 'brackish', 'market_listings', 'tank_auctions'];

function parse(text: string): View {
  let m = /^Achievement:\s*(.+?)\s+—\s+(.+)$/.exec(text);
  if (m) return { label: 'Achievement', title: m[1], detail: m[2] };
  m = /^Unlocked:\s*(.+)$/.exec(text);
  if (m) {
    // lane:w2-ui — say where it lives, and open it on click
    const key = UNLOCK_KEY_BY_LABEL[m[1]];
    const link = key ? unlockLink(key) : null;
    const headline = key ? HEADLINE_UNLOCKS.indexOf(key) : -1;
    return { label: 'Unlocked', title: m[1], detail: link?.where, link: link ?? undefined, ...(headline >= 0 ? { headline } : {}) };
  }
  // lane:w2-ui — show results: "The judge’s cards are in Shows." → open Shows › Results (lane:notify: and entries the
  // club sent home — "… The club refunded the fee." — which the Results tab lists too)
  if (SHOW_RESULT_TEXT.test(text)) return { title: text, link: { panel: 'shows', target: 'tab:results', where: '' } };
  m = /^New arrivals at the shop:\s*(.+?)\.?$/.exec(text);
  if (m) return { label: 'New at the shop', title: m[1] };
  m = /^Market special:\s*(.+)$/.exec(text);
  if (m) return { label: 'Market special', title: m[1] };
  // lane:notify — anything else with a home (finished research → Research)
  const link = eventLink({ kind: 'info', text });
  return link ? { title: text, link } : { title: text };
}

function viewOf(e: Entry): View {
  const n = e.texts.length;
  if (n <= 1) return parse(e.texts[0] ?? '');
  const views = e.texts.map(parse);
  const list = (xs: string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, 2).join(', ')} and ${xs.length - 2} more`);
  switch (e.group) {
    case 'achievement':
      return { label: `${n} new achievements`, title: list(views.map((v) => v.title)), opensLog: true };
    case 'unlock': {
      // lane:w2-ui — unlocks that arrive together and live in one panel (Brackish fish + mangrove decor → Build)
      // still take you there; a mixed burst opens the event log
      const links = views.map((v) => v.link).filter((l): l is ToastLink => !!l);
      const one = links.length === views.length && links.every((l) => l.panel === links[0].panel) ? links[0] : null;
      // lane:qa-final — headline features first (stable sort); a mixed burst with one opens that feature's panel.
      const rank = (v: View) => v.headline ?? HEADLINE_UNLOCKS.length;
      const ordered = [...views].sort((a, b) => rank(a) - rank(b));
      const lead = one ?? (ordered[0].headline !== undefined ? ordered[0].link ?? null : null);
      return { label: `${n} new unlocks`, title: list(ordered.map((v) => v.title)), ...(lead ? { link: lead, detail: lead.where } : { opensLog: true }) };
    }
    case 'bid':
      return { label: 'Market', title: `${n} new bids on your listings`, detail: views[n - 1].title, opensLog: true };
    case 'visitor':
      return { label: 'Visitors', title: `${n} visitor updates`, detail: views[n - 1].title, opensLog: true };
    case 'breeding': // lane:qa-final
      return { label: 'Breeding', title: `${n} breeding updates`, detail: views[n - 1].title, opensLog: true };
    case 'brood': // lane:qa-final
      return { label: 'Broods', title: `${n} brood warnings`, detail: views[n - 1].title, opensLog: true };
    case 'arrivals':
      return { label: 'New at the shop', title: views.map((v) => v.title).join(', '), opensLog: true };
    default:
      return { ...views[n - 1], opensLog: true };
  }
}

/**
 * New log events flagged `toast` (skips the backlog of a loaded save). When another aquarium takes over (a new game, a
 * loaded slot, back to the title) `reset` drops the previous one's toasts: "Welcome home, Betta Barn!" used to greet
 * the axolotl game started right after it.
 */
function useLogToasts(push: (e: GameEvent) => void, reset: () => void) {
  const seen = useRef<{ saveId: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    const check = (game: ReturnType<typeof useGame.getState>['game']) => {
      if (!game || game.isShowcase) return;
      const cur = seen.current;
      if (!cur || cur.saveId !== game.saveId) {
        // New or loaded save: only toast brand-new games' opening events.
        const fresh = Date.now() - game.createdRealMs < 20000;
        const ids = new Set<string>();
        for (const e of game.log) {
          if (fresh && e.toast) push(e);
          ids.add(e.id);
        }
        seen.current = { saveId: game.saveId, ids };
        return;
      }
      for (let i = Math.max(0, game.log.length - 30); i < game.log.length; i++) {
        const e = game.log[i];
        if (cur.ids.has(e.id)) continue;
        cur.ids.add(e.id);
        // lane:qa-play — the offline summary always comes with the "While you were away" card (loadAndResume); loading
        // a slot of the running game used to toast the same line on top of it
        if (e.kind === 'info' && e.text.startsWith('While you were away')) continue;
        if (e.toast) push(e);
      }
      if (cur.ids.size > 600) cur.ids = new Set(game.log.map((e) => e.id));
    };
    check(useGame.getState().game);
    return useGame.subscribe((s, p) => {
      if (s.game === p.game) return;
      if (seen.current && s.game?.saveId !== p.game?.saveId && s.game?.saveId !== seen.current.saveId) reset();
      check(s.game);
    });
  }, [push, reset]);
}

/** A tutorial "step done" line while the guide card is on screen (the card shows it instead). */
function isGuideDoneLine(text: string): boolean {
  const g = useGame.getState().game;
  const t = g?.progress?.tutorial;
  // (when the guide has just finished, its finale card says it instead of a toast)
  if (!useSettings.getState().showTutorialHints || !g || g.isShowcase || !t || t.skipped) return false;
  return safe(
    'guideDoneLine',
    () => {
      const starter = Object.values(g.creatures).find((c) => c.isStarter);
      const name = starter?.name ?? '';
      return tutorialChain(t.starterId || g.starterId).some((s) => {
        if (!s.done) return false;
        const prefix = s.done.replace(/\{name\}/g, name).split('{species}')[0];
        return prefix.length > 0 && text.startsWith(prefix);
      });
    },
    false,
  );
}

/**
 * Phones: a full-height bottom sheet owns its top (header, tabs, filters — P4-06) and its foot (buy bar, panel
 * switcher — X-1), so the stack sits at the bottom of the sheet's scrolling body, over content the player can scroll
 * away from under it. Returns that band's distance from the bottom of the viewport, or null (normal placement).
 * A phone held sideways has room for nothing else: there every bottom sheet counts, whatever its height (R07-04), and
 * its scrolling body is only ~155 px tall, so the one toast it allows sits in the sheet's header row instead, just
 * left of its close button (the free space between the title and the X): `{ top, right }`.
 */
type SheetBand = { bottom: number } | { top: number; right: number };

/** A compact one-line toast's height on phones (hud.css), to centre it on the header's close button. */
const COMPACT_TOAST_H = 42;

function useSheetBand(active: boolean, landscape: boolean): SheetBand | null {
  const [band, setBand] = useState<SheetBand | null>(null);
  useEffect(() => {
    if (!active) {
      setBand(null);
      return;
    }
    const same = (a: SheetBand | null, b: SheetBand | null) => JSON.stringify(a) === JSON.stringify(b);
    const measure = () => {
      if (landscape) {
        const close = document.querySelector<HTMLElement>('.pn-sheet--bottom [data-testid="panel-close"], .ag-sheet--bottom .ag-sheet__close');
        const sheet = close?.closest<HTMLElement>('.pn-sheet, .ag-sheet');
        const c = close?.getBoundingClientRect();
        let next: SheetBand | null = null;
        if (sheet && c && c.width > 0) {
          // where the button comes to rest: the sheet may still be sliding up (its transform is not part of its place)
          let slide = 0;
          try {
            slide = new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;
          } catch {
            /* 'none' or an older engine */
          }
          next = { top: Math.max(4, Math.round(c.top - slide + (c.height - COMPACT_TOAST_H) / 2)), right: Math.round(window.innerWidth - c.left + 8) };
        }
        setBand((b) => (same(b, next) ? b : next));
        return;
      }
      const body = document.querySelector<HTMLElement>('.pn-sheet--bottom.is-max .pn-body, .ag-sheet--bottom.is-expanded .ag-sheet__body');
      const r = body?.getBoundingClientRect();
      let floor = r && r.height > 0 ? r.bottom : null;
      // bars pinned to the bottom of the scrolling body (the offer's buy bar, a wizard's nav) count as its foot
      if (body && floor != null) {
        for (const bar of body.querySelectorAll<HTMLElement>('.pn-buybar, .pn-wizard__nav')) {
          const b = bar.getBoundingClientRect();
          if (b.height > 0 && b.top < floor && b.bottom > r!.top + r!.height / 2) floor = b.top;
        }
      }
      const next = floor != null ? { bottom: Math.max(0, Math.round(window.innerHeight - floor)) } : null;
      setBand((b) => (same(b, next) ? b : next));
    };
    measure();
    // the sheet springs open, swaps its footer (offer detail ↔ list) and follows the keyboard: re-measure while toasts are up
    const id = window.setInterval(measure, 300);
    return () => window.clearInterval(id);
  }, [active, landscape]);
  return active ? band : null;
}

export function Toasts() {
  const screen = useUI((s) => s.screen);
  // Cinematic modes stay clean: only urgent news breaks through.
  const quiet = useUI((s) => s.hudHidden || s.photoMode);
  // The event log drawer lists everything: opening it clears the toasts (they would only repeat it).
  const drawer = useShell((s) => s.popover === 'alerts');
  const docked = useDockedCard();
  const leftSheet = docked === 'tank' && screen === 'game';
  const bottomSheets = useMedia(BOTTOM_SHEET_QUERY);
  const phone = useMedia(MOBILE_QUERY);
  const landscape = useMedia(SHORT_LANDSCAPE_QUERY);
  // a phone held sideways with a sheet open (it covers everything but the top bar): one toast, in the sheet's header
  const sheetUp = useUI((s) => !!s.panel) || !!docked;
  const headerOnly = landscape && screen === 'game' && sheetUp;
  const stale = useStaleBanner();

  const [entries, setEntries] = useState<Entry[]>([]);
  const seq = useRef(0);
  /** When each key first went on screen (never dropped as stale; expires after its lifetime once off screen). */
  const shownAt = useRef(new Map<string, number>());
  /** Keys on screen after the last commit: they stay up until dismissed, whatever arrives behind them. */
  const onScreen = useRef(new Set<string>());
  const [, setRecheck] = useState(0);

  const add = useCallback((kind: AnyKind, text: string, extra: { tankId?: string; creatureId?: string; uiId?: number; source: 'ui' | 'log' }) => {
    const group = groupOf(kind, text, (useGame.getState().game?.tankOrder.length ?? 0) >= 4 /* lane:qa-final */);
    // The guide card shows its own "done" line; only toast tutorial tips when the guide is hidden.
    if (group === 'tip' && extra.source === 'log' && isGuideDoneLine(text)) return;
    const now = performance.now();
    setEntries((list) => {
      const live = list.filter((e) => !isStale(e, now, shownAt.current) && !(isExpired(e, shownAt.current.get(e.key), now) && !onScreen.current.has(e.key)));
      if (group && group !== 'tip') {
        const i = live.findIndex((e) => e.group === group && now - e.born < MERGE_WINDOW);
        if (i >= 0) {
          const m = live[i];
          if (m.texts.includes(text)) return live;
          const merged: Entry = { ...m, texts: [...m.texts, text], rev: m.rev + 1, tankId: m.tankId === extra.tankId ? m.tankId : undefined, creatureId: undefined, uiIds: extra.uiId != null ? [...m.uiIds, extra.uiId] : m.uiIds };
          return [...live.slice(0, i), merged, ...live.slice(i + 1)];
        }
      }
      // identical text already up: just restart it
      const dup = live.findIndex((e) => e.texts.length === 1 && e.texts[0] === text);
      if (dup >= 0) {
        const d = live[dup];
        return [...live.slice(0, dup), { ...d, rev: d.rev + 1, uiIds: extra.uiId != null ? [...d.uiIds, extra.uiId] : d.uiIds }, ...live.slice(dup + 1)];
      }
      const e: Entry = { key: `t${++seq.current}`, kind, group, texts: [text], tankId: extra.tankId, creatureId: extra.creatureId, uiIds: extra.uiId != null ? [extra.uiId] : [], born: now, rev: 0 };
      return [...live, e].slice(-14);
    });
  }, []);

  const pushLog = useCallback(
    (e: GameEvent) => {
      // no sound here: the audio director voices log events (src/audio/cues.ts), one cue per burst
      add(e.kind, e.text, { tankId: e.tankId, creatureId: e.creatureId, source: 'log' });
    },
    [add],
  );
  const resetForGame = useCallback(() => {
    setEntries((list) => {
      for (const e of list) for (const id of e.uiIds) useUI.getState().dismissToast(id);
      return list.length ? [] : list;
    });
  }, []);
  useLogToasts(pushLog, resetForGame);

  // UI feedback toasts (ui.toast()).
  useEffect(() => {
    const seen = new Set<number>(useUI.getState().toasts.map((t) => t.id));
    for (const t of useUI.getState().toasts) add(t.kind, t.text, { uiId: t.id, source: 'ui' });
    return useUI.subscribe((s, p) => {
      if (s.toasts === p.toasts) return;
      for (const t of s.toasts) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        add(t.kind, t.text, { uiId: t.id, source: 'ui' });
      }
    });
  }, [add]);

  useEffect(() => {
    if (!drawer) return;
    setEntries((list) => {
      for (const e of list) for (const id of e.uiIds) useUI.getState().dismissToast(id);
      return [];
    });
  }, [drawer]);

  const dismiss = useCallback((key: string) => {
    setEntries((list) => {
      const e = list.find((x) => x.key === key);
      if (e) for (const id of e.uiIds) useUI.getState().dismissToast(id);
      return list.filter((x) => x.key !== key);
    });
  }, []);

  // Choose what is on screen: what is already up stays up, free slots go by priority (see toastQueue.ts).
  // (the stale-tab banner heads the column and takes one toast's place)
  const max = headerOnly ? 1 : (phone ? 2 : 3) - (stale ? 1 : 0);
  const now = performance.now();
  const eligible = drawer
    ? []
    : entries.filter((e) => (!quiet || e.kind === 'danger' || e.kind === 'death') && !isStale(e, now, shownAt.current) && !(isExpired(e, shownAt.current.get(e.key), now) && !onScreen.current.has(e.key)));
  // danger / death news takes the place of routine news that has been up a moment (that toast is then finished)
  const preempt = { bumped: [] as string[] };
  const shown = pickShown(eligible, onScreen.current, max, shownAt.current, now, preempt);
  useEffect(() => {
    onScreen.current = new Set(shown.map((e) => e.key));
    for (const key of preempt.bumped) dismiss(key);
    for (const e of shown) if (!shownAt.current.has(e.key)) shownAt.current.set(e.key, performance.now());
    if (shownAt.current.size > 400) for (const k of shownAt.current.keys()) if (!onScreen.current.has(k) && !entries.some((e) => e.key === k)) shownAt.current.delete(k);
    // urgent news still waiting for a routine toast to have been readable for a moment: look again once it has
    if (!eligible.some((e) => prio(e.kind) >= URGENT_PRIO && !shown.includes(e))) return;
    const at = shown.filter((e) => prio(e.kind) <= 3).map((e) => shownAt.current.get(e.key) ?? performance.now());
    if (!at.length) return;
    const t = window.setTimeout(() => setRecheck((n) => n + 1), Math.max(50, Math.min(...at) + PREEMPT_AFTER_MS - performance.now() + 30));
    return () => window.clearTimeout(t);
  });

  const update = useNewBuildAvailable();
  // the lasting prompts wait for that sheet to close: in its header they would hang over its tabs and list
  const prompts = !headerOnly && (!!update || stale);
  const band = useSheetBand(phone && screen === 'game' && (shown.length > 0 || prompts), landscape);
  return (
    <div
      className={clsx('ag-toasts', screen !== 'game' && 'is-onboarding', leftSheet && !bottomSheets && 'has-left-sheet')}
      style={band == null ? undefined : 'bottom' in band ? { top: 'auto', bottom: band.bottom + 8, flexDirection: 'column-reverse' } : { top: band.top, bottom: 'auto', right: band.right, flexDirection: 'column' }}
      aria-live="polite"
      aria-relevant="additions"
    >
      {stale && !headerOnly && <StaleTabBanner />}
      {update && !headerOnly && <UpdatePrompt version={update.version} />}
      <AnimatePresence initial={false}>
        {shown.map((e) => (
          <ToastItem key={e.key} e={e} onDone={() => dismiss(e.key)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ e, onDone }: { e: Entry; onDone: () => void }) {
  const [hover, setHover] = useState(false);
  // a tap on the text (phones have no hover) opens the whole message and gives it extra time
  const [pinned, setPinned] = useState(false);
  // a toast on its way out (fading) is no longer "on screen": no test id, no pointer events
  const present = useIsPresent();
  const done = useRef(onDone);
  done.current = onDone;
  // sim lines quote water temperatures in °C: °F players read their own unit (as on the cards and the guide)
  const unit = useSettings((s) => s.tempUnit);
  const raw = viewOf(e);
  const v = { ...raw, title: convertTempText(raw.title, unit) ?? raw.title, detail: convertTempText(raw.detail, unit) };
  const ttl = ttlOf(e.kind, e.texts) + (pinned ? 6000 : 0);
  useEffect(() => {
    if (hover) return;
    const t = window.setTimeout(() => done.current(), ttl);
    return () => window.clearTimeout(t);
  }, [hover, ttl, e.rev]);
  const expanded = (hover || pinned) && present;
  const celebrate = e.kind === 'celebrate' || e.kind === 'unlock';
  const actionable = !!e.tankId || !!v.opensLog || !!v.link;
  const onAct = () => {
    if (v.opensLog) {
      sfx('open');
      useShell.getState().set({ popover: 'alerts' });
    } else if (v.link) {
      // lane:w2-ui — unlocks / show results open where they live
      sfx('open');
      useUI.getState().set({ panel: v.link.panel, panelTarget: v.link.target });
    } else if (e.tankId) {
      focusTank(e.tankId, false);
      if (e.creatureId) useUI.getState().set({ selectedCreatureId: e.creatureId });
    }
    onDone();
  };
  const body = (
    <>
      {v.label && <span className="ag-toast__label">{v.label}</span>}
      <span className="ag-toast__title">{v.title}</span>
      {v.detail && <span className="ag-toast__detail">{v.detail}</span>}
    </>
  );
  return (
    <motion.div
      layout="position"
      className={clsx('ag-toast', `ag-toast--${e.kind}`, celebrate && 'is-celebrate', expanded && 'is-expanded', !present && 'is-leaving')}
      data-testid={present ? 'toast' : undefined}
      data-kind={e.kind}
      role={e.kind === 'danger' || e.kind === 'death' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: -14, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -10, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={(ev) => {
        if ((ev.target as HTMLElement).closest('button')) return;
        setPinned((p) => !p);
      }}
    >
      <span className="ag-toast__icon">
        <EventIcon kind={e.kind} size={14} />
      </span>
      {actionable ? (
        <button type="button" className="ag-toast__text ag-toast__text--btn" onClick={onAct} title={v.opensLog ? 'Open the event log' : v.link ? 'Take me there' : 'Go to this tank'}>
          {body}
        </button>
      ) : (
        <span className="ag-toast__text">{body}</span>
      )}
      <button type="button" className="ag-toast__close" aria-label="Dismiss" onClick={onDone}>
        <X size={13} />
      </button>
      <span className="ag-toast__timer" key={`${e.rev}:${pinned ? 1 : 0}`} style={{ animationDuration: `${ttl}ms`, animationPlayState: hover ? 'paused' : 'running' }} aria-hidden />
    </motion.div>
  );
}
