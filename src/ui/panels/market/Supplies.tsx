/**
 * Market › Supplies — foods, salt, equipment for a tank (buy & install), decor shortcut to Build.
 * OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Utensils, Waves, Wrench, Mountain, Lock, Check, Package } from 'lucide-react';
import type { GameState, FoodDef, EquipmentDef } from '@/types';
import { Button, Money, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { FOODS } from '@/data/catalog/foods';
import { EQUIPMENT } from '@/data/catalog/equipment';
import { buyFood, buySalt, buyEquipment, SALT_PRICE_PER_KG } from '@/sim/economy';
import { act } from '../common/act';
import { Chip, SectionHead, EmptyState, Select, Card } from '../common/parts';
import { orderedTanks, ownedCreatures, speciesOf, gallonsOf, unlocked } from '../common/derive';
import { titleCase } from '../common/format';
import { UNLOCK_KEYS } from '@/data/unlockKeys';

/** How many foods show before "Show all" — foods you own (or have owned) and foods made for your animals always show. */
const FOOD_PREVIEW = 8;

/**
 * A food named for one of the species that eats it ("Axolotl Pellets", "Goldfish Pellets"): the food's first word is
 * the species' own noun. ("Frozen Brine Shrimp" is not *for* cherry shrimp, so only the first word counts.)
 */
function madeFor(f: FoodDef, eaters: { id: string; commonName: string }[]): boolean {
  const first = f.name.toLowerCase().split(/\s+/)[0] ?? '';
  if (first.length < 4) return false;
  return eaters.some((sp) => [sp.id.split('_').pop() ?? sp.id, sp.commonName.toLowerCase().split(/\s+/).pop() ?? ''].includes(first));
}

