/**
 * Valuation: individual creatures, whole aquariums, listing bundles and quick-sale quotes.
 * OWNER: lane "market". An original model: every factor is a readable multiplier so the UI can explain prices.
 *
 * Market value is a game valuation of what NPC buyers will pay. It is never a statement about an animal's worth.
 */
import type { GameState, Creature, ValueBreakdown, ValueFactor, TankValuation, Tank, CompatVerdict, SpeciesDefinition, ListingKind, PersonalityTag } from '@/types';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getDecorDef } from '@/data/catalog/decor';
import { getSubstrateDef } from '@/data/catalog/substrates';
import { resolvePhenotype, potentialBand } from '../life';
import { creaturesInTank } from '../life';
import { PERSONALITY_INFO } from '../life/personality'; // lane:qa-play
import { LOCAL_FISH_STORE } from '@/data/buyers';
import type { DecorInstance } from '@/types'; // lane:frags
import { propagationFor } from '@/data/catalog/propagation'; // lane:frags
import { showValueFactors } from '../shows/titles'; // lane:shows
import { clamp, clamp01, finite, roundCents, normSeverity, exhibitPopularity, RARITY_SCORE, DIFFICULTY_INDEX, DIFFICULTY_LABEL, difficultyIndex, speciesPlural, nicePrice } from './util';

const NEUTRAL_EPS = 0.01;

function pushFactor(out: ValueFactor[], label: string, mult: number, note?: string): number {
  const m = finite(mult, 1);
  if (Math.abs(m - 1) >= NEUTRAL_EPS) out.push({ label, mult: Math.round(m * 1000) / 1000, note });
  return m;
}

// ───────────────────────────── morph rarity ─────────────────────────────

/** Pure cache: phenotype rarity depends only on the (immutable) genome + morph name of an individual. */
const RARITY_CACHE = new Map<string, number>();
const RARITY_CACHE_MAX = 6000;

/** 0..~1.25 phenotype rarity for this individual (genetics lane rarity, falling back to morph-name matching). */
export function morphRarity(sp: SpeciesDefinition | undefined, c: Creature): number {
  if (!sp) return 0;
  const alleles = c.genome?.alleles ?? {};
  let sig = '';
  for (const k in alleles) sig += `${k}${alleles[k][0]}${alleles[k][1]}`;
  const key = `${sp.id}|${c.morphName}|${sig}`;
  const hit = RARITY_CACHE.get(key);
  if (hit !== undefined) return hit;
  const r = computeMorphRarity(sp, c);
  if (RARITY_CACHE.size >= RARITY_CACHE_MAX) RARITY_CACHE.clear();
  RARITY_CACHE.set(key, r);
  return r;
}

function computeMorphRarity(sp: SpeciesDefinition, c: Creature): number {
  let r1 = 0;
  try {
    r1 = finite(resolvePhenotype(sp, c.genome, c.appearance?.patternSeed ?? 0).rarity);
  } catch {
    r1 = 0;
  }
  let r2 = 0;
  const morph = (c.morphName ?? '').toLowerCase();
  if (morph) {
    for (const p of sp.genetics?.phenotypes ?? []) {
      if (p.rarity > 0 && p.name && morph.includes(p.name.toLowerCase())) r2 += p.rarity;
    }
  }
  return clamp(Math.max(r1, r2), 0, 1.25);
}

// ───────────────────────────── creature value ─────────────────────────────

function lifeStageFactor(sp: SpeciesDefinition, c: Creature, nowHour: number): { mult: number; label: string; note: string } {
  const lc = sp.lifecycle;
  const age = Math.max(0, (nowHour - c.bornHour) / 24);
  switch (c.lifeStage) {
    case 'egg':
      return { mult: 0.05, label: 'Life stage: egg', note: 'Unhatched — buyers pay for potential only' };
    case 'larva':
      return { mult: 0.12, label: 'Life stage: larva', note: 'Delicate and still developing' };
    case 'fry':
      return { mult: 0.22, label: 'Life stage: fry', note: 'Young fry — value grows quickly as it matures' };
    case 'juvenile': {
      const t = clamp01(age / Math.max(1, lc.juvenileDays));
      return { mult: 0.42 + 0.4 * t, label: 'Life stage: juvenile', note: 'Still growing — value rises as it matures' };
    }
    case 'elder': {
      const elderStart = lc.juvenileDays + lc.adultDays;
      const t = clamp01((age - elderStart) / Math.max(1, lc.lifespanDays - elderStart));
      return { mult: 0.62 - 0.22 * t, label: 'Life stage: elder', note: 'Calm and settled, with fewer breeding years ahead' };
    }
    case 'adult':
    default: {
      const primeEnd = lc.juvenileDays + lc.adultDays;
      if (age <= primeEnd) return { mult: 1, label: 'Prime adult', note: 'In its prime' };
      const t = clamp01((age - primeEnd) / Math.max(1, lc.lifespanDays * 0.8 - primeEnd));
      return { mult: 1 - 0.15 * t, label: 'Mature adult', note: 'Past its prime breeding window' };
    }
  }
}

