/**
 * chunk 19 (ADR-0055 decision 5, QOL-006) — "Locked" says how to unlock. Every Locked in Build, the Market and Research
 * opens "How to unlock …": each missing unlock's own route (the rule's hint), its requirements with the player's
 * progress (the facility lane's `evalCond`, as Research's unlock map shows them), the research projects that grant it
 * with a way to open them, and Build › Facility when a bigger venue is needed. A research project's own requirements
 * (conditions rather than unlock keys) are shown the same way. OWNER: lane "ui-panels".
 */
import { useMemo, type ReactNode } from 'react';
import clsx from 'clsx';
import { create } from 'zustand';
import { useGame } from '@/state/game';
import { Lock, FlaskConical, Building2, ArrowRight } from 'lucide-react';
import type { GameState } from '@/types';
import { Button, Modal } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { UNLOCK_RULE_BY_KEY, type Cond } from '@/data/unlocks';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { unlockProgress, researchList, unlockLabel, type UnlockProgressView, type ResearchView } from '@/sim/facility';
import { Requirements, reqsFor } from './Requirements';
import { safe } from './hooks';
import { sfx } from '@/audio/sfx';

type Req = UnlockProgressView['requirements'][number];

/** One missing unlock, as the box shows it. */
export interface LockView {
  key: string;
  label: string;
  hint: string;
  /** Every one is needed; an "any of" condition comes as `either` instead (its alternatives, each with progress). */
  requirements: Req[];
  either: Req[][];
  research: { id: string; name: string; status: ResearchView['status'] | 'unknown' }[];
  /** A requirement is a venue (facility level): the box offers Build › Facility. */
  venue: boolean;
}

/** Does a condition (or any of its alternatives) ask for a venue? */
function asksVenue(c: Cond): boolean {
  if (c.type === 'facility') return true;
  if (c.type === 'any' || c.type === 'all') return c.of.some(asksVenue);
  return false;
}

/** The missing unlocks among `keys`, in order, with their routes (pure over the game; tests use it). */
export function lockViews(g: GameState, keys: readonly (string | null | undefined)[]): LockView[] {
  const wanted = [...new Set(keys.filter((k): k is string => !!k && !g.progress.unlocked.includes(k)))];
  if (!wanted.length) return [];
  const views = new Map(safe(() => unlockProgress(g), [] as UnlockProgressView[]).map((u) => [u.key, u]));
  const research = new Map(safe(() => researchList(g), [] as ResearchView[]).map((r) => [r.def.id, r.status]));
  return wanted.map((key) => {
    const u = views.get(key);
    const rule = UNLOCK_RULE_BY_KEY[key];
    // an "any of" condition shows its alternatives, each with its own progress (one line "25 reputation or Raise a
    // clutch" said nothing about how far along the player is)
    const conds = rule?.when ?? [];
    const flat = conds.filter((c) => c.type !== 'any');
    const either = conds.filter((c): c is Extract<Cond, { type: 'any' }> => c.type === 'any').map((c) => reqsFor(g, c.of));
    return {
      key,
      label: u?.label ?? safe(() => unlockLabel(key), (UNLOCK_KEYS as Record<string, string>)[key] ?? key),
      hint: u?.hint ?? rule?.hint ?? '',
      requirements: rule ? reqsFor(g, flat) : u?.requirements ?? [],
      either,
      research: (u?.viaResearch ?? []).map((r) => ({ id: r.id, name: r.name, status: research.get(r.id) ?? 'unknown' })),
      venue: (rule?.when ?? []).some(asksVenue),
    };
  });
}

const STATUS_WORD: Record<LockView['research'][number]['status'], string> = { done: 'Complete', active: 'In progress', available: 'Ready to start', locked: 'Locked for now', unknown: '' };

/** Go to a research project (Research › Research, the card glowing). */
export function openResearch(id: string): void {
  sfx('open');
  useUI.getState().set({ panel: 'research', panelTarget: `research:${id}` });
}

/** Go to Build › Facility (a bigger venue). */
export function openFacility(): void {
  sfx('open');
  useUI.getState().set({ panel: 'build', panelTarget: 'tab:facility' });
}

