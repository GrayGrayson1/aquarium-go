/**
 * Market › Supplies' automation sections (DESIGN-S3D §8.5; INTAKE C-63, C-65; MKT-017). OWNER: lane "automation".
 *
 * Above today's Food list: Live food (the two live foods, with a Home-grown chip and their cycles, once the Live food
 * room exists), For the cultures (brine shrimp eggs, vegetables), Dry food (one row per Autofeeder food) and Marine salt
 * mix in 5, 20 and 40 kg with a status line (shown with a salt tank, salt in stock or a Water room). Each food keeps one
 * row (`supplies-row-<id>`, `data-food-row`), so the Food list below leaves out what these show.
 */
import clsx from 'clsx';
import { ChevronRight, Egg, Sparkles, Utensils, Waves } from 'lucide-react';
import type { GameState } from '@/types';
import { Badge, Button, formatMoney } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { BRINE, EGGS_SUPPLY, FOOD_ROOM, INFUSORIA, SALT_BAGS, SALT_SUPPLY_ID, VEGETABLES } from '@/data/catalog/machines';
import { SALT_PRICE_PER_KG } from '@/sim/economy';
import { pickAutofeedFood } from '@/sim/care/autofeed';
import { inhabitantsOf } from '@/sim/water/env';
import { formatClock, dayOf } from '@/sim/time';
import { batchGal, batchSaltKg, cultureState, saltWaterNeeded, saltWaterPerDay, SALT_KG_PER_GAL, type SupplyProblem } from '@/sim/automation';
import { stockManager } from '@/sim/staff/work';
import { opsSnapshot } from '@/ui/common/ops';
import { act } from '../common/act';
import { SectionHead, Chip } from '../common/parts';
import { buyEggTin, buySaltBag } from '../operations/actions';

/** The Autofeeder foods in use: food id → how many tanks' feeders drop it. */
export function autofeederFoods(g: GameState): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t?.equipment.some((e) => getEquipmentDef(e.defId)?.kind === 'autofeeder')) continue;
    const food = pickAutofeedFood(g.inventory.foods, inhabitantsOf(g, id).map((i) => i.species));
    if (food) out.set(food, (out.get(food) ?? 0) + 1);
  }
  return out;
}

/** Foods these sections show (the Food list below leaves them out). */
export function foodsShownAbove(g: GameState): Set<string> {
  const s = new Set<string>(autofeederFoods(g).keys());
  if (g.facility.food) for (const id of [BRINE, INFUSORIA, VEGETABLES]) s.add(id);
  return s;
}

const restocker = (g: GameState) => {
  const m = stockManager(g);
  return m ? `${m.name} restocks it` : 'You restock it from the Market';
};

function Row({ id, flash, children, side, testId }: { id: string; flash: string | null; children: React.ReactNode; side: React.ReactNode; testId?: string }) {
  return (
    <div className={clsx('pn-supply', flash === id && 'is-flash')} data-food-row={id} data-testid={testId ?? `supplies-row-${id}`}>
      <div className="pn-grow">{children}</div>
      <div className="pn-supply__side">{side}</div>
    </div>
  );
}

