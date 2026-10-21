/**
 * Operations' player actions with the design's toasts (DESIGN-S3D §7.7, §8.5, §11). OWNER: lane "automation" (chunk 5).
 */
import type { HoldSystem } from '@/types';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { sfx } from '@/audio/sfx';
import { SALT_PRICE_PER_KG } from '@/sim/economy';
import { batchGal, batchSaltKg, manualModeOn } from '@/sim/automation';
import { findLine } from '@/sim/production';
import { EGGS_SUPPLY, VEGETABLES } from '@/data/catalog/machines';
import { act } from '../common/act';

const toast = (label: string, text: string, detail?: string, kind: 'success' | 'info' = 'success') => useUI.getState().toast(text, kind, { label, ...(detail ? { detail } : {}) });

/** Buy a bag of marine salt mix: "Bought · $15" / "5 kg of marine salt mix" / "{kg} kg in stock · enough for {n} batch(es)." (40 kg: "The salt mixer can start its next batch.") */
export function buySaltBag(kg: number): boolean {
  let ok = false;
  act(
    { k: 'buySalt', kg },
    {
      quiet: true,
      after: (r) => {
        if (!r?.ok) return;
        ok = true;
        const g = useGame.getState().game!;
        const stock = Math.round(g.inventory.salt * 10) / 10;
        const per = g.facility.water ? batchSaltKg(batchGal(g.facility.water)) : 4.1;
        const n = Math.floor((g.inventory.salt + 1e-6) / per);
        // the 40 kg sack's toast is the design's (§11 "Toasts", DES-013); the 5 and 20 kg bags count batches (§11 "Salt sizes")
        const detail = kg === 40 ? 'The salt mixer can start its next batch.' : `${stock} kg in stock · enough for ${n} ${n === 1 ? 'batch' : 'batches'}.`;
        toast(`Bought · $${kg * SALT_PRICE_PER_KG}`, `${kg} kg of marine salt mix`, detail);
      },
    },
  );
  return ok;
}

/** Buy a tin of brine shrimp eggs (the toast is ADR-0032 decision 2). */
export function buyEggTin(): boolean {
  let ok = false;
  act(
    { k: 'buyEggs', tins: 1 },
    {
      quiet: true,
      after: (r) => {
        if (!r?.ok) return;
        ok = true;
        const g = useGame.getState().game!;
        toast(`Bought · $${EGGS_SUPPLY.price}`, 'A tin of brine shrimp eggs', `${g.inventory.brineShrimpEggs ?? 0} scoops in stock.`);
      },
    },
  );
  return ok;
}

/** Buy a pack of Blanched Vegetables (the jars' food). */
export function buyVegPack(): boolean {
  let ok = false;
  act({ k: 'buyFood', food: VEGETABLES, packs: 1 }, { after: (r) => (ok = !!r?.ok) });
  return ok;
}

/** Hold all (immediate, no confirm): the toast, then the panel opens Manual mode (§7.7). */
export function doHoldAll(): void {
  act({ k: 'holdAll' }, { quiet: true, sound: 'click' });
  toast('Manual mode on', 'Automation is on hold', 'Filters, heaters, lights, top-off and keepers keep running.', 'info');
}

export function doResumeAll(): void {
  act({ k: 'resumeAll' }, { quiet: true, sound: 'click' });
  toast('Manual mode off', 'All automation is running again.', undefined, 'info');
}

/** Hold or resume one system; resuming the last turns manual mode off (and says so). */
export function doHold(sys: HoldSystem, on: boolean): void {
  act(
    { k: 'setHold', sys, on },
    {
      quiet: true,
      sound: 'click',
      after: () => {
        const g = useGame.getState().game;
        if (!on && g && !manualModeOn(g)) toast('Manual mode off', 'All automation is running again.', undefined, 'info');
      },
    },
  );
}

/** Problems › a paused line › Wait. */
export function doWait(lineId: string, restartDay: number): void {
  const g = useGame.getState().game;
  const name = g ? findLine(g, lineId)?.name ?? 'The line' : 'The line';
  act({ k: 'waitForLine', line: lineId }, { quiet: true, after: (r) => r?.ok && toast(`The ${name} waits`.replace(/^The The /, 'The '), `It restarts by itself on Day ${restartDay}. No animals are lost.`, undefined, 'info') });
}

/** Capacity was added for a paused line (Add a quarantine tank): it's decided, quietly (its own toast said so). */
export function markDecided(lineId: string): void {
  act({ k: 'waitForLine', line: lineId }, { quiet: true, sound: null });
}

/** The line's switch; pausing says what it means ("{Line} paused"). */
export function doLineSwitch(lineId: string, on: boolean): void {
  const g = useGame.getState().game;
  const name = g ? findLine(g, lineId)?.name ?? 'Line' : 'Line';
  act(
    { k: 'setLineRunning', line: lineId, on },
    {
      quiet: true,
      sound: 'click',
      after: (r) => {
        if (r?.ok && !on) toast(`${name} paused`, 'Animals stay where they are; nothing new is bred or listed.', undefined, 'info');
        if (!r?.ok) sfx('error');
      },
    },
  );
}
