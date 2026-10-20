/**
 * chunk 8 (docs/agent/design/ONLINE-STAGE1.md §6; ADR-0038 decision 2, ADR-0040 decision 4; REL-029) — the online
 * save. OWNER: lane "social".
 *
 * While the player is signed in and a game is on screen, the game goes online after a local save lands, at most once
 * every 2 minutes, and at once when the tab is hidden (when the hidden save lands, or at once when autosave skips it
 * because a save landed moments before). A tab whose saves are refused because another tab played the aquarium
 * further (the stale-tab rule) sends nothing. The device's own saves stay the
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
import { SCHEMA_VERSION, baseSaveId, copySave, exportSaveText, importSaveText, isStaleGame, listSaves, resumeState, saveCurrentGame, stateForSaving, type SaveMeta } from '@/persistence';
import { autosaveAllowed, leaveSaveDue } from '@/game/useAutosave';
import { currentStanding, decodeSaveBody, encodeSaveBody, isSocialError, MAX_CLOUD_BODY, socialService, type CloudSaveMeta, type StandingReport } from '@/social';
import { loadSocialUser, refreshSocialNews, useSocial } from '../panels/social/socialStore';
import { socialMode } from './mode';
import { SOCIAL_COPY } from '../panels/social/copy';
import { decideOnline, type CloudLink, type CloudPromptKind, type DeviceCopy } from './rules';
import { freeSaveSlot, slotLabel } from '../common/saves';

export const CLOUD_LINK_KEY = 'aquarium-go.cloud.v1';
/** At most one send per this much time (a hidden tab sends at once). */
export const SEND_GAP_MS = 120_000;
/** A tab hidden at least this long checks the online copy when it comes back. */
export const RETURN_CHECK_MS = 120_000;
/** A new aquarium picture goes up at most this often (REL-030). */
export const SNAPSHOT_GAP_MS = 30 * 60_000;
/** After hiding, a send waits this long for the hidden save to land (and is dropped if none does). */
const HIDDEN_SEND_WAIT_MS = 10_000;
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
/** The account whose online save comes from a newer build: nothing goes up for it this session (PERSIST-014). */
let blockedFor: string | null = null;
const isBlocked = (): boolean => !!blockedFor && blockedFor === user()?.id;
/** What this device last sent (or tried to): an online copy that is exactly it is this device's own, in step. */
let lastTried: { saveId: string; savedAt: number; hour: number } | null = null;
/** The check and the send under way, if any (one of each at a time). */
let checkP: Promise<void> | null = null;
let recheck = false;
let sendP: Promise<void> | null = null;
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

/**
 * A game this device may put online: on screen, not a showcase, not a dev fixture's (autosave's own rule), and not one
 * another tab played further (its saves are refused, so its copy is behind).
 */
function syncableGame(): GameState | null {
  const g = useGame.getState().game;
  if (!g || g.isShowcase || useUI.getState().screen !== 'game' || isStaleGame(g.saveId)) return null;
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
  useCloud.setState({ prompt: null, choosing: false, status: 'idle', syncedAt: null });
}

/**
 * Chunk 9 (B2): the session is no longer the account this tab shows (another tab signed out, or in as someone else):
 * stop, and ask who is signed in now; a new account starts its own check (the useSocial subscription below).
 */
function accountChanged(): void {
  stop();
  void loadSocialUser(true);
}

const isAccountError = (e: unknown): boolean => isSocialError(e) && e.code === 'account';

/** Read the online copy and decide (§6). A call while one runs folds into one more, after it. */
export function checkOnline(): Promise<void> {
  if (!active()) return Promise.resolve();
  if (isBlocked()) {
    useCloud.setState({ status: 'blocked' }); // still blocked for this account (signed out and in again)
    return Promise.resolve();
  }
  if (checkP) {
    recheck = true;
    return checkP;
  }
  checkP = runCheck().finally(() => {
    checkP = null;
    if (recheck) {
      recheck = false;
      void checkOnline();
    }
  });
  return checkP;
}

