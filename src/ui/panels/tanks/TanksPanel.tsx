/**
 * Tanks panel — every aquarium as a rich card: status, welfare, beauty, exhibit score, value, residents; focus,
 * rename, purpose, water-class conversion (empty tanks only), list for sale, buy a new tank. OWNER: lane "ui-panels".
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Layers, Eye, Pencil, Check, X, Tag, Wrench, Plus, Fish, Droplets, Sparkles, Ticket, Gauge, ChevronDown, Egg, Coins } from 'lucide-react';
import type { GameState, Tank, TankPurpose, WaterClass } from '@/types';
import { Button, StatusBadge, Money, formatMoney } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getSubstrateDef } from '@/data/catalog/substrates';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { usePanelGame, safe, useTempText } from '../common/hooks';
import { tankStatusReason } from '@/ui/common/tankStatus';
import { act } from '../common/act';
import { Chip, Seg, Select, Card, EmptyState, Tile, Bar, Callout } from '../common/parts';
import { TankThumb } from '../common/TankThumb';
import { VerdictBadge } from '../common/CompatPreview';
import { orderedTanks, livingInTank, clutchesIn, tankValue, dailyCost, tierOf, waterReport } from '../common/derive';
import { renameTank, setTankPurpose, convertWaterClass, canChangeWaterClass, convertWaterClassCost } from '../common/tankOps';
import { WATER_CLASS_LABEL, PURPOSE_LABEL, PURPOSE_HINT, PLAYABLE_WATER_CLASSES, plural, pct } from '../common/format';

export function TanksPanel() {
  const g = usePanelGame(800);
  const focusedTankId = useUI((s) => s.focusedTankId);
  const target = useUI((s) => s.panelTarget);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (target?.startsWith('tank:')) {
      setOpen(target.slice(5));
      useUI.getState().set({ panelTarget: null });
    }
  }, [target]);

  const rows = useMemo(() => {
    if (!g) return [];
    return orderedTanks(g).map((t) => {
      const residents = livingInTank(g, t.id);
      return { t, residents, clutches: clutchesIn(g, t.id).length, value: tankValue(g, t.id)?.expected ?? 0, cost: dailyCost(g, t) };
    });
  }, [g]);

  if (!g) return null;
  const totalValue = rows.reduce((a, r) => a + r.value, 0);
  const totalCost = rows.reduce((a, r) => a + r.cost, 0);
  const animals = rows.reduce((a, r) => a + r.residents.length, 0);

  return (
    <PanelLayout
      title="Tanks"
      icon={<Layers size={20} />}
      subtitle={`${plural(rows.length, 'aquarium')} · ${plural(animals, 'animal')} · ${formatMoney(totalValue)} estimated value`}
      footer={
        <>
          <span className="pn-muted pn-small pn-grow">Running all tanks costs about {formatMoney(totalCost, { cents: totalCost < 20 })} a day.</span>
          <Button variant="primary" onClick={() => useUI.getState().set({ panel: 'build', panelTarget: 'tab:tanks' })}>
            <Plus size={16} /> Buy a new tank
          </Button>
        </>
      }
    >
      <div className="pn-stack">
        <div className="pn-grid pn-grid--tiles">
          <Tile icon={<Layers size={14} />} tone="aqua" label="Aquariums" value={rows.length} hint={`${rows.filter((r) => r.t.purpose === 'display').length} on display`} />
          <Tile icon={<Fish size={14} />} tone="aqua" label="Animals" value={animals} hint={rows.some((r) => r.clutches) ? `${plural(rows.reduce((a, r) => a + r.clutches, 0), 'clutch', 'clutches')} growing` : 'across all tanks'} />
          <Tile icon={<Coins size={14} />} tone="gold" label="Est. value" value={<Money value={totalValue} />} hint="if sold as set up" />
          <Tile icon={<Gauge size={14} />} tone="coral" label="Daily upkeep" value={<Money value={totalCost} cents={totalCost < 20} />} hint="power, salt & wear" />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Layers size={26} />}
            title="No aquariums yet"
            action={
              <Button variant="primary" onClick={() => useUI.getState().set({ panel: 'build', panelTarget: 'tab:tanks' })}>
                <Plus size={16} /> Choose a tank
              </Button>
            }
          >
            Every great collection starts with one well-cycled tank.
          </EmptyState>
        ) : (
          <div className="pn-col pn-gap-3">
            {rows.map((r) => (
              <TankCard key={r.t.id} g={g} tank={r.t} residents={r.residents.length} residentsList={r.residents} clutches={r.clutches} value={r.value} cost={r.cost} focused={r.t.id === focusedTankId} open={open === r.t.id} onToggle={() => setOpen(open === r.t.id ? null : r.t.id)} lastTank={rows.length === 1} />
            ))}
          </div>
        )}
      </div>
    </PanelLayout>
  );
}

function TankCard({ g, tank, residents, residentsList, clutches, value, cost, focused, open, onToggle, lastTank }: { g: GameState; tank: Tank; residents: number; residentsList: import('@/types').Creature[]; clutches: number; value: number; cost: number; focused: boolean; open: boolean; onToggle: () => void; lastTank: boolean }) {
  const { phone, close } = useSheet();
  const tier = tierOf(tank);
  const listing = tank.listingId ? g.market.listings.find((l) => l.id === tank.listingId && l.status === 'active') : undefined;
  const c = tank.cache;
  const starterHere = residentsList.some((x) => x.isStarter);
  const statusWhy = safe(() => tankStatusReason(g, tank.id, { sep: '\n' }), '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  const focus = () => {
    useUI.getState().set({ view: 'tank', focusedTankId: tank.id, selectedCreatureId: null });
    if (phone) close();
  };

  return (
    <Card className={clsx('pn-tankcard', open && 'is-open')} selected={focused} tone={c.status === 'danger' ? 'danger' : null}>
      <div className="pn-tankcard__main">
        <button type="button" className="pn-tankcard__thumb" onClick={focus} aria-label={`View ${tank.name}`}>
          <TankThumb tank={tank} residents={residentsList} />
          {focused && <span className="pn-tankcard__viewing">Viewing</span>}
        </button>
        <div className="pn-tankcard__info">
          <div className="pn-row pn-gap-2 pn-row--top">
            <div className="pn-grow">
              <h3 className="pn-card__title pn-ellipsis">{tank.name}</h3>
              <div className="pn-card__sub">
                {tier?.name ?? tank.tierId} · {WATER_CLASS_LABEL[tank.waterClass]}
              </div>
            </div>
            <span className="pn-tankcard__status" title={statusWhy.join('\n') || undefined}>
              <StatusBadge status={c.status} label={c.status === 'good' ? 'Healthy' : c.status === 'watch' ? 'Watch' : 'Act now'} />
            </span>
          </div>
          {/* why the tank is Watch / Act now — water, animal welfare or food (sim: cache.statusReasons) */}
          {c.status !== 'good' && statusWhy.length > 0 && (
            <div className={clsx('pn-tankcard__why', `pn-tone-${c.status}`)} role="note">
              {statusWhy.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          )}
          <div className="pn-chips" style={{ marginTop: 8 }}>
            <Chip tone={tank.purpose === 'display' ? 'aqua' : tank.purpose === 'nursery' ? 'violet' : 'neutral'}>{PURPOSE_LABEL[tank.purpose]}</Chip>
            <Chip icon={<Fish size={12} />}>{plural(residents, 'animal')}</Chip>
            {clutches > 0 && (
              <Chip tone="violet" icon={<Egg size={12} />}>
                {plural(clutches, 'clutch', 'clutches')}
              </Chip>
            )}
            {listing && (
              <Chip tone="gold" icon={<Tag size={12} />}>
                Listed
              </Chip>
            )}
            {c.compatVerdict !== 'excellent' && c.compatVerdict !== 'usually_compatible' && residents > 1 && <VerdictBadge verdict={c.compatVerdict} />}
          </div>
        </div>
      </div>

      <div className="pn-tankcard__metrics">
        <Metric label="Welfare" value={c.welfare} icon={<Droplets size={12} />} />
        <Metric label="Beauty" value={c.beauty} icon={<Sparkles size={12} />} tone="aqua" />
        <Metric label="Exhibit" value={c.exhibitScore} icon={<Ticket size={12} />} tone="gold" />
        <Metric label="Stocking" value={Math.min(100, c.stockingLoad * 100)} display={pct(c.stockingLoad)} icon={<Fish size={12} />} tone={c.stockingLoad > 1 ? 'danger' : c.stockingLoad > 0.85 ? 'watch' : 'good'} />
      </div>

      <div className="pn-tankcard__foot">
        <div className="pn-tankcard__money">
          <span className="pn-muted pn-tiny">Value</span> <Money value={value} />
          <span className="pn-muted pn-tiny" style={{ marginLeft: 12 }}>Upkeep</span> <span className="pn-num-t pn-dim">{formatMoney(cost, { cents: cost < 20 })}/day</span>
        </div>
        <Button size="sm" variant={focused ? 'default' : 'primary'} onClick={focus}>
          <Eye size={15} /> {focused ? 'In view' : 'View'}
        </Button>
        <Button size="sm" onClick={onToggle} aria-expanded={open}>
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} /> Manage
        </Button>
      </div>

      {open && <TankManage g={g} tank={tank} residents={residents} lastTank={lastTank} starterHere={starterHere} listed={!!listing} />}
    </Card>
  );
}

