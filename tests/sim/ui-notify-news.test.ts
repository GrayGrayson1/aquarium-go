/**
 * lane:notify — "new until viewed": show results (dot until Shows › Results is opened), finished research (until the
 * Research panel is opened), a newly unlocked feature (until first opened), bids waiting for an answer (live), and the
 * links that take a toast / drawer / log line to where the news lives.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { GameState, ShowEntry } from '@/types';
import { newGame } from '@/sim/newGame';
import { ensureShowsState } from '@/sim/shows/state';
import { markShowResultsSeen } from '@/sim/shows';
import { bidsAwaiting, featureUnseen, markResearchSeen, navDots, researchNews, researchSeenStale, unseenShowResults } from '@/ui/common/notify';
import { eventLink, SHOW_RESULT_TEXT } from '@/ui/hud/eventLinks';
import { DOCK_ITEMS } from '@/ui/hud/Dock';
import { researchList, startResearch } from '@/sim/facility';
import { advanceWorld } from '@/sim/world';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

function game(): GameState {
  const s = newGame({ starterId: 'betta', starterName: 'Pip', seed: 21 });
  s.clock.hour = 400;
  return s;
}

function judged(s: GameState, id: string, hour: number, status: ShowEntry['status'] = 'judged'): void {
  ensureShowsState(s).entries.push({ id, showId: 'show_x', classId: 'betta_halfmoon', kind: 'creature', subjectId: 'c', name: 'Pip', fee: 10, enteredHour: hour - 20, status, judgedHour: hour, rank: 1, of: 6, score: 81 } as ShowEntry);
}

describe('notify: show results are new until the Results tab is opened', () => {
  it('counts judged and scratched results after the seen hour; opening Results clears the dot', () => {
    const s = game();
    expect(unseenShowResults(s)).toBe(0);
    judged(s, 'e1', 390);
    judged(s, 'e2', 395, 'scratched');
    expect(unseenShowResults(s)).toBe(2);
    const dot = navDots(s, DOCK_ITEMS).shows;
    expect(dot).toMatchObject({ level: 'new', target: 'tab:results' });
    expect(dot!.label).toBe('2 new show results');
    markShowResultsSeen(s); // what the panel does as soon as the Results tab opens
    expect(unseenShowResults(s)).toBe(0);
    expect(navDots(s, DOCK_ITEMS).shows).toBeUndefined();
    s.clock.hour = 420;
    judged(s, 'e3', 410);
    expect(unseenShowResults(s)).toBe(1);
    expect(navDots(s, DOCK_ITEMS).shows!.label).toBe('1 new show result');
  });

  it('a showcase world never shows news dots', () => {
    const s = game();
    judged(s, 'e1', 390);
    s.isShowcase = true;
    expect(unseenShowResults(s)).toBe(0);
    expect(navDots(s, DOCK_ITEMS).shows).toBeUndefined();
  });
});

describe('notify: research finished since the panel was last open', () => {
  it('is quiet until the panel has been opened once, then flags each finished project until the next visit', () => {
    const s = game();
    const r = s.progress.research;
    expect(researchNews(s)).toBe(false);
    expect(researchSeenStale(s)).toBe(true); // first open records the baseline
    markResearchSeen(s);
    expect(researchSeenStale(s)).toBe(false);
    r.activeId = 'some_project'; // started from the panel…
    r.completed.push('first_project'); // …and finished while the player was elsewhere
    r.activeId = undefined;
    expect(researchNews(s)).toBe(true);
    expect(navDots(s, DOCK_ITEMS).research).toMatchObject({ level: 'new', target: null });
    r.activeId = 'next_project'; // a project under way is not news
    expect(researchNews(s)).toBe(false);
    r.activeId = undefined;
    markResearchSeen(s);
    expect(researchNews(s)).toBe(false);
  });
});

describe('notify: a real finished project', () => {
  it('raises the Research dot, and its log line links to Research', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Pip', seed: 23 });
    s.finance.money = 1e6;
    markResearchSeen(s); // the panel was open when the project started
    const pick = researchList(s).find((r) => r.status === 'available' && r.grantsNew.length > 0)!;
    expect(pick).toBeTruthy();
    expect(startResearch(s, pick.def.id).ok).toBe(true);
    expect(researchNews(s)).toBe(false); // under way
    advanceWorld(s, pick.def.hours + 2, { forceFull: true });
    expect(s.progress.research.activeId).toBeUndefined();
    expect(researchNews(s)).toBe(true);
    const line = [...s.log].reverse().find((e) => /^Research complete:|^You picked up everything/.test(e.text))!;
    expect(line).toBeTruthy();
    expect(eventLink(line)).toMatchObject({ panel: 'research' });
  });
});

describe('notify: features and bids', () => {
  it('a newly unlocked dock destination is new until first opened', () => {
    const s = game();
    s.progress.unlocked = s.progress.unlocked.filter((k) => k !== 'visitors');
    delete s.progress.tutorial.flags.opened_visitors;
    expect(featureUnseen(s, 'visitors', 'visitors')).toBe(false);
    s.progress.unlocked.push('visitors');
    expect(featureUnseen(s, 'visitors', 'visitors')).toBe(true);
    expect(navDots(s, DOCK_ITEMS).visitors).toMatchObject({ level: 'new' });
    s.progress.tutorial.flags.opened_visitors = true; // set by openPanel / PanelHost on open
    expect(featureUnseen(s, 'visitors', 'visitors')).toBe(false);
    expect(navDots(s, DOCK_ITEMS).visitors).toBeUndefined();
  });

  it('bids waiting for an answer flag the Market until answered or expired', () => {
    const s = game();
    expect(bidsAwaiting(s)).toBe(0);
    const bid = (status: 'open' | 'declined') => ({ id: `b_${status}`, buyerId: 'x', amount: 50, message: '', createdHour: 399, expiresHour: 410, status });
    s.market.listings.push({ id: 'l1', kind: 'creature', title: 'Pip', creatureIds: [], reserve: 10, createdHour: 390, endsHour: 500, status: 'active', bids: [bid('open'), bid('declined')], interest: 0.5, snapshot: { valuation: 40, healthScore: 1, beautyScore: 1, careDifficulty: '', lineageSummary: '', summary: '', creatureIds: [] } });
    expect(bidsAwaiting(s)).toBe(1);
    expect(navDots(s, DOCK_ITEMS).market).toMatchObject({ level: 'new', target: 'tab:listings', label: '1 bid waiting for your answer' });
    s.market.listings[0].bids[0].status = 'accepted';
    expect(navDots(s, DOCK_ITEMS).market).toBeUndefined();
  });
});

describe('notify: news links to where it lives', () => {
  it('show results and scratched entries open Shows › Results', () => {
    const won = 'Pip won Halfmoon Bettas ($120) at Riverside Club Show. The judge’s cards are in Shows.';
    const lost = 'Pip was 5th of 6 in Halfmoon Bettas at Riverside Club Show — no ribbons this time. The judge’s cards explain why.';
    const scratched = 'Pip was unwell on show day and stayed home. The club refunded the fee.';
    for (const text of [won, lost, scratched]) {
      expect(SHOW_RESULT_TEXT.test(text)).toBe(true);
      expect(eventLink({ kind: 'celebrate', text })).toMatchObject({ panel: 'shows', target: 'tab:results', label: 'See results' });
    }
  });

  it('the shows sim still writes the phrases the links look for (update SHOW_RESULT_TEXT if this copy changes)', () => {
    const src = readFileSync(fileURLToPath(new URL('../../src/sim/shows/index.ts', import.meta.url)), 'utf8');
    expect(src).toContain('The judge’s cards are in Shows.');
    expect(src).toContain('The judge’s cards explain why.');
    expect(src).toContain('The club refunded the fee.');
  });

  it('unlocks, research, listings and shop news', () => {
    expect(eventLink({ kind: 'unlock', text: `Unlocked: ${UNLOCK_KEYS.shows}` })).toMatchObject({ panel: 'shows', target: 'tab:upcoming', label: 'Open Shows' });
    expect(eventLink({ kind: 'unlock', text: `Unlocked: ${UNLOCK_KEYS.visitors}` })).toMatchObject({ panel: 'visitors', label: 'Open Visitors' });
    expect(eventLink({ kind: 'celebrate', text: 'Research complete: Water chemistry!' })).toMatchObject({ panel: 'research', target: null });
    expect(eventLink({ kind: 'market', text: 'A buyer offered $80 for Pip', listingId: 'l_9' })).toMatchObject({ panel: 'market', target: 'listing:l_9' });
    expect(eventLink({ kind: 'market', text: 'New arrivals at the shop: neon tetras.' })).toMatchObject({ panel: 'market', target: 'tab:shop' });
    expect(eventLink({ kind: 'info', text: 'Pip blew a bubble nest.' })).toBeNull();
  });
});
