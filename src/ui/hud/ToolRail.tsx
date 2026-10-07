/**
 * Tank tool palette (feed, target feed, tap glass, photo, lights, party, watch) + food picker, lights popover,
 * camera mode chips and the active-tool hint. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, type ComponentType, type ReactNode } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import {
  Utensils,
  Crosshair,
  Hand,
  Camera,
  Lamp,
  PartyPopper,
  Eye,
  Lock,
  Video,
  Orbit,
  ScanEye,
  Focus,
  X,
  Plus,
  Moon,
  ShoppingCart,
  TriangleAlert,
  type LucideProps,
} from 'lucide-react';
import type { GameState, LightPreset } from '@/types';
import { useGame } from '@/state/game';
import { useUI, type CameraMode, type ToolId } from '@/state/ui';
import { useDevMode } from '@/state/devTools'; // lane:core (PLAT-005)
import { sfx } from '@/audio/sfx';
import { getSpecies, findSpecies } from '@/data/species';
import { getFoodDef } from '@/data/catalog/foods';
import { getDecorDef, isEpiphyte, isFloating } from '@/data/catalog/decor';
import { creaturesInTank } from '@/sim/life';
import { setLighting, feedTank } from '@/sim/care';
import { tankDims } from '@/sim/tankSpace';
import { tutorialWants, counterValue } from '@/sim/facility/progression';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks'; // lane:qa-r3
import { tutorialChain } from '@/data/quests';
import { pushVisualEvent, runtime, nowSeconds } from '@/runtime/tankRuntime';
import { noteInteraction } from '@/sim/life/actions'; // lane:qa-play
import { aiFeed } from '@/ai/registry'; // lane:qa-play
import { CAMERA_USER_EVENT } from '@/render/camera/cameraFX';
import { clearPlaceAgain, placeAnother, PLACE_AGAIN_MS, usePlaceAgain } from '@/render/decor/placeAgain';
import { useShell } from '../common/shellStore';
import { enterCinematic } from './cardDock';
import { foodName, LIGHT_PRESET_LABEL, lightPresetsFor } from '../common/format';
import { safe, useMedia } from '../common/safe';
import { tutorialFlag, act } from '../common/actions';
import { Button, Chip, Slider, Toggle, formatMoney } from '../kit';
import { buyFoodPack, openFoodInSupplies, tankFoodAlert, youngFoodNeed } from '../common/foodStock';

// ───────────── helpers ─────────────

function focusedTank(g: GameState | null) {
  const id = useUI.getState().focusedTankId;
  return g && id ? g.tanks[id] ?? null : null;
}

export interface FoodOption {
  id: string;
  name: string;
  count: number;
  eaters: string[];
  delivery?: string;
  /** The guide's feed step names this food ("drop an earthworm", "pick micro pellets"): it leads the list. */
  suggested?: boolean;
}

const GENERIC_FOOD_WORDS = new Set(['frozen', 'live', 'shrimp', 'pellets', 'flakes', 'food', 'mix', 'culture', 'sheets', 'wafers', 'baby', 'pest']);

/** The food the guide's feed step talks about, by name ("Earthworms" ↔ "drop an earthworm", "Frozen Mysis Shrimp" ↔ "offer frozen mysis"). */
export function guideMentions(body: string, foodName: string): boolean {
  const text = body.toLowerCase();
  const name = foodName.toLowerCase();
  if (text.includes(name)) return true;
  return name.split(/[^a-z]+/).some((w) => w.length >= 4 && !GENERIC_FOOD_WORDS.has(w) && (text.includes(w) || text.includes(w.replace(/s$/, ''))));
}

/** Body of the guide's feed step while it is the current step (and still unfed), else null. */
function guideFeedBody(g: GameState): string | null {
  const t = g.progress?.tutorial;
  if (!t || t.done || t.skipped) return null;
  if (!safe('tutorialWants', () => tutorialWants(g, 'fed') || tutorialWants(g, 'target_fed'), false)) return null;
  const step = safe('tutorialChain', () => tutorialChain(t.starterId || g.starterId)[t.step], undefined);
  return step?.id === 'feed' ? step.body : null;
}

