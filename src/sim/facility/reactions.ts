/**
 * Visitor reaction lines (templated). OWNER: lane "facility".
 * Placeholders: {name} creature name, {species} lower-case common name, {Species} capitalised, {species_pl} lower-case
 * plural ("ocellaris clownfish", "neon tetras"), {tank} tank name, {gallons}, {morph}, {moment} (e.g. "a bubble nest"),
 * {who} friend's name. "a {placeholder}" becomes "an" when the value starts with a vowel sound ("an ocellaris clownfish").
 */
import type { VisitorReaction } from '@/types';
import type { Rng } from '../rng';
import { theTank, fixArticles, pluralName } from '../economy/util';

export type ReactionContext =
  | 'wow'
  | 'wow_moment'
  | 'wow_big'
  | 'happy'
  | 'neutral'
  | 'bored'
  | 'fatigue'
  | 'concerned'
  | 'empty'
  | 'crowded'
  | 'kid'
  | 'photographer'
  | 'critic_good'
  | 'critic_bad'
  | 'student'
  | 'conservation'
  | 'friend'
  | 'friend_kids'
  | 'neighbour';

export const REACTION_LINES: Record<ReactionContext, string[]> = {
  wow: [
    'Look at {name}! I didn’t know a {species} could look like that.',
    'Oh wow — {name} just swam right up to the glass to say hi.',
    'That colour on {name} is unreal. Is that really a {species}?',
    'I could watch the {tank} all day. It’s like a tiny world.',
    '{name} is the most beautiful {species} I’ve ever seen.',
    'Everyone come here — {name} is showing off!',
    'The light in the {tank} is magical. You can see every fin.',
    'Is {name} a {morph}? Gorgeous.',
    'This {species} has so much personality. It’s watching me back!',
    'I came for the big tanks, but {name} stole the show.',
    'Look how healthy everything is in the {tank}. Pure joy.',
    'The {tank} feels alive — plants, light, and {name} right in the middle.',
  ],
  wow_moment: [
    'Is that {moment}? We got to see {moment} in the {tank}!',
    'Shh — look, {moment}! Nature is incredible.',
    'I’ve read about this but never seen it: {moment}, right there in the {tank}.',
    'The kids will never forget this — {moment} in the {tank}!',
    'Everyone’s crowding the {tank} because of {moment}. Worth the ticket alone.',
    'A staff member said {name} is part of it — {moment}. Amazing.',
    'Wait, is that {moment}? I have to tell my friends.',
    'You can actually see {moment}. This place really cares for its animals.',
  ],
  wow_big: [
    'The {gallons}-gallon {tank} makes me feel like I’m underwater.',
    'I can’t believe how big the {tank} is — and it’s so clear!',
    'Standing in front of the {tank} is like standing on a reef.',
    'The scale of the {tank} is breathtaking.',
  ],
  happy: [
    'Such a calm, peaceful tank. {name} looks so content.',
    'Aw, {name} is so cute!',
    'The {species_pl} in the {tank} look really well cared for.',
    'I love how the plants frame {name}.',
    'This {tank} would look amazing in my living room.',
    'That little {species} has such a funny way of swimming.',
    'Nice tank. Very relaxing.',
    '{name} looks like it’s having a lovely day.',
    'I didn’t know {species_pl} could be so charming.',
    'You can tell someone really loves the animals here.',
    'Beautiful aquascape in the {tank}.',
    'The {tank} is my favourite so far.',
  ],
  neutral: [
    'Nice {species}.',
    'Hmm, where’s the {species} hiding?',
    'Pretty tank. What’s next?',
    'The {tank} is fine, I guess.',
    'I think I saw a {species}? Hard to tell.',
    'Cute, but I want to see something moving.',
    'Nice enough. Let’s keep going.',
    'Is that all in the {tank}?',
  ],
  bored: [
    'I can’t see anything in the {tank}.',
    'Kind of an empty-looking tank.',
    'Is the {species} asleep?',
    'Meh. Let’s find something more exciting.',
    'The glass on the {tank} is a bit cloudy.',
    'I think I’ve seen enough.',
  ],
  fatigue: [
    'Another {species} tank? We just saw one.',
    'These all look a bit the same.',
    'More {species_pl}… I was hoping for something different.',
    'Didn’t we already see this one?',
    'Same fish, different box.',
  ],
  concerned: [
    'Is {name} okay? It doesn’t look well.',
    'Hmm, {name} looks sick. Someone should check on it.',
    'The water in the {tank} looks off.',
    'That {species} seems really stressed.',
    'I don’t think the animals in the {tank} are happy.',
    'I’d rather see healthy animals than rare ones.',
    'Poor {name}. I hope they’re taking care of it.',
    'Something doesn’t feel right about the {tank}.',
  ],
  empty: [
    'An empty tank? Maybe something’s coming soon.',
    'Just water and rocks in the {tank}. Pretty, though.',
    'Waiting for residents, I suppose.',
  ],
  crowded: [
    'It’s so crowded I can barely see the {tank}.',
    'Too many people in here — I can’t get near the glass.',
    'We had to wait ages to see {name}.',
  ],
  kid: [
    'MUM! MUM! Look at {name}!',
    'Can we get a {species}? Pleeease?',
    'It looked at me! {name} looked at me!',
    'I’m going to name my goldfish {name} too.',
    'It’s like a real-life cartoon!',
    'Why does {name} do that? Is it waving?',
  ],
  photographer: [
    'The light in the {tank} is perfect for photos.',
    'Got it! {name} posed for me.',
    'That reflection off the {tank} glass is gorgeous.',
    'I’m coming back tomorrow with a macro lens for {name}.',
  ],
  critic_good: [
    'Genuinely impressive. The {tank} is exhibition quality.',
    'Healthy animals, thoughtful design. The {tank} is the real deal.',
    'I’ll be writing about {name} and the {tank}.',
    'Most places chase rarity. This place gets welfare right.',
  ],
  critic_bad: [
    'Disappointing. The {tank} needs work.',
    'A rare {species} doesn’t excuse poor husbandry.',
    'Overcrowded and under-considered.',
  ],
  student: [
    'The sign says {species_pl} come from {region}. I didn’t know that!',
    'This is great for my biology project.',
    'I never knew a {species} could do that.',
    'The information about the {species} is really clear.',
  ],
  conservation: [
    'I love that they explain where {species_pl} come from.',
    'Captive-bred {species_pl} — that’s how it should be done.',
    'Happy to donate. Places like this help people care about the ocean.',
    'Seeing {name} makes me want to protect their home in the wild.',
  ],
  friend: [
    '{who} leaned in close: “{name} is gorgeous! How long have you had it?”',
    '{who} stayed for ages watching {name} and left a little tip for the food fund.',
    '“Your {species} is so much cooler than I expected,” says {who}.',
    '{who} took a photo of {name} for their phone background.',
    '“I get it now. I could watch {name} all day,” laughs {who}.',
    '{who} wants to know if {name} has a favourite spot. (It does.)',
  ],
  friend_kids: [
    'The neighbour’s kids pressed their noses to the glass — {name} came right over.',
    '“Is {name} a dragon?” asks the youngest. Close enough.',
    'Two small visitors named {name} their best friend.',
  ],
  neighbour: [
    '{who} from next door popped in: “So THIS is what you’ve been up to!”',
    '{who} brought biscuits and stayed to watch {name}.',
    '“That’s the most peaceful thing I’ve seen all week,” says {who}.',
  ],
};

