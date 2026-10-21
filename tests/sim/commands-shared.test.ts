// @vitest-environment node
/**
 * Chunk 11 (SHARED-SHOPS.md §4.3, §9.1): a shared shop's commands carry their sender. What they log is tagged with who
 * sent it; buying, selling, moving and taking are refused on every copy when what the sender saw has changed, naming
 * the member who changed it in the last 30 seconds but never refusing the sender's own earlier change; settings are
 * last-writer-wins with a note. A solo game (no actor) is untouched by all of it.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { FIXTURES } from '@/dev/fixtures';
import { deepClone } from '@/sim/clone';
import { stateHash } from '@/persistence/hash';
import { applyCommand, TOUCH_MS, type Actor, type Command } from '@/sim/commands';
import { runSharedStep } from '@/sim/sharedStep';

const BASES = new Map<string, GameState>();
/** A late-game shop (15 tanks: room to move a fish twice), or `panels` for its listings and bids. */
const world = (name: 'big_facility' | 'panels' = 'big_facility'): GameState => {
  if (!BASES.has(name)) BASES.set(name, FIXTURES[name]());
  return deepClone(BASES.get(name)!);
};
const sam = (at: number): Actor => ({ id: 'm_sam', name: 'Sam', at });
const ana = (at: number): Actor => ({ id: 'm_ana', name: 'Ana', at });
const sameWater = (g: GameState, tankId: string) => g.tankOrder.filter((id) => id !== tankId && g.tanks[id].waterClass === g.tanks[tankId].waterClass);
/** Living animals, not the starter, in a tank with at least two others of its water class. */
const fish = (g: GameState) => Object.values(g.creatures).filter((c) => c.status === 'alive' && c.tankId && !c.isStarter && sameWater(g, c.tankId).length >= 2);
const move = (g: GameState, id: string, to: string): Command => ({ k: 'moveCreature', creature: id, to, from: g.creatures[id].tankId! });

describe('chunk 11: who did it (§4.3)', () => {
  it('tags what a command logs with its sender, on every copy alike', () => {
    const g = world();
    const c = fish(g)[0];
    const before = g.log.length;
    expect(applyCommand(g, { k: 'quickSell', creatures: [c.id] }, sam(1000)).ok).toBe(true);
    const fresh = g.log.slice(before);
    expect(fresh.length).toBeGreaterThan(0);
    for (const e of fresh) expect([e.by, e.byName]).toEqual(['m_sam', 'Sam']);
    // nothing logged earlier is tagged
    expect(g.log.slice(0, before).some((e) => e.by)).toBe(false);
  });

  it('an action that logs nothing gets one line, its own message, also tagged', () => {
    const g = world();
    const t = g.tankOrder[0];
    const before = g.log.length;
    const r = applyCommand(g, { k: 'renameTank', tank: t, name: 'Reef Corner' }, ana(1000));
    expect(r.ok).toBe(true);
    expect(g.log.length).toBe(before + 1);
    expect(g.log.at(-1)).toMatchObject({ kind: 'info', text: r.message, by: 'm_ana', byName: 'Ana' });
  });

  it('a solo command (no actor) tags nothing, adds no line and keeps no memory', () => {
    const a = world();
    const b = world();
    const t = a.tankOrder[0];
    applyCommand(a, { k: 'renameTank', tank: t, name: 'Reef Corner' });
    expect(a.log.length).toBe(b.log.length);
    expect(a.log.some((e) => e.by || e.byName)).toBe(false);
    expect('touches' in a).toBe(false);
  });
});

