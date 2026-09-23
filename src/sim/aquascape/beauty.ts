/**
 * Aquascape beauty: an original composition heuristic. OWNER: lane "aquascape".
 *
 * It looks at the layout like an aquascaping judge would — fullness, front-to-back layering, height rhythm,
 * a focal point near the thirds, open water, the hardscape/planting balance, colour harmony, the health of
 * living things, water clarity, clutter and style cohesion — and turns the weakest points into concrete tips.
 */
import type { GameState, Tank, BeautyReport, DecorDef, DecorInstance, WaterClass } from '@/types';
import { getDecorDef, isLiving, isFloating } from '@/data/catalog/decor';
import { tankDims } from '../tankSpace';
import { getTankTier } from '@/data/catalog/tanks';
import { findSpecies } from '@/data/species';
import { isUnlocked } from '../facility';
import { residentsOf } from '../residents'; // lane:perf2

interface Item {
  inst: DecorInstance;
  def: DecorDef;
  h: number; // visual height (m)
  rx: number;
  rz: number;
  area: number;
  mass: number;
  u: number; // 0 left .. 1 right
  back: number; // 0 front .. 1 back
  living: boolean;
  floating: boolean;
}

const W = { fill: 9, layering: 7, height: 9, focal: 9, negative: 9, balance: 8, colour: 7, living: 10, clarity: 10, maturity: 11, texture: 6, variety: 8 };

/** Leaf/surface texture classes: contrast between fine, medium and bold textures is a hallmark of good scapes. */
const TEXTURE: Record<string, 'fine' | 'medium' | 'bold'> = {
  plant_moss: 'fine',
  plant_hairgrass: 'fine',
  plant_monte_carlo: 'fine',
  plant_rotala: 'fine',
  plant_water_sprite: 'fine',
  plant_marimo: 'fine',
  macro_chaeto: 'fine',
  coral_gsp: 'fine',
  coral_zoanthid: 'fine',
  plant_crypt: 'medium',
  plant_ludwigia: 'medium',
  plant_vallisneria: 'medium',
  plant_floating: 'medium',
  macro_gracilaria: 'medium',
  coral_gorgonian: 'medium',
  coral_acropora: 'medium',
  coral_torch: 'medium',
  coral_frogspawn: 'medium',
  coral_hammer: 'medium',
  plant_anubias: 'bold',
  plant_java_fern: 'bold',
  plant_sword: 'bold',
  coral_leather: 'bold',
  coral_mushroom: 'bold',
  anemone_bta: 'bold',
  plant_mangrove: 'bold', // lane:brackish
};

const BALANCE_BAND: Record<WaterClass, [number, number]> = {
  freshwater_planted: [0.15, 0.5],
  freshwater_tropical: [0.25, 0.7],
  freshwater_cool: [0.3, 0.75],
  brackish: [0.25, 0.7],
  marine_fowlr: [0.5, 0.95],
  marine_live_rock: [0.45, 0.9],
  reef: [0.35, 0.75],
};

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

function side(u: number): string {
  return u < 0.5 ? 'left' : 'right';
}
function spot(it: { u: number; back: number }): string {
  const fb = it.back > 0.62 ? 'back' : it.back < 0.38 ? 'front' : 'middle';
  const lr = it.u < 0.36 ? 'left' : it.u > 0.64 ? 'right' : 'centre';
  if (fb === 'middle' && lr === 'centre') return 'centre';
  return `${fb} ${lr}`;
}

/** lane:perf2 — palettes are a small fixed set of strings; memoise the pure conversion (read-only tuples). */
const HSL_MEMO = new Map<string, readonly [number, number, number]>();
function hexToHsl(hex: string): readonly [number, number, number] {
  let v = HSL_MEMO.get(hex);
  if (!v) HSL_MEMO.set(hex, (v = hexToHslRaw(hex)));
  return v;
}

function hexToHslRaw(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0.5];
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue: number;
  if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return [hue * 60, s, l];
}

