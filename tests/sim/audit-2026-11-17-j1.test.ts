// @vitest-environment node
/**
 * Audit 2026-11-17, area J (the words, game-wide), first half: J1 to J20. One describe per finding.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameEvent, GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { useSettings } from '@/state/settings';
import { convertTempText, convertSourceTempText, formatTempDelta } from '@/ui/common/format';
import { eventLine } from '@/ui/common/notify';
import { tankStatusReason } from '@/ui/common/tankStatus';
import { planNotification } from '@/ui/notify/rules';
import { notReadyText } from '@/ui/panels/livestock/Production';
import type { LineView } from '@/sim/production/view';
import { EquipRow } from '@/ui/panels/market/Supplies';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getSpecies } from '@/data/species';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const base = (): GameState => newGame({ starterId: 'betta', starterName: 'Ember', seed: 8 });

/** °F for store reads and for a server render (which reads the store's initial state, not its current one). */
const useF = () => {
  useSettings.getState().update({ tempUnit: 'F' });
  useSettings.getInitialState().tempUnit = 'F';
};

afterEach(() => {
  useSettings.getState().update({ tempUnit: 'C' });
  useSettings.getInitialState().tempUnit = 'C';
});

describe('J1: a player on °F reads °F in the log, the bell, notifications and the other places the sim’s °C reached', () => {
  const hot: Pick<GameEvent, 'text' | 'byName'> = { text: 'Kitchen tank is 31.0 °C — too warm for neon tetras. Check the heater/chiller settings.' };

  it('the log, the bell and Lines (eventLine) follow the setting; a shared shop keeps the member’s name in front', () => {
    expect(eventLine(hot)).toBe('Kitchen tank is 31 °C — too warm for neon tetras. Check the heater/chiller settings.');
    useSettings.getState().update({ tempUnit: 'F' });
    expect(eventLine(hot)).toBe('Kitchen tank is 87.8 °F — too warm for neon tetras. Check the heater/chiller settings.');
    expect(eventLine({ ...hot, byName: 'Sam' })).toBe('Sam: Kitchen tank is 87.8 °F — too warm for neon tetras. Check the heater/chiller settings.');
    // a difference stays a difference
    expect(eventLine({ text: 'The water in Display has cooled by 2 °C — like the first cool rains of the season.' })).toBe('The water in Display has cooled by 4 °F — like the first cool rains of the season.');
  });

  it('the tank bar, the bell and Tanks read the status reason in °F', () => {
    const g = base();
    const t = g.tanks[g.tankOrder[0]];
    t.cache.status = 'danger';
    t.cache.statusReasons = ['Water is too warm: 31.0 °C (bettas tolerate up to 30 °C, ideally 24.5–28 °C).'];
    expect(tankStatusReason(g, t.id)).toBe('Water is too warm: 31 °C (bettas tolerate up to 30 °C, ideally 24.5–28 °C).');
    useSettings.getState().update({ tempUnit: 'F' });
    expect(tankStatusReason(g, t.id)).toBe('Water is too warm: 87.8 °F (bettas tolerate up to 86 °F, ideally 76.1–82.4 °F).');
    expect(tankStatusReason(g, t.id, { unit: 'C' })).toMatch(/31 °C/);
  });

  it('a care notification’s body is in the unit the lookups carry', () => {
    const look = { hour: 100, tankName: (id: string) => (id === 't1' ? 'Kitchen tank' : null), tempUnit: 'F' as const };
    const e: GameEvent = { id: 'e1', hour: 100, kind: 'danger', tankId: 't1', text: 'Kitchen tank is 31.0 °C — too warm for neon tetras. Check the heater/chiller settings.' };
    expect(planNotification(e, look)?.body).toBe('Kitchen tank is 87.8 °F — too warm for neon tetras. Check the heater/chiller settings.');
    expect(planNotification({ ...e, notice: { topic: 'care', vars: {} } }, look)?.body).toMatch(/87\.8 °F/);
    expect(planNotification(e, { ...look, tempUnit: undefined })?.body).toMatch(/31 °C/);
  });

  it('differences the converter used to read as temperatures: “Cools 1–2 °C”, “drop about 2 °C”, a signed “−1 °C”', () => {
    const f = (s: string) => convertTempText(s, 'F');
    expect(f('Cools 1–2 °C by evaporation — a mild fix for a slightly warm tank, not a chiller.')).toBe('Cools 2–4 °F by evaporation — a mild fix for a slightly warm tank, not a chiller.');
    expect(f('Cools about 1.5 °C — enough to keep axolotls under 21 °C.')).toBe('Cools about 3 °F — enough to keep axolotls under 70 °F.');
    expect(f('Cools only about 1 °C: axolotls need 21 °C or less')).toBe('Cools only about 2 °F: axolotls need 70 °F or less');
    expect(f('the water needs to drop about 2 °C to feel like the first cool rains.')).toBe('the water needs to drop about 4 °F to feel like the first cool rains.');
    expect(f('(about −1 °C, gentle)')).toBe('(about −2 °F, gentle)');
    // absolute temperatures are untouched by the new rules
    expect(f('needs 24 °C+')).toBe('needs 75 °F+');
    expect(formatTempDelta(2, 'F')).toBe('4 °F');
    expect(formatTempDelta(2, 'C')).toBe('2 °C');
  });

  it('a source’s facts show in the player’s unit, whichever unit the source quoted', () => {
    expect(convertSourceTempText('68–78 °F, pH 5.5–7.0, KH 4–8', 'C')).toBe('20–26 °C, pH 5.5–7.0, KH 4–8');
    expect(convertSourceTempText('68–78 °F, pH 5.5–7.0, KH 4–8', 'F')).toBe('68–78 °F, pH 5.5–7.0, KH 4–8');
    expect(convertSourceTempText('24–30 °C · ~80 °F', 'F')).toBe('75–86 °F · ~80 °F');
    expect(convertSourceTempText('24–30 °C · ~80 °F', 'C')).toBe('24–30 °C · ~27 °C');
  });

  it('a production line’s “not ready” line (Livestock and Operations › Lines) is in the player’s unit', () => {
    const v = { next: { notReady: { tank: { name: 'Breed Tank', water: { tempC: 28 } }, drag: 'too_warm', who: { name: 'Ember' } } }, sp: { breeding: { conditions: { maxTempC: 26 } }, tempC: { min: 24, max: 30 } } } as unknown as LineView;
    expect(notReadyText(v)).toBe('Breed Tank is too warm for spawning (28 °C; they spawn below 26 °C)');
    useSettings.getState().update({ tempUnit: 'F' });
    expect(notReadyText(v)).toBe('Breed Tank is too warm for spawning (82 °F; they spawn below 79 °F)');
  });

  it('Market › Supplies: an equipment description is in the player’s unit (an absolute and a difference)', () => {
    const g = base();
    useF();
    const row = (id: string) => text(renderToStaticMarkup(createElement(EquipRow, { g, e: getEquipmentDef(id)!, fits: true, installed: false, tankId: g.tankOrder[0] })));
    expect(row('chiller_mini')).toMatch(/suffer above about 70 °F/);
    expect(row('fan_clip')).toMatch(/about 2–4 °F of cooling/);
    expect(row('fan_clip')).not.toMatch(/°C/);
  });

  it('the zebra danio’s range has both ends in °C, so both convert', () => {
    const fact = getSpecies('zebra_danio').encyclopedia.funFact;
    expect(convertTempText(fact, 'F')).toMatch(/from 76\.3 °F to 101\.5 °F/);
  });
});
