/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6, §8.1; REL-029) — the online-save loop against a fake service and fake
 * timers: a first send when there's no online copy, at most one send per 2 minutes, a send when the tab is hidden
 * (after the hidden save lands), never a showcase, a conflict → a check → the box, a newer build's copy → blocked and
 * nothing sent, both of the box's choices (loading keeps this device's copy as "Previous autosave"), sign-out and
 * Delete stopping it, and the link kept outside the save (no social action changes the save or its stateHash).
 * Chunk 9 (B2, REL-035): every call names the account this tab shows; when another tab switched the session to someone
 * else, the server refuses ('account'), nothing is written, and this tab asks who is signed in now.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { SCHEMA_VERSION, createMemoryBackend, exportSaveText, keptSaveId, listSaves, resetSaveSession, saveGame, setStorageBackend, setSyncStore, stateHash, useResume } from '@/persistence';
import { provideSocialService, type CloudSaveMeta, type CloudUpload, type SocialService, type SocialUser, type StandingReport } from '@/social';
import { useSocial } from '@/ui/panels/social/socialStore';
import { CLOUD_LINK_KEY, SEND_GAP_MS, checkOnline, cloudBlocked, forgetCloudLink, keepDeviceCopy, loadOnlineCopy, readLink, resetCloudSync, startCloudSync, useCloud } from '@/ui/online/cloudSync';
import type { GameState } from '@/types';

// another tab played an aquarium further (persistence's stale-tab rule): the ids the test marks
// and a local save that fails (the review's note: nothing loads over a device copy that couldn't be kept)
const mocks = vi.hoisted(() => ({ stale: new Set<string>(), failSave: false, imports: 0, leaveSaveDue: true }));
// and whether autosave would write a save on leaving (it skips one when a save landed moments before)
vi.mock('@/game/useAutosave', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/game/useAutosave')>()), leaveSaveDue: () => mocks.leaveSaveDue }));
vi.mock('@/persistence', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/persistence')>();
  return {
    ...orig,
    isStaleGame: (id: string) => mocks.stale.has(id),
    saveCurrentGame: (...a: Parameters<typeof orig.saveCurrentGame>) => (mocks.failSave ? Promise.resolve({ ok: false, slot: 'auto', message: 'Couldn’t save — browser storage refused the write.' }) : orig.saveCurrentGame(...a)),
    importSaveText: (...a: Parameters<typeof orig.importSaveText>) => {
      if (a[1]) mocks.imports++;
      return orig.importSaveText(...a);
    },
  };
});

// the codec's streams don't mix with fake timers; online-compress.test.ts tests it on its own
vi.mock('@/social/codec', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/social/codec')>()),
  encodeSaveBody: async (text: string) => ({ encoding: 'json', body: text }),
  decodeSaveBody: async (b: { body: string }) => b.body,
}));

const USER: SocialUser = { id: 'user-1', email: 'sam@example.com', displayName: 'Sam', friendCode: 'SAM-7Q2' };
const USER_B: SocialUser = { id: 'user-2', email: 'kim@example.com', displayName: 'Kim', friendCode: 'KIM-7Q2' };

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; dump(): Record<string, string> };
function memory(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), dump: () => Object.fromEntries(m) };
}

/**
 * A server holding an online save per account (USER's is `online`), recording every upload. The session is the one
 * account the server's calls run as (chunk 9: another tab can switch it); a call naming another account is refused.
 */
