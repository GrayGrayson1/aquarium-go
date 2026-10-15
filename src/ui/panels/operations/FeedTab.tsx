/**
 * Operations › Feed (DESIGN-S3D §7.3; AUTO-033, AUTO-043): the hatchery cones and infusoria jars with their cycles and
 * stock (nothing expires; the room stores a limited amount and says "Full", ADR-0026 decision 7), the live-food dosers,
 * the cultures' supplies (desktop) and Saved this week (desktop). OWNER: lane "automation" (chunk 5).
 */
import { ChevronRight, Egg, PiggyBank, ShoppingBag, Sparkles, Syringe } from 'lucide-react';
import type { GameState } from '@/types';
import { Button, formatMoney } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { formatClock, dayOf } from '@/sim/time';
import { BRINE, EGGS_SUPPLY, FOOD_ROOM, INFUSORIA, VEGETABLES } from '@/data/catalog/machines';
import { getFoodDef } from '@/data/catalog/foods';
import { cultureState, doserNeeds, doserOf, isHeld, savedThisWeek, storeCap, type CultureKind } from '@/sim/automation';
import { opsMemo } from '@/ui/common/ops';
import { Status, NewChip, Kicker, OpsBar } from './parts';
import { buyEggTin, buyVegPack } from './actions';
import type { OpsNav } from './OperationsPanel';

const stock = (g: GameState, id: string) => Math.max(0, Math.floor(g.inventory.foods[id] ?? 0));

