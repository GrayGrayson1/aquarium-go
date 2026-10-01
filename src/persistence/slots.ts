/**
 * Save slots: write with backup, load with corruption fallback, list/delete. OWNER: lane "core".
 *
 * Keys (any backend):
 *   aquarium-go.save.<slot>          current record (see ./serialize.ts)
 *   aquarium-go.save.<slot>.backup   previous good record (written just before an overwrite)
 *   aquarium-go.meta.<slot>          SaveMeta JSON for fast slot listing
 *   aquarium-go.stamp.<slot>         (localStorage only) who wrote the slot last: { savedAt, saveId, tab }
 *
 * lane:fix-core additions:
 *  - Stale tabs (P5-04/S06-04): a write is refused (`code: 'stale'`) when the same aquarium was saved during this
 *    tab's session by someone else — i.e. the stored record is newer than anything this tab loaded or wrote — so a
 *    forgotten second tab can never roll the player's progress back on hide/close.
 *  - Sync mirror (P5-01): `saveGameSync` writes the record straight into localStorage from pagehide/hidden handlers,
 *    where an IndexedDB round trip never lands. Boot reads every backend (newest wins) and moves it across.
 *  - Displaced aquariums (P5-03/S06-03/S06-07): when a slot's `.backup` holds a DIFFERENT aquarium than its primary
 *    (a load or overwrite replaced it), same-game writes keep that backup instead of rotating over it, and listings
 *    show it as a loadable "Previous …" entry (`<slot>.backup`) so nothing is lost by one click.
 */
import type { GameState } from '@/types';
import { storage, syncStore, onBackendChange, type KVBackend, type BackendName } from './storage';
import { encodeRecord, decodeRecord, readHeader, makeMeta, cyrb53, type DecodedSave } from './serialize';
import { SaveError, type SaveMeta, type SaveResult, type LoadResult } from './types';

export const SAVE_PREFIX = 'aquarium-go.save.';
export const META_PREFIX = 'aquarium-go.meta.';
export const BACKUP_SUFFIX = '.backup';
const STAMP_PREFIX = 'aquarium-go.stamp.';
/** Standard slots shown by the UI. Any id matching SLOT_RE works. */
export const SAVE_SLOTS = ['auto', 'slot1', 'slot2', 'slot3'] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];
const SLOT_RE = /^[A-Za-z0-9_-]{1,32}$/;

const saveKey = (slot: string) => SAVE_PREFIX + slot;
const backupKey = (slot: string) => SAVE_PREFIX + slot + BACKUP_SUFFIX;
const metaKey = (slot: string) => META_PREFIX + slot;
const stampKey = (slot: string) => STAMP_PREFIX + slot;

function checkSlot(slot: string): void {
  if (!SLOT_RE.test(slot)) throw new SaveError('invalid', `“${slot}” isn't a valid save slot name.`);
}

/** A loadable reference is a slot (`slot1`) or a slot's previous copy (`slot1.backup`). */
export function parseSlotRef(ref: string): { slot: string; backup: boolean } {
  return ref.endsWith(BACKUP_SUFFIX) ? { slot: ref.slice(0, -BACKUP_SUFFIX.length), backup: true } : { slot: ref, backup: false };
}
export const isBackupRef = (ref: string) => ref.endsWith(BACKUP_SUFFIX);

// ───────────────────────────── who saved what, when (stale-tab protection) ─────────────────────────────

const TAB_ID = Math.random().toString(36).slice(2, 10);
/** When this page loaded: a record written after this by anyone but us came from another live tab. */
const SESSION_START = Date.now();
/** Newest `savedAt` this tab has loaded or written, per aquarium (saveId). */
const knownSavedAt = new Map<string, number>();
/** Aquariums whose write this tab had to refuse (another tab owns them now). */
const staleGames = new Set<string>();
/** `saveId` in each slot's `.backup` as far as this session knows (undefined = not read yet, null = none/legacy). */
const backupIds = new Map<string, string | null>();
/** Slots this tab mirrored into localStorage (cleaned up by the next regular write). */
const mirrored = new Set<string>();

interface WriteStamp {
  savedAt: number;
  saveId?: string;
  tab: string;
}

function readStamp(slot: string): WriteStamp | null {
  const raw = syncStore.get(stampKey(slot));
  if (!raw) return null;
  try {
    const st = JSON.parse(raw) as WriteStamp;
    return st && Number.isFinite(st.savedAt) ? st : null;
  } catch {
    return null;
  }
}

function noteWritten(slot: string, savedAt: number, saveId: string | undefined): void {
  if (saveId) knownSavedAt.set(saveId, Math.max(knownSavedAt.get(saveId) ?? 0, savedAt));
  syncStore.set(stampKey(slot), JSON.stringify({ savedAt, saveId, tab: TAB_ID } satisfies WriteStamp));
}

