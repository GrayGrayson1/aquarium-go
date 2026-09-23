/**
 * Buyer message bank. OWNER: lane "market".
 *
 * Messages are composed from archetype-flavoured fragments so they expose WHY a buyer bid what they did:
 *   "I love the lineage on the axolotls, but the tank is smaller than I'd like."
 *   "The aquascape is gorgeous. I don't care much about rare morphs."
 *   "I need a beginner-friendly setup."
 *   "I'm interested because this exhibit has proven visitor appeal."
 * Placeholders: {species} (plural, lower case), {name}, {morph}, {gallons}, {org}, {amount}, {counter}, {lot}.
 *
 * lane:w2-ui — templates may carry several leading tags: scope [tank]/[animal]/[frag], frag kind [coral]/[plant], and
 * number [one] (a single animal or frag, or a whole tank: "it") / [many] (a pair, group, juveniles or a frag pack:
 * "they"). A batch of 8 juveniles no longer reads "The kids named it already".
 */
import type { BuyerArchetype } from '@/types';
import type { Rng } from '../rng';
import { fill, lowerFirst, stripEnd, capitalise } from './util';

export type Aspect = 'rarity' | 'lineage' | 'beauty' | 'health' | 'easyCare' | 'size' | 'visitorAppeal';
export const ASPECTS: Aspect[] = ['rarity', 'lineage', 'beauty', 'health', 'easyCare', 'size', 'visitorAppeal'];

export interface MsgVars {
  species: string;
  name: string;
  morph: string;
  gallons: string;
  org?: string;
  amount?: string;
  counter?: string;
  /** 'tank' for whole-aquarium listings, 'frag' for frags/cuttings (lane:frags), otherwise 'animal' (filters [tank]/[animal]/[frag] templates). */
  scope?: 'tank' | 'animal' | 'frag';
  /** lane:w2-ui — '1' when the listing holds several animals or frags (pair, group, juveniles, frag pack): [many] templates. */
  many?: string;
  /** lane:w2-ui — collective name for a many-listing: "this pair", "this group", "these juveniles", "these frags". */
  lot?: string;
  [k: string]: string | undefined;
}

type AspectBank = Record<Aspect, string[]>;

// ───────────────────────────── shared aspect fragments ─────────────────────────────
// LIKE = clause (no final punctuation). CONCERN = clause starting lower-case. INDIFFERENT = full sentence.

const LIKE_ANIMAL: AspectBank = {
  rarity: [
    'That {morph} colouring is something I rarely see',
    "You don't find {morph} {species} like this every day",
    'The rarity here is exactly what I have been hunting for',
    '[one] A {morph} like {name} is the piece my collection is missing',
    '[many] {morph} {species} like these are exactly what my collection is missing',
  ],
  lineage: [
    '[one] I love the lineage on {name}',
    '[many] I love the lineage on {lot}',
    'A documented line like this is worth paying for',
    'Proven breeding records are exactly what I look for',
    "The breeding history here is excellent",
  ],
  beauty: [
    '[one] Honestly, the colour on {name} stopped me scrolling',
    '[many] Honestly, the colour on {lot} stopped me scrolling',
    '[one] That is a genuinely beautiful animal',
    '[many] These are genuinely beautiful animals',
    'The finnage and markings are lovely',
    'The photos do not lie — gorgeous colour',
  ],
  health: [
    '[one] {name} looks healthy and well cared for',
    '[many] They look healthy and well cared for',
    'Clear eyes, good weight, calm behaviour — that tells me a lot',
    'Health is the first thing I check, and this passes',
    'You can tell the keeping here has been done properly',
  ],
  easyCare: [
    '{species} are a sensible, forgiving choice',
    '[one] It sounds like an easy animal to keep well',
    '[many] They sound like easy animals to keep well',
    'Hardy and adaptable — just what I need',
  ],
  size: [
    '[one] {name} is a good size — clearly well fed',
    '[many] They are a good size — clearly well fed',
    'Nicely grown out, which saves me months',
    'Good body size and proportions',
  ],
  visitorAppeal: [
    'Crowds love {species}; this would draw people in',
    '[one] Charismatic animals like {name} win visitors over',
    '[many] Charismatic animals like {lot} win visitors over',
    "I'm interested because {species} have proven visitor appeal",
  ],
};

const LIKE_TANK: AspectBank = {
  rarity: [
    'The livestock list has some genuinely rare pieces',
    'Those {morph} {species} make this setup special',
    'You rarely see a finished tank with animals like these',
  ],
  lineage: [
    'I love the lineage on the {species}',
    'Documented breeding lines in a turnkey tank are hard to find',
    'Buying proven breeders with their established home is ideal',
  ],
  beauty: [
    'The aquascape is gorgeous',
    'That layout has real depth — whoever scaped this knows what they are doing',
    'The composition and lighting are beautiful',
    'It photographs like a contest tank',
  ],
  health: [
    'The animals look thriving and the water reports are spotless',
    'Everything looks healthy and well cared for',
    'It is a calm, stable, healthy system',
  ],
  easyCare: [
    'It looks like a forgiving, stable setup',
    'A mature, easy-running system is exactly what I need',
    'Low-maintenance and already cycled — perfect',
  ],
  size: [
    'A {gallons}-gallon footprint gives me room to work',
    'The size of this system is just what I am after',
    'Big water volume means stability, and I like that',
  ],
  visitorAppeal: [
    "I'm interested because this exhibit has proven visitor appeal",
    'The visitor numbers on this display speak for themselves',
    'This would stop people in their tracks',
  ],
};

