/**
 * Motion-quality scan CLI (see src/ai/core/motionScan.ts): every starter over five seeds plus the multi-species
 * fixtures, browser-like frame times. Reports, per species, the share of ~1 s windows in which the animal vibrates.
 * Usage: npm run qa:motion -- [secs=40] [scenario filter]   (DRAWN=1 measures the drawn, pose-filtered transform;
 * FRAMES=40-60 draws frame times from that range in ms; OVER_BUDGET=1 steps long frames once, as TankAI does under load)
 */
import { newGame, previewStarters } from '@/sim/newGame';
import { FIXTURES } from '@/dev/fixtures';
import { scanMotion, type MotionScenario } from '@/ai/core/motionScan';
import type { StarterId } from '@/data/species';

const secs = Number(process.argv[2] ?? 40);
const filter = process.argv[3] ?? '';
const STARTERS: StarterId[] = ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'];
const scenarios: MotionScenario[] = [];
for (const s of STARTERS)
  for (const seed of [1234, 77, 2024, 5, 99])
    scenarios.push({
      name: `${s}#${seed}`,
      maxTanks: 1,
      build: () => {
        const p = previewStarters(seed)[s];
        return newGame({ starterId: s, starterName: p.name, seed, starterCreature: p });
      },
    });
for (const f of ['behavior-lab', 'behavior-reef', 'behavior-crowd', 'behavior-oddballs', 'behavior-predators', 'community_fw', 'marine_reef', 'big_facility', 'brackish_estuary', 'brackish_puffer', 'brackish_gobies' /* lane:brackish */])
  if (FIXTURES[f]) scenarios.push({ name: f, build: FIXTURES[f], maxTanks: 6 });

const t0 = Date.now();
const r = scanMotion(
  scenarios.filter((s) => !filter || s.name.includes(filter)),
  {
    secs,
    drawn: process.env.DRAWN === '1',
    frameMs: process.env.FRAMES ? (process.env.FRAMES.split('-').map(Number) as [number, number]) : undefined,
    overBudget: process.env.OVER_BUDGET === '1',
  },
);
const rows = [...r.bySpecies.entries()].sort((a, b) => b[1].jitterWindows / b[1].windows - a[1].jitterWindows / a[1].windows);
for (const [sp, st] of rows) {
  const pct = (100 * st.jitterWindows) / Math.max(1, st.windows);
  const acts = [...st.acts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k}:${n}`).join(' ');
  console.log(`${sp.padEnd(24)} jitter ${pct.toFixed(1).padStart(5)}% of ${String(st.windows).padStart(5)} windows  ${acts}`);
  if (st.example) console.log(`${''.padEnd(26)}e.g. ${st.example}`);
}
console.log(`TOTAL ${r.jitterWindows}/${r.windows} windows (${((100 * r.jitterWindows) / Math.max(1, r.windows)).toFixed(2)}%) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
