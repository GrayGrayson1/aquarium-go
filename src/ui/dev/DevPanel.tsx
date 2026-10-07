/**
 * Developer tools (settings.devMode or ?dev=1): money, unlocks, spawning, ageing, breeding, water, time, speed,
 * AI state and compatibility introspection. Gated away from normal play behind a floating wrench.
 * OWNER: lane "ui-shell".
 */
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Wrench, Coins, LockOpen, Clock, Fish, Droplets, Bot, Scale, FlaskConical, Egg, Hourglass, Store, Sparkles } from 'lucide-react';
import { devOpenMarket, forceBuyerVisit } from '@/sim/economy';
import { act } from '../common/actions';
import type { GameSpeed, WaterState } from '@/types';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { useDevMode } from '@/state/devTools'; // lane:core (PLAT-005)
import { sfx } from '@/audio/sfx';
import { dev } from '@/dev/commands';
import { ALL_SPECIES } from '@/data/species';
import { evaluateTank } from '@/sim/compat';
import { getAIDebug } from '@/ai/debug';
import { runtime } from '@/runtime/tankRuntime';
import { Sheet } from '../common/Sheet';
import { CompatView } from '../common/CompatView';
import { safe, useGameThrottled, useInterval } from '../common/safe';
import { Button, Chip, Section, Segmented, formatMoney } from '../kit';

type Result = { ok?: boolean; message?: string } | Record<string, unknown> | void | null | undefined;

function useOutput() {
  const [out, setOut] = useState<string[]>([]);
  const run = (label: string, fn: () => Result) => {
    sfx('click');
    let text: string;
    try {
      const r = fn();
      if (r && typeof r === 'object' && 'message' in r && typeof r.message === 'string') text = `${label}: ${r.message}`;
      else if (r && typeof r === 'object') text = `${label}: ${JSON.stringify(r)}`;
      else text = `${label}: done`;
    } catch (e) {
      text = `${label}: error — ${(e as Error).message}`;
    }
    setOut((o) => [text, ...o].slice(0, 8));
  };
  return { out, run };
}

