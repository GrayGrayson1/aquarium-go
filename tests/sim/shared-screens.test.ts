// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §3.2 rule 8, §4.4, §7.3, §7.4, §8; SHARE-012, SHARE-014, SHARE-018): the logic behind
 * the shared shop's screens.
 *
 * - Each player's own marks: kept per player and shop, laid over the shared copy (which never changes), with the
 *   unchanged parts keeping their identity.
 * - The words: every closing as §8 approves it, and the alerts line with the name in front.
 * - Others' actions: pop-ups for a pause, a speed and a deal over $100, never for this player's own; the starvation
 *   guard's slow-down said from this copy.
 * - Photos: WebP, or JPEG when the browser hands back something else, small enough for one command.
 * - The interface's error boundary pauses a solo game but never a shared shop.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GameEvent, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { emitEvent } from '@/sim/context';
import { useGame } from '@/state/game';
import { setSharedMode } from '@/state/sharedMode';
import { eventLine } from '@/ui/common/notify';
import { SHARED_MARKS_KEY, overlayMarks, readMarks, recordMark } from '@/ui/shared/marks';
import { SHARED_WORDS, closingText, formatBytes, formatHours, reopenDate } from '@/ui/shared/words';
import { SharedActivity } from '@/ui/shared/activity';
import { SHARED_PHOTO_MAX_CHARS, captureSharedPhoto } from '@/ui/shared/photos';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import type { ClosingReason } from '@/types/shared';

function fakeLocalStorage(): void {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

const shop = (): GameState => newGame({ starterId: 'betta', starterName: 'Blue', shopName: 'Club Shop', seed: 12 });

beforeEach(() => fakeLocalStorage());
afterEach(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
  setSharedMode(null);
  useGame.getState().setGame(null);
});

describe("chunk 13: each player's own marks (§7.4)", () => {
  it('read marks are kept per player and shop, laid over the copy, which itself never changes', () => {
    const g = shop();
    emitEvent(g, { kind: 'info', text: 'one' });
    emitEvent(g, { kind: 'info', text: 'two' });
    const frozen = JSON.stringify(g);
    expect(g.log.some((e) => !e.read)).toBe(true);
    const marks = recordMark('club_1', 'u_a', 'allRead', g);
    const shown = overlayMarks(g, marks);
    expect(shown.log.every((e) => e.read)).toBe(true);
    expect(JSON.stringify(g)).toBe(frozen); // the shared copy is untouched
    // Ben hasn't read them
    expect(overlayMarks(g, readMarks('club_1', 'u_b')).log.some((e) => !e.read)).toBe(true);
    // the same marks again: the same objects (the screens don't re-render for nothing)
    expect(overlayMarks(g, marks).log).toBe(overlayMarks(g, marks).log);
    // a later event is unread until it's read
    emitEvent(g, { kind: 'info', text: 'three' });
    const again = overlayMarks({ ...g, log: [...g.log] }, marks);
    expect(again.log.at(-1)!.read).toBeFalsy();
    expect(again.log.slice(0, -1).every((e) => e.read)).toBe(true);
    expect(globalThis.localStorage.getItem(SHARED_MARKS_KEY)).toContain('club_1:u_a');
  });

  it("Clear all, Research's and the shows' seen marks lay over the copy too; nothing to lay leaves it as it is", () => {
    const g = shop();
    emitEvent(g, { kind: 'info', text: 'one' });
    expect(overlayMarks(g, {})).toBe(g);
    const m1 = recordMark('club_1', 'u_a', 'clearAll', g);
    const shown = overlayMarks(g, m1);
    expect(shown.notify?.logClearedSeq).toBeGreaterThanOrEqual(0);
    expect(g.notify?.logClearedSeq).toBeUndefined();
    const m2 = recordMark('club_1', 'u_a', 'researchSeen', g);
    expect(overlayMarks(g, m2).notify?.researchSeen).toBe(g.progress.research.completed.length);
    if (g.shows) {
      g.clock.hour += 5;
      const m3 = recordMark('club_1', 'u_a', 'showResultsSeen', g);
      expect(overlayMarks(g, m3).shows?.resultsSeenHour).toBe(g.clock.hour);
    }
  });
});

