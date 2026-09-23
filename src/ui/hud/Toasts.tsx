/**
 * Toasts: `ui.toasts` (UI feedback) + new `state.log` events flagged `toast: true` (sim events).
 *
 * Quiet by design — the aquarium is the hero:
 *  - They live in the free column at the top-left, under the tank switcher (beside the tank card when it is open),
 *    so they never cover a right-hand panel and barely touch the tank.
 *  - At most 3 on screen (2 on phones). The rest wait in a priority queue (danger → warning → celebrations →
 *    market/visitors → routine), and stale routine news is dropped (it is always in the event log).
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
import { useUI, type PanelId } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { EventIcon, type AnyKind } from './eventIcons';
import { focusTank } from './AlertsPopover';
import { useShell } from '../common/shellStore';
import { safe, useMedia } from '../common/safe';
import { tutorialChain } from '@/data/quests';
import { BOTTOM_SHEET_QUERY } from '../common/Sheet';
import { useDockedCard } from './cardDock';
import { UNLOCK_KEYS } from '@/data/unlockKeys'; // lane:w2-ui

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

const PRIORITY: Partial<Record<AnyKind, number>> = { death: 6, danger: 6, warning: 5, celebrate: 4, unlock: 4, breeding: 4, market: 3, visitor: 3, success: 2, info: 1, tip: 1 };
const TTL: Partial<Record<AnyKind, number>> = { death: 9000, danger: 8500, warning: 6500, celebrate: 5200, unlock: 5000, breeding: 5500, market: 4600, visitor: 4200, success: 3000, info: 3400, tip: 3000 };
const MERGE_WINDOW = 6000;
/** Routine news that waited this long in the queue is dropped (it is in the event log). */
const STALE_MS = 9000;

const prio = (k: AnyKind) => PRIORITY[k] ?? 2;
/** Routine news that never made it on screen within STALE_MS. */
const isStale = (e: Entry, now: number, shown: Set<string>) => prio(e.kind) <= 3 && now - e.born > STALE_MS && !shown.has(e.key);

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

interface ToastLink {
  panel: PanelId;
  target: string | null;
  /** Short "where" line shown under the title. */
  where: string;
}

const UNLOCK_LINKS: Record<string, ToastLink> = {
  shows: { panel: 'shows', target: 'tab:upcoming', where: 'Enter a healthy adult from Shows in the dock.' },
  shows_regional: { panel: 'shows', target: 'tab:upcoming', where: 'Regional shows are on the Shows calendar.' },
  shows_national: { panel: 'shows', target: 'tab:upcoming', where: 'National championships are on the Shows calendar.' },
  shows_international: { panel: 'shows', target: 'tab:upcoming', where: 'International championships are on the Shows calendar.' },
  photo_contests: { panel: 'shows', target: 'tab:upcoming', where: 'Aquascape classes open at shows.' },
  staff: { panel: 'visitors', target: 'tab:staff', where: 'Hire your first keeper in Visitors › Staff.' },
  visitors: { panel: 'visitors', target: 'tab:visitors', where: 'Open your doors in Visitors.' },
  brackish: { panel: 'build', target: 'tab:tanks', where: 'Set up a brackish tank in Build › Tanks.' },
  decor_mangrove: { panel: 'build', target: 'tab:decor', where: 'Find them in Build › Decor.' },
  market_listings: { panel: 'market', target: 'tab:listings', where: 'List animals in Market › My listings.' },
  tank_auctions: { panel: 'market', target: 'tab:listings', where: 'List a whole aquarium in Market › My listings.' },
  nursery: { panel: 'tanks', target: null, where: 'Set a tank’s purpose in Tanks.' },
};

/** Where an unlock key lives (feature keys above; tanks, gear, livestock and venues by family). */
function unlockLink(key: string): ToastLink | null {
  if (UNLOCK_LINKS[key]) return UNLOCK_LINKS[key];
  if (key.startsWith('tank_')) return { panel: 'build', target: 'tab:tanks', where: 'Buy it in Build › Tanks.' };
  if (key.startsWith('gear_')) return { panel: 'market', target: 'tab:supplies', where: 'Find it in Market › Supplies.' };
  if (key.startsWith('facility_')) return { panel: 'build', target: 'tab:facility', where: 'Move in from Build › Facility.' };
  if (key.startsWith('decor_')) return { panel: 'build', target: 'tab:decor', where: 'Find it in Build › Decor.' };
  if (/^(fw_|marine_)/.test(key) || key === 'reef' || key === 'predators') return { panel: 'market', target: 'tab:shop', where: 'New species arrive in Market › Shop.' };
  return null;
}

