/**
 * Pure queue rules behind Toasts.tsx (no React, so they are unit-testable): priorities, lifetimes and which entries
 * are on screen. OWNER: lane "ui-shell".
 */
import type { AnyKind } from './eventIcons';

export const PRIORITY: Partial<Record<AnyKind, number>> = { death: 6, danger: 6, warning: 5, celebrate: 4, unlock: 4, breeding: 4, market: 3, visitor: 3, success: 2, info: 1, tip: 1 };
const TTL: Partial<Record<AnyKind, number>> = { death: 9000, danger: 8500, warning: 6500, celebrate: 5200, unlock: 5000, breeding: 5500, market: 4600, visitor: 4200, success: 3000, info: 3400, tip: 3000 };

export const prio = (k: AnyKind) => PRIORITY[k] ?? 2;

/**
 * How long an entry stays up once shown. Merged bursts get a little longer; so does a long line — desktop toasts now
 * wrap to two lines (three for warnings) instead of clipping after ~40 characters, and reading "Kofi dropped by to
 * see Wasabi and left a $12 tip" takes longer than "Fed the tank".
 */
export function ttlOf(kind: AnyKind, texts: readonly string[]): number {
  const base = (TTL[kind] ?? 4000) + (texts.length > 1 ? 1200 : 0);
  const longest = texts.reduce((m, t) => Math.max(m, t.length), 0);
  return base + Math.min(3500, Math.max(0, longest - 40) * 30);
}

export interface QueueEntry {
  key: string;
  kind: AnyKind;
  /** performance.now() when the entry was created. */
  born: number;
}

/** Danger / death news and how long routine news must have been readable before such news may take its place. */
export const URGENT_PRIO = 6;
export const PREEMPT_AFTER_MS = 1500;

/**
 * Which eligible entries are on screen: whatever is already up stays up (a burst of danger toasts never pre-empts a
 * visible toast mid-read — it used to unmount it after 0.3 s and bring it back seconds later with a fresh timer),
 * then free slots go to the highest priority, oldest first. The result is in arrival order.
 *
 * One exception (pass `shownAt` + `now`): danger / death news does not wait for routine news (market, visitors,
 * feedback) to time out. It takes the slot of the least important routine toast that has been up for at least
 * PREEMPT_AFTER_MS. Such a toast is finished, not queued again: its key goes into `out.bumped` for the caller to
 * dismiss.
 */
export function pickShown<E extends QueueEntry>(
  eligible: readonly E[],
  onScreen: ReadonlySet<string>,
  max: number,
  shownAt?: ReadonlyMap<string, number>,
  now = 0,
  out?: { bumped: string[] },
): E[] {
  let keep = eligible.filter((e) => onScreen.has(e.key)).slice(0, max);
  const rest = eligible.filter((e) => !onScreen.has(e.key)).sort((a, b) => prio(b.kind) - prio(a.kind) || a.born - b.born);
  if (shownAt) {
    let free = max - keep.length;
    for (const u of rest) {
      if (prio(u.kind) < URGENT_PRIO) break; // (sorted by priority)
      if (free > 0) {
        free--;
        continue;
      }
      let victim: E | null = null;
      for (const k of keep) {
        const at = shownAt.get(k.key);
        if (prio(k.kind) > 3 || at === undefined || now - at < PREEMPT_AFTER_MS) continue;
        if (!victim || prio(k.kind) < prio(victim.kind) || (prio(k.kind) === prio(victim.kind) && at < (shownAt.get(victim.key) ?? 0))) victim = k;
      }
      if (!victim) break;
      const gone = victim;
      keep = keep.filter((k) => k !== gone);
      out?.bumped.push(gone.key);
    }
  }
  return [...keep, ...rest.slice(0, Math.max(0, max - keep.length))].sort((a, b) => a.born - b.born);
}

/**
 * An entry that has been on screen and has since left it without being dismissed (photo / watch mode hides routine
 * news; a phone shows fewer at once) is done once its lifetime has passed: it does not come back as if new.
 */
export function isExpired(e: QueueEntry & { texts: readonly string[] }, shownAt: number | undefined, now: number): boolean {
  return shownAt !== undefined && now - shownAt > ttlOf(e.kind, e.texts) + 400;
}