/** The box's body: one section per missing unlock (or a research project's own requirements). */
export function UnlockHelpBody({ g, keys, conds, lead, onGo }: { g: GameState; keys?: readonly (string | null | undefined)[]; conds?: readonly Cond[]; lead?: ReactNode; onGo: () => void }) {
  const views = useMemo(() => lockViews(g, keys ?? []), [g, keys]);
  const condReqs = useMemo(() => (conds?.length ? reqsFor(g, [...conds]) : []), [g, conds]);
  const venue = (conds ?? []).some(asksVenue);
  return (
    <div className="pn-unlockhelp" data-testid="unlock-help">
      {lead && <p className="pn-unlockhelp__lead">{lead}</p>}
      {condReqs.length > 0 && (
        <section className="pn-unlockhelp__item">
          <Requirements items={condReqs} />
          {venue && (
            <Button size="sm" onClick={() => { onGo(); openFacility(); }} data-testid="unlock-help-facility">
              <Building2 size={14} aria-hidden /> Open Build › Facility
            </Button>
          )}
        </section>
      )}
      {views.map((v) => (
        <section key={v.key} className="pn-unlockhelp__item" data-testid={`unlock-help-${v.key}`}>
          {views.length > 1 && <h4 className="pn-unlockhelp__name">{v.label}</h4>}
          {v.hint && <p className="pn-unlockhelp__hint">{v.hint}</p>}
          {v.requirements.length > 0 && <Requirements items={v.requirements} />}
          {v.either.map((alts, i) => (
            <div key={i} className="pn-unlockhelp__alts">
              <p className="pn-unlockhelp__either">{v.requirements.length || i > 0 ? 'And one of these:' : 'Any one of these:'}</p>
              <Requirements items={alts} />
            </div>
          ))}
          {v.research.map((r) => (
            <div key={r.id} className="pn-unlockhelp__route">
              <FlaskConical size={14} aria-hidden className="pn-violet" />
              <span className="pn-grow">
                {v.requirements.length > 0 || v.either.length > 0 ? 'Or research ' : 'Research '}
                <b>{r.name}</b>
                {STATUS_WORD[r.status] && <span className="pn-tiny pn-muted"> · {STATUS_WORD[r.status]}</span>}
              </span>
              <Button size="sm" variant="ghost" onClick={() => { onGo(); openResearch(r.id); }} data-testid={`unlock-help-research-${r.id}`}>
                Open in Research <ArrowRight size={13} aria-hidden />
              </Button>
            </div>
          ))}
          {v.venue && (
            <Button size="sm" variant="ghost" onClick={() => { onGo(); openFacility(); }} data-testid="unlock-help-facility">
              <Building2 size={14} aria-hidden /> Open Build › Facility
            </Button>
          )}
        </section>
      ))}
      {!views.length && !condReqs.length && !lead && <p className="pn-unlockhelp__hint">It’s unlocked now.</p>}
    </div>
  );
}

/** What the one "How to unlock" box explains now (null: closed). One box for the whole game, so a list of fifty locked
 * pieces carries fifty plain buttons rather than fifty dialogs. */
export interface UnlockAsk {
  title: string;
  keys?: readonly (string | null | undefined)[];
  conds?: readonly Cond[];
  lead?: ReactNode;
}
export const useUnlockHelp = create<{ ask: UnlockAsk | null }>(() => ({ ask: null }));

/** Open "How to unlock {title}". */
export function askUnlock(ask: UnlockAsk): void {
  sfx('open');
  useUnlockHelp.setState({ ask });
}

/**
 * The Locked chip as a button: it opens "How to unlock {title}". `keys` are unlock keys (a tank size, a water type,
 * gear, decor, a species' research); `conds` a research project's own requirements; `lead` a line above them (a
 * species' own sentence). `children` replaces the chip's word when a row says more than "Locked".
 */
export function LockedButton({ title, keys, conds, lead, testId, children, className, block }: { title: string; keys?: readonly (string | null | undefined)[]; conds?: readonly Cond[]; lead?: ReactNode; testId?: string; children?: ReactNode; className?: string; block?: boolean }) {
  return (
    <button
      type="button"
      className={clsx('pn-lockbtn', block && 'pn-lockbtn--block', className)}
      onClick={(e) => {
        e.stopPropagation();
        askUnlock({ title, keys, conds, lead });
      }}
      aria-haspopup="dialog"
      title={`How to unlock ${title}`}
      data-testid={testId}
    >
      <Lock size={11} aria-hidden /> <span>{children ?? 'Locked'}</span>
    </button>
  );
}

/** The one box (GameHUD mounts it). */
export function UnlockHelpHost() {
  const ask = useUnlockHelp((s) => s.ask);
  const g = useGame((s) => s.game);
  const close = () => useUnlockHelp.setState({ ask: null });
  return (
    <Modal open={!!ask && !!g} onClose={close} title={ask ? `How to unlock ${ask.title}` : ''} testId="unlock-help-modal" width={460} actions={<Button onClick={close}>Close</Button>}>
      {ask && g && <UnlockHelpBody g={g} keys={ask.keys} conds={ask.conds} lead={ask.lead} onGo={close} />}
    </Modal>
  );
}
