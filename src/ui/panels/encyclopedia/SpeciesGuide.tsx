/**
 * lane:guide — Keeper's guide blocks for a species, shared by the encyclopedia page, the creature card and the
 * livestock panel: what it eats grouped by food TYPE (dry / frozen / live / fresh), whether an autofeeder can feed it,
 * its flow and temperature needs, and "In real life" tips. Pure presentation over `src/data/species/guide.ts`.
 * Styles live in ./guide.css (`ag-sg-*`), built on the shared tokens so they sit in panels and cards alike.
 */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Wheat, Snowflake, Bug, Leaf, CookingPot, Utensils, CircleCheck, Ban, Wind, Thermometer, Lightbulb, BookOpen, Sprout } from 'lucide-react';
import type { SpeciesDefinition } from '@/types';
import { findSpecies } from '@/data/species';
import { useSettings } from '@/state/settings';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { convertTempText } from '@/ui/common/format';
import { dietGuide, feedingLine, realLifeTips, temperatureGuide, FLOW_GUIDE, FOOD_FORM_HINT, FOOD_FORM_LABEL, type FoodForm } from '@/data/species/guide';
import './guide.css';

const FORM_ICON: Record<FoodForm, ReactNode> = {
  dry: <Wheat size={12} aria-hidden />,
  frozen: <Snowflake size={12} aria-hidden />,
  live: <Bug size={12} aria-hidden />,
  fresh: <Leaf size={12} aria-hidden />,
  prepared: <CookingPot size={12} aria-hidden />,
};

/** Plain text with °C values shown in the player's unit. */
export function useGuideText(): (text: string) => string {
  const unit = useSettings((s) => s.tempUnit);
  return (text: string) => convertTempText(text, unit) ?? text;
}

/** Food-type tag ("Frozen") with its keeper hint as a tooltip. */
export function FoodFormTag({ form, label }: { form: FoodForm; label?: string }) {
  return (
    <span className={clsx('ag-sg-form', `ag-sg-form--${form}`)} title={FOOD_FORM_HINT[form]}>
      {FORM_ICON[form]}
      {label ?? FOOD_FORM_LABEL[form]}
    </span>
  );
}

/** Autofeeder verdict: green tick when it can feed the animal, amber "no" (with what to do instead) when it can't. */
export function AutofeederVerdict({ sp, compact }: { sp: SpeciesDefinition; compact?: boolean }) {
  const af = dietGuide(sp).autofeeder;
  const ok = af.level === 'yes';
  return (
    <div className={clsx('ag-sg-af', ok ? 'is-ok' : 'is-no', compact && 'is-compact')} data-testid="guide-autofeeder" data-level={af.level}>
      <span className="ag-sg-af__icon" aria-hidden>
        {ok ? <CircleCheck size={14} /> : <Ban size={14} />}
      </span>
      <span className="ag-sg-af__body">
        <strong>{ok ? 'Autofeeder: can feed it' : 'Autofeeder: can’t feed it'}</strong>
        <span className="ag-sg-af__text">{af.text}</span>
      </span>
    </div>
  );
}

/** Diet: the feeding note, the shop foods it takes grouped by type, grazing, and the autofeeder verdict. */
export function DietGuideView({ sp, compact }: { sp: SpeciesDefinition; compact?: boolean }) {
  const d = dietGuide(sp);
  const tt = useGuideText();
  return (
    <div className={clsx('ag-sg-diet', compact && 'is-compact')} data-testid="guide-diet">
      <p className="ag-sg-lead">{tt(feedingLine(sp))}</p>
      {d.groups.length > 0 && (
        <ul className="ag-sg-groups" aria-label="Foods it eats, by type">
          {d.groups.map((g) => (
            <li key={g.form} className="ag-sg-group">
              <FoodFormTag form={g.form} label={g.label} />
              <span className="ag-sg-group__foods">{g.foods.map((f) => f.name).join(' · ')}</span>
            </li>
          ))}
          {d.forages && (
            <li className="ag-sg-group">
              <span className="ag-sg-form ag-sg-form--forage" title="Biofilm, algae and detritus that grow or settle in a mature tank.">
                <Sprout size={12} aria-hidden />
                In the tank
              </span>
              <span className="ag-sg-group__foods">Grazes biofilm and algae or scavenges leftovers between meals</span>
            </li>
          )}
        </ul>
      )}
      <AutofeederVerdict sp={sp} compact={compact} />
    </div>
  );
}

