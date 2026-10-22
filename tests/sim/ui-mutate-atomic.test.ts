// @vitest-environment node
/**
 * lane:ui-shell (chunk 1; BACKLOG B-179) — UI wrappers around the store never commit half an action: an action that
 * changes the draft and then throws leaves the game exactly as it was (Immer discards the draft because the error
 * escapes the store's write), and the guide's step after an action runs in a write of its own, so a throw there keeps
 * the action and drops only the guide's half-made changes.
 *
 * Chunk 11: the wrappers send commands (SHARED-SHOPS.md §4.2), so the half-done action is a command whose sim function
 * is made to throw part-way (it used to be a closure that did).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const boom = vi.hoisted(() => ({ on: false }));
const advance = vi.hoisted(() => ({ impl: null as null | ((d: unknown, flag?: string) => void) }));
vi.mock('@/sim/economy/purchases', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/sim/economy/purchases')>();
  return {
    ...real,
    buySalt: (d: { finance: { money: number } }, kg: number) => {
      if (!boom.on) return real.buySalt(d as never, kg);
      d.finance.money += 1000;
      throw new Error('mid-action failure');
    },
  };
});
vi.mock('@/sim/facility/progression', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/sim/facility/progression')>();
  return { ...real, tutorialAdvance: (d: never, flag?: string) => (advance.impl ? advance.impl(d, flag) : real.tutorialAdvance(d, flag as never)) };
});

import type { GameState } from '@/types';
import type { CommandResult } from '@/sim/commands';
import { useGame } from '@/state/game';
import { newGame } from '@/sim/newGame';
import { stateHash } from '@/persistence';
import { act as uiAct } from '@/ui/common/actions';
import { act as panelAct, edit } from '@/ui/panels/common/act';

const hash = () => stateHash(useGame.getState().game!);

beforeEach(() => {
  boom.on = false;
  advance.impl = null;
  useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Atomic', seed: 21 }));
});

describe('a throwing action changes nothing (B-179)', () => {
  it('edit() discards the draft and logs instead of throwing', () => {
    const before = hash();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    boom.on = true;
    expect(() => edit({ k: 'buySalt', kg: 5 })).not.toThrow();
    expect(hash()).toBe(before);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('the panels’ act() reports the failure and keeps the game as it was', () => {
    const before = hash();
    boom.on = true;
    let got: CommandResult | null | undefined;
    panelAct({ k: 'buySalt', kg: 5 }, { after: (r) => (got = r) });
    expect(got).toBeNull();
    expect(hash()).toBe(before);
  });

  it('the shell’s act() reports the failure and keeps the game as it was', () => {
    const before = hash();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    boom.on = true;
    let got: CommandResult | null | undefined;
    uiAct({ k: 'buySalt', kg: 5 }, { after: (r) => (got = r) });
    expect(got).toEqual({ ok: false, message: 'Error' });
    expect(hash()).toBe(before);
    warn.mockRestore();
  });

  it('a guide step that throws after a successful action keeps the action and none of its own half-made changes', () => {
    const money = useGame.getState().game!.finance.money;
    const salt = useGame.getState().game!.inventory.salt;
    advance.impl = (d) => {
      (d as GameState).progress.tutorial.flags.half_made = true;
      throw new Error('guide failure');
    };
    let got: CommandResult | null | undefined;
    uiAct({ k: 'buySalt', kg: 5 }, { flag: 'some_flag', toast: false, after: (r) => (got = r) });
    expect(got?.ok).toBe(true);
    expect(useGame.getState().game!.finance.money).toBeLessThan(money);
    expect(useGame.getState().game!.inventory.salt).toBe(salt + 5);
    expect(useGame.getState().game!.progress.tutorial.flags.half_made).toBeUndefined();
  });
});

describe('tutorialFlag (B-179)', () => {
  it('a guide step that throws part-way leaves no half-made change and doesn’t throw', async () => {
    const { tutorialFlag } = await import('@/ui/common/actions');
    const before = hash();
    advance.impl = (d) => {
      (d as GameState).progress.tutorial.flags.half_made = true;
      throw new Error('guide failure');
    };
    expect(() => tutorialFlag('b179_probe_flag')).not.toThrow();
    expect(useGame.getState().game!.progress.tutorial.flags.half_made).toBeUndefined();
    expect(hash()).toBe(before);
  });
});
