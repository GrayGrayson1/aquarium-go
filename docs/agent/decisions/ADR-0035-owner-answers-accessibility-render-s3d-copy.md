# ADR-0035 — Owner answers, chunk 6's second round: the accessibility route, Render's build command, S3-D's copy

**Status:** Accepted\
**Date:** 2026-10-15\
**Chunk:** 6 (Social stub, hardening and the last 0.5 release)\
**Requirements:** ACC-005, DES-001, DES-013, DES-014; BACKLOG B-178, B-193; ADR-0024 decision 4, ADR-0026 decision 9,
ADR-0029 decision 7

## Context

Three findings during chunk 6 needed the owner, asked in one AskUserQuestion round of four:

1. **Accessibility.** A contrast audit (WCAG 2.2 AA, ADR-0024 decision 4) found that High contrast isn't solid yet (the
   glass tokens stay 85–97 % opaque with blur, `--c-glass-hover` has no high-contrast value, `.pn-sheet` keeps its
   translucent gradient), and defects in both modes: focus rings drawn outside HUD controls over the scene (1.1:1),
   unchecked checkbox and radio borders (2.5–2.8:1), selected states shown only by a faint tint and ring (2.0–3.4:1),
   the "Tank card" button's open state replacing the glass (1.4:1), dimmed informative cards, `--c-ink-4` used as
   text. In normal mode over a bright, sunlit room, grey text on the glass falls to 2.5–4.4:1, and passing there needs
   the 0.5 design's pinned §17 colours changed (`tests/sim/ui-tokens-05.test.ts`).
2. **Render.** ADR-0029 decision 7 asked for typecheck and the unit tests before Render's build. render.yaml now says
   so (`fa21505`), but the service (`srv-dath0mfavr4c73dgk3j0`) reported its own build command, `npm ci && npm run
   build`, and no Blueprint link, so render.yaml doesn't reach it; changing the service is a remote setting.
3. **S3-D's copy (DES-013).** An inventory of every DESIGN-S3D SPEC §11 string and §14 id against the code found 357
   strings as written, 18 the design words but the code lacks, 22 shipped reworded with no recorded reason, and about
   30 short strings chunk 5 shipped that neither the design nor an ADR words (ADR-0026 decision 9 sends those to the
   owner).

## Decisions

1. **AA through High contrast** (W3C technique G174): normal mode keeps the approved glass look with every defect fixed
   and passes over a dark room; High contrast passes AA for text and controls on any background (solid panels and HUD,
   stronger rings, borders and selected states); every step on the way to Settings › Play & access › High contrast
   passes AA too. The §17 colours stay as pinned.
2. **Render's build command is set** with the Render CLI to `npm ci && npm run typecheck && npm test && npm run build`
   (done on 2026-10-15; no deploy: the live deploy is still 0.5.1's `dep-db61hn3bc2fs73afp29g`).
3. **S3-D's copy is built as the design writes it**, with live values, where the design shows its sample ("marine
   tanks", "Iris × Sapphire") the general form staying: the 18 missing strings and the 22 rewordings in the preview below,
   chunk 5's tests updated on purpose.
4. **The ~30 unworded strings are approved as shipped**, exactly as in the preview below, and the copy test pins them.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-15, in one multiple-choice round of four questions. The
questions are quoted as asked; each option's label is followed by its description in brackets, and its preview where it
had one. The owner added no notes.

Question 1 (verbatim): "Accessibility (ADR-0024: WCAG 2.2 AA, solid panels under High contrast). An audit found High
contrast isn't solid yet (glass, sheets, hovers), plus defects in both modes (focus rings drawn over the scene, faint
checkbox borders, selected tabs shown only by a tint). Those all get fixed. The open point: in normal mode, grey text on
the glass drops to 2.5–4.4:1 when a bright, sunlit room is behind it. Passing there needs the approved design's pinned
colours changed (glass about 87% opaque instead of 68%, lighter grey). Which way?" Owner's answer (selected option):
**"AA through High contrast (Recommended)"** ("Keep the approved look. High contrast passes AA everywhere (solid panels,
stronger rings); normal mode gets every defect fixed and passes over a dark room, and the way to the High contrast
switch passes too (W3C technique G174)."; preview "Normal mode: the approved glass look, defects fixed / High contrast:
solid panels, AA text and controls on any background / Settings › Play & access › High contrast: reachable with every
step at AA"). Not chosen: "AA in normal mode too" ("Darken the glass and lighten grey text in normal mode as well,
changing the approved design's colours (§17): panels and the HUD look less see-through everywhere."; preview "Glass 68%
→ about 87% opaque / Grey text #8199a0 → about #96aab0 / Red text #f87171 → about #f98484 (every surface, both
modes)").

