/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6; ADR-0038 decision 2, ADR-0040 decision 4; REL-029) — the online
 * save. OWNER: lane "social".
 *
 * While the player is signed in and a game is on screen, the game goes online after a local save lands, at most once
 * every 2 minutes, and at once when the tab is hidden (after the hidden save lands). The device's own saves stay the
 * source of truth offline; nothing here changes the local save paths. What goes up is the text of an export file
 * (`exportSaveText`), gzipped and base64'd where the browser can (src/social/codec.ts); a body over 4,000,000
 * characters isn't sent, and showcase worlds never are.
 *
 * It checks the online copy (`cloudMeta()`) on sign-in, when a game starts or loads, when the tab comes back after
 * 2 minutes or more hidden, and after an upload's conflict; `decideOnline` (./rules.ts) says what follows. A newer
 * build's online save blocks sending for the session (PERSIST-014, on the server too). The box (CloudPrompt.tsx) asks
 * which copy to keep: loading the online one goes through `importSaveText` and the usual resume (the offline catch-up
 * and the welcome-back card), and this device's copy stays in Settings › Saves as "Previous autosave".
 *
 * This device's link (`aquarium-go.cloud.v1`: one per account, plus when a local save of which aquarium last landed)
 * lives in localStorage, never in the save: no social action changes the game state or its stateHash (SOC-009 A3).
 * Sign out stops the loop and keeps the link; Delete my account stops it and clears the link.
 */
import { create } from 'zustand';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { SCHEMA_VERSION, exportSaveText, importSaveText, loadAndResume, saveCurrentGame, saveGame } from '@/persistence';
import { autosaveAllowed } from '@/game/useAutosave';
import { currentStanding, decodeSaveBody, encodeSaveBody, isSocialError, MAX_CLOUD_BODY, socialService, type CloudSaveMeta, type StandingReport } from '@/social';
import { loadSocialUser, refreshSocialNews, useSocial } from '../panels/social/socialStore';
import { socialMode } from './mode';
import { decideOnline, type CloudLink, type CloudPromptKind, type DeviceCopy } from './rules';

export const CLOUD_LINK_KEY = 'aquarium-go.cloud.v1';
/** At most one send per this much time (a hidden tab sends at once). */
export const SEND_GAP_MS = 120_000;
/** A tab hidden at least this long checks the online copy when it comes back. */
export const RETURN_CHECK_MS = 120_000;
/** A new aquarium picture goes up at most this often (REL-030). */
export const SNAPSHOT_GAP_MS = 30 * 60_000;
/** After hiding, a send waits this long for the hidden save to land, then goes anyway. */
const HIDDEN_SEND_WAIT_MS = 3_000;
const MAX_SNAPSHOT = 200_000;

export type CloudStatus = 'idle' | 'checking' | 'saving' | 'unreachable' | 'blocked';

export interface CloudPromptState {
  kind: CloudPromptKind;
  online: CloudSaveMeta;
}

interface CloudState {
  status: CloudStatus;
  /** The box, while it asks. */
  prompt: CloudPromptState | null;
  /** A choice in the box is running. */
  choosing: boolean;
  /** This device's clock when it last sent or loaded the online copy (the Account line), or null. */
  syncedAt: number | null;
}

export const useCloud = create<CloudState>(() => ({ status: 'idle', prompt: null, choosing: false, syncedAt: null }));

// ───────────────────────────── the link (localStorage, outside the save) ─────────────────────────────

