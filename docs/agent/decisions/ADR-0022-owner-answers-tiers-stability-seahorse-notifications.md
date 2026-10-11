# ADR-0022 — Owner answers after chunk 2: the tier rule, the stability word, the seahorse's colours, and two notification questions for chunk 3

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunks:** 2 (follow-ups) and 3 (notifications)\
**Requirements:** GEN-006, GEN-007, ACC-003 (B-178), NOTIFY-001, NOTIFY-006, DES-009\
**Supersedes:** ADR-0005 decision 4 (keep today's tier rule) for the Legendary threshold

## Context

After chunk 2, `PLAN.md` asked the owner three questions (the water report's stability word, B-178; the lined
seahorse's yellow/red look; the tier labels after the betta expansion, 466 of 540 Legendary), and chunk 3 needs two
owner answers on notifications (BACKLOG B-188, the Unsupported callout; B-189, "auctions ending"). The owner answered
the seahorse question in chat ("2. yes go ahead and fix") and the other four through multiple-choice questions.

## Decisions

1. **Tier rule: Legendary below 1 in 10,000.** `MORPH_TIER_MIN_SHARE`'s Very rare threshold moves from 0.1 % to
   0.01 % of market stock. Bettas: 1 / 9 / 21 / 43 / 466 → 1 / 9 / 21 / 145 / 364 entries per tier; Legendary stock
   4.3 % → 0.56 % (about 1 in 23 → 1 in 170 shop bettas). Other species: a few Legendary morphs become Very rare.
   Named strains keep their hand-set tiers, so values don't change; the rule only labels morphs (chips, the
   Encyclopedia, the Rare genes filter, the rare-stock dot).
2. **Stability word:** "Stable" (60+), "Sensitive" (30–59), "Fragile" (under 30) beside the number, on the meter's own
   colour bands ("Stable · 72").
3. **Lined seahorse:** `red` moves to dominance 0, below `yellow`, and the Yellow rule shows whenever yellow is the
   expressed colour (count `any`). A yellow/red seahorse now looks Yellow (it looked Classic Dark), red still needs
   two copies, and a Classic Dark seahorse proves its dark copy, so its Genes row no longer reads "Can’t be seen on
   this animal" before the Genetics Lab. Rolls and inheritance are unchanged; the catalog moves yellow/red from
   Classic Dark to Yellow. Saved seahorses keep their cached names and looks (old saves are best-effort, ADR-0005).
4. **Notifications, Unsupported state (B-188):** "This browser can’t show notifications" / "Alerts still appear in
   the game." The design's iPhone Home Screen sentence is dropped (erratum to §12.3).
5. **Notifications, "auctions ending" (B-189):** add an "auction ending soon" event a few game hours before an
   auction with open bids ends, routed to the listing; the Market subtitle stays "New bids, sales and auctions
   ending". Chunk 3 builds it (deterministic, one per listing, tested).

## Owner approval

Given by the owner in the chunk 2 Claude Code session, 2026-10-11.

The agent's question 3 in `PLAN.md` (verbatim): "(f) Lined seahorses: yellow/red (equal dominance, both two-copy
traits) looks Classic Dark, so a Classic Dark seahorse's colour gene reads \"Can’t be seen on this animal\" before the
Genetics Lab; fix it in the data as for B-136 (red below yellow, or yellow/red showing one of them)?" Owner (verbatim):
**"2. yes go ahead and fix"**.

The owner also asked about the tiers (verbatim): "3 that's a large majority that is legendary, is that what we want
and expected?" The agent explained the numbers and asked the questions below.

Question (verbatim): "Water report: the Stability meter shows only a number today (0–100, how well the tank absorbs
swings: volume, filter maturity, equipment, not overstocked). Which words should sit beside it? The bands match the
meter's colours: 60+, 30–59, under 30." Owner's answer (selected option): **"Stable · Sensitive · Fragile"** ("Says
how forgiving the tank is of mistakes."). Not chosen: "Steady · Shaky · Unstable", "Strong · Moderate · Weak".

Question (verbatim): "Morph tiers: 466 of 540 betta morphs are Legendary under today's rule, and about 1 in 23 bettas
in the shop is Legendary. Which rule do you want? (Named strains keep their own hand-set tiers either way.)" Owner's
answer (selected option): **"Legendary below 1 in 10,000"** ("About 1 in 170 shop bettas is Legendary (0.6%).
Catalog: 364 Legendary, 145 Very rare (was 43). Other species barely change: fancy goldfish and clownfish lose their
few Legendary morphs."). Not chosen: "Keep today's rule", "Stricter: 1 in 50,000".

Question (verbatim): "Chunk 3, notifications: on a browser that can't show them, the design says \"On iPhone, add
Aquarium Go to your Home Screen to get notifications.\" That doesn't work in this build (no web-app manifest), and a
Home Screen copy would start without the player's save. What should the callout say?" Owner's answer (selected
option): **"Drop the iPhone line"** ("\"This browser can't show notifications\" / \"Alerts still appear in the
game.\""). Not chosen: "Keep the design's text".

Question (verbatim): "Chunk 3, notifications: the Market category's subtitle promises \"auctions ending\", but the game
has no \"auction ending soon\" event, only \"bidding closed\" after the end. Which way?" Owner's answer (selected
option): **"Add \"ending soon\""** ("A new event a few game hours before an auction with open bids ends, routed to the
listing; the subtitle stays \"New bids, sales and auctions ending\"."). Not chosen: "Change the subtitle".
