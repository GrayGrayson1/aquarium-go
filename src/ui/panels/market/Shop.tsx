/**
 * Market › Shop — livestock offers, offer detail with destination tank + ALWAYS-on compatibility preview, buy.
 * OWNER: lane "ui-panels".
 */
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Clock, BadgeCheck, ShoppingBag, Store, Lock, Mars, Venus, CircleDashed, Users, Plus, Info, TriangleAlert, Leaf, Sparkles } from 'lucide-react';
import type { Creature, GameState, ShopOffer, Tank, CompatReport } from '@/types';
import { Button, Money, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { buyOffer, offerPickPrice } from '@/sim/economy';
import { describePersonality, isPrismatic, isLotOffer, oneInLabel } from '@/sim/life';
import { PRISMATIC } from '@/data/rarity'; // lane:genetics
import { PrismaticBadge } from '@/ui/common/Prismatic'; // lane:genetics
import { previewAddition, environmentGate } from '@/sim/compat';
import { fitsEnvironment } from '@/sim/compat/salinity'; // lane:brackish
import { SubView } from '../common/PanelLayout';
import { safe } from '../common/hooks';
import { act } from '../common/act';
import { rememberOfferReturn } from './offerReturn'; // lane:qa-play
import { Chip, Card, EmptyState, Callout, SectionHead, Checkbox, KV } from '../common/parts';
import { CreaturePortrait } from '../common/Portrait';
import { CompatPreview, VerdictBadge } from '../common/CompatPreview';
import { PotentialBands, CareChips } from '../common/Profile';
import { orderedTanks, speciesOf, livingInTank, gallonsOf, EMPTY_COMPAT, speciesUnlocked } from '../common/derive';
import { PERSONALITY_LABEL, PERSONALITY_TONE, WATER_CLASS_LABEL, ENV_LABEL, untilTime, plural, SEX_LABEL, RARITY_LABEL, RARITY_TONE, VERDICT_RANK } from '../common/format';

type EnvFilter = 'all' | 'freshwater' | 'marine' | 'brackish' | 'fits'; // lane:brackish: + 'brackish'

export function ShopTab({ g, offerId, setOfferId }: { g: GameState; offerId: string | null; setOfferId: (id: string | null) => void }) {
  const [env, setEnv] = useState<EnvFilter>('all');
  const tanks = orderedTanks(g);
  const envs = new Set(tanks.map((t) => t.environment));
  const offer = offerId ? g.market.stock.find((o) => o.id === offerId) : undefined;

  if (offerId && offer) return <OfferDetail g={g} offer={offer} onBack={() => setOfferId(null)} />;
  if (offerId && !offer)
    return (
      <SubView onBack={() => setOfferId(null)} backLabel="Back to shop">
        <EmptyState icon={<Clock size={24} />} title="This offer has gone">
          Another shop snapped it up, or it expired. New stock arrives regularly.
        </EmptyState>
      </SubView>
    );

  const stock = g.market.stock.filter((o) => {
    const sp = speciesOf(o.speciesId);
    if (!sp) return false;
    if (env === 'fits') return [...envs].some((e) => fitsEnvironment(sp, e)); // lane:brackish: mollies fit fresh tanks too
    if (env !== 'all') return sp.environment === env;
    return true;
  });

  return (
    <div className="pn-stack">
      <div className="pn-row pn-row--wrap pn-gap-2">
        <div className="pn-chips pn-chips--scroll">
          {(
            [
              ['all', 'All stock'],
              ['fits', 'Fits my tanks'],
              ['freshwater', 'Freshwater'],
              ['marine', 'Marine'],
              ...(g.progress.unlocked.includes('brackish') ? ([['brackish', 'Brackish']] as [EnvFilter, string][]) : []), // lane:brackish
            ] as [EnvFilter, string][]
          ).map(([id, label]) => (
            <Chip key={id} onClick={() => setEnv(id)} pressed={env === id}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      {stock.length === 0 ? (
        <EmptyState icon={<Store size={26} />} title={g.market.stock.length ? 'Nothing matches that filter' : 'The shelves are being restocked'}>
          {g.market.stock.length ? 'Try another filter to see more animals.' : 'Breeders deliver new captive-bred animals throughout the day. Check back soon.'}
        </EmptyState>
      ) : (
        <div className="pn-grid pn-grid--2 pn-grid--auto-wide">
          {/* lane:genetics — a Prismatic offer leads the shelf (stable: shop order is otherwise untouched) */}
          {[...stock].sort((a, b) => Number(b.creatures.some(isPrismatic)) - Number(a.creatures.some(isPrismatic))).map((o) => (
            <OfferCard key={o.id} g={g} offer={o} index={g.market.stock.indexOf(o)} onOpen={() => setOfferId(o.id)} tanks={tanks} />
          ))}
        </div>
      )}
      <p className="pn-small pn-muted" style={{ textAlign: 'center' }}>
        <Leaf size={12} style={{ verticalAlign: '-2px' }} /> Captive-bred animals are hardier and kinder to wild reefs and rivers.
      </p>
    </div>
  );
}

function SexMark({ c }: { c: Creature }) {
  if (c.sex === 'male') return <Mars size={13} className="pn-sex pn-sex--m" aria-label="Male" />;
  if (c.sex === 'female') return <Venus size={13} className="pn-sex pn-sex--f" aria-label="Female" />;
  return <CircleDashed size={12} className="pn-sex" aria-label="Unsexed" />;
}

function OfferCard({ g, offer, index, onOpen, tanks }: { g: GameState; offer: ShopOffer; index: number; onOpen: () => void; tanks: Tank[] }) {
  const sp = speciesOf(offer.speciesId);
  const lead = offer.creatures[0];
  const fits = tanks.some((t) => !!sp && fitsEnvironment(sp, t.environment)); // lane:brackish
  const expSoon = offer.expiresHour - g.clock.hour < 6;
  const affordable = g.finance.money >= offer.price;
  const locked = sp ? !speciesUnlocked(g, sp) : false;
  // lane:genetics — a Prismatic in the offer (any member of a group) is the face of the card
  const shimmer = offer.creatures.find((c) => isPrismatic(c));
  const face = shimmer ?? lead;
  return (
    <Card className={clsx('pn-offer', shimmer && 'ag-prismatic-card')} onClick={onOpen} testId={`shop-offer-${index}`} label={`${shimmer ? 'Prismatic ' : ''}${sp?.commonName ?? offer.speciesId}, ${formatMoney(offer.price)}`}>
      <div className="pn-offer__top">
        {face ? <CreaturePortrait creature={face} size={68} /> : null}
        <div className="pn-grow">
          <div className="pn-offer__name">
            {offer.kind === 'group' ? `${offer.creatures.length} × ` : ''}
            {sp?.commonName ?? offer.speciesId}
            {lead && offer.kind !== 'group' && <SexMark c={lead} />}
          </div>
          <div className="pn-offer__morph pn-ellipsis">
            {lead?.morphName && !/^wild/i.test(lead.morphName) ? lead.morphName : sp?.scientificName}
          </div>
          {offer.tier && offer.tier !== 'standard' && (
            <div style={{ marginTop: 6 }}>
              <TierChip tier={offer.tier} />
            </div>
          )}
        </div>
      </div>
      <div className="pn-chips">
        {shimmer && <PrismaticBadge />}
        {lead?.captiveBred && (
          <Chip tone="good" icon={<BadgeCheck size={11} />}>
            Captive-bred
          </Chip>
        )}
        {sp && sp.rarity !== 'common' && <Chip tone={RARITY_TONE[sp.rarity]}>{RARITY_LABEL[sp.rarity]}</Chip>}
        {lead?.personality.slice(0, offer.kind === 'group' ? 1 : 2).map((p) => (
          <Chip key={p} tone={PERSONALITY_TONE[p] ?? 'neutral'}>
            {PERSONALITY_LABEL[p]}
          </Chip>
        ))}
      </div>
      {lead && (
        <div className="pn-offer__bands">
          <PotentialBands p={lead.genome.potentials} sp={sp} highlightOnly max={2} />
        </div>
      )}
      <div className="pn-offer__foot">
        <div className="pn-grow pn-col pn-gap-1">
          <span className="pn-small pn-dim pn-ellipsis">{offer.seller}</span>
          <span className={clsx('pn-tiny', expSoon ? 'pn-tone-watch' : 'pn-muted')}>
            <Clock size={11} style={{ verticalAlign: '-1px' }} /> {offer.expiresHour <= g.clock.hour + 0.25 ? 'Leaving soon' : `Leaves ${untilTime(offer.expiresHour, g.clock.hour)}`}
          </span>
        </div>
        <div className="pn-offer__price">
          <Money value={offer.price} />
          {!fits && <span className="pn-tiny pn-tone-watch">Needs a {sp ? ENV_LABEL[sp.environment].toLowerCase() : ''} tank</span>}
          {fits && !affordable && <span className="pn-tiny pn-tone-watch">Can’t afford yet</span>}
          {locked && (
            <span className="pn-tiny pn-muted">
              <Lock size={10} /> Locked
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function OfferDetail({ g, offer, onBack }: { g: GameState; offer: ShopOffer; onBack: () => void }) {
  const sp = speciesOf(offer.speciesId);
  const tanks = orderedTanks(g);
  const focused = useUI((s) => s.focusedTankId);
  const suitable = tanks.filter((t) => sp && fitsEnvironment(sp, t.environment)); // lane:brackish
  const [tankId, setTankId] = useState<string | null>(() => {
    const f = tanks.find((t) => t.id === focused && sp && fitsEnvironment(sp, t.environment));
    return f?.id ?? suitable[0]?.id ?? tanks[0]?.id ?? null;
  });
  const [picked, setPicked] = useState<Set<number>>(() => new Set(offer.creatures.map((_, i) => i)));
  const [ack, setAck] = useState(false);
  const [active, setActive] = useState(0);
  const tank = tankId ? g.tanks[tankId] : undefined;
  const chosen = offer.creatures.filter((_, i) => picked.has(i));
  // The same quote buyOffer charges (lane:fix-econ, S13-11): a partial pick is never priced above the whole group.
  const { unit: unitPrice, price } = offerPickPrice(offer, chosen.length);
  const lead = offer.creatures[active] ?? offer.creatures[0];
  const lot = isLotOffer(offer); // lane:genetics — a group with a Prismatic is bought whole
  const shimmer = offer.creatures.some((c) => isPrismatic(c));

  const gate = useMemo(() => (sp && tank ? safe(() => environmentGate(sp, tank), { ok: sp.environment === tank.environment }) : { ok: false, reason: 'Choose a destination tank.' }), [sp, tank]);
  const report: CompatReport | null = useMemo(() => {
    if (!tank || !sp || !gate.ok || chosen.length === 0) return null;
    const sexes = new Set(chosen.map((c) => c.sex));
    return safe(
      () =>
        previewAddition(g, tank.id, {
          speciesId: sp.id,
          count: chosen.length,
          sex: sexes.size === 1 ? chosen[0].sex : undefined,
          sizeCm: Math.max(...chosen.map((c) => c.sizeCm)),
        }),
      EMPTY_COMPAT,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, tank?.id, sp?.id, gate.ok, picked]);

  if (!sp) return null;
  const risky = !!report && VERDICT_RANK[report.verdict] >= VERDICT_RANK.high_risk;
  const locked = !speciesUnlocked(g, sp);
  const afford = g.finance.money >= price;
  const tooSmall = tank ? gallonsOf(tank) < sp.recommendedMinTankGallons : false;
  const canBuy = !!tank && gate.ok && afford && chosen.length > 0 && (!risky || ack) && !locked;

  const buy = () => {
    if (!tank || !canBuy) return;
    const idx = offer.kind === 'group' && picked.size !== offer.creatures.length ? [...picked].sort((a, b) => a - b) : undefined;
    const r = act((d) => buyOffer(d, offer.id, tank.id, idx), { sound: 'coin', kind: 'celebrate' });
    if (r?.ok) {
      onBack();
      useUI.getState().set({ focusedTankId: tank.id });
    }
  };

  return (
    <SubView onBack={onBack} backLabel="Back to shop" title={<span className="pn-ellipsis">{offer.seller}</span>}>
      <div className="pn-offerhero">
        <CreaturePortrait creature={lead} size={148} className="pn-offerhero__portrait" />
        <div className="pn-grow pn-col pn-gap-2">
          <div>
            <h3 className="pn-offerhero__name">
              {offer.kind === 'group' ? `${offer.creatures.length} ${sp.commonName}` : sp.commonName}
            </h3>
            <div className="pn-offerhero__sci">{sp.scientificName}</div>
          </div>
          <div className="pn-chips">
            <PrismaticBadge creature={lead} />
            {offer.tier && offer.tier !== 'standard' && <TierChip tier={offer.tier} />}
            {lead.morphName && <Chip tone="aqua">{lead.morphName}</Chip>}
            <Chip>
              {SEX_LABEL[lead.sex]} · {lead.sizeCm.toFixed(1)} cm
            </Chip>
            {lead.captiveBred ? (
              <Chip tone="good" icon={<BadgeCheck size={11} />}>
                Captive-bred
              </Chip>
            ) : (
              <Chip tone="watch">Wild-caught</Chip>
            )}
            {lead.personality.map((p) => (
              <Chip key={p} tone={PERSONALITY_TONE[p] ?? 'neutral'}>
                {PERSONALITY_LABEL[p]}
              </Chip>
            ))}
          </div>
          <CareChips sp={sp} />
          {safe(() => describePersonality(lead), '') && <p className="pn-small pn-dim" style={{ margin: 0 }}>{safe(() => describePersonality(lead), '')}</p>}
          {offer.note && <p className="pn-quote" style={{ margin: 0 }}>“{offer.note}”</p>}
        </div>
      </div>

      {shimmer && (
        <Callout tone="gold" icon={<Sparkles size={15} />} title="Prismatic — an ultra-rare individual">
          About {oneInLabel(PRISMATIC.shopChance)} animals a seller stocks shimmers like this, and it is valued about {PRISMATIC.valueMultiplier}× an ordinary animal. The shimmer is permanent. It isn’t a gene: its young are likelier, never certain, to share it.
          {lot ? ' This group is sold as one lot.' : ''}
        </Callout>
      )}

      {offer.kind === 'group' && offer.creatures.length > 1 && (
        <section>
          <SectionHead title={lot ? `Sold as one lot · ${offer.creatures.length} animals` : `Choose individuals · ${chosen.length} of ${offer.creatures.length}`} icon={<Users size={14} />} />
          <div className="pn-pickgrid">
            {offer.creatures.map((c, i) => (
              <div key={c.id} className={clsx('pn-pick', picked.has(i) && 'is-on', active === i && 'is-active')}>
                <button type="button" className="pn-pick__btn" onClick={() => setActive(i)} aria-label={`Inspect individual ${i + 1}`}>
                  <CreaturePortrait creature={c} size={52} />
                  <span className="pn-tiny pn-dim">
                    {SEX_LABEL[c.sex]} · {c.sizeCm.toFixed(1)} cm
                  </span>
                </button>
                <Checkbox
                  checked={picked.has(i)}
                  label={`Include individual ${i + 1}`}
                  hideLabel
                  disabled={lot}
                  title={lot ? 'Sold as one lot — this group includes a Prismatic' : undefined}
                  onChange={(v) => {
                    const n = new Set(picked);
                    if (v) n.add(i);
                    else n.delete(i);
                    setPicked(n);
                  }}
                />
              </div>
            ))}
          </div>
          {sp.social.minGroup > 1 && chosen.length < sp.social.minGroup && (
            <Callout tone="watch" icon={<Users size={15} />}>
              {sp.commonName} feel safest in groups of {sp.social.minGroup} or more.
            </Callout>
          )}
        </section>
      )}

      <section>
        <SectionHead title={offer.kind === 'group' ? 'Selected individual' : 'Individual profile'} icon={<Info size={14} />} />
        <div className="pn-card pn-card--flat">
          <PotentialBands p={lead.genome.potentials} sp={sp} />
          <p className="pn-tiny pn-muted" style={{ marginTop: 10, marginBottom: 0 }}>
            Potentials describe what this animal may grow into and pass on. They shape market value, not worth.
          </p>
        </div>
      </section>

      <section>
        <SectionHead title="Destination tank" />
        {tanks.length === 0 ? (
          <Callout tone="watch" icon={<TriangleAlert size={16} />} action={<Button size="sm" onClick={() => useUI.getState().set({ panel: 'build', panelTarget: 'tab:tanks' })}>Buy a tank</Button>}>
            You need an aquarium first.
          </Callout>
        ) : (
          <div className="pn-desttanks" role="radiogroup" aria-label="Destination tank">
            {tanks.map((t) => {
              const ok = fitsEnvironment(sp, t.environment); // lane:brackish
              const n = livingInTank(g, t.id).length;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={t.id === tankId} className={clsx('pn-desttank', t.id === tankId && 'is-on', !ok && 'is-bad')} onClick={() => { setTankId(t.id); setAck(false); }}>
                  <span className="pn-desttank__name pn-ellipsis">{t.name}</span>
                  <span className="pn-tiny pn-muted pn-ellipsis">
                    {gallonsOf(t)} gal · {WATER_CLASS_LABEL[t.waterClass]}
                  </span>
                  <span className={clsx('pn-tiny', ok ? 'pn-muted' : 'pn-tone-danger')}>{ok ? plural(n, 'resident') : 'Wrong water'}</span>
                </button>
              );
            })}
            <button
              type="button"
              className="pn-desttank pn-desttank--new"
              onClick={() => {
                // lane:qa-play — Quick buy comes back to this offer; lane:fix-panels — Build opens on water the animal can live in
                rememberOfferReturn(offer.id, sp.waterClasses.find((w) => tanks.some((t) => t.waterClass === w)) ?? sp.waterClasses[0]);
                useUI.getState().set({ panel: 'build', panelTarget: 'tab:tanks' });
              }}
            >
              <Plus size={16} />
              <span className="pn-tiny">New tank</span>
            </button>
          </div>
        )}
        {suitable.length === 0 && tanks.length > 0 && (
          <Callout tone="danger" icon={<TriangleAlert size={16} />}>
            None of your tanks hold {ENV_LABEL[sp.environment].toLowerCase()} water. Set one up in Build first.
          </Callout>
        )}
      </section>

      {tank && (
        <section className="pn-col pn-gap-2">
          <CompatPreview report={report} gate={gate} title={`Compatibility with ${tank.name}`} focusSpeciesId={sp?.id} /* lane:qa-play */ />
          {gate.ok && tooSmall && (
            <Callout tone="watch" icon={<TriangleAlert size={15} />}>
              {sp.commonName} need at least {sp.recommendedMinTankGallons} gallons as adults; {tank.name} is {gallonsOf(tank)} gallons.
            </Callout>
          )}
          {!sp.waterClasses.includes(tank.waterClass) && gate.ok && (
            <Callout tone="watch" icon={<Info size={15} />}>
              {sp.commonName} usually live in {sp.waterClasses.map((w) => WATER_CLASS_LABEL[w].toLowerCase()).join(' or ')} setups.
            </Callout>
          )}
        </section>
      )}

      <div className="pn-buybar">
        {risky && gate.ok && (
          <div className="pn-buybar__ack">
            <CheckboxAck checked={ack} onChange={setAck} />
          </div>
        )}
        <div className="pn-buybar__row">
          <div className="pn-buybar__sum">
            <span className="pn-buybar__price">
              <Money value={price} />
            </span>
            <span className={clsx('pn-tiny', afford ? 'pn-muted' : 'pn-tone-danger')}>
              {offer.kind === 'group' ? `${groupPriceNote(chosen.length, offer.creatures.length, unitPrice, price)} · ` : ''}
              {formatMoney(g.finance.money - price)} left after
            </span>
          </div>
          {report && gate.ok && <VerdictBadge verdict={report.verdict} />}
          <Button variant="primary" size="lg" disabled={!canBuy} onClick={buy} data-testid="buy-offer" silent>
            <ShoppingBag size={17} /> {locked ? 'Locked' : chosen.length === 0 ? 'Pick at least one animal' /* lane:qa-r3 — was "Buy for $0" */ : !afford ? 'Not enough money' : !gate.ok ? 'Choose a suitable tank' : risky && !ack ? 'Confirm the risk first' : `Buy for ${formatMoney(price)}`}
          </Button>
        </div>
        {locked && <span className="pn-tiny pn-muted">{sp.unlock.hint}</span>}
      </div>
    </SubView>
  );
}

/**
 * How a group's price adds up: the whole group can be cheaper than its per-animal price ("All 6 · $5 group discount"),
 * a partial pick is simply "4 × $9.17 each".
 */
function groupPriceNote(n: number, total: number, unit: number, price: number): string {
  const listSum = unit * n;
  if (n === total && listSum - price >= 0.5) return `All ${n} · ${formatMoney(listSum - price)} group discount`;
  return `${n} × ${formatMoney(unit, { cents: Math.abs(unit - Math.round(unit)) > 0.004 })} each`;
}

function TierChip({ tier }: { tier: NonNullable<ShopOffer['tier']> }) {
  if (tier === 'breeder') return <Chip tone="aqua">Breeder line</Chip>;
  if (tier === 'rare') return <Chip tone="violet">Rare find</Chip>;
  if (tier === 'special') return <Chip tone="gold" icon={<Sparkles size={11} />}>Today only</Chip>;
  return null;
}

function CheckboxAck({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <Checkbox checked={checked} onChange={onChange} label="I understand the risks and want to go ahead" />;
}
