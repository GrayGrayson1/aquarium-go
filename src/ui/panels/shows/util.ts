/**
 * Small helpers for the Shows panel: real-time countdowns (at 1×, like the market), game-time labels. OWNER: lane "shows".
 */
import { formatClock } from '@/sim/time';
import { dayOfHour } from '../common/format';

/** "about 6 min" — how long a span of game hours lasts in real time at 1× (lane:w2-ui: shared with the market). */
export { realIn } from '../common/format';

/** "Day 12, 2:15 PM" (game time). */
export function gameWhen(hour: number): string {
  return `Day ${dayOfHour(hour)}, ${formatClock(hour)}`;
}

export const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export function purseRange(purses: number[]): string {
  if (!purses.length) return '';
  const lo = Math.min(...purses);
  const hi = Math.max(...purses);
  return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
}
