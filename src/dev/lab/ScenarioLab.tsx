/**
 * The scenario lab screen (chunk 15, ADR-0051): describe a setup and play it in seconds. Presets (built in, and the
 * owner's own kept in this browser), an editor for the shop, its tanks and animals and the market around them, the
 * recipe as JSON (copy, paste, import and export a file, a link), the problems and the game's own verdicts while
 * editing, and Build and play. Its own chunk, loaded only where the developer tools are allowed.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Copy, Download, FlaskConical, Info, Link2, Play, Plus, Save, Trash2, Upload, X, Camera, CopyPlus } from 'lucide-react';
import type { WaterClass } from '@/types';
import { Badge, Button, Section, Segmented, Tabs, TextField, Toggle, type BadgeTone } from '@/ui/kit';
import { getGame, useGame } from '@/state/game';
import { platform } from '@/platform';
import { useLab, closeLab } from '@/state/lab';
import { ALL_SPECIES, findSpecies, STARTER_IDS } from '@/data/species';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { FACILITY_LEVELS } from '@/data/facilities';
import { STAFF_TRAITS } from '@/data/staff';
import { ILLNESSES } from '@/sim/life/illness';
import { loadFixtureRegistry } from '../fixtures/lazy';
import { PRESETS, type PresetGroup } from '../scenario/presets';
import { RECIPE_FORMAT, RECIPE_VERSION, type AnimalRecipe, type EquipmentRecipe, type ScenarioRecipe, type TankRecipe } from '../scenario/recipe';
import { validateRecipe, type Validation } from '../scenario/validate';
import { captureRecipe } from '../scenario/capture';
import { morphNames } from '../scenario/genes';
import { encodeRecipeParam } from '../scenario/link';
import { slugOf } from '../scenario/build';
import { deletePreset, loadDraft, savedPresets, savePreset, saveDraft } from '../scenario/store';
import { isPlainObject } from '../scenario/patch';
import { buildEnv, playRecipe } from './session';

type Tab = 'setup' | 'tanks' | 'business' | 'json';
type Edit = (fn: (r: ScenarioRecipe) => void) => void;

const WATER_CLASSES: { id: WaterClass; label: string }[] = [
  { id: 'freshwater_tropical', label: 'Tropical' },
  { id: 'freshwater_planted', label: 'Planted' },
  { id: 'freshwater_cool', label: 'Cold water' },
  { id: 'brackish', label: 'Brackish' },
  { id: 'marine_fowlr', label: 'Marine, fish only' },
  { id: 'marine_live_rock', label: 'Marine, live rock' },
  { id: 'reef', label: 'Reef' },
];
const WATER_FIELDS: { k: string; label: string; step: number }[] = [
  { k: 'tempC', label: 'Temp °C', step: 0.5 },
  { k: 'pH', label: 'pH', step: 0.1 },
  { k: 'ammonia', label: 'Ammonia', step: 0.05 },
  { k: 'nitrite', label: 'Nitrite', step: 0.05 },
  { k: 'nitrate', label: 'Nitrate', step: 5 },
  { k: 'oxygen', label: 'O₂ 0–1', step: 0.05 },
  { k: 'salinitySG', label: 'Salt SG', step: 0.001 },
  { k: 'bioMaturity', label: 'Bacteria 0–1', step: 0.05 },
];
const PROBLEMS: { id: string; failed: 'off' | 'stuck_on'; label: string }[] = [
  { id: 'heater', failed: 'stuck_on', label: 'Heater stuck on' },
  { id: 'heater', failed: 'off', label: 'Heater broken' },
  { id: 'filter', failed: 'off', label: 'Filter stopped' },
  { id: 'chiller', failed: 'off', label: 'Chiller stopped' },
];
const SEXES = ['auto', 'pair', 'mixed', 'females', 'male', 'female'];
const GROUPS: PresetGroup[] = ['Start', 'Problems', 'Breeding', 'Showpieces', 'Running a business'];
const SPECIES = [...ALL_SPECIES].sort((a, b) => a.commonName.localeCompare(b.commonName));
const ENV_LABEL: Record<string, string> = { freshwater: 'Freshwater', marine: 'Marine', brackish: 'Brackish' };

const blankRecipe = (): ScenarioRecipe => structuredClone(PRESETS[0].recipe);
const toNum = (v: string): number | undefined => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));
const setOrDelete = <T extends object, K extends keyof T>(o: T, k: K, v: T[K] | undefined) => {
  if (v === undefined) delete o[k];
  else o[k] = v;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function initialRecipe(): ScenarioRecipe {
  const playing = useLab.getState().scenario?.recipe;
  if (isPlainObject(playing)) return structuredClone(playing) as unknown as ScenarioRecipe;
  return loadDraft() ?? blankRecipe();
}

/** A labelled small field (the dev panel's compact style). */
function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={clsx('ag-labfield', wide && 'ag-labfield--wide')}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, step, placeholder, testId, min, max }: { value: number | undefined; onChange: (v: number | undefined) => void; step?: number; placeholder?: string; testId?: string; min?: number; max?: number }) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) setText(value === undefined ? '' : String(value));
    last.current = value;
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? 'any'}
      min={min}
      max={max}
      placeholder={placeholder ?? 'auto'}
      value={text}
      data-testid={testId}
      onChange={(e) => {
        setText(e.target.value);
        const v = toNum(e.target.value);
        last.current = v;
        onChange(v);
      }}
    />
  );
}

