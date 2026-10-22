// @vitest-environment node
/**
 * Chunk 13 (the review's B2 and its confirmation's note 1): a command a re-synced shared copy saw only in its snapshot
 * settles with APPLIED_UNSEEN; both action helpers then claim nothing (no toast, no sound's line) and run only the
 * caller's follow-up, which reads the shop from the store.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { useGame, type Dispatch } from '@/state/game';
import { useUI } from '@/state/ui';
import { soloDispatch } from '@/game/dispatch';
import { APPLIED_UNSEEN } from '@/ui/shared/dispatch';
import { act as panelAct } from '@/ui/panels/common/act';
import { act as commonAct } from '@/ui/common/actions';

const unseen: Dispatch = (_cmd, done) => {
  setTimeout(() => done?.(APPLIED_UNSEEN), 0);
  return undefined;
};

beforeEach(() => {
  useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Blue', seed: 4 }));
  useUI.setState({ toasts: [] });
  useGame.getState().installDispatch(unseen);
});

afterEach(() => {
  useGame.getState().installDispatch(soloDispatch);
  useGame.getState().setGame(null);
});

describe('chunk 13: a result unseen across a re-sync', () => {
  for (const [name, act] of [
    ['the panels’ act', panelAct],
    ['the common act', commonAct],
  ] as const) {
    it(`${name}: no toast, the follow-up still runs`, async () => {
      const tank = useGame.getState().game!.tankOrder[0];
      let after: unknown;
      act({ k: 'renameTank', tank, name: 'X' }, { successText: 'Renamed!', message: 'Renamed!', after: (r: unknown) => (after = r) } as never);
      await new Promise((r) => setTimeout(r, 5));
      expect(after).toBe(APPLIED_UNSEEN);
      expect(useUI.getState().toasts).toEqual([]);
    });
  }
});
