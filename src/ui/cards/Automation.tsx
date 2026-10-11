/**
 * Tank card › Equipment › Automation (0.5 spec §10.1–§10.3, §16 "Automation"; B-149) and the Water tab's "Auto-clean
 * is on" note. Switches unlocked by gear: Auto-feed runs the Autofeeder, Auto-clean the Auto Water Changer. A row
 * without its device says what is needed and sells it right here (or, before the unlock, how to unlock it). No new
 * simulation: the switches and the meals control write the device's `on` and `setting` through `setEquipment`.
 * OWNER: lane "ui-shell".
 */
import { useMemo } from 'react';
import clsx from 'clsx';
import { Clock, Droplets, Lock, Zap } from 'lucide-react';
import type { EquipmentInstance, GameState, Tank } from '@/types';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { setEquipment } from '@/sim/care';
import { canAutofeed, pickAutofeedFood } from '@/sim/care/autofeed';
import { type FitVerdict } from '@/sim/care/fit';
import { buyEquipment } from '@/sim/economy';
import { isUnlocked } from '@/sim/facility';
import { recommendedServings } from '@/sim/water';
import { inhabitantsOf } from '@/sim/water/env';
import { keeperOf } from '@/sim/staff/common';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { act } from '../common/actions';
import { safe } from '../common/safe';
import { foodName } from '../common/format';
import { FitLine } from '../common/FitNote';
import { Button, Section, Segmented, Toggle, formatMoney } from '../kit';

export const AUTOFEEDER_ID = 'autofeeder';
export const WATER_CHANGER_ID = 'auto_water_changer';
/** §10.2: the hint while the Autofeeder (and so the Auto Water Changer, which shares its unlock) is locked. */
export const AUTOMATION_LOCK_HINT = 'Research Better Life Support, or build husbandry mastery with regular care.';

const kindOf = (e: EquipmentInstance) => getEquipmentDef(e.defId)?.kind;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** The meals a day an Autofeeder is set to (0 = paused; a legacy `setting: 0` reads as off). */
export function mealsOf(e: EquipmentInstance): number {
  const v = typeof e.setting === 'number' && Number.isFinite(e.setting) ? e.setting : (getEquipmentDef(e.defId)?.stats.defaultSetting ?? 2);
  return Math.max(0, Math.min(4, Math.round(v)));
}

/** Is Auto-feed on: the Autofeeder switched on with at least one meal a day (§10.2's "installed, on")? */
export const autoFeedOn = (e: EquipmentInstance): boolean => e.on && mealsOf(e) > 0;

/**
 * B-149: the Auto-feed switch turned on from a legacy `setting: 0` also restores the def's default meals (2);
 * `setEquipment` itself is unchanged.
 */
export function autoFeedPatch(e: EquipmentInstance, on: boolean): { on: boolean; setting?: number } {
  if (!on) return { on: false };
  return mealsOf(e) > 0 ? { on: true } : { on: true, setting: getEquipmentDef(e.defId)?.stats.defaultSetting ?? 2 };
}

/**
 * What the Auto-feed subline says about food: "{food} · {n} servings left · about {d} days" (§10.2). Null when nobody
 * in the tank eats dry food (an empty tank, or seahorses: the fit line says why the feeder can't help).
 */
export function autoFeedSupply(g: GameState, tank: Tank, e: EquipmentInstance): { food: string | null; servings: number; days: number | null } | null {
  const inh = safe('inhabitantsOf', () => inhabitantsOf(g, tank.id), []);
  if (!inh.some((i) => canAutofeed(i.species))) return null;
  const foodId = pickAutofeedFood(g.inventory.foods, inh.map((i) => i.species));
  const food = foodId ? getFoodDef(foodId) : undefined;
  if (!foodId || !food) return { food: null, servings: 0, days: null };
  const servings = Math.max(0, Math.floor(g.inventory.foods[foodId] ?? 0));
  const meals = mealsOf(e);
  const per = safe('recommendedServings', () => recommendedServings(g, tank, food), 0);
  const days = meals > 0 && per > 0 ? Math.floor(servings / (meals * per)) : 0;
  return { food: foodName(foodId), servings, days: days >= 1 ? days : null };
}