describe('chunk 13: the words (§8, ADR-0045, ADR-0048)', () => {
  it('every closing reads as approved', () => {
    const o = { club: 'CalliClub', until: '2026-11-01', savedAt: Date.UTC(2026, 9, 21, 12, 0), now: Date.UTC(2026, 9, 21, 12, 7) };
    const expected: Record<ClosingReason, RegExp> = {
      cap: /^Shared shops have used this month’s free data \(2 GB\)\. They open again on .+\.$/,
      hours: /^Shared shops have used this month’s free server hours\. They open again on .+\.$/,
      full: /^The shared shop is full \(10 people\)\. Try again soon\.$/,
      build: /^A new version of Aquarium Go is out\. Reload to join the shared shop\.$/,
      updating: /^The shared shop is updating\. Try again in a few minutes\.$/,
      removed: /^You’re no longer in CalliClub, so you can’t open its shared shop\.$/,
      elsewhere: /^You opened this shared shop in another tab\.$/,
      fault: /^The shared shop hit a problem and stopped\. It’s saved as of .+\.$/,
      restart: /^The shared shop’s server restarted, so it went back to its last save \(7 minutes ago\)\.$/,
      outofstep: /^Your game keeps falling out of step with the shared shop, so it stopped\. Reload to try again\.$/,
      gone: /^CalliClub has no shared shop any more\.$/,
    };
    for (const [why, re] of Object.entries(expected)) expect(closingText(why as ClosingReason, o)).toMatch(re);
    // ADR-0049
    expect(closingText('signedOut', o)).toBe('You need to be signed in to play the shared shop. Sign in from Social and open it again.');
    expect(SHARED_WORDS.notAllowed('')).toBe('Only the owner and the people they choose can pause or change the speed.');
    expect(reopenDate('2026-11-01')).toMatch(/1/);
    expect(reopenDate(undefined)).toBe('the 1st');
  });

  it("the club card's, the strip's and the opening's lines", () => {
    expect(SHARED_WORDS.shopMeta(12, 1840)).toBe('Day 12 · $1,840');
    expect(SHARED_WORDS.meter(formatBytes(340_000_000), formatHours(12.5 * 3600))).toBe('This month: 340 MB of 2 GB · server awake 13 h');
    expect(formatHours(3 * 3600 + 1800)).toBe('3.5');
    expect(formatBytes(1_250_000_000)).toBe('1.3 GB');
    expect(SHARED_WORDS.strip('Reef Club', ['Sam', 'Ann'])).toBe('Shared · Reef Club · Here: Sam, Ann');
    expect(SHARED_WORDS.titleButton('Reef Club')).toBe('Shared shop: Reef Club');
    expect(SHARED_WORDS.firstTime('CalliClub')).toBe('Your own aquarium is saved and waits for you. Everything here is shared with CalliClub.');
    expect(SHARED_WORDS.savesHere('CalliClub')).toBe('This is CalliClub’s shared shop: it saves on the server. Your own aquarium is saved and waits for you.');
  });

  it("an alerts line is the action's own message with the member's name in front; a solo game's has none", () => {
    expect(eventLine({ text: 'Bought 3 neon tetras for $36.', byName: 'Sam' })).toBe('Sam: Bought 3 neon tetras for $36.');
    expect(eventLine({ text: 'Bought 3 neon tetras for $36.' })).toBe('Bought 3 neon tetras for $36.');
  });
});

