/**
 * The alerts drawer's Automation section (DESIGN-S3D §8.3; AUTO-044). OWNER: lane "automation" (chunk 5).
 *
 * "Automation · {n}" above the Tanks section, with the Operations link: the manual-mode row while it's on, then each
 * problem as a compact card with its main action and Details, or "Automation is running smoothly." Before the
 * Operations Desk the link opens the Overview and each item's Details is the tab with the problem (Water, Feed or Lines
 * tab); purchases stay as quick actions and fixes that belong to Problems are left out. No section until something is
 * automated (INTAKE C-48).
 */
import { useMemo, useState } from 'react';
import { ChevronRight, Droplets, Egg, Factory, Hand, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { GameState } from '@/types';
import { useGameSelector } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { formatClock } from '@/sim/time';
import { HOLD_SYSTEMS, heldSystems, manualSince } from '@/sim/automation';
import { findLine, productionLines, quarantineKit } from '@/sim/production';
import { Button, formatMoney } from '../kit';
import { useIsMobile } from '../common/safe';
import { AddQuarantine } from '../panels/livestock/Production';
import { go } from '../nav/router';
import { useShell } from '../common/shellStore';
import { opsKey, opsSnapshot } from '../common/ops';
import { issueViews, type IssueView } from '../panels/operations/issues';
import { buyEggTin, buySaltBag, buyVegPack, markDecided } from '../panels/operations/actions';

const close = () => useShell.getState().set({ popover: null });

/** Is anything automated yet (an Autofeeder, an Auto Water Changer, a doser, a room, a line, or manual mode)? */
export function anythingAutomated(g: GameState): boolean {
  if (g.facility.water || g.facility.food || productionLines(g).length || heldSystems(g).length) return true;
  for (const id of g.tankOrder) for (const e of g.tanks[id]?.equipment ?? []) if (['autofeeder', 'water_changer', 'doser'].includes(getEquipmentDef(e.defId)?.kind ?? '')) return true;
  return false;
}

const TAB = { water: { label: 'Water tab', icon: Droplets }, feed: { label: 'Feed tab', icon: Egg }, lines: { label: 'Lines tab', icon: Factory } } as const;

export function AutomationSection({ game }: { game: GameState }) {
  const key = useGameSelector(opsKey, '');
  const snap = useMemo(() => opsSnapshot(game), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [addingQt, setAddingQt] = useState<string | null>(null);
  const small = useIsMobile();
  if (!anythingAutomated(game)) return null;
  const desk = game.progress.unlocked.includes('operations_desk');
  const issues = issueViews(game, snap.problems);
  const held = heldSystems(game);
  const since = manualSince(game);
  const open = (target: 'view:issues' | 'view:manual' | null, tab?: 'water' | 'feed' | 'lines') => {
    sfx('open');
    close();
    go(tab ? { kind: 'panel', panel: 'operations', tab } : { kind: 'panel', panel: 'operations', tab: 'overview', ...(target ? { target } : {}) });
  };
  return (
    <div className="ag-popover__section" data-testid="alerts-automation">
      <div className="ag-row" style={{ gap: 8 }}>
        <div className="ag-popover__title ag-grow">Automation{issues.length ? ` · ${issues.length}` : ''}</div>
        <button type="button" className="ag-linkbtn" data-testid="alerts-automation-link" onClick={() => open(desk ? 'view:issues' : null)}>
          Operations <ChevronRight size={12} aria-hidden />
        </button>
      </div>
      {held.length > 0 && (
        <div className="ag-alert-row" data-testid="alerts-automation-manual">
          <Hand size={16} aria-hidden />
          <span className="ag-grow">
            <span className="ag-alert-row__title">
              Manual mode{since !== null ? ` since ${formatClock(since)}` : ''} · {held.length} of {HOLD_SYSTEMS.length} systems held
            </span>
          </span>
          <button type="button" className="ag-linkbtn" onClick={() => open('view:manual')}>
            Open
          </button>
        </div>
      )}
      {issues.map((i) => (
        <Item key={i.key} g={game} issue={i} desk={desk} small={small} onAddQt={setAddingQt} onDetails={() => (desk ? open('view:issues') : open(null, i.tab))} />
      ))}
      {!issues.length && !held.length && <div className="ag-muted ag-small">Automation is running smoothly.</div>}
      {addingQt && findLine(game, addingQt) && <AddQuarantine g={game} line={findLine(game, addingQt)!} onClose={() => setAddingQt(null)} onAdded={() => markDecided(addingQt)} />}
    </div>
  );
}

function Item({ g, issue, desk, small, onAddQt, onDetails }: { g: GameState; issue: IssueView; desk: boolean; small: boolean; onAddQt: (lineId: string) => void; onDetails: () => void }) {
  const Icon = issue.tone === 'danger' ? OctagonAlert : TriangleAlert;
  const buy = issue.action && issue.action.id.startsWith('buy') ? issue.action : null;
  // chunk 6 (DES-013, §8.3): with the Desk, a held-up line's main action is the fix (phone "Add QT tank · $95")
  const lineId = desk && issue.problem.kind === 'line' ? issue.problem.lineId : null;
  const kit = lineId ? quarantineKit(g, lineId) : null;
  const tab = TAB[issue.tab];
  const TabIcon = tab.icon;
  return (
    <div className={`ag-alert-row ag-alert-row--${issue.tone === 'danger' ? 'danger' : 'watch'}`} data-testid={`alerts-item-${issue.kind}`}>
      <Icon size={16} aria-hidden />
      <span className="ag-grow">
        <span className="ag-alert-row__title">{issue.title}</span>
        <span className="ag-alert-row__text">{issue.reason}</span>
        <span className="ag-row ag-wrap" style={{ gap: 6, marginTop: 6 }}>
          {buy && (
            <Button
              size="sm"
              className="ops-buy"
              onClick={() => {
                if (buy.id === 'buy-salt') buySaltBag(40);
                else if (buy.id === 'buy-eggs') buyEggTin();
                else buyVegPack();
              }}
            >
              {buy.label}
            </Button>
          )}
          {lineId && kit && (
            <Button size="sm" data-testid={`alerts-item-add-qt`} onClick={() => onAddQt(lineId)}>
              {small ? 'Add QT tank' : 'Add a quarantine tank'} · {formatMoney(kit.price)}
            </Button>
          )}
          {desk ? (
            <button type="button" className="ag-linkbtn" onClick={onDetails}>
              Details <ChevronRight size={11} aria-hidden />
            </button>
          ) : (
            <button type="button" className="ag-linkbtn" data-testid={`alerts-item-tab-${issue.tab}`} onClick={onDetails}>
              <TabIcon size={12} aria-hidden /> {tab.label}
            </button>
          )}
        </span>
      </span>
    </div>
  );
}