function collectItems(tank: Tank): Item[] {
  const d = tankDims(tank);
  const out: Item[] = [];
  for (const inst of tank.decor) {
    const def = getDecorDef(inst.defId);
    if (!def) continue;
    const living = isLiving(def);
    const g = inst.growth ?? 0.6;
    const vis = living ? 0.72 + 0.28 * g : 1;
    const h = def.size.h * inst.scale * vis;
    const rx = (def.size.w * inst.scale * vis) / 2;
    const rz = (def.size.d * inst.scale * vis) / 2;
    const area = Math.PI * rx * rz;
    out.push({
      inst,
      def,
      h,
      rx,
      rz,
      area,
      mass: Math.sqrt(area) * h,
      u: clamp01((inst.x + d.L / 2) / d.L),
      back: clamp01((-inst.z + d.W / 2) / d.W),
      living,
      floating: isFloating(def),
    });
  }
  return out;
}

/** Fraction of the open-water sample grid not occupied by decor + length of the longest open lane (0..1). */
function openWater(tank: Tank, items: Item[]): { free: number; lane: number } {
  const d = tankDims(tank);
  const nx = 20;
  const ny = 5;
  const nz = 3;
  const col = d.waterY - d.substrateY;
  let free = 0;
  let total = 0;
  let run = 0;
  let best = 0;
  // lane:perf2 — only items whose x-extent reaches a column can block it (|x − cx| ≥ rx already makes q ≥ 1), so each
  // column tests its few overlapping items instead of every item (identical result, ~10× fewer tests).
  const inCol: Item[] = [];
  for (let i = 0; i < nx; i++) {
    const x = -d.L / 2 + ((i + 0.5) / nx) * d.L;
    inCol.length = 0;
    for (const it of items) if (Math.abs(x - it.inst.x) < Math.max(0.005, it.rx)) inCol.push(it);
    let colFree = 0;
    for (let j = 0; j < ny; j++) {
      const y = d.substrateY + col * (0.15 + (0.7 * (j + 0.5)) / ny);
      for (let k = 0; k < nz; k++) {
        const z = d.W / 2 - ((k + 0.5) / nz) * d.W * 0.66; // front two-thirds
        let blocked = false;
        for (const it of inCol) {
          const cy = it.floating ? d.waterY - it.h / 2 : it.inst.y + it.h / 2;
          const ry = Math.max(0.005, it.h / 2);
          const q = ((x - it.inst.x) / Math.max(0.005, it.rx)) ** 2 + ((y - cy) / ry) ** 2 + ((z - it.inst.z) / Math.max(0.005, it.rz)) ** 2;
          if (q < 1) {
            blocked = true;
            break;
          }
        }
        total++;
        if (!blocked) {
          free++;
          colFree++;
        }
      }
    }
    if (colFree / (ny * nz) >= 0.8) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  return { free: total ? free / total : 1, lane: best / nx };
}

export function beautyScoreImpl(state: GameState | null, tank: Tank): BeautyReport {
  const d = tankDims(tank);
  const col = Math.max(0.05, d.waterY - d.substrateY);
  const items = collectItems(tank);
  const bed = items.filter((i) => !i.floating);
  const tips: { p: number; text: string }[] = [];
  const factors: BeautyReport['factors'] = [];
  const add = (label: string, v: number, note?: string) => factors.push({ label, value: Math.round(clamp01(v) * 100), note });
  let gallons = 20;
  try {
    gallons = getTankTier(tank.tierId).gallons;
  } catch {
    /* ignore */
  }
  const areaTank = d.L * d.W;

  // 1. fullness
  const coverage = items.reduce((s, i) => s + i.area * (i.floating ? 0.3 : 1), 0) / areaTank;
  const fill = coverage < 0.3 ? coverage / 0.3 : coverage <= 1.25 ? 1 : Math.max(0.5, 1 - (coverage - 1.25) * 0.6);
  add('Fullness', fill, coverage < 0.3 ? 'Mostly bare' : coverage > 1.25 ? 'Very dense' : 'Well filled');
  if (fill < 0.55) {
    tips.push({
      p: W.fill * (1 - fill) + 3,
      text: items.length
        ? `The layout still feels sparse — add a few more plants around the ${bed[0] ? bed[0].def.name.toLowerCase() : 'hardscape'} to fill the midground.`
        : tank.environment === 'marine'
          ? 'Start with structure: a live-rock arch or a few stacked live-rock pieces a third of the way in from one side.'
          : 'Start with structure: one striking piece of wood or a main stone a third of the way in from one side, then plant around it.',
    });
  }

  // 2. depth layering (tall at the back, low at the front)
  const tall = bed.filter((i) => i.h > 0.5 * col);
  const short = bed.filter((i) => i.h < 0.18 * col);
  let layering = 0;
  if (bed.length) {
    const tallBack = tall.length ? tall.reduce((s, i) => s + i.back * i.mass, 0) / tall.reduce((s, i) => s + i.mass, 0) : 0.5;
    const shortFront = short.length ? 1 - short.reduce((s, i) => s + i.back * i.mass, 0) / Math.max(1e-9, short.reduce((s, i) => s + i.mass, 0)) : 0.5;
    layering = clamp01((tallBack - 0.2) / 0.4) * 0.7 + clamp01(shortFront / 0.6) * 0.3;
    const blocker = tall.filter((i) => i.back < 0.34).sort((a, b) => b.mass - a.mass)[0];
    if (blocker) tips.push({ p: W.layering * (1 - layering) + 2, text: `The ${blocker.def.name.toLowerCase()} at the ${spot(blocker)} blocks the view — move it towards the back so the scape rises from front to back.` });
  }
  add('Depth layering', layering, tall.length ? undefined : 'No tall background yet');

  // 3. height & rhythm
  let height = 0;
  if (bed.length) {
    const hs = bed.map((i) => i.h / col);
    const mean = hs.reduce((a, b) => a + b, 0) / hs.length;
    const sd = Math.sqrt(hs.reduce((a, b) => a + (b - mean) ** 2, 0) / hs.length);
    const maxH = Math.max(...hs);
    height = 0.55 * clamp01(maxH / 0.55) + 0.45 * clamp01(sd / 0.16);
  }
  add('Height & rhythm', height);

  // 4. focal point near the thirds
  let focal = 0;
  let focalItem: Item | undefined;
  if (bed.length) {
    const prom = (i: Item) => i.def.beauty * i.mass * (i.living && i.def.category === 'plant' ? 0.8 : 1.25);
    focalItem = bed.reduce((a, b) => (prom(b) > prom(a) ? b : a));
    const total = bed.reduce((s, i) => s + prom(i), 0);
    const share = prom(focalItem) / Math.max(1e-9, total);
    const nearest = focalItem.u < 0.5 ? 0.382 : 0.618;
    const dev = Math.abs(focalItem.u - nearest);
    focal = (1 - clamp01((dev - 0.05) / 0.2)) * (share >= 0.18 ? 1 : 0.6 + 2.2 * share);
    if (Math.abs(focalItem.u - 0.5) < 0.07) {
      tips.push({ p: W.focal * (1 - focal) + 3, text: `Shift the ${focalItem.def.name.toLowerCase()} off-centre — about a third of the way in from the ${focalItem.inst.x <= 0 ? 'left' : 'right'} (the rule of thirds) reads far more natural.` });
    } else if (focal < 0.6) {
      tips.push({ p: W.focal * (1 - focal), text: `Give the eye one place to land: nudge the ${focalItem.def.name.toLowerCase()} towards the ${side(focalItem.u)} third, or make it bigger than its neighbours.` });
    }
  }
  add('Focal point', focal, focalItem ? `${focalItem.def.name} at the ${spot(focalItem)}` : undefined);

  // 5. open water / negative space
  const ow = openWater(tank, items);
  const band = ow.free < 0.35 ? ow.free / 0.35 : ow.free <= 0.8 ? 1 : 1 - (ow.free - 0.8) * 1.2;
  const negative = items.length ? 0.7 * clamp01(band) + 0.3 * clamp01(ow.lane / 0.15) : 0.5;
  add('Open water', negative, `${Math.round(ow.free * 100)}% of the mid-water is open`);
  if (items.length && (ow.free < 0.35 || ow.lane < 0.1)) {
    const frontBusy = bed.filter((i) => i.back < 0.5 && i.h > 0.25 * col).sort((a, b) => a.mass - b.mass)[0];
    tips.push({
      p: W.negative * (1 - negative) + 2,
      text: frontBusy
        ? `Leave an open swimming lane — the ${frontBusy.def.name.toLowerCase()} at the ${spot(frontBusy)} crowds the front. Fish (and eyes) need room to breathe.`
        : 'Leave an open swimming lane through the middle; negative space makes the planted areas look lusher.',
    });
  }

  // 6. hardscape ↔ living balance
  const hardMass = bed.filter((i) => !i.living).reduce((s, i) => s + i.mass, 0);
  const liveMass = items.filter((i) => i.living).reduce((s, i) => s + i.mass * (i.floating ? 0.4 : 1), 0);
  let balance = 0;
  const bandB = BALANCE_BAND[tank.waterClass] ?? [0.25, 0.7];
  if (hardMass + liveMass > 0) {
    const share = hardMass / (hardMass + liveMass);
    const dist = share < bandB[0] ? bandB[0] - share : share > bandB[1] ? share - bandB[1] : 0;
    balance = clamp01(1 - dist * 2.5);
    if (share > bandB[1] + 0.05) {
      const hs = bed.filter((i) => !i.living).sort((a, b) => b.mass - a.mass)[0];
      tips.push({
        p: W.balance * (1 - balance) + 1,
        text:
          tank.environment === 'marine'
            ? `Soften the rockwork with life — macroalgae${state && isUnlocked(state, 'decor_corals_soft') ? ' or a few soft corals' : ''} around the ${hs?.def.name.toLowerCase() ?? 'rock'}.`
            : `Soften the hardscape — tie java fern or anubias onto the ${hs?.def.name.toLowerCase() ?? 'wood'} and add a background of stem plants.`,
      });
    } else if (share < bandB[0] - 0.05) {
      tips.push({ p: W.balance * (1 - balance) + 1, text: 'Add a stone or a piece of wood — the planting needs some structure to grow around.' });
    }
  }
  add('Hardscape ↔ planting', balance);

  // 7. colour harmony
  let colour = 0;
  if (items.length) {
    const bins = new Array(12).fill(0);
    let totalW = 0;
    let warmAccent = 0;
    let greenW = 0;
    for (const it of items) {
      const pal = it.def.palette ?? [];
      pal.slice(0, 2).forEach((hex, idx) => {
        const [hue, s, l] = hexToHsl(hex);
        const w = it.mass * (idx === 0 ? 1 : 0.35);
        totalW += w;
        if (s < 0.28 || l < 0.14 || l > 0.88) return; // neutrals always harmonise
        bins[Math.floor(hue / 30) % 12] += w;
        if (hue >= 60 && hue < 160) greenW += w;
        if (hue >= 330 || hue < 30) warmAccent += w;
      });
    }
    const shares = bins.map((b) => b / Math.max(1e-9, totalW));
    // analogous hues harmonise: count runs of adjacent occupied 30° bins around the colour wheel
    const occ = shares.map((v) => v > 0.04);
    let families = 0;
    let widest = 0;
    if (occ.every(Boolean)) families = 6;
    else {
      const start = occ.findIndex((o) => !o);
      let run = 0;
      for (let k = 1; k <= 12; k++) {
        const o = occ[(start + k) % 12];
        if (o) run++;
        if ((!o || k === 12) && run > 0) {
          families++;
          widest = Math.max(widest, run);
          run = 0;
        }
      }
    }
    const marine = tank.environment === 'marine';
    const limit = marine ? 3 : 2;
    colour = families <= limit ? 1 : families === limit + 1 ? 0.8 : families === limit + 2 ? 0.6 : 0.42;
    if (widest > 5) colour -= 0.15;
    const warmShare = warmAccent / Math.max(1e-9, totalW);
    const greenShare = greenW / Math.max(1e-9, totalW);
    if (!marine && greenShare > 0.3 && warmShare > 0.02 && warmShare < 0.22) colour = Math.min(1, colour + 0.1);
    if (families > limit) tips.push({ p: W.colour * (1 - colour) + 1, text: 'Too many competing colours — choose one accent colour and repeat it in two or three places.' });
    else if (!marine && tank.waterClass === 'freshwater_planted' && greenShare > 0.45 && warmShare < 0.02 && items.length >= 4)
      tips.push({ p: 2.5, text: `A small red accent (Rotala or Ludwigia) behind the ${focalItem?.def.name.toLowerCase() ?? 'focal point'} would make the greens glow.` });
  }
  add('Colour harmony', colour);

  // 8. living things' health
  const living = items.filter((i) => i.living);
  let life = 0;
  if (living.length) {
    life = living.reduce((s, i) => s + ((i.inst.health ?? 90) / 100) * (0.55 + 0.45 * (i.inst.growth ?? 0.5)), 0) / living.length;
    const worst = living.reduce((a, b) => ((b.inst.health ?? 90) < (a.inst.health ?? 90) ? b : a));
    if ((worst.inst.health ?? 90) < 55) {
      const need = worst.def.lightNeed ?? 0.3;
      const why = need >= 0.5 ? 'it needs stronger light than this tank provides' : worst.def.category !== 'plant' ? 'check salinity, temperature and nitrate' : 'check light, temperature and nutrients';
      tips.push({ p: W.living * (1 - (worst.inst.health ?? 90) / 100) + 3, text: `Your ${worst.def.name.toLowerCase()} is struggling (${Math.round(worst.inst.health ?? 0)}% health) — ${why}.` });
    }
  } else if (items.length) {
    life = 0.45;
    if (tank.environment !== 'marine') tips.push({ p: 3, text: 'Nothing is growing yet — even two or three easy plants (java fern, anubias, crypts) bring a scape to life.' });
  }
  add('Plant & coral health', life, living.length ? undefined : 'No living decor');

  // 8b. maturity: a freshly planted scape is lovely; a grown-in one is breathtaking
  let maturity = 0;
  if (living.length) {
    maturity = living.reduce((s, i) => s + Math.min(1, i.inst.growth ?? 0.5) ** 1.6, 0) / living.length;
    if (maturity < 0.75) tips.push({ p: W.maturity * (1 - maturity), text: 'Give it time — as the plants grow in, the layout will fill out and soften. Good light and a little nitrate speed it up.' });
  }
  add('Maturity', maturity, living.length ? `${Math.round(maturity * 100)}% grown in` : undefined);

  // 8c. texture contrast (fine vs. medium vs. bold leaves / polyps)
  const texClasses = new Set(living.map((i) => TEXTURE[i.def.visual]).filter(Boolean));
  const texture = living.length ? (texClasses.size >= 3 ? 1 : texClasses.size === 2 ? 0.75 : 0.4) : 0;
  add('Texture contrast', texture);
  if (living.length >= 3 && texClasses.size < 2) {
    const has = [...texClasses][0];
    tips.push({ p: 4, text: has === 'bold' ? 'Contrast the big leaves with something fine — java moss on the wood or a tuft of hairgrass in front.' : 'Add one bold-leaved plant (anubias or java fern) to anchor all that fine texture.' });
  }

  // 8d. variety of living things (collecting rewards)
  const kinds = new Set(living.map((i) => i.def.id)).size;
  const varietyTarget = tank.waterClass === 'reef' ? 7 : tank.environment === 'marine' ? 3 : 6;
  const variety = clamp01(kinds / varietyTarget) ** 1.3;
  add('Variety', variety, `${kinds} kind${kinds === 1 ? '' : 's'} of living decor`);

  // 9. clarity / algae
  const algae = tank.water.algae ?? 0;
  const clarity = clamp01((1 - (algae / 100) * 0.9) * (0.4 + 0.6 * (tank.water.clarity ?? 1)));
  add('Clarity', clarity, algae > 30 ? 'Algae visible' : undefined);
  if (algae > 30 || (tank.water.clarity ?? 1) < 0.75)
    tips.push({ p: W.clarity * (1 - clarity) + 4, text: 'Algae and haze are dulling the view — scrape the glass, add fast-growing plants and shorten the light period a little.' });

  // 10. clutter
  const ornaments = items.filter((i) => i.def.category === 'ornament').length;
  const weighted = items.reduce((s, i) => s + (i.living ? 0.35 : i.def.category === 'ornament' ? 1.6 : i.def.category === 'enrichment' ? 0.5 : i.h < 0.05 ? 0.5 : 1), 0);
  const capacity = (areaTank / 0.129) * 8;
  let clutter = clamp01((weighted - capacity) / capacity) + Math.max(0, ornaments - 2) * 0.15;
  clutter = clamp01(clutter);
  if (clutter > 0.15) {
    const n = Math.max(1, Math.round(weighted - capacity));
    tips.push({ p: 12 * clutter + 2, text: `The layout feels cluttered — remove about ${n} item${n > 1 ? 's' : ''}, or group small pieces into odd-numbered clusters.` });
  }
  factors.push({ label: 'Clutter', value: -Math.round(clutter * 100), note: clutter > 0.15 ? 'Too many pieces' : undefined });

  // 11. cohesion (one stone type, one wood type, restrained ornaments)
  const stoneKind = (v: string) => (v === 'rock_live' || v === 'rock_live_arch' ? 'live' : v);
  const stones = new Set(items.filter((i) => i.def.visual.startsWith('rock_') && i.def.visual !== 'rock_rubble').map((i) => stoneKind(i.def.visual)));
  const woods = new Set(items.filter((i) => i.def.visual.startsWith('wood_')).map((i) => i.def.visual));
  const sScore = stones.size <= 1 ? 1 : stones.size === 2 ? 0.6 : 0.1;
  const wScore = woods.size <= 1 ? 1 : woods.size === 2 ? 0.7 : 0.3;
  const oScore = ornaments === 0 ? 1 : ornaments === 1 ? 0.8 : ornaments === 2 ? 0.5 : 0.2;
  const cohesion = (sScore + wScore + oScore) / 3;
  const bonus = items.length >= 3 ? cohesion * 8 : 0;
  factors.push({ label: 'Style cohesion', value: Math.round(cohesion * 100), note: stones.size > 2 ? `${stones.size} kinds of stone` : undefined });
  if (stones.size > 2) {
    const counts = new Map<string, { n: number; name: string }>();
    for (const i of items) if (i.def.visual.startsWith('rock_') && i.def.visual !== 'rock_rubble') {
      const k = stoneKind(i.def.visual);
      counts.set(k, { n: (counts.get(k)?.n ?? 0) + 1, name: i.def.name });
    }
    const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
    tips.push({ p: 6, text: `Mixing ${stones.size} kinds of stone breaks the harmony — keep to ${top.name.toLowerCase()} for a unified look.` });
  }

  // extra, situational tips
  const spent = items.find((i) => i.def.visual === 'botanical_almond_leaf' && (i.inst.health ?? 100) < 15);
  if (spent) tips.push({ p: 3, text: 'Your almond leaves have broken down — drop in a fresh one to keep the tannins and biofilm going.' });
  if (tall.length === 0 && bed.length >= 2) {
    const leftBack = bed.filter((i) => i.u < 0.5 && i.back > 0.5).reduce((s, i) => s + i.mass, 0);
    const rightBack = bed.filter((i) => i.u >= 0.5 && i.back > 0.5).reduce((s, i) => s + i.mass, 0);
    const where = leftBack <= rightBack ? 'back left' : 'back right';
    const plant = tank.environment === 'marine' ? 'a gorgonian or a bush of red ogo' : 'a taller plant (vallisneria or rotala)';
    tips.push({ p: W.height * (1 - height) + 3, text: `Add ${plant} at the ${where} to frame the ${focalItem?.def.name.toLowerCase() ?? 'layout'}.` });
  }
  if (state) {
    const seekers = residentsOf(state, tank.id).filter((c) => c.status === 'alive' && findSpecies(c.speciesId)?.anemoneRelationship === 'host_seeker'); // lane:perf2
    const hasHost = items.some((i) => i.def.anchors.some((a) => a.kind === 'host'));
    if (seekers.length && !hasHost) {
      tips.push({
        p: 4,
        text: isUnlocked(state, 'decor_anemones')
          ? 'Your clownfish has no host — a bubble-tip anemone on a stable rock ledge would give it a home to defend.'
          : 'Keep a flat rock ledge open: once anemones unlock, a bubble-tip anemone there will become your clownfish’s home.',
      });
    }
  }

  const wsum = Object.values(W).reduce((a, b) => a + b, 0);
  const vals = { fill, layering, height, focal, negative, balance, colour, living: life, clarity, maturity, texture, variety };
  const base = (Object.keys(W) as (keyof typeof W)[]).reduce((s, k) => s + W[k] * clamp01(vals[k]), 0) / wsum;
  const score = Math.round(Math.max(0, Math.min(100, base * 93 + bonus * 0.6 - clutter * 18)));

  tips.sort((a, b) => b.p - a.p);
  const seen = new Set<string>();
  const outTips: string[] = [];
  for (const t of tips) {
    if (seen.has(t.text)) continue;
    seen.add(t.text);
    outTips.push(t.text);
    if (outTips.length >= 3) break;
  }
  return { score, factors, tips: outTips };
}