function fakeServer() {
  const saves = new Map<string, { meta: CloudSaveMeta; body: string }>();
  let session: string | null = USER.id;
  const uploads: { save: CloudUpload; expected: number; account: string }[] = [];
  const reports: StandingReport[] = [];
  let next: 'ok' | 'too_new' | 'conflict' | null = null;
  let sessionCb: ((account: string | null) => void) | null = null;
  /** As the server's twins: only for the session's account. */
  const as = (account: string) => {
    if (account !== session) throw { code: 'account' };
    return saves.get(account) ?? null;
  };
  const service = {
    currentUser: vi.fn(async () => [USER, USER_B].find((u) => u.id === session) ?? null),
    cloudMeta: vi.fn(async (account: string) => {
      const online = as(account);
      return online ? { ...online.meta } : null;
    }),
    cloudDownload: vi.fn(async (account: string) => {
      const online = as(account);
      return online ? { meta: { ...online.meta }, encoding: 'json' as const, body: online.body } : null;
    }),
    cloudUpload: vi.fn(async (save: CloudUpload, expected: number, account: string) => {
      uploads.push({ save, expected, account });
      const online = as(account);
      const forced = next;
      next = null;
      if (forced === 'too_new' || (online && online.meta.schemaVersion > save.schemaVersion)) return { ok: false as const, reason: 'too_new' as const, meta: online ? { ...online.meta } : null };
      if (forced === 'conflict' || (online?.meta.revision ?? 0) !== expected) return { ok: false as const, reason: 'conflict' as const, meta: online ? { ...online.meta } : null };
      const { encoding: _e, body, ...meta } = save;
      saves.set(account, { meta: { ...meta, revision: (online?.meta.revision ?? 0) + 1 }, body });
      return { ok: true as const, revision: saves.get(account)!.meta.revision };
    }),
    reportStanding: vi.fn(async (r: StandingReport) => void reports.push(r)),
    news: async () => ({ trades: 0, clubs: 0 }),
    onSessionChange: vi.fn((cb: (account: string | null) => void) => {
      sessionCb = cb;
      return () => {
        sessionCb = null;
      };
    }),
  } as unknown as SocialService;
  return {
    service,
    uploads,
    reports,
    get online() {
      return saves.get(USER.id) ?? null;
    },
    /** Another account's online save, as stored. */
    saveOf(account: string) {
      return saves.get(account) ?? null;
    },
    /** Another tab signs out (null) or in as `account`; `tell` the tabs, as supabase-js does (or not). */
    switchSession(account: string | null, tell = false) {
      session = account;
      if (tell) sessionCb?.(account);
    },
    /** Another account writes its own online save. */
    writeFor(account: string, meta: Partial<CloudSaveMeta>, state: GameState) {
      saves.set(account, { meta: { revision: 1, saveId: state.saveId, schemaVersion: SCHEMA_VERSION, savedAt: state.lastSavedRealMs, hour: state.clock.hour, shopName: state.shopName, day: 1, money: state.finance.money, ...meta }, body: exportSaveText(state) });
    },
    /** Another device writes the online save. */
    write(meta: Partial<CloudSaveMeta>, state: GameState) {
      const m: CloudSaveMeta = { revision: (saves.get(USER.id)?.meta.revision ?? 0) + 1, saveId: state.saveId, schemaVersion: SCHEMA_VERSION, savedAt: state.lastSavedRealMs, hour: state.clock.hour, shopName: state.shopName, day: 1, money: state.finance.money, ...meta };
      saves.set(USER.id, { meta: m, body: exportSaveText(state) });
    },
    failNext(r: 'too_new' | 'conflict') {
      next = r;
    },
    /** Another account: no online save (the fake holds one at a time). */
    clear() {
      saves.delete(USER.id);
    },
  };
}

/** A local save landed (what saveCurrentGame does to the live state on success). */
const localSave = () =>
  useGame.getState().mutate((d) => {
    d.lastSavedRealMs = Date.now();
  });

let links: KV;
let server: ReturnType<typeof fakeServer>;
let stop: () => void;
let doc: EventTarget & { visibilityState: string };

const setHidden = (hidden: boolean) => {
  doc.visibilityState = hidden ? 'hidden' : 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 9, 19, 12), toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('document', doc);
  setStorageBackend(createMemoryBackend());
  mocks.failSave = false;
  mocks.imports = 0;
  mocks.leaveSaveDue = true;
  useResume.setState({ summary: null });
  useUI.setState({ toasts: [] });
  setSyncStore(memory());
  resetSaveSession();
  links = memory();
  resetCloudSync({ storage: links, snapshot: async () => 'data:image/jpeg;base64,AAAA' });
  server = fakeServer();
  provideSocialService(server.service);
  useSettings.setState({ autosave: true });
  useUI.setState({ screen: 'game' });
  useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Ember', seed: 41 }));
  useSocial.setState({ user: null });
  stop = startCloudSync();
});

