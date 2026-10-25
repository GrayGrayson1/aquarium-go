// @vitest-environment node
/**
 * lane:ui-panels — the offer's Genes section (0.5 spec §7.4.1, MKT-007, MKT-008; nouns per ADR-0020): rule summaries
 * per mode, copies chips known from the phenotype, hidden before the Genetics Lab and revealed after it, and the footer.
 */
import { describe, it, expect } from 'vitest';
import type { Creature, Genome } from '@/types';
import { getSpecies, findSpecies, listSpecies } from '@/data/species';
import { geneRows, genesFooter, ruleSummary, locusNoun, aboutFraction, carriedTraits, expressedNewGenes, strainOrMorphTier, speciesPlural } from '@/ui/panels/market/offerGenetics';
import { matchRules, normalizeGenome, resolveMorph } from '@/sim/life/genetics';
import { mulberry32, hashString } from '@/sim/rng';

const P = { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 };
const G = (alleles: Record<string, [string, string]>): Genome => ({ alleles, potentials: { ...P } });
const betta = getSpecies('betta');
const locus = (sp: ReturnType<typeof getSpecies>, id: string) => sp.genetics.loci.find((l) => l.id === id)!;
const row = (rows: ReturnType<typeof geneRows>, id: string) => rows.find((r) => r.locusId === id)!;
const animal = (genome: Genome, sex: Creature['sex'] = 'male', name = 'Test') => ({ name, sex, genome, morphName: '' }) as unknown as Creature;

describe('rule summaries', () => {
  it('mendelian: top of the ladder, recessive to one or two, to most', () => {
    expect(ruleSummary(betta, locus(betta, 'color'), 'red')).toBe('Dominant over every other colour');
    expect(ruleSummary(betta, locus(betta, 'color'), 'royal')).toBe('Recessive to Red');
    expect(ruleSummary(betta, locus(betta, 'fins'), 'halfmoon')).toBe('Recessive to Veiltail and Plakat (short fin)');
    expect(ruleSummary(betta, locus(betta, 'color'), 'copper')).toBe('Recessive to most colours');
    expect(ruleSummary(betta, locus(betta, 'fins'), 'double')).toBe('Recessive to most fin types');
    expect(ruleSummary(betta, locus(betta, 'pattern'), 'marble')).toBe('Recessive to most patterns');
  });

  it('new genes get the prefix, Cambodian the conditional suffix; additive and codominant read their copies', () => {
    expect(ruleSummary(betta, locus(betta, 'cambodian'), 'c')).toBe('New gene · Recessive to Normal body · only shows on red bettas');
    expect(ruleSummary(betta, locus(betta, 'metallic'), 'me')).toBe('New gene · Additive · two copies = Metallic');
    const clown = getSpecies('ocellaris_clownfish');
    expect(ruleSummary(clown, locus(clown, 'snow'), 'sn')).toBe('Codominant · one copy Snowflake, two Platinum');
    const axo = getSpecies('axolotl');
    expect(ruleSummary(axo, locus(axo, 'albino'), 'A')).toBe('Dominant over every other version');
    expect(ruleSummary(axo, locus(axo, 'albino'), 'a')).toBe('Recessive to Normal');
  });

  it('nouns come from the gene’s name (ADR-0020)', () => {
    const n = (name: string) => locusNoun({ id: 'x', name, mode: 'mendelian', alleles: [] })[0];
    expect([n('Body colour'), n('Base hue'), n('Colour tone'), n('Pattern'), n('Finnage'), n('Tail type'), n('Colour line'), n('Strain line'), n('Body type'), n('Pinto')]).toEqual(['colour', 'colour', 'colour', 'pattern', 'fin type', 'fin type', 'colour', 'line', 'form', 'version']);
  });

  it('"only shows on …" only where every rule that shows the gene needs that other trait', () => {
    const conditional: string[] = [];
    for (const sp of listSpecies((s) => s.genetics.loci.length > 0)) for (const l of sp.genetics.loci) for (const a of l.alleles) if (ruleSummary(sp, l, a.id).includes('only shows on')) conditional.push(`${sp.id}:${l.id}`);
    // chunk 16 adds three genes that really do need another trait: the platy's E only shows on comet fish (the
    // wagtail), and an albino swordtail shows neither its black forms nor its wagtail
    expect([...new Set(conditional)].sort()).toEqual(['betta:cambodian', 'platy:spread', 'swordtail:melanin', 'swordtail:wagtail']);
    const platy = getSpecies('platy');
    const sword = getSpecies('swordtail');
    expect(ruleSummary(platy, locus(platy, 'spread'), 'E')).toBe('Dominant over every other version · only shows on comet platies');
    expect(ruleSummary(sword, locus(sword, 'melanin'), 'Tx')).toBe('Recessive to Black · only shows on pigmented swordtails');
    expect(ruleSummary(sword, locus(sword, 'wagtail'), 'Wg')).toBe('Dominant over every other fin type · only shows on pigmented swordtails');
  });

  it('every shop species gets a row per locus, in data order', () => {
    for (const sp of listSpecies((s) => s.genetics.loci.length > 0)) {
      const rows = geneRows(sp, G({}), false);
      expect(rows.map((r) => r.locusId)).toEqual(sp.genetics.loci.map((l) => l.id));
      for (const r of rows) if (r.trait !== 'Can’t be seen on this animal') expect(r.summary.length, `${sp.id}:${r.locusId}`).toBeGreaterThan(5);
    }
  });
});

