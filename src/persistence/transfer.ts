/**
 * Export / import saves as JSON files. OWNER: lane "core". Everything stays local (Blob download / File read).
 *
 * Export format: `{ "format": "aquarium-go-save", "schemaVersion": N, "exportedAt": ms, "meta": SaveMeta, "state": GameState }`.
 * Import also accepts the internal record format and a bare GameState JSON (older exports / hand-edited files).
 */
import type { GameState } from '@/types';
import { SAVE_FORMAT, MAX_IMPORT_BYTES, serializeState, makeMeta, decodeRecord } from './serialize';
import { SaveError, type SaveMeta, type SaveErrorCode } from './types';
import { saveGame } from './slots';

export interface ImportResult {
  ok: boolean;
  state?: GameState;
  meta?: SaveMeta;
  /** Friendly error for the UI. */
  error?: string;
  code?: SaveErrorCode;
  migratedFrom?: number;
  /** Slot written when `slot` was given. */
  slot?: string;
}

/** The text of an export file for this state. */
export function exportSaveText(state: GameState): string {
  const { json } = serializeState(state);
  const meta = makeMeta(state, 'export', Date.now(), json.length);
  // Hand-build the wrapper so the (possibly large) state JSON is not re-serialized.
  return `{"format":"${SAVE_FORMAT}","schemaVersion":${state.schemaVersion},"exportedAt":${Date.now()},"meta":${JSON.stringify(meta)},"state":${json}}`;
}

/** A filesystem-friendly file name, e.g. `aquarium-go_my-aquarium_day12.json`. */
export function exportFileName(state: GameState): string {
  const shop = (state.shopName || 'aquarium').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'aquarium';
  const day = Math.floor(state.clock.hour / 24) + 1;
  return `aquarium-go_${shop}_day${day}.json`;
}

/** Trigger a browser download of the save (no network: a local object URL). Returns the file name. */
export function downloadSave(state: GameState, fileName = exportFileName(state)): string {
  const blob = new Blob([exportSaveText(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return fileName;
}

/** Validate + migrate an export file's text. Optionally store it into `slot`. */
export async function importSaveText(text: string, slot?: string): Promise<ImportResult> {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, code: 'empty', error: 'That file is empty.' };
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, code: 'too_large', error: 'That file is too large to be an Aquarium Go save.' };
  const trimmed = text.trimStart();
  if (trimmed[0] !== '{') return { ok: false, code: 'not_json', error: "That file isn't an Aquarium Go save (it isn't JSON)." };
  try {
    const d = decodeRecord(trimmed, 'That file');
    const state = d.state;
    state.isShowcase = false;
    const res: ImportResult = { ok: true, state, meta: makeMeta(state, slot ?? 'import', state.lastSavedRealMs), migratedFrom: d.fromVersion };
    if (slot) {
      const saved = await saveGame(state, slot);
      if (!saved.ok) return { ok: false, code: 'storage', error: saved.message };
      res.slot = slot;
    }
    return res;
  } catch (e) {
    if (e instanceof SaveError) {
      const friendly = e.code === 'not_json' ? "That file isn't an Aquarium Go save (it isn't valid JSON)." : e.friendly;
      return { ok: false, code: e.code, error: friendly };
    }
    return { ok: false, code: 'invalid', error: "That file couldn't be imported." };
  }
}

/** Read a user-picked File and import it. */
export async function importSaveFile(file: File, slot?: string): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, code: 'too_large', error: 'That file is too large to be an Aquarium Go save.' };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, code: 'invalid', error: "That file couldn't be read." };
  }
  return importSaveText(text, slot);
}
