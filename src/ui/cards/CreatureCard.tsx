/**
 * Creature card: who this individual is — condition, personality, appearance & potential, lineage, value,
 * breeding, care facts and history — plus follow / photo / favourite / move / list actions.
 * Side sheet on desktop, bottom sheet on phones. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  Star,
  Pencil,
  Check,
  ScanEye,
  Camera,
  ArrowRightLeft,
  Tag,
  Heart,
  Activity,
  Sparkles,
  GitBranch,
  Coins,
  Egg,
  BookOpen,
  Clock,
  Thermometer,
  FlaskConical,
  Utensils,
  Users,
  Box,
  Gauge,
  ShieldAlert,
  Dna,
  ChevronRight,
  Split,
  ShoppingCart, // lane:w2-ui
  Wind, // lane:guide
} from 'lucide-react';
import type { Creature, GameState, SpeciesDefinition, Potentials, CreatureEvent } from '@/types';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { sfx } from '@/audio/sfx';
import { findSpecies } from '@/data/species';
import { runtime } from '@/runtime/tankRuntime';
import {
  potentialBand,
  describeGenetics,
  breedingStatus,
  breedingCheck,
  creaturesInTank,
  creatureWellbeing,
  predictOffspringMorphs,
  morphDisplayName,
  structureLabel,
  temperamentWord,
  curiosityWord,
  isPrismatic, // lane:genetics
  catalogEntry,
  strainOf,
  strainTier,
  predictOffspringStrains,
  prismaticChanceForPair,
  oneInLabel,
} from '@/sim/life';
import { PrismaticBadge, MorphTierBadge, StrainBadge } from '../common/Prismatic'; // lane:genetics
import { renameCreature, toggleFavorite, noteInteraction, startBreeding } from '@/sim/life/actions';
import { illnessDef } from '@/sim/life/illness'; // lane:guide
import { creatureValue } from '@/sim/economy';
import { speciesWaterComfort } from '@/sim/water';
import { isUnlocked } from '@/sim/facility';
import { getTankTier } from '@/data/catalog/tanks';
import { Sheet } from '../common/Sheet';
import { enterCinematic, useDockedCard } from '../hud/cardDock';
import { Portrait } from '../common/Portrait';
import { safe, useGameThrottled, useInterval } from '../common/safe';
import { act, tutorialFlag } from '../common/actions';
import { useShell } from '../common/shellStore';
import {
  LIFE_STAGE_LABEL,
  personalityLabel,
  personalityLine,
  sexRoleText,
  formatAge,
  formatTemp,
  titleCase,
  sentenceCase,
  agoText,
  DIFFICULTY_LABEL,
  foodName, // lane:w2-ui
  convertTempText, // lane:guide
} from '../common/format';
import { dietGuide, feedingLine, temperatureGuide, FLOW_GUIDE } from '@/data/species/guide'; // lane:guide
import { AutofeederVerdict, RealLifeTips, openSpeciesGuide } from '../panels/encyclopedia/SpeciesGuide'; // lane:guide
import { Badge, Button, Chip, Meter, Section, StatusBadge, formatMoney, KV, Empty } from '../kit';
import { setCameraMode } from '../hud/ToolRail';
import { MoveCreatureModal } from './MoveCreatureModal';
import { CreatureRibbons } from '../panels/shows/Ribbons'; // lane:shows
import { creatureFoodChoice } from '../common/foodStock'; // lane:w2-ui
import { targetFeedNow } from '../hud/ToolRail'; // lane:w2-ui
import { buyFood } from '@/sim/economy'; // lane:w2-ui

// lane:genetics — where this Prismatic's shimmer came from
const PRISMATIC_ORIGIN: Record<NonNullable<Creature['rareVariant']>['origin'], string> = {
  shop: 'Prismatic — stocked by a seller. Its shimmer is permanent; its young are likelier, never certain, to share it.',
  bred: 'Prismatic — born in your shop. A Prismatic parent made it likelier; nothing made it certain.',
  spontaneous: 'Prismatic — born in your shop to ordinary parents, against thousands-to-one odds.',
};

/** Offspring odds as a percentage, without rounding a real chance down to "0%". */
const oddsPct = (ch: number) => (ch >= 0.995 ? '100%' : ch >= 0.01 ? `${Math.round(ch * 100)}%` : ch > 0 ? '<1%' : '0%');

const BAND_TONE: Record<string, string> = { Ordinary: 'b1', Promising: 'b2', Exceptional: 'b3', Remarkable: 'b4' };
const BAND_IDX: Record<string, number> = { Ordinary: 1, Promising: 2, Exceptional: 3, Remarkable: 4 };

const POTENTIALS: { key: keyof Potentials; label: string }[] = [
  { key: 'size', label: 'Size' },
  { key: 'color', label: 'Colour' },
  { key: 'pattern', label: 'Pattern' },
  { key: 'structure', label: 'Form' },
  { key: 'fertility', label: 'Fertility' },
  { key: 'hardiness', label: 'Hardiness' },
];

