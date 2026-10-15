/**
 * Operations' building blocks (DESIGN-S3D §12): the status word, bars, the system tile, the dashed locked tile, the tier
 * ladder and the locked page. OWNER: lane "automation" (chunk 5). Status is always an icon plus a word (§3, §13).
 */
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Check, CircleCheck, CircleDot, CirclePlay, Clock, Hand, Lock, OctagonAlert, Pause, TriangleAlert } from 'lucide-react';
import { Badge } from '@/ui/kit';
import type { LadderTier } from '@/ui/common/ops';

export type Tone = 'good' | 'watch' | 'danger' | 'neutral' | 'aqua' | 'violet';

const ICON: Record<string, ReactNode> = {
  good: <CircleCheck size={12} aria-hidden />,
  running: <CirclePlay size={12} aria-hidden />,
  watch: <TriangleAlert size={12} aria-hidden />,
  danger: <OctagonAlert size={12} aria-hidden />,
  held: <Hand size={12} aria-hidden />,
  paused: <Pause size={12} aria-hidden />,
  time: <Clock size={12} aria-hidden />,
  locked: <Lock size={11} aria-hidden />,
  off: <CircleDot size={12} aria-hidden />,
};

/** A status: icon plus word, in its tone. `icon` picks the glyph (defaults by tone). */
export function Status({ tone, icon, children, testId }: { tone: Tone; icon?: keyof typeof ICON; children: ReactNode; testId?: string }) {
  const glyph = ICON[icon ?? (tone === 'good' ? 'good' : tone === 'watch' ? 'watch' : tone === 'danger' ? 'danger' : 'off')];
  return (
    <span className={clsx('ops-status', `ops-status--${tone}`)} data-testid={testId}>
      {glyph}
      {children}
    </span>
  );
}

export const NewChip = () => (
  <Badge tone="aqua" className="ops-new">
    New
  </Badge>
);

export function Kicker({ icon, children, end }: { icon?: ReactNode; children: ReactNode; end?: ReactNode }) {
  return (
    <h3 className="ops-kicker">
      {icon}
      {children}
      {end && <span className="ops-kicker__end">{end}</span>}
    </h3>
  );
}

/** A 6px bar (0..1). */
export function OpsBar({ value, kind, label }: { value: number; kind?: 'fresh' | 'salt' | 'watch' | 'danger' | 'violet' | 'gold'; label: string }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div className="ops-bar" role="img" aria-label={label}>
      <div className={clsx('ops-bar__fill', kind && kind !== 'fresh' && `ops-bar__fill--${kind}`)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

/** A Systems tile: icon chip, name, status, one or two lines; a problem tone gives it the amber or red border. */
export function SystemTile({ icon, name, status, isNew, lines, tone, onOpen, testId, children }: { icon: ReactNode; name: string; status: ReactNode; isNew?: boolean; lines: ReactNode[]; tone?: 'watch' | 'danger' | null; onOpen?: () => void; testId: string; children?: ReactNode }) {
  const body = (
    <>
      <div className="ops-card__head">
        <span className="ops-chip">{icon}</span>
        <span className="ops-card__title">{name}</span>
        {isNew && <NewChip />}
      </div>
      <div>{status}</div>
      <div className="ops-tile__lines">
        {lines.map((l, i) => (
          <span key={i} className={i > 0 ? 'ops-muted' : undefined}>
            {l}
          </span>
        ))}
      </div>
      {children}
    </>
  );
  const cls = clsx('ops-card', 'ops-tile', tone && `ops-card--${tone}`);
  return onOpen ? (
    <div className={cls} role="button" tabIndex={0} data-testid={testId} onClick={(e) => !(e.target as HTMLElement).closest('button') && onOpen()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), onOpen())}>
      {body}
    </div>
  ) : (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  );
}

/** A dashed tile for a system still locked (Locked + New), opening its locked page. */
export function LockedTile({ icon, name, desc, onOpen, testId }: { icon: ReactNode; name: string; desc: string; onOpen?: () => void; testId: string }) {
  return (
    <div className="ops-card ops-card--dashed ops-tile" role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined} data-testid={testId} onClick={onOpen} onKeyDown={(e) => onOpen && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}>
      <div className="ops-card__head">
        <span className="ops-chip">{icon}</span>
        <span className="ops-card__title">{name}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Status tone="neutral" icon="locked">
          Locked
        </Status>
        <Badge tone="aqua">New</Badge>
      </div>
      <span className="ops-muted">{desc}</span>
    </div>
  );
}

export function Reqs({ reqs }: { reqs: LadderTier['reqs'] }) {
  return (
    <ul className="ops-reqs">
      {reqs.map((r, i) => (
        <li key={i} className={r.met ? 'is-met' : undefined}>
          {r.met ? <Check size={13} aria-label="Done" /> : <Lock size={12} aria-label="Missing" />}
          <span>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** The tier ladder: each tier still locked, the first marked "Next up", with what it needs. */
export function Ladder({ tiers, title, end, testId }: { tiers: LadderTier[]; title: string; end?: ReactNode; testId: string }) {
  const locked = tiers.filter((t) => !t.open);
  if (!locked.length) return null;
  return (
    <section className="ops-card" data-testid={testId}>
      <Kicker end={end}>{title}</Kicker>
      <div className="ops-rows">
        {locked.map((t, i) => (
          <TierRow key={t.tier} t={t} next={i === 0} />
        ))}
      </div>
    </section>
  );
}

/** One tier of the ladder: "Tier 2 Water room", Next up or Locked, what it gives and what it needs. */
export function TierRow({ t, next }: { t: LadderTier; next: boolean }) {
  return (
    <div className="ops-row" style={{ alignItems: 'flex-start' }}>
      <div className="ops-row__main">
        <span className="ops-row__title">
          <span className="ops-muted">Tier {t.tier}</span> {t.name}{' '}
          {next ? (
            <Status tone="aqua" icon="time">
              Next up
            </Status>
          ) : (
            <Status tone="neutral" icon="locked">
              Locked
            </Status>
          )}
        </span>
        <span className="ops-row__sub">{t.desc}</span>
        <Reqs reqs={t.reqs} />
      </div>
    </div>
  );
}
