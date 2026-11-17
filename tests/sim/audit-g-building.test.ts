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
import { unlockProgress, guideHoldLine } from '@/sim/facility';
import { marketAccess } from '@/sim/economy';
import { lockViews, UnlockHelpBody } from '@/ui/panels/common/UnlockHelp';
import { GROUPS, UnlocksTab, researchLockKeys, researchTankLine } from '@/ui/panels/research/ResearchPanel';
import { RESEARCH } from '@/data/research';
import { unlockLink } from '@/ui/hud/eventLinks';
import { useGame } from '@/state/game';
import { TopBar } from '@/ui/hud/TopBar';
import { MoreSheetBody } from '@/ui/hud/MoreSheet';
import { ResearchPanel } from '@/ui/panels/research/ResearchPanel';
import { decorWaterNote } from '@/ui/panels/build/decorWater';
import { WATER_CLASS_BLURB } from '@/ui/panels/common/format';
import { tankAttention, tankAttentionLevel } from '@/ui/common/notify';
import { RESEARCH_BY_ID } from '@/data/research';

const game = (starterId: StarterId = 'axolotl', seed = 71): GameState => newGame({ starterId, starterName: 'Ember', seed });

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