const UNLOCK_KEY_BY_LABEL: Record<string, string> = Object.fromEntries(Object.entries(UNLOCK_KEYS).map(([k, label]) => [label, k]));

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
  // lane:w2-ui — show results: "The judge’s cards are in Shows." → open Shows › Results
  if (/The judge’s cards (are in Shows|explain why)\.$/.test(text)) return { title: text, link: { panel: 'shows', target: 'tab:results', where: '' } };
  m = /^New arrivals at the shop:\s*(.+?)\.?$/.exec(text);
  if (m) return { label: 'New at the shop', title: m[1] };
  m = /^Market special:\s*(.+)$/.exec(text);
  if (m) return { label: 'Market special', title: m[1] };
  return { title: text };
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

/** New log events flagged `toast` (skips the backlog of a loaded save). */
function useLogToasts(push: (e: GameEvent) => void) {
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
      if (s.game !== p.game) check(s.game);
    });
  }, [push]);
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

export function Toasts() {
  const screen = useUI((s) => s.screen);
  // Cinematic modes stay clean: only urgent news breaks through.
  const quiet = useUI((s) => s.hudHidden || s.photoMode);
  // The event log drawer lists everything: opening it clears the toasts (they would only repeat it).
  const drawer = useShell((s) => s.popover === 'alerts');
  const leftSheet = useDockedCard() === 'tank' && screen === 'game';
  const bottomSheets = useMedia(BOTTOM_SHEET_QUERY);
  const phone = useMedia('(max-width: 720px)');

  const [entries, setEntries] = useState<Entry[]>([]);
  const seq = useRef(0);
  /** Keys that have been on screen at least once (never dropped as stale). */
  const everShown = useRef(new Set<string>());
  const lastCue = useRef<Record<string, number>>({});

  const add = useCallback((kind: AnyKind, text: string, extra: { tankId?: string; creatureId?: string; uiId?: number; source: 'ui' | 'log' }) => {
    const group = groupOf(kind, text, (useGame.getState().game?.tankOrder.length ?? 0) >= 4 /* lane:qa-final */);
    // The guide card shows its own "done" line; only toast tutorial tips when the guide is hidden.
    if (group === 'tip' && extra.source === 'log' && isGuideDoneLine(text)) return;
    const now = performance.now();
    setEntries((list) => {
      const live = list.filter((e) => !isStale(e, now, everShown.current));
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
      add(e.kind, e.text, { tankId: e.tankId, creatureId: e.creatureId, source: 'log' });
      const cue = e.kind === 'celebrate' || e.kind === 'unlock' ? 'celebrate' : e.kind === 'danger' || e.kind === 'death' ? 'warning' : e.kind === 'breeding' ? 'birth' : e.kind === 'market' ? 'bid' : null;
      // one cue per burst
      const now = performance.now();
      if (cue && now - (lastCue.current[cue] ?? -1e9) > 1500) {
        lastCue.current[cue] = now;
        sfx(cue);
      }
    },
    [add],
  );
  useLogToasts(pushLog);

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

  // Choose what is on screen: highest priority first, then oldest; shown in arrival order.
  const max = phone ? 2 : 3;
  const now = performance.now();
  const eligible = drawer ? [] : entries.filter((e) => (!quiet || e.kind === 'danger' || e.kind === 'death') && !isStale(e, now, everShown.current));
  const shown = [...eligible]
    .sort((a, b) => prio(b.kind) - prio(a.kind) || a.born - b.born)
    .slice(0, max)
    .sort((a, b) => a.born - b.born);
  useEffect(() => {
    for (const e of shown) everShown.current.add(e.key);
  });

  return (
    <div
      className={clsx('ag-toasts', screen !== 'game' && 'is-onboarding', leftSheet && !bottomSheets && 'has-left-sheet')}
      aria-live="polite"
      aria-relevant="additions"
    >
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
  // a toast on its way out (fading) is no longer "on screen": no test id, no pointer events
  const present = useIsPresent();
  const done = useRef(onDone);
  done.current = onDone;
  const v = viewOf(e);
  const ttl = (TTL[e.kind] ?? 4000) + (e.texts.length > 1 ? 1200 : 0);
  useEffect(() => {
    if (hover) return;
    const t = window.setTimeout(() => done.current(), ttl);
    return () => window.clearTimeout(t);
  }, [hover, ttl, e.rev]);
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
      className={clsx('ag-toast', `ag-toast--${e.kind}`, celebrate && 'is-celebrate', hover && present && 'is-expanded', !present && 'is-leaving')}
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
      <span className="ag-toast__timer" key={e.rev} style={{ animationDuration: `${ttl}ms`, animationPlayState: hover ? 'paused' : 'running' }} aria-hidden />
    </motion.div>
  );
}
