// @vitest-environment node
/**
 * lane:core (BACKLOG B-165) — stored settings are read as this build can use them: a value of the wrong type (a null,
 * a string, a number that isn't finite) gets its default and a number outside what the game offers is held inside it,
 * so nothing unreadable reaches the Settings panel (`cameraSensitivity.toFixed`), the camera or the audio gains, and
 * nothing unreadable is written back.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings, useSettings, type Settings } from '@/state/settings';

/** What localStorage would hand back for `v`: through JSON, as `load` reads it. */
const stored = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('B-165: stored settings are checked when they load', () => {
  it('keeps every well-formed setting exactly as stored', () => {
    const mine: Settings = {
      volume: { master: 0.25, music: 0, aquarium: 1, ui: 0.6 },
      muted: true,
      quality: 'ultra',
      qualityAuto: false,
      reducedMotion: true,
      advancedWater: true,
      tempUnit: 'F',
      textScale: 1.15,
      highContrast: true,
      autosave: false,
      showTutorialHints: false,
      devMode: true,
      partyUseMicrophone: true,
      cameraSensitivity: 1.7,
    };
    expect(sanitizeSettings(stored(mine))).toEqual(mine);
  });

  it('a null camera sensitivity (the Settings panel crash) and other wrong types get their defaults', () => {
    const s = sanitizeSettings(
      stored({
        cameraSensitivity: null,
        textScale: 'big',
        muted: 'yes',
        autosave: 0,
        quality: 'extreme',
        tempUnit: 'K',
        volume: { master: null, music: '0.5', aquarium: {}, ui: [] },
      }),
    );
    expect(s.cameraSensitivity).toBe(DEFAULT_SETTINGS.cameraSensitivity);
    expect(s.cameraSensitivity.toFixed(1)).toBe('1.0');
    expect(s.textScale).toBe(DEFAULT_SETTINGS.textScale);
    expect(s.muted).toBe(DEFAULT_SETTINGS.muted);
    expect(s.autosave).toBe(DEFAULT_SETTINGS.autosave);
    expect(s.quality).toBe(DEFAULT_SETTINGS.quality);
    expect(s.tempUnit).toBe(DEFAULT_SETTINGS.tempUnit);
    expect(s.volume).toEqual(DEFAULT_SETTINGS.volume);
  });

  it('numbers that are not finite get their defaults, and numbers out of range are held inside it', () => {
    // JSON has no NaN or Infinity of its own, but 1e999 reads as Infinity
    const s = sanitizeSettings(JSON.parse('{"cameraSensitivity":1e999,"textScale":-1e999,"volume":{"master":7,"music":-3,"aquarium":1e999,"ui":0.4}}'));
    expect(s.cameraSensitivity).toBe(DEFAULT_SETTINGS.cameraSensitivity);
    expect(s.textScale).toBe(DEFAULT_SETTINGS.textScale);
    expect(s.volume).toEqual({ master: 1, music: 0, aquarium: DEFAULT_SETTINGS.volume.aquarium, ui: 0.4 });
    expect(sanitizeSettings({ cameraSensitivity: 50 }).cameraSensitivity).toBe(2);
    expect(sanitizeSettings({ cameraSensitivity: 0 }).cameraSensitivity).toBe(0.4);
    expect(sanitizeSettings({ textScale: 9 }).textScale).toBe(1.3);
    expect(sanitizeSettings({ textScale: 0.1 }).textScale).toBe(0.9);
    for (const size of [0.9, 1, 1.15, 1.3]) expect(sanitizeSettings({ textScale: size }).textScale, 'the four sizes Settings offers').toBe(size);
    expect(sanitizeSettings({ cameraSensitivity: Number.NaN }).cameraSensitivity).toBe(DEFAULT_SETTINGS.cameraSensitivity);
  });

  it('a missing volume, or one that is not an object, is the default mix; a partial one fills in', () => {
    expect(sanitizeSettings({}).volume).toEqual(DEFAULT_SETTINGS.volume);
    expect(sanitizeSettings({ volume: 3 }).volume).toEqual(DEFAULT_SETTINGS.volume);
    expect(sanitizeSettings({ volume: null }).volume).toEqual(DEFAULT_SETTINGS.volume);
    expect(sanitizeSettings({ volume: { music: 0.1 } }).volume).toEqual({ ...DEFAULT_SETTINGS.volume, music: 0.1 });
  });

  it('qualityAuto stays absent unless it was stored as a boolean (the rule for settings saved before Auto reads that)', () => {
    expect('qualityAuto' in sanitizeSettings({ quality: 'low' })).toBe(false);
    expect('qualityAuto' in sanitizeSettings({ quality: 'low', qualityAuto: 'yes' })).toBe(false);
    expect('qualityAuto' in sanitizeSettings({ quality: 'low', qualityAuto: null })).toBe(false);
    expect(sanitizeSettings({ qualityAuto: true }).qualityAuto).toBe(true);
    expect(sanitizeSettings({ qualityAuto: false }).qualityAuto).toBe(false);
  });

  it('what is not settings at all reads as the defaults', () => {
    for (const junk of [null, undefined, 7, 'settings', true, [], [{ muted: true }]]) {
      expect(sanitizeSettings(junk)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('a key this build does not know rides along unchanged (a newer build may have stored it), inside volume too', () => {
    const s = sanitizeSettings({ muted: true, someLaterSetting: { a: 1 }, volume: { music: 0.2, voice: 0.3 } }) as Settings & { someLaterSetting?: unknown };
    expect(s.muted).toBe(true);
    expect(s.someLaterSetting).toEqual({ a: 1 });
    // the fresh review's blocker 2: the old load kept a later build's `volume.voice`; so must this
    expect(s.volume).toEqual({ ...DEFAULT_SETTINGS.volume, music: 0.2, voice: 0.3 });
  });

  it('the result never carries a value JSON would write back as unreadable', () => {
    const s = sanitizeSettings(JSON.parse('{"cameraSensitivity":1e999,"textScale":null,"volume":{"master":"loud"}}'));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(Object.values(s.volume).every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe('B-165: what the game sets is what a load would keep', () => {
  const before = { ...useSettings.getState() };
  afterEach(() => useSettings.setState(before));

  it('update holds a number in range and leaves a setting as it is when the value is the wrong type', () => {
    const { update } = useSettings.getState();
    update({ cameraSensitivity: 1.4, textScale: 1.15, muted: true, tempUnit: 'F' });
    expect(useSettings.getState()).toMatchObject({ cameraSensitivity: 1.4, textScale: 1.15, muted: true, tempUnit: 'F' });
    update({ cameraSensitivity: 99 });
    expect(useSettings.getState().cameraSensitivity).toBe(2);
    update({ cameraSensitivity: Number.NaN, textScale: null as unknown as number, muted: 'no' as unknown as boolean, tempUnit: 'K' as unknown as 'C' });
    expect(useSettings.getState()).toMatchObject({ cameraSensitivity: 2, textScale: 1.15, muted: true, tempUnit: 'F' });
  });

  it('update still treats a picked quality as a choice and Auto as Auto', () => {
    const { update } = useSettings.getState();
    update({ quality: 'low' });
    expect(useSettings.getState()).toMatchObject({ quality: 'low', qualityAuto: false });
    update({ qualityAuto: true });
    expect(useSettings.getState().qualityAuto).toBe(true);
    expect(['low', 'medium', 'high', 'ultra']).toContain(useSettings.getState().quality);
    update({ quality: 'extreme' as unknown as 'low' });
    expect(['low', 'medium', 'high', 'ultra'], 'a level that is not one changes nothing').toContain(useSettings.getState().quality);
  });

  it('setVolume holds a volume between 0 and 1 and ignores one that is not a number', () => {
    const { setVolume } = useSettings.getState();
    setVolume('music', 0.3);
    expect(useSettings.getState().volume.music).toBe(0.3);
    setVolume('music', 7);
    expect(useSettings.getState().volume.music).toBe(1);
    setVolume('music', Number.NaN);
    expect(useSettings.getState().volume.music).toBe(1);
    setVolume('music', -2);
    expect(useSettings.getState().volume.music).toBe(0);
  });
});

describe('B-165: the stored text, as the game reads it when it starts', () => {
  const KEY = 'aquarium-go.settings.v1';
  /** The settings store, loaded afresh with `text` in localStorage (null: nothing stored). */
  async function startWith(text: string | null) {
    const kept = new Map<string, string>(text === null ? [] : [[KEY, text]]);
    vi.stubGlobal('localStorage', { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) });
    vi.resetModules();
    const mod = await import('@/state/settings');
    return { settings: mod.useSettings.getState(), kept, defaults: mod.DEFAULT_SETTINGS };
  }
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('a null camera sensitivity, a string switch and a volume of 7 load as usable settings, and are written back so', async () => {
    const { settings, kept } = await startWith('{"cameraSensitivity":null,"autosave":"false","volume":{"master":7},"textScale":null,"quality":"low","qualityAuto":false}');
    expect(settings.cameraSensitivity).toBe(1);
    expect(settings.autosave).toBe(true);
    expect(settings.volume.master).toBe(1);
    expect(settings.textScale).toBe(1);
    expect(settings.quality).toBe('low');
    settings.update({ muted: true });
    const written = JSON.parse(kept.get(KEY)!) as Record<string, unknown>;
    expect(written).toMatchObject({ cameraSensitivity: 1, autosave: true, textScale: 1, muted: true, quality: 'low', qualityAuto: false });
    expect((written.volume as Record<string, unknown>).master).toBe(1);
  });

  it('settings saved before Auto existed: low and ultra were choices and stay; the old defaults become Auto', async () => {
    const low = (await startWith('{"quality":"low"}')).settings;
    expect(low).toMatchObject({ quality: 'low', qualityAuto: false });
    const ultra = (await startWith('{"quality":"ultra"}')).settings;
    expect(ultra).toMatchObject({ quality: 'ultra', qualityAuto: false });
    const high = (await startWith('{"quality":"high"}')).settings;
    expect(high.qualityAuto).toBe(true);
    // a stored qualityAuto that isn't a boolean reads as absent: the same rule
    const junk = (await startWith('{"quality":"low","qualityAuto":"yes"}')).settings;
    expect(junk).toMatchObject({ quality: 'low', qualityAuto: false });
  });

  it('text that is not settings at all starts from the defaults', async () => {
    // (the quality level is the device's own pick, so it isn't compared; in a browser these also start on Auto)
    for (const text of ['null', '7', '"settings"', '[]', '{not json', '']) {
      const { settings, defaults } = await startWith(text);
      expect(settings, text).toMatchObject({ ...defaults, quality: settings.quality });
    }
    const { settings, defaults } = await startWith(null);
    expect(settings).toMatchObject({ ...defaults, quality: settings.quality });
  });
});

