/**
 * Frags & cuttings in Build → Decor (lane "frags"):
 *   FragTake      the "Take frag / Take cutting / Divide rhizome / Trim portion / Split" pill on a placed living piece,
 *                 or why it isn't ready yet (growing, healing, can't be cut) with a small progress ring
 *   FragTag       status line for a piece that is itself a frag (healing on its plug, growing out, grown out)
 *   FragStorage   frags & cuttings waiting in storage: plant (3D placement), seat on a frag rack, sell to the local
 *                 store, or list on the market
 *   FragSwatch    a small illustrated swatch (coral on a ceramic plug, or a bundle of cuttings) used here and in Market
 */
import { useMemo } from 'react';
import { Scissors, Sprout, Hourglass, Store, Tag, MapPin, LayoutGrid, Info } from 'lucide-react';
import type { DecorInstance, GameState, Tank } from '@/types';
import { Button, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { getDecorDef } from '@/data/catalog/decor';
import { propagationFor } from '@/data/catalog/propagation';
import { takeFrag, plantFrag, fragEligibility, freeRackSlots, fragLabel, isCoralDef, onFragRack } from '@/sim/aquascape';
import { fragValue, fragStoreOffer, quickSellFrags, marketAccess, FRAG_HEALED_HOURS } from '@/sim/economy';
import { act } from '../common/act';
import { safe } from '../common/hooks';
import { Chip, SectionHead } from '../common/parts';
import { useSheet } from '../common/PanelLayout';
import { formatSpan, plural, nameList } from '../common/format';
import './frags.css';

// ───────────────────────────── swatch ─────────────────────────────

function Plug() {
  return (
    <g>
      <rect x={21} y={42} width={14} height={6} rx={1.5} fill="#a89a82" />
      <ellipse cx={28} cy={42} rx={11} ry={3.6} fill="#d6cab4" />
      <ellipse cx={28} cy={41.6} rx={8} ry={2.2} fill="#e4dac7" opacity={0.7} />
    </g>
  );
}

function coralArt(visual: string, a: string, b: string, g: number): React.ReactNode {
  const s = 0.95 + 0.3 * g; // grows with the frag
  const tf = `translate(28 41) scale(${s}) translate(-28 -41)`;
  switch (visual) {
    case 'coral_hammer':
    case 'coral_frogspawn':
    case 'coral_torch': {
      const tips: [number, number][] = [[20, 22], [28, 18], [36, 23]];
      return (
        <g transform={tf} strokeLinecap="round">
          <path d="M27 41 L25 33 L21 26 M27 41 L28 30 L28 21 M28 41 L31 33 L35 26" stroke="#6b5a4a" strokeWidth={3.2} fill="none" />
          {tips.map(([x, y], i) => (
            <g key={i}>
              {[-1, 0, 1].map((k) => (
                <path key={k} d={`M${x} ${y + 5} q ${k * 2} -4 ${k * 3.5} -7`} stroke={a} strokeWidth={2.2} fill="none" />
              ))}
              {visual === 'coral_hammer' && <path d={`M${x - 4} ${y - 2} q 4 -3 8 0`} stroke={b} strokeWidth={2.4} fill="none" />}
              {visual === 'coral_torch' && [-1, 0, 1].map((k) => <circle key={k} cx={x + k * 3.5} cy={y - 2} r={1.6} fill={b} />)}
              {visual === 'coral_frogspawn' && [-1, 0, 1].map((k) => <circle key={k} cx={x + k * 3} cy={y - 1.5} r={2} fill={b} />)}
            </g>
          ))}
        </g>
      );
    }
    case 'coral_acropora':
      return (
        <g transform={tf} stroke={a} strokeLinecap="round" fill="none">
          <path d="M28 41 L28 30 L22 22 L20 15 M28 30 L34 21 L36 14 M22 22 L26 15 M34 21 L31 14 M28 30 L29 19" strokeWidth={3} />
          <g fill={b} stroke="none">
            {[[20, 14], [36, 13], [26, 14], [31, 13], [29, 18]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={1.8} />
            ))}
          </g>
        </g>
      );
    case 'coral_zoanthid':
      return (
        <g transform={tf}>
          <ellipse cx={28} cy={38} rx={10} ry={5} fill="#9c8f7c" />
          {[[22, 35], [27, 33], [32, 34], [25, 38], [31, 38], [35, 37]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={2.8} fill={i % 2 ? a : b} />
              <circle cx={x} cy={y} r={1.1} fill={i % 2 ? b : a} />
            </g>
          ))}
        </g>
      );
    case 'coral_mushroom':
      return (
        <g transform={tf}>
          <ellipse cx={24} cy={35} rx={7} ry={3.4} fill={a} />
          <ellipse cx={24} cy={34.6} rx={2} ry={1} fill={b} />
          <ellipse cx={32.5} cy={32} rx={6} ry={3} fill={a} opacity={0.92} />
          <ellipse cx={32.5} cy={31.6} rx={1.8} ry={0.9} fill={b} />
        </g>
      );
    case 'coral_gsp':
      return (
        <g transform={tf}>
          <ellipse cx={28} cy={38} rx={10} ry={3.5} fill={b} />
          {[[21, 33], [25, 31], [29, 30], [33, 31], [36, 34], [24, 35], [31, 35]].map(([x, y], i) => (
            <g key={i}>
              <line x1={x} y1={y + 4} x2={x} y2={y} stroke={a} strokeWidth={1} />
              <circle cx={x} cy={y} r={1.8} fill={a} />
            </g>
          ))}
        </g>
      );
    case 'coral_leather':
      return (
        <g transform={tf}>
          <path d="M25 41 L25 31 L31 31 L31 41 Z" fill={b} />
          <path d="M16 30 Q 20 22 28 22 Q 36 22 40 30 Q 34 28 28 30 Q 22 28 16 30 Z" fill={a} />
        </g>
      );
    case 'coral_gorgonian':
      return (
        <g transform={tf} stroke={a} strokeLinecap="round" fill="none" strokeWidth={2}>
          <path d="M28 41 L28 28 L22 18 M28 28 L34 17 M28 33 L20 27 M28 31 L36 25 M22 18 L20 12 M34 17 L36 11" />
        </g>
      );
    default:
      return (
        <g transform={tf}>
          <ellipse cx={28} cy={36} rx={8} ry={5} fill={a} />
        </g>
      );
  }
}