const PERSONALITY_APPEAL: Partial<Record<PersonalityTag, number>> = {
  showoff: 0.08,
  glass_curious: 0.05,
  bold: 0.04,
  nest_builder: 0.03,
  explorer: 0.02,
  social: 0.02,
  decor_inspector: 0.01,
  food_obsessed: 0.01,
  night_owl: -0.02,
  shy: -0.03,
  easily_startled: -0.04,
};

/** Market value of one creature with a human-readable breakdown. */
export function creatureValue(state: GameState, c: Creature): ValueBreakdown {
  const sp = findSpecies(c.speciesId);
  const base = Math.max(0.5, finite(sp?.baseValue ?? 10, 10));
  const factors: ValueFactor[] = [];
  if (!c || c.status === 'dead') return { total: 0, base, factors: [{ label: 'Deceased', mult: 0 }] };
  if (!sp) return { total: roundCents(base), base, factors };
  const nowHour = state.clock.hour;
  let m = 1;

  // 1. Life stage / age curve (juvenile < prime adult > elder).
  const ls = lifeStageFactor(sp, c, nowHour);
  m *= pushFactor(factors, ls.label, ls.mult, ls.note);

  // 2. Health & condition.
  const health = clamp(finite(c.stats?.health, 100), 0, 100);
  let hm = 0.3 + 0.7 * Math.pow(health / 100, 1.4);
  let hNote = health >= 90 ? 'Healthy and settled' : health >= 65 ? 'In fair condition' : 'In poor condition — buyers discount heavily';
  if (c.illness) {
    const sev = normSeverity(c.illness.severity);
    hm *= 1 - 0.45 * Math.max(0.2, sev);
    hNote = `Currently ill (${c.illness.kind.replace(/_/g, ' ')}) — most buyers wait for recovery`;
  }
  const stress = clamp(finite(c.stats?.stress, 0), 0, 100);
  if (stress > 60) hm *= 1 - (stress - 60) / 400;
  m *= pushFactor(factors, 'Health & condition', hm, hNote);

  // 3. Captive-bred status.
  if (c.captiveBred) m *= pushFactor(factors, 'Captive-bred', 1.05, 'Adapted to aquarium life and foods');
  else if (sp.captiveBredAvailable) m *= pushFactor(factors, 'Wild-collected', 0.9, 'Captive-bred stock of this species is preferred');

  // 4. Phenotype rarity (morph).
  const r = morphRarity(sp, c);
  if (r > 0.06) {
    const note = r >= 0.45 ? 'A rare colour line — collectors compete for these' : r >= 0.25 ? 'An uncommon variety' : 'A popular variety';
    m *= pushFactor(factors, `Morph: ${c.morphName}`, 1 + 1.6 * r, note);
  }

  // 5. Potentials (colour, pattern, form, size) — show qualities.
  const p = c.genome?.potentials;
  if (p) {
    const q = 0.3 * finite(p.color, 50) + 0.25 * finite(p.pattern, 50) + 0.3 * finite(p.structure, 50) + 0.15 * finite(p.size, 50);
    let pm = 0.8 + 0.4 * Math.pow(clamp01(q / 100), 1.1);
    const notable: string[] = [];
    const bands: [string, number][] = [
      ['colour', p.color],
      ['pattern', p.pattern],
      ['form', p.structure],
      ['size', p.size],
    ];
    for (const [label, v] of bands) {
      if (v >= 90) pm += 0.06;
      if (v >= 75) notable.push(`${potentialBand(v)} ${label}`);
    }
    m *= pushFactor(factors, 'Show qualities', pm, notable.length ? notable.join(' · ') : q < 40 ? 'Ordinary colour and form' : 'Typical colour and form');
  }

  // 6. Lineage: generation depth, proven breeder, established rare line.
  const gen = Math.max(0, Math.floor(finite(c.lineage?.generation, 0)));
  const raised = Math.max(0, finite(c.repro?.totalOffspringRaised, 0));
  let lm = 1;
  const lNotes: string[] = [];
  if (gen >= 1) {
    lm += Math.min(0.2, 0.05 * gen);
    lNotes.push(`F${gen} line by ${c.lineage.breederName}`);
  }
  if (raised > 0) {
    lm += 0.08 + Math.min(0.12, raised * 0.004);
    lNotes.push(`proven breeder (${raised} raised)`);
  }
  if (gen >= 2 && r >= 0.25) {
    lm += 0.08;
    lNotes.push(`established ${c.morphName} line`);
  }
  m *= pushFactor(factors, 'Lineage', lm, lNotes.join(' · ') || undefined);

  // 7. Personality appeal.
  let pa = 1;
  const appealing: string[] = [];
  const reserved: string[] = [];
  for (const t of c.personality ?? []) {
    const d = PERSONALITY_APPEAL[t] ?? 0;
    pa += d;
    // lane:qa-play — readable labels ("show-off", not the raw tag "showoff")
    const word = (PERSONALITY_INFO[t]?.label ?? t.replace(/_/g, ' ')).toLowerCase();
    if (d > 0) appealing.push(word);
    else if (d < 0) reserved.push(word);
  }
  pa = clamp(pa, 0.9, 1.15);
  const pNote =
    !appealing.length && !reserved.length
      ? undefined
      : pa >= 1
        ? `${appealing.join(', ')} — presents well to buyers`
        : `${reserved.join(', ')} — shows less in a sales tank${appealing.length ? ` (though ${appealing.join(', ')})` : ''}`;
  m *= pushFactor(factors, 'Personality appeal', pa, pNote);

  // 8. Visitor favourite.
  if ((c.visitorWows ?? 0) > 0) m *= pushFactor(factors, 'Visitor favourite', 1 + Math.min(0.1, c.visitorWows * 0.005), `${c.visitorWows} visitor "wow" moments`);

  // 8b. lane:shows — show titles / wins, and the offspring of champions (lineage prestige).
  for (const f of showValueFactors(state, c)) m *= pushFactor(factors, f.label, f.mult, f.note);

  // 9. Market demand.
  const demand = clamp(finite(state.market?.demand?.[c.speciesId] ?? 1, 1), 0.5, 1.8);
  m *= pushFactor(factors, 'Market demand', demand, demand >= 1.15 ? 'In demand right now' : demand <= 0.85 ? 'Soft market for this species' : 'Steady demand');

  const total = Math.max(0.5, roundCents(base * m));
  return { total, base, factors };
}

