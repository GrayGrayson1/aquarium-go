/**
 * Audit 2026-11-17, area G (building and growing: tanks, equipment fit, decorating, the facility, research and
 * unlocks): each finding's fix, pinned.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { newGame } from '@/sim/newGame';
import type { StarterId } from '@/data/species';
import { unlockProgress, guideHoldLine, evalCond } from '@/sim/facility';
import { marketAccess } from '@/sim/economy';
import { lockViews, UnlockHelpBody } from '@/ui/panels/common/UnlockHelp';
import { GROUPS, UnlocksTab, researchLockKeys, researchTankLine } from '@/ui/panels/research/ResearchPanel';
import { RESEARCH } from '@/data/research';
import { unlockLink, unlockWhere } from '@/ui/hud/eventLinks';
import { useGame } from '@/state/game';
import { TopBar } from '@/ui/hud/TopBar';
import { MoreSheetBody } from '@/ui/hud/MoreSheet';
import { ResearchPanel } from '@/ui/panels/research/ResearchPanel';
import { decorWaterNote } from '@/ui/panels/build/decorWater';
import { WATER_CLASS_BLURB } from '@/ui/panels/common/format';
import { tankAttention, tankAttentionLevel } from '@/ui/common/notify';
import { RESEARCH_BY_ID } from '@/data/research';
import { applyCommand } from '@/sim/commands';
import { removeEquipment } from '@/sim/care';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { equipmentSellValue, takeDownCheck } from '@/sim/economy/sellBack';
import { buyTank } from '@/sim/economy/purchases';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { advanceWorld } from '@/sim/world';
import { findNonFinite } from '@/dev/fixtures/core-testkit';
import { lineFarm } from './support/production';
import { UNLOCK_RULES, type Cond } from '@/data/unlocks';
import { FacilityUpgradeCard } from '@/ui/panels/common/FacilityUpgrade';
import { beautyScore, decorSellValue } from '@/sim/aquascape';
import { placedSellValue, hideWords } from '@/ui/panels/build/BuildPanel';
import { textureFits } from '@/sim/aquascape/beauty';
import { getDecorDef, DECOR } from '@/data/catalog/decor';
import { isCave, isNestSite } from '@/ui/panels/build/decorRoles';
import { hasCave, hasNestSite } from '@/sim/life/breeding/common';
import { tankHabitat } from '@/sim/aquascape';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';

const game =(starterId: StarterId = 'axolotl', seed = 71): GameState => newGame({ starterId, starterName: 'Ember', seed });

/** Put the game in the store (a server render reads the store's initial state too). */
function use(g: GameState): void {
  useGame.setState({ game: g });
  Object.assign(useGame.getInitialState(), useGame.getState());
}
afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
});

describe('G1: an unlock the guide holds back says so', () => {
  it('names the guide step that hands out the 40 gallon, and never shows it 100% done', () => {
    const g = game('axolotl');
    g.progress.reputation = 30; // the rule (25 reputation) is met, but the guide holds the 40 gallon for "Room to grow"
    expect(guideHoldLine(g, 'tank_40')).toBe('Your guide gives you this at its “Room to grow” step (see Research › Quests).');
    const [v] = lockViews(g, ['tank_40']);
    expect(v.guide).toContain('“Room to grow”');
    const row = unlockProgress(g).find((u) => u.key === 'tank_40')!;
    expect(row.guide).toContain('Room to grow');
    expect(row.progress).toBeLessThan(1);
  });
  it('says nothing once the guide is finished or skipped, or for keys the guide doesn’t give', () => {
    const g = game('axolotl');
    g.progress.reputation = 30;
    expect(guideHoldLine(g, 'tank_55')).toBeNull();
    g.progress.tutorial.skipped = true;
    g.progress.tutorial.done = true;
    expect(guideHoldLine(g, 'tank_40')).toBeNull();
    expect(lockViews(g, ['tank_40'])[0].guide).toBeUndefined();
  });
  it('the Market tells a player before the guide’s market step that the guide opens listings', () => {
    const g = game('betta');
    g.progress.reputation = 12;
    g.progress.tutorial.flags.opened_market = true;
    expect(marketAccess(g).hint).toMatch(/^Listings open at the guide’s “The market” step: open the Market while that step is on\./);
    g.progress.tutorial.skipped = true;
    g.progress.tutorial.done = true;
    expect(marketAccess(g).hint).toMatch(/^Listings open after your first visit to the Market/);
  });
});

