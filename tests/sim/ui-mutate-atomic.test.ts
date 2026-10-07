// @vitest-environment node
/**
 * lane:ui-shell (chunk 1; BACKLOG B-179) — UI wrappers around useGame.mutate never commit half an action: a recipe that
 * changes the draft and then throws leaves the game exactly as it was (immer discards the draft because the error
 * escapes the recipe), and the guide's step after an action runs in its own mutate, so a throw there keeps the action
 * and drops only the guide's half-made changes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const advance = vi.hoisted(() => ({ impl: null as null | ((d: unknown, flag?: string) => void) }));
vi.mock('@/sim/facility', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/sim/facility')>();
  return { ...real, tutorialAdvance: (d: never, flag?: string) => (advance.impl ? advance.impl(d, flag) : real.tutorialAdvance(d, flag as never)) };
});

import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence';
import { act as uiAct } from '@/ui/common/actions';
import { act as panelAct, edit } from '@/ui/panels/common/act';

const hash = () => stateHash(useGame.getState().game!);
const boom = (d: GameState) => {
  d.finance.money += 1000;
  throw new Error('mid-action failure');
};

beforeEach(() => {
  advance.impl = null;
  useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Atomic', seed: 21 }));
});

describe('a throwing recipe changes nothing (B-179)', () => {
  it('edit() discards the draft and logs instead of throwing', () => {
    const before = hash();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => edit(boom)).not.toThrow();
    expect(hash()).toBe(before);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('the panels’ act() reports the failure and keeps the game as it was', () => {
    const before = hash();
    expect(panelAct(boom as never)).toBeNull();
    expect(hash()).toBe(before);
  });

  it('the shell’s act() reports the failure and keeps the game as it was', () => {
    const before = hash();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(uiAct(boom as never)).toEqual({ ok: false, message: 'Error' });
    expect(hash()).toBe(before);
    warn.mockRestore();
  });

  it('a guide step that throws after a successful action keeps the action and none of its own half-made changes', () => {
    const money = useGame.getState().game!.finance.money;
    advance.impl = (d) => {
      (d as GameState).progress.tutorial.flags.half_made = true;
      throw new Error('guide failure');
    };
    const r = uiAct(
      (d) => {
        d.finance.money += 5;
        return { ok: true, message: 'Done' };
      },
      { flag: 'some_flag', toast: false },
    );
    expect(r?.ok).toBe(true);
    expect(useGame.getState().game!.finance.money).toBe(money + 5);
    expect(useGame.getState().game!.progress.tutorial.flags.half_made).toBeUndefined();
  });
});