// ───────────────────────────── descriptive helpers ─────────────────────────────

export function careDifficultyLabel(state: GameState, creatures: Creature[], tank?: Tank): string {
  let idx = 0;
  for (const c of creatures) idx = Math.max(idx, difficultyIndex(findSpecies(c.speciesId)));
  if (tank) {
    if (tank.waterClass === 'reef') idx = Math.max(idx, 2);
    else if (tank.environment === 'marine') idx = Math.max(idx, 1);
  }
  const key = (Object.keys(DIFFICULTY_INDEX) as (keyof typeof DIFFICULTY_INDEX)[]).find((k) => DIFFICULTY_INDEX[k] === idx) ?? 'intermediate';
  return DIFFICULTY_LABEL[key];
}

export function lineageSummary(state: GameState, creatures: Creature[]): string {
  if (creatures.length === 0) return 'No livestock included';
  if (creatures.length === 1) {
    const c = creatures[0];
    const parts: string[] = [c.captiveBred ? 'Captive-bred' : 'Wild-collected'];
    const gen = c.lineage?.generation ?? 0;
    const src = c.lineage?.breederName;
    // (shop animals carry a generic "Captive-bred stock" breeder — don't repeat it after "Captive-bred")
    parts.push(gen >= 1 ? `F${gen} · bred by ${c.lineage.breederName}` : src && !/captive-bred|market stock/i.test(src) ? `from ${src}` : 'shop stock');
    const mother = c.lineage?.motherId ? state.creatures[c.lineage.motherId] : undefined;
    const father = c.lineage?.fatherId ? state.creatures[c.lineage.fatherId] : undefined;
    if (mother || father) parts.push(`parents: ${mother?.name ?? '?'} × ${father?.name ?? '?'}`);
    if ((c.repro?.totalOffspringRaised ?? 0) > 0) parts.push(`proven breeder (${c.repro.totalOffspringRaised} raised)`);
    return parts.join(' · ');
  }
  const bred = creatures.filter((c) => (c.lineage?.generation ?? 0) >= 1).length;
  const proven = creatures.filter((c) => (c.repro?.totalOffspringRaised ?? 0) > 0).length;
  const cb = creatures.filter((c) => c.captiveBred).length;
  const maxGen = creatures.reduce((a, c) => Math.max(a, c.lineage?.generation ?? 0), 0);
  const parts: string[] = [];
  parts.push(cb === creatures.length ? 'All captive-bred' : `${cb}/${creatures.length} captive-bred`);
  if (bred > 0) parts.push(`${bred} from documented lines (up to F${maxGen})`);
  if (proven > 0) parts.push(`${proven} proven breeder${proven === 1 ? '' : 's'}`);
  if (bred === 0 && proven === 0) parts.push('market stock');
  return parts.join(' · ');
}

