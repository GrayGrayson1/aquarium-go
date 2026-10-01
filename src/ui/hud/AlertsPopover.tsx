/**
 * Alerts + event log drawer (the notification centre): tanks needing attention first, then the recent event log.
 * Tank rows are live — they leave when the problem is fixed. Events are "new until read": "Mark read" (or closing the
 * drawer) reads them, "Clear all" also hides them here (the Log panel keeps the full history; rules in
 * ../common/notify.ts). OWNER: lane "ui-shell" (lane:notify — clear all, links, live attention counts).
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { motion } from 'motion/react';
import { CircleCheck, TriangleAlert, OctagonAlert, ChevronRight, CheckCheck, ShoppingCart, PowerOff, Eraser, ScrollText, Wrench } from 'lucide-react';
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
import { getEquipmentDef } from '@/data/catalog/equipment';
import { useTankCardTab } from '../cards/TankCard';
import { EventIcon } from './eventIcons';
import { Chip, formatMoney } from '../kit';
import { attentionSummary, clearAllEvents, drawerEvents, gearFitItems, markAllRead } from '../common/notify'; // lane:notify
import { eventLink } from './eventLinks'; // lane:notify

/**
 * Failed equipment in a tank, listed under the bell until it is repaired or replaced (its log line scrolls away in a
 * big facility — G2-06). Gear the tank's status line already names ("The 50 W Heater has failed.") is left out.
 */
function failedGear(t: GameState['tanks'][string], reason: string): string[] {
  return (t.equipment ?? [])
    .filter((e) => e.failed)
    .map((e) => getEquipmentDef(e.defId)?.name ?? 'Equipment')
    .filter((name) => !reason.includes(name));
}

