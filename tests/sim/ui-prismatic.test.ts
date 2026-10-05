/**
 * lane:genetics — Prismatic / strain / catalog presentation (server-rendered, like ui-fit-note): ordinary animals render
 * nothing, the badge is labelled for screen readers, undiscovered strain and catalog entries only reveal trait names
 * the player has already seen, and the Prismatic box quotes the configured odds.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSpecies } from '@/data/species';
import { PRISMATIC } from '@/data/rarity';
import { oneInLabel } from '@/sim/life/rareVariants';
import { morphCatalog, seenTraitIds } from '@/sim/life/morphCatalog';
import { PrismaticBadge } from '@/ui/common/Prismatic';
import { CatalogTree, PrismaticBox, StrainList, catalogHint } from '@/ui/panels/encyclopedia/MorphCatalog';

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);
const betta = getSpecies('betta');

describe('Prismatic badge', () => {
  it('renders nothing for an ordinary animal', () => {
    expect(html(createElement(PrismaticBadge, { creature: {} }))).toBe('');
  });

  it('is visible text plus a screen-reader explanation for a Prismatic', () => {
    const out = html(createElement(PrismaticBadge, { creature: { rareVariant: { kind: 'prismatic', origin: 'shop', visualSeed: 3 } } }));
    expect(out).toContain('data-testid="prismatic-badge"');
    expect(out).toContain('Prismatic');
    expect(out).toContain('an ultra-rare individual');
  });
});

describe('encyclopedia genetics sections', () => {
  it('strain recipes reveal only traits the player has seen', () => {
    const seen = seenTraitIds(betta, ['Royal Blue Veiltail']);
    const out = html(createElement(StrainList, { sp: betta, found: new Set<string>(), seenTraits: seen }));
    expect(out).toContain('data-testid="enc-strains"');
    expect(out).toContain('Named strains · 0/');
    expect(out).toContain('Royal Blue'); // seen in "Royal Blue Veiltail"
    expect(out).toContain('???'); // Butterfly / Halfmoon not seen yet
    expect(out).not.toContain('Dragon Scale');
  });

  it('the catalog tree lists base colours with counts and hints for unseen combinations', () => {
    const cat = morphCatalog(betta);
    const seenNames = new Set(['Red Veiltail']);
    const seen = seenTraitIds(betta, seenNames);
    const out = html(createElement(CatalogTree, { sp: betta, groups: cat.groups, total: cat.entries.length, seenNames, seenTraits: seen, initiallyOpen: ['Red'] }));
    expect(out).toContain('data-testid="enc-catalog"');
    expect(out).toContain('Morph catalog · 1/240 seen');
    expect(out).toContain('Red Veiltail');
    const redHalfmoon = cat.byName.get('Red Halfmoon')!;
    expect(catalogHint(betta, redHalfmoon, seen)).toBe('Red · ???');
    expect(out).toContain('Red · ???');
  });

  it('the Prismatic box quotes the configured odds until one is found', () => {
    const none = html(createElement(PrismaticBox, { sp: betta, finds: [] }));
    expect(none).toContain('data-testid="enc-prismatic"');
    expect(none).toContain(oneInLabel(PRISMATIC.shopChance));
    expect(none).toContain('game-only');
    const found = html(createElement(PrismaticBox, { sp: betta, finds: [{ speciesId: 'betta', creatureId: 'cr_1', name: 'Opal', morphName: 'Red Veiltail', origin: 'spontaneous', hour: 30 }] }));
    expect(found).toContain('Opal');
    expect(found).toContain('day 2');
  });
});
