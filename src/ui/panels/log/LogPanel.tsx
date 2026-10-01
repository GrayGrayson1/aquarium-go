/**
 * Log — the event log with kind + tank filters, grouped by day, relative times and quick links to the tank,
 * creature or listing involved. Marks events read on open. OWNER: lane "ui-panels".
 * lane:notify — the full history: the alerts drawer's "Clear all" only hides events there, never here.
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ScrollText, Info, Lightbulb, TriangleAlert, OctagonAlert, PartyPopper, Egg, Store, Users, Heart, Sparkles, ArrowUpRight } from 'lucide-react';
import type { GameEvent } from '@/types';
import { useUI } from '@/state/ui';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { usePanelGame } from '../common/hooks';
import { edit } from '../common/act';
import { Chip, Select, EmptyState } from '../common/parts';
import { markLogRead } from '../common/tankOps';
import { orderedTanks } from '../common/derive';
import { LOG_KIND_LABEL, relTime, dayOfHour } from '../common/format';
import { formatClock } from '@/sim/time';
import { eventLink } from '@/ui/hud/eventLinks'; // lane:notify

type KindFilter = 'all' | 'alerts' | 'breeding' | 'market' | 'visitor' | 'milestones' | 'info';

const KIND_ICON: Record<GameEvent['kind'], typeof Info> = {
  info: Info,
  tip: Lightbulb,
  warning: TriangleAlert,
  danger: OctagonAlert,
  celebrate: PartyPopper,
  breeding: Egg,
  market: Store,
  visitor: Users,
  death: Heart,
  unlock: Sparkles,
};

const FILTER_KINDS: Record<Exclude<KindFilter, 'all'>, GameEvent['kind'][]> = {
  alerts: ['warning', 'danger', 'death'],
  breeding: ['breeding'],
  market: ['market'],
  visitor: ['visitor'],
  milestones: ['celebrate', 'unlock'],
  info: ['info', 'tip'],
};

export function LogPanel() {
  const g = usePanelGame(800);
  const { phone, close } = useSheet();
  const [kind, setKind] = useState<KindFilter>('all');
  const [tank, setTank] = useState('all');

  // Mark everything read when the log is opened (and as new events arrive while it is open).
  const unread = g?.log.some((e) => !e.read) ?? false;
  useEffect(() => {
    if (unread) edit((d) => markLogRead(d));
  }, [unread]);

  const groups = useMemo(() => {
    if (!g) return [];
    const list = [...g.log]
      .filter((e) => kind === 'all' || FILTER_KINDS[kind].includes(e.kind))
      .filter((e) => tank === 'all' || e.tankId === tank)
      .sort((a, b) => b.hour - a.hour)
      .slice(0, 200);
    const out: { day: number; items: GameEvent[] }[] = [];
    for (const e of list) {
      const d = dayOfHour(e.hour);
      const last = out[out.length - 1];
      if (last && last.day === d) last.items.push(e);
      else out.push({ day: d, items: [e] });
    }
    return out;
  }, [g, kind, tank]);

  if (!g) return null;
  const today = dayOfHour(g.clock.hour);
  const tanks = orderedTanks(g);
  const counts = (k: KindFilter) => (k === 'all' ? g.log.length : g.log.filter((e) => FILTER_KINDS[k].includes(e.kind)).length);

  const goTank = (id: string) => {
    useUI.getState().set({ view: 'tank', focusedTankId: id });
    if (phone) close();
  };

  return (
    <PanelLayout
      title="Log"
      icon={<ScrollText size={20} />}
      subtitle={`${g.log.length} events · Day ${today}, ${formatClock(g.clock.hour)}`}
      toolbar={
        <div className="pn-col pn-gap-2" style={{ width: '100%' }}>
          <div className="pn-chips pn-chips--scroll">
            {(
              [
                ['all', 'Everything'],
                ['alerts', 'Alerts'],
                ['breeding', 'Breeding'],
                ['market', 'Market'],
                ['visitor', 'Visitors'],
                ['milestones', 'Milestones'],
                ['info', 'Tips & info'],
              ] as [KindFilter, string][]
            ).map(([id, label]) => (
              <Chip key={id} onClick={() => setKind(id)} pressed={kind === id}>
                {label}
                {id !== 'all' && counts(id) > 0 ? ` · ${counts(id)}` : ''}
              </Chip>
            ))}
          </div>
          {tanks.length > 1 && <Select<string> label="Tank" value={tank} onChange={setTank} options={[{ id: 'all', label: 'All tanks' }, ...tanks.map((t) => ({ id: t.id, label: t.name }))]} />}
        </div>
      }
    >
      {groups.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} title={g.log.length ? 'Nothing matches' : 'All quiet'}>
          {g.log.length ? 'Try a different filter.' : 'Births, sales, visitors and warnings will be recorded here as your aquarium comes to life.'}
        </EmptyState>
      ) : (
        <div className="pn-stack">
          {groups.map((grp) => (
            <section key={grp.day}>
              <div className="pn-logday">{grp.day === today ? 'Today' : grp.day === today - 1 ? 'Yesterday' : `Day ${grp.day}`}</div>
              <ul className="pn-log">
                {grp.items.map((e) => {
                  const Icon = KIND_ICON[e.kind] ?? Info;
                  const t = e.tankId ? g.tanks[e.tankId] : undefined;
                  const c = e.creatureId ? g.creatures[e.creatureId] : undefined;
                  const link = e.listingId ? null : eventLink(e); // lane:notify — a show result opens Shows › Results…
                  return (
                    <li key={e.id} className={clsx('pn-logrow', `pn-logrow--${e.kind}`)}>
                      <span className="pn-logrow__icon" title={LOG_KIND_LABEL[e.kind]}>
                        <Icon size={15} aria-hidden />
                        <span className="pn-sr">{LOG_KIND_LABEL[e.kind]}: </span>
                      </span>
                      <div className="pn-grow">
                        <div className="pn-logrow__text">{e.text}</div>
                        <div className="pn-tiny pn-muted pn-row pn-gap-2 pn-row--wrap" style={{ marginTop: 3 }}>
                          <span>
                            {formatClock(e.hour)} · {relTime(e.hour, g.clock.hour)}
                          </span>
                          {t && (
                            <button type="button" className="pn-inline-link" onClick={() => goTank(t.id)}>
                              {t.name} <ArrowUpRight size={11} style={{ verticalAlign: '-1px' }} />
                            </button>
                          )}
                          {c && (c.status === 'alive' || c.status === 'listed') && (
                            <button type="button" className="pn-inline-link" onClick={() => { useUI.getState().set({ selectedCreatureId: c.id, ...(c.tankId ? { focusedTankId: c.tankId, view: 'tank' as const } : {}) }); if (phone) close(); }}>
                              {c.name}
                            </button>
                          )}
                          {e.listingId && (
                            <button type="button" className="pn-inline-link" onClick={() => useUI.getState().set({ panel: 'market', panelTarget: `listing:${e.listingId}` })}>
                              View listing
                            </button>
                          )}
                          {link && (
                            <button type="button" className="pn-inline-link" data-testid="log-event-link" onClick={() => useUI.getState().set({ panel: link.panel, panelTarget: link.target })}>
                              {link.label} <ArrowUpRight size={11} style={{ verticalAlign: '-1px' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PanelLayout>
  );
}