export function useAlertCount() {
  // lane:notify — one rule for every dot (common/notify.ts): the sim's status (water, animal welfare, out of food), food
  // running low, failed equipment (its log line scrolls away in a big facility — G2-06) and gear that can't help
  const key = useGameSelector((g) => {
    const a = attentionSummary(g);
    return `${a.watch}:${a.danger}`;
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
  const reasons = new Map(rows.map((t) => [t.id, safe('tankStatusReason', () => tankStatusReason(game, t.id, { skipFood: food.some((f) => f.t.id === t.id) }), '')]));
  // lane:notify — installed gear that can't help the animals in that tank (an autofeeder for frozen-food eaters…)
  const fit = game.tankOrder
    .map((id) => game.tanks[id])
    .filter((t) => !!t)
    .map((t) => ({ t, items: safe('gearFitItems', () => gearFitItems(game, t), []) }))
    .filter((x) => x.items.length > 0);
  const gear = game.tankOrder
    .map((id) => game.tanks[id])
    .filter((t) => !!t)
    .map((t) => ({ t, names: failedGear(t, reasons.get(t.id) ?? '') }))
    .filter((x) => x.names.length > 0);
  if (!rows.length && !food.length && !gear.length && !fit.length)
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
      {gear.map(({ t, names }) => (
        <button
          type="button"
          key={`gear-${t.id}`}
          className="ag-alert-row is-watch"
          data-testid="alert-equipment"
          title="Open the tank card's equipment"
          onClick={() => {
            sfx('open');
            useTankCardTab.setState({ want: 'gear' });
            focusTank(t.id);
            useShell.getState().set({ popover: null });
          }}
        >
          <PowerOff size={16} aria-hidden />
          <span className="ag-grow">
            <span className="ag-alert-row__title">{t.name}</span>
            <span className="ag-alert-row__text">
              <strong>Equipment failed</strong> — {names.join(', ')}. Repair or replace {names.length > 1 ? 'them' : 'it'}.
            </span>
          </span>
          <ChevronRight size={16} aria-hidden />
        </button>
      ))}
      {fit.map(({ t, items }) => (
        <button
          type="button"
          key={`fit-${t.id}`}
          className={clsx('ag-alert-row', items.some((i) => i.level === 'danger') ? 'is-danger' : 'is-watch')}
          data-testid="alert-gear-fit"
          title="Open the tank card's equipment"
          onClick={() => {
            sfx('open');
            useTankCardTab.setState({ want: 'gear' });
            focusTank(t.id);
            useShell.getState().set({ popover: null });
          }}
        >
          <Wrench size={16} aria-hidden />
          <span className="ag-grow">
            <span className="ag-alert-row__title">{t.name}</span>
            <span className="ag-alert-row__text">
              <strong>Gear not helping</strong> — {items.map((i) => i.text).join(' ')}
            </span>
          </span>
          <ChevronRight size={16} aria-hidden />
        </button>
      ))}
      {rows.map((t) => {
        // the restock row above already covers the food reason
        const reason = reasons.get(t.id) ?? '';
        if (!reason && t.cache.statusSource === 'food') return null;
        const I = t.cache.status === 'danger' ? OctagonAlert : TriangleAlert;
        return (
          <button
            type="button"
            key={t.id}
            className={clsx('ag-alert-row', `is-${t.cache.status}`)}
            onClick={() => {
              sfx('open');
              // a line about broken gear opens the card on its Equipment tab, where the repair is
              if (t.equipment?.some((e) => e.failed) && /\bfailed\b|stuck on/.test(reason)) useTankCardTab.setState({ want: 'gear' });
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
      if (g && g.log.some((e) => !e.read)) useGame.getState().mutate((d) => markAllRead(d));
    },
    [],
  );
  // lane:notify — "Clear all" hides what was logged up to then (notify.logClearedSeq); the Log panel keeps everything
  const events = useMemo(() => {
    if (!game) return [];
    return drawerEvents(game, FILTERS.find((x) => x.id === filter)?.kinds ?? null, 40);
  }, [game?.log, game?.notify, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const anyEvents = useMemo(() => (game ? drawerEvents(game, null, 1).length > 0 : false), [game?.log, game?.notify]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!game) return null;
  const unread = game.log.reduce((n, e) => n + (e.read ? 0 : 1), 0);
  const openLog = () => {
    sfx('open');
    useShell.getState().set({ popover: null });
    useUI.getState().set({ panel: 'log', panelTarget: null });
  };
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
            <button type="button" className="ag-linkbtn" data-testid="alerts-mark-read" title="Mark every event as read (they stay in this list)" onClick={() => useGame.getState().mutate((d) => markAllRead(d))}>
              <CheckCheck size={14} aria-hidden /> Mark read
            </button>
          )}
          {anyEvents && (
            <button
              type="button"
              className="ag-linkbtn"
              data-testid="alerts-clear-all"
              title="Clear these events from this list (the full log keeps them). Tank alerts above clear themselves once the problem is fixed."
              onClick={() => {
                sfx('click');
                useGame.getState().mutate((d) => clearAllEvents(d));
              }}
            >
              <Eraser size={14} aria-hidden /> Clear all
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
        <ul className="ag-eventlist" data-testid="alerts-events">
          {events.length === 0 && (
            <li className="ag-muted ag-small" style={{ padding: '10px 2px' }} data-testid="alerts-events-empty">
              {anyEvents ? 'Nothing of this kind.' : game.log.length ? 'You’re all caught up. Older events are in the full log.' : 'Nothing here yet.'}
            </li>
          )}
          {events.map((e) => {
            const link = eventLink(e);
            return (
              <li key={e.id} className={clsx('ag-event', `ag-event--${e.kind}`, !e.read && 'is-unread')} data-testid="alerts-event">
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
                    {/* lane:notify — news with a home opens it (a show result → Shows › Results, which marks it seen) */}
                    {link && (
                      <button
                        type="button"
                        className="ag-linkbtn"
                        data-testid="alerts-event-link"
                        onClick={() => {
                          sfx('open');
                          useShell.getState().set({ popover: null });
                          useUI.getState().set({ panel: link.panel, panelTarget: link.target });
                        }}
                      >
                        {link.label} <ChevronRight size={11} aria-hidden style={{ verticalAlign: '-1px' }} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="ag-linkbtn ag-alerts-pop__full" data-testid="alerts-open-log" onClick={openLog}>
          <ScrollText size={14} aria-hidden /> Full event log
        </button>
      </div>
    </motion.div>
  );
}
