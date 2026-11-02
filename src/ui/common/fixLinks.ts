/**
 * chunk 19 (ADR-0055 decision 2, QOL-002) — every problem the tank card names links to where it's fixed.
 *
 * `fixForWaterIssue` and `fixForAttention` are pure (node-safe; tests/sim/qol-fix-links.test.ts): a water report issue
 * or an attention item → a short action and where it goes. `goFix` goes there:
 *  - `card`: a fix inside the tank card — its tab, then the control (`data-fix`) scrolled to and glowing;
 *  - `panel`: a panel at the spot (Market › Supplies on a food, Build › Equipment for this tank on a kind of gear,
 *    Livestock), with what it should point at;
 *  - `creature`: the animal's card; `feed`: the food picker on this tank.
 * The words are drafted for the owner (ADR-0055 decision 8). OWNER: lane "ui-shell".
 */
import type { EquipmentInstance, EquipmentKind, GameState, Tank } from '@/types';
import type { WaterIssue, WaterReport } from '@/types/reports';
import { useUI, type PanelId } from '@/state/ui';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { tankFoodOutlook } from '@/sim/tankStatus';
import { useShell } from './shellStore';
import { glow } from './glow';
import { useTankCardTab, type TankCardTabId } from '../cards/tankCardTab';
import type { AttentionItem } from './notify';
export { WORN_BELOW } from './notify';

export type FixTo =
  | { kind: 'card'; tankId: string; tab: TankCardTabId; fix: string }
  | { kind: 'panel'; panel: PanelId; target: string | null; glow?: string }
  | { kind: 'creature'; tankId: string; creatureId: string }
  | { kind: 'feed'; tankId: string; target?: boolean };

export interface FixLink {
  /** The link's words ("Water change", "Repair", "Buy a heater"). */
  label: string;
  to: FixTo;
}

const kindOf = (e: EquipmentInstance): EquipmentKind | undefined => getEquipmentDef(e.defId)?.kind;
const nameOf = (e: EquipmentInstance): string => getEquipmentDef(e.defId)?.name ?? 'equipment';
const gearOf = (tank: Tank, ...kinds: EquipmentKind[]): EquipmentInstance[] => (tank.equipment ?? []).filter((e) => kinds.includes(kindOf(e) as EquipmentKind));
const failedOf = (tank: Tank, ...kinds: EquipmentKind[]): EquipmentInstance | undefined => gearOf(tank, ...kinds).find((e) => e.failed);

const card = (tank: Tank, tab: TankCardTabId, fix: string, label: string): FixLink => ({ label, to: { kind: 'card', tankId: tank.id, tab, fix } });
/** Build › Equipment for this tank, showing one kind of gear to buy. */
const buyGear = (tank: Tank, kind: EquipmentKind, label: string): FixLink => ({ label, to: { kind: 'panel', panel: 'build', target: `equipment:${tank.id}:${kind}`, glow: `[data-testid="panel-build"] [data-equip-kind="${kind}"]` } });
/** The unit's own row on the card's Equipment tab (its Repair, switch and settings). */
const gearRow = (tank: Tank, e: EquipmentInstance, label: string): FixLink => card(tank, 'gear', `equip-${e.id}`, label);

/** A failed or stuck unit: switch a stuck heater off first, else repair it. */
function repairLink(tank: Tank, e: EquipmentInstance): FixLink {
  return gearRow(tank, e, e.failMode === 'stuck_on' && e.on ? 'Switch it off' : 'Repair');
}

