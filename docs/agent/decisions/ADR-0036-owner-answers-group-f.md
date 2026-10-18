# ADR-0036 — Owner answers, group F: the show quest's wording, five tables pinned to the save format, Settings' "Save now"

**Status:** Accepted\
**Date:** 2026-10-16\
**Chunk:** after 0.5.3 (chunk 6's review left these to the owner)\
**Requirements:** PERSIST-003 (A7, added), PERSIST-004 A3; BACKLOG B-175; ADR-0005 decision 1, ADR-0016 decision 2;
OWNER_QUESTIONS F2–F4

## Context

Chunk 6's fresh reviews left four questions to the owner (OWNER_QUESTIONS group F). F1, the VoiceOver pass for ACC-005,
is the owner's to do during the play-through and stays open. The other three were asked together in the session's
chat, after 0.5.3 shipped:

1. **F2, the quest's wording.** "Best foot forward" reads "Enter a show. A healthy, settled adult that trusts you shows
   best." Since B-175 (chunk 6) it completes when the entry is judged, and a withdrawn entry never counts.
2. **F3, the save format.** Since chunk 6 (PERSIST-004 A3) a save's water class, show tier, buyer type, staff role or
   staff trait that the game's tables don't know is reset or removed on load, with a note. ADR-0016 decision 2 makes a
   new species or tank size raise `SCHEMA_VERSION`, so an older build refuses such a save as too new; nothing did the
   same for these five tables, so an older build opened after a rollback would convert those tanks, delete those shows
   (their entries lose their tier and stay "entered", never judged, their fees kept; B-203) and remove those team members
   for good.
3. **F4, Settings' footer.** Settings has a "Save now" footer from before 0.5 ("Autosave keeps your progress. Save now
   any time.") on every tab. No approved Settings screen draws it, and on a phone it hides part of Notifications' list.

## Decisions

1. **F2:** the quest reads "Enter a show and see it judged. A healthy, settled adult that trusts you shows best."
   (`src/data/quests.ts`).
2. **F3:** adding a water class (`CLASS_DEFAULTS`), a show tier (`SHOW_TIERS`), a buyer type (`BUYER_ARCHETYPES`), a
   staff role (`STAFF_ROLES`) or a staff trait (`STAFF_TRAITS`) raises `SCHEMA_VERSION`, as a species or a tank size
   does (ADR-0016 decision 2), with that change's migration, test and docs entry (PERSIST-003 A4).
   `tests/sim/core-save-forward-safety.test.ts` pins the five tables' keys per save format (`TABLES_AT`, first pinned
   at v2; v1 had no pin) and fails when one is added or removed without the bump. PERSIST-003 gains A7.
3. **F4:** the "Save now" footer shows on Settings' General and Saves tabs only; Play & access, Notifications and About
   have none. Saves keeps its own save buttons too. Moving to a tab without the footer while Save now has focus (a
   link, as with Back and Forward) moves focus to that tab, not to the page (the fresh review's note; a clicked tab
   takes focus itself).

**Found while building decision 3 (and in its fresh review).** The recommended option's description in
OWNER_QUESTIONS said Notifications, Play & access and About would then "show their whole list", and the question and the
agent's message counted Notifications' categories as five. Both were wrong: Notifications has six categories (chunk 5
added Automation), and none of the three tabs fits a 390×844 phone. Measured there (Chromium and WebKit agree), the
footer took 67 px (what shows ended at 703 instead of the tab bar's 770); the categories that now show whole before
scrolling, by the browser's notification state (it sets the status card's height):

| State | Without the footer | With it (before) |
|---|---|---|
| none, as in an iPhone Safari tab | 4 of 6 (to Breeding) | 3 of 6 |
| blocked | 4 of 6 | 3 of 6 |
| not asked yet | 3 of 6 (to Market) | 2 of 6 |
| allowed | 3 of 6 | 2 of 6 |

Play & access runs to 959 px and About to 1,194 px, so both still scroll. The owner is told this when the change is
reported. `tests/e2e/mobile-sheets.spec.ts` checks the table's first row (no notifications, 4 of 6, and the tab's end clearing
the tab bar); `tests/e2e/save.spec.ts` checks the footer tab by tab and the focus.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-16, in chat (not a multiple-choice round). The owner first asked
"what were the three decisions?"; the agent's answer is quoted verbatim below, then the owner's reply.

The agent's message (verbatim):

> These are the code and design reviews' leftovers (questions F2 to F4 in `docs/agent/OWNER_QUESTIONS.md`). None of
> them blocks anything. Each lists my recommendation first.
>
> **1. The "Best foot forward" quest's wording**
> - It reads "Enter a show. A healthy, settled adult that trusts you shows best."
> - It now completes only when the show is judged, and pulling an entry out doesn't count. So the wording promises a
>   little less than the quest asks for.
> - Options:
>   - **Change it to "Enter a show and see it judged. A healthy, settled adult that trusts you shows best."**
>   - Keep it.
>   - Give your own wording.
>
> **2. Saves after a rollback to an older version**
> - When a save contains a water type, show tier, buyer type, staff role or staff trait the game doesn't recognise, it
>   now resets or removes it instead of crashing.
> - Say a later version adds one, and you then roll back to an older version. The older version would permanently:
>   - convert those tanks,
>   - delete those show entries (and keep their fees),
>   - remove those staff members.
> - Options:
>   - **Treat adding one as a save-format change, as new species and tank sizes already are.** The older version
>     would then refuse the save ("Refresh the page") and leave it alone. A test would check it.
>   - Keep unknown entries but switch them off, instead of removing them. That means more code in every system that
>     reads them.
>   - Leave it as is, since old versions are best-effort anyway.
>
> **3. Settings' "Save now" footer**
> - It reads "Autosave keeps your progress. Save now any time." It's left over from before 0.5, and none of the
>   approved Settings screens include it.
> - On a phone, it hides part of the Notifications list: only 3 of the 5 categories show before you scroll.
> - Options:
>   - **Keep it on the General and Saves tabs only.**
>   - Keep it on every tab, as now.
>   - Remove it, since the Saves tab has its own save buttons.
>
> The VoiceOver pass is the other item still open, but it's something to check during your play-through rather than a
> choice.
>
> Give me your picks, or say "go with your recommendations". I'll record them in a decision record, make the changes
> with tests, and hold the release as 0.5.4 until you say go.

Correction to the message (not to the owner's answer): Notifications has six categories, not five (see "Found while
building decision 3"); "only 3 of the 5" came from the QA review's count.

The owner's reply (verbatim): **"lets go with your recommendations"**. So: F2 "Change it to …", F3 "Treat adding one
as a save-format change", F4 "Keep it on the General and Saves tabs only". Not chosen: F2 "Keep it", "Give your own
wording"; F3 "Keep unknown entries but switch them off", "Leave it as is"; F4 "Keep it on every tab", "Remove it".

## Consequences

- The three changes ship in the next release (0.5.4), only with the owner's go-ahead in the session.
- `AGENTS.md` (Saves) and PLAN.md's "Product decisions in force" state the wider rule.
- F1 (VoiceOver) stays open in OWNER_QUESTIONS until the owner's play-through.