// lane:qa-play — same bands as the sim's wellbeing notes (src/sim/life: ≥70 "Very hungry" = Watch, ≥90 "Starving" =
// Danger). The bar used to read "Starving" in red from 70 while the condition box said "Watch · Very hungry".
function hungerWord(h: number) {
  return h < 25 ? 'Well fed' : h < 55 ? 'Peckish' : h < 70 ? 'Hungry' : h < 90 ? 'Very hungry' : 'Starving';
}
function hungerTone(h: number): 'good' | 'watch' | 'danger' {
  return h >= 90 ? 'danger' : h >= 55 ? 'watch' : 'good';
}
function stressWord(s: number) {
  return s < 20 ? 'Calm' : s < 40 ? 'Settled' : s < 70 ? 'Stressed' : 'Panicking';
}
function levelWord(v: number) {
  // Same thresholds as Meter tone="auto" (≥60 good, ≥30 watch) so word and colour always agree.
  return v >= 80 ? 'Great' : v >= 60 ? 'Good' : v >= 30 ? 'Low' : 'Poor';
}

function tendency(v: number, lo: string, hi: string) {
  if (v < 30) return `Very ${lo.toLowerCase()}`;
  if (v < 45) return lo;
  if (v <= 55) return 'Balanced';
  if (v <= 70) return hi;
  return `Very ${hi.toLowerCase()}`;
}