export function foodOptions(g: GameState, tankId: string | null): FoodOption[] {
  const residents = tankId ? safe('creaturesInTank', () => creaturesInTank(g, tankId), []) : [];
  const guide = guideFeedBody(g);
  const young = tankId ? safe('youngFoodNeed', () => youngFoodNeed(g, tankId), null) : null; // lane:qa-play
  return Object.entries(g.inventory.foods ?? {})
    .map(([id, count]) => {
      const def = getFoodDef(id);
      const tags = def?.tags ?? [];
      const eaters = residents
        .filter((c) => {
          const sp = findSpecies(c.speciesId);
          if (!sp) return false;
          if (!tags.length) return true; // unknown food data: assume edible
          return tags.some((t) => sp.foods.includes(t));
        })
        .map((c) => c.name);
      // lane:qa-play — larvae / fry growing here count as eaters too ("Eaten by the fry")
      if (!eaters.length && young && tags.some((t) => young.tags.includes(t))) eaters.push(`the ${young.label}`);
      return { id, name: foodName(id), count: Math.floor(count), eaters, delivery: def?.delivery, suggested: !!guide && guideMentions(guide, foodName(id)) };
    })
    .sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || Number(!!b.suggested) - Number(!!a.suggested) || b.eaters.length - a.eaters.length || a.name.localeCompare(b.name));
}

const DELIVERY_WORD: Record<string, string> = { floating: 'Floats', slow_sink: 'Sinks slowly', fast_sink: 'Sinks fast', live: 'Live food', target: 'Target fed' };

export function selectTool(tool: ToolId, foodId?: string | null) {
  const ui = useUI.getState();
  const patch: Parameters<typeof ui.set>[0] = { tool };
  if (foodId !== undefined) patch.feedFoodId = foodId;
  ui.set(patch);
  if (tool === 'feed' || tool === 'target_feed') tutorialFlag('selected_food');
}

// ───────────── popovers ─────────────

