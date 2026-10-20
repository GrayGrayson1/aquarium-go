/**
 * UI-side save helpers over `@/persistence` (owned by lane "core": slots auto/slot1..3, backups, migrations,
 * bounded offline catch-up, export/import). Autosave is run by core's GameLoop. OWNER: lane "ui-shell".
 */
import {
  baseSaveId,
  copySave,
  onSavesChanged,
  onBackendChange,
  storageStatus,
  listSaves,
  deleteSave,
  loadAndResume,
  saveCurrentGame,
  importSaveFile,
  downloadSave,
  slotLabel as coreSlotLabel,
  SAVE_SLOTS,
  type SaveMeta,
  type SaveGameOptions,
} from '@/persistence';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { autosaveAllowed } from '@/game/useAutosave';

export type { SaveMeta };
export { SAVE_SLOTS };

export const slotLabel = (slot: string) => coreSlotLabel(slot);

export async function listSlots(): Promise<SaveMeta[]> {
  try {
    return await listSaves();
  } catch (e) {
    console.warn('[ui] listSaves failed', e);
    return [];
  }
}

/** Manual save of the running game into `slot` (toasts the outcome). */
export async function saveNow(slot = 'auto', toast = true): Promise<boolean> {
  const g = useGame.getState().game;
  if (!g || g.isShowcase) return false;
  try {
    const r = await saveCurrentGame(slot, { toast });
    return r.ok;
  } catch (e) {
    console.warn('[ui] save failed', e);
    if (toast) useUI.getState().toast('Saving failed — please try again.', 'danger');
    return false;
  }
}

/**
 * Load a slot (with bounded offline catch-up) and enter the game.
 * lane:fix-core (P7-03/S14-05) — a game that is running is autosaved first, exactly like "Save and return to title",
 * so browsing saves mid-game can never throw away the last minute of play. Chunk 9 (E1): when the slot holds another
 * copy of the aquarium on screen, it is autosaved as a kept copy, so it stays listed as "Previous autosave" (the
 * load dialog says so) instead of being dropped by the loaded copy's next autosaves.
 */
export async function loadIntoGame(slot: string): Promise<GameState | null> {
  let parked: string[] = [];
  try {
    // with Settings' autosave off too (the review's blocker 4): the dialog promises the current progress is kept
    if (autosaveAllowed({ evenIfOff: true })) {
      const g = useGame.getState().game;
      const target = g ? (await listSlots()).find((m) => m.slot === slot) : undefined;
      // the review's confirmation (B): a further copy of this aquarium kept only in the autosave (a title-screen load
      // of an earlier one, not yet autosaved) would go with the two writes this load makes: to a slot first
      if (g && target?.saveId) {
        const kept = await keepAutosavedCopies([{ saveId: g.saveId, hour: g.clock.hour }, { saveId: target.saveId, hour: target.hour ?? Number.NaN }], { sameAquariumOnly: true, loading: slot });
        if (!kept) return null;
        parked = kept;
      }
      const saved = await saveCurrentGame('auto', { flush: true, toast: false, asKept: !!(target && g && isSameGame(target, g)) });
      if (!saved.ok && saved.code !== 'stale') console.warn('[ui] autosave before load failed:', saved.message);
    }
  } catch (e) {
    console.warn('[ui] autosave before load failed', e);
  }
  try {
    const r = await loadAndResume(slot);
    if (!r.ok || !r.state) {
      if (r.error) useUI.getState().toast(r.error, 'danger');
      return null;
    }
    if (r.restoredFromBackup) useUI.getState().toast('That save was damaged — restored from its backup copy.', 'warning');
    for (const m of parked) useUI.getState().toast(m, 'success');
    useUI.getState().set({ hudHidden: false, cameraMode: 'front' });
    return r.state;
  } catch (e) {
    console.warn('[ui] load failed', e);
    useUI.getState().toast('That save could not be loaded — it may be damaged. Try its previous copy or an exported file.', 'danger');
    return null;
  }
}

/** Is this listed save a copy of the running game? (exact by saveId; older metas fall back to the name trio) */
export function isSameGame(m: SaveMeta, g: GameState): boolean {
  if (m.saveId) return m.saveId === g.saveId;
  const starter = Object.values(g.creatures).find((c) => c.isStarter);
  return m.shopName === g.shopName && m.starterId === g.starterId && (m.starterName ?? '') === (starter?.name ?? '');
}

/**
 * lane:fix-core (P5-03/S06-03) — what loading another save means for the running game, for the confirm step:
 * it is autosaved first; if it lives only in the autosave, the loaded game's autosaves will displace it (it stays
 * loadable as "Previous autosave" until the next switch), so offer to park it in a free slot.
 */
export function loadKeepAdvice(saves: SaveMeta[], g: GameState | null): { text: string; freeSlot: string | null; keptIn: string | null } {
  if (!g || g.isShowcase) return { text: '', freeSlot: null, keptIn: null };
  const manual = saves.filter((m) => m.slot !== 'auto' && !m.previousOf);
  const kept = manual.filter((m) => isSameGame(m, g)).sort((a, b) => b.savedAt - a.savedAt)[0] ?? null;
  const taken = new Set(manual.map((m) => m.slot));
  const freeSlot = SAVE_SLOTS.find((s) => s !== 'auto' && !taken.has(s)) ?? null;
  if (kept) return { text: `${g.shopName} is also saved in ${slotLabel(kept.slot)} (${timeAgo(kept.savedAt)}), so you can come back to it any time.`, freeSlot: null, keptIn: kept.slot };
  return {
    text: `${g.shopName} is only in the autosave. It stays available as “Previous autosave” after you switch, until you switch again — save it to a slot to keep it for good.`,
    freeSlot,
    keptIn: null,
  };
}

