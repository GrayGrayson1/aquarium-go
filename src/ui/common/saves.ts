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
  isStaleGame,
  loadGameDetailed,
  parseSlotRef,
  resumeState,
  saveCurrentGame,
  importSaveFile,
  downloadSave,
  slotLabel as coreSlotLabel,
  SAVE_SLOTS,
  isSharedShop,
  SHARED_SAVE_REFUSED,
  type SaveMeta,
  type SaveGameOptions,
} from '@/persistence';
import type { GameState } from '@/types';
import { create } from 'zustand';
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

/**
 * chunk 13 (SHARE-011, SHARED-SHOPS.md §7.3) — Save, Load, Import and Export refuse a shared shop before doing
 * anything: it saves itself on the server. Says so (ADR-0048's words) unless `quiet`.
 */
export function refusedInSharedShop(toast = true): boolean {
  if (!isSharedShop(useGame.getState().game)) return false;
  if (toast) useUI.getState().toast(SHARED_SAVE_REFUSED, 'info');
  return true;
}

/** Manual save of the running game into `slot` (toasts the outcome). */
export async function saveNow(slot = 'auto', toast = true): Promise<boolean> {
  const g = useGame.getState().game;
  if (!g || g.isShowcase) return false;
  if (refusedInSharedShop(toast)) return false;
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
 * load dialog says so) instead of being dropped by the loaded copy's next autosaves. Chunk 9's review: the copy to
 * load is read before anything is written (that save writes the autosave slot, which may hold it), and when it came
 * from the autosave slot it is saved again at once, since its stored copy may just have been written over.
 */
