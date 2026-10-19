# ADR-0038 — Multiplayer, stage 1: accounts, cloud saves and the Social screens for people the owner knows

**Status:** Accepted for stage 1 (the owner, 2026-10-18), to be built as chunk 8, after chunk 7. Two questions remain
before chunk 8 builds: the privacy note's wording and the rule for players under 13 (OWNER_QUESTIONS group H). REL-002
stays open: stage 2 needs its own record.\
**Date:** 2026-10-18\
**Chunk:** drafted beside chunk 7 (ADR-0037 decision 3); built in chunk 8\
**Requirements:** REL-002; SOC-001 to SOC-011; CONST-001 (dependencies); `docs/agent/TRUST_BOUNDARY.md`,
`docs/agent/DEBT_INVENTORY.md`

## Context

Aquarium Go is a static site (GitHub Pages and a Render static site): no server, no database, no accounts, each save
in its player's browser (ADR-0005). The owner chose, on 2026-10-18 (ADR-0037 decisions 3 and 4), to harden the
single-player game first (chunk 7) and to start multiplayer with people they know, a handful of friends or family,
with this record drafted beside chunk 7.

What already exists:
- **The Social screens** (0.5 spec §13; chunk 6): sign-in, clubs and invites, trades ("open later", ADR-0034),
  friends' aquariums and friend codes, three leaderboards (collection value, Prismatics, show wins), the Social dot.
  They run in dev mode only, on a local stub, behind one interface, `SocialService` (`src/social/service.ts`):
  `signIn(email, password)`, `signUp`, `clubs`, `resolveInvite`, `joinClub`, `trades`, `friendsAquariums`,
  `addFriend`, `leaderboard`, `news`, `markSeen`. A real backend replaces the stub without UI changes.
- **One function per player action** in `src/sim`, each a single call a server could later receive and check
  (TRUST_BOUNDARY.md lists every one and what a server would check).
- **Plain, deterministic rules** that already run outside the browser (the unit tests run them in Node), so a server
  could later run the same code.
- **A guarded save format:** `repairState` validates every value, and a newer build's save is never loaded past or
  overwritten (PERSIST-014). A save is at most 2.5 million characters, listing photos aside (PERSIST-005).

## Proposal

### Stage 1, for people the owner knows (approved: see Decisions)

The server stores what each player's browser sends and trusts it. With a handful of friends nobody is trying to
cheat, so the checks in TRUST_BOUNDARY.md wait for stage 2.

1. **Accounts:** email and password, as §13.2 already draws (the stub's `validCredentials` rule: x@y.z, 8+
   characters), plus sign-out and a "Delete my account" that removes everything stored for the player.
2. **Cloud saves:** one slot synced to the account. Saving locally also uploads (debounced, after the local save
   lands); opening the game signed in on another device offers the newer of the two. When both changed since the last
   sync, the player chooses (copy for that prompt goes to the owner). A save from a newer build follows PERSIST-014:
   an older build never overwrites it. The local save stays the source of truth offline.
3. **The Social screens out of dev mode** for signed-in players, on the real service: clubs (create, invite code,
   join), friend codes, friends' aquariums (a snapshot uploaded on save), and the three leaderboards among friends and
   club members. Each browser reports its own leaderboard numbers, so they are friends-only and reset when the game
   opens to everyone. Trades stay "open later" (ADR-0034).
4. **Not in stage 1:** trading, a shared market, shows between players, server-side checks, running the offline
   catch-up on a server, public leaderboards.

### Stage 2, before anyone the owner doesn't know joins

The server decides: it receives player actions (or checks saves) under TRUST_BOUNDARY.md's rules, caps the offline
catch-up, enforces chunk 7's fixes (no `?dev=1` writes, money loops closed, research gates in the rules), rate-limits,
and handles names and club names others see. Leaderboards reset. This stage gets its own decision record.

### Stage 3, later and only after designs

Trading between players, a shared market and shows judged between players' animals. None has a design yet.

## The backend: options and costs (checked 2026-10-18 on the providers' pages)

