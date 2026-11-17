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

describe('audit 2026-11-17, I10 (B-123): a save that didn’t land is never ignored', () => {
  it('Load stops and says why; "Save and return to title" says why and keeps the player in the game', async () => {
    const { loadIntoGame, saveBeforeLeaving } = await import('@/ui/common/saves');
    const { useSettings } = await import('@/state/settings');
    const mem = createMemoryBackend();
    setStorageBackend(mem);
    const a = newGame({ starterId: 'betta', starterName: 'Here', seed: 34 });
    const b = newGame({ starterId: 'betta', starterName: 'There', seed: 35 });
    expect((await saveGame(a, 'auto')).ok).toBe(true);
    expect((await saveGame(b, 'slot1')).ok).toBe(true);
    const shown = structuredClone(a);
    shown.clock.hour += 24;
    useSettings.setState({ autosave: true });
    useGame.getState().setGame(shown);
    useUI.setState({ screen: 'game', toasts: [] });
    try {
      // the storage now refuses every write (full, or a wedged database), with nothing to fall back to
      setStorageBackend({ ...mem, set: async () => Promise.reject(new Error('refused')) });
      expect(await loadIntoGame('slot1')).toBeNull();
      expect(useUI.getState().toasts.map((t) => t.text)).toContain("Couldn't save — browser storage refused the write.");
      expect(useGame.getState().game!.saveId).toBe(a.saveId); // still the game on screen
      useUI.setState({ toasts: [] });
      expect(await saveBeforeLeaving()).toBe(false);
      expect(useUI.getState().toasts.map((t) => t.text)).toContain("Couldn't save — browser storage refused the write.");
      // a save that lands lets the player go
      setStorageBackend(mem);
      expect(await saveBeforeLeaving()).toBe(true);
    } finally {
      useUI.setState({ screen: 'boot', toasts: [] });
    }
  });
});

describe('the review of I2: every in-app Reload asks first when Autosave is off and play would be lost', () => {
  it('guardedReload asks in the game’s words; "Save now and reload" saves first; a save that fails reloads nothing', async () => {
    const { vi } = await import('vitest');
    const { noteGameChange } = await import('@/game/useAutosave');
    const { useSettings } = await import('@/state/settings');
    const { guardedReload, saveThenReload, reloadAnyway, useReloadAsk, RELOAD_WORDS } = await import('@/ui/common/reload');
    const { ErrorBoundary } = await import('@/app/ErrorBoundary');
    const reload = vi.fn();
    (globalThis as { location?: unknown }).location = { reload };
    const off = useGame.subscribe((s, p) => noteGameChange(s.game, p.game));
    const was = useSettings.getState().autosave;
    const mem = createMemoryBackend();
    setStorageBackend(mem);
    try {
      useSettings.setState({ autosave: false });
      const g = newGame({ starterId: 'betta', starterName: 'Reload', seed: 37 });
      useGame.getState().setGame(g);
      useUI.getState().set({ screen: 'game' });
      useGame.getState().mutate((d) => {
        d.finance.money += 10;
      });
      guardedReload();
      expect(reload).not.toHaveBeenCalled();
      expect(useReloadAsk.getState()).toMatchObject({ open: true, failed: false });
      // the crash card asks inline, then its Reload is "Reload anyway"
      const b = new ErrorBoundary({ name: 'interface', children: null });
      b.state = { error: new Error('boom') };
      b.setState = ((p: object) => Object.assign(b.state, p)) as never;
      b.reload();
      expect(reload).not.toHaveBeenCalled();
      expect(b.state.askReload).toBe(true);
      // the storage refusing: "Save now and reload" reloads nothing (the box then says so)
      setStorageBackend({ ...mem, set: async () => Promise.reject(new Error('refused')) });
      expect(await saveThenReload()).toBe(false);
      expect(reload).not.toHaveBeenCalled();
      setStorageBackend(mem);
      expect(await saveThenReload()).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);
      expect((await loadGameDetailed('auto')).state?.saveId).toBe(g.saveId);
      reloadAnyway();
      expect(reload).toHaveBeenCalledTimes(2);
      // with Autosave on, nothing to ask
      useReloadAsk.setState({ open: false });
      useSettings.setState({ autosave: true });
      guardedReload();
      expect(useReloadAsk.getState().open).toBe(false);
      expect(reload).toHaveBeenCalledTimes(3);
      expect(RELOAD_WORDS).toEqual({
        offLine: 'Autosave is off, so reloading loses your play since the last save.',
        saveAndReload: 'Save now and reload',
        reloadAnyway: 'Reload anyway',
        saveFailed: 'Saving didn’t work, so a reload would lose your latest play.',
      });
    } finally {
      off();
      useSettings.setState({ autosave: was });
      useReloadAsk.setState({ open: false, failed: false, busy: false });
      delete (globalThis as { location?: unknown }).location;
      useUI.getState().set({ screen: 'boot' });
    }
  });
});
