/**
 * Visitors — open-to-public toggle (gated), admission price with projected effect, today's numbers, live reactions
 * feed, exhibit popularity ranking, signage per tank and the facility upgrade CTA. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { Users, DoorOpen, DoorClosed, Ticket, HandCoins, Smile, Sparkles, Meh, Frown, TriangleAlert, Eye, Star, Lock, Signpost, Trophy, Clock } from 'lucide-react';
import type { GameState, VisitorReaction } from '@/types';
import { Money, formatMoney, Toggle, Slider } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { setOpenToPublic, setAdmission, toggleSignage, visitorSummary, SIGN_COST, type VisitorSummary } from '@/sim/facility';
import { getFacilityLevel } from '@/data/facilities';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { formatClock } from '@/sim/time';
import { PanelLayout } from '../common/PanelLayout';
import { usePanelGame, useReducedMotion, safe } from '../common/hooks';
import { act, edit } from '../common/act';
import { EmptyState, SectionHead, Tile, Bar, Callout, Chip, Seg } from '../common/parts';
import { StaffTab } from './StaffTab'; // lane:staff
import { FacilityUpgradeCard } from '../common/FacilityUpgrade';
import { Requirements, reqsFor } from '../common/Requirements';
import { orderedTanks, unlocked } from '../common/derive';
import { relTime, MOOD_LABEL, plural } from '../common/format';

const MOOD_ICON: Record<VisitorReaction['mood'], typeof Smile> = { wow: Sparkles, happy: Smile, neutral: Meh, bored: Frown, concerned: TriangleAlert };
type VisitorsTab = 'visitors' | 'staff'; // lane:staff

export function VisitorsPanel() {
  const g = usePanelGame(600);
  const sum = useMemo(() => (g ? safe<VisitorSummary | null>(() => visitorSummary(g), null) : null), [g]);
  // lane:staff — Visitors | Staff tabs; the tank card's "Cared for by…" line opens straight onto Staff.
  const [tab, setTab] = useState<VisitorsTab>('visitors');
  const target = useUI((s) => s.panelTarget);
  useEffect(() => {
    // lane:w2-ui — 'tab:staff' / 'tab:visitors' like the other panels' deep links; the bare ids still work
    const t = target?.startsWith('tab:') ? target.slice(4) : target;
    if (t !== 'staff' && t !== 'visitors') return;
    setTab(t);
    useUI.getState().set({ panelTarget: null });
  }, [target]);
  if (!g) return null;
  const canOpen = sum ? sum.canOpen : unlocked(g, 'visitors');
  const level = getFacilityLevel(g.facility.level);
  const t = g.visitors.today;
  const avgSat = t.count > 0 ? t.satisfactionSum / t.count : 0;

  return (
    <PanelLayout
      title="Visitors"
      icon={<Users size={20} />}
      subtitle={canOpen ? `${level.name} · ${g.facility.openToPublic ? `open ${formatClock(g.facility.openHour)}–${formatClock(g.facility.closeHour)}` : 'closed to the public'} · ${g.visitors.totalVisitors.toLocaleString('en-US')} visitors all time` : `${level.name} · private`}
      scrollKey={tab /* lane:staff */}
      toolbar={
        // lane:staff — venue operations: the public side and the team behind it
        <Seg<VisitorsTab>
          label="Visitors section"
          value={tab}
          onChange={setTab}
          testIdPrefix="visitors-tab-"
          items={[
            { id: 'visitors', label: 'Visitors' },
            {
              id: 'staff',
              label: (
                <>
                  Staff
                  {(g.staff?.roster.length ?? 0) > 0 && <span className="pn-seg__count">{g.staff!.roster.length}</span>}
                  {!unlocked(g, 'staff') && <Lock size={12} aria-label="locked" style={{ marginLeft: 4, verticalAlign: '-1px' }} />}
                </>
              ),
            },
          ]}
        />
      }
    >
      {tab === 'staff' ? (
        <StaffTab g={g} />
      ) : (
      <div className="pn-stack pn-stack--lg">
        <DoorsCard g={g} canOpen={canOpen} sum={sum} />
        {sum && sum.unreachable.length > 0 && (
          <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Some exhibits can’t be reached">
            Visitors can’t get to {sum.unreachable.map((id) => g.tanks[id]?.name ?? 'a tank').join(', ')}. Leave a clear aisle in front of every tank.
          </Callout>
        )}

        {canOpen && (
          <>
            <div className="pn-grid pn-grid--tiles">
              <Tile icon={<Users size={14} />} tone="aqua" label="Today" value={Math.round(t.count)} hint={sum?.openNow ? `${Math.min(Math.round(sum.occupancy), Math.round(t.count)) /* lane:qa-play: never more inside than came today */} inside · ${sum.capacity} max` : `${sum?.weekday ?? ''} · up to ${level.visitorCapacity} at once`} />
              <Tile icon={<Ticket size={14} />} tone="gold" label="Admissions" value={<Money value={t.revenue} />} hint="today" />
              <Tile icon={<HandCoins size={14} />} tone="good" label="Tips" value={<Money value={t.tips} />} hint="today" />
              <Tile icon={<Smile size={14} />} tone={avgSat >= 70 ? 'good' : avgSat >= 45 ? 'watch' : 'danger'} label="Satisfaction" value={t.count ? `${Math.round(avgSat)}` : '—'} hint={t.count ? satWord(avgSat) : 'no visitors yet'} />
            </div>
            <AdmissionCard g={g} fair={sum?.fairAdmission} />
            {sum && sum.mix.length > 0 && (
              <div className="pn-chips">
                <span className="pn-small pn-muted" style={{ alignSelf: 'center', marginRight: 4 }}>
                  Today’s crowd
                </span>
                {sum.mix
                  .sort((a, b) => b.share - a.share)
                  .map((m) => (
                    <Chip key={m.id}>
                      {m.label} {Math.round(m.share * 100)}%
                    </Chip>
                  ))}
              </div>
            )}
            <WeekBars g={g} />
          </>
        )}

        <Reactions g={g} />
        <Popularity g={g} canSign={unlocked(g, 'signage')} sum={sum} />

        <section>
          <SectionHead title="Grow your venue" icon={<Trophy size={14} />} />
          <FacilityUpgradeCard g={g} />
        </section>
      </div>
      )}
    </PanelLayout>
  );
}

