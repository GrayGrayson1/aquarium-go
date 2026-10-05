/**
 * Market › Create Listing wizard: kind → items → pricing → duration → photo → review → confirm.
 * Whole-tank listings show exactly what is included and what is not; selling the last tank or the starter warns.
 * OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Fish, Users, Heart, Baby, Layers, Check, ChevronRight, Camera, RefreshCw, TriangleAlert, Sparkles, Info, Mars, Venus, CircleDashed, Egg, Tag, ImageOff, Wrench, Mountain, Sprout } from 'lucide-react';
import type { Creature, GameState, ListingKind, Tank } from '@/types';
import { Button, Money, formatMoney, StatusBadge } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { createListing, suggestPricing, creatureValue, tankValuation, previewListing, marketAccess, LISTING_DURATION_PRESETS, DEFAULT_LISTING_HOURS, type ListingSpec, type ListingPreview } from '@/sim/economy';
import { capturePhoto } from '@/render/camera/photo';
import { isPrismatic } from '@/sim/life'; // lane:genetics
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getDecorDef } from '@/data/catalog/decor';
import { safe } from '../common/hooks';
import { act, toast } from '../common/act';
import { Chip, Card, EmptyState, Callout, SectionHead, NumberField, Checkbox, KV, Seg, Bar, LoadMore, usePaged } from '../common/parts';
import { CreaturePortrait } from '../common/Portrait';
import { OffspringOdds } from '../common/Offspring';
import { TankThumb } from '../common/TankThumb';
import { VerdictBadge } from '../common/CompatPreview';
import { orderedTanks, livingInTank, clutchesIn, valueOf, speciesOf, isListed, tierOf, gallonsOf, creatureCondition, morphName } from '../common/derive';
import { FragPicker, FragReview, FragValueDetails } from './FragListing'; // lane:frags
import { useExpandSheet } from '../common/PanelLayout';
import { LISTING_KIND_LABEL, DIFFICULTY_LABEL, WATER_CLASS_LABEL, LIFE_STAGE_LABEL, SEX_LABEL, nicePrice, plural, nameList, formatSpan, titleCase, VERDICT_RANK } from '../common/format';

export interface WizardSeed {
  kind?: ListingKind;
  creatureIds?: string[];
  tankId?: string;
  /** lane:frags — frags/cuttings preselected for a 'frag' listing. */
  fragIds?: string[];
}

type Step = 'kind' | 'items' | 'price' | 'duration' | 'photo' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'kind', label: 'What' },
  { id: 'items', label: 'Choose' },
  { id: 'price', label: 'Price' },
  { id: 'duration', label: 'Duration' },
  { id: 'photo', label: 'Photo' },
  { id: 'review', label: 'Review' },
];

const KINDS: { id: ListingKind; icon: React.ReactNode; blurb: string }[] = [
  { id: 'creature', icon: <Fish size={20} />, blurb: 'One individual — ideal for standout morphs and personalities.' },
  { id: 'group', icon: <Users size={20} />, blurb: 'Several of one species — a shoal, colony or group.' },
  { id: 'pair', icon: <Heart size={20} />, blurb: 'A male and female of one species. Breeders pay extra.' },
  { id: 'juveniles', icon: <Baby size={20} />, blurb: 'A batch of young animals you raised.' },
  { id: 'tank', icon: <Layers size={20} />, blurb: 'A complete working aquarium: tank, gear, decor and residents.' },
  { id: 'frag', icon: <Sprout size={20} />, blurb: 'Coral frags and plant cuttings you propagated: one frag, a pack or a bundle.' }, // lane:frags
];

/** Listing lengths come from the market sim (game days, each labelled with how long it really lasts at 1×). */
const DURATIONS = LISTING_DURATION_PRESETS;
const durationPreset = (h: number) => DURATIONS.find((d) => d.hours === h);

const isYoung = (c: Creature) => c.lifeStage === 'juvenile' || c.lifeStage === 'fry' || c.lifeStage === 'larva';