afterEach(() => {
  stop();
  resetCloudSync();
  provideSocialService(null);
  useSocial.setState({ user: undefined });
  useGame.getState().setGame(null);
  useUI.setState({ screen: 'boot' });
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Sign in and let the first check (and its send) finish. */
async function signIn() {
  useSocial.setState({ user: USER });
  await vi.advanceTimersByTimeAsync(10);
}

describe('sending (§6 "When it sends")', () => {
  it('signs in with no online copy: sends the game at once, expecting revision 0, and links this device', async () => {
    await signIn();
    expect(server.uploads).toHaveLength(1);
    const g = useGame.getState().game!;
    expect(server.uploads[0].expected).toBe(0);
    expect(server.uploads[0].save).toMatchObject({ saveId: g.saveId, schemaVersion: SCHEMA_VERSION, savedAt: g.lastSavedRealMs, shopName: g.shopName, day: 1, encoding: 'json' });
    expect(JSON.parse(server.uploads[0].save.body).state.saveId).toBe(g.saveId); // an export file's text
    expect(readLink(USER.id)).toMatchObject({ revision: 1, saveId: g.saveId });
    expect(useCloud.getState().status).toBe('idle');
    expect(useCloud.getState().syncedAt).not.toBeNull(); // the Account line: "Saved online just now"
    // the standing goes with it, and the first picture
    expect(server.reports[0]).toMatchObject({ shopName: g.shopName, snapshot: 'data:image/jpeg;base64,AAAA' });
  });

  it('sends at most once every 2 minutes, after a local save lands', async () => {
    await signIn();
    expect(server.uploads).toHaveLength(1);
    localSave();
    await vi.advanceTimersByTimeAsync(30_000);
    localSave();
    await vi.advanceTimersByTimeAsync(30_000);
    localSave();
    expect(server.uploads).toHaveLength(1); // inside the gap: one send waits
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS - 60_000 + 5);
    expect(server.uploads).toHaveLength(2);
    expect(server.uploads[1].expected).toBe(1);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(server.uploads).toHaveLength(2); // nothing saved since: nothing sent
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads).toHaveLength(3); // the gap is long past: at once
  });

  it('sends at once when the tab is hidden, when the hidden save lands; none lands, none goes', async () => {
    await signIn();
    localSave();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(server.uploads).toHaveLength(1);
    setHidden(true);
    localSave(); // the hidden autosave lands
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads).toHaveLength(2); // inside the 2-minute gap, but hidden
    setHidden(false);
    setHidden(true); // hidden again, and no save lands this time (refused, or failed)
    await vi.advanceTimersByTimeAsync(30_000);
    expect(server.uploads).toHaveLength(2);
    localSave(); // a save long after the hidden one isn't the hidden one: the gap applies again
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads).toHaveLength(2);
  });

  it('leaving right after an autosave (autosave skips its leaving save) sends at once anyway', async () => {
    await signIn();
    localSave();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(server.uploads).toHaveLength(1); // inside the gap
    mocks.leaveSaveDue = false;
    setHidden(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads).toHaveLength(2);
  });

  it('a tab whose saves another tab refuses (it played the aquarium further) sends nothing', async () => {
    await signIn();
    expect(server.uploads).toHaveLength(1);
    mocks.stale.add(useGame.getState().game!.saveId);
    try {
      await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
      localSave();
      setHidden(true);
      localSave();
      await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
      expect(server.uploads).toHaveLength(1);
    } finally {
      mocks.stale.clear();
    }
  });

  it('never sends a showcase world, or with no game on screen', async () => {
    useGame.getState().setGame({ ...useGame.getState().game!, isShowcase: true });
    await signIn();
    localSave();
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS * 2);
    expect(server.uploads).toHaveLength(0);
    expect(server.service.cloudMeta).not.toHaveBeenCalled();
  });

  it('never sends signed out; sign-out stops it and keeps the link; Delete clears the link', async () => {
    localSave();
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    expect(server.uploads).toHaveLength(0); // signed out
    await signIn();
    expect(server.uploads).toHaveLength(1);
    useSocial.setState({ user: null });
    localSave();
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS * 2);
    expect(server.uploads).toHaveLength(1);
    expect(readLink(USER.id)).not.toBeNull();
    forgetCloudLink(USER.id);
    expect(readLink(USER.id)).toBeNull();
  });
});

