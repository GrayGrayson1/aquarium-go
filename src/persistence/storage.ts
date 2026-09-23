/**
 * Key/value storage backends for saves. OWNER: lane "core".
 *
 * Preference order: IndexedDB (idb-keyval) → localStorage → in-memory.
 *
 * Detection is patient: a busy cold start (shader compiles, big bundles) can delay IndexedDB's open callback by
 * several seconds, and a slow database is NOT a blocked one. We wait up to PROBE_PATIENCE_MS for it; real errors are
 * retried with a fresh connection. If IndexedDB is still pending after that, we save to the next backend for now and
 * PROMOTE IndexedDB as soon as its probe completes (listeners — the slot layer — then move the saves across).
 *
 * If a backend later fails at runtime (quota, private mode, disk errors), we demote to the next one, retry the
 * operation, and warn the player once with a toast. Every backend we have written to stays readable through
 * `storage.sources()`, so a save is found wherever it was written.
 * Values are always strings (the save record format lives in ./serialize.ts). No network, ever.
 */
import { get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from 'idb-keyval';
import { useUI } from '@/state/ui';

export type BackendName = 'indexeddb' | 'localstorage' | 'memory';

export interface KVBackend {
  name: BackendName;
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<void>;
  del(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

/** Why the active backend is what it is (for dev tools / the title screen). */
export type StorageReason = 'ok' | 'slow' | 'blocked' | 'unavailable' | 'demoted';

export interface StorageStatus {
  /** null until detection has finished. */
  backend: BackendName | null;
  reason: StorageReason;
  /** IndexedDB is still opening in the background and will take over when it does. */
  pendingPromotion: boolean;
}

const PROBE_KEY = 'aquarium-go.probe';
/**
 * How long we wait for IndexedDB before saving elsewhere for now, counted in responsive page time (see
 * responsiveWait). A healthy database answers in milliseconds; a cold start under heavy load has been seen at 3–4 s,
 * so this is generous. It is not a verdict either: a later success promotes IndexedDB.
 */
export const PROBE_PATIENCE_MS = 10_000;
/** A probe that errors (not one that is merely slow) is retried this many times with a fresh connection. */
export const PROBE_RETRIES = 2;
const PROBE_RETRY_DELAY_MS = 400;
/** Reads from a secondary (non-active) backend give up after this long so a wedged one can't hang the title screen. */
const SECONDARY_READ_TIMEOUT_MS = 4000;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Wait `ms` of RESPONSIVE time. A cold start can block the main thread for seconds (shader compiles, big bundles);
 * IndexedDB's callbacks queue up behind that work, so wall-clock time would blame the database for the page's own
 * load. We wait in short ticks and a tick that arrives late counts as at most two ticks.
 */
async function responsiveWait(ms: number, done: () => boolean): Promise<void> {
  const tick = Math.max(5, Math.min(250, ms / 8));
  let waited = 0;
  let last = Date.now();
  while (waited < ms && !done()) {
    await delay(tick);
    const now = Date.now();
    waited += Math.min(Math.max(0, now - last), tick * 2);
    last = now;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function createIdbBackend(): KVBackend {
  return {
    name: 'indexeddb',
    get: (k) => idbGet(k),
    set: (k, v) => idbSet(k, v),
    del: (k) => idbDel(k),
    keys: async () => (await idbKeys()).filter((k): k is string => typeof k === 'string'),
  };
}

export function createLocalStorageBackend(ls: Storage): KVBackend {
  return {
    name: 'localstorage',
    get: async (k) => ls.getItem(k),
    set: async (k, v) => {
      ls.setItem(k, v);
    },
    del: async (k) => {
      ls.removeItem(k);
    },
    keys: async () => {
      const out: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k) out.push(k);
      }
      return out;
    },
  };
}

export function createMemoryBackend(seed?: Map<string, string>): KVBackend {
  const m = seed ?? new Map<string, string>();
  return {
    name: 'memory',
    get: async (k) => m.get(k),
    set: async (k, v) => {
      m.set(k, v);
    },
    del: async (k) => {
      m.delete(k);
    },
    keys: async () => [...m.keys()],
  };
}

/** One write/read/delete round trip. No timeouts here: slowness is handled by the caller, errors throw. */
async function probeOnce(b: KVBackend): Promise<boolean> {
  const token = `ok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await b.set(PROBE_KEY, token);
  const back = await b.get(PROBE_KEY);
  await b.del(PROBE_KEY);
  return back === token;
}

/** Probe with retries on real errors (idb-keyval reopens the database after a failed open). */
async function probeWithRetries(b: KVBackend, retries: number, retryDelayMs: number): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (await probeOnce(b)) return true;
    } catch {
      /* retry below */
    }
    if (attempt < retries) await delay(retryDelayMs * (attempt + 1));
  }
  return false;
}

function localStorageOrNull(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Candidate backends in preference order (only those that exist in this environment). */
function defaultCandidates(): KVBackend[] {
  const out: KVBackend[] = [];
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) out.push(createIdbBackend());
  } catch {
    /* indexedDB getter can throw in some sandboxed iframes */
  }
  const ls = localStorageOrNull();
  if (ls) out.push(createLocalStorageBackend(ls));
  out.push(createMemoryBackend());
  return out;
}

interface DetectionConfig {
  candidates: () => KVBackend[];
  patienceMs: number;
  retries: number;
  retryDelayMs: number;
  /** Show player-facing warnings (browser only by default; tests can force it on to observe `lastWarning`). */
  notify: boolean;
}

const defaultConfig = (): DetectionConfig => ({
  candidates: defaultCandidates,
  patienceMs: PROBE_PATIENCE_MS,
  retries: PROBE_RETRIES,
  retryDelayMs: PROBE_RETRY_DELAY_MS,
  notify: typeof window !== 'undefined',
});

let config: DetectionConfig = defaultConfig();
let active: KVBackend | null = null;
let chain: KVBackend[] = [];
/** Every backend saves may have been written to this session (read by `storage.sources()`). */
let known: KVBackend[] = [];
let resolving: Promise<KVBackend> | null = null;
let warned = false;
let status: StorageStatus = { backend: null, reason: 'ok', pendingPromotion: false };
/** Bumped by every reset so a stale background probe can't promote into a newer configuration. */
let generation = 0;
/** Last player-facing warning text (dev tools / tests). */
let lastWarning: string | null = null;
/** Values the memory backend inherits when we demote mid-session (so nothing already saved is lost). */
let memoryShared = new Map<string, string>();

type BackendListener = (next: KVBackend, prev: KVBackend | null) => void;
const listeners = new Set<BackendListener>();

/** Called when the active backend changes after detection (IndexedDB promoted late, or a demotion). */
export function onBackendChange(fn: BackendListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitChange(next: KVBackend, prev: KVBackend | null) {
  for (const fn of [...listeners]) {
    try {
      fn(next, prev);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[aquarium-go] storage listener failed', e);
    }
  }
}

function remember(b: KVBackend) {
  if (!known.includes(b)) known.push(b);
}

function warningText(to: BackendName, reason: StorageReason): string {
  if (to === 'memory') return 'Browser storage is unavailable — progress will only last until this tab closes. Use Export Save to keep a copy.';
  if (reason === 'slow') return 'The save database is slow to open — saving to local storage for now. Your saves move over automatically once it is ready.';
  return 'Your browser blocked the main save database — saving to local storage instead.';
}

function warn(to: BackendName, reason: StorageReason) {
  if (warned) return;
  warned = true;
  const msg = warningText(to, reason);
  lastWarning = msg;
  if (!config.notify) return;
  try {
    useUI.getState().toast(msg, 'warning');
  } catch {
    /* UI store not ready */
  }
  if (typeof console !== 'undefined') console.warn(`[aquarium-go] save storage fell back to ${to} (${reason})`);
}

const wrapMemory = (b: KVBackend) => (b.name === 'memory' ? createMemoryBackend(memoryShared) : b);

/** IndexedDB finished opening after we had already fallen back: make it the active backend again. */
function promote(b: KVBackend, gen: number) {
  if (gen !== generation || active === b) return;
  const prev = active;
  active = b;
  // The backend we were using stays as the first fallback (and stays readable through `known`).
  chain = [...(prev ? [prev] : []), ...chain.filter((c) => c !== prev && c !== b)];
  remember(b);
  status = { backend: b.name, reason: 'ok', pendingPromotion: false };
  if (typeof console !== 'undefined' && config.notify) console.info(`[aquarium-go] save database ready — switched to ${b.name}`);
  emitChange(b, prev);
}

async function detect(gen: number): Promise<KVBackend> {
  const list = config.candidates();
  let chosen: KVBackend | null = null;
  let fallbacks: KVBackend[] = [];
  let reason: StorageReason = 'ok';
  let slowIdb: KVBackend | null = null;
  let detecting = true;
  let lateReady = false;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.name === 'memory') {
      chosen = wrapMemory(b);
      fallbacks = [];
      break;
    }
    const eventually = probeWithRetries(b, config.retries, config.retryDelayMs);
    let settled = false;
    const answered = eventually.then((ok) => {
      settled = true;
      return ok ? ('ok' as const) : ('failed' as const);
    });
    const outcome = await Promise.race([answered, responsiveWait(config.patienceMs, () => settled).then(() => 'slow' as const)]);
    if (outcome === 'ok') {
      chosen = b;
      fallbacks = list.slice(i + 1).map(wrapMemory);
      break;
    }
    if (outcome === 'slow' && b.name === 'indexeddb' && !slowIdb) {
      // Slow is not blocked: keep listening and hand over as soon as the database answers.
      slowIdb = b;
      reason = 'slow';
      eventually.then(
        (ok) => {
          if (gen !== generation) return;
          if (!ok) {
            if (status.pendingPromotion) status = { ...status, pendingPromotion: false };
            return;
          }
          if (detecting) lateReady = true;
          else promote(b, gen);
        },
        () => undefined,
      );
      continue;
    }
    // Failed outright (or a slow non-IndexedDB backend, which we treat as failed): try the next one.
    if (reason !== 'slow') reason = b.name === 'indexeddb' ? 'blocked' : 'unavailable';
  }
  detecting = false;
  // Reconfigured mid-detection (tests): don't touch the new configuration.
  if (gen !== generation) return active ?? chosen ?? createMemoryBackend(memoryShared);
  if (!chosen) {
    chosen = createMemoryBackend(memoryShared);
    fallbacks = [];
  }
  // IndexedDB answered while we were probing the fallbacks: it wins after all.
  if (lateReady && slowIdb) {
    fallbacks = [chosen, ...fallbacks.filter((c) => c !== chosen)];
    chosen = slowIdb;
  }
  active = chosen;
  chain = fallbacks;
  for (const c of [active, ...chain]) remember(c);
  if (active.name === 'indexeddb') reason = 'ok';
  else if (reason === 'ok') reason = active.name === 'memory' ? 'unavailable' : 'blocked';
  status = { backend: active.name, reason, pendingPromotion: !!slowIdb && active !== slowIdb };
  // Anything but IndexedDB is a degraded mode worth telling the player about (whether IndexedDB threw on access,
  // failed the probe, is still opening, or doesn't exist). Toasts only show in a browser (config.notify).
  if (active.name !== 'indexeddb') warn(active.name, reason);
  return active;
}

async function resolveBackend(): Promise<KVBackend> {
  if (active) return active;
  if (resolving) return resolving;
  const gen = generation;
  resolving = detect(gen);
  try {
    return await resolving;
  } finally {
    resolving = null;
  }
}

async function demote(): Promise<KVBackend | null> {
  const next = chain.shift();
  if (!next) return null;
  const prev = active;
  active = next;
  remember(next);
  status = { backend: next.name, reason: 'demoted', pendingPromotion: false };
  warn(next.name, 'demoted');
  emitChange(next, prev);
  return next;
}

/** Run a storage op, demoting to the next backend (and retrying) when the current one throws. */
async function run<T>(op: (b: KVBackend) => Promise<T>): Promise<T> {
  let b = await resolveBackend();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await op(b);
    } catch (e) {
      // Another op may already have demoted (or a late IndexedDB may have been promoted) — use that first.
      if (active && active !== b) {
        b = active;
        continue;
      }
      const next = await demote();
      if (!next) throw e;
      b = next;
    }
  }
}

/** A read-only view of a non-active backend that can't hang (secondary reads time out) or throw. */
function guarded(b: KVBackend): KVBackend {
  const safe = async <T>(p: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await withTimeout(p(), SECONDARY_READ_TIMEOUT_MS, `${b.name} read`);
    } catch {
      return fallback;
    }
  };
  return {
    name: b.name,
    get: (k) => safe(() => b.get(k), undefined),
    set: (k, v) => withTimeout(b.set(k, v), SECONDARY_READ_TIMEOUT_MS, `${b.name} write`),
    del: (k) => withTimeout(b.del(k), SECONDARY_READ_TIMEOUT_MS, `${b.name} delete`),
    keys: () => safe(() => b.keys(), [] as string[]),
  };
}

export const storage = {
  get: (k: string) => run((b) => b.get(k)),
  set: (k: string, v: string) => run((b) => b.set(k, v)),
  del: (k: string) => run((b) => b.del(k)),
  keys: () => run((b) => b.keys()),
  /** Name of the backend currently in use (resolves the backend if needed). */
  backendName: async (): Promise<BackendName> => (await resolveBackend()).name,
  /** The active backend (resolving it if needed). */
  active: (): Promise<KVBackend> => resolveBackend(),
  /**
   * Every backend saves may live in, active first. Non-active entries are guarded: their reads time out instead of
   * hanging and never throw. The slot layer lists/loads across all of them (newest save wins) and migrates.
   */
  sources: async (): Promise<KVBackend[]> => {
    const a = await resolveBackend();
    return [a, ...known.filter((b) => b !== a).map(guarded)];
  },
};

/** Current detection result (sync; `backend` is null until detection finishes). */
export function storageStatus(): StorageStatus & { warning: string | null } {
  return { ...status, warning: lastWarning };
}

/**
 * Tests / dev: force a specific backend (pass null to re-detect). `extraSources` are additional backends saves may
 * live in (e.g. a localStorage that an earlier, slower session wrote to).
 */
export function setStorageBackend(b: KVBackend | null, fallbacks: KVBackend[] = [], extraSources: KVBackend[] = []): void {
  generation++;
  active = b;
  chain = fallbacks;
  known = b ? [b, ...fallbacks, ...extraSources] : [...extraSources];
  resolving = null;
  warned = false;
  lastWarning = null;
  status = { backend: b?.name ?? null, reason: 'ok', pendingPromotion: false };
}

/**
 * Tests / dev: re-run backend detection with custom candidates and timings (pass null to restore the defaults).
 * The next storage call probes again.
 */
export function configureStorageDetection(opts: Partial<DetectionConfig> | null): void {
  config = { ...defaultConfig(), ...(opts ?? {}) };
  memoryShared = new Map<string, string>();
  setStorageBackend(null);
}
