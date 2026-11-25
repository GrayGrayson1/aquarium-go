/**
 * Chunk 21, feature B: the reveal card's UI state (never saved, never in the game state). OWNER: lane "reveal".
 *
 * Finds wait in `waiting` until the card may open (src/ui/reveal/blockers.ts); opening takes them all as the card's pages.
 * Finds that arrive while the card is open join it as more pages, so a brood (or a whole catch-up) is one card with a
 * pager, never a row of cards. A find is kept once per animal, and a morph-only find records its species' game day
 * (`morphShown`) so the next commit allows no second one that day. Another aquarium (a new game, a loaded slot) drops
 * everything: its backlog is never revealed, and nothing replays after a reload. The reducers are pure (unit-tested).
 */
import { create } from 'zustand';
import { foldMorphLedger, type MorphRevealLedger, type RevealFind } from './finds';

export interface RevealState {
  /** The aquarium the finds belong to. */
  saveId: string | null;
  /** Finds waiting for the card to open. */
  waiting: RevealFind[];
  /** The open card's pages (null: closed). */
  open: RevealFind[] | null;
  page: number;
  /** Counts openings: the build-up plays once per opening, not per page. */
  opened: number;
  /** Species → the game day of its last morph-only reveal (the one-a-day limit, src/ui/reveal/finds.ts). */
  morphShown: MorphRevealLedger;
}

export const EMPTY_REVEAL: RevealState = { saveId: null, waiting: [], open: null, page: 0, opened: 0, morphShown: {} };

/** Add a commit's finds: to the open card, else to what waits (one page per animal). */
export function addFinds(s: RevealState, saveId: string, finds: readonly RevealFind[]): Partial<RevealState> {
  const fresh = s.saveId !== saveId;
  const open = fresh ? null : s.open;
  const waiting = fresh ? [] : s.waiting;
  const have = new Set([...(open ?? []), ...waiting].map((f) => f.creatureId));
  const add: RevealFind[] = [];
  for (const f of finds) {
    if (have.has(f.creatureId)) continue;
    have.add(f.creatureId);
    add.push(f);
  }
  const morphShown = foldMorphLedger(fresh ? {} : s.morphShown, add);
  if (fresh) return { saveId, waiting: add, open: null, page: 0, morphShown };
  if (!add.length) return {};
  return open ? { open: [...open, ...add], morphShown } : { waiting: [...waiting, ...add], morphShown };
}

/** Open the card on what waits, keeping only the animals `keep` still allows (all gone: nothing opens). */
export function openWaiting(s: RevealState, keep: (f: RevealFind) => boolean = () => true): Partial<RevealState> {
  if (s.open || !s.waiting.length) return {};
  const pages = s.waiting.filter(keep);
  if (!pages.length) return { waiting: [] };
  return { open: pages, waiting: [], page: 0, opened: s.opened + 1 };
}

export function closeCard(s: RevealState): Partial<RevealState> {
  return s.open ? { open: null, page: 0 } : {};
}

/** Move `delta` pages, held to the card's pages. */
export function turnPage(s: RevealState, delta: number): Partial<RevealState> {
  if (!s.open) return {};
  const page = Math.max(0, Math.min(s.open.length - 1, s.page + delta));
  return page === s.page ? {} : { page };
}

interface RevealStore extends RevealState {
  add: (saveId: string, finds: readonly RevealFind[]) => void;
  show: (keep?: (f: RevealFind) => boolean) => void;
  close: () => void;
  turn: (delta: number) => void;
  /** Another aquarium (or none) is on screen: drop everything. */
  reset: (saveId: string | null) => void;
  /** The switch was turned off: drop what waits and close the card. */
  clear: () => void;
}

export const useReveal = create<RevealStore>((set, get) => ({
  ...EMPTY_REVEAL,
  add: (saveId, finds) => set(addFinds(get(), saveId, finds)),
  show: (keep) => set(openWaiting(get(), keep)),
  close: () => set(closeCard(get())),
  turn: (delta) => set(turnPage(get(), delta)),
  reset: (saveId) => set({ saveId, waiting: [], open: null, page: 0, morphShown: {} }),
  clear: () => {
    const s = get();
    if (s.waiting.length || s.open) set({ waiting: [], open: null, page: 0 });
  },
}));
