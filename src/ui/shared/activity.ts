/**
 * chunk 13 (SHARED-SHOPS.md §7.3, §8; SHARE-012) — what the other members do, on this screen. Their actions are in
 * the alerts already (every copy logs the same events, tagged with who did it; the line puts the name in front). On
 * top of that:
 *
 * - pop-ups for a pause, a speed change, and a sale or a purchase over $100 ("{name}: Sold the clownfish pair for
 *   $240."), never for this player's own;
 * - their feeds and taps show here as ours do (food falling, the startle wave) on a screen looking at that tank;
 * - the starvation guard's slow-down (a time step's `post`), said from this copy as the solo game says it.
 *
 * OWNER: lane "social".
 */
import type { GameState } from '@/types';
import type { CommandResult } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';
import { isStarving } from '@/sim/life/step';
import { tankDims } from '@/sim/tankSpace';
import { starvationSlowdownText } from '@/sim/starvation';
import { aiFeed, aiTap } from '@/ai/registry';
import { pushVisualEvent, nowSeconds } from '@/runtime/tankRuntime';
import { useUI } from '@/state/ui';
import { SHARED_WORDS as W } from './words';

/**
 * A sale or a purchase over $100 pops up for the others (§8): any command whose own step moves the money by more than
 * that, but a reward or a refund (a quest's prize, a cancelled project, a withdrawn entry or listing, a keeper let go).
 */
const NOT_DEALS: ReadonlySet<string> = new Set(['claimQuest', 'cancelResearch', 'withdrawEntry', 'withdrawListing', 'fireStaff', 'setSpeed']);
export const BIG_DEAL = 100;

/** Another member's routine event: in their alerts with their name, but not a pop-up here (the big ones are). */
export const othersEvent = (e: { by?: string }, you: string | undefined): boolean => !!e.by && e.by !== you;

export interface ActivityDeps {
  you: () => string;
  /** The copy after the step (the replica's). */
  state: () => GameState | null;
  /** Show a pop-up. */
  popup: (text: string, kind: 'info' | 'success' | 'warning') => void;
  /** The tank on this screen, if any. */
  focusedTank: () => string | null;
}

export class SharedActivity {
  /** Money after the last step: a command step's own change is the difference. */
  private money: number | null = null;

  constructor(private readonly deps: ActivityDeps) {}

  /** A new snapshot: start counting from it. */
  reset(): void {
    this.money = this.deps.state()?.finance.money ?? null;
  }

  step(step: SharedStep, results: readonly CommandResult[]): void {
    const g = this.deps.state();
    if (!g) return;
    const before = this.money;
    this.money = g.finance.money;
    const you = this.deps.you();
    (step.cmds ?? []).forEach((sc, i) => {
      if (sc.by === you) return;
      const res = results[i];
      const name = sc.who ?? '';
      const c = sc.c;
      if (!res?.ok) return;
      if (c.k === 'setSpeed') {
        this.deps.popup(c.speed === 0 ? W.paused(name) : W.speed(name, c.speed), 'info');
        return;
      }
      // one command per command step: the money moved by this command alone
      if (!NOT_DEALS.has(c.k) && before !== null && step.h === 0 && step.cmds!.length === 1 && Math.abs(g.finance.money - before) > BIG_DEAL && res.message) {
        this.deps.popup(W.bigDeal(name, res.message), 'success');
        return;
      }
      if (c.k === 'feedTank') this.feed(g, c.tank, c.food, c.target, res.servingsUsed);
      else if (c.k === 'glassTap') this.tap(g, c.tank, c.intensity);
    });
    if (step.post?.some((p) => p.k === 'setSpeed' && p.speed === 1)) {
      const names = Object.values(g.creatures)
        .filter((c) => (c.status === 'alive' || c.status === 'listed') && isStarving(c.stats))
        .map((c) => c.name);
      if (names.length) this.deps.popup(starvationSlowdownText(names), 'warning');
    }
  }

  /** Another member's feed: the food falls in on this screen too, at the front, as a tap there would. */
  private feed(g: GameState, tankId: string, food: string, target: string | undefined, servings: number | undefined): void {
    const t = g.tanks[tankId];
    if (!t || this.deps.focusedTank() !== tankId) return;
    const d = tankDims(t);
    const local: [number, number, number] = [0, d.waterY - 0.002, d.W / 2 - d.W * 0.28];
    try {
      aiFeed(tankId, food, local, target ? { targetCreatureId: target } : { servings: Math.max(1, servings ?? 1) });
      pushVisualEvent({ kind: 'feed', tankId, pos: local, t: nowSeconds(), strength: 0.6 });
    } catch {
      /* the picture only */
    }
  }

  /** Another member's tap on the glass: the startle wave, from the front glass's middle. */
  private tap(g: GameState, tankId: string, intensity: number): void {
    const t = g.tanks[tankId];
    if (!t || this.deps.focusedTank() !== tankId) return;
    const d = tankDims(t);
    const local: [number, number, number] = [0, d.waterY * 0.5, d.W / 2];
    const s = Math.min(1.5, Math.max(0.2, intensity * 2));
    try {
      aiTap(tankId, local, s, false);
      pushVisualEvent({ kind: 'tap', tankId, pos: local, t: nowSeconds(), strength: s });
    } catch {
      /* the picture only */
    }
  }
}

/** The pop-up as a toast. */
export const toastPopup = (text: string, kind: 'info' | 'success' | 'warning'): void => useUI.getState().toast(text, kind);
