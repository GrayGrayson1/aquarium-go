/**
 * Game time. OWNER: core.
 *
 * 1 real second at 1× speed = 6 game minutes  → 1 game day = 4 real minutes.
 * Water chemistry runs on game hours directly.
 * Life stages are COMPRESSED further (species `lifecycle`/`breeding` values are in game-days that stand in for
 * biological weeks/months). This is a deliberate playability abstraction documented in docs/GAME_DESIGN.md.
 */
export const GAME_HOURS_PER_REAL_SECOND = 0.1;
export const HOURS_PER_DAY = 24;
/** Offline progress cap (game hours) applied when loading a save. */
export const OFFLINE_CAP_HOURS = 12;
/** Maximum game hours processed in one sub-step of the simulation. */
export const MAX_SUBSTEP_HOURS = 0.5;

export const dayOf = (hour: number) => Math.floor(hour / HOURS_PER_DAY) + 1;
export const hourOfDay = (hour: number) => ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;

export function formatClock(hour: number): string {
  const h = hourOfDay(hour);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const ampm = hh < 12 ? 'AM' : 'PM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

/** Age in game days from born hour. */
export const ageDays = (bornHour: number, nowHour: number) => (nowHour - bornHour) / HOURS_PER_DAY;

/** Is the tank light on at this hour-of-day. */
export function lightsOn(onHour: number, offHour: number, hour: number): boolean {
  const h = hourOfDay(hour);
  return onHour <= offHour ? h >= onHour && h < offHour : h >= onHour || h < offHour;
}
