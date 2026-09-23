/** Persistence contracts. OWNER: lane "core". */
import type { GameState } from '@/types';
import type { BackendName } from './storage';

export interface SaveMeta {
  slot: string;
  shopName: string;
  starterId: string;
  day: number;
  money: number;
  savedAt: number;
  tanks: number;
  creatures: number;
  /** Name of the starter creature (for the slot card). */
  starterName?: string;
  schemaVersion?: number;
  /** Approximate stored size in bytes. */
  sizeBytes?: number;
  /** Save came from the `.backup` copy because the primary was damaged. */
  fromBackup?: boolean;
  /** Storage backend the listed copy lives in (a slow first visit can leave saves in localStorage). */
  backend?: BackendName;
}

export type SaveErrorCode = 'empty' | 'not_json' | 'not_a_save' | 'checksum' | 'too_new' | 'invalid' | 'too_large' | 'storage';

/** An error with a player-friendly message (`friendly`) and a technical one (`message`). */
export class SaveError extends Error {
  code: SaveErrorCode;
  friendly: string;
  constructor(code: SaveErrorCode, friendly: string, detail?: string) {
    super(detail ?? friendly);
    this.name = 'SaveError';
    this.code = code;
    this.friendly = friendly;
  }
}

export interface SaveResult {
  ok: boolean;
  slot: string;
  /** Friendly message for a toast. */
  message: string;
  bytes?: number;
  backend?: string;
  /** Large photos stripped from the save to keep it small. */
  strippedPhotos?: number;
}

export interface LoadResult {
  ok: boolean;
  state?: GameState;
  meta?: SaveMeta;
  error?: string;
  code?: SaveErrorCode;
  /** The primary save was damaged and the `.backup` copy was used. */
  restoredFromBackup?: boolean;
  /** Schema version the save was written with (before migration). */
  migratedFrom?: number;
  /** Repairs applied to fill missing/invalid data. */
  repairs?: string[];
}
