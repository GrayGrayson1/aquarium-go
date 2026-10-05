/**
 * Creature/species portraits for panel cards. Uses the fishart portrait renderer when it has produced an image, and
 * a hand-drawn procedural SVG glyph (per body plan, tinted with the individual's colours) while it is null.
 * OWNER: lane "ui-panels".
 */
import { memo, useId } from 'react';
import clsx from 'clsx';
import type { Creature, CreatureVisualParams, SpeciesDefinition, WaterClass } from '@/types';
import { findSpecies } from '@/data/species';
import { usePortrait, useSpeciesPortrait } from '@/render/portraits';
import { WATER_CLASS_TINT } from './format';
import { isPrismatic } from '@/sim/life/rareVariants'; // lane:genetics
import { PrismaticGlints } from '@/ui/common/Prismatic'; // lane:genetics

type Plan = 'fish' | 'longfin' | 'seahorse' | 'axolotl' | 'shrimp' | 'snail' | 'crab' | 'frog' | 'coral' | 'anemone' | 'eel' | 'flat';

function planFor(sp: SpeciesDefinition | undefined, vis?: CreatureVisualParams): Plan {
  if (!sp) return 'fish';
  switch (sp.behaviorSet) {
    case 'seahorse':
      return 'seahorse';
    case 'axolotl':
      return 'axolotl';
    case 'shrimp_dwarf':
    case 'shrimp_cleaner':
    case 'mantis_shrimp':
      return 'shrimp';
    case 'snail':
      return 'snail';
    case 'hermit_crab':
    case 'crayfish':
      return 'crab';
    case 'frog_aquatic':
      return 'frog';
    case 'loach_eel':
      return 'eel';
    case 'hillstream':
    case 'dragonet':
      return 'flat';
    case 'sessile':
      return sp.category === 'anemone' ? 'anemone' : 'coral';
  }
  if (sp.category === 'coral') return 'coral';
  if (sp.category === 'anemone') return 'anemone';
  if (sp.hasLongFins || (vis?.finLength ?? 1) > 1.25) return 'longfin';
  return 'fish';
}

function envTint(sp: SpeciesDefinition | undefined): [string, string] {
  const wc: WaterClass = sp?.waterClasses?.[0] ?? 'freshwater_tropical';
  return WATER_CLASS_TINT[wc] ?? WATER_CLASS_TINT.freshwater_tropical;
}

export interface GlyphProps {
  speciesId: string;
  appearance?: CreatureVisualParams;
  size?: number;
  /** Undiscovered: flat silhouette. */
  silhouette?: boolean;
  /** Draw without the round water background. */
  bare?: boolean;
  className?: string;
}

