# Debt inventory: what multiplayer would magnify (REL-017)

Written in chunk 6 (2026-10-15) for REL-017, after chunk 6's backlog fixes. It lists every open or partly fixed item in
`docs/agent/BACKLOG.md`, every DEFERRED requirement in `docs/agent/REQUIREMENTS.json`, every entry in
`docs/KNOWN_LIMITATIONS.md` and the core-owned workarounds (the cross-layer imports the architecture lock still allows),
each with what a multiplayer version (shared markets, clubs, trades, leaderboards: REL-002, for later and with the owner)
would do to it. `TRUST_BOUNDARY.md` lists the state changes a server would authorise.

**Impact words.** *None*: local to one player's device or presentation. *Server rule*: fine alone, but a server would
have to own or re-check it (one player could otherwise change what others see). *Magnified*: a flaw that matters more
with other players (an exploit, an imbalance others would feel, or data that grows with them).

## Summary

Multiplayer would magnify few items, and each is small. Chunk 7 (2026-10-18, ADR-0037 decision 3) fixed the first
three:
- **Write tools in every player's build (B-190): fixed in chunk 7.** The live site ignores `?dev=1`: a production build
  honours it only when built with `VITE_E2E_DEV_URL=1`, which only the e2e base-path build sets (REL-019). The device
  is still the player's own, so a server (stage 2, ADR-0038) still trusts nothing it reports.
- **Economy rules a player could farm against others: fixed in chunk 7.** B-124 (counters no longer pass the buyer's
  ceiling, and stop when bidding closes), B-162 (admission takings now peak inside the slider's range), B-130 (a seeded
  loop hunt over the instant actions, and loop tests for both). New loops in later features would still matter more
  with shared leaderboards or markets.
- **Rules enforced only in the UI: fixed in chunk 7.** B-160 (the marine, reef and brackish research gates are in
  `buyTank` and `convertWaterClass`). A server would still check every action (TRUST_BOUNDARY.md).
- **Time on the device:** offline catch-up (and its grace rules) runs on the player's device. A server would replay or
  cap it.
- **Saves grow:** sold animals stay in the save, and its budget leaves out listing photos when full. A server would keep
  this data instead.
Everything else is presentation, local performance, test tooling or the retired harness. The independent reviewer's
verdict on whether this is small enough is recorded in PLAN.md (chunk 6): YELLOW on the first draft (the core-owned
workarounds and B-190 missing, B-167 and B-161 understated), fixed here.

## Open backlog items

### Retired harness (no runtime code; ADR-0018)

| Items | Impact |
|---|---|
| B-006, B-007, B-009, B-014, B-015, B-016 (outside the review); B-103 to B-112, B-113 (partly fixed), B-114, B-140, B-141 (partly fixed), B-142 to B-144, B-147 (partly fixed), B-153 (fix-now-harness) | None: they concern the agent harness's scripts and documents, retired on 2026-10-06 and kept unused in `docs/agent/archive/`. B-113's live part (the written mutation rules) is now checked in code by `core-mutation-boundary.test.ts`. |

### Repository and tooling

