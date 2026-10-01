/**
 * Glass-tap spam rule (lane:tankrender): taps are weighted by strength, so four deliberate Tap-tool knocks within
 * SPAM_WINDOW_S count as spamming, while a plain click that missed every animal (half strength) needs eight.
 */
export const SPAM_WINDOW_S = 3;
/** Summed tap strength within the window that counts as spamming. */
export const SPAM_TAPS = 4;

export class TapSpam {
  private log: { t: number; s: number }[] = [];

  /** Record a tap at `now` (seconds); true when the recent taps now add up to spamming. */
  add(now: number, strength: number): boolean {
    const log = this.log;
    log.push({ t: now, s: Math.max(0, strength) });
    while (log.length && now - log[0].t > SPAM_WINDOW_S) log.shift();
    let sum = 0;
    for (const e of log) sum += e.s;
    return sum >= SPAM_TAPS - 1e-6;
  }
}
