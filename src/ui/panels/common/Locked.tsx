/**
 * A destination that isn't unlocked yet opens in a locked state, whether from the dock, a More tile or a link (0.5 spec
 * §5.7): what opens it, with its tabs hidden, so a shared link never lands on nothing. OWNER: lane "ui-panels".
 */
import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import type { GameState } from '@/types';
import { useDevMode } from '@/state/devTools'; // lane:core (PLAT-005)
import { EmptyState } from './parts';
import { unlocked } from './derive';

/** Is the destination behind `key` still locked? Developer tools open everything, as on the dock. */
export function useDestinationLocked(g: GameState | null, key: string): boolean {
  const dev = useDevMode();
  return !!g && !dev && !unlocked(g, key);
}

export function LockedDestination({ title, children, action, testId }: { title: ReactNode; children: ReactNode; action?: ReactNode; testId: string }) {
  return (
    <div className="pn-locked" data-testid={testId}>
      <EmptyState icon={<Lock size={26} aria-hidden />} title={title} action={action}>
        {children}
      </EmptyState>
    </div>
  );
}
