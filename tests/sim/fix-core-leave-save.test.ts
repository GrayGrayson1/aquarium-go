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
