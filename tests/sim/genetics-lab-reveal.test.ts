// @vitest-environment node
/**
 * lane:genetics — the Genetics Lab reveal fix (0.5 spec §9.1, GEN-010): the lab reveals exact genes for every animal,
 * including the ones created since 0.3 with `geneticsRevealed: 0`; one helper decides it for the creature card, the
 * shop's Genes panel, card chips, Rare genes filter and temperament numbers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '@/types';
import { getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { createCreature, describeGenetics, geneticsRevealLevel } from '@/sim/life';

const betta = getSpecies('betta');
const P = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 66, curiosity: 40 };

function world(lab: boolean): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 41 });
  if (lab) g.progress.unlocked.push('genetics_lab');
  return g;
}

function hetBetta(g: GameState) {
  return createCreature(g, simRng(g), 'betta', { genome: { alleles: { color: ['red', 'royal'], pattern: ['solid', 'marble'], fins: ['veil', 'halfmoon'], cambodian: ['C', 'c'], metallic: ['std', 'me'] }, potentials: { ...P } } });
}

describe('the Genetics Lab reveals genes for new animals', () => {
  it('a new animal (geneticsRevealed 0) gets exact gene rows once the lab is researched', () => {
    const g = world(true);
    const c = hetBetta(g);
    expect(c.geneticsRevealed).toBe(0);
    const level = geneticsRevealLevel(g, c);
    expect(level).toBe(1);
    const rows = describeGenetics(betta, c.genome, level);
    // the gene rows come after the potentials (whose "Pattern" row shares a label)
    const by = (label: string) => rows.filter((r) => r.label === label).at(-1)?.value;
    expect(by('Body colour')).toBe('Red · carries royal blue (het)');
    expect(by('Pattern')).toBe('Solid · carries marble (het)');
    expect(by('Cambodian')).toBe('Normal body · carries cambodian (het)');
    expect(by('Metallic')).toBe('Standard sheen + Metallic (intermediate)');
    expect(by('Temperament')).toBe('Bold · 66');
  });

  it('without the lab the same animal shows band words only', () => {
    const g = world(false);
    const c = hetBetta(g);
    const level = geneticsRevealLevel(g, c);
    expect(level).toBe(0);
    const rows = describeGenetics(betta, c.genome, level);
    expect(rows.some((r) => /carries|\(het\)/.test(r.value))).toBe(false);
    expect(rows.find((r) => r.label === 'Temperament')?.value).toBe('Bold');
    expect(rows.some((r) => r.label === 'Cambodian')).toBe(false);
  });

  it('an animal from a save without the field keeps its display: closed without the lab, exact with it', () => {
    expect(geneticsRevealLevel(world(false), {})).toBe(0);
    expect(geneticsRevealLevel(world(true), {})).toBe(1);
    // a creature revealed by some older path stays revealed
    expect(geneticsRevealLevel(world(false), { geneticsRevealed: 1 })).toBe(1);
  });

  it('one helper: no UI code reads geneticsRevealed itself', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(f)) files.push(p);
      }
    };
    walk(join(process.cwd(), 'src/ui'));
    const readers = files.filter((f) => readFileSync(f, 'utf8').includes('geneticsRevealed'));
    expect(readers).toEqual([]);
    const card = readFileSync(join(process.cwd(), 'src/ui/cards/CreatureCard.tsx'), 'utf8');
    expect(card).toContain('geneticsRevealLevel(game, c)');
  });
});
