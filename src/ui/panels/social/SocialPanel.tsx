/**
 * The Social panel (0.5 spec §13): a local stub behind the SocialService interface, reachable only in dev mode until a
 * real backend exists (ADR-0005 decision 3, SOC-011; the dock, More sheet and router keep it out otherwise). OWNER:
 * lane "social".
 *
 * Signed out: "Bring your aquarium online" with the sign-in form and the invite field (§13.2). Signed in: Overview ·
 * Clubs · Trading · Friends · Leaderboards (§13.4–§13.5). Club invites (`#/social/join/:code`, §13.3) show their four
 * states; while one shows, Clubs is highlighted (the approved screen phone-join). Panel targets: `tab:<id>` and
 * `join:<code>`. Nothing here touches the game state or the save (SOC-009 A3).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { Globe, LogIn, Ticket, UserPlus, Users } from 'lucide-react';
import { Button } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { useDevTools } from '@/state/devTools';
import { go, useNavSub, useNavTab } from '@/ui/nav/router';
import { isSocialError, normalizeCode, socialService, validCredentials, type Club } from '@/social';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { EmptyState, Seg } from '../common/parts';
import { useIsPhone } from '../common/hooks';
import { SOCIAL_COPY as C, count } from './copy';
import { ClubAvatar, ErrorNote, NetworkError, Skeleton } from './parts';
import { ClubsTab, FriendsTab, LeaderboardsTab, OverviewTab, SOCIAL_TABS, TradingTab, type SocialTab } from './tabs';
import { loadSocialUser, markSocialSeen, setSocialUser, useSocial, useSocialQuery } from './socialStore';
import '@/ui/styles/social.css';

export function SocialPanel() {
  const target = useUI((s) => s.panelTarget);
  const user = useSocial((s) => s.user);
  const offline = useSocial((s) => s.offline);
  const phone = useIsPhone();
  const { maximised } = useSheet();
  const [tab, setTab] = useState<SocialTab>('overview');
  const [join, setJoin] = useState<string | null>(null);
  const [focusSearch, setFocusSearch] = useState(false);

  useEffect(() => {
    void loadSocialUser();
  }, []);
  // Social open and signed in: its trades and club news are seen (the dot goes)
  useEffect(() => {
    if (user) void markSocialSeen();
  }, [user]);

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('tab:')) {
      const t = target.slice(4) as SocialTab;
      setTab(SOCIAL_TABS.includes(t) ? t : 'overview');
      setJoin(null);
    } else if (target.startsWith('join:') && target.length > 5) {
      setJoin(normalizeCode(target.slice(5)));
      setTab('clubs');
    }
    setFocusSearch(false);
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  useNavTab('social', tab);
  useNavSub('social', join ? `join:${join}` : null);

  const pick = (t: SocialTab) => {
    setJoin(null);
    setFocusSearch(false);
    setTab(t);
  };

  return (
    <PanelLayout
      title={C.title}
      icon={<Globe size={20} />}
      subtitle={user ? C.subtitleIn(user.email) : C.subtitleOut}
      scrollKey={`${user ? tab : 'out'}:${join ?? ''}`}
      toolbar={
        user ? (
          <Seg<SocialTab>
            label="Social section"
            tabs
            value={tab}
            onChange={pick}
            testIdPrefix="social-tab-"
            size={phone ? 'sm' : 'md'}
            items={SOCIAL_TABS.map((id) => ({ id, label: C.tabs[id] }))}
          />
        ) : undefined
      }
    >
      <div className="so-panel" data-testid="social-body">
        {user === undefined ? (
          <Skeleton rows={4} tall />
        ) : !user ? (
          <SignedOut invite={join} offline={offline} />
        ) : join ? (
          <InviteView code={join} />
        ) : tab === 'overview' ? (
          <OverviewTab
            two={maximised && !phone}
            onInvite={() => {
              setTab('clubs');
              setFocusSearch(true);
            }}
          />
        ) : tab === 'clubs' ? (
          <ClubsTab focusSearch={focusSearch} />
        ) : tab === 'trading' ? (
          <TradingTab />
        ) : tab === 'friends' ? (
          <FriendsTab />
        ) : (
          <LeaderboardsTab />
        )}
      </div>
    </PanelLayout>
  );
}

// ───────────────────────────── signed out (§13.2) ─────────────────────────────

function SignedOut({ invite, offline }: { invite: string | null; offline: boolean }) {
  const [inv] = useSocialQuery(() => (invite ? socialService().resolveInvite(invite) : Promise.resolve(null)), [invite]);
  if (invite && inv.state === 'loading') return <Skeleton rows={4} tall />;
  if (invite && inv.state === 'ok' && !inv.data) return <Expired />;
  return (
    <>
      {invite && inv.state === 'ok' && inv.data && (
        <div className="so-callout" data-testid="social-invite-callout">
          <Users size={16} aria-hidden className="so-callout__icon" />
          <div>
            <div className="so-callout__title">{C.invitedTitle(inv.data.club.name)}</div>
            <div className="so-callout__text">{C.invitedText}</div>
          </div>
        </div>
      )}
      <SignInForm initialError={offline || (invite && inv.state === 'error' && inv.network) ? 'network' : null} />
    </>
  );
}

type FormError = 'credentials' | 'invite' | 'network' | null;

function SignInForm({ initialError }: { initialError: FormError }) {
  const devAllowed = useDevTools((s) => s.allowed);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<FormError>(initialError);
  const [busy, setBusy] = useState(false);

  const submit = async (create: boolean) => {
    if (!validCredentials(email, password)) {
      setError('credentials');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const u = create ? await socialService().signUp(email, password) : await socialService().signIn(email, password);
      setPassword(''); // the password lives only in this field while it's typed (SOC-002)
      setSocialUser(u);
      useUI.getState().toast(u.email, 'success', { label: create ? C.toastCreated : C.toastSignedIn, detail: C.toastSavesHere });
    } catch (e) {
      setError(isSocialError(e) && e.code === 'network' ? 'network' : 'credentials');
    } finally {
      setBusy(false);
    }
  };

  const joinGroup = async () => {
    setError(null);
    setBusy(true);
    try {
      const found = code.trim() ? await socialService().resolveInvite(code) : null;
      if (!found) setError('invite');
      else go({ kind: 'panel', panel: 'social', tab: 'clubs', target: `join:${normalizeCode(code)}` });
    } catch (e) {
      setError(isSocialError(e) && e.code === 'network' ? 'network' : 'invite');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(false);
  };

  return (
    <div className="so-signin">
      <h3 className="so-signin__title">{C.signInTitle}</h3>
      <p className="so-signin__text">{C.signInText}</p>
      {error && <ErrorNote>{error === 'credentials' ? C.errorCredentials : error === 'invite' ? C.errorInvite : C.errorNetwork}</ErrorNote>}
      <form className="so-form" onSubmit={onSubmit} noValidate>
        <label className="so-field">
          <span className="so-field__label">{C.email}</span>
          <input className="ag-input so-input" type="email" name="email" autoComplete="email" inputMode="email" placeholder={C.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="social-email" />
        </label>
        <label className="so-field">
          <span className="so-field__label">{C.password}</span>
          <input className="ag-input so-input" type="password" name="password" autoComplete="current-password" placeholder={C.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="social-password" />
        </label>
        <Button type="submit" variant="primary" size="lg" block disabled={busy} data-testid="social-signin">
          <LogIn size={17} aria-hidden /> {C.signIn}
        </Button>
        <Button block disabled={busy} onClick={() => void submit(true)} data-testid="social-signup">
          <UserPlus size={16} aria-hidden /> {C.createAccount}
        </Button>
      </form>
      <div className="so-divider" role="separator">
        <span>{C.haveInvite}</span>
      </div>
      <div className="so-invite">
        <input className="ag-input so-input" aria-label={C.invitePlaceholder} placeholder={C.invitePlaceholder} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void joinGroup()} autoCapitalize="characters" autoComplete="off" spellCheck={false} data-testid="social-invite-code" />
        <Button disabled={busy} onClick={() => void joinGroup()} data-testid="social-invite-join">
          <Users size={16} aria-hidden /> {C.joinGroup}
        </Button>
      </div>
      {devAllowed && <p className="so-hint">{C.devHint}</p>}
    </div>
  );
}

// ───────────────────────────── invites (§13.3) ─────────────────────────────

function Expired() {
  return (
    <div data-testid="social-invite-expired">
      <EmptyState icon={<Ticket size={28} />} title={C.expiredTitle} action={<Button variant="primary" onClick={() => go({ kind: 'panel', panel: 'social', tab: 'clubs' })}>{C.findClubs}</Button>}>
        {C.expiredText}
      </EmptyState>
    </div>
  );
}

function InviteView({ code }: { code: string }) {
  const [q] = useSocialQuery(() => socialService().resolveInvite(code), [code]);
  if (q.state === 'loading') return <Skeleton rows={3} tall />;
  if (q.state === 'error') return q.network ? <NetworkError /> : <Expired />;
  if (!q.data) return <Expired />;
  const { club, alreadyMember } = q.data;
  if (alreadyMember)
    return (
      <div data-testid="social-invite-member">
        <EmptyState icon={<ClubAvatar club={club} size={48} />} title={C.memberTitle(club.name)} action={<Button variant="primary" onClick={() => go({ kind: 'panel', panel: 'social', tab: 'clubs' })}>{C.openClub}</Button>}>
          {C.memberText}
        </EmptyState>
      </div>
    );
  return <JoinCard club={club} code={code} />;
}

function JoinCard({ club, code }: { club: Club; code: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const event = club.nextEvent ? `${club.nextEvent.title.toLowerCase()} on ${club.nextEvent.when}` : null;
  const join = async () => {
    setBusy(true);
    setError(false);
    try {
      await socialService().joinClub(club.id);
      go({ kind: 'panel', panel: 'social', tab: 'clubs' });
      useUI.getState().toast(C.youJoined(club.name), 'celebrate', { label: C.welcome, detail: C.welcomeDetail });
    } catch {
      setError(true);
      setBusy(false);
    }
  };
  return (
    <section className="so-join" data-testid="social-join-card">
      {error && <NetworkError />}
      <div className="so-join__head">
        <ClubAvatar club={club} size={56} />
        <div>
          <h3 className="so-join__title">{C.joinTitle(club.name)}</h3>
          <div className="so-join__meta">{C.joinMeta(code, count(club.members), event)}</div>
        </div>
      </div>
      <p className="so-join__text">{C.joinText}</p>
      <div className="so-join__actions">
        <Button variant="primary" disabled={busy} onClick={() => void join()} data-testid="social-join-club">
          <Users size={16} aria-hidden /> {C.joinClub}
        </Button>
        <Button variant="ghost" onClick={() => go({ kind: 'panel', panel: 'social' })} data-testid="social-not-now">
          {C.notNow}
        </Button>
      </div>
    </section>
  );
}