/** Procedural SVG creature glyph. */
export const CreatureGlyph = memo(function CreatureGlyph({ speciesId, appearance, size = 64, silhouette, bare, className }: GlyphProps) {
  const uid = useId().replace(/:/g, '');
  const sp = findSpecies(speciesId);
  const v: CreatureVisualParams | undefined = appearance ?? sp?.genetics?.baseVisual;
  const plan = planFor(sp, v);
  const [tA, tB] = envTint(sp);
  const body = silhouette ? '#0d1c24' : v?.bodyColor ?? '#9fb8c0';
  const body2 = silhouette ? '#0d1c24' : v?.bodyColor2 ?? body;
  const belly = silhouette ? '#0d1c24' : v?.bellyColor ?? body2;
  const fin = silhouette ? '#0b1920' : v?.finColor ?? body;
  const fin2 = silhouette ? '#0b1920' : v?.finColor2 ?? fin;
  const accent = silhouette ? '#0d1c24' : v?.accentColor ?? '#ffffff';
  const eye = silhouette ? 'transparent' : v?.eyeColor ?? '#111';
  const gill = silhouette ? '#0b1920' : v?.gillColor ?? '#e87d9a';
  const stroke = silhouette ? 'rgba(160,200,210,0.28)' : 'rgba(0,0,0,0.22)';
  const finLen = Math.max(0.7, Math.min(1.6, v?.finLength ?? 1));
  const depth = Math.max(0.8, Math.min(1.2, v?.bodyDepth ?? 1));
  const pattern = silhouette ? 'none' : v?.pattern ?? 'none';
  const bodyGrad = `bg${uid}`;
  const finGrad = `fg${uid}`;
  const clip = `cl${uid}`;
  const water = `wt${uid}`;

  const defs = (
    <defs>
      <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={body} />
        <stop offset="0.65" stopColor={body2} />
        <stop offset="1" stopColor={belly} />
      </linearGradient>
      <linearGradient id={finGrad} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor={fin} stopOpacity={silhouette ? 1 : 0.95} />
        <stop offset="1" stopColor={fin2} stopOpacity={silhouette ? 1 : 0.75} />
      </linearGradient>
      <radialGradient id={water} cx="0.5" cy="0.3" r="0.8">
        <stop offset="0" stopColor={silhouette ? '#20343e' : tA} stopOpacity={silhouette ? 0.5 : 0.55} />
        <stop offset="1" stopColor={silhouette ? '#0a1419' : tB} stopOpacity={silhouette ? 0.6 : 0.5} />
      </radialGradient>
    </defs>
  );

  const eyeDot = (cx: number, cy: number, r = 3) =>
    silhouette ? null : (
      <g>
        <circle cx={cx} cy={cy} r={r} fill={eye} stroke="rgba(255,255,255,0.35)" strokeWidth={0.6} />
        <circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.32} fill="#fff" opacity={0.9} />
      </g>
    );

  let art: React.ReactNode;
  if (plan === 'fish' || plan === 'longfin' || plan === 'eel' || plan === 'flat') {
    const d = depth;
    const yTop = 50 - 16 * d;
    const yBot = 50 + 15 * d;
    const bodyPath =
      plan === 'eel'
        ? 'M16 52 C 24 44, 46 44, 64 46 C 76 47, 84 48, 86 51 C 84 55, 76 56, 64 56 C 46 58, 24 58, 16 52 Z'
        : plan === 'flat'
          ? `M22 52 C 28 ${40 * d + 2}, 56 36, 72 42 C 82 46, 84 52, 80 56 C 66 62, 40 62, 22 52 Z`
          : `M24 50 C 30 ${yTop + 2}, 58 ${yTop - 2}, 72 ${yTop + 7} C 80 44, 83 49, 81 52 C 78 ${yBot - 6}, 62 ${yBot + 1}, 48 ${yBot - 1} C 36 ${yBot - 2}, 28 57, 24 50 Z`;
    const tail =
      plan === 'longfin'
        ? `M28 50 C ${22 - 10 * finLen} ${30 - 6 * finLen}, ${8 - 8 * finLen} ${28 - 4 * finLen}, ${4 - 2 * finLen} 40 C 8 50, 8 54, ${4 - 2 * finLen} 62 C ${8 - 8 * finLen} ${74 + 4 * finLen}, ${22 - 10 * finLen} ${72 + 6 * finLen}, 28 52 Z`
        : plan === 'eel'
          ? 'M18 52 C 12 48, 8 50, 6 52 C 8 54, 12 56, 18 52 Z'
          : `M27 50 L ${14 - 4 * finLen} ${37 - 3 * finLen} C ${17 - 2 * finLen} 45, ${17 - 2 * finLen} 55, ${14 - 4 * finLen} ${63 + 3 * finLen} Z`;
    const dorsal =
      plan === 'longfin'
        ? `M34 ${yTop + 6} C 40 ${yTop - 14 * finLen}, 60 ${yTop - 14 * finLen}, 66 ${yTop + 5} Z`
        : plan === 'eel'
          ? 'M40 45 C 50 42, 60 42, 70 45 Z'
          : `M40 ${yTop + 3} C 46 ${yTop - 7 * finLen}, 58 ${yTop - 7 * finLen}, 64 ${yTop + 4} Z`;
    const anal =
      plan === 'longfin'
        ? `M36 ${yBot - 3} C 42 ${yBot + 16 * finLen}, 58 ${yBot + 14 * finLen}, 62 ${yBot - 3} Z`
        : `M44 ${yBot - 2} C 48 ${yBot + 7 * finLen}, 56 ${yBot + 7 * finLen}, 60 ${yBot - 3} Z`;
    const pectoral = `M62 ${52 + 2 * d} C 58 ${58 + 3 * d}, 54 ${60 + 3 * d}, 52 ${58 + 2 * d} Z`;
    art = (
      <g>
        <clipPath id={clip}>
          <path d={bodyPath} />
        </clipPath>
        <path d={tail} fill={`url(#${finGrad})`} stroke={stroke} strokeWidth={0.6} />
        {plan !== 'flat' && <path d={dorsal} fill={`url(#${finGrad})`} stroke={stroke} strokeWidth={0.6} />}
        {plan !== 'eel' && plan !== 'flat' && <path d={anal} fill={`url(#${finGrad})`} stroke={stroke} strokeWidth={0.6} />}
        <path d={bodyPath} fill={`url(#${bodyGrad})`} stroke={stroke} strokeWidth={0.7} />
        <g clipPath={`url(#${clip})`} opacity={silhouette ? 0 : Math.max(0.35, v?.patternContrast ?? 0.7)}>
          {pattern === 'bands' && (
            <g fill={accent} stroke="#111" strokeWidth={1.2}>
              <path d="M66 20 C 64 40, 64 60, 66 80 L 71 80 C 69 60, 69 40, 71 20 Z" />
              <path d="M48 20 C 45 40, 45 60, 48 80 L 55 80 C 52 60, 52 40, 55 20 Z" />
              <path d="M28 20 C 27 40, 27 60, 28 80 L 33 80 C 32 60, 32 40, 33 20 Z" />
            </g>
          )}
          {pattern === 'bars' && (
            <g fill={accent} opacity={0.55}>
              {[34, 42, 50, 58, 66].map((x) => (
                <rect key={x} x={x} y={20} width={2.4} height={60} />
              ))}
            </g>
          )}
          {pattern === 'lateral_stripe' && <path d="M22 47 C 40 44, 60 44, 80 47 L 80 51 C 60 48, 40 48, 22 51 Z" fill={accent} opacity={0.9} />}
          {(pattern === 'spots' || pattern === 'speckled' || pattern === 'dalmatian') && (
            <g fill={accent} opacity={0.8}>
              {[
                [36, 44, 2.2], [46, 40, 1.8], [56, 46, 2.4], [44, 54, 1.6], [62, 40, 1.5], [52, 56, 2], [30, 50, 1.4], [66, 52, 1.6],
              ].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={pattern === 'speckled' ? r * 0.6 : r} />
              ))}
            </g>
          )}
          {(pattern === 'marble' || pattern === 'koi' || pattern === 'mottled') && (
            <g fill={accent} opacity={0.75}>
              <path d="M30 42 C 36 36, 44 40, 42 48 C 40 54, 32 52, 30 42 Z" />
              <path d="M52 50 C 58 44, 68 48, 64 56 C 60 62, 52 58, 52 50 Z" />
            </g>
          )}
          {pattern === 'butterfly' && <rect x={0} y={0} width={30} height={100} fill={fin2} opacity={0.5} />}
          {pattern === 'saddle' && <path d="M46 20 C 44 35, 56 35, 58 20 Z" fill={accent} />}
          {!silhouette && <ellipse cx={58} cy={42} rx={18} ry={4} fill="#fff" opacity={0.12 + (v?.iridescence ?? 0) * 0.25} />}
        </g>
        {plan !== 'eel' && <path d={pectoral} fill={fin} opacity={0.6} />}
        {eyeDot(plan === 'eel' ? 80 : 73, plan === 'eel' ? 50 : 46, plan === 'eel' ? 2 : 3.2)}
      </g>
    );
  } else if (plan === 'seahorse') {
    art = (
      <g>
        <path
          d="M49 16 C 44 16, 40 20, 40 26 C 40 32, 37 38, 38 46 C 39 54, 43 60, 46 66 C 49 72, 46 78, 40 79 C 34 80, 30 75, 33 71 C 35 68, 40 69, 40 72 C 43 70, 44 66, 42 62 C 38 56, 50 52, 54 46 C 58 40, 58 34, 56 31 C 62 31, 72 30, 80 29 C 82 28, 82 25, 80 24 C 72 24, 64 23, 58 21 C 56 18, 53 16, 49 16 Z"
          fill={`url(#${bodyGrad})`}
          stroke={stroke}
          strokeWidth={0.8}
        />
        <path d="M40 36 C 34 38, 32 44, 36 48 C 38 44, 38 40, 40 36 Z" fill={`url(#${finGrad})`} opacity={0.8} />
        <path d="M46 12 L 48 17 L 51 12 L 50 17" stroke={body} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        {!silhouette && (
          <g stroke={accent} strokeWidth={0.6} opacity={0.55} fill="none">
            <path d="M42 34 C 46 36, 50 36, 54 34" />
            <path d="M40 42 C 45 44, 50 43, 54 40" />
            <path d="M41 50 C 45 51, 48 50, 51 48" />
            <path d="M43 57 C 45 58, 47 57, 48 55" />
          </g>
        )}
        {eyeDot(56, 24, 2.4)}
      </g>
    );
  } else if (plan === 'axolotl') {
    const g = gill;
    art = (
      <g>
        <path d="M14 52 C 22 46, 30 46, 34 50 C 30 56, 22 58, 14 52 Z" fill={`url(#${finGrad})`} opacity={0.8} />
        <path d="M22 50 C 30 42, 52 42, 64 44 C 74 40, 84 42, 86 50 C 86 58, 76 62, 64 58 C 52 60, 32 60, 22 50 Z" fill={`url(#${bodyGrad})`} stroke={stroke} strokeWidth={0.7} />
        <path d="M34 58 L 30 66 M 38 58 L 40 66 M 58 59 L 54 67 M 62 59 L 64 67" stroke={body2} strokeWidth={2.4} strokeLinecap="round" />
        <g stroke={g} strokeWidth={2.2} strokeLinecap="round" fill="none">
          <path d="M70 42 C 68 34, 66 30, 62 28" />
          <path d="M74 41 C 74 32, 74 28, 72 24" />
          <path d="M78 42 C 80 34, 82 30, 84 27" />
        </g>
        <g stroke={g} strokeWidth={1} strokeLinecap="round" opacity={0.8}>
          <path d="M66 33 l -3 1 M 64 30 l -3 0 M 73 32 l -3 0 M 73 28 l -3 -1 M 80 34 l 3 0 M 82 30 l 3 -1" />
        </g>
        <path d="M78 54 C 82 55, 84 54, 85 52" stroke="rgba(0,0,0,0.35)" strokeWidth={0.8} fill="none" />
        {eyeDot(80, 47, 1.8)}
      </g>
    );
  } else if (plan === 'shrimp') {
    art = (
      <g>
        <path d="M26 64 C 22 52, 30 38, 46 34 C 60 30, 74 36, 80 46 C 82 50, 80 54, 76 52 C 70 44, 58 42, 48 46 C 40 50, 36 58, 38 66 Z" fill={`url(#${bodyGrad})`} stroke={stroke} strokeWidth={0.7} opacity={silhouette ? 1 : 0.92} />
        <path d="M26 64 L 18 70 L 28 72 L 38 66 Z" fill={`url(#${finGrad})`} />
        <g stroke={silhouette ? '#0b1920' : body} strokeWidth={0.8} fill="none" opacity={0.9}>
          <path d="M80 46 C 88 36, 92 26, 94 16" />
          <path d="M79 47 C 90 42, 96 40, 98 34" />
          <path d="M50 46 l -2 10 M 56 44 l -1 10 M 62 43 l 0 10 M 68 44 l 1 9" />
        </g>
        {!silhouette && <path d="M44 36 C 54 34, 64 36, 72 40" stroke={accent} strokeWidth={1.6} opacity={0.7} fill="none" />}
        {eyeDot(76, 44, 1.8)}
      </g>
    );
  } else if (plan === 'snail') {
    art = (
      <g>
        <path d="M20 70 C 30 64, 70 62, 86 68 C 88 72, 80 74, 70 74 L 26 74 C 20 74, 18 72, 20 70 Z" fill={silhouette ? '#0d1c24' : belly} stroke={stroke} strokeWidth={0.6} />
        <path d="M82 66 L 88 56 M 84 66 L 92 60" stroke={silhouette ? '#0b1920' : belly} strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={48} cy={50} r={22} fill={`url(#${bodyGrad})`} stroke={stroke} strokeWidth={0.8} />
        {!silhouette && (
          <path d="M48 50 m -3 0 a 3 3 0 1 1 6 0 a 7 7 0 1 1 -14 0 a 12 12 0 1 1 24 0 a 17 17 0 1 1 -34 0" stroke={accent} strokeWidth={1.4} fill="none" opacity={0.6} />
        )}
      </g>
    );
  } else if (plan === 'crab') {
    art = (
      <g>
        <ellipse cx={50} cy={56} rx={22} ry={14} fill={`url(#${bodyGrad})`} stroke={stroke} strokeWidth={0.8} />
        <path d="M30 50 C 20 44, 16 36, 22 30 C 28 28, 32 34, 28 38 C 32 42, 34 46, 34 50 Z" fill={fin} stroke={stroke} strokeWidth={0.6} />
        <path d="M70 50 C 80 44, 84 36, 78 30 C 72 28, 68 34, 72 38 C 68 42, 66 46, 66 50 Z" fill={fin} stroke={stroke} strokeWidth={0.6} />
        <g stroke={body2} strokeWidth={2} strokeLinecap="round">
          <path d="M34 64 L 24 72 M 40 68 L 32 78 M 66 64 L 76 72 M 60 68 L 68 78" />
        </g>
        {eyeDot(44, 44, 1.8)}
        {eyeDot(56, 44, 1.8)}
      </g>
    );
  } else if (plan === 'frog') {
    art = (
      <g>
        <path d="M30 60 L 14 70 L 20 72 M 70 60 L 86 70 L 80 72" stroke={body2} strokeWidth={3} strokeLinecap="round" fill="none" />
        <ellipse cx={50} cy={54} rx={22} ry={14} fill={`url(#${bodyGrad})`} stroke={stroke} strokeWidth={0.8} />
        <path d="M34 48 L 26 38 M 66 48 L 74 38" stroke={body2} strokeWidth={2.4} strokeLinecap="round" />
        {eyeDot(42, 44, 2.2)}
        {eyeDot(58, 44, 2.2)}
      </g>
    );
  } else if (plan === 'anemone') {
    art = (
      <g>
        <path d="M34 80 C 34 66, 66 66, 66 80 Z" fill={belly} />
        {Array.from({ length: 11 }).map((_, i) => {
          const a = -Math.PI * 0.95 + (i / 10) * Math.PI * 0.9;
          const x2 = 50 + Math.cos(a) * 30;
          const y2 = 66 + Math.sin(a) * 34;
          return <path key={i} d={`M50 68 Q ${50 + Math.cos(a) * 14} ${60 + Math.sin(a) * 20}, ${x2} ${y2}`} stroke={i % 2 ? fin : body} strokeWidth={4} strokeLinecap="round" fill="none" />;
        })}
      </g>
    );
  } else {
    art = (
      <g stroke={body} strokeLinecap="round" fill="none">
        <path d="M50 82 L 50 56 L 36 38 L 30 24 M 50 56 L 64 40 L 70 26 M 36 38 L 44 26 M 64 40 L 56 28 M 50 64 L 60 58" strokeWidth={5} />
        {!silhouette && <g fill={accent} stroke="none">{[[30, 24], [70, 26], [44, 26], [56, 28], [60, 58]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} />)}</g>}
      </g>
    );
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={clsx('pn-glyph', className)} aria-hidden>
      {defs}
      {!bare && <circle cx={50} cy={50} r={50} fill={`url(#${water})`} />}
      <g transform={plan === 'seahorse' ? 'translate(0 4)' : undefined}>{art}</g>
      {silhouette && (
        <text x={50} y={60} textAnchor="middle" fontSize={30} fontFamily="Fraunces Variable, serif" fill="rgba(210,236,242,0.55)">
          ?
        </text>
      )}
    </svg>
  );
});