describe('G2: the Unlock map shows every unlock, and an empty search says so', () => {
  it('puts every unlock key in exactly one group', () => {
    for (const k of Object.keys(UNLOCK_KEYS)) expect(GROUPS.filter((grp) => grp.test(k)).map((grp) => grp.id), k).toHaveLength(1);
  });
  it('finds sharks and rays and the rooms by name, and a search with no hits offers Clear filters', () => {
    const g = game('betta');
    const tab = (q: string) => renderToStaticMarkup(createElement(UnlocksTab, { g, q, setQ: () => {} }));
    expect(tab('Sharks and rays')).toContain('Sharks and rays');
    expect(tab('Water room')).toContain('Water room');
    const none = tab('zzzz nothing');
    expect(none).toContain('Nothing matches');
    expect(none).toContain('data-testid="unlocks-clear"');
    expect(tab('')).not.toContain('Nothing matches');
  });
});

describe('G4: a locked research project’s box says how to get the unlocks it needs', () => {
  it('Reef Systems’ box routes “Better filters, heaters, lights” to Better Life Support and its reputation', () => {
    const g = game('ocellaris_clownfish');
    const reef = RESEARCH_BY_ID.reef_systems;
    expect(researchLockKeys(reef)).toEqual(['marine_basics', 'gear_tier2']);
    const html = renderToStaticMarkup(createElement(UnlockHelpBody, { g, conds: reef.requires, keys: researchLockKeys(reef), onGo: () => {} }));
    expect(html).toContain('data-testid="unlock-help-gear_tier2"'); // its own section…
    expect(html).toContain('data-testid="unlock-help-research-life_support_2"'); // …with the research that grants it
    expect(html).toContain('50 reputation'); // …and its play route
    expect(html).not.toContain('data-testid="unlock-help-marine_basics"'); // a clownfish keeper already has marine
  });
});