describe('chunk 11: first one wins (§4.3)', () => {
  it('a second move of the same fish is refused, naming the member who moved it', () => {
    const g = world();
    const c = fish(g)[0];
    const [t1, t2] = sameWater(g, c.tankId!);
    const samSaw = move(g, c.id, t1);
    const anaSaw = move(g, c.id, t2); // sent before Sam's move reached Ana's screen
    expect(applyCommand(g, samSaw, sam(1000)).ok).toBe(true);
    const hash = stateHash(g);
    const r = applyCommand(g, anaSaw, ana(1200));
    expect(r.ok).toBe(false);
    expect(r.message).toBe('Sam already moved that fish.');
    expect(r.conflict).toEqual({ by: 'm_sam', name: 'Sam' });
    expect(g.creatures[c.id].tankId).toBe(t1);
    expect(stateHash(g)).toBe(hash); // a refusal changes nothing
  });

  it("never refuses the sender's own earlier change: two quick moves of one fish both work", () => {
    const g = world();
    const c = fish(g)[0];
    const home = c.tankId!;
    const [t1, t2] = sameWater(g, home);
    const first = move(g, c.id, t1);
    const second: Command = { k: 'moveCreature', creature: c.id, to: t2, from: home }; // Sam's screen still showed it at home
    expect(applyCommand(g, first, sam(1000)).ok).toBe(true);
    expect(applyCommand(g, second, sam(1100)).ok).toBe(true);
    expect(g.creatures[c.id].tankId).toBe(t2);
  });

  it('a change older than 30 seconds, or made by the game itself, refuses without a name', () => {
    const g = world();
    const c = fish(g)[0];
    const [t1, t2] = sameWater(g, c.tankId!);
    const anaSaw = move(g, c.id, t2);
    applyCommand(g, move(g, c.id, t1), sam(1000));
    const late = applyCommand(g, anaSaw, ana(1000 + TOUCH_MS + 1));
    expect(late.ok).toBe(false);
    expect(late.message).toBe('That fish has changed since you looked.');
    expect(late.conflict).toEqual({});
    // the game moved it (no member did): the same
    const h = world();
    const d = fish(h)[0];
    const saw = move(h, d.id, sameWater(h, d.tankId!)[1]);
    h.creatures[d.id].tankId = sameWater(h, d.tankId!)[0];
    expect(applyCommand(h, saw, ana(5000)).message).toBe('That fish has changed since you looked.');
  });

  it('a sale wins over a later move, and an offer bought is gone for the next buyer', () => {
    const g = world();
    const c = fish(g)[0];
    const anaSaw = move(g, c.id, sameWater(g, c.tankId!)[0]);
    expect(applyCommand(g, { k: 'quickSell', creatures: [c.id] }, sam(1000)).ok).toBe(true);
    expect(applyCommand(g, anaSaw, ana(1500)).message).toBe('Sam already sold that fish.');
    // an offer and a tank the game lets Sam buy it into (found on a copy)
    const buys = g.market.stock.flatMap((o) => g.tankOrder.map((tank): Command => ({ k: 'buyOffer', offer: o.id, tank })));
    const buy = buys.find((cmd) => applyCommand(deepClone(g), cmd).ok)!;
    expect(buy).toBeDefined();
    expect(applyCommand(g, buy, sam(2000)).ok).toBe(true);
    expect(applyCommand(g, buy, ana(2100)).message).toBe('Sam already bought that offer.');
  });

  it('a bid answered by one member is refused for the next, naming them', () => {
    const g = world('panels');
    const l = g.market.listings.find((x) => x.status === 'active' && (x.bids ?? []).some((b) => b.status === 'open'))!;
    const b = l.bids!.find((x) => x.status === 'open')!;
    expect(applyCommand(g, { k: 'declineBid', listing: l.id, bid: b.id }, sam(1000)).ok).toBe(true);
    expect(applyCommand(g, { k: 'acceptBid', listing: l.id, bid: b.id }, ana(1100)).message).toBe('Sam already declined that bid.');
  });

  it('the memory forgets after 30 seconds and leaves no key behind when empty (rule 10)', () => {
    const g = world();
    const c = fish(g)[0];
    applyCommand(g, move(g, c.id, sameWater(g, c.tankId!)[0]), sam(1000));
    expect(g.touches?.length).toBe(1);
    applyCommand(g, { k: 'buySalt', kg: 5 }, ana(1000 + TOUCH_MS + 1));
    expect('touches' in g).toBe(false);
  });

  it('every copy decides the same, a joiner from a snapshot too', () => {
    const server = world();
    const c = fish(server)[0];
    const [t1, t2] = sameWater(server, c.tankId!);
    const steps = [
      { n: 1, h: 0, cmds: [{ by: 'm_sam', who: 'Sam', at: 1000, c: move(server, c.id, t1) }] },
      { n: 2, h: 0, cmds: [{ by: 'm_ana', who: 'Ana', at: 1300, c: move(server, c.id, t2) }] },
    ];
    let s = runSharedStep(server, steps[0], [], { copy: true }).state;
    const joiner = JSON.parse(JSON.stringify(s)) as GameState; // a snapshot after step 1
    s = runSharedStep(s, steps[1], [], { copy: true }).state;
    const j = runSharedStep(joiner, steps[1], []).state;
    expect(stateHash(j)).toBe(stateHash(s));
    expect(s.creatures[c.id].tankId).toBe(t1);
  });
});