function FoodPicker({ mode }: { mode: 'feed' | 'target_feed' }) {
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const game = useGame((s) => s.game);
  const tankId = useUI((s) => s.focusedTankId);
  const feedFoodId = useUI((s) => s.feedFoodId);
  const opts = useMemo(() => (game ? foodOptions(game, tankId) : []), [game?.inventory.foods, tankId, game?.tankOrder, game?.progress?.tutorial?.step]); // eslint-disable-line react-hooks/exhaustive-deps
  const alert = useMemo(() => (game && tankId ? safe('tankFoodAlert', () => tankFoodAlert(game, tankId), null) : null), [game?.inventory.foods, tankId, game?.tankOrder]); // eslint-disable-line react-hooks/exhaustive-deps
  // lane:qa-play — fry / larvae in this tank with nothing they can eat in the cupboard
  const youngNeed = useMemo(() => (game && tankId ? safe('youngFoodNeed', () => youngFoodNeed(game, tankId), null) : null), [game?.inventory.foods, game?.clutches, tankId]); // eslint-disable-line react-hooks/exhaustive-deps
  const youngOut = !alert && youngNeed?.text ? youngNeed : null;
  const money = game?.finance.money ?? 0;
  const shopFor = alert?.restockId ?? youngOut?.restockId ?? opts.find((f) => f.count <= 0)?.id ?? null;
  return (
    <motion.div className="ag-popover ag-toolpop" role="dialog" aria-label={mode === 'feed' ? 'Choose a food' : 'Choose a food for target feeding'} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.16 }}>
      <div className="ag-popover__title">{mode === 'feed' ? 'Feed the tank' : 'Target feed'}</div>
      <p className="ag-popover__hint">
        {mode === 'feed' ? `Pick a food, then ${fine ? 'click' : 'tap'} the water where it should go.` : `Pick a food, then ${fine ? 'click' : 'tap'} one animal to offer it directly — ideal for slow, patient feeders.`}
      </p>
      {alert && (
        <div className={clsx('ag-foodalert', `is-${alert.level}`)} role="status" data-testid="food-alert">
          <TriangleAlert size={14} aria-hidden />
          <span className="ag-grow">{alert.text}.</span>
        </div>
      )}
      {youngOut && (
        <div className="ag-foodalert is-out" role="status" data-testid="food-alert-young">
          <TriangleAlert size={14} aria-hidden />
          <span className="ag-grow">{youngOut.text}.</span>
          {youngOut.restockId && (
            <button
              type="button"
              className="ag-food__buy"
              data-testid="food-young-buy"
              disabled={money < (getFoodDef(youngOut.restockId)?.price ?? 0)}
              aria-label={`Buy a pack of ${foodName(youngOut.restockId)} for ${formatMoney(getFoodDef(youngOut.restockId)?.price ?? 0)}`}
              title={`Buy ${foodName(youngOut.restockId).toLowerCase()} · ${formatMoney(getFoodDef(youngOut.restockId)?.price ?? 0)} a pack`}
              onClick={() => buyFoodPack(youngOut.restockId!)}
            >
              <ShoppingCart size={13} aria-hidden /> {formatMoney(getFoodDef(youngOut.restockId)?.price ?? 0)}
            </button>
          )}
        </div>
      )}
      {opts.length === 0 ? (
        <div className="ag-muted ag-small">No food in your inventory yet.</div>
      ) : (
        <div className="ag-foodlist">
          {opts.map((f) => {
            const def = getFoodDef(f.id);
            const out = f.count <= 0;
            const low = !out && alert?.level === 'low' && alert.foodIds.includes(f.id);
            const price = def?.price ?? 0;
            const poor = money < price;
            return (
              <div key={f.id} className={clsx('ag-foodrow', out && 'is-out')}>
                <button
                  type="button"
                  className={clsx('ag-food', feedFoodId === f.id && 'is-selected', out && 'is-empty')}
                  data-testid={`food-option-${f.id}`}
                  disabled={out}
                  onClick={() => {
                    sfx('click');
                    selectTool(mode, f.id);
                    useShell.getState().set({ popover: null });
                  }}
                >
                  <span className="ag-food__dot" style={{ background: def?.color ?? 'var(--c-gold)' }} aria-hidden />
                  <span className="ag-grow">
                    <span className="ag-food__name">
                      {f.name}
                      {f.suggested && !out && <span className="ag-food__tag">Suggested</span>}
                    </span>
                    <span className="ag-food__meta">
                      {f.delivery && DELIVERY_WORD[f.delivery] ? `${DELIVERY_WORD[f.delivery]} · ` : ''}
                      {f.eaters.length ? `Eaten by ${f.eaters.slice(0, 2).join(', ')}${f.eaters.length > 2 ? ` +${f.eaters.length - 2}` : ''}` : 'No one here eats this'}
                    </span>
                  </span>
                  <span className={clsx('ag-food__count', out && 'is-out', low && 'is-low')}>{out ? 'Out' : low ? `×${f.count} · low` : `×${f.count}`}</span>
                </button>
                {(out || low) && def && (
                  <button
                    type="button"
                    className="ag-food__buy"
                    data-testid={`food-buy-${f.id}`}
                    disabled={poor}
                    aria-label={`Buy a pack of ${f.name} (${def.servingsPerPack} servings) for ${formatMoney(price)}`}
                    title={poor ? `Not enough money (${formatMoney(price)} a pack)` : `Buy a pack: ${def.servingsPerPack} servings for ${formatMoney(price)}`}
                    onClick={() => buyFoodPack(f.id)}
                  >
                    <ShoppingCart size={13} aria-hidden /> {formatMoney(price)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="ag-popover__row ag-foodshop">
        <button
          type="button"
          className="ag-linkbtn"
          data-testid="food-shop"
          onClick={() => {
            sfx('open');
            useShell.getState().set({ popover: null });
            if (shopFor) openFoodInSupplies(shopFor);
            else useUI.getState().set({ panel: 'market', panelTarget: 'tab:supplies' });
          }}
        >
          <ShoppingCart size={13} aria-hidden /> {shopFor ? `Shop for ${foodName(shopFor).toLowerCase()}` : 'Shop for more food'}
        </button>
      </div>
      {mode === 'feed' && feedFoodId && (game?.inventory.foods[feedFoodId] ?? 0) > 0 && (
        <div className="ag-popover__row ag-foodnow">
          <span className="ag-small ag-muted">No pointer? Drop it at the surface.</span>
          <Button size="sm" data-testid="feed-now" onClick={() => feedNow(feedFoodId)}>
            <Utensils size={14} /> Feed now
          </Button>
        </div>
      )}
    </motion.div>
  );
}

/** Keyboard/assistive alternative to clicking the water: feed one serving near the surface centre. */
export function feedNow(foodId: string) {
  const ui = useUI.getState();
  const g = useGame.getState().game;
  const tankId = ui.focusedTankId;
  // lane:qa-r3 — never a silent no-op
  if (!g || !tankId || !g.tanks[tankId]) {
    ui.toast('Pick a tank to feed first.', 'info');
    return;
  }
  const r = act((d) => feedTank(d, tankId, foodId, { zone: 'surface' }), { flag: 'fed', sound: 'feed', toast: false });
  if (r?.ok) {
    const d = safe('tankDims', () => tankDims(g.tanks[tankId]), null);
    if (d) pushVisualEvent({ kind: 'feed', tankId, pos: [0, d.waterY, d.W * 0.2], t: performance.now() / 1000 });
    // lane:qa-r3 — a feed nothing eats (or into an empty tank, or too much) is a warning, not a success
    ui.toast(r.message && r.message !== 'Fed' ? r.message : `Dropped ${foodName(foodId).toLowerCase()} at the surface.`, r.caution ? 'warning' : 'success');
  }
}

/**
 * lane:qa-play — keyboard / small-animal alternative to clicking the animal in Target feed: offer the food to the
 * animal whose card is open (a hitched seahorse is a tiny target). Mirrors the 3D click in TankInteraction.
 */
export function targetFeedNow(foodId: string, creatureId: string): boolean {
  const ui = useUI.getState();
  const g = useGame.getState().game;
  const c = g?.creatures[creatureId];
  if (!g || !c?.tankId || !g.tanks[c.tankId]) return false;
  const tankId = c.tankId;
  const r = act(
    (d) => {
      const res = feedTank(d, tankId, foodId, { targetCreatureId: creatureId });
      if (res.ok) noteInteraction(d, creatureId, 'target_fed');
      return res;
    },
    { flag: 'target_fed', sound: 'feed', toast: false },
  );
  // lane:w2-ui — act() already toasts the reason on failure (this used to toast it a second time)
  if (!r?.ok) return false;
  const rt = runtime.creatures.get(creatureId);
  const d = safe('tankDims', () => tankDims(g.tanks[tankId]), null);
  if (rt && d) {
    const cp = Math.cos(rt.pitch);
    const reach = rt.lengthM * (rt.speciesId.includes('seahorse') ? 0.55 : 0.8);
    const local: [number, number, number] = [
      Math.max(-d.L / 2 + 0.01, Math.min(d.L / 2 - 0.01, rt.pos.x + cp * Math.cos(rt.yaw) * reach)),
      Math.max(d.substrateY + 0.01, Math.min(d.waterY - 0.01, rt.pos.y + Math.sin(rt.pitch) * reach + rt.lengthM * (rt.speciesId.includes('seahorse') ? 0.3 : 0.05))),
      Math.max(-d.W / 2 + 0.01, Math.min(d.W / 2 - 0.01, rt.pos.z - cp * Math.sin(rt.yaw) * reach)),
    ];
    safe('aiFeed', () => aiFeed(tankId, foodId, local, { targetCreatureId: creatureId }), 0);
    pushVisualEvent({ kind: 'feed', tankId, pos: local, creatureId, t: nowSeconds(), strength: 0.3 });
  }
  ui.toast(r.message && r.message !== 'Done' ? r.message : `Offered ${c.name} ${foodName(foodId).toLowerCase()}.`, r.caution ? 'warning' : 'success'); // lane:qa-r3
  return true; // lane:w2-ui — the creature card's Feed row animates on success
}

function LightsPopover() {
  const tank = useGame((s) => focusedTank(s.game));
  if (!tank) return null;
  const presets = lightPresetsFor(tank.waterClass);
  const L = tank.lighting;
  // lane:qa-r3 — quiet, unless the new schedule feeds algae or starves plants (debounced per tank, as on the tank card)
  const set = (patch: Parameters<typeof setLighting>[2]) => act((d) => setLighting(d, tank.id, patch), { toast: 'caution', cautionKey: `lights:${tank.id}`, sound: 'click', flag: 'changed_lights' });
  return (
    <motion.div className="ag-popover ag-toolpop" role="dialog" aria-label="Lighting" initial={{ opacity: 0, x: 10, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 8, scale: 0.98 }} transition={{ duration: 0.18 }}>
      <div className="ag-popover__title">Lighting</div>
      <div className="ag-row ag-wrap" style={{ gap: 6 }}>
        {presets.map((p: LightPreset) => (
          <Chip key={p} size="sm" selected={L.preset === p} onClick={() => set({ preset: p })}>
            {LIGHT_PRESET_LABEL[p]}
          </Chip>
        ))}
      </div>
      <div className="ag-popover__row">
        <span className="ag-small ag-muted">Intensity</span>
        <span className="ag-small ag-tabular">{Math.round(L.intensity * 100)}%</span>
      </div>
      <Slider label="Light intensity" value={L.intensity} min={0} max={1.5} step={0.05} onChange={(v) => set({ intensity: v })} />
      <div className="ag-popover__row">
        <span className="ag-small">
          <Moon size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> Moonlight at night
        </span>
        <Toggle label="Moonlight at night" checked={L.moonlight} onChange={(v) => set({ moonlight: v })} />
      </div>
    </motion.div>
  );
}

// ───────────── rail ─────────────

function ToolButton({ icon: Icon, label, shortLabel, hint, active, onClick, testId, tutorialId, locked, lockHint, children, expanded }: {
  icon: ComponentType<LucideProps>; label: string; /** Phone rail label when `label` is too long. */ shortLabel?: string; /** Tooltip / accessible description (defaults to the label). */ hint?: string; active?: boolean; onClick: () => void; testId: string; tutorialId?: string; locked?: boolean; lockHint?: string; children?: ReactNode; expanded?: boolean;
}) {
  return (
    <div className="ag-popanchor ag-tool-wrap">
      <button
        type="button"
        className={clsx('ag-tool', active && 'is-active', locked && 'is-locked')}
        data-testid={testId}
        data-tutorial-id={tutorialId ?? testId}
        aria-pressed={active}
        aria-expanded={expanded}
        aria-label={locked ? `${label} (locked): ${lockHint ?? ''}` : hint ?? label}
        title={locked ? lockHint : hint ?? label}
        onClick={onClick}
      >
        <span className="ag-tool__icon">
          <Icon size={19} aria-hidden />
          {locked && (
            <span className="ag-tool__lock" aria-hidden>
              <Lock size={9} />
            </span>
          )}
        </span>
        {shortLabel ? (
          <span className="ag-tool__label">
            <span className="ag-tool__label--long">{label}</span>
            <span className="ag-tool__label--short" aria-hidden>
              {shortLabel}
            </span>
          </span>
        ) : (
          <span className="ag-tool__label">{label}</span>
        )}
      </button>
      <AnimatePresence>{children}</AnimatePresence>
    </div>
  );
}

/** `occlude`: the rail sits beside an open right-hand sheet, so the camera should frame the tank left of it too. */
export function ToolRail({ occlude = false }: { occlude?: boolean } = {}) {
  const tool = useUI((s) => s.tool);
  const party = useUI((s) => s.partyMode);
  const popover = useShell((s) => s.popover);
  const dev = useDevMode();
  const partyUnlocked = useGame((s) => !!s.game && (s.game.progress.unlocked.includes('party_mode') || dev));
  // lane:qa-r3 — the real route (and progress) instead of "unlocks as your aquarium grows"
  const partyRoute = useGame((s) => (partyUnlocked || !s.game ? '' : partyHint(s.game)));
  // orbiting / panning / zooming by hand counts for the tutorial's "Have a look around", not only the camera chips
  useEffect(() => {
    const onCamera = () => tutorialFlag('camera_moved');
    window.addEventListener(CAMERA_USER_EVENT, onCamera);
    return () => window.removeEventListener(CAMERA_USER_EVENT, onCamera);
  }, []);
  const toggleFeed = (mode: 'feed' | 'target_feed') => {
    const pop = mode === 'feed' ? 'food' : 'target_food';
    const ui = useUI.getState();
    if (ui.tool === mode) {
      sfx('close');
      selectTool('none');
      useShell.getState().set({ popover: null });
      return;
    }
    sfx('open');
    useShell.getState().togglePopover(pop);
    // re-arm the last food immediately if it's still in stock
    const g = useGame.getState().game;
    if (g && ui.feedFoodId && (g.inventory.foods[ui.feedFoodId] ?? 0) > 0) selectTool(mode, ui.feedFoodId);
  };
  return (
    <div className="ag-toolrail" role="toolbar" aria-label="Tank tools" data-occlude={occlude ? 'right' : undefined}>
      <ToolButton icon={Utensils} label="Feed" hint="Feed — drop food into the water" testId="tool-feed" active={tool === 'feed'} expanded={popover === 'food'} onClick={() => toggleFeed('feed')}>
        {popover === 'food' && <FoodPicker key="food" mode="feed" />}
      </ToolButton>
      <ToolButton icon={Crosshair} label="Target" hint="Target feed — offer food to one animal directly" testId="tool-target-feed" active={tool === 'target_feed'} expanded={popover === 'target_food'} onClick={() => toggleFeed('target_feed')}>
        {popover === 'target_food' && <FoodPicker key="tfood" mode="target_feed" />}
      </ToolButton>
      <ToolButton
        icon={Hand}
        label="Tap glass"
        shortLabel="Tap"
        hint="Tap the glass — bold animals come to look, shy ones hide. Repeated taps stress them."
        testId="tool-tap"
        active={tool === 'tap'}
        onClick={() => {
          sfx('click');
          useShell.getState().set({ popover: null });
          selectTool(tool === 'tap' ? 'none' : 'tap');
        }}
      />
      <ToolButton
        icon={Camera}
        label="Photo"
        testId="tool-photo"
        onClick={() => {
          sfx('camera');
          useShell.getState().set({ popover: null });
          enterCinematic('photo');
          tutorialFlag('opened_photo');
        }}
      />
      <ToolButton icon={Lamp} label="Lights" testId="tool-lights" active={popover === 'lights'} expanded={popover === 'lights'} onClick={() => { sfx('click'); useShell.getState().togglePopover('lights'); }}>
        {popover === 'lights' && <LightsPopover key="lights" />}
      </ToolButton>
      <ToolButton
        icon={PartyPopper}
        label="Party"
        testId="tool-party"
        active={party}
        locked={!partyUnlocked}
        lockHint={`${partyRoute || 'Unlocks as your aquarium grows.'} Just for fun: lights dance to music.`}
        onClick={() => {
          if (!partyUnlocked) {
            sfx('error');
            useUI.getState().toast(partyRoute || 'Party mode unlocks as your aquarium grows.', 'info');
            return;
          }
          togglePartyMode(!party);
        }}
      />
      <CameraCycleTool />
      <ToolButton
        icon={Eye}
        label="Watch"
        testId="tool-watch"
        onClick={() => {
          sfx('close');
          useShell.getState().set({ popover: null, tankCardOpen: false });
          enterCinematic('watch');
          tutorialFlag('watch_mode');
        }}
      />
    </div>
  );
}

/** lane:qa-r3 — how party mode unlocks (src/data/unlocks.ts), with the player's progress on each route. */
export function partyHint(g: GameState): string {
  const conds = (UNLOCK_RULE_BY_KEY.party_mode?.when ?? []).flatMap((c) => (c.type === 'any' ? c.of : [c]));
  const parts: string[] = [];
  for (const c of conds) {
    if (c.type === 'counter' && c.key === 'feeds') parts.push(`after ${c.min} feedings (${Math.min(c.min, safe('counterValue', () => counterValue(g, 'feeds'), 0))} so far)`);
    else if (c.type === 'reputation') parts.push(`at ${c.min} reputation (you have ${Math.floor(g.progress?.reputation ?? 0)})`);
  }
  return parts.length ? `Party mode unlocks ${parts.join(' or ')}.` : 'Party mode unlocks as your aquarium grows.';
}

/** The audio lane's director follows `ui.partyMode` (and the opt-in microphone setting). */
export function togglePartyMode(on: boolean) {
  sfx(on ? 'celebrate' : 'close');
  useUI.getState().set({ partyMode: on });
  if (on) tutorialFlag('party_mode');
}

// ───────────── camera chips ─────────────

const CAMERA_MODES: { id: CameraMode; label: string; icon: ComponentType<LucideProps>; title: string }[] = [
  { id: 'front', label: 'Front', icon: Video, title: 'Front view' },
  { id: 'orbit', label: 'Orbit', icon: Orbit, title: 'Orbit freely around the tank' },
  { id: 'follow', label: 'Follow', icon: ScanEye, title: 'Follow an animal' },
  { id: 'close', label: 'Close', icon: Focus, title: 'Close-up' },
];

export function setCameraMode(mode: CameraMode) {
  const ui = useUI.getState();
  const patch: Parameters<typeof ui.set>[0] = { cameraMode: mode };
  if (mode === 'follow' && !ui.followCreatureId) {
    const g = useGame.getState().game;
    const id = ui.selectedCreatureId ?? (g && ui.focusedTankId ? safe('creaturesInTank', () => creaturesInTank(g, ui.focusedTankId!), [])[0]?.id : undefined);
    if (id) patch.followCreatureId = id;
  }
  sfx('camera', { volume: 0.4 });
  ui.set(patch);
  tutorialFlag('camera_mode');
  tutorialFlag('camera_moved');
}

/** Phones: one tool that cycles the camera mode (the chip row is hidden there to keep the tank clear). */
function CameraCycleTool() {
  const mode = useUI((s) => s.cameraMode);
  const idx = Math.max(0, CAMERA_MODES.findIndex((m) => m.id === mode));
  const cur = CAMERA_MODES[idx];
  const next = CAMERA_MODES[(idx + 1) % CAMERA_MODES.length];
  return (
    <div className="ag-popanchor ag-tool-wrap ag-tool-wrap--mobile">
      <button type="button" className="ag-tool" data-testid="tool-camera" aria-label={`Camera: ${cur.label}. Switch to ${next.label}`} onClick={() => setCameraMode(next.id)}>
        <span className="ag-tool__icon">
          <cur.icon size={19} aria-hidden />
        </span>
        <span className="ag-tool__label">{cur.label}</span>
      </button>
    </div>
  );
}

export function CameraChips() {
  const mode = useUI((s) => s.cameraMode);
  return (
    <div className="ag-hudpill ag-camchips" role="radiogroup" aria-label="Camera" data-tutorial-id="camera-modes">
      {CAMERA_MODES.map((m) => {
        const I = m.icon;
        return (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} title={m.title} className="ag-camchip" data-testid={`camera-${m.id}`} onClick={() => setCameraMode(m.id)}>
            <I size={15} aria-hidden />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────── active tool hint ─────────────

export function ToolHint() {
  const tool = useUI((s) => s.tool);
  const foodId = useUI((s) => s.feedFoodId);
  const count = useGame((s) => (s.game && foodId ? Math.floor(s.game.inventory.foods[foodId] ?? 0) : 0));
  const residents = useGame((s) => {
    const t = focusedTank(s.game);
    if (!t || !s.game) return '';
    return safe('creaturesInTank', () => creaturesInTank(s.game!, t.id), [])
      .map((c) => safe('species', () => getSpecies(c.speciesId).feedingStyle, ''))
      .join(',');
  });
  const placing = useUI((s) => (s.placingDecorDefId ? safe('decorDef', () => getDecorDef(s.placingDecorDefId!) ?? null, null) : null));
  const decorName = placing?.name ?? '';
  const placingFrag = useUI((s) => !!s.placingFragId);
  // R05-03 / R11-04 — a paid decor placement ends the tool (one piece per purchase); offer the same piece again
  const again = usePlaceAgain();
  const againDef = useUI((s) =>
    again.defId && s.tool === 'none' && s.view === 'tank' && s.focusedTankId === again.tankId ? safe('decorDef', () => getDecorDef(again.defId!) ?? null, null) : null,
  );
  const canBuyAgain = useGame((s) => !!againDef && (s.game?.finance.money ?? 0) >= againDef.price);
  useEffect(() => {
    if (tool !== 'none') clearPlaceAgain();
  }, [tool]);
  useEffect(() => {
    if (!again.defId) return;
    const t = window.setTimeout(clearPlaceAgain, PLACE_AGAIN_MS);
    return () => window.clearTimeout(t);
  }, [again.defId, again.tankId]);
  // lane:qa-play — the animal whose card is open, in the tank on screen (Target feed "Offer to …" shortcut)
  const offerTo = useGame((s) => {
    const id = useUI.getState().selectedCreatureId;
    const c = id ? s.game?.creatures[id] : null;
    return c && c.tankId === useUI.getState().focusedTankId && (c.status === 'alive' || c.status === 'listed') ? c : null;
  });
  useUI((s) => s.selectedCreatureId); // re-render when the selection changes
  const panelTarget = useUI((s) => s.panelTarget);
  const fine = useMedia('(hover: hover) and (pointer: fine)');
  const Click = fine ? 'Click' : 'Tap';
  let text: ReactNode = null;
  const outOf = (verb: string) =>
    count > 0 || !foodId ? null : (
      <>
        Out of <strong>{foodName(foodId)}</strong> — buy more to keep {verb}.
      </>
    );
  if (tool === 'feed') text = foodId ? outOf('feeding') ?? <>{Click} the water to drop <strong>{foodName(foodId)}</strong> · {count} left</> : 'Choose a food first.';
  else if (tool === 'target_feed') text = foodId ? outOf('target feeding') ?? <>{Click} an animal to offer <strong>{foodName(foodId)}</strong> · {count} left</> : 'Choose a food first.';
  else if (tool === 'tap') text = <>{Click} the glass to get attention. Bold animals come to look, shy ones hide — repeated taps stress them{residents.includes('target_fed') ? ', especially slow swimmers' : ''}.</>;
  else if (tool === 'decor_place') {
    const what = decorName ? <strong>{decorName}</strong> : 'it';
    const floating = !!placing && safe('isFloating', () => isFloating(placing), false);
    const epiphyte = !!placing && safe('isEpiphyte', () => isEpiphyte(placing), false);
    // one piece per click; Shift+click keeps a purchase armed (DecorEditor), touch gets "Place another" afterwards
    const keys = fine ? (placingFrag ? ' · R rotates' : ' · R rotates · Shift+click places more') : '';
    text = floating ? (
      <>{Click} in the tank where {what} should float — it rests on the water surface{keys}</>
    ) : epiphyte ? (
      <>{Click} a rock, wood or the floor to attach {what}{keys}</>
    ) : (
      <>{Click} the tank floor to place {what}{keys}</>
    );
  }
  else if (againDef) text = <><strong>{againDef.name}</strong> placed{fine ? ' · Shift+click places several in a row' : ''}</>;
  else if (tool === 'decor_move') text = <>Drag a piece to move it{fine ? ' · R rotates while held' : ''}</>;
  // touch previews on the first tap and buys on the second (PlacementGhost resolveFloorTap); a mouse click places
  else if (tool === 'tank_place') {
    const moving = panelTarget?.startsWith('move:'); // PlacementGhost: tank_place + 'move:<id>'
    text = fine
      ? <>Click a free spot on the floor to {moving ? 'move the tank there' : 'place your new tank'} · R rotates</>
      : <>Tap a spot to preview {moving ? 'the tank there' : 'your new tank'}, then tap it again (or {moving ? 'Move here' : 'Place here'}) to {moving ? 'move it' : 'buy it'}</>;
  }
  return (
    <AnimatePresence>
      {text && (
        <motion.div className="ag-toolhint" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
          <span className="ag-grow">{text}</span>
          {tool === 'target_feed' && foodId && count > 0 && offerTo && (
            <button type="button" className="ag-toolhint__done ag-toolhint__offer" data-testid="toolhint-offer" onClick={() => targetFeedNow(foodId, offerTo.id)}>
              <Crosshair size={14} aria-hidden /> Offer to {offerTo.name}
            </button>
          )}
          {(tool === 'feed' || tool === 'target_feed') && foodId && count <= 0 && (
            <button type="button" className="ag-toolhint__done ag-toolhint__buy" data-testid="toolhint-buy" onClick={() => buyFoodPack(foodId)}>
              <ShoppingCart size={14} aria-hidden /> Buy a pack · {formatMoney(getFoodDef(foodId)?.price ?? 0)}
            </button>
          )}
          {againDef && (
            <button type="button" className="ag-toolhint__done ag-toolhint__offer" data-testid="toolhint-place-another" disabled={!canBuyAgain} style={canBuyAgain ? undefined : { opacity: 0.55, cursor: 'not-allowed' }} title={canBuyAgain ? undefined : `Not enough money — ${againDef.name} costs ${formatMoney(againDef.price)}.`} onClick={() => { sfx('click'); placeAnother(); }}>
              <Plus size={14} aria-hidden /> Place another · {formatMoney(againDef.price)}
            </button>
          )}
          <button type="button" className="ag-toolhint__done" onClick={() => { sfx('close'); if (againDef) clearPlaceAgain(); else selectTool('none'); }}>
            <X size={14} aria-hidden /> {tool === 'decor_place' || tool === 'tank_place' ? 'Cancel' : 'Done'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
