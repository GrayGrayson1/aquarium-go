# ADR-0041 — Owner answers, group I: chunk 8's remaining wording approved as drafted

**Status:** Accepted\
**Date:** 2026-10-19\
**Chunk:** 8 (multiplayer stage 1, ADR-0038, ADR-0040)\
**Requirements:** REL-028, REL-029, REL-030, REL-031; OWNER_QUESTIONS I1

## Context

ADR-0040 decision 5 left the strings its message didn't spell out to one round at chunk 8's start (OWNER_QUESTIONS
group I; drafted in `docs/agent/design/ONLINE-STAGE1.md` §7.3): the sign-up form's placeholders and "Back to sign in",
Settings › Account's labels and online-save lines, the delete dialog's title, buttons and toast, the online-save box's
cards and note, and the owner's create-club and invite-link controls. The agent building chunk 8 (Marshall) asked
them in one AskUserQuestion round with the exact strings in the previews, adding two things the drafts implied but
didn't write: the privacy note's link on the sign-up form and in Settings › Account uses the note's approved title,
and Settings › Account's first line is today's approved Social subtitle, "Signed in as {email}".

## The questions as asked (verbatim; option label, description, preview) and the owner's answers

1. **"Chunk 8, group I (1 of 4): the sign-up form's extra words. OK as written?"** (Sign-up)
   - "Approve as written (Recommended)": "Used exactly as shown. Pressing “Create account” on the sign-in form opens
     these extra fields. The privacy link uses the note's approved title." Preview:
     ```
     Sign-up form (after “Create account”)

       Email          you@example.com
       Password       At least 8 characters
       Name friends see   [ e.g. Sam ]
       Invite code        [ From your invite link ]
       [ ] I’m 13 or older, or I’m a parent or
           guardian signing up for my child.
       Your account and your data      (link: opens the note)

       [ Create account ]
       Back to sign in                 (link)

     Arriving from an invite link fills in the code.
     ```
   - "Change some": "Tell me in the notes what to change."
   - **Answer: "Approve as written (Recommended)".**
2. **"Chunk 8, group I (2 of 4): the new Settings › Account tab. OK as written?"** (Account tab)
   - "Approve as written (Recommended)": "Used exactly as shown. “Signed in as …” is today's approved Social subtitle.
     The status line shows one of the five lines." Preview:
     ```
     Settings › Account   (tab label: Account)

     Signed in as sam@example.com
     Name friends see: Sam · Friend code SAM-7Q2

     Online save, one of:
       Saving online…
       Saved online 2 min ago
       Not saved online yet
       Can’t reach Aquarium Go online. Your game still
         saves on this device.
       Your online save comes from a newer version of
         Aquarium Go. Refresh the page to update.

     [ Open Social ]  [ Sign out ]  [ Delete my account ]
     Your account and your data     (link)
     ```
   - "Change some": "Tell me in the notes what to change."
   - **Answer: "Approve as written (Recommended)".**
3. **"Chunk 8, group I (3 of 4): the delete dialog and the online-save box's cards. OK as written?"** (Delete & box)
   - "Approve as written (Recommended)": "Used exactly as shown. The box's titles and its two buttons are already
     approved (ADR-0040)." Preview:
     ```
     Delete dialog
       Delete your account?
       This removes your account, online save, friends
       and clubs from Aquarium Go’s server. The game on
       this device stays.          (approved)
       [ Delete my account ]  [ Cancel ]
       Toast: Account deleted · Your game is still on
              this device.

     Online-save box (title as approved)
       On this device · Coral Corner · Day 12 · $4,210
         · saved just now
       Online · Coral Corner · Day 15 · $5,880
         · saved 3 h ago
       If you load the online save, this device’s copy
       stays in Settings › Saves as Previous autosave.
       [ Keep this device’s ]  [ Load online save ]
     ```
   - "Change some": "Tell me in the notes what to change."
   - **Answer: "Approve as written (Recommended)".**
4. **"Chunk 8, group I (4 of 4): your club controls (only your account sees them). OK as written?"** (Club tools)
   - "Approve as written (Recommended)": "Used exactly as shown, in Social › Clubs. Only your account sees these, once
     I set its owner flag after you sign up." Preview:
     ```
     Social › Clubs (your account only)

       Create a club
         Club name                 [            ]
         What it’s about (optional)[            ]
         [ Create club ]
         Error: Enter a club name of 2 to 40 characters.
         Toast: Club created · Copy its invite link to
                bring friends in.

       On each club you made:
         Invite link FRIENDS-4821   [ Copy link ]
         Toast: Link copied
     ```
   - "Change some": "Tell me in the notes what to change."
   - **Answer: "Approve as written (Recommended)".**

No notes were added.

## Decisions

1. **Sign-up form:** the placeholders "e.g. Sam" (Name friends see) and "From your invite link" (Invite code); the link
   back, "Back to sign in"; the privacy note's link reads "Your account and your data" (its title). "Create account"
   on the sign-in form opens sign-up mode; an invite link fills in the code.
2. **Settings › Account** (tab label "Account"): "Signed in as {email}"; "Name friends see: {name} · Friend code
   {code}"; "Open Social"; the online-save line, one of "Saving online…" · "Saved online {ago}" · "Not saved online
   yet" · "Can’t reach Aquarium Go online. Your game still saves on this device." · "Your online save comes from a
   newer version of Aquarium Go. Refresh the page to update."; Sign out, Delete my account and the privacy link.
3. **Delete dialog:** title "Delete your account?", ADR-0040's body, buttons "Delete my account" and "Cancel"; the
   toast "Account deleted" · "Your game is still on this device."
4. **The online-save box:** the cards "On this device · {shop} · Day {n} · {$money} · saved {ago}" and "Online · …"
   (the same fields); the note "If you load the online save, this device’s copy stays in Settings › Saves as Previous
   autosave."
5. **The owner's club controls** (Social › Clubs, the owner's account only): "Create a club"; the fields "Club name"
   and "What it’s about (optional)"; "Create club"; the error "Enter a club name of 2 to 40 characters."; the toast
   "Club created" · "Copy its invite link to bring friends in."; on each club the owner made, "Invite link {CODE}"
   with "Copy link", and the toast "Link copied".

## Consequences

- Every chunk 8 string is now approved (ADR-0039, ADR-0040, this record); the copy test pins them all. No other new
  copy without asking.
- OWNER_QUESTIONS: I1 answered; F1 (the owner's VoiceOver pass) is the only open question.