export function CreateListing({ g, seed, onCancel, onDone }: { g: GameState; seed: WizardSeed; onCancel: () => void; onDone: (listingId?: string) => void }) {
  useExpandSheet(); // lane:fix-integrate-ui — the wizard is not a SubView: expand the phone sheet while it is open (P4-09)
  const [step, setStep] = useState<Step>(seed.kind ? 'items' : 'kind');
  const [kind, setKind] = useState<ListingKind | null>(seed.kind ?? null);
  const [ids, setIds] = useState<string[]>(seed.creatureIds ?? []);
  const [tankId, setTankId] = useState<string | null>(seed.tankId ?? null);
  const [fragIds, setFragIds] = useState<string[]>(seed.fragIds ?? []); // lane:frags
  const [reserve, setReserve] = useState(0);
  const [buyNowOn, setBuyNowOn] = useState(true);
  const [buyNow, setBuyNow] = useState(0);
  const [priceTouched, setPriceTouched] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_LISTING_HOURS);
  const [photo, setPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  // lane:fix-panels — residents of a tank listed as a whole aquarium can't be listed on their own either (sim rule)
  const listedTanks = useMemo(() => new Set(g.market.listings.filter((l) => l.status === 'active' && l.kind === 'tank' && l.tankId).map((l) => l.tankId as string)), [g.market.listings]);
  const eligible = useMemo(() => Object.values(g.creatures).filter((c) => c.status === 'alive' && c.tankId && !listedTanks.has(c.tankId) && !isListed(g, c.id)), [g, listedTanks]);
  const tanks = orderedTanks(g);
  const freeTanks = tanks.filter((t) => !(t.listingId && g.market.listings.some((l) => l.id === t.listingId && l.status === 'active')));
  const chosen = ids.map((id) => g.creatures[id]).filter((c): c is Creature => !!c);
  const tank = tankId ? g.tanks[tankId] : undefined;
  const tankResidents = tank ? livingInTank(g, tank.id) : [];
  const listedElsewhere = tankResidents.filter((c) => isListed(g, c.id));

  const available: Record<ListingKind, number> = useMemo(() => {
    const bySp = new Map<string, Creature[]>();
    for (const c of eligible) bySp.set(c.speciesId, [...(bySp.get(c.speciesId) ?? []), c]);
    const groups = [...bySp.values()].filter((a) => a.length >= 2).length;
    return {
      creature: eligible.length,
      group: groups,
      pair: [...bySp.values()].filter((a) => a.length >= 2).length,
      juveniles: eligible.filter(isYoung).length,
      tank: freeTanks.length,
      frag: (g.inventory.frags ?? []).length, // lane:frags
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, freeTanks.length, g.inventory.frags]);

  const spec: Omit<ListingSpec, 'reserve' | 'durationHours'> | null = kind ? (kind === 'tank' ? { kind, tankId: tankId ?? undefined } : kind === 'frag' ? { kind, fragIds } : { kind, creatureIds: ids }) : null;
  const access = safe(() => marketAccess(g), { listings: true, tankAuctions: true } as { listings: boolean; tankAuctions: boolean; hint?: string });
  const preview: ListingPreview | null = useMemo(
    () => (spec ? safe<ListingPreview | null>(() => previewListing(g, { ...spec, photo: photo ?? undefined }), null) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, ids.join(','), tankId, g.clock.hour, photo, fragIds.join(',')],
  );

  // Suggested prices.
  const pricing = useMemo(() => {
    if (!spec) return { reserve: 0, buyNow: 0, expected: 0, low: 0, high: 0 };
    if (preview?.ok && preview.expected > 0) return { reserve: preview.suggestedReserve, buyNow: preview.suggestedBuyNow, expected: preview.expected, low: preview.low, high: preview.high };
    const s = { ...safe(() => suggestPricing(g, spec), { reserve: 0, buyNow: 0, expected: 0 }), low: 0, high: 0 };
    if (s.expected > 0) return s;
    const expected = kind === 'tank' ? (tankId ? safe(() => tankValuation(g, tankId).expected, 0) : 0) : chosen.reduce((a, c) => a + valueOf(g, c), 0) * (kind === 'pair' ? 1.15 : 1);
    return { expected: Math.round(expected), reserve: nicePrice(expected * 0.85), buyNow: nicePrice(expected * 1.35), low: 0, high: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, ids.join(','), tankId, g.market.demand, preview?.expected, fragIds.join(',')]);

  useEffect(() => {
    if (priceTouched) return;
    setReserve(nicePrice(pricing.reserve));
    setBuyNow(nicePrice(pricing.buyNow || pricing.expected * 1.35));
  }, [pricing.reserve, pricing.buyNow, pricing.expected, priceTouched]);

  const autoTitle = useMemo(() => {
    if (!kind) return '';
    if (kind === 'tank') return tank ? `${tank.name} — ${tierOf(tank)?.gallons ?? ''} gal ${WATER_CLASS_LABEL[tank.waterClass].toLowerCase()} setup` : 'Complete aquarium';
    if (kind === 'frag') return preview?.title ?? 'Frags & cuttings'; // lane:frags
    if (chosen.length === 0) return '';
    const sp = speciesOf(chosen[0].speciesId);
    const common = sp?.commonName ?? 'animal';
    if (kind === 'creature') return `${chosen[0].name} — ${chosen[0].morphName && chosen[0].morphName.toLowerCase() !== 'wild type' ? `${chosen[0].morphName} ` : ''}${common}`;
    if (kind === 'pair') return `Pair of ${common}${common.endsWith('s') ? '' : 's'}`;
    if (kind === 'juveniles') return `${chosen.length} juvenile ${common}${chosen.length === 1 || common.endsWith('s') ? '' : 's'}`;
    return `${chosen.length} ${common}${common.endsWith('s') ? '' : 's'}`;
  }, [kind, tank, chosen]);
  useEffect(() => {
    if (!titleTouched) setTitle(preview?.ok && preview.title ? preview.title : autoTitle);
  }, [autoTitle, titleTouched, preview?.ok, preview?.title]);

  const itemsValid = (() => {
    if (!kind) return { ok: false, why: 'Choose what to sell.' };
    // lane:fix-panels — the sim's own verdict (a resident listed separately, an already-listed tank) stops the wizard
    // here, not six steps later at Confirm
    if (kind === 'tank') return !tank ? { ok: false, why: 'Choose a tank.' } : preview && !preview.ok && preview.message ? { ok: false, why: preview.message } : { ok: true };
    if (kind === 'frag') return fragIds.length === 0 ? { ok: false, why: 'Select at least one frag or cutting.' } : preview && !preview.ok && preview.message ? { ok: false, why: preview.message } : { ok: true }; // lane:frags
    if (chosen.length === 0) return { ok: false, why: 'Select at least one animal.' };
    const species = new Set(chosen.map((c) => c.speciesId));
    if (kind === 'creature' && chosen.length !== 1) return { ok: false, why: 'Choose exactly one animal.' };
    if (kind === 'pair' && (chosen.length !== 2 || species.size !== 1)) return { ok: false, why: 'A pair is two animals of the same species.' };
    if (kind === 'group' && (chosen.length < 2 || species.size !== 1)) return { ok: false, why: 'A group is two or more of one species.' };
    if (kind === 'juveniles' && (!chosen.every(isYoung) || species.size !== 1)) return { ok: false, why: 'Juvenile batches are young animals of one species.' };
    if (preview && !preview.ok && preview.message) return { ok: false, why: preview.message };
    return { ok: true };
  })();
  const priceValid = reserve > 0 && (!buyNowOn || buyNow > reserve);

  const idx = STEPS.findIndex((s) => s.id === step);
  const kindOk = !!kind && available[kind] > 0 && access.listings && (kind !== 'tank' || access.tankAuctions);
  const canNext = step === 'kind' ? kindOk : step === 'items' ? itemsValid.ok : step === 'price' ? priceValid : true;
  const go = (s: Step) => setStep(s);
  const next = () => {
    if (!canNext) return;
    const n = STEPS[idx + 1];
    if (n) {
      if (n.id === 'photo') {
        const focusTank = kind === 'tank' ? tankId : chosen[0]?.tankId;
        if (focusTank) useUI.getState().set({ focusedTankId: focusTank, view: 'tank' });
      }
      go(n.id);
    }
  };
  const back = () => {
    if (idx === 0) onCancel();
    else go(STEPS[idx - 1].id);
  };

  const starter = kind === 'tank' ? tankResidents.find((c) => c.isStarter) : chosen.find((c) => c.isStarter);
  const lastTank = kind === 'tank' && tanks.length === 1;
  const unhealthy = (kind === 'tank' ? tankResidents : chosen).filter((c) => creatureCondition(c) === 'danger');
  const clutchCount = tank && kind === 'tank' ? clutchesIn(g, tank.id).length : 0;

  const confirm = () => {
    if (!kind) return;
    const r = act(
      (d) =>
        createListing(d, {
          kind,
          creatureIds: kind === 'tank' || kind === 'frag' ? undefined : ids,
          tankId: kind === 'tank' ? tankId ?? undefined : undefined,
          fragIds: kind === 'frag' ? fragIds : undefined, // lane:frags
          reserve: Math.round(reserve),
          buyNow: buyNowOn ? Math.round(buyNow) : undefined,
          durationHours: duration,
          title: title.trim() || autoTitle,
          photo: photo ?? undefined,
        }),
      { sound: 'bid', successText: 'Listed! Buyers will start bidding soon.' },
    );
    if (r?.ok) onDone(r.listingId);
  };

  return (
    <div className="pn-wizard">
      <div className="pn-wizard__top">
        <button type="button" className="pn-back" onClick={onCancel}>
          <span aria-hidden>←</span> Cancel
        </button>
        {/* Compact stepper: every step keeps a numbered dot, only the current one spells out its name (all six fit in a
            600px sheet and on phones); the full names are in each dot's tooltip and accessible label. */}
        <ol className="pn-steps" aria-label={`Listing steps: step ${idx + 1} of ${STEPS.length}, ${STEPS[idx]?.label ?? ''}`}>
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={clsx('pn-step', i === idx && 'is-current', i < idx && 'is-done')}
                disabled={i > idx}
                onClick={() => i < idx && go(s.id)}
                aria-current={i === idx ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.label}${i < idx ? ' (done)' : ''}`}
                title={`${i + 1}. ${s.label}`}
              >
                <span className="pn-step__dot">{i < idx ? <Check size={11} /> : i + 1}</span>
                <span className="pn-step__label">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {step === 'kind' && (
        <section className="pn-col pn-gap-3">
          <h3 className="pn-wizard__h">What would you like to sell?</h3>
          {access.hint && (
            <Callout tone={access.listings ? 'info' : 'watch'} icon={<Info size={15} />}>
              {access.hint}
            </Callout>
          )}
          <div className="pn-kinds">
            {KINDS.map((k) => {
              const gated = !access.listings || (k.id === 'tank' && !access.tankAuctions);
              const n = gated ? 0 : available[k.id] ?? 0;
              return (
                <button
                  key={k.id}
                  type="button"
                  data-testid={`listing-kind-${k.id}`}
                  className={clsx('pn-kind', kind === k.id && 'is-on')}
                  disabled={n === 0}
                  onClick={() => {
                    setKind(k.id);
                    // lane:fix-panels — switching between animal kinds keeps the animals that still fit ("list them as
                    // a group instead" used to wipe the selection)
                    setIds(k.id === 'tank' || k.id === 'frag' ? [] : k.id === 'creature' ? ids.slice(0, 1) : k.id === 'pair' ? ids.slice(0, 2) : k.id === 'juveniles' ? ids.filter((id) => g.creatures[id] && isYoung(g.creatures[id])) : ids);
                    if (k.id !== 'tank') setTankId(null);
                    setPriceTouched(false);
                  }}
                >
                  <span className="pn-kind__icon">{k.icon}</span>
                  <span className="pn-kind__label">{LISTING_KIND_LABEL[k.id]}</span>
                  <span className="pn-kind__blurb">{k.blurb}</span>
                  <span className="pn-kind__avail">{gated ? 'Not unlocked yet' : n === 0 ? (k.id === 'tank' ? 'No unlisted tanks' : k.id === 'frag' ? 'Nothing in storage yet' : k.id === 'juveniles' ? 'No juveniles yet' : k.id === 'creature' ? 'No animals available' : 'Need 2+ of a species') : k.id === 'tank' ? plural(n, 'tank') : k.id === 'frag' ? `${n} in storage` : k.id === 'creature' || k.id === 'juveniles' ? plural(n, 'animal') : plural(n, 'species', 'species')}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 'items' && kind === 'frag' && <FragPicker g={g} ids={fragIds} setIds={(v) => { setFragIds(v); setPriceTouched(false); }} />}
      {step === 'items' && kind && kind !== 'tank' && kind !== 'frag' && <CreaturePicker g={g} kind={kind} eligible={eligible} ids={ids} setIds={(v) => { setIds(v); setPriceTouched(false); }} />}
      {step === 'items' && kind === 'tank' && (
        <TankPicker g={g} tanks={freeTanks} tankId={tankId} setTankId={(v) => { setTankId(v); setPriceTouched(false); }} residents={tankResidents} listedElsewhere={listedElsewhere} clutches={clutchCount} lastTank={lastTank} />
      )}

      {step === 'price' && kind && (
        <section className="pn-col pn-gap-4">
          <h3 className="pn-wizard__h">Set your price</h3>
          <div className="pn-pricehero">
            <span className="pn-tiny pn-muted">Expected fair value</span>
            <span className="pn-pricehero__v">
              <Money value={pricing.expected} />
            </span>
            {pricing.low > 0 && pricing.high > 0 && (
              <span className="pn-small pn-dim">
                Buyers typically offer {formatMoney(pricing.low)} – {formatMoney(pricing.high)}
              </span>
            )}
            <span className="pn-small pn-muted">{kind === 'frag' ? 'Based on the coral or plant, how far it has grown out, healing, condition and recent frag sales.' : 'Based on species, condition, looks, lineage and today’s demand.'}</span>
          </div>
          <PriceScale expected={pricing.expected} reserve={reserve} buyNow={buyNowOn ? buyNow : 0} />
          <div className="pn-grid pn-grid--2">
            <div className="pn-field">
              <span className="pn-field__label">Reserve (lowest you’ll take)</span>
              <NumberField value={reserve} onChange={(v) => { setReserve(v); setPriceTouched(true); }} min={1} max={1e6} step={1} bigStep={reserve < 200 ? 5 : 25} prefix="$" label="Reserve price" />
              <span className="pn-field__hint">{reserve > pricing.expected * 1.15 ? 'Above fair value — expect fewer bids.' : reserve < pricing.expected * 0.7 ? 'Low reserve — you may sell below value.' : 'A reserve near fair value attracts steady bidding.'}</span>
            </div>
            <div className="pn-field">
              <span className="pn-field__label pn-row pn-gap-2">
                Buy-now price
                <Checkbox checked={buyNowOn} onChange={setBuyNowOn} label="Offer buy-now" hideLabel />
              </span>
              {buyNowOn ? (
                <NumberField value={buyNow} onChange={(v) => { setBuyNow(v); setPriceTouched(true); }} min={reserve + 1} max={1e6} step={1} bigStep={buyNow < 200 ? 5 : 25} prefix="$" label="Buy-now price" />
              ) : (
                <span className="pn-small pn-muted" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>No instant sale — bids only.</span>
              )}
              <span className="pn-field__hint">{buyNowOn ? (buyNow <= reserve ? 'Buy-now must be above your reserve.' : 'A keen buyer can end the auction instantly at this price.') : 'Turn on to let a buyer purchase immediately.'}</span>
            </div>
          </div>
          {kind === 'frag' ? <FragValueDetails g={g} ids={fragIds} /> : <ValueDetails g={g} kind={kind} chosen={chosen} tankId={tankId} />}
          <div className="pn-row pn-gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setPriceTouched(false); }}>
              <RefreshCw size={14} /> Use suggested prices
            </Button>
          </div>
        </section>
      )}

      {step === 'duration' && (
        <section className="pn-col pn-gap-3">
          <h3 className="pn-wizard__h">How long should it run?</h3>
          <div className="pn-durations" role="radiogroup" aria-label="Listing duration">
            {DURATIONS.map((d) => (
              <button key={d.hours} type="button" role="radio" aria-checked={duration === d.hours} aria-label={`${d.label} (${d.realLabel}): ${d.note}`} className={clsx('pn-duration', duration === d.hours && 'is-on')} onClick={() => setDuration(d.hours)}>
                <span className="pn-duration__label">{d.label}</span>
                <span className="pn-duration__real">{d.realLabel}</span>
                <span className="pn-tiny pn-muted">{d.note}</span>
                {d.hours === DEFAULT_LISTING_HOURS && <span className="pn-duration__tag">Recommended</span>}
              </button>
            ))}
          </div>
          <p className="pn-small pn-muted" style={{ margin: 0 }}>
            Times are game days; the grey line is how long that really takes at normal speed (faster at 3× or 10×). Longer listings reach more buyers, but interest fades and bids expire. You can accept any bid early.
          </p>
        </section>
      )}

      {step === 'photo' && (
        <section className="pn-col pn-gap-3">
          <h3 className="pn-wizard__h">Add a photo (optional)</h3>
          <p className="pn-small pn-muted" style={{ margin: 0 }}>
            A great shot of the tank helps buyers fall in love. Frame the view first — the photo uses the current camera.
          </p>
          <div className="pn-photo">
            {photo ? <img src={photo} alt="Listing photo preview" /> : <div className="pn-photo__empty"><ImageOff size={26} /><span className="pn-small">No photo yet</span></div>}
          </div>
          <div className="pn-row pn-gap-2 pn-row--wrap">
            <Button
              variant="primary"
              silent
              onClick={async () => {
                // lane:fix-panels — a card-sized JPEG (~40–90 KB) instead of a 960px PNG (~800 KB), which the save
                // stripped: no listing photo ever survived a reload
                const url = await capturePhoto({ width: 640, hideUI: true, format: 'image/jpeg', quality: 0.82 }).catch(() => null);
                if (url) {
                  setPhoto(url);
                  import('@/audio/sfx').then((m) => m.sfx('camera'));
                } else toast('Couldn’t capture the view — try again from the tank view.', 'warning');
              }}
            >
              <Camera size={16} /> {photo ? 'Retake photo' : 'Take photo'}
            </Button>
            {photo && (
              <Button variant="ghost" onClick={() => setPhoto(null)}>
                Remove
              </Button>
            )}
          </div>
        </section>
      )}

      {step === 'review' && kind === 'frag' && (
        <FragReview
          g={g}
          ids={fragIds}
          photo={photo}
          title={title}
          setTitle={(t) => { setTitle(t); setTitleTouched(true); }}
          reserve={reserve}
          buyNow={buyNowOn ? buyNow : undefined}
          duration={duration}
          durationReal={durationPreset(duration)?.realLabel}
          expected={pricing.expected}
          snapshot={preview?.ok ? preview.snapshot : undefined}
          warnings={preview?.ok ? preview.warnings : null}
        />
      )}
      {step === 'review' && kind && kind !== 'frag' && (
        <Review
          g={g}
          kind={kind}
          chosen={kind === 'tank' ? tankResidents : chosen}
          tank={tank}
          photo={photo}
          title={title}
          setTitle={(t) => { setTitle(t); setTitleTouched(true); }}
          reserve={reserve}
          buyNow={buyNowOn ? buyNow : undefined}
          duration={duration}
          expected={pricing.expected}
          starter={starter}
          lastTank={lastTank}
          unhealthy={unhealthy}
          warnings={preview?.ok ? preview.warnings : null}
          snapshot={preview?.ok ? preview.snapshot : undefined}
        />
      )}

      <div className="pn-wizard__nav">
        <Button onClick={back}>{idx === 0 ? 'Cancel' : 'Back'}</Button>
        <span className="pn-grow pn-small pn-muted pn-wizard__why">{step === 'items' && !itemsValid.ok ? itemsValid.why : step === 'price' && !priceValid ? 'Set a reserve, and a buy-now above it.' : ''}</span>
        {step === 'review' ? (
          <Button variant="coral" size="lg" data-testid="listing-confirm" silent onClick={confirm} disabled={!itemsValid.ok || !priceValid}>
            <Tag size={16} /> <span className="pn-wizard__confirm" title={starter ? `List — including ${starter.name}` : undefined}>{starter ? `List — including ${starter.name}` : 'Confirm listing'}</span>
          </Button>
        ) : (
          <Button variant="primary" onClick={next} disabled={!canNext}>
            {step === 'photo' && !photo ? 'Skip' : 'Next'} <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function SexIcon({ c }: { c: Creature }) {
  if (c.sex === 'male') return <Mars size={12} className="pn-sex pn-sex--m" aria-label="Male" />;
  if (c.sex === 'female') return <Venus size={12} className="pn-sex pn-sex--f" aria-label="Female" />;
  return <CircleDashed size={11} className="pn-sex" aria-label="Unsexed" />;
}

function CreaturePicker({ g, kind, eligible, ids, setIds }: { g: GameState; kind: ListingKind; eligible: Creature[]; ids: string[]; setIds: (v: string[]) => void }) {
  const pool = kind === 'juveniles' ? eligible.filter(isYoung) : eligible;
  const speciesIds = [...new Set(pool.map((c) => c.speciesId))];
  const seededSp = ids.length ? g.creatures[ids[0]]?.speciesId : undefined;
  // lane:fix-panels — a seeded species with nothing eligible for this kind (adults seeded into 'juveniles') no longer
  // opens on an empty list
  const firstSp = seededSp && speciesIds.includes(seededSp) ? seededSp : undefined;
  const [sp, setSp] = useState<string>(firstSp ?? (kind === 'creature' ? 'all' : speciesIds.find((s) => pool.filter((c) => c.speciesId === s).length >= (kind === 'juveniles' ? 1 : 2)) ?? speciesIds[0] ?? 'all'));
  const list = pool.filter((c) => sp === 'all' || c.speciesId === sp).sort((a, b) => valueOf(g, b) - valueOf(g, a));
  const { shown, more } = usePaged(list.length, `${kind}|${sp}`);
  const single = kind === 'creature';
  const toggle = (id: string, on: boolean) => {
    if (single) return setIds(on ? [id] : []);
    const c = g.creatures[id];
    let next = on ? [...ids, id] : ids.filter((x) => x !== id);
    if (c) next = next.filter((x) => g.creatures[x]?.speciesId === c.speciesId);
    if (kind === 'pair' && next.length > 2) next = next.slice(-2);
    setIds(next);
  };
  const chosen = ids.map((i) => g.creatures[i]).filter(Boolean);
  const pairOk = kind === 'pair' && chosen.length === 2 && new Set(chosen.map((c) => c.sex)).size === 2 && !chosen.some((c) => c.sex === 'unknown');
  const total = chosen.reduce((a, c) => a + valueOf(g, c), 0);

  return (
    <section className="pn-col pn-gap-3">
      <h3 className="pn-wizard__h">{single ? 'Which animal?' : kind === 'pair' ? 'Choose the pair' : kind === 'juveniles' ? 'Choose the juveniles' : 'Choose the group'}</h3>
      {pool.length === 0 ? (
        <EmptyState icon={<Fish size={24} />} title="Nothing available to list">
          Animals already listed elsewhere can’t be listed twice.
        </EmptyState>
      ) : (
        <>
          {speciesIds.length > 1 && (
            <div className="pn-chips pn-chips--scroll">
              {single && (
                <Chip onClick={() => setSp('all')} pressed={sp === 'all'}>
                  All
                </Chip>
              )}
              {speciesIds.map((s) => (
                <Chip key={s} onClick={() => { setSp(s); if (!single) setIds(ids.filter((x) => g.creatures[x]?.speciesId === s)); }} pressed={sp === s}>
                  {speciesOf(s)?.commonName ?? s} · {pool.filter((c) => c.speciesId === s).length}
                </Chip>
              ))}
            </div>
          )}
          {!single && list.length > 1 && (
            <div className="pn-row pn-gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIds(kind === 'pair' ? list.slice(0, 2).map((c) => c.id) : list.map((c) => c.id))}>
                Select {kind === 'pair' ? 'two' : 'all'}
              </Button>
              {ids.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setIds([])}>
                  Clear
                </Button>
              )}
            </div>
          )}
          <ul className="pn-picklist" role="list">
            {list.slice(0, shown).map((c) => {
              const on = ids.includes(c.id);
              const tank = c.tankId ? g.tanks[c.tankId] : undefined;
              return (
                <li key={c.id}>
                  <label className={clsx('pn-pickrow', on && 'is-on')}>
                    <input type={single ? 'radio' : 'checkbox'} name="pn-pick" checked={on} onChange={(e) => toggle(c.id, e.target.checked)} className="pn-sr" />
                    <span className={clsx('pn-pickrow__mark', single && 'is-radio')} aria-hidden>
                      {on && <Check size={12} />}
                    </span>
                    <CreaturePortrait creature={c} size={44} ring={c.isStarter ? 'gold' : null} />
                    <span className="pn-grow pn-col" style={{ gap: 2 }}>
                      <span className="pn-row pn-gap-1">
                        <b className="pn-serif">{c.name}</b>
                        <SexIcon c={c} />
                        {c.isStarter && <Chip tone="gold">Starter</Chip>}
                      </span>
                      <span className="pn-tiny pn-muted pn-ellipsis">
                        {speciesOf(c.speciesId)?.commonName}
                        {c.morphName && c.morphName.toLowerCase() !== 'wild type' ? ` · ${c.morphName}` : ''} · {tank?.name ?? ''}
                      </span>
                    </span>
                    <Money value={valueOf(g, c)} />
                  </label>
                </li>
              );
            })}
            {list.length > shown && (
              <li role="presentation">
                <LoadMore remaining={list.length - shown} onMore={more} noun="animal" />
              </li>
            )}
          </ul>
          {chosen.length > 0 && (
            <div className="pn-small pn-dim">
              Selected: {nameList(chosen.map((c) => c.name))} · worth about <Money value={total} />
            </div>
          )}
          {kind === 'pair' && chosen.length === 2 && pairOk && <OffspringOdds a={chosen[0]} b={chosen[1]} />}
          {kind === 'pair' && chosen.length === 2 && !pairOk && (
            <Callout tone="watch" icon={<Info size={15} />}>
              Buyers pay most for a confirmed male and female. This pair’s sexes {chosen.some((c) => c.sex === 'unknown') ? 'aren’t visible yet' : 'match'}.
            </Callout>
          )}
          {chosen.some((c) => c.isStarter) && (
            <Callout tone="watch" icon={<Sparkles size={15} />} title="Your starter is selected">
              {chosen.find((c) => c.isStarter)?.name} was your very first companion. You can still sell them — just making sure.
            </Callout>
          )}
        </>
      )}
    </section>
  );
}

function TankPicker({ g, tanks, tankId, setTankId, residents, listedElsewhere, clutches, lastTank }: { g: GameState; tanks: Tank[]; tankId: string | null; setTankId: (v: string) => void; residents: Creature[]; listedElsewhere: Creature[]; clutches: number; lastTank: boolean }) {
  const tank = tankId ? g.tanks[tankId] : undefined;
  const included = residents.filter((c) => !listedElsewhere.includes(c));
  const decorByCat = new Map<string, number>();
  for (const d of tank?.decor ?? []) {
    const cat = getDecorDef(d.defId)?.category ?? 'decor';
    decorByCat.set(cat, (decorByCat.get(cat) ?? 0) + 1);
  }
  return (
    <section className="pn-col pn-gap-3">
      <h3 className="pn-wizard__h">Which aquarium?</h3>
      {tanks.length === 0 ? (
        <EmptyState icon={<Layers size={24} />} title="No tanks available">
          All your tanks are already listed.
        </EmptyState>
      ) : (
        <div className="pn-desttanks" role="radiogroup" aria-label="Tank to sell">
          {tanks.map((t) => {
            const held = livingInTank(g, t.id).some((c) => isListed(g, c.id));
            return (
              <button key={t.id} type="button" role="radio" aria-checked={t.id === tankId} className={clsx('pn-desttank pn-desttank--thumb', t.id === tankId && 'is-on', held && 'is-bad')} onClick={() => setTankId(t.id)}>
                <TankThumb tank={t} residents={livingInTank(g, t.id)} width={120} height={80} />
                <span className="pn-desttank__name pn-ellipsis">{t.name}</span>
                <span className={clsx('pn-tiny', held ? 'pn-tone-danger' : 'pn-muted')}>{held ? 'A resident is listed' : `${gallonsOf(t)} gal · ${plural(livingInTank(g, t.id).length, 'animal')}`}</span>
              </button>
            );
          })}
        </div>
      )}
      {tank && (
        <div className="pn-card pn-included">
          <SectionHead title="Included in the sale" icon={<Check size={14} />} />
          <KV label="Aquarium">
            {tierOf(tank)?.name ?? tank.tierId} · {WATER_CLASS_LABEL[tank.waterClass]}
          </KV>
          <KV label={<span className="pn-row pn-gap-1"><Wrench size={12} /> Equipment</span>}>
            {tank.equipment.length ? nameList(tank.equipment.map((e) => getEquipmentDef(e.defId)?.name ?? titleCase(e.defId)), 4) : 'None'}
          </KV>
          <KV label={<span className="pn-row pn-gap-1"><Mountain size={12} /> Decor</span>}>
            {tank.decor.length ? [...decorByCat.entries()].map(([k, n]) => `${n} ${titleCase(k).toLowerCase()}`).join(', ') : 'None'}
          </KV>
          <KV label="Substrate">{titleCase(tank.substrate.kind)}</KV>
          <div className="pn-kv" style={{ display: 'block' }}>
            <span className="pn-kv__k">Residents · {included.length}</span>
            {included.length === 0 ? (
              <div className="pn-small pn-muted" style={{ marginTop: 6 }}>No animals — sold as an empty, running setup.</div>
            ) : (
              <div className="pn-residents">
                {included.map((c) => (
                  <span key={c.id} className="pn-resident" title={`${c.name} · ${speciesOf(c.speciesId)?.commonName ?? ''}`}>
                    <CreaturePortrait creature={c} size={40} ring={c.isStarter ? 'gold' : null} />
                    <span className="pn-tiny pn-ellipsis">{c.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tank && listedElsewhere.length > 0 && (
        // lane:fix-panels — matches the sim: a whole-aquarium sale can't go ahead while a resident has a listing of their own
        <Callout tone="danger" icon={<TriangleAlert size={16} />} title="Can’t list this aquarium yet">
          {nameList(listedElsewhere.map((c) => c.name))} {listedElsewhere.length === 1 ? 'is' : 'are'} listed separately. Withdraw that listing, or move {listedElsewhere.length === 1 ? 'them' : 'them all'} to another tank, and come back.
        </Callout>
      )}
      {tank && clutches > 0 && (
        <Callout tone="watch" icon={<Egg size={16} />} title={`${plural(clutches, 'clutch', 'clutches')} of eggs or fry`}>
          Move them to another tank in Livestock if you want to keep raising them.
        </Callout>
      )}
      {tank && lastTank && (
        <Callout tone="danger" icon={<TriangleAlert size={16} />} title="This is your last aquarium">
          Once it sells you’ll have no tank until you buy another. Make sure you can afford a replacement.
        </Callout>
      )}
      {tank && residents.some((c) => c.isStarter) && (
        <Callout tone="watch" icon={<Sparkles size={16} />} title="Your starter lives here">
          {residents.find((c) => c.isStarter)?.name} will go with the tank to its new owner.
        </Callout>
      )}
    </section>
  );
}

function warningTone(w: string): 'danger' | 'watch' | 'info' | 'gold' {
  const t = w.toLowerCase();
  if (t.includes('last aquarium')) return 'danger';
  if (t.startsWith('included')) return 'info';
  if (t.includes('first animal') || t.includes('starter')) return 'gold';
  return 'watch';
}
function warningIcon(w: string) {
  const t = w.toLowerCase();
  if (t.startsWith('included')) return <Check size={16} />;
  if (t.includes('first animal') || t.includes('starter')) return <Sparkles size={16} />;
  return <TriangleAlert size={16} />;
}

function PriceScale({ expected, reserve, buyNow }: { expected: number; reserve: number; buyNow: number }) {
  const lo = Math.max(0, Math.min(reserve, expected) * 0.6);
  const hi = Math.max(expected * 1.8, buyNow * 1.1, reserve * 1.2, 10);
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="pn-pricescale" aria-hidden>
      <div className="pn-pricescale__track">
        <div className="pn-pricescale__fair" style={{ left: pos(expected * 0.9), width: `calc(${pos(expected * 1.1)} - ${pos(expected * 0.9)})` }} />
        <span className="pn-pricescale__mark pn-pricescale__mark--exp" style={{ left: pos(expected) }}>
          <i />
          <em>Fair {formatMoney(expected)}</em>
        </span>
        {reserve > 0 && (
          <span className="pn-pricescale__mark pn-pricescale__mark--res" style={{ left: pos(reserve) }}>
            <i />
            <em>Reserve</em>
          </span>
        )}
        {buyNow > 0 && (
          <span className="pn-pricescale__mark pn-pricescale__mark--bn" style={{ left: pos(buyNow) }}>
            <i />
            <em>Buy now</em>
          </span>
        )}
      </div>
    </div>
  );
}

function ValueDetails({ g, kind, chosen, tankId }: { g: GameState; kind: ListingKind; chosen: Creature[]; tankId: string | null }) {
  const [open, setOpen] = useState(false);
  const single = kind !== 'tank' && chosen.length === 1 ? safe(() => creatureValue(g, chosen[0]), null) : null;
  const tv = kind === 'tank' && tankId ? safe(() => tankValuation(g, tankId), null) : null;
  const rows: { label: string; value: string; note?: string }[] = [];
  if (single) {
    rows.push({ label: 'Species base', value: formatMoney(single.base) });
    for (const f of single.factors) rows.push({ label: f.label, value: `×${f.mult.toFixed(2)}`, note: f.note });
  } else if (tv) {
    for (const p of tv.parts) rows.push({ label: p.label, value: formatMoney(p.amount), note: p.note });
    for (const m of tv.modifiers) rows.push({ label: m.label, value: `×${m.mult.toFixed(2)}`, note: m.note });
  } else if (chosen.length > 1) {
    for (const c of chosen.slice(0, 8)) rows.push({ label: c.name, value: formatMoney(valueOf(g, c)) });
  }
  if (rows.length === 0) return null;
  return (
    <div className="pn-card pn-card--flat">
      <button type="button" className="pn-link" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Info size={14} /> {open ? 'Hide' : 'How is this valued?'}
      </button>
      {open && (
        <div style={{ marginTop: 6 }}>
          {rows.map((r, i) => (
            <KV key={i} label={r.label} hint={r.note}>
              {r.value}
            </KV>
          ))}
          {tv && (
            <p className="pn-tiny pn-muted" style={{ margin: '8px 0 0' }}>
              Range {formatMoney(tv.low)} – {formatMoney(tv.high)} depending on the buyer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** "1 equipment item(s), 3 decor piece(s)" → "1 equipment item, 3 decor pieces" (sim-side text is being fixed too). */
function fixPlurals(text: string): string {
  return text.replace(/\b(\d+) ((?:[a-z]+ )?)([a-z]+)\(s\)/gi, (_m, n: string, pre: string, word: string) => `${n} ${pre}${word}${Number(n) === 1 ? '' : 's'}`);
}

/** What exactly is for sale, in words a buyer would use: "Leucistic Axolotl" + "Female · Adult", or "4 × Neon Tetra". */
function reviewChips(kind: ListingKind, chosen: Creature[]): { text: string; title?: string; tone?: 'aqua' | 'violet' | 'gold' }[] {
  if (kind === 'tank') return [{ text: LISTING_KIND_LABEL.tank }];
  if (chosen.length === 0) return [{ text: LISTING_KIND_LABEL[kind] }];
  if (kind === 'creature' || chosen.length === 1) {
    const c = chosen[0];
    const sp = speciesOf(c.speciesId);
    const who = [c.sex !== 'unknown' ? SEX_LABEL[c.sex] : null, LIFE_STAGE_LABEL[c.lifeStage]].filter(Boolean).join(' · ');
    return [
      ...(isPrismatic(c) ? [{ text: 'Prismatic', title: 'An ultra-rare individual', tone: 'gold' as const }] : []), // lane:genetics
      { text: morphName(c), title: sp?.scientificName ? `${sp.commonName} (${sp.scientificName})` : undefined, tone: 'aqua' },
      ...(who ? [{ text: who }] : []),
    ];
  }
  const bySpecies = new Map<string, Creature[]>();
  for (const c of chosen) bySpecies.set(c.speciesId, [...(bySpecies.get(c.speciesId) ?? []), c]);
  const out: { text: string; title?: string; tone?: 'aqua' | 'violet' | 'gold' }[] = [...bySpecies.entries()].slice(0, 3).map(([id, cs]) => ({
    text: `${cs.length} × ${speciesOf(id)?.commonName ?? titleCase(id)}`,
    title: nameList(cs.map((c) => c.name), 6),
    tone: 'aqua' as const,
  }));
  if (bySpecies.size > 3) out.push({ text: `+${bySpecies.size - 3} more species` });
  if (kind === 'pair') {
    const m = chosen.find((c) => c.sex === 'male');
    const f = chosen.find((c) => c.sex === 'female');
    if (m && f) out.push({ text: `${m.name} ♂ & ${f.name} ♀`, tone: 'violet' });
  } else if (kind === 'juveniles') out.push({ text: 'Raised in your shop' });
  const shimmer = chosen.filter((c) => isPrismatic(c)).length; // lane:genetics
  if (shimmer) out.unshift({ text: shimmer === 1 ? 'Includes a Prismatic' : `${shimmer} Prismatic`, title: 'Ultra-rare individuals', tone: 'gold' });
  return out;
}

function Review({ g, kind, chosen, tank, photo, title, setTitle, reserve, buyNow, duration, expected, starter, lastTank, unhealthy, warnings, snapshot }: { g: GameState; kind: ListingKind; chosen: Creature[]; tank?: Tank; photo: string | null; title: string; setTitle: (t: string) => void; reserve: number; buyNow?: number; duration: number; expected: number; starter?: Creature; lastTank: boolean; unhealthy: Creature[]; warnings: string[] | null; snapshot?: import('@/types').ListingSnapshot }) {
  const health = snapshot?.healthScore ?? (chosen.length ? chosen.reduce((a, c) => a + c.stats.health, 0) / chosen.length : 100);
  const beauty = snapshot?.beautyScore ?? (kind === 'tank' && tank ? tank.cache.beauty : chosen.length ? chosen.reduce((a, c) => a + (c.genome.potentials.color + c.genome.potentials.pattern) / 2, 0) / chosen.length : 50);
  const diffs = [...new Set(chosen.map((c) => speciesOf(c.speciesId)?.difficulty).filter(Boolean))] as NonNullable<ReturnType<typeof speciesOf>>['difficulty'][];
  const order = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
  const hardest = diffs.sort((a, b) => order.indexOf(b) - order.indexOf(a))[0];
  const bred = chosen.filter((c) => c.lineage.generation > 0).length;
  const maxGen = chosen.reduce((m, c) => Math.max(m, c.lineage.generation), 0);
  const lineage = snapshot?.lineageSummary || (chosen.length === 0 ? '—' : bred > 0 ? `${bred} bred in your shop (up to generation ${maxGen})` : `${nameList([...new Set(chosen.map((c) => c.lineage.breederName))], 2)}`);
  const careLabel = snapshot?.careDifficulty || (hardest ? DIFFICULTY_LABEL[hardest] : '—');
  const risky = kind === 'tank' && tank && VERDICT_RANK[tank.cache.compatVerdict] >= VERDICT_RANK.high_risk;

  return (
    <section className="pn-col pn-gap-4">
      <h3 className="pn-wizard__h">Review your listing</h3>
      <div className="pn-card pn-review">
        <div className="pn-review__visual">
          {photo ? (
            <img src={photo} alt="Listing photo" />
          ) : kind === 'tank' && tank ? (
            <TankThumb tank={tank} residents={chosen} width={220} height={146} />
          ) : (
            <div className="pn-review__portraits">
              {chosen.slice(0, 3).map((c) => (
                <CreaturePortrait key={c.id} creature={c} size={chosen.length === 1 ? 120 : 76} />
              ))}
            </div>
          )}
        </div>
        <div className="pn-col pn-gap-2 pn-grow">
          <label className="pn-field">
            <span className="pn-field__label">Listing title</span>
            <input className="pn-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <div className="pn-chips">
            {reviewChips(kind, chosen).map((c) => (
              <Chip key={c.text} tone={c.tone} title={c.title}>
                {c.text}
              </Chip>
            ))}
            {kind === 'tank' && tank && <Chip>{gallonsOf(tank)} gal · {plural(chosen.length, 'resident')}</Chip>}
            {kind === 'tank' && tank && <VerdictBadge verdict={tank.cache.compatVerdict} />}
          </div>
        </div>
      </div>

      <div className="pn-grid pn-grid--2">
        <div className="pn-card pn-card--flat">
          <div className="pn-metric">
            <div className="pn-metric__row">
              <span>Health report</span>
              <span className="pn-metric__val">{Math.round(health)}/100</span>
            </div>
            <Bar value={health} label="Health" />
          </div>
          <div className="pn-metric" style={{ marginTop: 12 }}>
            <div className="pn-metric__row">
              <span>{kind === 'tank' ? 'Aquascape beauty' : 'Appearance'}</span>
              <span className="pn-metric__val">{Math.round(beauty)}/100</span>
            </div>
            <Bar value={beauty} tone="aqua" label="Beauty" />
          </div>
        </div>
        <div className="pn-card pn-card--flat">
          <KV label="Lineage">{lineage}</KV>
          <KV label="Care difficulty">{careLabel}</KV>
          <KV label="Duration">
            {formatSpan(duration)}
            {durationPreset(duration) && <span className="pn-tiny pn-muted"> · {durationPreset(duration)!.realLabel}</span>}
          </KV>
        </div>
      </div>

      <div className="pn-card pn-card--flat">
        <KV label="Reserve">
          <Money value={reserve} />
        </KV>
        <KV label="Buy now">{buyNow ? <Money value={buyNow} /> : 'Off'}</KV>
        <KV label="Expected fair value">
          <Money value={expected} />
        </KV>
      </div>

      {warnings ? (
        warnings.map((w, i) => <Callout key={i} tone={warningTone(w)} icon={warningIcon(w)}>{fixPlurals(w)}</Callout>)
      ) : (
        <>
      {starter && (
        <Callout tone="watch" icon={<Sparkles size={16} />} title={`${starter.name} is your starter`}>
          Your very first companion is part of this sale. If a buyer accepts, {starter.name} will leave your aquarium for good.
        </Callout>
      )}
      {lastTank && (
        <Callout tone="danger" icon={<TriangleAlert size={16} />} title="Selling your last aquarium">
          You’ll have no tank once this sells.
        </Callout>
      )}
      {unhealthy.length > 0 && (
        <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Some animals are unwell">
          Buyers see the health report. Selling sick animals can lower your reputation — consider waiting until {nameList(unhealthy.map((c) => c.name))} recover{unhealthy.length === 1 ? 's' : ''}.
        </Callout>
      )}
      {risky && tank && (
        <Callout tone="watch" icon={<TriangleAlert size={16} />} title="Compatibility concerns">
          This tank’s mix is rated <b>{tank.cache.compatVerdict.replace('_', ' ')}</b>. Buyers notice, and misrepresented setups hurt reputation.
        </Callout>
      )}
        </>
      )}
      <div className="pn-row pn-gap-2">
        <StatusBadge status={unhealthy.length || risky ? 'watch' : 'good'} label={unhealthy.length || risky ? 'Review the notes above' : 'Ready to list'} />
      </div>
    </section>
  );
}
