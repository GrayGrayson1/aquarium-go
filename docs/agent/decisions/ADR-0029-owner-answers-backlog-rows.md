# ADR-0029 — Owner answers, group E: backlog rows (and closing the harness-era rows)

**Status:** Accepted\
**Date:** 2026-10-13 (asked from 2026-10-11; the later rounds were answered on 2026-10-13)\
**Chunk:** before 4 (`docs/agent/OWNER_QUESTIONS.md` group E)\
**Requirements:** none directly; BACKLOG B-002, B-008, B-017, B-132, B-133, B-137, B-138, B-139, B-185, B-191,
B-193, B-194, B-195, B-196, B-197 (and B-130, whose loop tests wait on B-138 and B-139)

## Context

Group E holds the backlog rows that waited on the owner and block no chunk. Before asking, the agent read each row in
`docs/agent/BACKLOG.md` and the finding it cites in `docs/agent/archive/evidence/S0/reviews/
adversarial-review-2026-10-05.json`, and checked the code where the row describes it (B-197 now has about 50
suppressions, not 46; B-008's path is also in the archived copy on `next` and `main`, not only on `agent/s0-wip`). The
session that asked groups B to D asked group E in four AskUserQuestion rounds; the fourth also closed the
harness-era rows and asked how to go into chunk 4.

## Decisions

1. **A banner when the simulation keeps failing** (E1, B-002): "Something went wrong — your aquarium is paused. Save
   and reload." with Save and Reload buttons. Chunk 6 (hardening).
2. **Unknown research projects are left untouched** (E2, B-017): from the next release on, a build leaves a research
   project it doesn't know exactly as it is. 0.5.1 and older can't be changed. It lands in chunk 4, so the release that
   carries it precedes chunk 5's three new projects.
3. **The beauty and ethical-display bonuses need animals** (E3, B-138): an empty dressed tank sells for about what its
   parts cost; a beautiful stocked tank keeps its premium. Chunk 4, with B-130's loop tests.
4. **"Sales" counts sales, not animals** (E4, B-139): a sale counts once however many animals it has; "animals sold"
   stays its own counter; saves are adjusted so a quest in progress can still complete. Chunk 4, with B-130's loop
   tests.
5. **The 0.5 screens go into the repo** (E5, B-185): the owner exports the 45 screens and puts them where the agent can
   reach them; the agent adds them under `docs/agent/design/DESIGN-0.5/` with a list of what each shows. Waits on the
   owner's export.
6. **The shared Pages origin stays** (E6, B-191): revisit before any real accounts or tokens are stored.
7. **Tests run before publishing** (E7, B-193): the GitHub deploy runs typecheck and the unit tests before it builds,
   and Render's build command does the same; a failing test stops the deploy; e2e stays local. Chunk 6 (`deploy.yml`,
   `render.yaml`: core files, named in the commit). If Render's service keeps its own build command outside
   `render.yaml`, changing it there is a remote setting: ask the owner first.
8. **The morph data is fixed in chunk 6** (E8, B-194): the bristlenose fin overlay is renamed so each look has its own
   name (with a save migration), a data test checks that no two looks share a name, and the shown odds match how stock
   is really picked.