function satWord(v: number): string {
  if (v >= 85) return 'Delighted';
  if (v >= 70) return 'Happy';
  if (v >= 55) return 'Content';
  if (v >= 40) return 'Mixed';
  return 'Disappointed';
}

function DoorsCard({ g, canOpen, sum }: { g: GameState; canOpen: boolean; sum: VisitorSummary | null }) {
  const open = g.facility.openToPublic;
  if (!canOpen) {
    const rule = UNLOCK_RULE_BY_KEY['visitors'];
    const prog = rule ? { items: reqsFor(g, rule.when) } : null;
    return (
      <div className="pn-card pn-doors pn-doors--locked">
        <div className="pn-row pn-gap-3">
          <span className="pn-doors__icon">
            <Lock size={20} />
          </span>
          <div className="pn-grow">
            <div className="pn-card__title">Not open to the public yet</div>
            <div className="pn-small pn-muted">{rule?.hint ?? 'Upgrade to a specialty shop to welcome paying visitors.'}</div>
          </div>
          <div className="pn-row pn-gap-2">
            <span className="pn-small pn-muted">Open</span>
            <span data-testid="visitors-open-toggle" aria-disabled="true" className="pn-doors__toggle is-disabled">
              <Toggle checked={false} onChange={() => {}} label="Open to the public (locked)" />
            </span>
          </div>
        </div>
        {prog && <Requirements items={prog.items} />}
        <p className="pn-small pn-muted" style={{ margin: 0 }}>
          Until then, friends and neighbours drop by to admire your tanks — and sometimes leave a tip.
        </p>
      </div>
    );
  }
  return (
    <div className={clsx('pn-card pn-doors', open && 'is-open')}>
      <div className="pn-row pn-gap-3">
        <span className="pn-doors__icon">{open ? <DoorOpen size={20} /> : <DoorClosed size={20} />}</span>
        <div className="pn-grow">
          <div className="pn-card__title">{open ? (sum && !sum.openNow ? 'Open — doors closed for the night' : 'Open to the public') : 'Closed to the public'}</div>
          <div className="pn-small pn-muted">
            <Clock size={12} style={{ verticalAlign: '-2px' }} /> Hours {formatClock(g.facility.openHour)} – {formatClock(g.facility.closeHour)} · admission {formatMoney(g.facility.admission)}
          </div>
        </div>
        <span data-testid="visitors-open-toggle" className="pn-doors__toggle">
          <Toggle checked={open} onChange={(v) => act((d) => setOpenToPublic(d, v), { sound: v ? 'visitor_wow' : 'close', kind: 'info', quiet: v })} label="Open to the public" />
        </span>
      </div>
    </div>
  );
}

