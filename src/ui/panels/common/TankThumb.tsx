/**
 * Miniature stylised aquarium used on tank cards: water tinted by class, substrate band, decor silhouettes and a
 * few resident glyphs. OWNER: lane "ui-panels".
 */
import { memo, useId } from 'react';
import type { Creature, Tank } from '@/types';
import { getDecorDef } from '@/data/catalog/decor';
import { WATER_CLASS_TINT, hashStr } from './format';
import { CreatureGlyph } from './Portrait';

export const TankThumb = memo(function TankThumb({ tank, residents, width = 132, height = 88 }: { tank: Tank; residents: Creature[]; width?: number; height?: number }) {
  const uid = useId().replace(/:/g, '');
  const [a, b] = WATER_CLASS_TINT[tank.waterClass] ?? WATER_CLASS_TINT.freshwater_tropical;
  const sub = tank.substrate?.color ?? '#8a7c68';
  const seed = hashStr(tank.id); // unsigned 32-bit: shift with >>> below, or half of all ids land off the left edge
  const decorKinds = tank.decor.slice(0, 7).map((d, i) => {
    const def = getDecorDef(d.defId);
    return { cat: def?.category ?? (i % 2 ? 'plant' : 'hardscape'), color: def?.palette?.[0], i };
  });
  const decor = decorKinds.length ? decorKinds : [{ cat: 'hardscape', color: undefined, i: 0 }, { cat: 'plant', color: undefined, i: 1 }];
  const W = 132;
  const H = 88;
  const floor = 70;
  const clarity = Math.max(0.5, Math.min(1, tank.water?.clarity ?? 1));
  const shown = residents.slice(0, 4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={height} className="pn-tankthumb" aria-hidden>
      <defs>
        <linearGradient id={`w${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} stopOpacity={0.55 * clarity + 0.15} />
          <stop offset="1" stopColor={b} stopOpacity={0.9} />
        </linearGradient>
        <radialGradient id={`l${uid}`} cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`c${uid}`}>
          <rect x={3} y={6} width={W - 6} height={H - 10} rx={4} />
        </clipPath>
      </defs>
      <rect x={1} y={4} width={W - 2} height={H - 6} rx={6} fill="#061017" stroke="rgba(200,235,245,0.28)" strokeWidth={1.2} />
      <g clipPath={`url(#c${uid})`}>
        <rect x={0} y={0} width={W} height={H} fill={`url(#w${uid})`} />
        <rect x={0} y={0} width={W} height={H * 0.7} fill={`url(#l${uid})`} />
        {/* light shafts */}
        <path d={`M${20 + (seed % 20)} 0 L ${34 + (seed % 20)} 0 L ${54 + (seed % 20)} ${H} L ${30 + (seed % 20)} ${H} Z`} fill="#fff" opacity={0.05} />
        <path d={`M${80 + (seed % 14)} 0 L ${88 + (seed % 14)} 0 L ${104 + (seed % 14)} ${H} L ${90 + (seed % 14)} ${H} Z`} fill="#fff" opacity={0.04} />
        {/* substrate */}
        <path d={`M0 ${floor} C 30 ${floor - 3}, 60 ${floor + 2}, ${W} ${floor - 2} L ${W} ${H} L 0 ${H} Z`} fill={sub} opacity={0.95} />
        {/* decor */}
        {decor.map(({ cat, color, i }) => {
          const x = 14 + ((seed >>> (i * 3)) % 100) * 1.02;
          if (cat === 'plant') {
            const c = color ?? '#3f8f4a';
            return (
              <g key={i} stroke={c} strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.9}>
                <path d={`M${x} ${floor} C ${x - 3} ${floor - 14}, ${x + 2} ${floor - 22}, ${x - 2} ${floor - 34}`} />
                <path d={`M${x + 3} ${floor} C ${x + 6} ${floor - 12}, ${x + 3} ${floor - 18}, ${x + 8} ${floor - 26}`} />
                <path d={`M${x - 3} ${floor} C ${x - 7} ${floor - 8}, ${x - 5} ${floor - 14}, ${x - 10} ${floor - 18}`} />
              </g>
            );
          }
          if (cat === 'coral' || cat === 'anemone') {
            const c = color ?? '#e08aa8';
            return (
              <g key={i} stroke={c} strokeWidth={3} strokeLinecap="round" opacity={0.95}>
                <path d={`M${x} ${floor} L ${x} ${floor - 10} L ${x - 6} ${floor - 18} M ${x} ${floor - 10} L ${x + 6} ${floor - 17}`} fill="none" />
              </g>
            );
          }
          const c = color ?? '#5b6670';
          return <path key={i} d={`M${x - 12} ${floor + 1} C ${x - 10} ${floor - 12}, ${x + 2} ${floor - 18}, ${x + 12} ${floor + 1} Z`} fill={c} opacity={0.95} />;
        })}
        {/* residents */}
        {shown.map((c, i) => {
          const x = 18 + (((seed >>> (i * 5)) % 70) + i * 17) % 88;
          const y = 16 + (((seed >>> (i * 7)) % 30) + i * 9) % 38;
          const s = 26 - i * 2;
          return (
            <g key={c.id} transform={`translate(${x} ${y})`}>
              <CreatureGlyph speciesId={c.speciesId} appearance={c.appearance} size={s} bare />
            </g>
          );
        })}
        {/* surface */}
        <rect x={0} y={6} width={W} height={1.4} fill="#fff" opacity={0.35} />
      </g>
      <rect x={1} y={4} width={W - 2} height={H - 6} rx={6} fill="none" stroke="rgba(160,240,220,0.25)" strokeWidth={0.8} />
    </svg>
  );
});
