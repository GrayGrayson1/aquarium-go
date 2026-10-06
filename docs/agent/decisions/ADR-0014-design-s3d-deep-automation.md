# ADR-0014 — Design ADR: S3-D deep automation (DESIGN-S3D)

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S3 (S3-D; also touches S3-C's Production screens)\
**Requirements:** AUTO-002, AUTO-012, AUTO-013, AUTO-014, AUTO-015 (blocked by DESIGN-S3D); AUTO-016 to AUTO-027 (the
invariants the design keeps); PROD-003, PROD-018, DES-008 (DESIGN-S3C-LINES); HARNESS-003

## Context

- S3-D's owner-visible surfaces wait for the owner's design (ADR-0002 decision 4). `DESIGN_REGISTRY.json` had
  DESIGN-S3D at `PENDING_OWNER_DESIGN`, and AUTO-002 and AUTO-012 to AUTO-015 are `BLOCKED` on it.
- On 2026-10-05 the owner had a Claude (Cowork) session design the S3-D layer on the owner's Claude Design canvas
  (https://claude.ai/artifact/SaZzQpkftDTxcZuzZQfgBk): three options, each with seven screens on phone and desktop.
- The brief set these rules, quoted word for word:
  - "This is design only: don't change game code, don't commit and don't push."
  - The game repo is "read only".
  - "Keep every existing board and note exactly as it is."
  - The desktop dock has 11 items: "don't add a 12th without solving that".
  - "Numbers must add up."
  - "Screenshot-check every board before publishing."
- The brief also said what follows the owner's choice, word for word: "make the chosen option clickable on phone and
  desktop, with the same controls column as the existing prototypes; write a design addendum for docs/agent/design/ and
  a Design ADR for docs/agent/decisions/ (master §8), so the build agent can use them."
- The owner chose a direction in an option review. A second round of questions the same day settled what the first
  left open.
- After the first capture the owner wrote, word for word: "so we have done our job.. but I don't think you created the
  actual missing stuff we added to see what the full accepted build all looks like". The session then drew the screens
  the follow-up answers added (canvas row "Automation · final · Accepted additions", Version 21) and brought the
  prototypes in line with them (Versions 21 to 23). While that was under way the owner asked, word for word: "I had the
  other agent running know that we had design docs - do I need to let them know we arent complete or do we still have
  everything we need". The answer: nothing decided was missing, but the handoff files would change, so the other
  session should wait for the refreshed folder before moving the capture in.
- **Where this was prepared.** While this ADR was being written, another session committed ADR-0012 and ADR-0013 to
  local `main` (S0 work), so this ADR is ADR-0014. New files in `docs/agent/design/` and `docs/agent/decisions/` count
  as protected files as soon as Git can see them (`protect.mjs` lists untracked files too). The owner was asked, word
  for word: "Another session is working in your AquariumGo repo right now. It committed ADR-0012 and ADR-0013 while I was busy, so my Design ADR will be ADR-0014. Any new file in docs/agent/design or docs/agent/decisions turns that session's "protected files" check red until someone commits it properly. Where should I save the design spec, screens and ADR?" The owner picked "Handoff folder for now (Recommended)".
  - The capture was therefore prepared in `/Volumes/Dev/Projects/AquariumGo-design-handoff/DESIGN-S3D/`, mirroring the
    repo paths.
  - `HANDOFF-S3D.md` there says where each file goes.
  - Renumber this ADR if 0014 is taken by the time it moves in.
- This ADR is the Design ADR that master §8 asks for. It runs the Design Change Gate and records the owner's answers
  word for word where the session still had them. It is **not** the design approval: the owner chose to approve after
  the intake note and an independent review (see Owner approval).

## Decision

1. **Capture (DESIGN_INTAKE step 1).** DESIGN-S3D is captured in `docs/agent/design/DESIGN-S3D/`. It was prepared in the
   handoff folder (see Context), and the next session moves it in:
   - `SPEC.md`, the normative addendum to the 0.5 spec;
   - `screens/`, 105 PNGs: the 26 final boards, the 16 accepted-addition boards and 63 prototype states;
   - `SOURCE.md`, the canvas version (Version 23, `1791264082-fb19`) and a SHA-256 for every exported file and board
     file.

   The registry entry moves to `RECEIVED`, with `path` pointing at `SPEC.md`.
2. **The design** (summary; `SPEC.md` is normative):
   - A new **Operations** panel is the hub, with tabs Overview · Water · Feed · Lines · Map. Early on only Overview,
     Lines and Map show; Water and Feed appear with their tiers.
   - Problems come first on the Overview and are one tap from the alerts bell.
   - **Hold all** (manual mode) sits in the header, with an amber HUD pill. It holds automation only.
   - On desktop, Operations takes the dock place Settings frees, so the dock stays at 11 and Settings becomes a top-bar
     gear. On phone, Operations is the first row of More.
   - From option B: automation chips on tank rows and the tank card; machines bought in Build › Facility and run from
     Operations; home-grown rows in Market › Supplies.
   - From option C: the facility Map (four layers, room-level on phone, from day one), route strips per line, and
     dashed locked tiles with a tier ladder.
   - New systems: a Water room, a live food room (Brine Shrimp Hatchery, infusoria jars, live-food dosers), and
     production lines that share tanks. Their names were reconciled with `src/data/**`.
   - The follow-up answers fix the rest:
     - the Room button stays the 3D room view, and the room view gets a "Facility map" chip;
     - the Lines and Production screens count for DESIGN-S3C-LINES' line cards and detail, with new lines set up
       through the 0.5 §11.1 steps;
     - food comes before salt in the stock manager's budget;
     - a 40 kg salt size is added;
     - prices are placeholders;
     - line slots run 1 · 2 · 3 · 4 · 6 · 8;
     - Automation notifications respect quiet hours;
     - before Tier 5, the Overview shows each system's status on its tile.
   - The row "Automation · final · Accepted additions" draws those answers: the room view with its Facility map chip,
     the Overview and the bell before the Operations Desk, setting up a second line on Day 12, salt in 5, 20 and 40 kg
     bags, and Production with every line slot used (SPEC §5.6, §7.1, §8.3, §8.5, §8.6, §8.6.1). The prototypes follow
     them, with a control for the game before the Operations Desk.
3. **On approval,** DESIGN-S3D becomes the design source for AUTO-002 and AUTO-012 to AUTO-015. Per decision 14 it
   also covers DESIGN-S3C-LINES' line cards and detail view. That entry's status is for the approval ADR to set.

## Owner's answers

### Option review (2026-10-05, first round)

The owner answered multiple-choice cards and typed some messages:

- **The typed messages,** quoted word for word, in order:
  - "ask me all the questions to go through these options 1 by 1 (question batches of 4)"
  - "where do we put problems that can be one tap to open? is there another option? what is the overview where does
    that live?"
  - "you will need to direct me each question to where the example lives and your recommendation"
  - "If we had a fifth tab, could we also add it to mobile just fine?"
  - "Can we look through the answers and see if this is redundant somehow, or does it serve a useful purpose with our
    current decisions?"
  - "we will want a biuld of what the whole app will look like with our choices. number 1"
- **The card answers** are the option labels the owner picked. This session could no longer recover the card question
  text word for word, so the Topic column paraphrases it.

| Batch | Topic (paraphrased) | Owner's answer (label picked) | In SPEC |
|---|---|---|---|
| 1 | Where problems open in one tap | Alerts bell | §7.1, §8.3 |
| 1 | Where the overview lives | Own panel | §5 |
| 1 | Room for it in the desktop dock | Settings to a gear | §5.1 |
| 1 | What tops the overview | Problems first | §7.1 |
| 2 | Option A's tabs | Keep four tabs (later extended by the Map tab, batch 5) | §5.3 |
| 2 | Where the manual override lives | Operations header | §5.2, §7.7 |
| 2 | Line rules | Rules stay in Production | §7.4, §8.6 |
| 2 | Operations on phone | First row in More | §5.1 |
| 3 | Option B's automation chips | Bring in the chips | §8.1, §8.2 |
| 3 | Buying machines | Buy in Build, run in Ops | §8.4 |
| 3 | Home-grown food in Market | Bring it in | §8.5 |
| 3 | Option B overall | Borrow parts into A | §2 |
| 4 | Option C's map | Build it now | §7.5 |
| 4 | Routes | Route strip per line | §7.4 |
| 4 | Early game | Ladder + dashed tiles | §7.1 |
| 4 | Option C overall | Borrow parts into A | §2 |
| — | The map on phone | Room-level map | §7.5 |
| — | Map areas | Grouping only | §7.5 |
| 5 | Where the map goes | Fifth tab: Map | §5.3 |
| 5 | Map layers | Keep four layers | §7.5 |
| 5 | New machines | all four | §4, §9 |
| 5 | What manual mode holds | Automation only | §7.7, §9.7 |
| 6 | Unlock gates | Keep as drawn | §9.1 |
| 6 | Where shortages come from | Stock budget | §9.6 |
| 6 | The 0.5 mismatches | Note in addendum | §17 |
| 6 | Map in the early game | From day one | §7.5 |
| 7 | Final static rows | Add a final row | Appendix A |
| 7 | The option rows | Keep them | Appendix A |
| 7 | Prototype scenarios | Normal day, Out of salt + line full, Manual mode on, Early game | Appendix B |

### Follow-up questions (2026-10-05, second round)

- **Owner's messages,** word for word, in order:
  - "ask me all the questions to go through these options 1 by 1 (question batches of 4)" (sent again);
  - "eli5. where can I see this" (the reply to the first, more technical wording of questions 1–4, which got no answers);
  - "what are we working on now?"
- **How the questions were asked:** after the "eli5" reply, each question came with a picture card showing where it
  lives on the canvas and the recommendation. A second try at questions 1–4 was cut off by a new message before the
  owner answered.
- **The table:** the questions below are exactly as asked and answered, and the answers are the labels the owner picked.

| # | Question (as asked) | Owner's answer | In SPEC |
|---|---|---|---|
| 13 | "1 · Room button (picture card 1). Today Room shows your whole room in 3D; the prototype makes it open the new Map. Which do you want?" | "Keep Room, add map button (Recommended)" | §5.6 |
| 14 | "2 · Several breeding lines (picture card 2). This design already draws the Lines tab and the one-line-at-a-time Production page. Should it count as the design for those screens?" | "Yes, reuse 0.5 setup (Recommended)" | §8.6 |
| 15 | "3 · Food or salt first (picture card 3). Rosa's $150 a day covers food ($141) but not salt. Who should get the money first?" | "Food first (Recommended)" | §9.6 |
| 16 | "4 · Bigger salt bag (picture card 4). The game sells 5 kg and 20 kg. The Water room uses about 3.5 kg a day. Add a 40 kg bag for $120?" | "Add 40 kg (Recommended)" | §4 |
| 17 | "5 · Prices and times (picture card 5). The research costs, upgrade prices and egg price are my guesses. How should the build treat them?" | "Placeholders (Recommended)" | §8.4, §8.8 |
| 18 | "6 · Breeding line slots (picture card 6). Proposed: Hobby Room 1, Specialty Shop 2, Aquarium Store 3, Public Showroom 4, Destination Aquarium 6, Grand Hall 8. OK?" | "Accept 1·2·3·4·6·8 (Recommended)" | §9.1 |
| 19 | "7 · Night-time alerts (picture card 7). If salt will run out and a water change will be skipped within a day, should the alert break quiet hours (10 PM–8 AM)?" | "Respect quiet hours (Recommended)" | §8.9 |
| 20 | "8 · Middle of the game (picture card 8). Before the Operations Desk, what should the Overview show when the Water room runs low?" | "Tiles show status (Recommended)" | §7.1 |
| 21 | "9 of 10 · Approving the design. Your repo's rules ask for one more check before you approve: a short intake note and a review by a different agent. When do you want to approve?" | "After the review (Recommended)" | §18 |
| 22 | "10 of 10 · The old A/B/C option rows on the canvas still show the earlier sample numbers (for example $48,705 at 6:40 PM); the final rows are corrected. Change the old rows too?" | "Leave them as reviewed (Recommended)" | header |

These answers settle design questions. They don't approve the design (`OPERATIONS.md` §2; answer 21 sets when approval
happens).