| Option | Free plan | First paid step | Fit |
|---|---|---|---|
| **Supabase (recommended)** | $0: 2 active projects, 500 MB database, 50,000 monthly active users, 5 GB egress; **a free project pauses after a week with no activity** and is restored by hand in its dashboard | Pro from $25 a month per organization (includes $10 of compute, one Micro instance; 8 GB database, 100,000 users, 250 GB egress; no pausing) | Email and password sign-in built in (matches `signIn(email, password)`); a Postgres database whose row rules let each player read and write only their own save; a whole save fits in one row. No server of our own to run or secure |
| Firebase (Google) | Spark, $0: 50,000 monthly active users; Firestore 1 GiB stored, 50,000 reads and 20,000 writes a day, 10 GiB a month out; no Cloud Functions | Blaze, pay as you go | Sign-in built in; but a Firestore document holds at most 1 MiB, under a 2.5-million-character save, so saves would be split or kept in Cloud Storage, which needs a billing account on Blaze (2026) |
| Our own small server on Render | Free web service: sleeps after 15 minutes idle and takes about a minute to wake; free Postgres expires 30 days after creation (deleted 14 days later) | A paid instance and a paid database, each billed monthly | Full control, but we would write and secure sign-in, passwords and resets ourselves: the most code and the most risk |
| Cloudflare Workers and D1 | 100,000 requests a day; D1 5 GB, 5 million rows read and 100,000 written a day | $5 a month minimum | Cheap and fast; no sign-in built in, and a save would need splitting or separate storage |

