# ADR-0020 — Owner answers for chunk 2: verdict wording in the offer detail, hidden white and double-tail carriers, new copy, gene nouns and tile reasons

**Status:** Accepted\
**Date:** 2026-10-08\
**Chunk:** 2 (shop and genetics)\
**Requirements:** MKT-007, MKT-009, MKT-010, GEN-002, GEN-005, GEN-012, DES-005, DES-006

## Context

Chunk 2 met four gaps the 0.5 design leaves to the owner: BACKLOG B-148 (the design puts the long verdict labels on
the tank tiles and fit badge while the compatibility box under them shows the short ones), B-136 (an owner-decision
row: Opaque White and Double Tail carriers next to an equal-dominance partner never count as hidden), player-visible
text the design doesn't give, and two places where §7.4.1 and §7.5 give only examples. The agent asked the four
questions together, once, as `AGENTS.md` asks; they and the answers are under "Owner approval".

## Decisions

1. **Long verdict labels in the offer detail.** The tiles, the fit badge and the compatibility box in the shop's
   offer detail all say "Excellent match" (the long `VERDICT_LABEL` of `src/ui/panels/common/format.ts`). Every other
   screen keeps the short labels ("Excellent"). The per-tile verdicts and the fit badge never carry
   `data-testid="compat-verdict"` (B-148), and `CompatPreviewLocal` is deleted.
2. **Two-copy traits sit below their partners (B-136).** Betta `white` and `double` move to dominance 0, one step
   below `yellow` and `crown`. A carrier then reads "Non-red yellow · carries opaque white (het)", counts as a hidden
   carrier for the Rare genes filter and the Genes panel, and names, the catalog, odds, rolling and inheritance are
   unchanged (dominance only feeds `expressedAlleles`). Rule for later data: an allele whose trait needs two copies
   sits strictly below the alleles it pairs with. This is an erratum to the spec's dominance table and glossary
   ("equal dominance shows both").
3. **New copy, approved as drafted:**
   - Encyclopedia › Aquarium science, "How genes combine: dominant, recessive and additive" (title from §16). Teaser:
     "Why a trait can skip a generation, and why some only show with two copies." Body:
     - "Every animal carries two copies of each gene, one from each parent, and passes one of them, chosen at random,
       to each of its young."
     - "**Dominant and recessive.** When the two copies differ, one usually wins: the dominant copy shows and the
       recessive one stays hidden. A Royal Blue betta can carry Cambodian without a trace of it. Pair two carriers
       and about 1 in 4 young get two hidden copies, and in them the trait appears."
     - "**Additive.** Some genes blend instead: each copy adds a little. One Metallic copy gives a betta a soft
       sheen; two give the full Metallic look. Because every copy shows, additive genes never hide."
     - "**Seeing what’s hidden.** The Genetics Lab reads both copies of every gene, so you can spot carriers in the
       shop and plan pairings before the first clutch."
   - The betta genetics note gains: "Cambodian and Metallic are single-gene simplifications too: Cambodian is a
     recessive that pales the body of red bettas, and one Metallic copy adds a soft sheen while two give the full
     Metallic look."
   - With no suitable tank (the design gives only marine): "Brackish animals need a brackish tank. Build one first;
     the offer stays until it expires." and "Freshwater animals need a freshwater tank. Build one first; the offer
     stays until it expires."; the badge "No freshwater tank"; the button "Build a freshwater tank" (phone "Build a
     tank").
4. **Gene nouns and tile reasons.**
   - The Genes panel's rule summaries take their noun from the gene's name: colour, hue or tone genes → colour /
     colours; pattern → pattern / patterns; fin, finnage or tail → fin type / fin types; line → line / lines; body
     type or form → form / forms; anything else → version / versions (e.g. axolotl Albino: "Dominant over every other
     version", "Recessive to Normal").
   - Destination tiles show the verdict word, plus "too warm/cold for {animals}" only for a temperature reason
     ("High risk — too warm for axolotls"); every other reason stays in the compatibility box below.

## Consequences

- MKT-009's "Tile verdicts use 'Excellent match' …" holds in the offer detail; `src/ui/common/format.ts`'s short map
  is unchanged.
- BACKLOG B-136 and B-148 are fixed in chunk 2.
- The design's §7.4.1 noun list and §7.5 "short form of the top reason" are read through decision 4.

## Owner approval

Given 2026-10-08 by the owner in the chunk 2 Claude Code session, through four multiple-choice questions.

Question 1 (verbatim): "Compatibility wording in the offer detail (BACKLOG B-148): the design puts \"Excellent match\"
on the tank tiles and fit badge, but the compatibility box under them says \"Excellent\". Which wording should the
offer detail use throughout?"

Owner's answer (selected option): **"Long labels (Recommended)"**, described as: "\"Excellent match\" on the tiles,
the fit badge and the compatibility box, in the offer detail only. Every other screen keeps \"Excellent\"." (Not
chosen: "Short labels everywhere".)

Question 2 (verbatim): "Hidden Opaque White and Double Tail carriers (BACKLOG B-136): a Yellow betta carrying white (or
a Crowntail carrying double) shows as \"Opaque white (both expressed)\" and never counts as a hidden carrier, so the
Rare genes filter would miss about 1% and 2% of shop bettas. Fix it in the data by putting white and double one step
below yellow and crown?"

Owner's answer (selected option): **"Yes, fix it (Recommended)"**, described as: "Data only (dominance 0 for white
and double). Names, catalog counts, odds and breeding are unchanged; the card then says \"Yellow · carries opaque
white (het)\" and the filter finds them." (Not chosen: "Leave as is".)

Question 3 (verbatim): "New text the designs don't give. Approve these drafts (choose Other to send edits)?" The
drafts were shown as decision 3 gives them.

Owner's answer (selected option): **"Approve as written (Recommended)"**. (Not chosen: "Leave them out for now".)

Question 4 (verbatim): "Genes panel and tank tiles, two gaps in the design: (a) the rule summaries name a noun
(\"Dominant over every other colour\"), but the design only gives colour, pattern, fin type and line; (b) tiles should
show \"a short form of the top reason\", but the design only defines the temperature one. OK with this?"

Owner's answer (selected option): **"As proposed (Recommended)"**, described as: "Nouns from the gene's name, falling
back to \"version\". Tiles show the verdict word, plus \"too warm/cold for {animals}\" only for temperature; other
reasons stay in the compatibility box below." (Not chosen: "Tiles: verdict word only".)