describe('copies chips', () => {
  it('a betta shows five rows, NEW on the last two', () => {
    const rows = geneRows(betta, G({ color: ['royal', 'yellow'], pattern: ['butterfly', 'marble'], fins: ['halfmoon', 'crown'], cambodian: ['C', 'c'], metallic: ['me', 'std'] }), false);
    expect(rows.map((r) => [r.label, r.isNew])).toEqual([
      ['Body colour', false],
      ['Pattern', false],
      ['Finnage', false],
      ['Cambodian', true],
      ['Metallic', true],
    ]);
  });

  it('known from the phenotype: additive always, the bottom of a ladder as two copies', () => {
    const rows = geneRows(betta, G({ color: ['white', 'white'], pattern: ['marble', 'marble'], fins: ['double', 'double'], cambodian: ['C', 'C'], metallic: ['std', 'std'] }), false);
    expect(row(rows, 'color').copies).toEqual({ kind: 'known', text: '2 copies', title: 'The visible trait already proves this' });
    expect(row(rows, 'metallic').copies).toEqual({ kind: 'known', text: 'no copies', title: 'The visible trait already proves this' });
    expect(row(rows, 'metallic').trait).toBe('Standard sheen');
    const one = geneRows(betta, G({ metallic: ['me', 'std'] }), false);
    expect(row(one, 'metallic').copies.text).toBe('1 copy');
    expect(row(one, 'metallic').trait).toBe('Metallic');
    // a red c/c betta shows Cambodian, which proves both copies
    const red = geneRows(betta, G({ color: ['red', 'red'], cambodian: ['c', 'c'] }), false);
    expect(row(red, 'cambodian')).toMatchObject({ trait: 'Cambodian', copies: { kind: 'known', text: '2 copies' } });
  });

  // chunk 2 review: Cambodian can't show on a royal betta, so before the lab its row names nothing (ADR-0021); it read
  // "Normal body", which a c/c royal isn't
  it('before the lab a possible hidden copy is "+ ?"; a gene that can’t show on this animal names no allele', () => {
    const rows = geneRows(betta, G({ color: ['royal', 'royal'], cambodian: ['c', 'c'] }), false);
    expect(row(rows, 'color').copies).toEqual({ kind: 'hidden', text: '+ ?', title: 'Second copy hidden until the Genetics Lab' });
    expect(row(rows, 'cambodian')).toMatchObject({ trait: 'Can’t be seen on this animal', summary: '', copies: { kind: 'hidden', text: '+ ?' } });
    // on a red betta it does show: C/? reads "Normal body" with a possible hidden copy
    expect(row(geneRows(betta, G({ color: ['red', 'red'], cambodian: ['C', 'c'] }), false), 'cambodian')).toMatchObject({ trait: 'Normal body', copies: { kind: 'hidden', text: '+ ?' } });
    // after the lab the real alleles show
    expect(row(geneRows(betta, G({ color: ['royal', 'royal'], cambodian: ['c', 'c'] }), true), 'cambodian')).toMatchObject({ trait: 'Cambodian', copies: { kind: 'revealed', text: '2 copies' } });
  });

  it('before the lab two animals that look alike read alike, in every species (no leak)', () => {
    const rnd = mulberry32(hashString('offer-genes:lookalikes'));
    for (const sp of listSpecies((s) => s.genetics.loci.length > 0)) {
      const byLook = new Map<string, string>();
      for (let i = 0; i < 160; i++) {
        const alleles: Record<string, [string, string]> = {};
        for (const l of sp.genetics.loci) {
          const pick = () => l.alleles[Math.floor(rnd.next() * l.alleles.length)].id;
          alleles[l.id] = [pick(), pick()];
        }
        const g = G(alleles);
        const m = matchRules(sp, normalizeGenome(sp, g));
        const look = [m.base?.id ?? '', ...m.partialBases.map((r) => `~${r.id}`), ...m.overlayWeights.map((o) => `${o.rule.id}:${o.weight}`)].join('|');
        const shown = JSON.stringify(geneRows(sp, g, false).map((r) => [r.trait, r.summary, r.copies.kind, r.copies.text]));
        const seen = byLook.get(look);
        if (seen === undefined) byLook.set(look, shown);
        else expect(shown, `${sp.id}: ${look}`).toBe(seen);
      }
    }
  });

  it('lined seahorse (ADR-0022): yellow/red looks Yellow, so a Classic Dark seahorse proves its dark copy', () => {
    const sh = getSpecies('lined_seahorse');
    expect(resolveMorph(sh, G({ hue: ['yellow', 'red'] })).morphName).toBe(resolveMorph(sh, G({ hue: ['yellow', 'yellow'] })).morphName);
    expect(resolveMorph(sh, G({ hue: ['red', 'red'] })).morphName).toContain('Red');
    expect(row(geneRows(sh, G({ hue: ['dark', 'yellow'] }), false), 'hue')).toMatchObject({ trait: 'Dark', copies: { kind: 'hidden', text: '+ ?' } });
  });

  it('alleles that both show read in the locus’s order', () => {
    const a = row(geneRows(betta, G({ pattern: ['dragon', 'marble'] }), false), 'pattern');
    const b = row(geneRows(betta, G({ pattern: ['marble', 'dragon'] }), false), 'pattern');
    expect(a.trait).toBe('Marble / Dragon scale');
    expect(b.trait).toBe(a.trait);
    expect(a.copies).toMatchObject({ kind: 'known', text: '1 copy' });
  });

  it('after the lab: carries {allele}, 2 copies, no copies; rare carriers sparkle', () => {
    const rows = geneRows(betta, G({ color: ['yellow', 'white'], pattern: ['solid', 'solid'], fins: ['crown', 'double'], cambodian: ['C', 'c'], metallic: ['std', 'std'] }), true);
    expect(row(rows, 'color').copies).toEqual({ kind: 'revealed', text: 'carries Opaque white', rare: true });
    expect(row(rows, 'pattern').copies).toEqual({ kind: 'revealed', text: '2 copies' });
    expect(row(rows, 'fins').copies).toEqual({ kind: 'revealed', text: 'carries Double tail', rare: true });
    expect(row(rows, 'cambodian').copies).toEqual({ kind: 'revealed', text: 'carries Cambodian', rare: true });
    expect(row(geneRows(betta, G({ cambodian: ['C', 'C'] }), true), 'cambodian').copies).toEqual({ kind: 'revealed', text: 'no copies', rare: false });
    expect(row(geneRows(betta, G({ color: ['red', 'royal'] }), true), 'color').copies).toEqual({ kind: 'revealed', text: 'carries Royal blue', rare: false });
  });
});