describe('G5: research that opens animals still waiting for a bigger tank says so', () => {
  it('Big-water Freshwater names the smallest tank its animals need, and says when some already fit', () => {
    const g = game('betta');
    const big = RESEARCH.find((d) => d.id === 'large_freshwater')!;
    expect(researchTankLine(g, big)).toBe('Its animals also need a bigger tank: the 180 Gallon (reach 280 reputation in your store) and larger.');
    g.progress.unlocked.push('tank_180');
    expect(researchTankLine(g, big)).toMatch(/^Some of its animals also need a bigger tank: the 240 Gallon \(/);
    expect(researchTankLine(g, RESEARCH.find((d) => d.id === 'shark_ray_husbandry')!)).toMatch(/the 500 Gallon Showpiece/);
    expect(researchTankLine(g, RESEARCH.find((d) => d.id === 'life_support_2')!)).toBeNull(); // opens no animals
  });
  it('the unlock toast for the big fish and the sharks says the shop waits for a big enough tank', () => {
    for (const k of ['fw_large', 'elasmobranchs']) expect(unlockLink(k)?.where, k).toBe('They come into Market › Shop once you have a tank big enough for them.');
  });
});

describe('G6: reputation is reachable on every screen and explained', () => {
  it('the top bar’s reputation is a button, phones get it in More’s header, and Research explains it', () => {
    const g = game('betta');
    g.progress.reputation = 30.4;
    use(g);
    expect(renderToStaticMarkup(createElement(TopBar, {}))).toMatch(/<button[^>]*data-testid="hud-reputation"/);
    const more = renderToStaticMarkup(createElement(MoreSheetBody, { isLocked: () => false, dots: {} }));
    expect(more).toContain('data-testid="more-reputation"');
    expect(more).toContain('30 reputation');
    const research = renderToStaticMarkup(createElement(ResearchPanel));
    expect(research).toContain('How reputation grows');
    expect(research).toContain('It drops when an animal dies');
    expect(research).toContain('data-testid="research-reputation-next"');
  });
});

describe('G7: corals after Reef Systems: the link finds a tank that takes them, and Decor says why they are hidden', () => {
  it('the coral and anemone unlocks go through Find (a tank that can take them, else Build › Tanks on that water)', () => {
    expect(unlockLink('decor_corals_soft')).toMatchObject({ panel: 'build', target: 'find:decor:zoanthids', where: 'Corals need a reef tank. Find them in Build › Decor.' });
    expect(unlockLink('decor_corals_lps')?.target).toBe('find:decor:hammer_coral');
    expect(unlockLink('decor_anemones')?.target).toBe('find:decor:bubble_tip_anemone');
  });
  it('Decor names what the tank’s water hides', () => {
    const g = game('ocellaris_clownfish');
    g.progress.unlocked.push('reef', 'decor_corals_soft');
    expect(decorWaterNote(g, { environment: 'marine', waterClass: 'marine_fowlr' })).toBe('The Photosynthetic Gorgonian needs a live-rock or reef tank, and corals need a reef tank. Set one up in Build › Tanks, or convert an empty marine tank in Tanks.');
    expect(decorWaterNote(g, { environment: 'marine', waterClass: 'marine_live_rock' })).toBe('Corals need a reef tank. Set one up in Build › Tanks, or convert an empty marine tank in Tanks.');
    expect(decorWaterNote(g, { environment: 'marine', waterClass: 'reef' })).toBeNull();
    expect(decorWaterNote(g, { environment: 'freshwater', waterClass: 'freshwater_tropical' })).toBeNull();
  });
  it('the water types say which take corals', () => {
    expect(WATER_CLASS_BLURB.marine_fowlr).toMatch(/No corals or anemones\.$/);
    expect(WATER_CLASS_BLURB.marine_live_rock).toMatch(/Takes gorgonians and anemones, not reef corals\.$/);
  });
});

describe('G8: a fading plant or coral is an alert', () => {
  it('a coral under 40% health raises a watch item that opens the Life tab, with the beauty tip’s reason', () => {
    const g = game('ocellaris_clownfish');
    const t = g.tanks[g.tankOrder[0]];
    t.decor.push({ id: 'd-test', defId: 'hammer_coral', x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1, health: 12, growth: 0.3 });
    const item = tankAttention(g, t.id).items.find((i) => /hammer coral/.test(i.text));
    expect(item).toMatchObject({ level: 'watch', tab: 'life', text: 'Your hammer coral is struggling (12% health): it needs stronger light than this tank provides.' }); // (a bright-light coral: the tip’s reason)
    expect(tankAttentionLevel(g, t.id)).not.toBe('good');
    t.decor.find((d) => d.id === 'd-test')!.health = 60;
    expect(tankAttention(g, t.id).items.some((i) => /hammer coral/.test(i.text))).toBe(false);
  });
});

describe('G22 (the owner’s answer): the store buys stored equipment back at half price', () => {
  it('sells one stored unit for half its price, by its condition, and takes it out of storage', () => {
    const g = game('betta');
    const t = g.tanks[g.tankOrder[0]];
    const unit = t.equipment[0];
    expect(removeEquipment(g, t.id, unit.id).ok).toBe(true);
    const def = getEquipmentDef(unit.defId)!;
    g.inventory.equipment.find((e) => e.id === unit.id)!.condition = 1;
    const money = g.finance.money;
    const half = Math.round(def.price / 2);
    const res = applyCommand(g, { k: 'sellEquipment', instance: unit.id });
    expect(res.ok, res.message).toBe(true);
    expect(res.message).toBe(`${def.name} sold for $${half}.`);
    expect(g.finance.money).toBeCloseTo(money + half, 6);
    expect(g.inventory.equipment.some((e) => e.id === unit.id)).toBe(false);
    // the same unit again: refused, and nothing changes
    expect(applyCommand(g, { k: 'sellEquipment', instance: unit.id }).ok).toBe(false);
    expect(g.finance.money).toBeCloseTo(money + half, 6);
  });
  it('a worn unit fetches less, and a broken one half that again', () => {
    const def = { price: 100 } as Parameters<typeof equipmentSellValue>[0];
    expect(equipmentSellValue(def, { condition: 1 })).toBe(50);
    expect(equipmentSellValue(def, { condition: 0.5 })).toBe(25);
    expect(equipmentSellValue(def, { condition: 0.5, failed: true })).toBe(13);
    expect(equipmentSellValue(undefined, { condition: 1 })).toBe(0);
  });
  it('in a shared shop the second member to sell the same unit is told who sold it', () => {
    const g = game('betta');
    const t = g.tanks[g.tankOrder[0]];
    const unit = t.equipment[0];
    removeEquipment(g, t.id, unit.id);
    expect(applyCommand(g, { k: 'sellEquipment', instance: unit.id }, { id: 'a', name: 'Ann', at: 1000, owner: true }).ok).toBe(true);
    const late = applyCommand(g, { k: 'sellEquipment', instance: unit.id }, { id: 'b', name: 'Bo', at: 2000 });
    expect(late.ok).toBe(false);
    expect(late.message).toBe('Ann already sold that equipment.');
  });
});

describe('G19 (the owner’s answer): an empty tank can be taken down', () => {
  /** A betta game with a second, empty 10 gallon (its kit gear) and two decor pieces moved in from the first tank. */
  const withEmptyTank = () => {
    const g = game('betta');
    g.finance.money = 5000;
    const r = buyTank(g, 'g10', 'freshwater_tropical', undefined, { seeded: true });
    expect(r.ok, r.message).toBe(true);
    const id = g.tankOrder.at(-1)!;
    const first = g.tanks[g.tankOrder[0]];
    g.tanks[id].decor.push(...first.decor.splice(0, 2).map((d) => ({ ...d })));
    return { g, id };
  };
  it('its gear and decor go to storage, the tank goes, and the store pays half the bare tank’s price', () => {
    const { g, id } = withEmptyTank();
    const t = g.tanks[id];
    const gear = t.equipment.map((e) => e.id);
    const decor = t.decor.map((d) => d.id);
    expect(gear.length).toBeGreaterThan(0);
    const half = Math.round(TANK_TIER_BY_ID.g10.price / 2);
    const check = takeDownCheck(g, id);
    expect(check).toMatchObject({ ok: true, value: half, last: false });
    expect(check.stores).toMatch(/^its .*filter.* and 2 decor pieces$/);
    const money = g.finance.money;
    const res = applyCommand(g, { k: 'takeDownTank', tank: id });
    expect(res.ok, res.message).toBe(true);
    expect(res.message).toMatch(new RegExp(`^Took down the ${t.name}\\. Its .* went to storage\\. You got \\$${half} back for the tank\\.$`));
    expect(g.finance.money).toBeCloseTo(money + half, 6);
    expect(g.tanks[id]).toBeUndefined();
    expect(g.tankOrder).not.toContain(id);
    for (const e of gear) expect(g.inventory.equipment.filter((x) => x.id === e)).toHaveLength(1);
    for (const d of decor) expect(g.inventory.decor.filter((x) => x.id === d)).toHaveLength(1);
    // a second take-down of the same tank is refused, and pays nothing
    expect(applyCommand(g, { k: 'takeDownTank', tank: id }).ok).toBe(false);
    expect(g.finance.money).toBeCloseTo(money + half, 6);
  });
  it('refuses a tank with animals, eggs or young, a listing, or a production line, and says why', () => {
    const { g, id } = withEmptyTank();
    expect(takeDownCheck(g, g.tankOrder[0]).reason).toBe('Animals live in it. Move them to another tank first.');
    g.clutches.cl_probe = { id: 'cl_probe', tankId: id, count: 12 } as (typeof g.clutches)[string];
    expect(takeDownCheck(g, id).reason).toMatch(/^Eggs or young are in it\./);
    delete g.clutches.cl_probe;
    g.tanks[id].listingId = 'l_probe';
    expect(takeDownCheck(g, id).reason).toBe('It’s listed for sale. Withdraw the listing first.');
    delete g.tanks[id].listingId;
    expect(takeDownCheck(g, 'no_such_tank').reason).toBe('That tank no longer exists.');
    const money = g.finance.money;
    expect(applyCommand(g, { k: 'takeDownTank', tank: g.tankOrder[0] }).ok).toBe(false);
    expect(g.finance.money).toBe(money);
    const farm = lineFarm();
    const lineTank = Object.values(farm.tanks).find((t) => !Object.values(farm.g.creatures).some((c) => c.tankId === t.id && (c.status === 'alive' || c.status === 'listed')) && !Object.values(farm.g.clutches).some((cl) => cl.tankId === t.id && cl.count > 0));
    expect(lineTank, 'an empty line tank').toBeTruthy();
    expect(takeDownCheck(farm.g, lineTank!.id).reason).toMatch(/line uses it\. Give the line another tank in Operations, or end the line, first\.$/);
  });
  it('the world steps on for a game day after a take-down, and the last tank leaves an empty room as an auction does', () => {
    const { g, id } = withEmptyTank();
    expect(applyCommand(g, { k: 'takeDownTank', tank: id }).ok).toBe(true);
    for (let h = 0; h < 24; h++) advanceWorld(g, 1, {});
    expect(findNonFinite(g)).toEqual([]);
    expect(g.tankOrder).toHaveLength(1);
    // the last tank: its animals gone, it comes down too, and the room is empty
    for (const c of Object.values(g.creatures)) if (c.status === 'alive') { c.status = 'sold'; c.tankId = null; }
    const last = g.tankOrder[0];
    expect(takeDownCheck(g, last)).toMatchObject({ ok: true, last: true });
    expect(applyCommand(g, { k: 'takeDownTank', tank: last }).ok).toBe(true);
    expect(g.tankOrder).toEqual([]);
    expect(g.log.some((e) => /an empty room/.test(e.text))).toBe(true);
    for (let h = 0; h < 24; h++) advanceWorld(g, 1, {});
    expect(findNonFinite(g)).toEqual([]);
  });
  it('a full room’s refusal names the ways out that exist', () => {
    const g = game('betta');
    g.finance.money = 1e6;
    let msg = '';
    for (let i = 0; i < 60 && !msg; i++) {
      const r = buyTank(g, 'g10', 'freshwater_tropical', undefined, { seeded: true });
      if (!r.ok) msg = r.message;
    }
    expect(msg).toBe('There\'s no floor space for a 10 Gallon. Choose a smaller size, move a tank, or take down an empty tank you no longer need in Tanks. A bigger venue (Build › Facility) adds room.');
  });
});

describe('G9: an unlock hint names every number its rule needs', () => {
  /** The numbers a rule's required conditions ask for (top level), and those of each "all of" route inside an "any". */
  const numbers = (c: Cond): string[] => {
    switch (c.type) {
      case 'reputation':
      case 'mastery':
      case 'visitors':
        return [c.min.toLocaleString('en-US')];
      case 'tanks':
        return [String(c.minGallons ?? c.min)];
      case 'all':
        return c.of.flatMap((x) => numbers(x));
      case 'any':
        return c.of.flatMap((x) => (x.type === 'all' ? numbers(x) : []));
      default:
        return [];
    }
  };
  it('a hint never leaves out a reputation, mastery, visitor or tank count the rule checks', () => {
    for (const r of UNLOCK_RULES) for (const n of r.when.flatMap((c) => numbers(c))) expect(r.hint, `${r.key} needs ${n}`).toContain(n);
  });
  it('the venue-gated big tanks, the showroom, marine and nursery hints', () => {
    const hint = (k: string) => UNLOCK_RULES.find((r) => r.key === k)!.hint;
    expect(hint('facility_showroom')).toBe('350 reputation, 800 visitors, 7 tanks and 300 exhibition mastery (visitors and shows build it).');
    expect(hint('tank_800')).toBe('Research Grand Display Engineering, or reach 720 reputation with a 300-gallon exhibit at a destination aquarium.');
    expect(hint('tank_1000')).toBe('Research Grand Display Engineering, or reach 800 reputation in the Grand Hall.');
    expect(hint('nursery')).toBe('Raise a clutch, build 40 breeding mastery, reach 70 reputation, or research the Breeding Programme.');
  });
});

describe('G10: mastery is shown in the points requirements ask for, with what earns them', () => {
  it('the standing card shows level and points and what builds each track; a requirement says points', () => {
    const g = game('betta');
    g.progress.mastery.exhibition = 220;
    use(g);
    const html = renderToStaticMarkup(createElement(ResearchPanel));
    expect(html).toContain('Lv 2 · 220 points');
    expect(html).toContain('Visitors, friends’ visits and shows.');
    expect(evalCond(g, { type: 'mastery', track: 'exhibition', min: 300 })).toMatchObject({ label: '300 exhibition mastery points', current: 220, target: 300 });
  });
});

describe('G11: requirement rows read plainly', () => {
  it('a venue is done or not, and one big tank is “a 500+ gallon tank”', () => {
    const g = game('betta');
    expect(evalCond(g, { type: 'facility', level: 'aquarium_store' })).toMatchObject({ met: false, current: 0, target: 1, label: 'Move into the Aquarium Store' });
    expect(evalCond(g, { type: 'facility', level: 'hobby_room' })).toMatchObject({ met: true, current: 1, target: 1, label: 'Hobby Room' });
    expect(evalCond(g, { type: 'tanks', min: 1, minGallons: 500 }).label).toBe('a 500+ gallon tank');
    expect(evalCond(g, { type: 'tanks', min: 4 }).label).toBe('4 tanks');
  });
  it('a research-only unlock says “Research …” once, not as a requirement and again as “Or research”', () => {
    const g = game('ocellaris_clownfish');
    const [reef] = lockViews(g, ['reef']);
    expect(reef.requirements).toEqual([]);
    expect(reef.research.map((r) => r.id)).toEqual(['reef_systems']);
    const html = renderToStaticMarkup(createElement(UnlockHelpBody, { g, keys: ['reef'], onGo: () => {} }));
    expect(html).not.toContain('Research: Reef Systems');
    expect(html).not.toContain('Or research');
    // an "any of" whose other route is research: the play route is the checklist, the project its own route
    const [big] = lockViews(g, ['tank_500']);
    expect(big.either).toEqual([]);
    expect(big.requirements.map((r) => r.label)).toEqual(['560 reputation + Move into the Destination Aquarium']);
  });
  it('the Facility card splits “1 sale or Host 4 friend visits” into its alternatives, each with progress', () => {
    const g = game('betta');
    g.progress.counters.friend_visits = 2;
    const html = renderToStaticMarkup(createElement(FacilityUpgradeCard, { g }));
    expect(html).toContain('And one of these:');
    expect(html).toContain('Host 4 friend visits');
    expect(html).toContain('2/4');
  });
});

describe('G12: a living anemone counts as the clownfish’s host, and the tip names where to get one', () => {
  const hostTip = (g: GameState) => beautyScore(g, g.tanks[g.tankOrder[0]]).tips.find((t) => /host|ledge/.test(t));
  it('the shop’s anemone is suggested before Anemone Care, and once it lives in the tank the tip goes', () => {
    const g = game('ocellaris_clownfish');
    const t = g.tanks[g.tankOrder[0]];
    t.decor = t.decor.filter((d) => !getDecorDef(d.defId)?.anchors.some((a) => a.kind === 'host'));
    g.progress.unlocked.push('tank_40');
    expect(hostTip(g)).toMatch(/^Your clownfish has no host — a bubble-tip anemone from Market › Shop, on a stable rock ledge, would give it a home to defend\./);
    addCreature(g, createCreature(g, simRng(g), 'bubbletip_anemone'), t.id);
    expect(hostTip(g)).toBeUndefined();
  });
});

describe('G13: beauty tips name pieces the tank’s water takes', () => {
  const at = (piece: string, i: number) => ({ id: `d-${piece}-${i}`, defId: piece, x: -0.15 + i * 0.12, y: 0, z: 0, rotY: 0, scale: 1, seed: i + 1, health: 90, growth: 0.9 });
  it('a reef of bold polyps is offered fine polyps, never java moss or hairgrass', () => {
    const g = game('ocellaris_clownfish');
    g.progress.unlocked.push('reef', 'decor_corals_soft');
    const t = g.tanks[g.tankOrder[0]];
    t.waterClass = 'reef';
    t.decor = ['mushroom_coral', 'mushroom_coral', 'leather_coral'].map(at);
    const tips = beautyScore(g, t).tips.join(' ');
    expect(tips).not.toMatch(/java moss|hairgrass|anubias|java fern/);
    expect(textureFits(g, t, 'fine')).toEqual(['chaetomorpha', 'zoanthid colony']);
    t.waterClass = 'marine_fowlr';
    expect(textureFits(g, t, 'fine')).toEqual(['chaetomorpha']); // the polyps need reef water
  });
  it('a brackish tank is never told to add freshwater-only plants', () => {
    const g = game('betta');
    const t = g.tanks[g.tankOrder[0]];
    t.environment = 'brackish';
    t.waterClass = 'brackish';
    t.decor = ['anubias_nana', 'anubias_nana', 'java_fern'].map(at);
    const tips = beautyScore(g, t).tips.join(' ');
    expect(tips).not.toMatch(/hairgrass|rotala|stem plants/);
    expect(textureFits(g, t, 'fine')).toEqual(['java moss']);
  });
});

describe('G14: Build’s Sell on a placed piece shows what it pays', () => {
  it('half the price for a bought piece, the store’s frag offer for a growing frag', () => {
    const g = game('betta');
    const t = g.tanks[g.tankOrder[0]];
    const inst = t.decor[0];
    const def = getDecorDef(inst.defId)!;
    expect(placedSellValue(g, def, inst)).toBe(decorSellValue(def, inst));
    expect(placedSellValue(g, def, inst)).toBe(Math.round(def.price / 2));
  });
});

describe('G16: Build says which pieces the breeding rules take as a nest site or a cave', () => {
  it('a piece shows “Nest site” or “Cave” exactly when, alone in a tank, the breeding rules accept it', () => {
    const g = game('betta');
    const t = g.tanks[g.tankOrder[0]];
    for (const d of DECOR) {
      if (!d.environments.includes('freshwater') && !d.environments.includes('marine')) continue;
      t.environment = d.environments.includes('freshwater') ? 'freshwater' : 'marine';
      t.decor = [{ id: 'd-one', defId: d.id, x: 0, y: 0, z: 0, rotY: 0, scale: 1, seed: 1, health: 90, growth: 0.9 }];
      const hab = tankHabitat(g, t);
      expect(isNestSite(d), `${d.id} nest site`).toBe(hasNestSite(t, hab));
      expect(isCave(d), `${d.id} cave`).toBe(hasCave(t, hab));
    }
  });
});

describe('G17: a decor card never shows more hiding spots than the sim counts', () => {
  it('rounds down: a Stone Cave (1.5) is one big hiding spot, not two', () => {
    expect(hideWords(1)).toBe('Hiding spot');
    expect(hideWords(1.2)).toBe('Hiding spot');
    expect(hideWords(1.5)).toBe('Big hiding spot');
    expect(hideWords(2.4)).toBe('2 hiding spots');
  });
});

describe('G18: new tanks of one size get their own names', () => {
  it('“10 Gallon”, then “10 Gallon 2”, “10 Gallon 3”; a name the player gives is kept', () => {
    const g = game('betta');
    g.finance.money = 5000;
    const names: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = buyTank(g, 'g10', 'freshwater_tropical', undefined, { seeded: true });
      names.push(g.tanks[r.tankId!].name);
    }
    expect(names).toEqual(['10 Gallon', '10 Gallon 2', '10 Gallon 3']);
    const named = buyTank(g, 'g10', 'freshwater_tropical', undefined, { seeded: true, name: 'Shrimp corner' });
    expect(g.tanks[named.tankId!].name).toBe('Shrimp corner');
  });
});

describe('G20: every unlock’s toast says where it lives', () => {
  it('each unlock key has a link or, with no panel of its own, a where-line', () => {
    for (const k of Object.keys(UNLOCK_KEYS)) expect(unlockLink(k)?.where || unlockWhere(k), k).toBeTruthy();
    expect(unlockLink('water_room')).toMatchObject({ panel: 'build', target: 'room:water', label: 'Open Build' });
    expect(unlockLink('operations_desk')).toMatchObject({ panel: 'operations', label: 'Open Operations' });
    expect(unlockWhere('party_mode')).toBe('Tap Party in the tank tools: the lights dance to music.');
  });
});
