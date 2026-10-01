/**
 * Fit hints — will this gear or food help the animals in this tank? (verdicts: src/sim/care/fit.ts). OWNER: lane "fit".
 *
 *   <FitBadge verdict={v} />            pill: icon + word, coloured by the status palette (never colour alone)
 *   <FitLine verdict={v} />             one-line reason, tinted amber/red when it won't help
 *   <FoodEaters fit={foodFit(...)} />   who eats a food + whether an autofeeder can drop it
 *
 * Used by Build › Equipment, Market › Supplies and the tank card's equipment rows.
 */
import clsx from 'clsx';
import { Ban, CircleCheck, OctagonAlert, TriangleAlert, Info, Users, Clock, Hand } from 'lucide-react';
import type { FitVerdict, FoodFit } from '@/sim/care/fit';
import { FIT_TONE } from '@/sim/care/fit';
import { useSettings } from '@/state/settings';
import { convertTempText } from './format';
import './fit.css';

const ICON = { ok: CircleCheck, partial: TriangleAlert, useless: Ban, harmful: OctagonAlert } as const;

/** Badge for a verdict. General advice (nothing in the tank to judge by) gets no badge. */
export function FitBadge({ verdict, className }: { verdict: FitVerdict | null | undefined; className?: string }) {
  if (!verdict || (verdict.general && verdict.level === 'ok')) return null;
  const tone = verdict.soft ? 'neutral' : FIT_TONE[verdict.level];
  const Icon = verdict.blocked ? Ban : verdict.soft ? Info : ICON[verdict.level];
  return (
    <span className={clsx('ag-fitbadge', `is-${tone}`, className)} title={verdict.text} data-fit={verdict.level}>
      <Icon size={11} aria-hidden />
      {verdict.label}
    </span>
  );
}

/**
 * The reason, in one short line. `quiet` hides plain "good fit" general advice (the device description already says
 * it). Temperatures follow the player's °C / °F setting.
 */
export function FitLine({ verdict, quiet = true, className, testId }: { verdict: FitVerdict | null | undefined; quiet?: boolean; className?: string; testId?: string }) {
  const unit = useSettings((s) => s.tempUnit);
  if (!verdict) return null;
  if (quiet && verdict.level === 'ok' && verdict.general) return null;
  const tone = verdict.level === 'ok' ? (verdict.general ? 'muted' : 'good') : verdict.soft ? 'muted' : FIT_TONE[verdict.level];
  const Icon = verdict.level === 'ok' ? (verdict.general ? Info : CircleCheck) : verdict.blocked ? Ban : verdict.soft ? Info : ICON[verdict.level];
  const boxed = verdict.level !== 'ok' && !verdict.soft;
  return (
    <div className={clsx('ag-fit', `is-${tone}`, boxed && 'is-boxed', className)} data-testid={testId} role={verdict.level === 'harmful' ? 'alert' : undefined}>
      <Icon size={12} aria-hidden className="ag-fit__icon" />
      <span>
        {boxed && <span className="ag-fit__word">{verdict.label}.</span>}
        {convertTempText(verdict.text, unit)}
      </span>
    </div>
  );
}

/** "Eaten here by 3 lined seahorses" + a dry / hand-fed chip, for food rows. */
export function FoodEaters({ fit, className }: { fit: FoodFit | null | undefined; className?: string }) {
  if (!fit) return null;
  const none = fit.level === 'useless';
  return (
    <div className={clsx('ag-foodfit', className)} data-testid={`food-eaters-${fit.foodId}`} data-autofeeder={fit.autofeeder ? 'yes' : 'no'}>
      <span className={clsx('ag-fit', none ? 'is-watch' : 'is-muted')}>
        {none ? <Ban size={12} aria-hidden className="ag-fit__icon" /> : <Users size={12} aria-hidden className="ag-fit__icon" />}
        <span>{fit.text}</span>
      </span>
      <span className={clsx('ag-fitbadge', fit.autofeeder ? 'is-aqua' : 'is-neutral')} title={fit.formText}>
        {fit.autofeeder ? <Clock size={11} aria-hidden /> : <Hand size={11} aria-hidden />}
        {fit.autofeeder ? 'Autofeeder OK' : 'Hand-feed'}
      </span>
    </div>
  );
}