describe('checking (§6 "What the check decides")', () => {
  it('another device moved it on (conflict): checks, and asks with the box; nothing sent while the box is open', async () => {
    await signIn();
    const g = useGame.getState().game!;
    // another device plays the same aquarium further and sends it
    server.write({ hour: g.clock.hour + 30, savedAt: g.lastSavedRealMs + 1 }, g);
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave(); // this device saves too, and tries to send with the old revision
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads.at(-1)!.expected).toBe(1);
    expect(useCloud.getState().prompt).toMatchObject({ kind: 'both', online: { revision: 2 } });
    const sent = server.uploads.length;
    localSave();
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS * 2);
    expect(server.uploads).toHaveLength(sent); // never while the box is open
  });

  it('an unchanged device meets a newer online copy: "A newer save is online"', async () => {
    await signIn();
    const g = useGame.getState().game!;
    server.write({ hour: g.clock.hour + 30 }, g);
    await checkOnline();
    expect(useCloud.getState().prompt?.kind).toBe('newer');
  });

  it('a different aquarium online: "Your account has a different aquarium online"', async () => {
    const other = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 77 });
    server.write({}, other);
    await signIn();
    expect(useCloud.getState().prompt?.kind).toBe('other');
    expect(server.uploads).toHaveLength(0);
  });

  it('a newer build’s online copy blocks sending for the session and says so (PERSIST-014)', async () => {
    const g = useGame.getState().game!;
    server.write({ schemaVersion: SCHEMA_VERSION + 1 }, g);
    await signIn();
    expect(cloudBlocked()).toBe(true);
    expect(useCloud.getState().status).toBe('blocked');
    expect(useCloud.getState().prompt).toBeNull();
    localSave();
    setHidden(true);
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS * 3);
    expect(server.uploads).toHaveLength(0);
  });

  it('an upload refused as too_new blocks too', async () => {
    await signIn();
    server.failNext('too_new');
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    expect(cloudBlocked()).toBe(true);
    const n = server.uploads.length;
    localSave();
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS * 2);
    expect(server.uploads).toHaveLength(n);
  });

  it('checks again when the tab comes back after 2 minutes or more, not after less', async () => {
    await signIn();
    const calls = () => vi.mocked(server.service.cloudMeta).mock.calls.length;
    const before = calls();
    setHidden(true);
    await vi.advanceTimersByTimeAsync(60_000);
    setHidden(false);
    await vi.advanceTimersByTimeAsync(10);
    expect(calls()).toBe(before);
    setHidden(true);
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    setHidden(false);
    await vi.advanceTimersByTimeAsync(10);
    expect(calls()).toBe(before + 1);
  });

  it('a check that can’t reach the server says so, and the next local save tries again after the gap', async () => {
    vi.mocked(server.service.cloudMeta).mockRejectedValueOnce({ code: 'network' });
    await signIn();
    expect(useCloud.getState().status).toBe('unreachable');
    expect(server.uploads).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads).toHaveLength(1);
  });
});

describe('the box’s choices', () => {
  it('Keep this device’s: sends this device’s copy over the online one, expecting its revision', async () => {
    const other = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 77 });
    server.write({}, other);
    await signIn();
    expect(useCloud.getState().prompt?.kind).toBe('other');
    await keepDeviceCopy();
    expect(useCloud.getState().prompt).toBeNull();
    expect(server.uploads.at(-1)).toMatchObject({ expected: 1, save: { saveId: useGame.getState().game!.saveId } });
    expect(server.online?.meta).toMatchObject({ revision: 2, saveId: useGame.getState().game!.saveId });
    expect(readLink(USER.id)?.revision).toBe(2);
  });

  it('Load online save (a different aquarium): it becomes the game, and this device’s copy is the "Previous autosave"', async () => {
    const mine = useGame.getState().game!;
    const other = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 77 });
    other.lastSavedRealMs = Date.now() - 3_600_000;
    server.write({}, other);
    await signIn();
    expect(await loadOnlineCopy()).toBe(true);
    const g = useGame.getState().game!;
    expect(g.saveId).toBe(other.saveId);
    expect(g.shopName).toBe(other.shopName);
    expect(useCloud.getState().prompt).toBeNull();
    expect(readLink(USER.id)).toMatchObject({ revision: 1, saveId: other.saveId });
    const saves = await listSaves();
    expect(saves.find((s) => s.slot === 'auto')?.saveId).toBe(other.saveId);
    expect(saves.find((s) => s.previousOf === 'auto')?.saveId).toBe(mine.saveId);
    // in step now: the next save goes up over revision 1
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    expect(server.uploads.at(-1)).toMatchObject({ expected: 1, save: { saveId: other.saveId } });
  });

  it('Load online save (the same aquarium, played further elsewhere): this device’s copy is kept as "Previous autosave"', async () => {
    await signIn();
    const mine = useGame.getState().game!;
    const further = structuredClone(mine);
    further.clock.hour += 40;
    further.finance.money += 999;
    further.lastSavedRealMs = mine.lastSavedRealMs + 5;
    server.write({}, further);
    await checkOnline();
    expect(useCloud.getState().prompt?.kind).toBe('newer');
    expect(await loadOnlineCopy()).toBe(true);
    const g = useGame.getState().game!;
    expect(g.saveId).toBe(mine.saveId);
    expect(g.finance.money).toBeGreaterThanOrEqual(further.finance.money - 1_000); // the online copy (caught up)
    const saves = await listSaves();
    const previous = saves.find((s) => s.previousOf === 'auto');
    expect(previous?.saveId).toMatch(new RegExp(`^${mine.saveId}_kept_`));
    // the change itself isn't this device's play: a newer copy from elsewhere would ask "newer", not "both"
    server.write({ hour: further.clock.hour + 10 }, further);
    await checkOnline();
    expect(useCloud.getState().prompt?.kind).toBe('newer');
  });
});

