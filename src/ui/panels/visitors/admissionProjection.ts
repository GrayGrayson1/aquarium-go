/**
 * The Visitors panel's admission projection: what a ticket price would do to a day's visitors and takings, from the
 * recent crowds. OWNER: lane "ui-panels".
 *
 * B-121 — the price's pull on visitors is the simulation's own (`admissionDraw`, price ÷ fair price). The panel used to
 * draw its own curve, which disagreed with the sim where it matters: from half the fair price to 1.75 times it the panel
 * showed about a fifth more takings in green while the sim took about two fifths away, and it placed the best price
 * above the fair one. Now the projection moves with the sim: takings peak at the fair price and only fall above it.
 */
import type { GameState } from '@/types';
import { admissionDraw } from '@/sim/facility';
import { getFacilityLevel } from '@/data/facilities';

/**
 * The least pull the current price is taken to have when the projection scales from it: far past the fair price the
 * sim's draw falls towards nothing, and dividing by it would turn a day with a visitor or two into a crowd.
 */
const MIN_CURRENT_DRAW = 0.01;

export interface AdmissionProjection {
  /** Visitors a day at `price`. */
  visitors: number;
  /** Admissions a day at `price`. */
  revenue: number;
  mood: string;
  moodTone: string;
}

/**
 * A day at `price`: the recent days' visitors (the last seven; before any history, four times the room's capacity),
 * scaled by how the sim's draw at `price` compares with its draw at the price charged now. `fairIn` is the sim's fair
 * price for today's exhibits (visitorSummary's); without it, a rough one from reputation.
 */
export function projectAdmission(g: GameState, price: number, fairIn?: number): AdmissionProjection {
  const hist = g.visitors.history.slice(-7);
  const lvl = getFacilityLevel(g.facility.level);
  const base = hist.length ? hist.reduce((a, h) => a + h.count, 0) / hist.length : lvl.visitorCapacity * 4;
  const fair = Math.max(1, fairIn ?? 4 + g.progress.reputation / 60);
  const draw = (p: number) => admissionDraw(p / fair);
  const visitors = Math.max(0, (base * draw(price)) / Math.max(MIN_CURRENT_DRAW, draw(g.facility.admission)));
  const ratio = price / fair;
  const mood = price === 0 ? 'Thrilled' : ratio <= 0.7 ? 'Great value' : ratio <= 1.05 ? 'Fair' : ratio <= 1.35 ? 'Pricey' : 'Too expensive';
  const moodTone = ratio <= 1.05 ? 'pn-tone-good' : ratio <= 1.35 ? 'pn-tone-watch' : 'pn-tone-danger';
  return { visitors, revenue: visitors * price, mood, moodTone };
}
