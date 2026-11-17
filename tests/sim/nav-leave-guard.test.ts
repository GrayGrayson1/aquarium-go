// @vitest-environment node
/**
 * Audit 2026-11-17, B6 — the leave guard: while a sub-view holds the player's work (the listing wizard with typed
 * prices or a photo), anything that would close its panel or send it a command waits for "Leave"; "Keep editing"
 * stays. A sheet stepping aside for a tool is not leaving; with no guard nothing is asked.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useUI } from '@/state/ui';
import { answerLeave, guardLeave, setLeaveGuard, useLeave } from '@/ui/panels/common/leaveGuard';

const WIZARD = { panel: 'market' as const, title: 'Leave this listing?', detail: 'Your prices and photo won’t be kept.' };

beforeEach(() => useUI.setState({ panel: 'market', panelTarget: null, panelAside: null }));
afterEach(() => setLeaveGuard(null));

describe('B6: the leave guard', () => {
  it('without a guard, a way out runs at once', () => {
    let ran = 0;
    expect(guardLeave(() => ran++)).toBe(true);
    expect(ran).toBe(1);
    useUI.getState().set({ panel: 'build' });
    expect(useUI.getState().panel).toBe('build');
    expect(useLeave.getState().pending).toBeNull();
  });

  it('another panel waits for the answer: Keep editing stays, Leave goes there', () => {
    setLeaveGuard(WIZARD);
    useUI.getState().set({ panel: 'build', panelTarget: 'tab:decor' });
    expect(useUI.getState()).toMatchObject({ panel: 'market', panelTarget: null });
    expect(useLeave.getState().pending).not.toBeNull();
    answerLeave(false);
    expect(useUI.getState().panel).toBe('market');
    expect(useLeave.getState().guard).toEqual(WIZARD);
    useUI.getState().set({ panel: null, panelTarget: null }); // ×, Escape, a card
    expect(useUI.getState().panel).toBe('market');
    answerLeave(true);
    expect(useUI.getState().panel).toBeNull();
    expect(useLeave.getState()).toMatchObject({ guard: null, pending: null });
  });

  it('a command to the guarded panel (a link to Supplies) waits too', () => {
    setLeaveGuard(WIZARD);
    useUI.getState().set({ panelTarget: 'food:flake_tropical' });
    expect(useUI.getState().panelTarget).toBeNull();
    answerLeave(true);
    expect(useUI.getState()).toMatchObject({ panel: 'market', panelTarget: 'food:flake_tropical' });
  });

  it('a sheet stepping aside for a tool is not leaving', () => {
    setLeaveGuard(WIZARD);
    useUI.getState().set({ panel: null, panelAside: 'market' });
    expect(useUI.getState().panel).toBeNull();
    expect(useLeave.getState().pending).toBeNull();
  });

  it('Keep editing runs its own step (the router puts the address back)', () => {
    setLeaveGuard(WIZARD);
    let kept = 0;
    let left = 0;
    expect(guardLeave(() => left++, () => kept++)).toBe(false);
    answerLeave(false);
    expect([kept, left]).toEqual([1, 0]);
  });
});
