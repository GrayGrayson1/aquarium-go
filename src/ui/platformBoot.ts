/**
 * Boot wiring between the platform seam and persistence (0.5 design §14, PLAT-003). OWNER: lane "ui-shell".
 *
 * Persistence never imports the platform. A platform that keeps saves somewhere of its own (a native wrapper) lists
 * those backends in `storageCandidates`, and the UI shell hands them to persistence's detection seam once at boot.
 * Run it before anything reads or writes a save: configureStorageDetection resets the active backend. The web
 * platform has no list, so persistence keeps its own detection (IndexedDB, then localStorage, then memory).
 */
import { configureStorageDetection, type KVBackend } from '@/persistence';
import { platform, type Platform } from '@/platform';

/** The part of configureStorageDetection this needs (tests pass a spy). */
export type ConfigureStorage = (opts: { candidates: () => KVBackend[] }) => void;

/**
 * Give persistence the platform's own storage backends, when it has any; returns whether it did. Persistence calls
 * `candidates` each time it detects, so every detection gets fresh backends, as with its default list.
 */
export function applyPlatformStorage(p: Platform = platform(), configure: ConfigureStorage = configureStorageDetection): boolean {
  const list = p.storageCandidates;
  if (!list) return false;
  configure({ candidates: () => list.call(p) });
  return true;
}