/** Flow and temperature in keeper terms. */
export function HabitatGuideView({ sp }: { sp: SpeciesDefinition }) {
  const tt = useGuideText();
  const flow = FLOW_GUIDE[sp.flowPreference];
  const temp = temperatureGuide(sp);
  return (
    <div className="ag-sg-needs" data-testid="guide-needs">
      <div className="ag-sg-need">
        <Thermometer size={14} aria-hidden />
        <span>
          <strong>{temp.label}.</strong> {tt(temp.text)}
        </span>
      </div>
      {flow && (
        <div className="ag-sg-need">
          <Wind size={14} aria-hidden />
          <span>
            <strong>{flow.label}.</strong> {flow.text}
          </span>
        </div>
      )}
    </div>
  );
}

/** "In real life" tips: the species' own tip, then data-backed special needs. Renders nothing when there are none. */
export function RealLifeTips({ sp, max = 4, title = 'In real life' }: { sp: SpeciesDefinition; max?: number; title?: string }) {
  const tt = useGuideText();
  const tips = realLifeTips(sp, max);
  if (!tips.length) return null;
  return (
    <div className="ag-sg-tips" data-testid="guide-tips">
      <div className="ag-sg-tips__title">
        <Lightbulb size={14} aria-hidden /> {title}
      </div>
      <ul>
        {tips.map((t, i) => (
          <li key={i}>{tt(t)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Opens this species' encyclopedia page. */
export function openSpeciesGuide(speciesId: string): void {
  sfx('open');
  useUI.getState().set({ panel: 'encyclopedia', panelTarget: `species:${speciesId}` });
}

/** Compact one-card care summary (livestock panel species filter). */
export function SpeciesCareStrip({ sp }: { sp: SpeciesDefinition }) {
  const d = dietGuide(sp);
  const tt = useGuideText();
  const temp = temperatureGuide(sp);
  const flow = FLOW_GUIDE[sp.flowPreference];
  return (
    <section className="ag-sg-strip" aria-label={`${sp.commonName} care summary`} data-testid="guide-strip">
      <div className="ag-sg-strip__head">
        <strong>{sp.commonName} care</strong>
        <button type="button" className="ag-sg-strip__link" onClick={() => openSpeciesGuide(sp.id)}>
          <BookOpen size={13} aria-hidden /> Full guide
        </button>
      </div>
      <div className="ag-sg-strip__row">
        {d.groups.map((g) => (
          <FoodFormTag key={g.form} form={g.form} />
        ))}
        <span className="ag-sg-strip__fact">
          <Thermometer size={12} aria-hidden /> {tt(`${sp.tempC.idealMin}–${sp.tempC.idealMax} °C`)} · {temp.label.toLowerCase()}
        </span>
        {flow && (
          <span className="ag-sg-strip__fact">
            <Wind size={12} aria-hidden /> {flow.label.toLowerCase()}
          </span>
        )}
      </div>
      <AutofeederVerdict sp={sp} compact />
    </section>
  );
}

/**
 * Tank card residents: which of these species only take frozen / live food, so an autofeeder can't feed them and
 * they must be fed by hand. Renders nothing when every resident can take dry food.
 */
export function HandFeedNote({ speciesIds }: { speciesIds: string[] }) {
  const rows = [...new Set(speciesIds)]
    .map((id) => findSpecies(id))
    .filter((sp): sp is SpeciesDefinition => !!sp)
    .map((sp) => ({ sp, d: dietGuide(sp) }))
    .filter((r) => r.d.autofeeder.level === 'no');
  if (!rows.length) return null;
  return (
    <div className="ag-sg-handfeed" data-testid="tank-handfeed">
      <Utensils size={13} aria-hidden />
      <span>
        <strong>Feed by hand:</strong>{' '}
        {rows.map((r, i) => (
          <span key={r.sp.id}>
            {i > 0 && ', '}
            <button type="button" className="ag-sg-handfeed__sp" title={r.d.autofeeder.text} onClick={() => openSpeciesGuide(r.sp.id)}>
              {r.sp.commonName}
            </button>{' '}
            ({r.d.groups.map((g) => g.form).join(' or ')} food only)
          </span>
        ))}
        . An autofeeder can’t feed {rows.length === 1 ? 'it' : 'them'}.
      </span>
    </div>
  );
}
