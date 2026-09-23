/**
 * Save serialization. OWNER: lane "core".
 *
 * Stored record format (a single string, works for every storage backend):
 *   <header JSON>\n<state JSON>
 * The header carries format id, schema version, checksum and a SaveMeta for fast slot listing.
 * The checksum (cyrb53 over the state JSON) detects truncated / corrupted writes.
 *
 * Before saving we drop transient fields, strip huge embedded images (data: URLs over MAX_INLINE_DATA_URL chars,
 * e.g. listing photos) and replace any non-finite number with 0 so a single NaN can never poison a save.
 */
import type { GameState } from '@/types';
import { SCHEMA_VERSION } from './schema';
import { SaveError, type SaveMeta } from './types';
import { migrateSave } from './migrations';

export const SAVE_FORMAT = 'aquarium-go-save';
/** Strip embedded data URLs bigger than this (characters ≈ bytes). */
export const MAX_INLINE_DATA_URL = 200_000;
/** Refuse to import files bigger than this. */
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;

/** Top-level keys that never go into a save. */
const TRANSIENT_KEYS = new Set(['offlineGrace']);

export interface SaveHeader {
  format: typeof SAVE_FORMAT;
  schemaVersion: number;
  savedAt: number;
  checksum: string;
  length: number;
  meta: SaveMeta;
}

export interface SerializeStats {
  strippedDataUrls: number;
  fixedNumbers: number;
}

/** 53-bit string hash (cyrb53), returned as hex. Fast and well distributed; not cryptographic. */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/** JSON-serialize a game state for storage (strip transient + huge data, sanitize numbers). */
export function serializeState(state: GameState): { json: string; stats: SerializeStats } {
  const stats: SerializeStats = { strippedDataUrls: 0, fixedNumbers: 0 };
  const root = state as unknown;
  const json = JSON.stringify(state, function (this: unknown, key: string, value: unknown) {
    if (this === root && TRANSIENT_KEYS.has(key)) return undefined;
    if (typeof value === 'number' && !Number.isFinite(value)) {
      stats.fixedNumbers++;
      return 0;
    }
    if (typeof value === 'string' && value.length > MAX_INLINE_DATA_URL && value.startsWith('data:')) {
      stats.strippedDataUrls++;
      return undefined;
    }
    return value;
  });
  return { json, stats };
}

export function makeMeta(state: GameState, slot: string, savedAt = Date.now(), sizeBytes?: number): SaveMeta {
  const creatures = Object.values(state.creatures ?? {});
  const starter = creatures.find((c) => c.isStarter);
  return {
    slot,
    shopName: state.shopName ?? 'My Aquarium',
    starterId: state.starterId,
    day: Math.floor((state.clock?.hour ?? 0) / 24) + 1,
    money: Math.round((state.finance?.money ?? 0) * 100) / 100,
    savedAt,
    tanks: state.tankOrder?.length ?? 0,
    creatures: creatures.filter((c) => c.status === 'alive' || c.status === 'listed').length,
    starterName: starter?.name,
    schemaVersion: state.schemaVersion,
    sizeBytes,
  };
}

/** Encode a state into the stored record string. */
export function encodeRecord(state: GameState, slot: string, savedAt = Date.now()): { text: string; header: SaveHeader; stats: SerializeStats } {
  const stamped: GameState = { ...state, lastSavedRealMs: savedAt, schemaVersion: state.schemaVersion ?? SCHEMA_VERSION };
  const { json, stats } = serializeState(stamped);
  const header: SaveHeader = {
    format: SAVE_FORMAT,
    schemaVersion: stamped.schemaVersion,
    savedAt,
    checksum: cyrb53(json),
    length: json.length,
    meta: makeMeta(stamped, slot, savedAt, json.length),
  };
  return { text: `${JSON.stringify(header)}\n${json}`, header, stats };
}

export interface DecodedSave {
  state: GameState;
  header?: SaveHeader;
  fromVersion: number;
  repairs: string[];
}

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new SaveError('not_json', `${what} is damaged and can't be read.`, `JSON parse failed: ${(e as Error).message}`);
  }
}

/** Read only the header of a stored record (cheap; for slot listings). */
export function readHeader(raw: unknown): SaveHeader | null {
  if (typeof raw !== 'string') return null;
  const nl = raw.indexOf('\n');
  if (nl <= 0 || raw[0] !== '{') return null;
  try {
    const h = JSON.parse(raw.slice(0, nl)) as SaveHeader;
    return h && h.format === SAVE_FORMAT ? h : null;
  } catch {
    return null;
  }
}

/**
 * Decode anything we might find in storage or an imported file into a migrated, repaired GameState:
 *  - the record format written by encodeRecord (header line + state JSON, checksum verified)
 *  - an export file `{ format, state }`
 *  - a bare GameState object/JSON (orchestrator's first save format, legacy v0 saves)
 * Throws SaveError with a friendly message on failure.
 */
export function decodeRecord(raw: unknown, what = 'This save'): DecodedSave {
  if (raw === undefined || raw === null || raw === '') throw new SaveError('empty', `${what} is empty.`);
  let header: SaveHeader | undefined;
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    const h = readHeader(raw);
    if (h) {
      const body = raw.slice(raw.indexOf('\n') + 1);
      if (body.length !== h.length || cyrb53(body) !== h.checksum) {
        throw new SaveError('checksum', `${what} was only partly written (it may have been interrupted) and can't be trusted.`, `checksum mismatch (len ${body.length}/${h.length})`);
      }
      header = h;
      obj = parseJson(body, what);
    } else {
      obj = parseJson(raw, what);
    }
  }
  // Export-file wrapper.
  if (obj && typeof obj === 'object' && (obj as { format?: unknown }).format === SAVE_FORMAT && 'state' in (obj as object)) {
    obj = (obj as { state: unknown }).state;
  }
  const migrated = migrateSave(obj, what);
  return { state: migrated.state, header, fromVersion: migrated.fromVersion, repairs: migrated.repairs };
}
