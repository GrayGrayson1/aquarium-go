# ADR-0027 — DESIGN-S3D approved for chunk 5 (deep automation)

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** before 5 (`docs/agent/OWNER_QUESTIONS.md` C15)\
**Requirements:** AUTO-002, AUTO-012 to AUTO-015, AUTO-022, AUTO-028, `INTAKE.md` §12's proposals; NAV-004, CONST-002
(NAV-020)\
**Design:** `docs/agent/design/DESIGN-S3D/` (SPEC.md, screens/, SOURCE.md), its intake note `INTAKE.md`

## Context

ADR-0014 recorded the owner's design answers for S3-D and their choice (answer 21) to approve the design after an
intake note and an independent review. The intake (`INTAKE.md`) was reviewed twice (design-intake-2 and design-intake-3,
both YELLOW, in `docs/agent/archive/evidence/S0/reviews/`); their findings are folded into the intake or put to the
owner. The owner answered the intake's open rows in groups B (ADR-0025) and C (ADR-0026), then approved the design.

## Decision

**DESIGN-S3D is approved** as chunk 5's design: SPEC.md and its screens, read with `INTAKE.md` §11's resolutions,
§12's requirement proposals, and the owner's answers in ADR-0025 (the production screens, SPEC §8.6 and §8.6.1, for
chunk 4) and ADR-0026 (C1 to C14). Where they differ from SPEC.md, the ADRs win, then the intake.

**The approved 0.5 items it replaces** (C2, `INTAKE.md` C-2, C-58, C-59; DESIGN-0.5's `overriddenBy`):

1. **Settings as dock item 11** (0.5 §5.1, §5.4) → a gear in the top bar (`hud-settings`), in every build (ADR-0026
   decision 1). The dock gains Operations after Build.
2. **The More sheet's height** (0.5 §5.3, §17: top at about 48 % of the height; NAV-004 A1) → top at about 40 % (334 px
   of 844), for the Operations row, with the same ± 3 % tolerance.
3. **The production tiles' wording** (0.5 §11.1: "Listed now"; "This week · +$146 · After food and power") →
   "Quarantine"; "This week" shows sales and count ("$369 · 9 sold") with a second line for the net after food and
   power (ADR-0026 decision 3).
4. **The test helper that opens Settings from the dock** (0.5 §20.4: `helpers.openPanel` at desktop for settings by
   its dock id; CONST-002 A1) → it clicks `hud-settings` and waits for `panel-settings`; no assertion weakens (C-59,
   named in NAV-020).

Already replaced by ADR-0025: 0.5 §11.1's single-line Production UI (→ SPEC §8.6 and §8.6.1) and 0.5 §15 and §20.1's
dropping of lines with missing references on load (→ the line is paused and kept).

## Owner approval

Given by the owner in a Claude Code session on 2026-10-11, in the fourth round of group C (with C13 and C14, recorded
in ADR-0026). The question is quoted as asked; each option's label is followed by its description in brackets. The
owner added no notes.

Question C15 (verbatim): "C15. With your answers to C1–C14, approve DESIGN-S3D (deep automation: the Operations hub, the
Water and Live food rooms, Hold all, Settings on a gear) for chunk 5? I record it in its own ADR and in INTAKE.md §14,
and write the five intake fixes that need no owner (M3, M4, M5, R4, R5) before chunk 5. Chunk 5 starts after chunk 4."
Owner's answer (selected option): **"Approve (Recommended)"** ("DESIGN-S3D, with the intake's resolutions and your
answers, is chunk 5's design. It replaces the 0.5 items named in C2."). Not chosen: "Not yet" ("Chunk 5 stays blocked.
Say in the notes what's missing.").

Question (verbatim): "That's all of group C. Go on to group D (one question: the Social stub's empty trades and friends
lists, 1 round)?" Owner's answer: **"Go on to group D"** ("Ask D1 now. I record group C (two ADRs, including the
DESIGN-S3D approval) and push next first."). Not chosen: "Stop here for now" ("I record group C, push next and start
chunk 4. Groups D and E wait for another time.").

## Consequences

- ADR-0014's "design approval pending" is settled; `INTAKE.md` §14 records this decision, and its registry status reads
  approved.
- Chunk 5 starts after chunk 4 (PLAN.md). Before it, the agent writes design-intake-3's M3, M4, M5, R4 and R5 into the
  intake (no owner needed) and applies §12's proposals to `REQUIREMENTS.json` as the chunk's requirements.
- NAV-004 and CONST-002's checks change in chunk 5 with the dock, gear and More sheet (named in NAV-020).
