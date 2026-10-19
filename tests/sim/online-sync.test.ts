/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6, §8.1; REL-029) — the online-save loop against a fake service and fake
 * timers: a first send when there's no online copy, at most one send per 2 minutes, a send when the tab is hidden
 * (after the hidden save lands), never a showcase, a conflict → a check → the box, a newer build's copy → blocked and
 * nothing sent, both of the box's choices (loading keeps this device's copy as "Previous autosave"), sign-out and
 * Delete stopping it, and the link kept outside the save (no social action changes the save or its stateHash).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { SCHEMA_VERSION, createMemoryBackend, exportSaveText, listSaves, resetSaveSession, setStorageBackend, setSyncStore, stateHash, useResume } from '@/persistence';
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

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; dump(): Record<string, string> };
function memory(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), dump: () => Object.fromEntries(m) };
}

/** A server holding one online save, recording every upload. */
function fakeServer() {
  let online: { meta: CloudSaveMeta; body: string } | null = null;
  const uploads: { save: CloudUpload; expected: number }[] = [];
  const reports: StandingReport[] = [];
  let next: 'ok' | 'too_new' | 'conflict' | null = null;
  const service = {
    currentUser: async () => USER,
    cloudMeta: vi.fn(async () => (online ? { ...online.meta } : null)),
    cloudDownload: vi.fn(async () => (online ? { meta: { ...online.meta }, encoding: 'json' as const, body: online.body } : null)),
    cloudUpload: vi.fn(async (save: CloudUpload, expected: number) => {
      uploads.push({ save, expected });
      const forced = next;
      next = null;
      if (forced === 'too_new' || (online && online.meta.schemaVersion > save.schemaVersion)) return { ok: false as const, reason: 'too_new' as const, meta: online ? { ...online.meta } : null };
      if (forced === 'conflict' || (online?.meta.revision ?? 0) !== expected) return { ok: false as const, reason: 'conflict' as const, meta: online ? { ...online.meta } : null };
      const { encoding: _e, body, ...meta } = save;
      online = { meta: { ...meta, revision: (online?.meta.revision ?? 0) + 1 }, body };
      return { ok: true as const, revision: online.meta.revision };
    }),
    reportStanding: vi.fn(async (r: StandingReport) => void reports.push(r)),
    news: async () => ({ trades: 0, clubs: 0 }),
  } as unknown as SocialService;
  return {
    service,
    uploads,
    reports,
    get online() {
      return online;
    },
    /** Another device writes the online save. */
    write(meta: Partial<CloudSaveMeta>, state: GameState) {
      const m: CloudSaveMeta = { revision: (online?.meta.revision ?? 0) + 1, saveId: state.saveId, schemaVersion: SCHEMA_VERSION, savedAt: state.lastSavedRealMs, hour: state.clock.hour, shopName: state.shopName, day: 1, money: state.finance.money, ...meta };
      online = { meta: m, body: exportSaveText(state) };
    },
    failNext(r: 'too_new' | 'conflict') {
      next = r;
    },
    /** Another account: no online save (the fake holds one at a time). */
    clear() {
      online = null;
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
    vi.mocked(server.service.cloudUpload).mockImplementationOnce(async (save, expected) => {
      await new Promise<void>((r) => (release = r));
      return slow(save, expected);
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
    vi.mocked(server.service.cloudUpload).mockImplementationOnce(async (save, expected) => {
      await real(save, expected); // it lands…
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
