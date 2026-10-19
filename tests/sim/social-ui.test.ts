/**
 * lane:social (chunk 6; 0.5 spec §5.3, §5.4, §13, §16; DES-010, SOC-003 to SOC-005, SOC-007, SOC-010, SOC-011;
 * ADR-0028, ADR-0034; B-152) — the Social panel's copy (curly apostrophes, the em dash), its server-rendered pieces,
 * the dock item and More tile with their dots, the stub-only club-show reminder, and the router's gate.
 * Chunk 8 (ADR-0038 to ADR-0041; REL-025, REL-028, REL-030, REL-031): Social shows where `socialAvailable()` (the
 * dock, More and router tests take that, not dev mode, on purpose: SOC-011's dev-only criteria are superseded by
 * REL-025); the approved sign-up, account, online-save and Social text changes are pinned; sign-up mode, friend
 * requests, the owner's invite link, the no-likes tile and Settings › Account render. This file runs with no project
 * configured (`@/social/project` mocked to null), so "Social unavailable" means dev tools off; online-mode.test.ts
 * covers a configured project.
 * Components are server-rendered, as in ui-copy-05; stores are copied into their initial state first.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useDevTools } from '@/state/devTools';
import { newGame } from '@/sim/newGame';
import { SignInForm, SocialPanel } from '@/ui/panels/social/SocialPanel';
import { AccountTab, onlineLine } from '@/ui/settings/AccountTab';
import { SOCIAL_COPY as C, lbValue, monthName } from '@/ui/panels/social/copy';
import { FriendGrid, FriendRequestList, LeaderboardRows, MemberClub, NetworkError, NoClub, PrivacyLink, Skeleton, TradeList } from '@/ui/panels/social/parts';
import { useSocial } from '@/ui/panels/social/socialStore';
import { DOCK_ITEMS, dockItems } from '@/ui/hud/Dock';
import { MoreSheetBody } from '@/ui/hud/MoreSheet';
import { navDots } from '@/ui/common/notify';
import { parseNav } from '@/ui/nav/router';
import { checkClubReminder, clubReminderPlan, resetClubReminder } from '@/ui/notify/clubReminder';
import { deliverPlanned } from '@/ui/notify/deliver';
import { createLocalSocialStub, provideSocialService, type Club } from '@/social';
import { CLUBS, FRIENDS, TRADES } from '@/social/data';
import type { GameState } from '@/types';

vi.mock('@/ui/notify/deliver', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/ui/notify/deliver')>()), deliverPlanned: vi.fn(() => true) }));
// chunk 8 — no project configured: without the dev tools, Social doesn't exist (online-mode.test.ts has the rest)
vi.mock('@/social/project', () => ({ ONLINE_PROJECT: null }));

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const setSocial = (patch: Partial<ReturnType<typeof useSocial.getState>>) => {
  useSocial.setState(patch);
  Object.assign(useSocial.getInitialState(), useSocial.getState());
};
const highland = { ...CLUBS[0], joined: '2026-10' } as Club;

describe('DES-010: every Social string as §13 and the owner’s answers write it', () => {
  it('§13.1–§13.2: panel, sign-in, errors, toasts and the dev-mode hint', () => {
    expect([C.title, C.subtitleOut, C.subtitleIn('you@example.com')]).toEqual(['Social', 'Clubs, trading, friends and leaderboards', 'Signed in as you@example.com']);
    expect(Object.values(C.tabs)).toEqual(['Overview', 'Clubs', 'Trading', 'Friends', 'Leaderboards']);
    expect(C.signInTitle).toBe('Bring your aquarium online');
    expect(C.signInText).toBe('Your game stays on this device and keeps working offline. An account adds clubs, trading circles, friends’ aquariums and weekly leaderboards.');
    expect([C.emailPlaceholder, C.passwordPlaceholder, C.signIn, C.createAccount, C.haveInvite, C.invitePlaceholder, C.joinGroup]).toEqual(['you@example.com', 'At least 8 characters', 'Sign in', 'Create account', 'Have an invite?', 'Invite code, e.g. HIGHLAND-4821', 'Join group']);
    expect(C.errorCredentials).toBe('Enter your email and a password of at least 8 characters.');
    expect(C.errorInvite).toBe('That invite code didn’t match a club. Check it and try again.');
    expect(C.errorNetwork).toBe('Can’t reach Aquarium Go online right now. Your game is fine — try again in a moment.');
    expect([C.toastSignedIn, C.toastCreated, C.toastSavesHere]).toEqual(['Signed in', 'Account created', 'Your aquarium still saves on this device.']);
    expect(C.devHint).toBe('Prototype: any email with an @ and a password of 8+ characters signs you in.');
  });

  it('§13.3: the four invite states and the welcome toast', () => {
    expect([C.invitedTitle('Highland Betta Club'), C.invitedText]).toEqual(['You’re invited to Highland Betta Club', 'Sign in or create an account to join. Your game stays on this device either way.']);
    expect([C.joinTitle('Highland Betta Club'), C.joinMeta('HIGHLAND-4821', '128', 'club show on Saturday')]).toEqual(['Join Highland Betta Club?', 'Invite HIGHLAND-4821 · 128 members · club show on Saturday']);
    // chunk 8 (ADR-0040 decision 4) — changed on purpose: no trading or leaving a club yet
    expect(C.joinText).toBe('Members see each other’s aquariums and share a leaderboard.');
    expect([C.joinClub, C.notNow, C.welcome, C.youJoined('Highland Betta Club'), C.welcomeDetail]).toEqual(['Join club', 'Not now', 'Welcome', 'You joined Highland Betta Club', 'Club show on Saturday — entries close Friday.']);
    expect([C.memberTitle('Highland Betta Club'), C.memberText, C.openClub]).toEqual(['You’re in Highland Betta Club', 'This invite has already been used on your account.', 'Open club']);
    expect([C.expiredTitle, C.expiredText, C.findClubs]).toEqual(['This invite has expired', 'Ask the club for a new code, or browse clubs you can join right away.', 'Find clubs']);
  });

  it('§13.4–§13.5, ADR-0028 and ADR-0034: overview, tabs, empty lists, the note, Add friend, search, units, dots', () => {
    expect([C.yourClub, C.member, C.clubRowMeta('128', 'October'), C.clubShowStrip('Saturday', 12), C.enter]).toEqual(['Your club', 'Member', '128 members · you joined in October', 'Club show on Saturday · 12 entries so far', 'Enter']);
    expect([C.noClubTitle, C.noClubText, C.useInvite]).toEqual(['No club yet', 'Clubs share show dates, trades and advice.', 'Use an invite']);
    expect([C.tradingCircle, C.allTrades, C.view, C.friendsAquariums, C.allFriends, C.leaderboardTitle]).toEqual(['Trading circle', 'All trades', 'View', 'Friends’ aquariums', 'All friends', 'This week’s leaderboard']);
    expect(Object.values(C.lbKinds)).toEqual(['Collection value', 'Prismatics', 'Show wins']);
    expect([C.you('My Aquarium'), C.signOut]).toEqual(['You · My Aquarium', 'Sign out']);
    expect([C.noTradesTitle, C.noTradesText, C.noFriendsTitle, C.noFriendsText]).toEqual(['No trades yet', 'Trades you start or accept appear here.', 'No friends yet', 'Friends you add appear here.']);
    expect([C.searchPlaceholder, C.suggested, C.join, C.joined]).toEqual(['Search clubs or paste an invite code', 'Suggested for you', 'Join', 'Joined']);
    expect([C.tradeHeroTitle, C.tradeHeroText, C.offerTrade]).toEqual(['Trade with your circle', 'Offer an animal, ask for one, or both. Trades settle the next time both games are online.', 'Offer a trade']);
    expect([C.friendCodePlaceholder, C.addFriend, C.snapshotsNote]).toEqual(['Friend code, e.g. MYAQUA-7Q2', 'Add friend', 'Visits are read-only snapshots: friends see your tanks as they were when you last went online.']);
    // chunk 8 (ADR-0040 decision 4) — the trades note changed on purpose: Aquarium Go online exists now, trading doesn't
    expect([C.soonTitle, C.soonText, C.close]).toEqual(['Trades open later', 'Trading isn’t open yet. Nothing was offered, and your animals stay in your aquarium.', 'Close']);
    expect([C.requestSent, C.requestSentDetail, C.errorFriend]).toEqual(['Request sent', 'Their aquarium shows here once they accept.', 'That friend code didn’t match anyone. Check it and try again.']);
    expect(C.noMatch('reef')).toBe('No clubs match “reef”. Check the spelling, or paste an invite code.');
    expect([lbValue('collection_value', 214900), lbValue('prismatics', 4), lbValue('prismatics', 1), lbValue('show_wins', 1), lbValue('show_wins', 9)]).toEqual(['$214,900', '4 Prismatic', '1 Prismatic', '1 win', '9 wins']);
    expect([C.dotNew, C.dotNews]).toEqual(['New', 'New trades and club news']);
    expect(C.reminderBody('Saturday', 'Friday')).toBe('Club show on Saturday. Entries close Friday.');
    expect([monthName('2026-10'), monthName('2026-01'), monthName('2026-13'), monthName(undefined)]).toEqual(['October', 'January', null, null]);
  });

  it('chunk 8: sign-up, the errors and the forgot-password line (ADR-0039, ADR-0040 decision 3, ADR-0041 decision 1)', () => {
    expect([C.nameLabel, C.namePlaceholder, C.inviteLabel, C.inviteCodePlaceholder, C.backToSignIn]).toEqual(['Name friends see', 'e.g. Sam', 'Invite code', 'From your invite link', 'Back to sign in']);
    expect(C.ageCheck).toBe('I’m 13 or older, or I’m a parent or guardian signing up for my child.');
    expect([C.errorSignUpInvite, C.errorAge, C.errorName, C.errorTaken, C.errorWrongPassword]).toEqual([
      'That invite code didn’t work. Ask whoever invited you for their link.',
      'Tick the box to confirm your age.',
      'Enter a name of 1 to 30 characters.',
      'An account with that email already exists. Sign in instead.',
      'That email and password don’t match an account.',
    ]);
    expect(C.forgotPassword).toBe('Forgot your password? Ask whoever invited you.');
  });

  it('chunk 8: the privacy note, verbatim (ADR-0039 decision 3; "Settings > Account" with the screen’s arrows)', () => {
    expect(C.privacyTitle).toBe('Your account and your data');
    expect([...C.privacyIntro, ...C.privacyStores, C.privacyWhy, C.privacyDelete].join(' ')).toBe(
      'Without an account, nothing leaves your device. If you sign up, Aquarium Go’s server (run by Supabase, in the United States) stores: ' +
        'your email and password (the password is stored scrambled; nobody can read it) your display name and friend code your save, so it follows you to another device ' +
        'a picture of your aquarium and your leaderboard numbers, which your friends and club members see ' +
        'Why: to sign you in, keep your save safe and show your aquarium to friends. No ads, no selling, no tracking, and we don’t send emails. ' +
        'Settings › Account › Delete my account removes all of it at once. Questions? Ask whoever invited you.',
    );
    expect(C.privacyStores).toHaveLength(4);
  });

  it('chunk 8: Settings › Account and Delete my account (ADR-0040 decision 3, ADR-0041 decisions 2–3)', () => {
    expect([C.accountTab, C.accountNameCode('Sam', 'SAM-7Q2'), C.accountSignedOut, C.openSocial, C.deleteAccount]).toEqual(['Account', 'Name friends see: Sam · Friend code SAM-7Q2', 'Sign in from Social to save your aquarium online and see friends.', 'Open Social', 'Delete my account']);
    expect([C.savingOnline, C.savedOnline('2 min ago'), C.notSavedOnline, C.onlineUnreachable, C.onlineTooNew]).toEqual([
      'Saving online…',
      'Saved online 2 min ago',
      'Not saved online yet',
      'Can’t reach Aquarium Go online. Your game still saves on this device.',
      'Your online save comes from a newer version of Aquarium Go. Refresh the page to update.',
    ]);
    expect([C.deleteTitle, C.deleteBody, C.cancel, C.toastDeleted, C.toastDeletedDetail]).toEqual([
      'Delete your account?',
      'This removes your account, online save, friends and clubs from Aquarium Go’s server. The game on this device stays.',
      'Cancel',
      'Account deleted',
      'Your game is still on this device.',
    ]);
  });

  it('chunk 8: the online-save box (ADR-0040 decision 4, ADR-0041 decision 4)', () => {
    expect([C.cloudNewer, C.cloudBoth, C.cloudOther, C.keepDevice, C.loadOnline]).toEqual(['A newer save is online', 'Your aquarium changed on two devices', 'Your account has a different aquarium online', 'Keep this device’s', 'Load online save']);
    expect(C.cardDevice('Coral Corner', 12, '$4,210', 'just now')).toBe('On this device · Coral Corner · Day 12 · $4,210 · saved just now');
    expect(C.cardOnline('Coral Corner', 15, '$5,880', '3 h ago')).toBe('Online · Coral Corner · Day 15 · $5,880 · saved 3 h ago');
    expect(C.cloudNote).toBe('If you load the online save, this device’s copy stays in Settings › Saves as Previous autosave.');
  });

  it('chunk 8: friend requests and the owner’s club controls (ADR-0040 decision 4, ADR-0041 decision 5)', () => {
    expect([C.friendRequests, C.requestRow('Sam'), C.accept]).toEqual(['Friend requests', 'Sam added you', 'Accept']);
    expect([C.createClubTitle, C.clubNameLabel, C.clubAboutLabel, C.createClub, C.errorClubName]).toEqual(['Create a club', 'Club name', 'What it’s about (optional)', 'Create club', 'Enter a club name of 2 to 40 characters.']);
    expect([C.toastClubCreated, C.toastClubCreatedDetail, C.inviteLink('FRIENDS-4821'), C.copyLink, C.linkCopied]).toEqual(['Club created', 'Copy its invite link to bring friends in.', 'Invite link FRIENDS-4821', 'Copy link', 'Link copied']);
  });

  it('chunk 8: every new string uses curly apostrophes and quotes (§16)', () => {
    const all = JSON.stringify(Object.values(C).map((v) => (typeof v === 'function' ? (v as (...a: string[]) => string)('x', 'y', 'z', 'w') : v)));
    expect(all).not.toMatch(/[a-z]'[a-z]/i);
  });
});

describe('the panel, server-rendered (SOC-003, SOC-005)', () => {
  beforeAll(() => {
    useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Copy', seed: 9 }));
    Object.assign(useGame.getInitialState(), useGame.getState());
  });
  afterAll(() => {
    Object.assign(useGame.getInitialState(), { game: null });
    setSocial({ user: undefined, offline: false });
    useDevTools.setState({ allowed: true });
  });

  it('signed out: the sign-in form with its fields, types and autocomplete, the invite field and the dev hint', () => {
    setSocial({ user: null });
    const out = html(createElement(SocialPanel));
    const t = text(out);
    expect(t).toContain('Social');
    expect(t).toContain('Clubs, trading, friends and leaderboards');
    expect(t).toContain(C.signInTitle);
    expect(t).toContain(C.signInText);
    expect(out).toMatch(/type="email"[^>]*autocomplete="email"[^>]*placeholder="you@example.com"/i);
    expect(out).toMatch(/type="password"[^>]*autocomplete="current-password"[^>]*placeholder="At least 8 characters"/i);
    for (const id of ['social-email', 'social-password', 'social-signin', 'social-signup', 'social-invite-code', 'social-invite-join', 'social-forgot']) expect(out).toContain(`data-testid="${id}"`);
    expect(t).toContain(C.forgotPassword); // chunk 8 (ADR-0040 decision 3)
    expect(out).not.toContain('data-testid="social-name"'); // sign-up's fields only in sign-up mode
    expect(t).toContain('Sign in');
    expect(t).toContain('Create account');
    expect(t).toContain('Have an invite?');
    expect(out).toContain('placeholder="Invite code, e.g. HIGHLAND-4821"');
    expect(t).toContain('Join group');
    expect(t).toContain(C.devHint);
    expect(out).not.toContain('role="tablist"'); // no tabs signed out
  });

  it('chunk 8: sign-up mode adds the name, the invite code (filled from the link), the age box and the privacy link', () => {
    const out = html(createElement(SignInForm, { initialError: null, inviteCode: 'HIGHLAND-4821', startInSignUp: true }));
    const t = text(out);
    expect(out).toMatch(/data-testid="social-signup-form"/);
    expect(t).toContain('Name friends see');
    expect(out).toMatch(/autocomplete="nickname"[^>]*placeholder="e.g. Sam"/i);
    expect(t).toContain('Invite code');
    expect(out).toMatch(/placeholder="From your invite link"[^>]*value="HIGHLAND-4821"/);
    expect(out).toMatch(/type="checkbox"[^>]*data-testid="social-age"/);
    expect(t).toContain(C.ageCheck);
    expect(out).toContain('data-testid="social-privacy-link"');
    expect(t).toContain('Your account and your data');
    expect(out).toMatch(/type="password"[^>]*autocomplete="new-password"/i);
    expect(out).toContain('data-testid="social-signup-submit"');
    expect(t).toContain('Back to sign in');
    // the sign-in pieces step aside
    for (const id of ['social-signin', 'social-invite-code', 'social-forgot']) expect(out).not.toContain(`data-testid="${id}"`);
  });

  it('the hint shows only where the developer tools are allowed', () => {
    setSocial({ user: null });
    const allowed = (v: boolean) => {
      useDevTools.setState({ allowed: v });
      Object.assign(useDevTools.getInitialState(), { allowed: v });
    };
    allowed(false);
    expect(text(html(createElement(SocialPanel)))).not.toContain(C.devHint);
    allowed(true);
  });

  it('signed in: "Signed in as {email}", the five tabs as a tablist, skeletons while loading', () => {
    setSocial({ user: { id: 'u', email: 'you@example.com', displayName: 'you', friendCode: 'YOU-ABC' } });
    const out = html(createElement(SocialPanel));
    expect(text(out)).toContain('Signed in as you@example.com');
    expect(out).toContain('role="tablist"');
    expect([...out.matchAll(/data-testid="social-tab-([a-z]+)"/g)].map((m) => m[1])).toEqual(['overview', 'clubs', 'trading', 'friends', 'leaderboards']);
    expect(out).toContain('aria-busy="true"');
    expect(out).toContain('data-testid="social-signout"');
  });
});

describe('the overview’s pieces (SOC-007, SOC-010)', () => {
  it('a member’s club: avatar, name, members and the month joined, Member, the show strip with Enter', () => {
    const t = text(html(createElement(MemberClub, { club: highland })));
    expect(t).toBe('HB Highland Betta Club 128 members · you joined in October Member Club show on Saturday · 12 entries so far Enter');
  });

  it('no club: "No club yet" with Find clubs and a ghost Use an invite', () => {
    const out = html(createElement(NoClub, { onFind: () => {}, onInvite: () => {} }));
    expect(text(out)).toBe('No club yet Clubs share show dates, trades and advice. Find clubs Use an invite');
    expect(out).toContain('ag-btn--ghost');
  });

  it('three trades, each with View; an empty list says so (ADR-0028)', () => {
    const out = html(createElement(TradeList, { trades: TRADES, onView: () => {} }));
    expect([...out.matchAll(/>View</g)]).toHaveLength(3);
    expect(text(out)).toContain('Mara offers 2 Golden Bold-spotted Pea Puffers for your Red Veiltail Betta View');
    expect(text(html(createElement(TradeList, { trades: [], onView: () => {} })))).toBe('No trades yet Trades you start or accept appear here.');
  });

  it('friend tiles: a 16:10 snapshot, the title, "{gal} gal · {likes} likes" or "Public aquarium"; empty says so', () => {
    const out = html(createElement(FriendGrid, { friends: FRIENDS.slice(0, 3) }));
    expect([...out.matchAll(/<img /g)]).toHaveLength(3);
    expect(out).toContain('width="320" height="200"');
    const t = text(out);
    expect(t).toContain('Ola’s Grand Reef 1,000 gal · 48 likes');
    expect(t).toContain('The Ada Hall Public aquarium · 31 likes');
    expect(t).toContain('Jun’s axolotls 40 gal · 12 likes');
    expect(text(html(createElement(FriendGrid, { friends: [] })))).toBe('No friends yet Friends you add appear here.');
  });

  it('chunk 8: a tile with no likes (the real service) shows the size alone, without the heart (ADR-0040 decision 4)', () => {
    const out = html(createElement(FriendGrid, { friends: [{ ...FRIENDS[0], likes: null }, { ...FRIENDS[1], likes: null }] }));
    const t = text(out);
    expect(t).toContain('Ola’s Grand Reef 1,000 gal');
    expect(t).toContain('The Ada Hall Public aquarium');
    expect(t).not.toContain('likes');
    expect(out).not.toContain('so-friend__heart');
  });

  it('chunk 8: friend requests read "{name} added you" with Accept', () => {
    const out = html(createElement(FriendRequestList, { requests: [{ id: 'r1', name: 'Sam', createdAt: '2026-10-19T10:00:00Z' }, { id: 'r2', name: 'Ola', createdAt: '2026-10-19T09:00:00Z' }], busy: null, onAccept: () => {} }));
    expect(text(out)).toBe('Friend requests S Sam added you Accept O Ola added you Accept');
    expect([...out.matchAll(/data-testid="social-accept"/g)]).toHaveLength(2);
  });

  it('chunk 8: the owner’s own club shows its invite link with Copy link; other clubs don’t (ADR-0041 decision 5)', () => {
    const own = { ...highland, id: 'club-1', nextEvent: undefined, inviteCode: 'FRIENDS-4821', name: 'Aquarium Go Friends', initials: 'AG' } as Club;
    const t = text(html(createElement(MemberClub, { club: own })));
    expect(t).toBe('AG Aquarium Go Friends 128 members · you joined in October Member Invite link FRIENDS-4821 Copy link');
    expect(text(html(createElement(MemberClub, { club: highland })))).not.toContain('Invite link');
  });

  it('chunk 8: the privacy link is the note’s title', () => {
    expect(text(html(createElement(PrivacyLink)))).toBe('Your account and your data');
  });

  it('the leaderboard: the top four and the player’s highlighted row, or the player inside the four', () => {
    const rows = [
      { rank: 1, name: 'Ada Okafor', value: 214900 },
      { rank: 2, name: 'Ola Brandt', value: 188420 },
      { rank: 3, name: 'Priya Nair', value: 151030 },
      { rank: 4, name: 'Sam Duarte', value: 97610 },
    ];
    const out = html(createElement(LeaderboardRows, { kind: 'collection_value', rows, me: { rank: 38, name: 'My Aquarium', value: 5460, me: true } }));
    expect(text(out)).toBe('1 A Ada Okafor $214,900 2 O Ola Brandt $188,420 3 P Priya Nair $151,030 4 S Sam Duarte $97,610 38 M You · My Aquarium $5,460');
    expect([...out.matchAll(/is-me/g)]).toHaveLength(1);
    const inside = html(createElement(LeaderboardRows, { kind: 'show_wins', rows: [rows[0], { rank: 2, name: 'Hall', value: 1, me: true }, rows[1], rows[2]], me: { rank: 2, name: 'Hall', value: 1, me: true } }));
    expect([...inside.matchAll(/<li/g)]).toHaveLength(4);
    expect(text(inside)).toContain('2 H You · Hall 1 win');
  });

  it('loading is skeleton rows; a network failure is an alert', () => {
    expect(html(createElement(Skeleton, { rows: 3 }))).toMatch(/aria-busy="true"[^>]*data-testid="social-loading"/);
    const out = html(createElement(NetworkError));
    expect(out).toContain('role="alert"');
    expect(out).toContain('data-testid="social-error"');
    expect(text(out)).toBe(C.errorNetwork);
  });
});

describe('the dock and More sheet (SOC-004, SOC-011; B-152; chunk 8, REL-025)', () => {
  it('where Social exists: 11 items, Social between Shows and Build; otherwise 10, without Social', () => {
    expect(dockItems(true).map((it) => it.label)).toEqual(['Tanks', 'Livestock', 'Market', 'Visitors', 'Shows', 'Social', 'Build', 'Operations', 'Research', 'Finances', 'Encyclopedia']);
    expect(dockItems(false).map((it) => it.label)).toEqual(['Tanks', 'Livestock', 'Market', 'Visitors', 'Shows', 'Build', 'Operations', 'Research', 'Finances', 'Encyclopedia']);
    expect(DOCK_ITEMS.find((it) => it.id === 'social')).toMatchObject({ needsSocial: true, newUntilOpened: true });
  });

  it('More: a Social tile after Shows where Social exists, with a "New" tag while its dot says New', () => {
    const dots = { social: { level: 'new' as const, label: C.dotNew, target: null } };
    const out = html(createElement(MoreSheetBody, { isLocked: () => false, dots, social: true }));
    expect([...out.matchAll(/class="ag-more__label">([^<]+)</g)].map((m) => m[1])).toEqual(['Visitors', 'Shows', 'Social', 'Research', 'Finances', 'Encyclopedia']);
    expect(out).toContain('data-testid="more-social"');
    expect(out).toContain('data-testid="more-new-social"');
    expect(out).toContain('aria-label="Social — New"');
    expect(out).not.toContain('more-badge-social'); // the tag stands for the dot
    const opened = html(createElement(MoreSheetBody, { isLocked: () => false, dots: {}, social: true }));
    expect(opened).not.toContain('more-new-social');
    expect(html(createElement(MoreSheetBody, { isLocked: () => false, dots }))).not.toContain('more-social'); // where Social doesn't exist
  });

  describe('the Social dot', () => {
    let g: GameState;
    beforeAll(() => {
      g = newGame({ starterId: 'betta', starterName: 'Dot', seed: 3 });
    });
    it('shows "New" until Social is first opened, then goes', () => {
      expect(navDots(g, dockItems(true)).social).toEqual({ level: 'new', label: 'New', target: null });
      g.progress.tutorial.flags.opened_social = true;
      expect(navDots(g, dockItems(true)).social).toBeUndefined();
    });
    it('comes back for new trades or club news, and never in a showcase or where Social doesn’t exist', () => {
      g.progress.tutorial.flags.opened_social = true;
      expect(navDots(g, dockItems(true), null, undefined, { social: C.dotNews }).social).toEqual({ level: 'new', label: 'New trades and club news', target: null });
      expect(navDots(g, dockItems(false), null, undefined, { social: C.dotNews }).social).toBeUndefined();
      const show = { ...g, isShowcase: true } as GameState;
      delete show.progress.tutorial.flags.opened_social;
      expect(navDots(show, dockItems(true)).social).toBeUndefined();
    });
  });
});

describe('the stub-only club-show reminder (§12.2; ADR-0034 decision 4; SOC-011 A5; chunk 8: real clubs have no events)', () => {
  afterEach(() => {
    vi.mocked(deliverPlanned).mockClear();
    provideSocialService(null);
    resetClubReminder();
    useDevTools.setState({ allowed: true });
    useUI.setState({ screen: 'boot' });
    useSocial.setState({ user: undefined });
  });

  it('plans "{Club}" · "Club show on Saturday. Entries close Friday." to Social › Clubs, on Fridays only', () => {
    const friday = 5;
    expect(clubReminderPlan(friday, [highland])).toEqual({ category: 'shows', title: 'Highland Betta Club', body: 'Club show on Saturday. Entries close Friday.', route: '#/social/clubs', priority: 'normal', tag: 'shows' });
    for (const day of [0, 1, 2, 3, 4, 6]) expect(clubReminderPlan(day, [highland])).toBeNull();
    expect(clubReminderPlan(friday, [])).toBeNull();
    expect(clubReminderPlan(friday, [{ ...CLUBS[1] }])).toBeNull(); // a club with no show coming
  });

  it('is delivered once a session on the stub (dev mode), for a signed-in member, and never otherwise', async () => {
    const shown = vi.mocked(deliverPlanned);
    const stub = createLocalSocialStub({ latency: [0, 0], storage: { getItem: () => JSON.stringify({ email: 'a@b.c', displayName: 'a', joinedClubIds: ['highland-betta'], joinedMonths: {} }), setItem: () => {}, removeItem: () => {} } });
    provideSocialService(stub);
    useUI.setState({ screen: 'game' });
    const friday = new Date(2026, 9, 16, 12); // a Friday
    useDevTools.setState({ allowed: false });
    expect(await checkClubReminder(friday)).toBe(false);
    expect(shown).not.toHaveBeenCalled();
    useDevTools.setState({ allowed: true });
    expect(await checkClubReminder(new Date(2026, 9, 15, 12))).toBe(false); // Thursday
    expect(await checkClubReminder(friday)).toBe(true);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown.mock.calls[0][1]).toMatchObject({ title: 'Highland Betta Club', route: '#/social/clubs' });
    expect(await checkClubReminder(friday)).toBe(false); // once a session
    expect(shown).toHaveBeenCalledTimes(1);
  });
});

describe('the router’s gate (SOC-011 A1; chunk 8, REL-025: where Social exists)', () => {
  afterAll(() => useDevTools.setState({ allowed: true }));
  it.each(['#/social', '#/social/clubs', '#/social/trading', '#/social/friends', '#/social/leaderboards', '#/social/join/HIGHLAND-4821'])('%s opens Social only where it exists (here: dev mode, no project)', (hash) => {
    useDevTools.setState({ allowed: true });
    expect(parseNav(hash)?.route).toMatchObject({ kind: 'panel', panel: 'social' });
    useDevTools.setState({ allowed: false });
    expect(parseNav(hash)).toBeNull();
    expect(parseNav('#/shows')?.route).toMatchObject({ kind: 'panel', panel: 'shows' });
  });
});

describe('chunk 8: Settings › Account, server-rendered (REL-031)', () => {
  afterAll(() => setSocial({ user: undefined, offline: false }));

  it('signed out: the approved line and the privacy link (Open Social only inside a game)', () => {
    setSocial({ user: null });
    const t = text(html(createElement(AccountTab)));
    expect(t).toBe('Sign in from Social to save your aquarium online and see friends. Your account and your data');
  });

  it('signed in: who, the name and friend code, the online line, Sign out, Delete my account, the privacy link', () => {
    setSocial({ user: { id: 'u', email: 'sam@example.com', displayName: 'Sam', friendCode: 'SAM-7Q2' } });
    const out = html(createElement(AccountTab));
    const t = text(out);
    expect(t).toContain('Signed in as sam@example.com');
    expect(t).toContain('Name friends see: Sam · Friend code SAM-7Q2');
    expect(t).toContain('Not saved online yet');
    expect(t).toContain('Sign out');
    expect(t).toContain('Delete my account');
    expect(t).toContain('Your account and your data');
    expect(out).toContain('role="status"');
  });

  it('the online line: saving, saved {ago}, not yet, unreachable, a newer version', () => {
    const now = Date.now();
    expect(onlineLine('saving', null).text).toBe('Saving online…');
    expect(onlineLine('idle', now - 2 * 60_000).text).toBe('Saved online 2 min ago');
    expect(onlineLine('idle', null).text).toBe('Not saved online yet');
    expect(onlineLine('unreachable', now)).toEqual({ text: 'Can’t reach Aquarium Go online. Your game still saves on this device.', warn: true });
    expect(onlineLine('blocked', now)).toEqual({ text: 'Your online save comes from a newer version of Aquarium Go. Refresh the page to update.', warn: true });
  });
});
