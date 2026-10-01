/**
 * Player actions on creatures. OWNER: lane "lifecycle". Signatures are contracts (UI calls them through `mutate`).
 */
import type { GameState } from '@/types';
import type { ActionResult } from '../care';
import { findSpecies } from '@/data/species';
import { environmentGate } from '../compat';
import { emitEvent } from '../context';
import { applyAgeing, lifeMeta, pushHistory, throttle } from './step';
import { tapSensitivityMul } from './personality';
import { ageDaysOf, gallonsNeededNow } from './growth';
import { livingIn, tankGallons } from './welfare';
import { touchResidents } from '../residents'; // lane:perf2

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? (v < lo ? lo : v > hi ? hi : v) : lo);

export function renameCreature(state: GameState, creatureId: string, name: string): ActionResult {
  const c = state.creatures[creatureId];
  if (!c) return { ok: false, message: 'That animal is no longer in your care.' }; // lane:guide — was 'Not found'
  // eslint-disable-next-line no-control-regex
  const clean = String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!clean) return { ok: false, message: 'Please enter a name.' };
  if (clean === c.name) return { ok: true, message: `Still ${c.name}` };
  const old = c.name;
  c.name = clean;
  pushHistory(c, { hour: state.clock.hour, kind: 'named', text: old ? `Renamed from ${old} to ${clean}.` : `Named ${clean}.` });
  return { ok: true, message: `Renamed to ${c.name}` };
}

/** Move a creature to another tank (UI shows compat preview first). Environment mismatches are hard-blocked. */
export function moveCreature(state: GameState, creatureId: string, tankId: string): ActionResult {
  const c = state.creatures[creatureId];
  if (!c) return { ok: false, message: 'That animal is no longer in your care.' }; // lane:guide — was 'Not found'
  if (c.status === 'dead' || c.status === 'sold') return { ok: false, message: `${c.name} can't be moved.` };
  const tank = state.tanks[tankId];
  if (!tank) return { ok: false, message: 'That tank no longer exists.' };
  if (c.tankId === tankId) return { ok: true, message: `${c.name} is already in ${tank.name}.` };
  const sp = findSpecies(c.speciesId);
  if (!sp) return { ok: false, message: 'Unknown species.' };
  let gate: { ok: boolean; reason?: string } = { ok: sp.environment === tank.environment };
  try {
    gate = environmentGate(sp, tank);
  } catch {
    /* compat lane mid-edit: fall back to the plain environment check above */
  }
  if (!gate.ok) {
    return { ok: false, message: gate.reason ?? `${c.name} is a ${sp.environment} animal and can't live in a ${tank.environment} tank.` };
  }
  const from = c.tankId ? state.tanks[c.tankId]?.name ?? 'another tank' : 'holding';
  const hour = state.clock.hour;
  c.tankId = tankId;
  touchResidents(); // lane:perf2 — a move-in: drop the step's residents index
  // Transfer stress: netting and new surroundings (shy animals take it harder; never zero).
  const mul = clamp(tapSensitivityMul(c.personality), 0.5, 1.8);
  c.stats.stress = clamp(c.stats.stress + 16 * mul, 0, 100);
  const m = lifeMeta(c);
  m.settledSinceHour = hour;
  m.targetFedUntil = undefined;
  pushHistory(c, { hour, kind: 'moved', text: `Moved from ${from} to ${tank.name}.` });
  const need = gallonsNeededNow(sp, sp.adultSizeCm);
  const small = tankGallons(tank) < need;
  return {
    ok: true,
    message: `Moved ${c.name} to ${tank.name}.${small ? ` Heads up: an adult ${sp.commonName.toLowerCase()} needs at least ${sp.recommendedMinTankGallons} gallons.` : ' Give it a little while to settle in.'}`,
  };
}

/**
 * Register a glass tap from the player. Taps are never rewarded: timid animals startle and stress, bold/curious
 * ones merely tolerate it, and repeated taps escalate. Emits a gentle "give them a moment" tip when overdone.
 */
export function registerGlassTap(state: GameState, tankId: string, intensity: number): void {
  const t = state.tanks[tankId];
  if (!t) return;
  const k = clamp(Number.isFinite(intensity) ? intensity : 1, 0, 5);
  t.tapPressure = Math.min(10, (t.tapPressure || 0) + k);
  for (const c of livingIn(state, tankId)) {
    const m = lifeMeta(c);
    const sens = m.tapSensitivity ?? 0;
    c.stats.stress = clamp(c.stats.stress + k * 4 * tapSensitivityMul(c.personality) * (1 + sens * 0.35), 0, 100);
    m.tapSensitivity = Math.min(10, sens + k);
  }
  if (t.tapPressure >= 4) {
    const hour = state.clock.hour;
    const text = 'Easy on the glass — the animals are getting stressed. Give them a moment to settle.';
    const recent = state.log.some((e) => e.tankId === tankId && e.text === text && hour - e.hour < 2 && hour >= e.hour);
    if (!recent) emitEvent(state, { kind: 'tip', text, tankId, toast: true });
  }
}

