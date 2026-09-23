/**
 * Dev fixtures for management-panel QA: a mid-game specialty shop with several tanks, varied animals, clutches,
 * active/sold/invalidated listings with bids, 14 days of finances, visitors, quests and a busy log.
 *   ?fixture=panels       (paused — stable for screenshots)
 *   ?fixture=panels_live  (running at 1×)
 * OWNER: lane "ui-panels". Registered (append-only) in src/dev/fixtures/index.ts.
 */
import type { BuyerArchetype, BuyerProfile, Creature, GameEvent, GameState, LedgerEntry, Listing, PersonalityTag, ShopOffer, VisitorReaction } from '@/types';
import { newGame, previewStarters } from '@/sim/newGame';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { nextId } from '@/sim/ids';
import { refreshTankCache } from '@/sim/world';
import { findSpecies, ALL_SPECIES } from '@/data/species';
import { getFacilityLevel } from '@/data/facilities';
import { addPlacedTank, stockTank, decorateTank, finishTank, ensureFacility } from '@/dev/fixtures/core-helpers';

const PERSONALITIES: PersonalityTag[] = ['bold', 'shy', 'explorer', 'food_obsessed', 'glass_curious', 'nest_builder', 'homebody', 'social', 'showoff', 'easily_startled', 'patient_feeder', 'competitive_feeder', 'decor_inspector', 'night_owl'];
const NAMES = ['Sapphire', 'Koi', 'Rogue', 'Velvet', 'Pip', 'Mochi', 'Nimbus', 'Tango', 'Coral', 'Sunny', 'Drift', 'Biscuit', 'Wasabi', 'Pickle', 'Lotus', 'Juniper', 'Marble', 'Ripple', 'Opal', 'Saffron', 'Indigo', 'Pebble', 'Clementine', 'Ash'];

const BUYERS: { name: string; archetype: BuyerArchetype; seed: number }[] = [
  { name: 'Maya Okafor', archetype: 'collector', seed: 11 },
  { name: 'Theo Lindqvist', archetype: 'breeder', seed: 23 },
  { name: 'The Alvarez family', archetype: 'family', seed: 37 },
  { name: 'Harbourfront Aquarium', archetype: 'public_aquarium', seed: 41 },
  { name: 'Priya Raman', archetype: 'aquascaper', seed: 53 },
  { name: 'Sam Whitlock', archetype: 'bargain_hunter', seed: 67 },
  { name: 'Aiko Tanaka', archetype: 'experienced_keeper', seed: 79 },
  { name: 'Reef Futures Trust', archetype: 'conservation', seed: 83 },
];

function flavour(g: GameState, c: Creature, i: number): void {
  // Give stub-rolled creatures some variety so the panels read like a real collection.
  if (c.personality.length <= 1 && c.personality[0] === 'explorer') {
    const a = PERSONALITIES[(i * 5 + 3) % PERSONALITIES.length];
    const b = PERSONALITIES[(i * 7 + 1) % PERSONALITIES.length];
    c.personality = a === b ? [a] : [a, b];
  }
  if (!c.name || c.name === findSpecies(c.speciesId)?.commonName) c.name = NAMES[(i * 3) % NAMES.length];
}

function buyers(g: GameState): BuyerProfile[] {
  if (g.market.buyers.length >= 4) return g.market.buyers;
  const out = BUYERS.map((b, i) => ({
    id: `buyer_fx_${i}`,
    name: b.name,
    archetype: b.archetype,
    budget: 400 + i * 350,
    prefs: { rarity: 1, lineage: 1, beauty: 1, health: 1, easyCare: 1, size: 1, visitorAppeal: 1, price: 1 },
    favoriteSpecies: [],
    patience: 0.5,
    reputationWithPlayer: 0.1,
    avatarSeed: b.seed * 7919,
  }));
  g.market.buyers.push(...out);
  return g.market.buyers;
}

