/**
 * Automation chips for a tank (DESIGN-S3D §8.1, §8.2; AUTO-041): Auto-feed, Auto-clean, Top-off, Live-food doser and
 * the tank's production lines, each an icon plus a word in a tone — aqua running, amber held or paused, neutral off.
 * Pure, so tests/sim/automation-chips.test.ts maps tank state to each chip. OWNER: lane "automation" (chunk 5).
 */
import type { GameState, Tank } from '@/types';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { pickAutofeedFood } from '@/sim/care/autofeed';
import { inhabitantsOf } from '@/sim/water/env';
import { isHeld } from '@/sim/automation/hold';
import { lineStatus, productionLines } from '@/sim/production';
import { lineView } from '@/sim/production/view';

export type ChipId = 'auto-feed' | 'auto-clean' | 'top-off' | 'doser' | 'line';
export interface TankChip {
  id: ChipId;
  /** The line's id, for line chips (a tank can serve several lines). */
  key: string;
  word: string;
  tone: 'aqua' | 'watch' | 'neutral';
}

const kindOf = (defId: string) => getEquipmentDef(defId)?.kind;

export function tankChips(g: GameState, tank: Tank): TankChip[] {
  const out: TankChip[] = [];
  const eq = tank.equipment ?? [];
  const feeder = eq.find((e) => kindOf(e.defId) === 'autofeeder');
  if (feeder) {
    const off = !feeder.on || (typeof feeder.setting === 'number' && Math.round(feeder.setting) <= 0);
    const empty = !off && !feeder.failed && !pickAutofeedFood(g.inventory.foods, inhabitantsOf(g, tank.id).map((i) => i.species));
    out.push(
      isHeld(g, 'feeders') && !off
        ? { id: 'auto-feed', key: 'auto-feed', word: 'Auto-feed held', tone: 'watch' }
        : off
          ? { id: 'auto-feed', key: 'auto-feed', word: 'Auto-feed off', tone: 'neutral' }
          : feeder.failed || empty
            ? { id: 'auto-feed', key: 'auto-feed', word: 'Auto-feed paused', tone: 'watch' }
            : { id: 'auto-feed', key: 'auto-feed', word: 'Auto-feed', tone: 'aqua' },
    );
  }
  const changer = eq.find((e) => kindOf(e.defId) === 'water_changer');
  if (changer)
    out.push(
      isHeld(g, 'water') && changer.on
        ? { id: 'auto-clean', key: 'auto-clean', word: 'Auto-clean held', tone: 'watch' }
        : !changer.on
          ? { id: 'auto-clean', key: 'auto-clean', word: 'Auto-clean off', tone: 'neutral' }
          : changer.failed
            ? { id: 'auto-clean', key: 'auto-clean', word: 'Auto-clean paused', tone: 'watch' }
            : { id: 'auto-clean', key: 'auto-clean', word: 'Auto-clean', tone: 'aqua' },
    );
  const ato = eq.find((e) => kindOf(e.defId) === 'ato');
  if (ato) out.push(!ato.on ? { id: 'top-off', key: 'top-off', word: 'Top-off off', tone: 'neutral' } : ato.failed ? { id: 'top-off', key: 'top-off', word: 'Top-off paused', tone: 'watch' } : { id: 'top-off', key: 'top-off', word: 'Top-off', tone: 'aqua' });
  const doser = eq.find((e) => kindOf(e.defId) === 'doser');
  if (doser)
    out.push(
      isHeld(g, 'food') && doser.on
        ? { id: 'doser', key: 'doser', word: 'Live-food doser held', tone: 'watch' }
        : !doser.on
          ? { id: 'doser', key: 'doser', word: 'Live-food doser off', tone: 'neutral' }
          : doser.failed
            ? { id: 'doser', key: 'doser', word: 'Live-food doser paused', tone: 'watch' }
            : { id: 'doser', key: 'doser', word: 'Live-food doser', tone: 'aqua' },
    );
  for (const line of productionLines(g)) {
    const stage = line.tanks.breed === tank.id ? 'Breed' : line.tanks.raise === tank.id ? 'Raise' : line.tanks.quarantine.includes(tank.id) ? 'Quarantine' : line.tanks.keep === tank.id ? 'Keepers' : null;
    if (!stage) continue;
    const short = line.name.replace(/ line$/, '');
    const st = lineStatus(line);
    out.push(
      isHeld(g, 'lines')
        ? { id: 'line', key: line.id, word: `${short} · Held`, tone: 'watch' }
        : st === 'running'
          ? { id: 'line', key: line.id, word: `${short} · ${stage}`, tone: 'aqua' }
          : { id: 'line', key: line.id, word: `${short} · Paused`, tone: 'watch' },
    );
  }
  return out;
}

/** A tank a paused line is waiting on (its raise tank is full): the amber reason line ("{Line} paused: 12 of 12 places."). */
export function tankLineProblem(g: GameState, tank: Tank): { lineId: string; text: string } | null {
  for (const line of productionLines(g)) {
    if (line.tanks.raise !== tank.id || lineStatus(line) !== 'waiting' || g.automation?.lineWait?.[line.id] !== undefined) continue;
    const places = lineView(g, line)?.raising.places;
    return { lineId: line.id, text: places ? `${line.name} paused: ${places.used} of ${places.cap} places.` : `${line.name} paused: ${tank.name} is full.` };
  }
  return null;
}
