/**
 * The tank automation chips' icons (DESIGN-S3D §8.1; AUTO-041: an icon and a word each), shared by the Tanks panel's
 * rows and the tank card's header. OWNER: lane "automation" (chunk 5).
 */
import type { ReactNode } from 'react';
import { Utensils, Waves, Droplet, Syringe, Factory } from 'lucide-react';
import type { TankChip } from './tankChips';

export const CHIP_ICON: Record<TankChip['id'], ReactNode> = {
  'auto-feed': <Utensils size={12} aria-hidden />,
  'auto-clean': <Waves size={12} aria-hidden />,
  'top-off': <Droplet size={12} aria-hidden />,
  doser: <Syringe size={12} aria-hidden />,
  line: <Factory size={12} aria-hidden />,
};
