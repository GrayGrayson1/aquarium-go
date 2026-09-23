/**
 * Market — the tycoon heart: shop (livestock offers with compatibility preview), supplies, my listings (bids:
 * accept/decline/counter/wait/withdraw), create-listing wizard, history & demand. OWNER: lane "ui-panels".
 *
 * Deep links via ui.panelTarget:
 *   'tab:shop' | 'tab:supplies' | 'tab:listings' | 'tab:trends' | 'offer:<offerId>' | 'listing:<listingId>'
 *   'list:creature:<id>' | 'list:tank:<id>' | 'list:group:<id,id,…>' | 'list:pair:<a,b>' | 'list:juveniles:<ids>' | 'list:frag:<fragIds>' | 'sell'
 *   'food:<foodId>' → Supplies, with that food shown, scrolled into view and highlighted (the feed picker's "Buy more")
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Store } from 'lucide-react';
import type { ListingKind } from '@/types';
import { formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { PanelLayout } from '../common/PanelLayout';
import { usePanelGame, useIsPhone } from '../common/hooks';
import { Seg } from '../common/parts';
import { ShopTab } from './Shop';
import { SuppliesTab } from './Supplies';
import { ListingsTab } from './Listings';
import { CreateListing, type WizardSeed } from './CreateListing';
import { TrendsTab } from './Trends';

export type MarketTab = 'shop' | 'supplies' | 'listings' | 'trends';

export function MarketPanel() {
  const g = usePanelGame(700);
  const phone = useIsPhone(); // lane:qa-final
  const target = useUI((s) => s.panelTarget);
  const [tab, setTab] = useState<MarketTab>('shop');
  const [offerId, setOfferId] = useState<string | null>(null);
  const [wizard, setWizardRaw] = useState<WizardSeed | null>(null);
  const [wizardKey, setWizardKey] = useState(0);
  const setWizard = (w: WizardSeed | null) => {
    setWizardRaw(w);
    if (w) setWizardKey((k) => k + 1);
  };
  const [focusListing, setFocusListing] = useState<string | null>(null);
  const [focusFood, setFocusFood] = useState<{ id: string; n: number } | null>(null);

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('tab:')) {
      const t = target.slice(4) as MarketTab;
      if (['shop', 'supplies', 'listings', 'trends'].includes(t)) setTab(t);
      setWizard(null);
    } else if (target.startsWith('food:')) {
      setTab('supplies');
      setWizard(null);
      setOfferId(null);
      const id = target.slice(5);
      setFocusFood((f) => ({ id, n: (f?.n ?? 0) + 1 }));
    } else if (target.startsWith('offer:')) {
      setTab('shop');
      setOfferId(target.slice(6));
      setWizard(null);
    } else if (target.startsWith('listing:')) {
      setTab('listings');
      setFocusListing(target.slice(8));
      setWizard(null);
    } else if (target === 'sell' || target === 'list') {
      setTab('listings');
      setWizard({});
    } else if (target.startsWith('list:')) {
      const [, kind, ids] = target.split(':');
      setTab('listings');
      if (kind === 'tank') setWizard({ kind: 'tank', tankId: ids || undefined });
      else if (kind === 'frag') setWizard({ kind: 'frag', fragIds: ids ? ids.split(',').filter(Boolean) : [] }); // lane:frags
      else setWizard({ kind: kind as ListingKind, creatureIds: ids ? ids.split(',').filter(Boolean) : [] });
    }
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  if (!g) return null;
  const active = g.market.listings.filter((l) => l.status === 'active');
  const openBids = active.reduce((a, l) => a + l.bids.filter((b) => b.status === 'open').length, 0);
  const stock = g.market.stock.length;

  const subtitle = wizard ? 'Create a listing' : `${formatMoney(g.finance.money)} available · ${stock} offer${stock === 1 ? '' : 's'} in stock${active.length ? ` · ${active.length} active listing${active.length === 1 ? '' : 's'}` : ''}`;

  return (
    <PanelLayout
      title="Market"
      icon={<Store size={20} />}
      subtitle={subtitle}
      scrollKey={`${tab}:${offerId ?? ''}:${wizard ? 'w' : ''}`}
      toolbar={
        wizard ? undefined : (
          <Seg<MarketTab>
            label="Market section"
            size={phone ? 'sm' : 'md' /* lane:qa-final — "History & demand" was clipped on a 390 px phone */}
            value={tab}
            onChange={(t) => {
              setTab(t);
              setOfferId(null);
            }}
            items={[
              { id: 'shop', label: 'Shop' },
              { id: 'supplies', label: 'Supplies' },
              {
                id: 'listings',
                label: (
                  <>
                    {phone ? 'Listings' : 'My listings'}
                    {(active.length > 0 || openBids > 0) && <span className={clsx('pn-seg__count', openBids > 0 && 'pn-seg__count--hot')}>{openBids > 0 ? `${openBids} bid${openBids === 1 ? '' : 's'}` : active.length}</span>}
                  </>
                ),
              },
              { id: 'trends', label: phone ? 'Trends' : 'History & demand' },
            ]}
          />
        )
      }
    >
      {wizard ? (
        <CreateListing
          key={wizardKey}
          g={g}
          seed={wizard}
          onCancel={() => setWizard(null)}
          onDone={(listingId) => {
            setWizard(null);
            setTab('listings');
            setFocusListing(listingId ?? null);
          }}
        />
      ) : tab === 'shop' ? (
        <ShopTab g={g} offerId={offerId} setOfferId={setOfferId} />
      ) : tab === 'supplies' ? (
        <SuppliesTab g={g} focusFood={focusFood} />
      ) : tab === 'listings' ? (
        <ListingsTab g={g} focusId={focusListing} onCreate={() => setWizard({})} />
      ) : (
        <TrendsTab g={g} />
      )}
    </PanelLayout>
  );
}
