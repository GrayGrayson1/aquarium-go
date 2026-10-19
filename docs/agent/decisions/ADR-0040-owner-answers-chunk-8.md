# ADR-0040 — Owner answers, chunk 8: the Supabase project set up by the agent, only the owner creates clubs, the sign-up, account and online-save wording approved

**Status:** Accepted\
**Date:** 2026-10-19 (asked late on 2026-10-18)\
**Chunk:** 8 (multiplayer stage 1, ADR-0038)\
**Requirements:** REL-025 to REL-033 (chunk 8, written with this record); SOC-001 to SOC-011; PERSIST-014; CONST-001;
OWNER_QUESTIONS group I

## Context

ADR-0038 approved stage 1 (accounts, an online save and the Social screens on a free Supabase project in a new Free
organization; `@supabase/supabase-js`; sign-up only with an invite code; no emails) and left the setup's go-ahead to
the session that builds it ("a remote change: ask in that session"). ADR-0039 approved the privacy note and the
13-and-over checkbox. The session that wrote chunk 8's brief (Chase, 2026-10-18) read the Social stub, the save code
and the Supabase CLI's commands and found what the designs don't cover: how invites let people sign up, who creates
clubs, the sign-up form's extra fields and errors, a Settings › Account screen, the prompt when the online save
differs from the device's, and four lines of today's Social text that the real service would make untrue.

The agent first asked in an AskUserQuestion round with previews; the owner stopped it ("Where are we at? What do we
need to do? What questions can you ask me?"), and the agent asked the same four questions as plain text. The owner
answered those. **The previews of the stopped round were not approved**: only the text below was.

## The questions as asked (verbatim, from the agent's message)

> **The questions** (reply like "1 yes, 2 only me, 3 ok, 4 ok", or tell me what to change)
>
> 1. **Supabase setup: go ahead when the code is ready?** (I recommend yes.) I'd create a Free organization "Aquarium
>    Go" and a project in the US, and stop if the organization doesn't show as Free. The database password is random
>    and nobody keeps it, since the game never uses it; you can set a new one in the dashboard any time. Cost $0, and
>    anonyform isn't touched. The alternatives are "ask me before each step" or "not yet".
>
> 2. **Who can create clubs?** A club's invite link is also how a new person signs up. A friend opens your link,
>    creates an account and joins your club in one go.
>    - **Only you** (recommended): only people you invite can join. Your first club would be called "Aquarium Go
>      Friends", unless you want another name.
>    - **Any player**: friends can invite their own family and friends.
>
> 3. **Sign-up and account wording OK?**
>    - The sign-up form adds "Name friends see", "Invite code", your approved age checkbox and a link to the privacy
>      note.
>    - Error messages:
>      - "That invite code didn't work. Ask whoever invited you for their link."
>      - "Tick the box to confirm your age."
>      - "Enter a name of 1 to 30 characters."
>      - "An account with that email already exists. Sign in instead."
>      - "That email and password don't match an account."
>    - Under Sign in: "Forgot your password? Ask whoever invited you."
>    - A new Settings › Account tab shows who you're signed in as, your friend code, Sign out and Delete my account.
>      Signed out, it says "Sign in from Social to save your aquarium online and see friends."
>    - The delete confirmation: "This removes your account, online save, friends and clubs from Aquarium Go's server.
>      The game on this device stays."
>
> 4. **Online save wording OK?** While you're signed in, the game saves online about every 2 minutes and whenever you
>    leave the tab.
>    - If the online copy differs, a box opens. Its title is one of:
>      - "A newer save is online"
>      - "Your aquarium changed on two devices"
>      - "Your account has a different aquarium online"
>    - The box shows both copies (name, day, money, when saved), with [Keep this device's] and [Load online save].
>      Loading keeps this device's copy in Settings › Saves as "Previous autosave".
>    - Small changes to today's Social text:
>      - The trades note becomes "Trading isn't open yet. Nothing was offered, and your animals stay in your aquarium."
>      - Joining a club says "Members see each other's aquariums and share a leaderboard." It drops "trade bettas" and
>        "You can leave any time", since neither exists yet.
>      - The Friends tab gets "Friend requests", for example "Sam added you [Accept]".
>      - Friends' pictures drop the "likes" count, since there are no likes yet.
>
> One thing to know: on a new device you'll need to start a game before you can sign in and pull your online save,
> because Social only opens inside a game. Putting sign-in on the title screen would mean another new screen; I can
> add it later if you want.

## The owner's answer (verbatim, 2026-10-19)

> for 1. yes go ahead. worst case we can deprecate anonyform staging or aquarium go and move it out to another supabase
> project session.
> 2. only me for now
> 3. I approve of the wording
> 4. yeah I approve of the owrding.
> did we need to compact context before you make it? actually give marshall in cnvs all it needs to be successful in
> building out 8

## Decisions

1. **Setup: go ahead.** The agent building chunk 8 (Marshall, handed the chunk in the same message) creates the Free
   organization "Aquarium Go" and the project `aquarium-go` in `us-east-1` with the Supabase CLI signed in on the
   owner's Mac, when the code is ready for it: the sign-in settings, the tables and access rules, the first club and a
   smoke test with two throwaway accounts deleted afterwards (the steps in
   `docs/agent/design/ONLINE-STAGE1.md` §3). The database password is random and kept by nobody. The agent stops and
   asks if the new organization doesn't show as Free, if any step would cost money, or if a command would touch any
   other organization or project (anonyform's). "Worst case" (the owner's words): if the free projects ever run short,
   anonyform-staging or Aquarium Go can move to another arrangement in a later session, which needs its own yes. This
   answer covers these steps only; pushing `main`, deploying Render and every other remote change still need the
   owner's yes in the session.
2. **Only the owner creates clubs, for now.** A club's invite code is also the sign-up code: a person can create an
   account only with the code of an existing club, checked by the server. Only the owner's account can create clubs
   and see their invite codes (the owner's flag is set on the owner's account, with SQL, once the owner has signed
   up). The first club is **"Aquarium Go Friends"**, made with SQL during setup; the owner signs up with its link like
   everyone else. "For now": letting players create clubs later is a change to this decision.
3. **The sign-up and account wording is approved** as listed in question 3.
4. **The online-save wording and the four Social text changes are approved** as listed in question 4. Saves go
   online about every 2 minutes of play and when the tab is hidden.
5. **Strings the message didn't spell out** are drafted in `ONLINE-STAGE1.md` §7.3 and go to the owner in one round
   before those screens are built (OWNER_QUESTIONS group I): the sign-up fields' placeholders and "Back to sign in",
   the Account tab's labels and status lines, the delete dialog's title and buttons and its toast, the online-save
   box's card lines and note, and the owner's create-club and invite-link controls.
6. **Compacting:** not needed. The chunk goes to a fresh agent (Marshall), who starts from the repo's docs, which is
   what the owner's between-chunks routine asks for.

## Consequences

- Chunk 8's brief (PLAN.md) and its design (`docs/agent/design/ONLINE-STAGE1.md`) carry these answers; REL-025 to
  REL-033 are its requirements.
- OWNER_QUESTIONS gains the chunk 8 row (answered) and group I (the drafted strings, open until asked).
- The sign-in on the title screen (for a new device) is not in chunk 8; the owner may ask for it later.
