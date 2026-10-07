/**
 * Research & Unlocks — research projects (cost, time, grants; start/progress), the unlock map with per-requirement
 * progress, the quest board (claim) and achievements. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { FlaskConical, Map as MapIcon, ScrollText, Trophy, Clock, Coins, Lock, Check, Gift, Star, Sparkles, X, CircleCheck, GraduationCap, MapPin } from 'lucide-react';
import type { GameState, MasteryTrack } from '@/types';
import { Button, Money, formatMoney, Modal } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { RESEARCH } from '@/data/research';
import { ACHIEVEMENTS } from '@/data/achievements';
import type { Reward } from '@/data/quests';
import { startResearch, cancelResearch, claimQuest, researchList, activeQuests, unlockProgress, masteryLevel, unlockLabel, evalCond, currentTutorialStep, type ResearchView, type QuestView, type UnlockProgressView } from '@/sim/facility';
import { PanelLayout } from '../common/PanelLayout';
import { usePanelGame, safe, useIsPhone } from '../common/hooks';
import { act } from '../common/act';
import { Chip, Seg, EmptyState, SectionHead, Bar, Callout } from '../common/parts';
import { Requirements } from '../common/Requirements';
import { NamedIcon } from '../common/icons';
import { formatSpan, plural } from '../common/format';
import './research.css'; // lane:w2-ui
import { useNavTab } from '@/ui/nav/router'; // lane:ui-shell (chunk 1)

type Tab = 'research' | 'unlocks' | 'quests' | 'achievements';
const RESEARCH_TABS: readonly Tab[] = ['research', 'unlocks', 'quests', 'achievements'];

const TRACK_LABEL: Record<MasteryTrack, string> = { husbandry: 'Husbandry', breeding: 'Breeding', aquascaping: 'Aquascaping', marine: 'Marine', business: 'Business', exhibition: 'Exhibition' };
const BRANCH_LABEL: Record<string, string> = { gear: 'Life support', freshwater: 'Freshwater', breeding: 'Breeding', marine: 'Marine', exhibition: 'Exhibition' };

export function ResearchPanel() {
  const g = usePanelGame(900);
  const target = useUI((s) => s.panelTarget);
  const [tab, setTab] = useState<Tab>('research');
  const phone = useIsPhone(); // lane:qa-final
  useNavTab('research', tab); // lane:ui-shell (chunk 1)
  useEffect(() => {
    if (target?.startsWith('tab:')) {
      setTab(RESEARCH_TABS.includes(target.slice(4) as Tab) ? (target.slice(4) as Tab) : 'research');
      useUI.getState().set({ panelTarget: null });
    }
  }, [target]);

  const quests = useMemo(() => (g ? safe<QuestView[]>(() => activeQuests(g), []) : []), [g]);
  if (!g) return null;
  const claimable = quests.filter((q) => q.status === 'complete').length;
  const done = g.progress.research.completed.length;

  return (
    <PanelLayout
      title="Research & Unlocks"
      icon={<FlaskConical size={20} />}
      subtitle={`Reputation ${Math.floor(g.progress.reputation)} · ${plural(done, 'project')} complete · ${plural(g.progress.unlocked.length, 'unlock')}`}
      scrollKey={tab}
      toolbar={
        // lane:qa-final — four tabs with icons clipped "Achievements" in the 1280 side sheet: compact tabs like Build,
        // icons dropped on phones
        <Seg<Tab>
          label="Research section"
          tabs
          value={tab}
          onChange={setTab}
          size="sm"
          className="pn-seg--tight"
          testIdPrefix="research-tab-"
          items={[
            { id: 'research', label: <>{!phone && <FlaskConical size={14} />} Research</> },
            { id: 'unlocks', label: <>{!phone && <MapIcon size={14} />} Unlock map</> },
            { id: 'quests', label: <>{!phone && <ScrollText size={14} />} Quests {claimable > 0 && <span className="pn-seg__count pn-seg__count--hot">{claimable}</span>}</> },
            { id: 'achievements', label: <>{!phone && <Trophy size={14} />} Achievements</> },
          ]}
        />
      }
    >
      {tab === 'research' && <ResearchTab g={g} />}
      {tab === 'unlocks' && <UnlocksTab g={g} />}
      {tab === 'quests' && <QuestsTab g={g} quests={quests} />}
      {tab === 'achievements' && <AchievementsTab g={g} />}
    </PanelLayout>
  );
}

function StandingCard({ g }: { g: GameState }) {
  const rep = g.progress.reputation;
  return (
    <div className="pn-card pn-standing">
      <div className="pn-standing__rep">
        <div className="pn-row pn-row--between">
          <span className="pn-tiny pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 650 }}>
            Reputation
          </span>
          <span className="pn-num-t">
            <b style={{ fontSize: 20 }}>{Math.floor(rep)}</b>
            <span className="pn-muted"> / 1,000</span>
          </span>
        </div>
        <Bar value={rep / 10} tone="gold" label="Reputation" />
      </div>
      <div className="pn-mastery">
        {(Object.keys(TRACK_LABEL) as MasteryTrack[]).map((t) => {
          const xp = g.progress.mastery[t] ?? 0;
          const lvl = safe(() => masteryLevel(xp), Math.floor(Math.sqrt(xp / 25)));
          const lo = 25 * lvl * lvl;
          const hi = 25 * (lvl + 1) * (lvl + 1);
          return (
            <div key={t} className="pn-mastery__row">
              <div className="pn-metric__row">
                <span>{TRACK_LABEL[t]}</span>
                <span className="pn-metric__val">Lv {lvl}</span>
              </div>
              <Bar value={((xp - lo) / Math.max(1, hi - lo)) * 100} tone="aqua" label={`${TRACK_LABEL[t]} mastery`} thin />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResearchTab({ g }: { g: GameState }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const list = useMemo(() => safe<ResearchView[]>(() => researchList(g), []), [g]);
  const active = list.find((r) => r.status === 'active');
  const branches = [...new Set(RESEARCH.map((r) => r.branch))];
  return (
    <div className="pn-stack pn-stack--lg">
      <StandingCard g={g} />
      {active ? (
        <div className="pn-card pn-activeresearch">
          <div className="pn-row pn-gap-3">
            <span className="pn-research__icon is-active">
              <NamedIcon name={active.def.icon} size={20} />
            </span>
            <div className="pn-grow">
              <div className="pn-tiny pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 650 }}>
                Studying now
              </div>
              <div className="pn-card__title">{active.def.name}</div>
            </div>
            <div className="pn-col pn-gap-1" style={{ alignItems: 'flex-end' }}>
              <b className="pn-num-t">{Math.round(active.progress * 100)}%</b>
              <span className="pn-tiny pn-muted">
                <Clock size={11} style={{ verticalAlign: '-1px' }} /> {formatSpan(active.hoursLeft)} left
              </span>
            </div>
          </div>
          <Bar value={active.progress * 100} tone="aqua" label="Research progress" />
          <div className="pn-row pn-gap-2 pn-row--wrap">
            <span className="pn-small pn-muted pn-grow">Unlocks: {(active.grantsNew?.length ? active.grantsNew : active.def.grants).map(grantLabel).join(' · ')}</span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(true)}>
              <X size={14} /> Stop
            </Button>
          </div>
        </div>
      ) : (
        <Callout tone="info" icon={<FlaskConical size={16} />}>
          No project running. Pick one below — study continues while you care for your tanks.
        </Callout>
      )}
      {branches.map((b) => (
        <section key={b}>
          <SectionHead title={BRANCH_LABEL[b] ?? b} />
          <div className="pn-col pn-gap-2">
            {list
              .filter((r) => r.def.branch === b)
              .map((r) => (
                <ResearchCard key={r.def.id} g={g} r={r} busy={!!active} />
              ))}
          </div>
        </section>
      ))}
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Stop this research?"
        actions={
          <>
            <Button onClick={() => setConfirmCancel(false)}>Keep studying</Button>
            <Button variant="danger" onClick={() => { act((d) => cancelResearch(d), { sound: 'close', kind: 'info' }); setConfirmCancel(false); }}>
              Stop research
            </Button>
          </>
        }
      >
        <p className="pn-p">
          Progress on {active?.def.name} will be lost. Half of what you paid ({formatMoney(cancelRefund(g, active?.def.cost ?? 0))}) comes back; the rest doesn’t.
        </p>
      </Modal>
    </div>
  );
}

/** Mirrors cancelResearch: half of what was paid (the list price for saves from before the paid amount was recorded). */
function cancelRefund(g: GameState, listCost: number): number {
  const paid = g.progress.counters['_research_paid'];
  return Math.round((typeof paid === 'number' && Number.isFinite(paid) && paid >= 0 ? paid : listCost) / 2);
}