const CONCERN_ANIMAL: AspectBank = {
  rarity: ["it's a common variety, so I can't go too high", 'there is nothing unusual in the genetics', 'I was hoping for a rarer colour'],
  lineage: ['there is not much breeding history to go on', 'without a documented line I have to price in some risk', 'I would have liked proven breeding records'],
  beauty: ['the colours are a bit washed out for my taste', 'the markings are a little uneven', 'the finnage is not quite show quality'],
  health: ["I'm a little worried about the health readings", '[one] {name} looks stressed in the photos', '[many] they look stressed in the photos', 'I would need to quarantine and treat first'],
  easyCare: ['{species} are more demanding than I would like', 'the care requirements make me hesitate', 'I need something more beginner-friendly'],
  size: ['[one] {name} is still quite small', '[one] it has some growing to do', '[one] I was after a larger animal', '[many] they are still quite small', '[many] they have some growing to do', '[many] I was after larger animals'],
  visitorAppeal: ["I'm not sure {species} would pull a crowd", '[one] it is a bit shy for a display', '[many] they are a bit shy for a display', 'visitors might walk right past'],
};

const CONCERN_TANK: AspectBank = {
  rarity: ['the livestock is fairly common', 'nothing in the stocking list is rare', 'I was hoping for something more unusual'],
  lineage: ['there is not much lineage behind the livestock', 'the animals come without breeding records', 'I would want more history on the stock'],
  beauty: ['the aquascape needs work, honestly', 'the layout feels cluttered', 'the scape does not quite come together'],
  health: ["I'm a little worried about the health readings", 'some of the animals look stressed', 'the water numbers make me nervous'],
  easyCare: ['it is more demanding than I would like to take on', 'this would be a lot of work for me', 'I need a beginner-friendly setup, and this is advanced'],
  size: ["the tank is smaller than I'd like", '{gallons} gallons is on the small side for my plans', 'I was hoping for a bigger system'],
  visitorAppeal: ["I'm not sure it would pull crowds", 'it may not hold visitor attention', 'it lacks a real showpiece animal'],
};

const INDIFFERENT: AspectBank = {
  rarity: ["I don't care much about rare morphs.", 'Rare genes are not really my thing.', 'Morph names do not move me much.'],
  lineage: ['Pedigree does not matter much to me.', 'I am not fussed about breeding records.', 'Paperwork is nice, but it is not why I am here.'],
  beauty: ['Looks are secondary for me.', 'I am less interested in the scape than the animals.', 'Pretty is nice; healthy is what counts.'],
  health: ['I will quarantine anything anyway.', 'I have a hospital tank ready either way.', 'Condition is fine by my standards.'],
  easyCare: ['I do not mind a challenge.', 'Difficulty does not scare me.', 'I have kept harder species.'],
  size: ['Size is not a big deal for me.', '[one] I am happy to grow it out myself.', '[many] I am happy to grow them out myself.', 'Bigger is not always better.'],
  visitorAppeal: ['I am not worried about crowd appeal.', 'This is for me, not an audience.', 'I do not need a showpiece.'],
};

const STALE = ["It has been listed a while, so I'm offering a bit under.", 'Listings like this have been sitting lately, so here is my number.', '[one] Since nobody has snapped it up yet, I am starting a little lower.', '[many] Since nobody has snapped them up yet, I am starting a little lower.'];
const CHANGED = ['I noticed the listing changed since it went up.', 'The update on the listing gave me pause.', 'Given the recent changes, I have adjusted my offer.'];
const OVER_BUDGET = ['This is the top of my budget.', 'I am stretching my budget for this.', 'That is honestly everything I can spend right now.'];
const FAVOURITE = ['I have always had a soft spot for {species}.', '{Species} are my favourite — I could not scroll past.', 'I have been looking for {species} for a while.'];
const GENERIC_LIKE = ['It is a nice listing', 'This looks like a solid offer', 'It caught my eye'];

// ───────────────────────────── frags & cuttings (lane:frags) ─────────────────────────────
// Scope 'frag'. Templates tagged [coral] / [plant] only show when the listing is all corals / all plants (vars.fragType).

const LIKE_FRAG: AspectBank = {
  rarity: ['You rarely see {species} offered locally', '[coral][one] A frag like this is hard to find', '[coral][many] Frags like these are hard to find', '[coral] That colour is exactly what my reef is missing', '[plant] I have been hunting for {species}'],
  lineage: ['I like knowing exactly which colony a frag came from', 'Tank-grown frags from a known colony always settle faster', '[coral] Healed on the plug and grown locally — that is worth paying for'],
  beauty: ['[coral] The colour under the blue lights is gorgeous', '[coral][one] That is a beautiful piece', '[coral][many] Those are beautiful pieces', '[plant] Lovely, vivid growth', '[one] It looks great in the photos', '[many] They look great in the photos'],
  health: ['[coral] The polyps are out and the tissue looks healthy', '[coral] Good colour and full polyp extension', 'Clean cuts and healthy tissue — nicely done', '[plant] Clean, healthy leaves with no melt', '[plant] Crisp new growth, clearly well fed', '[one] It looks healthy and well cared for', '[many] They look healthy and well cared for'],
  easyCare: ['[coral] These are about as forgiving as corals get', '[coral] Hardy corals like these suit my tank perfectly', '[plant] An easy grower, which is just what I need', 'Nice and hardy', 'Easy to keep, which is what I need right now'],
  size: ['Already grown out a bit, which saves me weeks', '[coral] A good size on the plug', '[plant] Nice, full stems', '[one] A decent-sized piece for a frag', '[many] Decent-sized pieces for frags'],
  visitorAppeal: ['[one] It would look great front and centre', '[many] They would look great front and centre', 'This would catch the eye in my display'],
};

const CONCERN_FRAG: AspectBank = {
  rarity: ["[one] it's a common piece, so I can't go too high", "[many] they're common pieces, so I can't go too high", 'there are plenty of these around'],
  lineage: ['a fresh cut is always a bit of a gamble', '[one] I would have liked it healed on the plug first', '[many] I would have liked them healed on the plug first'],
  beauty: ['the colour is a little muted', '[one] it is not the most striking piece', '[many] they are not the most striking pieces'],
  health: ['[one] it looks a little stressed', '[one] I would want to watch it heal first', '[many] they look a little stressed', '[many] I would want to watch them heal first'],
  easyCare: ['[coral][one] it needs very clean water, which makes me cautious', '[coral][many] they need very clean water, which makes me cautious', '[one] it is more demanding than I would like', '[many] they are more demanding than I would like'],
  size: ["[one] it's still a small frag", '[one] it has a lot of growing to do', "[one] it's only a small piece for now", '[one] I will need a few weeks to grow it on', '[one] it will take a while to fill in', "[many] they're still small frags", '[many] they have a lot of growing to do', '[many] I will need a few weeks to grow them on', '[many] they will take a while to fill in'],
  visitorAppeal: ['[one] it is more of a background piece', '[one] it will not stand out much at first', '[many] they are more background pieces', '[many] they will not stand out much at first'],
};