describe("chunk 13: others' actions (SHARE-012)", () => {
  function rig(you = 'u_a') {
    const g = shop();
    const popups: string[] = [];
    const a = new SharedActivity({ you: () => you, state: () => g, popup: (t) => popups.push(t), focusedTank: () => null });
    a.reset();
    return { g, a, popups };
  }

  it('a pause and a speed change pop up for the others, never for the one who did it', () => {
    const { a, popups } = rig();
    a.step({ n: 1, h: 0, cmds: [{ by: 'u_b', who: 'Sam', id: 1, c: { k: 'setSpeed', speed: 0 } }] }, [{ ok: true, message: '' }]);
    a.step({ n: 2, h: 0, cmds: [{ by: 'u_b', who: 'Sam', id: 2, c: { k: 'setSpeed', speed: 3 } }] }, [{ ok: true, message: '' }]);
    a.step({ n: 3, h: 0, cmds: [{ by: 'u_a', who: 'Ann', id: 1, c: { k: 'setSpeed', speed: 10 } }] }, [{ ok: true, message: '' }]);
    expect(popups).toEqual(['Sam paused the shop.', 'Sam set the speed to 3×.']);
  });

  it('a sale or a purchase over $100 pops up with the name in front; a small one and a refused one do not', () => {
    const { g, a, popups } = rig();
    g.finance.money += 240;
    a.step({ n: 1, h: 0, cmds: [{ by: 'u_b', who: 'Sam', id: 1, c: { k: 'quickSell', creatures: ['c1'] } }] }, [{ ok: true, message: 'Sold the clownfish pair for $240.' }]);
    g.finance.money -= 36;
    a.step({ n: 2, h: 0, cmds: [{ by: 'u_b', who: 'Sam', id: 2, c: { k: 'buyFood', food: 'f', packs: 1 } }] }, [{ ok: true, message: 'Bought food for $36.' }]);
    a.step({ n: 3, h: 0, cmds: [{ by: 'u_b', who: 'Sam', id: 3, c: { k: 'quickSell', creatures: ['c2'] } }] }, [{ ok: false, message: 'Ann already sold that fish.' }]);
    expect(popups).toEqual(['Sam: Sold the clownfish pair for $240.']);
  });

  it("the starvation guard's slow-down (a step's post) is said from this copy", () => {
    const { g, a, popups } = rig();
    const c = Object.values(g.creatures)[0];
    c.stats.hunger = 100; // hunger rises as an animal goes without food
    c.stats.health = 1;
    a.step({ n: 1, h: 0.25, post: [{ k: 'setSpeed', speed: 1 }] }, []);
    expect(popups.at(-1)).toMatch(/^Slowed to 1× — .+ starving\.$/);
  });
});

describe('chunk 13: listing photos for a shared shop (§4.4)', () => {
  const dataUrl = (mime: string, chars: number) => `data:${mime};base64,${'A'.repeat(chars)}`;

  it('takes a small WebP when the browser makes one', async () => {
    const asked: unknown[] = [];
    const url = await captureSharedPhoto(async (o) => {
      asked.push(o);
      return dataUrl('image/webp', 20_000);
    });
    expect(url!.startsWith('data:image/webp;base64,')).toBe(true);
    expect(asked[0]).toMatchObject({ width: 320, format: 'image/webp' });
  });

  it('falls back to JPEG when asked for WebP and handed a PNG (Safari), and lowers the quality until it fits', async () => {
    const asked: { format?: string; quality?: number }[] = [];
    const url = await captureSharedPhoto(async (o) => {
      asked.push(o ?? {});
      if (o?.format === 'image/webp') return dataUrl('image/png', 10);
      return dataUrl('image/jpeg', (o?.quality ?? 1) > 0.6 ? SHARED_PHOTO_MAX_CHARS + 10 : 30_000);
    });
    expect(url!.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(asked.map((a) => a.format)).toEqual(['image/webp', 'image/jpeg', 'image/jpeg', 'image/jpeg']);
  });

  it('nothing that fits, or no camera: no photo', async () => {
    expect(await captureSharedPhoto(async () => null)).toBeNull();
    expect(await captureSharedPhoto(async (o) => dataUrl(o?.format ?? 'image/jpeg', SHARED_PHOTO_MAX_CHARS + 1))).toBeNull();
  });
});

describe("chunk 13: the interface's error boundary (§7.3)", () => {
  it('pauses a solo game, never a shared shop (it would pause everyone)', () => {
    const g = shop();
    g.clock.speed = 3;
    useGame.getState().setGame(g);
    const dispatch = vi.fn();
    const real = useGame.getState().dispatch;
    useGame.getState().installDispatch(dispatch as never);
    try {
      const b = new ErrorBoundary({ name: 'interface', children: null });
      setSharedMode('club_1');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      b.componentDidCatch(new Error('boom'));
      expect(dispatch).not.toHaveBeenCalled();
      setSharedMode(null);
      b.componentDidCatch(new Error('boom'));
      expect(dispatch).toHaveBeenCalledWith({ k: 'setSpeed', speed: 0 });
    } finally {
      useGame.getState().installDispatch(real);
      vi.restoreAllMocks();
    }
  });
});

// keep the type import honest
export type _E = GameEvent;
