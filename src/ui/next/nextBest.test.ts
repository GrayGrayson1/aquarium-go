/**
 * chunk 21 (C, "What next?") — the ranking over crafted states: the order of the rules and each rule's own checks
 * (danger, the guide, hungry animals, things that won't wait, things to collect or decide, research, a quest nearly
 * done, the collection), never something the player can't do, and a shared shop's limits.
 */
import { describe, expect, it } from 'vitest';
import type { Creature, GameState, Listing } from '@/types';
import { newGame } from '@/sim/newGame';
import { tutorialSkip, unlock } from '@/sim/facility/progression';
import { advanceWorld, refreshTankCache } from '@/sim/world';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { opsSnapshot } from '@/ui/common/ops';
import { issueViews } from '@/ui/panels/operations/issues';
import { tutorialChain } from '@/data/quests';
import { ensureShowsState } from '@/sim/shows/state';
import { refillCalendar } from '@/sim/shows/schedule';
import { friendWait } from '@/ui/tutorial/guideText';
import { COLLECTION_ADDRESS, NEXT_RULES, NO_ANIMALS_WHY, NO_TANK_TITLE, OPTIONAL_SHARE, guideShowMe, nextBestActions, nothingUrgent, spendable, type NextAction } from './nextBest';

function game(opts: { guide?: boolean; money?: number } = {}): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
  if (!opts.guide) tutorialSkip(g);
  if (opts.money !== undefined) g.finance.money = opts.money;
  return g;
}
const tank = (g: GameState) => g.tanks[g.tankOrder[0]];
const residents = (g: GameState): Creature[] => Object.values(g.creatures).filter((c) => c.tankId === tank(g).id && c.status === 'alive');
/** Every animal in the tank this hungry, and the tank's status worked out again (as the sim's next step would). */
function hunger(g: GameState, h: number): void {
  for (const c of residents(g)) c.stats.hunger = h;
  refreshTankCache(g, tank(g));
}
const rules = (list: NextAction[]) => list.map((a) => a.rule);
/** The rules are in the header's order, and the keys unique. */
function expectRanked(list: NextAction[]): void {
  const ranks = list.map((a) => NEXT_RULES.indexOf(a.rule));
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  expect(new Set(list.map((a) => a.key)).size).toBe(list.length);
}
/** Every animal gone (sold), as after a die-off or a sell-out. */
function noAnimals(g: GameState): void {
  for (const c of Object.values(g.creatures)) c.status = 'sold';
}
/** Every tank gone. */
function noTanks(g: GameState): void {
  noAnimals(g);
  for (const id of g.tankOrder) delete g.tanks[id];
  g.tankOrder = [];
}
/** A board quest, done or part done. */
function quest(g: GameState, id: string, status: 'active' | 'complete', progress: number): void {
  g.progress.quests.push({ id, status, progress, startedHour: g.clock.hour });
}

describe('What next? while the guide runs', () => {
  it('leads with the guide’s step and its own button, and lists nothing optional', () => {
    const g = game({ guide: true, money: 5000 });
    const list = nextBestActions(g);
    expectRanked(list);
    expect(list[0]).toMatchObject({ rule: 'guide', key: 'guide:meet', title: 'Meet Ember', to: { kind: 'guide', action: 'creature-name' } });
    expect(list[0].where).toMatch(/^Guide · 1 of \d+$/);
    // (with $5,000, research would be suggested without the guide)
    expect(rules(list).every((r) => r === 'danger' || r === 'guide' || r === 'hungry')).toBe(true);
  });

  it('a tank in danger comes first: Feed a starving animal before the guide’s step', () => {
    const g = game({ guide: true });
    hunger(g, 95);
    const list = nextBestActions(g);
    expectRanked(list);
    expect(rules(list)).toEqual(['danger', 'guide']);
    expect(list[0]).toMatchObject({ title: 'Feed Ember', where: `${tank(g).name} · Danger`, to: { kind: 'fix', to: { kind: 'feed', tankId: tank(g).id } } });
    expect(list[0].why).toMatch(/^Ember is starving/);
  });

  it('on a feeding step a hungry animal is the guide’s own step, not a second action', () => {
    const g = game({ guide: true });
    g.progress.tutorial.step = tutorialChain('betta').findIndex((s) => s.id === 'feed');
    hunger(g, 80);
    const list = nextBestActions(g);
    expect(rules(list)).toEqual(['guide']);
    expect(list[0].to).toEqual({ kind: 'guide', action: 'tool-feed' });
  });

  it('the guide card’s own button: Target feed for a slow feeder, Follow on the watching step', () => {
    expect(guideShowMe({ id: 'feed', hintTarget: 'tool-feed', body: 'Use Target-feed to offer frozen mysis.' })).toBe('tool-target-feed');
    expect(guideShowMe({ id: 'feed', hintTarget: 'tool-feed', body: 'Tap Feed.' })).toBe('tool-feed');
    expect(guideShowMe({ id: 'observe', hintTarget: 'scene', body: 'Watch the gills.' })).toBe('follow-starter');
    expect(guideShowMe({ id: 'camera', hintTarget: 'scene', body: 'Drag to orbit.' })).toBe('scene');
  });
});

