# ADR-0039 — Owner answers, chunk 7 and group H: counters capped at the buyer's limit, admission demand keeps falling, the privacy note approved, sign-up for 13 and over

**Status:** Accepted\
**Date:** 2026-10-18\
**Chunk:** 7 (hardening for multiplayer), and chunk 8's two open questions\
**Requirements:** REL-020, REL-021 (chunk 7); chunk 8's sign-up and privacy requirements (written with its brief);
BACKLOG B-124, B-162; OWNER_QUESTIONS H1, H2

## Context

Chunk 7's brief (PLAN.md; ADR-0037 decision 3) says B-124's and B-162's fixes change what players see, so before
building, the owner sees B-124's sale prices after a run of counters and B-162's takings at a few prices, before and
after, and answers. ADR-0038 decision 6 left H1 (the privacy note's wording) and H2 (players under 13) to ask before
chunk 8 builds. On 2026-10-18 the owner wrote **"ask me the questions and lets build. how close to the multiplayer are
we"**, and the agent asked all four in one round.

The numbers came from two throwaway probes run on `afe46d0` in the internal-disk clone, kept in the git-excluded
`scripts/_audit/H7/` (`counters.ts`, `admission.ts`), each run on today's code and then with the fix applied to the
clone's working copy (since reverted there):

- **Counters (B-124):** 200 seeds; an axolotl listed with the suggested reserve and no buy-now; the best opening bid
  countered at 5% over the buyer's current offer each round, re-countering after a split or a hold, the offer accepted
  after 25 rounds or when bidding closed. Today: median sale ÷ the buyer's private ceiling 0.94, highest 1.59, 3 of 200
  sold above the ceiling (each the rare buyer who keeps splitting: a split could reach 1.03 × the ceiling, and the next
  reply took that as the ceiling, so it compounded). After: median 0.94, highest 1.00, none above. Separately, a
  12-hour listing countered at 10% a round without accepting stayed open up to 20 game hours past its end (9 of 200
  more than 3 hours past); after, a counter is refused once bidding has closed.
- **Admission (B-162):** three facility fixtures (`facility_shop`, fair price $10.50; `facility_store`, $13;
  `facility_showroom`, $15.50), three game days of `stepVisitors` at each price. Demand is `1.2 − 0.6 × price ÷ fair`,
  floored at 0.05 (reached at about 1.92 × fair), so above that a steady trickle came whatever the price and takings
  rose with it: the Shop took $1,118 a day at $11, $196 at $21, $373 at $40 and $2,333 at $250 (which the sim accepted;
  the slider stops at $40). The fix keeps the line as it is up to the floor's point and then lets demand fall with the
  square of the price: $1,118 at $11, $848 at $16 (unchanged), $175 at $21, $117 at $32, $107 at $40. A new shop with a
  fair price near $3 (the formula's lowest is about $2.85 at the first public level) took more at $40 than at $3 today
  (40 × 0.05 = 2.0 against 3 × 0.6 = 1.8 per unit of draw); after, about 2% of its fair-price takings. A softer curve
  (falling from 1.5 × fair) was offered as the second option: $869 at $16, $672 at $21, $437 at $32, $373 at $40.

## Decisions

1. **B-124: a buyer never pays more than their private limit, and counters stop when bidding closes.** A split meets
   the buyer's offer and the counter halfway, capped at the buyer's ceiling, and a reply at the ceiling holds rather
   than adding a dollar; a counter sent once the listing's bidding has ended is refused with **"Bidding has closed.
   Accept an offer or let it expire."** (the player can still accept). Ordinary counters sell as today.
2. **B-162: admission demand keeps falling with price.** Nothing changes up to about twice the fair price; above that
   demand falls with the square of the price, so takings only fall. The game's rules cap admission at $40, as the
   slider does. (The slider's own estimate is a separate, simpler curve that already falls at high prices; it is not
   part of this answer.)
3. **H1: the privacy note is approved as drafted** (below), linked from chunk 8's sign-up screen; "Delete my account"
   sits in Settings, under Account. If what chunk 8 stores changes, the note changes with it and goes back to the owner.
4. **H2: sign-up is for 13 and over.** Sign-up has a required checkbox, **"I'm 13 or older, or I'm a parent or guardian
   signing up for my child."**; a parent signs up for a younger player.

The approved privacy note (verbatim, as previewed):

> Your account and your data
>
> Without an account, nothing leaves your device.
> If you sign up, Aquarium Go's server (run by
> Supabase, in the United States) stores:
> - your email and password (the password is stored
>   scrambled; nobody can read it)
> - your display name and friend code
> - your save, so it follows you to another device
> - a picture of your aquarium and your leaderboard
>   numbers, which your friends and club members see
>
> Why: to sign you in, keep your save safe and show
> your aquarium to friends. No ads, no selling, no
> tracking, and we don't send emails.
>
> Settings > Account > Delete my account removes all
> of it at once. Questions? Ask whoever invited you.

(The line breaks are the preview's; the screen reflows the text. "Settings > Account > Delete my account" may be
written with the screen's own arrows.) The project's region must then be in the United States when chunk 8 creates it.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-18, in one AskUserQuestion round, after the message quoted in
Context. The questions as asked (verbatim; option label, description, and preview where there was one), and the
owner's answers:

1. **"Counter-offers: today a rare patient buyer can be talked up to about 1.6× their private limit, one tiny step at a
   time, and you can keep haggling up to 20 game hours after a listing ends. How should it work?"** (Counters)
   - "Cap at their limit (Recommended)": "A buyer never pays more than their limit, and you can't counter once bidding
     has closed (you can still accept). Ordinary counters sell the same as today." Preview:
     ```
     200 test sales, countering 5% at a time

                            today       after
     typical sale / limit   0.94        0.94
     highest sale / limit   1.59        1.00
     sales above the limit  3 of 200    none
     haggling after the end up to 20 h  stops at the end

     New message if you counter after bidding closes:
     "Bidding has closed. Accept an offer or let it expire."
     ```
   - "Allow a 3% stretch": "A buyer may go up to 3% over their limit, but only once, not compounding. Counters still
     stop when bidding closes." Preview:
     ```
     highest sale / limit   1.59  ->  1.03
     haggling after the end stops at the end

     Same new message:
     "Bidding has closed. Accept an offer or let it expire."
     ```
   - "Leave it": "Change nothing. The rare 1.6× sale and the late haggling stay."
   - **Answer: "Cap at their limit (Recommended)".**
2. **"Admission: above about twice the fair price, visitors stop falling off (a steady 5% keep coming), so takings rise
   again as the price goes up, and the game's rules accept up to $250 though the slider stops at $40. Which fix?"**
   (Admission)
   - "Keep falling (Recommended)": "Nothing changes up to about twice the fair price. Above that, visitors keep
     dropping, so takings only fall. The rules also cap admission at $40, like the slider." Preview:
     ```
     Takings per day, Shop (fair price $10.50)
     price   today    after
     $11     $1,118   $1,118
     $16     $848     $848
     $21     $196     $175
     $32     $299     $117
     $40     $373     $107
     $250    $2,333   not allowed (max $40)

     A new shop with a fair price near $3:
     today $40 earns MORE than $3; after, almost nothing.
     ```
   - "Softer overpricing": "Same fix, but slightly overpriced tickets (1.5× to 3.5× fair) lose fewer visitors than
     today. Changes the balance a bit more." Preview:
     ```
     Takings per day, Shop (fair price $10.50)
     price   today    after
     $11     $1,118   $1,118
     $16     $848     $869
     $21     $196     $672
     $32     $299     $437
     $40     $373     $373
     $250    $2,333   not allowed (max $40)
     ```
   - "Only cap at $40": "The rules match the slider's $40, but takings still rise between twice the fair price and
     $40."
   - **Answer: "Keep falling (Recommended)".**
3. **"Multiplayer (chunk 8): approve this privacy note, linked from the sign-up screen?"** (Privacy)
   - "Approve this wording (Recommended)": "Used as written. The 'Delete my account' button sits in Settings, under
     Account." Preview: the note quoted under Decisions.
   - "Change it": "Tell me what to change in the notes."
   - **Answer: "Approve this wording (Recommended)".**
4. **"Multiplayer sign-up asks for an email, and the game suits families. Who may sign up?"** (Under 13)
   - "13 and over (Recommended)": "Sign-up has a required checkbox. A parent signs up for a younger player." Preview:
     ```
     [ ] I'm 13 or older, or I'm a parent or
         guardian signing up for my child.
     ```
   - "Anyone": "No age line. You know every player anyway, since sign-up needs your invite code."
   - **Answer: "13 and over (Recommended)".**

No notes were added.

## Consequences

- Chunk 7 builds B-124 and B-162 as decided (REL-020, REL-021), each with its loop test in
  `tests/sim/economy-loops.test.ts`. Seeded tests whose sales ran through a split above the ceiling, or whose
  visitors came at more than about twice the fair price, may shift; each change is explained in the commit.
- OWNER_QUESTIONS: H1 and H2 answered; every owner question is answered except F1 (the VoiceOver pass).
- Chunk 8's brief carries the note, the checkbox and a US region for the new project.
