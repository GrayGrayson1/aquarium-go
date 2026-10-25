/**
 * Persistence public API. OWNER: lane "core".
 *
 * - Slots: 'auto' (autosave), 'slot1'..'slot3' (manual). Each write keeps a `.backup` of the previous good save;
 *   a damaged save falls back to its backup automatically (with a toast).
 * - Storage: IndexedDB → localStorage → in-memory (warning toast). Never touches the network. A slow IndexedDB is
 *   waited for (PROBE_PATIENCE_MS) and promoted when it answers; saves are listed/loaded across every backend they
 *   may live in (newest wins) and moved into IndexedDB when it is available (`onSavesChanged` fires after a move).
 * - Versioned schema with migrations (./migrations.ts) + a repair pass on every load.
 * - Offline progress: `loadAndResume(slot)` simulates up to OFFLINE_CAP_HOURS under a maintenance grace period.
 * - Export/import JSON files (./transfer.ts).
 *
 * UI usage:
 *   Continue:        await continueGame()                 // or loadAndResume(slot)
 *   Save (manual):   await saveCurrentGame('slot1', { toast: true })
 *   Slot list:       await listSaves()
 *   Export:          downloadSave(getGame()!)
 *   Import:          const r = await importSaveFile(file, 'slot2'); if (!r.ok) toast(r.error)
 *   Welcome back:    useResume(s => s.summary)
 */
export { SCHEMA_VERSION } from './schema';
export type { SaveMeta, SaveResult, LoadResult, SaveErrorCode } from './types';
export { SaveError } from './types';
export {
  saveGame,
  loadGame,
  loadGameDetailed,
  deleteSave,
  listSaves,
  hasAnySave,
  latestSaveSlot,
  SAVE_SLOTS,
  SAVE_PREFIX,
  META_PREFIX,
  rawSlot,
  reconcileSaves,
  onSavesChanged,
  resetSaveReconciliation,
  saveGameSync,
  isStaleGame,
  keepThisCopy,
  noteCatchUp,
  useStaleSaves,
  parseSlotRef,
  isBackupRef,
  resetSaveSession,
  baseSaveId,
  keptSaveId,
  copySave,
  type SaveSlot,
  type SaveGameOptions,
} from './slots';
export { saveCurrentGame, saveCurrentGameSync, slotLabel, stateForSaving, neverAutosave, autosaveRefused, SCENARIO_AUTOSAVE_REFUSED, type SaveCurrentOptions } from './session';
export {
  loadAndResume,
  resumeState,
  continueGame,
  simulateOffline,
  offlineHoursFor,
  useResume,
  catchUpAfterHidden,
  OFFLINE_MIN_REAL_MS,
  OFFLINE_HIDDEN_MIN_MS,
  GRACE_HEALTH_FLOOR,
  GRACE_MAX_HUNGER,
  GRACE_MAX_TOXIN_PPM,
  OFFLINE_CHUNK_HOURS,
  type OfflineSummary,
  type ResumeResult,
  type ResumeOptions,
  type SimulateOfflineOptions,
} from './offline';
export { exportSaveText, exportFileName, downloadSave, importSaveText, importSaveFile, type ImportResult } from './transfer';
export { isSharedShop, markSharedAway, sharedAwayHeartbeat, readSharedAway, clearSharedAway, takeSharedAwayMs, SHARED_SAVE_REFUSED, SHARED_SAVE_PREFIX, SHARED_AWAY_KEY, type SharedAway } from './sharedAway'; // chunk 13
export { migrateSave, repairState, validateSaveShape, detectVersion, MIGRATIONS, type Migration, type MigrateResult } from './migrations';
export { serializeState, encodeRecord, decodeRecord, makeMeta, cyrb53, MAX_INLINE_DATA_URL, SAVE_FORMAT, SAVE_BUDGET_CHARS } from './serialize';
export { stateHash, canonicalState } from './hash';
export {
  storage,
  setStorageBackend,
  createMemoryBackend,
  configureStorageDetection,
  storageStatus,
  onBackendChange,
  syncStore,
  setSyncStore,
  warningText,
  isQuotaError,
  PROBE_PATIENCE_MS,
  OP_TIMEOUT_MS,
  type KVBackend,
  type BackendName,
  type StorageStatus,
  type StorageReason,
} from './storage';
