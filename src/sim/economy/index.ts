/**
 * Economy: valuation, market stock, NPC buyers, listings/auctions, finances, purchases.
 * OWNER: lane "market". Public API (other lanes + UI import from '@/sim/economy').
 *
 * Module map:
 *   finance.ts    spend / earn / canAfford, daily bills, summaries, debt + emergency loan
 *   valuation.ts  creatureValue, tankValuation, bundle values, quick-sale quotes
 *   shop.ts       species availability, demand walk + trends, pre-rolled stock, specials
 *   buyers.ts     NPC buyer pool + fit model          (data: src/data/buyers.ts)
 *   messages.ts   buyer message bank
 *   listings.ts   listings, bids, counters, sales, integrity checks, quick sale
 *   purchases.ts  buyOffer, buyTank, buyEquipment, buyFood, buySalt
 */
import type { GameState } from '@/types';
import type { SimContext } from '../context';
import { simRng } from '../rng';
import { dayIndex, crossedHourOfDay } from './util';
import { initDemand, stepDemandDaily, refreshStock, stockNewUnlocks, maybeSpecial } from './shop';
import { ensureBuyerPool, rotateBuyers } from './buyers';
import { stepListings } from './listings';
import { stepFinance } from './finance';
import { makeContext } from '../context';
import { MAX_SUBSTEP_HOURS } from '../time';

// ── finance helpers (used by every lane) ──
export { spend, earn, canAfford, stepFinance, dailyOperatingCost, cashSuggestions, restartNeed, LOAN_AFTER_DEBT_HOURS, LOAN_REPAY_SHARE, RESTART_AFTER_HOURS } from './finance';
export type { OperatingCosts } from './finance';

// ── valuation ──
export { creatureValue, tankValuation, bundleValue, quickSellQuote, morphRarity, lineageSummary, livestockSummary, careDifficultyLabel, tankSignature } from './valuation';
export type { BundleValue, QuickSellQuote } from './valuation';
export { saleWarnings, carriesClutch } from './warnings'; // lane:fix-econ
// lane:frags — frag & cutting valuation
export { fragValue, fragBundleValue, fragStoreOffer, fragSupplyFactor, fragInTankFactor, FRAG_HEALED_HOURS, FRAG_STORE_RATE } from './valuation';
export type { FragValue } from './valuation';

// ── shop / buyers ──
export { isSpeciesAvailable, availableSpecies, requiredUnlocks, generateOffer, refreshStock, DEMAND_MIN, DEMAND_MAX } from './shop';
export { makeBuyer, buildProfile, buyerFit, BUYER_POOL_SIZE } from './buyers';
export type { ListingProfile, FitResult } from './buyers';
export { templateCount, composeBidMessage } from './messages';
export type { Aspect } from './messages';

// ── player actions ──
export { buyOffer, offerPickPrice, buyTank, buyEquipment, buyFood, buySalt, tankKitPrice, kitEquipmentFor, kitSwapNote, seededMediaPrice, SALT_PRICE_PER_KG } from './purchases';
export type { BuyTankOptions, KitEquipment } from './purchases';
export {
  createListing,
  withdrawListing,
  acceptBid,
  declineBid,
  counterBid,
  holdBidForCounter,
  suggestCounter, // lane:fix-econ
  marketTimeScale, // lane:fix-econ
  MAX_NEGOTIATION_HOLD_HOURS, // lane:fix-econ
  quickSell,
  suggestPricing,
  previewListing,
  marketAccess,
  bestOpenBid,
  forceBuyerVisit,
  MIN_LISTING_HOURS,
  MAX_LISTING_HOURS,
  LISTING_DURATION_PRESETS,
  DEFAULT_LISTING_HOURS,
  BID_MIN_OPEN_HOURS,
  BID_MAX_OPEN_HOURS,
  COUNTER_REPLY_OPEN_HOURS,
  NEGOTIATION_HOLD_HOURS,
  CLOSING_GRACE_HOURS,
  GAME_HOURS_PER_REAL_MINUTE,
  realMinutesAt1x,
} from './listings';
export type { ListingSpec, ListingPreview, ListingDurationPreset, CounterSuggestion } from './listings';
// lane:frags — frag & cutting sales (listing kind 'frag' uses createListing with `fragIds`)
export { sellFragsToStore, quickSellFrags, quickSellFragsQuote, storedFragValue, MAX_FRAGS_PER_LISTING } from './listings';
export { buildFragProfile } from './buyers';

