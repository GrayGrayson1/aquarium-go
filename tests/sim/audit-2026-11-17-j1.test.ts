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
import { simRng } from '@/sim/rng';
import { createCreature, addCreature } from '@/sim/life';
import { devOpenMarket, devStepEconomy, createListing, previewListing, forceBuyerVisit, counterBid } from '@/sim/economy';
import { creatureShowReasons } from '@/sim/shows/eligibility';
import { readinessHint } from '@/sim/life/breeding/check';
import { youngFoodWords } from '@/sim/staff/work';
import { handFoodPhrase, FOOD_TAG_WORDS } from '@/sim/care/autofeed';
import { illnessName } from '@/sim/life/illness';
import { FOOD_TAG_NAMES } from '@/data/catalog/foods';
import { WATER_CLASS_LABEL as UI_WATER_LABEL } from '@/ui/common/format';
import { WATER_CLASS_LABEL, WATER_CLASS_WORDS } from '@/data/tankLabels';
import { CLASS_NAMES } from '@/sim/compat/text';
import { CLASS_DEFAULTS } from '@/sim/water/constants';
import { STARTER_SETUPS } from '@/sim/newGame';
import { previewAddition } from '@/sim/compat';
import { createTank } from '@/sim/tanks';
import { WaterTab } from '@/ui/cards/TankCard';
import { CompatView } from '@/ui/common/CompatView';
import { useGame } from '@/state/game';
import { useShell } from '@/ui/common/shellStore';
import { ARTICLES } from '@/ui/panels/encyclopedia/science';
import { getWaterReport } from '@/sim/water';
import { socialWord } from '@/ui/panels/common/Profile';
import { TANK_STATUS_WORD } from '@/ui/common/tankStatus';
import { ATTENTION_WORD } from '@/ui/common/notify';
import { ACHIEVEMENTS } from '@/data/achievements';

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

describe('J2: a time read outside the game is real time; a game span beside a real one says its clock', () => {
  it('a counter’s reply time and a fresh arrival say game hours (the bids beside them count real minutes)', () => {
    let said = '';
    for (let seed = 1; seed <= 40 && !said; seed++) {
      const g = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed });
      devOpenMarket(g);
      devStepEconomy(g, 0.5);
      g.finance.money = 5000;
      const c = addCreature(g, createCreature(g, simRng(g), 'axolotl', { ageDays: 60 }), g.tankOrder[0]);
      c.stats.health = 100;
      delete c.illness;
      const pv = previewListing(g, { kind: 'creature', creatureIds: [c.id] });
      const r = createListing(g, { kind: 'creature', creatureIds: [c.id], reserve: pv.suggestedReserve, buyNow: 0, durationHours: 168 });
      const l = g.market.listings.find((x) => x.id === r.listingId)!;
      for (let i = 0; i < 60 && !l.bids.some((b) => b.status === 'open') && l.status === 'active'; i++) forceBuyerVisit(g, l.id);
      const b = l.bids.find((x) => x.status === 'open');
      if (!b) continue;
      said = counterBid(g, l.id, b.id, Math.round(b.amount * 1.05)).message ?? '';
    }
    expect(said).toMatch(/\. Expect a reply in about \d+ game hours?\.$/);
    const g = base();
    const c = Object.values(g.creatures)[0];
    c.acquiredHour = g.clock.hour - 3;
    expect(creatureShowReasons(g, c).join('\n')).toMatch(/Still settling in \(arrived 3 game hours ago\)/);
  });
});