describe('What next? after the guide', () => {
  it('a very hungry animal: Feed it, to the food picker on its tank', () => {
    const g = game();
    hunger(g, 80);
    const list = nextBestActions(g);
    expectRanked(list);
    expect(list[0]).toMatchObject({ rule: 'hungry', key: `hungry:${tank(g).id}`, title: 'Feed Ember', where: `${tank(g).name} · Watch`, to: { kind: 'fix', to: { kind: 'feed', tankId: tank(g).id } } });
    expect(list[0].why).toMatch(/^Ember is very hungry/);
  });

  it('no food it eats and no money for some: the way to money, never a purchase that can’t be made', () => {
    const g = game({ money: 0 });
    g.inventory.foods = {};
    hunger(g, 80);
    const top = nextBestActions(g)[0];
    expect(top).toMatchObject({ rule: 'hungry', title: 'Open Finances', to: { kind: 'route', route: { kind: 'panel', panel: 'finances' } } });
    expect(top.why).toMatch(/^Not enough money for .+ \(\$\d+ a pack\)\.$/);
    g.finance.money = -40;
    expect(nextBestActions(g)[0].why).toBe('Not enough money: purchases are paused while you’re in debt.');
    // with the money, the fix itself: Buy food in Market › Supplies
    g.finance.money = 500;
    const buy = nextBestActions(g)[0];
    expect(buy.title).toBe('Buy food');
    expect(buy.to).toMatchObject({ kind: 'fix', to: { kind: 'panel', panel: 'market' } });
  });

  it('with nothing to do, only the collection, and nothing urgent', () => {
    const g = game({ money: 0 });
    const list = nextBestActions(g);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ rule: 'collect', key: 'collect', to: { kind: 'address', hash: COLLECTION_ADDRESS } });
    expect(nothingUrgent(list)).toBe(true);
    hunger(g, 80);
    expect(nothingUrgent(nextBestActions(g))).toBe(false);
  });

  it('the rules in order: hungry animals, a reward to claim, research, a quest nearly done, the collection', () => {
    const g = game({ money: 5000 });
    hunger(g, 80);
    quest(g, 'q_water_changes', 'complete', 1);
    quest(g, 'q_feed_routine', 'active', 0.7);
    const list = nextBestActions(g);
    expectRanked(list);
    expect(rules(list)).toEqual(['hungry', 'ready', 'unlock', 'quest', 'collect']);
    expect(list[1]).toMatchObject({ key: 'ready:quests', title: 'Claim your reward', why: 'Quest complete: Fresh water.', to: { kind: 'route', route: { kind: 'panel', panel: 'research', tab: 'quests' } } });
    expect(list[2]).toMatchObject({ key: 'unlock:research:life_support_2', title: 'Research Better Life Support', to: { kind: 'route', route: { kind: 'panel', panel: 'research', target: 'research:life_support_2' } } });
    expect(list[3]).toMatchObject({ key: 'quest:q_feed_routine', title: 'Feeding routine' });
    // the same state ranks the same way every time
    expect(nextBestActions(g)).toEqual(list);
  });

  it('a Water room and a Live food room with no salt mix or eggs: Operations’ problems are listed, so not all caught up', () => {
    // (as dev.unlockAll leaves a game: every key unlocked, the rooms installed on the next step, nothing in stock;
    // chunk 21's merge review: the e2e case's "nothing to do" game was such a game)
    const g = game({ money: 0 });
    for (const key of Object.keys(UNLOCK_KEYS)) unlock(g, key, { silent: true });
    advanceWorld(g, 1);
    g.finance.money = 0;
    expect(g.facility.water && g.facility.food).toBeTruthy();
    const issues = issueViews(g, opsSnapshot(g).problems);
    expect(issues.length).toBeGreaterThan(0);
    const list = nextBestActions(g);
    expectRanked(list);
    const ops = list.filter((a) => a.key.startsWith('ready:ops:'));
    // Problems' own words, at most two, to Operations (its Problems view once the Desk is there, else the item's tab)
    expect(ops.map((a) => a.title)).toEqual(issues.slice(0, 2).map((i) => i.title));
    for (const a of ops) expect(a).toMatchObject({ rule: 'ready', where: 'Operations', to: { kind: 'route', route: { kind: 'panel', panel: 'operations' } } });
    expect(nothingUrgent(list)).toBe(false);
  });

  it('a quest under half way, and one already claimed, are not "nearly done"', () => {
    const g = game({ money: 0 });
    quest(g, 'q_feed_routine', 'active', 0.4);
    expect(rules(nextBestActions(g))).toEqual(['collect']);
  });

  it('research only while nothing is being researched, and only at half of what the player can spend or less', () => {
    const cost = 250; // Better Life Support, the cheapest project open at the start
    const g = game({ money: cost / OPTIONAL_SHARE - 1 });
    expect(rules(nextBestActions(g))).not.toContain('unlock');
    g.finance.money = cost / OPTIONAL_SHARE;
    expect(rules(nextBestActions(g))).toContain('unlock');
    g.progress.research.activeId = 'life_support_2';
    expect(rules(nextBestActions(g))).not.toContain('unlock');
  });

  it('nothing for a showcase world, or with no game', () => {
    const g = game({ money: 5000 });
    g.isShowcase = true;
    expect(nextBestActions(g)).toEqual([]);
    expect(nextBestActions(null)).toEqual([]);
  });
});

