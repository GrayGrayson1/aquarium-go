/**
 * Tank card: water status first (GOOD / WATCH / DANGER with reasons and advice, exact values on request),
 * quick care actions, equipment + lighting, stocking, compatibility, beauty, exhibit, running cost, valuation.
 * Left side sheet on desktop, bottom sheet on phones. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Droplets,
  Droplet,
  Brush,
  Sparkles,
  FlaskConical,
  Thermometer,
  Snowflake,
  Filter as FilterIcon,
  Wind,
  Lamp,
  Fan,
  Waves,
  Gauge,
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
  ChevronDown,
  Coins,
  Tag,
  Users,
  Eye,
  Wrench,
  Power,
  Clock,
  Moon,
  Fish,
  Signpost,
  type LucideProps,
} from 'lucide-react';
import type { GameState, ParamStatus, Tank, EquipmentInstance, StatusLevel, LightPreset, EquipmentKind } from '@/types';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { getTankTier } from '@/data/catalog/tanks';
import { findSpecies } from '@/data/species'; // lane:qa-play
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getWaterReport, tankDailyCost } from '@/sim/water';
import { waterChange, topOff, cleanTank, dose, setEquipment, setLighting } from '@/sim/care';
import { evaluateTank } from '@/sim/compat';
import { beautyScore } from '@/sim/aquascape';
import { exhibitScore, isUnlocked, toggleSignage } from '@/sim/facility';
import { tankValuation, buySalt, SALT_PRICE_PER_KG } from '@/sim/economy'; // lane:qa-play: buySalt
import { creaturesInTank } from '@/sim/life';
import { Sheet } from '../common/Sheet';
import { useDockedCard } from '../hud/cardDock';
import { tankStatusReason } from '../common/tankStatus';
import { Portrait } from '../common/Portrait';
import { CompatView } from '../common/CompatView';
import { useShell } from '../common/shellStore';
import { safe, useGameThrottled } from '../common/safe';
import { act, tutorialFlag } from '../common/actions';
import { withFallback } from './waterFallback';
import {
  WATER_CLASS_LABEL,
  LIGHT_PRESET_LABEL,
  lightPresetsFor,
  EQUIPMENT_KIND_LABEL,
  convertTempText,
  formatTemp,
  cToF,
  titleCase,
  formatClock,
} from '../common/format';
import { Badge, Button, Chip, Meter, Section, Segmented, Slider, Stepper, StatusBadge, Tabs, Toggle, formatMoney, KV, Empty } from '../kit';
import { WaterChip } from '../screens/StarterReveal';
import { TankKeeperLine } from '../panels/visitors/TankKeeperLine'; // lane:staff

type TabId = 'water' | 'gear' | 'life' | 'value';

const STATUS_ICON = { good: CircleCheck, watch: TriangleAlert, danger: OctagonAlert } as const;
const STATUS_WORD: Record<StatusLevel, string> = { good: 'Good', watch: 'Watch', danger: 'Danger' };

const EQUIP_ICON: Partial<Record<EquipmentKind, ComponentType<LucideProps>>> = {
  filter: FilterIcon,
  heater: Thermometer,
  chiller: Snowflake,
  fan: Fan,
  light: Lamp,
  airstone: Wind,
  powerhead: Waves,
  wavemaker: Waves,
  skimmer: FlaskConical,
  uv: Sparkles,
  co2: Droplet,
  autofeeder: Clock,
  ato: Droplets,
  refugium: Droplets,
  lid: Gauge,
};

const FLOW_KINDS: EquipmentKind[] = ['filter', 'powerhead', 'wavemaker', 'airstone'];

// ───────────────────── Water tab ─────────────────────

function ParamRow({ p, exact, unit, open, onToggle }: { p: ParamStatus; exact: boolean; unit: 'C' | 'F'; open: boolean; onToggle: () => void }) {
  const Icon = STATUS_ICON[p.status] ?? CircleCheck;
  const display = p.key === 'temp' ? formatTemp(p.value, unit) : p.display;
  return (
    <li className={clsx('ag-param', `is-${p.status}`, open && 'is-open')} data-param={p.key}>
      <button type="button" className="ag-param__row" aria-expanded={open} onClick={onToggle}>
        <span className={clsx('ag-param__status', `is-${p.status}`)}>
          <Icon size={14} aria-hidden /> {STATUS_WORD[p.status]}
        </span>
        <span className="ag-param__label">{p.label}</span>
        <span className="ag-param__value">{exact ? display : p.status === 'good' ? 'In range' : p.status === 'watch' ? 'Drifting' : 'Out of range'}</span>
        <ChevronDown size={14} className="ag-param__chev" aria-hidden />
      </button>
      {open && (
        <div className="ag-param__detail">
          {!exact && <div className="ag-small">Reading: <strong>{display}</strong></div>}
          {p.ideal && <div className="ag-small ag-muted">Ideal: {convertTempText(p.ideal, unit)}</div>}
          {p.reason && <div className="ag-small">{convertTempText(p.reason, unit)}</div>}
          {p.advice && <div className="ag-reason__fix">{convertTempText(p.advice, unit)}</div>}
        </div>
      )}
    </li>
  );
}

function WaterTab({ game, tank }: { game: GameState; tank: Tank }) {
  const exact = useSettings((s) => s.advancedWater);
  const unit = useSettings((s) => s.tempUnit);
  const openParam = useShell((s) => s.openParam);
  // Bring an expanded parameter into view (the guide opens the card with one expanded).
  useEffect(() => {
    if (!openParam) return;
    const t = window.setTimeout(() => {
      document.querySelector(`[data-testid="tank-card"] [data-param="${CSS.escape(openParam)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 380);
    return () => window.clearTimeout(t);
  }, [openParam]);
  const raw = safe('getWaterReport', () => getWaterReport(game, tank.id), null);
  const report = withFallback(raw, game, tank.id);
  const marine = tank.environment === 'marine';
  const salty = marine || tank.environment === 'brackish'; // lane:brackish: brackish tanks dose marine salt too
  const planted = tank.waterClass === 'freshwater_planted';
  const reef = tank.waterClass === 'reef';
  const readOnly = false; // dev showcase worlds (?showcase=) are fully interactive in the game screen; they are simply never saved
  if (!report) return <Empty>Water data unavailable.</Empty>;
  const HeadIcon = STATUS_ICON[report.status] ?? CircleCheck;
  const ordered = [...report.params].sort((a, b) => ['danger', 'watch', 'good'].indexOf(a.status) - ['danger', 'watch', 'good'].indexOf(b.status));
  const care = (fn: (d: GameState) => ReturnType<typeof waterChange>, flag: string, sound: Parameters<typeof sfx>[0] = 'splash') => act(fn, { flag, sound });
  // lane:qa-play — residents that spawn on a "first cool rains" chill (axolotls, corydoras, goldfish): the breeding
  // hint asks for a cooler water change, so offer one. 25% with water ~5 °C cooler drops the tank ~1.2 °C — under the
  // 1.4 °C sudden-change stress line — and two of them give the ~2 °C drop the breeding cue looks for.
  const coolCue = safe('coolCue', () => creaturesInTank(game, tank.id).some((c) => !!findSpecies(c.speciesId)?.breeding?.conditions?.coolingTrigger), false);

  return (
    <>
      <div className={clsx('ag-waterhead', `is-${report.status}`)} data-testid="water-status">
        <HeadIcon size={22} aria-hidden className="ag-waterhead__icon" />
        <div className="ag-grow">
          <div className="ag-waterhead__word">{report.status === 'good' ? 'Healthy water' : report.status === 'watch' ? 'Keep an eye on it' : 'Act soon'}</div>
          <div className="ag-waterhead__line">{convertTempText(report.headline, unit)}</div>
        </div>
      </div>

      <div className="ag-miniStats">
        <Meter label="Stability" value={report.stability} tone="auto" display={`${Math.round(report.stability)}`} />
        <Meter label="Biological filter" value={report.cycleProgress * 100} tone="auto" display={report.cycleProgress >= 0.8 ? 'Mature' : report.cycleProgress >= 0.4 ? 'Establishing' : 'New'} />
      </div>

      {report.issues.length > 0 && (
        <ul className="ag-issues">
          {report.issues.slice(0, 4).map((i, k) => (
            <li key={k} className={`ag-reason ag-reason--${i.status === 'danger' ? 'danger' : i.status === 'watch' ? 'watch' : 'good'}`}>
              <span className="ag-reason__icon" aria-hidden>
                {i.status === 'danger' ? <OctagonAlert size={14} /> : <TriangleAlert size={14} />}
              </span>
              <div className="ag-reason__body">
                <div className="ag-reason__text">{convertTempText(i.text, unit)}</div>
                {i.advice && <div className="ag-reason__fix">{convertTempText(i.advice, unit)}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Section
        title="Parameters"
        actions={
          <div className="ag-row" style={{ gap: 8 }}>
            <Segmented size="sm" label="Temperature unit" value={unit} onChange={(u) => useSettings.getState().update({ tempUnit: u })} items={[{ id: 'C', label: '°C' }, { id: 'F', label: '°F' }]} />
            <label className="ag-exact">
              <span>Exact</span>
              <Toggle label="Show exact values" checked={exact} onChange={(v) => { useSettings.getState().update({ advancedWater: v }); if (v) tutorialFlag('read_water'); }} />
            </label>
          </div>
        }
      >
        <ul className="ag-params">
          {ordered.map((p) => (
            <ParamRow
              key={p.key}
              p={p}
              exact={exact}
              unit={unit}
              open={openParam === p.key}
              onToggle={() => {
                sfx('click');
                const next = openParam === p.key ? null : p.key;
                useShell.getState().set({ openParam: next });
                if (next) {
                  tutorialFlag('read_water');
                  tutorialFlag(`read_param:${p.key}`);
                }
              }}
            />
          ))}
        </ul>
      </Section>

      {!readOnly && (
        <Section title="Care">
          <div className="ag-careblock">
            <div className="ag-careblock__label">
              <Droplets size={15} aria-hidden /> Water change
            </div>
            <div className="ag-row" style={{ gap: 6 }}>
              <Button size="sm" data-testid="action-water-change-10" onClick={() => care((d) => waterChange(d, tank.id, 0.1), 'water_change')}>10%</Button>
              <Button size="sm" variant="primary" data-testid="action-water-change" onClick={() => care((d) => waterChange(d, tank.id, 0.25), 'water_change')}>25%</Button>
              <Button size="sm" data-testid="action-water-change-50" onClick={() => care((d) => waterChange(d, tank.id, 0.5), 'water_change')}>50%</Button>
              {coolCue && (
                <Button
                  size="sm"
                  data-testid="action-water-change-cool"
                  title="Replace 25% with water about 5 °C cooler (about −1 °C, gentle). Two of these give the “first cool rains” chill axolotls, corydoras and goldfish spawn on."
                  onClick={() => care((d) => waterChange(d, tank.id, 0.25, { newWaterTempC: Math.max(4, (d.tanks[tank.id]?.water.tempC ?? 18) - 5) }), 'water_change')}
                >
                  <Snowflake size={13} aria-hidden /> Cool 25%
                </Button>
              )}
            </div>
          </div>
          <div className="ag-carebtns">
            <CareBtn icon={Droplet} label="Top off" hint={`Level ${Math.round(tank.water.level * 100)}%`} testId="action-top-off" onClick={() => care((d) => topOff(d, tank.id), 'topped_off', 'bubble')} />
            <CareBtn icon={Brush} label="Clean glass" hint={`Algae ${Math.round(tank.water.algae)}%`} testId="action-clean-glass" onClick={() => care((d) => cleanTank(d, tank.id, 'glass'), 'cleaned_tank', 'bubble')} />
            <CareBtn icon={Sparkles} label="Vacuum gravel" hint={`Detritus ${Math.round(tank.water.detritus)}%`} testId="action-clean-gravel" onClick={() => care((d) => cleanTank(d, tank.id, 'gravel'), 'cleaned_tank', 'bubble')} />
            <CareBtn icon={FilterIcon} label="Rinse filter" testId="action-clean-filter" onClick={() => care((d) => cleanTank(d, tank.id, 'filter'), 'cleaned_tank', 'bubble')} />
          </div>
          <div className="ag-careblock">
            <div className="ag-careblock__label">
              <FlaskConical size={15} aria-hidden /> Dose
            </div>
            <div className="ag-row ag-wrap" style={{ gap: 6 }}>
              <Chip size="sm" onClick={() => care((d) => dose(d, tank.id, 'conditioner'), 'dosed', 'bubble')}>Conditioner</Chip>
              <Chip size="sm" onClick={() => care((d) => dose(d, tank.id, 'bacteria'), 'dosed', 'bubble')}>Bottled bacteria</Chip>
              {salty && <Chip size="sm" onClick={() => care((d) => dose(d, tank.id, 'salt'), 'dosed', 'bubble')}>Salt mix</Chip>}
              <Chip size="sm" onClick={() => care((d) => dose(d, tank.id, 'buffer'), 'dosed', 'bubble')}>Buffer</Chip>
              {planted && <Chip size="sm" onClick={() => care((d) => dose(d, tank.id, 'fertilizer'), 'dosed', 'bubble')}>Fertilizer</Chip>}
              {reef && <Chip size="sm" onClick={() => care((d) => dose(d, tank.id, 'coral_supplement'), 'dosed', 'bubble')}>Coral supplement</Chip>}
            </div>
            {salty && (
              <div className="ag-row ag-wrap" style={{ gap: 6, alignItems: 'center' }}>
                <span className="ag-small ag-muted">Salt in stock: {game.inventory.salt.toFixed(1)} kg</span>
                {/* lane:qa-play — a water change with no salt only said "buy salt first"; restock right here */}
                {game.inventory.salt < 5 && (
                  <Chip size="sm" onClick={() => act((d) => buySalt(d, 10), { sound: 'coin' })}>
                    Buy 10 kg · {formatMoney(10 * SALT_PRICE_PER_KG)}
                  </Chip>
                )}
              </div>
            )}
          </div>
        </Section>
      )}
    </>
  );
}

