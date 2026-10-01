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

/**
 * Which eligible entries are on screen: whatever is already up stays up (a burst of danger toasts never pre-empts a
 * visible toast mid-read — it used to unmount it after 0.3 s and bring it back seconds later with a fresh timer),
 * then free slots go to the highest priority, oldest first. The result is in arrival order.
 */
export function pickShown<E extends QueueEntry>(eligible: readonly E[], onScreen: ReadonlySet<string>, max: number): E[] {
  const keep = eligible.filter((e) => onScreen.has(e.key)).slice(0, max);
  const rest = eligible.filter((e) => !onScreen.has(e.key)).sort((a, b) => prio(b.kind) - prio(a.kind) || a.born - b.born);
  return [...keep, ...rest.slice(0, Math.max(0, max - keep.length))].sort((a, b) => a.born - b.born);
}

/**
 * An entry that has been on screen and has since left it without being dismissed (photo / watch mode hides routine
 * news; a phone shows fewer at once) is done once its lifetime has passed: it does not come back as if new.
 */
export function isExpired(e: QueueEntry & { texts: readonly string[] }, shownAt: number | undefined, now: number): boolean {
  return shownAt !== undefined && now - shownAt > ttlOf(e.kind, e.texts) + 400;
}