type FragBank = Partial<Omit<ArchetypeBank, 'needAspect' | 'counter'>> & { counter?: Partial<ArchetypeBank['counter']> };

const FRAG_SHARED = {
  openers: ['Hi — I saw your frag listing.', '[coral] I am slowly stocking a new reef.', '[plant] I am replanting a tank this week.'],
  closers: ['[one] I can collect it this week.', '[many] I can collect them this week.', 'Thanks for considering it.', '[coral][one] I will send you a photo once it opens up.', '[coral][many] I will send you a photo once they open up.', '[plant][one] I will send a photo once it fills in.', '[plant][many] I will send a photo once they fill in.'],
  buyNow: ['[one] Buying it now before someone else does.', '[many] Buying them now before someone else does.', '[one] Fair price — I will take it now.', '[many] Fair price — I will take them now.'],
  withdraw: ['Found one closer to home. Withdrawing my offer.', 'I have run out of space in the tank. Withdrawing.'],
  feedbackGood: ['[coral][one] It opened up the first evening. Thank you!', '[coral][many] They opened up the first evening. Thank you!', '[plant] Already putting out new growth. Thank you!', 'Healthy and exactly as described. Thanks.'],
};

const FRAG_BANK: Partial<Record<BuyerArchetype, FragBank>> = {
  beginner: {
    openers: ['[coral] Hi! My first reef tank just finished cycling.', '[plant] Hi! I am planting my first tank.', 'Hi! I am just getting into this.'],
    needs: ['[coral] I need something forgiving for my first corals.', '[plant] I want easy plants that grow for anyone.'],
    likes: { easyCare: ['[coral] Everyone says these are a great first coral', '[coral] I read these are perfect for a new reef', '[plant] Everyone says {species} are foolproof'] },
    closers: ['Any care tips would be very welcome!', 'Thanks so much!'],
  },
  experienced_keeper: {
    openers: ['[coral] I have kept reefs for years.', '[plant] Long-time planted-tank keeper here.', 'Seasoned hobbyist here.'],
    needs: ['I care more about health than hype.'],
    feedbackGood: ['Healed, healthy and exactly as described. Thanks.', 'Settled in perfectly. I would buy from you again.'],
  },
  breeder: {
    openers: ['[plant] I need plants for my fry tanks.', '[plant] My breeding tanks could use more cover.', '[coral] I grow out frags alongside my fish.'],
    needs: ['[plant] Pest-free plants matter most in fry tanks.'],
    likes: { health: ['[plant] Clean plants with no pests — important for fry tanks'] },
    counter: {
      split: ['I have to watch my margins — meet me at {amount}?', 'I can stretch to {amount}.'],
      hold: ['{amount} is what it is worth to me right now.', 'I will stay at {amount}.'],
      walk: ['That breaks my budget, sorry.', 'Too high for me. I will pass.'],
    },
    feedbackGood: ['[plant][one] The fry love hiding in it already.', '[plant][many] The fry love hiding in them already.', 'Clean and healthy — thank you.'],
  },
  collector: {
    openers: ['[coral] I collect unusual coral colours.', '[coral] My reef is all about standout pieces.', 'Collector here.'],
    needs: ['[coral] I only buy colours I cannot find elsewhere.'],
    likes: { rarity: ['[coral] A piece like this would finish my collection'] },
    counter: { walk: ['Beyond what I will pay for a frag.', 'I will wait for the next one to surface.', 'Too far apart. Enjoy the colony.'] },
    feedbackGood: ['[coral] Stunning under the blues. Thank you.', 'Even better in person.'],
  },
  aquascaper: {
    openers: ['[plant] I am scaping a new layout.', '[plant] I need more of this for a contest scape.', 'Scaper here.'],
    needs: ['[plant] I buy plants that fill a layout fast.'],
    likes: { beauty: ['[plant][one] This would fill my midground beautifully', '[plant][many] These would fill my midground beautifully'] },
    counter: {
      accept: ['{counter} — fine. It is healthy stock.', 'Agreed at {counter}.'],
      split: ['Could we settle at {amount}?', 'Let us say {amount}.'],
      walk: ['I can find this for less. I will pass.', 'Too far apart, sorry.'],
    },
    feedbackGood: ['[plant] Already filling in the layout — thank you!', 'Beautiful, healthy growth. Thanks!'],
  },
  family: {
    openers: ['[coral] Our kids love our little reef.', '[plant] We are adding some green to our family tank.'],
    closers: ['The kids will be thrilled.', 'Thanks so much!'],
  },
  public_aquarium: {
    openers: ['[coral] Our reef gallery at {org} is growing.', 'Our education team propagates corals and plants too.'],
    needs: ['Healthy, well-healed stock is what we look for.'],
    feedbackGood: ['[one] It is already on display. Thank you.', '[many] They are already on display. Thank you.'],
  },
  conservation: {
    openers: ['[coral] We teach coral propagation at {org}.', '[coral] Aquacultured frags take pressure off wild reefs.', '[plant] We use plants in our classroom tanks.'],
    closers: ['[coral] Aquacultured frags are exactly what we want to promote.', 'Thank you for propagating responsibly.'],
    counter: {
      accept: ['For aquacultured stock, {counter} is fair.', 'Agreed at {counter}. Thank you.'],
      split: ['We are a small program — could we meet at {amount}?', '{amount} is what our budget can cover.'],
    },
    feedbackGood: ['[coral] Perfect for our propagation workshop. Thank you!', 'Healthy and exactly as described. Thank you.'],
  },
  bargain_hunter: {
    openers: ['Quick offer.', 'Cash offer, quick pickup.', 'I have seen frags go for less.'],
  },
};