const grantLabel = (k: string): string => safe(() => unlockLabel(k), UNLOCK_KEYS[k as keyof typeof UNLOCK_KEYS] ?? k);

function ResearchCard({ g, r, busy }: { g: GameState; r: ResearchView; busy: boolean }) {
  const d = r.def;
  const status = r.status;
  const reqs = status === 'locked' ? d.requires.map((c) => safe(() => evalCond(g, c, {}), { met: false, current: 0, target: 1, label: c.type })) : [];
  const owned = !!r.alreadyOwned;
  const fresh = r.grantsNew ?? d.grants;
  const cost = typeof r.cost === 'number' ? r.cost : d.cost;
  return (
    <div className={clsx('pn-research', `is-${status}`)} data-testid={`research-${d.id}`} /* lane:w2-ui */>
      <span className={clsx('pn-research__icon', status === 'done' && 'is-done')}>{status === 'done' ? <Check size={18} /> : <NamedIcon name={d.icon} size={18} />}</span>
      <div className="pn-grow pn-col" style={{ gap: 6 }}>
        <div className="pn-row pn-gap-2 pn-row--wrap">
          <b className="pn-research__name">{d.name}</b>
          {status === 'done' && (owned ? <Chip tone="good" title="You already unlocked everything this project teaches by playing — no need to study it.">Learned through play</Chip> : <Chip tone="good">Complete</Chip>)}
          {status === 'active' && <Chip tone="aqua">In progress</Chip>}
        </div>
        <div className="pn-small pn-dim">{d.blurb}</div>
        <div className="pn-chips">
          {/* only what the project would still add counts as an unlock; the rest you already have */}
          {(status === 'done' ? d.grants : fresh).map((k) => (
            <Chip key={k} tone={status === 'done' ? 'good' : 'violet'} icon={status === 'done' ? <Check size={10} /> : <Sparkles size={10} />}>
              {grantLabel(k)}
            </Chip>
          ))}
          {status !== 'done' &&
            d.grants
              .filter((k) => !fresh.includes(k))
              .map((k) => (
                <Chip key={k} icon={<Check size={10} />} title="You already have this">
                  {grantLabel(k)} · owned
                </Chip>
              ))}
        </div>
        {status === 'locked' && reqs.length > 0 && <Requirements items={reqs} compact />}
      </div>
      <div className="pn-research__side">
        {status === 'done' && owned && <span className="pn-tiny pn-muted pn-research__owned">No study needed</span>}
        {status !== 'done' && (
          <>
            <span className="pn-row pn-gap-1 pn-small" title={cost < d.cost ? `List price ${formatMoney(d.cost)} — you already have part of what it teaches, so it costs less` : undefined}>
              <Coins size={13} className="pn-gold" aria-hidden />
              {cost < d.cost && (
                <s className="pn-tiny pn-muted" aria-label={`was ${formatMoney(d.cost)}`}>
                  {formatMoney(d.cost)}
                </s>
              )}
              <Money value={cost} />
            </span>
            <span className="pn-tiny pn-muted">
              <Clock size={11} style={{ verticalAlign: '-1px' }} /> {formatSpan(d.hours)}
            </span>
          </>
        )}
        {status === 'available' && (
          <Button
            size="sm"
            variant="primary"
            disabled={busy || !r.affordable}
            silent
            data-testid={`research-start-${d.id}`}
            // lane:guide — a disabled Start says why
            title={busy ? 'Only one project runs at a time. Finish or stop the current one first.' : !r.affordable ? `You need ${formatMoney(Math.max(0, cost - g.finance.money))} more to start this.` : undefined}
            onClick={() => act((dd) => startResearch(dd, d.id), { sound: 'confirm' })}
          >
            {busy ? 'One at a time' : !r.affordable ? 'Can’t afford' : 'Start'}
          </Button>
        )}
        {status === 'locked' && (
          <Chip icon={<Lock size={11} />}>Locked</Chip>
        )}
      </div>
    </div>
  );
}

