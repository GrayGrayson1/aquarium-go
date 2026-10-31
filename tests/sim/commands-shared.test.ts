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
import { generateOffer } from '@/sim/economy';
import { isLotOffer } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { checkPlacement } from '@/sim/aquascape/placement';

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

  it('tags only what the command logged: an event logged just before it keeps no tag', async () => {
    const { emitEvent } = await import('@/sim/context');
    const g = world();
    const before = emitEvent(g, { kind: 'info', text: 'the game itself, just before' });
    applyCommand(g, { k: 'renameTank', tank: g.tankOrder[0], name: 'Corner' }, sam(1000));
    expect(before.by).toBeUndefined();
    expect(g.log.at(-1)?.byName).toBe('Sam');
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

describe('chunk 11: first one wins for the rest of what can be bought, sold, moved or taken (§4.3)', () => {
  type W = 'big_facility' | 'panels';
  const cases: { name: string; w: W; prep?: (g: GameState) => void; first: (g: GameState) => Command; second: (g: GameState) => Command; says: string }[] = [
    {
      name: 'a decoration sold, then moved',
      w: 'big_facility',
      first: (g) => ({ k: 'removeDecor', tank: g.tankOrder[0], decor: g.tanks[g.tankOrder[0]].decor[0].id, sell: true }),
      second: (g) => ({ k: 'moveDecor', tank: g.tankOrder[0], decor: g.tanks[g.tankOrder[0]].decor[0].id, x: 0, z: 0 }),
      says: 'Sam already sold that decoration.',
    },
    {
      name: 'equipment removed, then repaired',
      w: 'big_facility',
      first: (g) => ({ k: 'removeEquipment', tank: g.tankOrder[0], equip: g.tanks[g.tankOrder[0]].equipment.at(-1)!.id }),
      second: (g) => ({ k: 'repairEquipment', tank: g.tankOrder[0], equip: g.tanks[g.tankOrder[0]].equipment.at(-1)!.id }),
      says: 'Sam already removed that equipment.',
    },
    {
      name: 'a candidate hired twice',
      w: 'big_facility',
      prep: (g) => void applyCommand(g, { k: 'fireStaff', staff: g.staff!.roster[0].id }),
      first: (g) => ({ k: 'hireStaff', candidate: g.staff!.candidates[0].id }),
      second: (g) => ({ k: 'hireStaff', candidate: g.staff!.candidates[0].id }),
      says: 'Sam already hired that candidate.',
    },
    {
      name: 'a keeper let go twice',
      w: 'big_facility',
      first: (g) => ({ k: 'fireStaff', staff: g.staff!.roster[0].id }),
      second: (g) => ({ k: 'fireStaff', staff: g.staff!.roster[0].id }),
      says: 'Sam already let that keeper go.',
    },
    {
      name: 'a listing withdrawn, then its bid accepted',
      w: 'panels',
      first: (g) => ({ k: 'withdrawListing', listing: g.market.listings.find((l) => l.status === 'active' && (l.bids ?? []).some((b) => b.status === 'open'))!.id }),
      second: (g) => {
        const l = g.market.listings.find((x) => x.status === 'active' && (x.bids ?? []).some((b) => b.status === 'open'))!;
        return { k: 'acceptBid', listing: l.id, bid: l.bids!.find((b) => b.status === 'open')!.id };
      },
      says: 'Sam already withdrew that listing.',
    },
    {
      name: 'a clutch moved twice from where it was',
      w: 'panels',
      first: (g) => {
        const cl = Object.values(g.clutches)[0];
        return { k: 'moveClutch', clutch: cl.id, to: sameWater(g, cl.tankId)[0], from: cl.tankId };
      },
      second: (g) => {
        const cl = Object.values(g.clutches)[0];
        return { k: 'moveClutch', clutch: cl.id, to: sameWater(g, cl.tankId)[0], from: cl.tankId };
      },
      says: 'Sam already moved that clutch.',
    },
    {
      name: 'a fish listed, then sold to the store',
      w: 'panels',
      first: (g) => ({ k: 'createListing', kind: 'creature', creatures: [Object.values(g.creatures).find((c) => c.status === 'alive' && c.tankId && !c.isStarter)!.id], reserve: 10, hours: 24 }),
      second: (g) => ({ k: 'quickSell', creatures: [Object.values(g.creatures).find((c) => c.status === 'alive' && c.tankId && !c.isStarter)!.id] }),
      says: 'Sam already listed that fish.',
    },
  ];
  for (const c of cases)
    it(c.name, () => {
      const g = world(c.w);
      c.prep?.(g);
      // both members sent theirs from the same view: the commands are built before either applies
      const first = c.first(g);
      const second = c.second(g);
      expect(applyCommand(g, first, sam(1000)).ok, c.name).toBe(true);
      const hash = stateHash(g);
      const r = applyCommand(g, second, ana(1400));
      expect(r.ok).toBe(false);
      expect(r.message).toBe(c.says);
      expect(stateHash(g)).toBe(hash);
      // the same member's own second command is never refused by their first (the game's own rules still decide)
      const h = world(c.w);
      c.prep?.(h);
      const f2 = c.first(h);
      const s2 = c.second(h);
      applyCommand(h, f2, sam(1000));
      expect(applyCommand(h, s2, sam(1400)).conflict).toBeUndefined();
    });
});

describe('chunk 11: first one wins, the fresh review’s cases (B3, notes 4 and 5)', () => {
  /**
   * A group offer in the late-game shop and a tank the game lets you buy all of it into. The offer is made here (three of
   * a species the shop already keeps) rather than looked for in the day's stock: whether the stock held a group of
   * three or more that a tank had room for was the random stream's choice, and after chunk 16's new species it held none.
   */
  function groupBuy(g: GameState): { offer: string; tank: string; ids: string[] } {
    const kept = [...new Set(Object.values(g.creatures).filter((c) => c.status === 'alive' && c.tankId).map((c) => c.speciesId))];
    for (const speciesId of kept) {
      const o = generateOffer(g, simRng(g), speciesId, { expiresHour: g.clock.hour + 48, sexes: [undefined, undefined, undefined] });
      if (!o || isLotOffer(o)) continue; // a group with a Prismatic is sold only whole
      g.market.stock.push(o);
      for (const tank of g.tankOrder) if (applyCommand(deepClone(g), { k: 'buyOffer', offer: o.id, tank }).ok) return { offer: o.id, tank, ids: o.creatures.map((c) => c.id) };
      g.market.stock = g.market.stock.filter((x) => x !== o);
    }
    throw new Error('no group offer to buy');
  }

  it('a partial purchase buys the animals its sender saw, wherever an earlier purchase moved them', () => {
    const g = world();
    const { offer, tank, ids } = groupBuy(g);
    // both picked from the same view: Sam the first animal, Ana the second
    const samsPick: Command = { k: 'buyOffer', offer, tank, picks: [0], saw: [ids[0]] };
    const anasPick: Command = { k: 'buyOffer', offer, tank, picks: [1], saw: [ids[1]] };
    expect(applyCommand(g, samsPick, sam(1000)).ok).toBe(true);
    expect(applyCommand(g, anasPick, ana(1100)).ok).toBe(true);
    expect(g.creatures[ids[1]]?.tankId).toBe(tank); // Ana got the animal she picked, now first in the offer
    expect(g.creatures[ids[2]]).toBeUndefined();
    // the one Sam already bought is refused to Ana, naming him
    const h = world();
    const b = groupBuy(h);
    applyCommand(h, { k: 'buyOffer', offer: b.offer, tank: b.tank, picks: [1], saw: [b.ids[1]] }, sam(1000));
    expect(applyCommand(h, { k: 'buyOffer', offer: b.offer, tank: b.tank, picks: [1], saw: [b.ids[1]] }, ana(1100)).message).toBe('Sam already bought that offer.');
    // and buying "all of it" after a part has gone is refused too
    expect(applyCommand(h, { k: 'buyOffer', offer: b.offer, tank: b.tank, saw: b.ids }, ana(1200)).ok).toBe(false);
  });

  it('the last piece in storage, placed by one member, is never bought anew for the other', () => {
    const g = world();
    const t = g.tankOrder[0];
    // a piece that fits back where it stood (chunk 17: on another random stream the first piece's own spot overlapped
    // a neighbour more than a player may place, which says nothing about two members placing it)
    const piece = g.tanks[t].decor.find((d) => checkPlacement(g, g.tanks[t], d.defId, { x: d.x, z: d.z, rotY: d.rotY, scale: d.scale }, { excludeId: d.id, purchase: 'none' }).ok)!;
    expect(piece).toBeDefined();
    expect(applyCommand(g, { k: 'removeDecor', tank: t, decor: piece.id, sell: false }).ok).toBe(true); // into storage
    // Sam puts it back where it stood (a spot it is known to fit: after chunk 16 the fixture's frag rack sat at the tank's
    // middle, where this used to place it); Ana and Sam's second click aim a little either side of it.
    const place = (dx: number): Command => ({ k: 'placeDecor', tank: t, def: piece.defId, x: piece.x + dx, z: piece.z, fromStorage: true });
    const samCmd = place(0);
    const anaCmd = place(-0.02);
    expect(applyCommand(g, samCmd, sam(1000)).ok).toBe(true);
    const money = g.finance.money;
    const r = applyCommand(g, anaCmd, ana(1100));
    expect(r.ok).toBe(false);
    expect(r.message).toBe('Sam already placed that stored piece.');
    expect(g.finance.money).toBe(money);
    // nor for the same member's own second click from a screen that still showed one
    expect(applyCommand(g, place(0.02), sam(1200)).ok).toBe(false);
  });

  it("the sender's own earlier change is excused only while the thing is as it left it (the game may change it since)", () => {
    const g = world();
    const c = fish(g)[0];
    const home = c.tankId!;
    const [t1, t2] = sameWater(g, home);
    expect(applyCommand(g, move(g, c.id, t1), sam(1000)).ok).toBe(true);
    g.creatures[c.id].tankId = t2; // the game moved it on (a line's sort, say): no member's touch
    const r = applyCommand(g, { k: 'moveCreature', creature: c.id, to: home, from: home }, sam(1100));
    expect(r.ok).toBe(false);
    expect(r.message).toBe('That fish has changed since you looked.');
  });

  it("a slider's many values keep one line current; a switch turned back gets a line each time", () => {
    const g = world();
    const mine = () => g.log.filter((e) => e.by && e.kind === 'info');
    const n = mine().length;
    let last = '';
    for (let i = 0; i < 5; i++) last = applyCommand(g, { k: 'setAdmission', price: 10 + i }, sam(1000 + i * 100)).message; // a slider dragged
    expect(mine().length).toBe(n + 1);
    expect(mine().at(-1)?.text).toBe(last); // the newest value, not the first
    applyCommand(g, { k: 'setAdmission', price: 20 }, ana(2000));
    expect(mine().length).toBe(n + 2);
    // a switch: on, then off again by the same member at once, is two lines
    const t = g.tankOrder.find((id) => !g.tanks[id].signage)!;
    applyCommand(g, { k: 'setSignage', tank: t, on: true }, sam(3000));
    applyCommand(g, { k: 'setSignage', tank: t, on: false }, sam(3100));
    expect(mine().length).toBe(n + 4);
  });

  it('quiet kinds add no line of their own: watching, a tap, a bid held while a counter is typed', () => {
    const g = world('panels');
    const lines = () => g.log.filter((e) => e.by && e.kind === 'info').length;
    const quiet = lines();
    const c = Object.values(g.creatures).find((x) => x.status === 'alive' && x.tankId)!;
    applyCommand(g, { k: 'noteInteraction', creature: c.id, kind: 'observe' }, ana(40_000));
    applyCommand(g, { k: 'glassTap', tank: c.tankId!, intensity: 0.5 }, ana(40_100));
    const l = g.market.listings.find((x) => x.status === 'active' && (x.bids ?? []).some((b) => b.status === 'open'))!;
    const b = l.bids!.find((x) => x.status === 'open')!;
    for (let i = 0; i < 3; i++) expect(applyCommand(g, { k: 'holdBid', listing: l.id, bid: b.id }, ana(41_000 + i * 15_000)).ok).toBe(true);
    expect(lines()).toBe(quiet);
  });

  it("the sender's own quick second Buy of an animal they already bought is refused, not swapped for another", () => {
    const g = world();
    const { offer, tank, ids } = groupBuy(g);
    const buy: Command = { k: 'buyOffer', offer, tank, picks: [0], saw: [ids[0]] };
    expect(applyCommand(g, buy, sam(1000)).ok).toBe(true);
    const r = applyCommand(g, buy, sam(1100)); // the panel still showed it
    expect(r.ok).toBe(false);
    expect(g.creatures[ids[1]]).toBeUndefined();
  });
});

describe('chunk 11: a flag a quest pays on is raised only with what earns it (the confirmation pass, note 6)', () => {
  it('raiseFlag hired_staff does nothing without a team, and works once there is one (the staff tab’s sync)', () => {
    const none = world('panels');
    expect(none.staff?.roster.length ?? 0).toBe(0);
    applyCommand(none, { k: 'raiseFlag', name: 'hired_staff' }, sam(1000));
    expect(none.progress.tutorial.flags.hired_staff).toBeUndefined();
    const team = world();
    delete team.progress.tutorial.flags.hired_staff;
    applyCommand(team, { k: 'raiseFlag', name: 'hired_staff' }, sam(1000));
    expect(team.progress.tutorial.flags.hired_staff).toBe(true);
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
