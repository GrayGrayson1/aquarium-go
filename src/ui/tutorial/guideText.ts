/**
 * The guide's words as the player reads them: a step's text filled in with the animal the guide is about, the
 * player's temperature unit and their pointer's verbs, and what a step that waits on friends is waiting for. Shared by
 * the coach card and Research › Quests (audit 2026-11-17, A13: the Quests card showed the sim's raw text, in °C
 * whatever the setting and with "Tap" for mouse players). Pure but for reading the temperature setting
 * (tests/sim/audit-guide.test.ts). OWNER: lane "ui-shell".
 */
import type { Creature, GameState } from '@/types';
import { inSharedShop } from '@/state/sharedMode';
import { useSettings } from '@/state/settings';
import { tutorialChain, type TutorialStepDef } from '@/data/quests';
import { interpolate } from '@/sim/facility/progression';
import { FRIEND_HOURS, friendBlocker } from '@/sim/facility/visitors';
import { formatClock } from '@/sim/time';
import { findSpecies } from '@/data/species';
import { safe } from '../common/safe';
import { convertTempText } from '../common/format';

/** Mouse players click; touch players tap. The chain copy is written for touch ("Tap Feed…"). */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** What the guide calls the player's animals when it has none to name (A1). */
const NO_ANIMAL = 'your animals';

/**
 * lane:guide — the animal the guide is about: the starter while it is with you, otherwise another animal (in the
 * focused tank first). "Show me" used to do nothing at all once the starter had been sold or had died, and the card
 * kept naming the starter after it was gone (A1). A listed animal is still in its tank.
 */
export function guideAnimal(g: GameState, focusedTankId: string | null = null): Creature | null {
  const here = Object.values(g.creatures).filter((c) => (c.status === 'alive' || c.status === 'listed') && c.tankId);
  return here.find((c) => c.isStarter) ?? here.find((c) => c.tankId === focusedTankId) ?? here[0] ?? null;
}

/**
 * The step's words with no animal left to name (audit review of A1): written for one named animal, so a sentence about
 * who it is ("{name} is a betta…") or what it does on its own ("When {name} sees something new he…") is left out,
 * the verbs that follow the name agree with "your animals", and a sentence that starts with it starts with a capital.
 * If nothing is left (a meet step), the guide's own line for no animal.
 */
