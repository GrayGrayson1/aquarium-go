/**
 * The Social panel (0.5 spec §13), behind the SocialService interface: the local stub in dev mode and the e2e builds,
 * the Supabase service in the players' build once a project is configured (chunk 8, REL-025; the dock, More sheet and
 * router keep it out where neither exists). OWNER: lane "social".
 *
 * Signed out: "Bring your aquarium online" with the sign-in form and the invite field (§13.2); "Create account" opens
 * sign-up mode (chunk 8: the name friends see, a club's invite code, the 13-and-over box and the privacy note; ADR-0039,
 * ADR-0040, ADR-0041), and signing up with an invite lands on the Overview, in that club. Signed in: Overview ·
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
import { isSocialError, normalizeCode, socialService, validCredentials, validDisplayName, type Club, type SocialErrorCode } from '@/social';
import { useSocialStub } from '@/ui/online/mode';
import { PanelLayout, useSheet } from '../common/PanelLayout';
import { EmptyState, Seg } from '../common/parts';
import { useIsPhone } from '../common/hooks';
import { SOCIAL_COPY as C, count } from './copy';
import { ClubAvatar, ErrorNote, NetworkError, PrivacyLink, Skeleton } from './parts';
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

  // chunk 8: every time Social opens, ask who is signed in (the online save asked when the game started; the
  // connection, or the account, may have changed since)
  useEffect(() => {
    void loadSocialUser(true);
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
      <SignInForm initialError={offline || (invite && inv.state === 'error' && inv.network) ? 'network' : null} inviteCode={invite && inv.state === 'ok' && inv.data ? invite : null} />
    </>
  );
}

/** What the form says went wrong (chunk 8: `wrong` is a real account check; `signUpInvite` the sign-up code). */
type FormError = 'credentials' | 'wrong' | 'invite' | 'signUpInvite' | 'age' | 'name' | 'taken' | 'network' | null;

const FORM_ERRORS: Record<Exclude<FormError, null>, string> = {
  credentials: C.errorCredentials,
  wrong: C.errorWrongPassword,
  invite: C.errorInvite,
  signUpInvite: C.errorSignUpInvite,
  age: C.errorAge,
  name: C.errorName,
  taken: C.errorTaken,
  network: C.errorNetwork,
};

/** A failed sign-in or sign-up, as the form words it (ADR-0040 decision 3). */
function formErrorOf(e: unknown, signUp: boolean): Exclude<FormError, null> {
  const code: SocialErrorCode = isSocialError(e) ? e.code : 'network';
  if (code === 'network') return 'network';
  if (!signUp) return code === 'credentials' ? 'wrong' : 'credentials';
  if (code === 'invite') return 'signUpInvite';
  if (code === 'age' || code === 'name' || code === 'taken') return code;
  return 'credentials';
}