function CareBtn({ icon: I, label, hint, onClick, testId }: { icon: ComponentType<LucideProps>; label: string; hint?: string; onClick: () => void; testId?: string }) {
  return (
    <button type="button" className="ag-carebtn" onClick={onClick} data-testid={testId}>
      <I size={17} aria-hidden />
      <span className="ag-carebtn__label">{label}</span>
      {hint && <span className="ag-carebtn__hint">{hint}</span>}
    </button>
  );
}

// ───────────────────── Gear tab ─────────────────────

function flowLevel(v: number | undefined) {
  const x = v ?? 0.66;
  return x < 0.45 ? 'low' : x < 0.8 ? 'med' : 'high';
}
const FLOW_VALUE = { low: 0.33, med: 0.66, high: 1 } as const;

function EquipmentRow({ tank, e, readOnly }: { tank: Tank; e: EquipmentInstance; readOnly: boolean }) {
  const unit = useSettings((s) => s.tempUnit);
  const def = getEquipmentDef(e.defId);
  const kind = (def?.kind ?? (e.defId.split('_')[0] as EquipmentKind)) as EquipmentKind;
  const Icon = EQUIP_ICON[kind] ?? Wrench;
  const name = def?.name ?? `${EQUIPMENT_KIND_LABEL[kind] ?? titleCase(e.defId)}`;
  const set = (patch: { on?: boolean; setting?: number }, msg?: string) => act((d) => setEquipment(d, tank.id, e.id, patch), { toast: !!msg, message: msg, sound: 'click', flag: 'changed_equipment' });
  const cond = Math.round((e.condition ?? 1) * 100);
  const isTemp = kind === 'heater' || kind === 'chiller';
  const setting = e.setting ?? def?.stats.defaultSetting ?? (isTemp ? tank.water.tempC : 0.66);
  return (
    <div className={clsx('ag-equip', !e.on && 'is-off', e.failed && 'is-failed')}>
      <span className="ag-equip__icon" aria-hidden>
        <Icon size={17} />
      </span>
      <div className="ag-grow">
        <div className="ag-equip__name">{name}</div>
        <div className="ag-equip__meta">
          {e.failed ? (
            <span className="ag-down"><OctagonAlert size={11} aria-hidden /> Failed — replace or repair</span>
          ) : (
            <span>{e.on ? 'Running' : 'Off'} · condition {cond}%</span>
          )}
          {def && def.upkeep > 0 && <span> · {formatMoney(def.upkeep, { cents: true })}/day</span>}
        </div>
        {!readOnly && e.on && isTemp && (
          <div className="ag-equip__ctl">
            <span className="ag-small ag-muted">{kind === 'heater' ? 'Heat to' : 'Cool to'}</span>
            <Stepper
              label={`${name} setpoint`}
              value={setting}
              min={kind === 'heater' ? 18 : 10}
              max={kind === 'heater' ? 32 : 26}
              step={0.5}
              format={(v) => (unit === 'F' ? `${cToF(v).toFixed(0)} °F` : `${v.toFixed(1)} °C`)}
              onChange={(v) => set({ setting: v })}
            />
          </div>
        )}
        {!readOnly && e.on && FLOW_KINDS.includes(kind) && (
          <div className="ag-equip__ctl">
            <span className="ag-small ag-muted">Flow</span>
            <Segmented
              size="sm"
              label={`${name} flow`}
              value={flowLevel(e.setting)}
              onChange={(v) => set({ setting: FLOW_VALUE[v] })}
              items={[{ id: 'low', label: 'Gentle' }, { id: 'med', label: 'Medium' }, { id: 'high', label: 'Strong' }]}
            />
          </div>
        )}
      </div>
      {!readOnly && <Toggle label={`${name} power`} checked={e.on} onChange={(v) => set({ on: v }, `${name} ${v ? 'on' : 'off'}.`)} />}
    </div>
  );
}

