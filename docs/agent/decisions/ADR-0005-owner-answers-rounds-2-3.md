# ADR-0005 — Owner answers, review rounds 2 and 3 (saves, dev tools, Social, rarity, S3-D, designs, main, backups)

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** ALL\
**Requirements:** PERSIST-001, PERSIST-003, PLAT-005, SOC-011, GEN-013, AUTO-002, PROD-018, HARNESS-008

## Context

The owner answered two more rounds of questions in a top-level Claude Code session. Each question and answer is
recorded word for word (`OPERATIONS.md` §2).

## Decisions

### 1. Save policy

Question (plain-words version): "Save policy, in plain words: every save carries a format number (now 1). If a later
version changes the save format to 2, a player who still has an old copy of the game open in another tab sees the new
save as 'damaged', quietly loads an older backup, and can then save over the new one. That loses their progress.
Should this build be allowed to change the save format?"

Owner's answer (verbatim): "I'm not worried about current games and saves. lets move forward allowing good saves
going forward but we don't care about old games at the moment"

Resulting rule:
- Loading old (v0.4.0) saves is **not required**; compatibility stays best-effort (master §3.5 as the owner wrote
  it). PERSIST-001 is superseded.
- A schema change is allowed when a feature needs it, documented and tested (master §3.5).
- "Good saves going forward": the save code this build ships must be sound for future versions. It must never treat a
  save written by newer code as damaged, fall back past it or overwrite it, so a later format change can't destroy
  progress (PERSIST-003), and the new data shapes are validated on load.

### 2. Developer tools in production builds

Question: "Anyone can open the browser console on your live site and use window.__AQ to give themselves money, unlock
everything, or edit or delete saves (?dev=1 even turns dev mode on permanently). … What should production builds
include?"

Owner's answer (selected option): **"Write tools only with ?dev=1 (Recommended)"**, described as: "Read-only
diagnostics always. Cheats and save editing only in dev builds or with ?dev=1 for that one session (not remembered).
QA scripts use ?dev=1."

Resulting requirement: PLAT-005.

### 3. Social sign-in stub

Question: "The approved design's Social stub (S4) has a fake sign-in with email and password fields. Browsers may
offer to save a real password there, and the stub stores the email. How should it look?"

Owner's answer (selected option): **"Dev mode only"**, described as: "Social appears only in dev mode until a real
backend exists."

Resulting rule: the whole Social stub (panel, dock item, More tile, routes and deep links) is reachable only in dev
mode until a real backend exists. This overrides design D2, D5 and §13's visibility for players; the stub itself is
still built and tested as designed (SOC-011, design registry).

### 4. Rarity tiers

Question (plain-words version): "Rarity, in plain words: every betta colour/pattern/fin combination gets a label from
Common to Legendary based on how often shops sell it. … 466 of 540 bettas would be labelled 'Legendary'. … What
should S2 do?"

Owner's answer (verbatim): "lets do one but write in for testing to count those numbers so we can adjust what we
need based on real numbers"

Resulting rule: option one. S2 keeps today's tier rule and reports the real counts per tier; the owner decides any
change from those numbers. A counting tool is added now: `npm run report:rarity` (GEN-013).

### 5. Where S3-D sits

Question: "The extended automation (S3-D …) waits for your Claude Design screens. Where should it sit in the build
order?"

Owner's answer (selected option): **"Keep it in S3 (Recommended)"**.

### 6. Multi-line Production screens, designs, and local main

Question: "You decided on several production lines per species, but the approved Production screens show one line
card per species. Who designs the screens for several lines?"

Owner's answer (verbatim): "I'm just finalizing the designs now to give to you. what we need to do is make sure this
is local main, update everything we have and haven't done, prune old info, add new info to update our docs and next
chunk I'll have fed the designs in"

Resulting rules:
- The multi-line Production screens come with the owner's designs (DESIGN-S3C-LINES, pending, like DESIGN-S3D). The
  next session starts with design intake (`design/DESIGN_INTAKE.md`).
- **Local `main` is the integration branch.** This work is fast-forwarded onto local `main` and continues there. This
  replaces the separate `agent/…` integration branch and the "never commit on main" rule (ADR-0003 rule 5). Nothing is
  pushed: a push of `main` deploys GitHub Pages, so it still needs the owner's recorded approval (REL-001).
- The docs are brought up to date: what is done and what isn't, with obsolete information pruned.

### 7. Backups

Question: "Nothing gets pushed during the build, so every accepted checkpoint exists only on the X9 Dev image, which
Time Machine excludes. … Should checkpoints be backed up?"

Owner's answer (selected option): **"Bundle to another drive (Recommended)"**, described as: "After each checkpoint,
write a git bundle (about 15 MB) to a folder you choose on a different drive. It's local only, and you can restore it
with git clone."

Resulting rule: after each checkpoint the orchestrator writes and verifies a git bundle in the folder named by
`STATE.backupDir` (HARNESS-008). The owner hasn't named the folder yet; until then the checkpoint step asks for it
(owner question in `HANDOFF.md`).

## Consequences

- PERSIST-001 is superseded; PERSIST-003 becomes the forward-safety requirement.
- New requirements: PLAT-005 (dev tools), SOC-011 (Social dev-only), GEN-013 (rarity counts), HARNESS-008 (backups).
- ADR-0003 rule 5 is replaced by decision 6.

## Owner impact

Yes. These are the owner's own decisions.