/** Species mix summary: "2 axolotls (Golden Albino, Leucistic), 8 neon tetras". */
export function livestockSummary(creatures: Creature[]): string {
  if (creatures.length === 0) return 'no livestock';
  const by = new Map<string, Creature[]>();
  for (const c of creatures) {
    const arr = by.get(c.speciesId) ?? [];
    arr.push(c);
    by.set(c.speciesId, arr);
  }
  const parts: string[] = [];
  for (const [sid, arr] of by) {
    const morphs = [...new Set(arr.map((c) => c.morphName).filter((m) => m && !/^wild type$/i.test(m)))].slice(0, 3);
    const name = arr.length === 1 ? (findSpecies(sid)?.commonName ?? sid).toLowerCase() : speciesPlural(sid);
    parts.push(`${arr.length} ${name}${morphs.length ? ` (${morphs.join(', ')})` : ''}`);
  }
  return parts.join(', ');
}

// ───────────────────────────── tank valuation ─────────────────────────────

const COMPAT_MULT: Record<CompatVerdict, number> = {
  excellent: 1.08,
  usually_compatible: 1.03,
  conditional: 0.94,
  high_risk: 0.8,
  incompatible: 0.62,
};
const COMPAT_LABEL: Record<CompatVerdict, string> = {
  excellent: 'Excellent',
  usually_compatible: 'Usually compatible',
  conditional: 'Conditional',
  high_risk: 'High risk',
  incompatible: 'Incompatible',
};
export const compatRank = (v: CompatVerdict | undefined): number => (v ? ['excellent', 'usually_compatible', 'conditional', 'high_risk', 'incompatible'].indexOf(v) : 0);

function isLivingDecor(category: string): boolean {
  return category === 'plant' || category === 'coral' || category === 'anemone';
}

/** Fingerprint of equipment + decor (+ substrate/backdrop) for change detection after listing. */
export function tankSignature(tank: Tank): string {
  const eq = tank.equipment.map((e) => `${e.defId}:${e.id}`).sort().join(',');
  const dec = tank.decor.map((d) => `${d.defId}:${d.id}`).sort().join(',');
  return `${tank.tierId}|${tank.waterClass}|${tank.substrate?.kind}|${tank.backdrop}|${eq}|${dec}`;
}