function LightingBlock({ tank, readOnly }: { tank: Tank; readOnly: boolean }) {
  const L = tank.lighting;
  const set = (patch: Partial<{ preset: LightPreset; intensity: number; onHour: number; offHour: number; moonlight: boolean }>) =>
    act((d) => setLighting(d, tank.id, patch), { toast: false, sound: 'click', flag: 'changed_lights' });
  return (
    <div className="ag-lighting">
      <div className="ag-row ag-wrap" style={{ gap: 6 }}>
        {lightPresetsFor(tank.waterClass).map((p) => (
          <Chip key={p} size="sm" disabled={readOnly} selected={L.preset === p} onClick={() => set({ preset: p })}>
            {LIGHT_PRESET_LABEL[p]}
          </Chip>
        ))}
      </div>
      <div className="ag-row" style={{ gap: 12 }}>
        <span className="ag-small ag-muted" style={{ minWidth: 64 }}>Intensity</span>
        <Slider label="Light intensity" value={L.intensity} min={0} max={1.5} step={0.05} disabled={readOnly} onChange={(v) => set({ intensity: v })} />
        <span className="ag-small ag-tabular" style={{ minWidth: 38, textAlign: 'right' }}>{Math.round(L.intensity * 100)}%</span>
      </div>
      <div className="ag-sched">
        <div className="ag-sched__item">
          <span className="ag-small ag-muted">Lights on</span>
          <Stepper label="Lights on hour" value={L.onHour} min={0} max={23} step={1} disabled={readOnly} format={(v) => formatClock(v)} onChange={(v) => set({ onHour: v })} />
        </div>
        <div className="ag-sched__item">
          <span className="ag-small ag-muted">Lights off</span>
          <Stepper label="Lights off hour" value={L.offHour} min={0} max={23} step={1} disabled={readOnly} format={(v) => formatClock(v)} onChange={(v) => set({ offHour: v })} />
        </div>
      </div>
      <div className="ag-row">
        <span className="ag-grow ag-small">
          <Moon size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> Moonlight after dark
        </span>
        <Toggle label="Moonlight after dark" checked={L.moonlight} disabled={readOnly} onChange={(v) => set({ moonlight: v })} />
      </div>
    </div>
  );
}

