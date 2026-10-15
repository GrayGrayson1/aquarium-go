/**
 * The Social panel's building blocks (0.5 spec §13.4–§13.5; the approved screens desk-social, phone-clubs and
 * phone-leaderboard): avatars, the section card, a club row, trade rows, friend tiles, the leaderboard card, skeleton
 * rows and the coming-soon note. OWNER: lane "social".
 */
import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowLeftRight, Check, Heart, TriangleAlert, Trophy } from 'lucide-react';
import { Button, Modal } from '@/ui/kit';
import { Seg } from '../common/parts';
import { go } from '@/ui/nav/router';
import { socialService, type Club, type FriendAquarium, type LeaderboardKind, type LeaderboardRow, type TradeOffer, LEADERBOARD_KINDS, CLUB_SHOW_ENTRIES } from '@/social';
import { SOCIAL_COPY as C, count, lbValue, monthName } from './copy';
import { useSocialQuery } from './socialStore';

/** A person's avatar: their initial on a gradient picked from their name (the screens' violet, teal, coral, blue …). */
const PERSON_GRADIENTS: [string, string][] = [
  ['#9b7bf0', '#6a4bc4'],
  ['#2fc4b2', '#14857a'],
  ['#f0845a', '#c4502e'],
  ['#5b8ff0', '#2f5bc4'],
  ['#e8608f', '#b03565'],
  ['#e0b040', '#a87818'],
];

function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function PersonAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const [a, b] = PERSON_GRADIENTS[nameHash(name) % PERSON_GRADIENTS.length];
  return (
    <span className="so-avatar" style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.44 }} aria-hidden>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

export function ClubAvatar({ club, size = 44 }: { club: Club; size?: number }) {
  return (
    <span className="so-avatar so-avatar--club" style={{ width: size, height: size, background: `linear-gradient(135deg, ${club.colors[0]}, ${club.colors[1]})`, fontSize: size * 0.4 }} aria-hidden>
      {club.initials}
    </span>
  );
}

/** A titled card: small caps heading with its icon, an optional header link, the body. */
export function SoCard({ title, icon, action, children, className, testId }: { title: ReactNode; icon: ReactNode; action?: { label: string; onClick: () => void }; children: ReactNode; className?: string; testId?: string }) {
  return (
    <section className={clsx('so-card', className)} data-testid={testId}>
      <header className="so-card__head">
        <h3 className="so-card__title">
          <span className="so-card__icon" aria-hidden>
            {icon}
          </span>
          {title}
        </h3>
        {action && (
          <button type="button" className="pn-link so-card__action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

/** Skeleton rows while the service answers: a gentle shimmer, still under reduced motion (social.css). */
export function Skeleton({ rows = 3, tall }: { rows?: number; tall?: boolean }) {
  return (
    <div className="so-skel" aria-busy="true" data-testid="social-loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={clsx('so-skel__row', tall && 'so-skel__row--tall')} />
      ))}
    </div>
  );
}

/** A Social error: a danger callout with its icon, announced (role=alert; §13.2, §18). */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div className="pn-callout pn-callout--danger" role="alert" data-testid="social-error">
      <span className="pn-callout__icon">
        <TriangleAlert size={16} aria-hidden />
      </span>
      <div className="pn-callout__body">
        <div className="pn-callout__text">{children}</div>
      </div>
    </div>
  );
}

/** The network error (§13.2): the game itself keeps running. */
export function NetworkError() {
  return <ErrorNote>{C.errorNetwork}</ErrorNote>;
}

/** A member's club: avatar, name, "128 members · you joined in October", the Member chip, then the club-show strip. */
export function MemberClub({ club }: { club: Club }) {
  return (
    <div className="so-club" data-testid={`social-club-${club.id}`}>
      <div className="so-club__row">
        <ClubAvatar club={club} />
        <div className="so-club__text">
          <div className="so-club__name">{club.name}</div>
          <div className="so-club__meta">{C.clubRowMeta(count(club.members), monthName(club.joined))}</div>
        </div>
        <span className="so-chip so-chip--member">
          <Check size={12} aria-hidden /> {C.member}
        </span>
      </div>
      {club.nextEvent && (
        <div className="so-strip">
          <Trophy size={14} aria-hidden className="so-strip__icon" />
          <span className="so-strip__text">{C.clubShowStrip(club.nextEvent.when, CLUB_SHOW_ENTRIES)}</span>
          <button type="button" className="pn-link so-strip__link" onClick={() => go({ kind: 'panel', panel: 'shows' })}>
            {C.enter}
          </button>
        </div>
      )}
    </div>
  );
}

/** "No club yet" with Find clubs and Use an invite (§13.4). */
export function NoClub({ onFind, onInvite }: { onFind: () => void; onInvite?: () => void }) {
  return (
    <div className="so-noclub">
      <div className="so-noclub__title">{C.noClubTitle}</div>
      <div className="so-noclub__text">{C.noClubText}</div>
      <div className="so-noclub__actions">
        <Button variant="primary" size="sm" onClick={onFind}>
          {C.findClubs}
        </Button>
        {onInvite && (
          <Button variant="ghost" size="sm" onClick={onInvite}>
            {C.useInvite}
          </Button>
        )}
      </div>
    </div>
  );
}