describe('What next? for an empty aquarium (chunk 21 review S2)', () => {
  it('tanks but no animal: Open the Market, in the guide’s own words, not "all caught up"', () => {
    const g = game({ money: 500 });
    noAnimals(g);
    const list = nextBestActions(g);
    expectRanked(list);
    expect(list[0]).toMatchObject({ rule: 'empty', key: 'empty:animals', where: 'Market', title: 'Open the Market', why: NO_ANIMALS_WHY, to: { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'shop' } } });
    // (the guide's line for a step waiting on friends with no animal to see, word for word)
    expect(friendWait(g, 'first_money')?.text).toBe(NO_ANIMALS_WHY);
    expect(nothingUrgent(list)).toBe(false);
  });

  it('no animal and no money for one: the way to money instead', () => {
    const g = game({ money: 0 });
    noAnimals(g);
    const top = nextBestActions(g)[0];
    expect(top).toMatchObject({ rule: 'empty', key: 'empty:animals', title: 'Open Finances', to: { kind: 'route', route: { kind: 'panel', panel: 'finances' } } });
    expect(top.why).toMatch(/^Not enough money for an animal \(from \$\d+\)\.$/);
  });

  it('no tank at all: Build › Tanks, in the tank bar’s words; with no money for one, the way to money', () => {
    const g = game({ money: 500 });
    noTanks(g);
    const list = nextBestActions(g);
    expectRanked(list);
    expect(list[0]).toMatchObject({ rule: 'empty', key: 'empty:tank', where: 'Build › Tanks', title: NO_TANK_TITLE, why: 'There’s no tank in your aquarium.', to: { kind: 'route', route: { kind: 'panel', panel: 'build', tab: 'tanks' } } });
    expect(NO_TANK_TITLE).toBe('No tank · Buy one');
    expect(nothingUrgent(list)).toBe(false);
    g.finance.money = 10;
    expect(nextBestActions(g)[0]).toMatchObject({ key: 'empty:tank', title: 'Open Finances', why: 'Not enough money for a tank (from $45).' });
  });

  it('while the guide runs it comes after the guide’s step, and not twice when the step already goes to the Market', () => {
    const g = game({ guide: true, money: 500 });
    noAnimals(g);
    expect(rules(nextBestActions(g))).toEqual(['guide', 'empty']);
    // a step waiting on friends with no animal to see: the guide's own button is the Market already
    g.progress.tutorial.step = tutorialChain('betta').findIndex((s) => s.id === 'first_money');
    const list = nextBestActions(g);
    expect(rules(list)).toEqual(['guide']);
    expect(list[0]).toMatchObject({ why: NO_ANIMALS_WHY, to: { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'shop' } } });
    // but with no animal affordable, the way to money is not the guide's Market, and stays (confirmation review N-d)
    g.finance.money = 0;
    const poor = nextBestActions(g);
    expect(rules(poor)).toEqual(['guide', 'empty']);
    expect(poor[1]).toMatchObject({ key: 'empty:animals', title: 'Open Finances' });
  });
});