/** The archetype bank for a frag listing: frag wording where it exists, the archetype's own counters otherwise. */
function fragBank(archetype: BuyerArchetype): ArchetypeBank {
  const base = BANK[archetype] ?? BANK.experienced_keeper;
  const f = FRAG_BANK[archetype] ?? {};
  return {
    openers: [...(f.openers ?? []), ...FRAG_SHARED.openers],
    closers: [...(f.closers ?? []), ...FRAG_SHARED.closers],
    needs: f.needs ?? [],
    needAspect: base.needAspect,
    likes: f.likes ?? {},
    counter: { ...base.counter, ...(f.counter ?? {}) },
    buyNow: [...(f.buyNow ?? []), ...FRAG_SHARED.buyNow],
    withdraw: [...(f.withdraw ?? []), ...FRAG_SHARED.withdraw],
    feedbackGood: [...(f.feedbackGood ?? []), ...FRAG_SHARED.feedbackGood],
  };
}

function bankFor(archetype: BuyerArchetype, vars: MsgVars): ArchetypeBank {
  return vars.scope === 'frag' ? fragBank(archetype) : BANK[archetype] ?? BANK.experienced_keeper;
}

// ───────────────────────────── archetype fragments ─────────────────────────────

interface ArchetypeBank {
  openers: string[];
  closers: string[];
  needs: string[];
  /** Aspect this archetype's "needs" line is about. */
  needAspect: Aspect;
  likes: Partial<Record<Aspect, string[]>>;
  counter: { accept: string[]; split: string[]; hold: string[]; walk: string[] };
  buyNow: string[];
  withdraw: string[];
  feedbackGood: string[];
}

