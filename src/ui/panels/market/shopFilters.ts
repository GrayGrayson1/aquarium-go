/**
 * The shop's filters for this session (0.5 spec §6.2 "Shop query rules"): the Shop's chips read and write them, the
 * address carries them (`#/shop?prismatic=1&rare=1&env=marine`), and a bare `#/shop` re-applies the ones last used.
 * Not saved; a different aquarium starts from "All stock". Prismatic only and Rare genes get their chips in chunk 2.
 * OWNER: lane "ui-panels".
 */
import { create } from 'zustand';
import { useGame } from '@/state/game';
import { DEFAULT_SHOP_FILTERS, type ShopFilters } from '@/ui/nav/routes';

interface ShopFilterState {
  filters: ShopFilters;
  setFilters: (patch: Partial<ShopFilters>) => void;
  clearFilters: () => void;
}

export const useShopFilters = create<ShopFilterState>((set, get) => ({
  filters: { ...DEFAULT_SHOP_FILTERS },
  setFilters: (patch) => {
    const next = { ...get().filters, ...patch };
    const cur = get().filters;
    if (next.prismatic !== cur.prismatic || next.rare !== cur.rare || next.env !== cur.env) set({ filters: next });
  },
  clearFilters: () => get().setFilters(DEFAULT_SHOP_FILTERS),
}));

useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId) useShopFilters.getState().clearFilters();
});