/** A trade: avatar, "**Mara** offers …" over "for your …", and View. */
export function TradeRow({ t, onView }: { t: TradeOffer; onView: () => void }) {
  return (
    <li className="so-trade">
      <PersonAvatar name={t.from} size={32} />
      <div className="so-trade__text">
        <div className="so-trade__gives">
          <strong>{t.from}</strong> {t.gives}
        </div>
        <div className="so-trade__wants">{t.wants}</div>
      </div>
      <Button size="sm" onClick={onView}>
        {C.view}
      </Button>
    </li>
  );
}

export function TradeList({ trades, onView }: { trades: readonly TradeOffer[]; onView: () => void }) {
  if (!trades.length)
    return (
      <div className="so-empty" data-testid="social-trades-empty">
        <div className="so-empty__title">{C.noTradesTitle}</div>
        <div className="so-empty__text">{C.noTradesText}</div>
      </div>
    );
  return (
    <ul className="so-trades">
      {trades.map((t) => (
        <TradeRow key={t.id} t={t} onView={onView} />
      ))}
    </ul>
  );
}

/** A friend's aquarium: the 16:10 snapshot, its title, "1,000 gal · 48 likes" (or "Public aquarium · 31 likes"). */
export function FriendTile({ f }: { f: FriendAquarium }) {
  return (
    <li className="so-friend">
      <img className="so-friend__snap" src={f.snapshotUrl} alt="" width={320} height={200} loading="lazy" decoding="async" />
      <div className="so-friend__title">{f.title}</div>
      <div className="so-friend__meta">
        <Heart size={12} aria-hidden className="so-friend__heart" />
        {f.gallons === null ? C.publicAquarium : C.gallons(count(f.gallons))} · {C.likes(count(f.likes))}
      </div>
    </li>
  );
}

export function FriendGrid({ friends, testId }: { friends: readonly FriendAquarium[]; testId?: string }) {
  if (!friends.length)
    return (
      <div className="so-empty" data-testid="social-friends-empty">
        <div className="so-empty__title">{C.noFriendsTitle}</div>
        <div className="so-empty__text">{C.noFriendsText}</div>
      </div>
    );
  return (
    <ul className="so-friends" data-testid={testId}>
      {friends.map((f) => (
        <FriendTile key={f.id} f={f} />
      ))}
    </ul>
  );
}

function LbRow({ row, kind }: { row: LeaderboardRow; kind: LeaderboardKind }) {
  const name = row.me ? C.you(row.name) : row.name;
  return (
    <li className={clsx('so-lb__row', row.me && 'is-me')} data-testid={row.me ? 'social-lb-me' : undefined}>
      <span className={clsx('so-lb__rank', row.rank === 1 && 'is-first')}>{row.rank}</span>
      <PersonAvatar name={row.me ? row.name || 'You' : row.name} size={28} />
      <span className="so-lb__name">{name}</span>
      <span className="so-lb__value">{lbValue(kind, row.value)}</span>
    </li>
  );
}

/** This week's leaderboard: Collection value · Prismatics · Show wins, the top four and the player's own row. */
export function Leaderboard({ wide }: { wide?: boolean }) {
  const [kind, setKind] = useState<LeaderboardKind>('collection_value');
  const [q] = useSocialQuery(() => socialService().leaderboard(kind), [kind]);
  return (
    <SoCard title={C.leaderboardTitle} icon={<Trophy size={14} />} className={clsx('so-lb', wide && 'so-lb--wide')} testId="social-leaderboard">
      <Seg<LeaderboardKind> label={C.leaderboardTitle} value={kind} onChange={setKind} size="sm" className="so-lb__seg" testIdPrefix="social-lb-" items={LEADERBOARD_KINDS.map((k) => ({ id: k, label: C.lbKinds[k] }))} />
      {q.state === 'loading' && <Skeleton rows={5} />}
      {q.state === 'error' && <NetworkError />}
      {q.state === 'ok' && <LeaderboardRows kind={kind} rows={q.data.rows} me={q.data.me} />}
    </SoCard>
  );
}

/** The top four, then the player's own row when it isn't among them (highlighted either way). */
export function LeaderboardRows({ kind, rows, me }: { kind: LeaderboardKind; rows: readonly LeaderboardRow[]; me: LeaderboardRow }) {
  return (
    <ol className="so-lb__rows" aria-label={C.lbKinds[kind]}>
      {rows.map((r) => (
        <LbRow key={`${r.rank}:${r.name}:${r.me ? 'me' : ''}`} row={r} kind={kind} />
      ))}
      {!rows.some((r) => r.me) && <LbRow row={me} kind={kind} />}
    </ol>
  );
}

/** The coming-soon note behind "Offer a trade" and a trade's View (ADR-0034 decision 2). */
export function ComingSoon({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={C.soonTitle}
      testId="social-soon"
      actions={
        <Button variant="primary" onClick={onClose} data-testid="social-soon-close">
          {C.close}
        </Button>
      }
    >
      <p className="so-soon">
        <ArrowLeftRight size={16} aria-hidden className="so-soon__icon" />
        {C.soonText}
      </p>
    </Modal>
  );
}

/** Focus an element once it exists (the Clubs search after "Use an invite"). */
export function useFocusOnce(id: string, when: boolean): void {
  useEffect(() => {
    if (!when) return;
    const t = window.setTimeout(() => document.getElementById(id)?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [id, when]);
}