Question 2 (verbatim): "B-193: the GitHub deploy now runs typecheck and the unit tests before building, and render.yaml
says the same. But Render's service keeps its own build command (`npm ci && npm run build`) and isn't linked to
render.yaml, so Render would still publish untested. Changing the service's setting is a remote change. May I set it
with the Render CLI (nothing is deployed)?" Owner's answer: **"Yes, set it (Recommended)"** ("I run `render services
update` on srv-dath0mfavr4c73dgk3j0 to set the build command to `npm ci && npm run typecheck && npm test && npm run
build`. No deploy; it applies to the next one."; preview "build command: npm ci && npm run build → npm ci && npm run
typecheck && npm test && npm run build"). Not chosen: "Leave Render as it is" ("Only the GitHub Pages deploy runs the
tests; render.yaml documents the intent.").

Question 3 (verbatim): "DES-013 (chunk 5's copy, checked string by string): 18 strings the S3-D design words are missing
and 22 ship reworded with no recorded reason (screens I opened show three of them). Build the design's words? Where the
design shows its sample ("marine tanks", "Iris × Sapphire"), the general form stays." Owner's answer: **"Build the
design's words (Recommended)"** ("Every item in the preview, as the design writes it with live values. Takes a few hours;
chunk 5's tests are updated on purpose."). Its preview, verbatim:

> MISSING, to add: Problems salt: "{Name}'s ${b} budget won't stretch to a sack today: food comes first." · "{time}: the
> batch uses {b} kg; the {kg} kg left won't make another." · "{time}: the salt tanks run short…" · "Day {d} · {d}:
> morning water changes go ahead as normal" · Water: "The {time} batch drew {g} gal · full by {time}" · salt status
> "Order at {time}" · Lines: phone switch "Line on" · early "Listed now {n} · best bid {$}" · Map: "Pair waits" · "Next:
> {morph}" · "Breeding · {n} line with locked slots" · "Auto-feed on" · the phone Tier 2 row · Tier ladder: "{n} line
> now · {m} at a {Level}" · Tanks: the row's "Tank card" button · bell: each item's main action (e.g. "Add QT tank ·
> $95") · Production: "{n} larvae · baby brine and infusoria from the doser" · the held-up note's "Fix" · Staff: "Stock
> manager · skill {n} · checks the shelves at 9 AM and 3 PM" · "On shift" · Research: "New" on Facility rows ·
> REWORDED, back to the design: "{m} × {f} are ready to spawn" · "{u} of {c} places · sorting on Day {d}" ·
> "Quarantine {n} added" / "you chose to wait" · 40 kg toast "The salt mixer can start its next batch." · Feed
> "{species} larvae · {b} brine · {i} infusoria" · Lines "… · next stage in {h} h" · Map "{kg} kg · Low · {n} batch",
> "due {time} / Day {d}", "Full · {u}/{c}", "Open tank card", "{n} · Autofeeder" · Build "Each day" with "uses" · Bell
> "Manual mode since {time} · {n} of 5 systems held", "All {n} tanks look healthy." · New line "Breed · Raise ·
> Quarantine · Keepers" (capitals by style)

Not chosen: "Keep what shipped" ("Record each as an accepted difference; the test checks the shipped wording.").

Question 4 (verbatim): "Chunk 5 also shipped about 30 short strings that neither the design nor an ADR words (ADR-0026
decision 9 says they come to you). Approve them as shipped?" Owner's answer: **"Approve as shipped (Recommended)"**
("They stay exactly as in the preview, and the copy test pins them."). Its preview, verbatim:

> Overview: "Orders switched off" · "Nothing scheduled." · "Since now." · "Hatchery" · "Cone {i} harvest · {n}
> servings" · Problems: "Salt mix · {kg} kg in stock" · "{Name}’s orders" · "The batch uses {kg} kg." · "Brine shrimp
> eggs arrive at the next check" · "Vegetables arrive at the next check" · "{Raise} is full: {used} of {cap} places." ·
> Water: "Full" · "Full · the prep station makes {n} gal an hour" · "{g} gal mixing · ready {time}" · "{g} gal ready in
> the mixing tank" · "Next batch {time}: {g} gal, ready 12 hours later" · "Manual mode: {systems} on hold." · "Open" ·
> Feed: "Empty · needs vegetables" · "Eggs and vegetables for the cultures are in Market › Supplies." · "Open" · Lines:
> "Next clutch in {n} days" · "{m} and {f} are getting ready" · "Nothing dated yet." · Map: Key "Fresh water" · "Salt
> water (striped)" · "Live food (dashed)" · "Each tank names its lines; “waits” where a line is held up." · "Labels:
> gallons of water changes a day" · "Tanks" · aria "{Room}: see what’s in it" · "{n} sold" · "{$} this week" · Build:
> "The top level" · "Stock budget up to {$}"

Not chosen: "Change some" ("Say in the notes which to change and how.").

## Consequences

- ACC-005: High contrast becomes solid (tokens, sheets, HUD, toasts, title screens); the defects found are fixed in both
  modes; the §17 colours stay pinned. KNOWN_LIMITATIONS records that normal mode over a bright room relies on High
  contrast for AA (G174).
- B-193 is complete: Pages (`deploy.yml`) and Render (the service's own build command) run typecheck and the unit tests.
- DES-013: chunk 6 builds the design's words for the listed items and a copy test checks every SPEC §11 string and §14
  id, plus the approved unworded strings.