/** The resident the paused line names: the hungriest (§10.2 "feed {name} by hand"). */
function hungriestName(g: GameState, tank: Tank): string | null {
  const inh = safe('inhabitantsOf', () => inhabitantsOf(g, tank.id), []);
  let best: (typeof inh)[number] | null = null;
  for (const i of inh) if (!best || (i.creature.stats?.hunger ?? 0) > (best.creature.stats?.hunger ?? 0)) best = i;
  return best?.creature.name ?? null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

function AutoFeedRow({ g, tank, fit }: { g: GameState; tank: Tank; fit: FitVerdict | null | undefined }) {
  const dev = tank.equipment.find((e) => kindOf(e) === 'autofeeder');
  const def = getEquipmentDef(AUTOFEEDER_ID);
  const unlocked = safe('isUnlocked', () => isUnlocked(g, def?.unlock ?? null), false);
  const label = `Auto-feed for ${tank.name}`;
  if (!dev) {
    return (
      <div className="ag-auto is-missing" data-testid="tank-auto-feed-row">
        <span className="ag-auto__icon" aria-hidden>
          <Clock size={17} />
        </span>
        <div>
          <div className="ag-auto__title">
            Auto-feed <Lock size={12} aria-hidden />
          </div>
          <div className="ag-auto__sub">Drops a measured portion of dry food on a schedule.</div>
          {unlocked ? (
            <div className="ag-auto__need" id={`autofeed-need-${tank.id}`}>
              <span>Needs an Autofeeder</span>
              <Button size="sm" className="ag-btn--buygear" data-testid="tank-auto-feed-buy" onClick={() => act((d) => buyEquipment(d, tank.id, AUTOFEEDER_ID), { sound: 'coin', flag: 'changed_equipment' })}>
                Buy · {formatMoney(def?.price ?? 35)}
              </Button>
            </div>
          ) : (
            <div className="ag-auto__hint" id={`autofeed-need-${tank.id}`}>
              <Lock size={12} aria-hidden /> {AUTOMATION_LOCK_HINT}
            </div>
          )}
        </div>
        <div className="ag-auto__ctl">
          <Toggle label={label} testId="tank-auto-feed" checked={false} locked describedBy={`autofeed-need-${tank.id}`} onChange={() => {}} />
        </div>
      </div>
    );
  }
  const on = autoFeedOn(dev) && !dev.failed;
  const supply = autoFeedSupply(g, tank, dev);
  const keeper = keeperOf(g, tank.id);
  const name = hungriestName(g, tank);
  const parts = ['Runs your Autofeeder'];
  if (supply?.food) parts.push(supply.food);
  if (supply) parts.push(`${plural(supply.servings, 'serving')} left`);
  if (on && supply?.days) parts.push(`about ${plural(supply.days, 'day')}`);
  if (!on) parts.push('paused');
  return (
    <div className="ag-auto is-installed" data-testid="tank-auto-feed-row" data-state={on ? 'on' : 'paused'}>
      <span className="ag-auto__icon" aria-hidden>
        <Clock size={17} />
      </span>
      <div>
        <div className="ag-auto__title">Auto-feed</div>
        <div className="ag-auto__sub">{parts.join(' · ')}</div>
        {!on && name && (
          <div className="ag-auto__warn" data-testid="tank-auto-feed-paused">
            {keeper ? `Paused — feed ${name} by hand, or a keeper will on their rounds.` : `Paused — feed ${name} by hand.`}
          </div>
        )}
      </div>
      <div className="ag-auto__ctl">
        <Toggle
          label={label}
          testId="tank-auto-feed"
          checked={autoFeedOn(dev)}
          onChange={(v) => act((d) => setEquipment(d, tank.id, dev.id, autoFeedPatch(dev, v)), { sound: 'click', flag: 'changed_equipment' })}
        />
      </div>
      {autoFeedOn(dev) && (
        <div className="ag-auto__meals">
          <span>Meals a day</span>
          <Segmented
            size="sm"
            label={`Meals a day for ${tank.name}`}
            testIdPrefix="tank-auto-feed-meals-"
            value={mealsOf(dev)}
            onChange={(n) => act((d) => setEquipment(d, tank.id, dev.id, { setting: n }), { toast: 'caution', cautionKey: `meals:${dev.id}`, sound: 'click', flag: 'changed_equipment' })}
            items={[1, 2, 3, 4].map((n) => ({ id: n, label: String(n) }))}
          />
        </div>
      )}
      {fit && <FitLine verdict={fit} testId="tank-auto-feed-fit" />}
    </div>
  );
}

/** Buy the Auto Water Changer for this tank and switch it on (§10.3), with the design's toasts. */
export function buyAutoClean(tankId: string): void {
  const ui = useUI.getState();
  const def = getEquipmentDef(WATER_CHANGER_ID);
  const tank = (g: GameState) => g.tanks[tankId];
  const price = def?.price ?? 120;
  const money = useGame.getState().game?.finance.money ?? 0;
  if (money < price) {
    sfx('error');
    ui.toast(`The Auto Water Changer costs ${formatMoney(price)}.`, 'warning', { label: 'Not enough money' });
    return;
  }
  let name = '';
  const r = act(
    (d) => {
      const res = buyEquipment(d, tankId, WATER_CHANGER_ID);
      if (!res.ok) return res;
      const inst = tank(d)?.equipment.find((e) => e.defId === WATER_CHANGER_ID);
      if (inst && !inst.on) setEquipment(d, tankId, inst.id, { on: true });
      name = tank(d)?.name ?? '';
      return res;
    },
    { toast: false, sound: 'coin', flag: 'changed_equipment' },
  );
  if (!r) return;
  if (!r.ok) {
    ui.toast(r.message, 'warning');
    return;
  }
  ui.toast(`Auto Water Changer on ${name}`, 'celebrate', { label: 'Installed', detail: 'Auto-clean is on. Switch it off any time on the tank card.' });
}

function AutoCleanRow({ g, tank, fit }: { g: GameState; tank: Tank; fit: FitVerdict | null | undefined }) {
  const dev = tank.equipment.find((e) => kindOf(e) === 'water_changer');
  const def = getEquipmentDef(WATER_CHANGER_ID);
  const unlocked = safe('isUnlocked', () => isUnlocked(g, def?.unlock ?? null), false);
  const label = `Auto-clean for ${tank.name}`;
  if (!dev) {
    return (
      <div className="ag-auto is-missing" data-testid="tank-auto-clean-row">
        <span className="ag-auto__icon" aria-hidden>
          <Droplets size={17} />
        </span>
        <div>
          <div className="ag-auto__title">
            Auto-clean <Lock size={12} aria-hidden />
          </div>
          <div className="ag-auto__sub">Small daily water changes and a weekly glass scrape.</div>
          {unlocked ? (
            <div className="ag-auto__need" id={`autoclean-need-${tank.id}`}>
              <span>Needs an Auto Water Changer</span>
              <Button size="sm" className="ag-btn--buygear" data-testid="tank-auto-clean-buy" onClick={() => buyAutoClean(tank.id)}>
                Buy · {formatMoney(def?.price ?? 120)}
              </Button>
            </div>
          ) : (
            <div className="ag-auto__hint" id={`autoclean-need-${tank.id}`}>
              <Lock size={12} aria-hidden /> {AUTOMATION_LOCK_HINT}
            </div>
          )}
        </div>
        <div className="ag-auto__ctl">
          <Toggle label={label} testId="tank-auto-clean" checked={false} locked describedBy={`autoclean-need-${tank.id}`} onChange={() => {}} />
        </div>
      </div>
    );
  }
  const share = typeof dev.setting === 'number' && Number.isFinite(dev.setting) ? dev.setting : (def?.stats.defaultSetting ?? 0.1);
  const upkeep = getEquipmentDef(dev.defId)?.upkeep ?? 0.06;
  return (
    <div className="ag-auto is-installed" data-testid="tank-auto-clean-row" data-state={dev.on && !dev.failed ? 'on' : 'off'}>
      <span className="ag-auto__icon" aria-hidden>
        <Droplets size={17} />
      </span>
      <div>
        <div className="ag-auto__title">Auto-clean</div>
        <div className="ag-auto__sub">
          Runs your Auto Water Changer · {pct(share)} each morning · glass once a week · {formatMoney(upkeep, { cents: true })}/day
        </div>
      </div>
      <div className="ag-auto__ctl">
        <Toggle label={label} testId="tank-auto-clean" checked={dev.on} onChange={(v) => act((d) => setEquipment(d, tank.id, dev.id, { on: v }), { sound: 'click', flag: 'changed_equipment' })} />
      </div>
      {fit && <FitLine verdict={fit} testId="tank-auto-clean-fit" />}
    </div>
  );
}

/** The Equipment tab's first section (§10.1): Auto-feed, then Auto-clean. */
export function AutomationSection({ g, tank, fits }: { g: GameState; tank: Tank; fits: Map<string, FitVerdict> }) {
  const feeder = tank.equipment.find((e) => kindOf(e) === 'autofeeder');
  const changer = tank.equipment.find((e) => kindOf(e) === 'water_changer');
  return (
    <Section title={<><Zap size={12} aria-hidden /> Automation</>}>
      <div className="ag-autolist" data-testid="tank-automation">
        <AutoFeedRow g={g} tank={tank} fit={feeder ? fits.get(feeder.id) : null} />
        <AutoCleanRow g={g} tank={tank} fit={changer ? fits.get(changer.id) : null} />
      </div>
    </Section>
  );
}

/** Water tab, under the headline, while the Auto Water Changer runs (§10.3). */
export function AutoCleanNote({ tank }: { tank: Tank }) {
  const dev = useMemo(() => tank.equipment.find((e) => kindOf(e) === 'water_changer'), [tank.equipment]);
  if (!dev || !dev.on || dev.failed) return null;
  const share = typeof dev.setting === 'number' && Number.isFinite(dev.setting) ? dev.setting : (getEquipmentDef(dev.defId)?.stats.defaultSetting ?? 0.1);
  return (
    <div className={clsx('ag-autonote')} data-testid="water-autoclean-note">
      <Droplets size={15} aria-hidden />
      <div>
        <div className="ag-autonote__title">Auto-clean is on</div>
        <div className="ag-autonote__text">The Auto Water Changer swaps {pct(share)} each morning and scrapes the glass once a week. You can still do it by hand.</div>
      </div>
    </div>
  );
}
