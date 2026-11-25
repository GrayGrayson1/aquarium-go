// @vitest-environment node
/**
 * chunk 22 (ADR-0058) — the pure parts of the guide's and the shared shop's friction fixes (the rest is in
 * tests/e2e/friction-guide.spec.ts):
 * - G-8: the shared shop's spending refusal ("That costs $8, and you can spend $0. Ask for more in Money.") is known in
 *   every amount the words can write, and its toast offers "Ask for money"; no other toast does;
 * - G-7: the phone pill's tag;
 * - G-2: the card the guide's button opened goes after a moment, not at once.
 */
import { describe, it, expect } from 'vitest';
import { OVERSPEND_TEXT, toastTap, viewOf } from '@/ui/hud/Toasts';
import { SHARED_WORDS as W } from '@/ui/shared/words';
import { SHARED_TAG } from '@/ui/shared/SharedMenu';
import { GUIDE_CARD_MS } from '@/ui/tutorial/TutorialCoach';

const one = (text: string) => viewOf({ texts: [text], group: null });

describe('G-8: the spending refusal offers the way to ask', () => {
  it('knows the refusal in every amount', () => {
    for (const [cost, can] of [[8, 0], [4.5, 0], [300, 120], [300.75, 300.5], [12_500, 40]] as const) {
      const text = W.overspend(cost, can);
      expect(text, text).toMatch(OVERSPEND_TEXT);
      expect(one(text).askMoney).toBe(true);
    }
  });

  it('its toast has the button "Ask for money", over a sheet too; its text goes nowhere', () => {
    const v = one(W.overspend(8, 0));
    expect(toastTap({}, v, false)).toEqual({ textGoes: false, dismiss: false, button: 'Ask for money', title: 'Go to this tank' });
    expect(toastTap({}, v, true)).toMatchObject({ dismiss: true, button: 'Ask for money' });
    expect(W.askForMoney).toBe('Ask for money');
  });

  it('other refusals and news keep no button', () => {
    for (const text of [W.notAllowed('Ola'), W.tooFast, W.failed, 'That costs $8.', 'Not enough money ($8 a pack)', 'Ola: Set Ben to ask first.']) {
      expect(one(text).askMoney, text).toBeFalsy();
      expect(toastTap({}, one(text), false).button, text).toBeNull();
    }
  });
});

describe('G-7 and G-2', () => {
  it('the phone pill says the shop is shared', () => {
    expect(SHARED_TAG).toBe('Shared');
  });

  it('the guide leaves its card up for a moment after the step', () => {
    expect(GUIDE_CARD_MS).toBeGreaterThanOrEqual(3000);
    expect(GUIDE_CARD_MS).toBeLessThanOrEqual(5000);
  });
});