/** Portrait of an individual creature (real render when available, glyph otherwise). */
export function CreaturePortrait({ creature, size = 56, className, ring }: { creature: Creature | { speciesId: string; appearance?: CreatureVisualParams }; size?: number; className?: string; ring?: 'gold' | 'aqua' | null }) {
  const url = usePortrait(creature as Creature, Math.min(512, size * 2));
  // lane:genetics — Prismatic individuals wear the shimmering frame everywhere their portrait shows
  const shimmer = 'rareVariant' in creature && isPrismatic(creature as Creature);
  return (
    <span className={clsx('pn-portrait', ring && `pn-portrait--${ring}`, shimmer && 'ag-prismatic-frame', className)} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" width={size} height={size} draggable={false} /> : <CreatureGlyph speciesId={creature.speciesId} appearance={creature.appearance} size={size} />}
      {shimmer && <PrismaticGlints />}
    </span>
  );
}

/** Species portrait (encyclopedia, shop). */
export function SpeciesPortrait({ speciesId, size = 64, silhouette, className }: { speciesId: string; size?: number; silhouette?: boolean; className?: string }) {
  const url = useSpeciesPortrait(speciesId, Math.min(512, size * 2));
  return (
    <span className={clsx('pn-portrait', silhouette && 'pn-portrait--unknown', className)} style={{ width: size, height: size }}>
      {url && !silhouette ? (
        <img src={url} alt="" width={size} height={size} draggable={false} />
      ) : url && silhouette ? (
        <>
          <img src={url} alt="" width={size} height={size} draggable={false} className="pn-portrait__sil" />
          <span className="pn-portrait__q">?</span>
        </>
      ) : (
        <CreatureGlyph speciesId={speciesId} size={size} silhouette={silhouette} />
      )}
    </span>
  );
}
