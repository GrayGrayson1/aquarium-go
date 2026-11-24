/**
 * Chunk 21, feature B (rare-hatch reveals): the reveal queue (src/ui/reveal/store.ts), when the card must wait
 * (src/ui/reveal/blockers.ts) and the feed from the game store (src/ui/reveal/feed.ts).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GameState, Genome } from '@/types';
import { getSpecies } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { simRng } from '@/sim/rng';
import { addCreature, createCreature } from '@/sim/life';
import { normalizeGenome } from '@/sim/life/genetics';
import { createClutch, mintJuveniles } from '@/sim/life/breeding/clutch';
import { forcePrismatic } from '@/sim/life/rareVariants';
import { simulateOffline } from '@/sim/catchUp';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { useGame } from '@/state/game';
import { usePrefs } from '@/ui/common/prefs';
import type { RevealFind } from '@/ui/reveal/finds';
import { EMPTY_REVEAL, addFinds, closeCard, openWaiting, turnPage, useReveal, type RevealState } from '@/ui/reveal/store';
import { PLACING_TOOLS, revealWaitReason, type RevealBlockers } from '@/ui/reveal/blockers';
import { startRevealFeed } from '@/ui/reveal/feed';

const find = (id: string): RevealFind => ({ creatureId: id, speciesId: 'betta', eventId: `ev_${id}`, prismatic: true });
const st = (patch: Partial<RevealState> = {}): RevealState => ({ ...EMPTY_REVEAL, saveId: 's1', ...patch });

describe('the queue', () => {
  it('finds wait, once per animal, and a new aquarium starts afresh', () => {
    let s = st();
    s = { ...s, ...addFinds(s, 's1', [find('a'), find('b'), find('a')]) };
    expect(s.waiting.map((f) => f.creatureId)).toEqual(['a', 'b']);
    s = { ...s, ...addFinds(s, 's1', [find('b'), find('c')]) };
    expect(s.waiting.map((f) => f.creatureId)).toEqual(['a', 'b', 'c']);
    const other = { ...s, ...addFinds(s, 's2', [find('x')]) };
    expect(other).toMatchObject({ saveId: 's2', open: null });
    expect(other.waiting.map((f) => f.creatureId)).toEqual(['x']);
  });

  it('opening takes everything that waits as one card; later finds join it as pages', () => {
    let s = st({ waiting: [find('a'), find('b')] });
    s = { ...s, ...openWaiting(s) };
    expect(s.open?.map((f) => f.creatureId)).toEqual(['a', 'b']);
    expect(s).toMatchObject({ waiting: [], page: 0, opened: 1 });
    s = { ...s, ...addFinds(s, 's1', [find('c'), find('a')]) };
    expect(s.open?.map((f) => f.creatureId)).toEqual(['a', 'b', 'c']);
    expect(s.waiting).toEqual([]);
    // already open: opening again changes nothing
    expect(openWaiting(s)).toEqual({});
  });

  it('a morph-only find records its species’ game day; another aquarium forgets them', () => {
    const morphOnly = (id: string, speciesId: string, w: number): RevealFind => ({ creatureId: id, speciesId, eventId: `ev_${id}`, prismatic: false, morphOnlyWindow: w });
    let s = st();
    s = { ...s, ...addFinds(s, 's1', [find('a'), morphOnly('b', 'platy', 4)]) };
    expect(s.morphShown).toEqual({ platy: 4 });
    s = { ...s, ...openWaiting(s) };
    s = { ...s, ...addFinds(s, 's1', [morphOnly('c', 'betta', 5)]) };
    expect(s.morphShown).toEqual({ platy: 4, betta: 5 });
    // a repeat of an animal already on the card records nothing
    s = { ...s, ...addFinds(s, 's1', [morphOnly('c', 'koi', 5)]) };
    expect(s.morphShown).toEqual({ platy: 4, betta: 5 });
    expect({ ...s, ...addFinds(s, 's2', [find('x')]) }.morphShown).toEqual({});
  });

  it('opening leaves out animals that are gone, and opens nothing when none is left', () => {
    const s = st({ waiting: [find('a'), find('b')] });
    expect(openWaiting(s, (f) => f.creatureId === 'b').open?.map((f) => f.creatureId)).toEqual(['b']);
    expect(openWaiting(s, () => false)).toEqual({ waiting: [] });
  });

  it('the pager stays on the card’s pages; closing ends the card', () => {
    let s = st({ open: [find('a'), find('b'), find('c')] });
    s = { ...s, ...turnPage(s, 1) };
    s = { ...s, ...turnPage(s, 5) };
    expect(s.page).toBe(2);
    s = { ...s, ...turnPage(s, -9) };
    expect(s.page).toBe(0);
    s = { ...s, ...closeCard(s) };
    expect(s).toMatchObject({ open: null, page: 0 });
    expect(turnPage(s, 1)).toEqual({});
  });
});

describe('when the card waits', () => {
  const clear: RevealBlockers = { screen: 'game', hidden: false, welcomeBack: false, touring: false, guideSpotlight: false, otherDialog: false, photo: false, hudHidden: false, typing: false, placing: false };
  it('opens only on the game screen with nothing in the way', () => {
    expect(revealWaitReason(clear)).toBeNull();
    expect(revealWaitReason({ ...clear, screen: 'title' })).toBe('screen');
    expect(revealWaitReason({ ...clear, hidden: true })).toBe('hidden');
    // the hidden-tab catch-up's welcome-back card goes first
    expect(revealWaitReason({ ...clear, welcomeBack: true })).toBe('welcomeBack');
    expect(revealWaitReason({ ...clear, touring: true })).toBe('touring');
    expect(revealWaitReason({ ...clear, guideSpotlight: true })).toBe('guideSpotlight');
    expect(revealWaitReason({ ...clear, otherDialog: true })).toBe('otherDialog');
    expect(revealWaitReason({ ...clear, photo: true })).toBe('photo');
    expect(revealWaitReason({ ...clear, hudHidden: true })).toBe('hudHidden');
    // the chunk's review (S5, N6): never while the player types in a field, or places or moves something
    expect(revealWaitReason({ ...clear, typing: true })).toBe('typing');
    expect(revealWaitReason({ ...clear, placing: true })).toBe('placing');
  });

  it('placing means the decor and tank placement tools, not feeding or tapping', () => {
    expect([...PLACING_TOOLS].sort()).toEqual(['decor_move', 'decor_place', 'tank_place']);
  });
});

describe('the feed from the game store', () => {
  const betta = getSpecies('betta');
  const genome: Genome = normalizeGenome(betta, { alleles: { color: ['royal', 'royal'], pattern: ['butterfly', 'butterfly'], fins: ['halfmoon', 'halfmoon'] }, potentials: {} as Genome['potentials'] });

  /** A game with a betta brood (a new named strain) due `inHours` from now, and its nursery. */
  function due(inHours: number): GameState {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Nursery' });
    tank.purpose = 'nursery';
    const mom = createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome });
    const dad = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome });
    addCreature(g, mom, null);
    addCreature(g, dad, null);
    createClutch(g, { sp: betta, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: 4, visual: 'fry_cloud', nextStageHour: g.clock.hour + inHours });
    return g;
  }

  /** A game whose next commit mints a brood with a new named strain (and `force` Prismatic young). */
  function commits(force = 0): { before: GameState; after: GameState } {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
    const tank = createTank(g, 'g29', 'freshwater_tropical', { cycled: true, name: 'Nursery' });
    tank.purpose = 'nursery';
    const mom = createCreature(g, simRng(g), 'betta', { sex: 'female', ageDays: 120, genome });
    const dad = createCreature(g, simRng(g), 'betta', { sex: 'male', ageDays: 120, genome });
    addCreature(g, mom, null);
    addCreature(g, dad, null);
    const cl = createClutch(g, { sp: betta, tank, mother: mom, father: dad, hour: g.clock.hour - 100, stage: 'fry', count: 4, visual: 'fry_cloud', nextStageHour: g.clock.hour });
    const before = structuredClone(g) as GameState;
    if (force) forcePrismatic('bred', force);
    mintJuveniles(g, cl, tank, betta, g.clock.hour, null);
    return { before, after: g };
  }

  let stop: () => void = () => {};
  beforeEach(() => {
    usePrefs.getState().update({ revealFinds: true });
    useGame.getState().setGame(null);
    stop = startRevealFeed();
  });
  afterEach(() => {
    stop();
    forcePrismatic('bred', 0);
    useGame.getState().setGame(null);
    usePrefs.getState().update({ revealFinds: true });
  });

  it('a commit with a rare birth queues its finds; the next commit queues nothing more', () => {
    const { before, after } = commits(2);
    useGame.getState().setGame(before);
    expect(useReveal.getState()).toMatchObject({ saveId: before.saveId, waiting: [], open: null });
    useGame.getState().setGame(after);
    expect(useReveal.getState().waiting).toHaveLength(2);
    useGame.getState().setGame(structuredClone(after) as GameState);
    expect(useReveal.getState().waiting).toHaveLength(2);
  });

  it('the hidden-tab catch-up is one commit: its births queue together, to open after the welcome-back card', () => {
    const before = due(2);
    before.clock.speed = 1;
    useGame.getState().setGame(before);
    const after = structuredClone(before) as GameState;
    forcePrismatic('bred', 2);
    const summary = simulateOffline(after, (6 / GAME_HOURS_PER_REAL_SECOND) * 1000);
    expect(summary.births).toBeGreaterThan(1);
    useGame.getState().setGame(after);
    // the first youngster (Prismatic, first of the strain) and its Prismatic sibling
    expect(useReveal.getState().waiting).toHaveLength(2);
    expect(useReveal.getState().open).toBeNull();
  });

  it('another aquarium arriving with finds in its log reveals none of them (no replay after a load)', () => {
    const { before, after } = commits(1);
    useGame.getState().setGame(newGame({ starterId: 'axolotl', starterName: 'A', seed: 3 }));
    useGame.getState().setGame(after);
    expect(useReveal.getState()).toMatchObject({ saveId: before.saveId, waiting: [], open: null });
  });

  it('with Reveal rare finds off nothing is queued', () => {
    const { before, after } = commits(1);
    usePrefs.getState().update({ revealFinds: false });
    useGame.getState().setGame(before);
    useGame.getState().setGame(after);
    expect(useReveal.getState().waiting).toEqual([]);
  });

  it('the feed keeps the one-a-day limit across commits: a second legendary first that day is not queued', () => {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 5 });
    g.clock.hour = 24 * 3 + 8;
    const legendary = (fins: string): Genome => normalizeGenome(betta, { alleles: { color: ['red', 'red'], pattern: ['solid', 'solid'], fins: [fins, fins], cambodian: ['c', 'c'], metallic: ['me', 'me'] }, potentials: {} as Genome['potentials'] });
    const mint = (state: GameState, gen: Genome) => {
      const tank = createTank(state, 'g29', 'freshwater_tropical', { cycled: true, name: `Nursery ${Object.keys(state.tanks).length}` });
      tank.purpose = 'nursery';
      const mom = createCreature(state, simRng(state), 'betta', { sex: 'female', ageDays: 120, genome: gen });
      const dad = createCreature(state, simRng(state), 'betta', { sex: 'male', ageDays: 120, genome: gen });
      addCreature(state, mom, null);
      addCreature(state, dad, null);
      const cl = createClutch(state, { sp: betta, tank, mother: mom, father: dad, hour: state.clock.hour - 100, stage: 'fry', count: 3, visual: 'fry_cloud', nextStageHour: state.clock.hour });
      mintJuveniles(state, cl, tank, betta, state.clock.hour, null);
    };
    useGame.getState().setGame(structuredClone(g) as GameState);
    mint(g, legendary('halfmoon'));
    useGame.getState().setGame(structuredClone(g) as GameState);
    expect(useReveal.getState().waiting).toHaveLength(1);
    expect(useReveal.getState().morphShown).toEqual({ betta: 3 });
    g.clock.hour += 6;
    mint(g, legendary('plakat'));
    useGame.getState().setGame(structuredClone(g) as GameState);
    expect(useReveal.getState().waiting).toHaveLength(1);
    g.clock.hour += 24;
    mint(g, legendary('crown'));
    useGame.getState().setGame(structuredClone(g) as GameState);
    expect(useReveal.getState().waiting).toHaveLength(2);
    expect(useReveal.getState().morphShown).toEqual({ betta: 4 });
  });

  it('leaving the game drops what waits', () => {
    const { before, after } = commits(1);
    useGame.getState().setGame(before);
    useGame.getState().setGame(after);
    expect(useReveal.getState().waiting).toHaveLength(1);
    useGame.getState().setGame(null);
    expect(useReveal.getState()).toMatchObject({ saveId: null, waiting: [], open: null });
  });
});