describe('chunk 11: settings are last-writer-wins, with a note (§4.3)', () => {
  it('a later setting applies, and says who changed it just before', () => {
    const g = world();
    const t = g.tankOrder[0];
    expect(applyCommand(g, { k: 'setLighting', tank: t, intensity: 0.5 }, sam(1000)).noteBy).toBeUndefined();
    const r = applyCommand(g, { k: 'setLighting', tank: t, intensity: 0.9 }, ana(1500));
    expect(r.ok).toBe(true);
    expect(r.noteBy).toBe('Sam');
    expect(g.tanks[t].lighting.intensity).toBe(0.9);
    // the sender's own earlier change isn't news, nor is one older than 30 seconds
    expect(applyCommand(g, { k: 'setLighting', tank: t, intensity: 0.7 }, ana(1600)).noteBy).toBeUndefined();
    expect(applyCommand(g, { k: 'setLighting', tank: t, intensity: 0.6 }, sam(1600 + TOUCH_MS + 1)).noteBy).toBeUndefined();
  });

  it('a switch is a setting: two members turning the sign on leave it on', () => {
    const g = world();
    const t = g.tankOrder.find((id) => !g.tanks[id].signage)!;
    applyCommand(g, { k: 'setSignage', tank: t, on: true }, sam(1000));
    applyCommand(g, { k: 'setSignage', tank: t, on: true }, ana(1100));
    expect(g.tanks[t].signage).toBe(true);
  });
});

describe('chunk 11: the save repair keeps a shared shop’s memory and tags well-formed (AGENTS.md: new fields validated)', () => {
  it('keeps good ones, drops bad ones, and a solo save without them is untouched', async () => {
    const { repairState } = await import('@/persistence/migrations');
    // a solo save has neither: the repair says nothing about them and adds neither
    const copy = JSON.parse(JSON.stringify(world()));
    const said = repairState(copy);
    expect(said.filter((r) => /touches|\bby\b|byName/.test(r))).toEqual([]);
    expect('touches' in copy).toBe(false);
    expect((copy.log as { by?: string }[]).some((e) => 'by' in e)).toBe(false);

    const g = world();
    const c = Object.values(g.creatures).find((x) => x.status === 'alive' && x.tankId && !x.isStarter)!;
    applyCommand(g, { k: 'quickSell', creatures: [c.id] }, sam(1000));
    const raw = JSON.parse(JSON.stringify(g));
    raw.touches.push({ key: 'c:x', by: 'm_x', name: 'X', at: 'soon', verb: 'sold' }, 7);
    raw.log.at(-1).byName = { evil: true };
    repairState(raw);
    expect(raw.touches).toEqual(g.touches);
    expect(raw.log.at(-1).byName).toBeUndefined();
    expect(raw.log.at(-1).by).toBe('m_sam');
    const empty = JSON.parse(JSON.stringify(g));
    empty.touches = 'nonsense';
    repairState(empty);
    expect('touches' in empty).toBe(false);
  });
});