/** Expected/low/high sale value of a complete aquarium with parts and modifiers. */
export function tankValuation(state: GameState, tankId: string): TankValuation {
  const tank = state.tanks[tankId];
  if (!tank) return { expected: 0, low: 0, high: 0, parts: [], modifiers: [] };
  const nowHour = state.clock.hour;
  const tier = TANK_TIER_BY_ID[tank.tierId];
  const gallons = tier?.gallons ?? 20;
  const ageDays = Math.max(0, (nowHour - tank.createdHour) / 24);
  const parts: TankValuation['parts'] = [];

  // Tank + stand: used glass loses 20% immediately, then slowly depreciates to ~48% of new price.
  const tankPrice = tier?.price ?? 60;
  const tankPart = roundCents(tankPrice * 0.8 * Math.max(0.6, 1 - ageDays / 300));
  parts.push({ label: `Tank: ${tier?.name ?? tank.tierId}`, amount: tankPart, note: ageDays < 1 ? 'Nearly new' : `Used · ${Math.round(ageDays) === 1 ? '1 day' : `${Math.round(ageDays)} days`} in service` }); // lane:w2-ui: no "1 days"

  // Equipment: condition and age.
  let eqPart = 0;
  let eqCount = 0;
  let failed = 0;
  for (const e of tank.equipment) {
    const def = getEquipmentDef(e.defId);
    if (!def) continue;
    const ageD = Math.max(0, (nowHour - e.installedHour) / 24);
    const cond = clamp01(finite(e.condition, 1));
    let v = def.price * (0.35 + 0.45 * cond) * Math.max(0.5, 1 - ageD / 240);
    if (e.failed) {
      v *= 0.15;
      failed++;
    }
    eqPart += v;
    eqCount++;
  }
  if (eqCount > 0) parts.push({ label: `Equipment (${eqCount} item${eqCount === 1 ? '' : 's'})`, amount: roundCents(eqPart), note: failed ? `${failed} failed unit${failed === 1 ? '' : 's'}` : 'Valued by condition and age' });

  // Decor, plants and corals.
  let living = 0;
  let livingCount = 0;
  let hard = 0;
  let hardCount = 0;
  for (const d of tank.decor) {
    const def = getDecorDef(d.defId);
    if (!def) continue;
    if (isLivingDecor(def.category)) {
      const growth = clamp01(finite(d.growth ?? 0.5, 0.5));
      const health = clamp(finite(d.health ?? 100, 100), 0, 100) / 100;
      // lane:frags — a still-growing frag is worth its frag share, rising to a colony's value as it grows out
      const grow = d.frag && d.frag.grownHour === undefined ? fragInTankFactor(d) : 0.5 + 0.8 * growth;
      living += def.price * grow * health;
      livingCount++;
    } else {
      hard += def.price * 0.7 * clamp(finite(d.scale, 1), 0.5, 2);
      hardCount++;
    }
  }
  if (livingCount > 0) parts.push({ label: `Plants & corals (${livingCount})`, amount: roundCents(living), note: 'Grown-in, healthy growth is worth more than new frags' });
  if (hardCount > 0) parts.push({ label: `Hardscape & decor (${hardCount})`, amount: roundCents(hard) });

  const sub = getSubstrateDef(tank.substrate?.kind);
  if (sub && tank.substrate.kind !== 'bare') {
    const v = roundCents(sub.price * (gallons / 10) * 0.4);
    if (v > 0) parts.push({ label: `Substrate: ${sub.name}`, amount: v });
  }

  // Livestock.
  const creatures = creaturesInTank(state, tankId);
  let livestock = 0;
  for (const c of creatures) livestock += creatureValue(state, c).total;
  if (creatures.length > 0) parts.push({ label: `Livestock (${creatures.length} animal${creatures.length === 1 ? '' : 's'})`, amount: roundCents(livestock), note: livestockSummary(creatures) });

  const subtotal = parts.reduce((a, p) => a + p.amount, 0);
  const hardware = tankPart + eqPart;

  // Modifiers.
  const modifiers: ValueFactor[] = [];
  let m = 1;
  const cache = tank.cache;
  const welfare = clamp(finite(cache?.welfare, 100), 0, 100);
  const beauty = clamp(finite(cache?.beauty, 40), 0, 100);
  const stability = clamp(finite(cache?.stability, 70), 0, 100);
  const verdict: CompatVerdict = cache?.compatVerdict ?? 'excellent';
  // Water stability is about the water; animal welfare is priced separately (welfare factor above).
  const status = cache?.waterStatus ?? cache?.status ?? 'good';

  if (creatures.length > 0) {
    m *= pushFactor(modifiers, 'Animal welfare', 0.72 + 0.38 * Math.pow(welfare / 100, 1.2), welfare >= 85 ? 'Thriving, calm animals' : welfare >= 60 ? 'Mostly comfortable' : 'Stressed or unwell animals');
    const speciesCount = new Set(creatures.map((c) => c.speciesId)).size;
    if (creatures.length >= 2 || speciesCount >= 2 || verdict !== 'excellent') {
      m *= pushFactor(modifiers, `Compatibility: ${COMPAT_LABEL[verdict]}`, COMPAT_MULT[verdict], verdict === 'excellent' || verdict === 'usually_compatible' ? 'A stocking list buyers can trust' : 'Buyers price in the risk of losses');
    }
  }
  let sm = 0.88 + 0.16 * (stability / 100);
  if (status === 'danger') sm *= 0.88;
  else if (status === 'watch') sm *= 0.97;
  m *= pushFactor(modifiers, 'Water stability', sm, status === 'danger' ? 'Water quality needs urgent attention' : stability >= 80 ? 'Stable, well-buffered water' : 'Some swings in water quality');

  const bio = clamp01(finite(tank.water?.bioMaturity, 0));
  m *= pushFactor(modifiers, 'System maturity', 0.9 + 0.12 * bio + Math.min(0.04, ageDays / 250), bio >= 0.7 ? `Fully cycled · established ${Math.round(ageDays) === 1 ? '1 day' : `${Math.round(ageDays)} days`}` : bio >= 0.3 ? 'Still cycling' : 'Not yet cycled');

  m *= pushFactor(modifiers, 'Aquascape beauty', 0.72 + 0.85 * Math.pow(beauty / 100, 1.35), beauty >= 80 ? 'A striking, photogenic layout' : beauty >= 55 ? 'An attractive layout' : 'The layout needs work');

  // Rarity + lineage of livestock.
  if (creatures.length > 0) {
    let rs = 0;
    let lin = 0;
    for (const c of creatures) {
      const sp = findSpecies(c.speciesId);
      rs += Math.max(RARITY_SCORE[sp?.rarity ?? 'common'] ?? 0.1, morphRarity(sp, c) * 0.8);
      if ((c.lineage?.generation ?? 0) >= 1 || (c.repro?.totalOffspringRaised ?? 0) > 0) lin++;
    }
    rs /= creatures.length;
    if (rs > 0.12) m *= pushFactor(modifiers, 'Rare livestock', 1 + 0.25 * clamp01(rs), 'Uncommon species or colour lines');
    if (lin > 0) m *= pushFactor(modifiers, 'Documented lines', 1 + 0.12 * (lin / creatures.length), `${lin} animal${lin === 1 ? '' : 's'} with breeding records`);
  }

  const pop = exhibitPopularity(state, tankId);
  if (pop > 0.02) m *= pushFactor(modifiers, 'Proven visitor appeal', 1 + 0.4 * pop, 'A crowd favourite in your gallery');
  else if (pop < -0.05) m *= pushFactor(modifiers, 'Visitor appeal', 1 + 0.2 * pop, 'Visitors tend to walk past this one');

  // Maintenance burden.
  let burden = 0;
  if (creatures.length > 0) burden += (creatures.reduce((a, c) => a + difficultyIndex(findSpecies(c.speciesId)), 0) / creatures.length / 3) * 0.5;
  burden += clamp01(finite(cache?.stockingLoad, 0) - 0.9) * 0.6;
  if (tank.waterClass === 'reef') burden += 0.15;
  burden = clamp01(burden);
  if (burden > 0.08) m *= pushFactor(modifiers, 'Maintenance burden', 1 - 0.15 * burden, burden >= 0.5 ? 'Demanding to keep — fewer buyers can take it on' : 'Some ongoing care demands');

  // Coherent, ethical display bonus: beauty + welfare + compatibility together.
  if (beauty >= 70 && (creatures.length === 0 || (welfare >= 80 && compatRank(verdict) <= 1)) && status !== 'danger') {
    m *= pushFactor(modifiers, 'Coherent, ethical display', 1.1, 'Beautiful, healthy and thoughtfully stocked');
  }

  m = clamp(m, 0.3, 2.6);
  const expected = Math.max(roundCents(hardware * 0.3), roundCents(subtotal * m));
  const rareShare = modifiers.find((f) => f.label === 'Rare livestock') ? 0.06 : 0;
  const u = 0.12 + 0.1 * (1 - stability / 100) + rareShare;
  return {
    expected: nicePrice(expected),
    low: nicePrice(expected * (1 - u)),
    high: nicePrice(expected * (1 + u + 0.05)),
    parts,
    modifiers,
  };
}

