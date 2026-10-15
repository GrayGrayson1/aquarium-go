/**
 * lane:social (chunk 6; 0.5 spec §12.2's club-show reminder; ADR-0034 decision 4) — while Social is reachable (dev mode,
 * ADR-0005 decision 3, SOC-011 A5) and the player belongs to a club with a show coming, a Shows notification on Fridays
 * (the device's day): "{Club}" · "Club show on {day}. Entries close Friday.", opening Social › Clubs. At most once per
 * page session; nothing is stored for it. It goes through the usual rules (`deliverPlanned`): Shows is off by default.
 */
import { devToolsAllowed } from '@/state/devTools';
import { useUI } from '@/state/ui';
import { socialService, type Club } from '@/social';
import { SOCIAL_COPY } from '../panels/social/copy';
import { loadSocialUser, useSocial } from '../panels/social/socialStore';
import { deliverPlanned } from './deliver';
import type { PlannedNotification } from './rules';

const FRIDAY = 5;
const CHECK_MS = 60_000;

/** The reminder for these clubs on this weekday (0 = Sunday), or null. Pure. */
export function clubReminderPlan(weekday: number, clubs: readonly Club[]): PlannedNotification | null {
  if (weekday !== FRIDAY) return null;
  const club = clubs.find((c) => c.nextEvent);
  if (!club?.nextEvent) return null;
  return { category: 'shows', title: club.name, body: SOCIAL_COPY.reminderBody(club.nextEvent.when, 'Friday'), route: '#/social/clubs', priority: 'normal', tag: 'shows' };
}

let done = false;
let busy = false;

/**
 * One check (the interval's, and tests'): dev mode, a game on screen, Friday, signed in and a member of a club with a
 * show: deliver the reminder, at most once per page session. True when it was shown.
 */
export async function checkClubReminder(now: Date = new Date()): Promise<boolean> {
  if (done || busy || !devToolsAllowed() || useUI.getState().screen !== 'game' || now.getDay() !== FRIDAY) return false;
  busy = true;
  try {
    await loadSocialUser(); // once a session: who is signed in (Social may not have been opened yet)
    if (!useSocial.getState().user) return false;
    const plan = clubReminderPlan(now.getDay(), (await socialService().clubs()).mine);
    if (plan && deliverPlanned('club-show-reminder', plan)) done = true;
    return done;
  } catch {
    return false; // offline: try again next minute
  } finally {
    busy = false;
  }
}

/** Tests: a new page session. */
export const resetClubReminder = (): void => {
  done = false;
  busy = false;
};

let started = false;

/** Start checking once a minute (UIRoot calls it once). Returns the cleanup (tests). */
export function startClubReminder(): () => void {
  if (started || typeof window === 'undefined') return () => {};
  started = true;
  const id = window.setInterval(() => void checkClubReminder(), CHECK_MS);
  return () => {
    started = false;
    window.clearInterval(id);
  };
}
