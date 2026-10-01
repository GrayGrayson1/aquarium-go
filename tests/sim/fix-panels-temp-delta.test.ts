/**
 * UI-B R08-02: with °F selected, temperature *differences* in sim copy ("at least 1 °C below the chiller", "has cooled
 * by 2 °C") scale by 1.8 with no +32 offset; absolute values — including "below ~21 °C" in species data — stay absolute.
 */
import { describe, it, expect } from 'vitest';
import { convertTempText } from '@/ui/common/format';

const f = (s: string) => convertTempText(s, 'F');

describe('convertTempText differences vs absolute temperatures', () => {
  it('converts differences without the +32 offset', () => {
    expect(f('Set the heater at least 1 °C below the chiller setting.')).toBe('Set the heater at least 2 °F below the chiller setting.');
    expect(f('a clip-on fan for 1–2 °C of evaporative cooling.')).toBe('a clip-on fan for 2–4 °F of evaporative cooling.');
    expect(f('The water in Display has cooled by 2 °C — like the first cool rains.')).toBe('The water in Display has cooled by 4 °F — like the first cool rains.');
    expect(f('Chill the water by ~2 °C to trigger courtship.')).toBe('Chill the water by ~4 °F to trigger courtship.');
    expect(f('A cool water change (~2 °C cooler) often triggers spawning.')).toBe('A cool water change (~4 °F cooler) often triggers spawning.');
    expect(f('the new water shifted the temperature by 0.4 °C')).toBe('the new water shifted the temperature by 0.7 °F');
  });

  it('keeps absolute temperatures absolute, even after "~" or before "is warmer"', () => {
    expect(f('breeding slows below ~21 °C')).toBe('breeding slows below ~70 °F');
    expect(f('Development above ~27 °C can sex-reverse genetic females')).toBe('Development above ~81 °F can sex-reverse genetic females');
    expect(f('26.5 °C is warmer than ideal (24–28 °C).')).toBe('79.7 °F is warmer than ideal (75–82 °F).');
    expect(f('The heater (27.0 °C) and chiller (24.0 °C) are fighting. Set the heater at least 1 °C below the chiller.')).toBe(
      'The heater (80.6 °F) and chiller (75.2 °F) are fighting. Set the heater at least 2 °F below the chiller.',
    );
    expect(f('needs 24 °C+')).toBe('needs 75 °F+');
  });

  it('leaves °C text alone (tidied) when the unit is C', () => {
    expect(convertTempText('cooled by 2.0 °C', 'C')).toBe('cooled by 2 °C');
  });
});
