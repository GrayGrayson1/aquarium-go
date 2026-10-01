/**
 * Audio director: watches game/UI/settings/runtime state and steers ambience, music mood, room reverb, the
 * view-dependent mix, log-driven event cues, tank visual-event sounds and party mode. OWNER: lane "audio".
 * Runs a light 5 Hz poll (no per-frame work) plus store subscriptions for immediate reactions.
 */
import { useGame, getGame } from '@/state/game';
import { useUI, getUI } from '@/state/ui';
import { useSettings, getSettings } from '@/state/settings';
import { runtime } from '@/runtime/tankRuntime';
import type { VisualEvent } from '@/types';
import { busAudible, onEngineReady, setMix, setRoom, isRunning, type Engine, type MixTargets } from './engine';
import { Ambience } from './ambience';
import { Music } from './music';
import { sfx, lastPlayed, type SfxId } from './sfx';
import { startPartyMode, stopPartyMode } from './party';
import { CueLimiter, diffLog, type LogCursor } from './cues';
import { chooseMood, facilitySoundProfile, isNight, NightGate, roomFor, ROOMS, tankSoundProfile, visitorPresence, SILENT_PROFILE } from './soundscape';
import type { MusicMood } from './theory';
import { getAudioStatus, setAudioStatus } from './store';

let ambience: Ambience | null = null;
let music: Music | null = null;
let refs = 0;
let poll: ReturnType<typeof setInterval> | null = null;
let fastPoll: ReturnType<typeof setInterval> | null = null;
const unsubs: (() => void)[] = [];
let visitorOverride: number | null = null;
let forcedMood: MusicMood | null = null;
let pendingMood: MusicMood | null = null;
let pendingSince = 0;
let appliedMood: MusicMood | null = null;
let appliedAt = 0;
let appliedView = '';
let lastScreen = '';
let lastSaveId: string | null = null;
const nightGate = new NightGate();
let cursor: LogCursor = { saveId: null, lastId: null };
const limiter = new CueLimiter(700);
let lastFoodCount = -1;
let lastFoodTank: string | null = null;
let lastEventT = typeof performance !== 'undefined' ? performance.now() / 1000 : 0;
let lastTargets: Record<string, unknown> = {};

/** Facility lane hook: exact visitor presence 0..1 (null = estimate from game state). */
export function setVisitorPresence(v: number | null): void {
  visitorOverride = v === null ? null : Math.max(0, Math.min(1, v));
}

/** Dev/sandbox: force a music mood (null = automatic). */
export function forceMood(m: MusicMood | null): void {
  forcedMood = m;
  update();
}

const MIX_TANK: MixTargets = { tankLevel: 1, roomLevel: 0.45, distanceHz: 16000, aquariumSend: 0.1, musicSend: 0.38, uiSend: 0.18 };
const MIX_FACILITY: MixTargets = { tankLevel: 0.5, roomLevel: 1, distanceHz: 2600, aquariumSend: 0.3, musicSend: 0.45, uiSend: 0.22 };
const MIX_TITLE: MixTargets = { tankLevel: 0.55, roomLevel: 0.5, distanceHz: 5000, aquariumSend: 0.25, musicSend: 0.5, uiSend: 0.2 };
/** Quick panel flicks (a glance at the market) must not restart the score. */
const MOOD_DEBOUNCE_MS = 1500;
const PANEL_MOOD_DEBOUNCE_MS = 3000;
/** A mood keeps playing at least this long before an automatic change (not a screen/view/panel switch, not party). */
const MOOD_MIN_DWELL_MS = 12000;

