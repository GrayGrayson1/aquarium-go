/**
 * chunk 13 (SHARED-SHOPS.md §8 "Club card") — a club's shared shop on its card in Social: the shop with Open (any
 * member), Create for the owner when there's none, "No shared shop yet." for a member, the owner's meter for the month,
 * and the closed-for-the-month lines. It reads the database (`sharedShops()`, `sharedUsage()`), never the server, so
 * looking at a card never wakes it (§5.7). OWNER: lane "social".
 */
import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { useSharedMode } from '@/state/sharedMode';
import { socialService, type Club, type SharedShops, type SharedUsage } from '@/social';
import { Button } from '../kit';
import { useSocial } from '../panels/social/socialStore';
import { useOnboarding } from '../screens/onboarding';
import { useUI } from '@/state/ui';
import { beginCreate, openSharedShop, sharedServerBase } from './session';
import { useShared } from './store';
import { SHARED_WORDS as W, closingText, formatBytes, formatHours } from './words';

/** One answer for every card on screen, asked again after a while (a shop made a moment ago shows). */
const FRESH_MS = 20_000;
let shopsCache: { at: number; p: Promise<SharedShops> } | null = null;
let usageCache: { at: number; p: Promise<SharedUsage> } | null = null;

function cached<T>(c: { at: number; p: Promise<T> } | null, load: () => Promise<T>, set: (v: { at: number; p: Promise<T> } | null) => void): Promise<T> {
  if (c && Date.now() - c.at < FRESH_MS) return c.p;
  const p = load();
  set({ at: Date.now(), p });
  p.catch(() => set(null));
  return p;
}

/** The club cards' answers are stale (a shop was just made or opened). */
export function forgetSharedShops(): void {
  shopsCache = null;
  usageCache = null;
}

function useAnswer<T>(load: (() => Promise<T>) | null, deps: readonly unknown[]): T | null {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => {
    if (!load) return;
    let live = true;
    load().then(
      (x) => live && setV(x),
      () => live && setV(null),
    );
    return () => {
      live = false;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

export function SharedClubSection({ club }: { club: Club }) {
  const owner = useSocial((s) => !!s.user?.isOwner);
  const inShop = useSharedMode((s) => s.club !== null);
  const busy = useShared((s) => s.phase !== 'idle' && s.phase !== 'closed');
  const available = !!sharedServerBase();
  const shops = useAnswer(available ? () => cached(shopsCache, () => socialService().sharedShops(), (v) => (shopsCache = v)) : null, [available]);
  const usage = useAnswer(available && owner ? () => cached(usageCache, () => socialService().sharedUsage(), (v) => (usageCache = v)) : null, [available, owner]);
  const [starting, setStarting] = useState(false);
  if (!available || !shops) return null;
  const shop = shops.shops.find((s) => s.club === club.id);
  const meter = owner && usage ? <p className="so-shared__meter" data-testid="shared-meter">{W.meter(formatBytes(usage.bytesOut), formatHours(usage.awakeSeconds))}</p> : null;
  const closedLine = shops.closed ? <p className="so-shared__line" data-testid="shared-closed">{closingText(shops.closed, { club: club.name, until: shops.reopens ?? undefined })}</p> : null;
  const open = () => {
    if (!shop) return;
    forgetSharedShops();
    void openSharedShop({ id: club.id, name: club.name }, { from: 'game', shopName: shop.name });
  };
  const create = async () => {
    setStarting(true);
    try {
      if (!(await beginCreate({ id: club.id, name: club.name }))) return;
      forgetSharedShops();
      useOnboarding.getState().beginShared({ id: club.id, name: club.name });
      useUI.getState().set({ screen: 'starter', panel: null });
    } finally {
      setStarting(false);
    }
  };
  if (shop) {
    return (
      <div className="so-shared" data-testid={`shared-card-${club.id}`}>
        <div className="so-shared__head">
          <span className="so-shared__title">
            <Store size={13} aria-hidden /> {shop.name}
          </span>
          {!closedLine && !inShop && (
            <Button size="sm" variant="primary" disabled={busy} onClick={open} data-testid="shared-open">
              {W.open}
            </Button>
          )}
        </div>
        <p className="so-shared__line">{W.shopMeta(shop.day, shop.money)}</p>
        {closedLine}
        {meter}
      </div>
    );
  }
  if (!owner)
    return (
      <div className="so-shared" data-testid={`shared-card-${club.id}`}>
        <p className="so-shared__line">{W.noShopYet}</p>
      </div>
    );
  return (
    <div className="so-shared" data-testid={`shared-card-${club.id}`}>
      <div className="so-shared__head">
        <span className="so-shared__title">
          <Store size={13} aria-hidden /> {W.cardTitle}
        </span>
        {!closedLine && !inShop && (
          <Button size="sm" variant="primary" disabled={busy || starting} onClick={() => void create()} data-testid="shared-create">
            {W.create}
          </Button>
        )}
      </div>
      <p className="so-shared__line">{W.cardPitch}</p>
      {closedLine}
      {meter}
    </div>
  );
}