describe('the link lives outside the save (SOC-009 A3)', () => {
  it('a check and a send change neither the game state nor its stateHash; the link is in its own key', async () => {
    const g = useGame.getState().game!;
    const before = stateHash(g);
    await signIn();
    await checkOnline();
    expect(useGame.getState().game).toBe(g); // the very same object: nothing wrote the game
    expect(stateHash(useGame.getState().game!)).toBe(before);
    expect(Object.keys(links.dump())).toEqual([CLOUD_LINK_KEY]);
    expect(JSON.stringify(g)).not.toContain(CLOUD_LINK_KEY);
    expect(JSON.stringify(g)).not.toContain(USER.email);
  });
});

describe('the review’s fixes (chunk 8 review)', () => {
  it('B2: with the welcome-back card open, the copy that goes up has the speed the card will resume, not its pause', async () => {
    useGame.getState().mutate((d) => {
      d.clock.speed = 0;
    });
    useResume.setState({ summary: { resumeSpeed: 3 } as unknown as NonNullable<ReturnType<typeof useResume.getState>['summary']> });
    await signIn();
    expect(server.uploads).toHaveLength(1);
    expect(JSON.parse(server.uploads[0].save.body).state.clock.speed).toBe(3);
    expect(useGame.getState().game!.clock.speed).toBe(0); // the game on screen is still held by the card
  });

  it('B3: Load online save stores the online copy once and resumes it once (one catch-up, one paused-game note)', async () => {
    await signIn();
    const mine = useGame.getState().game!;
    const further = structuredClone(mine);
    further.clock.hour += 40;
    further.clock.speed = 0;
    further.lastSavedRealMs = mine.lastSavedRealMs + 5;
    server.write({}, further);
    await checkOnline();
    expect(await loadOnlineCopy()).toBe(true);
    expect(mocks.imports).toBe(1);
    expect(useUI.getState().toasts.filter((t) => /paused/.test(t.text))).toHaveLength(1);
    expect(useGame.getState().game!.clock.hour).toBeGreaterThanOrEqual(further.clock.hour);
  });

  it('note 1: when this device’s copy can’t be saved first, nothing is loaded over it', async () => {
    const other = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 77 });
    server.write({}, other);
    await signIn();
    const mine = useGame.getState().game!;
    mocks.failSave = true;
    expect(await loadOnlineCopy()).toBe(false);
    expect(useGame.getState().game!.saveId).toBe(mine.saveId);
    expect(mocks.imports).toBe(0);
    expect(useUI.getState().toasts.at(-1)).toMatchObject({ kind: 'danger', text: 'Couldn’t save — browser storage refused the write.' });
    expect(useCloud.getState().prompt?.kind).toBe('other'); // the box is still there to choose again
  });

  it('note 3: a check while a send is under way waits for it, and doesn’t mistake this device’s copy for another’s', async () => {
    await signIn();
    let release: () => void = () => {};
    const slow = vi.mocked(server.service.cloudUpload).getMockImplementation()!;
    vi.mocked(server.service.cloudUpload).mockImplementationOnce(async (save, expected, account) => {
      await new Promise<void>((r) => (release = r));
      return slow(save, expected, account);
    });
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave(); // a send starts and waits
    await vi.advanceTimersByTimeAsync(10);
    const check = checkOnline();
    await vi.advanceTimersByTimeAsync(10);
    release();
    await check;
    await vi.advanceTimersByTimeAsync(10);
    expect(useCloud.getState().prompt).toBeNull();
    expect(server.online?.meta.revision).toBe(2);
  });

  it('note 3: a send whose answer never came but which landed is this device’s own copy at the next check', async () => {
    await signIn();
    const real = vi.mocked(server.service.cloudUpload).getMockImplementation()!;
    vi.mocked(server.service.cloudUpload).mockImplementationOnce(async (save, expected, account) => {
      await real(save, expected, account); // it lands…
      throw { code: 'network' }; // …but the answer is lost
    });
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    expect(useCloud.getState().status).toBe('unreachable');
    await checkOnline();
    expect(useCloud.getState().prompt).toBeNull();
    expect(readLink(USER.id)?.revision).toBe(2);
  });

  it('note 4: a newer build’s online save blocks only its own account', async () => {
    const g = useGame.getState().game!;
    server.write({ schemaVersion: SCHEMA_VERSION + 1 }, g);
    await signIn();
    expect(cloudBlocked()).toBe(true);
    useSocial.setState({ user: null });
    await vi.advanceTimersByTimeAsync(10);
    server.clear(); // the second account has no online save
    server.switchSession('user-2'); // chunk 9: signing in moves the session too (the fake now checks it)
    useSocial.setState({ user: { ...USER, id: 'user-2', email: 'ola@example.com' } });
    await vi.advanceTimersByTimeAsync(10);
    expect(cloudBlocked()).toBe(false);
    expect(server.uploads).toHaveLength(1);
  });

  it('note 5: with no connection, a failed send waits out the gap before it tries again', async () => {
    await signIn();
    vi.mocked(server.service.cloudUpload).mockRejectedValue({ code: 'network' });
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    const tries = vi.mocked(server.service.cloudUpload).mock.calls.length;
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(30_000);
      localSave();
    }
    await vi.advanceTimersByTimeAsync(10);
    expect(vi.mocked(server.service.cloudUpload).mock.calls.length).toBe(tries); // inside the gap: none more
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    expect(vi.mocked(server.service.cloudUpload).mock.calls.length).toBe(tries + 1);
  });
});