describe('J3: food advice names foods the shop sells, in one table’s words', () => {
  it('conditioning: “live snails”, not “snail live”, joined as a list', () => {
    const g = base();
    const c = { ...Object.values(g.creatures)[0], tankId: undefined } as unknown as Parameters<typeof readinessHint>[1];
    expect(readinessHint(g, c, getSpecies('pea_puffer'), g.clock.hour)).toBe('Condition them with bloodworms, live snails or brine shrimp for a day or two.');
    const v = { next: { notReady: { tank: { name: 'Breed Tank', water: { tempC: 26 } }, drag: 'conditioning', who: { name: 'Pea' } } }, sp: getSpecies('pea_puffer') } as unknown as LineView;
    expect(notReadyText(v)).toBe('they need rich food (bloodworms, live snails or brine shrimp) to get into condition');
  });

  it('the keeper’s young-food words and the hand-food examples come from the same table as the shelf', () => {
    expect(FOOD_TAG_WORDS).toBe(FOOD_TAG_NAMES);
    expect(youngFoodWords(['baby_brine', 'infusoria'])).toBe('live baby brine shrimp or infusoria');
    expect(youngFoodWords(['biofilm', 'algae_wafer', 'vegetable'])).toBe('algae wafers or blanched vegetables');
    expect(handFoodPhrase(getSpecies('lined_seahorse'))).toMatch(/mysis shrimp/);
  });

  it('an illness reads by the name the creature card gives it', () => {
    expect(illnessName('stress_coloration', getSpecies('betta'))).toBe('stress colouring');
    expect(illnessName('ich', getSpecies('ocellaris_clownfish'))).toBe('marine white spot');
    expect(illnessName('swim_bladder', getSpecies('betta'))).toBe('swim-bladder trouble');
    expect(illnessName('mystery_bug', undefined)).toBe('mystery bug');
  });
});

describe('J4: one water type, one name (a label, and the same name inside a sentence)', () => {
  it('the tank card’s chip, Tanks and Build use one table; sentences use its lower-case form', () => {
    expect(UI_WATER_LABEL).toBe(WATER_CLASS_LABEL);
    expect(WATER_CLASS_LABEL.freshwater_planted).toBe('Planted freshwater');
    expect(WATER_CLASS_LABEL.marine_fowlr).toBe('Marine fish-only');
    expect(WATER_CLASS_LABEL.marine_live_rock).toBe('Marine live rock');
    expect(CLASS_NAMES).toBe(WATER_CLASS_WORDS);
    for (const [wc, label] of Object.entries(WATER_CLASS_LABEL)) expect(WATER_CLASS_WORDS[wc as keyof typeof WATER_CLASS_WORDS].replace(/-/g, ' ')).toBe(label.toLowerCase().replace(/-/g, ' '));
    expect(CLASS_DEFAULTS.freshwater_planted.label).toBe('planted freshwater tank');
    expect(CLASS_DEFAULTS.marine_fowlr.label).toBe('marine fish-only tank');
  });

  it('each starter’s path note names its tank as the chip does (the marine ones say just “Marine”)', () => {
    for (const setup of Object.values(STARTER_SETUPS)) expect([WATER_CLASS_LABEL[setup.waterClass], 'Marine']).toContain(setup.pathNote.split(' · ')[0]);
  });

  it('a compatibility line says “planted freshwater”, not “planted tropical”', () => {
    const g = base();
    const t = createTank(g, 'g20L', 'freshwater_planted', { cycled: true });
    const r = previewAddition(g, t.id, { speciesId: 'axolotl', count: 1 });
    const line = r.reasons.map((x) => x.text).find((x) => /normally kept in/.test(x)) ?? '';
    expect(line).toMatch(/not a planted freshwater setup\./);
  });
});

describe('J5: the water and genes words point to the pages that explain them', () => {
  it('the Water tab links Parameters and the Biological filter to Aquarium science; an open row says what its short name means', () => {
    const g = base();
    const t = g.tanks[g.tankOrder[0]];
    useGame.setState({ game: g });
    useShell.getInitialState().openParam = 'ammonia'; // a server render reads the store's initial state
    try {
      const html = renderToStaticMarkup(createElement(WaterTab, { game: g, tank: t }));
      expect(html).toMatch(/data-testid="science-link-nitrogen_cycle"/);
      expect(html).toMatch(/data-testid="science-link-cycling"/);
      expect(text(html)).toMatch(/What’s the Biological filter\?/);
      expect(text(html)).toMatch(/Ammonia comes from waste and leftover food\. ppm means parts per million\. Read more/);
    } finally {
      useShell.getInitialState().openParam = null;
      useGame.setState({ game: null });
    }
  });

  it('a compatibility verdict links “Reading compatibility”', () => {
    const g = base();
    const t = createTank(g, 'g20L', 'freshwater_planted', { cycled: true });
    const html = renderToStaticMarkup(createElement(CompatView, { report: previewAddition(g, t.id, { speciesId: 'axolotl', count: 1 }) }));
    expect(html).toMatch(/data-testid="science-link-compatibility"/);
    expect(html).toMatch(/aria-label="How to read compatibility"/);
  });

  it('the nitrogen-cycle page names the meter the game shows', () => {
    const page = renderToStaticMarkup(createElement('div', null, ARTICLES.find((a) => a.id === 'nitrogen_cycle')!.body));
    expect(text(page)).toMatch(/show as the Biological filter meter on the tank card’s Water tab/);
    expect(text(page)).not.toMatch(/cycle progress/);
  });

  it('the light line says “long days of light”, not “photoperiods”', () => {
    const g = base();
    const t = g.tanks[g.tankOrder[0]];
    t.lighting.onHour = 5;
    t.lighting.offHour = 23;
    t.water.algae = 40;
    const light = getWaterReport(g, t.id).params.find((p) => p.key === 'light');
    expect(light?.reason ?? '').toMatch(/long days of light feed algae/);
  });
});