function SpeciesSelect({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
      {!findSpecies(value) && <option value={value}>{value || 'Choose…'}</option>}
      {(['freshwater', 'brackish', 'marine'] as const).map((env) => (
        <optgroup key={env} label={ENV_LABEL[env]}>
          {SPECIES.filter((s) => s.environment === env).map((s) => (
            <option key={s.id} value={s.id}>
              {s.commonName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ───────────── animals, young and tanks ─────────────

function AnimalRow({ a, at, onChange, onRemove }: { a: AnimalRecipe; at: string; onChange: (fn: (a: AnimalRecipe) => void) => void; onRemove: () => void }) {
  const sp = findSpecies(a.species);
  const morphs = useMemo(() => (sp ? morphNames(sp) : []), [sp]);
  const listId = `${at}-morphs`;
  const names = a.names ?? (a.name ? [a.name] : []);
  return (
    <div className="ag-labanimal" data-testid={`${at}`}>
      <div className="ag-labgrid ag-labgrid--animal">
        <Field label="Species" wide>
          <SpeciesSelect value={a.species} onChange={(v) => onChange((x) => { x.species = v; delete x.morph; delete x.genes; })} testId={`${at}-species`} />
        </Field>
        <Field label="Count">
          <NumberInput value={a.count} min={1} max={200} step={1} placeholder="1" onChange={(v) => onChange((x) => setOrDelete(x, 'count', v))} testId={`${at}-count`} />
        </Field>
        <Field label="Sex">
          <select value={a.sex ?? 'auto'} onChange={(e) => onChange((x) => setOrDelete(x, 'sex', e.target.value === 'auto' ? undefined : (e.target.value as AnimalRecipe['sex'])))}>
            {SEXES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Age (days)">
          <NumberInput value={a.ageDays} step={1} placeholder={a.stage ?? 'adult'} onChange={(v) => onChange((x) => setOrDelete(x, 'ageDays', v))} />
        </Field>
        <Field label="Stage">
          <select value={a.stage ?? 'adult'} onChange={(e) => onChange((x) => setOrDelete(x, 'stage', e.target.value === 'adult' ? undefined : (e.target.value as AnimalRecipe['stage'])))}>
            <option value="juvenile">juvenile</option>
            <option value="adult">adult</option>
            <option value="elder">elder</option>
          </select>
        </Field>
        <Field label={`Morph (${morphs.length})`} wide>
          <input list={listId} value={a.morph ?? ''} placeholder="random" onChange={(e) => onChange((x) => setOrDelete(x, 'morph', e.target.value.trim() ? e.target.value : undefined))} data-testid={`${at}-morph`} />
          <datalist id={listId}>
            {morphs.slice(0, 600).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <Field label="Prismatic">
          <NumberInput value={a.prismatic === true ? (a.count ?? 1) : typeof a.prismatic === 'number' ? a.prismatic : undefined} step={1} min={0} placeholder="0" onChange={(v) => onChange((x) => setOrDelete(x, 'prismatic', v ? v : undefined))} testId={`${at}-prismatic`} />
        </Field>
        <Field label="Health">
          <NumberInput value={a.stats?.health} step={5} min={0} max={100} onChange={(v) => onChange((x) => { x.stats = { ...x.stats }; setOrDelete(x.stats, 'health', v); if (!Object.keys(x.stats).length) delete x.stats; })} />
        </Field>
        <Field label="Hunger">
          <NumberInput value={a.stats?.hunger} step={5} min={0} max={100} onChange={(v) => onChange((x) => { x.stats = { ...x.stats }; setOrDelete(x.stats, 'hunger', v); if (!Object.keys(x.stats).length) delete x.stats; })} testId={`${at}-hunger`} />
        </Field>
        <Field label="Stress">
          <NumberInput value={a.stats?.stress} step={5} min={0} max={100} onChange={(v) => onChange((x) => { x.stats = { ...x.stats }; setOrDelete(x.stats, 'stress', v); if (!Object.keys(x.stats).length) delete x.stats; })} />
        </Field>
        <Field label="Illness">
          <select value={a.illness?.kind ?? ''} onChange={(e) => onChange((x) => setOrDelete(x, 'illness', e.target.value ? { kind: e.target.value, severity: x.illness?.severity ?? 40 } : undefined))}>
            <option value="">none</option>
            {Object.keys(ILLNESSES).map((k) => (
              <option key={k} value={k}>
                {k.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Breed">
          <select value={a.breed ?? ''} onChange={(e) => onChange((x) => setOrDelete(x, 'breed', e.target.value ? (e.target.value as AnimalRecipe['breed']) : undefined))} data-testid={`${at}-breed`}>
            <option value="">no</option>
            <option value="ready">ready to spawn</option>
            <option value="spawned">already spawned</option>
          </select>
        </Field>
        <Field label="Names (comma-separated)" wide>
          <input
            value={names.join(', ')}
            placeholder="the game names them"
            onChange={(e) =>
              onChange((x) => {
                const list = e.target.value.split(',').map((n) => n.trim());
                delete x.name;
                setOrDelete(x, 'names', list.some(Boolean) ? list : undefined);
              })
            }
            data-testid={`${at}-names`}
          />
        </Field>
      </div>
      <button type="button" className="ag-labicon" onClick={onRemove} aria-label="Remove these animals" title="Remove">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function TankEditor({ t, i, edit, open, onToggle }: { t: TankRecipe; i: number; edit: Edit; open: boolean; onToggle: () => void }) {
  const at = `lab-tank-${i}`;
  const up = (fn: (t: TankRecipe) => void) => edit((r) => fn(r.tanks![i]));
  const animals = t.animals ?? [];
  const young = t.young ?? [];
  const eq = (t.equipment ?? []).map((e) => (typeof e === 'string' ? { id: e } : e)) as EquipmentRecipe[];
  const hasProblem = (p: (typeof PROBLEMS)[number]) => eq.some((e) => e.id === p.id && e.failed === p.failed);
  const others = eq.filter((e) => !PROBLEMS.some((p) => p.id === e.id && p.failed === e.failed)).length;
  const count = animals.reduce((n, a) => n + (typeof a.count === 'number' ? a.count : 1), 0);
  return (
    <div className={clsx('ag-labtank', open && 'is-open')} data-testid={at}>
      <div className="ag-labtank__head">
        <button type="button" className="ag-labtank__toggle" onClick={onToggle} aria-expanded={open}>
          <b>{t.name || `Tank ${i + 1}`}</b>
          <span className="ag-small ag-muted">
            {typeof t.size === 'number' ? `${t.size} gal` : TANK_TIERS.find((x) => x.id === t.size)?.gallons ? `${TANK_TIERS.find((x) => x.id === t.size)!.gallons} gal` : 'sized for its animals'} · {WATER_CLASSES.find((w) => w.id === t.water)?.label ?? 'water for its animals'} · {count} animal{count === 1 ? '' : 's'}
            {young.length ? ` · ${young.reduce((n, y) => n + (y.count ?? 0), 0)} young` : ''}
          </span>
        </button>
        <button type="button" className="ag-labicon" title="Duplicate" aria-label="Duplicate this tank" onClick={() => edit((r) => r.tanks!.splice(i + 1, 0, { ...structuredClone(t), name: `${t.name} copy` }))}>
          <CopyPlus size={15} />
        </button>
        <button type="button" className="ag-labicon" title="Remove" aria-label="Remove this tank" onClick={() => edit((r) => r.tanks!.splice(i, 1))} data-testid={`${at}-remove`}>
          <Trash2 size={15} />
        </button>
      </div>
      {open && (
        <div className="ag-labtank__body">
          <div className="ag-labgrid">
            <Field label="Name" wide>
              <input value={t.name} onChange={(e) => up((x) => (x.name = e.target.value))} data-testid={`${at}-name`} />
            </Field>
            <Field label="Size">
              <select value={typeof t.size === 'string' ? t.size : ''} onChange={(e) => up((x) => setOrDelete(x, 'size', e.target.value || undefined))} data-testid={`${at}-size`}>
                <option value="">for its animals</option>
                {TANK_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.gallons} gal
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Water">
              <select value={t.water ?? ''} onChange={(e) => up((x) => setOrDelete(x, 'water', (e.target.value || undefined) as WaterClass | undefined))} data-testid={`${at}-water`}>
                <option value="">for its animals</option>
                {WATER_CLASSES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Purpose">
              <select value={t.purpose ?? 'display'} onChange={(e) => up((x) => setOrDelete(x, 'purpose', e.target.value === 'display' ? undefined : (e.target.value as TankRecipe['purpose'])))}>
                {['display', 'nursery', 'quarantine', 'breeding'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Decor">
              <select value={Array.isArray(t.decor) ? 'list' : (t.decor ?? 'auto')} onChange={(e) => up((x) => setOrDelete(x, 'decor', e.target.value === 'auto' ? undefined : e.target.value === 'list' ? x.decor : 'none'))}>
                <option value="auto">automatic</option>
                <option value="none">none</option>
                {Array.isArray(t.decor) && <option value="list">{t.decor.length} pieces (JSON)</option>}
              </select>
            </Field>
            <Field label="Set up (days)">
              <NumberInput value={t.ageDays} step={1} min={0} placeholder={t.cycled === false ? '0' : '30'} onChange={(v) => up((x) => setOrDelete(x, 'ageDays', v))} />
            </Field>
            <Field label="Cycled">
              <select value={t.cycled === false ? 'no' : 'yes'} onChange={(e) => up((x) => setOrDelete(x, 'cycled', e.target.value === 'no' ? false : undefined))} data-testid={`${at}-cycled`}>
                <option value="yes">yes</option>
                <option value="no">no (new filter)</option>
              </select>
            </Field>
          </div>
          <div className="ag-labsub">Water (empty = what suits its animals)</div>
          <div className="ag-labgrid ag-labgrid--water">
            {WATER_FIELDS.map((f) => (
              <Field key={f.k} label={f.label}>
                <NumberInput
                  value={(t.values as Record<string, number> | undefined)?.[f.k]}
                  step={f.step}
                  onChange={(v) =>
                    up((x) => {
                      const vals: Record<string, number> = { ...(x.values as Record<string, number> | undefined) };
                      setOrDelete(vals, f.k, v);
                      setOrDelete(x, 'values', Object.keys(vals).length ? vals : undefined);
                    })
                  }
                  testId={`${at}-water-${f.k}`}
                />
              </Field>
            ))}
          </div>
          <div className="ag-labsub">Problems</div>
          <div className="ag-row ag-wrap" style={{ gap: 6 }}>
            {PROBLEMS.map((p) => (
              <button
                key={`${p.id}:${p.failed}`}
                type="button"
                className={clsx('ag-chip', 'ag-chip--sm', hasProblem(p) && 'is-selected')}
                aria-pressed={hasProblem(p)}
                onClick={() =>
                  up((x) => {
                    const list = (x.equipment ?? []).filter((e) => !(typeof e !== 'string' && e.id === p.id && e.failed === p.failed));
                    if (!hasProblem(p)) list.push({ id: p.id, failed: p.failed });
                    setOrDelete(x, 'equipment', list.length ? list : undefined);
                  })
                }
                data-testid={`${at}-problem-${p.id}-${p.failed}`}
              >
                {p.label}
              </button>
            ))}
            {others > 0 && <span className="ag-small ag-muted">+{others} more equipment in the JSON</span>}
          </div>
          <div className="ag-labsub">Animals</div>
          {animals.map((a, k) => (
            <AnimalRow
              key={k}
              a={a}
              at={`${at}-animal-${k}`}
              onChange={(fn) => up((x) => fn(x.animals![k]))}
              onRemove={() => up((x) => { x.animals!.splice(k, 1); if (!x.animals!.length) delete x.animals; })}
            />
          ))}
          <div className="ag-row ag-wrap" style={{ gap: 6 }}>
            <Button size="sm" onClick={() => up((x) => (x.animals = [...(x.animals ?? []), { species: x.animals?.at(-1)?.species ?? (x.water?.startsWith('marine') || x.water === 'reef' ? 'ocellaris_clownfish' : x.water === 'freshwater_cool' ? 'axolotl' : x.water === 'brackish' ? 'sailfin_molly' : 'neon_tetra'), count: 1 }]))} data-testid={`${at}-add-animal`}>
              <Plus size={14} /> Animals
            </Button>
            <Button size="sm" onClick={() => up((x) => (x.young = [...(x.young ?? []), { species: x.animals?.[0]?.species ?? 'fancy_guppy', stage: 'fry', count: 20 }]))} data-testid={`${at}-add-young`}>
              <Plus size={14} /> Eggs or fry
            </Button>
          </div>
          {young.map((y, k) => (
            <div className="ag-labanimal" key={k}>
              <div className="ag-labgrid">
                <Field label="Young of" wide>
                  <SpeciesSelect value={y.species} onChange={(v) => up((x) => (x.young![k].species = v))} />
                </Field>
                <Field label="Stage">
                  <select value={y.stage} onChange={(e) => up((x) => (x.young![k].stage = e.target.value as 'eggs' | 'larvae' | 'fry'))}>
                    <option value="eggs">eggs</option>
                    <option value="larvae">larvae</option>
                    <option value="fry">fry</option>
                  </select>
                </Field>
                <Field label="How many">
                  <NumberInput value={y.count} step={5} min={1} placeholder="20" onChange={(v) => up((x) => (x.young![k].count = v ?? 1))} />
                </Field>
              </div>
              <button type="button" className="ag-labicon" onClick={() => up((x) => { x.young!.splice(k, 1); if (!x.young!.length) delete x.young; })} aria-label="Remove the young" title="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────── the tabs ─────────────

function SetupTab({ r, edit, fixtures }: { r: ScenarioRecipe; edit: Edit; fixtures: string[] }) {
  const base = r.base ?? 'blank';
  const blank = base === 'blank';
  const s = r.shop ?? {};
  const shop = (fn: (s: NonNullable<ScenarioRecipe['shop']>) => void) =>
    edit((x) => {
      x.shop = { ...x.shop };
      fn(x.shop);
      if (!Object.keys(x.shop).length) delete x.shop;
    });
  const allUnlocked = (s.unlocks ?? (blank ? 'all' : undefined)) === 'all';
  const allResearch = (s.research ?? (blank ? 'all' : undefined)) === 'all';
  const guideDone = (s.guide ?? (blank ? 'done' : undefined)) !== 'on';
  const plenty = (s.inventory?.foods ?? (blank ? 'plenty' : undefined)) === 'plenty';
  const open = r.open ?? {};
  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void, testId: string) => (
    <div className="ag-labtoggle">
      <span>{label}</span>
      <Toggle label={label} checked={checked} onChange={onChange} testId={testId} />
    </div>
  );
  return (
    <>
      <Section title="Scenario">
        <div className="ag-labgrid">
          <Field label="Name" wide>
            <input value={r.name} onChange={(e) => edit((x) => (x.name = e.target.value))} data-testid="lab-name" />
          </Field>
          <Field label="Start from" wide>
            <select value={base} onChange={(e) => edit((x) => setOrDelete(x, 'base', e.target.value === 'blank' ? undefined : (e.target.value as ScenarioRecipe['base'])))} data-testid="lab-base">
              <option value="blank">A blank shop (everything unlocked)</option>
              <optgroup label="A new game with a starter">
                {STARTER_IDS.map((id) => (
                  <option key={id} value={`starter:${id}`}>
                    {findSpecies(id)?.commonName ?? id}
                  </option>
                ))}
              </optgroup>
              <optgroup label="A fixture">
                {(fixtures.length ? fixtures : base.startsWith('fixture:') ? [base.slice(8)] : []).map((f) => (
                  <option key={f} value={`fixture:${f}`}>
                    {f}
                  </option>
                ))}
              </optgroup>
              <option value="current" disabled={!getGame()}>
                The game on screen
              </option>
            </select>
          </Field>
          <Field label="Seed">
            <NumberInput value={r.seed} step={1} placeholder="1" onChange={(v) => edit((x) => setOrDelete(x, 'seed', v))} />
          </Field>
          <Field label="Notes" wide>
            <textarea rows={2} value={r.notes ?? ''} onChange={(e) => edit((x) => setOrDelete(x, 'notes', e.target.value || undefined))} />
          </Field>
        </div>
      </Section>
      <Section title="The shop">
        <div className="ag-labgrid">
          <Field label="Money">
            <NumberInput value={s.money} step={100} placeholder={blank ? '50000' : 'as it is'} onChange={(v) => shop((x) => setOrDelete(x, 'money', v))} testId="lab-money" />
          </Field>
          <Field label="Day">
            <NumberInput value={s.day} step={1} min={1} placeholder={blank ? '1' : 'as it is'} onChange={(v) => shop((x) => setOrDelete(x, 'day', v))} />
          </Field>
          <Field label="Hour (0–23)">
            <NumberInput value={s.hour} step={1} min={0} max={23.99} placeholder={blank ? '9' : 'as it is'} onChange={(v) => shop((x) => setOrDelete(x, 'hour', v))} />
          </Field>
          <Field label="Reputation">
            <NumberInput value={s.reputation} step={50} min={0} max={1000} placeholder="as it is" onChange={(v) => shop((x) => setOrDelete(x, 'reputation', v))} />
          </Field>
          <Field label="Facility" wide>
            <select value={s.facility ?? ''} onChange={(e) => shop((x) => setOrDelete(x, 'facility', (e.target.value || undefined) as never))} data-testid="lab-facility">
              <option value="">{blank ? 'Hobby room' : 'as it is'}</option>
              {FACILITY_LEVELS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="ag-labtoggles">
          {toggle('Everything unlocked', allUnlocked, (v) => shop((x) => setOrDelete(x, 'unlocks', v ? 'all' : blank ? 'none' : undefined)), 'lab-unlocks')}
          {toggle('All research finished', allResearch, (v) => shop((x) => setOrDelete(x, 'research', v ? 'all' : blank ? [] : undefined)), 'lab-research')}
          {toggle('Guide finished', guideDone, (v) => shop((x) => setOrDelete(x, 'guide', v ? (blank ? undefined : 'done') : 'on')), 'lab-guide')}
          {toggle('Plenty of food and salt', plenty, (v) => shop((x) => { x.inventory = { ...x.inventory }; setOrDelete(x.inventory, 'foods', v ? (blank ? undefined : 'plenty') : {}); if (!Object.keys(x.inventory).length) delete x.inventory; }), 'lab-food')}
          {toggle('Open to the public', s.openToPublic ?? (blank && !!s.facility && s.facility !== 'hobby_room'), (v) => shop((x) => (x.openToPublic = v)), 'lab-open-public')}
          {toggle('Live food room', !!s.foodRoom, (v) => shop((x) => setOrDelete(x, 'foodRoom', v || undefined)), 'lab-foodroom')}
          {toggle('Manual mode (automation held)', !!s.manualMode, (v) => shop((x) => setOrDelete(x, 'manualMode', v || undefined)), 'lab-manual')}
        </div>
      </Section>
      <Section title="When it opens">
        <div className="ag-labgrid">
          <Field label="Speed" wide>
            <Segmented
              size="sm"
              label="Speed"
              value={open.speed ?? 0}
              onChange={(v) => edit((x) => { x.open = { ...x.open }; setOrDelete(x.open, 'speed', v === 0 ? undefined : v); if (!Object.keys(x.open).length) delete x.open; })}
              items={[{ id: 0, label: 'Paused' }, { id: 1, label: '1×' }, { id: 3, label: '3×' }, { id: 10, label: '10×' }]}
              testIdPrefix="lab-speed-"
            />
          </Field>
          <Field label="View" wide>
            <Segmented
              size="sm"
              label="View"
              value={open.view ?? 'tank'}
              onChange={(v) => edit((x) => { x.open = { ...x.open }; setOrDelete(x.open, 'view', v === 'tank' ? undefined : v); if (!Object.keys(x.open).length) delete x.open; })}
              items={[{ id: 'tank', label: 'A tank' }, { id: 'facility', label: 'The room' }]}
            />
          </Field>
          <Field label="Tank in view" wide>
            <select value={open.tank ?? ''} onChange={(e) => edit((x) => { x.open = { ...x.open }; setOrDelete(x.open, 'tank', e.target.value || undefined); if (!Object.keys(x.open).length) delete x.open; })}>
              <option value="">the first</option>
              {(r.tanks ?? []).map((t, i) => (
                <option key={i} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Warm-up (game hours)">
            <NumberInput value={r.warmupHours} step={6} min={0} placeholder="0" onChange={(v) => edit((x) => setOrDelete(x, 'warmupHours', v))} testId="lab-warmup" />
          </Field>
        </div>
      </Section>
    </>
  );
}

function TanksTab({ r, edit }: { r: ScenarioRecipe; edit: Edit }) {
  const tanks = r.tanks ?? [];
  const [open, setOpen] = useState<Set<number>>(() => new Set(tanks.length === 1 ? [0] : []));
  return (
    <>
      {!tanks.length && <p className="ag-small ag-muted">No tanks yet.</p>}
      {tanks.map((t, i) => (
        <TankEditor key={i} t={t} i={i} edit={edit} open={open.has(i)} onToggle={() => setOpen((o) => { const n = new Set(o); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
      ))}
      <Button
        onClick={() => {
          edit((x) => (x.tanks = [...(x.tanks ?? []), { name: `Tank ${(x.tanks?.length ?? 0) + 1}`, size: 'g29', water: 'freshwater_tropical' }]));
          setOpen((o) => new Set([...o, tanks.length]));
        }}
        data-testid="lab-add-tank"
      >
        <Plus size={15} /> Add a tank
      </Button>
    </>
  );
}

function BusinessTab({ r, edit, names }: { r: ScenarioRecipe; edit: Edit; names: string[] }) {
  const staff = r.staff ?? [];
  const m = r.market ?? {};
  const shows = r.shows ?? {};
  const market = (fn: (m: NonNullable<ScenarioRecipe['market']>) => void) => edit((x) => { x.market = { ...x.market }; fn(x.market); if (!Object.keys(x.market).length) delete x.market; });
  const showsEdit = (fn: (s: NonNullable<ScenarioRecipe['shows']>) => void) => edit((x) => { x.shows = { ...x.shows }; fn(x.shows); if (!Object.keys(x.shows).length) delete x.shows; });
  return (
    <>
      <datalist id="lab-animal-names">
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <Section title="Staff">
        {staff.map((s, i) => (
          <div className="ag-labanimal" key={i}>
            <div className="ag-labgrid">
              <Field label="Role">
                <select value={s.role} onChange={(e) => edit((x) => { x.staff![i].role = e.target.value as never; delete x.staff![i].trait; })}>
                  <option value="aquarist">aquarist</option>
                  <option value="stock_manager">stock manager</option>
                  <option value="docent">docent</option>
                </select>
              </Field>
              <Field label="Skill (1–5)">
                <NumberInput value={s.skill} step={1} min={1} max={5} placeholder="3" onChange={(v) => edit((x) => setOrDelete(x.staff![i], 'skill', v))} />
              </Field>
              <Field label="Trait">
                <select value={s.trait ?? 'quick_learner'} onChange={(e) => edit((x) => (x.staff![i].trait = e.target.value as never))}>
                  {Object.values(STAFF_TRAITS)
                    .filter((t) => t.roles.includes(s.role))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Name">
                <input value={s.name ?? ''} placeholder="the game names them" onChange={(e) => edit((x) => setOrDelete(x.staff![i], 'name', e.target.value || undefined))} />
              </Field>
            </div>
            <button type="button" className="ag-labicon" onClick={() => edit((x) => { x.staff!.splice(i, 1); if (!x.staff!.length) delete x.staff; })} aria-label="Remove" title="Remove">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <div className="ag-row ag-wrap" style={{ gap: 8 }}>
          <Button size="sm" onClick={() => edit((x) => (x.staff = [...(x.staff ?? []), { role: 'aquarist', skill: 3 }]))} data-testid="lab-add-staff">
            <Plus size={14} /> Staff
          </Button>
          <Field label="Stock budget ($ a day)">
            <NumberInput value={r.stockBudget} step={10} min={0} placeholder="the shop's" onChange={(v) => edit((x) => setOrDelete(x, 'stockBudget', v))} />
          </Field>
        </div>
      </Section>
      <Section title="The shop's offers">
        {(m.offers ?? []).map((o, i) => (
          <div className="ag-labanimal" key={i}>
            <div className="ag-labgrid">
              <Field label="Species" wide>
                <SpeciesSelect value={o.species} onChange={(v) => market((x) => (x.offers![i].species = v))} />
              </Field>
              <Field label="Count">
                <NumberInput value={o.count} step={1} min={1} placeholder="1" onChange={(v) => market((x) => setOrDelete(x.offers![i], 'count', v))} />
              </Field>
              <Field label="Price">
                <NumberInput value={o.price} step={5} min={0} placeholder="the game's" onChange={(v) => market((x) => setOrDelete(x.offers![i], 'price', v))} />
              </Field>
              <Field label="Prismatic">
                <select value={o.prismatic ? 'yes' : 'no'} onChange={(e) => market((x) => setOrDelete(x.offers![i], 'prismatic', e.target.value === 'yes' || undefined))}>
                  <option value="no">no</option>
                  <option value="yes">yes</option>
                </select>
              </Field>
            </div>
            <button type="button" className="ag-labicon" onClick={() => market((x) => { x.offers!.splice(i, 1); if (!x.offers!.length) delete x.offers; })} aria-label="Remove" title="Remove">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <div className="ag-row ag-wrap" style={{ gap: 8 }}>
          <Button size="sm" onClick={() => market((x) => (x.offers = [...(x.offers ?? []), { species: 'betta' }]))} data-testid="lab-add-offer">
            <Plus size={14} /> Offer
          </Button>
          <div className="ag-labtoggle">
            <span>Clear the shop's own stock</span>
            <Toggle label="Clear the shop's own stock" checked={!!m.clearStock} onChange={(v) => market((x) => setOrDelete(x, 'clearStock', v || undefined))} />
          </div>
        </div>
      </Section>
      <Section title="For sale, with bids">
        {(m.listings ?? []).map((l, i) => (
          <div className="ag-labanimal" key={i}>
            <div className="ag-labgrid">
              <Field label="Animals (names, comma-separated)" wide>
                <input list="lab-animal-names" value={l.animals.join(', ')} onChange={(e) => market((x) => (x.listings![i].animals = e.target.value.split(',').map((n) => n.trim()).filter(Boolean)))} data-testid={`lab-listing-${i}-animals`} />
              </Field>
              <Field label="Reserve">
                <NumberInput value={l.reserve} step={5} min={0} placeholder="the game's" onChange={(v) => market((x) => setOrDelete(x.listings![i], 'reserve', v))} />
              </Field>
              <Field label="Bids waiting">
                <NumberInput value={typeof l.bids === 'number' ? l.bids : Array.isArray(l.bids) ? l.bids.length : undefined} step={1} min={0} max={12} placeholder="0" onChange={(v) => market((x) => setOrDelete(x.listings![i], 'bids', v))} />
              </Field>
            </div>
            <button type="button" className="ag-labicon" onClick={() => market((x) => { x.listings!.splice(i, 1); if (!x.listings!.length) delete x.listings; })} aria-label="Remove" title="Remove">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <Button size="sm" onClick={() => market((x) => (x.listings = [...(x.listings ?? []), { animals: names.slice(0, 1), bids: 2 }]))} data-testid="lab-add-listing">
          <Plus size={14} /> Listing
        </Button>
      </Section>
      <Section title="Shows">
        {(shows.entries ?? []).map((e, i) => (
          <div className="ag-labanimal" key={i}>
            <div className="ag-labgrid">
              <Field label="Animal" wide>
                <input list="lab-animal-names" value={e.animal} onChange={(ev) => showsEdit((x) => (x.entries![i].animal = ev.target.value))} />
              </Field>
              <Field label="Show">
                <select value={e.tier ?? 'club'} onChange={(ev) => showsEdit((x) => (x.entries![i].tier = ev.target.value as never))}>
                  {['club', 'regional', 'national', 'international'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="button" className="ag-labicon" onClick={() => showsEdit((x) => { x.entries!.splice(i, 1); if (!x.entries!.length) delete x.entries; })} aria-label="Remove" title="Remove">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <div className="ag-row ag-wrap" style={{ gap: 8 }}>
          <Button size="sm" onClick={() => showsEdit((x) => (x.entries = [...(x.entries ?? []), { animal: names[0] ?? '' }]))}>
            <Plus size={14} /> Show entry
          </Button>
          <div className="ag-labtoggle">
            <span>Show day (judging in an hour)</span>
            <Toggle label="Show day" checked={!!shows.showDay} onChange={(v) => showsEdit((x) => setOrDelete(x, 'showDay', v || undefined))} />
          </div>
        </div>
      </Section>
      {!!r.checks?.length && (
        <Section title="Checks">
          <ul className="ag-labchecks">
            {r.checks.map((c, i) => (
              <li key={i}>
                {c.name ?? `check ${i + 1}`} <span className="ag-muted">(after {c.afterHours} h)</span>
              </li>
            ))}
          </ul>
          <p className="ag-small ag-muted">Checks are for `npm run scenario` and tests; edit them in the JSON.</p>
        </Section>
      )}
    </>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function JsonTab({ text, setText, error, onLoad, flash }: { text: string; setText: (t: string) => void; error: string | null; onLoad: (r: ScenarioRecipe, label: string) => void; flash: (t: string, tone?: BadgeTone) => void }) {
  const hasGame = useGame((s) => !!s.game);
  const file = useRef<HTMLInputElement>(null);
  const readText = (raw: string, label: string) => {
    try {
      const v: unknown = JSON.parse(raw);
      const recipe = isPlainObject(v) && isPlainObject(v.recipe) ? v.recipe : v;
      if (isPlainObject(recipe) && recipe.format === 'aquarium-go-save') return flash('That is a save file: import it in Settings › Saves.', 'watch');
      if (!isPlainObject(recipe)) return flash('That isn’t a recipe (a JSON object).', 'danger');
      onLoad(recipe as unknown as ScenarioRecipe, label);
    } catch (e) {
      flash(`That isn’t JSON: ${(e as Error).message}`, 'danger');
    }
  };
  return (
    <div className="ag-labjson">
      <div className="ag-row ag-wrap" style={{ gap: 6 }}>
        <Button size="sm" onClick={() => void platform().clipboard.write(text).then((ok) => flash(ok ? 'Copied the recipe.' : 'Copying isn’t allowed here; select the text instead.', ok ? 'good' : 'watch'))} data-testid="lab-json-copy">
          <Copy size={14} /> Copy
        </Button>
        <Button size="sm" onClick={() => file.current?.click()}>
          <Upload size={14} /> Import file
        </Button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="lab-import"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void f.text().then((t) => readText(t, `Imported ${f.name}`));
          }}
        />
        <Button
          size="sm"
          onClick={() => {
            try {
              const r = JSON.parse(text) as ScenarioRecipe;
              download(`scenario_${slugOf(r.name ?? 'scenario')}.json`, `${JSON.stringify(r, null, 2)}\n`);
            } catch {
              flash('Fix the JSON first.', 'danger');
            }
          }}
          data-testid="lab-export"
        >
          <Download size={14} /> Export file
        </Button>
        <Button
          size="sm"
          disabled={!hasGame}
          title="Turn the game on screen into a recipe"
          onClick={() => {
            const g = getGame();
            if (g) onLoad(captureRecipe(g), 'Captured the game on screen');
          }}
          data-testid="lab-capture"
        >
          <Camera size={14} /> Capture the game
        </Button>
      </div>
      <textarea className="ag-labjson__text" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} data-testid="lab-json" aria-label="The recipe as JSON" />
      {error ? (
        <p className="ag-small ag-labjson__error" data-testid="lab-json-error">
          {error}
        </p>
      ) : (
        <p className="ag-small ag-muted">Changes here apply as you type (paste a recipe straight in). docs/SCENARIOS.md describes every field.</p>
      )}
    </div>
  );
}

// ───────────── the screen ─────────────

const VERDICT_TONE: Record<string, BadgeTone> = { excellent: 'good', usually_compatible: 'good', conditional: 'watch', high_risk: 'danger', incompatible: 'danger' };

export default function ScenarioLab() {
  const [recipe, setRecipe] = useState<ScenarioRecipe>(initialRecipe);
  const [tab, setTab] = useState<Tab>('setup');
  const [source, setSource] = useState<string | null>(null);
  const [mine, setMine] = useState<ScenarioRecipe[]>(() => savedPresets());
  const [msg, setMsg] = useState<{ text: string; tone: BadgeTone } | null>(null);
  const [busy, setBusy] = useState(false);
  const [fixtures, setFixtures] = useState<string[]>([]);
  const [v, setV] = useState<Validation | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const playing = useLab((s) => s.scenario);

  const flash = (text: string, tone: BadgeTone = 'aqua') => setMsg({ text, tone });
  const edit: Edit = (fn) =>
    setRecipe((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  const load = (r: ScenarioRecipe, label: string, from: string | null = null) => {
    const clean = structuredClone(r);
    setRecipe(clean);
    setJsonText(JSON.stringify(clean, null, 2));
    setJsonError(null);
    setSource(from);
    flash(`${label}: ${clean.name ?? 'a recipe'}`);
  };

  useEffect(() => {
    frame.current?.focus();
    loadFixtureRegistry()
      .then((reg) => setFixtures(Object.keys(reg).sort()))
      .catch(() => undefined);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLab();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the problems and the game's verdicts, a moment after each change; the draft is kept for a reload
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => {
      saveDraft(recipe);
      void buildEnv(recipe, { trial: true })
        .then((env) => {
          if (live) setV(validateRecipe(recipe, env));
        })
        .catch((e: unknown) => live && setV({ issues: [{ level: 'error', at: 'recipe', message: (e as Error).message }], counts: { tanks: 0, animals: 0, young: 0, staff: 0, listings: 0, offers: 0 }, tanks: [], names: [] }));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [recipe]);

  useEffect(() => {
    if (tab === 'json') {
      setJsonText(JSON.stringify(recipe, null, 2));
      setJsonError(null);
    }
    // only when the JSON tab opens: edits there drive the recipe, not the other way round
  }, [tab]);

  const onJson = (t: string) => {
    setJsonText(t);
    try {
      const parsed: unknown = JSON.parse(t);
      if (!isPlainObject(parsed)) throw new Error('a recipe is a JSON object');
      setRecipe(parsed as unknown as ScenarioRecipe);
      setJsonError(null);
    } catch (e) {
      setJsonError(`Not valid yet: ${(e as Error).message}`);
    }
  };

  const errors = v?.issues.filter((i) => i.level === 'error') ?? [];
  const isMine = mine.some((m) => m.name === recipe.name);
  const build = () => {
    if (busy) return;
    setBusy(true);
    const r: ScenarioRecipe = { format: RECIPE_FORMAT, ...recipe, version: recipe.version ?? RECIPE_VERSION };
    playRecipe(r)
      .catch((e: unknown) => flash((e as Error).message, 'danger'))
      .finally(() => setBusy(false));
  };
  const copyLink = () => {
    const builtIn = source?.startsWith('builtin:') ? PRESETS.find((p) => p.id === source.slice(8)) : undefined;
    const kept = mine.find((m) => m.name === recipe.name);
    const q = builtIn && same(builtIn.recipe, recipe) ? `scenario=${encodeURIComponent(builtIn.id)}` : kept && same(kept, recipe) ? `scenario=${encodeURIComponent(kept.name)}` : `recipe=${encodeRecipeParam(JSON.stringify(recipe))}`;
    const url = `${location.origin}${location.pathname}?${q}`;
    void platform().clipboard.write(url).then((ok) => flash(ok ? 'Copied a link to this scenario (it opens in a dev build on this Mac).' : url, ok ? 'good' : 'aqua'));
  };

  return (
    <div className="ag-lab" data-testid="lab-root">
      <div className="ag-lab__frame" role="dialog" aria-modal="true" aria-label="Scenario lab" tabIndex={-1} ref={frame}>
        <header className="ag-lab__head">
          <div>
            <span className="ag-overline">
              <FlaskConical size={13} /> Developer tool
            </span>
            <h2 className="ag-lab__title">Scenario lab</h2>
          </div>
          {playing && <span className="ag-small ag-muted ag-lab__playing">Playing: {playing.name}</span>}
          <button type="button" className="ag-labicon ag-lab__close" onClick={closeLab} aria-label="Close the lab" data-testid="lab-close">
            <X size={18} />
          </button>
        </header>
        <div className="ag-lab__body">
          <aside className="ag-lab__presets" aria-label="Presets">
            {GROUPS.map((group) => (
              <div key={group} className="ag-labpresets__group">
                <div className="ag-labsub">{group}</div>
                {PRESETS.filter((p) => p.group === group).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={clsx('ag-labpreset', source === `builtin:${p.id}` && 'is-on')}
                    title={p.recipe.notes}
                    onClick={() => load(p.recipe, 'Preset', `builtin:${p.id}`)}
                    data-testid={`lab-preset-${p.id}`}
                  >
                    {p.recipe.name}
                  </button>
                ))}
              </div>
            ))}
            <div className="ag-labpresets__group">
              <div className="ag-labsub">Yours (this browser)</div>
              {!mine.length && <p className="ag-small ag-muted">None yet: Save keeps the recipe under its name.</p>}
              {mine.map((m) => (
                <button key={m.name} type="button" className={clsx('ag-labpreset', source === `mine:${m.name}` && 'is-on')} onClick={() => load(m, 'Yours', `mine:${m.name}`)} data-testid={`lab-mine-${slugOf(m.name)}`}>
                  {m.name}
                </button>
              ))}
            </div>
            <div className="ag-row ag-wrap ag-labpresets__actions">
              <Button
                size="sm"
                onClick={() => {
                  if (!recipe.name?.trim()) return flash('Give it a name first.', 'watch');
                  if (savePreset(recipe)) {
                    setMine(savedPresets());
                    setSource(`mine:${recipe.name}`);
                    flash(`Kept "${recipe.name}" in this browser.`, 'good');
                  } else flash('This browser wouldn’t store it (private mode?). Export a file instead.', 'danger');
                }}
                data-testid="lab-save"
              >
                <Save size={14} /> Save
              </Button>
              <Button size="sm" onClick={() => load({ ...recipe, name: `${recipe.name} copy` }, 'Duplicated')} data-testid="lab-duplicate">
                <CopyPlus size={14} /> Duplicate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!isMine}
                onClick={() => {
                  deletePreset(recipe.name);
                  setMine(savedPresets());
                  setSource(null);
                  flash(`Deleted "${recipe.name}" from this browser (the editor keeps it until you change it).`);
                }}
                data-testid="lab-delete"
              >
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </aside>
          <main className="ag-lab__main">
            <Tabs
              value={tab}
              onChange={setTab}
              label="Scenario"
              testIdPrefix="lab-tab-"
              items={[
                { id: 'setup', label: 'Setup' },
                { id: 'tanks', label: `Tanks (${recipe.tanks?.length ?? 0})` },
                { id: 'business', label: 'Shop & market' },
                { id: 'json', label: 'JSON' },
              ]}
            />
            <div className="ag-lab__scroll">
              {tab === 'setup' && <SetupTab r={recipe} edit={edit} fixtures={fixtures} />}
              {tab === 'tanks' && <TanksTab r={recipe} edit={edit} />}
              {tab === 'business' && <BusinessTab r={recipe} edit={edit} names={v?.names ?? []} />}
              {tab === 'json' && <JsonTab text={jsonText} setText={onJson} error={jsonError} onLoad={(r, label) => load(r, label)} flash={flash} />}
            </div>
          </main>
          <aside className="ag-lab__side" aria-label="What it builds">
            <div className="ag-labsub">It builds</div>
            {v ? (
              <p className="ag-small" data-testid="lab-counts">
                {v.counts.tanks} tank{v.counts.tanks === 1 ? '' : 's'} · {v.counts.animals} animal{v.counts.animals === 1 ? '' : 's'}
                {v.counts.young ? ` · ${v.counts.young} young` : ''}
                {v.counts.staff ? ` · ${v.counts.staff} staff` : ''}
                {v.counts.listings ? ` · ${v.counts.listings} for sale` : ''}
              </p>
            ) : (
              <p className="ag-small ag-muted">Checking…</p>
            )}
            {v?.tanks.map((t) => (
              <div key={t.name} className="ag-labverdict" title={t.reason}>
                <span>
                  {t.name} <span className="ag-muted">· {t.gallons} gal · {t.animals}</span>
                </span>
                <Badge tone={VERDICT_TONE[t.verdict] ?? 'neutral'}>{t.verdict.replace('_', ' ')}</Badge>
              </div>
            ))}
            <div className="ag-labsub">Problems</div>
            <ul className="ag-labissues" data-testid="lab-issues">
              {v && !v.issues.length && <li className="ag-small ag-muted">None.</li>}
              {v?.issues.map((i, k) => (
                <li key={k} className={clsx('ag-labissue', `is-${i.level}`)} data-testid="lab-issue" data-level={i.level}>
                  {i.level === 'note' ? <Info size={13} aria-hidden /> : <AlertTriangle size={13} aria-hidden />}
                  <span>
                    <b>{i.at}</b> {i.message}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
        <footer className="ag-lab__foot">
          <span className={clsx('ag-small', 'ag-lab__msg', msg && `is-${msg.tone}`)} data-testid="lab-msg" aria-live="polite">
            {msg?.text ?? (errors.length ? `${errors.length} part${errors.length === 1 ? '' : 's'} will be skipped (see Problems).` : 'Opens paused, and never autosaves over your game.')}
          </span>
          <Button size="sm" variant="ghost" onClick={copyLink} data-testid="lab-copy-link">
            <Link2 size={14} /> Copy link
          </Button>
          <Button variant="primary" onClick={build} disabled={busy} data-testid="lab-build">
            <Play size={15} /> {busy ? 'Building…' : 'Build and play'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
