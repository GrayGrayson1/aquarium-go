/**
 * Onboarding flow state (title → starter reveal → naming) + showcase world loading. OWNER: lane "ui-shell".
 */
import { create } from 'zustand';
import type { Creature, GameState } from '@/types';
import { STARTER_IDS, type StarterId } from '@/data/species';
import { makeShowcase } from '@/dev/fixtures/showcase'; // lane:perf2 — not the whole fixture registry
import { previewStarters, randomSeed } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { prewarmPortraits } from '@/render/portraits';
import { safe } from '../common/safe';

interface OnboardingState {
  seed: number;
  previews: Partial<Record<StarterId, Creature>>;
  starterId: StarterId | null;
  name: string;
  shopName: string;
  /** Starter shown behind the title screen. */
  titleStarter: StarterId;
  begin: () => void;
  choose: (id: StarterId) => void;
  set: (p: Partial<Pick<OnboardingState, 'name' | 'shopName'>>) => void;
}

const ROT_KEY = 'aquarium-go.title-rotation';

function nextTitleStarter(): StarterId {
  let i = 0;
  try {
    i = Number(localStorage.getItem(ROT_KEY) ?? '0') || 0;
    localStorage.setItem(ROT_KEY, String((i + 1) % STARTER_IDS.length));
  } catch {
    i = Math.floor(Math.random() * STARTER_IDS.length);
  }
  return STARTER_IDS[((i % STARTER_IDS.length) + STARTER_IDS.length) % STARTER_IDS.length];
}

/** Seed + preview creatures made ahead of time on the title screen (prepareStarters), used by the next begin(). */
let prepared: { seed: number; previews: Record<StarterId, Creature> } | null = null;

function makePreviews() {
  const seed = randomSeed();
  return { seed, previews: safe('previewStarters', () => previewStarters(seed), {} as Record<StarterId, Creature>) };
}

/**
 * Title screen idle time: roll the next starter lineup now and queue its five card portraits, so the starter reveal
 * finds them cached instead of rendering one per frame during the cards' entrance animation (G4-03). Same size and
 * subject as the StarterReveal cards (Portrait size 192 with the preview creature), so the cache keys match.
 */
export function prepareStarters(): void {
  if (prepared) return;
  prepared = makePreviews();
  prewarmPortraits(Object.values(prepared.previews), 192);
}

export const useOnboarding = create<OnboardingState>((set, get) => ({
  seed: 424242,
  previews: {},
  starterId: null,
  name: '',
  shopName: '',
  titleStarter: nextTitleStarter(),
  begin: () => {
    const { seed, previews } = prepared ?? makePreviews();
    prepared = null;
    set({ seed, previews, starterId: null, name: '', shopName: '' });
  },
  choose: (id) => {
    set({ starterId: id, name: get().starterId === id ? get().name : '' });
    loadShowcase(id, get().seed);
    useUI.getState().set({ pendingStarterId: id });
  },
  set: (p) => set(p),
}));

let lastShowcaseKey = '';

/** Put a (never-saved) showcase world behind the UI and focus its tank. */
export function loadShowcase(starterId: StarterId, seed?: number): GameState | null {
  const key = `${starterId}:${seed ?? 'default'}`;
  const cur = useGame.getState().game;
  if (cur?.isShowcase && key === lastShowcaseKey) return cur;
  const g = safe('makeShowcase', () => makeShowcase(starterId, seed), null);
  if (!g) return null;
  lastShowcaseKey = key;
  useGame.getState().setGame(g);
  useUI.getState().set({
    focusedTankId: g.tankOrder[0] ?? null,
    view: 'tank',
    selectedCreatureId: null,
    followCreatureId: null,
    cameraMode: 'front',
    panel: null,
    tool: 'none',
    photoMode: false,
    partyMode: false,
    hudHidden: false,
  });
  return g;
}

export function resetShowcaseCache() {
  lastShowcaseKey = '';
}