export const FRIEND_NAMES = ['Maya', 'Theo', 'Priya', 'Sam', 'Jonah', 'Aiko', 'Lena', 'Omar', 'Rosa', 'Felix', 'Nadia', 'Kofi', 'Isla', 'Mateo', 'June', 'Ravi'];
export const NEIGHBOUR_NAMES = ['Mrs Alvarez', 'Mr Okafor', 'Grandpa Joe', 'Ms Lindqvist', 'Mr Tanaka', 'Auntie Bea'];

export interface ReactionVars {
  name?: string;
  species?: string;
  tank?: string;
  gallons?: number;
  morph?: string;
  moment?: string;
  who?: string;
  region?: string;
}

export function fillTemplate(t: string, v: ReactionVars): string {
  const species = (v.species ?? 'fish').toLowerCase();
  const tank = v.tank ?? 'tank';
  const values: Record<string, string | undefined> = { name: v.name ?? 'that one', species, Species: species, species_pl: pluralName(species), morph: v.morph ?? 'rare morph', moment: v.moment, who: v.who, region: v.region, gallons: v.gallons === undefined ? undefined : String(v.gallons) };
  t = fixArticles(t, (k) => values[k]);
  const proper = theTank(tank) === tank; // "Ember’s Tank": no article, no "this"
  const sized = /gallon/i.test(tank) ? theTank(tank) : proper ? `${tank} (${v.gallons ?? '?'} gallons)` : `the ${v.gallons ?? ''}-gallon ${tank}`;
  t = t
    .replace(/\bThe \{gallons\}-gallon \{tank\}/g, sized.charAt(0).toUpperCase() + sized.slice(1))
    .replace(/\bthe \{gallons\}-gallon \{tank\}/g, sized)
    .replace(/\bThe \{tank\}/g, theTank(tank, true))
    .replace(/\bthe \{tank\}/g, theTank(tank))
    .replace(/\bThis \{tank\}/g, proper ? theTank(tank, true) : `This ${tank}`);
  return t
    .replace(/\{name\}/g, v.name ?? 'that one')
    .replace(/\{Species\}/g, species.charAt(0).toUpperCase() + species.slice(1))
    .replace(/\{species_pl\}/g, pluralName(species))
    .replace(/\{species\}/g, species)
    .replace(/\{tank\}/g, v.tank ?? 'tank')
    .replace(/\{gallons\}/g, String(v.gallons ?? ''))
    .replace(/\{morph\}/g, v.morph ?? 'rare morph')
    .replace(/\{moment\}/g, v.moment ?? 'something special')
    .replace(/\{who\}/g, v.who ?? 'A friend')
    .replace(/\{region\}/g, v.region ?? 'far away');
}

export function pickLine(rng: Rng, ctx: ReactionContext, v: ReactionVars): string {
  const lines = REACTION_LINES[ctx];
  return fillTemplate(rng.pick(lines), v);
}

export const REACTIONS_CAP = 80;

export function pushReaction(list: VisitorReaction[], r: VisitorReaction): void {
  list.push(r);
  if (list.length > REACTIONS_CAP) list.splice(0, list.length - REACTIONS_CAP);
}

export function reactionLineCount(): number {
  return Object.values(REACTION_LINES).reduce((a, l) => a + l.length, 0);
}