function Metric({ label, value, display, icon, tone = 'auto' }: { label: string; value: number; display?: string; icon?: React.ReactNode; tone?: 'auto' | 'good' | 'watch' | 'danger' | 'aqua' | 'gold' }) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div className="pn-metric">
      <div className="pn-metric__row">
        <span className="pn-row pn-gap-1">
          {icon}
          {label}
        </span>
        <span className="pn-metric__val">{display ?? Math.round(v)}</span>
      </div>
      <Bar value={v} tone={tone} label={label} thin />
    </div>
  );
}

/** lane:w2-ui — the water types Build › Tanks also locks: marine needs Marine basics, reef the Reef unlock, brackish the estuary research. */
function wcLocked(g: GameState, w: WaterClass): boolean {
  const has = (k: string) => g.progress.unlocked.includes(k);
  if (w.startsWith('fresh')) return false;
  if (w === 'brackish') return !has('brackish');
  return !has('marine_basics') || (w === 'reef' && !has('reef'));
}

function wcLockHint(w: WaterClass): string {
  return w === 'brackish' ? 'Brackish water unlocks with the Brackish Estuaries research.' : w === 'reef' ? 'Reef tanks unlock with the Reef Systems research (after Marine Systems).' : 'Marine tanks unlock with the Marine Systems research.';
}