export { devOpenMarket } from './devtools';
import { MARKET_STEP_HOURS } from './listings';

/** Hour of day the shop restocks. */
export const SHOP_REFRESH_HOUR = 8;
export { MARKET_STEP_HOURS } from './listings';

/** Market init at new game: buyers, demand, first stock. */
export function initMarket(state: GameState): void {
  const rng = simRng(state);
  const m = state.market;
  m.stock ??= [];
  m.listings ??= [];
  m.buyers ??= [];
  m.history ??= [];
  m.demand ??= {};
  m.trends ??= [];
  initDemand(state, rng);
  ensureBuyerPool(state, rng);
  refreshStock(state, rng, state.clock.hour, true);
  m.lastRefreshHour = state.clock.hour;
  m.lastDemandDay = dayIndex(state.clock.hour);
  // -1 = "initialised before starting unlocks were granted" (newGame runs initProgress after initMarket):
  // the first market tick silently tops the stock up with everything unlocked by then.
  m.seenUnlocks = -1;
}

/** Refresh stock, generate bids, expire listings, buyer responses to counters, demand random walk. */
export function stepMarket(state: GameState, dt: number, ctx: SimContext): void {
  const m = state.market;
  if (!m) return;
  // Sensible cadence: the game loop ticks 4×/s with tiny dt; batch market work into ≥0.1 game-hour windows.
  const acc = Math.max(0, (m.pendingHours ?? 0) + Math.max(0, dt));
  if (acc < MARKET_STEP_HOURS) {
    m.pendingHours = acc;
    return;
  }
  m.pendingHours = 0;
  const end = ctx.hour + Math.max(0, dt);
  const start = end - acc;
  dt = acc;
  ctx = { ...ctx, hour: start, dt };
  const rng = ctx.rng;

  // Old saves / hand-built states: make sure the market has its basics.
  if (!m.demand || Object.keys(m.demand).length === 0) initDemand(state, rng);
  if (!m.buyers || m.buyers.length === 0) ensureBuyerPool(state, rng);

  // Daily at ~8 AM (or after a long gap): demand walk, trends, buyer churn, restock.
  if (crossedHourOfDay(start, end, SHOP_REFRESH_HOUR) || end - (m.lastRefreshHour ?? -999) >= 30) {
    const day = dayIndex(end);
    if ((m.lastDemandDay ?? -1) < day) {
      m.lastDemandDay = day;
      stepDemandDaily(state, rng, end);
      rotateBuyers(state, rng);
    }
    refreshStock(state, rng, end);
    m.lastRefreshHour = end;
  }

  // Newly unlocked species appear right away.
  if (m.seenUnlocks === -1) {
    m.seenUnlocks = state.progress.unlocked.length;
    refreshStock(state, rng, end, true);
  } else if (m.seenUnlocks !== state.progress.unlocked.length) {
    stockNewUnlocks(state, rng, end, m.seenUnlocks !== undefined);
  }

  // Expire lapsed offers between restocks (specials last only hours).
  if (m.stock.some((o) => o.expiresHour <= end)) m.stock = m.stock.filter((o) => o.expiresHour > end);

  maybeSpecial(state, rng, start, dt);

  stepListings(state, dt, ctx);
}

/**
 * DEV/tests: advance ONLY the market (and optionally finance) by `hours`, moving the clock.
 * Lets the economy be exercised in isolation from the tank simulation.
 */
export function devStepEconomy(state: GameState, hours: number, opts: { finance?: boolean; market?: boolean } = {}): void {
  let remaining = Math.max(0, hours);
  while (remaining > 1e-9) {
    const dt = Math.min(MAX_SUBSTEP_HOURS, remaining);
    const ctx = makeContext(state, dt, 'full');
    if (opts.market !== false) stepMarket(state, dt, ctx);
    if (opts.finance) stepFinance(state, dt, ctx);
    state.clock.hour += dt;
    remaining -= dt;
  }
}