/** The link for one water report issue (the Water tab's list, and the header's water line). */
export function fixForWaterIssue(tank: Tank, issue: Pick<WaterIssue, 'text' | 'advice' | 'param'>): FixLink | null {
  const say = `${issue.text} ${issue.advice ?? ''}`;
  // a unit the issue names (a failed pump, a stuck heater) comes first
  const failed = (tank.equipment ?? []).find((e) => e.failed && say.includes(nameOf(e)));
  if (failed) return repairLink(tank, failed);
  const adv = (issue.advice ?? '').toLowerCase();
  const p = issue.param;
  // (the advice words are the sim's, src/sim/water/report.ts: a setting to change goes to the unit's own row, gear to
  // add goes to Build › Equipment for this tank, a broken unit to its Repair)
  // "Upgrade or add a filter, or rehome some animals": the filter is the first fix it names
  if (p === 'stocking' && /add a filter/.test(adv)) return buyGear(tank, 'filter', 'Buy a filter');
  if (/rehome|move some animals/.test(adv)) return { label: 'Open Livestock', to: { kind: 'panel', panel: 'livestock', target: null } };
  if (p === 'temp') {
    const stuck = gearOf(tank, 'heater').find((e) => e.failed && e.failMode === 'stuck_on');
    if (stuck) return repairLink(tank, stuck);
    // "A heater has failed — repair or replace it." (the line doesn't name the unit)
    const broken = /has failed|repair or replace/.test(adv) ? failedOf(tank, 'heater', 'chiller') : undefined;
    if (broken) return repairLink(tank, broken);
    // too warm, and nothing here cools: "Add a chiller, or a clip-on fan…" (a heater would make it worse)
    if (/add a chiller|clip-on fan/.test(adv)) return buyGear(tank, 'chiller', 'Buy a chiller');
    // a setting to change ("Raise the heater setting (or add a second heater…)", "Turn the heater down…", "Lower the
    // chiller setting…", "Set the heater at least 1 °C below the chiller…"): the unit's row, where its setting is
    const setting = /lower the chiller/.test(adv) ? gearOf(tank, 'chiller')[0] : /raise the heater setting|turn the heater down|set the heater/.test(adv) ? gearOf(tank, 'heater')[0] : undefined;
    if (setting) return gearRow(tank, setting, 'Open Equipment');
    if (/add a heater|install a heater|second heater|more powerful/.test(adv) || !gearOf(tank, 'heater', 'chiller').length) return buyGear(tank, 'heater', 'Buy a heater');
    const unit = gearOf(tank, 'heater', 'chiller')[0];
    return gearRow(tank, unit, 'Open Equipment');
  }
  if (p === 'filtration') {
    // "Repair or replace the filter." (none running) and "Repair or replace it." (one of several down)
    const broken = /repair or replace/.test(adv) ? failedOf(tank, 'filter') : undefined;
    if (broken) return repairLink(tank, broken);
    const filter = gearOf(tank, 'filter').find((e) => !e.failed) ?? gearOf(tank, 'filter')[0];
    if (/install a filter|second filter|larger one|add a filter/.test(adv) || !filter) return buyGear(tank, 'filter', 'Buy a filter');
    return gearRow(tank, filter, 'Open Equipment');
  }
  if (p === 'light') {
    // "The light has burned out." comes with "Install a light…": the burned-out one is repaired, not replaced
    const burned = failedOf(tank, 'light');
    if (burned) return repairLink(tank, burned);
    const light = gearOf(tank, 'light')[0];
    if (!light || /install a light/.test(adv)) return buyGear(tank, 'light', 'Buy a light');
    // "Raise the intensity or install a stronger light": the intensity first, a stronger light once it's at the
    // Lighting slider's top (1.5, TankCard)
    if (/stronger light/.test(adv) && (tank.lighting?.intensity ?? 1) >= 1.49) return buyGear(tank, 'light', 'Buy a light');
    return card(tank, 'gear', 'lighting', 'Lighting');
  }
  if (p === 'oxygen') return gearOf(tank, 'airstone').length ? gearRow(tank, gearOf(tank, 'airstone')[0], 'Open Equipment') : buyGear(tank, 'airstone', 'Buy an airstone');
  if (p === 'flow') {
    const pump = gearOf(tank, 'powerhead', 'wavemaker', 'filter')[0];
    if (/add a small powerhead/.test(adv) || !pump) return buyGear(tank, 'powerhead', 'Buy a powerhead');
    return gearRow(tank, pump, 'Open Equipment');
  }
  if (p === 'stocking') return { label: 'Open Livestock', to: { kind: 'panel', panel: 'livestock', target: null } };
  if (/top off/.test(adv)) return card(tank, 'water', 'top-off', 'Top off');
  if (p === 'level') return card(tank, 'water', 'top-off', 'Top off');
  if (p === 'algae' || /scrape the glass/.test(adv)) return card(tank, 'water', 'clean-glass', 'Clean glass');
  if (p === 'clarity') return /vacuum/.test(adv) ? card(tank, 'water', 'vacuum', 'Vacuum gravel') : card(tank, 'water', 'water-change', 'Water change');
  if (p === 'salinity') return /salt mix|dose salt/.test(adv) ? card(tank, 'water', 'dose-salt', 'Dose salt') : card(tank, 'water', 'water-change', 'Water change');
  if (/dose buffer/.test(adv)) return card(tank, 'water', 'dose-buffer', 'Dose buffer');
  if (/water change|change 30|change water/.test(adv) || p === 'ammonia' || p === 'nitrite' || p === 'nitrate' || p === 'ph' || p === 'kh' || p === 'gh') return card(tank, 'water', 'water-change', 'Water change');
  if (p === 'cycle' || /bottled bacteria/.test(adv)) return card(tank, 'water', 'dose-bacteria', 'Bottled bacteria');
  if (/heater .*chiller|set the heater/.test(adv)) {
    const unit = gearOf(tank, 'heater')[0];
    if (unit) return gearRow(tank, unit, 'Open Equipment');
  }
  return null;
}