/** lane:fix-integrate-ui — what a conversion takes (new bed, salt, gear to storage) before the click (S14-06). */
function ConvertPreview({ g, tank, wc }: { g: GameState; tank: Tank; wc: WaterClass }) {
  const cost = safe(() => convertWaterClassCost(g, tank.id, wc), null);
  if (!cost || (cost.total <= 0 && cost.saltKg <= 0 && cost.equipmentOut.length === 0)) return null;
  const parts: string[] = [];
  if (cost.substrate > 0) parts.push(`New ${getSubstrateDef(cost.substrateKind!)?.name.toLowerCase() ?? 'substrate'} bed ${formatMoney(cost.substrate)}`);
  if (cost.saltKg > 0) {
    const kg = (n: number) => `${Math.round(n * 10) / 10} kg`;
    parts.push(cost.saltCost > 0 ? `${kg(cost.saltKg)} of salt ${formatMoney(cost.saltCost, { cents: cost.saltCost < 20 })}${cost.saltFromStore > 0 ? ` (${kg(cost.saltFromStore)} from storage)` : ''}` : `${kg(cost.saltKg)} of salt from storage`);
  }
  const short = cost.total > g.finance.money;
  return (
    <Callout tone={short ? 'danger' : 'info'} icon={<Coins size={16} />} title={cost.total > 0 ? `Converting costs ${formatMoney(cost.total, { cents: cost.total < 20 })}` : 'Converting uses stored salt'}>
      {parts.length > 0 && <>{parts.join(' · ')}. </>}
      {cost.equipmentOut.length > 0 && <>Moves to storage (can’t run in the new water): {cost.equipmentOut.join(', ')}. </>}
      {short && <>You have {formatMoney(Math.max(0, g.finance.money))}.</>}
    </Callout>
  );
}

