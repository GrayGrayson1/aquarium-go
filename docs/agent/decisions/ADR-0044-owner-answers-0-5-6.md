# ADR-0044 — Owner answers, 0.5.6: the audit's five high findings (tank-sale bonuses on the animals, the live database fix, the codes kept, the save wording)

**Status:** Accepted\
**Date:** 2026-10-19\
**Chunk:** 9 (0.5.6, the audit's high findings; ADR-0043 decision 8)\
**Requirements:** REL-034 to REL-038

## Context

A seven-auditor audit of `c7c0d34` (0.5.5) on 2026-10-19 (Opus 5.5 at max effort; a private report, not in this
public repo) found 116 issues: 0 critical, 5 high, 30 medium, 65 low, 16 info. The owner chose to fix the five high
ones first, as 0.5.6 (ADR-0043 decision 8), and said "Yes, start". The five:

- **A1:** a read-only way of calling the invite lookup skipped the brake on wrong codes, so codes could be tried far
  faster than the docs said; the friend-code lookup had the same gap.
- **B1:** "Load online save" could push an aquarium kept only in the autosave out of every save.
- **B2:** signing out and in as someone else in one tab left another tab sending its aquarium to the new account.
- **D1:** one cheap animal in a tank switched its sale bonuses back on, and they multiplied the tank's and equipment's
  value too, which brought back the whole-tank resale loop B-138 had closed (about +30% a round).
- **E1:** loading, importing or replacing with an older copy of the same aquarium could lose the newer progress,
  because a slot's backup is listed (and kept) only when it holds a different aquarium. G1 (Replace and Import delete
  the listed previous copy without saying so) and B7 share the cause.

## The questions as asked, and the answers (one AskUserQuestion round)

1. **"The money loop (audit D1): putting one cheap animal in a tank switches its sale bonuses back on, and the bonuses
   multiply the price of the tank and equipment too, so buying a kit and reselling it with one $3 snail makes about
   30% profit every time. How should a stocked tank's sale price work?"**
   - Chosen: **"Bonuses on the animals only (Recommended)"**: "Welfare, compatibility, beauty and the display bonus
     raise only the animals' and living plants' value. The tank, equipment and decor sell at their plain value, and
     decor is valued at its normal price (not up to twice it). A well-stocked tank still sells well; a kit with one
     snail sells for about what its parts are worth. Changes the prices players see on tank sales."
   - Not chosen: "Bonus grows with stocking", "Leave it as it is".
2. **"The invite brake and the account-switch fixes (audit A1 and B2) need a change to the live database: invite and
   friend lookups made a certain read-only way get the same 'try again later' answer for every code, and the save
   functions check they're saving to the account the game thinks is signed in. It's free. May I apply it to the live
   project?"**
   - Chosen: **"Yes, apply it (Recommended)"**: "I test it on a throwaway local database first, then apply it, run
     Supabase's security check (must say no issues) and the live smoke test. The smoke test makes 100 wrong invite
     guesses, so for 10 minutes anyone typing an invite code is told to try again later; I'd note when I run it."
   - Not chosen: "Ask me again first".
3. **"With the read-only trick (A1), someone could have guessed a club's invite code in hours instead of weeks. Today
   there are 3 accounts, all known to you. Should the three clubs get new invite codes once it's fixed?"**
   - Chosen: **"Keep the codes (Recommended)"**: "The gap was open only a few hours and every account is one you know
     of. Links you've already sent keep working. I can check the account list for strangers any time."
   - Not chosen: "New codes for all three", "New code for Aquarium Go Friends only".
4. **"Lost progress when loading saves (audit E1, B1, G1): loading an older copy of the aquarium you're playing can
   lose the newer progress, and Load online save can push out an aquarium kept only in the autosave. The fix keeps
   the newer copy listed and says so. Approve this wording?"**
   - Chosen: **"Approve this wording (Recommended)"**: "The four dialog texts and two messages shown in the preview.
     Day numbers, names and slots fill in from the game." The preview, verbatim:

     ```
     LOAD, an earlier copy of the aquarium you're playing
       Load Slot 1?
       This is an earlier copy of the aquarium you are
       playing. Your current progress (Day 10) stays
       listed as “Previous autosave” until you switch
       again.
       [Cancel] [Save to Slot 3 & load] [Load]
       (the Save-to-slot button now shows here too)

     REPLACE, when the slot holds a later copy
       Replace Slot 1?
       It holds a later copy (Day 10) than the one you
       are playing (Day 2). The later copy stays listed
       as “Previous copy of Slot 1”, so this can be
       undone.

     IMPORT into a slot that holds a save (new dialog)
       Replace Slot 2?
       Slot 2 holds Reef Corner (Day 7, saved 2 hours ago).
       It will be replaced with the imported save. The
       old copy stays listed as “Previous copy of
       Slot 2”, so this can be undone.
       [Keep it] [Replace]

     ADDED to Replace and Import when a listed previous
     copy would go
       “Previous copy of Slot 2” (Coral Nook, Day 3) is
       deleted.

     LOAD ONLINE SAVE, another aquarium only in the
     autosave (message)
       Reef Corner was only in the autosave, so it was
       saved to Slot 3 first.
       — with every slot full, nothing loads:
       Reef Corner is only in the autosave and every slot
       is full. Free a slot in Settings › Saves first.
     ```
   - Not chosen: "Change some".

## Decisions

1. **Tank-sale bonuses apply to the animals only** (D1): the welfare, compatibility, beauty and "Coherent, ethical
   display" multipliers scale the livestock's and living plants' value, not the tank, equipment or hardscape;
   hardscape is valued at its base price (scale 1), as placing it charges. Loop tests pin it (corrected after the
   chunk's review, which found the first wording too strong): a kit, decor and one cheap animal are valued at no more
   than they cost at four sizes, and through the real market they rarely sell and never at the old buy-now profit
   (about +30% every round); a keen buyer can still pay a little over cost now and then (1.03–1.2× in 4 of 48 probe
   rounds), "about what its parts are worth". Following from it (the agent's reading, for the owner to confirm):
   rarity and lineage, which are about the animals, scale only the animals too, and a buyer's taste scales only the
   animal-and-plant share of a tank listing. This changes tank-sale prices players see, on purpose; seeded tests that
   shift say why.
2. **The live database fix may be applied** (A1, B2), after the local database check passes; then the security
   advisors (no issues) and the live smoke test. A1: a read-only call to the invite or friend lookup gets the brake's
   answer for every code. B2: the save functions take the account the game believes is signed in and refuse any
   other, and the game follows sign-in changes from other tabs.
3. **The three clubs keep their invite codes.**
4. **The save wording is approved as previewed** (E1, B1, G1): the strings above, with names, days and slots filled in
   (`describe()`'s "Name (Day N, saved …)" where a slot is described).

## Later in the same session

While the chunk's first full test pass and its review ran, the agent wrote: "I'll carry on when they finish: fix
whatever the review finds, run the second full pass, then send you a summary and what to try. Nothing goes live until
you say release." The owner's answer (verbatim): "release when green"

5. **Release when green:** the owner's go-ahead, in the session, to release 0.5.6 (Pages and Render) once the four
   checks pass twice in a row on the final code and the review's blockers are fixed.

## Consequences

- PLAN.md gets chunk 9's brief (0.5.6); REQUIREMENTS.json gets REL-034 to REL-038; BACKLOG.md notes the audit (the
  other 111 findings stay open, listed in the private report; security details stay out of the public repo until
  fixed).
- A new migration under `supabase/migrations` (never an edit of an applied one).