describe('chunk 9 (B2, REL-035): another tab switched the account', () => {
  it('every call names the account this tab shows', async () => {
    await signIn();
    expect(server.uploads.map((u) => u.account)).toEqual([USER.id]);
    expect(vi.mocked(server.service.cloudMeta).mock.calls.every((c) => c[0] === USER.id)).toBe(true);
  });

  it('signed in as someone else in another tab: the send is refused, nothing written, and this tab finds out who', async () => {
    await signIn();
    const b = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 7 });
    server.writeFor(USER_B.id, { revision: 5, shopName: 'Kim’s Reef' }, b);
    server.switchSession(USER_B.id); // tab 1: Sign out, then sign in as B (this tab isn't told)
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS);
    localSave();
    await vi.advanceTimersByTimeAsync(10);
    // the audit's B2: this tab's aquarium went into B's online save; now the server refuses and nothing changes
    expect(server.uploads.at(-1)).toMatchObject({ account: USER.id });
    expect(server.saveOf(USER_B.id)?.meta).toMatchObject({ revision: 5, shopName: 'Kim’s Reef' });
    expect(server.online?.meta.revision).toBe(1); // A's, as it was
    // this tab now shows B, and B's online copy is a different aquarium: the box asks, nothing is sent over it
    expect(useSocial.getState().user?.id).toBe(USER_B.id);
    expect(useCloud.getState().prompt).not.toBeNull();
    expect(server.uploads.filter((u) => u.account === USER_B.id)).toEqual([]);
    expect(readLink(USER.id)?.revision).toBe(1); // A's link isn't rewritten with B's numbers
  });

  it('told by the session (supabase-js tells every tab): stops and asks; the same account again changes nothing', async () => {
    await signIn();
    const asks = () => vi.mocked(server.service.currentUser).mock.calls.length;
    const before = asks();
    server.switchSession(USER.id, true); // a refocus repeats SIGNED_IN for the same account
    await vi.advanceTimersByTimeAsync(10);
    expect(asks()).toBe(before);
    server.switchSession(null, true); // signed out in another tab
    await vi.advanceTimersByTimeAsync(10);
    expect(asks()).toBe(before + 1);
    expect(useSocial.getState().user).toBeNull();
    const sent = server.uploads.length;
    localSave();
    await vi.advanceTimersByTimeAsync(SEND_GAP_MS + 10);
    expect(server.uploads).toHaveLength(sent); // signed out: nothing more goes online
  });
});