function WaterEditor({ tankId }: { tankId: string }) {
  const w = useGame((s) => s.game?.tanks[tankId]?.water);
  const [draft, setDraft] = useState<Partial<Record<keyof WaterState, string>>>({});
  if (!w) return null;
  const fields: { k: keyof WaterState; label: string; step: number }[] = [
    { k: 'tempC', label: 'Temp °C', step: 0.5 },
    { k: 'pH', label: 'pH', step: 0.1 },
    { k: 'ammonia', label: 'NH₃ ppm', step: 0.05 },
    { k: 'nitrite', label: 'NO₂ ppm', step: 0.05 },
    { k: 'nitrate', label: 'NO₃ ppm', step: 5 },
    { k: 'salinitySG', label: 'SG', step: 0.001 },
    { k: 'oxygen', label: 'O₂ 0–1', step: 0.05 },
    { k: 'level', label: 'Level 0–1', step: 0.02 },
    { k: 'algae', label: 'Algae', step: 5 },
    { k: 'bioMaturity', label: 'Bio 0–1', step: 0.05 },
  ];
  const apply = () => {
    const patch: Partial<WaterState> = {};
    for (const [k, v] of Object.entries(draft)) {
      const n = Number(v);
      if (v !== '' && Number.isFinite(n)) (patch as Record<string, number>)[k] = n;
    }
    dev.setWater(tankId, patch);
    setDraft({});
    useUI.getState().toast('Water updated', 'info');
  };
  return (
    <div className="ag-devwater">
      <div className="ag-devgrid">
        {fields.map((f) => (
          <label key={f.k} className="ag-devfield">
            <span>{f.label}</span>
            <input
              type="number"
              step={f.step}
              value={draft[f.k] ?? String(Math.round(Number(w[f.k]) * 1000) / 1000)}
              onChange={(e) => setDraft({ ...draft, [f.k]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="ag-row ag-wrap" style={{ gap: 6 }}>
        <Button size="sm" variant="primary" onClick={apply}>Apply</Button>
        <Chip size="sm" onClick={() => dev.setWater(tankId, { ammonia: 1.2, nitrite: 0.6 })}>Ammonia spike</Chip>
        <Chip size="sm" onClick={() => dev.setWater(tankId, { tempC: w.tempC + 6 })}>Heatwave +6°</Chip>
        <Chip size="sm" onClick={() => dev.setWater(tankId, { nitrate: 80, algae: 60 })}>Neglected</Chip>
        <Chip size="sm" onClick={() => dev.setWater(tankId, { ammonia: 0, nitrite: 0, nitrate: 5, algae: 0, detritus: 0, level: 1, clarity: 1, bioMaturity: 1 })}>Pristine</Chip>
      </div>
    </div>
  );
}

function AIInspector({ id }: { id: string | null }) {
  useInterval(500, !!id);
  if (!id) return <div className="ag-small ag-muted">Select a creature to inspect its AI.</div>;
  const rt = runtime.creatures.get(id);
  const dbg = safe('getAIDebug', () => getAIDebug(id), null);
  const view: Record<string, unknown> = {
    ...(rt ? { behavior: rt.behavior, pose: rt.pose, speedBL: +rt.speedBL.toFixed(2), pos: rt.pos.toArray().map((v) => +v.toFixed(3)) } : { runtime: 'not animated' }),
    ...(dbg ?? {}),
  };
  return <pre className="ag-devpre">{JSON.stringify(view, (_k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v), 2)}</pre>;
}

// lane:perf — DevToggle moved to ./DevToggle.tsx (the top bar imports it; this module is code-split). Re-exported
// here so existing imports keep working.
export { DevToggle } from './DevToggle';

export function DevPanel() {
  const devMode = useDevMode();
  const open = useUI((s) => s.panel === 'dev');
  const screen = useUI((s) => s.screen);
  const game = useGameThrottled(600);
  const focused = useUI((s) => s.focusedTankId);
  const selected = useUI((s) => s.selectedCreatureId);
  const follow = useUI((s) => s.followCreatureId);
  const { out, run } = useOutput();
  const species = useMemo(() => [...ALL_SPECIES].sort((a, b) => a.commonName.localeCompare(b.commonName)), []);
  const [spId, setSpId] = useState(species[0]?.id ?? 'betta');
  const [spTank, setSpTank] = useState<string>('');
  const [sex, setSex] = useState<'any' | 'male' | 'female'>('any');
  const [count, setCount] = useState(1);
  const [age, setAge] = useState(30);
  if (!devMode) return null;
  const tankId = spTank || focused || game?.tankOrder[0] || '';
  const compat = game && focused ? safe('evaluateTank', () => evaluateTank(game, focused), null) : null;
  const activeListings = (game?.market.listings ?? []).filter((l) => l.status === 'active');
  const inspectId = selected ?? follow;
  const sc = inspectId && game ? game.creatures[inspectId] : null;

  return (
    <>
      <Sheet open={open && screen === 'game'} onClose={() => useUI.getState().set({ panel: null })} side="right" testId="dev-panel" label="Developer tools" title="Developer tools" subtitle="Testing only — not part of normal play" className="ag-devpanel">
        {!game ? (
          <div className="ag-muted">No game running.</div>
        ) : (
          <>
            {out.length > 0 && (
              <ul className="ag-devout">
                {out.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
            <Section title={<><Coins size={12} /> Economy &amp; unlocks</>}>
              <div className="ag-row ag-wrap" style={{ gap: 6 }}>
                {[100, 1000, 10000].map((n) => (
                  <Button key={n} size="sm" onClick={() => run(`+${formatMoney(n)}`, () => dev.addMoney(n))}>+{formatMoney(n)}</Button>
                ))}
                <Button size="sm" onClick={() => run('Unlock all', () => dev.unlockAll())}>
                  <LockOpen size={14} /> Unlock all
                </Button>
                <Button size="sm" onClick={() => run('Fill test facility', () => dev.fillTestFacility(10))}>+10 test tanks</Button>
              </div>
            </Section>
            <Section title={<><Store size={12} /> Market</>}>
              <div className="ag-row ag-wrap" style={{ gap: 6 }}>
                <Button
                  size="sm"
                  onClick={() =>
                    run('Open market', () => {
                      act((d) => { devOpenMarket(d); }, { toast: false, sound: 'unlock' });
                      return { message: 'Listings + tank auctions unlocked' };
                    })
                  }
                >
                  <LockOpen size={14} /> Open market
                </Button>
                {/* lane:genetics — Prismatic QA */}
                <Button size="sm" onClick={() => run('Prismatic offer', () => dev.addShopOffer(game.starterId, { prismatic: true }))}>
                  <Sparkles size={14} /> Prismatic offer
                </Button>
                <Button size="sm" onClick={() => run('Next shop Prismatic', () => dev.forcePrismatic('shop', 1))}>Next shop animal Prismatic</Button>
                <Button size="sm" onClick={() => run('Next bred Prismatic', () => dev.forcePrismatic('bred', 1))}>Next bred young Prismatic</Button>
              </div>
              {activeListings.length === 0 ? (
                <div className="ag-small ag-muted">No active listings. List something in the Market to test buyers.</div>
              ) : (
                <div className="ag-row ag-wrap" style={{ gap: 6 }}>
                  {activeListings.slice(0, 6).map((l) => (
                    <Chip
                      key={l.id}
                      size="sm"
                      onClick={() => run(`Buyer visit: ${l.title}`, () => act((d) => forceBuyerVisit(d, l.id), { sound: 'bid' }) ?? undefined)}
                    >
                      Buyer → {l.title}
                    </Chip>
                  ))}
                </div>
              )}
            </Section>
            <Section title={<><Clock size={12} /> Time</>}>
              <div className="ag-row ag-wrap" style={{ gap: 8 }}>
                <Segmented<GameSpeed>
                  size="sm"
                  label="Speed"
                  value={game.clock.speed}
                  onChange={(s) => dev.setSpeed(s)}
                  items={[{ id: 0, label: '⏸' }, { id: 1, label: '1×' }, { id: 3, label: '3×' }, { id: 10, label: '10×' }]}
                />
                {[1, 6, 24, 24 * 7].map((h) => (
                  <Button key={h} size="sm" onClick={() => run(`Advance ${h < 24 ? `${h} h` : `${h / 24} d`}`, () => dev.advanceTime(h) as unknown as Result)}>
                    <Hourglass size={13} /> +{h < 24 ? `${h}h` : `${h / 24}d`}
                  </Button>
                ))}
              </div>
            </Section>
            <Section title={<><Fish size={12} /> Spawn</>}>
              <div className="ag-devgrid">
                <label className="ag-devfield ag-devfield--wide">
                  <span>Species</span>
                  <select value={spId} onChange={(e) => setSpId(e.target.value)}>
                    {species.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.commonName} ({s.environment})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ag-devfield ag-devfield--wide">
                  <span>Tank</span>
                  <select value={tankId} onChange={(e) => setSpTank(e.target.value)}>
                    {game.tankOrder.map((id) => (
                      <option key={id} value={id}>
                        {game.tanks[id]?.name} · {game.tanks[id]?.environment}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ag-devfield">
                  <span>Sex</span>
                  <select value={sex} onChange={(e) => setSex(e.target.value as typeof sex)}>
                    <option value="any">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="ag-devfield">
                  <span>Count</span>
                  <input type="number" min={1} max={40} value={count} onChange={(e) => setCount(Math.max(1, Math.min(40, Number(e.target.value) || 1)))} />
                </label>
                <label className="ag-devfield">
                  <span>Age (days)</span>
                  <input type="number" min={0} max={2000} value={age} onChange={(e) => setAge(Math.max(0, Number(e.target.value) || 0))} />
                </label>
              </div>
              <Button size="sm" variant="primary" onClick={() => run('Spawn', () => dev.spawnSpecies(spId, tankId, { sex: sex === 'any' ? undefined : sex, count, ageDays: age }))}>
                <Fish size={14} /> Spawn
              </Button>
            </Section>
            <Section title={<><Egg size={12} /> Selected creature</>}>
              {sc ? (
                <>
                  <div className="ag-small">
                    <strong>{sc.name}</strong> · {sc.speciesId} · {sc.sex} · {sc.lifeStage} · repro {sc.repro.stage}
                  </div>
                  <div className="ag-row ag-wrap" style={{ gap: 6 }}>
                    {[1, 7, 30].map((d) => (
                      <Button key={d} size="sm" onClick={() => run(`Age +${d}d`, () => dev.ageCreature(sc.id, d))}>Age +{d}d</Button>
                    ))}
                    <Button size="sm" onClick={() => run('Force breeding', () => dev.forceBreeding(sc.id))}>
                      <Egg size={14} /> Force breeding
                    </Button>
                    <Button size="sm" onClick={() => run(sc.rareVariant ? 'Make ordinary' : 'Make Prismatic', () => dev.makePrismatic(sc.id, !sc.rareVariant))}>
                      <Sparkles size={14} /> {sc.rareVariant ? 'Make ordinary' : 'Make Prismatic'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="ag-small ag-muted">Click an animal in the tank to select it.</div>
              )}
            </Section>
            {focused && (
              <Section title={<><Droplets size={12} /> Water · {game.tanks[focused]?.name}</>}>
                <WaterEditor tankId={focused} />
              </Section>
            )}
            <Section title={<><Bot size={12} /> AI state</>}>
              <AIInspector id={inspectId} />
            </Section>
            <Section title={<><Scale size={12} /> Compatibility (focused tank)</>}>
              <CompatView report={compat} limit={12} />
            </Section>
            <Section title={<><FlaskConical size={12} /> State</>}>
              <div className="ag-small ag-muted ag-tabular">
                v{game.schemaVersion} · seed {game.seed} · {Object.keys(game.creatures).length} creatures · {game.tankOrder.length} tanks · {game.log.length} log · hour {game.clock.hour.toFixed(2)}
              </div>
            </Section>
          </>
        )}
      </Sheet>
    </>
  );
}
