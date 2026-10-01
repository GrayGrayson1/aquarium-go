/**
 * Fix lane HUD-2 — card copy: clown gobies (protogynous) explain their sex change like clownfish do (X-3 / S02-02).
 */
import { describe, it, expect } from 'vitest';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { addCreature, createCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { getSpecies } from '@/data/species';
import { sexRoleText } from '@/ui/common/format';

describe('X-3: sexRoleText for protogynous species', () => {
  const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 3 });
  const tank = createTank(g, 'g20L', 'reef', { cycled: true, name: 'Goby Reef' });
  const sp = getSpecies('clown_goby');
  const c = addCreature(g, createCreature(g, simRng(g), 'clown_goby', { ageDays: 40 }), tank.id);
  const now = g.clock.hour;

  it('an adult starts as a female that may turn male', () => {
    expect(sp.sexSystem).toBe('protogynous');
    expect(c.reproRole).toBe('female');
    expect(sexRoleText(c, sp, now)).toEqual({ label: 'Female', detail: 'May become male if dominant.' });
  });
  it('mid-change and after the change', () => {
    c.repro.stage = 'transitioning_male';
    expect(sexRoleText(c, sp, now).label).toBe('Transitioning to male');
    c.repro.stage = 'idle';
    c.reproRole = 'male';
    c.sex = 'male';
    expect(sexRoleText(c, sp, now)).toEqual({ label: 'Male', detail: 'Dominant — became the male of the group.' });
  });
  it('clownfish keep their protandrous wording', () => {
    const clown = Object.values(g.creatures).find((x) => x.speciesId === 'ocellaris_clownfish')!;
    expect(sexRoleText(clown, getSpecies('ocellaris_clownfish'), now).detail).toMatch(/female/);
  });
});