## Design Change Gate (master §8)

1. **Affected routes, screens and components.**
   - New: the `operations` panel and the routes in SPEC §6.
   - Changed:
     - the dock, top bar and HUD (`src/ui/hud/Dock.tsx`, `TopBar.tsx`, `AlertsPopover.tsx`);
     - the room view's chips (`RoomChips.tsx`). `TankBar.tsx`'s Room toggle is unchanged;
     - the More sheet and panel chrome (`src/ui/panels/common/PanelLayout.tsx`);
     - focus return (`src/ui/common/Sheet.tsx`);
     - the Tanks panel (`src/ui/panels/tanks/TanksPanel.tsx`) and the tank card (`src/ui/cards/TankCard.tsx`);
     - Build › Facility (`src/ui/panels/build/BuildPanel.tsx`);
     - Market › Supplies (`src/ui/panels/market/Supplies.tsx`);
     - Livestock › Production (the line picker's slot caption, + New line and the setup steps);
     - Visitors › Staff (`src/ui/panels/visitors/StaffTab.tsx`);
     - Research (`src/ui/panels/research/ResearchPanel.tsx`; Start on an available project);
     - Settings › Notifications (`src/ui/settings/SettingsPanel.tsx`).
2. **Master constitution.**
   - Keeps master §3: no networking; deep automation as ADR-0001 option C, with Tiers 2–5 kept and not reduced to
     switches (AUTO-028); several production lines; native deferred.
   - The S3 simulation rules hold (SPEC §3, §9.9): tracked resources only, no silent skips, last-run markers, one stage
     per creature, one listing per event, and a fixed job order when stock is short (AUTO-016 to AUTO-027).
   - No conflict found.
3. **Current product behaviour** (read at `b243b23`), with what changes:
   - Settings leaves the dock for a gear.
   - The Room toggle stays, and the room view gains a chip.
   - The stock manager keeps the urgency order but changes how salt's urgency is counted once a Water room exists;
     she still buys in 5 kg steps.
   - Market adds a 40 kg salt size.
   - The Autofeeder stays dry food only.
   - AUTO-010's per-change salt rule gives way to salt used at mixing once a Water room exists.
   - Panels keep the shared Expand button.
4. **Accessibility.** Covered in SPEC §13:
   - status is shown as an icon plus a word;
   - tablists, radio groups and labelled switches;
   - focus return, including the gear;
   - Esc closes;
   - no new motion;
   - manual mode is shown in words.
5. **Phone, landscape and desktop.**
   - Phone portrait (390×844) and desktop (1440×948) are drawn and prototyped.
   - Five tabs fit at 390px and scroll at 360px.
   - Phone landscape isn't drawn; it follows 0.5 §5.2/§5.6.
   - The dock's clearance to the camera chips at 1440px is about 10px in the prototype, so the 0.5 dock-width checks
     must be re-run (SPEC §5.1).
6. **Deep links and Back.**
   - Hash routes follow 0.5 §6, and the map layer replaces the URL.
   - Locked pages answer every route before their tier (master §43).
   - Unknown line ids show "not found"; `#/livestock/production/new` opens the setup steps while a slot is free.
7. **Simulation and state.**
   - New optional state (SPEC §10), with no new randomness.
   - The jobs are step-size invariant, run during offline catch-up and stay idempotent across save and load.
   - The overflow and per-tank allocation rules are in SPEC §9.2.
   - Old saves aren't required (ADR-0005 decision 1).
8. **Performance.**
   - Machine jobs run at hourly crossings, so cost is O(machines).
   - The dashboards derive from state.
   - Weekly money reads a 7-day ledger window.
   - The map is a static DOM of about 100 elements, with "+{n} more" tiles for big facilities.
9. **Test ids and screenshots.**
   - New test ids are listed in SPEC §14, including `room-facility-map` and the setup steps' ids.
   - Screenshots change for the dock, HUD, More, Tanks rows, the alerts drawer, Build › Facility, Supplies,
     Production, Staff, Research and Settings › Notifications.
   - Tests at risk: `tests/e2e/helpers.ts` `openPanel('settings')` (used by `save.spec.ts`), the panel loop in
     `boot.spec.ts`, `dock-width.spec`, the Production tests that assume one line, and Supplies tests that count the
     salt buttons (SPEC §15).
10. **Design ADR.** This document.
11. **Contracts and traceability.** These wait for approval: the requirement ids, the S3-D section of
    `docs/TEST_IDS.md` and the S3 slice contract (DESIGN_INTAKE steps 2, 4 and 6).

## Alternatives considered

- **Option B · In context** (no hub). Its chips, Build › Facility and Supplies rows were brought into A.
- **Option C · Facility map** (the map as the hub). The map became Operations' fifth tab.
- **A 12th dock item.** Ruled out by the brief.
- **Operations as a phone tab.** Ruled out: the tab bar stays at five.
- **The Room button opening the Map** (as first prototyped). Rejected (answer 13): it would remove the only way into the 3D
  room view.
- **Salt before food** (today's urgency rule). Rejected (answer 15).
- **A Problems list from Tier 2.** Rejected (answer 20): the gates stay as drawn.

## Consequences

- **Easier:** one place for every automated system; a normative spec, 105 screens and two clickable prototypes; names
  checked against the data; the remaining design questions are settled, and every screen they added is drawn.
- **Harder or riskier:**
  - Settings leaves the dock.
  - The dock is tighter.
  - S3-D adds sizeable simulation.
  - The stock manager's urgency rule changes once a Water room exists.
  - The map must scale to big facilities.
- **Review before capture:** a reviewer subagent checked the spec's numbers. Its findings were fixed on canvas
  Version 20 and in `SPEC.md`:
  - the day's money now counts Rosa's food and visitors;
  - weekly salt costs follow 5 kg steps;
  - the infusoria jar timings;
  - savings counted on what the tanks used;
  - the salt-reserve overflow and per-tank allocation rules;
  - the forecast as a dry run;
  - the Overview-tab dot;
  - the Water tab's Buy button;
  - colour-safe PNG exports.
- **Option rows:** they keep their earlier sample numbers (answer 22).
- **Filled in while drawing** (the owner wasn't asked; intake and the review may change them, SPEC §18 item 4): the setup
  flow's details and its route, the line naming rule and route ids, the slot caption wording, the Research Start state,
  and the "Why"/"Fix" links that open Operations › Lines before the Operations Desk.
- **Canvas notes:** besides the new row, the prototypes' sticky note now describes their new Room behaviour and the
  Operations Desk control. The final Market boards gained the three salt sizes below the fold; their screens are
  unchanged.
- **Protected files:** moving the capture in adds this ADR and `docs/agent/design/DESIGN-S3D/**` to protected paths
  and changes `DESIGN_REGISTRY.json` and `decisions/INDEX.md`. None of them is owner-only. `protect.mjs --update` needs
  an Accepted, committed ADR listed in `INDEX.md`, so the steps are:
  1. An independent reviewer signs off on the capture diff (`OPERATIONS.md` §10).
  2. This ADR becomes Accepted for the capture and the recorded answers. The design itself stays `RECEIVED` until the
     approval ADR.
  3. Commit, then run `node scripts/agent/protect.mjs --update --adr ADR-0014`.
- **Not done by this session** (the owner's instruction: no game code, no commits, no pushes):
  - moving the files into the repo;
  - the `INDEX.md` row and the registry change (both written out in `HANDOFF-S3D.md`);
  - commits;
  - the ledger event for the status change (step 7);
  - `INTAKE.md` (step 2) and the independent review (step 4).

## Verification

- Done before capture:
  - A layout check on the 26 final boards (clipped text, spills, tap targets under 44px) came back clean.
  - Sweeps of the 59 exported prototype states found only 0.5 components at their approved sizes and 0.5 sample text.
  - The sample's numbers were cross-checked (SPEC §16):
    - 17 tanks, 494 gal;
    - daily water 53.4 and 25.9 gal; 4.1 kg a batch;
    - 105 animals and 191 young;
    - the week: $1,133 − $136 = $997;
    - the day's money: $48,620 − $141 + $447 + $85 = $49,011;
    - 8.2 gal of salt water left on Day 41.
  - Names and prices were checked against `src/data/**` at `b243b23`.
  - The 16 accepted-addition boards passed the same layout check (the room view's 38px camera chips are marked as the
    exception SPEC §3 documents). The prototypes' 32 sweep states (16 per device) gave the same findings as Version 20;
    the new prototype states (room view, before the Operations Desk, salt sizes, slot captions) found only 0.5
    components at their approved sizes, 0.5 sample text and those camera chips.
  - An independent reviewer checked the refreshed spec, ADR, handoff notes and screens. Its findings were fixed in
    `SPEC.md` and on canvas Version 23: the Overview before the Desk built from whatever tiers the player has; research
    in progress; route ids that match the sample; a Feed tab action; the Grand Hall caption; Sort and Sell as editable
    fields; moving around the setup steps; salt toasts that count real batches; the Map's salt mixer status; one desktop
    sub-line; stale wording.
  - Every board file was read back from canvas Version 23 and matched its SHA-256 in `SOURCE.md`.
- Done during the build: the tests in SPEC §15, and screenshots compared with `screens/`.

## Owner impact

Yes:
- owner-visible scope and navigation (Operations, Settings to a gear, new systems and panels);
- new and changed protected files under `docs/agent/design/` and `docs/agent/decisions/`;
- new save fields once built.

## Owner approval

**The capture** was approved on 2026-10-06 by the owner in a top-level Cowork session (Claude desktop app; Claude Code
session `fba2c9be-b138-5280-9d88-73d0d368cce5`).

The owner wrote (verbatim): "The DESIGN-S3D refresh is done. The handoff folder
`/Volumes/Dev/Projects/AquariumGo-design-handoff/DESIGN-S3D` is final (canvas Version 23). Go ahead and move it into
the repo and start the intake as `HANDOFF-S3D.md` describes, using the ADR-0014 number you reserved."

Question (verbatim): "Your Mac is running verify-slice right now (unit tests just passed: 1,809/1,809; build is next),
so I'll wait for it to finish before writing anything into the repo. One rule changed after the design session wrote
ADR-0014: the rule-file lock (protect.mjs) now only accepts an ADR that quotes your own words, and ADR-0014's approval
section still says "Pending". May I record your message from just now, plus this answer, in ADR-0014 as your approval
of the capture (SPEC.md, SOURCE.md, the 105 screens, the ADR itself, the index row and the registry's RECEIVED entry),
then lock those files under it? The design itself stays unapproved until after the intake note and an independent
review, as you chose."

Owner's answer (selected option): **"Yes, record it (Recommended)"**, described as: "I quote your message and this
answer in ADR-0014's Owner approval section, limited to the capture. The design approval still comes later, in a new
ADR, after INTAKE.md and the review." The other option offered was "No, wait".

Question (verbatim): "One more, so I don't have to stop mid-way: the intake note (INTAKE.md) also goes in the design
folder, and the registry moves to UNDER_REVIEW after it. Both are locked files too, so they need your words in an ADR.
May ADR-0014's approval also cover writing INTAKE.md, setting DESIGN-S3D to UNDER_REVIEW, and locking those under
ADR-0014? Approving the design itself still waits for your decision after the independent review."

Owner's answer (selected option): **"Yes, cover the intake too (Recommended)"**, described as: "ADR-0014's scope adds
INTAKE.md and the UNDER_REVIEW status, the next intake steps you asked for. The design approval stays separate, in a
new ADR." The other option offered was "No, capture only".

Scope: the capture, as Decision 1 lists it, and the next intake steps (`DESIGN_INTAKE.md` steps 2 and 3):
- `docs/agent/design/DESIGN-S3D/SPEC.md`, `docs/agent/design/DESIGN-S3D/SOURCE.md` and the 105 PNGs in
  `docs/agent/design/DESIGN-S3D/screens/`;
- this ADR and its row in `docs/agent/decisions/INDEX.md`;
- the DESIGN-S3D entry of `docs/agent/design/DESIGN_REGISTRY.json` at `RECEIVED`, and then at `UNDER_REVIEW`;
- `docs/agent/design/DESIGN-S3D/INTAKE.md`, the intake note;
- `node scripts/agent/protect.mjs --update --adr ADR-0014` for those files.

None of them is owner-only. This approval doesn't approve the design, doesn't set DESIGN-S3D or DESIGN-S3C-LINES to
`APPROVED`, and approves no push, PR, deploy or other remote action. Following `OPERATIONS.md` §10, an independent
reviewer signed off on the capture diff before this ADR became Accepted
(`docs/agent/evidence/S0/reviews/design-intake-1.md`).

**The design approval is still to come.** The owner chose (answer 21, word for word above) to approve after the intake
note and an independent review. Next:
1. The session that moves the capture in records it as above. It then writes `docs/agent/design/DESIGN-S3D/INTAKE.md`
   (step 2) and moves the registry to `UNDER_REVIEW`.
2. A reviewer that wrote neither the spec nor the intake returns GREEN, YELLOW or RED (step 4).
3. The owner approves, changes or rejects. A new ADR records the question, the exact answer, the date and the scope
   (step 5), with an `owner-decision` ledger event (`OPERATIONS.md` §2). That ADR sets DESIGN-S3D, and per decision 14
   DESIGN-S3C-LINES' line cards and detail, in the registry.
