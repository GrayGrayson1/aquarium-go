/**
 * Creature / species portrait with a tasteful fallback (species-tinted gradient + initial glyph) until the
 * fishart lane's offscreen portraits are available. OWNER: lane "ui-shell".
 */
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { Creature, CreatureVisualParams } from '@/types';
import { usePortrait, useSpeciesPortrait } from '@/render/portraits';
import { findSpecies } from '@/data/species';
import { ErrorBoundary } from './ErrorBoundary';
import { isPrismatic } from '@/sim/life/rareVariants';
import { PrismaticGlints } from './Prismatic'; // lane:genetics

type Subject = Creature | { speciesId: string; appearance?: CreatureVisualParams };

export interface PortraitProps {
  subject?: Subject | null;
  /** Species-only portrait (encyclopedia / starter placeholder). */
  speciesId?: string;
  size?: number;
  className?: string;
  /** Visual shape. */
  shape?: 'circle' | 'rounded' | 'card';
  style?: CSSProperties;
  alt?: string;
}

function fallbackColors(subject: Subject | null | undefined, speciesId: string | undefined) {
  const sp = findSpecies(subject?.speciesId ?? speciesId ?? '');
  const a = subject?.appearance ?? sp?.genetics.baseVisual;
  return {
    c1: a?.bodyColor ?? '#2a6f7a',
    c2: a?.finColor ?? a?.bodyColor2 ?? '#1c3f55',
    c3: a?.accentColor ?? '#5eead4',
    glyph: (sp?.commonName ?? subject?.speciesId ?? '?').charAt(0).toUpperCase(),
  };
}

/** lane:genetics — a Prismatic individual gets the shimmering frame wherever its portrait shows. */
const shimmers = (subject: Subject | null | undefined) => !!subject && 'rareVariant' in subject && isPrismatic(subject as Creature);

export function PortraitFallback({ subject, speciesId, className, shape = 'rounded', style }: PortraitProps) {
  const { c1, c2, c3, glyph } = fallbackColors(subject, speciesId);
  const shimmer = shimmers(subject);
  return (
    <div
      className={clsx('ag-portrait', `ag-portrait--${shape}`, 'ag-portrait--fallback', shimmer && 'ag-prismatic-frame', className)}
      style={{ ...style, ['--p1' as string]: c1, ['--p2' as string]: c2, ['--p3' as string]: c3 }}
      aria-hidden
    >
      <span className="ag-portrait__glyph">{glyph}</span>
      {shimmer && <PrismaticGlints />}
    </div>
  );
}

function PortraitInner({ subject, speciesId, size = 256, className, shape = 'rounded', style, alt }: PortraitProps) {
  const sid = subject?.speciesId ?? speciesId ?? '';
  // One offscreen render per card: individuals use usePortrait, species-only uses useSpeciesPortrait.
  const src = subject ? usePortrait(subject, size) : useSpeciesPortrait(sid, size); // eslint-disable-line react-hooks/rules-of-hooks -- `subject` presence is stable per mount (keyed by parent)
  if (!src) return <PortraitFallback subject={subject} speciesId={speciesId} className={className} shape={shape} style={style} />;
  const { c1, c2 } = fallbackColors(subject, speciesId);
  // portraits are square renders; a card shows them in a wide box, where the cover crop took an upright animal's head
  // and tail (the starter seahorse lost its coronet): those are shown whole over a blurred fill of their own backdrop
  const upright = shape === 'card' && findSpecies(sid)?.behaviorSet === 'seahorse';
  return (
    <div
      className={clsx('ag-portrait', `ag-portrait--${shape}`, upright && 'ag-portrait--upright', shimmers(subject) && 'ag-prismatic-frame', className)}
      style={{ ...style, ['--p1' as string]: c1, ['--p2' as string]: c2, ...(upright ? { ['--portrait-src' as string]: `url("${src}")` } : null) }}
    >
      <img src={src} alt={alt ?? ''} draggable={false} />
      {shimmers(subject) && <PrismaticGlints />}
    </div>
  );
}

export function Portrait(props: PortraitProps) {
  return (
    <ErrorBoundary name="portrait" fallback={<PortraitFallback {...props} />} resetKey={props.subject?.speciesId ?? props.speciesId}>
      <PortraitInner key={props.subject ? 'individual' : 'species'} {...props} />
    </ErrorBoundary>
  );
}
