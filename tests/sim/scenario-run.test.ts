// @vitest-environment node
/**
 * chunk 15 (LAB-006; ADR-0051 decision 5) — a scenario run without a browser: the world runs forward, the report says
 * what happened (money, births, deaths with causes, each tank, the game's own lines) and a recipe's checks are judged
 * at their hour, so an agent or a test can use a scenario as a test.
 */
import { describe, it, expect } from 'vitest';
import { buildScenario, formatReport, presetById, runScenario, type ScenarioRecipe } from '@/dev/scenario';
import { scenarioCli } from '@/dev/scenario/cli';
import { decodeRecord } from '@/persistence';

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

  it("chunk 16 (SPC-009): a friend's reef plays two days with every fish, coral, crab and star alive, over many seeds", () => {
    // chunk 17 — the friend's real stock has three hermit crabs and 37 snails, and the game's hermits sometimes kill a
    // snail for its shell (hermit_crab.ts, trochus_snail.ts): over 30 seeds about 1 run in 4 or 5 loses one, with the
    // tank gate or without it. One seed passing was the random stream's luck (the gate's shift lost an Astraea), so
    // this measures the preset over sixteen: nothing but a snail to a hermit, at most two a run, and most runs nobody.
    const base = presetById('friends-reef')!.recipe;
    let quiet = 0;
    for (let seed = 210; seed < 226; seed++) {
      const recipe = { ...base, seed };
      const report = runScenario(buildScenario(recipe), recipe, 0); // the check sets the length (48 h)
      expect(report.hours).toBe(48);
      expect(report.checks.map((c) => c.name)).toEqual(['everyone alive after two days']);
      for (const d of report.deaths) expect(`${d.species}: ${d.cause}`, `seed ${seed}`).toMatch(/Snail: likely preyed upon by .+ (blue-leg|scarlet reef) hermit crab$/);
      expect(report.deaths.length, `seed ${seed}`).toBeLessThanOrEqual(2);
      if (report.deaths.length === 0) {
        quiet++;
        expect(report.passed, `seed ${seed}`).toBe(true);
      }
    }
    expect(quiet).toBeGreaterThanOrEqual(9);
  }, 600_000);

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

  it('births are counted from the start of the run, and each check is judged at its own hour', () => {
    const recipe: ScenarioRecipe = {
      ...presetById('fry-tank')!.recipe,
      checks: [
        { name: 'none yet', afterHours: 0, births: { max: 0 } },
        { name: 'the fry grew up', afterHours: 72, births: { min: 10 } },
        { name: 'at 5 h', afterHours: 5, births: { max: 0 } },
      ],
    };
    const r = runScenario(buildScenario(recipe), recipe, 0);
    expect(r.checks.map((c) => [c.name, c.atHours, c.pass])).toEqual([
      ['none yet', 0, true],
      ['the fry grew up', 72, true],
      ['at 5 h', 5, true],
    ]);
    expect(r.births).toBeGreaterThanOrEqual(10);
    expect(r.money.start).toBe(50_000);
  });

  it('a check that can\u2019t be judged fails rather than disappearing', () => {
    const recipe = { version: 1, name: 'Broken checks', tanks: [{ name: 'T' }], checks: [{ name: 'no hour', alive: { min: 0 } }, { name: 'text hour', afterHours: 'soon', alive: { min: 0 } }, { name: 'too late', afterHours: 1e9, alive: { min: 0 } }, { afterHours: 1, alive: { min: 0 } }] } as unknown as ScenarioRecipe;
    const r = runScenario(buildScenario(recipe), recipe, 1);
    expect(r.checks.map((c) => [c.name, c.pass, c.atHours])).toEqual([
      ['no hour', false, null],
      ['text hour', false, null],
      ['too late', false, null],
      ['check 4', true, 1],
    ]);
    expect(r.passed).toBe(false);
    expect(formatReport(r)).toContain('FAIL  no hour (not judged)');
  });
});

describe('LAB-006: npm run scenario', () => {
  const files = new Map<string, string>();
  const run = (...args: string[]) => {
    const out: string[] = [];
    const code = scenarioCli(args, { read: (p) => { const t = files.get(p); if (t === undefined) throw new Error('no such file'); return t; }, write: (p, t) => void files.set(p, t), print: (l) => void out.push(l) });
    return { code, out: out.join('\n') };
  };

  it('a preset with passing checks exits 0 and prints the report', () => {
    const r = run('ammonia-crisis');
    expect(r.code).toBe(0);
    expect(r.out).toContain('All checks passed.');
  });

  it('a failed check, a build error (unless --force) or an unreadable file exits 1', () => {
    files.set('fail.json', JSON.stringify({ version: 1, name: 'F', tanks: [{ name: 'T', animals: [{ species: 'neon_tetra', count: 3 }] }], checks: [{ afterHours: 1, tank: 'T', alive: { min: 50 } }] }));
    expect(run('fail.json').code).toBe(1);
    files.set('bad.json', JSON.stringify({ version: 1, name: 'B', tanks: [{ name: 'T', animals: [{ species: 'shark' }] }] }));
    const bad = run('bad.json', '--hours', '1');
    expect(bad.code).toBe(1);
    expect(bad.out).toContain('Not run: the build has 1 error');
    expect(run('bad.json', '--hours', '1', '--force').code).toBe(0);
    expect(run('missing.json').code).toBe(1);
    expect(run('ammonia-crisis', '--hours', '-3').code).toBe(1);
    expect(run().code).toBe(1);
    expect(run('--list').code).toBe(0);
  });

  it('--json is the issues and the report; --save writes a save file the game loads', () => {
    const j = run('show-day', '--hours', '2', '--json');
    const parsed = JSON.parse(j.out) as { issues: unknown[]; report: { hours: number } };
    expect(parsed.report.hours).toBe(2);
    files.set('wrap.json', JSON.stringify({ recipe: { version: 1, name: 'Wrapped', tanks: [{ name: 'W' }] } })); // a lab export may wrap it
    expect(run('wrap.json', '--hours', '0', '--save', 'out.json').code).toBe(0);
    const imported = decodeRecord(files.get('out.json')!);
    expect(imported.repairs).toEqual([]);
    expect(imported.state.tankOrder.map((id) => imported.state.tanks[id].name)).toEqual(['W']);
  });
});
