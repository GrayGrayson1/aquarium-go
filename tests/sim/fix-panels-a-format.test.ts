/**
 * Fix lane PANELS-A — speed-aware real-time countdowns (S13-02) and the portrait queue's cancellation (P3-01).
 */
import { describe, it, expect } from 'vitest';
import { realIn, realAgo, speedNote } from '@/ui/panels/common/format';
import { prewarmPortraits, requestPortrait, releasePortrait, portraitKey, portraitQueueLength } from '@/render/portraits';

describe('realIn / realAgo follow the clock speed (S13-02)', () => {
  it('reads the same as before at 1× and when paused', () => {
    expect(realIn(18)).toBe('about 3 min');
    expect(realIn(18, 1)).toBe('about 3 min');
    expect(realIn(18, 0)).toBe('about 3 min');
    expect(realAgo(12, 0)).toBe('about 2 min ago');
  });
  it('divides the real minutes by the speed', () => {
    expect(realIn(18, 3)).toBe('about 1 min');
    expect(realIn(18, 10)).toBe('under a minute');
    expect(realIn(360, 3)).toBe('about 20 min');
    expect(realIn(1080, 10)).toBe('about 18 min');
    expect(realAgo(36, 3)).toBe('about 2 min ago');
    expect(realAgo(4, 10)).toBe('just now');
  });
  it('qualifies a countdown only away from 1×', () => {
    expect(speedNote(1)).toBe('');
    expect(speedNote(3)).toBe(' at 3×');
    expect(speedNote(10)).toBe(' at 10×');
    expect(speedNote(0)).toBe(' (paused)');
  });
});

describe('portrait queue drops jobs nobody waits for (P3-01)', () => {
  // no requestAnimationFrame in node: jobs queue up and never pump, which is exactly what these checks need
  const subject = (id: string) => ({ speciesId: id });
  it('a released key with no subscriber leaves the queue; a subscribed one stays', async () => {
    const before = portraitQueueLength();
    prewarmPortraits([subject('betta'), subject('axolotl')], 64);
    expect(portraitQueueLength()).toBe(before + 2);
    releasePortrait(portraitKey(subject('betta'), 64)!);
    await Promise.resolve();
    expect(portraitQueueLength()).toBe(before + 1);
    // still waiting on the axolotl through the promise API → release must not drop it
    void requestPortrait(subject('axolotl'), { size: 64 });
    releasePortrait(portraitKey(subject('axolotl'), 64)!);
    await Promise.resolve();
    expect(portraitQueueLength()).toBe(before + 1);
    // releasing a key that was never queued is harmless
    releasePortrait('nope');
    await Promise.resolve();
    expect(portraitQueueLength()).toBe(before + 1);
  });
  it('does not queue the same key twice', () => {
    const before = portraitQueueLength();
    prewarmPortraits([subject('ocellaris_clownfish'), subject('ocellaris_clownfish')], 96);
    expect(portraitQueueLength()).toBe(before + 1);
  });
});