async function runCheck(): Promise<void> {
  // a send under way first: its answer moves the link, and a check that read the link before it would mistake this
  // device's own copy for another device's
  if (sendP) await sendP;
  const u = user();
  const g = syncableGame();
  if (!u || !g) {
    inStep = false;
    return;
  }
  lastCheckAt = Date.now();
  useCloud.setState({ status: 'checking' });
  const device = deviceCopy(g); // what this device holds now, before the network answers
  let link = readLink(u.id);
  useCloud.setState({ syncedAt: link?.sentAt ?? null });
  try {
    const online = await socialService().cloudMeta(u.id);
    if (user()?.id !== u.id) return; // signed out (or in as someone else) meanwhile
    // a send whose answer never came (a timeout) may still have landed: the copy online is then this device's own
    if (online && lastTried && online.saveId === lastTried.saveId && online.savedAt === lastTried.savedAt && online.hour === lastTried.hour && online.revision !== link?.revision) {
      link = { revision: online.revision, saveId: online.saveId, savedAt: online.savedAt, sentAt: link?.sentAt ?? Date.now() };
      writeLink(u.id, link);
    }
    const d = decideOnline(online, link, device, SCHEMA_VERSION, Date.now());
    switch (d.kind) {
      case 'wait':
        inStep = false;
        useCloud.setState({ status: 'idle' });
        break;
      case 'blocked':
        blockedFor = u.id;
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
    if (isAccountError(e)) return accountChanged();
    useCloud.setState({ status: 'unreachable' });
    if (!(isSocialError(e) && e.code === 'network')) console.warn('[aquarium-go] online save check failed', e);
  }
}

/** Send the game on screen now (in step only). Resolves when the answer is in; a call while one runs sends once more after it. */
export function sendNow(): Promise<void> {
  if (!active() || isBlocked() || !inStep || useCloud.getState().prompt) return Promise.resolve();
  if (sendP) {
    sendAgain = true;
    return sendP;
  }
  const g = syncableGame();
  const u = user();
  if (!g || !u) return Promise.resolve();
  sendAgain = false;
  sendP = runSend(g, u.id).finally(() => {
    sendP = null;
    if (sendAgain) {
      sendAgain = false;
      scheduleSend();
    }
  });
  return sendP;
}

async function runSend(g: GameState, userId: string): Promise<void> {
  if (gapTimer) clearTimeout(gapTimer);
  gapTimer = null;
  useCloud.setState({ status: 'saving' });
  const exportedAt = Date.now();
  try {
    // what a local save stores: the speed the welcome-back card will resume, not its pause (R03-03)
    const body = await encodeSaveBody(exportSaveText(stateForSaving(g)));
    if (body.body.length > MAX_CLOUD_BODY) {
      console.warn(`[aquarium-go] online save not sent: ${body.body.length} characters is over the ${MAX_CLOUD_BODY} limit`);
      useCloud.setState({ status: 'unreachable' });
      lastSentAt = Date.now(); // not again before the gap is up
      return;
    }
    lastTried = { saveId: g.saveId, savedAt: g.lastSavedRealMs, hour: g.clock.hour };
    const res = await socialService().cloudUpload({ saveId: g.saveId, schemaVersion: g.schemaVersion, savedAt: g.lastSavedRealMs, hour: g.clock.hour, shopName: g.shopName, day: dayOf(g), money: g.finance.money, ...body }, expected, userId);
    if (user()?.id !== userId) return;
    lastSentAt = Date.now();
    if (res.ok) {
      expected = res.revision;
      writeLink(userId, { revision: res.revision, saveId: g.saveId, savedAt: g.lastSavedRealMs, sentAt: exportedAt });
      useCloud.setState({ status: 'idle' });
      void report(g);
    } else if (res.reason === 'too_new') {
      blockedFor = userId;
      inStep = false;
      useCloud.setState({ status: 'blocked' });
    } else {
      inStep = false; // another device moved it on: look again
      useCloud.setState({ status: 'idle' });
      void checkOnline();
    }
  } catch (e) {
    if (isAccountError(e)) return accountChanged(); // nothing was written: the server refused another account's session
    // the online copy is as it was (or the send landed unanswered: the next check sees it): try again after the gap
    lastSentAt = Date.now();
    useCloud.setState({ status: 'unreachable' });
    if (!(isSocialError(e) && e.code === 'network')) console.warn('[aquarium-go] online save failed', e);
  }
}

/** A local save landed: send now, or when the 2-minute gap is up. */
function scheduleSend(): void {
  if (!active() || isBlocked()) return;
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

/** Settings › Saves' own words for a save that won't load (src/ui/common/saves.ts). */
const LOAD_FAILED = 'That save could not be loaded — it may be damaged. Try its previous copy or an exported file.';

/**
 * Chunk 9 (B1, ADR-0044's messages): loading the online copy writes the autosave slot twice (this device's game, then
 * the online copy), which pushes out what was there. A copy kept only there (in the autosave or its "Previous
 * autosave", in no slot as far along) is first saved to a slot, the one holding an older copy of it, else a free one,
 * unless it is the game on screen, the online copy, or an older state of one of those two (the review's blocker 2: a
 * kept copy of this aquarium further along than both, from an earlier load, is kept too). With every slot full
 * nothing loads. Returns whether the load may go on.
 */
async function keepAutosavedAquariums(written: GameState[]): Promise<boolean> {
  const exact = new Set(written.map((g) => g.saveId));
  const hours = (id: string) => written.filter((g) => baseSaveId(g.saveId) === baseSaveId(id)).map((g) => g.clock.hour);
  let saves: SaveMeta[];
  try {
    saves = await listSaves();
  } catch {
    saves = [];
  }
  const manual = () => saves.filter((m) => m.slot !== 'auto' && !m.previousOf);
  for (const m of saves.filter((x) => x.slot === 'auto' || x.previousOf === 'auto')) {
    if (!m.saveId || exact.has(m.saveId)) continue;
    const same = hours(m.saveId);
    // another copy of an aquarium being written, no further along than each copy of it written now: an older state of
    // it, which goes as any "Previous autosave" goes on a switch
    if (same.length && !same.every((h) => typeof m.hour === 'number' && m.hour > h + 1e-6)) continue;
    if (manual().some((k) => k.saveId === m.saveId && (k.hour ?? -Infinity) >= (m.hour ?? Infinity) - 1e-6)) continue;
    const to = manual().find((k) => k.saveId === m.saveId)?.slot ?? freeSaveSlot(saves);
    if (!to) {
      useUI.getState().toast(`${m.shopName} is only in the autosave and every slot is full. Free a slot in Settings › Saves first.`, 'danger');
      return false;
    }
    const r = await copySave(m.slot, to);
    if (!r.ok) {
      useUI.getState().toast(r.message, 'danger');
      return false;
    }
    useUI.getState().toast(`${m.shopName} was only in the autosave, so it was saved to ${slotLabel(to)} first.`, 'success');
    saves = [...saves.filter((k) => k.slot !== to), { ...m, slot: to, previousOf: undefined }];
    exact.add(m.saveId);
  }
  return true;
}

/**
 * "Load online save": download it, check it (validated, migrated, refused when it's a newer build's), store it in the
 * autosave slot and resume that very state as Settings › Saves' Load does (the offline catch-up, the welcome-back card).
 * This device's game is saved first and so stays in the slot's backup, "Previous autosave": when it's the same
 * aquarium it is kept under a new identity, since the backup lists only a different aquarium. If saving this device's
 * copy fails, nothing is loaded. Returns whether the online copy is now the game on screen.
 */
export async function loadOnlineCopy(): Promise<boolean> {
  const p = useCloud.getState().prompt;
  const u = user();
  if (!p || !u || useCloud.getState().choosing) return false;
  useCloud.setState({ choosing: true });
  try {
    const got = await socialService().cloudDownload(u.id);
    if (user()?.id !== u.id) return false; // signed out, or in as someone else, meanwhile (the review's note 2)
    if (!got) {
      useCloud.setState({ prompt: null });
      void checkOnline();
      return false;
    }
    const text = await decodeSaveBody(got);
    const check = await importSaveText(text); // validate first: a refused copy changes nothing on this device
    if (!check.ok || !check.state) {
      useUI.getState().toast(check.error ?? LOAD_FAILED, 'danger');
      return false;
    }
    const incoming = check.state;
    const g = useGame.getState().game;
    if (!(await keepAutosavedAquariums([incoming, ...(g && !g.isShowcase ? [g] : [])]))) return false;
    if (user()?.id !== u.id) return false;
    // this device's game into the autosave slot, so storing the online copy rotates it into the backup; the same
    // aquarium as a kept copy (chunk 9: one write, not two, so nothing else is pushed out), as the backup lists only
    // another aquarium
    if (g && !g.isShowcase) {
      const saved = await saveCurrentGame('auto', { flush: true, toast: false, asKept: g.saveId === incoming.saveId });
      // another tab played this aquarium further ('stale'): loading goes on (that tab still has its copy on screen,
      // and is asked there); the copy stored here may be written over, as any load from this tab would
      if (!saved.ok && saved.code !== 'stale') {
        useUI.getState().toast(saved.message, 'danger');
        return false;
      }
    }
    if (user()?.id !== u.id) return false;
    const previous = readLink(u.id);
    // the link first: the game's identity changes below, and the check that follows must find it in step
    writeLink(u.id, { revision: got.meta.revision, saveId: incoming.saveId, savedAt: got.meta.savedAt, sentAt: Date.now() });
    const imported = await importSaveText(text, 'auto');
    if (!imported.ok || !imported.state) {
      writeLink(u.id, previous);
      useUI.getState().toast(imported.error ?? LOAD_FAILED, 'danger');
      return false;
    }
    resumeState(imported.state);
    // the link's time after the game on screen changed, so the change itself doesn't count as this device's play
    writeLink(u.id, { revision: got.meta.revision, saveId: incoming.saveId, savedAt: got.meta.savedAt, sentAt: Date.now() });
    useUI.getState().set({ hudHidden: false, cameraMode: 'front' });
    expected = got.meta.revision;
    inStep = true;
    useCloud.setState({ prompt: null });
    return true;
  } catch (e) {
    if (isAccountError(e)) {
      accountChanged(); // nothing changed on this device; the box closes with the account it was for
      return false;
    }
    useUI.getState().toast(isSocialError(e) ? SOCIAL_COPY.errorNetwork : LOAD_FAILED, 'danger');
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
  // chunk 9 (B2): another tab signed out or in; a refocus that repeats the same account changes nothing
  const offSession = socialService().onSessionChange?.((account) => {
    if (account !== (user()?.id ?? null)) accountChanged();
  });
  if (offSession) offs.push(offSession);
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
      // autosave skips the hidden save when one landed moments ago (useAutosave's leaveSaveDue): that one is the copy
      const skipped = !leaveSaveDue();
      noteLocalSave(g.saveId, Date.now()); // the hidden save (autosave's) is landing now
      sendOnNextSave = true;
      if (hiddenTimer) clearTimeout(hiddenTimer);
      hiddenTimer = setTimeout(
        () => {
          hiddenTimer = null;
          if (!sendOnNextSave) return;
          sendOnNextSave = false;
          // no hidden save landed: send anyway when autosave skipped it; when it was refused or failed, keep nothing
          // online that this device didn't keep
          if (skipped) void sendNow();
        },
        skipped ? 0 : HIDDEN_SEND_WAIT_MS,
      );
    } else if (hiddenAt !== null) {
      const away = Date.now() - hiddenAt;
      hiddenAt = null;
      if (away < RETURN_CHECK_MS) return;
      // who is signed in wasn't known for want of a connection: ask again (a sign-in found starts its own check)
      if (useSocial.getState().offline) void loadSocialUser(true);
      else void checkOnline();
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

/** Dev hooks and e2e: the game on screen is online when this resolves (after any check or send under way). */
export async function cloudSyncNow(): Promise<void> {
  await loadSocialUser();
  if (checkP) await checkP;
  if (!inStep) await checkOnline();
  if (sendP) await sendP; // the check's own first send, or one already under way
  await sendNow();
}

/** Tests: a fresh session (and where the link lives, where the picture comes from). */
export function resetCloudSync(opts: { storage?: KV | null; snapshot?: () => Promise<string | null> } = {}): void {
  clearTimers();
  started = false;
  inStep = recheck = sendAgain = sendOnNextSave = false;
  blockedFor = null;
  lastTried = null;
  checkP = sendP = null;
  expected = 0;
  lastSentAt = lastCheckAt = lastSnapshotAt = -Infinity;
  hiddenAt = null;
  kvOverride = opts.storage ?? null;
  snapshotSource = opts.snapshot ?? defaultSnapshot;
  useCloud.setState({ status: 'idle', prompt: null, choosing: false, syncedAt: null });
}

/** Tests: is sending blocked for the signed-in account this session (a newer build's online save)? */
export const cloudBlocked = (): boolean => isBlocked();
