/**
 * Lane guide — the keeper's guide (src/data/species/guide.ts) and the species text it shows: diet by food type, the
 * autofeeder verdict (same rule as the water sim), temperature/flow lines, "In real life" tips, and that every
 * species' feedingNote / keeperTip exists and agrees with the game's own food rules.
 */
import { describe, it, expect } from 'vitest';
import { ALL_SPECIES, getSpecies } from '@/data/species';
import { canAutofeed } from '@/sim/care/autofeed';
import { dietGuide, menuFor, foodsFor, temperatureGuide, specialNeedTips, realLifeTips, feedingLine, autofeederCanDispense, FLOW_GUIDE } from '@/data/species/guide';

const ids = (fs: { id: string }[]) => fs.map((f) => f.id);

describe('guide: diet by food type', () => {
  it('the lined seahorse eats frozen and live food only, so an autofeeder cannot feed it', () => {
    const d = dietGuide(getSpecies('lined_seahorse'));
    expect(d.groups.map((g) => g.form)).toEqual(['frozen', 'live']);
    expect(d.autofeeder.level).toBe('no');
    expect(d.autofeeder.foods).toEqual([]);
    expect(d.autofeeder.text).toMatch(/only eats frozen or live food/);
    expect(d.autofeeder.text).toMatch(/mysis/);
    expect(d.autofeeder.text).toMatch(/target-feed/);
  });

  it('pea puffers, figure-eight puffers and bumblebee gobies are frozen/live feeders too', () => {
    for (const id of ['pea_puffer', 'figure_eight_puffer', 'bumblebee_goby']) {
      const d = dietGuide(getSpecies(id));
      expect(d.autofeeder.level, id).toBe('no');
      expect(d.groups.some((g) => g.form === 'dry'), id).toBe(false);
    }
  });

  it('flake and pellet eaters can be autofed, and the guide names foods sold for their water', () => {
    const betta = dietGuide(getSpecies('betta'));
    expect(betta.autofeeder.level).toBe('yes');
    expect(betta.autofeeder.text).not.toMatch(/marine pellets/);
    expect(betta.autofeeder.text).toMatch(/frozen food by hand/);
    const clown = dietGuide(getSpecies('ocellaris_clownfish'));
    expect(clown.autofeeder.level).toBe('yes');
    expect(clown.autofeeder.text).not.toMatch(/goldfish/);
  });

  it('the autofeeder verdict follows the sim rule for every species (canAutofeed, the water sim’s own test)', () => {
    for (const sp of ALL_SPECIES) {
      const canSim = foodsFor(sp).some((f) => autofeederCanDispense(f.id));
      expect(canSim, sp.id).toBe(canAutofeed(sp));
      expect(dietGuide(sp).autofeeder.level, sp.id).toBe(canSim ? 'yes' : 'no');
    }
  });

  it('big-predator chunks stay off small mouths’ menus but stay on a lionfish’s', () => {
    expect(ids(menuFor(getSpecies('lined_seahorse')))).not.toContain('meaty_frozen');
    // lane:qa-r3 — krill & silversides lost its 'mysis' tag: too big for seahorses, so the sim doesn't feed it to them either
    expect(ids(foodsFor(getSpecies('lined_seahorse')))).not.toContain('meaty_frozen');
    expect(ids(menuFor(getSpecies('dwarf_lionfish')))).toContain('meaty_frozen');
    expect(ids(menuFor(getSpecies('panda_corydoras')))).not.toContain('axolotl_pellets');
  });

  it('foods sold for the other water stay off the menu (the sim still accepts them)', () => {
    expect(ids(menuFor(getSpecies('ocellaris_clownfish')))).not.toContain('goldfish_pellets');
    expect(ids(foodsFor(getSpecies('ocellaris_clownfish')))).toContain('goldfish_pellets');
    expect(ids(menuFor(getSpecies('betta')))).not.toContain('marine_pellets');
    expect(ids(menuFor(getSpecies('betta')))).toContain('micro_pellets');
  });

  it('grazers say they forage in the tank', () => {
    expect(dietGuide(getSpecies('otocinclus')).forages).toBe(true);
    expect(dietGuide(getSpecies('betta')).forages).toBe(false);
  });
});

describe('guide: temperature and flow', () => {
  it('bands each species by whether it needs a heater or cooling', () => {
    expect(temperatureGuide(getSpecies('axolotl')).label).toBe('Cold water');
    expect(temperatureGuide(getSpecies('axolotl')).text).toMatch(/chiller/);
    expect(temperatureGuide(getSpecies('discus')).label).toBe('Tropical');
    expect(temperatureGuide(getSpecies('discus')).text).toMatch(/heater/);
    expect(temperatureGuide(getSpecies('comet_goldfish')).label).toBe('Cool to room temperature');
    expect(temperatureGuide(getSpecies('cherry_shrimp')).label).toBe('Room temperature');
    expect(temperatureGuide(getSpecies('lined_seahorse')).label).toBe('Warm room temperature');
  });

  it('temperature lines never put a comparison word right after a °C value (the °F converter would read it as a difference)', () => {
    for (const sp of ALL_SPECIES) expect(temperatureGuide(sp).text, sp.id).not.toMatch(/°C\s+(below|above|cooler|warmer|colder|hotter|lower|higher|of|per)\b/);
  });

  it('every flow preference has a keeper line', () => {
    for (const sp of ALL_SPECIES) expect(FLOW_GUIDE[sp.flowPreference]?.text.length, sp.id).toBeGreaterThan(20);
  });
});