function NameEditor({ c, readOnly }: { c: Creature; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(c.name);
  useEffect(() => setVal(c.name), [c.id, c.name]);
  const commit = () => {
    setEditing(false);
    const v = val.trim();
    if (v && v !== c.name) act((d) => renameCreature(d, c.id, v), { flag: 'named', sound: 'confirm' });
  };
  if (editing && !readOnly)
    return (
      <form
        className="ag-cname ag-cname--edit"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <input className="ag-cname__input" data-testid="creature-name" aria-label="Creature name" autoFocus maxLength={24} title="Up to 24 characters" value={val} onChange={(e) => setVal(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Escape' && (setVal(c.name), setEditing(false))} />
        <button type="submit" className="ag-cname__btn" aria-label="Save name">
          <Check size={16} />
        </button>
      </form>
    );
  return (
    <div className="ag-cname">
      <h2 className="ag-cname__text" data-testid="creature-name" data-tutorial-id="creature-name">
        {c.name}
      </h2>
      {!readOnly && (
        <button type="button" className="ag-cname__btn" aria-label={`Rename ${c.name}`} onClick={() => { sfx('click'); setEditing(true); }}>
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

function BehaviourLine({ id }: { id: string }) {
  useInterval(700);
  const rt = runtime.creatures.get(id);
  const label = rt?.behavior ? sentenceCase(rt.behavior) : null;
  return (
    <div className="ag-behaviour">
      <span className="ag-behaviour__pulse" aria-hidden />
      <span className="ag-muted">Right now:</span> <strong>{label ?? 'Settling in'}</strong>
    </div>
  );
}

function BandBar({ band }: { band: string }) {
  const n = BAND_IDX[band] ?? 1;
  return (
    <span className={clsx('ag-band', `ag-band--${BAND_TONE[band] ?? 'b1'}`)}>
      <span className="ag-band__pips" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= n ? 'on' : ''} />
        ))}
      </span>
      {band}
    </span>
  );
}

const HISTORY_ICON: Record<CreatureEvent['kind'], ReactNode> = {
  born: <Egg size={13} />,
  acquired: <Heart size={13} />,
  moved: <ArrowRightLeft size={13} />,
  named: <Pencil size={13} />,
  bred: <Egg size={13} />,
  illness: <ShieldAlert size={13} />,
  recovered: <Heart size={13} />,
  milestone: <Star size={13} />,
  sold: <Coins size={13} />,
  listed: <Tag size={13} />,
  visitor_wow: <Sparkles size={13} />,
  sex_change: <Dna size={13} />,
  photo: <Camera size={13} />,
  note: <BookOpen size={13} />,
};

/**
 * lane:qa-play — "24.5–28 °C", like the tank card, the market and the guide (this card rounded to "25 °C–28 °C").
 */
function tempRange(lo: number, hi: number, unit: 'C' | 'F'): string {
  if (unit === 'F') return `${Math.round((lo * 9) / 5 + 32)}–${Math.round((hi * 9) / 5 + 32)} °F`;
  const f = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return `${f(lo)}–${f(hi)} °C`;
}

function CareFacts({ sp, tankGallons, unit }: { sp: SpeciesDefinition; tankGallons: number; unit: 'C' | 'F' }) {
  const t = sp.tempC;
  const diff = DIFFICULTY_LABEL[sp.difficulty];
  // lane:guide — diet by food TYPE, the autofeeder verdict, flow, and "In real life" tips (src/data/species/guide.ts)
  const diet = dietGuide(sp);
  const flow = FLOW_GUIDE[sp.flowPreference];
  return (
    <div className="ag-facts">
      <KV label={<><Thermometer size={13} aria-hidden /> Temperature</>} hint={convertTempText(temperatureGuide(sp).text, unit)}>
        {tempRange(t.idealMin, t.idealMax, unit)}
      </KV>
      <KV label={<><FlaskConical size={13} aria-hidden /> pH</>}>
        {sp.pH.idealMin.toFixed(1)}–{sp.pH.idealMax.toFixed(1)}
      </KV>
      {sp.salinitySG && (
        <KV label="Salinity">
          {sp.salinitySG.idealMin.toFixed(3)}–{sp.salinitySG.idealMax.toFixed(3)} SG
        </KV>
      )}
      <KV label={<><Utensils size={13} aria-hidden /> Diet</>} hint={convertTempText(feedingLine(sp), unit)}>
        {diet.groups.length ? diet.groups.map((g) => g.label).join(' · ') : sentenceCase(sp.diet)}
      </KV>
      <KV label={<><Wind size={13} aria-hidden /> Flow</>} hint={flow?.text}>
        {flow?.label ?? sentenceCase(sp.flowPreference)}
      </KV>
      <KV label={<><Users size={13} aria-hidden /> Social</>} hint={sp.social.note}>
        {sentenceCase(sp.social.kind)}
        {sp.social.minGroup > 1 ? ` · groups of ${sp.social.idealGroup}+` : ''}
      </KV>
      <KV label={<><Box size={13} aria-hidden /> Tank</>} hint={tankGallons && tankGallons < sp.recommendedMinTankGallons ? `This tank is ${tankGallons} gal — smaller than recommended.` : undefined}>
        {sp.recommendedMinTankGallons}+ gal
      </KV>
      <KV label={<><Gauge size={13} aria-hidden /> Care level</>}>{diff?.label ?? titleCase(sp.difficulty)}</KV>
      <div className="ag-sg-card">
        <AutofeederVerdict sp={sp} compact />
        <RealLifeTips sp={sp} max={3} />
        <button type="button" className="ag-linkbtn" onClick={() => openSpeciesGuide(sp.id)}>
          Full {sp.commonName} guide
        </button>
      </div>
    </div>
  );
}

function Lineage({ c, game }: { c: Creature; game: GameState }) {
  const parents = [
    { role: 'Mother', id: c.lineage.motherId },
    { role: 'Father', id: c.lineage.fatherId },
  ];
  const gen = c.lineage.generation;
  return (
    <div className="ag-lineage">
      <div className="ag-row ag-wrap" style={{ gap: 6 }}>
        <Chip size="sm" tone={gen > 0 ? 'violet' : undefined}>{gen > 0 ? `Generation ${gen}` : 'Founder stock'}</Chip>
        <Chip size="sm">{c.captiveBred ? 'Captive-bred' : 'Wild-caught'}</Chip>
        {c.lineage.breederName && !/captive-bred/i.test(c.lineage.breederName) && (
          <Chip size="sm" title="Breeder">
            {c.lineage.breederName}
          </Chip>
        )}
      </div>
      <div className="ag-parents">
        {parents.map((p) => {
          const pc = p.id ? game.creatures[p.id] : null;
          if (!p.id)
            return (
              <div key={p.role} className="ag-parent is-unknown">
                <span className="ag-parent__role">{p.role}</span>
                <span className="ag-muted">Unrecorded</span>
              </div>
            );
          return (
            <button
              type="button"
              key={p.role}
              className="ag-parent"
              disabled={!pc}
              onClick={() => {
                if (!pc) return;
                sfx('click');
                const ui = useUI.getState();
                ui.set({ selectedCreatureId: pc.id, ...(pc.tankId && pc.tankId !== ui.focusedTankId && pc.status === 'alive' ? { focusedTankId: pc.tankId } : {}) });
              }}
            >
              {pc && <Portrait subject={pc} shape="circle" className="ag-parent__art" size={96} />}
              <span className="ag-grow">
                <span className="ag-parent__role">{p.role}</span>
                <span className="ag-parent__name">{pc ? pc.name : 'Unknown'}</span>
                {pc && pc.status !== 'alive' && <span className="ag-muted ag-small">{titleCase(pc.status)}</span>}
              </span>
              {pc && <ChevronRight size={14} aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="ag-muted ag-small">Line: {c.lineage.lineId}</div>
    </div>
  );
}

function Breeding({ c, game, sp }: { c: Creature; game: GameState; sp: SpeciesDefinition }) {
  const status = safe('breedingStatus', () => breedingStatus(game, c.id), null);
  // lane:guide — likeliest partners first (same tank, opposite sex, adults), so the eight chips shown are the useful ones
  const candidates = useMemo(() => {
    const rank = (o: Creature) => (o.tankId === c.tankId ? 0 : 4) + (c.sex !== 'unknown' && o.sex !== 'unknown' && o.sex !== c.sex ? 0 : 2) + (o.lifeStage === 'adult' || o.lifeStage === 'elder' ? 0 : 1);
    return Object.values(game.creatures)
      .filter((o) => o.id !== c.id && o.speciesId === c.speciesId && o.status === 'alive' && o.lifeStage !== 'egg' && o.lifeStage !== 'larva' && o.lifeStage !== 'fry')
      .sort((a, b) => rank(a) - rank(b));
  }, [game.creatures, c.id, c.speciesId, c.tankId, c.sex]);
  const [partner, setPartner] = useState<string | null>(null);
  useEffect(() => {
    if (partner && !candidates.find((x) => x.id === partner)) setPartner(null);
  }, [candidates, partner]);
  const check = partner ? safe('breedingCheck', () => breedingCheck(game, c.id, partner), { ok: false, reasons: ['Unable to check right now.'] }) : null;
  const systemNote = sp.breeding.system === 'not_in_game' ? 'Breeding for this species is not part of this version.' : sp.breeding.notes;
  // Exact morph odds for the chosen pairing (mother = the female; otherwise this animal).
  const odds = useMemo(() => {
    const p = partner ? game.creatures[partner] : null;
    if (!p) return [];
    const [mom, dad] = p.sex === 'female' && c.sex !== 'female' ? [p, c] : [c, p];
    return safe('predictOffspringMorphs', () => predictOffspringMorphs(sp, mom.genome, dad.genome), []).slice(0, 5);
  }, [partner, c.id, game.creatures, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  // lane:genetics — named strains among the young, and the Prismatic odds for this pair
  const strainOdds = useMemo(() => {
    const p = partner ? game.creatures[partner] : null;
    if (!p) return [];
    const [mom, dad] = p.sex === 'female' && c.sex !== 'female' ? [p, c] : [c, p];
    return safe('predictOffspringStrains', () => predictOffspringStrains(sp, mom.genome, dad.genome), []).slice(0, 3);
  }, [partner, c.id, game.creatures, sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const partnerC = partner ? game.creatures[partner] : null;
  const shimmerParents = (isPrismatic(c) ? 1 : 0) + (isPrismatic(partnerC) ? 1 : 0);
  const shimmerChance = partnerC ? safe('prismaticChanceForPair', () => prismaticChanceForPair(c, partnerC), 0) : 0;
  return (
    <div className="ag-breeding">
      {status ? (
        <div className="ag-breeding__status">
          <div className="ag-row">
            <Egg size={16} aria-hidden className="ag-evicon--violet" />
            <strong className="ag-grow">{status.label}</strong>
            {status.progress != null && <span className="ag-small ag-tabular">{Math.round(status.progress * 100)}%</span>}
          </div>
          {status.detail && <div className="ag-small ag-muted">{status.detail}</div>}
          {status.progress != null && <Meter value={status.progress * 100} />}
        </div>
      ) : (
        <div className="ag-small ag-muted">{c.lifeStage === 'adult' || c.lifeStage === 'elder' ? 'Not currently breeding.' : 'Too young to breed yet.'}</div>
      )}
      <Meter label="Breeding readiness" value={c.stats.breedingReadiness} tone="auto" display={levelWord(c.stats.breedingReadiness)} />
      {/* lane:guide — say why there is nothing to pick instead of showing nothing */}
      {candidates.length === 0 && sp.breeding.system !== 'not_in_game' && sp.breeding.conditions.needsPartner && (c.lifeStage === 'adult' || c.lifeStage === 'elder') && (
        <div className="ag-small ag-muted">Breeding needs a partner, and you have no other {sp.commonName.toLowerCase()}. New animals turn up in the Market.</div>
      )}
      {candidates.length > 0 && sp.breeding.system !== 'not_in_game' && (
        <div className="ag-breeding__pair">
          <div className="ag-section__title">Try a pairing</div>
          <div className="ag-row ag-wrap" style={{ gap: 6 }}>
            {candidates.slice(0, 8).map((o) => (
              <Chip key={o.id} size="sm" selected={partner === o.id} onClick={() => setPartner(partner === o.id ? null : o.id)} title={o.tankId && o.tankId !== c.tankId ? `In ${game.tanks[o.tankId]?.name ?? 'another tank'}` : undefined}>
                {o.name}
                <span className="ag-muted"> · {o.sex === 'unknown' ? '?' : o.sex === 'male' ? '♂' : '♀'}</span>
              </Chip>
            ))}
          </div>
          {candidates.length > 8 && <div className="ag-small ag-muted">The 8 likeliest partners are shown ({candidates.length - 8} more). Open another {sp.commonName.toLowerCase()}’s card to pair from there.</div>}
          {check && (
            <div className={clsx('ag-breedcheck', check.ok ? 'is-ok' : 'is-no')}>
              <div className="ag-small">{check.ok ? 'Ready to try.' : 'Not yet:'}</div>
              {!check.ok && (
                <ul>
                  {check.reasons.slice(0, 4).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
              {check.nextStep && <div className="ag-reason__fix">Next step: {check.nextStep}</div>}
              {odds.length > 0 && (
                <div className="ag-odds" aria-label="Likely offspring">
                  <div className="ag-odds__title">Likely offspring</div>
                  {odds.map((o) => (
                    <div key={o.morphName} className="ag-odds__row">
                      <span className="ag-grow">{safe('morphDisplayName', () => morphDisplayName(sp, o.morphName), o.morphName)}</span>
                      <span className="ag-odds__bar" aria-hidden>
                        <i style={{ width: `${Math.round(o.chance * 100)}%` }} />
                      </span>
                      <span className="ag-tabular ag-odds__pct">{Math.round(o.chance * 100)}%</span>
                    </div>
                  ))}
                  {strainOdds.length > 0 && (
                    <>
                      <div className="ag-odds__title">Named strains</div>
                      {strainOdds.map((o) => (
                        <div key={o.strain.id} className="ag-odds__row">
                          <span className="ag-grow">{o.strain.name}</span>
                          <span className="ag-odds__bar" aria-hidden>
                            <i style={{ width: `${Math.max(2, Math.round(o.chance * 100))}%` }} />
                          </span>
                          <span className="ag-tabular ag-odds__pct">{oddsPct(o.chance)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {shimmerChance > 0 && (
                    <div className="ag-small ag-prismatic-line" data-testid="breed-prismatic-odds">
                      <Sparkles size={12} aria-hidden /> Prismatic chance per youngster ≈ {oneInLabel(shimmerChance)}
                      {shimmerParents > 0 ? ` (${shimmerParents === 2 ? 'both parents' : 'one parent'} Prismatic)` : ''}
                    </div>
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant={check.ok ? 'primary' : 'default'}
                disabled={!check.ok}
                onClick={() => act((d) => startBreeding(d, c.id, partner!, c.tankId ?? undefined), { kind: 'celebrate', sound: 'celebrate', flag: 'started_breeding' })}
              >
                <Egg size={14} /> Start breeding
              </Button>
            </div>
          )}
        </div>
      )}
      {systemNote && <ClampText text={systemNote} />}
    </div>
  );
}

/** Long species notes: three lines, then "Read more" (never hover-only). */
function ClampText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 180;
  return (
    <div className="ag-clamp">
      <p className={clsx('ag-small ag-muted ag-clamp__text', long && !open && 'is-clamped')}>{text}</p>
      {long && (
        <button type="button" className="ag-linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export function CreatureCard() {
  const selectedId = useUI((s) => s.selectedCreatureId);
  const docked = useDockedCard();
  const game = useGameThrottled(500);
  const unit = useSettings((s) => s.tempUnit);
  const c = selectedId && game ? game.creatures[selectedId] : null;
  const open = !!c && docked === 'creature';
  useEffect(() => {
    if (c && !game?.isShowcase) {
      tutorialFlag('opened_creature_card');
      noteObserved(c.id);
    }
  }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => useUI.getState().set({ selectedCreatureId: null });
  return (
    <>
      <Sheet open={open} onClose={close} side="right" testId="creature-card" label="Creature card" className="ag-ccard" header={c && game ? <CardHeader c={c} game={game} /> : undefined}>
        {c && game && <CardBody c={c} game={game} unit={unit} />}
      </Sheet>
      <MoveCreatureModal />
    </>
  );
}

function noteObserved(id: string) {
  // Observing an animal counts as an interaction (bond + quests); lifecycle lane decides what it means.
  act((d) => noteInteraction(d, id, 'observe'), { toast: false, sound: 'hover' });
}

function CardHeader({ c, game }: { c: Creature; game: GameState }) {
  const sp = findSpecies(c.speciesId);
  const sex = sexRoleText(c, sp, game.clock.hour);
  const readOnly = false; // dev showcase worlds (?showcase=) are fully interactive in the game screen; they are simply never saved
  return (
    <div className="ag-chead">
      <Portrait subject={c} shape="rounded" className="ag-chead__art" size={256} />
      <div className="ag-grow ag-chead__text">
        <NameEditor c={c} readOnly={readOnly} />
        <div className="ag-chead__species">
          {sp?.commonName ?? titleCase(c.speciesId)} · <em>{sp?.scientificName}</em>
        </div>
        <div className="ag-chead__chips">
          <PrismaticBadge creature={c} />
          <Badge tone="aqua">{LIFE_STAGE_LABEL[c.lifeStage] ?? c.lifeStage}</Badge>
          <Badge>{formatAge(c.bornHour, game.clock.hour)}</Badge>
          <Badge tone={sex.label.startsWith('Male') ? 'aqua' : sex.label.startsWith('Female') ? 'violet' : 'neutral'} title={sex.detail}>
            {sex.label}
          </Badge>
          {c.isStarter && <Badge tone="gold">First companion</Badge>}
          {c.status === 'listed' && <Badge tone="gold">Listed</Badge>}
        </div>
        {sex.detail && <div className="ag-chead__sexnote">{sex.detail}</div>}
        {/* lane:shows — title + show rosettes (renders nothing until the animal has placed at a show) */}
        <CreatureRibbons c={c} />
      </div>
    </div>
  );
}

function CardBody({ c, game, unit }: { c: Creature; game: GameState; unit: 'C' | 'F' }) {
  const sp = findSpecies(c.speciesId);
  const tank = c.tankId ? game.tanks[c.tankId] : null;
  const followId = useUI((s) => s.followCreatureId);
  const camMode = useUI((s) => s.cameraMode);
  const following = camMode === 'follow' && followId === c.id;
  const readOnly = false; // dev showcase worlds (?showcase=) are fully interactive in the game screen; they are simply never saved
  const value = safe('creatureValue', () => creatureValue(game, c), null);
  const geneticsOpen = (c.geneticsRevealed ?? 0) >= 1 || safe('isUnlocked', () => isUnlocked(game, 'genetics_lab'), false);
  const genetics = geneticsOpen && sp ? safe('describeGenetics', () => describeGenetics(sp, c.genome, c.geneticsRevealed ?? 1), []) : [];
  const wellbeing = safe('creatureWellbeing', () => creatureWellbeing(game, c), null);
  const comfort = !wellbeing && sp && tank ? safe('speciesWaterComfort', () => speciesWaterComfort(sp, tank), null) : null;
  const structure = sp ? safe('structureLabel', () => structureLabel(sp), 'Form') : 'Form';
  const morph = sp ? safe('morphDisplayName', () => morphDisplayName(sp, c.morphName), c.morphName) : c.morphName;
  const morphEntry = sp ? safe('catalogEntry', () => catalogEntry(sp, c.morphName), undefined) : undefined; // lane:genetics
  const strain = sp ? safe('strainOf', () => strainOf(sp, c.genome), undefined) : undefined; // lane:genetics
  const tankGallons = tank ? safe('tier', () => getTankTier(tank.tierId).gallons, 0) : 0;
  const history = [...c.history].reverse().slice(0, 14);
  // lane:guide — where Sell leads (see the action row)
  const canList = safe('isUnlocked', () => isUnlocked(game, 'market_listings'), true);
  const listingId = c.status === 'listed' ? game.market.listings.find((l) => l.status === 'active' && l.creatureIds.includes(c.id))?.id : undefined;

  return (
    <div className="ag-cbody">
      <div className="ag-cactions">
        <ActionBtn icon={<ScanEye size={17} />} label={following ? 'Following' : 'Follow'} active={following} onClick={() => {
          if (following) setCameraMode('front');
          else {
            useUI.getState().set({ followCreatureId: c.id });
            setCameraMode('follow');
          }
        }} />
        <ActionBtn icon={<Camera size={17} />} label="Photo" onClick={() => { sfx('camera'); enterCinematic('photo', { followCreatureId: c.id }); tutorialFlag('opened_photo'); }} />
        <ActionBtn icon={<Star size={17} fill={c.favorite ? 'currentColor' : 'none'} />} label={c.favorite ? 'Favourite' : 'Favourite'} active={!!c.favorite} disabled={readOnly} onClick={() => act((d) => { toggleFavorite(d, c.id); }, { toast: false, sound: 'click' })} />
        <ActionBtn icon={<ArrowRightLeft size={17} />} label="Move" disabled={readOnly || c.status !== 'alive'} title={c.status === 'listed' ? `${c.name} is listed for sale. Withdraw the listing in Market › My listings to move ${c.name}.` : c.status !== 'alive' ? `${c.name} is no longer in your care.` : undefined} onClick={() => { sfx('open'); useShell.getState().set({ moveCreatureId: c.id }); }} />
        {/* lane:guide — Sell always leads somewhere useful: the listing if already listed, the local shop's quick sale
            before the marketplace opens (the wizard used to stop there with no way to sell), else the listing wizard */}
        {c.status === 'listed' && listingId ? (
          <ActionBtn icon={<Tag size={17} />} label="Listing" title={`See ${c.name}’s listing and bids`} onClick={() => { sfx('open'); useUI.getState().set({ panel: 'market', panelTarget: `listing:${listingId}` }); }} />
        ) : (
          <ActionBtn
            icon={<Tag size={17} />}
            label="Sell"
            disabled={readOnly || c.status !== 'alive'}
            title={c.status !== 'alive' ? `${c.name} is no longer in your care.` : canList ? undefined : 'The marketplace opens the first time you visit the Market. Until then the local fish store buys animals for quick cash.'}
            onClick={() => {
              sfx('open');
              if (canList) useUI.getState().set({ panel: 'market', panelTarget: `list:creature:${c.id}` });
              else useUI.getState().set({ panel: 'livestock', panelTarget: `sell:${c.id}` });
            }}
          />
        )}
      </div>

      {/* lane:w2-ui — feed this animal from its card (on phones the card covers the Target feed prompt) */}
      {!readOnly && <FeedRow c={c} game={game} />}

      <BehaviourLine id={c.id} />

      {c.illness && (
        // lane:guide — the illness's own name, symptom and cure for this species (it used to say "check the water and
        // keep stress low" for everything, even impaction, where the fix is the substrate)
        <div className="ag-callout ag-callout--danger">
          <ShieldAlert size={16} aria-hidden />
          <div>
            {(() => {
              const def = illnessDef(c.illness.kind);
              const sev = Math.round(c.illness.severity * (c.illness.severity <= 1 ? 100 : 1));
              if (!def || !sp) return <><strong>{titleCase(c.illness.kind)}</strong> — severity {sev}%. Check the water and keep stress low.</>;
              return (
                <>
                  <strong>{sentenceCase(def.name(sp))}</strong> — severity {sev}%. {convertTempText(def.cure(sp), unit)}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <Section title={<><Activity size={12} aria-hidden /> Condition</>}>
        {wellbeing && (
          <div className={clsx('ag-wellbeing', `is-${wellbeing.status}`)}>
            <StatusBadge status={wellbeing.status} label={wellbeing.status === 'good' ? 'Good' : wellbeing.status === 'watch' ? 'Watch' : 'Danger'} />
            <div className="ag-grow">
              <div className="ag-wellbeing__headline">{wellbeing.headline}</div>
              {wellbeing.notes.length > 0 && (
                <ul className="ag-wellbeing__notes">
                  {wellbeing.notes.slice(0, 3).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="ag-meters">
          <Meter label="Health" value={c.stats.health} tone="auto" display={levelWord(c.stats.health)} />
          <Meter label="Hunger" value={c.stats.hunger} tone={hungerTone(c.stats.hunger)} display={hungerWord(c.stats.hunger)} />
          <Meter label="Comfort" value={c.stats.comfort} tone="auto" display={levelWord(c.stats.comfort)} />
          <Meter label="Stress" value={c.stats.stress} tone="auto" invert display={stressWord(c.stats.stress)} />
          <Meter label="Social" value={c.stats.social} tone="auto" display={levelWord(c.stats.social)} />
          {/* "Thriving" starts at enrichment > 55 (sim/life/index.ts): the same cut here, so a day-1 starter at ~58 is not
              "Good · Thriving" with an orange "Enrichment: Low" underneath */}
          <Meter label="Enrichment" value={c.stats.enrichment} tone={c.stats.enrichment > 55 ? 'good' : 'auto'} display={c.stats.enrichment < 30 ? 'Bored' : levelWord(c.stats.enrichment > 55 ? Math.max(60, c.stats.enrichment) : c.stats.enrichment)} />
        </div>
        {comfort && comfort.stressors.length > 0 && (
          <ul className="ag-stressors">
            {comfort.stressors.slice(0, 3).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={<><Sparkles size={12} aria-hidden /> Personality</>}>
        {c.personality.length === 0 ? (
          <div className="ag-muted ag-small">Still getting to know them.</div>
        ) : (
          <div className="ag-traits">
            {c.personality.map((t) => (
              <div key={t} className="ag-traitrow">
                <Chip size="sm" tone="aqua">{personalityLabel(t)}</Chip>
                <span className="ag-small">{personalityLine(t)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="ag-tendencies">
          <KV label="Temperament">{safe('temperamentWord', () => temperamentWord(c.genome.potentials.temperament), tendency(c.genome.potentials.temperament, 'Shy', 'Bold'))}</KV>
          <KV label="Curiosity">{safe('curiosityWord', () => curiosityWord(c.genome.potentials.curiosity), tendency(c.genome.potentials.curiosity, 'Reserved', 'Curious'))}</KV>
          {c.favoriteSpot && <KV label="Favourite spot">{c.favoriteSpot}</KV>}
          {c.visitorWows > 0 && <KV label="Visitor wows">{c.visitorWows}</KV>}
        </div>
      </Section>

      <Section title={<><Dna size={12} aria-hidden /> Appearance &amp; potential</>}>
        <div className="ag-morph">
          <span className="ag-morph__name">{/^wild\s*type$/i.test(morph) ? 'Wild type' : morph}</span>
          {c.appearance.finType && c.appearance.finType !== 'default' && <Chip size="sm">{titleCase(c.appearance.finType)}</Chip>}
          <Chip size="sm">{c.sizeCm.toFixed(1)} cm</Chip>
        </div>
        {/* lane:genetics — how rare this morph is in market stock, its named strain, and the Prismatic shimmer */}
        {(morphEntry || strain) && (
          <div className="ag-row ag-wrap ag-morph__tiers">
            {morphEntry && <MorphTierBadge tier={morphEntry.tier} share={morphEntry.frequency} />}
            {strain && sp && <StrainBadge strain={strain} tier={safe('strainTier', () => strainTier(sp, strain), 'common')} />}
          </div>
        )}
        {c.rareVariant && isPrismatic(c) && (
          <div className="ag-small ag-prismatic-line">
            <Sparkles size={13} aria-hidden /> {PRISMATIC_ORIGIN[c.rareVariant.origin]}
          </div>
        )}
        <div className="ag-potentials">
          {POTENTIALS.map((p) => {
            const band = potentialBand(c.genome.potentials[p.key] ?? 0);
            return (
              <div key={p.key} className="ag-potential">
                <span className="ag-potential__label">{p.key === 'structure' ? structure : p.label}</span>
                <BandBar band={band} />
              </div>
            );
          })}
        </div>
        {geneticsOpen ? (
          genetics.length > 0 && (
            <div className="ag-genetics">
              {genetics.map((g, i) => (
                <KV key={i} label={g.label}>{g.value}</KV>
              ))}
            </div>
          )
        ) : (
          <div className="ag-small ag-muted">Precise genetics unlock with the genetics lab.</div>
        )}
      </Section>

      <Section title={<><GitBranch size={12} aria-hidden /> Lineage</>}>
        <Lineage c={c} game={game} />
      </Section>

      <Section title={<><Coins size={12} aria-hidden /> Value</>}>
        {value ? (
          <div className="ag-value">
            <div className="ag-value__total">{formatMoney(value.total)}</div>
            <div className="ag-small ag-muted">Estimated market value — a game valuation, not a measure of worth.</div>
            {value.factors.length > 0 && (
              <div className="ag-value__factors">
                <KV label="Base">{formatMoney(value.base)}</KV>
                {value.factors.map((f, i) => (
                  <KV key={i} label={f.label} hint={f.note}>
                    <span className={f.mult > 1.001 ? 'ag-up' : f.mult < 0.999 ? 'ag-down' : ''}>×{f.mult.toFixed(2)}</span>
                  </KV>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="ag-muted ag-small">Valuation unavailable.</div>
        )}
      </Section>

      {sp && (
        <Section title={<><Egg size={12} aria-hidden /> Breeding</>}>
          <Breeding c={c} game={game} sp={sp} />
          {!readOnly && tank && (
            <SeparateRow c={c} game={game} />
          )}
        </Section>
      )}

      {sp && (
        <Section title={<><BookOpen size={12} aria-hidden /> Care facts</>}>
          <CareFacts sp={sp} tankGallons={tankGallons} unit={unit} />
        </Section>
      )}

      <Section title={<><Clock size={12} aria-hidden /> History</>}>
        {history.length === 0 ? (
          <Empty>No moments recorded yet.</Empty>
        ) : (
          <ol className="ag-timeline">
            {history.map((h, i) => (
              <li key={i} className={`ag-timeline__item ag-timeline__item--${h.kind}`}>
                <span className="ag-timeline__icon" aria-hidden>{HISTORY_ICON[h.kind] ?? <BookOpen size={13} />}</span>
                <div>
                  <div className="ag-timeline__text">{h.text}</div>
                  <div className="ag-timeline__when">{agoText(h.hour, game.clock.hour)} · Day {Math.floor(h.hour / 24) + 1}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

/**
 * lane:w2-ui — "Feed" on the creature card: target-feeds this animal with a food it eats (same suitability rule as the
 * feed picker and the sim's `feedTank`), through the same path as Target feed's "Offer to …" (`targetFeedNow`: sim
 * mutator + AI food particle at the mouth + tank ripple). Nothing suitable in stock → one-tap "Buy & feed".
 */
function FeedRow({ c, game }: { c: Creature; game: GameState }) {
  const [pick, setPick] = useState<string | null>(null);
  const [fed, setFed] = useState(0);
  const choice = useMemo(
    () => safe('creatureFoodChoice', () => creatureFoodChoice(game, c.id), null),
    [game.inventory.foods, game.progress.unlocked, c.id, c.speciesId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    if (!fed) return;
    const t = window.setTimeout(() => setFed(0), 1100);
    return () => window.clearTimeout(t);
  }, [fed]);
  if (!choice || !c.tankId || (c.status !== 'alive' && c.status !== 'listed') || c.lifeStage === 'egg') return null;
  const food = choice.inStock.find((f) => f.id === pick) ?? choice.inStock[0] ?? null;
  const hunger = c.stats.hunger;
  const hungry = hunger >= 55;
  const price = choice.restockPrice;
  const poor = game.finance.money < price;
  const offer = (foodId: string) => {
    if (targetFeedNow(foodId, c.id)) setFed((n) => n + 1);
  };
  const buyAndFeed = () => {
    if (!choice.restockId) return;
    const id = choice.restockId;
    const r = act((d) => buyFood(d, id, 1), { toast: false, sound: 'coin' });
    if (r?.ok) offer(id);
  };
  return (
    <div className={clsx('ag-cfeed', hungry && 'is-hungry', fed > 0 && 'is-fed')} data-testid="creature-feed">
      <div className="ag-cfeed__row">
        <span className="ag-cfeed__icon" aria-hidden>
          <Utensils size={16} />
        </span>
        <div className="ag-grow ag-cfeed__text">
          <div className="ag-cfeed__title">Feed {c.name}</div>
          <div className="ag-cfeed__meta">
            <span className={clsx('ag-cfeed__hunger', `is-${hungerTone(hunger)}`)}>{hungerWord(hunger)}</span>
            {/* several foods: the chips below name the choice and the stock */}
            {!food ? ' · none in stock' : choice.inStock.length > 1 ? '' : ` · ${foodName(food.id)}, ${food.count} left`}
          </div>
        </div>
        {food ? (
          <Button size="sm" variant={hungry ? 'primary' : 'default'} data-testid="creature-feed-offer" aria-label={`Offer ${c.name} ${foodName(food.id).toLowerCase()}`} onClick={() => offer(food.id)}>
            <Utensils size={14} /> Feed
          </Button>
        ) : choice.restockId ? (
          <Button
            size="sm"
            variant="primary"
            data-testid="creature-feed-buy"
            disabled={poor}
            title={poor ? `Not enough money (${formatMoney(price)} a pack)` : `Buy a pack of ${foodName(choice.restockId).toLowerCase()} for ${formatMoney(price)} and offer ${c.name} a serving`}
            aria-label={`Buy ${foodName(choice.restockId).toLowerCase()} for ${formatMoney(price)} and feed ${c.name}`}
            onClick={buyAndFeed}
          >
            <ShoppingCart size={14} /> Buy &amp; feed · {formatMoney(price)}
          </Button>
        ) : null}
      </div>
      {!food && choice.restockId && <div className="ag-cfeed__why">{sentenceCase(foodName(choice.restockId).toLowerCase())} is the cheapest food {c.name} eats.</div>}
      {choice.inStock.length > 1 && (
        <div className="ag-cfeed__foods" role="group" aria-label={`Food for ${c.name}`}>
          {choice.inStock.slice(0, 4).map((f) => (
            <Chip key={f.id} size="sm" testId={`creature-feed-food-${f.id}`} selected={food?.id === f.id} onClick={() => setPick(f.id)}>
              {foodName(f.id)} <span className="ag-muted">×{f.count}</span>
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function SeparateRow({ c, game }: { c: Creature; game: GameState }) {
  const others = game.tankOrder.filter((id) => id !== c.tankId);
  const mates = c.tankId ? safe('creaturesInTank', () => creaturesInTank(game, c.tankId!), []).filter((o) => o.id !== c.id) : [];
  if (!others.length || !mates.length) return null;
  return (
    <Button size="sm" variant="ghost" onClick={() => { sfx('open'); useShell.getState().set({ moveCreatureId: c.id }); }}>
      <Split size={14} /> Separate into another tank…
    </Button>
  );
}

function ActionBtn({ icon, label, onClick, active, disabled, title }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className={clsx('ag-cact', active && 'is-active')} onClick={onClick} disabled={disabled} aria-pressed={active} title={title}>
      <span className="ag-cact__icon" aria-hidden>{icon}</span>
      <span className="ag-cact__label">{label}</span>
    </button>
  );
}