/** Live food (once the Live food room exists): the two live foods, home-grown, with their cycles and use. */
export function LiveFoodSection({ g, flash }: { g: GameState; flash: string | null }) {
  const room = g.facility.food;
  if (!room) return null;
  const last = (g.automation?.days ?? []).filter((d) => d.day < dayOf(g.clock.hour)).slice(-1)[0];
  const row = (foodId: string, kind: 'cone' | 'jar') => {
    const f = getFoodDef(foodId)!;
    const list = kind === 'cone' ? room.cones : room.jars;
    const makes = kind === 'cone' ? list.length * FOOD_ROOM.coneYield : Math.round((list.length * FOOD_ROOM.jarYield * 24) / FOOD_ROOM.jarHours);
    const have = Math.floor(g.inventory.foods[foodId] ?? 0);
    return (
      <Row
        key={foodId}
        id={foodId}
        flash={flash}
        side={
          <>
            {kind === 'cone' && (
              <button type="button" className="pn-link" onClick={() => go({ kind: 'panel', panel: 'operations', tab: 'feed' })}>
                Hatchery <ChevronRight size={12} aria-hidden />
              </button>
            )}
            <Button size="sm" silent onClick={() => act({ k: 'buyFood', food: foodId, packs: 1 }, { sound: 'coin' })} disabled={g.finance.money < f.price}>
              Buy · {formatMoney(f.price)}
            </Button>
          </>
        }
      >
        <div className="pn-row pn-gap-2 pn-row--wrap">
          <b>{f.name}</b>
          <Chip tone="violet">Home-grown</Chip>
        </div>
        <div className="pn-row pn-gap-1" aria-hidden style={{ margin: '6px 0' }}>
          {list.map((_, i) => (
            <span key={i} className="ops-bar" style={{ width: 28 }}>
              <span className="ops-bar__fill ops-bar__fill--violet" style={{ width: `${cultureState(g, room, kind, i).progress * 100}%`, display: 'block' }} />
            </span>
          ))}
        </div>
        <div className="pn-small pn-muted">
          {have} servings · makes {makes}, uses {last?.used[foodId] ?? 0} a day
        </div>
      </Row>
    );
  };
  return (
    <section>
      <SectionHead title="Live food" icon={<Egg size={14} />}>
        <button type="button" className="pn-link" onClick={() => go({ kind: 'panel', panel: 'build', tab: 'facility', target: 'room:food' })}>
          Live food room <ChevronRight size={12} aria-hidden />
        </button>
      </SectionHead>
      <div className="pn-col pn-gap-2">
        {row(BRINE, 'cone')}
        {row(INFUSORIA, 'jar')}
      </div>
    </section>
  );
}

/** For the cultures: brine shrimp eggs and vegetables (salt mix has its own row below). */
export function CulturesSection({ g, flash }: { g: GameState; flash: string | null }) {
  const room = g.facility.food;
  if (!room) return null;
  const eggs = Math.max(0, Math.floor(g.inventory.brineShrimpEggs ?? 0));
  const veg = getFoodDef(VEGETABLES)!;
  const vegHave = Math.floor(g.inventory.foods[VEGETABLES] ?? 0);
  return (
    <section>
      <SectionHead title="For the cultures" icon={<Sparkles size={14} />} />
      <div className="pn-col pn-gap-2">
        <Row
          id={EGGS_SUPPLY.id}
          flash={flash}
          side={
            <Button size="sm" silent data-testid="supplies-buy-eggs" onClick={() => buyEggTin()} disabled={g.finance.money < EGGS_SUPPLY.price}>
              Buy · {formatMoney(EGGS_SUPPLY.price)}
            </Button>
          }
        >
          <div className="pn-row pn-gap-2">
            <b>{EGGS_SUPPLY.name}</b>
            <Badge tone="aqua">New</Badge>
          </div>
          <div className="pn-small pn-muted">
            {eggs} scoops · about {room.cones.length ? Math.floor(eggs / room.cones.length) : 0} days · {EGGS_SUPPLY.scoops} scoops a tin
          </div>
        </Row>
        <Row
          id={VEGETABLES}
          flash={flash}
          side={
            <Button size="sm" silent onClick={() => act({ k: 'buyFood', food: VEGETABLES, packs: 1 }, { sound: 'coin' })} disabled={g.finance.money < veg.price}>
              Buy · {formatMoney(veg.price)}
            </Button>
          }
        >
          <b>{veg.name}</b>
          <div className="pn-small pn-muted">Also feeds the jars · {vegHave} servings</div>
        </Row>
      </div>
    </section>
  );
}

/** Dry food: one row per Autofeeder food in use. */
export function DryFoodSection({ g, flash }: { g: GameState; flash: string | null }) {
  const foods = [...autofeederFoods(g).entries()];
  if (!foods.length) return null;
  return (
    <section>
      <SectionHead title="Dry food" icon={<Utensils size={14} />} />
      <div className="pn-col pn-gap-2">
        {foods.map(([id, tanks]) => {
          const f = getFoodDef(id)!;
          const have = Math.floor(g.inventory.foods[id] ?? 0);
          return (
            <Row
              key={id}
              id={id}
              flash={flash}
              side={
                <>
                  <span className="pn-tiny pn-muted pn-num-t">{have} servings</span>
                  <Button size="sm" silent onClick={() => act({ k: 'buyFood', food: id, packs: 1 }, { sound: 'coin' })} disabled={g.finance.money < f.price}>
                    Buy · {formatMoney(f.price)}
                  </Button>
                </>
              }
            >
              <b>{f.name}</b>
              <div className="pn-small pn-muted">
                Autofeeder · {tanks} {tanks === 1 ? 'tank' : 'tanks'} · {restocker(g)}
              </div>
            </Row>
          );
        })}
      </div>
    </section>
  );
}

