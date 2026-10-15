# ADR-0024 — Owner answers, group A: release 0.5.1, rollback saves, WebKit e2e, accessibility level, `?dev=1`, chunk 3's wording, step-size tolerances

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** between 3 and 4 (`docs/agent/OWNER_QUESTIONS.md` group A)\
**Requirements:** PERSIST-014, ACC-005, AUTO-016, NOTIFY-003, DES-007, DES-009; BACKLOG B-129, B-178

## Context

After chunk 3 every open owner question was gathered in `docs/agent/OWNER_QUESTIONS.md` (groups A to E). The next
session asked them with AskUserQuestion, group A first (two rounds). After group A the owner chose to stop and have the
docs made ready for a new session; groups B to E are still open.

## Decisions

1. **Release 0.5.1 now** (A1): chunks 2 and 3 go to players through PLAN.md's release step: the four checks on
   `next`, version 0.5.1 with its CHANGELOG entry, `next` merged into `main`, `main` pushed (GitHub Pages), Render
   checked and deployed by hand if it didn't update. This answer is the go-ahead for pushing `main` in that session.
2. **Rollback saves stay as they are** (A2): an older build that finds a newer save in its slot says so once, with
   "Refresh the page", and never writes over it. No "Save to another slot".
3. **Add a WebKit e2e project** (A3, B-129): the suite also runs in WebKit (Safari's engine), not the recommended
   Chromium only. Not built yet; PLAN.md schedules it.
4. **Accessibility target** (A4, B-178, ACC-005): WCAG 2.2 AA for text and controls, with solid panels under the
   high-contrast setting, in chunk 6.
5. **`?dev=1` confirmed** (A5): it allows the developer tools for that session only; the dev panel turns on with the
   Settings switch and doesn't open by itself.
6. **Chunk 3's five bits of wording stay** (A6): the ribbon colours in a Shows notification ("$120 prize · Blue
   ribbon.", Blue, Red, Gold, Green for 1st, 2nd, 3rd and HM); "1 fry is free-swimming in {Tank}." for one fry; "0% vs
   fair value" for a bid at fair value; lower-case species ("Prismatic betta in the shop"); a jammed Autofeeder's
   row shows its switch on beside "Paused — feed {name} by hand."
7. **Step-size tolerances accepted** (A7, AUTO-016 A1, design-intake-3 M7): across splits of game time into steps,
   job counts, run hours and stock units must be exactly equal; water values agree within stated tolerances (chunk
   3's tests: 0.15 °C, 0.05 pH, 3 % of nitrate). No fixed-point rewrite of the water integration.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-11, in two multiple-choice rounds. The questions are quoted
as asked; each option's label is followed by its description in brackets.

Question A1 (verbatim): "A1. Chunks 2 (shop and genetics) and 3 (automation and notifications) are on `next` and
fully tested. Release them to players as 0.5.1 now? (If yes, this answer is your go-ahead for me to push `main`, which
deploys GitHub Pages and maybe Render.)" Owner's answer (selected option): **"Release 0.5.1 now (Recommended)"**
("PLAN.md's release step: fresh four checks on next, version 0.5.1 + CHANGELOG entry, merge next into main, push main
(deploys Pages), check Render and deploy it by hand if it didn't update."). Not chosen: "Not yet" ("Wait for more
chunks; main and the live sites stay on 0.5.0.").

Question A2 (verbatim): "A2. After a rollback, an older copy of the game can't autosave into a slot that holds a
newer version's save; it says so once, with \"Refresh the page\". Offer more?" Owner's answer: **"Keep it as is
(Recommended)"** ("One message with \"Refresh the page\"; the newer save is never touched."). Not chosen: "Also offer
another slot" ("Add \"Save to another slot\" so the older copy can keep playing as a new save.").

Question A3 (verbatim): "A3. Run the e2e suite in WebKit (Safari's engine) as well as Chromium?" Owner's answer:
**"Add a WebKit project"** ("Slower runs; catches Safari-only bugs (iPhone players use WebKit)."). Not chosen: "No,
Chromium only (Recommended)" ("Fast and stable (about 8 minutes today).").

Question A4 (verbatim): "A4. What accessibility level should 0.5 aim for? Today, panels under the high-contrast
setting keep their glass look (B-178)." Owner's answer: **"WCAG 2.2 AA + solid panels (Recommended)"** ("WCAG 2.2 AA
for text and controls, with solid high-contrast panels, done in chunk 6."). Not chosen: "Fix only what's reported"
("No target level; fix accessibility issues as players report them.").

Question A5 (verbatim): "A5. Confirm how `?dev=1` works: it allows the developer tools for that session only, and the
dev panel turns on with the Settings switch (it doesn't open by itself)." Owner's answer: **"Confirm (Recommended)"**
("Keep it as built in chunk 1."). Not chosen: "Also turn the panel on" ("`?dev=1` should also switch the dev panel on
by itself.").

Question A6 (verbatim): "A6. Chunk 3's reviewer flagged five bits of wording that fill design slots without your say:
(1) Shows notification ribbons \"$120 prize · Blue ribbon.\" (Blue, Red, Gold, Green for 1st, 2nd, 3rd, HM); (2) \"1
fry is free-swimming in {Tank}.\" for one fry; (3) \"0% vs fair value\" for a bid at fair value; (4) lower-case
species, as in \"Prismatic betta in the shop\"; (5) a jammed Autofeeder's row shows its switch on beside \"Paused —
feed {name} by hand.\"" Owner's answer: **"Keep all five (Recommended)"** ("Leave the wording as built."). Not chosen:
"Change some" ("Say which ones and how in the notes (Other).").

Question A7 (verbatim): "A7. Automation must give \"the same outcomes and stateHash\" for any split of game time into
steps (AUTO-016 A1). Water chemistry is computed in steps, so the water itself can't be bit-identical across splits.
Accept stated tolerances for water values (chunk 3 tests: within 0.15 °C, 0.05 pH, 3 % nitrate), with exact equality
for job counts, run hours and stock units?" Owner's answer: **"Accept the tolerances (Recommended)"** ("Exact for job
counts, run hours, stock units; stated tolerances for water values."). Not chosen: "Require bit-identical water" ("A
fixed-point rewrite of the water integration (a large job).").

Question (verbatim): "That's group A. Go on to group B (chunk 4, Production lines: 3 rounds)? I'll open the production
screens in Preview first." Options: "Go on to group B" ("Open the production screens and ask B1–B10.") and "Stop here
for now" ("Record group A, do the 0.5.1 release if you said so, and leave B–E for later."). Owner's answer (typed):
**"do 2 but also update all documents to be fully ready for a new conversation and context window"**.

## Consequences

- The 0.5.1 release runs in the same session (PLAN.md "Releases" records it).
- The WebKit project needs Playwright's WebKit browser downloaded into `~/LocalTest/playwright` (the internal disk:
  check the free space first; no new npm package). PLAN.md puts it in chunk 6's hardening, where
  REL-013's repeated full runs include it; a WebKit-only failure found then is fixed, never skipped.
- AUTO-016 A1 reads with the tolerances above for water values; production lines (chunk 4) and the S3-D chains
  (chunk 5) state their own tolerances the same way (INTAKE C-45's reserve gallons within 0.01 gal).
- Groups B to E stay open in `OWNER_QUESTIONS.md`; the next session asks them first.
