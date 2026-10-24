// @vitest-environment node
/**
 * chunk 15 (LAB-006; ADR-0051 decision 5) — a scenario run without a browser: the world runs forward, the report says
 * what happened (money, births, deaths with causes, each tank, the game's own lines) and a recipe's checks are judged
 * at their hour, so an agent or a test can use a scenario as a test.
 */
import { describe, it, expect } from 'vitest';
import { buildScenario, formatReport, presetById, runScenario, type ScenarioRecipe } from '@/dev/scenario';

describe('LAB-006: running a scenario forward', () => {
  it('the ammonia crisis left alone: its own checks pass, and the report says why the fish died', () => {
    const recipe = presetById('ammonia-crisis')!.recipe;
    const report = runScenario(buildScenario(recipe), recipe, 0); // the checks set the length (48 h)
    expect(report.hours).toBe(48);
    expect(report.checks.map((c) => [c.name, c.pass])).toEqual(recipe.checks!.map((c) => [c.name, true]));
    expect(report.passed).toBe(true);
    expect(report.deaths.length).toBeGreaterThan(0);
    expect(report.deaths.every((d) => /ammonia|nitrite/.test(d.cause))).toBe(true);
    expect(report.tanks[0]).toMatchObject({ name: 'Community', status: 'danger' });
    expect(report.events.length).toBeGreaterThan(0);
    const text = formatReport(report);
    expect(text).toContain('Scenario: Ammonia crisis');
    expect(text).toContain('PASS  Left alone, the ammonia stays high (after 6 h)');
    expect(text).toContain('All checks passed.');
  });

  it('a check that fails says which number missed, and one about a tank that isn’t there fails', () => {
    const recipe: ScenarioRecipe = {
      version: 1,
      name: 'Fails',
      tanks: [{ name: 'Calm', animals: [{ species: 'neon_tetra', count: 8 }] }],
      checks: [
        { name: 'too many', afterHours: 2, tank: 'Calm', alive: { min: 100 } },
        { name: 'fine', afterHours: 2, tank: 'Calm', alive: { min: 8, max: 8 }, ammonia: { max: 0.25 }, deaths: { max: 0 } },
        { name: 'no such tank', afterHours: 1, tank: 'Nowhere', alive: { min: 1 } },
        { name: 'nothing to check', afterHours: 1 },
      ],
    };
    const r = runScenario(buildScenario(recipe), recipe, 3);
    expect(r.checks.map((c) => [c.name, c.pass])).toEqual([
      ['too many', false],
      ['fine', true],
      ['no such tank', false],
      ['nothing to check', false],
    ]);
    expect(r.checks[0].lines).toEqual(['alive 8 (min 100) FAILED']);
    expect(r.checks[2].lines[0]).toContain('no tank called "Nowhere"');
    expect(r.passed).toBe(false);
    expect(formatReport(r)).toContain('Some checks failed.');
  });

  it('births, sales and money are counted from the start of the run', () => {
    const recipe = presetById('fry-tank')!.recipe;
    const built = buildScenario(recipe);
    const before = Object.keys(built.state.creatures).length;
    const r = runScenario(built, { ...recipe, checks: [{ afterHours: 0, births: { max: 0 } }] }, 24 * 8);
    expect(r.checks[0].pass).toBe(true); // judged at the start, before anything was born
    expect(r.births).toBe(Object.keys(built.state.creatures).length - before);
    expect(r.money.start).toBe(50_000);
  });
});
