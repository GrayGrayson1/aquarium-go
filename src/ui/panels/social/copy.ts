/**
 * Every Social string (0.5 spec §13.1–§13.5, ADR-0028, ADR-0034 decisions 2–4; chunk 8: ADR-0039, ADR-0040 and
 * ADR-0041, ONLINE-STAGE1.md §7), in one place for the panel, Settings › Account, the online-save box and the copy test
 * (DES-010). Curly apostrophes and quotes, as the copy deck writes them (§16). OWNER: lane "social".
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
  // chunk 8 (ADR-0040 decision 4): no trading or leaving yet, so the join card says only what's true
  joinText: 'Members see each other’s aquariums and share a leaderboard.',
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
  // chunk 8 (ADR-0040 decision 4): Aquarium Go online exists now; trading doesn't
  soonText: 'Trading isn’t open yet. Nothing was offered, and your animals stay in your aquarium.',
  close: 'Close',
  requestSent: 'Request sent',
  requestSentDetail: 'Their aquarium shows here once they accept.',
  errorFriend: 'That friend code didn’t match anyone. Check it and try again.',
  noMatch: (search: string) => `No clubs match “${search}”. Check the spelling, or paste an invite code.`,
  dotNew: 'New',
  dotNews: 'New trades and club news',

  // ADR-0034 decision 4 (dev-only reminder)
  reminderBody: (when: string, closes: string) => `Club show on ${when}. Entries close ${closes}.`,

  // chunk 8 — sign-up (ADR-0039 decisions 3–4, ADR-0040 decision 3, ADR-0041 decision 1)
  nameLabel: 'Name friends see',
  namePlaceholder: 'e.g. Sam',
  inviteLabel: 'Invite code',
  inviteCodePlaceholder: 'From your invite link',
  ageCheck: 'I’m 13 or older, or I’m a parent or guardian signing up for my child.',
  backToSignIn: 'Back to sign in',
  forgotPassword: 'Forgot your password? Ask whoever invited you.',
  errorSignUpInvite: 'That invite code didn’t work. Ask whoever invited you for their link.',
  errorAge: 'Tick the box to confirm your age.',
  errorName: 'Enter a name of 1 to 30 characters.',
  errorTaken: 'An account with that email already exists. Sign in instead.',
  errorWrongPassword: 'That email and password don’t match an account.',

  // chunk 8 — the privacy note (ADR-0039 decision 3, verbatim; "Settings > Account" with the screen's arrows)
  privacyTitle: 'Your account and your data',
  privacyIntro: ['Without an account, nothing leaves your device.', 'If you sign up, Aquarium Go’s server (run by Supabase, in the United States) stores:'],
  privacyStores: [
    'your email and password (the password is stored scrambled; nobody can read it)',
    'your display name and friend code',
    'your save, so it follows you to another device',
    'a picture of your aquarium and your leaderboard numbers, which your friends and club members see',
  ],
  privacyWhy: 'Why: to sign you in, keep your save safe and show your aquarium to friends. No ads, no selling, no tracking, and we don’t send emails.',
  privacyDelete: 'Settings › Account › Delete my account removes all of it at once. Questions? Ask whoever invited you.',

  // chunk 8 — Settings › Account (ADR-0040 decision 3, ADR-0041 decisions 2–3)
  accountTab: 'Account',
  accountNameCode: (name: string, code: string) => `Name friends see: ${name} · Friend code ${code}`,
  accountSignedOut: 'Sign in from Social to save your aquarium online and see friends.',
  openSocial: 'Open Social',
  deleteAccount: 'Delete my account',
  savingOnline: 'Saving online…',
  savedOnline: (ago: string) => `Saved online ${ago}`,
  notSavedOnline: 'Not saved online yet',
  onlineUnreachable: 'Can’t reach Aquarium Go online. Your game still saves on this device.',
  onlineTooNew: 'Your online save comes from a newer version of Aquarium Go. Refresh the page to update.',
  deleteTitle: 'Delete your account?',
  deleteBody: 'This removes your account, online save, friends and clubs from Aquarium Go’s server. The game on this device stays.',
  cancel: 'Cancel',
  toastDeleted: 'Account deleted',
  toastDeletedDetail: 'Your game is still on this device.',

  // chunk 8 — the online-save box (ADR-0040 decision 4, ADR-0041 decision 4)
  cloudNewer: 'A newer save is online',
  cloudBoth: 'Your aquarium changed on two devices',
  cloudOther: 'Your account has a different aquarium online',
  keepDevice: 'Keep this device’s',
  loadOnline: 'Load online save',
  cardDevice: (shop: string, day: number, money: string, ago: string) => `On this device · ${shop} · Day ${day} · ${money} · saved ${ago}`,
  cardOnline: (shop: string, day: number, money: string, ago: string) => `Online · ${shop} · Day ${day} · ${money} · saved ${ago}`,
  cloudNote: 'If you load the online save, this device’s copy stays in Settings › Saves as Previous autosave.',

  // chunk 8 — friend requests (ADR-0040 decision 4)
  friendRequests: 'Friend requests',
  requestRow: (name: string) => `${name} added you`,
  accept: 'Accept',

  // chunk 8 — the owner's club controls (ADR-0041 decision 5)
  createClubTitle: 'Create a club',
  clubNameLabel: 'Club name',
  clubAboutLabel: 'What it’s about (optional)',
  createClub: 'Create club',
  errorClubName: 'Enter a club name of 2 to 40 characters.',
  toastClubCreated: 'Club created',
  toastClubCreatedDetail: 'Copy its invite link to bring friends in.',
  inviteLink: (code: string) => `Invite link ${code}`,
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
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
