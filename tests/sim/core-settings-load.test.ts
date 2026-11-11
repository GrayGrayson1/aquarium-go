// @vitest-environment node
/**
 * lane:core (BACKLOG B-165) — stored settings are read as this build can use them: a value of the wrong type (a null,
 * a string, a number that isn't finite) gets its default and a number outside what the game offers is held inside it,
 * so nothing unreadable reaches the Settings panel (`cameraSensitivity.toFixed`), the camera or the audio gains, and
 * nothing unreadable is written back.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '@/state/settings';

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
    expect(sanitizeSettings({ textScale: 9 }).textScale).toBe(1.4);
    expect(sanitizeSettings({ textScale: 0.1 }).textScale).toBe(0.85);
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

  it('a key this build does not know rides along unchanged (a newer build may have stored it)', () => {
    const s = sanitizeSettings({ muted: true, someLaterSetting: { a: 1 } }) as Settings & { someLaterSetting?: unknown };
    expect(s.muted).toBe(true);
    expect(s.someLaterSetting).toEqual({ a: 1 });
  });

  it('the result never carries a value JSON would write back as unreadable', () => {
    const s = sanitizeSettings(JSON.parse('{"cameraSensitivity":1e999,"textScale":null,"volume":{"master":"loud"}}'));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(Object.values(s.volume).every((v) => Number.isFinite(v))).toBe(true);
  });
});