/** Marine salt mix in 5, 20 and 40 kg, with its status (§8.5; shown with a salt tank, salt in stock or a Water room). */
export function SaltRow({ g, flash }: { g: GameState; flash: string | null }) {
  const room = g.facility.water;
  const snap = opsSnapshot(g); // memoised per game hour and stock (PERF-004)
  const salt = snap.problems.find((p): p is SupplyProblem => p.kind === 'supply' && p.supply === 'salt');
  const kg = Math.round(g.inventory.salt * 10) / 10;
  const m = stockManager(g);
  const who = m ? m.name.split(' ')[0] : null;
  const f = snap.forecast;
  const needed = !!room && saltWaterNeeded(g);
  const kgDay = needed ? saltWaterPerDay(g) * SALT_KG_PER_GAL : 0;
  const batches = room ? Math.floor((g.inventory.salt + 1e-6) / batchSaltKg(batchGal(room))) : 0;
  const when = (at: number) => (dayOf(at) > dayOf(g.clock.hour) ? `tomorrow, ${formatClock(at)}` : `at ${formatClock(at)}`);
  let status: { tone: 'good' | 'watch' | 'danger'; chip: string; line: string } | null = null;
  if (needed) {
    if (!salt) status = { tone: 'good', chip: 'OK', line: `${kg} kg · about ${Math.max(1, Math.floor(kg / Math.max(0.01, kgDay)))} days` };
    else if (salt.state === 'arriving') status = { tone: 'watch', chip: `Due ${formatClock(salt.arrives ?? g.clock.hour)}`, line: `${kg} kg · ${who ?? 'Your stock manager'} reorders ${when(salt.arrives ?? g.clock.hour).replace(/^at /, '')}` };
    else if (salt.state === 'out') status = { tone: 'danger', chip: 'Out', line: `${kg} kg · ${who ? `${who} can’t reorder` : 'no one reorders it'}` };
    else {
      const covers = f && !f.off && f.plan.buys.some((b) => b.kind === 'salt');
      status = { tone: 'watch', chip: 'Low', line: `${kg} kg · ${batches} ${batches === 1 ? 'batch' : 'batches'} left · ${!who ? 'no one reorders it' : covers ? `${who} reorders 40 kg ${when(f!.at)}` : `${who}’s ${formatMoney(f?.budget ?? 0)} budget won’t cover it today`}` };
    }
  }
  return (
    <section>
      <SectionHead title="Marine salt mix" icon={<Waves size={14} />}>
        {status && (
          <Badge tone={status.tone} >
            <span data-testid="supplies-salt-status">{status.chip}</span>
          </Badge>
        )}
      </SectionHead>
      <div className={clsx('pn-supply', flash === SALT_SUPPLY_ID && 'is-flash')} data-food-row={SALT_SUPPLY_ID} data-testid={`supplies-row-${SALT_SUPPLY_ID}`} style={{ flexWrap: 'wrap' }}>
        <span className="pn-supply__swatch pn-supply__swatch--salt" aria-hidden />
        <div className="pn-grow">
          <b>Marine salt mix</b>
          <div className="pn-small pn-muted">
            {needed ? `For the Water room · ${Math.round(kgDay * 10) / 10} kg a day · $${SALT_PRICE_PER_KG} a kg` : 'Used for every marine and brackish water change — brackish water needs only about a third as much. Top off evaporation with fresh water, not salt water.'}
          </div>
          {status ? (
            <div className={`pn-small pn-tone-${status.tone}`} style={{ marginTop: 4 }}>
              {status.line}
            </div>
          ) : (
            <div className="pn-tiny pn-muted pn-num-t">{kg} kg in stock</div>
          )}
        </div>
        <div className="pn-row pn-gap-1" role="group" aria-label="Buy marine salt mix" style={{ flexBasis: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {SALT_BAGS.map((size) => (
            <Button key={size} size="sm" silent className={size === 40 ? 'ops-buy' : undefined} data-testid={`supplies-salt-buy-${size}`} disabled={g.finance.money < size * SALT_PRICE_PER_KG} onClick={() => buySaltBag(size)}>
              {size} kg · {formatMoney(size * SALT_PRICE_PER_KG)}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