| Item | Status | Impact |
|---|---|---|
| B-154 qa:shots writes into tracked screenshots | open | None (QA tooling). |
| B-155 stale facts in pre-harness docs | open | None (documentation). |
| B-156 gate globs miss some files | open | None (harness-era gate). |
| B-161 tests that check less than their names say | open | **Weighs more** once a server enforces the rules: a server-side check is only as trustworthy as its tests, and these overstate what is checked (the chunk 6 review found another, core-crafted-saves-limits' listings case, fixed). |
| B-166 the test-id contract isn't enforced | open | None (testing). Chunk 6's copy test checks S3-D's ids against TEST_IDS.md. |
| B-204 e2e tests that failed once each under load (four so far) | partly fixed (chunk 7: two now wait on what they check) | None (testing). |
| B-205 Vitest's worker RPC timeout on GitHub's runner (0.5.4's Pages run) | fixed | None (testing). |
| B-206 `?perf`'s render internals (`__AQ_R`) and the read-only `__AQ`'s live `runtime` object in production | open | None: visual only, and stage 2's server trusts nothing the device reports; close before stage 2. |
| B-120 S0's architecture guard tests | partly fixed | None; `core-architecture-boundaries` and `core-mutation-boundary` now cover the layers and the store. |
| B-172 source-text CSS tests | partly fixed | None (testing). |

### The game

| Item | Status | Impact |
|---|---|---|
| B-101 a world step that throws | partly fixed | Server rule: a shared world would need the same atomic step on the server. Chunk 6 added the failure banner (B-002). |
| B-119 the Genetics Lab doesn't reveal alleles for some animals | open | Magnified slightly: hidden genes would matter in trades between players. |
| B-121 UI and render re-derive sim numbers (admission projection) | open | Server rule: displays must read the authoritative number. |
| B-123 leaving can drop unsaved play | open | Server rule: a server copy would replace local saves. |
| B-124 counter-offers push buyers past their ceiling | fixed (chunk 7) | None now; it was a farmable money loop. |
| B-125 equipment failing during offline grace | partly fixed | Server rule: the catch-up's grace would run on the server. |
| B-157 small copy defects | open | None. |
| B-158 market timers during catch-up at the saved speed | open | Server rule: market time would be the server's. |
| B-160 research gates enforced only in the UI | fixed (chunk 7) | Server rule: the rules hold them now; a server would still enforce them (TRUST_BOUNDARY.md). |
| B-162 admission demand floor (revenue rises with price) | fixed (chunk 7) | None now; it was a farmable money loop. |
| B-163 closing the welcome-back card overrides a pause | open | None (local). |
| B-165 settings accept any JSON | open | None (settings stay on the device). |
| B-130 no test hunts value-creating economy loops | fixed (chunk 7) | Server rule: the hunt covers the instant actions; a later feature's loops would still be exploits between players, so a feature that moves money adds its own loop test. |
| B-167 the global compatibility cache | open | Server rule: line set-up asks the compatibility engine, and its answers near a threshold depend on what was asked before; a server would compute its own, uncached. |
| B-181 the portrait cache never evicts | open | None (local memory). |
| B-182 per-frame allocations | open | None (local performance). |
| B-183 facility InstancedMeshes never disposed | open | None (local memory). |
| B-184 TankAI creates its world during render | open | None (presentation). |
| B-190 developer write tools in production builds behind `?dev=1` (`window.__AQ` is read-only without it) | fixed (chunk 7: the live site ignores `?dev=1`) | Server rule: the device is the player's own; a server trusts nothing it reports. |
| B-203 save values outside ADR-0036's pinned tables that an older build resets after a rollback (water-room upgrades, rare-variant kinds: pinned since ADR-0037; cones, jars, staff skill and rare-variant origins since chunk 7); separately, a crafted save's removed show left its entries unjudged | fixed (chunk 7) | Server rule: a server copy of the save would not cross builds on the device; the server would validate against its own tables. |
| (no row) a save's unknown staff role threw at payday | fixed in chunk 6 (the review's blocker 2) | Server rule: a server validates every value from a client against its own tables, as `repairState` now does. |

## Deferred requirements

| Requirement | Impact |
|---|---|
| DES-002 baseline visual snapshots (harness) | None. |
| NOTIFY-011 alerts predicted while the game is closed | Server rule: a server could send them; on the device it needs the native wrapper. |
| PLAT-004 the native wrapper | None for multiplayer itself; it is how phone alerts would arrive. |

## Known limitations

### Biology and simulation

| Entry | Impact |
|---|---|
| Time is compressed; genetics simplified; Prismatics fictional; some species can't breed; brackish range; life-history estimates; detritus; heater costs; conditioner; shrimp caps; nitrifier acclimation; names fixed at birth; mixed-hardness tanks; Salt water at full strength | Server rule: these are the game's rules; every player's world would follow the same ones. No extra debt. |
| During offline catch-up nothing dies (the grace rules) | Server rule: the catch-up would run or be capped on the server. |
| Background tanks step in coarser pieces | Server rule: a server stepping many worlds would use the same tolerances (the scheduled jobs don't depend on step size, `core-long-run.test.ts`). |
| A three.js deprecation warning in the console | None. |
| Sold animals stay in the save; save size and photos | **Magnified**: data grows with trading; a server would store it. |
| The Water room's reserves (exact jobs, approximate top-offs); a line "pauses"; the Water room's warnings are a forecast | None (one player's facility). |

### Economy

| Entry | Impact |
|---|---|
| Equipment-bundle listings not built | None. |
| Frags in storage don't grow; coral morph lines unnamed | None. |
| Only five closed listings keep photos | None (local save size). |
| The holding container is a pause | None. |
| The admission projection is an estimate | Server rule: see B-121. |

### Rendering, audio and creature motion

| Entry | Impact |
|---|---|
| Every Rendering entry (water surface, shadows, fin sorting, far stands, stylised visitors, world build time, small-animal meshes, bundle size, shop dressing, frag rack, camera line of sight, room-view GPU, LOD rebuilds, high-DPI cap, frame governor, budget CPUs, long tanks on phones) | None (local presentation and performance). |
| Every Audio entry (mix by metering, party-mode microphone, score timing, chime limits) | None. |
| Every Creature motion entry (collision shapes, walkers, the archerfish's fly, low frame rates, tanks out of view, smoothing) | None (presentation; the simulation is separate). |

### Care, staff and shows

| Entry | Impact |
|---|---|
| "Buy & feed" picks the cheapest suitable food; welcome-back staff notes matched by first name | None. |
| Staff walking cosmetic; keepers don't feed young; staff never repair or move animals; hunger burns the same day and night; no sales associate | None (one player's staff). |
| Show travel abstracted; other exhibitors are score distributions; biotope uses regions only; trophy case pruning | **Magnified** in one way: with other players, shows would be judged between real animals on a server (TRUST_BOUNDARY.md, Shows). |

### Platform and architecture

| Entry | Impact |
|---|---|
| Browser only; saves in the browser | Server rule: a server copy would hold the save. |
| First tap wakes the faded HUD; sideways phones show one toast at a time; iOS fixes by code trace; High contrast for bright rooms | None. |
| The AI imports equipmentLayout from the render module | None (presentation layers). |

## Core-owned workarounds

The ten cross-layer imports `tests/sim/core-architecture-boundaries.test.ts` still allows (its BASELINE, shrink-only):

| Import | What it brings in | Impact |
|---|---|---|
| `src/sim/newGame.ts → persistence` | `SCHEMA_VERSION` (a new world is stamped with the save format) | Server rule, small: the simulation would stamp the server's format; the constant would move to a shared module. |
| `src/ui/screens/onboarding.ts → dev`, `src/ui/panels/dev/fixtures.ts → dev`, `src/ui/dev/DevPanel.tsx → dev` | the title screen's showcase world, the dev panel's fixtures and commands | Server rule through B-190: the dev layer ships in the player's build. The showcase is a backdrop (no game state of the player's). |
| `src/game/StaleTabBanner.tsx → ui` | the load-into-game helper and a button | None (one device's tabs). |
| `src/state/settings.ts → render` | the GPU tier for the default quality | None (a device setting). |
| `src/ai/TankAI.tsx → render`, `src/ai/core/motionScan.ts → render` | equipment positions and the pose filter | None (presentation; the simulation is separate). |
| `src/render/facility/RoomTankDots.tsx → ui`, `src/render/interaction/TankInteraction.tsx → ui` | the attention dots' words and a caution toast | None (presentation). |
