/**
 * Every Social string (0.5 spec §13.1–§13.5, ADR-0028, ADR-0034 decisions 2–4), in one place for the panel and the
 * copy test (DES-010). Curly apostrophes and quotes, as the copy deck writes them (§16). OWNER: lane "social".
 */
export const SOCIAL_COPY = {
  title: 'Social',
  subtitleOut: 'Clubs, trading, friends and leaderboards',
  subtitleIn: (email: string) => `Signed in as ${email}`,
  tabs: { overview: 'Overview', clubs: 'Clubs', trading: 'Trading', friends: 'Friends', leaderboards: 'Leaderboards' },

  // §13.2 signed out
  signInTitle: 'Bring your aquarium online',
  signInText: 'Your game stays on this device and keeps working offline. An account adds clubs, trading circles, friends’ aquariums and weekly leaderboards.',
  email: 'Email',
  emailPlaceholder: 'you@example.com',
  password: 'Password',
  passwordPlaceholder: 'At least 8 characters',
  signIn: 'Sign in',
  createAccount: 'Create account',
  haveInvite: 'Have an invite?',
  invitePlaceholder: 'Invite code, e.g. HIGHLAND-4821',
  joinGroup: 'Join group',
  errorCredentials: 'Enter your email and a password of at least 8 characters.',
  errorInvite: 'That invite code didn’t match a club. Check it and try again.',
  errorNetwork: 'Can’t reach Aquarium Go online right now. Your game is fine — try again in a moment.',
  toastSignedIn: 'Signed in',
  toastCreated: 'Account created',
  toastSavesHere: 'Your aquarium still saves on this device.',
  devHint: 'Prototype: any email with an @ and a password of 8+ characters signs you in.',

  // §13.3 invites
  invitedTitle: (club: string) => `You’re invited to ${club}`,
  invitedText: 'Sign in or create an account to join. Your game stays on this device either way.',
  joinTitle: (club: string) => `Join ${club}?`,
  joinMeta: (code: string, members: string, event: string | null) => `Invite ${code} · ${members} members${event ? ` · ${event}` : ''}`,
  joinText: 'Members share show dates, trade bettas and see each other’s aquariums. You can leave any time.',
  joinClub: 'Join club',
  notNow: 'Not now',
  welcome: 'Welcome',
  youJoined: (club: string) => `You joined ${club}`,
  welcomeDetail: 'Club show on Saturday — entries close Friday.',
  memberTitle: (club: string) => `You’re in ${club}`,
  memberText: 'This invite has already been used on your account.',
  openClub: 'Open club',
  expiredTitle: 'This invite has expired',
  expiredText: 'Ask the club for a new code, or browse clubs you can join right away.',
  findClubs: 'Find clubs',

  // §13.4 overview
  yourClub: 'Your club',
  clubRowMeta: (members: string, month: string | null) => `${members} members${month ? ` · you joined in ${month}` : ''}`,
  member: 'Member',
  clubShowStrip: (when: string, entries: number) => `Club show on ${when} · ${entries} entries so far`,
  enter: 'Enter',
  noClubTitle: 'No club yet',
  noClubText: 'Clubs share show dates, trades and advice.',
  useInvite: 'Use an invite',
  tradingCircle: 'Trading circle',
  allTrades: 'All trades',
  view: 'View',
  friendsAquariums: 'Friends’ aquariums',
  allFriends: 'All friends',
  gallons: (gal: string) => `${gal} gal`,
  publicAquarium: 'Public aquarium',
  likes: (n: string) => `${n} likes`,
  leaderboardTitle: 'This week’s leaderboard',
  lbKinds: { collection_value: 'Collection value', prismatics: 'Prismatics', show_wins: 'Show wins' },
  you: (aquarium: string) => `You · ${aquarium}`,
  signOut: 'Sign out',

  // ADR-0028 empty lists
  noTradesTitle: 'No trades yet',
  noTradesText: 'Trades you start or accept appear here.',
  noFriendsTitle: 'No friends yet',
  noFriendsText: 'Friends you add appear here.',

  // §13.5 tabs
  searchPlaceholder: 'Search clubs or paste an invite code',
  suggested: 'Suggested for you',
  join: 'Join',
  joined: 'Joined',
  tradeHeroTitle: 'Trade with your circle',
  tradeHeroText: 'Offer an animal, ask for one, or both. Trades settle the next time both games are online.',
  offerTrade: 'Offer a trade',
  friendCodePlaceholder: 'Friend code, e.g. MYAQUA-7Q2',
  addFriend: 'Add friend',
  snapshotsNote: 'Visits are read-only snapshots: friends see your tanks as they were when you last went online.',

  // ADR-0034 decision 2
  soonTitle: 'Trades open later',
  soonText: 'Trading circles need Aquarium Go online, which isn’t here yet. Nothing was offered, and your animals stay in your aquarium.',
  close: 'Close',
  requestSent: 'Request sent',
  requestSentDetail: 'Their aquarium shows here once they accept.',
  errorFriend: 'That friend code didn’t match anyone. Check it and try again.',
  noMatch: (search: string) => `No clubs match “${search}”. Check the spelling, or paste an invite code.`,
  dotNew: 'New',
  dotNews: 'New trades and club news',

  // ADR-0034 decision 4 (dev-only reminder)
  reminderBody: (when: string, closes: string) => `Club show on ${when}. Entries close ${closes}.`,
} as const;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10" → "October" (English month names, never the device's locale). */
export function monthName(ym: string | undefined): string | null {
  const m = /^\d{4}-(\d{2})$/.exec(ym ?? '');
  const i = m ? Number(m[1]) - 1 : -1;
  return i >= 0 && i < 12 ? MONTHS[i] : null;
}

/** 2341 → "2,341" (en-US, whatever the device's locale). */
export const count = (n: number): string => Math.round(n).toLocaleString('en-US');

/** A leaderboard value as the screens write it: "$214,900" · "4 Prismatic" · "1 win" / "9 wins" (ADR-0034). */
export function lbValue(kind: 'collection_value' | 'prismatics' | 'show_wins', v: number): string {
  if (kind === 'collection_value') return `$${count(v)}`;
  if (kind === 'prismatics') return `${count(v)} Prismatic`;
  return v === 1 ? '1 win' : `${count(v)} wins`;
}