// ───────────────────────────── bundles ─────────────────────────────

export interface BundleValue {
  expected: number;
  low: number;
  high: number;
  factors: ValueFactor[];
}

/** Value of a set of creatures sold together (single, pair, group, juveniles). */
export function bundleValue(state: GameState, kind: ListingKind, creatures: Creature[]): BundleValue {
  const factors: ValueFactor[] = [];
  let sum = 0;
  for (const c of creatures) sum += creatureValue(state, c).total;
  let m = 1;
  if (kind === 'pair' && creatures.length === 2) {
    const adults = creatures.every((c) => c.lifeStage === 'adult');
    m *= pushFactor(factors, 'Breeding pair', adults ? 1.15 : 1.06, adults ? 'A ready pair saves buyers months' : 'A young pair that will mature together');
  } else if (kind === 'group' && creatures.length >= 3) {
    const sp = findSpecies(creatures[0].speciesId);
    const min = sp?.social?.minGroup ?? 1;
    if (min >= 3 && creatures.length >= min) m *= pushFactor(factors, 'Proper group size', 1.06, 'Schooling and colony animals settle faster together');
  }
  const expected = sum * m;
  return { expected: nicePrice(expected), low: nicePrice(expected * 0.85), high: nicePrice(expected * 1.2), factors };
}