/**
 * The link for one attention item (the card's header, the alerts drawer). `report`: the tank's water report, for a
 * water line (its first issue is the line's headline).
 */
export function fixForAttention(g: GameState, tank: Tank, item: Pick<AttentionItem, 'source' | 'text' | 'equipmentId'>, report: Pick<WaterReport, 'issues'> | null): FixLink | null {
  const unit = item.equipmentId ? tank.equipment.find((e) => e.id === item.equipmentId) : undefined;
  switch (item.source) {
    case 'food': {
      const id = tankFoodOutlook(g, tank.id)?.restockId;
      return id ? { label: 'Buy food', to: { kind: 'panel', panel: 'market', target: `food:${id}` } } : { label: 'Open Supplies', to: { kind: 'panel', panel: 'market', target: 'tab:supplies' } };
    }
    case 'gear':
      if (unit) return unit.failed ? repairLink(tank, unit) : gearRow(tank, unit, 'Repair');
      if (/auto-feed/i.test(item.text)) return card(tank, 'gear', 'automation', 'Auto-feed');
      return card(tank, 'gear', 'equipment', 'Open Equipment');
    case 'fit':
      return unit ? gearRow(tank, unit, 'Open Equipment') : card(tank, 'gear', 'equipment', 'Open Equipment');
    case 'water': {
      const top = report?.issues?.find((i) => i.status !== 'good') ?? null;
      return top ? fixForWaterIssue(tank, top) : card(tank, 'water', 'care', 'Water care');
    }
    case 'animals': {
      // harmed by the water: the water is the fix
      if (/harmed by the water/i.test(item.text)) {
        const top = report?.issues?.find((i) => i.status !== 'good') ?? null;
        const w = top ? fixForWaterIssue(tank, top) : null;
        if (w) return w;
      }
      if (/starv|hungry|feed right away/i.test(item.text)) return { label: 'Feed', to: { kind: 'feed', tankId: tank.id } };
      const named = namedAnimal(g, tank.id, item.text);
      return named ? { label: `See ${named.name}`, to: { kind: 'creature', tankId: tank.id, creatureId: named.id } } : card(tank, 'life', 'residents', 'See the animals');
    }
    default:
      return null;
  }
}

/** The tank's animal a line names (the longest name that appears, so "Tango" never wins over "Tango Two"). */
function namedAnimal(g: GameState, tankId: string, text: string): { id: string; name: string } | null {
  let best: { id: string; name: string } | null = null;
  for (const c of Object.values(g.creatures)) {
    if (c.tankId !== tankId || c.status === 'dead' || !c.name) continue;
    if (text.includes(c.name) && (!best || c.name.length > best.name.length)) best = { id: c.id, name: c.name };
  }
  return best;
}

/** Go where a link points. */
export function goFix(to: FixTo): void {
  const ui = useUI.getState();
  switch (to.kind) {
    case 'card': {
      ui.set({ focusedTankId: to.tankId, view: 'tank', panel: null, selectedCreatureId: null });
      useShell.getState().set({ tankCardOpen: true, popover: null });
      useTankCardTab.setState({ want: to.tab });
      glow(`[data-testid="tank-card"] [data-fix="${to.fix}"]`);
      return;
    }
    case 'panel':
      ui.set({ panel: to.panel, panelTarget: to.target });
      if (to.glow) glow(to.glow);
      return;
    case 'creature':
      ui.set({ focusedTankId: to.tankId, view: 'tank', panel: null, selectedCreatureId: to.creatureId });
      return;
    case 'feed':
      ui.set({ focusedTankId: to.tankId, view: 'tank', panel: null, selectedCreatureId: null });
      useShell.getState().set({ tankCardOpen: false, popover: to.target ? 'target_food' : 'food' });
      return;
  }
}