**The owner's Supabase account** (the owner, 2026-10-18, verbatim: "I already have a pro version of supabase which I
believe allows 3 projects. 2 are taken by anonyform staging and prod"). On Pro, compute is billed per project by the
hour: the plan's $10 of monthly compute credit covers one Micro project, and each further project adds its own
compute, about $10 a month at the Micro size ($0.01344 an hour). Supabase's compute page states no project limit for
Pro ([compute billing](https://supabase.com/docs/guides/platform/manage-your-usage/compute)); the owner's dashboard
shows what their organization allows.

**Checked with the owner's account** (the owner, 2026-10-18, verbatim: "oh.. I think it was vercel that did that. can
you check and see if our supabase could handle another project or if it would be separate? if so then free version is
fine I think to start unless we want to do an entirely different platform that's cheaper to start with. also look
into what you need to do this all yourself as far as setup. want to log into my supabase to check it out?"). The
Supabase CLI on the owner's Mac (v2.119.0) is signed in to their account: one organization, "GrayGrayson1", with two
active projects, AnonyForm (us-east-2) and anonyform-staging (us-west-2). Its plan wasn't read (the agent's attempt to
read the CLI's stored sign-in was refused by the session's safety check). What follows from Supabase's rules:
- Plans are per organization, and an organization can't mix free and paid projects. Each person gets two active free
  projects; paused projects don't count ([billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)).
- **If GrayGrayson1 is on Pro**, anonyform's two projects are paid ones, and Aquarium Go can be a free project in a
  new, separate Free organization: $0, apart from anonyform and its bill.
- **If GrayGrayson1 is on Free**, its two active projects use the owner's two free projects: a third needs one of
  them paused, or Pro (about $25 a month, plus about $10 for each project beyond the first).
- A free project pauses after a week with no activity; the game then plays offline as today, and the owner restores
  the project from the dashboard.
- **Email:** Supabase's built-in sender only delivers to the project's own team members, at about 2 emails an hour
  ([custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)). Friends' confirmation and password-reset emails
  need a custom sender: a Gmail app password (simplest; the emails come from the owner's address) or a service such as
  Resend (needs a domain the owner owns). Or stage 1 skips email confirmation, and a forgotten password is reset by
  the owner.

**Recommendation, if GrayGrayson1 is on Pro: a free project in a new Free organization; otherwise one new project in
the owner's Pro organization at the Micro size.** The owner then checked: it is on Pro (verbatim: "it says pro. it's
apaid sub. so we can have completely separate instances for anonyform and aquarium go? what happens if I stop paying
for pro? if I need to stop paying for pro is it best to do a completely new account?"), so the free project in a new
Free organization it is. (Before the check, the recommendation was the Pro project only:)
- It costs about $10 a month more on the owner's bill, and Pro projects never pause.
- It is separate from anonyform's projects, so neither app can reach the other's data or users.
- There's no staging project at first (another ~$10 a month): the tests run against the local stub, as they do today,
  and a test account on the real project covers one smoke test. Add staging when strangers join (stage 2).

## What the owner was to approve (as drafted; see Decisions for the answers)

1. **Stage 1 as above**, on a new Micro project in the owner's Supabase Pro organization (about $10 a month), or
   another option from the table.
2. **A new dependency**, `@supabase/supabase-js` (CONST-001: no dependency without an ADR recording the owner's
   approval), or none: the game calls Supabase's web API with `fetch` (more code of ours, no package).
3. **What leaves the device:** the player's email, display name, friend code, the synced save, an aquarium snapshot
   image and the leaderboard numbers. Collecting emails needs a short privacy note (what is stored, why, how to delete
   it) linked from sign-up; its copy goes to the owner.
4. **Who can sign up:** anyone with the link (simplest), or only people the owner invites (a sign-up code), since
   stage 1 trusts every player.
5. **Players under 13:** the game suits families; stage 1 asks for an email, so sign-up says it is for 13 and over
   (or a parent signs up), and the owner decides which.
6. **Remote settings and costs:** with the owner's yes, the agent sets it up with the Supabase CLI already signed in
   on the owner's Mac: the new organization and project, the tables and access rules from SQL files in the repo
   (`supabase/migrations`, applied with `supabase db push`), and the sign-in settings (`supabase/config.toml`). That
   sign-in reaches every project in the account, anonyform's included. So after the project exists, the owner can make
   a scoped access token (Supabase's, limited to the Aquarium Go project) for the agent's later work. The project's
   address and public key are public by design (the access rules protect the data), so they go in a committed file
   and `deploy.yml`, `render.yaml` and Render's settings stay as they are. The email sender's password, if any, stays
   in Supabase's settings, never in the repo.

## Decisions

1. **Stage 1 as proposed**, built as chunk 8 after chunk 7's hardening, on a **free Supabase project in a new Free
   organization** in the owner's account, apart from GrayGrayson1 (Pro: anonyform's two projects): $0, its own
   database, players, keys and settings. If the owner ever drops Pro, the owner's two active free projects can't cover
   anonyform's two and Aquarium Go's: the agent's advice is to pause or delete anonyform-staging (paused projects don't
   count; restorable for 90 days), not to open a second account.
2. **`@supabase/supabase-js` is approved as a dependency** (CONST-001: this record holds the owner's approval). It is
   installed when chunk 8 starts, at an exact version, and `core-dependencies`' recorded list changes then, citing
   this record. No other package comes with it.
3. **Sign-up needs an invite code** the owner shares; without one, no account can be made (checked on Supabase's side,
   not only in the game; how codes are made and checked is chunk 8's design).
4. **No emails in stage 1:** email confirmation is off, and a forgotten password is reset by the owner (or by the agent
   with the owner's yes) in Supabase's dashboard. Email (a Gmail app password or a service) can be added later.
5. **Setup** (decision 6 as drafted): the agent creates the organization and project with the Supabase CLI signed in
   on the owner's Mac, asking the owner in that session first (a remote change); afterwards the owner can give the
   agent a scoped token limited to the Aquarium Go project. The project's address and public key go in a committed
   file; `deploy.yml`, `render.yaml` and Render's settings stay as they are.
6. **Still to ask before chunk 8 builds** (OWNER_QUESTIONS H1, H2): the privacy note's wording (what leaves the device
   and how to delete it; drafted with chunk 8's brief) and the rule for players under 13 (13 and over, or a parent signs
   up).

## Owner approval

Given by the owner in a Claude Code session on 2026-10-18. The owner's messages before it (verbatim): "show me the
multiplayer plan. I already have a pro version of supabase which I believe allows 3 projects. 2 are taken by anonyform
staging and prod"; then "oh.. I think it was vercel that did that. …" and "it says pro. …" (both quoted in full above).
The agent's answer before the round said that the two organizations would be completely separate, what dropping Pro
would do (an immediate downgrade with credit; three active free projects against a quota of two, so the organization's
projects pause until the owner picks which to restore; anonyform losing Pro's no-pausing and backups; Aquarium Go
unaffected), and advised against a second account. Then one AskUserQuestion round; the questions as asked (verbatim;
option label, then its description) and the owner's answers:

1. **"Approve stage 1 of the multiplayer plan (accounts, cloud saves, and the Social screens for friends) on a free
   Supabase project in a new, separate organization?"** (Stage 1)
   - "Approve, after hardening (Recommended)": "As you chose earlier: chunk 7 (hardening) first, then stage 1 as the
     next chunk. The free project costs $0 and stays separate from anonyform."
   - "Approve, build it first": "Friends don't need the hardening to play together, so build stage 1 first and do the
     hardening after."
   - "Not yet": "Keep it as a proposal for now."
   - **Answer: "Approve, after hardening (Recommended)".**
2. **"How should the game talk to Supabase?"** (Library)
   - "Supabase's library (Recommended)": "Add @supabase/supabase-js, a new dependency. Supabase's own tested code
     handles sign-in, staying signed in and the database calls, so there's less code of ours."
   - "Plain web calls": "No new package. We write the sign-in, token refresh and database calls ourselves: more code
     and more to test."
   - **Answer: "Supabase's library (Recommended)".**
3. **"Who can create an account?"** (Sign-up)
   - "Invite code only (Recommended)": "Stage 1 trusts every player, so only people with a sign-up code you share can
     make an account."
   - "Anyone with the link": "Anyone who finds the game can sign up. Simplest, but strangers could cheat on the
     friends' leaderboards."
   - **Answer: "Invite code only (Recommended)".**
4. **"How should sign-up confirmation and password-reset emails be sent? (Supabase's built-in sender only emails your
   own team.)"** (Email)
   - "Skip emails for now (Recommended)": "No confirmation emails, which is fine with invite codes. If a friend forgets
     their password, you or I reset it. Nothing to set up, and email can be added later."
   - "Your Gmail": "You make a Gmail app password (it needs 2-step verification on your Google account) and paste it
     into Supabase yourself. The emails come from your address. Free."
   - "An email service": "For example Resend, whose free plan suits a few friends. It needs a domain you own, plus a
     few DNS records."
   - **Answer: "Skip emails for now (Recommended)".**

No notes were added.

## Consequences

- Chunk 8 (after chunk 7) builds stage 1: a `SocialService` on Supabase beside the stub (the stub stays for tests
  and dev mode), cloud saves under `src/persistence` with their own tests, the Social screens out of dev mode for
  signed-in players, the privacy note and account deletion. e2e runs against the stub; one smoke test runs against a
  test project only when the owner provides one.
- REL-002's third criterion is met for stage 1's backend, account and cloud-save code by this record; REL-002 stays
  open: stage 2 needs its own record before the game opens to people the owner doesn't know, and real trading its own.
- `TRUST_BOUNDARY.md` and `DEBT_INVENTORY.md` gain a stage 1 note: the server trusts the browser on purpose.

## Sources

Checked 2026-10-18: [Supabase pricing](https://supabase.com/pricing); [Supabase compute billing](https://supabase.com/docs/guides/platform/manage-your-usage/compute); [Firebase pricing](https://firebase.google.com/pricing);
[Render free tier](https://render.com/docs/free); [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
Firestore's 1 MiB document limit is from Firestore's documented quotas; Firebase Cloud Storage needing Blaze from
February 2026 is from third-party summaries ([agentdeals.dev](https://agentdeals.dev/vendor/firebase)), not confirmed
on Google's page. Prices change: check them again before approving.
