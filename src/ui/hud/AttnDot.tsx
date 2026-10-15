/**
 * Attention dots — one small indicator used everywhere (tank switcher, tank card toggle and tabs, Tanks panel rows,
 * dock and sheet switcher, Shows › Results): 9 px, top-right of what it marks, amber for watch / new, red for danger.
 * Never colour alone: the control it sits on names the reason in its aria-label / title, or a standalone dot carries
 * its own label. Pops in gently; still under reduced motion. Rules live in ../common/notify.ts. OWNER: lane "notify".
 */
import { useMemo } from 'react';
import clsx from 'clsx';
import { useGameSelector } from '@/state/game';
import { useUI } from '@/state/ui';
import { navDots, tankAttentionLevel, type AttentionLevel, type NavDot } from '../common/notify';
import { useSeenStock } from '../panels/market/seenStock'; // lane:notify (0.5 §5.2)
import { hasSocialNews, useSocial } from '../panels/social/socialStore'; // lane:social (chunk 6)
import { SOCIAL_COPY } from '../panels/social/copy';

export type DotLevel = 'watch' | 'danger' | 'new';

export function AttnDot({ level, label, className, testId, inline }: { level: DotLevel; label?: string; className?: string; testId?: string; inline?: boolean }) {
  return (
    <span
      className={clsx('ag-attn', `ag-attn--${level}`, inline && 'ag-attn--inline', className)}
      data-testid={testId}
      data-level={level}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
    />
  );
}

/** A tank's live dot level (re-renders only when it changes). */
export function useTankAttentionLevel(tankId: string | null | undefined): AttentionLevel {
  return useGameSelector((g) => (tankId ? tankAttentionLevel(g, tankId) : 'good'), 'good' as AttentionLevel);
}

/** Dock / sheet-switcher dots by panel id (stable object while nothing changes). The tank in view is left out of the
 *  Tanks dot: it has its own on the Tank card button. */
export function useNavDots(items: { id: string; label: string; lock?: string | null; newUntilOpened?: boolean }[]): Record<string, NavDot> {
  const focused = useUI((s) => s.focusedTankId);
  const seen = useSeenStock((s) => s.seen);
  // lane:social (chunk 6, §5.4) — new trades or club news from the Social service (outside the save)
  const socialNews = useSocial((s) => hasSocialNews(s.news));
  const key = useGameSelector((g) => {
    try {
      return JSON.stringify(navDots(g, items, focused, seen, socialNews ? { social: SOCIAL_COPY.dotNews } : undefined));
    } catch {
      return '{}';
    }
  }, '{}');
  return useMemo(() => JSON.parse(key) as Record<string, NavDot>, [key]);
}