// ───────────────────────────── quick sale ─────────────────────────────

export interface QuickSellQuote {
  ok: boolean;
  message: string;
  total: number;
  perCreature: { id: string; name: string; value: number; offer: number }[];
}

/** What the local fish store pays right now: ~40–55% of value depending on condition. */
export function quickSellQuote(state: GameState, creatureIds: string[]): QuickSellQuote {
  const per: QuickSellQuote['perCreature'] = [];
  const seen = new Set<string>();
  for (const id of creatureIds) {
    if (seen.has(id)) return { ok: false, message: 'The same animal was selected twice.', total: 0, perCreature: [] };
    seen.add(id);
    const c = state.creatures[id];
    if (!c) return { ok: false, message: 'That animal could not be found.', total: 0, perCreature: [] };
    if (c.status === 'listed') return { ok: false, message: `${c.name} is listed on the marketplace — withdraw the listing first.`, total: 0, perCreature: [] };
    if (c.status !== 'alive') return { ok: false, message: `${c.name} is no longer in your care.`, total: 0, perCreature: [] };
    const v = creatureValue(state, c).total;
    const health = clamp(finite(c.stats?.health, 100), 0, 100) / 100;
    const rate = c.illness ? 0.4 : 0.4 + 0.15 * health;
    per.push({ id, name: c.name, value: v, offer: Math.max(1, Math.round(v * rate)) });
  }
  if (per.length === 0) return { ok: false, message: 'Choose at least one animal to sell.', total: 0, perCreature: [] };
  const total = per.reduce((a, p) => a + p.offer, 0);
  return { ok: true, message: `${LOCAL_FISH_STORE} will pay ${total > 0 ? `$${total}` : 'a token amount'} today.`, total, perCreature: per };
}

// ───────────────────────────── frags & cuttings (lane:frags) ─────────────────────────────

/** Game hours after planting before a frag counts as healed onto its plug (buyers pay more for established frags). */
export const FRAG_HEALED_HOURS = 24;
/** What the local fish store pays for frags/cuttings, as a share of fair value. */
export const FRAG_STORE_RATE = 0.45;

export interface FragValue {
  expected: number;
  low: number;
  high: number;
  /** Fresh-frag base before factors. */
  base: number;
  factors: ValueFactor[];
}

function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * Frag/cutting sales in the last 3 game days (market and local store). Hobby demand for frags is real but shallow:
 * every recent sale softens the next price a little, so a frag farm is a steady side income rather than a money tap.
 */
export function fragSupplyFactor(state: GameState): { mult: number; recent: number } {
  const now = finite(state.clock?.hour, 0);
  let recent = 0;
  for (const h of state.market?.history ?? []) if (h.kind === 'frag' && now - h.hour <= 72) recent++;
  for (const h of state.market?.fragSaleHours ?? []) if (now - h <= 72) recent++;
  return { mult: 1 / (1 + 0.06 * recent), recent };
}

