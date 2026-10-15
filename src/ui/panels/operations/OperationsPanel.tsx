/**
 * Operations (DESIGN-S3D §5.2, §5.3, §7; AUTO-030): the hub. OWNER: lane "automation" (chunk 5).
 *
 * Header: the Gauge chip, "Operations", the sub-line (level, tanks, lines, what to look at, or manual mode), and Hold
 * all (desktop, from the Operations Desk, while automation runs). Tabs: Overview · Water · Feed · Lines · Map (Water
 * and Feed from their rooms; before them their addresses show the locked page). Overview has two sub-views, Problems
 * and Manual mode (`#/operations/issues`, `/manual`), which highlight Overview. The Map takes the panel's full width.
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Gauge, Hand } from 'lucide-react';
import type { GameState } from '@/types';
import { Button } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { useGameSelector } from '@/state/game';
import { useNavSub, useNavTab } from '@/ui/nav/router';
import type { MapLayer } from '@/ui/nav/routes';
import { opsKey, opsSnapshot, opsTier } from '@/ui/common/ops';
import { getFacilityLevel } from '@/data/facilities';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { usePanelGame } from '../common/hooks';
import { Seg } from '../common/parts';
import { Overview } from './Overview';
import { ProblemsView } from './Problems';
import { ManualView } from './Manual';
import { WaterTab } from './WaterTab';
import { FeedTab } from './FeedTab';
import { LinesTab } from './LinesTab';
import { MapTab } from './MapTab';
import { LockedPage } from './Locked';
import { doHoldAll } from './actions';
import './operations.css';

export type OpsTab = 'overview' | 'water' | 'feed' | 'lines' | 'map';
export type OpsView = null | 'issues' | 'manual';

/** Navigation inside the panel, handed to every view. */
export interface OpsNav {
  tab: (t: OpsTab) => void;
  view: (v: OpsView) => void;
}

export function OperationsPanel() {
  const g = usePanelGame(500);
  const target = useUI((s) => s.panelTarget);
  const [tab, setTab] = useState<OpsTab>('overview');
  const [view, setView] = useState<OpsView>(null);
  const [layer, setLayer] = useState<MapLayer>('all');
  const { phone, bottom } = useSheet();
  const small = phone || !!bottom;
  useNavTab('operations', tab);
  useNavSub('operations', tab === 'overview' && view ? `view:${view}` : tab === 'map' && layer !== 'all' ? `layer:${layer}` : null);

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('tab:')) {
      const t = target.slice(4) as OpsTab;
      setTab(['overview', 'water', 'feed', 'lines', 'map'].includes(t) ? t : 'overview');
      setView(null);
      if (t === 'map') setLayer('all'); // an address without a layer is All
    } else if (target === 'view:issues' || target === 'view:manual') {
      setTab('overview');
      setView(target.slice(5) as OpsView);
    } else if (target.startsWith('layer:')) {
      setTab('map');
      setLayer(target.slice(6) as MapLayer);
    }
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  // Problems and their counts, memoised on the game hour and the stock that moves them (PERF-004)
  const key = useGameSelector(opsKey, '');
  const snap = useMemo(() => opsSnapshot(g), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;
  const tier = opsTier(g);
  const nav: OpsNav = {
    tab: (t) => {
      setTab(t);
      setView(null);
    },
    view: (v) => {
      setTab('overview');
      setView(v);
    },
  };
  const dot = snap.counts.danger ? 'danger' : snap.counts.watch || snap.manual ? 'watch' : null;
  const showDot = !!dot && (tab !== 'overview' || view !== null);
  const items: { id: OpsTab; label: React.ReactNode; testId: string }[] = [
    { id: 'overview', label: <>Overview{showDot && <span className={`ops-tabdot ops-tabdot--${dot}`} aria-label={snap.counts.total ? `${snap.counts.total} to look at` : 'Manual mode on'} role="img" />}</>, testId: 'ops-tab-overview' },
    ...(tier.water ? [{ id: 'water' as const, label: 'Water', testId: 'ops-tab-water' }] : []),
    ...(tier.food ? [{ id: 'feed' as const, label: 'Feed', testId: 'ops-tab-feed' }] : []),
    { id: 'lines', label: 'Lines', testId: 'ops-tab-lines' },
    { id: 'map', label: 'Map', testId: 'ops-tab-map' },
  ];
  const holdAll = tier.desk && !snap.manual && !small;
  return (
    <div className={clsx('ops-panel', tab === 'map' && 'ops--map')}>
      <PanelLayout
        title="Operations"
        icon={<Gauge size={20} />}
        subtitle={<span data-testid="ops-sub">{subline(g, tier, snap, small)}</span>}
        scrollKey={`${tab}:${view ?? ''}`}
        headerExtra={
          holdAll ? (
            <Button
              className="ops-holdall"
              data-testid="ops-hold-all"
              onClick={() => {
                doHoldAll();
                nav.view('manual');
              }}
            >
              <Hand size={15} aria-hidden /> Hold all
            </Button>
          ) : undefined
        }
        toolbar={<Seg<OpsTab> label="Operations view" tabs reveal className="ops-tabs" value={tab} onChange={(t) => nav.tab(t)} items={items} />}
      >
        <div className="ops">
          {tab === 'overview' && view === 'issues' ? (
            tier.desk ? (
              <ProblemsView g={g} snap={snap} nav={nav} />
            ) : (
              <LockedPage g={g} which="issues" nav={nav} />
            )
          ) : tab === 'overview' && view === 'manual' ? (
            tier.desk ? (
              <ManualView g={g} snap={snap} nav={nav} />
            ) : (
              <LockedPage g={g} which="manual" nav={nav} />
            )
          ) : tab === 'overview' ? (
            <Overview g={g} snap={snap} tier={tier} nav={nav} small={small} />
          ) : tab === 'water' ? (
            tier.water ? <WaterTab g={g} snap={snap} nav={nav} small={small} /> : <LockedPage g={g} which="water" nav={nav} />
          ) : tab === 'feed' ? (
            tier.food ? <FeedTab g={g} nav={nav} small={small} /> : <LockedPage g={g} which="feed" nav={nav} />
          ) : tab === 'lines' ? (
            <LinesTab g={g} small={small} />
          ) : (
            <MapTab g={g} snap={snap} tier={tier} layer={layer} onLayer={setLayer} small={small} nav={nav} />
          )}
        </div>
      </PanelLayout>
    </div>
  );
}

/** The sub-line (copy deck §11): "{Level} · {n} tanks · {n} lines · {n} to look at", or manual mode's. */
function subline(g: GameState, tier: ReturnType<typeof opsTier>, snap: ReturnType<typeof opsSnapshot>, small: boolean): string {
  const level = getFacilityLevel(g.facility.level).name;
  if (snap.manual) return small ? 'Manual mode · automation on hold' : `${level} · manual mode · automation on hold`;
  const parts = [level];
  const tanks = g.tankOrder.length;
  const look = snap.counts.total ? (snap.counts.danger ? `${snap.counts.total} ${snap.counts.total === 1 ? 'problem' : 'problems'}` : `${snap.counts.total} to look at`) : null;
  if (small && look && snap.counts.danger) return `${level} · ${look}`;
  parts.push(`${tanks} ${tanks === 1 ? 'tank' : 'tanks'}`);
  if (tier.lines) parts.push(`${tier.lines} ${tier.lines === 1 ? 'line' : 'lines'}`);
  if (!small && look) parts.push(look);
  return parts.join(' · ');
}

export default OperationsPanel;
