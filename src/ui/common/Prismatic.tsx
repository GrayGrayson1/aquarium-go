/**
 * Prismatic / morph-tier / named-strain badges. OWNER: lane "genetics" (ui).
 * Pure presentation of domain state: no rolls, no RNG — an ordinary animal renders nothing.
 */
import clsx from 'clsx';
import { Dna, Sparkles } from 'lucide-react';
import type { Creature, MorphStrain, Rarity } from '@/types';
import { PRISMATIC } from '@/data/rarity';
import { isPrismatic, oneInLabel } from '@/sim/life';
import { RARITY_LABEL, RARITY_TONE } from '../panels/common/format';
import { Badge } from '../kit';

const PRISMATIC_TITLE = `Prismatic — an ultra-rare individual (about ${oneInLabel(PRISMATIC.shopChance)} stocked animals). Its shimmer is permanent; its young are likelier, never certain, to share it.`;

/** "✦ Prismatic" — shown for a Prismatic animal (or always, when no creature is passed). */
export function PrismaticBadge({ creature, compact, className }: { creature?: Pick<Creature, 'rareVariant'> | null; compact?: boolean; className?: string }) {
  if (creature !== undefined && !isPrismatic(creature)) return null;
  return (
    <span className={clsx('ag-prismatic-badge', compact && 'is-compact', className)} data-testid="prismatic-badge" title={PRISMATIC_TITLE}>
      <Sparkles size={compact ? 10 : 12} aria-hidden />
      {compact ? <span className="ag-sr">Prismatic</span> : 'Prismatic'}
      <span className="ag-sr"> — an ultra-rare individual</span>
    </span>
  );
}

/** Morph tier by how often market stock shows it ("Rare morph · about 1 in 140"). */
export function MorphTierBadge({ tier, share }: { tier: Rarity; share?: number }) {
  return (
    <Badge tone={RARITY_TONE[tier]} title={share && share > 0 ? `About ${oneInLabel(share)} market animals show this morph` : undefined}>
      {RARITY_LABEL[tier]} morph
    </Badge>
  );
}

/** A recognised named strain. */
export function StrainBadge({ strain, tier }: { strain: MorphStrain; tier: Rarity }) {
  return (
    <Badge tone={RARITY_TONE[tier]} title={`${RARITY_LABEL[tier]} named strain${strain.note ? ` — ${strain.note}` : ''}`} className="ag-strain-badge">
      <Dna size={11} aria-hidden /> {strain.name}
    </Badge>
  );
}

/** Sparkle overlay for portrait frames (CSS only; decorative). */
export function PrismaticGlints() {
  return <span className="ag-prism-glints" aria-hidden />;
}