const BANK: Record<BuyerArchetype, ArchetypeBank> = {
  beginner: {
    openers: ['Hi! This would be my first real aquarium.', "Hello — I'm pretty new to this.", 'Hey there, still learning the ropes.', 'Hi, my local shop pointed me to your listing.', "Hello! I've been reading everything I can find.", "Hi — I've wanted a tank for years."],
    closers: ['Hope this offer works!', 'Thanks for considering it!', 'Fingers crossed.', 'Any care tips would be very welcome!', "[one] I'd take good care of it, promise.", "[many] I'd take good care of them, promise."],
    needs: ['I need a beginner-friendly setup.', 'I want something that forgives a few mistakes.', 'Easy care matters most to me.'],
    needAspect: 'easyCare',
    likes: { easyCare: ['{species} were on my shortlist of easy first animals', 'Everyone says {species} are a great place to start'], health: ['[one] It looks healthy, which reassures a newbie like me', '[many] They look healthy, which reassures a newbie like me'] },
    counter: {
      accept: ['Okay, deal! {counter} it is.', "That's a stretch, but you've been helpful — {counter} works.", 'Alright, {counter}. I am excited!'],
      split: ['Could we meet in the middle at {amount}?', 'I can do {amount} — would that work?', 'Maybe {amount}? That is really my limit.'],
      hold: ['Sorry, {amount} is all I can manage right now.', 'I have to stick with {amount}, I am on a budget.', 'I wish I could, but {amount} is my number.'],
      walk: ['That is more than I can spend, sorry. Good luck!', 'I think I will keep looking. Thanks anyway!', 'That is too rich for a beginner like me.'],
    },
    buyNow: ['[one] I am just going to buy it now — too excited to wait!', '[many] I am just going to buy them now — too excited to wait!', '[one] Buying it outright so I do not miss out!', '[many] Buying them outright so I do not miss out!'],
    withdraw: ['I got nervous about the changes, sorry — withdrawing my offer.', 'I think I need something simpler. Withdrawing.'],
    feedbackGood: ['Everything arrived happy and healthy. Thank you for the tips!', 'My first tank is up and running — thank you so much!'],
  },
  experienced_keeper: {
    openers: ['I have kept {species} for years.', 'Been in the hobby a long time — nice listing.', 'Seasoned keeper here.', 'I run a few tanks at home.', 'I know what healthy {species} look like.', 'Long-time hobbyist here.'],
    closers: ['Clean offer, quick pickup.', 'I can collect this week.', 'Happy to talk husbandry if you like.', 'Straightforward offer.', 'Let me know.'],
    needs: ['I care more about health than hype.', 'Condition and husbandry matter most to me.'],
    needAspect: 'health',
    likes: { health: ['Good condition and clearly well kept', 'I can see the water care in how this stock looks'], size: ['[animal] Properly grown out, which I respect', '[tank] A sensible size for a serious system'] },
    counter: {
      accept: ['Fair enough — {counter} it is.', '{counter} is reasonable. Deal.', 'You know what you have. {counter}, agreed.'],
      split: ['Let us split the difference: {amount}.', 'I can come up to {amount}.', 'How about {amount}? That is fair for both of us.'],
      hold: ['My offer of {amount} stands — it is a fair price.', 'I will stay at {amount}. The market is what it is.', 'I am comfortable at {amount}, no higher.'],
      walk: ['We are too far apart. Good luck with the sale.', 'That is above what it is worth to me. I will pass.', 'I will look elsewhere, thanks.'],
    },
    buyNow: ['[one] Fair buy-now price. Taking it.', '[many] Fair buy-now price. Taking them.', '[one] No haggling needed — I will buy it now.', '[many] No haggling needed — I will buy them now.'],
    withdraw: ['The changes to the listing do not sit right with me. Withdrawing.', 'Found a similar setup closer to home. Withdrawing my offer.'],
    feedbackGood: ['Settled in within a day. Exactly as described — thanks.', 'Healthy, well-conditioned animals. Would buy from you again.'],
  },
  breeder: {
    openers: ['I am building out a breeding program.', 'Breeder here — I am looking for new blood.', 'I run a small line of {species}.', 'I am always looking for proven stock.', 'My fishroom could use this.', 'I keep careful records on every line.'],
    closers: ['Offspring would carry your line name.', 'I will credit your shop in my lineage records.', 'Looking forward to seeing what they throw.', 'Serious offer from a serious breeder.', 'Happy to send you photos of the next generation.'],
    needs: ['Fertility and a documented line matter most to me.', 'I buy for the genes as much as the looks.'],
    needAspect: 'lineage',
    likes: { lineage: ['This line would slot straight into my program', 'Proven parents mean fewer surprises in the fry'], rarity: ['Those {morph} genes would be valuable in my lines'] },
    counter: {
      accept: ['For genetics like these, {counter} is fine.', 'Deal at {counter} — I will credit your line.', '{counter} works. Good stock is worth it.'],
      split: ['Breeders have to watch margins — meet me at {amount}?', 'I can stretch to {amount}.', '{amount}, and I will send you photos of a future clutch.'],
      hold: ['{amount} is what the line is worth to me right now.', 'I will hold at {amount} — I have to budget for raising fry.', 'Staying at {amount}, but the offer stands.'],
      walk: ['That breaks my budget for new stock. I will pass.', 'Too high for breeding stock, sorry.', 'I will wait for another line to come up.'],
    },
    buyNow: ['[one] Proven stock at that price? Buying it now.', '[many] Proven stock at that price? Buying them now.', '[one] Taking it at buy-now before another breeder does.', '[many] Taking them at buy-now before another breeder does.'],
    withdraw: ['That change affects the breeding value for me. Withdrawing.', 'Found stock from a line I already know. Withdrawing my offer.'],
    feedbackGood: ['Already in conditioning — first spawn soon, I hope.', 'Excellent stock — the start of a new line in my fishroom.'],
  },
  collector: {
    openers: ['I collect unusual morphs.', 'Collector here.', 'This caught my eye immediately.', '[one] I have been searching for one of these.', '[many] I have been searching for {species} like these.', 'My display tanks are all about rare pieces.', 'I keep a small gallery of rare animals.'],
    closers: ['I pay well for the right piece.', '[one] It would have pride of place.', '[many] They would have pride of place.', 'Name your terms — within reason.', '[one] It would be the jewel of my collection.', '[many] They would be the jewels of my collection.', 'I can move quickly.'],
    needs: ['Rarity is everything to me.', 'I only buy pieces I cannot find elsewhere.'],
    needAspect: 'rarity',
    likes: { rarity: ['[one] A {morph} like this is a true collector piece', '[many] {morph} {species} like these are true collector pieces', '[one] I have not seen one this nice all year', '[many] I have not seen any this nice all year'], lineage: ['Rare and documented — that is the dream combination'] },
    counter: {
      accept: ['For a piece like this, {counter} is fine.', 'Done — {counter}.', 'I will not quibble over a rare find. {counter}.'],
      split: ['Meet me at {amount} and it is yours.', '{amount}, and I can pay today.', 'I can do {amount} for something this special.'],
      hold: ['{amount} is already generous for the market.', 'I will stay at {amount} — rare, but not unique.', 'My offer of {amount} remains open.'],
      walk: ['Beyond what I will pay, even for a rare piece.', 'I will wait for the next one to surface.', '[animal][one] Too far apart. Enjoy the animal.', '[animal][many] Too far apart. Enjoy the animals.', '[tank] Too far apart. Enjoy the tank.'],
    },
    buyNow: ['[one] Buying it now — rare pieces do not wait.', '[many] Buying them now — rare pieces do not wait.', '[one] Taking it at buy-now. Worth every penny.', '[many] Taking them at buy-now. Worth every penny.'],
    withdraw: ['The listing changed — not the piece I was after anymore.', 'Another collector beat you to it with a similar piece. Withdrawing.'],
    feedbackGood: ['Stunning in person. The centrepiece of my collection.', 'Even better than the photos. Thank you.'],
  },
  aquascaper: {
    openers: ['I am an aquascaper.', 'I judge tanks by their layout first.', 'Scaper here — I noticed the composition.', 'I have entered a few aquascaping contests.', 'I spend more on hardscape than livestock.', 'I photograph planted tanks for fun.'],
    closers: ['[tank] I would keep the scape intact.', '[one] It would be a centrepiece in my studio.', '[many] They would be a centrepiece in my studio.', '[one] I would love to photograph it properly.', '[many] I would love to photograph them properly.', '[tank] Composition like this is rare.', '[tank] Happy to credit you as the original scaper.', '[animal][one] It would finish off my current layout nicely.', '[animal][many] They would finish off my current layout nicely.'],
    needs: ["[tank] I'm buying the aquascape as much as the animals.", '[tank] Layout, plants and balance are what I pay for.', '[animal] I only add animals that suit a planted layout.'],
    needAspect: 'beauty',
    likes: { beauty: ['[tank] The hardscape flows beautifully', '[tank] The negative space and planting are handled with real taste', '[animal] That colour would glow against a planted layout'], health: ['[tank] Healthy plants and clear water — a sign of a balanced system', '[animal][one] A healthy animal like this would suit a clean scape', '[animal][many] Healthy animals like these would suit a clean scape'] },
    counter: {
      accept: ['[tank] A scape like this deserves {counter}. Deal.', '[tank] {counter} — fine. It is a lovely layout.', '[animal] {counter} — fine. Good colour is worth it.', 'Agreed at {counter}.'],
      split: ['Could we settle at {amount}?', '[tank] {amount}, and I will keep your layout as is.', 'Let us say {amount}.'],
      hold: ['[tank] {amount} is my ceiling for a scape this size.', 'I will stay at {amount}.', 'My offer of {amount} stands.'],
      walk: ['I could build something similar for less. I will pass.', 'Too far apart, sorry — beautiful work though.', 'I will keep looking.'],
    },
    buyNow: ['[tank] Taking it now — I do not want someone to tear the scape down.', '[tank] Buy-now, please. I love this layout.', '[animal][one] Buying it now — that colour will glow in my layout.', '[animal][many] Buying them now — that colour will glow in my layout.'],
    withdraw: ['[tank] The layout changed after listing — it is not the scape I fell for. Withdrawing.', 'It no longer fits what I am building. Withdrawing.'],
    feedbackGood: ['[tank] Re-filled and the scape looks perfect. Thank you!', '[one] Already photographing it — beautiful work.', '[many] Already photographing them — beautiful work.', '[animal] Settled into my layout beautifully. Thank you!'],
  },
  family: {
    openers: ['Our kids have been begging for this.', 'We are a family looking for our first tank.', 'Hi from the whole family!', 'Our daughter picked this listing out.', 'We visited your shop last weekend.', '[one] The kids named it already, so no pressure!', '[many] The kids have already named them, so no pressure!'],
    closers: ['The kids are so excited.', '[one] It will go right in the living room.', '[many] They will go right in the living room.', 'Thanks so much!', 'We will send photos!', 'Hope to hear back soon.'],
    needs: ['We need something safe and easy for the kids to enjoy.', 'Friendly, visible animals matter most to us.'],
    needAspect: 'easyCare',
    likes: { visitorAppeal: ['The kids would watch {species} for hours', '[tank] It is exactly the kind of tank that makes kids gasp', '[animal][one] The kids already love {name}', '[animal][many] The kids already love {lot}'], beauty: ['It is so pretty — the kids love the colours'] },
    counter: {
      accept: ['Okay, the kids win — {counter} it is!', 'We can do {counter}. Deal!', '{counter} is fine — they would never forgive us otherwise.'],
      split: ['Could you do {amount}? We are on a family budget.', '{amount} would really help us.', 'Would {amount} work?'],
      hold: ['Sorry, {amount} is what we set aside.', 'We have to stay at {amount}.', '{amount} is our limit, I am afraid.'],
      walk: ['That is a bit much for us, sorry.', 'We will look for something smaller. Thanks!', 'Too much for our budget right now.'],
    },
    buyNow: ['[one] The kids insisted — buying it now!', '[many] The kids insisted — buying them now!', '[one] We are buying it now before someone else does!', '[many] We are buying them now before someone else does!'],
    withdraw: ['We are not sure it is right for the kids now. Withdrawing.', 'We decided on something simpler. Sorry!'],
    feedbackGood: ['[one] The kids check on it every morning. Thank you!', '[many] The kids check on them every morning. Thank you!', 'Our living room has never looked better. Thanks!'],
  },
  public_aquarium: {
    openers: ['I curate exhibits for {org}.', 'On behalf of the curatorial team at {org}:', 'We are planning a new gallery at {org}.', 'Our visitors at {org} would love this.', 'I am sourcing animals for a public display.', 'Our education team flagged this listing.'],
    closers: ['We can arrange professional transport.', '[one] It would be seen by thousands.', '[many] They would be seen by thousands.', 'We would credit your shop on the exhibit sign.', 'Our board approved this budget.', 'Happy to share visitor feedback afterwards.'],
    needs: ['Health, scale and visitor appeal are what we look for.', "I'm interested because this exhibit has proven visitor appeal."],
    needAspect: 'visitorAppeal',
    likes: { visitorAppeal: ['[tank] This display has exactly the pull our galleries need', 'Our visitors respond strongly to {species}'], size: ['[tank] At {gallons} gallons it is a true exhibit piece', '[animal][one] A well-grown animal like {name} shows well behind glass', '[animal][many] Well-grown animals like these show well behind glass'], health: ['Our vets would sign off on stock this healthy'] },
    counter: {
      accept: ['The board will approve {counter}. Agreed.', 'We can do {counter} for an exhibit of this quality.', 'Agreed at {counter} — we will arrange transport.'],
      split: ['Our budget allows {amount}. Could that work?', 'We can go to {amount} with board approval.', 'Meet us at {amount}?'],
      hold: ['{amount} is the approved budget, I am afraid.', 'We cannot exceed {amount} this quarter.', 'Our offer remains {amount}.'],
      walk: ['That is beyond our acquisition budget. Thank you for your time.', 'We will have to pass this time.', 'Our board will not approve that figure.'],
    },
    buyNow: ['[one] This fits our exhibit plan — we will buy it now.', '[many] These fit our exhibit plan — we will buy them now.', 'We are authorised to buy at your buy-now price.'],
    withdraw: ['Our animal-care team cannot approve the setup after the changes. Withdrawing.', 'Plans for the gallery changed — withdrawing our offer.'],
    feedbackGood: ['The exhibit opened to great reviews. Thank you for the healthy animals.', 'Visitors are queuing to see it. Wonderful work.'],
  },
  conservation: {
    openers: ['I work with {org}.', 'Our program focuses on responsibly bred animals.', 'We run conservation outreach about {species}.', 'Captive-bred stock like this supports our mission.', 'I am with a conservation-minded keepers network.', 'We use animals like these in school outreach.'],
    closers: ['Documented captive breeding matters to us.', 'This would help our education program.', 'Thank you for breeding responsibly.', 'We would share the lineage records with our members.', 'Every responsibly bred animal helps take pressure off wild populations.'],
    needs: ['Captive-bred, healthy and well documented — that is our standard.', 'We only take animals with clear, captive-bred origins.'],
    needAspect: 'lineage',
    likes: { lineage: ['Clear captive-bred records like these are exactly what we need', 'Documented origins make these ideal for outreach'], health: ['Healthy, captive-raised animals are perfect ambassadors'] },
    counter: {
      accept: ['For responsibly bred animals, {counter} is fair.', 'Agreed at {counter}. Thank you.', '{counter} — our donors will be pleased.'],
      split: ['We are a small program — could we meet at {amount}?', '{amount} is what our grant can cover.', 'Would you accept {amount}?'],
      hold: ['{amount} is all the program can allocate.', 'Our budget is fixed at {amount}, I am afraid.', 'We will stay at {amount}.'],
      walk: ['That is beyond our program budget. Keep up the good work.', 'We will have to decline — thank you though.', 'Too much for us, sorry.'],
    },
    buyNow: ['[one] This is exactly what we need — buying it now.', '[many] These are exactly what we need — buying them now.', '[one] We will take it at buy-now for the program.', '[many] We will take them at buy-now for the program.'],
    withdraw: ['After the health update we have to hold off for now. Withdrawing.', 'We found a match through our network. Withdrawing.'],
    feedbackGood: ['Already part of our outreach program. Thank you!', 'Healthy and exactly as documented. Thank you for breeding responsibly.'],
  },
  bargain_hunter: {
    openers: ['Quick offer.', 'Cash offer, fast pickup.', "I'll be honest, I'm looking for a deal.", 'Straight to it:', 'I have seen similar go for less.', 'No fuss offer.'],
    closers: ['Take it or leave it.', 'Cash today.', '[one] Could pick it up in an hour.', '[many] Could pick them up in an hour.', 'It is a fair price in this market.', 'Let me know quick — I am looking at others.'],
    needs: ['Price is my main concern.', 'I only buy when the price is right.'],
    needAspect: 'health',
    likes: { size: ['Decent size for the money'], health: ['Looks healthy enough'] },
    counter: {
      accept: ['Fine. {counter}. But that is it.', 'Ugh, okay — {counter}.', '{counter}. Deal, before I change my mind.'],
      split: ['{amount}. Final offer.', 'Meet me at {amount} and we are done.', 'I will do {amount}, no more.'],
      hold: ['{amount}. That is my price.', 'Not budging from {amount}.', 'My offer is {amount}. Your call.'],
      walk: ['Nah, too much. I am out.', 'Forget it. Plenty of others out there.', 'Not at that price. Bye.'],
    },
    buyNow: ['[one] Buy-now is a steal. Taking it.', '[many] Buy-now is a steal. Taking them.', '[one] Good price — buying it now.', '[many] Good price — buying them now.'],
    withdraw: ['Found a cheaper one. Withdrawing.', 'Changed my mind. Withdrawing.'],
    feedbackGood: ['[one] Got it home fine. Good deal.', '[many] Got them home fine. Good deal.', 'All good. Fair price.'],
  },
};