function noteLoaded(saveId: string | undefined, savedAt: number): void {
  if (!saveId) return;
  knownSavedAt.set(saveId, Math.max(knownSavedAt.get(saveId) ?? 0, savedAt));
  staleGames.delete(saveId);
}

/**
 * Is a stored copy (`savedAt`, `saveId`) proof that another tab is playing `state`'s aquarium? Yes when it is the
 * same aquarium, newer than anything this tab loaded or wrote, and written during this tab's session (an older
 * session's copy — the same game autosaved yesterday, loaded today from a manual slot — is not another tab).
 */
function isStaleAgainst(state: GameState, savedAt: number | undefined, saveId: string | undefined, tab?: string): boolean {
  if (!saveId || saveId !== state.saveId || !Number.isFinite(savedAt)) return false;
  if (tab === TAB_ID) return false;
  const known = knownSavedAt.get(saveId);
  if (known === undefined) return false;
  return savedAt! > known && savedAt! > SESSION_START;
}

/** True once a write for this aquarium was refused because another tab saved it more recently. */
export function isStaleGame(saveId: string): boolean {
  return staleGames.has(saveId);
}

const STALE_MESSAGE = 'This aquarium was saved more recently in another tab — this tab isn’t saving. Reload to pick up the latest.';

/** Tests: forget what this tab knows about other tabs' writes. */
export function resetSaveSession(): void {
  knownSavedAt.clear();
  staleGames.clear();
  backupIds.clear();
  mirrored.clear();
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

/** `saveId` of the record in `<slot>.backup` (cached per session; null when there is none or it predates saveIds). */
async function backupSaveId(slot: string): Promise<string | null> {
  const cached = backupIds.get(slot);
  if (cached !== undefined) return cached;
  let id: string | null = null;
  try {
    const raw = await storage.get(backupKey(slot));
    const h = readHeader(raw);
    id = h?.meta?.saveId ?? null;
  } catch {
    id = null;
  }
  backupIds.set(slot, id);
  return id;
}

/**
 * Save a game state into a slot. Showcase worlds are never saved.
 * The previous record (if it is intact) is copied to `<slot>.backup` first — unless that backup holds a different
 * aquarium this one displaced (see the header), which stays until the player loads or deletes it.
 */
export async function saveGame(state: GameState, slot = 'auto'): Promise<SaveResult> {
  if (!state) return { ok: false, slot, message: 'Nothing to save.' };
  if (state.isShowcase) return { ok: false, slot, message: 'Showcase worlds are not saved.' };
  checkSlot(slot);
  return enqueue(slot, async () => {
    const stamp = readStamp(slot);
    if (stamp && isStaleAgainst(state, stamp.savedAt, stamp.saveId, stamp.tab)) {
      staleGames.add(state.saveId);
      return { ok: false, slot, code: 'stale', message: STALE_MESSAGE };
    }
    const { text, header, stats } = encodeRecord(state, slot);
    try {
      const prev = await storage.get(saveKey(slot));
      const ph = readHeader(prev);
      if (ph && isStaleAgainst(state, ph.savedAt, ph.meta?.saveId)) {
        staleGames.add(state.saveId);
        return { ok: false, slot, code: 'stale', message: STALE_MESSAGE };
      }
      // Only rotate an intact record into the backup; a damaged one must never overwrite a good backup.
      if (prev !== undefined && prev !== null && isIntact(prev)) {
        const prevId = ph?.meta?.saveId ?? null;
        let keepBackup = false;
        if (prevId && prevId === state.saveId) {
          const bid = await backupSaveId(slot);
          keepBackup = !!bid && bid !== state.saveId;
        }
        if (!keepBackup) {
          await storage.set(backupKey(slot), typeof prev === 'string' ? prev : JSON.stringify(prev));
          backupIds.set(slot, prevId);
        }
      }
      await storage.set(saveKey(slot), text);
      await storage.set(metaKey(slot), JSON.stringify(header.meta));
      noteWritten(slot, header.savedAt, state.saveId);
      const backend = await storage.backendName();
      if (mirrored.has(slot) && !syncStore.isActive()) clearMirror(slot, header.savedAt);
      if (stats.fixedNumbers > 0 && typeof console !== 'undefined') console.warn(`[aquarium-go] save: replaced ${stats.fixedNumbers} invalid number(s) with 0`);
      const degraded = backend === 'memory';
      return {
        ok: true,
        slot,
        message: degraded ? 'Saved for this session only — browser storage is unavailable. Export a copy to keep it.' : 'Game saved',
        bytes: text.length,
        backend,
        strippedPhotos: stats.strippedDataUrls,
        degraded: degraded || undefined,
      };
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[aquarium-go] save failed', e);
      return { ok: false, slot, message: "Couldn't save — browser storage refused the write." };
    }
  });
}

/** Remove this tab's localStorage mirror of `slot` once a regular write at least as new has landed elsewhere. */
function clearMirror(slot: string, writtenAt: number): void {
  const h = readHeader(syncStore.get(saveKey(slot)));
  if (h && h.savedAt <= writtenAt) {
    syncStore.del(saveKey(slot));
    syncStore.del(metaKey(slot));
  }
  if (!h || h.savedAt <= writtenAt) mirrored.delete(slot);
}

/**
 * Write a slot synchronously into localStorage (no backup rotation). For pagehide / hidden handlers, where the
 * document may be gone before an IndexedDB transaction commits. Every backend is read on the next boot and the
 * newest copy wins, so this lands even when the regular write does not. Returns whether it was written.
 */
export function saveGameSync(state: GameState, slot = 'auto'): boolean {
  if (!state || state.isShowcase) return false;
  if (!SLOT_RE.test(slot)) return false;
  const stamp = readStamp(slot);
  if (stamp && isStaleAgainst(state, stamp.savedAt, stamp.saveId, stamp.tab)) {
    staleGames.add(state.saveId);
    return false;
  }
  const { text, header } = encodeRecord(state, slot);
  if (!syncStore.set(saveKey(slot), text)) return false;
  syncStore.set(metaKey(slot), JSON.stringify(header.meta));
  noteWritten(slot, header.savedAt, state.saveId);
  if (!syncStore.isActive()) mirrored.add(slot);
  return true;
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
export async function loadGameDetailed(ref = 'auto'): Promise<LoadResult> {
  const { slot, backup } = parseSlotRef(ref);
  try {
    checkSlot(slot);
  } catch (e) {
    return { ok: false, code: 'invalid', error: (e as SaveError).friendly };
  }
  await reconcileSaves();
  const all = await slotCopies(slot);
  const readError = all.readError;
  // A `<slot>.backup` reference loads the previous copy on purpose (a displaced aquarium), never the primary.
  const copies = backup ? all.copies.filter((c) => c.kind === 'backup') : all.copies;
  let firstError: LoadResult | null = null;
  for (const c of copies) {
    const r = decodeCopy(c);
    if (r.ok && r.state) {
      noteLoaded(r.state.saveId, c.savedAt);
      if (c.kind === 'backup' && !backup) return finishBackup(slot, r);
      r.meta = { ...makeMeta(r.state, ref, r.state.lastSavedRealMs), backend: c.backend.name, previousOf: backup ? slot : undefined };
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

/**
 * Delete a slot everywhere it may live (so an older copy in another backend can't resurface). A `<slot>.backup`
 * reference deletes only that previous copy.
 */
export async function deleteSave(ref: string): Promise<void> {
  const { slot, backup } = parseSlotRef(ref);
  const keys = backup ? [backupKey(slot)] : [saveKey(slot), backupKey(slot), metaKey(slot), stampKey(slot)];
  await enqueue(slot, async () => {
    for (const k of keys) await storage.del(k);
    backupIds.set(slot, null);
    if (!backup) {
      syncStore.del(saveKey(slot));
      syncStore.del(metaKey(slot));
      syncStore.del(stampKey(slot));
      mirrored.delete(slot);
    } else syncStore.del(backupKey(slot));
    let sources: KVBackend[] = [];
    try {
      sources = (await storage.sources()).slice(1);
    } catch {
      sources = [];
    }
    for (const b of sources) {
      for (const k of keys) {
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
    // A backup that holds a DIFFERENT aquarium than the primary is a displaced game: list it as "Previous …".
    if (hasPrimary && meta?.saveId && all.includes(backupKey(slot))) {
      try {
        const h = readHeader(await b.get(backupKey(slot)));
        if (h?.meta?.saveId && h.meta.saveId !== meta.saveId && Number.isFinite(h.savedAt)) {
          out.push({ ...h.meta, slot: slot + BACKUP_SUFFIX, previousOf: slot, savedAt: h.savedAt, backend: b.name });
        }
      } catch {
        /* unreadable backup: nothing to list */
      }
    }
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
    if (olderForBackup && (!tgtBackup?.intact || olderForBackup.savedAt >= tgtBackup.savedAt)) {
      await storage.set(backupKey(slot), str(olderForBackup.raw));
      backupIds.delete(slot);
    }
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
  return saves.find((m) => !m.previousOf)?.slot ?? null;
}

/** Raw record access for tests/dev tools (e.g. to simulate corruption). */
export const rawSlot = {
  get: (slot: string) => storage.get(saveKey(slot)),
  set: (slot: string, text: string) => storage.set(saveKey(slot), text),
  getBackup: (slot: string) => storage.get(backupKey(slot)),
};
