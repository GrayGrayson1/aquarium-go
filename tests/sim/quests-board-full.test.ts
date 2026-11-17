// @vitest-environment node
/**
 * Audit 2026-11-17, B2 (the part that needs no decision) — finished quests keep their slot until their reward is
 * claimed, so a board full of them draws no new quest: Research › Quests says "Claim a reward to get new quests."
 * (Whether a finished quest should keep its slot is the owner's question.)
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { activeQuests } from '@/sim/facility';
import { QUESTS, QUEST_BOARD_SIZE } from '@/data/quests';
import { boardFullOfRewards } from '@/ui/panels/research/ResearchPanel';

function board(complete: number, active: number) {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 2 });
  g.progress.quests = QUESTS.slice(0, complete + active).map((d, i) => ({ id: d.id, status: i < complete ? ('complete' as const) : ('active' as const), progress: i < complete ? 1 : 0, startedHour: 0 }));
  return activeQuests(g);
}

describe('B2: a quest board full of rewards to claim', () => {
  it('says so only when every slot holds a finished quest', () => {
    expect(QUEST_BOARD_SIZE).toBe(3);
    expect(boardFullOfRewards(board(3, 0))).toBe(true);
    expect(boardFullOfRewards(board(2, 1))).toBe(false);
    expect(boardFullOfRewards(board(0, 3))).toBe(false);
  });
  it('the guide’s own finished entry doesn’t count', () => {
    const views = board(2, 0);
    expect(boardFullOfRewards([...views, { ...views[0], id: 'tutorial', isTutorial: true }])).toBe(false);
  });
});
