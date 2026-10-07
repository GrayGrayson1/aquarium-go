// @vitest-environment node
/**
 * lane:ui-shell (PLAT-003 A4; 0.5 design §14) — the boot seam between the platform and persistence: a platform that
 * lists its own storage backends gets them into persistence's detection (configureStorageDetection), and the web
 * platform, which lists none, leaves persistence's own detection alone.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { applyPlatformStorage, type ConfigureStorage } from '@/ui/platformBoot';
import { createMemoryPlatform, createWebPlatform, setPlatform, type Platform } from '@/platform';
import { configureStorageDetection, createMemoryBackend, storage, storageStatus, type KVBackend } from '@/persistence';

/** A backend a native wrapper might supply (named like a real one: persistence swaps out any it calls 'memory'). */
const nativeBackend = (map = new Map<string, string>()): KVBackend => ({ ...createMemoryBackend(map), name: 'localstorage' });

afterEach(() => {
  setPlatform(null);
  configureStorageDetection(null);
});

describe('PLAT-003: the platform storage seam at boot', () => {
  it('a platform with storageCandidates gets configureStorageDetection called with them', () => {
    const backend = nativeBackend();
    const listed = vi.fn(() => [backend]);
    const p: Platform = { ...createMemoryPlatform(), storageCandidates: listed };
    const configure = vi.fn<ConfigureStorage>();
    expect(applyPlatformStorage(p, configure)).toBe(true);
    expect(configure).toHaveBeenCalledTimes(1);
    // Persistence asks for the list when it detects, so each detection gets the platform's current backends.
    expect(listed).not.toHaveBeenCalled();
    expect(configure.mock.calls[0][0].candidates()).toEqual([backend]);
    expect(listed).toHaveBeenCalledTimes(1);
  });

  it('the web platform (no storageCandidates) does not call it, nor does a memory platform', () => {
    const configure = vi.fn<ConfigureStorage>();
    expect(applyPlatformStorage(createWebPlatform(), configure)).toBe(false);
    expect(applyPlatformStorage(createMemoryPlatform(), configure)).toBe(false);
    expect(configure).not.toHaveBeenCalled();
  });

  it('defaults to the active platform()', () => {
    const configure = vi.fn<ConfigureStorage>();
    expect(applyPlatformStorage(undefined, configure)).toBe(false); // the lazily made web platform
    setPlatform({ ...createMemoryPlatform(), storageCandidates: () => [nativeBackend()] });
    expect(applyPlatformStorage(undefined, configure)).toBe(true);
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it('with the real configureStorageDetection, the next save read comes from the platform backend', async () => {
    const map = new Map([['aquarium-go.platform-boot-test', 'kept by the native wrapper']]);
    const p: Platform = { ...createMemoryPlatform(), storageCandidates: () => [nativeBackend(map)] };
    expect(applyPlatformStorage(p)).toBe(true);
    expect(await storage.get('aquarium-go.platform-boot-test')).toBe('kept by the native wrapper');
    expect(storageStatus().backend).toBe('localstorage');
    await storage.set('aquarium-go.platform-boot-test.2', 'written');
    expect(map.get('aquarium-go.platform-boot-test.2')).toBe('written');
  });
});