const GROUPS: { id: string; label: string; test: (k: string) => boolean }[] = [
  { id: 'livestock', label: 'Livestock', test: (k) => k.startsWith('fw_') || k.startsWith('marine_') || k === 'reef' || k === 'predators' || k === 'brackish' },
  { id: 'tanks', label: 'Tanks', test: (k) => k.startsWith('tank_') && k !== 'tank_auctions' },
  { id: 'gear', label: 'Equipment', test: (k) => k.startsWith('gear_') },
  { id: 'facility', label: 'Venue & features', test: (k) => k.startsWith('facility_') || k.startsWith('shows') || ['market_listings', 'tank_auctions', 'visitors', 'signage', 'nursery', 'genetics_lab', 'photo_contests', 'party_mode', 'staff'].includes(k) },
  { id: 'decor', label: 'Decor & corals', test: (k) => k.startsWith('decor_') },
];

function UnlocksTab({ g }: { g: GameState }) {
  const locked = useMemo(() => safe<UnlockProgressView[]>(() => unlockProgress(g), []), [g]);
  const byKey = new Map(locked.map((u) => [u.key, u]));
  const keys = Object.keys(UNLOCK_KEYS);
  const unlockedCount = keys.filter((k) => g.progress.unlocked.includes(k)).length;
  const next = locked.filter((u) => u.progress > 0).slice(0, 3);
  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-card pn-unlocksummary">
        <div className="pn-row pn-row--between">
          <span className="pn-card__title">
            {unlockedCount} of {keys.length} unlocked
          </span>
          <Chip tone="gold" icon={<Star size={11} />}>
            Reputation {Math.floor(g.progress.reputation)}
          </Chip>
        </div>
        <Bar value={(unlockedCount / keys.length) * 100} tone="gold" label="Unlock progress" />
        {next.length > 0 && (
          <div className="pn-small pn-muted">
            Closest next: {next.map((u) => u.label).join(' · ')}
          </div>
        )}
      </div>
      {GROUPS.map((grp) => {
        const gk = keys.filter(grp.test);
        const open = gk.filter((k) => g.progress.unlocked.includes(k));
        const closed = gk.filter((k) => !g.progress.unlocked.includes(k)).sort((a, b) => (byKey.get(b)?.progress ?? 0) - (byKey.get(a)?.progress ?? 0));
        return (
          <section key={grp.id}>
            <SectionHead title={`${grp.label} · ${open.length}/${gk.length}`} />
            {open.length > 0 && (
              <div className="pn-chips" style={{ marginBottom: 10 }}>
                {open.map((k) => (
                  <Chip key={k} tone="good" icon={<CircleCheck size={11} />}>
                    {safe(() => unlockLabel(k), UNLOCK_KEYS[k as keyof typeof UNLOCK_KEYS])}
                  </Chip>
                ))}
              </div>
            )}
            <div className="pn-col pn-gap-2">
              {closed.map((k) => {
                const u = byKey.get(k);
                return (
                  <details key={k} className="pn-unlock">
                    <summary>
                      <Lock size={13} className="pn-muted" aria-hidden />
                      <span className="pn-grow">{u?.label ?? UNLOCK_KEYS[k as keyof typeof UNLOCK_KEYS]}</span>
                      <span className="pn-unlock__pct">{Math.round((u?.progress ?? 0) * 100)}%</span>
                    </summary>
                    <div className="pn-unlock__body">
                      <div className="pn-small pn-dim">{u?.hint}</div>
                      {u && u.requirements.length > 0 && <Requirements items={u.requirements} />}
                      {u && u.viaResearch.length > 0 && (
                        <div className="pn-small pn-muted">
                          <FlaskConical size={12} style={{ verticalAlign: '-2px' }} /> Or research: {u.viaResearch.map((r) => r.name).join(', ')}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RewardChips({ r }: { r: Reward }) {
  return (
    <div className="pn-chips">
      {r.money ? <Chip tone="gold" icon={<Coins size={11} />}>{formatMoney(r.money)}</Chip> : null}
      {r.reputation ? <Chip tone="gold" icon={<Star size={11} />}>+{r.reputation} reputation</Chip> : null}
      {r.mastery ? <Chip tone="aqua">+{r.mastery.xp} {TRACK_LABEL[r.mastery.track].toLowerCase()} XP</Chip> : null}
      {r.unlocks?.map((k) => (
        <Chip key={k} tone="violet" icon={<Sparkles size={10} />}>
          {safe(() => unlockLabel(k), UNLOCK_KEYS[k])}
        </Chip>
      ))}
      {r.foods && Object.keys(r.foods).length > 0 ? <Chip>Food bundle</Chip> : null}
    </div>
  );
}

function QuestsTab({ g, quests }: { g: GameState; quests: QuestView[] }) {
  const tut = safe(() => currentTutorialStep(g), null);
  const sorted = [...quests].sort((a, b) => Number(b.status === 'complete') - Number(a.status === 'complete'));
  return (
    <div className="pn-stack pn-stack--lg">
      {tut && (
        <div className="pn-card pn-quest pn-quest--tutorial">
          <span className="pn-quest__icon">
            <GraduationCap size={18} />
          </span>
          <div className="pn-grow pn-col" style={{ gap: 6 }}>
            <div className="pn-tiny pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 650 }}>
              Tutorial · step {tut.index + 1} of {tut.total}
            </div>
            <b className="pn-quest__title">{tut.title}</b>
            <div className="pn-small pn-dim">{tut.body}</div>
            <Bar value={(tut.index / Math.max(1, tut.total)) * 100} tone="aqua" label="Tutorial progress" thin />
          </div>
        </div>
      )}
      {sorted.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} title="The quest board is quiet">
          {tut ? 'Finish the tutorial to open the quest board.' : 'New quests appear as you grow — check back soon.'}
        </EmptyState>
      ) : (
        <div className="pn-col pn-gap-3">
          {sorted.map((q) => (
            <div key={q.id} className={clsx('pn-card pn-quest', q.status === 'complete' && 'is-complete')}>
              <span className="pn-quest__icon">
                <NamedIcon name={q.icon} size={18} />
              </span>
              <div className="pn-grow pn-col" style={{ gap: 6 }}>
                <div className="pn-row pn-gap-2 pn-row--wrap">
                  <b className="pn-quest__title">{q.title}</b>
                  {q.status === 'complete' && (
                    <Chip tone="gold" icon={<Check size={11} />}>
                      Complete
                    </Chip>
                  )}
                </div>
                <div className="pn-small pn-dim">{q.body}</div>
                {/* one bar per part for compound goals (below); a single overall bar otherwise */}
                {q.status !== 'complete' && !(q.steps && q.steps.length > 1) && (
                  <div className="pn-row pn-gap-2">
                    <div className="pn-grow">
                      <Bar value={Math.min(1, q.target > 1 ? q.current / q.target : q.progress) * 100} tone="aqua" label={`${q.title} progress`} />
                    </div>
                    {q.target > 1 && (
                      <span className="pn-tiny pn-muted pn-num-t">
                        {Math.floor(q.current)}/{q.target}
                      </span>
                    )}
                  </div>
                )}
                {/* compound goals: what exactly is still missing, and where */}
                {q.status !== 'complete' && q.detail && <div className="pn-small pn-quest__detail">{q.detail}</div>}
                {q.status !== 'complete' && q.steps && q.steps.length > 1 && (
                  <ul className="pn-quest__steps">
                    {q.steps.map((st) => (
                      <li key={st.label} className={clsx('pn-quest__step', st.met && 'is-met')}>
                        <span className="pn-quest__steplabel">
                          {st.met ? <Check size={12} aria-label="Done" /> : <span className="pn-quest__stepdot" aria-hidden />}
                          {st.label}
                        </span>
                        <Bar value={Math.min(1, st.target > 0 ? st.current / st.target : st.met ? 1 : 0) * 100} tone={st.met ? 'good' : 'aqua'} label={`${st.label} progress`} thin />
                        <span className="pn-tiny pn-muted pn-num-t">
                          {Math.floor(st.current)}/{st.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {q.status !== 'complete' && q.tankId && g.tanks[q.tankId] && (
                  <div>
                    <Button size="sm" variant="ghost" onClick={() => useUI.getState().set({ focusedTankId: q.tankId!, view: 'tank', panel: null, panelTarget: null })}>
                      <MapPin size={13} /> Go to {g.tanks[q.tankId].name}
                    </Button>
                  </div>
                )}
                <RewardChips r={q.reward} />
              </div>
              {q.status === 'complete' && (
                <Button variant="primary" silent onClick={() => act((d) => claimQuest(d, q.id), { sound: 'celebrate', kind: 'celebrate' })}>
                  <Gift size={15} /> Claim
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementsTab({ g }: { g: GameState }) {
  const earned = new Set(g.progress.achievements);
  const list = [...ACHIEVEMENTS].sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)));
  return (
    <div className="pn-stack">
      <div className="pn-small pn-muted">
        {earned.size} of {ACHIEVEMENTS.length} earned
      </div>
      <div className="pn-achgrid">
        {list.map((a) => {
          const has = earned.has(a.id);
          const st = has ? null : safe(() => evalCond(g, a.cond, {}), null);
          return (
            <div key={a.id} className={clsx('pn-ach', `pn-ach--${a.tier}`, has ? 'is-earned' : 'is-locked')}>
              <span className="pn-ach__medal">
                <NamedIcon name={a.icon} size={20} />
              </span>
              <b className="pn-ach__title">{a.title}</b>
              <span className="pn-tiny pn-muted">{a.description}</span>
              {has ? (
                <span className="pn-tiny pn-ach__state">
                  <Check size={11} /> Earned
                </span>
              ) : st && st.target > 1 ? (
                <div style={{ width: '100%' }}>
                  <Bar value={(Math.min(st.current, st.target) / st.target) * 100} tone="gold" label={a.title} thin />
                  <span className="pn-tiny pn-muted pn-num-t">
                    {Math.min(st.current, st.target).toLocaleString('en-US')}/{st.target.toLocaleString('en-US')}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