const WITHDRAW_SHARED: Record<'changed' | 'water' | 'sick' | 'lost_interest', string[]> = {
  changed: ['The listing changed after I bid, so I am withdrawing my offer.', 'That is not quite what I bid on anymore. Withdrawing.', 'I will pass now that the contents have changed.'],
  water: ['The water crash worries me — withdrawing until things stabilise.', 'I cannot take on a tank with water problems right now. Withdrawing.'],
  sick: ['I am sorry to hear about the illness. I will withdraw for now.', 'I would rather wait for a full recovery. Withdrawing.'],
  lost_interest: ['Plans changed on my end — withdrawing my offer.', 'I found something closer to home. Withdrawing.', 'I have decided to hold off for now. Sorry!'],
};

const FEEDBACK_UNHEALTHY = [
  '[tank] The animals arrived stressed and the water was off. Not a great experience.',
  '[tank] Honestly, the setup needed more care than I was told.',
  '[tank] Some of the livestock clearly were not doing well. Disappointed.',
  // lane:w2-ui — animal and frag sales used to hear about "the setup" and "the livestock"
  '[animal][one] It arrived stressed and needed a lot of care. Not a great experience.',
  '[animal][many] They arrived stressed and needed a lot of care. Not a great experience.',
  '[animal][many] Some of them clearly were not doing well. Disappointed.',
  '[frag][one] It arrived stressed and took weeks to recover. Disappointed.',
  '[frag][many] They arrived stressed and took weeks to recover. Disappointed.',
  'Honestly, it needed more care than I was told.',
];
const FEEDBACK_MISREP = [
  'This was not what the listing showed. Health and stocking were much worse on arrival.',
  'The listing looked great, but what arrived was a different story. I will warn my club.',
  'Misleading listing — the condition on arrival was not as described.',
  '[tank] The tank I received does not match the photos or the health report. Very disappointing.',
];

