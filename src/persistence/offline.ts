/**
 * Offline progress + resume. OWNER: lane "core".
 *
 * When a save is loaded, the real time since `lastTickRealMs` is converted at 1× speed
 * (GAME_HOURS_PER_REAL_SECOND) and capped at OFFLINE_CAP_HOURS, then simulated in chunks under a
 * **maintenance grace period**: `state.offlineGrace = true` is set for the duration of the catch-up and removed after.
 *
 * Contract for sim lanes while `state.offlineGrace` is true (see the field doc in src/types/game.ts):
 *   - lifecycle: never set a creature's status to 'dead'; floor health at GRACE_HEALTH_FLOOR; treat creatures as
 *     receiving minimal rations (hunger ≤ GRACE_MAX_HUNGER) without consuming inventory food. An animal already past
 *     either limit is held where it is, never moved to the limit (that would heal or feed it for free).
 *   - breeding: may progress, but should not cull adults; clutch losses should be no worse than normal.
 *   - water/care: equipment should not fail.
 * Core ALSO enforces a safety net after every chunk (revives any creature that died in the chunk, floors health,
 * caps hunger, caps ammonia/nitrite at a WATCH level and tops off evaporation), so the promise
 * "you never come back to a dead tank" holds even if a lane ignores the flag.
 *
 * A paused game (speed 0 when saved) does not accumulate offline time.
 *
 * lane:fix-core:
 *  - The grace floors never make anything BETTER than it was when the game was saved (P5-02): an animal saved at
 *    health 4 comes back at health 4, not 20; a tank saved at 3.5 ppm ammonia is not cleaned to 0.5. Only what the
 *    catch-up itself would have worsened is held. (Reloading used to heal a dying tank for free.)
 *  - The "While you were away" card, toast and log line only appear after a real absence (OFFLINE_MIN_REAL_MS); a
 *    quick reload still catches up quietly (P7-10). The card pauses the clock while it is open (S06-02).
 *  - A tab that was hidden for OFFLINE_HIDDEN_MIN_MS or longer catches up the same way when it comes back (P5-09),
 *    instead of only when the save is re-opened.
 */
import { create } from 'zustand';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { loadGameDetailed, latestSaveSlot, isStaleGame, noteCatchUp } from './slots';
import { mutateFast } from '@/game/fastMutate';
import '@/game/dispatch'; // installs the solo dispatcher (the welcome-back card's resume is a command)
import type { LoadResult } from './types';
import { isSharedShop, takeSharedAwayMs } from './sharedAway'; // chunk 13 (SHARE-010, §7.3)

// chunk 11: the catch-up's rules live in the sim (a shared shop's server runs them too); re-exported for this file's
// callers and tests
export {
  GRACE_HEALTH_FLOOR,
  GRACE_MAX_HUNGER,
  GRACE_MAX_TOXIN_PPM,
  OFFLINE_CHUNK_HOURS,
  OFFLINE_MIN_HOURS,
  OFFLINE_MIN_REAL_MS,
  OFFLINE_HIDDEN_MIN_MS,
  offlineHoursFor,
  simulateOffline,
  summaryWorthShowing,
  type OfflineSummary,
  type SimulateOfflineOptions,
} from '@/sim/catchUp';
import { OFFLINE_HIDDEN_MIN_MS, OFFLINE_MIN_REAL_MS, defaultFocus, simulateOffline, summaryWorthShowing, type OfflineSummary } from '@/sim/catchUp';

/**
 * lane:fix-core (S06-02) — the welcome-back card pauses the clock while it is open, so a 10× aquarium does not race
 * ahead unfed while the player reads what happened. Call on the state that is about to be published; `clear()`
 * restores the speed when the card is dismissed (unless the player already set one).
 */
function pauseForCard(state: GameState, summary: OfflineSummary): void {
  if (state.clock.speed > 0) {
    summary.resumeSpeed = state.clock.speed;
    state.clock.speed = 0;
  }
}

function publishSummary(summary: OfflineSummary): void {
  useResume.setState({ summary });
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aquarium-go:offline-summary', { detail: summary }));
  } catch {
    /* ignore */
  }
}

// ───────────────────────────────── resume ─────────────────────────────────

/** Last "While you were away" summary, for the UI to show a welcome-back card. */
export const useResume = create<{ summary: OfflineSummary | null; clear: () => void }>((set, get) => ({
  summary: null,
  clear: () => {
    const s = get().summary;
    set({ summary: null });
    // Dismissing the card resumes the clock the card paused (if the player has not already pressed play).
    const speed = s?.resumeSpeed;
    // chunk 11: a player action, so a command (persistence may write the store directly only to load, save and catch up)
    if (speed && speed > 0 && useGame.getState().game?.clock.speed === 0) useGame.getState().dispatch({ k: 'setSpeed', speed: speed as 1 | 3 | 10 });
  },
}));

// lane:fix-core (P5-11) — a summary belongs to the aquarium it was made for: drop it when another game (or none)
// takes over, so a fresh New Game is never greeted with the previous aquarium's "While you were away".
useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId && useResume.getState().summary) useResume.setState({ summary: null });
});

export interface ResumeResult extends LoadResult {
  slot: string;
  summary?: OfflineSummary;
}

export interface ResumeOptions {
  /** Put the game into the store and switch the UI to the game screen (default true). */
  apply?: boolean;
  /** Override "now" (tests). */
  now?: number;
}