function GearTab({ game, tank }: { game: GameState; tank: Tank }) {
  const readOnly = false; // dev showcase worlds (?showcase=) are fully interactive in the game screen; they are simply never saved
  return (
    <>
      <Section title={<><Wrench size={12} aria-hidden /> Equipment</>}>
        {tank.equipment.length === 0 ? (
          <Empty icon={<Power size={18} />}>No equipment installed.</Empty>
        ) : (
          <div className="ag-equiplist">
            {tank.equipment.map((e) => (
              <EquipmentRow key={e.id} tank={tank} e={e} readOnly={readOnly} />
            ))}
          </div>
        )}
      </Section>
      <Section title={<><Lamp size={12} aria-hidden /> Lighting</>}>
        <LightingBlock tank={tank} readOnly={readOnly} />
      </Section>
    </>
  );
}

// ───────────────────── Life tab ─────────────────────

function stockingWord(v: number) {
  return v < 0.5 ? 'Light' : v < 0.85 ? 'Comfortable' : v <= 1 ? 'Full' : 'Overstocked';
}

function LifeTab({ game, tank }: { game: GameState; tank: Tank }) {
  const residents = safe('creaturesInTank', () => creaturesInTank(game, tank.id), []);
  const compat = safe('evaluateTank', () => evaluateTank(game, tank.id), null);
  const beauty = safe('beautyScore', () => beautyScore(game, tank), null);
  const exhibit = safe('exhibitScore', () => exhibitScore(game, tank.id), null);
  const load = tank.cache.stockingLoad ?? 0;
  const selected = useUI((s) => s.selectedCreatureId);
  return (
    <>
      <Section title={<><Fish size={12} aria-hidden /> Residents · {residents.length}</>}>
        {residents.length === 0 ? (
          <Empty>No animals in this tank yet.</Empty>
        ) : (
          <div className="ag-residents">
            {residents.map((c) => (
              <button type="button" key={c.id} className={clsx('ag-resident', selected === c.id && 'is-selected')} onClick={() => { sfx('click'); useUI.getState().set({ selectedCreatureId: c.id }); }}>
                <Portrait subject={c} shape="circle" className="ag-resident__art" size={96} />
                <span className="ag-resident__name">{c.name}</span>
              </button>
            ))}
          </div>
        )}
        <Meter label="Stocking load" value={Math.min(load, 1.3) * 100} max={130} tone={load > 1 ? 'danger' : load > 0.85 ? 'watch' : 'good'} display={`${stockingWord(load)} · ${Math.round(load * 100)}%`} />
      </Section>
      <Section title="Compatibility">
        <CompatView report={compat} compact />
      </Section>
      <Section title={<><Sparkles size={12} aria-hidden /> Beauty</>}>
        {beauty ? (
          <div className="ag-scoreblock">
            <ScoreRing value={beauty.score} label="Beauty" />
            <div className="ag-grow">
              {beauty.factors.slice(0, 4).map((f, i) => (
                <Meter key={i} label={f.label} value={f.value} display={f.note ?? Math.round(f.value)} />
              ))}
              {beauty.tips.length > 0 && (
                <ul className="ag-tips">
                  {beauty.tips.slice(0, 3).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <Empty>Beauty score unavailable.</Empty>
        )}
      </Section>
      <Section title={<><Eye size={12} aria-hidden /> Exhibit</>}>
        {exhibit ? (
          <div className="ag-scoreblock">
            <ScoreRing value={exhibit.score} label="Exhibit" tone="gold" />
            <div className="ag-grow">
              {exhibit.factors.slice(0, 4).map((f, i) => (
                <Meter key={i} label={f.label} value={f.value} display={f.note ?? Math.round(f.value)} />
              ))}
              <div className="ag-small ag-muted">
                <Users size={12} aria-hidden style={{ verticalAlign: '-2px' }} /> Draws about {exhibit.visitorAppeal.toFixed(1)} visitors/hour when open.
              </div>
            </div>
          </div>
        ) : (
          <Empty>Exhibit score unavailable.</Empty>
        )}
      </Section>
    </>
  );
}

function ScoreRing({ value, label, tone = 'aqua' }: { value: number; label: string; tone?: 'aqua' | 'gold' }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={clsx('ag-ring', `ag-ring--${tone}`)} role="img" aria-label={`${label} ${Math.round(v)} of 100`}>
      <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
        <circle cx="32" cy="32" r={r} className="ag-ring__track" />
        <circle cx="32" cy="32" r={r} className="ag-ring__fill" strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="ag-ring__val">{Math.round(v)}</span>
    </div>
  );
}

// ───────────────────── Value tab ─────────────────────

function ValueTab({ game, tank }: { game: GameState; tank: Tank }) {
  const report = safe('getWaterReport', () => getWaterReport(game, tank.id), null);
  const daily = report?.dailyCost || safe('tankDailyCost', () => tankDailyCost(game, tank), 0);
  const val = safe('tankValuation', () => tankValuation(game, tank.id), null);
  const readOnly = false; // dev showcase worlds (?showcase=) are fully interactive in the game screen; they are simply never saved
  const signageOk = safe('isUnlocked', () => isUnlocked(game, 'signage'), false);
  return (
    <>
      <Section title={<><Coins size={12} aria-hidden /> Running cost</>}>
        <div className="ag-statrow">
          <div className="ag-bigstat">
            <span className="ag-bigstat__val">{formatMoney(daily, { cents: daily < 10 })}</span>
            <span className="ag-bigstat__label">per day</span>
          </div>
          <div className="ag-bigstat">
            <span className="ag-bigstat__val">{formatMoney(daily * 30)}</span>
            <span className="ag-bigstat__label">per 30 days</span>
          </div>
        </div>
      </Section>
      <Section title={<><Tag size={12} aria-hidden /> What it’s worth</>}>
        {val ? (
          <>
            <div className="ag-valuation">
              <div className="ag-valuation__expected">{formatMoney(val.expected)}</div>
              <div className="ag-small ag-muted">Likely range {formatMoney(val.low)} – {formatMoney(val.high)}</div>
            </div>
            {val.parts.length > 0 && (
              <div>
                {val.parts.map((p, i) => (
                  <KV key={i} label={p.label} hint={p.note}>{formatMoney(p.amount)}</KV>
                ))}
              </div>
            )}
            {val.modifiers.length > 0 && (
              <div>
                {val.modifiers.map((m, i) => (
                  <KV key={i} label={m.label} hint={m.note}>
                    <span className={m.mult > 1.001 ? 'ag-up' : m.mult < 0.999 ? 'ag-down' : ''}>×{m.mult.toFixed(2)}</span>
                  </KV>
                ))}
              </div>
            )}
          </>
        ) : (
          <Empty>Valuation unavailable.</Empty>
        )}
        {!readOnly && (
          <Button variant="coral" block onClick={() => { sfx('open'); useUI.getState().set({ panel: 'market', panelTarget: `list:tank:${tank.id}` }); }} disabled={!!tank.listingId}>
            <Tag size={16} /> {tank.listingId ? 'Already listed' : 'List this aquarium'}
          </Button>
        )}
      </Section>
      {!readOnly && signageOk && (
        <Section title={<><Signpost size={12} aria-hidden /> Visitors</>}>
          <div className="ag-row">
            <span className="ag-grow ag-small">Educational sign — visitors learn about the animals (and enjoy it more).</span>
            <Toggle label="Educational sign" checked={tank.signage} onChange={() => act((d) => toggleSignage(d, tank.id), { toast: false, sound: 'place' })} />
          </div>
        </Section>
      )}
    </>
  );
}

// ───────────────────── Card ─────────────────────

export function TankCard() {
  const open = useShell((s) => s.tankCardOpen);
  const focused = useUI((s) => s.focusedTankId);
  const docked = useDockedCard();
  const game = useGameThrottled(500);
  const tank = focused && game ? game.tanks[focused] : null;
  const [tab, setTab] = useState<TabId>('water');
  useEffect(() => {
    if (open && tank && !game?.isShowcase) tutorialFlag('opened_tank_card');
  }, [open, tank?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tier = useMemo(() => (tank ? safe('tier', () => getTankTier(tank.tierId), null) : null), [tank?.tierId]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = open && !!tank && docked === 'tank';
  const close = () => useShell.getState().set({ tankCardOpen: false });
  const header: ReactNode = tank ? (
    <div className="ag-thead">
      <div className="ag-overline">{tier ? (/gallon/i.test(tier.name) ? tier.name : `${tier.name} · ${tier.gallons} gal`) : 'Aquarium'}</div>
      <h2 className="ag-thead__name">{tank.name}</h2>
      <div className="ag-row ag-wrap" style={{ gap: 6 }}>
        <WaterChip wc={tank.waterClass} size="sm" />
        <StatusBadge status={tank.cache.status} label={tank.cache.status === 'good' ? 'Healthy' : undefined} />
        {tank.purpose !== 'display' && <Badge tone="violet">{titleCase(tank.purpose)}</Badge>}
      </div>
      {tank.cache.status !== 'good' && game && (
        <div className={clsx('ag-thead__reason', `is-${tank.cache.status}`)} data-testid="tank-status-reason">
          {safe('tankStatusReason', () => tankStatusReason(game, tank.id), '')}
        </div>
      )}
      {game && <TankKeeperLine game={game} tank={tank} /> /* lane:staff */}
    </div>
  ) : null;
  return (
    <Sheet open={visible} onClose={close} side="left" testId="tank-card" label="Tank card" className="ag-tcard" header={header}>
      {tank && game && (
        <>
          <div className="ag-tcard__tabs">
            <Tabs<TabId>
              value={tab}
              onChange={(t) => {
                setTab(t);
                document.querySelector('[data-testid="tank-card"] .ag-sheet__body')?.scrollTo({ top: 0 });
                tutorialFlag(`tank_tab_${t}`);
              }}
              items={[
                { id: 'water', label: 'Water' },
                { id: 'gear', label: 'Equipment' },
                { id: 'life', label: 'Life' },
                { id: 'value', label: 'Value' },
              ]}
            />
          </div>
          <div className="ag-tcard__content">
            {tab === 'water' && <WaterTab game={game} tank={tank} />}
            {tab === 'gear' && <GearTab game={game} tank={tank} />}
            {tab === 'life' && <LifeTab game={game} tank={tank} />}
            {tab === 'value' && <ValueTab game={game} tank={tank} />}
          </div>
        </>
      )}
    </Sheet>
  );
}

export { WATER_CLASS_LABEL };