describe('footer', () => {
  it('locked before the lab when something may hide', () => {
    const g = G({ color: ['royal', 'yellow'] });
    expect(genesFooter(betta, animal(g), geneRows(betta, g, false), false)).toEqual({ kind: 'locked', text: 'What it carries stays hidden until you research the Genetics Lab.' });
  });

  it('nothing hidden: additive-only species, and a lab-read animal with nothing carried', () => {
    const puffer = findSpecies('pea_puffer')!;
    const pg = G({});
    expect(genesFooter(puffer, animal(pg), geneRows(puffer, pg, false), false).text).toBe('Nothing hidden: additive traits always show their copies.');
    const plain = G({ color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'C'], metallic: ['std', 'std'] });
    expect(genesFooter(betta, animal(plain), geneRows(betta, plain, true), true).text).toBe('Nothing hidden: every trait here shows its copies.');
  });

  it('after the lab: pair advice, and a known partner’s forecast (about 3 in 8 Red Cambodian)', () => {
    const him = G({ color: ['red', 'copper'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'c'], metallic: ['std', 'std'] });
    const rows = geneRows(betta, him, true);
    expect(genesFooter(betta, animal(him, 'male'), rows, true).text).toBe('Genetics Lab: Pair him with another Cambodian carrier for about 1 in 4 Cambodian young.');
    const cinder = animal(G({ color: ['red', 'royal'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'], metallic: ['std', 'std'] }), 'female', 'Cinder');
    expect(genesFooter(betta, animal(him, 'male'), rows, true, [cinder]).text).toBe('Genetics Lab: He carries Cambodian: paired with Cinder, about 3 in 8 young would be Red Cambodian.');
    expect(aboutFraction(0.375)).toBe('3 in 8');
    expect(aboutFraction(0.25)).toBe('1 in 4');
    expect(aboutFraction(0.5)).toBe('1 in 2');
    for (const s of [0.9, 0.97, 1]) expect(aboutFraction(s)).not.toMatch(/^(\d+) in \1$/);
  });

  it('every youngster: "all their young" (ADR-0021); an unsexed animal: "Pair it"', () => {
    const royal = G({ color: ['royal', 'royal'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'], metallic: ['std', 'std'] });
    const cinder = animal(G({ color: ['red', 'red'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['c', 'c'], metallic: ['std', 'std'] }), 'female', 'Cinder');
    expect(genesFooter(betta, animal(royal, 'male'), geneRows(betta, royal, true), true, [cinder]).text).toBe('Genetics Lab: He carries Cambodian: paired with Cinder, all their young would be Red Cambodian.');
    const him = G({ color: ['red', 'copper'], pattern: ['solid', 'solid'], fins: ['veil', 'veil'], cambodian: ['C', 'c'], metallic: ['std', 'std'] });
    expect(genesFooter(betta, animal(him, 'unknown'), geneRows(betta, him, true), true).text).toBe('Genetics Lab: Pair it with another Cambodian carrier for about 1 in 4 Cambodian young.');
  });
});

describe('card chips', () => {
  it('New gene only when a 0.5 gene shows; Carries for hidden rare alleles; strain or morph tier', () => {
    expect(expressedNewGenes(betta, G({ color: ['red', 'red'], cambodian: ['c', 'c'] }))).toEqual(['Cambodian']);
    expect(expressedNewGenes(betta, G({ color: ['royal', 'royal'], cambodian: ['c', 'c'] }))).toEqual([]);
    expect(expressedNewGenes(betta, G({ metallic: ['me', 'me'] }))).toEqual(['Metallic']);
    expect(expressedNewGenes(betta, G({ metallic: ['me', 'std'] }))).toEqual([]);
    expect(carriedTraits(betta, G({ color: ['red', 'red'], cambodian: ['C', 'c'] })).map((t) => [t.name, t.rare])).toEqual([['Cambodian', true]]);
    const axo = getSpecies('axolotl');
    // d/d a/a is White Albino: both recessives show, nothing hides
    expect(carriedTraits(axo, G({ dark: ['d', 'd'], albino: ['a', 'a'] }))).toEqual([]);
    expect(strainOrMorphTier(betta, { morphName: 'Royal Blue Butterfly Halfmoon', genome: G({ color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'] }) })).toEqual({ strain: 'Royal Butterfly Halfmoon', tier: 'rare' });
    expect(strainOrMorphTier(betta, { morphName: 'Red Veiltail', genome: G({}) })).toBeNull();
    expect(strainOrMorphTier(betta, { morphName: 'Red Halfmoon', genome: G({ fins: ['halfmoon', 'halfmoon'] }) })).toEqual({ tier: 'uncommon' });
    expect([speciesPlural(betta), speciesPlural(getSpecies('axolotl')), speciesPlural(findSpecies('cherry_shrimp')!)]).toEqual(['bettas', 'axolotls', 'cherry shrimp']);
    const pl = (id: string) => speciesPlural(findSpecies(id)!);
    expect(['fancy_guppy', 'sailfin_molly', 'watchman_goby', 'discus', 'panda_corydoras', 'otocinclus', 'green_chromis'].map(pl)).toEqual(['fancy guppies', 'sailfin mollies', 'yellow watchman gobies', 'discus', 'panda corydoras', 'otocinclus', 'green chromis']);
  });
});