describe('J9: species pages give advice their own numbers and diets agree with', () => {
  it('temperatures, tank sizes and group sizes in the prose match the data', () => {
    const ax = getSpecies('axolotl');
    expect(ax.encyclopedia.tankNeeds).toMatch(new RegExp(`never above about ${ax.tempC.max} °C`));
    const sh = getSpecies('lined_seahorse');
    expect(sh.encyclopedia.tankNeeds).toMatch(new RegExp(`\\(${sh.recommendedMinTankGallons} gallons for a pair\\)`));
    const shark = getSpecies('brownbanded_bamboo_shark');
    expect(shark.encyclopedia.tankNeeds).toMatch(new RegExp(`about ${shark.recommendedFootprint!.minWidthIn} inches`));
    expect(getSpecies('green_chromis').social.note).toMatch(/Keep at least three/);
    expect(getSpecies('cardinal_tetra').social.note).toMatch(/ideally twelve or more/);
    // the shop chip: the minimum, as the notes say ("Keep at least three"), not the ideal
    expect(socialWord(getSpecies('fancy_guppy'))).toBe(`Groups of ${getSpecies('fancy_guppy').social.minGroup}+`);
  });

  it('a page never tells the player to feed what the animal won’t eat in the game', () => {
    const arch = getSpecies('banded_archerfish');
    expect(arch.foods).not.toContain('insect');
    expect(`${arch.encyclopedia.tankNeeds} ${arch.encyclopedia.keeperTip}`).not.toMatch(/cricket|insects and pellets/);
    const grouper = getSpecies('miniatus_grouper');
    expect(grouper.foods).not.toContain('seafood');
    expect(`${grouper.encyclopedia.feedingNote} ${grouper.encyclopedia.keeperTip}`).not.toMatch(/seafood/);
    expect(getSpecies('flame_hawkfish').encyclopedia.keeperTip).not.toMatch(/seafood/);
    expect(getSpecies('dwarf_gourami').encyclopedia.feedingNote).not.toMatch(/floating pellets/);
    expect(getSpecies('figure_eight_puffer').encyclopedia.funFact).toMatch(/Its old name, biocellatus/);
  });
});

describe('J10: a tank’s status has one set of words (B-157)', () => {
  it('the tank bar’s words are the only ones: the Water tab’s head, Tanks and the achievement agree', () => {
    expect(TANK_STATUS_WORD).toEqual({ good: 'Healthy', watch: 'Watch', danger: 'Danger' });
    expect(ATTENTION_WORD).toBe(TANK_STATUS_WORD);
    const g = base();
    const t = g.tanks[g.tankOrder[0]];
    t.water.ammonia = 4;
    useGame.setState({ game: g });
    try {
      const html = text(renderToStaticMarkup(createElement(WaterTab, { game: g, tank: t })));
      expect(html).toMatch(/Water in danger|Watch the water/);
      expect(html).not.toMatch(/Act soon|Keep an eye on it/);
    } finally {
      useGame.setState({ game: null });
    }
    expect(ACHIEVEMENTS.find((a) => a.id === 'steady_hands')?.description).toBe('Keep every tank’s water healthy for 7 days in a row.');
  });

  it('two source facts no longer read “in in”', () => {
    const facts = (id: string) => getSpecies(id).sourceReferences.flatMap((s) => s.facts ?? []).join(' | ');
    expect(facts('miniatus_grouper')).toMatch(/max 14 inches in aquaria \(18 in the wild\)/);
    expect(facts('chocolate_tang')).toMatch(/7–10 inches in aquaria/);
  });
});
