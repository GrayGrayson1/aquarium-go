/**
 * Save slots: write with backup, load with corruption fallback, list/delete. OWNER: lane "core".
 *
 * Keys (any backend):
 *   aquarium-go.save.<slot>          current record (see ./serialize.ts)
 *   aquarium-go.save.<slot>.backup   previous good record (written just before an overwrite)
 *   aquarium-go.meta.<slot>          SaveMeta JSON for fast slot listing
 */
import type { GameState } from '@/types';
import { storage, onBackendChange, type KVBackend, type BackendName } from './storage';
import { encodeRecord, decodeRecord, readHeader, makeMeta, cyrb53, type DecodedSave } from './serialize';
import { SaveError, type SaveMeta, type SaveResult, type LoadResult } from './types';

export const SAVE_PREFIX = 'aquarium-go.save.';
export const META_PREFIX = 'aquarium-go.meta.';
export const BACKUP_SUFFIX = '.backup';
/** Standard slots shown by the UI. Any id matching SLOT_RE works. */
export const SAVE_SLOTS = ['auto', 'slot1', 'slot2', 'slot3'] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];
const SLOT_RE = /^[A-Za-z0-9_-]{1,32}$/;

const saveKey = (slot: string) => SAVE_PREFIX + slot;
const backupKey = (slot: string) => SAVE_PREFIX + slot + BACKUP_SUFFIX;
const metaKey = (slot: string) => META_PREFIX + slot;

function checkSlot(slot: string): void {
  if (!SLOT_RE.test(slot)) throw new SaveError('invalid', `“${slot}” isn't a valid save slot name.`);
}

/** Serialize writes per slot so an autosave can never interleave with a manual save. */
const queues = new Map<string, Promise<unknown>>();
function enqueue<T>(slot: string, job: () => Promise<T>): Promise<T> {
  const prev = queues.get(slot) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(job);
  queues.set(
    slot,
    next.catch(() => undefined),
  );
  return next;
}

/**
 * True when a stored record is intact (used to decide whether it may become the backup).
 * Records with a header only need a checksum check (no parse); legacy records are fully decoded.
 */