/**
 * Chunk 9 (B1; the review's confirmation, A and B; ADR-0044 decisions 4 and 6): a load writes the autosave slot (the
 * game it replaces, then the loaded copy's autosaves), which can push out what is there. A copy kept only there (in
 * the autosave or its "Previous autosave", in no slot as far along) is saved to a free slot first, unless it is a copy
 * of an aquarium being written (`written`: the game on screen, the
 * copy loaded) no further along than each copy of it written now (an older state of it), or, with `sameAquariumOnly`
 * (Settings › Saves' Load), another aquarium (that goes on a switch, as the dialog says). `loading` is the slot the
 * load reads, never parked. With every slot full nothing may load, and it says so. Returns null when the load must
 * stop, else the messages to show once the load is done (the toasts are cleared when the aquarium changes).
 */
export async function keepAutosavedCopies(written: { saveId: string; hour: number }[], opts: { sameAquariumOnly?: boolean; loading?: string } = {}): Promise<string[] | null> {
  const hoursOf = (id: string) => written.filter((w) => baseSaveId(w.saveId) === baseSaveId(id)).map((w) => w.hour);
  let saves = await listSlots();
  const manual = () => saves.filter((m) => m.slot !== 'auto' && !m.previousOf);
  const parked = new Set<string>();
  const messages: string[] = [];
  for (const m of saves.filter((x) => (x.slot === 'auto' || x.previousOf === 'auto') && x.slot !== opts.loading)) {
    if (!m.saveId || parked.has(m.saveId)) continue;
    const same = hoursOf(m.saveId);
    if (opts.sameAquariumOnly && !same.length) continue;
    // a copy of an aquarium being written, no further along than each copy of it written now: an older state of it,
    // which goes as any "Previous autosave" goes on a switch (an exact copy of the game on screen included)
    if (same.length && !same.every((h) => typeof m.hour === 'number' && Number.isFinite(h) && m.hour > h + 1e-6)) continue;
    if (manual().some((k) => k.saveId === m.saveId && (k.hour ?? -Infinity) >= (m.hour ?? Infinity) - 1e-6)) continue;
    const to = freeSaveSlot(saves); // never over another save: a slot's older copy may be a checkpoint kept on purpose
    if (!to) {
      useUI.getState().toast(`${m.shopName} is only in the autosave and every slot is full. Free a slot in Settings › Saves first.`, 'danger');
      return null;
    }
    const r = await copySave(m.slot, to);
    if (!r.ok) {
      useUI.getState().toast(r.message, 'danger');
      return null;
    }
    messages.push(`${m.shopName} was only in the autosave, so it was saved to ${slotLabel(to)} first.`);
    saves = [...saves.filter((k) => k.slot !== to), { ...m, slot: to, previousOf: undefined }];
    parked.add(m.saveId);
  }
  return messages;
}

/** Chunk 9 (E1): the first manual slot with no save in it, or null. */
export function freeSaveSlot(saves: SaveMeta[]): string | null {
  const taken = new Set(saves.filter((m) => !m.previousOf).map((m) => m.slot));
  return SAVE_SLOTS.find((s) => s !== 'auto' && !taken.has(s)) ?? null;
}

export async function deleteSlot(slot: string): Promise<void> {
  try {
    await deleteSave(slot);
  } catch (e) {
    console.warn('[ui] delete failed', e);
  }
}

/** Download the running game as a .json file. */
export function exportCurrent(): boolean {
  const g = useGame.getState().game;
  if (!g || g.isShowcase) return false;
  try {
    downloadSave(g);
    return true;
  } catch (e) {
    console.warn('[ui] export failed', e);
    return false;
  }
}

/** Import an exported file into `slot`. Returns a friendly error on failure. */
export async function importFile(file: File, slot: string, opts: SaveGameOptions = {}): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await importSaveFile(file, slot, opts);
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'That file is not an Aquarium Go save.' };
  } catch (e) {
    console.warn('[ui] import failed', e);
    return { ok: false, error: 'That file could not be read.' };
  }
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function timeAgo(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3570) return `${Math.round(s / 60)} min ago`; // lane:w2-ui: no "60 min ago" / "24 h ago"
  if (s < 84600) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/**
 * Re-list whenever the stored saves change behind our back (a late IndexedDB migration moves saves over, the backend
 * is promoted/demoted). Returns the unsubscribe function.
 */
export function watchSaves(relist: () => void): () => void {
  const offs: (() => void)[] = [];
  try {
    offs.push(onSavesChanged(relist));
    offs.push(onBackendChange(() => relist()));
  } catch (e) {
    console.warn('[ui] watchSaves failed', e);
  }
  return () => offs.forEach((f) => f());
}

/** A player-facing storage notice (memory-only / blocked / slow database), or null when saving is healthy. */
export function storageNotice(): { text: string; tone: 'warning' | 'info' } | null {
  try {
    const st = storageStatus();
    if (!st.backend || st.reason === 'ok') return null;
    if (st.backend === 'memory' || st.reason === 'unavailable')
      return { text: st.warning ?? 'Browser storage is unavailable — progress will only last until this tab closes. Use Export Save to keep a copy.', tone: 'warning' };
    if (st.pendingPromotion) return { text: st.warning ?? 'The save database is slow to open — saving to local storage for now.', tone: 'info' };
    return st.warning ? { text: st.warning, tone: 'info' } : null;
  } catch {
    return null;
  }
}
