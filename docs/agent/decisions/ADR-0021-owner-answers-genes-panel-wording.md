# ADR-0021 — Owner answers for chunk 2's review: a gene that doesn't show, "all their young", and unsexed animals

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** 2 (shop and genetics)\
**Requirements:** MKT-007, MKT-008, DES-005

## Context

Chunk 2's reviewer found that the offer's Genes panel could name alleles before the Genetics Lab that the animal's
look doesn't show (Cambodian on a royal-blue betta, a clownfish's black/orange gene under Platinum white), and that the
lab advice could read "about 2 in 2 young". Fixing both needs wording that neither the 0.5 design (§7.4.1, §16) nor
ADR-0020 gives, and the design's advice template ("Pair {him/her} with…") has no form for an unsexed animal. The
agent asked the owner two questions; they and the answers are under "Owner approval".

## Decisions

1. **A gene that leaves no trace on the animal's look**, before the Genetics Lab: the row's trait column reads
   **"Can’t be seen on this animal"**, the copies chip stays "+ ?", and there is no rule summary under it. After the
   lab the row shows the real alleles as for any other gene.
2. **Every youngster would show the trait** (a share of 97 % or more): the advice reads "Genetics Lab: {He/She/It}
   carries {Trait}: paired with {Partner}, **all their young** would be {Trait as shown}." (e.g. "… paired with Cinder,
   all their young would be Red Cambodian."). Other shares keep "about {n} in {d} young", never "n in n".
3. **An unsexed animal** (shrimp, snails, unsexed young): "Genetics Lab: **Pair it** with another {Trait} carrier for
   about 1 in 4 {Trait} young." and "It carries …".

## Consequences

- Before the lab, a Genes row says only what every allele pair with the same look shares, so two animals that look
  alike read alike (`lookalikePairs` in `src/ui/panels/market/offerGenetics.ts`).
- Erratum to §7.4.1's copies-chip rule: "a new-gene locus with no copy that would be visible gives 'no copies'"
  holds for Metallic (additive) only; for Cambodian, C/C on a red betta looks the same as C/c, so the chip is "+ ?".

## Owner approval

Given by the owner in the chunk 2 Claude Code session, 2026-10-11.

Question 1 (verbatim): "Genes panel, before the Genetics Lab: some genes can't be seen at all on a given animal (e.g.
Cambodian on a royal-blue betta, or a clownfish's black/orange gene under Platinum white). Showing an allele name there
would leak what the lab should reveal. What should such a row say in its trait column?"

Owner's answer (selected option): **"Can’t be seen on this animal"**, described as: "Trait column reads that line, the
copies chip stays \"+ ?\", no rule summary under it. After the lab the row shows the real alleles as today." (Not
chosen: "An em dash only".)

Question 2 (verbatim): "Genetics Lab advice, two cases the design's templates don't cover: (a) a pairing where every
youngster shows the trait (today it would say \"about 2 in 2 young\"), and (b) an unsexed animal (shrimp, snails),
where the design gives only \"Pair him/her with…\". Use these?" The proposal shown: "(a) \"…: paired with Cinder, all
their young would be Red Cambodian.\" (b) \"Pair it with another Cambodian carrier for about 1 in 4 Cambodian young.\""

The owner asked to clarify, the agent restated both cases, and the owner answered (verbatim): **"Let's go with your
proposed idea that works."**
