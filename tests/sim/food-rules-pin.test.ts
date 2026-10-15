/**
 * chunk 6 (B-170, the review's M70) — the "made for another animal" rule was four regex copies on food ids, and the sim
 * branched on species ids and display names (swim bladder, a mantis shrimp's young). They now read the data: a food's
 * `madeFor` (src/data/catalog/foods.ts) and a species' `special.swimBladderProne` / `special.youngKind`. The refactor
 * changes nothing a player sees: every output below, for every species and every water it can live in, matches the
 * fixture written from the code before the change (tests/sim/fixtures/food-rules-pin.json, by tests/sim/support/foodRulesPin.ts).
 * A deliberate change to a food's or species' rules regenerates the fixture and says why in its commit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ALL_SPECIES } from '@/data/species';
import { FOODS, madeForSpecies, eatsFood } from '@/data/catalog/foods';
import { foodRulesPin, type FoodRulesPin } from './support/foodRulesPin';

const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'food-rules-pin.json'), 'utf8')) as FoodRulesPin;

describe('B-170: the food and species rules read the data, and change nothing', () => {
  const now = foodRulesPin();
  it('covers every species', () => {
    expect(Object.keys(now).sort()).toEqual(Object.keys(fixture).sort());
    expect(Object.keys(now)).toHaveLength(ALL_SPECIES.length);
  });
  it.each(ALL_SPECIES.map((sp) => sp.id))('%s: the same foods, keepers’ picks, menu, restock, illnesses, young and personality', (id) => {
    expect(now[id]).toEqual(fixture[id]);
  });

  it('the Market lists a food first for the animals it is made for, as its name said: axolotl and goldfish pellets', () => {
    const forOwn = ALL_SPECIES.flatMap((sp) => FOODS.filter((f) => eatsFood(sp, f) && madeForSpecies(f, sp.id)).map((f) => `${sp.id}:${f.id}`));
    expect(forOwn).toEqual(['axolotl:axolotl_pellets', 'comet_goldfish:goldfish_pellets', 'fancy_goldfish:goldfish_pellets']);
  });

  it('thawed frozen food is the catalog’s frozen form, the same five foods the id suffix named', () => {
    expect(FOODS.filter((f) => f.form === 'frozen').map((f) => f.id)).toEqual(FOODS.filter((f) => /_frozen$/.test(f.id)).map((f) => f.id));
  });

  it('src/sim and src/ui no longer test food ids or species names for these rules', () => {
    const root = join(__dirname, '..', '..', 'src');
    const files: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e) && !/\.test\.tsx?$/.test(e)) files.push(p);
      }
    };
    walk(join(root, 'sim'));
    walk(join(root, 'ui'));
    const bad = /\/\^(marine|axolotl|goldfish)_\/|\/goldfish\/\.test|\/(shrimp|snail)\/i\.test\(\w+\.commonName\)|_frozen\$\/\.test/;
    const simBad = /sp\.id === '(betta|fancy_goldfish)'/; // the sim's swim-bladder branch (the UI may name a species, e.g. the betta's 0.5 note)
    const hits = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .filter((l) => bad.test(l) || (relative(root, f).startsWith('sim') && simBad.test(l)))
        .map((l) => `${relative(root, f)}: ${l.trim()}`),
    );
    expect(hits).toEqual([]);
  });
});
