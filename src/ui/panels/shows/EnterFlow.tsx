/**
 * Entry flow: pick a class, then an animal (or a tank for aquascape classes). Eligible entrants show a predicted
 * quality band and an outlook against the show's field; ineligible ones say why (the humane rules). Exact expected
 * scores and odds appear only once the Genetics Lab is unlocked. OWNER: lane "shows".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Check, CircleSlash, Lock, Sparkles, Heart } from 'lucide-react';
import type { GameState, Show } from '@/types';
import { SHOW_CLASS_BY_ID, SHOW_TIERS, CRITERION_LABEL, type ShowCriterionKey } from '@/data/shows';
import { findSpecies } from '@/data/species';
import { classCandidates, classEligibleCounts, enterShow, showClosedReason, type EntryCandidate } from '@/sim/shows';
import { Button } from '@/ui/kit';
import { Callout, Chip, EmptyState, SectionHead } from '../common/parts';
import { SubView } from '../common/PanelLayout';
import { act } from '../common/act';
import { safe } from '../common/hooks';
import { CreaturePortrait } from '../common/Portrait';
import { TankThumb } from '../common/TankThumb';
import { livingInTank, morphName } from '../common/derive';
import { TierBadge, TitleBadge } from './Ribbons';
import { money, realIn, speedNote } from './util';

const BAND_N: Record<string, number> = { Ordinary: 1, Promising: 2, Exceptional: 3, Remarkable: 4 };

export function BandPips({ band }: { band: string }) {
  const n = BAND_N[band] ?? 1;
  return (
    <span className={`sh-band sh-band--${band}`}>
      <span className="sh-band__pips" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= n ? 'on' : ''} />
        ))}
      </span>
      {band}
    </span>
  );
}

function standardLine(classId: string): { label: string; pts: number }[] {
  const def = SHOW_CLASS_BY_ID[classId];
  if (!def) return [];
  return (Object.entries(def.standard) as [ShowCriterionKey, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: k === 'form' ? (def.formLabel ?? CRITERION_LABEL.form) : k === 'deportment' ? (def.deportmentLabel ?? CRITERION_LABEL.deportment) : CRITERION_LABEL[k], pts: v }));
}

export function EnterFlow({ g, show, initialClass, onBack, onDone }: { g: GameState; show: Show; initialClass?: string | null; onBack: () => void; onDone: () => void }) {
  const lab = g.progress.unlocked.includes('genetics_lab');
  const counts = useMemo(() => safe(() => classEligibleCounts(g, show), {} as Record<string, { eligible: number; fitting: number }>), [g, show]);
  const firstEnterable = show.classes.find((cl) => {
    const def = SHOW_CLASS_BY_ID[cl.classId];
    return def && (!def.requires || g.progress.unlocked.includes(def.requires)) && (counts[cl.classId]?.eligible ?? 0) > 0;
  })?.classId;
  const [classId, setClassId] = useState<string>(initialClass ?? firstEnterable ?? show.classes[0]?.classId ?? '');
  const [pick, setPick] = useState<string | null>(null);
  const def = SHOW_CLASS_BY_ID[classId];
  const cands = useMemo(() => safe<EntryCandidate[]>(() => classCandidates(g, show, classId), []), [g, show, classId]);
  const eligible = cands.filter((c) => c.eligible);
  useEffect(() => {
    // pick the best eligible entrant by default; drop a pick that became ineligible
    if (pick && cands.some((c) => c.id === pick && c.eligible)) return;
    setPick(eligible[0]?.id ?? null);
  }, [classId, cands]); // eslint-disable-line react-hooks/exhaustive-deps
  const closed = safe(() => showClosedReason(g, show), null);
  const chosen = cands.find((c) => c.id === pick && c.eligible) ?? null;
  const locked = !!def?.requires && !g.progress.unlocked.includes(def.requires);
  const tier = SHOW_TIERS[show.tier];

  // lane:fix-panels — a greyed confirm button says why (it used to go quiet when the fee couldn't be paid)
  const broke = g.finance.money < show.fee;
  const blocked = closed ? (closed.startsWith('You have the most') ? 'No more entries allowed' : closed.startsWith('This show') ? 'Already judged' : closed.includes('locked') ? 'Locked' : 'Entries closed') : locked ? 'Locked' : !chosen ? 'Choose an entrant' : broke ? `Not enough for the ${money(show.fee)} fee` : null;

  const submit = () => {
    if (!chosen) return;
    const r = act((d) => enterShow(d, show.id, classId, chosen.id), { sound: 'confirm', kind: 'success' });
    if (r?.ok) onDone();
  };

  return (
    <SubView onBack={onBack} backLabel="Calendar" title={<TierBadge tier={show.tier} />}>
      <div className="sh-flow">
        <div className="sh-flowhead">
          <h4 className="sh-show__name">{show.name}</h4>
          <div className="sh-show__money">
            <span>
              Entry <strong>{money(show.fee)}</strong>
            </span>
            <span>
              Judging in <strong>{realIn(show.judgingHour - g.clock.hour, g.clock.speed)}</strong>{speedNote(g.clock.speed)}
            </span>
            <span>
              Judge <strong>{show.judge}</strong>
            </span>
          </div>
          {closed && <div className="pn-small pn-muted">{closed}</div>}
        </div>

        <section>
          <SectionHead title="1 · Choose a class" />
          <div className="sh-classpick" role="radiogroup" aria-label="Class">
            {show.classes.map((cl) => {
              const d = SHOW_CLASS_BY_ID[cl.classId];
              if (!d) return null;
              const lk = !!d.requires && !g.progress.unlocked.includes(d.requires);
              const n = counts[cl.classId]?.eligible ?? 0;
              const fitting = counts[cl.classId]?.fitting ?? 0;
              return (
                <button
                  key={cl.classId}
                  type="button"
                  role="radio"
                  aria-checked={classId === cl.classId}
                  className={clsx('sh-classopt', classId === cl.classId && 'is-on', lk && 'is-locked')}
                  onClick={() => setClassId(cl.classId)}
                  data-testid={`show-class-${cl.classId}`}
                >
                  <span className="sh-classopt__name">
                    {lk && <Lock size={13} aria-hidden />}
                    {d.name}
                    <Chip tone={lk ? 'neutral' : n > 0 ? 'aqua' : 'neutral'}>{lk ? 'Locked' : fitting === 0 ? 'None of yours fit' : `${n} of ${fitting} ready`}</Chip>
                  </span>
                  <span className="sh-classopt__blurb">{d.blurb}</span>
                  <span className="sh-standard">
                    {standardLine(cl.classId).map((x) => (
                      <span key={x.label}>
                        {x.label} <b>{x.pts}</b>
                      </span>
                    ))}
                  </span>
                  <span className="sh-standard">
                    <span>
                      Purse <b>{money(cl.purse)}</b>
                    </span>
                    <span>About {cl.field} other exhibitors</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionHead title={def?.kind === 'aquascape' ? '2 · Choose a tank' : '2 · Choose an entrant'} />
          {locked ? (
            <Callout tone="gold" icon={<Lock size={15} />} title="Aquascape awards needed">
              Aquascape classes open with Aquascape Awards — research it, or aquascape a tank yourself to a beauty score of 85.
            </Callout>
          ) : cands.length === 0 ? (
            <EmptyState icon={<CircleSlash size={24} />} title={def?.kind === 'aquascape' ? 'No tanks to enter' : 'None of your animals fit this class'}>
              {def?.kind === 'aquascape' ? 'Build and scape a layout of your own first.' : def?.open ? 'Open classes take any adult of this water type.' : `This class is for ${def?.short.toLowerCase() ?? 'other animals'}.`}
            </EmptyState>
          ) : (
            <ul className="sh-cands" role="radiogroup" aria-label="Entrant">
              {cands.map((c) => (
                <CandidateRow key={c.id} g={g} c={c} on={pick === c.id} lab={lab} onPick={() => c.eligible && setPick(c.id)} />
              ))}
            </ul>
          )}
        </section>

        {chosen && !locked && (
          <div className="sh-preview" aria-live="polite">
            <div className="pn-row pn-row--between">
              <strong>What the judge is likely to see</strong>
              <BandPips band={chosen.band} />
            </div>
            <ul className="pn-small" style={{ margin: 0, paddingLeft: 18, color: 'var(--c-ink-2)', display: 'grid', gap: 3 }}>
              {chosen.assessment.notes
                .filter((n) => n.tone !== 'neutral')
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 3)
                .map((n) => (
                  <li key={n.text}>{n.text}</li>
                ))}
            </ul>
            <div className="pn-small pn-muted">
              {chosen.outlook} at {tier.name} level
              {lab ? ` — expected ${chosen.expected.toFixed(1)} points, ${Math.round(chosen.chances.ribbon * 100)}% chance of a ribbon, ${Math.round(chosen.chances.win * 100)}% to win.` : '. The Genetics Lab reveals exact expected scores.'}
            </div>
          </div>
        )}

        <div className="sh-note">
          <Heart size={13} aria-hidden />
          <span>
            {def?.kind === 'aquascape'
              ? 'The judges visit on show day (or judge from your photos) — the tank stays home.'
              : 'Only healthy, settled adults travel. Show day is a game abstraction: benched at the hall for the judging and home by evening — the animal stays in your tank, comes back a little unsettled, and rests two days before its next show.'}
          </span>
        </div>

        <div className="sh-confirm">
          <span className={clsx('pn-small', broke ? 'pn-tone-danger' : 'pn-muted')}>You have {money(g.finance.money)}</span>
          <Button variant="primary" disabled={!!blocked} onClick={submit} data-testid="show-confirm-entry" title={blocked ?? undefined} aria-label={blocked ?? undefined}>
            <Check size={15} aria-hidden /> {blocked ?? `Enter ${chosen!.name} — ${money(show.fee)}`}
          </Button>
        </div>
      </div>
    </SubView>
  );
}

function CandidateRow({ g, c, on, lab, onPick }: { g: GameState; c: EntryCandidate; on: boolean; lab: boolean; onPick: () => void }) {
  const creature = c.kind === 'creature' ? g.creatures[c.id] : null;
  const tank = c.kind === 'tank' ? g.tanks[c.id] : null;
  const sp = creature ? findSpecies(creature.speciesId) : null;
  const common = sp?.commonName ?? creature?.speciesId ?? '';
  const morph = creature && creature.morphName && !/^wild type$/i.test(creature.morphName) ? morphName(creature) : '';
  // "Red Cherry Shrimp" already says "Cherry Shrimp"; "Green Chromis · Green Chromis" says nothing twice
  const who = !morph || morph.toLowerCase() === common.toLowerCase() ? common : morph.toLowerCase().includes(common.toLowerCase()) ? morph : `${common} · ${morph}`;
  const sub = creature ? `${who}${creature.tankId && g.tanks[creature.tankId] ? ` · ${g.tanks[creature.tankId].name}` : ''}` : tank ? `Beauty ${Math.round(tank.cache?.beauty ?? 0)} · ${livingInTank(g, tank.id).length} ${livingInTank(g, tank.id).length === 1 ? 'animal' : 'animals'}` : '';
  return (
    <li>
      <label className={clsx('sh-cand', on && 'is-on', !c.eligible && 'is-off')} data-testid={`show-candidate-${c.id}`}>
        <input type="radio" name="sh-cand" className="pn-sr" checked={on} disabled={!c.eligible} onChange={onPick} />
        <span className="sh-cand__mark" aria-hidden>
          {on && <Check size={12} />}
        </span>
        {creature ? <CreaturePortrait creature={creature} size={46} ring={creature.isStarter ? 'gold' : null} /> : tank ? <TankThumb tank={tank} residents={livingInTank(g, tank.id)} width={66} height={44} /> : null}
        <span className="sh-cand__body">
          <span className="sh-cand__name">
            <b>{c.name}</b>
            {creature && <TitleBadge c={creature} />}
          </span>
          <span className="sh-cand__sub">{sub}</span>
          {!c.eligible && (
            <span className="sh-cand__why">
              <CircleSlash size={12} aria-hidden />
              <span>{c.reasons.slice(0, 2).join(' · ')}</span>
            </span>
          )}
        </span>
        {c.eligible && (
          <span className="sh-cand__side">
            {lab ? (
              <>
                <span className="sh-cand__score" title="Expected score before the judge's eye">
                  {c.expected.toFixed(1)}
                </span>
                <span className="sh-cand__odds">{Math.round(c.chances.ribbon * 100)}% ribbon</span>
              </>
            ) : (
              <BandPips band={c.band} />
            )}
            <span className="sh-cand__odds">
              {c.chances.win >= 0.45 && <Sparkles size={10} aria-hidden style={{ verticalAlign: '-1px', marginRight: 3 }} />}
              {c.outlook}
            </span>
          </span>
        )}
      </label>
    </li>
  );
}


