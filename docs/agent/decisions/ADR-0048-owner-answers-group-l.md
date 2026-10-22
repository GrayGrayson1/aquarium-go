# ADR-0048 — Owner answers, group L: shared shops' remaining words approved as drafted

**Status:** Accepted\
**Date:** 2026-10-21\
**Chunk:** 13 (shared shops, the screens and the play-test; SHARED-SHOPS.md §7, §8), asked while chunk 12's review ran\
**Requirements:** SHARE-012, SHARE-013, SHARE-011; OWNER_QUESTIONS group L

## Context

SHARED-SHOPS.md §8 approved the shared-shop screens' words (ADR-0045 decisions 10 and 15) and listed the ones the
approved screens don't cover as "Words still to approve": chunk 11's list (the other first-one-wins lines, a setting
another member just changed, lines for actions with no message of their own, refusals, the save screens) and chunk 12's
one addition (a closing for a club with no shop, `gone`). The handoff (SESSION_HANDOFF.md) has chunk 13 ask them in one
round before building the screens; the agent (Marshall) asked them while chunk 12's fresh review ran, to save the owner
a round later. Nothing shows them before chunk 13.

## The questions as asked, and the answers (one AskUserQuestion round)

1. **"Chunk 13 shows shared shops on screen, and a few situations still need wording (group L). First: when two people
   act on the same thing, the second is told why. The approved \"Sam already sold that fish.\" pattern, extended to
   everything else. Approve these as written?"** (Same thing)
   - Chosen: **"Approve as written (Recommended)"**: "Used exactly as in the preview. {name} is the other person; \"that
     fish\" etc. is what they changed." The preview, verbatim:

     ```
     Someone else changed it first (last 30 s):
       Sam already listed that fish.
       Sam already placed that stored piece.
       Sam already moved that clutch.
       Sam already sold that listing.
       Sam already withdrew that listing.
       Sam already accepted that bid.
       Sam already declined that bid.
       Sam already answered that bid.
       Sam already took a frag from that decoration.
       Sam already moved that decoration.
       Sam already sold that decoration.
       Sam already removed that decoration.
       Sam already listed that frag.
       Sam already planted that frag.
       Sam already sold that frag.
       Sam already removed that equipment.
       Sam already repaired that equipment.
       Sam already installed that equipment.
       Sam already hired that candidate.
       Sam already let that keeper go.
       Sam already ended that line.

     The game changed it, or it was over 30 s ago:
       That fish has changed since you looked.
       (same with clutch, offer, listing, bid,
        frag, decoration, stored piece, equipment,
        candidate, keeper, line, tank)

     A setting someone else just changed:
       Sam already changed that.
     ```
   - Not chosen: "Change some" ("Say which ones and how in the notes.").
2. **"Second: what others' actions look like in the alerts list when the action has no message of its own today.
   Approve?"** (Activity)
   - Chosen: **"Approve as written (Recommended)"**: "Small actions (a favourite, watching an animal, a tap on the glass,
     a photo's story line) add no line. A slider dragged keeps one line per person, updated to the newest value. Hold
     all / Resume use the lines in the preview." The preview, verbatim:

     ```
     Sam put automation on hold.
     Sam resumed all automation.
     Sam held water changes.
     Sam resumed autofeeders.

     (the same for salt mixing, live food
      and production lines)

     No line for: a favourite, watching or
     following an animal, a photo's story line,
     a tap on the glass, a bid held while a
     counter is typed.

     A slider or an amount changed again and
     again: one line per person, showing the
     newest value, while they keep at it.
     ```
   - Not chosen: "Change some" ("Say which ones and how in the notes.").
3. **"Third: when an action is refused, and the save screens inside a shared shop (you can't save, load, import or export
   a shared shop on your device). Approve?"** (Refusals)
   - Chosen: **"Approve as written (Recommended)"**: "Used exactly as in the preview." The preview, verbatim:

     ```
     Too many actions at once:
       Slow down a little: that was a lot of
       actions at once.

     An action that failed on the server:
       That didn't work, and nothing was
       changed. Please try again.
       (the game's usual words for a failed
        action)

     Settings › Saves, in a shared shop:
       This is CalliClub's shared shop: it
       saves on the server. Your own aquarium
       is saved and waits for you.
       [Back to my aquarium]

     Save, Load, Import or Export tried:
       The shared shop saves itself on the
       server.
     ```
   - Not chosen: "Change some" ("Say which ones and how in the notes.").
4. **"Last: one new case from chunk 12. If a club's shared shop is removed (only I can do that, at your request) while
   someone tries to open it, what should they see?"** (No shop)
   - Chosen: **"Approve as written (Recommended)"**: "Then they go back to where they came from." The preview, verbatim:
     `CalliClub has no shared shop any more.`
   - Not chosen: "Change it" ("Write the words you want in the notes.").

No notes were added.

## Decisions

1. **Every "Words still to approve" line in SHARED-SHOPS.md §8 is approved as drafted**, with names, clubs and systems
   filled in from the game (`{name}`, `{club}`; the hold lines name the system in lower case: water changes, salt
   mixing, live food, autofeeders, production lines). §8's table moves them to the approved words.
2. **The first-one-wins lines are the catalogue's** (`conflictText` in `src/sim/commands/shared.ts`); its "DRAFT" note
   becomes "approved (ADR-0048)" when chunk 13 next touches that file (a change in `src/sim` changes the shared build
   hash, so it goes with chunk 13's own changes there).
3. **`gone`** (chunk 12's closing for a club with no shop) reads "{club} has no shared shop any more." and goes back to
   where the player came from.

## Consequences

- OWNER_QUESTIONS group L is answered; chunk 13 builds the screens with §8's words and asks the owner before any other
  player-visible words.