function ensureStock(g: GameState): void {
  if (g.market.stock.length >= 4) return;
  const rng = simRng(g);
  const now = g.clock.hour;
  const plan: { sp: string; n: number; sex?: 'male' | 'female'; price: number; seller: string; note?: string }[] = [
    { sp: 'betta', n: 1, sex: 'female', price: 38, seller: 'Riverside Bettas', note: 'Bright, calm female from a halfmoon line.' },
    { sp: 'cherry_shrimp', n: 8, price: 44, seller: 'Harbor Street Aquatics' },
    { sp: 'ocellaris_clownfish', n: 1, price: 58, seller: 'Blue Lagoon Mariculture', note: 'Tank-raised, eating pellets.' },
    { sp: 'axolotl', n: 1, sex: 'male', price: 72, seller: 'Cold Spring Amphibians' },
    { sp: 'mystery_snail', n: 2, price: 18, seller: 'Harbor Street Aquatics' },
    { sp: 'lined_seahorse', n: 1, sex: 'female', price: 140, seller: 'Seahorse Source', note: 'Trained on frozen mysis.' },
    { sp: 'fancy_goldfish', n: 1, price: 34, seller: 'Koi & Co.' },
  ];
  for (const p of plan) {
    if (!findSpecies(p.sp)) continue;
    const creatures: Creature[] = [];
    for (let i = 0; i < p.n; i++) {
      const c = createCreature(g, rng, p.sp, { sex: p.sex, captiveBred: true, potentialsBias: 0.2 });
      flavour(g, c, creatures.length + g.market.stock.length * 3);
      creatures.push(c);
    }
    const offer: ShopOffer = { id: nextId(g, 'offer'), kind: p.n > 1 ? 'group' : 'creature', speciesId: p.sp, creatures, price: p.price, seller: p.seller, expiresHour: now + 5 + g.market.stock.length * 4, note: p.note };
    g.market.stock.push(offer);
  }
}