/** The signed-out form. `startInSignUp`: open in sign-up mode (tests; the panel always starts on sign-in). */
export function SignInForm({ initialError, inviteCode, startInSignUp = false }: { initialError: FormError; inviteCode: string | null; startInSignUp?: boolean }) {
  const devAllowed = useDevTools((s) => s.allowed);
  const stub = useSocialStub(); // chunk 8 — the dev hint describes the stub only
  const [signUp, setSignUp] = useState(startInSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signUpCode, setSignUpCode] = useState(inviteCode ?? '');
  const [ageOk, setAgeOk] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<FormError>(initialError);
  const [busy, setBusy] = useState(false);
  // an invite link fills in the sign-up code (ADR-0041 decision 1)
  useEffect(() => {
    if (inviteCode) setSignUpCode(inviteCode);
  }, [inviteCode]);

  const submitSignIn = async () => {
    if (!validCredentials(email, password)) {
      setError('credentials');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const u = await socialService().signIn(email, password);
      setPassword(''); // the password lives only in this field while it's typed (SOC-002)
      setSocialUser(u);
      useUI.getState().toast(u.email, 'success', { label: C.toastSignedIn, detail: C.toastSavesHere });
    } catch (e) {
      setError(formErrorOf(e, false));
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async () => {
    // the form's own checks first, in its order; the server checks the code, the box and the name again
    const local: FormError = !validCredentials(email, password) ? 'credentials' : !validDisplayName(name) ? 'name' : !ageOk ? 'age' : !signUpCode.trim() ? 'signUpInvite' : null;
    if (local) {
      setError(local);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const u = await socialService().signUp(email, password, { displayName: name, inviteCode: signUpCode, ageConfirmed: ageOk });
      setPassword('');
      setSocialUser(u);
      useUI.getState().toast(u.email, 'success', { label: C.toastCreated, detail: C.toastSavesHere });
      if (inviteCode) go({ kind: 'panel', panel: 'social' }); // the invite's club is joined: the Overview shows it
    } catch (e) {
      setError(formErrorOf(e, true));
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
    void (signUp ? submitSignUp() : submitSignIn());
  };
  const switchMode = (to: boolean) => {
    setSignUp(to);
    setError(null);
  };

  return (
    <div className="so-signin">
      <h3 className="so-signin__title">{C.signInTitle}</h3>
      <p className="so-signin__text">{C.signInText}</p>
      {error && <ErrorNote>{FORM_ERRORS[error]}</ErrorNote>}
      <form className="so-form" onSubmit={onSubmit} noValidate data-testid={signUp ? 'social-signup-form' : 'social-signin-form'}>
        <label className="so-field">
          <span className="so-field__label">{C.email}</span>
          <input className="ag-input so-input" type="email" name="email" autoComplete="email" inputMode="email" placeholder={C.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="social-email" />
        </label>
        <label className="so-field">
          <span className="so-field__label">{C.password}</span>
          <input className="ag-input so-input" type="password" name="password" autoComplete={signUp ? 'new-password' : 'current-password'} placeholder={C.passwordPlaceholder} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="social-password" />
        </label>
        {signUp ? (
          <>
            <label className="so-field">
              <span className="so-field__label">{C.nameLabel}</span>
              <input className="ag-input so-input" type="text" name="nickname" autoComplete="nickname" maxLength={30} placeholder={C.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} data-testid="social-name" />
            </label>
            <label className="so-field">
              <span className="so-field__label">{C.inviteLabel}</span>
              <input className="ag-input so-input" type="text" name="invite" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} placeholder={C.inviteCodePlaceholder} value={signUpCode} onChange={(e) => setSignUpCode(e.target.value)} data-testid="social-signup-code" />
            </label>
            <label className="so-check">
              <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} data-testid="social-age" />
              <span>{C.ageCheck}</span>
            </label>
            <PrivacyLink />
            <Button type="submit" variant="primary" size="lg" block disabled={busy} data-testid="social-signup-submit">
              <UserPlus size={16} aria-hidden /> {C.createAccount}
            </Button>
            <button type="button" className="pn-link so-back" onClick={() => switchMode(false)} data-testid="social-back-signin">
              {C.backToSignIn}
            </button>
          </>
        ) : (
          <>
            <Button type="submit" variant="primary" size="lg" block disabled={busy} data-testid="social-signin">
              <LogIn size={17} aria-hidden /> {C.signIn}
            </Button>
            <p className="so-hint" data-testid="social-forgot">
              {C.forgotPassword}
            </p>
            <Button block disabled={busy} onClick={() => switchMode(true)} data-testid="social-signup">
              <UserPlus size={16} aria-hidden /> {C.createAccount}
            </Button>
          </>
        )}
      </form>
      {!signUp && (
        <>
          <div className="so-divider" role="separator">
            <span>{C.haveInvite}</span>
          </div>
          <div className="so-invite">
            <input className="ag-input so-input" aria-label={C.invitePlaceholder} placeholder={C.invitePlaceholder} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void joinGroup()} autoCapitalize="characters" autoComplete="off" spellCheck={false} data-testid="social-invite-code" />
            <Button disabled={busy} onClick={() => void joinGroup()} data-testid="social-invite-join">
              <Users size={16} aria-hidden /> {C.joinGroup}
            </Button>
          </div>
        </>
      )}
      {devAllowed && stub && <p className="so-hint">{C.devHint}</p>}
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
      // the club-show line only for a club with an event (the stub's samples; ONLINE-STAGE1.md §7.2)
      useUI.getState().toast(C.youJoined(club.name), 'celebrate', { label: C.welcome, ...(club.nextEvent ? { detail: C.welcomeDetail } : {}) });
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