describe('chunk 9 (B1, REL-038): Load online save never pushes out an aquarium kept only in the autosave', () => {
  /** The audit's B1: W lives only in the autosave; this device loaded X from Slot 2; X was played further elsewhere. */
  async function setUp() {
    const w = newGame({ starterId: 'axolotl', starterName: 'Wren', seed: 90 });
    w.shopName = 'Reef Corner';
    expect((await saveGame(w, 'auto')).ok).toBe(true);
    const mine = useGame.getState().game!;
    expect((await saveGame(mine, 'slot2')).ok).toBe(true);
    await signIn();
    const further = structuredClone(mine);
    further.clock.hour += 40;
    further.lastSavedRealMs = mine.lastSavedRealMs + 5;
    server.write({}, further);
    await checkOnline();
    expect(useCloud.getState().prompt?.kind).toBe('newer');
    return { w, mine };
  }
  const toasts = () => useUI.getState().toasts.map((t) => t.text);

  it('saves it to a free slot first, says so, then loads the online copy (before: it was gone from every save)', async () => {
    const { w, mine } = await setUp();
    expect(await loadOnlineCopy()).toBe(true);
    expect(toasts()).toContain('Reef Corner was only in the autosave, so it was saved to Slot 1 first.');
    const saves = await listSaves();
    expect(saves.find((m) => m.slot === 'slot1')?.saveId).toBe(w.saveId);
    expect(saves.find((m) => m.slot === 'auto')?.saveId).toBe(mine.saveId); // the online copy, now on screen
    expect(saves.find((m) => m.previousOf === 'auto')?.saveId).toMatch(new RegExp(`^${mine.saveId}_kept_`)); // this device's
    expect(saves.find((m) => m.slot === 'slot2')?.saveId).toBe(mine.saveId);
    expect(useGame.getState().game!.clock.hour).toBeGreaterThanOrEqual(mine.clock.hour + 40);
  });

  it('with every slot full, nothing loads and it says so', async () => {
    const { w, mine } = await setUp();
    for (const [slot, seed] of [['slot1', 91], ['slot3', 92]] as const) expect((await saveGame(newGame({ starterId: 'betta', starterName: 'Fill', seed }), slot)).ok).toBe(true);
    const hour = useGame.getState().game!.clock.hour;
    expect(await loadOnlineCopy()).toBe(false);
    expect(toasts()).toContain('Reef Corner is only in the autosave and every slot is full. Free a slot in Settings › Saves first.');
    expect(useGame.getState().game!.clock.hour).toBe(hour); // still this device's game
    expect((await listSaves()).find((m) => m.slot === 'auto')?.saveId).toBe(w.saveId);
    expect(useGame.getState().game!.saveId).toBe(mine.saveId);
  });

  it('one already in a slot, as far along, is left where it is', async () => {
    const { w } = await setUp();
    expect((await saveGame(w, 'slot3')).ok).toBe(true);
    expect(await loadOnlineCopy()).toBe(true);
    expect(toasts().some((t) => t.includes('was only in the autosave'))).toBe(false);
    const saves = await listSaves();
    expect(saves.filter((m) => m.saveId === w.saveId).map((m) => m.slot)).toEqual(['slot3']); // the autosave's copy went, as a switch does
  });
});

