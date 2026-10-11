/**
 * The offer detail's buy button (0.5 spec §7.5 item 5): the first matching row of the table wins, with desktop and
 * phone labels. Pure, so the precedence is unit-tested. OWNER: lane "ui-panels".
 */
import type { Environment } from '@/types';
import { formatMoney } from '@/ui/kit';

export interface BuyInputs {
  locked: boolean;
  /** Animals picked from a group (a single animal counts 1). */
  picked: number;
  /** No tank passes the environment gate (also true with no tanks at all). */
  noSuitableTank: boolean;
  /** The species' environment, for "Build a marine tank". */
  environment: Environment;
  affordable: boolean;
  /** The selected tank passes the environment gate. */
  gateOk: boolean;
  risky: boolean;
  acknowledged: boolean;
  price: number;
}

export type BuyAction = 'none' | 'build' | 'buy';

export interface BuyState {
  desktop: string;
  phone: string;
  /** What the button does: nothing (disabled), open Build › Tanks, or buy. */
  action: BuyAction;
}

const ENV_WORD: Record<Environment, string> = { freshwater: 'freshwater', marine: 'marine', brackish: 'brackish' };

export function buyState(i: BuyInputs): BuyState {
  if (i.locked) return { desktop: 'Locked', phone: 'Locked', action: 'none' };
  if (i.picked <= 0) return { desktop: 'Pick at least one animal', phone: 'Pick one', action: 'none' };
  if (i.noSuitableTank) return { desktop: `Build a ${ENV_WORD[i.environment]} tank`, phone: 'Build a tank', action: 'build' };
  if (!i.affordable) return { desktop: 'Not enough money', phone: 'Not enough', action: 'none' };
  if (!i.gateOk) return { desktop: 'Choose a suitable tank', phone: 'Choose a tank', action: 'none' };
  if (i.risky && !i.acknowledged) return { desktop: 'Confirm the risk first', phone: 'Confirm the risk', action: 'none' };
  return { desktop: `Buy for ${formatMoney(i.price)}`, phone: 'Buy', action: 'buy' };
}

/** The no-suitable-tank wording (§7.5 item 3; brackish and freshwater approved in ADR-0020). */
export const NO_TANK_BADGE: Record<Environment, string> = { marine: 'No marine tank', brackish: 'No brackish tank', freshwater: 'No freshwater tank' };
export const NO_TANK_CALLOUT: Record<Environment, string> = {
  marine: 'Saltwater animals need a marine tank. Build one first; the offer stays until it expires.',
  brackish: 'Brackish animals need a brackish tank. Build one first; the offer stays until it expires.',
  freshwater: 'Freshwater animals need a freshwater tank. Build one first; the offer stays until it expires.',
};

/** "too warm for axolotls" from the compatibility engine's temperature reason, for a tile (ADR-0020 decision 4). */
export function tileTempReason(text: string): string | null {
  const m = /too (warm|cold) for ([^(]+?)\s*\(/.exec(text);
  return m ? `too ${m[1]} for ${m[2]}` : null;
}