describe('What next? with Settings › Guide hints off (chunk 21 review S4)', () => {
  it('the hidden guide is not led with, and nothing is held back for it', () => {
    const g = game({ guide: true, money: 5000 });
    const on = nextBestActions(g, { hints: true });
    expect(rules(on)[0]).toBe('guide');
    expect(rules(on)).not.toContain('collect');
    expect(nextBestActions(g)).toEqual(on); // (absent: on)
    const off = nextBestActions(g, { hints: false });
    expectRanked(off);
    expect(rules(off)).not.toContain('guide');
    expect(rules(off)).toEqual(['unlock', 'collect']);
    // and a bid on a listing, hidden while the guide leads, shows with hints off
    g.market.listings.push({ id: 'l_test', status: 'active', bids: [{ id: 'b_test', buyerId: 'x', amount: 40, message: '', createdHour: g.clock.hour, expiresHour: g.clock.hour + 2, status: 'open' }] } as unknown as Listing);
    expect(rules(nextBestActions(g, { hints: true }))).not.toContain('expiring');
    expect(nextBestActions(g, { hints: false })[0]).toMatchObject({ key: 'expiring:bids' });
  });
});

describe('What next? for things that won’t wait', () => {
  /** A listing with one open bid (only what the rule reads). */
  function bid(g: GameState, inHours: number): void {
    const now = g.clock.hour;
    g.market.listings.push({ id: 'l_test', status: 'active', bids: [{ id: 'b_test', buyerId: 'x', amount: 40, message: '', createdHour: now, expiresHour: now + inHours, status: 'open' }] } as unknown as Listing);
  }

  it('bids first, then the rare animal leaving the shop, then the show closing, each one the player can act on', () => {
    const g = game({ money: 5000 });
    const now = g.clock.hour;
    bid(g, 3);
    // a Prismatic betta that leaves the shop in 5 hours
    const offer = g.market.stock.find((o) => o.speciesId === 'betta')!;
    offer.expiresHour = now + 5;
    offer.price = 40;
    offer.creatures[0].rareVariant = { kind: 'prismatic', origin: 'shop', visualSeed: 1 };
    // a club show whose entries close in 10 hours, which the betta may enter
    unlock(g, 'shows', { silent: true });
    g.clock.hour += 48; // (settled in, as shows ask)
    offer.expiresHour = g.clock.hour + 5;
    g.market.listings[0].bids![0].expiresHour = g.clock.hour + 3;
    const s = ensureShowsState(g);
    refillCalendar(g, s, g.clock.hour);
    const show = s.shows.find((x) => x.tier === 'club')!;
    show.deadlineHour = g.clock.hour + 10;
    const list = nextBestActions(g).filter((a) => a.rule === 'expiring');
    expect(list.map((a) => a.key)).toEqual(['expiring:bids', `expiring:offer:${offer.id}`, `expiring:show:${show.id}`]);
    expect(list[0]).toMatchObject({ title: 'Answer a bid', to: { kind: 'route', route: { kind: 'panel', panel: 'market', tab: 'listings' } } });
    expect(list[1]).toMatchObject({ title: 'Prismatic betta in the shop', to: { kind: 'route', route: { kind: 'panel', panel: 'market', target: `offer:${offer.id}` } } });
    expect(list[1].why).toMatch(/^In the shop until /);
    expect(list[2]).toMatchObject({ title: `Enter ${show.name}`, to: { kind: 'route', route: { kind: 'panel', panel: 'shows', target: `show:${show.id}` } } });
    expect(list[2].why).toMatch(/^Entries close /);
    // a fee or a price over half of what the player can spend, and they're left out
    g.finance.money = 2 * Math.min(offer.price, show.fee) - 2;
    const poor = nextBestActions(g).filter((a) => a.rule === 'expiring').map((a) => a.key);
    expect(poor).toEqual(['expiring:bids']);
    // and an ordinary animal, or one leaving tomorrow, isn't urgent
    g.finance.money = 5000;
    delete offer.creatures[0].rareVariant;
    expect(nextBestActions(g).some((a) => a.key.startsWith('expiring:offer:'))).toBe(false);
  });

  it('a show the player has entered, or whose tier is locked, is not suggested', () => {
    const g = game({ money: 5000 });
    unlock(g, 'shows', { silent: true });
    g.clock.hour += 48;
    const s = ensureShowsState(g);
    refillCalendar(g, s, g.clock.hour);
    for (const show of s.shows) show.deadlineHour = g.clock.hour + 10;
    const open = nextBestActions(g).filter((a) => a.key.startsWith('expiring:show:'));
    expect(open).toHaveLength(1);
    const id = open[0].key.slice('expiring:show:'.length);
    s.entries.push({ id: 'ent-x', showId: id, classId: 'open_fw', kind: 'creature', subjectId: residents(g)[0].id, name: 'Ember', showName: 'x', tier: 'club', fee: 0, enteredHour: g.clock.hour, status: 'entered' });
    const next = nextBestActions(g).filter((a) => a.key.startsWith('expiring:show:'));
    expect(next.map((a) => a.key)).not.toContain(`expiring:show:${id}`);
    // (the regional show stays out: its tier is locked)
    expect(next.every((a) => s.shows.find((x) => `expiring:show:${x.id}` === a.key)?.tier === 'club')).toBe(true);
  });
});

