# ADR-0042 — Owner answers, chunk 8's setup: the Free organization, invite codes of a word and four letters, the repo stays public, everything free

**Status:** Accepted\
**Date:** 2026-10-19\
**Chunk:** 8 (multiplayer stage 1, ADR-0038, ADR-0040)\
**Requirements:** REL-026, REL-027; ADR-0040 decision 1; the chunk 8 review's B1 and B5

## Context

During chunk 8's setup (ONLINE-STAGE1.md §3), the agent created the organization "Aquarium Go" with the Supabase CLI.
The CLI shows no plan, and §3 step 2 says to stop until the organization shows as Free, so the agent asked the owner
to look at its billing page. Meanwhile the agent raised two more points: the repo is public, so the first club's
invite code (also its sign-up code) shouldn't be written in PLAN.md as the brief said; and the design's codes
(FRIENDS-4821: a word and four digits) are guessable, since anyone may ask whether a code opens a club. The chunk's
fresh review (Opus 5.5, max effort) then reported the same two as blockers B1 and B5.

## The questions as asked (the agent's messages, quoted)

> **Questions you can answer**
> 1. **Is the new "Aquarium Go" organization on the Free plan?** Check https://supabase.com/dashboard/org/kvqnsqbjufmnkpsrcjbj/billing. …
> 2. **Invite code length.** Codes look like FRIENDS-4821, as designed. Anyone can ask the server whether a code works, so someone determined could guess one in minutes. Keep four digits (fine for friends), or switch to eight (FRIENDS-48213907)?
> 3. **The first club's code.** The brief says to record it in PLAN.md, but the GitHub repo is public and that code is the sign-up gate. I plan to give it to you here instead. OK?

The owner's answer (verbatim): "not seeing it on supabase. maybe it's not free? that account is a paid pro version so
shouldn't we be able to use it? 2. I like shorter. max 4 I'd say kinda like jackbox.tv. 3. yeah.. we should probably
change it from public to private. can you do that or does that hurt anything?"

The agent's follow-up (summarised; quoted in part): the organization exists (the CLI lists it), try
https://supabase.com/dashboard/organizations; the Pro organization would add about $10 a month for the project's
compute; four random letters without I and O (about 330,000 codes) are far harder to guess than a word and four
digits; making the repo private would take GitHub Pages offline on a free GitHub plan. It asked: "(a) what Billing says
for "Aquarium Go", or "use Pro, $10/month is fine"; (b) "4 letters, KDWX example, OK" or what to change; (c) "keep
public", or "make private, I have Pro"."

The owner's answer (verbatim): "free org sounds best. I found it. it's there. what else does it need to be successful
in multiplayer? 2.only letters. lets do the name of the group plus four letters I'd say. does that sound fair? 3.keep
public I'd say if it costs more money. lets make everything free if we can for now please"

## Decisions

1. **The Free organization "Aquarium Go"** (id `kvqnsqbjufmnkpsrcjbj`) holds the project, not the Pro organization: $0.
   It was created without a payment method, so it is on the Free plan; the owner found it in the dashboard. The project
   is `aquarium-go`, ref `zkavcxrsxdgdlstravpj`, in us-east-1 at the free size (created 2026-10-19).
2. **An invite code is the club's word and four letters, letters only** ("the name of the group plus four letters"):
   the club name's first word (letters A–Z, 2 to 10 of them, else CLUB), a dash, and four letters without I or O, drawn
   from a secure random source: FRIENDS-KDWX. That is 331,776 codes per word. With it (the agent's addition, free):
   after 100 wrong codes in 10 minutes, from anyone, `resolve_invite` answers no one until they age out, and Supabase
   Auth already limits sign-ups to 30 per 5 minutes per address. (A first version capped each network address; the
   review's confirmation pass found a caller can choose the address it is keyed on, and that keeping addresses would
   be data the approved privacy note doesn't cover, so no address is kept.) The stub's sample code HIGHLAND-4821
   stays (dev only).
3. **The repo stays public** ("keep public … if it costs more money"): the first club's invite code is never written
   in the repo; it goes to the owner in the session. PLAN.md, ONLINE-STAGE1.md §3, SESSION_HANDOFF.md and REL-026 say so.
4. **Everything free for now** ("lets make everything free if we can for now please"): no paid plan, add-on or
   service for stage 1.

## Still open (asked in the same session)

- The "Have an invite?" field's example still reads "Invite code, e.g. HIGHLAND-4821" (the 0.5 design's), which no
  longer matches the real codes; the agent proposed "Invite code, e.g. FRIENDS-KDWX" and kept the approved text until
  the owner answers.

## Consequences

- `supabase/migrations/20261019000000_stage1.sql` (the code's shape and source, the audit log in
  `delete_my_account`), `20261019000100_private_api.sql` and `20261019000200_invite_brake.sql` (the brake); the stub,
  the invite-shape check (`looksLikeInvite`), sign-up without `resolve_invite` and the tests follow.