function plantArt(visual: string, a: string, b: string, g: number): React.ReactNode {
  const s = 0.9 + 0.25 * g;
  const tf = `translate(28 48) scale(${s}) translate(-28 -48)`;
  if (visual === 'plant_java_fern' || visual === 'plant_anubias') {
    const broad = visual === 'plant_anubias';
    return (
      <g transform={tf}>
        <path d="M16 44 Q 28 41 40 44" stroke="#5a4632" strokeWidth={3.2} fill="none" strokeLinecap="round" />
        {[-1, 0, 1].map((k) => (
          <ellipse key={k} cx={28 + k * 8} cy={broad ? 36 : 30} rx={broad ? 5 : 3.2} ry={broad ? 7 : 12} fill={k ? a : b} transform={`rotate(${k * 22} ${28 + k * 8} ${broad ? 42 : 42})`} />
        ))}
      </g>
    );
  }
  if (visual === 'plant_moss' || visual === 'plant_monte_carlo' || visual === 'plant_hairgrass' || visual === 'plant_floating' || visual === 'macro_chaeto' || visual === 'plant_marimo') {
    // a portion in a little cup
    return (
      <g transform={tf}>
        <path d="M17 38 L39 38 L36 47 L20 47 Z" fill="#2c4a52" opacity={0.85} />
        {Array.from({ length: 11 }).map((_, i) => {
          const x = 19 + (i % 6) * 3.6;
          const y = 36 - (i > 5 ? 3 : 0) - ((i * 7) % 3);
          return visual === 'plant_hairgrass' ? <path key={i} d={`M${x} 40 l ${(i % 3) - 1} -9`} stroke={i % 2 ? a : b} strokeWidth={1.4} /> : <circle key={i} cx={x} cy={y} r={3} fill={i % 2 ? a : b} />;
        })}
      </g>
    );
  }
  if (visual === 'plant_vallisneria' || visual === 'plant_crypt' || visual === 'plant_sword') {
    return (
      <g transform={tf} strokeLinecap="round" fill="none">
        {[-2, -1, 0, 1, 2].map((k) => (
          <path key={k} d={`M28 46 Q ${28 + k * 3} 32 ${28 + k * 6} ${visual === 'plant_vallisneria' ? 12 : 22}`} stroke={k % 2 ? a : b} strokeWidth={visual === 'plant_vallisneria' ? 2.4 : 3.6} />
        ))}
        <path d="M24 47 Q 28 49 32 47" stroke="#8a6a4a" strokeWidth={2} />
      </g>
    );
  }
  // stem cuttings tied in a bundle (rotala, ludwigia, water sprite, ogo…)
  return (
    <g transform={tf} strokeLinecap="round">
      {[-3, -1.5, 0, 1.5, 3].map((k, i) => (
        <g key={i}>
          <path d={`M${28 + k * 0.6} 47 L${28 + k * 2.2} ${16 + Math.abs(k) * 2}`} stroke={b} strokeWidth={1.4} />
          {[0, 1, 2, 3].map((j) => {
            const y = 20 + Math.abs(k) * 2 + j * 6;
            const x = 28 + k * (2.2 - j * 0.35);
            return (
              <g key={j}>
                <ellipse cx={x - 2} cy={y} rx={2.2} ry={1.2} fill={j === 0 ? a : b} />
                <ellipse cx={x + 2} cy={y} rx={2.2} ry={1.2} fill={j === 0 ? a : b} />
              </g>
            );
          })}
        </g>
      ))}
      <rect x={24.5} y={40} width={7} height={3.4} rx={1.2} fill="#b8b2a6" />
    </g>
  );
}

