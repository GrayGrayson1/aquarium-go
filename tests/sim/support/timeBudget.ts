/**
 * Test support (not a test file): wall-clock limits in the unit tests. The limits were set on the owner's Mac; the
 * shared machines that run the same tests before publishing (GitHub Actions, `CI`; Render's build, `RENDER`) ran
 * them about 2× slower on 2026-10-15 (42 ms against 20, 4.2 s against 2 s), so there each limit is multiplied by
 * CI_SLOWDOWN: twice the measured slowdown, room for a busier build machine (a failed Render build blocks a release).
 * A limit still catches what it is for: code that becomes many times slower. On the owner's Mac nothing changes.
 */
export const CI_SLOWDOWN = 4;

const onSharedMachine = (): boolean => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return !!env.CI || !!env.RENDER;
};

/** A time limit (ms) for this machine. */
export const budget = (ms: number): number => ms * (onSharedMachine() ? CI_SLOWDOWN : 1);
