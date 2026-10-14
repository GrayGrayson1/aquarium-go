/**
 * Setting up a production line (DESIGN-S3D §8.6.1; 0.5 §11.1 item 5; ADR-0025, ADR-0030) and the pickers the line view
 * reuses: the pair list (step 1, "Choose another pair"), the tank rows (step 2, "Choose another tank") and the Sort
 * sheet (ADR-0030 decision 6). OWNER: lane "ui-panels". Nothing exists before Start line: leaving the flow drops it.
 */
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, CircleCheck, Heart, Lock, Play, Plus, ShieldCheck, Sprout, Gem, Store, ChevronDown } from 'lucide-react';
import type { GameState, ProductionKeepRule, ProductionLine } from '@/types';
import { Badge, Button, Modal, Toggle } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { spPlural } from '@/sim/life/breeding/common';
import {
  breedForOptions,
  candidatePairs,
  createLine,
  lineSlots,
  morphLineName,
  pairTraits,
  productionLines,
  setKeepRules,
  setLinePair,
  setLineTank,
  speciesLineName,
  tankFitFor,
  type LineStage,
  type TankFit,
} from '@/sim/production';
import { act } from '../common/act';
import { useSheet } from '../common/PanelLayout';
import { CreaturePortrait } from '../common/Portrait';

type Pair = ReturnType<typeof candidatePairs>[number];
const pairKey = (p: { motherId: string; fatherId: string }) => `${p.motherId}-${p.fatherId}`;
const gal = (g: GameState, id: string) => TANK_TIER_BY_ID[g.tanks[id]?.tierId ?? '']?.gallons;

// ───────────────────────────── step 1: the pair ─────────────────────────────

function PairRow({ g, p, picked, focusable, onPick }: { g: GameState; p: Pair; picked: boolean; focusable: boolean; onPick: () => void }) {
  const m = g.creatures[p.motherId];
  const f = g.creatures[p.fatherId];
  const sp = findSpecies(p.speciesId);
  if (!m || !f || !sp) return null;
  const where = m.tankId === f.tankId ? `in ${g.tanks[m.tankId ?? '']?.name ?? '—'}` : `in ${g.tanks[m.tankId ?? '']?.name ?? '—'} and ${g.tanks[f.tankId ?? '']?.name ?? '—'}`;
  const sub = p.inLine ? `${sp.commonName} · already runs the ${p.inLine}` : `${sp.commonName} · ${where} · both adults`;
  return (
    <button type="button" role="radio" aria-checked={picked} tabIndex={focusable ? 0 : -1} disabled={!!p.inLine} className={clsx('pr-pair', picked && 'is-on')} data-pair={pairKey(p)} data-testid={`production-new-pair-${pairKey(p)}`} onClick={onPick}>
      <span className="pr-radio" aria-hidden />
      <span className="pr-head__pair" aria-hidden>
        <CreaturePortrait creature={m} size={36} ring={null} />
        <CreaturePortrait creature={f} size={36} ring={null} />
      </span>
      <span className="pr-pair__text">
        <span className="pr-pair__names">
          {m.name} × {f.name}
        </span>
        <span className="pr-pair__sub">{sub}</span>
      </span>
      {p.inLine ? (
        <Badge>
          <Lock size={12} aria-hidden /> In a line
        </Badge>
      ) : p.ready ? (
        <Badge tone="good">
          <CircleCheck size={12} aria-hidden /> Ready
        </Badge>
      ) : null}
    </button>
  );
}

/**
 * What the pair list depends on: the adults, where they live, their breeding state, the lines' pairs, and the game hour
 * (readiness). The list is rebuilt when this changes, not on every snapshot (it checks every pair of adults).
 */