9. **The holding container's copy matches its stasis** (E9, B-195): "{name} was not part of the sale and is resting
   in a holding container (they don't eat or age there). Move {name} to a tank when you can." The Livestock row
   matches, and `docs/KNOWN_LIMITATIONS.md` says so. Chunk 4 if it touches the sell step's relocation in `listings.ts`
   (B-174), else chunk 6.
10. **"Move tank" on the tank card** (E10, B-196): it opens the existing placement ghost, with an e2e test. Chunk 6.
11. **No linter** (E11, B-197): hook dependencies are reviewed by hand; the stale food-picker list is fixed when a chunk
    is in that file (`src/ui/hud/ToolRail.tsx`).
12. **The home-folder path stays** (E12, B-008): no secret; no history rewrite.
13. **B-132, B-133 and B-137 are closed as "no action"** (ADR-0018): the harness's gates and evidence rules are gone;
    what they guarded is in `AGENTS.md`.
14. **Chunk 4 starts after a fresh context:** the agent records group E, pushes `next` and says so; the owner types
    `/compact`; the agent re-reads the docs and builds chunk 4.

## Owner approval

Given by the owner in a Claude Code session, in four multiple-choice rounds (the first on 2026-10-11, the later ones
answered on 2026-10-13). The questions are quoted as asked; each option's label is followed by its description in
brackets. The owner added no notes.

Question E1 (verbatim): "E1 (B-002). When a simulation step keeps throwing an error, the aquarium simply freezes: time
stops, nothing explains why, and the only trace is one message in the browser console. What should the player see?"
Owner's answer (selected option): **"A banner (Recommended)"** ("A banner: \"Something went wrong — your aquarium is
paused. Save and reload.\" with Save and Reload buttons. The player knows what happened and can keep their
progress."). Not chosen: "Nothing, as today" ("Leave it. A frozen aquarium with no explanation; reloading usually
fixes it, but the player has to guess.").

Question E2 (verbatim): "E2 (B-017). An older build closes any research project it doesn't know. So if a newer save
(with a project added later, as chunk 5 adds three) is opened in an older build, say after a rollback, that project is
lost and can be saved over. What should happen?" Owner's answer: **"Leave them untouched (Recommended)"** ("From the
next release on, a build leaves a research project it doesn't know exactly as it is, so it's still there when the
newer build opens the save. 0.5.1 and older can't be changed."). Not chosen: "Bump the save version" ("A release that
adds research projects bumps the save version, as new species do, so every older build (0.5.1 too) treats the save as
newer, never loads it and never writes over it (it says \"Refresh the page\").") and "Accept it" ("Old builds are
best-effort (ADR-0005); a rollback may lose a research project.").

Question E3 (verbatim): "E3 (B-138). An empty, freshly dressed tank sells at auction for more than its parts cost. A
40 gal kit with 6 plants and 2 stones and no animals nets about +20–25% after a 5-day hold, because the beauty
multiplier and the ×1.1 \"Coherent, ethical display\" bonus apply to the hardware, and empty tanks get the bonus too.
It's a money loop that needs no animals." Owner's answer: **"Bonuses need animals (Recommended)"** ("The beauty and
ethical-display bonuses apply only to tanks with animals, so an empty dressed tank sells for about what its parts
cost. A beautiful stocked tank still earns its premium."). Not chosen: "Leave it" ("Aquascaping is a craft that earns
a margin, even without animals.").

Question E4 (verbatim): "E4 (B-139). The \"sales\" counter counts animals, not sales. One quick sale of 25 shrimp
counts as 25, so it unlocks tank auctions and the \"Trusted Trader\" achievement at once, and multiplies business XP per
animal." Owner's answer: **"Count sales (Recommended)"** ("A sale counts once, however many animals it has. \"Animals
sold\" stays its own counter. Saves are adjusted so a quest in progress can still complete."). Not chosen: "Leave it"
("Bulk sales keep counting per animal, and unlocks come faster for players who sell in bulk.").

Question E5 (verbatim): "E5 (B-185). The approved 0.5 visual reference (45 screens) lives only in a private design
canvas, so a reviewer working from the repo can't compare the game with it (DESIGN-S3D's screens, by contrast, are in
the repo)." Owner's answer: **"Export into the repo (Recommended)"** ("You export the 45 screens (PNG) and drop them
somewhere I can reach; I add them under docs/agent/design/DESIGN-0.5/ with a list of what each shows. Reviewers can
then check the game against them."). Not chosen: "Leave it" ("Reviewers keep using the written 0.5 spec, which wins
over the pictures anyway.").

Question E6 (verbatim): "E6 (B-191). The game on GitHub Pages lives at graygrayson1.github.io, an origin it shares with
every other Pages site on the account. Saves, settings, notification permission and the service worker are all stored
per origin, so another site there could read or clear them. Today the only other sites are your own two static ones,
so the risk is small." Owner's answer: **"Leave it (Recommended)"** ("Keep it as is while the account hosts only your
own sites. Revisit before any real accounts or tokens are stored (not planned for 0.5)."). Not chosen: "Own domain"
("Move the game to its own domain or origin. Costs money (a domain), needs remote settings changed, and players need
their saves moved first (export and import).").

Question E7 (verbatim): "E7 (B-193). The GitHub Pages deploy and the Render build publish without running any tests.
Today I run the four checks myself before every release, so this would be a second safety net." Owner's answer:
**"Test before publishing (Recommended)"** ("The GitHub deploy runs typecheck and the unit tests before it builds, and
Render's build command does the same. A failing test stops the deploy. Adds a few minutes per deploy; e2e stays
local."). Not chosen: "Leave it" ("Rely on the checks run before every release.").

Question E8 (verbatim): "E8 (B-194). Some morph names and odds don't match what the game makes. Two different
bristlenose looks share one name (\"Super Red\" with \"Super Long-fin\" reads the same as with \"Long-fin\"), so they
share one discovery and one tier. And because a shop's rare offer picks the most striking of six rolls, some rare
morphs turn up more often than the \"about 1 in n\" the offer shows." Owner's answer: **"Fix the data in chunk 6
(Recommended)"** ("Rename the bristlenose fin overlay so each look has its own name (saves are updated), add a test
that no two looks share a name, and make the shown odds match how stock is really picked."). Not chosen: "Leave it"
("The mismatches are small and rare; keep the data as it is.").

Question E9 (verbatim): "E9 (B-195). When a tank is sold and some animals weren't part of the sale (or a damaged save
is repaired), they go to a holding container. There they're frozen in time: they don't eat, age or die. But the
message says \"Give {name} a tank soon\", which sounds urgent." Owner's answer: **"Match the copy (Recommended)"**
("Keep them safe and make the words honest: \"{name} was not part of the sale and is resting in a holding container
(they don't eat or age there). Move {name} to a tank when you can.\" The Livestock row matches, and the
known-limitations note says so."). Not chosen: "Make them age there" ("Animals in holding age and get hungry like
animals in a tank (no water, so they need a tank soon). Real urgency, but a forgotten animal can suffer or die.").

Question E10 (verbatim): "E10 (B-196). The room view has code for moving a placed tank, but nothing in the game opens
it, so players can't move a tank once it's placed." Owner's answer: **"Add \"Move tank\" (Recommended)"** ("A \"Move
tank\" action on the tank card opens the existing placement ghost, so players can rearrange their room. Comes with an
e2e test."). Not chosen: "Remove the dead code" ("Delete the unused move paths in the room view (the simulation's move
stays, tested). Tanks stay where they're first placed.").

Question E11 (verbatim): "E11 (B-197). The code has about 50 comments that silence a lint rule (React hooks'
dependencies), but no linter is installed, so nothing checks them. One of them hid a stale list in the food picker."
Owner's answer: **"Leave it (Recommended)"** ("No linter and no new dependency. Hook dependencies are reviewed by hand,
and I fix the stale food-picker list when I'm in that file."). Not chosen: "Install ESLint" ("Add ESLint with the
React hooks plugin as a development-only dependency and a lint command. New dependencies; some existing code will need
fixes.").

Question E12 (verbatim): "E12 (B-008). An archived review file has 4 copies of a home-folder path with your Mac user
name (/Users/…). It holds no password or key. It's public on GitHub in agent/s0-wip and also in next and main
(docs/agent/archive/evidence/S0/reviews/)." Owner's answer: **"Leave it (Recommended)"** ("It's only a user name.
Removing it from history means rewriting every branch and force-pushing."). Not chosen: "Redact from now on" ("Replace
the 4 paths with \"~\" in a normal commit on next. It disappears from the current files, but old commits still have
it.") and "Rewrite history" ("Remove it from every commit on every branch. Needs force pushes, which change the history
everyone has; you'd run or approve them.").

Question (verbatim): "Three backlog rows were about the retired harness's gates: B-132 (how an acknowledged test
failure or a \"not applicable\" gate could pass acceptance), B-133 (S3 scope could shrink one machine at a time without
an ADR) and B-137 (performance gating, perf.spec inside e2e, no performance baseline). Close them as \"no action\"
(ADR-0018)?" Owner's answer: **"Close all three (Recommended)"** ("The harness's gates and evidence rules are gone
(ADR-0018). What they guarded is now in AGENTS.md: never weaken, skip or delete a test; never quietly drop scope; never
count a test that didn't run; re-run a known flaky test alone before calling it a regression."). Not chosen: "Keep some
open" ("Say in the notes which to keep, and what you'd want done.").

Question (verbatim): "That's every open question. Next is chunk 4 (Production lines). Your routine between chunks is: I
bring the docs up to date and push, you type /compact, I re-read the docs, then I build. Do that now?" Owner's answer:
**"I'll /compact first (Recommended)"** ("I record group E, push next and tell you when it's done; you type /compact;
then I re-read the docs and build chunk 4. The build starts from the docs, not from this long session."). Not chosen:
"Go straight on" ("I record group E, push next and start chunk 4 in this context.").

## Consequences

- Every question in `OWNER_QUESTIONS.md` is answered (ADR-0024 to ADR-0029). New questions go there.
- Chunk 4 also does E2, E3, E4 (with B-130's loop tests) and E9 if it touches the sell step's relocation; chunk 6 does
  E1, E7, E8, E10 (and E9 if chunk 4 didn't). E5 waits on the owner's export. PLAN.md's chunk briefs list them.
- E3 and E4 change money and progression rules: chunk 4 runs the seeded tests before and after and explains every
  changed expectation (AGENTS.md "Deterministic simulation"). E4's save adjustment follows AGENTS.md "Saves".
- E7 changes `.github/workflows/deploy.yml` and `render.yaml` on `next`; they take effect only when `main` is pushed.
