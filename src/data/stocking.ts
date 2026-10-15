/**
 * How sellers stock the shop (src/sim/economy/shop.ts), as numbers the morph catalog can read too, so a look's "about
 * 1 in n market animals" and its tier count the seller's pick (B-194; ADR-0029 decision 8, ADR-0034 decision 6).
 * OWNER: lane "market". The ONE home of these numbers: the shop and the catalog both read them here.
 */

/** A generated offer's tier, when the caller doesn't fix one. */
export const OFFER_TIER_WEIGHTS: Readonly<Record<'standard' | 'breeder' | 'rare', number>> = Object.freeze({ standard: 0.7, breeder: 0.22, rare: 0.08 });

/** A Rare find or a Today-only special of one or two animals: the seller keeps the most striking of this many rolls,
 *  animal by animal (striking = morph rarity, src/sim/economy/valuation.ts `morphRarity`). */
export const PICK_ROLLS = 6;
/** The most animals an offer can have and still be hand-picked. */
export const PICK_MAX_ANIMALS = 2;

/** A mid-day special is a hand-picked 'special' this often, else a breeder line. */
export const SPECIAL_PICKED_CHANCE = 0.5;
/**
 * An estimate for the catalog's odds, not a rule the shop follows: the share of a species' offers that are mid-day
 * specials. About one special a day (11 AM–5 PM, at most one) against 5 to 11 new regular offers a day (a 7-offer
 * hobby room to a 16-offer grand hall, offers lasting one or two days), so 9 % to 4 %: 7 %.
 */
export const SPECIAL_OFFER_SHARE = 0.07;

/** Offer sizes (shop.ts `composition`): pair-living species come as a pair this often, harem species as a trio. */
export const PAIR_OFFER_CHANCE = 0.45;
export const HAREM_TRIO_CHANCE = 0.3;
