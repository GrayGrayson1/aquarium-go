/**
 * Operations › Manual mode (`#/operations/manual`; DESIGN-S3D §7.7, §9.7; AUTO-036): the banner (on) or the card (off),
 * the five systems Hold all stops with a Resume or Hold each, what always keeps running (with the stock manager's
 * orders switch), and while on, what's still to sort out. OWNER: lane "automation" (chunk 5).
 */
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight, Egg, Factory, FlaskConical, Gavel, Hand, Lightbulb, Play, ShieldCheck, Users, Utensils, Waves, Droplet } from 'lucide-react';
import type { GameState, HoldSystem } from '@/types';
import { Button, Toggle } from '@/ui/kit';
import { formatClock, crossings } from '@/sim/time';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { WATER_ROOM } from '@/data/catalog/machines';
import { act } from '../common/act';
import { HOLD_SYSTEMS, changerOf, heldSystems, isHeld, manualSince, setStockOrders } from '@/sim/automation';
import { stockManager } from '@/sim/staff/work';
import type { OpsSnapshot } from '@/ui/common/ops';
import { Status, Kicker } from './parts';
import { issueViews } from './issues';
import { doHold, doHoldAll, doResumeAll } from './actions';
import type { OpsNav } from './OperationsPanel';

const NAMES: Record<HoldSystem, { name: string; icon: ReactNode }> = {
  water: { name: 'Water changes', icon: <Waves size={16} aria-hidden /> },
  salt: { name: 'Salt mixing', icon: <FlaskConical size={16} aria-hidden /> },
  food: { name: 'Live food', icon: <Egg size={16} aria-hidden /> },
  feeders: { name: 'Autofeeders', icon: <Utensils size={16} aria-hidden /> },
  lines: { name: 'Production lines', icon: <Factory size={16} aria-hidden /> },
};

