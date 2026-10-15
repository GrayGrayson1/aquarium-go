/**
 * lane:automation (chunk 5; DESIGN-S3D §8.1, §8.2, §5.4) — the automation chips (AUTO-041), the Tanks panel's line
 * reason, and the Operations dot (AUTO-035's dots, NAV-024's More tab, PERF-004's memo).
 */
import { describe, it, expect } from 'vitest';
import { facility } from './support/automation';
import { lineFarm } from './support/production';
import { tankChips, tankLineProblem } from '@/ui/common/tankChips';
import { opsDot, opsKey, opsSnapshot } from '@/ui/common/ops';
import { navDots } from '@/ui/common/notify';
import { DOCK_ITEMS } from '@/ui/hud/Dock';
import { installEquipment, setEquipment } from '@/sim/care';
import { holdAll, waterRoom } from '@/sim/automation';
import { productionLines } from '@/sim/production';

const words = (g: Parameters<typeof tankChips>[0], t: Parameters<typeof tankChips>[1]) => tankChips(g, t).map((c) => `${c.id}:${c.word}:${c.tone}`);

describe('AUTO-041: automation chips', () => {
  it('running is aqua, held amber, off neutral, each an icon id and a word', () => {
    const { g, fresh } = facility({ fresh: 1, marine: 0, ato: true, food: true });
    const t = fresh[0];
    installEquipment(g, t.id, 'autofeeder', { purchased: true });
    installEquipment(g, t.id, 'live_food_doser', { purchased: true });
    expect(words(g, t)).toEqual(['auto-feed:Auto-feed:aqua', 'auto-clean:Auto-clean:aqua', 'top-off:Top-off:aqua', 'doser:Live-food doser:aqua']);
    holdAll(g);
    expect(words(g, t)).toEqual(['auto-feed:Auto-feed held:watch', 'auto-clean:Auto-clean held:watch', 'top-off:Top-off:aqua', 'doser:Live-food doser held:watch']);
    const changer = t.equipment.find((e) => e.defId === 'auto_water_changer')!;
    setEquipment(g, t.id, changer.id, { on: false });
    expect(words(g, t)).toContain('auto-clean:Auto-clean off:neutral');
  });

  it('a line\'s tanks carry its chip: the stage while running, Paused when it waits; the raise tank gives the reason', () => {
    const { g, tanks } = lineFarm(17);
    const line = productionLines(g)[0];
    const short = line.name.replace(/ line$/, '');
    expect(words(g, tanks.raise)).toContain(`line:${short} · Raise:aqua`);
    expect(words(g, tanks.breed)).toContain(`line:${short} · Breed:aqua`);
    line.waiting = true;
    expect(words(g, tanks.raise)).toContain(`line:${short} · Paused:watch`);
    expect(tankLineProblem(g, tanks.raise)?.text).toMatch(new RegExp(`^${line.name} paused: `));
    expect(tankLineProblem(g, tanks.breed)).toBeNull();
  });
});

describe('the Operations dot (§5.4) and its memo (PERF-004)', () => {
  it('red when anything needs you, amber when worth a look or manual mode is on, none when all is well', () => {
    const { g } = facility({ fresh: 0, marine: 2, salt: 40, rosa: null });
    expect(opsDot(g)).toBeNull();
    expect(navDots(g, DOCK_ITEMS).operations).toBeUndefined();
    g.inventory.salt = 4.1; // one batch: low
    expect(opsDot(g)).toMatchObject({ level: 'watch', label: '1 to look at' });
    g.inventory.salt = 0; // out
    expect(navDots(g, DOCK_ITEMS).operations).toMatchObject({ level: 'danger', label: '1 problem' });
    g.inventory.salt = 40;
    holdAll(g);
    expect(opsDot(g)).toMatchObject({ level: 'watch', label: 'Manual mode on' });
  });

  it('the snapshot is computed once per key: money changing (every visitor) doesn\'t recompute it', () => {
    const { g } = facility({ fresh: 0, marine: 1, salt: 0, rosa: 150 });
    const a = opsSnapshot(g);
    const key = opsKey(g);
    g.finance.money += 37;
    expect(opsKey(g)).toBe(key);
    expect(opsSnapshot(g)).toBe(a);
    waterRoom(g)!.fresh = 0; // the fresh reserve running out does
    expect(opsKey(g)).not.toBe(key);
  });
});