function update(): void {
  try {
    if (!ambience || !music) return;
    const game = getGame();
    const ui = getUI();
    const party = getAudioStatus().partyStatus;
    const partyOn = ui.partyMode && party !== 'off';
    const inMenus = ui.screen === 'title' || ui.screen === 'starter' || ui.screen === 'naming';
    const tankId = ui.focusedTankId ?? game?.tankOrder?.[0] ?? null;
    const tank = game && tankId ? game.tanks[tankId] : null;
    const view = ui.view;
    const active = ui.screen !== 'boot' && !!game;
    const now = performance.now();
    const screenChanged = ui.screen !== lastScreen;
    lastScreen = ui.screen;
    const saveId = game?.saveId ?? null;
    if (saveId !== lastSaveId || screenChanged) {
      lastSaveId = saveId;
      nightGate.reset();
    }
    // a bus at zero volume costs no DSP: the ambience tears its layers down, the score goes quiet (S15-07)
    const aquariumOn = busAudible('aquarium');
    const musicOn = busAudible('music');
    const profile = !game ? SILENT_PROFILE : view === 'tank' ? tankSoundProfile(tank) : facilitySoundProfile(game);
    const room = inMenus && !game ? ROOMS.title : roomFor(game?.facility?.level);
    const nightRaw = isNight(game, view === 'tank' ? tank : null);
    const night = nightGate.update(nightRaw, game?.clock?.speed ?? 0, now);
    const visitors = inMenus ? 0 : visitorOverride ?? visitorPresence(game);
    const master = partyOn ? (party === 'microphone' ? 0.3 : 0.5) : inMenus ? 0.75 : 1;
    const waterPresence = !game ? 0 : view === 'tank' ? (tank ? 1 : 0) : Math.min(1, (game.tankOrder?.length ?? 0) * 0.4);
    ambience.update({ active: active && aquariumOn, profile, room, roomTone: night ? 0.6 : 1, visitors, waterPresence, master });
    setRoom(room);
    setMix(inMenus ? MIX_TITLE : view === 'facility' ? MIX_FACILITY : ui.photoMode ? { ...MIX_TANK, tankLevel: 0.85 } : MIX_TANK);

    // mood (debounced so quick panel flicks don't thrash the score; day/night already passed the NightGate)
    const chosen = forcedMood ?? chooseMood({ screen: ui.screen, view, panel: ui.panel, partyMode: ui.partyMode, night, hasGame: !!game });
    const want: MusicMood = forcedMood === null && !musicOn && chosen !== 'party' ? 'off' : chosen;
    if (want !== pendingMood) {
      pendingMood = want;
      pendingSince = now;
    }
    const immediate = screenChanged || appliedMood === null || appliedMood === 'off' || want === 'party' || appliedMood === 'party' || forcedMood !== null;
    const panelDriven = want === 'market' || appliedMood === 'market';
    const settled = now - pendingSince > (panelDriven ? PANEL_MOOD_DEBOUNCE_MS : MOOD_DEBOUNCE_MS) && (panelDriven || want === 'off' || view !== appliedView || now - appliedAt > MOOD_MIN_DWELL_MS);
    if (want !== appliedMood && (immediate || settled)) {
      appliedMood = want;
      appliedAt = now;
      appliedView = view;
      music.setMood(want);
      setAudioStatus({ mood: want });
    }
    lastTargets = { active, view, tankId, room: room.id, night, nightRaw, visitors: +visitors.toFixed(2), master, profile, aquariumOn, musicOn };
  } catch (err) {
    console.warn('[audio] director update failed', err);
  }
}

/** Fast (~12 Hz) runtime watcher: food particles appearing and tank visual events → sounds with low latency. */
function fastUpdate(): void {
  try {
    if (!ambience || !isRunning()) return;
    const ui = getUI();
    const game = getGame();
    if (!game || ui.screen !== 'game') return;
    const tankId = ui.focusedTankId ?? game.tankOrder?.[0] ?? null;
    watchRuntime(ui.view === 'tank' ? tankId : null);
  } catch (err) {
    console.warn('[audio] runtime watcher failed', err);
  }
}

const EVENT_SFX: Partial<Record<VisualEvent['kind'], { id: SfxId; volume: number; gapMs: number }>> = {
  tap: { id: 'tap_glass', volume: 0.9, gapMs: 400 },
  feed: { id: 'feed', volume: 0.7, gapMs: 600 },
  birth: { id: 'birth', volume: 0.7, gapMs: 3000 },
  photo: { id: 'camera', volume: 0.8, gapMs: 600 },
  wow: { id: 'visitor_wow', volume: 0.5, gapMs: 6000 },
  bubble_burst: { id: 'bubble', volume: 0.6, gapMs: 200 },
  smash: { id: 'tap_glass', volume: 0.5, gapMs: 400 },
};

