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
import { matches } from '../common/match'; // chunk 19 (QOL-003)
import { PERSONALITY_LABEL, SEX_LABEL } from '../common/format'; // chunk 19 (QOL-003)

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

/**
 * chunk 19 (ADR-0055 decision 3, QOL-003) — the Shop's search and sort, for this session (not in the address: the
 * address keeps the chips' filters). "Clear filters" clears the search too.
 */
export type ShopSort = 'shop' | 'cheap' | 'dear' | 'leaving';
export const useShopSearch = create<{ q: string; sort: ShopSort }>(() => ({ q: '', sort: 'shop' }));

useGame.subscribe((s, prev) => {
  if (s.game?.saveId !== prev.game?.saveId) {
    useShopFilters.getState().clearFilters();
    useShopSearch.setState({ q: '', sort: 'shop' });
  }
});

/** The words an offer is found by: species (common and scientific), morph and strain, seller, sex and personality. */
export function offerWords(o: ShopOffer, sp: SpeciesDefinition | undefined): string {
  const parts: string[] = [sp?.commonName ?? '', sp?.scientificName ?? '', o.seller ?? '', o.kind === 'group' ? 'group' : ''];
  for (const c of o.creatures) {
    parts.push(c.morphName ?? '', c.name ?? '', SEX_LABEL[c.sex] ?? '', ...(c.personality ?? []).map((t) => PERSONALITY_LABEL[t] ?? t));
    if (isPrismatic(c)) parts.push('prismatic');
  }
  return parts.join(' ');
}

/** Does an offer match the search? */
export function offerSearchMatches(o: ShopOffer, q: string): boolean {
  return matches(q, offerWords(o, findSpecies(o.speciesId)));
}

/** Order the shelf: as stocked (Prismatic first), cheapest, dearest or leaving soonest; ties keep the shop's order. */
export function sortOffers(list: ShopOffer[], sort: ShopSort): ShopOffer[] {
  const rank = (o: ShopOffer) => Number(o.creatures.some(isPrismatic));
  const idx = new Map(list.map((o, i) => [o.id, i]));
  return [...list].sort(
    (a, b) =>
      (sort === 'cheap' ? a.price - b.price : sort === 'dear' ? b.price - a.price : sort === 'leaving' ? a.expiresHour - b.expiresHour : rank(b) - rank(a)) || idx.get(a.id)! - idx.get(b.id)!,
  );
}

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