// ───────────────────────────── composition ─────────────────────────────

export interface BidMessageInput {
  archetype: BuyerArchetype;
  isTank: boolean;
  /** lane:frags — a frag/cutting listing (frag like/concern banks and frag archetype wording). */
  isFrag?: boolean;
  likes: Aspect[];
  concerns: Aspect[];
  indifferent?: Aspect;
  favourite?: boolean;
  stale?: boolean;
  changed?: boolean;
  overBudget?: boolean;
  vars: MsgVars;
}

/** lane:w2-ui — every leading tag of a template: "[coral][one] It opened up…" → ['coral', 'one']. */
const TAGS_RE = /^(?:\[(?:tank|animal|frag|coral|plant|one|many)\]\s*)+/;
function tagsOf(t: string): string[] {
  const m = TAGS_RE.exec(t);
  return m ? (m[0].match(/[a-z]+/g) ?? []) : [];
}

/** A template is usable when it fits the listing scope ([tank]/[animal]), its number and every placeholder has a value. */
function usable(t: string, vars: MsgVars): boolean {
  for (const tag of tagsOf(t)) {
    if (tag === 'tank' && vars.scope !== 'tank') return false;
    if (tag === 'animal' && (vars.scope === 'tank' || vars.scope === 'frag')) return false;
    // lane:frags — frag templates only for frag listings; [coral]/[plant] only when the listing is all one kind
    if (tag === 'frag' && vars.scope !== 'frag') return false;
    if (tag === 'coral' && vars.fragType !== 'coral') return false;
    if (tag === 'plant' && vars.fragType !== 'plant') return false;
    // lane:w2-ui — "it" for one animal / frag / a whole tank, "they" for a pair, group, juveniles or frag pack
    if (tag === 'one' && vars.many) return false;
    if (tag === 'many' && !vars.many) return false;
  }
  const keys = t.match(/\{(\w+)\}/g) ?? [];
  return keys.every((k) => {
    const key = k.slice(1, -1);
    if (key === 'species' || key === 'Species') return true;
    const v = vars[key];
    return v !== undefined && v !== '';
  });
}

const stripScope = (t: string): string => t.replace(TAGS_RE, '');

function pickFrom(rng: Rng, pool: string[], vars: MsgVars, fallback: string[] = GENERIC_LIKE): string {
  const ok = pool.filter((t) => usable(t, vars));
  if (ok.length) return stripScope(rng.pick(ok));
  const fb = fallback.filter((t) => usable(t, vars));
  return stripScope(rng.pick(fb.length ? fb : GENERIC_LIKE));
}