function pairsKey(g: GameState, speciesId?: string): string {
  const parts = [String(Math.floor(g.clock.hour)), speciesId ?? ''];
  for (const c of Object.values(g.creatures)) {
    if (c.status !== 'alive' || !c.tankId || (speciesId && c.speciesId !== speciesId)) continue;
    parts.push(`${c.id}:${c.tankId}:${c.lifeStage}:${c.sex}:${c.reproRole ?? ''}:${c.repro?.stage ?? ''}`);
  }
  for (const l of productionLines(g)) parts.push(`${l.id}:${l.name}:${l.pair.motherId}:${l.pair.fatherId}`);
  return parts.join('|');
}

function PairList({ g, picked, onPick, speciesId }: { g: GameState; picked: string | null; onPick: (p: Pair) => void; speciesId?: string }) {
  const key = pairsKey(g, speciesId);
  const pairs = useMemo(() => candidatePairs(g, speciesId), [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` covers what it reads from `g`
  const enabled = pairs.filter((p) => !p.inLine);
  const focusKey = picked && enabled.some((p) => pairKey(p) === picked) ? picked : enabled[0] ? pairKey(enabled[0]) : null;
  // a radio group: the arrow keys move the choice (DESIGN-S3D §13)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step || !enabled.length) return;
    e.preventDefault();
    const i = enabled.findIndex((p) => pairKey(p) === focusKey);
    const next = enabled[(i + step + enabled.length) % enabled.length];
    onPick(next);
    (e.currentTarget.querySelector(`[data-pair="${pairKey(next)}"]`) as HTMLButtonElement | null)?.focus();
  };
  return (
    <div className="pr-pairs" role="radiogroup" aria-label="Which pair breeds?" onKeyDown={onKey}>
      {pairs.map((p) => (
        <PairRow key={pairKey(p)} g={g} p={p} picked={picked === pairKey(p)} focusable={pairKey(p) === focusKey} onPick={() => onPick(p)} />
      ))}
      <div className="pr-pair pr-pair--dashed">
        <Store size={16} aria-hidden />
        <span className="pr-pair__text">Need another pair? Buy a mate, then come back.</span>
        <button type="button" className="pr-link" onClick={() => useUI.getState().set({ panel: 'market', panelTarget: 'tab:shop' })}>
          Shop
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── step 2: the tanks ─────────────────────────────

const STAGES: { id: LineStage; word: string; label: string; icon: ReactNode; testId: string }[] = [
  { id: 'breed', word: 'Breed', label: 'BREED', icon: <Heart size={16} />, testId: 'breed' },
  { id: 'raise', word: 'Raise', label: 'RAISE', icon: <Sprout size={16} />, testId: 'raise' },
  { id: 'quarantine', word: 'Quarantine', label: 'QUARANTINE', icon: <ShieldCheck size={16} />, testId: 'quarantine' },
  { id: 'keep', word: 'Keepers', label: 'KEEPERS', icon: <Gem size={16} />, testId: 'keepers' },
];

/** Why a tank suits a stage, in the design's words ("20 gal · Saffron × Amber live here", "room for 12 young"). */
function why(g: GameState, stage: LineStage, tankId: string, fit: TankFit, pair: { motherId: string; fatherId: string } | null, ignoreLineId?: string): string {
  const parts: string[] = [];
  const gallons = gal(g, tankId);
  if (gallons) parts.push(`${gallons} gal`);
  if (!fit.ok) return parts.join(' · ');
  if (stage === 'breed') {
    const m = pair ? g.creatures[pair.motherId] : undefined;
    const f = pair ? g.creatures[pair.fatherId] : undefined;
    if (m && f && m.tankId === tankId && f.tankId === tankId) parts.push(`${m.name} × ${f.name} live here`);
  } else if (stage === 'quarantine' && fit.status === 'shared') {
    const other = productionLines(g).find((l) => l.id !== ignoreLineId && l.tanks.quarantine.includes(tankId));
    parts.push(other ? `shared with the ${other.name}, one batch at a time` : 'one batch at a time');
  } else if (stage === 'keep') parts.push(`Prismatic and kept young move here · room for ${fit.places ?? 0}`);
  else parts.push(`room for ${fit.places ?? 0} young`);
  return parts.join(' · ');
}

function FitBadge({ fit }: { fit: TankFit }) {
  if (fit.status === 'fits')
    return (
      <Badge tone="good">
        <CircleCheck size={12} aria-hidden /> Fits
      </Badge>
    );
  if (fit.status === 'shared') return <Badge tone="watch">Shared</Badge>;
  return <Badge tone="watch">Doesn’t fit</Badge>;
}

function TankChoices({ g, speciesId, stage, chosen, pair, onPick, ignoreLineId }: { g: GameState; speciesId: string; stage: LineStage; chosen: Partial<Record<LineStage, string>>; pair: { motherId: string; fatherId: string } | null; onPick: (id: string) => void; ignoreLineId?: string }) {
  return (
    <div className="pr-choices" role="listbox" aria-label={`Tanks for ${stage}`}>
      {g.tankOrder.map((id) => {
        const t = g.tanks[id];
        if (!t) return null;
        const fit = tankFitFor(g, speciesId, stage, id, chosen, pair ? [pair.motherId, pair.fatherId] : [], ignoreLineId);
        return (
          <button key={id} type="button" role="option" aria-selected={chosen[stage] === id} disabled={!fit.ok} className={clsx('pr-choice', chosen[stage] === id && 'is-on')} onClick={() => onPick(id)}>
            <span className="pr-choice__name">{t.name}</span>
            <span className="pr-choice__sub">{fit.ok ? why(g, stage, id, fit, pair, ignoreLineId) : fit.reason}</span>
            <FitBadge fit={fit} />
          </button>
        );
      })}
    </div>
  );
}

function StageRow({ g, speciesId, stage, chosen, pair, open, onToggle, onPick }: { g: GameState; speciesId: string; stage: (typeof STAGES)[number]; chosen: Partial<Record<LineStage, string>>; pair: { motherId: string; fatherId: string } | null; open: boolean; onToggle: () => void; onPick: (id: string) => void }) {
  const id = chosen[stage.id];
  const fit = id ? tankFitFor(g, speciesId, stage.id, id, chosen, pair ? [pair.motherId, pair.fatherId] : []) : null;
  return (
    <div className={clsx('pr-tankrow', open && 'is-open')} data-testid={`production-new-tank-${stage.testId}`}>
      <button type="button" className="pr-tankrow__head" aria-expanded={open} onClick={onToggle}>
        <span className="pr-tankrow__icon" aria-hidden>
          {stage.icon}
        </span>
        <span className="pr-tankrow__text">
          <span className="pr-tankrow__label">{stage.label}</span>
          <span className="pr-tankrow__name">{id ? g.tanks[id]?.name : '—'}</span>
          <span className="pr-tankrow__sub">{id && fit ? (fit.ok ? why(g, stage.id, id, fit, pair) : fit.reason) : ''}</span>
        </span>
        {fit && <FitBadge fit={fit} />}
        <ChevronDown size={16} aria-hidden className="pr-tankrow__chev" />
      </button>
      {open && <TankChoices g={g} speciesId={speciesId} stage={stage.id} chosen={chosen} pair={pair} onPick={onPick} />}
    </div>
  );
}

/** First tank that fits each stage, in tank order, the breed tank being where the male lives (when it fits). */
function defaultTanks(g: GameState, speciesId: string, pair: { motherId: string; fatherId: string }): Partial<Record<LineStage, string>> {
  const chosen: Partial<Record<LineStage, string>> = {};
  const ids = [pair.motherId, pair.fatherId];
  const maleTank = g.creatures[pair.fatherId]?.tankId;
  if (maleTank && tankFitFor(g, speciesId, 'breed', maleTank, chosen, ids).ok) chosen.breed = maleTank;
  for (const stage of ['breed', 'raise', 'quarantine', 'keep'] as LineStage[]) {
    if (chosen[stage]) continue;
    const prefer = stage === 'raise' ? 'nursery' : stage === 'quarantine' ? 'quarantine' : null;
    const order = [...g.tankOrder].sort((a, b) => Number(g.tanks[b]?.purpose === prefer) - Number(g.tanks[a]?.purpose === prefer));
    const hit = order.find((id) => !Object.values(chosen).includes(id) && tankFitFor(g, speciesId, stage, id, chosen, ids).ok);
    if (hit) chosen[stage] = hit;
  }
  return chosen;
}

// ───────────────────────────── the Sort sheet ─────────────────────────────

/** Sort (ADR-0030 decision 6): keep rules "Keep best [n] [trait]"; the traits the pair's young can show. */
export function SortSheet({ g, line, draft, onClose }: { g: GameState; line: Pick<ProductionLine, 'pair' | 'speciesId' | 'rules' | 'tanks'> & { id?: string }; draft?: (rules: ProductionKeepRule[]) => void; onClose: () => void }) {
  const traits = pairTraits(g, line);
  const keepName = g.tanks[line.tanks.keep]?.name ?? 'the keep tank';
  const rules = line.rules.keep;
  const save = (next: ProductionKeepRule[]) => {
    if (draft) draft(next);
    else if (line.id) act((d) => setKeepRules(d, line.id!, next), { quiet: true });
  };
  return (
    <Modal open onClose={onClose} title="Sort" testId="production-sort" actions={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <p>Young that match a rule move to {keepName}. The rest go to quarantine.</p>
      <div className="pr-sortrules">
        {rules.map((r, i) => (
          <div key={i} className="pr-sortrule">
            <span>Keep best</span>
            <select aria-label="How many to keep" value={r.count} onChange={(e) => save(rules.map((x, k) => (k === i ? { ...x, count: Number(e.target.value) } : x)))}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select aria-label="Trait" value={r.traitIds[0] ?? ''} onChange={(e) => save(rules.map((x, k) => (k === i ? { ...x, traitIds: [e.target.value] } : x)))}>
              {traits.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={() => save(rules.filter((_, k) => k !== i))}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      {traits.length > 0 && rules.length < 6 && (
        <Button size="sm" data-testid="production-sort-add" onClick={() => save([...rules, { traitIds: [traits[0].id], count: 2 }])}>
          <Plus size={14} aria-hidden /> Add a keep rule
        </Button>
      )}
    </Modal>
  );
}

// ───────────────────────────── fixing a line (ADR-0030 decision 2) ─────────────────────────────

export function PairPicker({ g, line, onClose }: { g: GameState; line: ProductionLine; onClose: () => void }) {
  const [picked, setPicked] = useState<Pair | null>(null);
  return (
    <Modal
      open
      onClose={onClose}
      title="Choose another pair"
      testId="production-fix-pair-dialog"
      actions={
        <Button variant="primary" disabled={!picked} onClick={() => picked && act((d) => setLinePair(d, line.id, picked.motherId, picked.fatherId), { quiet: true })?.ok && onClose()}>
          Done
        </Button>
      }
    >
      <p>Only adult pairs that can breed together are listed.</p>
      <PairList g={g} picked={picked ? pairKey(picked) : null} onPick={setPicked} speciesId={line.speciesId} />
    </Modal>
  );
}

export function TankPicker({ g, line, stage, replace, onClose }: { g: GameState; line: ProductionLine; stage: LineStage; replace?: string; onClose: () => void }) {
  const chosen: Partial<Record<LineStage, string>> = { breed: line.tanks.breed, raise: line.tanks.raise, quarantine: line.tanks.quarantine[0], keep: line.tanks.keep };
  delete chosen[stage];
  return (
    <Modal open onClose={onClose} title="Choose another tank" testId="production-fix-tank-dialog">
      <TankChoices g={g} speciesId={line.speciesId} stage={stage} chosen={chosen} pair={line.pair} ignoreLineId={line.id} onPick={(id) => act((d) => setLineTank(d, line.id, stage, id, replace), { quiet: true })?.ok && onClose()} />
    </Modal>
  );
}

// ───────────────────────────── the flow ─────────────────────────────

/** "+ New line": three steps on one route; Start line creates the line and opens it (§8.6.1). */
export function NewLine({ g, onStarted }: { g: GameState; onStarted: (lineId: string) => void }) {
  const { phone } = useSheet();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pair, setPair] = useState<Pair | null>(null);
  const [tanks, setTanks] = useState<Partial<Record<LineStage, string>>>({});
  const [open, setOpen] = useState<LineStage | null>(null);
  const [breedFor, setBreedFor] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string | null>(null);
  const [rules, setRules] = useState({ pauseWhenFull: true, keepPrismatic: true, autoList: true, keep: [] as ProductionKeepRule[] });
  const [sorting, setSorting] = useState(false);
  const lines = productionLines(g);
  const slot = lines.length + 1;
  const slots = lineSlots(g);
  const sp = pair ? findSpecies(pair.speciesId) : undefined;
  const options = pair ? breedForOptions(g, pair.motherId, pair.fatherId) : [];
  const morph = breedFor ?? options[0]?.morphName;
  const defaultName = sp ? (lines.length >= 1 ? morphLineName(sp, morph) : speciesLineName(sp)) : '';
  const lineName = name ?? defaultName;
  const tanksOk = !!pair && (['breed', 'raise', 'quarantine', 'keep'] as LineStage[]).every((s) => tanks[s] && tankFitFor(g, pair.speciesId, s, tanks[s]!, tanks, [pair.motherId, pair.fatherId]).ok);
  const steps: [1 | 2 | 3, string][] = [
    [1, phone ? 'Pair' : 'Choose a pair'],
    [2, phone ? 'Tanks' : 'Choose tanks'],
    [3, 'Rules'],
  ];
  const start = () => {
    if (!pair || !tanksOk) return;
    const r = act((d) => createLine(d, { motherId: pair.motherId, fatherId: pair.fatherId, tanks: { breed: tanks.breed!, raise: tanks.raise!, quarantine: tanks.quarantine!, keep: tanks.keep! }, breedFor: morph, name: lineName, rules }));
    if (r?.ok && r.lineId) onStarted(r.lineId);
  };
  return (
    <div className="pr-new">
      <div className="pr-newhead">
        <div className="pr-head__row">
          <h3 className="pr-head__name">New line</h3>
          <Badge tone="aqua">
            Line slot {slot} of {slots}
          </Badge>
        </div>
        <ol className="pr-stepper">
          {steps.map(([n, word]) => (
            <li key={n} className={clsx(n === step && 'is-current', n < step && 'is-done')} aria-current={n === step ? 'step' : undefined} data-testid={`production-new-step-${n}`}>
              <span className="pr-stepper__n" aria-hidden>
                {n < step ? <Check size={12} /> : n}
              </span>
              {word}
            </li>
          ))}
        </ol>
      </div>

      {step === 1 && (
        <section className="pr-card">
          <h4 className="pr-section">
            <Heart size={14} aria-hidden /> Which pair breeds?
          </h4>
          <p className="pr-hint">Only adult pairs that can breed together are listed.</p>
          <PairList
            g={g}
            picked={pair ? pairKey(pair) : null}
            onPick={(p) => {
              setPair(p);
              setTanks(defaultTanks(g, p.speciesId, p));
              setBreedFor(undefined);
              setName(null);
              setRules((r) => ({ ...r, keep: [] }));
            }}
          />
        </section>
      )}

      {step === 2 && pair && (
        <section className="pr-card">
          <h4 className="pr-section">Where does each stage happen?</h4>
          {STAGES.map((s) => (
            <StageRow key={s.id} g={g} speciesId={pair.speciesId} stage={s} chosen={tanks} pair={pair} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onPick={(id) => {
              setTanks({ ...tanks, [s.id]: id });
              setOpen(null);
            }} />
          ))}
          <p className="pr-hint">Tanks are checked for water type, temperament and space. A tank can serve several lines, but not two stages of the same line.</p>
        </section>
      )}

      {step === 3 && pair && sp && (
        <>
          <section className="pr-card">
            <h4 className="pr-section">What the line breeds and sells</h4>
            <div className="pr-fields">
              <label className="pr-field">
                <span className="pr-field__label">Breed for</span>
                <select data-testid="production-new-breed-for" value={morph ?? ''} onChange={(e) => setBreedFor(e.target.value)}>
                  {options.map((o) => (
                    <option key={o.morphName} value={o.morphName}>
                      {o.label.replace(new RegExp(`\\s*${sp.commonName}$`, 'i'), '')} {spPlural(sp)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="pr-field">
                <span className="pr-field__label">Line name</span>
                <input data-testid="production-new-name" value={lineName} maxLength={40} onChange={(e) => setName(e.target.value)} />
              </label>
            </div>
            <p className="pr-hint">Lines are named after what they breed for. You can rename it.</p>
            <div className="pr-field">
              <span className="pr-field__label">Sort</span>
              <button type="button" className="pr-fieldbtn" onClick={() => setSorting(true)}>
                {rules.keepPrismatic && <span className="pn-chip pn-chip--violet">Keep Prismatic</span>}
                {rules.keep.map((r, i) => (
                  <span key={i} className="pn-chip pn-chip--aqua">
                    Keep best {r.count} {r.traitIds.map((t) => pairTraits(g, { pair, speciesId: pair.speciesId }).find((x) => x.id === t)?.name ?? t).join(' ')}
                  </span>
                ))}
                <span className="pn-chip">Sell the rest</span>
              </button>
            </div>
            <div className="pr-field">
              <span className="pr-field__label">Sell</span>
              <span className="pr-fieldbtn pr-fieldbtn--static">Auctions · reserve at fair value −10%</span>
            </div>
          </section>
          <section className="pr-card" aria-label="Line rules">
            <h4 className="pr-section">Line rules</h4>
            {(
              [
                ['pauseWhenFull', 'Pause when a tank is full', `Stops spawning when ${g.tanks[tanks.raise ?? '']?.name ?? 'the raise tank'} reaches its stocking limit.`],
                ['keepPrismatic', 'Never sell Prismatic animals', `A Prismatic youngster always moves to ${g.tanks[tanks.keep ?? '']?.name ?? 'the keep tank'} instead.`],
                ['autoList', 'List automatically', 'Juveniles go to auction the day quarantine ends.'],
              ] as const
            ).map(([key, title, sub]) => (
              <div key={key} className="pr-rule">
                <div className="pr-rule__text">
                  <div className="pr-rule__title">{title}</div>
                  <div className="pr-rule__sub">{sub}</div>
                </div>
                <Toggle checked={rules[key]} onChange={(on) => setRules({ ...rules, [key]: on })} label={`${title} (${lineName})`} testId={`production-rule-${key}`} />
              </div>
            ))}
          </section>
          {sorting && <SortSheet g={g} line={{ pair, speciesId: pair.speciesId, rules, tanks: { breed: tanks.breed ?? '', raise: tanks.raise ?? '', quarantine: [tanks.quarantine ?? ''], keep: tanks.keep ?? '' } }} draft={(keep) => setRules({ ...rules, keep })} onClose={() => setSorting(false)} />}
        </>
      )}

      <div className="pr-actions">
        {step > 1 && (
          <Button variant="ghost" data-testid="production-new-back" onClick={() => setStep((step - 1) as 1 | 2)}>
            <ArrowLeft size={14} aria-hidden /> Back
          </Button>
        )}
        {step < 3 ? (
          <Button variant="primary" data-testid="production-new-next" disabled={step === 1 ? !pair : !tanksOk} onClick={() => setStep((step + 1) as 2 | 3)}>
            <ArrowRight size={14} aria-hidden /> {step === 1 ? 'Next: choose tanks' : 'Next: rules'}
          </Button>
        ) : (
          <Button variant="primary" data-testid="production-start-line" disabled={!tanksOk || !lineName.trim()} onClick={start}>
            <Play size={14} aria-hidden /> Start line
          </Button>
        )}
      </div>
    </div>
  );
}