function AdmissionCard({ g, fair }: { g: GameState; fair?: number }) {
  const [price, setPrice] = useState(g.facility.admission);
  const timer = useRef<number | null>(null);
  useEffect(() => setPrice(g.facility.admission), [g.facility.admission]);
  const commit = (v: number) => {
    setPrice(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => edit((d) => setAdmission(d, v)), 350);
  };
  const proj = useMemo(() => project(g, price, fair), [g, price, fair]);
  const cur = useMemo(() => project(g, g.facility.admission, fair), [g, fair]);
  const delta = proj.revenue - cur.revenue;
  return (
    <section className="pn-card">
      <SectionHead title="Admission price" icon={<Ticket size={14} />}>
        <span className="pn-admission__v">{price === 0 ? 'Free' : formatMoney(price)}</span>
      </SectionHead>
      <Slider value={price} min={0} max={40} step={1} onChange={commit} label="Admission price" />
      <div className="pn-row pn-row--between pn-tiny pn-muted" style={{ marginTop: 4 }}>
        <span>Free</span>
        <span>$40</span>
      </div>
      <div className="pn-grid pn-grid--3" style={{ marginTop: 14 }}>
        <div className="pn-proj">
          <span className="pn-tiny pn-muted">Visitors / day</span>
          <b>≈ {Math.round(proj.visitors)}</b>
        </div>
        <div className="pn-proj">
          <span className="pn-tiny pn-muted">Admissions / day</span>
          <b>
            ≈ <Money value={proj.revenue} />
          </b>
          {price !== g.facility.admission && Math.abs(delta) >= 1 && <span className={clsx('pn-tiny', delta > 0 ? 'pn-tone-good' : 'pn-tone-watch')}>{formatMoney(delta, { sign: true })} vs now</span>}
        </div>
        <div className="pn-proj">
          <span className="pn-tiny pn-muted">Mood at the door</span>
          <b className={proj.moodTone}>{proj.mood}</b>
        </div>
      </div>
      <p className="pn-tiny pn-muted" style={{ margin: '10px 0 0' }}>
        {fair ? <>A fair ticket for your exhibits today is about <b className="pn-dim">{formatMoney(fair)}</b>. </> : null}
        Projection from your recent crowds. Beautiful, healthy exhibits let you charge more without losing visitors.
      </p>
    </section>
  );
}

