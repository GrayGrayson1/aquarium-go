/** Icon per GameEvent kind (toasts, event log). OWNER: lane "ui-shell". */
import { Info, Lightbulb, TriangleAlert, OctagonAlert, PartyPopper, Egg, Store, Users, HeartCrack, LockOpen, CircleCheck, Sparkles } from 'lucide-react';
import type { GameEvent } from '@/types';
import type { Toast } from '@/state/ui';

export type AnyKind = GameEvent['kind'] | Toast['kind'];

export function EventIcon({ kind, size = 16 }: { kind: AnyKind; size?: number }) {
  const p = { size, 'aria-hidden': true } as const;
  switch (kind) {
    case 'tip':
      return <Lightbulb {...p} className="ag-evicon ag-evicon--aqua" />;
    case 'warning':
      return <TriangleAlert {...p} className="ag-evicon ag-evicon--watch" />;
    case 'danger':
      return <OctagonAlert {...p} className="ag-evicon ag-evicon--danger" />;
    case 'death':
      return <HeartCrack {...p} className="ag-evicon ag-evicon--danger" />;
    case 'celebrate':
      return <PartyPopper {...p} className="ag-evicon ag-evicon--gold" />;
    case 'breeding':
      return <Egg {...p} className="ag-evicon ag-evicon--violet" />;
    case 'market':
      return <Store {...p} className="ag-evicon ag-evicon--good" />;
    case 'visitor':
      return <Users {...p} className="ag-evicon ag-evicon--aqua" />;
    case 'unlock':
      return <LockOpen {...p} className="ag-evicon ag-evicon--gold" />;
    case 'success':
      return <CircleCheck {...p} className="ag-evicon ag-evicon--good" />;
    case 'info':
    default:
      return kind === 'info' ? <Info {...p} className="ag-evicon ag-evicon--aqua" /> : <Sparkles {...p} className="ag-evicon" />;
  }
}
