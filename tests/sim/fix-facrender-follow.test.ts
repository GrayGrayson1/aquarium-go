import { describe, expect, it } from 'vitest';
import { tankSlide } from '@/render/camera/followFrame';
import { computeFreeRect } from '@/render/camera/viewport';

// S10-02: phone (390×844) follow shot of a bottom dweller, with and without the creature card (a 454 px bottom sheet).
// Numbers mirror scripts/_audit/S10/followSlide.ts (axolotl fixture: 40 gal breeder shell, 0.30 m tall).
const vw = 390;
const vh = 844;
const shell = { outerL: 0.92, bottomY: -0.02, topY: 0.31 };
const fov = 38;
const tv = Math.tan((fov * Math.PI) / 360);

function slideFor(occBottom: number) {
  const fr = computeFreeRect(vw, vh, { left: 0, right: 0, top: 0, bottom: occBottom }, true, { x0: 0, y0: 0, x1: 0, y1: 0 });
  const D = 1.68;
  const s = (2 * D * tv) / vh;
  // animal resting on the substrate near the tank centre: the view ray crosses the front face ~4 cm up
  const py = 0.04;
  const r = tankSlide({ px: 0, py, ...shell, fr, vw, vh, s });
  const ay = (fr.y0 + fr.y1) / 2;
  return { fr, dy: r.dy, animalScreenY: ay + r.dy / s };
}

describe('follow slide stays inside the free rect (S10-02)', () => {
  it('with the bottom-sheet creature card open, the subject stays inside the visible band', () => {
    const { fr, dy, animalScreenY } = slideFor(454);
    expect(fr.y1).toBeLessThan(400); // the sheet really shrinks the free rect
    expect(dy).toBeLessThan(0.12); // was 0.295 m (the whole tank height) when measured against the canvas
    expect(animalScreenY).toBeGreaterThan(fr.y0);
    expect(animalScreenY).toBeLessThan(fr.y1);
  });

  it('without a sheet the lift is small and the animal sits in the free band', () => {
    const { fr, dy, animalScreenY } = slideFor(0);
    expect(dy).toBeLessThan(0.15);
    expect(animalScreenY).toBeGreaterThan(fr.y0);
    expect(animalScreenY).toBeLessThan(fr.y1);
  });

  it('never slides a centred subject in a wide desktop frame', () => {
    const fr = computeFreeRect(1440, 900, { left: 0, right: 0, top: 0, bottom: 0 }, true, { x0: 0, y0: 0, x1: 0, y1: 0 });
    const r = tankSlide({ px: 0, py: 0.15, ...shell, fr, vw: 1440, vh: 900, s: 0.0004 });
    expect(Math.abs(r.dx)).toBeLessThan(1e-9);
    expect(Math.abs(r.dy)).toBeLessThan(1e-9);
  });
});
