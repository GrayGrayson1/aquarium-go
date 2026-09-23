/**
 * Player-placed fixtures: viewing benches, planters, info kiosks and donation boxes. OWNER: lane "facility".
 */
import { useGameSelector } from '@/state/game';
import { FIXTURE_DEFS, type FixtureKind } from '@/data/facilities';
import { Batch, box, rbox, cyl, lathe } from './kit';
import { Batched } from './Batched';
import { buildPlanterProp } from './PublicRoom';
import type { PropMaterials } from './materials';

function buildBench(w: number, d: number, dark: boolean): Batch {
  const b = new Batch();
  const seatH = 0.44;
  // two stone plinth legs + slatted oak seat
  for (const s of [-1, 1]) b.add(dark ? 'stone' : 'concrete', rbox(0.1, seatH - 0.05, d * 0.9, 0.015), [s * (w / 2 - 0.2), (seatH - 0.05) / 2, 0]);
  const slats = 5;
  for (let i = 0; i < slats; i++) b.add(dark ? 'smoked' : 'oak', rbox(w, 0.035, d / slats - 0.012, 0.008), [0, seatH - 0.0175, -d / 2 + (i + 0.5) * (d / slats)]);
  b.add('blackMetal', box(w - 0.1, 0.02, d * 0.7), [0, seatH - 0.055, 0]);
  return b;
}

function buildKiosk(): Batch {
  const b = new Batch();
  b.add('blackMetal', rbox(0.5, 0.04, 0.36, 0.01), [0, 0.02, 0]);
  b.add('blackMetal', rbox(0.12, 0.9, 0.1, 0.02), [0, 0.47, 0]);
  b.add('blackMetal', rbox(0.52, 0.36, 0.05, 0.015), [0, 1.05, 0.02], [-0.45, 0, 0]);
  b.add('screen', box(0.46, 0.3, 0.004), [0, 1.055, 0.047], [-0.45, 0, 0]);
  return b;
}

function buildDonationBox(): Batch {
  const b = new Batch();
  b.add('smoked', rbox(0.34, 0.8, 0.34, 0.02), [0, 0.4, 0]);
  b.add('glass', box(0.32, 0.36, 0.32), [0, 0.98, 0]);
  b.add('brass', box(0.34, 0.02, 0.34), [0, 1.17, 0]);
  b.add('brass', box(0.12, 0.004, 0.02), [0, 1.181, 0]);
  // coins and notes inside
  b.add('brass', cyl(0.12, 0.13, 0.05, 16), [0, 0.83, 0]);
  b.add('ceramic', lathe([[0.001, 0], [0.09, 0], [0.07, 0.03]], 10), [0.04, 0.855, 0.03]);
  return b;
}

export function Fixtures({ mats, dark }: { mats: PropMaterials; dark: boolean }) {
  const fixtures = useGameSelector((g) => g.facility.fixtures, []);
  return (
    <group name="facility-fixtures">
      {fixtures.map((f) => {
        const def = FIXTURE_DEFS[f.kind as FixtureKind];
        const pos: [number, number, number] = [f.x, 0, f.z];
        const rot: [number, number, number] = [0, f.rotY, 0];
        switch (f.kind) {
          case 'bench':
            return <Batched key={f.id} mats={mats} deps={[dark]} build={() => buildBench(def.w, def.d, dark)} position={pos} rotation={rot} />;
          case 'planter':
            return <Batched key={f.id} mats={mats} deps={[f.id]} build={() => buildPlanterProp(def.w, `fx-${f.id}`, 1.1)} position={pos} rotation={rot} />;
          case 'info_kiosk':
            return <Batched key={f.id} mats={mats} deps={[]} build={buildKiosk} position={pos} rotation={rot} />;
          case 'donation_box':
            return <Batched key={f.id} mats={mats} deps={[]} build={buildDonationBox} position={pos} rotation={rot} />;
          default:
            return null;
        }
      })}
    </group>
  );
}
