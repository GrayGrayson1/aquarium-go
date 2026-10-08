/**
 * The shop's filters for this session (0.5 spec §6.2 "Shop query rules"): the Shop's chips read and write them, the
 * address carries them (`#/shop?prismatic=1&rare=1&env=marine`), and a bare `#/shop` re-applies the ones last used.
 * Not saved; a different aquarium starts from "All stock". `offerMatches` is the pure filter the Shop tab and its tests
 * share. OWNER: lane "ui-panels".
 */
import { create } from 'zustand';
import type { GameState, ShopOffer, SpeciesDefinition } from '@/types';
import { useGame } from '@/state/game';
import { findSpecies } from '@/data/species';
import { fitsEnvironment } from '@/sim/compat/salinity';
import { isPrismatic } from '@/sim/life/rareVariants';
import { geneticsRevealLevel } from '@/sim/life/reveal';
import { DEFAULT_SHOP_FILTERS, type EnvFilter, type ShopFilters } from '@/ui/nav/routes';
import { rareGenesMatch } from './offerGenetics';

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

// ───────────────────────────── matching (0.5 spec §7.2) ─────────────────────────────

/** The environment chips: every offer, the ones some tank can hold, or one water type (lane:brackish: mollies fit fresh tanks too). */
export function envMatches(g: GameState, sp: SpeciesDefinition, env: EnvFilter): boolean {
  if (env === 'fits') return g.tankOrder.some((id) => !!g.tanks[id] && fitsEnvironment(sp, g.tanks[id].environment));
  if (env !== 'all') return sp.environment === env;
  return true;
}

/**
 * Does an offer pass the filters? Every filter must hold (AND). "Rare genes" keeps visibly rare animals (a morph tier
 * of rare or above, or a named strain of tier ≥ rare) and, once the Genetics Lab reveals genes (the one reveal rule,
 * `geneticsRevealLevel`), hidden carriers of `rare` alleles. Any animal of a group counts.
 */
export function offerMatches(g: GameState, o: ShopOffer, f: ShopFilters): boolean {
  const sp = findSpecies(o.speciesId);
  if (!sp) return false;
  if (!envMatches(g, sp, f.env)) return false;
  if (f.prismatic && !o.creatures.some(isPrismatic)) return false;
  if (f.rare && !o.creatures.some((c) => rareGenesMatch(sp, c, geneticsRevealLevel(g, c) >= 1))) return false;
  return true;
}

/** True when any chip differs from "All stock" with nothing else on. */
export function filtersActive(f: ShopFilters): boolean {
  return f.prismatic || f.rare || f.env !== 'all';
}