describe('guide: in real life', () => {
  it('special needs become practical tips', () => {
    expect(specialNeedTips(getSpecies('peacock_mantis_shrimp')).join(' ')).toMatch(/alone/);
    expect(specialNeedTips(getSpecies('peacock_mantis_shrimp')).join(' ')).toMatch(/glass/);
    expect(specialNeedTips(getSpecies('betta')).join(' ')).toMatch(/lid/);
    expect(specialNeedTips(getSpecies('dwarf_lionfish')).join(' ')).toMatch(/venomous/);
    expect(specialNeedTips(getSpecies('lined_seahorse')).join(' ')).toMatch(/anemones/);
    // the grazer tip only offers foods the animal really eats
    expect(specialNeedTips(getSpecies('trochus_snail')).join(' ')).not.toMatch(/blanched/);
  });

  it('every species has a keeper tip first and at least one tip', () => {
    for (const sp of ALL_SPECIES) {
      const tips = realLifeTips(sp);
      expect(tips.length, sp.id).toBeGreaterThan(0);
      if (sp.encyclopedia.keeperTip) expect(tips[0]).toBe(sp.encyclopedia.keeperTip.trim());
    }
  });
});

describe('species text: feeding notes agree with the game', () => {
  it('every species has a feedingNote and a keeperTip of sensible length', () => {
    for (const sp of ALL_SPECIES) {
      const e = sp.encyclopedia;
      expect(e.feedingNote?.length ?? 0, `${sp.id} feedingNote`).toBeGreaterThan(40);
      expect(e.feedingNote?.length ?? 0, `${sp.id} feedingNote`).toBeLessThan(320);
      expect(e.keeperTip?.length ?? 0, `${sp.id} keeperTip`).toBeGreaterThan(40);
      expect(e.keeperTip?.length ?? 0, `${sp.id} keeperTip`).toBeLessThan(260);
      expect(e.keeperTip ?? '', sp.id).not.toMatch(/^in real life/i);
    }
  });

  it('what a feedingNote says about autofeeders matches whether the game’s autofeeder can feed that animal', () => {
    const negative = /(can['’]t|cannot|won['’]t|will not|no use|useless|not (?:suit|work|help|an option|for)|isn['’]t|doesn['’]t|never|no real help|skip)/i;
    for (const sp of ALL_SPECIES) {
      const note = sp.encyclopedia.feedingNote ?? '';
      const sentences = note.split(/(?<=[.!?])\s+/).filter((s) => /auto-?feeder/i.test(s));
      if (!sentences.length) continue;
      const level = dietGuide(sp).autofeeder.level;
      for (const s of sentences) {
        if (level === 'no') expect(s, `${sp.id}: the game's autofeeder can't feed it, but the note says: ${s}`).toMatch(negative);
        // the game's autofeeder does feed it (a dry food it eats), so the note may limit it but never rule it out
        else expect(s, `${sp.id}: the game's autofeeder can feed it, but the note says: ${s}`).not.toMatch(/(can['’]t (?:help|feed)|no use|no help|won['’]t help|no real help|only drops? flakes and pellets)/i);
      }
    }
  });

  it('the fallback feeding line covers a species without a note', () => {
    const sp = { ...getSpecies('neon_tetra'), encyclopedia: { ...getSpecies('neon_tetra').encyclopedia, feedingNote: undefined } };
    expect(feedingLine(sp)).toMatch(/mid-water feeder that takes dry, frozen and live food/);
  });

  it('the seahorse note says it won’t take dry food and must be target-fed', () => {
    const n = getSpecies('lined_seahorse').encyclopedia.feedingNote ?? '';
    expect(n).toMatch(/mysis/i);
    expect(n).toMatch(/target-feed/i);
    expect(n).toMatch(/autofeeder/i);
  });
});

describe('guide: tips don’t repeat themselves', () => {
  it('a special-need tip is skipped when the species’ own tip already says it', () => {
    const firefish = realLifeTips(getSpecies('firefish'));
    expect(firefish[0]).toMatch(/lid/);
    expect(firefish.filter((t) => /lid/.test(t)).length).toBe(1);
    const lion = realLifeTips(getSpecies('dwarf_lionfish'));
    expect(lion.filter((t) => /venom|spine/i.test(t)).length).toBe(1);
  });
});