/** Simple, transparent UI projection around the sim's fair price (the sim decides the real numbers). */
function project(g: GameState, price: number, fairIn?: number) {
  const hist = g.visitors.history.slice(-7);
  const lvl = getFacilityLevel(g.facility.level);
  const base = hist.length ? hist.reduce((a, h) => a + h.count, 0) / hist.length : lvl.visitorCapacity * 4;
  const fair = Math.max(1, fairIn ?? 4 + g.progress.reputation / 60);
  const draw = (p: number) => 1 / (1 + Math.pow(p / (fair * 1.25), 2.4));
  const visitors = Math.max(0, (base * draw(price)) / Math.max(0.05, draw(g.facility.admission)));
  const ratio = price / fair;
  const mood = price === 0 ? 'Thrilled' : ratio <= 0.7 ? 'Great value' : ratio <= 1.05 ? 'Fair' : ratio <= 1.35 ? 'Pricey' : 'Too expensive';
  const moodTone = ratio <= 1.05 ? 'pn-tone-good' : ratio <= 1.35 ? 'pn-tone-watch' : 'pn-tone-danger';
  return { visitors, revenue: visitors * price, mood, moodTone };
}

function WeekBars({ g }: { g: GameState }) {
  const hist = [...g.visitors.history.slice(-6), { day: g.visitors.today.day, count: g.visitors.today.count, revenue: g.visitors.today.revenue, avgSatisfaction: g.visitors.today.count ? g.visitors.today.satisfactionSum / g.visitors.today.count : 0 }];
  if (hist.length < 2) return null;
  const max = Math.max(1, ...hist.map((h) => h.count));
  return (
    <section>
      <SectionHead title="Last 7 days" icon={<Users size={14} />} />
      <div className="pn-weekbars" role="img" aria-label={`Visitors per day: ${hist.map((h) => `day ${h.day} ${h.count}`).join(', ')}`}>
        {hist.map((h, i) => (
          <div key={h.day} className={clsx('pn-weekbar', i === hist.length - 1 && 'is-today')}>
            <span className="pn-weekbar__v">{h.count}</span>
            <div className="pn-weekbar__track">
              <div className="pn-weekbar__fill" style={{ height: `${(h.count / max) * 100}%` }} />
            </div>
            <span className="pn-weekbar__d">{i === hist.length - 1 ? 'Today' : `Day ${h.day}`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Reactions({ g }: { g: GameState }) {
  const reduced = useReducedMotion();
  // two visitors can say the same thing in the same hour: number repeats so every row keeps a unique, stable key
  const seen = new Map<string, number>();
  const reactions = [...g.visitors.reactions]
    .sort((a, b) => b.hour - a.hour)
    .slice(0, 14)
    .map((r) => {
      const base = `${r.hour}|${r.tankId ?? ''}|${r.creatureId ?? ''}|${r.text}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { ...r, key: `${base}#${n}` };
    });
  return (
    <section>
      <SectionHead title="What people are saying" icon={<Sparkles size={14} />} />
      {reactions.length === 0 ? (
        <EmptyState icon={<Smile size={22} />} title="No reactions yet">
          When visitors — or friends in your hobby room — admire a tank, their comments appear here.
        </EmptyState>
      ) : (
        <ul className="pn-reactions">
          <AnimatePresence initial={false}>
            {reactions.map((r) => {
              const Icon = MOOD_ICON[r.mood] ?? Meh;
              const tank = r.tankId ? g.tanks[r.tankId] : undefined;
              return (
                <motion.li
                  key={r.key}
                  layout={!reduced}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0.1 : 0.35 }}
                  className={clsx('pn-reaction', `pn-reaction--${r.mood}`)}
                >
                  <span className="pn-reaction__mood" title={MOOD_LABEL[r.mood]}>
                    <Icon size={15} aria-hidden />
                    <span className="pn-sr">{MOOD_LABEL[r.mood]}</span>
                  </span>
                  <div className="pn-grow">
                    <div className="pn-quote">“{r.text.replace(/^“|”$/g, '')}”</div>
                    <div className="pn-tiny pn-muted">
                      {MOOD_LABEL[r.mood]}
                      {tank && (
                        <>
                          {' · '}
                          <button type="button" className="pn-inline-link" onClick={() => useUI.getState().set({ focusedTankId: tank.id, view: 'tank' })}>
                            {tank.name}
                          </button>
                        </>
                      )}
                      {' · '}
                      {relTime(r.hour, g.clock.hour)}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function Popularity({ g, canSign, sum }: { g: GameState; canSign: boolean; sum: VisitorSummary | null }) {
  const pop = (v: number | undefined) => (v == null ? 0 : v <= 1 ? v * 100 : v);
  const tanks = orderedTanks(g)
    .map((t) => ({ t, e: g.visitors.exhibit[t.id], s: sum?.topExhibits.find((x) => x.tankId === t.id) }))
    .sort((a, b) => Number(a.t.purpose !== 'display') - Number(b.t.purpose !== 'display') || pop(b.s?.popularity ?? b.e?.popularity) + (b.s?.score ?? b.t.cache.exhibitScore) - (pop(a.s?.popularity ?? a.e?.popularity) + (a.s?.score ?? a.t.cache.exhibitScore)));
  if (tanks.length === 0) return null;
  return (
    <section>
      <SectionHead title="Exhibit popularity" icon={<Star size={14} />} />
      <ol className="pn-rank">
        {tanks.map(({ t, e, s: sx }, i) => (
          <li key={t.id} className="pn-rank__row">
            <span className={clsx('pn-rank__n', i === 0 && pop(sx?.popularity ?? e?.popularity) > 0 && 'is-top')}>{i + 1}</span>
            <div className="pn-grow pn-col" style={{ gap: 6 }}>
              <div className="pn-row pn-gap-2 pn-row--wrap">
                <button type="button" className="pn-inline-link pn-rank__name" onClick={() => useUI.getState().set({ focusedTankId: t.id, view: 'tank' })}>
                  {t.name}
                </button>
                {t.purpose !== 'display' && <Chip>{t.purpose === 'nursery' ? 'Nursery · off display' : 'Off display'}</Chip>}
              </div>
              {t.purpose === 'display' ? (
                <>
                  <Bar value={pop(sx?.popularity ?? e?.popularity)} tone="gold" label={`${t.name} popularity`} thin />
                  <div className="pn-tiny pn-muted pn-row pn-gap-3">
                    <span>
                      <Eye size={11} style={{ verticalAlign: '-1px' }} /> {plural(e?.views ?? 0, 'view')}
                    </span>
                    <span>
                      <Sparkles size={11} style={{ verticalAlign: '-1px' }} /> {plural(e?.wows ?? 0, 'wow')}
                    </span>
                    <span>Exhibit score {Math.round(sx?.score ?? t.cache.exhibitScore)}</span>
                  </div>
                </>
              ) : (
                // nurseries, quarantine and breeding tanks sit behind the scenes: visitors never see them
                <div className="pn-tiny pn-muted">Visitors don’t see this tank. Set it back to Display in Tanks to show it again.</div>
              )}
            </div>
            <label className={clsx('pn-signage', !canSign && 'is-locked')} title={canSign ? (t.signage ? 'Educational sign in place' : `Add an educational sign (${formatMoney(SIGN_COST)})`) : 'Unlock educational signage first'}>
              <Signpost size={14} aria-hidden />
              <span className="pn-tiny">{t.signage ? 'Sign' : `Sign · ${formatMoney(SIGN_COST)}`}</span>
              {canSign ? (
                <span data-testid={`signage-${t.id}`}>
                  <Toggle checked={t.signage} onChange={() => act((d) => toggleSignage(d, t.id), { sound: 'click' }) /* lane:guide — toast the cost / no refund */} label={`Educational sign for ${t.name}`} />
                </span>
              ) : (
                <Lock size={13} aria-label="Locked" />
              )}
            </label>
          </li>
        ))}
      </ol>
      {!canSign && (
        <Callout tone="info" icon={<Signpost size={15} />}>
          Educational signs teach visitors about each species and lift exhibit scores. {UNLOCK_RULE_BY_KEY['signage']?.hint ?? ''}
        </Callout>
      )}
    </section>
  );
}