function isIntact(raw: unknown): boolean {
  const h = readHeader(raw);
  if (h && typeof raw === 'string') {
    const body = raw.slice(raw.indexOf('\n') + 1);
    return body.length === h.length && cyrb53(body) === h.checksum;
  }
  try {
    decodeRecord(raw);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save a game state into a slot. Showcase worlds are never saved.
 * The previous record (if it is intact) is copied to `<slot>.backup` first.
 */
export async function saveGame(state: GameState, slot = 'auto'): Promise<SaveResult> {
  if (!state) return { ok: false, slot, message: 'Nothing to save.' };
  if (state.isShowcase) return { ok: false, slot, message: 'Showcase worlds are not saved.' };
  checkSlot(slot);
  return enqueue(slot, async () => {
    const { text, header, stats } = encodeRecord(state, slot);
    try {
      const prev = await storage.get(saveKey(slot));
      // Only rotate an intact record into the backup; a damaged one must never overwrite a good backup.
      if (prev !== undefined && prev !== null && isIntact(prev)) {
        await storage.set(backupKey(slot), typeof prev === 'string' ? prev : JSON.stringify(prev));
      }
      await storage.set(saveKey(slot), text);
      await storage.set(metaKey(slot), JSON.stringify(header.meta));
      if (stats.fixedNumbers > 0 && typeof console !== 'undefined') console.warn(`[aquarium-go] save: replaced ${stats.fixedNumbers} invalid number(s) with 0`);
      return {
        ok: true,
        slot,
        message: 'Game saved',
        bytes: text.length,
        backend: await storage.backendName(),
        strippedPhotos: stats.strippedDataUrls,
      };
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[aquarium-go] save failed', e);
      return { ok: false, slot, message: "Couldn't save — browser storage refused the write." };
    }
  });
}

/** One stored copy of a slot (primary or backup) in one backend. */
interface SlotCopy {
  backend: KVBackend;
  kind: 'primary' | 'backup';
  raw: unknown;
  intact: boolean;
  /** Real ms the copy was written (header savedAt; legacy records use the state's lastSavedRealMs). */
  savedAt: number;
  /** Legacy records are fully decoded to check them; keep the result. */
  decoded?: DecodedSave;
}

const hasValue = (raw: unknown) => raw !== undefined && raw !== null && raw !== '';

function describeCopy(backend: KVBackend, kind: SlotCopy['kind'], raw: unknown): SlotCopy | null {
  if (!hasValue(raw)) return null;
  const h = readHeader(raw);
  if (h) return { backend, kind, raw, intact: isIntact(raw), savedAt: Number.isFinite(h.savedAt) ? h.savedAt : 0 };
  try {
    const decoded = decodeRecord(raw);
    return { backend, kind, raw, intact: true, savedAt: decoded.state.lastSavedRealMs ?? 0, decoded };
  } catch {
    return { backend, kind, raw, intact: false, savedAt: 0 };
  }
}

/**
 * Every copy of a slot across all backends it may live in (active first), best first: intact before damaged, newest
 * first, primary before backup, active backend before the others. `readError` is set when the active backend itself
 * could not be read.
 */
async function slotCopies(slot: string): Promise<{ copies: SlotCopy[]; readError: boolean }> {
  let sources: KVBackend[];
  try {
    sources = await storage.sources();
  } catch {
    return { copies: [], readError: true };
  }
  const copies: SlotCopy[] = [];
  let readError = false;
  for (let i = 0; i < sources.length; i++) {
    const b = sources[i];
    for (const kind of ['primary', 'backup'] as const) {
      let raw: unknown;
      try {
        // The active backend goes through `storage` so a runtime failure demotes it like any other operation.
        raw = i === 0 ? await storage.get(kind === 'primary' ? saveKey(slot) : backupKey(slot)) : await b.get(kind === 'primary' ? saveKey(slot) : backupKey(slot));
      } catch {
        if (i === 0) readError = true;
        continue;
      }
      const c = describeCopy(b, kind, raw);
      if (c) copies.push(c);
    }
  }
  const order = new Map(sources.map((b, i) => [b, i]));
  copies.sort((a, b) => Number(b.intact) - Number(a.intact) || b.savedAt - a.savedAt || (a.kind === b.kind ? 0 : a.kind === 'primary' ? -1 : 1) || (order.get(a.backend) ?? 0) - (order.get(b.backend) ?? 0));
  return { copies, readError };
}

function decodeCopy(c: SlotCopy): LoadResult {
  const label = c.kind === 'primary' ? 'This save' : 'The backup save';
  try {
    const d = c.decoded ?? decodeRecord(c.raw, label);
    return { ok: true, state: d.state, migratedFrom: d.fromVersion, repairs: d.repairs };
  } catch (e) {
    const se = e instanceof SaveError ? e : new SaveError('invalid', `${label} couldn't be loaded.`, String(e));
    return { ok: false, code: se.code, error: se.friendly };
  }
}

/**
 * Load a slot with full diagnostics. Looks in every backend the slot may have been written to (a slow first visit
 * can leave saves in localStorage) and loads the newest intact copy. Falls back to a `.backup` copy when the primary
 * is damaged (`restoredFromBackup: true` — the caller tells the player).
 */
export async function loadGameDetailed(slot = 'auto'): Promise<LoadResult> {
  try {
    checkSlot(slot);
  } catch (e) {
    return { ok: false, code: 'invalid', error: (e as SaveError).friendly };
  }
  await reconcileSaves();
  const { copies, readError } = await slotCopies(slot);
  let firstError: LoadResult | null = null;
  for (const c of copies) {
    const r = decodeCopy(c);
    if (r.ok && r.state) {
      if (c.kind === 'backup') return finishBackup(slot, r);
      r.meta = { ...makeMeta(r.state, slot, r.state.lastSavedRealMs), backend: c.backend.name };
      return r;
    }
    firstError ??= r;
  }
  if (firstError) {
    // Prefer the primary's explanation (the damaged save the player knows about).
    const primary = copies.find((c) => c.kind === 'primary');
    const err = primary ? decodeCopy(primary) : firstError;
    if (typeof console !== 'undefined') console.warn(`[aquarium-go] save slot ${slot} is damaged: ${err.error}`);
    return err;
  }
  if (readError) return { ok: false, code: 'storage', error: "Couldn't read browser storage." };
  return { ok: false, code: 'empty', error: 'No save in this slot.' };
}

/** Mark a result as restored from the backup (callers — the UI's loadIntoGame — tell the player). */
function finishBackup(slot: string, b: LoadResult): LoadResult {
  b.restoredFromBackup = true;
  b.meta = { ...makeMeta(b.state!, slot, b.state!.lastSavedRealMs), fromBackup: true };
  if (typeof console !== 'undefined') console.warn(`[aquarium-go] save slot ${slot} was damaged; restored its backup`);
  return b;
}

/** Load a slot (migrated + repaired). Returns null when the slot is empty or unrecoverable. */
export async function loadGame(slot = 'auto'): Promise<GameState | null> {
  const r = await loadGameDetailed(slot);
  return r.ok && r.state ? r.state : null;
}

/** Delete a slot everywhere it may live (so an older copy in another backend can't resurface). */
export async function deleteSave(slot: string): Promise<void> {
  await enqueue(slot, async () => {
    await storage.del(saveKey(slot));
    await storage.del(backupKey(slot));
    await storage.del(metaKey(slot));
    let sources: KVBackend[] = [];
    try {
      sources = (await storage.sources()).slice(1);
    } catch {
      sources = [];
    }
    for (const b of sources) {
      for (const k of [saveKey(slot), backupKey(slot), metaKey(slot)]) {
        try {
          await b.del(k);
        } catch {
          /* a secondary backend that can't delete keeps its (older) copy; listing still prefers the newest */
        }
      }
    }
  });
}

/** Saves in one backend (meta index first; falls back to reading record headers for older saves). */
async function listSavesIn(b: KVBackend): Promise<SaveMeta[]> {
  let all: string[];
  try {
    all = await b.keys();
  } catch {
    return [];
  }
  const slots = new Set<string>();
  for (const k of all) {
    if (k.startsWith(SAVE_PREFIX)) {
      const rest = k.slice(SAVE_PREFIX.length);
      slots.add(rest.endsWith(BACKUP_SUFFIX) ? rest.slice(0, -BACKUP_SUFFIX.length) : rest);
    }
  }
  const out: SaveMeta[] = [];
  for (const slot of slots) {
    const hasPrimary = all.includes(saveKey(slot));
    let meta: SaveMeta | null = null;
    if (hasPrimary) {
      try {
        const m = await b.get(metaKey(slot));
        if (typeof m === 'string') meta = JSON.parse(m) as SaveMeta;
      } catch {
        meta = null;
      }
    }
    if (!meta) {
      const key = hasPrimary ? saveKey(slot) : backupKey(slot);
      try {
        const raw = await b.get(key);
        const h = readHeader(raw);
        if (h) meta = { ...h.meta, slot };
        else {
          const d = decodeRecord(raw);
          meta = makeMeta(d.state, slot, d.state.lastSavedRealMs);
        }
        if (!hasPrimary) meta.fromBackup = true;
      } catch {
        continue;
      }
    }
    if (meta && Number.isFinite(meta.savedAt)) out.push({ ...meta, slot, backend: b.name });
  }
  return out;
}

/**
 * All saves, newest first, from every backend saves may live in (a slow first visit can leave them in
 * localStorage). When a slot exists in several backends, the newest copy wins.
 */
export async function listSaves(): Promise<SaveMeta[]> {
  await reconcileSaves();
  let sources: KVBackend[];
  try {
    sources = await storage.sources();
  } catch {
    return [];
  }
  const bySlot = new Map<string, SaveMeta>();
  for (let i = 0; i < sources.length; i++) {
    let metas: SaveMeta[];
    try {
      // The active backend's keys go through `storage` (demotion on failure); the others are guarded reads.
      metas = i === 0 ? await listSavesIn({ ...sources[0], keys: () => storage.keys(), get: (k) => storage.get(k) }) : await listSavesIn(sources[i]);
    } catch {
      metas = [];
    }
    for (const m of metas) {
      const cur = bySlot.get(m.slot);
      if (!cur || m.savedAt > cur.savedAt) bySlot.set(m.slot, m);
    }
  }
  return [...bySlot.values()].sort((a, b) => b.savedAt - a.savedAt);
}

// ───────────────────────────── moving saves between backends ─────────────────────────────

/**
 * Copy saves that live only (or newer) in a secondary backend into the active IndexedDB, newest wins, never
 * destroying anything: the older IndexedDB copy is rotated into the backup, and a secondary copy is removed only
 * once IndexedDB holds byte-identical data. Runs once per active backend (and again when IndexedDB is promoted late).
 */
let reconcileFor: KVBackend | null = null;
let reconciling: Promise<number> | null = null;

export async function reconcileSaves(): Promise<number> {
  let active: KVBackend;
  try {
    active = await storage.active();
  } catch {
    return 0;
  }
  if (active.name !== 'indexeddb' && !migrateTargets.has(active.name)) return 0;
  if (reconcileFor === active) return reconciling ?? 0;
  reconcileFor = active;
  reconciling = migrateInto(active).catch((e) => {
    if (typeof console !== 'undefined') console.warn('[aquarium-go] moving saves between storage backends failed', e);
    return 0;
  });
  return reconciling;
}

/** Backends saves are migrated INTO (IndexedDB in the browser; tests may add a fake name). */
const migrateTargets = new Set<BackendName>(['indexeddb']);

async function migrateInto(target: KVBackend): Promise<number> {
  const sources = (await storage.sources()).filter((b) => b.name !== target.name);
  let moved = 0;
  for (const src of sources) {
    let keys: string[];
    try {
      keys = await src.keys();
    } catch {
      continue;
    }
    const slots = new Set<string>();
    for (const k of keys) {
      if (!k.startsWith(SAVE_PREFIX)) continue;
      const rest = k.slice(SAVE_PREFIX.length);
      slots.add(rest.endsWith(BACKUP_SUFFIX) ? rest.slice(0, -BACKUP_SUFFIX.length) : rest);
    }
    for (const slot of slots) {
      if (!SLOT_RE.test(slot)) continue;
      if (await enqueue(slot, () => migrateSlot(slot, src, target))) moved++;
    }
  }
  return moved;
}

async function migrateSlot(slot: string, src: KVBackend, target: KVBackend): Promise<boolean> {
  const srcPrimary = describeCopy(src, 'primary', await src.get(saveKey(slot)));
  const srcBackup = describeCopy(src, 'backup', await src.get(backupKey(slot)));
  const tgtPrimary = describeCopy(target, 'primary', await storage.get(saveKey(slot)));
  const tgtBackup = describeCopy(target, 'backup', await storage.get(backupKey(slot)));
  const str = (raw: unknown) => (typeof raw === 'string' ? raw : JSON.stringify(raw));
  let moved = false;

  const srcBest = srcPrimary?.intact ? srcPrimary : srcBackup?.intact ? srcBackup : null;
  if (srcBest && (!tgtPrimary?.intact || srcBest.savedAt > tgtPrimary.savedAt)) {
    // Keep the best older copy as the backup: IndexedDB's own intact primary, else the source's backup.
    const olderForBackup = tgtPrimary?.intact ? tgtPrimary : srcBest === srcPrimary && srcBackup?.intact ? srcBackup : null;
    if (olderForBackup && (!tgtBackup?.intact || olderForBackup.savedAt >= tgtBackup.savedAt)) await storage.set(backupKey(slot), str(olderForBackup.raw));
    await storage.set(saveKey(slot), str(srcBest.raw));
    const h = readHeader(srcBest.raw);
    const meta = h ? { ...h.meta, slot } : srcBest.decoded ? makeMeta(srcBest.decoded.state, slot, srcBest.savedAt) : null;
    if (meta) await storage.set(metaKey(slot), JSON.stringify(meta));
    moved = true;
    if (typeof console !== 'undefined') console.info(`[aquarium-go] moved save "${slot}" from ${src.name} to ${target.name}`);
  }

  // Tidy the source only when the target now holds byte-identical copies of everything it had.
  const nowPrimary = await storage.get(saveKey(slot));
  const nowBackup = await storage.get(backupKey(slot));
  const same = (a: SlotCopy | null, b: unknown) => !a || !a.intact || (hasValue(b) && str(a.raw) === str(b));
  if (srcPrimary?.intact && same(srcPrimary, nowPrimary) && (same(srcBackup, nowBackup) || same(srcBackup, nowPrimary))) {
    for (const k of [saveKey(slot), backupKey(slot), metaKey(slot)]) {
      try {
        await src.del(k);
      } catch {
        /* keep it — listing still prefers the newest copy */
      }
    }
  }
  return moved;
}

/** Tests: treat another backend name as a migration target and forget which backend was reconciled. */
export function resetSaveReconciliation(extraTargets: BackendName[] = []): void {
  reconcileFor = null;
  reconciling = null;
  migrateTargets.clear();
  migrateTargets.add('indexeddb');
  for (const t of extraTargets) migrateTargets.add(t);
}

// When IndexedDB takes over late (slow cold start), move what was saved elsewhere across right away.
onBackendChange((next) => {
  if (next.name === 'indexeddb') {
    reconcileFor = null;
    void reconcileSaves().then((n) => {
      if (n > 0) notifySavesChanged();
    });
  }
});

type SavesListener = () => void;
const savesListeners = new Set<SavesListener>();
/** UI: re-list saves when this fires (a late storage switch moved saves). Returns an unsubscribe function. */
export function onSavesChanged(fn: SavesListener): () => void {
  savesListeners.add(fn);
  return () => savesListeners.delete(fn);
}
function notifySavesChanged() {
  for (const fn of [...savesListeners]) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export async function hasAnySave(): Promise<boolean> {
  return (await listSaves()).length > 0;
}

/** Most recently written slot, or null. */
export async function latestSaveSlot(): Promise<string | null> {
  const saves = await listSaves();
  return saves[0]?.slot ?? null;
}

/** Raw record access for tests/dev tools (e.g. to simulate corruption). */
export const rawSlot = {
  get: (slot: string) => storage.get(saveKey(slot)),
  set: (slot: string, text: string) => storage.set(saveKey(slot), text),
  getBackup: (slot: string) => storage.get(backupKey(slot)),
};
