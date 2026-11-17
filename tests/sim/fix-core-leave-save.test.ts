// @vitest-environment node
/**
 * Final playtest — leaving within 4 s of a page load skipped the save on leaving: the gap between saves was counted
 * from page load, so a welcome-back catch-up applied by Continue was never stored and the next visit replayed it.
 * The gap now runs only between real saves.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import { loadAndResume, saveGame, setStorageBackend, createMemoryBackend, resetSaveSession, useResume, loadGameDetailed } from '@/persistence';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { resetFastMutate } from '@/game/fastMutate';
import { autosaveNow, leaveSaveDue, resetAutosaveState } from '@/game/useAutosave';

const HOUR = 3600_000;

beforeEach(() => {
  setStorageBackend(createMemoryBackend());
  resetSaveSession();
  resetFastMutate();
  resetAutosaveState();
  useGame.getState().setGame(null);
  useResume.setState({ summary: null });
});

describe('the save on leaving a freshly loaded game', () => {
  it('is due straight after a page load (no save yet), and not again within a few seconds of one', async () => {
    expect(leaveSaveDue(0)).toBe(true);
    expect(leaveSaveDue(3000)).toBe(true);
    const g = newGame({ starterId: 'betta', starterName: 'Leave', seed: 31 });
    g.lastTickRealMs = Date.now() - 1000;
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    expect((await loadAndResume('auto')).ok).toBe(true);
    expect(await autosaveNow('hidden')).toBe(true);
    expect(leaveSaveDue()).toBe(false);
    expect(leaveSaveDue(performance.now() + 5000)).toBe(true);
  });

  it('stores the catch-up Continue applied, so the next visit does not replay it', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Away', seed: 32 });
    g.clock.speed = 1;
    const now = Date.now();
    g.lastTickRealMs = now - 12 * HOUR;
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    const before = g.clock.hour;
    expect((await loadAndResume('auto', { now })).ok).toBe(true);
    const caughtUp = useGame.getState().game!.clock.hour;
    expect(caughtUp).toBeGreaterThan(before);
    expect(useUI.getState().screen).toBe('game');
    // the player closes the tab a moment after the welcome-back card appears
    expect(leaveSaveDue()).toBe(true);
    expect(await autosaveNow('pagehide')).toBe(true);
    const saved = await loadGameDetailed('auto');
    expect(saved.ok).toBe(true);
    expect(saved.state!.clock.hour).toBeGreaterThanOrEqual(caughtUp);
    expect(Date.now() - saved.state!.lastTickRealMs).toBeLessThan(60_000);
  });

  it('never saves before a game is running', async () => {
    useUI.getState().set({ screen: 'title' });
    expect(leaveSaveDue()).toBe(true);
    expect(await autosaveNow('pagehide')).toBe(false);
  });
});

describe('audit 2026-11-17, I2: Autosave off, leaving with unsaved play', () => {
  it('the browser is asked to warn only when Autosave is off and the aquarium changed since its last save', async () => {
    const { noteGameChange, leaveWouldLose } = await import('@/game/useAutosave');
    const { useSettings } = await import('@/state/settings');
    const { saveCurrentGame } = await import('@/persistence');
    const off = useGame.subscribe((s, p) => noteGameChange(s.game, p.game));
    const was = useSettings.getState().autosave;
    try {
      useSettings.setState({ autosave: false });
      useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Off', seed: 33 }));
      useUI.getState().set({ screen: 'game' });
      expect(leaveWouldLose()).toBe(false); // just loaded or started: nothing to lose yet
      useGame.getState().mutate((d) => {
        d.finance.money += 10;
      });
      expect(leaveWouldLose()).toBe(true);
      useSettings.setState({ autosave: true });
      expect(leaveWouldLose()).toBe(false); // on, leaving saves
      useSettings.setState({ autosave: false });
      expect((await saveCurrentGame('slot1', { toast: false })).ok).toBe(true);
      expect(leaveWouldLose()).toBe(false); // Save now (any slot) makes it safe
      useGame.getState().mutate((d) => {
        d.finance.money += 10;
      });
      expect(leaveWouldLose()).toBe(true);
      useUI.getState().set({ screen: 'title' });
      expect(leaveWouldLose()).toBe(false); // nothing on screen to save
    } finally {
      off();
      useSettings.setState({ autosave: was });
    }
  });
});