/** Fair value of one frag/cutting: a share of the colony price × grow-out, healing, condition, provenance, market. */
export function fragValue(state: GameState, item: DecorInstance): FragValue {
  const factors: ValueFactor[] = [];
  const def = getDecorDef(item.defId);
  if (!def) return { expected: 0, low: 0, high: 0, base: 0, factors };
  const rule = propagationFor(def);
  const coral = def.category !== 'plant';
  const base = Math.max(0.5, def.price * rule.valueFraction);
  const start = rule.startGrowth;
  const g = clamp01(finite(item.growth, start));
  const grown = clamp01((g - start) / Math.max(0.05, 1 - start));
  let m = 1;
  if (grown > 0.02) m *= pushFactor(factors, coral ? 'Grown out' : 'Grown in', 1 + 1.6 * grown, `${Math.round(g * 100)}% of a full ${coral ? 'colony' : 'planting'}`);
  const planted = item.frag?.plantedHour;
  const healed = planted !== undefined && finite(state.clock?.hour, 0) - planted >= FRAG_HEALED_HOURS;
  if (coral) m *= pushFactor(factors, healed ? 'Healed on its plug' : 'Fresh cut', healed ? 1.2 : 0.95, healed ? 'Established and safe to ship' : 'Still healing, so buyers pay a little less');
  else if (healed) m *= pushFactor(factors, 'Rooted', 1.1, 'Already growing new roots');
  const health = clamp(finite(item.health, 90), 0, 100) / 100;
  m *= pushFactor(factors, 'Condition', 0.35 + 0.65 * Math.pow(health, 1.5), health >= 0.85 ? 'Healthy colour and tissue' : health >= 0.6 ? 'A little pale' : 'Stressed — it may not survive shipping');
  if ((item.frag?.generation ?? 1) >= 2) m *= pushFactor(factors, 'Grown in your system', 1.1, 'A second-generation frag with a local track record');
  // A gentle, deterministic weekly swing per item type (no RNG draw): some weeks hammers are hot, others not.
  const week = Math.floor(finite(state.clock?.hour, 0) / 72);
  const wave = 0.9 + (hashStr(`${def.id}|${week}`) % 1000) / 1000 * 0.22;
  m *= pushFactor(factors, wave >= 1 ? 'In demand this week' : 'Quiet week for these', wave);
  const supply = fragSupplyFactor(state);
  if (supply.recent > 0) m *= pushFactor(factors, 'Frags on the market', supply.mult, `${supply.recent} recent frag sale${supply.recent === 1 ? '' : 's'} have filled some buyers' tanks`);
  const expected = roundCents(base * clamp(m, 0.1, 6));
  return { expected, low: roundCents(expected * 0.85), high: roundCents(expected * 1.2), base: roundCents(base), factors };
}

/** Value of several frags/cuttings sold together (a single frag, a frag pack or a bundle of cuttings). */
export function fragBundleValue(state: GameState, items: DecorInstance[]): BundleValue {
  const factors: ValueFactor[] = [];
  let sum = 0;
  for (const it of items) sum += fragValue(state, it).expected;
  const kinds = new Set(items.map((i) => i.defId)).size;
  let m = 1;
  if (items.length >= 3) m *= pushFactor(factors, kinds >= 3 ? 'Mixed pack' : 'Bundle', kinds >= 3 ? 1.08 : 1.04, kinds >= 3 ? 'A ready-made starter set' : 'One order, one shipment');
  const expected = sum * m;
  return { expected: nicePrice(expected), low: nicePrice(expected * 0.85), high: nicePrice(expected * 1.2), factors };
}

/** What the local fish store pays for one frag/cutting today (never more than a listing would fetch). */
export function fragStoreOffer(state: GameState, item: DecorInstance): number {
  const v = fragValue(state, item).expected;
  return Math.max(1, Math.round(v * FRAG_STORE_RATE));
}

/** Value of a (still growing) frag inside a whole-aquarium sale: it grows from frag value toward colony value. */
export function fragInTankFactor(item: DecorInstance): number {
  const def = getDecorDef(item.defId);
  const rule = propagationFor(def);
  const start = rule.startGrowth;
  const grown = clamp01((clamp01(finite(item.growth, start)) - start) / Math.max(0.05, 1 - start));
  // fresh: its frag share of the colony price; fully grown: the same 1.3× a grown-in colony is worth
  return rule.valueFraction + (1.3 - rule.valueFraction) * grown;
}