describe('chunk 9, the review’s blocker 2: a kept copy in the autosave isn’t dropped by Load online save', () => {
  const toasts = () => useUI.getState().toasts.map((t) => t.text);
  const atHour = (g: GameState, hour: number) => {
    const c = structuredClone(g);
    c.clock.hour = hour;
    return c;
  };

  it('"Previous autosave" holds a kept copy further along than both: it is saved to a slot first', async () => {
    const mine = useGame.getState().game!;
    // an earlier local load left the day-10 progress as a kept copy in "Previous autosave"; the device is at day 2
    expect((await saveGame({ ...atHour(mine, 9 * 24 + 10), saveId: keptSaveId(mine.saveId) }, 'auto')).ok).toBe(true);
    useGame.getState().setGame(atHour(mine, 24 + 10));
    expect((await saveGame(useGame.getState().game!, 'auto')).ok).toBe(true);
    expect((await listSaves()).find((m) => m.previousOf === 'auto')?.day).toBe(10);
    await signIn();
    server.write({ hour: 4 * 24 + 10 }, atHour(mine, 4 * 24 + 10)); // the same aquarium, day 5, from another device
    await checkOnline();
    expect(useCloud.getState().prompt).not.toBeNull();
    expect(await loadOnlineCopy()).toBe(true);
    expect(toasts()).toContain(`${mine.shopName} was only in the autosave, so it was saved to Slot 1 first.`);
    expect((await listSaves()).find((m) => m.slot === 'slot1')?.day).toBe(10);
  });

  it('B7: a second Load after the box reopens keeps the first one’s kept copy', async () => {
    await signIn();
    const mine = useGame.getState().game!;
    useGame.getState().setGame(atHour(mine, 9 * 24 + 10)); // this device: day 10
    server.write({ hour: 4 * 24 + 10 }, atHour(mine, 4 * 24 + 10)); // online: day 5, both changed
    await checkOnline();
    expect(await loadOnlineCopy()).toBe(true);
    expect((await listSaves()).find((m) => m.previousOf === 'auto')?.day).toBe(10);
    server.write({ hour: 5 * 24 + 10 }, atHour(mine, 5 * 24 + 10)); // the other device again: day 6
    await checkOnline();
    expect(useCloud.getState().prompt).not.toBeNull();
    expect(await loadOnlineCopy()).toBe(true);
    const saves = await listSaves();
    expect(saves.filter((m) => m.saveId?.startsWith(mine.saveId)).map((m) => m.day)).toContain(10); // day 10 is still somewhere
  });

  it('an older kept copy of the aquarium, behind both, goes as any "Previous autosave" does (no slot used)', async () => {
    const mine = useGame.getState().game!;
    expect((await saveGame({ ...atHour(mine, 10), saveId: keptSaveId(mine.saveId) }, 'auto')).ok).toBe(true);
    useGame.getState().setGame(atHour(mine, 3 * 24 + 10));
    expect((await saveGame(useGame.getState().game!, 'auto')).ok).toBe(true);
    await signIn();
    server.write({ hour: 4 * 24 + 10 }, atHour(mine, 4 * 24 + 10));
    await checkOnline();
    expect(await loadOnlineCopy()).toBe(true);
    expect(toasts().some((t) => t.includes('was only in the autosave'))).toBe(false);
    expect((await listSaves()).filter((m) => m.slot !== 'auto' && !m.previousOf)).toEqual([]);
  });
});

describe('chunk 9, the review’s confirmation: a further copy with the device’s own identity (A), and the message (C)', () => {
  const toasts = () => useUI.getState().toasts.map((t) => t.text);
  const atHour = (g: GameState, hour: number) => {
    const c = structuredClone(g);
    c.clock.hour = hour;
    return c;
  };
  /** The autosave holds day 10; the title screen loaded an earlier copy (day 2), not yet autosaved. */
  async function titleLoadedEarlier() {
    const mine = useGame.getState().game!;
    expect((await saveGame(atHour(mine, 9 * 24 + 10), 'auto')).ok).toBe(true);
    useGame.getState().setGame(atHour(mine, 24 + 10));
    return mine;
  }

  it('another aquarium online: day 10 is saved to a slot first, and the message shows after the switch', async () => {
    const mine = await titleLoadedEarlier();
    const other = newGame({ starterId: 'axolotl', starterName: 'Phone', seed: 93 });
    other.lastSavedRealMs = Date.now() - 3_600_000;
    server.write({}, other);
    await signIn();
    expect(useCloud.getState().prompt).not.toBeNull();
    expect(await loadOnlineCopy()).toBe(true);
    expect(useGame.getState().game!.saveId).toBe(other.saveId);
    expect(toasts()).toContain(`${mine.shopName} was only in the autosave, so it was saved to Slot 1 first.`);
    expect((await listSaves()).find((m) => m.slot === 'slot1')?.day).toBe(10);
  });

  it('the same aquarium online at day 5: day 10 is saved to a slot first', async () => {
    const mine = await titleLoadedEarlier();
    await signIn();
    server.write({ hour: 4 * 24 + 10 }, atHour(mine, 4 * 24 + 10));
    await checkOnline();
    expect(await loadOnlineCopy()).toBe(true);
    expect((await listSaves()).filter((m) => m.saveId?.startsWith(mine.saveId)).map((m) => m.day)).toContain(10);
    expect(toasts()).toContain(`${mine.shopName} was only in the autosave, so it was saved to Slot 1 first.`);
  });
});