function watchRuntime(tankId: string | null): void {
  // new food particles in the focused tank → a soft plop (unless the tool already played one)
  if (tankId) {
    const n = runtime.food.get(tankId)?.length ?? 0;
    if (tankId === lastFoodTank && lastFoodCount >= 0 && n > lastFoodCount && performance.now() - lastPlayed('feed') > 600) {
      sfx('feed', { volume: Math.min(1, 0.45 + (n - lastFoodCount) * 0.08) });
    }
    lastFoodCount = n;
    lastFoodTank = tankId;
  } else {
    lastFoodCount = -1;
    lastFoodTank = null;
  }
  // visual events (taps, births, photos...) that nobody voiced yet
  const since = lastEventT;
  let newest = since;
  const staleBefore = performance.now() / 1000 - 1;
  for (const ev of runtime.events) {
    if (ev.t <= since || ev.t < staleBefore) continue;
    newest = Math.max(newest, ev.t);
    if (tankId && ev.tankId !== tankId) continue;
    const map = EVENT_SFX[ev.kind];
    if (!map) continue;
    if (performance.now() - lastPlayed(map.id) < map.gapMs) continue;
    const x = ev.pos?.[0] ?? 0;
    sfx(map.id, { volume: map.volume * (tankId ? 1 : 0.5), pan: Math.max(-0.6, Math.min(0.6, x * 1.2)) });
  }
  lastEventT = Math.max(newest, performance.now() / 1000 - 0.5);
}

function onGameChange(): void {
  const s = useGame.getState();
  const g = s.game;
  if (!g) {
    cursor = { saveId: null, lastId: null };
    return;
  }
  const { fresh, cursor: next } = diffLog(cursor, g.saveId, g.log ?? []);
  cursor = next;
  if (!fresh.length || !isRunning()) return;
  if (getUI().screen !== 'game') return;
  const pick = limiter.pick(fresh, performance.now());
  if (pick) sfx(pick.spec.sfx, { volume: pick.spec.volume });
}

/** `micToggled`: the microphone setting was just switched on → ask again even after an earlier denial. */
function syncParty(micToggled = false): void {
  const ui = getUI();
  const s = getSettings();
  const status = getAudioStatus().partyStatus;
  if (ui.partyMode) {
    const wantMic = !!s.partyUseMicrophone;
    const running = status !== 'off';
    const usingMic = status === 'microphone' || status === 'requesting_mic';
    const fellBack = status === 'mic_denied' || status === 'mic_unavailable';
    const retry = wantMic && micToggled && fellBack;
    if (!running || (wantMic && !usingMic && (!fellBack || retry)) || (!wantMic && usingMic)) {
      void startPartyMode({ mic: wantMic, retry }).then(() => update());
    }
  } else if (status !== 'off') {
    stopPartyMode();
    update();
  }
}

/** Mount the director (ref-counted; AudioRoot calls this). Returns an unmount function. */
export function startDirector(): () => void {
  refs++;
  if (refs === 1) {
    unsubs.push(
      onEngineReady((e: Engine) => {
        // defer buffer generation (noise, trickle, reverb IR) out of the unlocking gesture handler
        setTimeout(() => {
          if (refs === 0) return;
          if (!ambience) ambience = new Ambience(e);
          if (!music) music = new Music(e);
          appliedMood = null;
          nightGate.reset();
          update();
        }, 0);
      }),
    );
    unsubs.push(useGame.subscribe(onGameChange));
    let prevParty = getUI().partyMode;
    unsubs.push(
      useUI.subscribe((s) => {
        if (s.partyMode !== prevParty) {
          prevParty = s.partyMode;
          syncParty();
        }
      }),
    );
    let prevMic = getSettings().partyUseMicrophone;
    unsubs.push(
      useSettings.subscribe((s) => {
        if (s.partyUseMicrophone !== prevMic) {
          prevMic = s.partyUseMicrophone;
          if (getUI().partyMode) syncParty(!!s.partyUseMicrophone);
        }
      }),
    );
    onGameChange(); // establish the log baseline silently
    if (getUI().partyMode) syncParty();
    poll = setInterval(update, 200);
    fastPoll = setInterval(fastUpdate, 80);
  }
  return () => {
    refs = Math.max(0, refs - 1);
    if (refs > 0) return;
    if (poll) clearInterval(poll);
    if (fastPoll) clearInterval(fastPoll);
    poll = null;
    fastPoll = null;
    for (const u of unsubs.splice(0)) u();
    stopPartyMode(true);
    ambience?.dispose();
    music?.dispose();
    ambience = null;
    music = null;
    appliedMood = null;
    nightGate.reset();
  };
}

export function directorInfo() {
  return {
    mounted: refs > 0,
    mood: appliedMood,
    pendingMood,
    forcedMood,
    music: music?.info() ?? null,
    ambience: ambience?.levels ?? null,
    targets: lastTargets,
    logCursor: cursor,
  };
}