function TankManage({ g, tank, residents, lastTank, starterHere, listed }: { g: GameState; tank: Tank; residents: number; lastTank: boolean; starterHere: boolean; listed: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tank.name);
  const [wc, setWc] = useState<WaterClass>(tank.waterClass);
  const convertGate = canChangeWaterClass(g, tank.id);
  const report = waterReport(g, tank.id);
  const { t: tempText } = useTempText();
  const equipment = tank.equipment.map((e) => ({ e, def: getEquipmentDef(e.defId) }));

  return (
    <div className="pn-tankmanage">
      <div className="pn-field">
        <span className="pn-field__label">Name</span>
        {editing ? (
          <form
            className="pn-row pn-gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const r = act((d) => renameTank(d, tank.id, name), { sound: 'confirm' });
              if (r?.ok) setEditing(false);
            }}
          >
            <input className="pn-input" value={name} maxLength={32} autoFocus onChange={(e) => setName(e.target.value)} aria-label="Tank name" />
            <Button type="submit" size="sm" variant="primary" silent aria-label="Save name">
              <Check size={15} />
            </Button>
            <Button size="sm" aria-label="Cancel" onClick={() => { setEditing(false); setName(tank.name); }}>
              <X size={15} />
            </Button>
          </form>
        ) : (
          <div className="pn-row pn-gap-2">
            <span className="pn-serif" style={{ fontSize: 16 }}>{tank.name}</span>
            <button type="button" className="pn-link" onClick={() => { setName(tank.name); setEditing(true); }}>
              <Pencil size={13} /> Rename
            </button>
          </div>
        )}
      </div>

      <div className="pn-field">
        <span className="pn-field__label">Purpose</span>
        <Seg<TankPurpose>
          label="Tank purpose"
          size="sm"
          value={tank.purpose}
          onChange={(p) => act((d) => setTankPurpose(d, tank.id, p), { sound: 'click' })}
          items={(['display', 'nursery', 'quarantine', 'breeding'] as TankPurpose[]).map((p) => ({ id: p, label: PURPOSE_LABEL[p] }))}
        />
        <span className="pn-field__hint">{PURPOSE_HINT[tank.purpose]}</span>
      </div>

      {report && (
        <div className="pn-field">
          <span className="pn-field__label">Water</span>
          <div className="pn-row pn-gap-2 pn-row--wrap">
            <StatusBadge status={report.status} />
            <span className="pn-dim pn-small">{tempText(report.headline)}</span>
          </div>
          {report.issues.slice(0, 2).map((i, k) => (
            <div key={k} className="pn-small pn-muted">
              • {tempText(i.text)}
              {i.advice ? ` ${tempText(i.advice)}` : ''}
            </div>
          ))}
        </div>
      )}

      <div className="pn-field">
        <span className="pn-field__label">Equipment</span>
        {equipment.length === 0 ? (
          <span className="pn-small pn-muted">No equipment installed.</span>
        ) : (
          <div className="pn-chips">
            {equipment.map(({ e, def }) => (
              <Chip key={e.id} tone={e.failed ? 'danger' : e.on ? 'neutral' : 'watch'}>
                {def?.name ?? e.defId}
                {e.failed ? ' · failed' : !e.on ? ' · off' : ''}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="pn-field">
        <span className="pn-field__label">Water type</span>
        {convertGate.ok ? (
          <div className="pn-row pn-gap-2 pn-row--wrap">
            {/* lane:w2-ui — locked water types say so up front (same gates as Build › Tanks) instead of after a failed Convert */}
            <Select<WaterClass> label="Water class" value={wc} onChange={setWc} options={PLAYABLE_WATER_CLASSES.map((w) => ({ id: w, label: wcLocked(g, w) && w !== tank.waterClass ? `${WATER_CLASS_LABEL[w]} (locked)` : WATER_CLASS_LABEL[w] }))} />
            <Button size="sm" data-testid="tank-convert" disabled={wc === tank.waterClass || (wcLocked(g, wc) && wc !== tank.waterClass)} title={wcLocked(g, wc) && wc !== tank.waterClass ? wcLockHint(wc) : undefined} onClick={() => act((d) => convertWaterClass(d, tank.id, wc), { sound: 'splash' })}>
              <Droplets size={14} /> Convert
            </Button>
          </div>
        ) : (
          <span className="pn-small pn-muted">
            {WATER_CLASS_LABEL[tank.waterClass]}. {convertGate.reason}
          </span>
        )}
        {convertGate.ok && wc !== tank.waterClass && (wcLocked(g, wc) || wc.startsWith('fresh') !== tank.waterClass.startsWith('fresh')) && (
          <span className="pn-field__hint">
            {/* lane:brackish — one step in salinity keeps most of the filter's cycle */}
            {wcLocked(g, wc) ? wcLockHint(wc) /* lane:w2-ui */ : wc === 'brackish' || tank.waterClass === 'brackish'
              ? wc === 'brackish' && !g.progress.unlocked.includes('brackish')
                ? 'Brackish water unlocks with the Brackish Estuaries research.'
                : 'Changing to or from brackish water means new water, but the filter bacteria adapt and keep most of their cycle.'
              : 'Switching between fresh and salt water means new water and re-cycling the filter.'}
          </span>
        )}
      </div>

      {convertGate.ok && wc !== tank.waterClass && !wcLocked(g, wc) && <ConvertPreview g={g} tank={tank} wc={wc} />}

      {(lastTank || starterHere) && (
        <Callout tone="watch" icon={<Sparkles size={16} />}>
          {lastTank ? 'This is your only aquarium — selling it leaves you with no tank until you buy another.' : 'Your starter lives here. Selling the whole tank includes them.'}
        </Callout>
      )}

      <div className="pn-row pn-gap-2 pn-row--wrap">
        <Button size="sm" variant="coral" disabled={listed} onClick={() => useUI.getState().set({ panel: 'market', panelTarget: `list:tank:${tank.id}` })}>
          <Tag size={14} /> {listed ? 'Already listed' : 'List tank for sale'}
        </Button>
        <Button size="sm" onClick={() => useUI.getState().set({ panel: 'build', panelTarget: `equipment:${tank.id}`, focusedTankId: tank.id })}>
          <Wrench size={14} /> Equipment & decor
        </Button>
        {residents > 0 && (
          <Button size="sm" variant="ghost" onClick={() => useUI.getState().set({ panel: 'livestock', panelTarget: `tank:${tank.id}` })}>
            <Fish size={14} /> See residents
          </Button>
        )}
      </div>
    </div>
  );
}
