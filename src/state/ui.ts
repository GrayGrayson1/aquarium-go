/**
 * Transient UI state (not saved). OWNER: core; UI lane may ADD fields.
 */
import { create } from 'zustand';
import { useGame } from './game';

export type Screen = 'boot' | 'title' | 'starter' | 'naming' | 'game';
export type ViewMode = 'facility' | 'tank';
export type CameraMode = 'front' | 'orbit' | 'follow' | 'close' | 'photo';
export type PanelId =
  | 'tanks'
  | 'livestock'
  | 'market'
  | 'visitors'
  | 'build'
  | 'research'
  | 'finances'
  | 'encyclopedia'
  | 'settings'
  | 'log'
  | 'shows'
  | 'dev';
export type ToolId = 'none' | 'feed' | 'target_feed' | 'tap' | 'enrich' | 'decor_place' | 'decor_move' | 'tank_place';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'danger' | 'celebrate';
  text: string;
  /** lane:ui-shell (B-151) — explicit parts: a small label over the text and a detail line under it. */
  label?: string;
  detail?: string;
  at: number;
}

/** lane:ui-shell (B-151) — the optional parts of a toast (Toasts.tsx prefers them to parsing the text). */
export type ToastParts = Pick<Toast, 'label' | 'detail'>;

export interface UIState {
  screen: Screen;
  view: ViewMode;
  focusedTankId: string | null;
  cameraMode: CameraMode;
  followCreatureId: string | null;
  selectedCreatureId: string | null;
  panel: PanelId | null;
  /** Secondary detail target inside a panel (creature id, listing id, species id...). */
  panelTarget: string | null;
  tool: ToolId;
  feedFoodId: string | null;
  /** Decor definition being placed (build mode). */
  placingDecorDefId: string | null;
  /** lane:frags — a stored frag/cutting being planted (its def is placingDecorDefId; placed free, at frag size). */
  placingFragId?: string | null;
  /** Tank tier being placed on the facility floor (build mode). */
  placingTankTierId: string | null;
  /** Water class for the tank being placed (set by the Build panel). */
  placingWaterClass: import('@/types').WaterClass | null;
  /** Buy the placed tank with seeded (mature) filter media. */
  placingSeeded: boolean;
  partyMode: boolean;
  photoMode: boolean;
  /** Hide all HUD (cinematic watch mode). */
  hudHidden: boolean;
  toasts: Toast[];
  /** Selected starter during onboarding. */
  pendingStarterId: string | null;
  set: (patch: Partial<Omit<UIState, 'set' | 'toast' | 'dismissToast'>>) => void;
  toast: (text: string, kind?: Toast['kind'], parts?: ToastParts) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

export const useUI = create<UIState>((set, get) => ({
  screen: 'boot',
  view: 'tank',
  focusedTankId: null,
  cameraMode: 'front',
  followCreatureId: null,
  selectedCreatureId: null,
  panel: null,
  panelTarget: null,
  tool: 'none',
  feedFoodId: null,
  placingDecorDefId: null,
  placingTankTierId: null,
  placingWaterClass: null,
  placingSeeded: false,
  partyMode: false,
  photoMode: false,
  hudHidden: false,
  toasts: [],
  pendingStarterId: null,
  set: (patch) => set(patch),
  toast: (text, kind = 'info', parts) => {
    const t: Toast = { id: toastSeq++, kind, text, ...(parts?.label ? { label: parts.label } : {}), ...(parts?.detail ? { detail: parts.detail } : {}), at: performance.now() };
    set({ toasts: [...get().toasts.slice(-4), t] });
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const getUI = () => useUI.getState();

// lane:fix-core (P6-08) — toasts belong to the aquarium they were raised in: when another game (or none) takes
// over, drop the pending ones so a loaded save is not told about creatures it does not have.
useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId && useUI.getState().toasts.length) useUI.setState({ toasts: [] });
});
