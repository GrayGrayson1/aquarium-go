// @vitest-environment node
/**
 * lane:ui-panels (chunk 4; PROD-003, PROD-019, PROD-021, DES-008, ACC-004) — Livestock › Production, server-rendered:
 * the empty state (0.5 §11.1 item 5), the slot captions (ADR-0025 decision 7), one line's header, tiles, stages and
 * Line rules (DESIGN-S3D §8.6 with the 0.5 §11.1 copy), the held-up and paused notes (DESIGN-S3D §7.6, ADR-0030), the
 * first set-up step (§8.6.1) and the switches' roles and names. Copy is asserted exactly.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { useGame } from '@/state/game';
import { createLine, setLineRunning } from '@/sim/production';
import { slotsCaption } from '@/sim/production/view';
import { ProductionTab } from '@/ui/panels/livestock/Production';
import { NewLine } from '@/ui/panels/livestock/ProductionSetup';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const tag = (markup: string, testId: string) => new RegExp(`<[^>]*data-testid="${testId}"[^>]*>`).exec(markup)?.[0] ?? '';
const attr = (markup: string, testId: string, name: string) => tag(markup, testId).match(new RegExp(`${name}="([^"]*)"`))?.[1];

function shop(level: GameState['facility']['level'] = 'hobby_room') {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 41 });
  g.isShowcase = false;
  g.facility.level = level;
  const mk = (name: string, x: number, tier = 'g20L'): Tank => {
    const t = createTank(g, tier, 'freshwater_tropical', { cycled: true, placement: { x, z: 2, rotY: 0 }, name });
    t.water.tempC = 26;
    return t;
  };
  const tanks = { breed: mk('Breeding Tank', -6, 'g10'), raise: mk('Grow-out Tub', -3), quarantine: mk('Quarantine', 0), keep: mk('Quiet Corner', 3) };
  const rng = simRng(g);
  const blaze = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Blaze' }), tanks.breed.id);
  const cinder = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Cinder' }), tanks.keep.id);
  return { g, tanks, blaze, cinder, mk };
}

function line(g: GameState, s: ReturnType<typeof shop>, breedFor?: string) {
  const r = createLine(g, { motherId: s.cinder.id, fatherId: s.blaze.id, tanks: { breed: s.tanks.breed.id, raise: s.tanks.raise.id, quarantine: s.tanks.quarantine.id, keep: s.tanks.keep.id }, breedFor });
  expect(r.ok, r.message).toBe(true);
  return r.lineId!;
}

const render = (g: GameState, sel: string | null = null) => {
  useGame.setState({ game: g });
  return renderToStaticMarkup(createElement(ProductionTab, { g, sel, onSelect: () => {} }));
};

afterEach(() => useGame.setState({ game: null }));

describe('PROD-019: line slots and their caption (ADR-0025 decision 7)', () => {
  it('words the caption by level and use, with "slot" or "slots" by count', () => {
    expect(slotsCaption(0, 1, 'Hobby Room', 'Specialty Shop')).toBe('0 of 1 line slot · more at Specialty Shop');
    expect(slotsCaption(1, 1, 'Hobby Room', 'Specialty Shop')).toBe('1 of 1 line slot · more at Specialty Shop');
    expect(slotsCaption(1, 2, 'Specialty Shop', 'Aquarium Store')).toBe('1 of 2 line slots · Specialty Shop');
    expect(slotsCaption(4, 4, 'Public Showroom', 'Destination Aquarium')).toBe('4 of 4 line slots · more at Destination Aquarium');
    expect(slotsCaption(8, 8, 'Grand Hall', null)).toBe('8 of 8 line slots · Grand Hall');
  });
});

describe('PROD-003, DES-008: the Production tab', () => {
  it('no line yet: the empty state and Set up a line', () => {
    const s = shop();
    const m = render(s.g);
    expect(text(m)).toContain('No production line yet');
    expect(text(m)).toContain('Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you.');
    expect(m).toContain('data-testid="production-setup"');
    expect(text(m)).toContain('Set up a line');
    expect(text(m)).toContain('0 of 1 line slot · more at Specialty Shop');
  });

  it('one line in the Hobby Room: no strip, the 0.5 header, four tiles, five stages and three rules', () => {
    const s = shop();
    const id = line(s.g, s, 'Cambodian Veiltail');
    const m = render(s.g);
    const t = text(m);
    expect(m).not.toContain('role="tablist"');
    expect(t).toContain('1 of 1 line slot · more at Specialty Shop');
    expect(t).toContain('Betta line');
    expect(t).toContain('Running');
    expect(t).toContain('Breeds, raises and sells Cambodian Veiltail bettas while you play.');
    expect(attr(m, 'production-toggle', 'role')).toBe('switch');
    expect(attr(m, 'production-toggle', 'aria-checked')).toBe('true');
    expect(attr(m, 'production-toggle', 'aria-label')).toBe('Betta line running');
    for (const label of ['Next clutch', 'Growing out', 'Quarantine', 'This week']) expect(t).toContain(label);
    expect(t).toContain('Pair conditioning');
    expect(t).toContain('$0 0 sold $0 after food and power');
    for (const s2 of ['breed', 'raise', 'sort', 'quarantine', 'sell']) expect(m).toContain(`data-testid="production-stage-${s2}"`);
    expect(t).toContain('Cinder × Blaze · spawns about every 10 days');
    expect(t).toContain('Waiting for the next clutch');
    expect(t).toContain('Keep Prismatic Sell the rest');
    expect(t).toContain('Free');
    expect(t).toContain('Auctions · reserve at fair value −10% Nothing listed');
    expect(t).toContain('Line rules');
    expect(t).toContain('Pause when a tank is full Stops spawning when Grow-out Tub reaches its stocking limit.');
    expect(t).toContain('Never sell Prismatic animals A Prismatic youngster always moves to Quiet Corner instead.');
    expect(t).toContain('List automatically Juveniles go to auction the day quarantine ends.');
    for (const r of ['pauseWhenFull', 'keepPrismatic', 'autoList']) {
      expect(attr(m, `production-rule-${r}`, 'role')).toBe('switch');
      expect(attr(m, `production-rule-${r}`, 'aria-checked')).toBe('true');
    }
    expect(attr(m, 'production-rule-autoList', 'aria-label')).toBe('List automatically (Betta line)');
    expect(m).toContain('data-testid="production-end-line"');
    expect(id).toBe('cambodian');
  });

  it('a free slot shows the strip with "+ New line"; several lines drop "line" and use DESIGN-S3D’s header line', () => {
    const s = shop('specialty_shop');
    line(s.g, s, 'Cambodian Veiltail');
    let m = render(s.g);
    expect(text(m)).toContain('1 of 2 line slots · Specialty Shop');
    expect(m).toContain('data-testid="production-add-line"');
    expect(m).toContain('data-testid="production-line-cambodian"');
    expect(text(m)).toContain('+ New line');
    // a second line (another pair, other tanks)
    const rng = simRng(s.g);
    const m2 = addCreature(s.g, createCreature(s.g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Sapphire' }), s.tanks.keep.id);
    const f2 = addCreature(s.g, createCreature(s.g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Iris' }), s.tanks.keep.id);
    const b2 = s.mk('Breed Tank B', 9, 'g10');
    const r2 = s.mk('Grow-out B', 12);
    expect(createLine(s.g, { motherId: f2.id, fatherId: m2.id, tanks: { breed: b2.id, raise: r2.id, quarantine: s.tanks.quarantine.id, keep: s.tanks.keep.id }, breedFor: 'Royal Blue Halfmoon' }).ok).toBe(true);
    m = render(s.g, 'royal');
    const t = text(m);
    expect(t).toContain('2 of 2 line slots · more at Aquarium Store');
    expect(m).not.toContain('data-testid="production-add-line"');
    expect(t).toContain('Cambodian Veiltail Royal Blue Halfmoon'); // the strip, without "line"
    expect(t).toContain('Royal Blue Halfmoon line');
    expect(t).toContain('Betta · Iris × Sapphire · breeds, raises and sells while you play');
  });

  it('paused by you, and a line missing a parent (ADR-0030 decision 2)', () => {
    const s = shop();
    const id = line(s.g, s);
    setLineRunning(s.g, id, false);
    let t = text(render(s.g));
    expect(t).toContain('Paused by you');
    expect(attr(render(s.g), 'production-toggle', 'aria-checked')).toBe('false');
    setLineRunning(s.g, id, true);
    const l = s.g.production!.lines[0];
    l.broken = { ref: 'mother', id: s.cinder.id, name: 'Cinder', sinceHour: s.g.clock.hour };
    const m = render(s.g);
    t = text(m);
    expect(t).toContain('Paused');
    expect(t).toContain('Betta line paused: Cinder is no longer in your care. Choose another pair, or end the line.');
    expect(m).toContain('data-testid="production-fix-pair"');
    expect(t).toContain('Choose another pair');
  });

  it('waiting for room with a batch waiting for quarantine: DESIGN-S3D’s note and Add a quarantine tank', () => {
    const s = shop();
    line(s.g, s);
    const l = s.g.production!.lines[0];
    l.waiting = true;
    l.batches = [{ id: 'b1', creatureIds: [], sortedHour: s.g.clock.hour }];
    const t = text(render(s.g));
    expect(t).toContain("Grow-out Tub is full, so Cinder and Blaze are kept apart until there's room.");
    expect(t).toMatch(/Add a quarantine tank · \$[\d,]+/);
  });
});

describe('PROD-021: setting up a line (DESIGN-S3D §8.6.1)', () => {
  it('step 1: the header, the stepper and the pairs (a pair in a line is listed but disabled)', () => {
    const s = shop('specialty_shop');
    line(s.g, s);
    const rng = simRng(s.g);
    addCreature(s.g, createCreature(s.g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Sapphire' }), s.tanks.raise.id);
    addCreature(s.g, createCreature(s.g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Iris' }), s.tanks.raise.id);
    useGame.setState({ game: s.g });
    const m = renderToStaticMarkup(createElement(NewLine, { g: s.g, onStarted: () => {} }));
    const t = text(m);
    expect(t).toContain('New line');
    expect(t).toContain('Line slot 2 of 2');
    expect(t).toContain('1 Choose a pair 2 Choose tanks 3 Rules');
    expect(attr(m, 'production-new-step-1', 'aria-current')).toBe('step');
    expect(t).toContain('Which pair breeds?');
    expect(t).toContain('Only adult pairs that can breed together are listed.');
    expect(t).toContain('Iris × Sapphire Betta · in Grow-out Tub · both adults');
    expect(t).toContain('Cinder × Blaze Betta · already runs the Betta line In a line');
    expect(t).not.toContain('Iris × Blaze'); // a line's parent isn't offered with another partner
    expect(t).toContain('Need another pair? Buy a mate, then come back. Shop');
    expect(t).toContain('Next: choose tanks');
    const pairTag = tag(m, `production-new-pair-${s.cinder.id}-${s.blaze.id}`);
    expect(pairTag).toContain('disabled');
  });
});