export function FeedTab({ g, small }: { g: GameState; nav: OpsNav; small: boolean }) {
  const room = g.facility.food;
  if (!room) return null;
  const held = isHeld(g, 'food');
  const last = (g.automation?.days ?? []).filter((d) => d.day < dayOf(g.clock.hour)).slice(-1)[0];
  const culture = (kind: CultureKind) => {
    const list = kind === 'cone' ? room.cones : room.jars;
    const food = kind === 'cone' ? BRINE : INFUSORIA;
    const cap = storeCap(room, food);
    const have = stock(g, food);
    const full = list.some((_, i) => cultureState(g, room, kind, i).status === 'full');
    const made = kind === 'cone' ? list.length * FOOD_ROOM.coneYield : Math.round((list.length * FOOD_ROOM.jarYield * 24) / FOOD_ROOM.jarHours);
    const used = last?.used[food] ?? 0;
    return (
      <section className="ops-card" data-testid={kind === 'cone' ? 'feed-hatchery' : 'feed-jars'}>
        <div className="ops-card__head">
          <span className="ops-chip">{kind === 'cone' ? <Egg size={16} aria-hidden /> : <Sparkles size={16} aria-hidden />}</span>
          <h3 className="ops-card__title">{kind === 'cone' ? 'Brine Shrimp Hatchery' : 'Infusoria jars'}</h3>
          <NewChip />
          {held ? <Status tone="watch" icon="held">Held</Status> : full ? <Status tone="watch">Full</Status> : <Status tone="good" icon="running">Running</Status>}
        </div>
        <span className="ops-muted">
          {kind === 'cone'
            ? `${list.length} ${list.length === 1 ? 'cone' : 'cones'} · each takes 1 scoop of eggs and 0.5 gal of salt water`
            : `${list.length} ${list.length === 1 ? 'jar' : 'jars'} · each takes 1 serving of Blanched Vegetables · 3 days`}
        </span>
        <div className="ops-rows">
          {list.map((_, i) => {
            const s = cultureState(g, room, kind, i);
            return (
              <div key={i} className="ops-row" data-testid={`feed-${kind}-${i + 1}`}>
                <span style={{ minWidth: 54 }} className="ops-muted">
                  {kind === 'cone' ? 'Cone' : 'Jar'} {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <OpsBar value={s.progress} kind={kind === 'cone' ? 'violet' : 'gold'} label={`${kind === 'cone' ? 'Cone' : 'Jar'} ${i + 1}: ${Math.round(s.progress * 100)}%`} />
                </div>
                <span className="ops-row__sub" style={{ minWidth: 112, textAlign: 'right' }}>
                  {s.status === 'empty' ? (kind === 'cone' ? 'Empty · needs eggs' : 'Empty · needs vegetables') : s.status === 'full' ? 'Full · waits for room' : s.status === 'held' ? 'Held' : `ready ${formatClock(s.readyHour ?? g.clock.hour)}`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="ops-row">
          <span className="ops-row__main">
            <span className="ops-row__title">{getFoodDef(food)?.name}</span>
            <span className="ops-row__sub">
              {have} of {cap} servings in stock
            </span>
          </span>
          <span className="ops-num ops-muted">
            +{made} / −{used} made / used a day
          </span>
        </div>
      </section>
    );
  };
  const tanks = g.tankOrder.map((id) => g.tanks[id]).filter((t) => t && doserOf(t));
  const dosers = (
    <section className="ops-card" data-testid="feed-dosers">
      <div className="ops-card__head">
        <span className="ops-chip">
          <Syringe size={16} aria-hidden />
        </span>
        <h3 className="ops-card__title">Live-food dosers</h3>
        <NewChip />
      </div>
      <div className="ops-rows">
        {tanks.map((t) => {
          const needs = doserNeeds(g, t);
          const servings = needs.reduce((a, n) => a + n.servings, 0) * 3;
          const words = [...new Set(needs.map((n) => (n.foods[0] === BRINE ? 'baby brine' : 'infusoria')))];
          return (
            <div key={t.id} className="ops-row">
              <div className="ops-row__main">
                <span className="ops-row__title">{t.name}</span>
                <span className="ops-row__sub">{needs.length ? `${needs.reduce((a, n) => a + n.clutch.count, 0)} young · about ${servings} servings of ${words.join(' and ')} a day` : 'idle until the next clutch hatches'}</span>
              </div>
              {held ? <Status tone="watch" icon="held">Held</Status> : needs.length ? <Status tone="good" icon="running">Running</Status> : <Status tone="neutral">Idle</Status>}
            </div>
          );
        })}
        {!tanks.length && <span className="ops-muted">No dosers yet: add one from a tank card’s Equipment.</span>}
      </div>
    </section>
  );
  const eggs = Math.max(0, Math.floor(g.inventory.brineShrimpEggs ?? 0));
  const veg = stock(g, VEGETABLES);
  const vegDef = getFoodDef(VEGETABLES);
  const supplies = small ? (
    <div className="ops-card">
      <div className="ops-row">
        <ShoppingBag size={16} aria-hidden className="ops-muted" />
        <span className="ops-row__main ops-row__sub">Eggs and vegetables for the cultures are in Market › Supplies.</span>
        <button type="button" className="ops-link" onClick={() => go({ kind: 'panel', panel: 'market', tab: 'supplies', target: `food:${EGGS_SUPPLY.id}` })}>
          Open <ChevronRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  ) : (
    <section className="ops-card">
      <Kicker icon={<ShoppingBag size={14} aria-hidden />}>Supplies</Kicker>
      <div className="ops-rows">
        <div className="ops-row">
          <div className="ops-row__main">
            <span className="ops-row__title">
              Brine shrimp eggs <NewChip />
            </span>
            <span className="ops-row__sub">
              {eggs} scoops · about {room.cones.length ? Math.floor(eggs / room.cones.length) : 0} days · {EGGS_SUPPLY.scoops} scoops a tin
            </span>
          </div>
          <Button size="sm" className="ops-buy" data-testid="feed-buy-eggs" onClick={buyEggTin}>
            Buy · {formatMoney(EGGS_SUPPLY.price)}
          </Button>
        </div>
        <div className="ops-row">
          <div className="ops-row__main">
            <span className="ops-row__title">{vegDef?.name ?? 'Blanched Vegetables'}</span>
            <span className="ops-row__sub">
              {veg} servings · about {room.jars.length ? Math.floor((veg * 3) / room.jars.length) : 0} days
            </span>
          </div>
          <Button size="sm" className="ops-buy" data-testid="feed-buy-veg" onClick={buyVegPack}>
            Buy · {formatMoney(vegDef?.price ?? 3)}
          </Button>
        </div>
      </div>
    </section>
  );
  const s = opsMemo('saved', g, () => savedThisWeek(g));
  const brineUsed = s.used.find((u) => u.foodId === BRINE)?.servings ?? 0;
  const infUsed = s.used.find((u) => u.foodId === INFUSORIA)?.servings ?? 0;
  const saved = !small && (
    <section className="ops-card ops-card--good">
      <Kicker icon={<PiggyBank size={14} aria-hidden />}>Saved this week</Kicker>
      <span className="ops-card__body">
        Saved {formatMoney(s.saved)} this week. Buying the {brineUsed} servings of baby brine and {infUsed} of infusoria the tanks used would cost {formatMoney(s.shop)}; making them cost {formatMoney(s.make)}.
      </span>
    </section>
  );
  return small ? (
    <>
      {culture('cone')}
      {culture('jar')}
      {dosers}
      {supplies}
    </>
  ) : (
    <div className="ops-cols">
      <div className="ops-col">
        {culture('cone')}
        {culture('jar')}
      </div>
      <div className="ops-col">
        {dosers}
        {supplies}
        {saved}
      </div>
    </div>
  );
}