describe('What next? in a shared shop', () => {
  function shop(g: GameState): void {
    g.pool = { members: { u1: { name: 'Robin', tier: 'ask' } }, asks: [{ id: 'ask1', by: 'u2', name: 'Sam', amount: 50, note: 'Snails', hour: g.clock.hour }] };
  }

  it('a member who asks first is offered nothing to buy, and no requests to answer', () => {
    const g = game({ money: 5000 });
    shop(g);
    const member = { id: 'u1', owner: false };
    expect(spendable(g, member)).toBe(0);
    expect(rules(nextBestActions(g, { member }))).toEqual(['collect']);
  });

  it('the owner answers the requests, and may spend the pool', () => {
    const g = game({ money: 5000 });
    shop(g);
    const owner = { id: 'o1', owner: true };
    const list = nextBestActions(g, { member: owner });
    expectRanked(list);
    expect(list[0]).toMatchObject({ key: 'ready:asks', title: 'Answer a money request', why: 'Sam asks for $50: Snails.', to: { kind: 'shared' } });
    expect(rules(list)).toContain('unlock');
  });

  it('a member who can’t pay for food is pointed at asking for money', () => {
    const g = game({ money: 5000 });
    shop(g);
    g.inventory.foods = {};
    hunger(g, 80);
    const top = nextBestActions(g, { member: { id: 'u1', owner: false } })[0];
    expect(top).toMatchObject({ rule: 'hungry', title: 'Ask for money', to: { kind: 'shared' } });
  });
});
