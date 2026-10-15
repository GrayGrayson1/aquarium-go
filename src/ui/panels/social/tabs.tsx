/**
 * Social's signed-in tabs (0.5 spec §13.4–§13.5): Overview (four cards and Sign out), Clubs (search, your club,
 * suggestions), Trading (the coral hero and the trades), Friends (add by code, the snapshot grid) and Leaderboards.
 * OWNER: lane "social".
 */
import { useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { ArrowLeftRight, Check, Heart, Plus, Search, Sparkles, Users, UserPlus } from 'lucide-react';
import { Button } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { go } from '@/ui/nav/router';
import { isSocialError, looksLikeInvite, normalizeCode, socialService, type Club } from '@/social';
import { SOCIAL_COPY as C, count } from './copy';
import { ClubAvatar, ComingSoon, ErrorNote, FriendGrid, Leaderboard, MemberClub, NetworkError, NoClub, Skeleton, SoCard, TradeList, useFocusOnce } from './parts';
import { setSocialUser, useSocialQuery } from './socialStore';

export type SocialTab = 'overview' | 'clubs' | 'trading' | 'friends' | 'leaderboards';
export const SOCIAL_TABS: readonly SocialTab[] = ['overview', 'clubs', 'trading', 'friends', 'leaderboards'];

const toTab = (tab: SocialTab) => go(tab === 'overview' ? { kind: 'panel', panel: 'social' } : { kind: 'panel', panel: 'social', tab });

export function OverviewTab({ two, onInvite }: { two: boolean; onInvite: () => void }) {
  const [clubs] = useSocialQuery(() => socialService().clubs(), []);
  const [trades] = useSocialQuery(() => socialService().trades(), []);
  const [friends] = useSocialQuery(() => socialService().friendsAquariums(), []);
  const [soon, setSoon] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState(false);
  const signOut = async () => {
    setLeaving(true);
    try {
      await socialService().signOut();
      setSocialUser(null);
    } catch {
      setError(true);
      setLeaving(false);
    }
  };
  return (
    <div className={clsx('so-overview', two && 'so-overview--two')} data-testid="social-overview">
      {error && <NetworkError />}
      <div className="so-col">
        <SoCard title={C.yourClub} icon={<Users size={14} />} action={{ label: C.findClubs, onClick: () => toTab('clubs') }} testId="social-your-club">
          {clubs.state === 'loading' && <Skeleton rows={2} tall />}
          {clubs.state === 'error' && <NetworkError />}
          {clubs.state === 'ok' && (clubs.data.mine.length ? clubs.data.mine.map((c) => <MemberClub key={c.id} club={c} />) : <NoClub onFind={() => toTab('clubs')} onInvite={onInvite} />)}
        </SoCard>
        <SoCard title={C.tradingCircle} icon={<ArrowLeftRight size={14} />} action={{ label: C.allTrades, onClick: () => toTab('trading') }} testId="social-trading-card">
          {trades.state === 'loading' && <Skeleton rows={3} />}
          {trades.state === 'error' && <NetworkError />}
          {trades.state === 'ok' && <TradeList trades={trades.data.slice(0, 3)} onView={() => setSoon(true)} />}
        </SoCard>
      </div>
      <div className="so-col">
        <SoCard title={C.friendsAquariums} icon={<Heart size={14} />} action={{ label: C.allFriends, onClick: () => toTab('friends') }} testId="social-friends-card">
          {friends.state === 'loading' && <Skeleton rows={2} tall />}
          {friends.state === 'error' && <NetworkError />}
          {friends.state === 'ok' && <FriendGrid friends={friends.data.slice(0, 3)} />}
        </SoCard>
        <Leaderboard />
      </div>
      <div className="so-signout">
        <Button variant="ghost" onClick={signOut} disabled={leaving} data-testid="social-signout">
          {C.signOut}
        </Button>
      </div>
      <ComingSoon open={soon} onClose={() => setSoon(false)} />
    </div>
  );
}

export function ClubsTab({ focusSearch }: { focusSearch: boolean }) {
  const [q] = useSocialQuery(() => socialService().clubs(), []);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState<string | null>(null);
  const [joinedNow, setJoinedNow] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState(false);
  useFocusOnce('social-search', focusSearch);
  const term = search.trim().toLowerCase();
  const invite = looksLikeInvite(search);
  const matches = (c: Club) => !term || invite || c.name.toLowerCase().includes(term) || c.blurb.toLowerCase().includes(term);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invite) go({ kind: 'panel', panel: 'social', tab: 'clubs', target: `join:${normalizeCode(search)}` });
  };
  const join = async (c: Club) => {
    setJoining(c.id);
    setError(false);
    try {
      await socialService().joinClub(c.id);
      setJoinedNow((s) => new Set([...s, c.id]));
      useUI.getState().toast(C.youJoined(c.name), 'success');
    } catch (e) {
      setError(isSocialError(e) && e.code === 'network');
    } finally {
      setJoining(null);
    }
  };
  const suggested = q.state === 'ok' ? q.data.suggested.filter(matches) : [];
  return (
    <div className="so-tab" data-testid="social-clubs">
      <form className="so-search" role="search" onSubmit={onSubmit}>
        <Search size={16} aria-hidden className="so-search__icon" />
        <input
          id="social-search"
          className="ag-input so-input so-search__input"
          type="search"
          enterKeyHint="go"
          aria-label={C.searchPlaceholder}
          placeholder={C.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="social-search"
        />
      </form>
      {error && <NetworkError />}
      <h3 className="so-section">
        <Users size={14} aria-hidden /> {C.yourClub}
      </h3>
      {q.state === 'loading' && <Skeleton rows={2} tall />}
      {q.state === 'error' && <NetworkError />}
      {q.state === 'ok' && (q.data.mine.length ? q.data.mine.map((c) => <div key={c.id} className="so-card so-card--plain"><MemberClub club={c} /></div>) : <div className="so-card so-card--plain"><NoClub onFind={() => document.getElementById('social-search')?.focus()} /></div>)}
      <h3 className="so-section">
        <Sparkles size={14} aria-hidden /> {C.suggested}
      </h3>
      {q.state === 'loading' && <Skeleton rows={3} />}
      {q.state === 'ok' && (
        <>
          <ul className="so-clubs">
            {suggested.map((c) => {
              const done = joinedNow.has(c.id);
              return (
                <li key={c.id} className="so-suggest" data-testid={`social-club-${c.id}`}>
                  <ClubAvatar club={c} size={40} />
                  <div className="so-suggest__text">
                    <div className="so-suggest__name">{c.name}</div>
                    <div className="so-suggest__meta">
                      {count(c.members)} members · {c.blurb}
                    </div>
                  </div>
                  <Button size="sm" className={clsx('so-suggest__btn', done && 'is-joined')} disabled={done || joining === c.id} onClick={() => join(c)} data-testid={`social-club-join-${c.id}`}>
                    {done ? <Check size={14} aria-hidden /> : <Plus size={14} aria-hidden />} {done ? C.joined : C.join}
                  </Button>
                </li>
              );
            })}
          </ul>
          {term && !invite && !suggested.length && (
            <p className="so-nomatch" data-testid="social-nomatch">
              {C.noMatch(search.trim())}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function TradingTab() {
  const [trades] = useSocialQuery(() => socialService().trades(), []);
  const [soon, setSoon] = useState(false);
  return (
    <div className="so-tab" data-testid="social-trading">
      <section className="so-hero">
        <h3 className="so-hero__title">{C.tradeHeroTitle}</h3>
        <p className="so-hero__text">{C.tradeHeroText}</p>
        <Button variant="coral" onClick={() => setSoon(true)} data-testid="social-offer-trade">
          <ArrowLeftRight size={15} aria-hidden /> {C.offerTrade}
        </Button>
      </section>
      <div className="so-card so-card--plain">
        {trades.state === 'loading' && <Skeleton rows={3} />}
        {trades.state === 'error' && <NetworkError />}
        {trades.state === 'ok' && <TradeList trades={trades.data} onView={() => setSoon(true)} />}
      </div>
      <ComingSoon open={soon} onClose={() => setSoon(false)} />
    </div>
  );
}

export function FriendsTab() {
  const [friends] = useSocialQuery(() => socialService().friendsAquariums(), []);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'invalid' | 'network' | null>(null);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await socialService().addFriend(code);
      useUI.getState().toast(normalizeCode(code), 'success', { label: C.requestSent, detail: C.requestSentDetail });
      setCode('');
    } catch (err) {
      setError(isSocialError(err) && err.code === 'network' ? 'network' : 'invalid');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="so-tab" data-testid="social-friends">
      <form className="so-addfriend" onSubmit={add}>
        <input className="ag-input so-input" aria-label={C.friendCodePlaceholder} placeholder={C.friendCodePlaceholder} value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} data-testid="social-friend-code" />
        <Button type="submit" disabled={busy} data-testid="social-add-friend">
          <UserPlus size={15} aria-hidden /> {C.addFriend}
        </Button>
      </form>
      {error === 'invalid' && <ErrorNote>{C.errorFriend}</ErrorNote>}
      {error === 'network' && <NetworkError />}
      {friends.state === 'loading' && <Skeleton rows={4} tall />}
      {friends.state === 'error' && <NetworkError />}
      {friends.state === 'ok' && <FriendGrid friends={friends.data} testId="social-friend-grid" />}
      <p className="so-note">{C.snapshotsNote}</p>
    </div>
  );
}

export function LeaderboardsTab() {
  return (
    <div className="so-tab" data-testid="social-leaderboards">
      <Leaderboard wide />
    </div>
  );
}