export function buildPanelsFixture(opts: { paused?: boolean } = {}): GameState {
  const seed = 5150;
  const preview = previewStarters(seed).betta;
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed, starterCreature: preview, shopName: 'Tidewater Aquatics' });
  g.progress.tutorial.done = true;
  g.progress.tutorial.skipped = false;
  ensureFacility(g, 'specialty_shop');
  g.facility.openToPublic = true;
  g.facility.admission = 6;
  g.facility.openHour = 9;
  g.facility.closeHour = 19;
  for (const k of ['fw_basic', 'nursery', 'market_listings', 'tank_auctions', 'signage', 'tank_40', 'gear_tier2', 'marine_basics', 'visitors', 'facility_specialty_shop', 'party_mode', 'gear_skimmer']) if (!g.progress.unlocked.includes(k)) g.progress.unlocked.push(k);

  // Jump to day 16, 2 pm (two full weeks of history).
  const shift = 24 * 15 + 6;
  g.clock.hour += shift;
  const now = g.clock.hour;
  // Keep the pre-rolled market (made at hour 8) current after the jump.
  for (const o of g.market.stock) o.expiresHour += shift;
  g.market.lastRefreshHour = now - 6;
  const starterTank = g.tanks[g.tankOrder[0]];
  starterTank.createdHour = now - 24 * 15;
  starterTank.signage = true;
  const starter = Object.values(g.creatures)[0];

  const reef = addPlacedTank(g, 'g29', 'marine_live_rock', 'Reef Corner');
  stockTank(g, reef.id, [{ species: 'ocellaris_clownfish', count: 2, names: ['Tango', 'Coral'] }, { species: ['cleaner_shrimp', 'hermit_crab'], count: 1 }]);
  decorateTank(g, reef, 'ocellaris_clownfish');
  finishTank(g, reef);
  reef.signage = true;

  const pond = addPlacedTank(g, 'g40B', 'freshwater_cool', 'Cool Spring');
  stockTank(g, pond.id, [{ species: 'axolotl', count: 2, sex: 'pair', names: ['Mochi', 'Nimbus'] }]);
  decorateTank(g, pond, 'axolotl');
  finishTank(g, pond);

  const community = addPlacedTank(g, 'g20L', 'freshwater_planted', 'Shrimp Meadow');
  stockTank(g, community.id, [{ species: 'cherry_shrimp', count: 6 }, { species: 'mystery_snail', count: 2, names: ['Pebble', 'Opal'] }]);
  decorateTank(g, community, 'betta');
  finishTank(g, community);

  const nursery = addPlacedTank(g, 'g10', 'freshwater_planted', 'Betta Nursery');
  nursery.purpose = 'nursery';
  stockTank(g, nursery.id, [{ species: 'betta', count: 4, ageDays: 6, sex: 'unknown', names: ['Sapphire', 'Indigo', 'Saffron', 'Ash'] }]);
  decorateTank(g, nursery, 'betta');
  finishTank(g, nursery);

  // Flavour everything.
  Object.values(g.creatures).forEach((c, i) => {
    flavour(g, c, i);
    c.acquiredHour = Math.min(c.acquiredHour, now - 24 * (1 + (i % 6)));
  });
  const juveniles = Object.values(g.creatures).filter((c) => c.tankId === nursery.id);
  for (const j of juveniles) {
    j.lineage = { motherId: null, fatherId: starter?.id ?? null, generation: 1, lineId: 'betta-ember', breederName: 'Your shop' };
    j.lifeStage = 'juvenile';
  }
  const axos = Object.values(g.creatures).filter((c) => c.tankId === pond.id);
  if (axos[1]) {
    axos[1].stats.hunger = 72;
    axos[1].stats.stress = 38;
  }
  const clowns = Object.values(g.creatures).filter((c) => c.tankId === reef.id);
  if (clowns[0]) clowns[0].favorite = true;

  // Clutches.
  if (starter) {
    g.clutches['cl_fx_1'] = { id: 'cl_fx_1', speciesId: 'betta', tankId: starterTank.id, motherId: null, fatherId: starter.id, laidHour: now - 7, stage: 'eggs', count: 86, nextStageHour: now + 9, survival: 0.84, guardedById: starter.id, visual: 'bubble_nest' };
    starter.repro.stage = 'guarding';
    starter.repro.clutchId = 'cl_fx_1';
  }
  if (axos[1]) g.clutches['cl_fx_2'] = { id: 'cl_fx_2', speciesId: 'axolotl', tankId: pond.id, motherId: axos[1].id, fatherId: axos[0]?.id ?? null, laidHour: now - 30, stage: 'larvae', count: 41, nextStageHour: now + 22, survival: 0.62, visual: 'egg_strands' };

  // Market.
  const bs = buyers(g);
  ensureStock(g);
  for (const sp of ALL_SPECIES) if (g.market.demand[sp.id] == null) g.market.demand[sp.id] = 1;
  const demandFx: Record<string, number> = { betta: 1.24, axolotl: 1.12, ocellaris_clownfish: 0.94, lined_seahorse: 1.31, cherry_shrimp: 0.86, mystery_snail: 1.02, fancy_goldfish: 0.9, pea_puffer: 1.08, comet_goldfish: 0.8 };
  Object.assign(g.market.demand, demandFx);

  const mkBid = (bi: number, amount: number, ageH: number, lifeH: number, msg: string, status: Listing['bids'][number]['status'] = 'open', counter?: number) => ({
    id: nextId(g, 'bid'),
    buyerId: bs[bi % bs.length].id,
    amount,
    message: msg,
    createdHour: now - ageH,
    expiresHour: now - ageH + lifeH,
    status,
    counterAmount: counter,
  });

  // L1: a juvenile from the starter's line.
  const star = juveniles[0];
  if (star) {
    star.status = 'listed';
    star.genome.potentials.color = 91;
    star.genome.potentials.structure = 82;
    g.market.listings.push({
      id: 'lst_fx_1',
      kind: 'creature',
      title: `${star.name} — Halfmoon Betta`,
      creatureIds: [star.id],
      reserve: 45,
      buyNow: 95,
      createdHour: now - 10,
      endsHour: now + 14,
      status: 'active',
      interest: 0.72,
      bids: [
        mkBid(0, 88, 1.5, 10, 'That colour is exactly what my collection is missing. Happy to pay well for her.'),
        mkBid(1, 70, 4, 10, 'Lovely finnage for a first-generation line. Would love to breed from her.'),
        mkBid(5, 41, 6, 8, 'Would you take a little less? I can pick up today.'),
        mkBid(2, 52, 9, 6, 'Our daughter fell in love with the photo!', 'declined'),
      ],
      snapshot: { valuation: 72, healthScore: 96, beautyScore: 88, careDifficulty: 'Beginner', lineageSummary: 'Gen 1 · bred in your shop from Ember', summary: 'Juvenile halfmoon betta · remarkable colour · bred in-house', creatureIds: [star.id] },
    });
  }

  // L2: whole community tank (changed since listing).
  community.listingId = 'lst_fx_2';
  const comm = Object.values(g.creatures).filter((c) => c.tankId === community.id);
  g.market.listings.push({
    id: 'lst_fx_2',
    kind: 'tank',
    title: 'Shrimp Meadow — 20 gal planted nano-scape',
    creatureIds: comm.map((c) => c.id),
    tankId: community.id,
    reserve: 520,
    buyNow: 820,
    createdHour: now - 20,
    endsHour: now + 28,
    status: 'active',
    interest: 0.44,
    bids: [mkBid(4, 610, 3, 18, 'Beautiful scape — the carpet and the shrimp colony are exactly my style.'), mkBid(3, 560, 8, 14, 'We’d use this as a touch-tank display for school groups.', 'countered', 690)],
    snapshot: { valuation: 640, healthScore: 92, beautyScore: 81, careDifficulty: 'Beginner', lineageSummary: 'Captive-bred colony', summary: '20 gallon long · planted · 6 cherry shrimp, 2 mystery snails', creatureIds: comm.map((c) => c.id), tankId: community.id },
    changedSinceListing: 'A mystery snail was moved to another tank after listing.',
  });

  // L3: sold pair (past residents).
  const rng = simRng(g);
  const soldIds: string[] = [];
  if (findSpecies('pea_puffer')) {
    for (const [i, nm] of ['Wasabi', 'Pickle'].entries()) {
      const c = createCreature(g, rng, 'pea_puffer', { sex: i === 0 ? 'male' : 'female', name: nm });
      flavour(g, c, 40 + i);
      addCreature(g, c, null);
      c.status = 'sold';
      c.history.push({ hour: now - 50, kind: 'sold', text: `Sold to ${bs[6 % bs.length].name} for $64.` });
      soldIds.push(c.id);
    }
  }
  g.market.listings.push({
    id: 'lst_fx_3',
    kind: 'pair',
    title: 'Pair of Pea Puffers',
    creatureIds: soldIds,
    reserve: 40,
    buyNow: 70,
    createdHour: now - 70,
    endsHour: now - 50,
    status: 'sold',
    interest: 0.8,
    bids: [mkBid(6, 64, 58, 12, 'A proven pair — perfect for my planted puffer tank.', 'accepted')],
    snapshot: { valuation: 56, healthScore: 94, beautyScore: 70, careDifficulty: 'Intermediate', lineageSummary: 'Captive-bred', summary: 'Male + female pea puffers', creatureIds: soldIds },
    soldTo: bs[6 % bs.length].id,
    soldFor: 64,
  });

  // L4: invalidated.
  g.market.listings.push({
    id: 'lst_fx_4',
    kind: 'creature',
    title: 'Blue Rim — Crowntail Betta',
    creatureIds: [],
    reserve: 30,
    createdHour: now - 40,
    endsHour: now - 30,
    status: 'invalidated',
    interest: 0.2,
    bids: [],
    snapshot: { valuation: 40, healthScore: 60, beautyScore: 72, careDifficulty: 'Beginner', lineageSummary: 'Market stock', summary: 'Adult crowntail male', creatureIds: [] },
    changedSinceListing: 'Blue Rim passed away before the sale completed.',
  });

  g.market.history.push(
    { hour: now - 50, kind: 'pair', title: 'Pair of Pea Puffers', price: 64, buyer: bs[6 % bs.length].name },
    { hour: now - 96, kind: 'group', title: '10 Cherry Shrimp', price: 48, buyer: bs[5 % bs.length].name },
    { hour: now - 130, kind: 'creature', title: 'Juniper — Dalmatian Betta', price: 57, buyer: bs[0].name },
    { hour: now - 170, kind: 'juveniles', title: '6 juvenile Bettas', price: 132, buyer: bs[1].name },
    { hour: now - 215, kind: 'creature', title: 'Marble — Mystery Snail', price: 14, buyer: bs[2].name },
  );

  // Finances: 14 days.
  const SHOP_COST = getFacilityLevel('specialty_shop').upgradeCost || 1000;
  const day0 = Math.floor(now / 24) + 1;
  g.finance.daily = [];
  g.finance.ledger = [];
  const pushL = (hour: number, amount: number, category: LedgerEntry['category'], memo: string) => g.finance.ledger.push({ hour, amount, category, memo });
  for (let i = 13; i >= 1; i--) {
    const d = day0 - i;
    const base = (d - 1) * 24;
    const open = d >= day0 - 6;
    const admission = open ? 60 + ((d * 37) % 90) : 0;
    const tips = open ? 8 + ((d * 13) % 22) : (d * 7) % 12;
    const sale = [day0 - 9, day0 - 7, day0 - 5, day0 - 4, day0 - 2].includes(d) ? [132, 57, 14, 48, 64][[day0 - 9, day0 - 7, day0 - 5, day0 - 4, day0 - 2].indexOf(d)] : 0;
    const operating = 14 + ((d * 11) % 9) + (open ? 25 : 0);
    const bigBuy = d === day0 - 8 ? 190 : d === day0 - 6 ? SHOP_COST : d === day0 - 3 ? 130 : 0;
    const food = (d * 5) % 3 === 0 ? 16 : 0;
    if (admission) pushL(base + 17, admission, 'admission', 'Admissions');
    if (tips) pushL(base + 18, tips, 'tips', open ? 'Visitor tips' : 'Tip from a friend');
    if (sale) pushL(base + 12, sale, 'livestock_sale', 'Listing sold');
    pushL(base + 23.5, -operating, 'operating', 'Daily running costs');
    if (bigBuy) pushL(base + 11, -bigBuy, bigBuy === SHOP_COST ? 'facility' : bigBuy === 190 ? 'tank_purchase' : 'livestock_purchase', bigBuy === SHOP_COST ? 'Moved into a specialty shop' : bigBuy === 190 ? '40 Gallon Breeder' : 'Pair of clownfish');
    if (food) pushL(base + 9, -food, 'food', 'Frozen bloodworms');
    const income = admission + tips + sale;
    const expenses = operating + bigBuy + food;
    g.finance.daily.push({ day: d, income, expenses, visitors: open ? 18 + ((d * 7) % 14) : 0, sales: sale ? 1 : 0 });
  }
  pushL(now - 3, 84, 'admission', 'Admissions so far today');
  pushL(now - 2, 12, 'tips', 'Visitor tips');
  pushL(now - 1, -24, 'equipment', 'Replacement airstone');
  g.finance.money = 2840;

  // Visitors.
  g.visitors.today = { day: day0, count: 23, revenue: 138, tips: 26, satisfactionSum: 23 * 78 };
  g.visitors.history = g.finance.daily.slice(-7).map((d) => ({ day: d.day, count: d.visitors, revenue: d.visitors * 6, avgSatisfaction: 64 + ((d.day * 7) % 25) }));
  g.visitors.totalVisitors = 214;
  const tk = [starterTank.id, reef.id, pond.id, community.id];
  const lines: [string, VisitorReaction['mood'], number][] = [
    ['Look — the betta is building a bubble nest!', 'wow', 0],
    ['The clownfish keep going back to that same rock. So cute.', 'happy', 1],
    ['Is that an axolotl? It’s smiling at me!', 'wow', 2],
    ['I could watch the shrimp graze all day.', 'happy', 3],
    ['The water is so clear in this one.', 'happy', 1],
    ['A bit dark in the back corner — hard to see.', 'neutral', 2],
    ['Oh wow, the colours on that betta.', 'wow', 0],
    ['The sign says axolotls are critically endangered in the wild. I had no idea.', 'happy', 2],
    ['This one is a bit crowded.', 'concerned', 3],
    ['We’ve seen a lot of snails today.', 'bored', 3],
  ];
  g.visitors.reactions = lines.map(([text, mood, t], i) => ({ hour: now - i * 0.7 - 0.1, tankId: tk[t], text, mood }));
  g.visitors.exhibit = {
    [starterTank.id]: { popularity: 86, views: 142, wows: 19, lastFeatured: now - 1 },
    [reef.id]: { popularity: 74, views: 118, wows: 11 },
    [pond.id]: { popularity: 69, views: 97, wows: 14 },
    [community.id]: { popularity: 41, views: 76, wows: 3 },
    [nursery.id]: { popularity: 12, views: 9, wows: 0 },
  };

  // Progress.
  const p = g.progress;
  p.reputation = 132;
  p.mastery = { husbandry: 260, breeding: 70, aquascaping: 140, marine: 60, business: 90, exhibition: 55 };
  p.research = { activeId: 'coldwater_systems', progressHours: 7, completed: ['breeding_program', 'public_education'] };
  p.achievements = ['first_meal', 'fresh_start', 'first_sale', 'first_clutch', 'first_friend', 'doors_open', 'saltwater'];
  p.counters = { ...p.counters, feeds: 46, waterChanges: 7, sales: 6, births: 1, friend_visits: 5, visitors: 214, wows: 21, research_done: 2, tank_sales: 0, decor_placed: 9 };
  p.quests = [
    { id: 'q_second_tank', status: 'complete', progress: 1, startedHour: now - 90 },
    { id: 'q_feed_routine', status: 'active', progress: 0.6, startedHour: now - 40 },
    { id: 'q_beauty_70', status: 'active', progress: 0.82, startedHour: now - 30 },
  ];
  for (const id of ['betta', 'ocellaris_clownfish', 'axolotl', 'cherry_shrimp', 'mystery_snail', 'pea_puffer', 'lined_seahorse']) if (findSpecies(id) && !p.discoveredSpecies.includes(id)) p.discoveredSpecies.push(id);

  // Log.
  const ev = (hAgo: number, kind: GameEvent['kind'], text: string, extra: Partial<GameEvent> = {}) => g.log.push({ id: nextId(g, 'ev'), hour: now - hAgo, kind, text, ...extra });
  g.log = [];
  ev(70, 'market', 'Your pea puffer pair sold for $64 to Aiko Tanaka.', { listingId: 'lst_fx_3' });
  ev(55, 'info', 'Cool Spring is fully cycled — ammonia and nitrite are both zero.', { tankId: pond.id });
  ev(40, 'death', 'Blue Rim passed away. The listing was cancelled.', { listingId: 'lst_fx_4' });
  ev(34, 'breeding', 'Mochi laid a strand of eggs on the plants.', { tankId: pond.id, creatureId: axos[1]?.id });
  ev(30, 'tip', 'Axolotl larvae are tiny hunters — move them to a nursery before the adults notice.', { tankId: pond.id });
  ev(26, 'unlock', 'New unlock: Educational signage.');
  ev(20, 'market', 'You listed Shrimp Meadow as a complete aquarium.', { listingId: 'lst_fx_2', tankId: community.id });
  ev(12, 'warning', 'Nitrate is creeping up in Shrimp Meadow. A partial water change will help.', { tankId: community.id });
  ev(10, 'market', `You listed ${star?.name ?? 'a juvenile'} — bids are coming in.`, { listingId: 'lst_fx_1' });
  ev(7, 'breeding', `${starter?.name ?? 'Your betta'} built a bubble nest and is guarding 86 eggs!`, { tankId: starterTank.id, creatureId: starter?.id });
  ev(5, 'visitor', 'A school group loved the axolotls — 6 wow reactions!', { tankId: pond.id });
  ev(3, 'celebrate', 'Quest complete: A second tank. Claim your reward on the quest board.');
  ev(1.5, 'market', `${bs[0].name} bid $88 for ${star?.name ?? 'your listing'}.`, { listingId: 'lst_fx_1' });
  ev(1, 'danger', `${axos[1]?.name ?? 'An axolotl'} is hungry and stressed — check the water temperature.`, { tankId: pond.id, creatureId: axos[1]?.id });
  ev(0.3, 'visitor', '“Is that an axolotl? It’s smiling at me!”', { tankId: pond.id });

  for (const t of Object.values(g.tanks)) {
    try {
      refreshTankCache(g, t);
    } catch {
      /* ignore */
    }
  }
  community.cache.status = 'watch';
  pond.cache.status = axos.length ? 'watch' : pond.cache.status;
  g.clock.speed = opts.paused ? 0 : 1;
  g.lastTickRealMs = Date.now();
  return g;
}