function withoutAnimal(t: string): string {
  const sentences = t.match(/[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [t];
  const kept = sentences.filter((x) => !/\{name\} (is|sees)\b/.test(x)).join('').trim();
  if (!kept) return 'There’s no animal to show right now. Bring one home from the Market first.';
  return kept
    .replace(/, \{name\}!/g, '!')
    .replace(/\{name\}’s/g, `${NO_ANIMAL}’`)
    .replace(/\{name\} (has|gets)\b/g, (_m, v: string) => `${NO_ANIMAL} ${v === 'has' ? 'have' : 'get'}`)
    .replace(/(^|[.!?]\s+)\{name\}/g, (_m, before: string) => `${before}Your animals`)
    .replace(/\{name\}/g, NO_ANIMAL);
}

/**
 * A guide text as the player reads it. `name` null: the animals are gone ("Keep your animals’ tank looking lovely").
 * `fine`: a mouse ("Click Feed", "scroll to lean in", "Bring the pointer near the glass").
 */
export function fillGuide(t: string, name: string | null, species: string, fine: boolean, g?: GameState): string {
  // the name first: the sim's interpolate below would put its own in
  t = name == null ? withoutAnimal(t) : t.replace(/\{name\}/g, name);
  // {temp} / {salinity}: the sim's own wording of the starter's ideal band (same numbers as the tank card), shown in
  // the player's unit and tidied the same way ("24.5–28 °C")
  if (g && /\{(temp|salinity)\}/.test(t)) t = safe('interpolate', () => interpolate(g, t), t);
  t = convertTempText(t, useSettings.getState().tempUnit) ?? t;
  let s = t.replace(/\{species\}/g, species);
  if (fine) s = s.replace(/\bTap\b/g, 'Click').replace(/\btap\b/g, 'click').replace(/ or pinch/g, '').replace(/\byour finger\b/g, 'the pointer');
  return s;
}

export interface CoachStep {
  index: number;
  total: number;
  step: TutorialStepDef;
  title: string;
  body: string;
  /** "Done" line of the step before this one (shown briefly when the guide advances). */
  prevDone: string | null;
  /** Numbering the player sees: an opening step that completes by itself (meeting the starter) isn't counted. */
  shownIndex: number;
  shownTotal: number;
  /** The animal the guide names (null: none left in a tank). */
  name: string | null;
}

export function currentCoachStep(g: GameState | null, fine = false): CoachStep | null {
  if (!g || g.isShowcase) return null;
  if (inSharedShop()) return null; // chunk 13 (ADR-0045 decision 5): a shared shop has no guide
  const tut = g.progress?.tutorial;
  if (!tut || tut.done || tut.skipped) return null;
  const chain = safe('tutorialChain', () => tutorialChain(tut.starterId || g.starterId), []);
  if (!chain.length || tut.step >= chain.length) return null;
  const step = chain[Math.max(0, tut.step)];
  const animal = guideAnimal(g);
  const name = animal?.name ?? null;
  const species = (findSpecies(animal?.speciesId ?? g.starterId)?.commonName ?? 'animal').toLowerCase();
  const prev = tut.step > 0 ? chain[tut.step - 1] : null;
  const auto = chain[0]?.id === 'meet' && !chain[0].done && tut.step > 0 ? 1 : 0;
  return {
    shownIndex: Math.max(0, tut.step - auto),
    shownTotal: chain.length - auto,
    index: tut.step,
    total: chain.length,
    step,
    title: fillGuide(step.title, name, species, fine, g),
    body: fillGuide(step.body, name, species, fine, g),
    prevDone: prev?.done ? fillGuide(prev.done, name, species, fine, g) : null,
    name,
  };
}

/**
 * Audit 2026-11-17 (A4) — "Guide hints" is one switch for the whole device (a family shares a browser): a new game
 * turns it back on, so a new aquarium never starts with its guide (and the guide's Skip) out of sight. Loading or
 * continuing a game leaves the switch as the player set it.
 */
export function guideOnForNewGame(): void {
  const s = useSettings.getState();
  if (!s.showTutorialHints) s.update({ showTutorialHints: true });
}

/** Steps that wait on friend visits (or the reputation they bring). */
const FRIEND_STEPS = new Set(['first_money', 'first_goal', 'upgrade']);

export interface FriendWait {
  /** What the step is waiting for, and what to do about it. */
  text: string;
  /** A way forward the card offers as a button: the Market, for an aquarium with no animal to show. */
  action?: 'market';
  /** Time is what's needed (night): "Speed up" still helps. */
  time: boolean;
}

/**
 * A1 — on a step that waits on friends, why none can come right now (the sim's `friendBlocker`), in the guide's words.
 * Null when a friend can drop by, or on any other step.
 */
export function friendWait(g: GameState, stepId: string): FriendWait | null {
  if (!FRIEND_STEPS.has(stepId)) return null;
  const b = safe('friendBlocker', () => friendBlocker(g), null);
  if (!b) return null;
  if (b.kind === 'no_animals') return { text: 'Friends come to see your animals, and there are none to see. Bring one home from the Market.', action: 'market', time: false };
  if (b.kind === 'night') return { text: `Friends visit between ${formatClock(FRIEND_HOURS[0])} and ${formatClock(FRIEND_HOURS[1])}.`, time: true }; // (the clock's own style: 9:00 AM)
  // named when it is the only animal (the first hour's usual case); the tank's reason names whoever it is about
  const here = Object.values(g.creatures).filter((c) => (c.status === 'alive' || c.status === 'listed') && c.tankId);
  const who = here.length === 1 ? `${here[0].name} is` : 'your animals are';
  const why = b.reason ? convertTempText(b.reason, useSettings.getState().tempUnit) ?? b.reason : 'Open the tank card to see what’s wrong.';
  return { text: `Friends won’t visit until ${who} doing better. ${why}${/[.!?]$/.test(why) ? '' : '.'}`, time: false };
}
