# Changelog

The version shows on the title screen (top corner) and in Settings › About, and the "new version is ready" prompt
names it. Every deploy bumps `version` in package.json and adds an entry here: patch (0.3.x) for fixes and small
additions, minor (0.x.0) for new features. `tests/sim/version.test.ts` fails if the two disagree.

## 0.4.0 — 2026-10-05

- **Prismatic animals.** A rare, permanent rainbow shimmer, about 1 in 4,096 stocked animals and 1 in 8,192 young bred
  in your shop.
  - A Prismatic parent makes it likelier in each youngster (×4, or ×8 with two Prismatic parents), never certain.
  - Each one is worth about 12× an ordinary animal.
  - Look for the sheen and sparkles in the tank, the badge in the shop, cards and lists, and the "Prismatic!"
    achievement.
- **Named strains.** Recognised combinations such as the Black Samurai betta, the Misbar Snowflake clownfish and the
  Red Pinto seahorse.
  - Logged when you first breed or buy one; each adds a modest premium to value.
  - Breeding forecasts show strain odds and the pair's Prismatic chance.
- **Morph catalog.** Each species page shows every colour and combination its genetics can produce, as a colour tree
  rated from Common to Legendary by how often sellers stock it. Unseen entries hint only at traits you've already met.
- Saves from earlier versions load unchanged: no existing animal turns Prismatic, and past strains are recognised.

## 0.3.1 — 2026-10-01

- Version numbers: shown on the title screen and in Settings (with the build's commit and date), and the reload
  prompt names the new version.

## 0.3.0 — 2026-10-01

- Equipment and food "fit" warnings before and after you buy: the Autofeeder says when it can't feed a tank (frozen- or
  live-food eaters such as seahorses), strong flow is flagged for gentle-flow species, skimmers fade in brackish water,
  and heater setpoints are checked against the residents.
- Food rows say which of your animals eat them, with an Autofeeder OK / Hand-feed chip.
- Attention dots on tanks (switcher, tank card, tabs, Tanks list, room view), Shows results, Market bids and finished
  research; the bell counts unread news; "Clear all" in the notification drawer.
- Feeding notes and "In real life" tips for all 48 species; actions that used to fail silently now say why.

## 0.2.1 — 2026-10-01

- Review fixes: safer saves, an update prompt when a new version is live, smoother onboarding.

## 0.2.0 — 2026-09-30

- Audit fixes across saves, exploits, softlocks, smoothness and UX.

## 0.1.1 — 2026-09-28

- Smooth play on PCs and 4K screens; Render static-site blueprint.

## 0.1.0 — 2026-09-23

- Aquarium Go: living-aquarium tycoon, first public release.