/** What holding each system means right now (the on-hold rows' sub-lines). */
function heldText(g: GameState, sys: HoldSystem): string {
  const now = g.clock.hour;
  const tanks = g.tankOrder.map((id) => g.tanks[id]).filter(Boolean);
  switch (sys) {
    case 'water': {
      const n = tanks.filter((t) => changerOf(t)).length;
      const next = tanks.flatMap((t) => (changerOf(t) ? crossings(now, now + 24, t.lighting?.onHour ?? 8) : [])).sort((a, b) => a - b)[0];
      const day = next !== undefined && Math.floor(next / 24) > Math.floor(now / 24) ? 'tomorrow’s' : 'the';
      return `${n} ${n === 1 ? 'tank skips' : 'tanks skip'} ${day} ${next !== undefined ? formatClock(next) : '8:00 AM'} change`;
    }
    case 'salt': {
      const h = ((now % 24) + 24) % 24;
      return h < WATER_ROOM.mixHours[0] ? `The ${formatClock(WATER_ROOM.mixHours[0])} batch won’t start` : 'Tonight’s batch waits in the mixing tank';
    }
    case 'food':
      return 'Cultures keep growing; no harvests or doses';
    case 'feeders': {
      const fed = tanks.filter((t) => t.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder'));
      const kept = new Set((g.staff?.roster ?? []).filter((m) => m.role === 'aquarist').flatMap((m) => m.tankIds));
      const alone = fed.filter((t) => !kept.has(t.id)).length;
      return `${fed.length} ${fed.length === 1 ? 'tank' : 'tanks'} · keepers feed on their rounds${alone ? ` · ${alone} have no keeper: feed them by hand` : ''}`;
    }
    case 'lines':
      return 'No moves, sorting or new listings';
  }
}

export function ManualView({ g, snap, nav }: { g: GameState; snap: OpsSnapshot; nav: OpsNav }) {
  const held = heldSystems(g);
  const on = held.length > 0;
  const since = manualSince(g);
  const rosa = stockManager(g);
  const atos = g.tankOrder.filter((id) => g.tanks[id]?.equipment.some((e) => e.defId === 'ato' && e.on && !e.failed)).length;
  const open = issueViews(g, snap.problems);
  return (
    <>
      <button type="button" className="ops-link" onClick={() => nav.view(null)}>
        <ArrowLeft size={15} aria-hidden /> Overview
      </button>
      {on ? (
        <section className="ops-card ops-manual" data-testid="manual-banner">
          <div className="ops-card__head">
            <span className="ops-chip">
              <Hand size={18} aria-hidden />
            </span>
            <div className="ops-row__main">
              <h3 className="ops-card__title">Manual mode is on</h3>
              <span className="ops-card__body">
                Since {since !== null ? formatClock(since) : 'now'}.{' '}
                {held.length < HOLD_SYSTEMS.length ? `${held.length} of ${HOLD_SYSTEMS.length} systems are on hold.` : 'Nothing is moved, changed, made or listed until you resume. It stays on until you turn it off.'}
              </span>
            </div>
            <Button variant="primary" data-testid="manual-resume-all" onClick={doResumeAll}>
              <Play size={15} aria-hidden /> Resume all
            </Button>
          </div>
        </section>
      ) : (
        <section className="ops-card" data-testid="manual-banner">
          <div className="ops-card__head">
            <span className="ops-chip">
              <Hand size={18} aria-hidden />
            </span>
            <div className="ops-row__main">
              <h3 className="ops-card__title">Manual mode is off</h3>
              <span className="ops-card__body">Hold all stops the automation below until you resume: nothing is moved, changed, made or listed. Life support and keepers keep running.</span>
            </div>
            <Button data-testid="manual-hold-all" onClick={doHoldAll}>
              <Hand size={15} aria-hidden /> Hold all
            </Button>
          </div>
        </section>
      )}
      <div className="ops-cols">
        <section className="ops-card">
          <Kicker icon={<Hand size={14} aria-hidden />}>{on ? 'On hold' : 'What Hold all stops'}</Kicker>
          <div className="ops-rows">
            {HOLD_SYSTEMS.map((sys) => {
              const h = isHeld(g, sys);
              return (
                <div key={sys} className="ops-row" data-testid={`manual-row-${sys}`}>
                  <span className="ops-chip">{NAMES[sys].icon}</span>
                  <div className="ops-row__main">
                    <span className="ops-row__title">
                      {NAMES[sys].name}{' '}
                      {h && (
                        <Status tone="watch" icon="held">
                          Held
                        </Status>
                      )}
                    </span>
                    <span className="ops-row__sub">{heldText(g, sys)}</span>
                  </div>
                  <Button size="sm" data-testid={`manual-toggle-${sys}`} onClick={() => doHold(sys, !h)}>
                    {h ? 'Resume' : 'Hold'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
        <div className="ops-col">
          <section className="ops-card">
            <Kicker icon={<ShieldCheck size={14} aria-hidden />}>Still running</Kicker>
            <div className="ops-rows">
              <Line icon={<Lightbulb size={15} aria-hidden />} text="Filters, heaters and lights" />
              <Line icon={<Droplet size={15} aria-hidden />} text={`Auto Top-Off on ${atos} ${atos === 1 ? 'tank' : 'tanks'}`} />
              <Line icon={<Users size={15} aria-hidden />} text="Keepers’ rounds at 8:00 AM and 6:00 PM" />
              <Line icon={<Gavel size={15} aria-hidden />} text="Auctions already on the market" />
              {rosa && (
                <div className="ops-row" data-testid="manual-rosa">
                  <div className="ops-row__main">
                    <span className="ops-row__title">{rosa.name.split(' ')[0]}’s orders</span>
                    <span className="ops-row__sub">Food and salt keep coming within the budget</span>
                  </div>
                  <Toggle checked={!g.staff?.ordersOff} onChange={(v) => act((d) => setStockOrders(d, v), { quiet: true })} label={`${rosa.name.split(' ')[0]}’s orders`} testId="manual-rosa-toggle" />
                </div>
              )}
            </div>
          </section>
          {on && open.length > 0 && (
            <section className="ops-card" data-testid="manual-still-open">
              <Kicker>Still to sort out</Kicker>
              <div className="ops-rows">
                {open.map((i) => (
                  <div key={i.key} className="ops-row">
                    <div className="ops-row__main">
                      <span className="ops-row__title">{i.title}</span>
                      <span className="ops-row__sub">{i.kind === 'salt' ? 'Manual mode doesn’t buy salt for you' : i.reason}</span>
                    </div>
                    <button type="button" className="ops-link" onClick={() => nav.view('issues')}>
                      Open <ChevronRight size={14} aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Line({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="ops-row">
      <span className="ops-muted">{icon}</span>
      <span className="ops-row__title" style={{ fontWeight: 500 }}>
        {text}
      </span>
    </div>
  );
}