interface StoredLinks {
  accounts: Record<string, CloudLink>;
  /** When a local save of which aquarium last landed on this device. */
  local: { saveId: string; at: number } | null;
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
let kvOverride: KV | null = null;
const kv = (): KV | null => {
  if (kvOverride) return kvOverride;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function readLinks(): StoredLinks {
  const out: StoredLinks = { accounts: {}, local: null };
  try {
    const raw = JSON.parse(kv()?.getItem(CLOUD_LINK_KEY) ?? 'null') as Partial<StoredLinks> | null;
    if (!raw || typeof raw !== 'object') return out;
    if (raw.accounts && typeof raw.accounts === 'object')
      for (const [id, l] of Object.entries(raw.accounts)) if (l && finite(l.revision) && typeof l.saveId === 'string' && finite(l.savedAt) && finite(l.sentAt)) out.accounts[id] = { revision: l.revision, saveId: l.saveId, savedAt: l.savedAt, sentAt: l.sentAt };
    if (raw.local && typeof raw.local.saveId === 'string' && finite(raw.local.at)) out.local = { saveId: raw.local.saveId, at: raw.local.at };
  } catch {
    /* unreadable: as if empty */
  }
  return out;
}

function writeLinks(l: StoredLinks): void {
  try {
    kv()?.setItem(CLOUD_LINK_KEY, JSON.stringify(l));
  } catch {
    /* storage full or blocked: the next check asks again */
  }
}

export const readLink = (userId: string): CloudLink | null => readLinks().accounts[userId] ?? null;

function writeLink(userId: string, link: CloudLink | null): void {
  const all = readLinks();
  if (link) all.accounts[userId] = link;
  else delete all.accounts[userId];
  writeLinks(all);
  useCloud.setState({ syncedAt: link?.sentAt ?? null });
}

function noteLocalSave(saveId: string, at: number): void {
  const all = readLinks();
  all.local = { saveId, at };
  writeLinks(all);
}

/** Delete my account: forget this account's link (the loop stops with the sign-out that follows). */
export function forgetCloudLink(userId: string): void {
  writeLink(userId, null);
}

// ───────────────────────────── the loop ─────────────────────────────

let started = false;
let inStep = false;
let blocked = false;
let checking = false;
let recheck = false;
let sending = false;
let sendAgain = false;
/** The revision the next upload expects (the online copy's, as last seen). */
let expected = 0;
let lastSentAt = -Infinity;
let lastCheckAt = -Infinity;
let lastSnapshotAt = -Infinity;
let hiddenAt: number | null = null;
let sendOnNextSave = false;
let gapTimer: ReturnType<typeof setTimeout> | null = null;
let hiddenTimer: ReturnType<typeof setTimeout> | null = null;
let snapshotSource: () => Promise<string | null> = defaultSnapshot;

/** The aquarium picture friends see: a small JPEG of the view (the render layer, loaded only when one is due). */
async function defaultSnapshot(): Promise<string | null> {
  try {
    const { capturePhoto } = await import('@/render/camera/photo');
    return await capturePhoto({ width: 480, hideUI: true, format: 'image/jpeg', quality: 0.72 });
  } catch {
    return null;
  }
}

const user = () => useSocial.getState().user ?? null;

/** A game this device may put online: on screen, not a showcase, not a dev fixture's (autosave's own rule). */
function syncableGame(): GameState | null {
  const g = useGame.getState().game;
  if (!g || g.isShowcase || useUI.getState().screen !== 'game') return null;
  // autosave off in Settings still lets a manual save go online; a fixture or a showcase never does
  if (!autosaveAllowed() && useSettings.getState().autosave) return null;
  return g;
}

const active = (): boolean => socialMode() !== 'off' && !!user();

function deviceCopy(g: GameState | null): DeviceCopy | null {
  if (!g) return null;
  const local = readLinks().local;
  return { saveId: g.saveId, savedAt: g.lastSavedRealMs, localAt: local?.saveId === g.saveId ? local.at : 0 };
}

const dayOf = (g: GameState): number => Math.floor(g.clock.hour / 24) + 1;

function clearTimers(): void {
  if (gapTimer) clearTimeout(gapTimer);
  if (hiddenTimer) clearTimeout(hiddenTimer);
  gapTimer = hiddenTimer = null;
}

/** Signed out, or the account deleted: stop (the link stays unless Delete cleared it). */
function stop(): void {
  inStep = false;
  sendOnNextSave = false;
  sendAgain = false;
  clearTimers();
  useCloud.setState({ prompt: null, choosing: false, status: blocked ? 'blocked' : 'idle', syncedAt: null });
}

/** Read the online copy and decide (§6). Calls while one runs fold into one more. */
export async function checkOnline(): Promise<void> {
  if (!active() || blocked) return;
  if (checking) {
    recheck = true;
    return;
  }
  const u = user()!;
  const g = syncableGame();
  if (!g) {
    inStep = false;
    return;
  }
  checking = true;
  lastCheckAt = Date.now();
  if (!sending) useCloud.setState({ status: 'checking' });
  const device = deviceCopy(g); // what this device holds now, before the network answers
  const link = readLink(u.id);
  useCloud.setState({ syncedAt: link?.sentAt ?? null });
  try {
    const online = await socialService().cloudMeta();
    if (user()?.id !== u.id) return; // signed out (or in as someone else) meanwhile
    const d = decideOnline(online, link, device, SCHEMA_VERSION, Date.now());
    switch (d.kind) {
      case 'wait':
        inStep = false;
        useCloud.setState({ status: 'idle' });
        break;
      case 'blocked':
        blocked = true;
        inStep = false;
        useCloud.setState({ status: 'blocked', prompt: null });
        break;
      case 'send':
        inStep = true;
        expected = 0;
        useCloud.setState({ status: 'idle' });
        void sendNow();
        break;
      case 'inStep':
        if (d.link) writeLink(u.id, d.link);
        inStep = true;
        expected = online!.revision;
        useCloud.setState({ status: 'idle' });
        if (sendAgain) void sendNow();
        break;
      case 'prompt':
        inStep = false;
        useCloud.setState({ status: 'idle', prompt: { kind: d.reason, online: online! } });
        break;
    }
    void refreshSocialNews();
  } catch (e) {
    inStep = false;
    useCloud.setState({ status: 'unreachable' });
    if (!(isSocialError(e) && e.code === 'network')) console.warn('[aquarium-go] online save check failed', e);
  } finally {
    checking = false;
    if (recheck) {
      recheck = false;
      void checkOnline();
    }
  }
}

/** Send the game on screen now (in step only). Resolves when the answer is in. */
export async function sendNow(): Promise<void> {
  if (!active() || blocked || !inStep || useCloud.getState().prompt) return;
  if (sending) {
    sendAgain = true;
    return;
  }
  const g = syncableGame();
  const u = user();
  if (!g || !u) return;
  sending = true;
  sendAgain = false;
  if (gapTimer) clearTimeout(gapTimer);
  gapTimer = null;
  useCloud.setState({ status: 'saving' });
  const exportedAt = Date.now();
  try {
    const body = await encodeSaveBody(exportSaveText(g));
    if (body.body.length > MAX_CLOUD_BODY) {
      console.warn(`[aquarium-go] online save not sent: ${body.body.length} characters is over the ${MAX_CLOUD_BODY} limit`);
      useCloud.setState({ status: 'unreachable' });
      return;
    }
    const res = await socialService().cloudUpload({ saveId: g.saveId, schemaVersion: g.schemaVersion, savedAt: g.lastSavedRealMs, hour: g.clock.hour, shopName: g.shopName, day: dayOf(g), money: g.finance.money, ...body }, expected);
    if (user()?.id !== u.id) return;
    lastSentAt = Date.now();
    if (res.ok) {
      expected = res.revision;
      writeLink(u.id, { revision: res.revision, saveId: g.saveId, savedAt: g.lastSavedRealMs, sentAt: exportedAt });
      useCloud.setState({ status: 'idle' });
      void report(g);
    } else if (res.reason === 'too_new') {
      blocked = true;
      inStep = false;
      useCloud.setState({ status: 'blocked' });
    } else {
      inStep = false; // another device moved it on: look again
      useCloud.setState({ status: 'idle' });
      void checkOnline();
    }
  } catch (e) {
    useCloud.setState({ status: 'unreachable' }); // the online copy is as it was: the next save tries again
    if (!(isSocialError(e) && e.code === 'network')) console.warn('[aquarium-go] online save failed', e);
  } finally {
    sending = false;
    if (sendAgain) {
      sendAgain = false;
      scheduleSend();
    }
  }
}

/** A local save landed: send now, or when the 2-minute gap is up. */
function scheduleSend(): void {
  if (!active() || blocked) return;
  if (!inStep) {
    // the last check couldn't reach the server: try again, at most once per gap
    if (useCloud.getState().status === 'unreachable' && !useCloud.getState().prompt && Date.now() - lastCheckAt >= SEND_GAP_MS) void checkOnline();
    return;
  }
  const wait = lastSentAt + SEND_GAP_MS - Date.now();
  if (wait <= 0) void sendNow();
  else if (!gapTimer) gapTimer = setTimeout(() => {
    gapTimer = null;
    void sendNow();
  }, wait);
}

/** The player's numbers, and a new picture when one is due (after a successful send). */
async function report(g: GameState): Promise<void> {
  const st = currentStanding();
  if (!st) return;
  const r: StandingReport = { shopName: st.name, gallons: st.gallons ?? 0, collectionValue: st.collection_value, prismatics: st.prismatics, showWins: st.show_wins };
  if (Date.now() - lastSnapshotAt >= SNAPSHOT_GAP_MS && useGame.getState().game?.saveId === g.saveId && useUI.getState().screen === 'game') {
    lastSnapshotAt = Date.now();
    const url = await snapshotSource().catch(() => null);
    if (url && url.length <= MAX_SNAPSHOT && /^data:image\/(jpeg|webp);base64,/.test(url)) r.snapshot = url;
  }
  try {
    await socialService().reportStanding(r);
  } catch {
    /* the leaderboard sends them again */
  }
}

// ───────────────────────────── the box's two choices ─────────────────────────────

/** "Keep this device's": send it over the online copy the box showed. */
export async function keepDeviceCopy(): Promise<void> {
  const p = useCloud.getState().prompt;
  if (!p || useCloud.getState().choosing) return;
  useCloud.setState({ choosing: true });
  expected = p.online.revision;
  inStep = true;
  useCloud.setState({ prompt: null });
  try {
    await sendNow();
  } finally {
    useCloud.setState({ choosing: false });
  }
}

/** A copy of the game under a new identity, so the slot's backup lists it as "Previous autosave". */
const keptId = (saveId: string): string => `${saveId.replace(/_kept_[0-9a-z]+$/, '')}_kept_${Date.now().toString(36)}`.slice(0, 200);

/**
 * "Load online save": download it, import it into the autosave slot (validated, migrated, refused when it's a newer
 * build's) and resume it as Settings › Saves' Load does. This device's game is saved first and stays in the slot's
 * backup, "Previous autosave": when it's the same aquarium it is kept under a new identity, since the backup lists
 * only a different aquarium. Returns whether the online copy is now the game on screen.
 */
export async function loadOnlineCopy(): Promise<boolean> {
  const p = useCloud.getState().prompt;
  const u = user();
  if (!p || !u || useCloud.getState().choosing) return false;
  useCloud.setState({ choosing: true });
  try {
    const got = await socialService().cloudDownload();
    if (!got) {
      useCloud.setState({ prompt: null });
      void checkOnline();
      return false;
    }
    const text = await decodeSaveBody(got);
    const check = await importSaveText(text); // validate first: a refused copy changes nothing on this device
    if (!check.ok || !check.state) {
      useUI.getState().toast(check.error ?? 'That save could not be loaded.', 'danger');
      return false;
    }
    // this device's game into the autosave slot, so the import below rotates it into the backup
    const g = useGame.getState().game;
    if (g && !g.isShowcase) {
      const saved = await saveCurrentGame('auto', { flush: true, toast: false });
      const flushed = useGame.getState().game;
      if (saved.ok && flushed && flushed.saveId === got.meta.saveId) await saveGame({ ...flushed, saveId: keptId(flushed.saveId) }, 'auto');
    }
    const previous = readLink(u.id);
    writeLink(u.id, { revision: got.meta.revision, saveId: got.meta.saveId, savedAt: got.meta.savedAt, sentAt: Date.now() });
    for (let attempt = 0; attempt < 3; attempt++) {
      const imported = await importSaveText(text, 'auto');
      if (!imported.ok) {
        writeLink(u.id, previous);
        useUI.getState().toast(imported.error ?? 'That save could not be loaded.', 'danger');
        return false;
      }
      const r = await loadAndResume('auto');
      if (!r.ok || !r.state) {
        writeLink(u.id, previous);
        if (r.error) useUI.getState().toast(r.error, 'danger');
        return false;
      }
      // an autosave landing between the import and the load would bring this device's copy back: import again
      if (r.state.saveId === got.meta.saveId && r.state.lastSavedRealMs === check.state.lastSavedRealMs) break;
    }
    // the link's time after the game on screen changed, so the change itself doesn't count as this device's play
    writeLink(u.id, { revision: got.meta.revision, saveId: got.meta.saveId, savedAt: got.meta.savedAt, sentAt: Date.now() });
    useUI.getState().set({ hudHidden: false, cameraMode: 'front' });
    expected = got.meta.revision;
    inStep = true;
    useCloud.setState({ prompt: null });
    return true;
  } catch (e) {
    useUI.getState().toast(isSocialError(e) ? 'Can’t reach Aquarium Go online right now. Your game is fine — try again in a moment.' : 'That save could not be loaded.', 'danger');
    return false;
  } finally {
    useCloud.setState({ choosing: false });
  }
}

// ───────────────────────────── wiring ─────────────────────────────

/** Start the loop (UIRoot, once). Returns the cleanup (tests). */
export function startCloudSync(): () => void {
  if (started || socialMode() === 'off') return () => {};
  started = true;
  const offs: (() => void)[] = [];
  let lastUser = user()?.id ?? null;
  offs.push(
    useSocial.subscribe((s) => {
      const id = s.user?.id ?? null;
      if (id === lastUser) return;
      lastUser = id;
      if (id) void checkOnline();
      else stop();
    }),
  );
  let lastGame = useGame.getState().game;
  offs.push(
    useGame.subscribe((s) => {
      const g = s.game;
      const prev = lastGame;
      lastGame = g;
      if (!g || g.isShowcase) return;
      if (!prev || prev.saveId !== g.saveId) {
        // a game started or loaded: who is signed in (once a session), then the check
        void loadSocialUser().then(() => checkOnline());
        return;
      }
      if (g.lastSavedRealMs !== prev.lastSavedRealMs) {
        noteLocalSave(g.saveId, Date.now());
        if (sendOnNextSave) {
          sendOnNextSave = false;
          if (hiddenTimer) clearTimeout(hiddenTimer);
          hiddenTimer = null;
          void sendNow();
        } else scheduleSend();
      }
    }),
  );
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      const g = syncableGame();
      if (!g || !active() || !inStep || !autosaveAllowed()) return;
      noteLocalSave(g.saveId, Date.now()); // the hidden save (autosave's) is landing now
      sendOnNextSave = true;
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = setTimeout(() => {
        hiddenTimer = null;
        if (!sendOnNextSave) return;
        sendOnNextSave = false;
        void sendNow();
      }, HIDDEN_SEND_WAIT_MS);
    } else if (hiddenAt !== null) {
      const away = Date.now() - hiddenAt;
      hiddenAt = null;
      if (away >= RETURN_CHECK_MS) void checkOnline();
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
    offs.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }
  if (useGame.getState().game) void loadSocialUser().then(() => checkOnline());
  return () => {
    offs.forEach((f) => f());
    clearTimers();
    started = false;
  };
}

/** Dev hooks and e2e: send now (checking first when not in step). */
export async function cloudSyncNow(): Promise<void> {
  await loadSocialUser();
  if (!inStep) await checkOnline();
  await sendNow();
}

/** Tests: a fresh session (and where the link lives, where the picture comes from). */
export function resetCloudSync(opts: { storage?: KV | null; snapshot?: () => Promise<string | null> } = {}): void {
  clearTimers();
  started = false;
  inStep = blocked = checking = recheck = sending = sendAgain = sendOnNextSave = false;
  expected = 0;
  lastSentAt = lastCheckAt = lastSnapshotAt = -Infinity;
  hiddenAt = null;
  kvOverride = opts.storage ?? null;
  snapshotSource = opts.snapshot ?? defaultSnapshot;
  useCloud.setState({ status: 'idle', prompt: null, choosing: false, syncedAt: null });
}

/** Tests and the Account line: is sending blocked for this session (a newer build's online save)? */
export const cloudBlocked = (): boolean => blocked;