export function SuppliesTab({ g, focusFood }: { g: GameState; /** Deep link (`food:<id>` → Market): show, scroll to and highlight this food. */ focusFood?: { id: string; n: number } | null }) {
  const focused = useUI((s) => s.focusedTankId);
  const tanks = orderedTanks(g);
  const [tankId, setTankId] = useState<string>(() => (focused && g.tanks[focused] ? focused : tanks[0]?.id ?? ''));
  const tank = g.tanks[tankId];
  const hasMarine = tanks.some((t) => t.environment === 'marine' || t.environment === 'brackish'); // lane:brackish: brackish tanks use marine salt too

  const ownedSpecies = useMemo(() => [...new Set(ownedCreatures(g).map((c) => c.speciesId))].map((id) => speciesOf(id)).filter((x): x is NonNullable<typeof x> => !!x), [g]);
  const [allFoods, setAllFoods] = useState(false);

  const foods = useMemo(() => {
    const eaters = (f: FoodDef) => ownedSpecies.filter((sp) => sp.foods.some((t) => f.tags.includes(t)));
    const rows = FOODS.map((f) => {
      const e = eaters(f);
      const known = f.id in g.inventory.foods; // owned now, or bought/used before (the key stays at 0 when it runs out)
      const specific = e.length > 0 && madeFor(f, e);
      return { f, eaters: e, have: g.inventory.foods[f.id] ?? 0, known, specific, pinned: known || specific };
    });
    // your animals' foods first — the ones made for them and the ones you already use at the very top — then the rest
    return rows.sort(
      (a, b) =>
        Number(b.eaters.length > 0) - Number(a.eaters.length > 0) ||
        Number(b.pinned) - Number(a.pinned) ||
        Number(b.specific) - Number(a.specific) ||
        b.eaters.length - a.eaters.length ||
        b.have - a.have ||
        a.f.price - b.f.price,
    );
  }, [ownedSpecies, g.inventory.foods]);
  const shownFoods = useMemo(() => {
    if (allFoods) return foods;
    const forced = (r: (typeof foods)[number]) => r.pinned || r.f.id === focusFood?.id;
    let extra = Math.max(0, FOOD_PREVIEW - foods.filter(forced).length);
    return foods.filter((r) => {
      if (forced(r)) return true;
      if (r.eaters.length === 0 || extra <= 0) return false;
      extra--;
      return true;
    });
  }, [foods, allFoods, focusFood?.id]);

  // deep link: bring the requested food into view and flash it (after the panel's own scroll-to-top on tab switch)
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!focusFood) return;
    setFlash(focusFood.id);
    const t1 = window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-food-row="${CSS.escape(focusFood.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    const t2 = window.setTimeout(() => setFlash(null), 2600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [focusFood]);

  const equipment = useMemo(() => {
    if (!tank) return [];
    const gal = gallonsOf(tank);
    return EQUIPMENT.filter((e) => e.environments.includes(tank.environment)).map((e) => ({ e, fits: gal >= e.gallonsRange.min * 0.6 && gal <= e.gallonsRange.max * 1.4, installed: tank.equipment.some((x) => x.defId === e.id) }));
  }, [tank]);

  const byKind = useMemo(() => {
    const m = new Map<string, typeof equipment>();
    for (const row of equipment) {
      const k = row.e.kind;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(row);
    }
    return [...m.entries()];
  }, [equipment]);

  return (
    <div className="pn-stack pn-stack--lg">
      <section>
        <SectionHead title="Food" icon={<Utensils size={14} />} />
        {foods.length === 0 ? (
          <EmptyState icon={<Utensils size={22} />} title="Food catalogue coming soon">
            Your supplier is still unpacking.
          </EmptyState>
        ) : (
          <div className="pn-col pn-gap-2">
            {shownFoods.map(({ f, eaters, specific }) => {
              const have = g.inventory.foods[f.id] ?? 0;
              const locked = !unlocked(g, f.unlock);
              return (
                <div key={f.id} className={clsx('pn-supply', flash === f.id && 'is-flash', have <= 0 && f.id in g.inventory.foods && eaters.length > 0 && 'is-out')} data-food-row={f.id}>
                  <span className="pn-supply__swatch" style={{ background: `radial-gradient(circle at 35% 35%, #fff8, ${f.color})` }} aria-hidden />
                  <div className="pn-grow">
                    <div className="pn-row pn-gap-2 pn-row--wrap">
                      <b>{f.name}</b>
                      {specific && <Chip tone="aqua">Made for {eaters.length === 1 ? eaters[0].commonName.toLowerCase() : 'your animals'}</Chip>}
                      {eaters.length > 0 && !specific && (
                        <Chip tone="good" title={eaters.map((e) => e.commonName).join(', ')}>
                          For {eaters.slice(0, 2).map((e) => e.commonName.toLowerCase()).join(', ')}
                          {eaters.length > 2 ? ` +${eaters.length - 2}` : ''}
                        </Chip>
                      )}
                      <Chip>{titleCase(f.delivery)}</Chip>
                    </div>
                    <div className="pn-small pn-muted">
                      {f.description} · {f.servingsPerPack} servings per pack
                    </div>
                  </div>
                  <div className="pn-supply__side">
                    <span className={clsx('pn-tiny pn-num-t', have <= 0 && f.id in g.inventory.foods && eaters.length > 0 ? 'pn-tone-watch' : 'pn-muted')}>{have <= 0 && f.id in g.inventory.foods ? 'Out of stock' : `${have} serving${have === 1 ? '' : 's'}`}</span>
                    {locked ? (
                      <span className="pn-tiny pn-muted">
                        <Lock size={11} /> {f.unlock ? UNLOCK_KEYS[f.unlock as keyof typeof UNLOCK_KEYS] ?? 'Locked' : 'Locked'}
                      </span>
                    ) : (
                      <Button size="sm" silent onClick={() => act((d) => buyFood(d, f.id, 1), { sound: 'coin' })} disabled={g.finance.money < f.price}>
                        Buy · {formatMoney(f.price)}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {foods.length > shownFoods.length && (
              <button type="button" className="pn-link" onClick={() => setAllFoods(true)}>
                Show all {foods.length} foods
              </button>
            )}
          </div>
        )}
      </section>

      {(hasMarine || g.inventory.salt > 0) && (
        <section>
          <SectionHead title="Marine salt" icon={<Waves size={14} />} />
          <div className="pn-supply">
            <span className="pn-supply__swatch pn-supply__swatch--salt" aria-hidden />
            <div className="pn-grow">
              <b>Reef-grade salt mix</b>
              <div className="pn-small pn-muted">Used for every marine and brackish water change — brackish water needs only about a third as much. Top off evaporation with fresh water, not salt water.</div>
            </div>
            <div className="pn-supply__side">
              <span className="pn-tiny pn-muted pn-num-t">{g.inventory.salt.toFixed(1)} kg in stock</span>
              <div className="pn-row pn-gap-1">
                <Button size="sm" silent disabled={g.finance.money < 5 * SALT_PRICE_PER_KG} onClick={() => act((d) => buySalt(d, 5), { sound: 'coin' })}>
                  5 kg · {formatMoney(5 * SALT_PRICE_PER_KG)}
                </Button>
                <Button size="sm" silent disabled={g.finance.money < 20 * SALT_PRICE_PER_KG} onClick={() => act((d) => buySalt(d, 20), { sound: 'coin' })}>
                  20 kg · {formatMoney(20 * SALT_PRICE_PER_KG)}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHead title="Equipment" icon={<Wrench size={14} />}>
          {tanks.length > 1 && <Select<string> label="Tank" value={tankId} onChange={setTankId} options={tanks.map((t) => ({ id: t.id, label: t.name }))} />}
        </SectionHead>
        {!tank ? (
          <EmptyState icon={<Wrench size={22} />} title="No tank to equip" />
        ) : byKind.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="Equipment catalogue coming soon">
            Filters, heaters and lights will appear here.
          </EmptyState>
        ) : (
          <div className="pn-col pn-gap-3">
            <p className="pn-small pn-muted" style={{ margin: 0 }}>
              For <b className="pn-dim">{tank.name}</b> · {gallonsOf(tank)} gallons. Manage installed gear in Build → Equipment.
            </p>
            {byKind.map(([kind, rows]) => (
              <div key={kind} className="pn-col pn-gap-2">
                <div className="pn-tiny pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {titleCase(kind)}
                </div>
                {rows.map(({ e, fits, installed }) => (
                  <EquipRow key={e.id} g={g} e={e} fits={fits} installed={installed} tankId={tank.id} />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHead title="Decor & plants" icon={<Mountain size={14} />} />
        <Card onClick={() => useUI.getState().set({ panel: 'build', panelTarget: 'tab:decor' })} label="Open decor in Build">
          <div className="pn-row pn-gap-3">
            <span className="pn-head__icon">
              <Mountain size={18} />
            </span>
            <div className="pn-grow">
              <b>Rocks, wood, plants and corals</b>
              <div className="pn-small pn-muted">Choose and place decor directly in your tank from the Build panel.</div>
            </div>
            <Chip tone="aqua">Open Build</Chip>
          </div>
        </Card>
      </section>
    </div>
  );
}

export function EquipRow({ g, e, fits, installed, tankId }: { g: GameState; e: EquipmentDef; fits: boolean; installed: boolean; tankId: string }) {
  const locked = !unlocked(g, e.unlock);
  return (
    <div className="pn-supply">
      <div className="pn-grow">
        <div className="pn-row pn-gap-2 pn-row--wrap">
          <b>{e.name}</b>
          <Chip tone={e.tier === 3 ? 'gold' : e.tier === 2 ? 'aqua' : 'neutral'}>Tier {e.tier}</Chip>
          {installed && (
            <Chip tone="good" icon={<Check size={11} />}>
              Installed
            </Chip>
          )}
          {!fits && <Chip tone="watch">Sized for {e.gallonsRange.min}–{e.gallonsRange.max} gal</Chip>}
        </div>
        <div className="pn-small pn-muted">
          {e.description} · upkeep {formatMoney(e.upkeep, { cents: e.upkeep < 10 })}/day
        </div>
      </div>
      <div className="pn-supply__side">
        <Money value={e.price} />
        {locked ? (
          <span className="pn-tiny pn-muted">
            <Lock size={11} /> {e.unlock ? UNLOCK_KEYS[e.unlock as keyof typeof UNLOCK_KEYS] ?? 'Locked' : 'Locked'}
          </span>
        ) : (
          <Button size="sm" variant={installed ? 'default' : 'primary'} silent disabled={g.finance.money < e.price} onClick={() => act((d) => buyEquipment(d, tankId, e.id), { sound: 'coin' })}>
            {installed ? 'Buy another' : 'Buy & install'}
          </Button>
        )}
      </div>
    </div>
  );
}