export function toggleFavorite(state: GameState, creatureId: string): void {
  const c = state.creatures[creatureId];
  if (c) c.favorite = !c.favorite;
}

const INTERACTION = {
  observe: { enrich: 2, bond: 0.4 },
  follow: { enrich: 4, bond: 0.8 },
  photo: { enrich: 5, bond: 1.5 },
  target_fed: { enrich: 7, bond: 2.5 },
} as const;

function bondMilestone(name: string, level: number, invert: boolean): string {
  if (level >= 100) return `${name} and you share a real bond.`;
  if (level >= 75) return `${name} is completely at ease with you.`;
  if (level >= 50) return invert ? `${name} carries on calmly whenever you're near.` : `${name} now recognises you and comes over when you're near.`;
  return `${name} is getting used to you.`;
}

/** Record that the player observed/photographed/interacted with a creature (bond + quests). */
export function noteInteraction(state: GameState, creatureId: string, kind: 'observe' | 'photo' | 'follow' | 'target_fed'): void {
  const c = state.creatures[creatureId];
  if (!c || c.status === 'dead' || c.status === 'sold') return;
  const cfg = INTERACTION[kind] ?? INTERACTION.observe;
  const m = lifeMeta(c);
  const hour = state.clock.hour;
  const recent = m.interactions ?? 0;
  const dim = 1 / (1 + recent * 0.35); // diminishing returns for spamming
  c.stats.enrichment = clamp(c.stats.enrichment + cfg.enrich * dim, 0, 100);
  m.interactions = Math.min(20, recent + 1);
  const before = m.bond ?? 0;
  m.bond = clamp(before + cfg.bond * dim, 0, 100);
  if (kind === 'target_fed') m.targetFedUntil = hour + 0.75;
  if (kind === 'photo' && throttle(c, 'photo', hour, 6)) pushHistory(c, { hour, kind: 'photo', text: 'Posed for a photo.' });
  const sp = findSpecies(c.speciesId);
  const invert = sp?.category === 'invertebrate' || sp?.category === 'coral' || sp?.category === 'anemone';
  for (const level of [25, 50, 75, 100]) {
    if (before < level && m.bond >= level) {
      const text = bondMilestone(c.name, level, invert);
      pushHistory(c, { hour, kind: 'milestone', text });
      if (level >= 50) emitEvent(state, { kind: 'celebrate', text, tankId: c.tankId ?? undefined, creatureId: c.id });
    }
  }
}

/** Facility lane: a visitor was wowed by this creature. Milestones go into its history. */
export function noteVisitorWow(state: GameState, creatureId: string, count = 1): void {
  const c = state.creatures[creatureId];
  if (!c || c.status === 'dead' || c.status === 'sold') return;
  const before = c.visitorWows ?? 0;
  c.visitorWows = before + Math.max(0, Math.floor(count));
  c.stats.enrichment = clamp(c.stats.enrichment + 0.5, 0, 100);
  for (const level of [1, 10, 50, 100, 500, 1000]) {
    if (before < level && c.visitorWows >= level) {
      const text = level === 1 ? `${c.name} wowed a visitor for the first time!` : `${c.name} has now wowed ${level} visitors.`;
      pushHistory(c, { hour: state.clock.hour, kind: 'visitor_wow', text });
    }
  }
}

/** DEV: age a creature by N game-days (growth/life stage/sex reveal recomputed). */
export function devAgeCreature(state: GameState, creatureId: string, days: number): ActionResult {
  const c = state.creatures[creatureId];
  if (!c) return { ok: false, message: 'That animal is no longer in your care.' }; // lane:guide — was 'Not found'
  if (!Number.isFinite(days) || days <= 0) return { ok: false, message: 'Days must be positive' };
  const sp = findSpecies(c.speciesId);
  c.bornHour -= days * 24;
  if (sp) applyAgeing(state, c, sp, state.clock.hour, (e) => emitEvent(state, e), { snapSize: true });
  const age = ageDaysOf(c, state.clock.hour);
  return { ok: true, message: `Aged ${days === 1 ? '1 day' : `${days} days`} — ${c.name} is now ${Math.floor(age) === 1 ? '1 day' : `${Math.floor(age)} days`} old (${c.lifeStage}).` }; // lane:w2-ui
}

export { startBreeding, separateCreature, moveClutch, devForceBreeding } from './breeding/actions';
