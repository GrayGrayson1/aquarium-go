/**
 * Alerts + event log drawer: tanks needing attention first, then the recent event log. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'motion/react';
import { CircleCheck, TriangleAlert, OctagonAlert, ChevronRight, CheckCheck, ShoppingCart } from 'lucide-react';
import type { GameEvent, GameState } from '@/types';
import { useGame, useGameSelector } from '@/state/game';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { useShell } from '../common/shellStore';
import { safe } from '../common/safe';
import { tankStatusReason } from '../common/tankStatus';
import { agoText, foodName } from '../common/format';
import { buyFoodPack, openFoodInSupplies, tankFoodAlert, tankFoodLevel, type TankFoodAlert } from '../common/foodStock';
import { getFoodDef } from '@/data/catalog/foods';
import { EventIcon } from './eventIcons';
import { Chip, formatMoney } from '../kit';

export function useAlertCount() {
  const key = useGameSelector((g) => {
    let watch = 0;
    let danger = 0;
    // cache.status is the worst of water, animal welfare and food-out (sim/tankStatus.ts)
    for (const id of g.tankOrder) {
      const s = g.tanks[id]?.cache?.status;
      if (s === 'danger') danger++;
      else if (s === 'watch') watch++;
    }
    return `${watch}:${danger}`;
  }, '0:0');
  const [watch, danger] = key.split(':').map(Number);
  return { watch, danger, total: watch + danger };
}

type Filter = 'all' | 'alerts' | 'market' | 'life';
const FILTERS: { id: Filter; label: string; kinds: GameEvent['kind'][] | null }[] = [
  { id: 'all', label: 'All', kinds: null },
  { id: 'alerts', label: 'Alerts', kinds: ['warning', 'danger', 'death'] },
  { id: 'life', label: 'Life', kinds: ['breeding', 'celebrate', 'visitor', 'unlock'] },
  { id: 'market', label: 'Market', kinds: ['market'] },
];

export function focusTank(tankId: string, openCard = true) {
  useUI.getState().set({ focusedTankId: tankId, view: 'tank', panel: null });
  if (openCard) useShell.getState().set({ tankCardOpen: true });
}

function TankAlerts({ game }: { game: GameState }) {
  const rows = game.tankOrder
    .map((id) => game.tanks[id])
    .filter((t) => t && t.cache.status !== 'good')
    .sort((a, b) => (a.cache.status === 'danger' ? -1 : 1) - (b.cache.status === 'danger' ? -1 : 1));
  const food = game.tankOrder
    .map((id) => ({ t: game.tanks[id], a: game.tanks[id] && tankFoodLevel(game, id) !== 'ok' ? safe('tankFoodAlert', () => tankFoodAlert(game, id), null) : null }))
    .filter((x): x is { t: GameState['tanks'][string]; a: TankFoodAlert } => !!x.t && !!x.a)
    .sort((x, y) => (x.a.level === 'out' ? -1 : 1) - (y.a.level === 'out' ? -1 : 1));
  if (!rows.length && !food.length)
    return (
      <div className="ag-alert-ok">
        <CircleCheck size={16} aria-hidden /> All tanks look healthy.
      </div>
    );
  return (
    <div className="ag-alert-list">
      {food.map(({ t, a }) => {
        const def = a.restockId ? getFoodDef(a.restockId) : undefined;
        const poor = !!def && game.finance.money < def.price;
        return (
          <div key={`food-${t.id}`} className="ag-alert-split">
            <button
              type="button"
              className={clsx('ag-alert-row', a.level === 'out' ? 'is-danger' : 'is-watch')}
              data-testid="alert-food"
              title="Open Market › Supplies"
              onClick={() => {
                sfx('open');
                useShell.getState().set({ popover: null });
                if (a.restockId) openFoodInSupplies(a.restockId);
                else useUI.getState().set({ panel: 'market', panelTarget: 'tab:supplies' });
              }}
            >
              <ShoppingCart size={16} aria-hidden />
              <span className="ag-grow">
                <span className="ag-alert-row__title">{t.name}</span>
                <span className="ag-alert-row__text">
                  <strong>{a.level === 'out' ? 'No food' : 'Low food'}</strong> — {a.text}.{a.restockId ? ` Buy ${foodName(a.restockId)}.` : ''}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden />
            </button>
            {def && (
              <button
                type="button"
                className="ag-food__buy"
                data-testid="alert-food-buy"
                disabled={poor}
                aria-label={`Buy a pack of ${def.name} (${def.servingsPerPack} servings) for ${formatMoney(def.price)}`}
                title={poor ? `Not enough money (${formatMoney(def.price)} a pack)` : `Buy a pack: ${def.servingsPerPack} servings for ${formatMoney(def.price)}`}
                onClick={() => buyFoodPack(def.id)}
              >
                <ShoppingCart size={13} aria-hidden /> {formatMoney(def.price)}
              </button>
            )}
          </div>
        );
      })}
      {rows.map((t) => {
        // the restock row above already covers the food reason
        const reason = safe('tankStatusReason', () => tankStatusReason(game, t.id, { skipFood: food.some((f) => f.t.id === t.id) }), '');
        if (!reason && t.cache.statusSource === 'food') return null;
        const I = t.cache.status === 'danger' ? OctagonAlert : TriangleAlert;
        return (
          <button
            type="button"
            key={t.id}
            className={clsx('ag-alert-row', `is-${t.cache.status}`)}
            onClick={() => {
              sfx('open');
              focusTank(t.id);
              useShell.getState().set({ popover: null });
            }}
          >
            <I size={16} aria-hidden />
            <span className="ag-grow">
              <span className="ag-alert-row__title">{t.name}</span>
              <span className="ag-alert-row__text">
                <strong>{t.cache.status === 'danger' ? 'Danger' : 'Watch'}</strong> — {reason || 'Needs attention'}
              </span>
            </span>
            <ChevronRight size={16} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

export function AlertsPopover() {
  const game = useGame((s) => s.game);
  const [filter, setFilter] = useState<Filter>('all');
  // Everything shown here counts as seen once the drawer closes (unread rows stay highlighted while it is open).
  useEffect(
    () => () => {
      const g = useGame.getState().game;
      if (g && g.log.some((e) => !e.read))
        useGame.getState().mutate((d) => {
          for (const e of d.log) e.read = true;
        });
    },
    [],
  );
  const events = useMemo(() => {
    if (!game) return [];
    const f = FILTERS.find((x) => x.id === filter)?.kinds;
    return [...game.log].reverse().filter((e) => !f || f.includes(e.kind)).slice(0, 40);
  }, [game?.log, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!game) return null;
  const unread = game.log.filter((e) => !e.read).length;
  return (
    <motion.div
      className="ag-popover ag-alerts-pop"
      role="dialog"
      aria-label="Alerts and events"
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <div className="ag-popover__section">
        <div className="ag-popover__title">Tanks</div>
        <TankAlerts game={game} />
      </div>
      <div className="ag-popover__section ag-grow ag-alerts-pop__log">
        <div className="ag-row" style={{ gap: 8 }}>
          <div className="ag-popover__title ag-grow">Recent events</div>
          {unread > 0 && (
            <button
              type="button"
              className="ag-linkbtn"
              onClick={() =>
                useGame.getState().mutate((d) => {
                  for (const e of d.log) e.read = true;
                })
              }
            >
              <CheckCheck size={14} aria-hidden /> Mark read
            </button>
          )}
        </div>
        <div className="ag-row ag-wrap" style={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Chip key={f.id} size="sm" selected={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
        <ul className="ag-eventlist">
          {events.length === 0 && <li className="ag-muted ag-small" style={{ padding: '10px 2px' }}>Nothing here yet.</li>}
          {events.map((e) => (
            <li key={e.id} className={clsx('ag-event', `ag-event--${e.kind}`, !e.read && 'is-unread')}>
              <EventIcon kind={e.kind} />
              <div className="ag-grow">
                <div className="ag-event__text">{e.text}</div>
                <div className="ag-event__meta">
                  {agoText(e.hour, game.clock.hour)}
                  {e.tankId && game.tanks[e.tankId] && (
                    <button type="button" className="ag-linkbtn" onClick={() => { focusTank(e.tankId!, false); if (e.creatureId) useUI.getState().set({ selectedCreatureId: e.creatureId }); useShell.getState().set({ popover: null }); }}>
                      {game.tanks[e.tankId].name}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