/** Illustrated swatch: a coral frag on its ceramic plug, or a bundle/portion of plant cuttings. */
export function FragSwatch({ defId, size = 48, growth }: { defId: string; size?: number; growth?: number }) {
  const def = getDecorDef(defId);
  const pal = def?.palette?.length ? def.palette : ['#5aa84f', '#2f6b2c'];
  const a = pal[0];
  const b = pal[1] ?? pal[0];
  const g = Math.max(0, Math.min(1, growth ?? 0.2));
  const coral = isCoralDef(def);
  const id = `fs-${defId.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} className="fr-swatch" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={coral ? '#21476f' : '#1b4a4a'} />
          <stop offset="1" stopColor={coral ? '#0b1a30' : '#0a1f22'} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor={coral ? '#7fb8ff' : '#b8e6a0'} stopOpacity={0.28} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={56} height={56} rx={12} fill={`url(#${id})`} />
      <rect x={0} y={0} width={56} height={56} rx={12} fill={`url(#${id}-glow)`} />
      {coral ? (
        <>
          {coralArt(def?.visual ?? '', a, b, g)}
          <Plug />
        </>
      ) : (
        plantArt(def?.visual ?? '', a, b, g)
      )}
    </svg>
  );
}

// ───────────────────────────── take a frag (placed row) ─────────────────────────────

function Ring({ value, size = 16 }: { value: number; size?: number }) {
  const r = (size - 3) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, isFinite(value) ? value : 0));
  return (
    <svg className="fr-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle className="fr-ring__bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={2.5} />
      <circle className="fr-ring__fg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={2.5} strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
    </svg>
  );
}

