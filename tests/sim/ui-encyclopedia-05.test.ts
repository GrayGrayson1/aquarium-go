// @vitest-environment node
/**
 * lane:genetics — Encyclopedia › Betta in 0.5 (spec §8.7, §16; DES-006, GEN-012): the genes line and its note, the
 * catalog heading, ten named strains with Cambodian Veiltail marked New, and the new science article (ADR-0020 copy).
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSpecies } from '@/data/species';
import { GeneticsSections, GenesLine } from '@/ui/panels/encyclopedia/MorphCatalog';
import { ARTICLES } from '@/ui/panels/encyclopedia/science';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const betta = getSpecies('betta');

describe('Encyclopedia › Betta', () => {
  it('the genes line: ladders, the two new genes, the note', () => {
    const out = renderToStaticMarkup(createElement(GenesLine, { sp: betta }));
    expect(out).toContain('data-testid="enc-genes"');
    const chips = [...out.matchAll(/class="pn-chip[^"]*">(?:<svg[\s\S]*?<\/svg>)?([^<]+)</g)].map((m) => m[1]);
    expect(chips).toEqual(['Body colour · 8 alleles · dominance ladder', 'Pattern · 5 · ladder', 'Finnage · 5 · ladder', 'Cambodian · recessive', 'Metallic · additive']);
    expect((out.match(/pn-chip--aqua/g) ?? []).length).toBe(2);
    expect(text(out)).toContain('New in 0.5: Cambodian (recessive, shows on red bettas) and Metallic (additive — one copy adds a sheen, two make it Metallic).');
    expect(renderToStaticMarkup(createElement(GenesLine, { sp: getSpecies('axolotl') }))).toBe('');
  });

  it('the catalog heading, ten strains, Cambodian Veiltail marked New', () => {
    const out = renderToStaticMarkup(createElement(GeneticsSections, { sp: betta, discoveredMorphs: ['betta:Red Veiltail'], discoveredStrains: ['betta:cambodian_veil'], prismaticFinds: [], showCatalog: true }));
    expect(out).toContain('data-testid="enc-strains"');
    expect(out).toContain('data-testid="enc-catalog"');
    expect(out).toContain('data-testid="enc-prismatic"');
    expect(text(out)).toContain('Named strains · 1/10');
    expect(text(out)).toMatch(/Morph catalog · \d+\/540 seen/);
    expect(text(out)).toContain('Cambodian Veiltail Very rare New');
    expect(text(out)).toContain('A pale, flesh-pink body under flowing red veil fins — the classic Cambodian look.');
  });

  it('the science article, marked New', () => {
    const a = ARTICLES.find((x) => x.id === 'how_genes_combine')!;
    expect(a.title).toBe('How genes combine: dominant, recessive and additive');
    expect(a.teaser).toBe('Why a trait can skip a generation, and why some only show with two copies.');
    expect(a.isNew).toBe(true);
    const body = text(renderToStaticMarkup(createElement('div', null, a.body)));
    expect(body).toContain('Every animal carries two copies of each gene, one from each parent, and passes one of them, chosen at random, to each of its young.');
    expect(body).toContain('Dominant and recessive. When the two copies differ, one usually wins');
    expect(body).toContain('Additive. Some genes blend instead: each copy adds a little.');
    expect(body).toContain('Seeing what’s hidden. The Genetics Lab reads both copies of every gene, so you can spot carriers in the shop and plan pairings before the first clutch.');
  });
});
