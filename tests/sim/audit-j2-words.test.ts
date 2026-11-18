// @vitest-environment node
/**
 * Audit 2026-11-17, the wording sweep's second half (J21 to J40) and its follow-ups: the words players read say what
 * they mean, in the game's own vocabulary. Copy is asserted exactly where a constant or a sim line carries it; words
 * typed into JSX are checked in the source (the jargon they replaced must not come back).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SEX_LABEL, PURPOSE_HINT, sexLabel } from '@/ui/panels/common/format';
import { sexRoleText } from '@/ui/common/format';
import { offerSearchMatches } from '@/ui/panels/market/shopFilters';
import type { ShopOffer } from '@/types';
import { unlockLink } from '@/ui/hud/eventLinks';
import { tourStops } from '@/ui/tutorial/tourStops';
import { CRITERION_LABEL } from '@/data/shows';
import { AUTOMATION_LOCK_HINT } from '@/ui/cards/Automation';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { newGame } from '@/sim/newGame';
import { grantReward } from '@/sim/facility/progression';
import { moduleFor } from '@/sim/life/breeding/registry';
import { getSpecies } from '@/data/species';
import { tierLadder } from '@/ui/common/ops';
import { whenPhrase, saltBuyLabel } from '@/ui/panels/operations/issues';
import { money as showMoney } from '@/ui/panels/shows/util';
import { LOAD_FAILED, onlineLoadError } from '@/ui/online/cloudSync';
import { SHARED_WORDS } from '@/ui/shared/words';
import { ALL_SPECIES } from '@/data/species';
import { morphCatalog } from '@/sim/life/morphCatalog';
import { hasNoNamedMorphs } from '@/ui/panels/encyclopedia/morphs';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { exhibitInfo } from '@/sim/facility/exhibit';
import { removeEquipment } from '@/sim/care';
import { getEquipmentDef } from '@/data/catalog/equipment';

const src = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

describe('Audit 2026-11-17 (J22): jargon gets plain words where it appears', () => {
  it('labels and hints', () => {
    expect(SEX_LABEL.unknown).toBe('Sex not known yet');
    expect(PURPOSE_HINT.breeding).toBe('Getting ready to spawn, away from tank mates.');
    expect(CRITERION_LABEL.deportment).toBe('Behaviour');
    expect(AUTOMATION_LOCK_HINT).toBe('Research Better Life Support, or raise Husbandry mastery by caring for your tanks.');
    expect(UNLOCK_RULE_BY_KEY.gear_autofeeder.hint).toBe(AUTOMATION_LOCK_HINT);
  });

  it('the words typed into the screens', () => {
    const cases: [string, string, string][] = [
      ['ui/panels/market/Listings.tsx', 'bids from NPC buyers', 'bids from buyers arrive here'],
      ['ui/settings/SettingsPanel.tsx', 'The HUD softly fades', 'The buttons fade after a few quiet seconds in tank view. Move the pointer or tap to bring them back.'],
      ['ui/hud/ToolRail.tsx', 'No pointer?', 'Or drop it at the surface:'],
      ['ui/panels/market/FragListing.tsx', 'LPS and SPS', 'stony corals more than soft corals'],
      ['ui/panels/build/BuildPanel.tsx', ' gph`', ' gallons an hour`'],
      ['ui/hud/AlertsAutomation.tsx', 'Add QT tank', 'Add quarantine tank'],
      ['ui/panels/market/Shop.tsx', 'Sold as one lot ·', 'Sold together · '],
      ['ui/panels/market/Shop.tsx', 'aria-label="Unsexed"', 'aria-label={sexLabel(c, sp, hour)}'],
      ['ui/panels/market/CreateListing.tsx', 'aria-label="Unsexed"', 'aria-label={sexLabel(c, speciesOf(c.speciesId), hour)}'],
      ['ui/panels/livestock/Production.tsx', 'Pair conditioning', 'Pair getting ready'],
      ['ui/panels/shows/Upcoming.tsx', 'Purse <', 'Prizes <strong>'],
      ['ui/panels/shows/Upcoming.tsx', 'table show', 'A friendly club show · judge'],
      ['ui/panels/shows/EnterFlow.tsx', 'Purse <', 'Prizes <b>'],
      // the review: the class's purse is split 55 / 27 / 18 % (PRIZE_SPLIT), so it's "Prizes", as Upcoming says
      ['ui/panels/shows/EnterFlow.tsx', 'Prize <b>', 'Prizes <b>{money(cl.purse)}</b>'],
      ['ui/panels/operations/Overview.tsx', 'husbandry mastery with regular care', 'raise Husbandry mastery by caring for your tanks.'],
      ['ui/panels/operations/LinesTab.tsx', '{ id: \'quarantine\', label: \'QT\' }', 'full: \'Quarantine\''],
      ['ui/panels/visitors/StaffTab.tsx', '<RoleTag role={m.role} />', 'docent: \'gives talks\''],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
  });

  it('the review: “Sex not known yet” only where the sex will show; elsewhere the creature card’s words, and “unsexed” still finds them', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const rng = simRng(g);
    const seen = new Set<string>();
    for (const sp of ALL_SPECIES) {
      for (const ageDays of [10, 60, Math.floor(sp.lifecycle.lifespanDays * 0.6)]) {
        const c = createCreature(g, rng, sp.id, { ageDays });
        const word = sexLabel(c, sp, g.clock.hour);
        seen.add(word);
        const id = `${sp.id} at ${ageDays} days`;
        if (c.sex === 'male' || c.sex === 'female') expect(word, id).toBe(SEX_LABEL[c.sex]);
        else if (sp.sexSystem === 'simultaneous_hermaphrodite') expect(word, id).toBe('Both sexes');
        else if (sp.lifecycle.sexVisibleAtDays >= sp.lifecycle.lifespanDays && sp.sexSystem !== 'protandrous' && sp.sexSystem !== 'protogynous') expect(word, id).toBe('Can’t be told by eye');
        if (word === SEX_LABEL.unknown) expect(sp.lifecycle.sexVisibleAtDays, id).toBeLessThan(sp.lifecycle.lifespanDays); // "yet" only where it will show
        if (c.sex === 'unknown') expect(word, id).toBe(sexRoleText(c, sp, g.clock.hour).label === 'Not yet visible' ? SEX_LABEL.unknown : sexRoleText(c, sp, g.clock.hour).label);
      }
    }
    expect([...seen].sort()).toEqual(['Both sexes', 'Can’t be told by eye', 'Female', 'Male', 'Not yet differentiated', 'Sex not known yet']);
    // the Shop's search: an animal whose sex isn't known is found by "unsexed" and by its card's words
    const offer = (speciesId: string) => {
      const c = createCreature(g, rng, speciesId, { ageDays: 60 });
      return { ...g.market.stock[0], speciesId, kind: 'creature', creatures: [c] } as ShopOffer;
    };
    const ramshorn = offer('ramshorn_snail');
    const nerite = offer('nerite_snail');
    expect(offerSearchMatches(ramshorn, 'unsexed', g.clock.hour)).toBe(true);
    expect(offerSearchMatches(ramshorn, 'both sexes', g.clock.hour)).toBe(true);
    expect(offerSearchMatches(nerite, 'unsexed', g.clock.hour)).toBe(true);
    expect(offerSearchMatches(nerite, 'told by eye', g.clock.hour)).toBe(true);
    const young = offer('axolotl');
    young.creatures[0] = createCreature(g, rng, 'axolotl', { ageDays: 10 }); // its sex shows later
    expect(sexLabel(young.creatures[0], getSpecies('axolotl'), g.clock.hour)).toBe('Sex not known yet');
    expect(offerSearchMatches(young, 'unsexed', g.clock.hour)).toBe(true);
    const sexed = offer('betta');
    expect(sexed.creatures[0].sex).not.toBe('unknown');
    expect(offerSearchMatches(sexed, 'unsexed', g.clock.hour)).toBe(false);
  });
});

describe('Audit 2026-11-17 (J24, the part that needs no choice): one name for the quick-sale buyer inside one box', () => {
  it('the quick-sell box and the reputation line say "the local fish store", as the box’s own price line does', () => {
    const box = src('ui/panels/livestock/LivestockPanel.tsx');
    expect(box).not.toContain('Quick sell to the local shop?');
    expect(box).toContain('title="Quick sell to the local fish store?"');
    expect(box).toContain('The local fish store offers');
    expect(src('sim/economy/listings.ts')).toContain("'Sold unwell animals to the local fish store'");
  });
});

describe('Audit 2026-11-17 (J25): one word for one thing', () => {
  it('the screens say the same thing the same way', () => {
    const cases: [string, string, string][] = [
      ['ui/hud/ToolRail.tsx', 'label="Watch"', 'label="Just watch"'],
      ['ui/tutorial/tourStops.ts', 'Watch hides everything so you can just', "${ctx.mobile ? 'Watch' : 'Just watch'} hides everything"],
      ['ui/panels/build/BuildPanel.tsx', 'Too pricey', '`Need ${formatMoney(Math.ceil(kit.total - g.finance.money - 1e-6))} more`'],
      ['ui/panels/research/ResearchPanel.tsx', 'Can’t afford', '`Need ${formatMoney(Math.ceil(cost - g.finance.money - 1e-6))} more`'],
      ['ui/panels/build/FragAction.tsx', 'holding system', 'Waiting in storage, where they don’t grow.'],
      ['sim/economy/listings.ts', 'holding system', 'Listed frags wait in storage'],
      ['sim/aquascape/frags.ts', 'Your holding system is full', 'Frag storage is full'],
      ['ui/panels/log/LogPanel.tsx', 'title="Log"', 'title="Event log"'],
      ['ui/panels/shows/EnterFlow.tsx', 'backLabel="Calendar"', 'backLabel="Upcoming"'],
      ['ui/panels/shows/Results.tsx', 'Browse the calendar', 'See upcoming shows'],
      ['ui/panels/social/copy.ts', "'Join group'", "joinGroup: 'Join club'"],
      ['ui/panels/shows/TrophyCase.tsx', 'in memoriam', "'in memory'"],
      ['ui/panels/finances/FinancesPanel.tsx', 'Spending', "label: 'Expenses'"],
      ['ui/panels/livestock/LivestockPanel.tsx', "['juveniles', 'Juveniles']", "['juveniles', 'Young']"],
      ['ui/shared/SharedScreens.tsx', "'Title'", "'Back to the title screen'"],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
  });

  it('the review: sentences that point at a renamed label name it as the screen shows it', () => {
    const cases: [string, string, string][] = [
      ['ui/panels/livestock/LivestockPanel.tsx', 'Animals → Juveniles', 'find them in Animals › Young.'],
      ['ui/hud/eventLinks.ts', 'the Shows calendar', "'Regional shows are in Shows › Upcoming.'"],
      ['ui/panels/market/Shop.tsx', 'Sold as one lot', "'Sold together — this group includes a Prismatic'"],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
    expect(unlockLink('shows_national')?.where).toBe('National championships are in Shows › Upcoming.');
    // the tour names the tool as the rail shows it: "Watch" on a phone's rail, "Just watch" elsewhere
    const tools = (mobile: boolean) => tourStops({ mobile, unlocked: () => true, social: false }).find((t) => t.id === 'tools')!.body;
    expect(tools(false)).toContain('Just watch hides everything so you can enjoy the view.');
    expect(tools(true)).toContain('. Watch hides everything so you can enjoy the view.');
    expect(src('ui/hud/ToolRail.tsx')).toContain('label="Just watch"\n        shortLabel="Watch"');
  });
});

describe('Audit 2026-11-17 (J27): lines say what you got, and promise nothing that can’t come', () => {
  it('a food reward names the food', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const before = g.inventory.foods.bloodworm_frozen ?? 0;
    expect(grantReward(g, { foods: { bloodworm_frozen: 4 } }, 'test')).toEqual(['4 servings of frozen bloodworms']);
    expect(g.inventory.foods.bloodworm_frozen).toBe(before + 4);
  });

  it('shrimp larvae that can’t be raised say so, without a “yet” that sends players looking for an unlock', () => {
    const amano = getSpecies('amano_shrimp');
    const mod = moduleFor(amano);
    expect(mod.explain?.(amano)).toBe('Amano Shrimp larvae drift as plankton and need special brackish larval rearing, which Aquarium Go doesn’t include.');
    expect(mod.plan.nonViableText).toBe('The shrimp eggs hatched overnight into drifting larvae. They need weeks of specialised brackish or marine larval rearing, which Aquarium Go doesn’t include, so they were lost to the current.');
    for (const f of ['sim/life/breeding/systems/shrimp.ts', 'sim/life/breeding/clutch.ts']) expect(src(f)).not.toMatch(/this shop (for now|can’t|yet)|isn’t available yet/);
  });

  it('a facility level you have reached reads “reached”', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    g.facility.level = 'aquarium_store';
    const reqs = tierLadder(g).flatMap((t) => t.reqs.map((r) => r.text));
    expect(reqs).toContain('Specialty Shop: reached');
    expect(reqs.join(' ')).not.toContain('past it');
  });
});

describe('Audit 2026-11-17 (J29): a shared link previews with a description', () => {
  it('index.html has a one-sentence description and the matching Open Graph tags', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const meta = (attr: string, key: string) => new RegExp(`<meta ${attr}="${key}" content="([^"]*)" />`).exec(html)?.[1];
    const d = 'A living aquarium game where every animal is an individual: raise remarkable creatures and build living worlds.';
    expect(meta('name', 'description')).toBe(d);
    expect(meta('property', 'og:description')).toBe(d);
    expect(meta('property', 'og:title')).toBe('Aquarium Go');
    expect(meta('property', 'og:type')).toBe('website');
  });
});

describe('Audit 2026-11-17 (J30): numbers say what they count', () => {
  it('a time inside a sentence reads “at”, “tomorrow at” or “on Day N at”', () => {
    const now = 24 * 3 + 8; // Day 4, 8:00 AM
    expect(whenPhrase(24 * 3 + 9, now)).toBe('at 9:00 AM');
    expect(whenPhrase(24 * 4 + 9, now)).toBe('tomorrow at 9:00 AM');
    expect(whenPhrase(24 * 11 + 9, now)).toBe('on Day 12 at 9:00 AM');
  });

  it('servings, gallons and days carry their unit', () => {
    const cases: [string, string, string][] = [
      ['ui/panels/operations/WaterTab.tsx', 'gal batches below 60%', 'gal batches when the salt water reserve is below 60%'],
      ['ui/panels/operations/WaterTab.tsx', '>Short Day {', '>Short on Day {'],
      ['ui/panels/operations/WaterTab.tsx', 'reorders ${whenText(', 'reorders ${whenPhrase('],
      ['ui/panels/operations/MapTab.tsx', 'Runs short about Day', 'Runs short on about Day'],
      ['ui/panels/operations/MapTab.tsx', '* 3} a day`', '* 3} servings a day`'],
      ['ui/panels/operations/MapTab.tsx', 'FOOD_ROOM.coneYield} a day', 'FOOD_ROOM.coneYield} servings a day'],
      ['ui/panels/operations/MapTab.tsx', '{g1(r.f)} fresh + {g1(r.s)} salt', '{g1(r.f)} gal fresh + {g1(r.s)} gal salt'],
      ['ui/panels/operations/FeedTab.tsx', 'made / used a day', 'Makes {made} · uses {used} a day'],
      ['ui/panels/operations/FeedTab.tsx', "'brine' : 'infusoria'}`", "'baby brine' : 'infusoria'} servings a day`"],
      ['ui/panels/operations/Overview.tsx', 'glass weekly`', 'glass cleaned weekly`'],
      ['ui/panels/operations/Overview.tsx', '${brine} a day', '${brine} servings a day'],
      ['ui/panels/operations/issues.ts', 'makes up to ${Math.round(p.capacity ?? 0)}.', 'makes up to ${Math.round(p.capacity ?? 0)} gal a day.'],
      ['ui/panels/operations/issues.ts', 'prep station makes ${Math.round(p.capacity ?? 0)}.', 'prep station makes ${Math.round(p.capacity ?? 0)} gal a day.'],
      ['ui/panels/operations/LinesTab.tsx', 'lists ${v.quarantined.count}`', 'lists ${v.quarantined.count} ${v.quarantined.word}`'],
      ['ui/panels/livestock/Production.tsx', 'value: `~${v.next.days}', 'value: `About ${v.next.days}'],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
  });

  it('money goes through formatMoney, not "$" and a number', () => {
    for (const f of ['ui/panels/operations/issues.ts', 'ui/panels/operations/actions.ts', 'ui/panels/shows/util.ts']) expect(src(f), f).not.toMatch(/`[^`]*\$\$\{/);
    expect(saltBuyLabel).toMatch(/^Buy \d+ kg · \$\d+$/);
    expect(showMoney(1234.4)).toBe('$1,234');
  });
});

describe('Audit 2026-11-17 (J31, the part that needs no choice): a hobbyist is a fishkeeper', () => {
  it('the encyclopedia’s release note doesn’t use “keeper”, the staff role’s word', () => {
    const s = src('ui/panels/encyclopedia/EncyclopediaPanel.tsx');
    expect(s).not.toContain('goes to another keeper');
    expect(s).toContain('goes to another fishkeeper. Aquarium animals should never be released into the wild.');
  });
});

describe('Audit 2026-11-17 (J32): a machine or a tier has one name on a screen', () => {
  it('the Map, Water, Feed and Overview use the Build › Facility names, and the locked tiles name their tier', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    expect(tierLadder(g).map((t) => t.name)).toEqual(['Water room', 'Live food room', 'Breeding facility', 'Operations Desk']);
    const cases: [string, string, string][] = [
      ['ui/panels/operations/MapTab.tsx', 'name="Prep station"', 'name="Water Prep Station"'],
      ['ui/panels/operations/MapTab.tsx', 'name="Salt mixer"', 'name="Salt Mixing Station"'],
      ['ui/panels/operations/MapTab.tsx', 'Salt reserve"', 'name="Salt water reserve"'],
      ['ui/panels/operations/MapTab.tsx', 'title="Supplies" ', 'title="Supplies shelf" '],
      ['ui/panels/operations/MapTab.tsx', 'Brine shrimp hatchery', '`Brine Shrimp Hatchery · ${room.cones.length}`'],
      ['ui/panels/operations/WaterTab.tsx', 'text="Brine shrimp hatchery"', 'text="Brine Shrimp Hatchery"'],
      ['ui/panels/operations/Overview.tsx', "title: 'Hatchery'", "title: 'Brine Shrimp Hatchery'"],
      ['ui/panels/operations/Overview.tsx', "name: 'Operations tools'", "name: 'Operations Desk'"],
      ['ui/panels/operations/Overview.tsx', "name: 'More lines'", "name: 'Breeding facility'"],
      ['ui/panels/operations/Overview.tsx', "name: 'Live food', ", "name: 'Live food room', "],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
  });
});

describe('Audit 2026-11-17 (J33): no developer talk on player screens', () => {
  it('the screens and species notes say what happens, not how the game is built', () => {
    const gone: [string, string][] = [
      ['ui/panels/operations/Locked.tsx', 'Links to this page'],
      ['ui/panels/build/FacilityRooms.tsx', 'Links to this page'],
      ['ui/panels/visitors/VisitorsPanel.tsx', 'Links to this page'],
      ['ui/panels/encyclopedia/EncyclopediaPanel.tsx', 'in this build'],
      ['ui/cards/CreatureCard.tsx', 'not part of this version'],
      ['ui/panels/encyclopedia/MorphCatalog.tsx', 'gene table'],
      ['ui/panels/shows/Upcoming.tsx', 'game abstraction'],
      ['ui/panels/shows/Upcoming.tsx', 'adults travel'],
      ['ui/panels/shows/EnterFlow.tsx', 'game abstraction'],
      ['ui/panels/social/copy.ts', 'read-only snapshots'],
    ];
    for (const [file, words] of gone) expect(src(file), `${file}: ${words}`).not.toContain(words);
    expect(src('ui/panels/shows/EnterFlow.tsx')).toContain('Only healthy, settled adults can enter. Your animal never leaves its tank: it’s judged on show day, may be a little unsettled afterwards, and rests two days before its next show.');
    expect(getSpecies('amano_shrimp').breeding.notes).toMatch(/ Larvae that hatch in a freshwater tank die\.$/);
    expect(getSpecies('nerite_snail').breeding.notes).toMatch(/ In a freshwater tank the capsules never hatch\.$/);
    expect(getSpecies('ghost_shrimp').breeding.notes).toMatch(/ In your tank, that larval week is part of raising the young\.$/);
    expect(getSpecies('kuhli_loach').breeding.notes).toContain('hatch time is poorly documented (probably about two days).');
  });
});

describe('Audit 2026-11-17 (J34): a confirm button says what it does', () => {
  it('letting someone go, choosing a pair, the orders link and quick sell’s cancel', () => {
    const cases: [string, string, string][] = [
      ['ui/panels/visitors/StaffTab.tsx', "'Confirm'", '`Let ${first(m)} go (final day’s pay)`'],
      ['ui/panels/livestock/ProductionSetup.tsx', '          Done\n        </Button>\n      }\n    >\n      <p>Only adult pairs', '          Use this pair\n'],
      ['ui/panels/operations/Problems.tsx', "        {(opsSnapshot(g).forecast?.m.name ?? 'Stock manager').split(' ')[0]}’s orders", "Turn on {(opsSnapshot(g).forecast?.m.name ?? 'Stock manager').split(' ')[0]}’s orders"],
      // the review: "Turn on" must turn them on, not open Manual mode (ui-copy-s3d clicks it through turnOnStockOrders)
      ['ui/panels/operations/Problems.tsx', "target: 'view:manual' })}>\n        Turn on", 'onClick={() => turnOnStockOrders()}>\n        Turn on'],
      ['ui/panels/livestock/LivestockPanel.tsx', '>Keep them</Button>', "pickedList.length === 1 ? 'Don’t sell' : 'Keep them'"],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
  });
});

describe('Audit 2026-11-17 (J35): an online save that won’t load gives the right cause', () => {
  it('no “previous copy” (only a slot on this device has one), and the game here is untouched', () => {
    expect(LOAD_FAILED).toBe('The online save couldn’t be loaded — it may be damaged. Your game on this device hasn’t changed.');
    expect(onlineLoadError({ code: 'not_json', error: 'That file isn’t an Aquarium Go save (it isn’t JSON).' })).toBe(LOAD_FAILED);
    expect(onlineLoadError({ code: 'checksum', error: 'That file was only partly written.' })).toBe(LOAD_FAILED);
    expect(onlineLoadError({})).toBe(LOAD_FAILED);
    expect(onlineLoadError({ code: 'too_new', error: 'A newer version saved this.' })).toBe('A newer version saved this.');
    expect(onlineLoadError({ code: 'storage', error: 'Couldn’t save — browser storage refused the write.' })).toBe('Couldn’t save — browser storage refused the write.');
  });
});

describe('Audit 2026-11-17 (J36): screen readers hear words, not glyphs or ids', () => {
  it('names where they are announced, and no star glyphs read aloud', () => {
    const cases: [string, string, string][] = [
      ['ui/panels/operations/Overview.tsx', 'data-testid="ops-problems-all" onClick', 'data-testid="ops-problems-all" aria-label="All problems"'],
      ['ui/panels/visitors/StaffTab.tsx', 'aria-label={`Skill ${skill} of 5`}', '<span className="st-sr">Skill {skill} of 5</span>'],
      ['ui/panels/visitors/StaffTab.tsx', 'days to {skillStars(m.skill + 1)}', '<span className="st-sr">skill {m.skill + 1}</span>'],
      ['ui/panels/visitors/TankKeeperLine.tsx', '(Aquarist <span className="st-stars">', '<span className="st-sr">{keeper.skill}-star </span>Aquarist <span className="st-stars" aria-hidden>'],
      ['ui/panels/shows/Upcoming.tsx', '<b aria-label=', '<span className="pn-sr">{n} of yours eligible</span>'],
      ['ui/panels/shows/Results.tsx', 'className="sh-crit" aria-label', 'className="sh-crit" role="group" aria-label="Points by criterion"'],
      ['ui/shared/SharedMoney.tsx', 'aria-label={W.giveMoney} value={to.id}', 'aria-label={W.giveTo} value={to.id}'],
      ['ui/panels/tanks/TanksPanel.tsx', 'label="Water class"', '<Select<WaterClass> label="Water type"'],
      ['ui/panels/visitors/VisitorsPanel.tsx', '`day ${h.day} ${h.count}`', '`Day ${h.day}: ${h.count}`'],
      ['ui/panels/operations/MapTab.tsx', "flexDirection: 'column', gap: 4 }} aria-hidden>", "<span aria-hidden className={clsx('ops-pipe__line'"],
      // the review: an aria-label on an element with no role isn't read (J22's stage track and two more)
      ['ui/panels/operations/LinesTab.tsx', '<div className="ops-track" aria-label=', '<span className="pn-sr">Stage: {STAGES[at]?.full ?? STAGES[at]?.label ?? \'\'}</span>'],
      ['ui/panels/operations/LinesTab.tsx', '<span key={s.id} title={s.full}', '<span key={s.id} aria-hidden title={s.full}'],
      ['ui/panels/shows/Upcoming.tsx', '<div className="sh-classes" aria-label="Classes">', '<div className="sh-classes" role="group" aria-label="Classes">'],
      ['ui/panels/shows/ShowsPanel.tsx', 'aria-label={`${unseen} new`}', '<span className="pn-sr">{unseen} new</span>'],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
    expect(SHARED_WORDS.giveTo).toBe('Give money to');
    expect(SHARED_WORDS.giveTo).not.toBe(SHARED_WORDS.giveMoney);
  });
});

describe('Audit 2026-11-17 (J37): the species pages read as sentences', () => {
  it('broken sentences, agreement, stray capitals, tone and the guide’s temperature line', () => {
    const sp = (id: string) => getSpecies(id);
    const compat = (id: string, other: string) => sp(id).exceptionRules.find((o) => o.other === other)?.reason;
    expect(compat('clown_loach', 'ornate_bichir')).toMatch(/; keep only loaches too big for it to swallow\.$/);
    expect(compat('motoro_stingray', 'oscar')).toMatch(/: keep them together only in a very large tank\.$/);
    expect(compat('silver_mono', 'queen_angelfish')).toMatch(/: keep them together only in a very large tank, with the angel added last\.$/);
    expect(compat('lined_seahorse', 'tag:tang')).not.toContain('This animal is likely');
    expect(compat('peacock_mantis_shrimp', 'tag:fish_large')).toMatch(/It’s best in a tank of its own\.$/);
    expect(compat('melanurus_wrasse', 'tag:shrimp_dwarf')).toBe('Picks off small ornamental shrimp (such as dwarf shrimp) and their young.');
    expect(sp('oscar').encyclopedia.compatibilityNotes).toContain('so keep it away from small fish, shrimp, snails and frogs.');
    expect(JSON.stringify(sp('lyretail_anthias'))).toContain('Keep one male per tank; two males fight.');
    expect(JSON.stringify(sp('sailfin_tang'))).toContain('When threatened, it raises');
    expect(sp('mystery_snail').breeding.notes).toContain('climbs out of the water');
    expect(sp('comet_goldfish').conservation?.status).toBe('Least Concern (wild species, IUCN 2010); rated a high invasion risk in the US');
    expect(sp('ocellaris_clownfish').starterBlurb).toMatch(/— and a secret: every clownfish starts life as a male\.$/);
    for (const id of ['brownbanded_bamboo_shark', 'epaulette_shark', 'coral_catshark']) expect(JSON.stringify(sp(id))).not.toContain('real keepers');
    expect(JSON.stringify(sp('betta'))).toContain('follows your cursor or finger');
    for (const id of ['axolotl', 'fighting_conch', 'peppermint_shrimp', 'cleaner_shrimp', 'chocolate_tang', 'kole_tang']) {
      const e = sp(id).encyclopedia as unknown as Record<string, unknown>;
      for (const k of ['funFact', 'keeperTip', 'breedingOverview', 'summary']) expect(String(e[k] ?? ''), `${id}.${k}`).not.toContain('"');
    }
    expect(src('data/species/guide.ts')).toContain('No heater in a normal room; it needs cooler water than a tropical tank.');
  });
});

describe('Audit 2026-11-17 (J38, the part that needs no choice): source titles without research notes', () => {
  it('no “title verified via…”, “(citing …)” or “(summarising …)” in a shown title, and no builder note in a fact', () => {
    for (const id of ['axolotl', 'cleaner_shrimp', 'coral_catshark', 'flame_hawkfish', 'foxface_rabbitfish']) {
      for (const s of getSpecies(id).sourceReferences) expect(s.title, id).not.toMatch(/verified via|\(citing|\(summarising/);
    }
    expect(getSpecies('freshwater_angelfish').sourceReferences.flatMap((s) => s.facts)).not.toContain('15 cm TL (size field 10.5)');
    expect(getSpecies('freshwater_angelfish').sourceReferences.flatMap((s) => s.facts)).toContain('15 cm TL');
    expect(getSpecies('axolotl').sourceReferences.map((s) => s.title)).toContain('Tyrp1 is the Mendelian determinant of the axolotl copper mutant — Scientific Reports (2024)');
  });
});

describe('Audit 2026-11-17 (J39): an allele is named as its morph is', () => {
  it('allele names take their morph’s casing; the angelfish strain isn’t a third “Koi”; two snails have no locked chip', () => {
    for (const sp of ALL_SPECIES) {
      const morphs = morphCatalog(sp).entries.map((e) => e.morphName);
      for (const l of sp.genetics.loci) for (const a of l.alleles) {
        if (sp.id === 'freshwater_angelfish' && a.id === 'V') continue; // "Veil" sits inside "Superveil", another allele's word
        const clash = morphs.find((n) => n.toLowerCase().includes(a.name.toLowerCase()) && !n.includes(a.name));
        expect(clash, `${sp.id} ${a.id} "${a.name}"`).toBeUndefined();
      }
    }
    const betta = getSpecies('betta').genetics.loci.flatMap((l) => l.alleles);
    expect(betta.find((a) => a.id === 'royal')?.name).toBe('Royal Blue');
    expect(betta.find((a) => a.id === 'black')?.name).toBe('Black Melano');
    expect(JSON.stringify(getSpecies('freshwater_angelfish'))).toContain('"name":"Koi Angel"');
    for (const id of ['astraea_snail', 'mexican_turbo_snail']) expect(hasNoNamedMorphs(getSpecies(id)), id).toBe(true);
  });
});

describe('Audit 2026-11-17 (J40): a cherry shrimp exhibit isn’t scored as a threatened species', () => {
  function exhibit(speciesId: string) {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const t = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 6, z: 2, rotY: 0 }, name: 'Show tank' });
    const rng = simRng(g);
    for (let i = 0; i < 3; i++) addCreature(g, createCreature(g, rng, speciesId, { ageDays: 60 }), t.id);
    return exhibitInfo(g, t).conservation;
  }

  it('its status is “Not evaluated (IUCN)” and the invasion risk is in the note; its exhibit scores as an unthreatened species', () => {
    const cs = getSpecies('cherry_shrimp').conservation!;
    expect(cs.status).toBe('Not evaluated (IUCN)');
    expect(cs.note).toMatch(/^Rated a high invasion risk in the US\. /);
    expect(exhibit('cherry_shrimp')).toBe(0.35);
    expect(exhibit('pea_puffer')).toBe(0.8); // a Vulnerable species still counts
    expect(src('sim/facility/exhibit.ts')).toContain('least concern|not evaluated|not assessed|domesticated');
  });
});

describe('Audit 2026-11-17: stored gear can be sold, and the removal line says so', () => {
  it('removing a unit puts it in storage and says where it can be sold', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 7 });
    const t = g.tanks[g.tankOrder[0]];
    const heater = t.equipment.find((e) => getEquipmentDef(e.defId)?.kind === 'heater')!;
    const r = removeEquipment(g, t.id, heater.id);
    expect(r.ok).toBe(true);
    expect(r.message).toBe(`Removed the ${getEquipmentDef(heater.defId)!.name} and put it in storage: use it in another tank, or sell it in Build › Equipment.`);
    expect(g.inventory.equipment.some((e) => e.id === heater.id)).toBe(true);
  });
});