/** The frag action for one placed living piece (or nothing for non-living decor). */
export function FragTake({ g, tank, inst }: { g: GameState; tank: Tank; inst: DecorInstance }) {
  const def = getDecorDef(inst.defId);
  const el = safe(() => fragEligibility(g, tank, inst), null);
  if (!def || !el || el.code === 'not_living' || el.code === 'unknown') return null;
  const rule = el.rule;
  if (el.code === 'cannot') {
    return (
      <span className="fr-wait" title={el.message}>
        <Info size={12} aria-hidden /> {el.message.split('. ')[0]}.
      </span>
    );
  }
  if (!el.ok) {
    const short =
      el.code === 'recovering'
        ? `Healing — ${rule.action.toLowerCase()} again in ${formatSpan(el.hoursLeft ?? 0)}`
        : el.code === 'growth'
          ? `${rule.action} once it has grown in (${Math.round(el.progress * 100)}%)`
          : el.message;
    return (
      <span className="fr-wait" title={el.message} data-testid={`frag-wait-${inst.id}`}>
        {el.code === 'recovering' || el.code === 'growth' ? <Ring value={el.progress} /> : <Hourglass size={12} aria-hidden />}
        <span className="pn-ellipsis">{short}</span>
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        className="fr-take"
        data-testid={`frag-take-${inst.id}`}
        title={rule.how}
        onClick={() => act((d) => takeFrag(d, tank.id, inst.id), { sound: 'place' })}
      >
        <Scissors size={13} aria-hidden /> {rule.action}
      </button>
      <span className="fr-how" title={rule.how}>
        {rule.how}
      </span>
    </>
  );
}

/** Status line for a piece that is itself a frag or cutting. */
export function FragTag({ g, tank, inst }: { g: GameState; tank: Tank; inst: DecorInstance }) {
  if (!inst.frag) return null;
  const def = getDecorDef(inst.defId);
  const coral = isCoralDef(def);
  const now = g.clock.hour;
  const f = inst.frag;
  let text: string;
  if (f.grownHour !== undefined) text = `Grown from a ${coral ? 'frag' : 'cutting'}`;
  else if (f.plantedHour !== undefined && now - f.plantedHour < FRAG_HEALED_HOURS) text = coral ? 'Frag · healing on its plug' : 'Cutting · taking root';
  else text = `${coral ? 'Frag' : 'Cutting'} · growing out ${Math.round((inst.growth ?? 0) * 100)}%${coral && onFragRack(tank, inst) ? ' · on the rack' : ''}`;
  return (
    <span className="fr-fragtag" data-testid={`frag-tag-${inst.id}`}>
      <Sprout size={12} aria-hidden /> {text}
    </span>
  );
}

// ───────────────────────────── storage ─────────────────────────────

/** Open the Market's create-listing wizard on "Frags & cuttings" with these frags selected. */
export function openFragListing(ids: string[]): void {
  useUI.getState().set({ panel: 'market', panelTarget: `list:frag:${ids.join(',')}` });
}

function fits(tank: Tank, f: DecorInstance): boolean {
  const def = getDecorDef(f.defId);
  if (!def) return false;
  return def.environments.includes(tank.environment) && (!def.waterClasses?.length || def.waterClasses.includes(tank.waterClass));
}

export function FragStorage({ g, tankId }: { g: GameState; tankId: string }) {
  const { close } = useSheet();
  const tank = g.tanks[tankId];
  const frags = g.inventory.frags ?? [];
  const racks = useMemo(() => (tank ? safe(() => freeRackSlots(tank).length, 0) : 0), [tank]);
  const market = safe(() => marketAccess(g), { listings: false, tankAuctions: false });
  // lane:w2-ui — discoverability: until the first cut, say which pieces here are ready (the "Take frag" pills sit in
  // the placed-decor rows at the very bottom of this tab, below the whole catalogue)
  const guided = g.progress.tutorial && !g.progress.tutorial.done && !g.progress.tutorial.skipped; // the guide's own picks come first
  if (tank && frags.length === 0 && !(g.progress.counters.fragsTaken ?? 0)) return guided ? null : <FragReadyHint g={g} tank={tank} />;
  if (!tank || frags.length === 0) return null;
  const now = g.clock.hour;

  const plant3d = (f: DecorInstance) => {
    useUI.getState().set({ tool: 'decor_place', placingDecorDefId: f.defId, placingFragId: f.id, view: 'tank', focusedTankId: tankId, panel: null, panelTarget: null });
    close();
  };

  return (
    <section data-testid="frag-storage">
      <SectionHead title={`Frags & cuttings · ${frags.length}`} icon={<Sprout size={14} />}>
        {market.listings && frags.length > 1 && (
          <Button size="sm" variant="ghost" data-testid="frag-list-all" onClick={() => openFragListing(frags.map((f) => f.id))}>
            <Tag size={13} /> List all
          </Button>
        )}
      </SectionHead>
      <p className="fr-intro">Waiting in your holding system, where they don’t grow (a game simplification). Plant them to grow them out, or sell them.</p>
      <div className="fr-store">
        {frags.map((f) => {
          const def = getDecorDef(f.defId);
          const ok = fits(tank, f);
          const coral = isCoralDef(def);
          const healed = f.frag?.plantedHour !== undefined && now - f.frag.plantedHour >= FRAG_HEALED_HOURS;
          const value = safe(() => fragValue(g, f).expected, 0);
          const offer = safe(() => fragStoreOffer(g, f), 0);
          const rack = ok && coral && racks > 0;
          const rule = propagationFor(def);
          return (
            <div key={f.id} className="fr-item" data-testid={`frag-item-${f.id}`}>
              <div className="fr-item__top">
                <FragSwatch defId={f.defId} growth={f.growth} size={48} />
                <div className="pn-grow pn-col" style={{ gap: 3, minWidth: 0 }}>
                  <span className="fr-item__name pn-ellipsis" title={rule.how}>
                    {fragLabel(f)}
                  </span>
                  <span className="fr-item__meta">
                    {coral ? <Chip tone={healed ? 'good' : 'watch'}>{healed ? 'Healed' : 'Fresh cut'}</Chip> : <Chip tone="good">{healed ? 'Rooted' : 'Fresh'}</Chip>}
                    <Chip>{Math.round((f.growth ?? 0) * 100)}% grown</Chip>
                    <Chip tone="aqua" title="Fair value on the market today">
                      ≈ {formatMoney(value, { cents: value < 10 })}
                    </Chip>
                  </span>
                </div>
              </div>
              <span className="fr-item__how" title={rule.how}>
                {rule.how}
              </span>
              <div className="fr-item__acts">
                <Button size="sm" variant="primary" disabled={!ok} title={ok ? `Choose where it goes in ${tank.name}` : `${def?.name ?? 'It'} can’t live in ${tank.name}.`} data-testid={`frag-plant-${f.id}`} onClick={() => plant3d(f)}>
                  <MapPin size={13} /> {ok ? 'Plant' : coral ? 'Needs a reef' : 'Wrong water'}
                </Button>
                {rack && (
                  <Button size="sm" title={`Seat it in a free hole on the frag rack (${plural(racks, 'free hole')})`} data-testid={`frag-rack-${f.id}`} onClick={() => act((d) => plantFrag(d, tankId, f.id, undefined, { rackOnly: true }), { sound: 'place' })}>
                    <LayoutGrid size={13} /> Rack
                  </Button>
                )}
                {market.listings && (
                  <Button size="sm" title="List it on the market" data-testid={`frag-list-${f.id}`} /* lane:w2-ui */ onClick={() => openFragListing([f.id])}>
                    <Tag size={13} /> List
                  </Button>
                )}
                <Button size="sm" variant="ghost" silent title="Sell it to the local fish store right now (less than a listing fetches)" data-testid={`frag-sell-${f.id}`} onClick={() => act((d) => quickSellFrags(d, [f.id]), { sound: 'coin' })}>
                  <Store size={13} /> Sell · {formatMoney(offer)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** lane:w2-ui — "Ready to propagate" hint for a player who has never taken a frag or cutting. */
export function FragReadyHint({ g, tank }: { g: GameState; tank: Tank }) {
  const ready = tank.decor.filter((inst) => safe(() => fragEligibility(g, tank, inst).ok, false));
  if (!ready.length) return null;
  const names = [...new Set(ready.map((inst) => getDecorDef(inst.defId)?.name).filter(Boolean) as string[])];
  const list = nameList(names, 2); // "Vallisneria, Java Fern and 3 more"
  const coral = ready.some((inst) => isCoralDef(getDecorDef(inst.defId)));
  const show = () => {
    const row = document.querySelector<HTMLElement>(`[data-testid="frag-take-${ready[0].id}"]`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.focus({ preventScroll: true });
  };
  return (
    <section className="fr-ready" data-testid="frag-ready-hint">
      <Scissors size={15} aria-hidden className="fr-ready__icon" />
      <p className="fr-ready__text">
        <b>Ready to propagate:</b> {list}. Take a {coral ? 'frag' : 'cutting'} from its row under “In {tank.name}” to grow new {coral ? 'colonies' : 'plants'} or sell them.
      </p>
      <Button size="sm" variant="ghost" onClick={show} data-testid="frag-ready-show">
        Show me
      </Button>
    </section>
  );
}
