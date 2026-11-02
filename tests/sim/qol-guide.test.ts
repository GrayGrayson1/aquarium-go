/**
 * chunk 19 (ADR-0055 decision 7, QOL-008) — the guide's spotlight follows each step into the place it needs, and the
 * tour stops at every area and every destination open to the player.
 */
import { describe, expect, it } from 'vitest';
import { guideAim, waterParamFor, SHOW_ME, type GuideScreen } from '@/ui/tutorial/guideTargets';
import { tourStops } from '@/ui/tutorial/tourStops';
import { placeCard } from '@/ui/tutorial/Tour';
import { TUTORIAL_CHAINS } from '@/data/quests';

const screen = (p: Partial<GuideScreen> = {}): GuideScreen => ({ panel: null, popover: null, tool: 'none', tankCardOpen: false, mobile: false, ...p });

describe('QOL-008: the guide points the way through each step', () => {
  it('feed: Feed, then the food to pick, then the instructions for the water', () => {
    expect(guideAim('feed', 'tool-feed', 'betta', screen())?.candidates).toEqual(['[data-tutorial-id="tool-feed"]']);
    expect(guideAim('feed', 'tool-target-feed', 'lined_seahorse', screen())?.candidates).toEqual(['[data-tutorial-id="tool-target-feed"]']);
    expect(guideAim('feed', 'tool-feed', 'betta', screen({ popover: 'food' }))?.candidates[0]).toContain('.ag-food');
    const armed = guideAim('feed', 'tool-feed', 'betta', screen({ tool: 'feed' }));
    expect(armed?.candidates).toEqual(['.ag-toolhint']);
    expect(armed?.dim).toBe(false); // the player taps the water: nothing dimmed
  });
  it('water: the tank card, then the reading the step asks that starter about', () => {
    expect(guideAim('water', 'tank-card-toggle', 'betta', screen())?.candidates).toEqual(['[data-tutorial-id="tank-card-toggle"]']);
    expect(guideAim('water', 'tank-card-toggle', 'betta', screen({ tankCardOpen: true }))?.candidates[0]).toBe('[data-testid="tank-card"] [data-param="temp"]');
    expect(waterParamFor('ocellaris_clownfish')).toBe('salinity');
    expect(waterParamFor('pea_puffer')).toBe('ammonia');
  });
  it('habitat: Build, then the Decor tab or the suggested piece, then the placing instructions', () => {
    expect(guideAim('habitat', 'dock-build', 'betta', screen())?.candidates).toEqual(['[data-tutorial-id="dock-build"]']);
    const open = guideAim('habitat', 'dock-build', 'betta', screen({ panel: 'build' }))!.candidates;
    expect(open[0]).toContain('is-suggested');
    expect(open[1]).toContain('build-tab-decor');
    expect(guideAim('habitat', 'dock-build', 'betta', screen({ tool: 'decor_place' }))?.candidates).toEqual(['.ag-toolhint']);
  });
  it('on a phone, a destination in More points at More first, then its tile', () => {
    expect(guideAim('preview', 'dock-research', 'betta', screen({ mobile: true }))?.candidates).toEqual(['[data-testid="dock-more"]']);
    expect(guideAim('preview', 'dock-research', 'betta', screen({ mobile: true, popover: 'more' }))?.candidates).toEqual(['[data-testid="more-research"]']);
    expect(guideAim('market', 'dock-market', 'betta', screen({ mobile: true }))?.candidates).toEqual(['[data-tutorial-id="dock-market"]']);
  });
  it('the upgrade step points at the tank size it unlocks once Build is open (a reward that isn’t one: nothing there)', () => {
    const axolotl = TUTORIAL_CHAINS.axolotl.find((x) => x.id === 'upgrade')!;
    const inBuild = guideAim('upgrade', 'dock-build', 'axolotl', screen({ panel: 'build' }), axolotl.reward?.unlocks ?? []);
    expect(inBuild?.candidates[0]).toBe('[data-testid="panel-build"] [data-tier-id="g40B"]');
    expect(inBuild?.candidates).toContain('[data-testid="build-tab-tanks"][aria-selected="false"]');
    expect(inBuild?.dim).toBe(false);
    const betta = TUTORIAL_CHAINS.betta.find((x) => x.id === 'upgrade')!;
    expect(guideAim('upgrade', 'dock-build', 'betta', screen({ panel: 'build' }), betta.reward?.unlocks ?? [])).toBeNull();
    expect(guideAim('upgrade', 'dock-build', 'axolotl', screen(), axolotl.reward?.unlocks ?? [])?.candidates).toEqual(['[data-tutorial-id="dock-build"]']);
  });
  it('steps that wait for play never dim; a step in the 3D scene points at its own Show me', () => {
    expect(guideAim('first_goal', 'hud-money', 'betta', screen())?.dim).toBe(false);
    expect(guideAim('upgrade', 'dock-build', 'betta', screen())?.dim).toBe(false);
    expect(guideAim('observe', 'scene', 'betta', screen())).toEqual({ candidates: [SHOW_ME], dim: false, hand: true });
    expect(guideAim('camera', 'scene', 'betta', screen())?.candidates).toContain(SHOW_ME);
  });
  it('has an aim for every step of every starter’s chain', () => {
    for (const [starter, chain] of Object.entries(TUTORIAL_CHAINS)) {
      for (const step of chain) {
        const a = guideAim(step.id, step.hintTarget, starter, screen());
        expect(a, `${starter} ${step.id}`).not.toBeNull();
        expect(a!.candidates.length, `${starter} ${step.id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('QOL-008: the tour', () => {
  it('stops at every area and destination, opening each place it shows', () => {
    const stops = tourStops({ mobile: false, social: true, unlocked: () => true });
    const ids = stops.map((s) => s.id);
    for (const id of ['welcome', 'time', 'money', 'alerts', 'find', 'tanks', 'tools', 'camera', 'market', 'build', 'livestock', 'operations', 'research', 'visitors', 'shows', 'finances', 'encyclopedia', 'social', 'settings', 'done']) expect(ids, id).toContain(id);
    expect(stops.find((s) => s.id === 'market')?.open).toBe('market');
    expect(stops[0].target).toEqual([]);
    expect(stops.at(-1)?.target).toEqual([]);
  });
  it('leaves out what is still locked and what this build doesn’t have', () => {
    const ids = tourStops({ mobile: false, social: false, unlocked: () => false }).map((s) => s.id);
    expect(ids).not.toContain('visitors');
    expect(ids).not.toContain('shows');
    expect(ids).not.toContain('social');
  });
  it('on a phone: no camera chips, and Settings is shown inside More', () => {
    const stops = tourStops({ mobile: true, social: false, unlocked: () => true });
    expect(stops.some((s) => s.id === 'camera')).toBe(false);
    expect(stops.find((s) => s.id === 'settings')).toMatchObject({ more: true, target: ['[data-testid="more-settings"]'] });
  });
  it('places its card beside what it points at, left of an open sheet first, and in the middle with nothing to point at', () => {
    const view = { w: 1440, h: 900 };
    const size = { w: 360, h: 200 };
    expect(placeCard(null, size, view, false).side).toBe('centre');
    expect(placeCard({ x: 600, y: 20, w: 240, h: 44, round: false }, size, view, false).side).toBe('below');
    expect(placeCard({ x: 600, y: 800, w: 240, h: 44, round: false }, size, view, false).side).toBe('above');
    expect(placeCard({ x: 870, y: 150, w: 520, h: 44, round: false }, size, view, true).side).toBe('left');
    const p = placeCard({ x: 10, y: 20, w: 100, h: 44, round: false }, size, view, false);
    expect(p.x).toBeGreaterThanOrEqual(12);
  });
});
