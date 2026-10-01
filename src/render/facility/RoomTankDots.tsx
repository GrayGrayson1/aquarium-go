/**
 * Room view: a small attention dot above each tank that needs a look — amber (watch) or red (danger), live, the same
 * rule as the HUD's dots (src/ui/common/notify.ts: water, animals, food, broken gear, gear that can't help). Only tanks
 * that need attention get one, so a healthy room costs nothing; each is a drei <Html> pinned just above the lid that
 * never takes a click (the tank's pick box underneath still does). Hidden with the HUD (photo / watch mode).
 * lane:qa-r3 (round 3 "notify" follow-up). OWNER: lane "facility".
 */
import { Html } from '@react-three/drei';
import type { GameState } from '@/types';
import { useGameSelector } from '@/state/game';
import { useUI } from '@/state/ui';
import { standHeight } from '@/sim/tankSpace';
import { tankOuterSize } from '@/sim/facility/layout';
import { tankAttentionLevel, ATTENTION_WORD } from '@/ui/common/notify';
import { AttnDot } from '@/ui/hud/AttnDot';

interface Dot {
  id: string;
  level: 'watch' | 'danger';
  name: string;
  pos: [number, number, number];
}

/** One string per change that matters (a dot appears, changes colour, or its tank moves) — not every sim tick. */
function dotsKey(g: GameState): string {
  let s = '';
  for (const id of g.tankOrder) {
    const t = g.tanks[id];
    if (!t) continue;
    const l = tankAttentionLevel(g, id);
    if (l === 'good') continue;
    s += `${id}\t${l}\t${t.tierId}\t${t.placement.x}\t${t.placement.z}\t${t.name}\n`;
  }
  return s;
}

function parse(key: string): Dot[] {
  const out: Dot[] = [];
  for (const line of key.split('\n')) {
    if (!line) continue;
    const [id, level, tierId, x, z, ...name] = line.split('\t');
    let top = 1;
    try {
      top = standHeight(tierId) + tankOuterSize(tierId).H;
    } catch {
      /* unknown tier: keep a sensible height */
    }
    out.push({ id, level: level === 'danger' ? 'danger' : 'watch', name: name.join('\t'), pos: [Number(x), top + 0.07, Number(z)] });
  }
  return out;
}

export function RoomTankDots() {
  const view = useUI((s) => s.view);
  const hidden = useUI((s) => s.hudHidden || s.photoMode);
  const key = useGameSelector((g) => {
    try {
      return dotsKey(g);
    } catch {
      return '';
    }
  }, '');
  if (view !== 'facility' || hidden || !key) return null;
  return (
    <group name="room-tank-dots">
      {parse(key).map((d) => (
        <Html key={d.id} position={d.pos} center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
          <AttnDot level={d.level} className="ag-attn--room" testId={`room-tank-attn-${d.id}`} label={`${d.name} needs attention (${ATTENTION_WORD[d.level].toLowerCase()}) — open it to see why`} />
        </Html>
      ))}
    </group>
  );
}