/**
 * Load a slot, migrate it, simulate bounded offline progress under the grace period, then (by default) make it the
 * running game. This is what the title screen's Continue / Load buttons call.
 */
export async function loadAndResume(slot = 'auto', opts: ResumeOptions = {}): Promise<ResumeResult> {
  const res = await loadGameDetailed(slot);
  if (!res.ok || !res.state) return { ...res, slot };
  const { state, summary } = resumeState(res.state, opts);
  return { ...res, state, slot, summary };
}

/**
 * The second half of `loadAndResume` for a state already in hand: the bounded offline catch-up on a copy, the
 * welcome-back card, and (by default) the running game and the game screen. Chunk 8 (ONLINE-STAGE1.md §6): the online
 * save's "Load online save" stores the online copy in the autosave slot, then resumes that very state, so no autosave
 * can land between storing it and reading it back.
 */
export function resumeState(loaded: GameState, opts: ResumeOptions = {}): { state: GameState; summary?: OfflineSummary } {
  let state = loaded;
  state.isShowcase = false;
  const now = opts.now ?? Date.now();
  const since0 = Number.isFinite(state.lastTickRealMs) && state.lastTickRealMs > 0 ? state.lastTickRealMs : state.lastSavedRealMs;
  // chunk 13 (SHARE-010): the time this save waited while its player was in a shared shop is no time away
  const since = (Number.isFinite(since0) ? since0 : now) + takeSharedAwayMs(state.saveId);
  const elapsed = Math.max(0, now - since);
  let summary: OfflineSummary | undefined;
  try {
    // lane:core (B-001, security-data-1 SD-10) — catch up on a copy: a catch-up that throws part-way must never become
    // the running game, half simulated, and then be autosaved.
    const caughtUp: GameState = typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
    summary = simulateOffline(caughtUp, elapsed);
    state = caughtUp;
  } catch (e) {
    // A sim bug must never block loading a save: resume the save exactly as it was loaded, without the catch-up.
    if (typeof console !== 'undefined') console.warn('[aquarium-go] offline catch-up failed; resuming without it', e);
  }
  state.lastTickRealMs = now;
  const card = summaryWorthShowing(summary) ? summary : null;
  if (opts.apply !== false && card) pauseForCard(state, card);
  if (opts.apply !== false) {
    useGame.getState().setGame(state);
    const focus = defaultFocus(state);
    useUI.getState().set({
      screen: 'game',
      view: 'tank',
      focusedTankId: focus,
      panel: null,
      panelTarget: null,
      tool: 'none',
      selectedCreatureId: null,
      followCreatureId: null,
      partyMode: false,
      photoMode: false,
    });
    if (card) publishSummary(card);
    else if (state.clock.speed === 0) {
      // A game saved paused comes back paused: say so instead of leaving a silently stopped clock.
      try {
        useUI.getState().toast('Your aquarium is paused — press play when you’re ready.', 'info');
      } catch {
        /* ignore */
      }
    }
  }
  return { state, summary };
}

/**
 * lane:fix-core (P5-09) — bounded catch-up for a tab that was hidden for `hiddenMs` and is visible again. Below
 * OFFLINE_HIDDEN_MIN_MS nothing happens (a short switch away simply paused the game, as before). Uses the same cap,
 * grace rules and welcome-back card as loading a save. Returns the summary when a catch-up ran.
 */
export function catchUpAfterHidden(hiddenMs: number): OfflineSummary | null {
  if (!(hiddenMs >= OFFLINE_HIDDEN_MIN_MS)) return null;
  const g = useGame.getState().game;
  if (!g || g.isShowcase || g.clock.speed === 0) return null;
  if (isSharedShop(g)) return null; // chunk 13 (§7.3): the server catches a shared shop up, never a browser
  if (useUI.getState().screen !== 'game') return null;
  if (isStaleGame(g.saveId)) return null; // another tab owns this aquarium; its world is the one moving on
  // lane:core (S0 review) — the world may have caught up during the hidden spell already (a load that finished while
  // the tab was hidden runs its own catch-up and moves lastTickRealMs to that moment): only the time since then is
  // missing. Without this the overlap was simulated twice.
  const sinceTick = Number.isFinite(g.lastTickRealMs) ? Math.max(0, Date.now() - g.lastTickRealMs) : hiddenMs;
  const awayMs = Math.min(hiddenMs, sinceTick);
  if (!(awayMs >= OFFLINE_HIDDEN_MIN_MS)) return null;
  let summary: OfflineSummary | null = null;
  try {
    mutateFast((d) => {
      summary = simulateOffline(d, awayMs);
      d.lastTickRealMs = Date.now();
      if (summaryWorthShowing(summary)) pauseForCard(d, summary);
    });
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[aquarium-go] catch-up after a hidden spell failed', e);
    return null;
  }
  // lane:fix3-saves (R03-01) — catch-up is not play: a forgotten tab must not look further along because of it.
  if (summary) noteCatchUp(g.saveId, (summary as OfflineSummary).hours);
  if (summaryWorthShowing(summary)) publishSummary(summary);
  return summary;
}

/** Continue the most recently saved slot. */
export async function continueGame(opts: ResumeOptions = {}): Promise<ResumeResult> {
  const slot = await latestSaveSlot();
  if (!slot) return { ok: false, slot: 'auto', code: 'empty', error: 'No saved game yet.' };
  return loadAndResume(slot, opts);
}