function render(t: string, vars: MsgVars): string {
  const species = vars.species || 'animals';
  const out = fill(t, { ...vars, species, Species: capitalise(species) });
  // Sentence-case every sentence (templates may start with a lower-case species name).
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

/** Compose an opening-bid message that exposes the buyer's preferences (at most ~4 sentences). */
export function composeBidMessage(rng: Rng, input: BidMessageInput): string {
  const v = input.isFrag ? { ...input.vars, scope: 'frag' as const } : input.vars;
  const bank = bankFor(input.archetype, v);
  const likeBank = input.isFrag ? LIKE_FRAG : input.isTank ? LIKE_TANK : LIKE_ANIMAL;
  const concernBank = input.isFrag ? CONCERN_FRAG : input.isTank ? CONCERN_TANK : CONCERN_ANIMAL;

  // Core sentence: what they like (+ the main reservation).
  const likeAspect = input.likes[0];
  let like: string;
  if (likeAspect) {
    const own = bank.likes[likeAspect];
    like = pickFrom(rng, own && rng.chance(0.4) ? own : likeBank[likeAspect], v, likeBank[likeAspect]);
  } else like = pickFrom(rng, GENERIC_LIKE, v);
  const concernAspect = input.concerns[0];
  const core = concernAspect
    ? `${stripEnd(like)}, but ${lowerFirst(stripEnd(pickFrom(rng, concernBank[concernAspect], v, ['the price has to reflect the risk'])))}.`
    : `${stripEnd(like)}.`;

  // Extras in priority order; only the first two survive.
  const extras: string[] = [];
  const needRelevant = input.concerns.includes(bank.needAspect) || input.likes.includes(bank.needAspect);
  let needFirst = false;
  if (bank.needs.some((t) => usable(t, v)) && rng.chance(needRelevant ? 0.6 : 0.15)) {
    extras.push(pickFrom(rng, bank.needs, v));
    needFirst = rng.chance(0.5);
  }
  if (input.changed) extras.push(pickFrom(rng, CHANGED, v));
  else if (input.stale && rng.chance(0.7)) extras.push(pickFrom(rng, STALE, v));
  if (input.overBudget) extras.push(pickFrom(rng, OVER_BUDGET, v));
  if (input.indifferent && !input.isFrag && rng.chance(0.6)) extras.push(pickFrom(rng, INDIFFERENT[input.indifferent], v, ['Details like that matter less to me.']));
  if (!concernAspect && input.likes[1] && rng.chance(0.4)) {
    const own = bank.likes[input.likes[1]];
    extras.push(`${stripEnd(pickFrom(rng, own && rng.chance(0.4) ? own : likeBank[input.likes[1]], v, likeBank[input.likes[1]]))}.`);
  }
  const kept = extras.slice(0, 2);

  const parts: string[] = [];
  const favourite = input.favourite && rng.chance(0.6) ? pickFrom(rng, FAVOURITE, v, ['I have been looking for one of these.']) : null;
  const opener = !favourite && rng.chance(0.5) ? pickFrom(rng, bank.openers, v, ['Hello.']) : null;
  if (opener) parts.push(opener);
  if (favourite) parts.push(favourite);
  if (needFirst && kept.length) parts.push(kept.shift()!);
  parts.push(core);
  parts.push(...kept);
  if (parts.length < 4 && rng.chance(0.5)) parts.push(pickFrom(rng, bank.closers, v, ['Thanks for considering it.']));
  return render(parts.join(' '), v);
}

export type CounterOutcome = 'accept' | 'split' | 'hold' | 'walk';

export function counterReply(rng: Rng, archetype: BuyerArchetype, outcome: CounterOutcome, vars: MsgVars): string {
  const bank = bankFor(archetype, vars);
  return render(pickFrom(rng, bank.counter[outcome], vars, ['Thanks for getting back to me.']), vars);
}

export function buyNowMessage(rng: Rng, archetype: BuyerArchetype, vars: MsgVars): string {
  const bank = bankFor(archetype, vars);
  return render(pickFrom(rng, bank.buyNow, vars, ['I will take it at the buy-now price.']), vars);
}

export function withdrawMessage(rng: Rng, archetype: BuyerArchetype, reason: 'changed' | 'water' | 'sick' | 'lost_interest', vars: MsgVars): string {
  const bank = bankFor(archetype, vars);
  const pool = rng.chance(0.35) ? bank.withdraw : WITHDRAW_SHARED[reason];
  return render(pickFrom(rng, pool, vars, WITHDRAW_SHARED.lost_interest), vars);
}

export function saleFeedback(rng: Rng, archetype: BuyerArchetype, kind: 'good' | 'unhealthy' | 'misrep', vars: MsgVars): string {
  const bank = bankFor(archetype, vars);
  const pool = kind === 'good' ? bank.feedbackGood : kind === 'unhealthy' ? FEEDBACK_UNHEALTHY : FEEDBACK_MISREP;
  return render(pickFrom(rng, pool, vars, ['Thank you.']), vars);
}

/** Number of distinct template fragments available to an archetype (archetype-specific + shared). */
export function templateCount(archetype: BuyerArchetype): number {
  const b = BANK[archetype];
  const own =
    b.openers.length +
    b.closers.length +
    b.needs.length +
    Object.values(b.likes).reduce((a, x) => a + (x?.length ?? 0), 0) +
    b.counter.accept.length +
    b.counter.split.length +
    b.counter.hold.length +
    b.counter.walk.length +
    b.buyNow.length +
    b.withdraw.length +
    b.feedbackGood.length;
  const shared = [LIKE_ANIMAL, LIKE_TANK, CONCERN_ANIMAL, CONCERN_TANK, INDIFFERENT].reduce((a, bankA) => a + Object.values(bankA).reduce((s, arr) => s + arr.length, 0), 0);
  const extra = STALE.length + CHANGED.length + OVER_BUDGET.length + FAVOURITE.length + GENERIC_LIKE.length + Object.values(WITHDRAW_SHARED).reduce((a, x) => a + x.length, 0) + FEEDBACK_UNHEALTHY.length + FEEDBACK_MISREP.length;
  return own + shared + extra;
}