export async function loadIntoGame(slot: string): Promise<GameState | null> {
  if (refusedInSharedShop()) return null;
  let parked: string[] = [];
  const showParked = () => parked.splice(0).forEach((m) => useUI.getState().toast(m, 'success'));
  try {
    // a tab another tab played further (the stale banner's "load the newer copy") saves nothing first, as before: its
    // saves are refused, and reading the slot below clears that (the review's last confirmation). It still keeps what
    // this load's writes would push out (its final confirmation).
    const on = useGame.getState().game;
    const writable = autosaveAllowed({ evenIfOff: true }) && !!on;
    const saveFirst = writable && !isStaleGame(on!.saveId);
    const r = await loadGameDetailed(slot);
    if (!r.ok || !r.state) {
      if (r.error) useUI.getState().toast(r.error, 'danger');
      return null;
    }
    let wrote = false;
    const loaded: AutosaveWrite = { saveId: r.state.saveId, hour: r.state.clock.hour };
    if (!writable) {
      // audit I3: with nothing of ours on screen (the title's Load, Continue, a link) the loaded copy's autosaves still
      // switch the autosave slot: a "Previous autosave" kept in no slot goes to a free slot first, or the box asks
      const kept = await keepAutosavedCopies([loaded], { lostOnly: true, loading: slot });
      if (!kept) return null;
      parked = kept;
    }
    if (writable) {
      try {
        const g = useGame.getState().game!;
        const asKept = g.saveId === r.state.saveId;
        // the review's confirmation (B): a further copy of this aquarium kept only in the autosave (a title-screen load
        // of an earlier one, not yet autosaved) would go with the writes this load makes: to a slot first; audit I3:
        // and another aquarium these writes push out of "Previous autosave" (or the box asks)
        const writes: AutosaveWrite[] = saveFirst ? [{ saveId: g.saveId, hour: g.clock.hour, kept: asKept }, loaded] : [loaded];
        const kept = await keepAutosavedCopies([{ saveId: g.saveId, hour: g.clock.hour }, loaded], { sameAquariumOnly: true, loading: slot, writes });
        if (!kept) return null;
        parked = kept;
        // with Settings' autosave off too (the review's blocker 4): the dialog promises the current progress is kept
        if (saveFirst) {
          wrote = true; // tried: even a write that failed part-way may have changed the slot this copy came from
          const saved = await saveCurrentGame('auto', { flush: true, toast: false, asKept });
          if (!saved.ok && saved.code !== 'stale') console.warn('[ui] autosave before load failed:', saved.message);
        }
      } catch (e) {
        console.warn('[ui] autosave before load failed', e);
      }
    }
    resumeState(r.state);
    // the save above wrote the slot this copy came from: store it again at once (a title or Continue load writes nothing)
    if (wrote && parseSlotRef(slot).slot === 'auto') await saveCurrentGame('auto', { flush: false, toast: false });
    if (r.restoredFromBackup) useUI.getState().toast('That save was damaged — restored from its backup copy.', 'warning');
    showParked();
    useUI.getState().set({ hudHidden: false, cameraMode: 'front' });
    return useGame.getState().game;
  } catch (e) {
    console.warn('[ui] load failed', e);
    showParked();
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

/** Audit 2026-11-17, I3: a write a switch makes to the autosave slot, in order; `kept`, written as a kept copy (a new identity). */
export interface AutosaveWrite {
  saveId: string;
  hour: number;
  kept?: boolean;
}

/** The first autosave of a new game: an identity no stored copy has. */
export const NEW_GAME_WRITE: AutosaveWrite = { saveId: '\u0000new-game', hour: 0 };

/**
 * Audit 2026-11-17, I3 — which of the autosave slot's copies (the autosave, its "Previous autosave") the writes push out
 * of the slot: its rotation (src/persistence/slots.ts, saveGame) played on their identities. A write of another
 * aquarium moves the autosave into "Previous autosave", over what was there; a write of the same aquarium keeps another
 * aquarium's "Previous autosave", unless the autosave is further along (then that goes there, as a kept copy).
 */
export function pushedOut(saves: SaveMeta[], writes: AutosaveWrite[]): Set<string> {
  type Rec = { slot: string | null; id: string; hour: number };
  const auto = saves.find((m) => m.slot === 'auto' && !m.previousOf);
  const prev = saves.find((m) => m.previousOf === 'auto');
  const rec = (m: SaveMeta | undefined): Rec | null => (m ? { slot: m.slot, id: m.saveId ?? m.slot, hour: m.hour ?? Infinity } : null);
  let p = rec(auto);
  let b = rec(prev);
  writes.forEach((w, i) => {
    const r: Rec = { slot: null, id: w.kept ? `\u0000kept-${i}` : w.saveId, hour: w.hour };
    if (p && p.id === r.id && !(p.hour > r.hour + 1e-6)) {
      if (!b || b.id === r.id) b = p;
      p = { ...r, slot: p.slot }; // the same aquarium, as far along or further: nothing of it is lost
      return;
    }
    if (p) b = p;
    p = r;
  });
  const left = new Set([p?.slot, b?.slot]);
  return new Set([auto, prev].filter((m): m is SaveMeta => !!m && !left.has(m.slot)).map((m) => m.slot));
}

export interface KeepOptions {
  /** Settings › Saves' Load: another aquarium the switch leaves listed goes as the dialog says (not parked). */
  sameAquariumOnly?: boolean;
  /** Only copies the switch deletes (a load with nothing on screen: the title's Load, Continue, a link). */
  lostOnly?: boolean;
  /** The slot the load reads, never parked. */
  loading?: string;
  /** The writes to the autosave slot, in order (default: `written`, in its order). */
  writes?: AutosaveWrite[];
  /** Every slot is full and copies would be deleted: may they be? (default: the box, `askBeforeDeleting`) */
  confirmLoss?: (lost: SaveMeta[]) => Promise<boolean>;
}

/**
 * Chunk 9 (B1; ADR-0044 decisions 4 and 6) and audit 2026-11-17, I3 (the owner's decision: "Save it to a free slot"):
 * which of the autosave slot's copies go to a free slot before a switch. A copy kept only there (in the autosave or its
 * "Previous autosave", in no slot as far along) is parked, unless it is a copy of an aquarium being written
 * (`written`) no further along than each copy of it written now (an older state of it), or, with `sameAquariumOnly`
 * or `lostOnly`, another aquarium the switch leaves listed. The copies the switch deletes (`pushedOut`) take the free
 * slots first; `unkept` are those left with none, which would be deleted.
 */
export function planKeep(saves: SaveMeta[], written: { saveId: string; hour: number }[], opts: KeepOptions = {}): { park: { m: SaveMeta; to: string }[]; unkept: SaveMeta[] } {
  const hoursOf = (id: string) => written.filter((w) => baseSaveId(w.saveId) === baseSaveId(id)).map((w) => w.hour);
  const out = pushedOut(saves, opts.writes ?? written);
  const manual = saves.filter((m) => m.slot !== 'auto' && !m.previousOf);
  const wanted: { m: SaveMeta; lost: boolean }[] = [];
  for (const m of saves.filter((x) => (x.slot === 'auto' || x.previousOf === 'auto') && x.slot !== opts.loading)) {
    if (!m.saveId || wanted.some((w) => w.m.saveId === m.saveId)) continue;
    const lost = out.has(m.slot);
    const same = hoursOf(m.saveId);
    if (!lost && (opts.lostOnly || (opts.sameAquariumOnly && !same.length))) continue;
    // a copy of an aquarium being written, no further along than each copy of it written now: an older state of it,
    // which goes as any "Previous autosave" goes on a switch (an exact copy of the game on screen included)
    if (same.length && !same.every((h) => typeof m.hour === 'number' && Number.isFinite(h) && m.hour > h + 1e-6)) continue;
    if (manual.some((k) => k.saveId === m.saveId && (k.hour ?? -Infinity) >= (m.hour ?? Infinity) - 1e-6)) continue;
    wanted.push({ m, lost });
  }
  // the copies the switch deletes first; one that stays listed as "Previous autosave" only if a slot is left
  wanted.sort((a, b) => Number(b.lost) - Number(a.lost));
  const taken = new Set(saves.filter((m) => !m.previousOf).map((m) => m.slot));
  const free = SAVE_SLOTS.filter((x) => x !== 'auto' && !taken.has(x)); // never over another save: it may be a checkpoint
  const park: { m: SaveMeta; to: string }[] = [];
  const unkept: SaveMeta[] = [];
  wanted.forEach((w, i) => {
    if (free[i]) park.push({ m: w.m, to: free[i] });
    else if (w.lost) unkept.push(w.m);
  });
  return { park, unkept };
}

/** Audit I3: the box that asks before every slot being full means a copy is deleted (SaveLossConfirm.tsx shows it). */
export interface LossAsk {
  lost: SaveMeta[];
  answer(ok: boolean): void;
}
export const useSaveLoss = create<{ ask: LossAsk | null }>(() => ({ ask: null }));

/** "“Previous autosave” (Coral Cove, Day 12) will be deleted." */
export const lossLine = (m: SaveMeta): string => `“${slotLabel(m.slot)}” (${m.shopName}, Day ${m.day}) will be deleted.`;

/** Ask (the box) whether the copies may be deleted; a second ask answers the first "no". */
export function askBeforeDeleting(lost: SaveMeta[]): Promise<boolean> {
  useSaveLoss.getState().ask?.answer(false);
  return new Promise((resolve) => {
    const ask: LossAsk = {
      lost,
      answer: (ok) => {
        if (useSaveLoss.getState().ask === ask) useSaveLoss.setState({ ask: null });
        resolve(ok);
      },
    };
    useSaveLoss.setState({ ask });
  });
}

let declined = false;
/** The player answered the box "Cancel" in the last keep (a load that stops for that isn't a failure to report). */
export function takeDeclined(): boolean {
  const d = declined;
  declined = false;
  return d;
}

/**
 * Park what `planKeep` says before a switch writes the autosave slot. With every slot full and a copy that would be
 * deleted, the box asks first (Cancel: nothing written). Returns null when the switch must stop, else the messages to
 * show once it is done (the toasts are cleared when the aquarium changes).
 */
export async function keepAutosavedCopies(written: { saveId: string; hour: number }[], opts: KeepOptions = {}): Promise<string[] | null> {
  declined = false;
  const plan = planKeep(await listSlots(), written, opts);
  if (plan.unkept.length && !(await (opts.confirmLoss ?? askBeforeDeleting)(plan.unkept))) {
    declined = true;
    return null;
  }
  const messages: string[] = [];
  for (const { m, to } of plan.park) {
    const r = await copySave(m.slot, to);
    if (!r.ok) {
      messages.forEach((t) => useUI.getState().toast(t, 'success')); // what was saved to a slot, it was (B-208)
      useUI.getState().toast(r.message, 'danger');
      return null;
    }
    messages.push(`${m.shopName} was only in the autosave, so it was saved to ${slotLabel(to)} first.`);
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
  if (refusedInSharedShop()) return false;
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
  if (isSharedShop(useGame.getState().game)) return { ok: false, error: SHARED_SAVE_REFUSED };
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
