/**
 * UI-B R08-04: a photo only claims "Added to their story" when noteInteraction actually wrote a line (it throttles to
 * one per 6 game hours), and the line gets the portrait text even when the 40-entry history is full.
 */
import { describe, it, expect } from 'vitest';
import { produce } from 'immer';
import { FIXTURES } from '@/dev/fixtures';
import { pushHistory } from '@/sim/life/step';
import { notePhoto } from '@/ui/photo/story';
import type { GameState } from '@/types';

function subject(g: GameState) {
  const c = Object.values(g.creatures).find((x) => x.status === 'alive' && x.tankId);
  if (!c) throw new Error('fixture has no live creature');
  return c;
}

describe('notePhoto', () => {
  it('names the tank in the new line, then reports nothing added while throttled', () => {
    let g = FIXTURES.big_facility();
    const id = subject(g).id;
    let added = false;
    g = produce(g, (d) => { added = notePhoto(d, id); });
    expect(added).toBe(true);
    const c = g.creatures[id];
    const tank = g.tanks[c.tankId!].name;
    expect(c.history.filter((e) => e.kind === 'photo').at(-1)?.text).toBe(`Posed for a portrait in ${tank}.`);
    const len = c.history.length;
    g = produce(g, (d) => { d.clock.hour += 1; added = notePhoto(d, id); });
    expect(added).toBe(false);
    expect(g.creatures[id].history.length).toBe(len);
  });

  it('renames the line when the history is already at its cap', () => {
    let g = FIXTURES.big_facility();
    const id = subject(g).id;
    g = produce(g, (d) => { for (let i = 0; i < 60; i++) pushHistory(d.creatures[id], { hour: i - 1000, kind: 'note', text: `x${i}` } as never); });
    const cap = g.creatures[id].history.length;
    let added = false;
    g = produce(g, (d) => { added = notePhoto(d, id); });
    const c = g.creatures[id];
    expect(c.history.length).toBe(cap);
    expect(added).toBe(true);
    const photo = c.history.filter((e) => e.kind === 'photo');
    expect(photo).toHaveLength(1);
    expect(photo[0].text).toMatch(/^Posed for a portrait in /);
  });
});
