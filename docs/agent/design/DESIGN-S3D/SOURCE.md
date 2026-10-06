# DESIGN-S3D: source and exported files

- **Canvas:** the owner's "Design" canvas, https://claude.ai/artifact/SaZzQpkftDTxcZuzZQfgBk (a Claude Design canvas
  made from the Design type https://claude.ai/artifact/QKN21svewxgyPb6SYRqWnd, release `1791227765-3624`). Who can open
  it is the owner's choice; the repo copy is what counts (master §3.9).
- **Version captured:** Version 23, version id `1791264082-fb19`, published 2026-10-06 05:21 UTC. Version 21
  (`1791261926-7466`, 04:45 UTC) added the row "Automation · final · Accepted additions", gave the final Market boards'
  salt row its three bag sizes (below the fold, so their screens are unchanged), updated both prototypes to the
  follow-up answers and the prototypes' sticky note to match. Versions 22 (`1791262521-9b33`) and 23 followed an
  independent review: the Operations Desk's Research row, the desktop Overview's sub-line before the Desk, Sort and Sell
  as fields in the third setup step, the Map's salt mixer status and the salt toasts. Earlier versions: 20
  (`1791252328-b32a`), 19 (`1791249836-73c5`) and 18 (`1791247877-08db`). Every board file below was read back from
  Version 23 and matched the SHA-256 listed.
- **Export date:** 2026-10-05, the owner's time (2026-10-06 UTC); the accepted additions and the re-exported prototype
  states the same evening.
- **How the screens were made:**
  - Static boards were rendered from their board files in Chromium at 1×: phone 390×844, desktop 1440×948.
  - Prototype states were driven in the prototype files with the canvas runtime. Each capture is the device area: phone
    390×844 of the 1000×844 board, desktop 1440×948 of the 1820×948 board. The controls column is left out.
  - Delivery to the handoff folder adds a C2PA content-credentials chunk (`caBX`) to each PNG; the pixels are
    unchanged. The SHA-256s below are of the files as delivered, so a fresh export of the same screen hashes
    differently.
  - The PNGs are reduced to 256 colours, using a palette chosen by maximum coverage with dithering. A check confirmed
    that every status colour family (red, amber, green, aqua, violet, blue) kept at least 60% of its pixels. One file
    failed the check and stays full colour: `home-manual-on-phone.png`.
  - A layout check ran on every capture (clipped text, spills, tap targets under 44px). The only findings are 0.5
    components at their approved sizes, 0.5 sample text, and the room view's 38px camera chips (`SPEC.md` §3).
- **Names:** `<screen>-<state>-<viewport>.png` (`DESIGN_INTAKE.md` step 1).

## Final boards (rows "Automation · final · Operations" and "Automation · final · Around the app")

| File | Board | Board file | SHA-256 |
|---|---|---|---|
| `screens/operations-overview-normal-phone.png` | Phone · Final · Overview | `project/auto-f-phone-overview.dc.html` | `4dc34bf6ef292d18eabebb50c2482f3bd0e51d8e6046194093a827ecfb9632fd` |
| `screens/operations-water-normal-phone.png` | Phone · Final · Water room | `project/auto-f-phone-water.dc.html` | `f7627a1e75173291703e23c9143a226435b1c0256f243b4f165c4b36d28325fc` |
| `screens/operations-feed-normal-phone.png` | Phone · Final · Live food | `project/auto-f-phone-feed.dc.html` | `9bfd6b23948c040db6164b3f5c9495dbb59fee00a02b454de95303b270cc57e7` |
| `screens/operations-lines-normal-phone.png` | Phone · Final · Production lines | `project/auto-f-phone-lines.dc.html` | `be6164066ea2a89caba5d7c75566a500b5e92dc40f78a62fb8048c673c3dffe7` |
| `screens/operations-map-normal-phone.png` | Phone · Final · Facility map | `project/auto-f-phone-map.dc.html` | `27ab6f500530d6f983114d71555a59b8c12bc11f9267088ac9e02651b2e9e502` |
| `screens/operations-issues-out-of-salt-phone.png` | Phone · Final · Out of salt and a full grow-out tank | `project/auto-f-phone-issues.dc.html` | `4ea13b4fb8df994727132d6626f1097c16cf6f83673a4ef55f2e3be710bc4817` |
| `screens/operations-manual-on-phone.png` | Phone · Final · Manual mode | `project/auto-f-phone-manual.dc.html` | `5cd47f793729e019c9f5181f02eaa4a1592d09cbacfc7a98913c78b7dbb111c8` |
| `screens/operations-overview-early-phone.png` | Phone · Final · Early game | `project/auto-f-phone-early.dc.html` | `ebd4ae637d17703733e1fc0cbb1f726d6fe04de26926b5f3542992c923d55f96` |
| `screens/operations-map-early-phone.png` | Phone · Final · Early game map | `project/auto-f-phone-early-map.dc.html` | `ebe1895f6e7396f8a3a3add37f98c91d456ae78a5e11a40db3c4f22cee087127` |
| `screens/tanks-automation-chips-phone.png` | Phone · Final · Automation chips on the Tanks panel | `project/auto-f-phone-tanks.dc.html` | `78b65dc0207c587dd35c113bb968153109310ded761f38d778634c22af6d9ec5` |
| `screens/alerts-out-of-salt-phone.png` | Phone · Final · Problems in the alerts bell | `project/auto-f-phone-alerts.dc.html` | `501c73e9def2f13fb2f2f4ddf6989add80a6b655d783ce76dd94138ca267c926` |
| `screens/build-facility-water-phone.png` | Phone · Final · Water room machines in Build › Facility | `project/auto-f-phone-build.dc.html` | `9e3728c30c0bee0893d7d2c9834bfaade868c575b0aee8d8591e08297dc91a29` |
| `screens/market-supplies-home-grown-phone.png` | Phone · Final · Home-grown food in Market › Supplies | `project/auto-f-phone-market.dc.html` | `3e6688029bbadd3216bea5f842ac872957be380833f3308f20a2e9e14e653daf` |
| `screens/operations-overview-normal-desktop.png` | Desktop · Final · Overview | `project/auto-f-desk-overview.dc.html` | `f2442e91e6a94a7600950609179deae2e8f0c1b96dc9ebcad6d0f902da99a01f` |
| `screens/operations-water-normal-desktop.png` | Desktop · Final · Water room | `project/auto-f-desk-water.dc.html` | `3484d2760f055d53ee8b73180c21bafc91157e25425fb354ca6198ae1f00e83a` |
| `screens/operations-feed-normal-desktop.png` | Desktop · Final · Live food | `project/auto-f-desk-feed.dc.html` | `fdd7c9a3109f58511f3289de38136a22c594e626f439e6053b33b8c6fe4f3ce9` |
| `screens/operations-lines-normal-desktop.png` | Desktop · Final · Production lines | `project/auto-f-desk-lines.dc.html` | `188c02c1a0bcd64c9efc7a071c22cb53841e72c9ff2221473739df78290251b3` |
| `screens/operations-map-normal-desktop.png` | Desktop · Final · Facility map | `project/auto-f-desk-map.dc.html` | `2009157008309f8235996abedce1c52975f05b0742574d4f14efcb7744226083` |
| `screens/operations-issues-out-of-salt-desktop.png` | Desktop · Final · Out of salt and a full grow-out tank | `project/auto-f-desk-issues.dc.html` | `fff86f5d852309ca79885b91d9ddc9c0c840b0c1f807ca304f11ddc181a2d80e` |
| `screens/operations-manual-on-desktop.png` | Desktop · Final · Manual mode | `project/auto-f-desk-manual.dc.html` | `6f6e7f04de44e103b70e5a1502510d329a8865ee955d03bec699e4d106df1ad2` |
| `screens/operations-overview-early-desktop.png` | Desktop · Final · Early game | `project/auto-f-desk-early.dc.html` | `fa8e6f2cbb58ff6035e2151c6ad54b58dc5281134fdd59ce0989b588f28a7988` |
| `screens/operations-map-early-desktop.png` | Desktop · Final · Early game map | `project/auto-f-desk-early-map.dc.html` | `afd4f0605d9899860e125602de21466abe668472883620e647761b8e53f15a51` |
| `screens/tanks-automation-chips-desktop.png` | Desktop · Final · Automation chips on the Tanks panel | `project/auto-f-desk-tanks.dc.html` | `7295ebd82de72653b7bf8ef6803f45419ffcb183d5f334f94d6bd8d1dbd88116` |
| `screens/alerts-out-of-salt-desktop.png` | Desktop · Final · Problems in the alerts bell | `project/auto-f-desk-alerts.dc.html` | `cf27e4a8e4fb5a777d8342cbabfecf1883fc3141e8ba47b9f0ab1227073666ce` |
| `screens/build-facility-water-desktop.png` | Desktop · Final · Water room machines in Build › Facility | `project/auto-f-desk-build.dc.html` | `cd8e8120c278d229b0d3818a2317e76fbb0ffb6d4edd1ce0381da3ed58e16f99` |
| `screens/market-supplies-home-grown-desktop.png` | Desktop · Final · Home-grown food in Market › Supplies | `project/auto-f-desk-market.dc.html` | `1e874ee9a442a22e9c8abeddcf0cb18adcfb154ae5ea76d3f352da29ef300602` |

## Accepted additions (row "Automation · final · Accepted additions")

| File | Board | Board file | SHA-256 |
|---|---|---|---|
| `screens/home-room-view-phone.png` | Phone · Final · Room view with the Facility map chip | `project/auto-g-phone-room.dc.html` | `e8115a34ae42ab1fb6ddad230d0497a33ded9546b9a3389a3b04e9345491d7eb` |
| `screens/operations-overview-before-desk-phone.png` | Phone · Final · Overview before the Operations Desk | `project/auto-g-phone-nodesk.dc.html` | `712426c7e1075980481178e412eecde66c64a5071c5d46ce95019783bdc0ad32` |
| `screens/alerts-before-desk-phone.png` | Phone · Final · Alerts before the Operations Desk | `project/auto-g-phone-nodesk-alerts.dc.html` | `0cb32f720daa1b49356e4e4ed5e563bd370c0af2333f793a20e429c2cc451aa8` |
| `screens/livestock-production-new-line-step-1-phone.png` | Phone · Final · New line, step 1: choose a pair | `project/auto-g-phone-newline-1.dc.html` | `1657749baf4fe34bbf21aab5af665ec9ff505f4ba4586ec41870092088043707` |
| `screens/livestock-production-new-line-step-2-phone.png` | Phone · Final · New line, step 2: choose tanks | `project/auto-g-phone-newline-2.dc.html` | `97fa0f0daaebbdf73d2a034380d73de3d60f6b6b9e3e7a2bd85191f9bd8ec48e` |
| `screens/livestock-production-new-line-step-3-phone.png` | Phone · Final · New line, step 3: rules | `project/auto-g-phone-newline-3.dc.html` | `d20e69f2010374a45e2f363d3c7e3155e45cb59339be96e80815cf0b59e094eb` |
| `screens/market-supplies-salt-sizes-phone.png` | Phone · Final · Salt in 5, 20 and 40 kg bags | `project/auto-g-phone-salt.dc.html` | `723f7cd7e17dc9c79c8752f0c1dcbf91009b31dba0c6c6464d7a517e46162ddd` |
| `screens/livestock-production-all-slots-used-phone.png` | Phone · Final · Production with every line slot used | `project/auto-g-phone-production-full.dc.html` | `bad2d4fce28905319f42aff31756b238f7aac599b64929bfeee667f63bb7e876` |
| `screens/home-room-view-desktop.png` | Desktop · Final · Room view with the Facility map chip | `project/auto-g-desk-room.dc.html` | `c23b5d5f536a11b7db92d1ae01311d65b60ccf547ff9dba13f33c2ec12f5537c` |
| `screens/operations-overview-before-desk-desktop.png` | Desktop · Final · Overview before the Operations Desk | `project/auto-g-desk-nodesk.dc.html` | `b36b34caa97be4b4e95a8832208de2d9da41f077cc78e04b163190cb979f07a1` |
| `screens/alerts-before-desk-desktop.png` | Desktop · Final · Alerts before the Operations Desk | `project/auto-g-desk-nodesk-alerts.dc.html` | `6ec57702aa3058107499c071ddc691e462f2f65c4a4c0cc9eb0e5ccd72728b96` |
| `screens/livestock-production-new-line-step-1-desktop.png` | Desktop · Final · New line, step 1: choose a pair | `project/auto-g-desk-newline-1.dc.html` | `b703b3942f4be486e7638db9015054721744caa356201076ee8ece1094c131f8` |
| `screens/livestock-production-new-line-step-2-desktop.png` | Desktop · Final · New line, step 2: choose tanks | `project/auto-g-desk-newline-2.dc.html` | `939d954513598e1b9cd2c107a3a053baf74e614f2d9dbe4be544a9d9e18a5833` |
| `screens/livestock-production-new-line-step-3-desktop.png` | Desktop · Final · New line, step 3: rules | `project/auto-g-desk-newline-3.dc.html` | `df7172c64870532021744acc3af741934d1b2f44781ac7cd35e0654b865bf3f6` |
| `screens/market-supplies-salt-sizes-desktop.png` | Desktop · Final · Salt in 5, 20 and 40 kg bags | `project/auto-g-desk-salt.dc.html` | `48e3719132377f328610187851fdcaa383e1088f9c3508be24143239b4b05b0b` |
| `screens/livestock-production-all-slots-used-desktop.png` | Desktop · Final · Production with every line slot used | `project/auto-g-desk-production-full.dc.html` | `9a4702a160d328065980e38cb91196b21e59bd71d5ddcf6bd74a587efb82bcbb` |

## Prototype states (row "Automation · final · Prototypes")

Scenario names are the prototype's controls column (`SPEC.md` Appendix B). The route is what the prototype opened;
anything after it was done in that state.

| File | Prototype | Route · scenario · steps | SHA-256 |
|---|---|---|---|
| `screens/more-normal-phone.png` | Phone prototype | `#/more` · Normal day · 8:36 AM | `be110bba4b2edf57b2058217cef842fe773a4f54f81d7ce71ca4586f3ce9ae6b` |
| `screens/operations-map-room-sheet-phone.png` | Phone prototype | `#/operations/map` · Normal day · 8:36 AM · Breeding room tapped | `c50d19010c241bd096950b4b9fe60f0a95c3593bc6c97fc9344195ce072e4a25` |
| `screens/home-normal-phone.png` | Phone prototype | `#/` · Normal day · 8:36 AM | `c2dd39e32a3fdc6298c48edfb5b201cc5212e2fc65c24d9f55b6359e68c95e9d` |
| `screens/home-manual-on-phone.png` | Phone prototype | `#/` · Manual mode on · 6:52 PM | `d0c2046c9047a84776943a8b3b75cfd06ebeb2f81a1a21ec9ae3e0dfbad188b8` |
| `screens/operations-overview-out-of-salt-phone.png` | Phone prototype | `#/operations` · Out of salt + line full · 6:40 PM | `225ea79463ab910d8eafefe742f555a35b6c7c4775c0c674501a650955d77567` |
| `screens/operations-overview-manual-on-phone.png` | Phone prototype | `#/operations` · Manual mode on · 6:52 PM | `f7e5eaf02f43737cf81ae4f9c4ba6ad9f89f79e22be009f21dd70da5578edeb3` |
| `screens/operations-issues-salt-low-phone.png` | Phone prototype | `#/operations/issues` · Normal day · 8:36 AM | `fe2d1766a56ea08b6ab3e7b62b4b895c2c5ca704a73453490abf4bf08edf8d39` |
| `screens/operations-issues-salt-arriving-phone.png` | Phone prototype | `#/operations/issues` · Out of salt + line full · 6:40 PM · stock budget $300 | `3827fb1b9230d7c95d615a2c422c2159e8f1ab0ebf7ccd0bf10e49a675757856` |
| `screens/operations-issues-decided-phone.png` | Phone prototype | `#/operations/issues` · Out of salt + line full · 6:40 PM · stock budget $300 · Quarantine 2 added | `131523fb0f03a92933468c1fb6665770bd4baba31f7ac6b705d4d179d063dda8` |
| `screens/operations-manual-off-phone.png` | Phone prototype | `#/operations/manual` · Normal day · 8:36 AM | `674e25b05cfbe5bcabb002f52ce15625b5785248f40390607c585881a0ada237` |
| `screens/operations-map-water-phone.png` | Phone prototype | `#/operations/map?layer=water` · Normal day · 8:36 AM | `98f4955bbe944e5e18aeb3c00e5515b8f03054b5e946b69e48a5f53e0928d1ed` |
| `screens/operations-map-food-phone.png` | Phone prototype | `#/operations/map?layer=food` · Normal day · 8:36 AM | `92a373751cdf8851dca02204dfb86e8a60a111748d8b9520d993b1f4294f9fd2` |
| `screens/operations-map-animals-phone.png` | Phone prototype | `#/operations/map?layer=animals` · Normal day · 8:36 AM | `80cb55777ac644840818004797dd873e4565c2fe7276bc088ec93728979b4641` |
| `screens/operations-lines-paused-by-you-phone.png` | Phone prototype | `#/operations/lines` · Normal day · 8:36 AM · Snowflake line off | `3fbe1c9e690a7dacf355b6478846350fa47561d08f31b954a7f281b5e4f71907` |
| `screens/operations-water-locked-early-phone.png` | Phone prototype | `#/operations/water` · Early game · Day 4 | `ab9bd5dbe23728201d13657a73337d2279ab8101e86102455b28c4495bd0bc17` |
| `screens/operations-lines-early-phone.png` | Phone prototype | `#/operations/lines` · Early game · Day 4 | `4af5842576eb2a26069290b71feb2e82094b1edb40605e7997c7fd63dee7017f` |
| `screens/livestock-production-royal-phone.png` | Phone prototype | `#/livestock/production/royal` · Normal day · 8:36 AM | `294825c1059c1d8e4bd4ddc7a7d5ce67f0c4e47d848e26627a0ca8c36c60c4ed` |
| `screens/livestock-production-early-phone.png` | Phone prototype | `#/livestock/production` · Early game · Day 4 | `94d13ac59f0d22d29e8a1510c1e4589c0dcc58833898ac5767d5c68ff5486cd6` |
| `screens/build-facility-rooms-phone.png` | Phone prototype | `#/build/facility` · Normal day · 8:36 AM | `b701b595e9e9dfcf4b4ed731f4a09e98a4fd1531c2c82379d0ce2a1ab16211db` |
| `screens/build-facility-food-phone.png` | Phone prototype | `#/build/facility/food` · Normal day · 8:36 AM | `d4531df14ed99ba604724d68e7d8698c2c44b8d25bf0ef66a6dee80626a58427` |
| `screens/visitors-staff-budget-short-phone.png` | Phone prototype | `#/visitors/staff` · Normal day · 8:36 AM | `f197e6ab673643b6038b3e0c5149ce7e82a92a6177dcd79e2789fe22845f50e8` |
| `screens/visitors-staff-budget-raised-phone.png` | Phone prototype | `#/visitors/staff` · Normal day · 8:36 AM · stock budget $300 | `39df6cdc1603957abf6fcc9ca49dd07881f94e9f857e29d3610965d01e6abbf4` |
| `screens/research-facility-late-phone.png` | Phone prototype | `#/research` · Normal day · 8:36 AM · scrolled to the end | `7c63838bd4fea707fb8759ebd8d39b4ccd457d11612892cba82d2c5f43b4c6b5` |
| `screens/research-facility-early-phone.png` | Phone prototype | `#/research` · Early game · Day 4 · scrolled to the end | `d2278a6b0076d76cbd34a08dcc25eb6ac12f3d4e2b298eee1fec0732762b1411` |
| `screens/settings-notifications-automation-phone.png` | Phone prototype | `#/settings/notifications` · Normal day · 8:36 AM · notifications allowed | `34ff76e992e47f07ddd1bb995f5a644557a9c472c2792c2061368537562ae037` |
| `screens/tank-card-held-phone.png` | Phone prototype | `#/tanks/ember/equipment` · Manual mode on · 6:52 PM | `05f0924d02c2619908ff2eedb5a9b17165a551843a136f444e793f483e60a7f3` |
| `screens/tanks-early-phone.png` | Phone prototype | `#/tanks` · Early game · Day 4 | `69941555c3fec9b6d66da2ffe150e8f9cc197ddf0e1acd4228324064afb8bb16` |
| `screens/alerts-salt-low-phone.png` | Phone prototype | `#/` · Normal day · 8:36 AM · bell opened | `4a82772952b43315ae9611ad6c4dddda093daa7effb43486a5f8a5134f67b882` |
| `screens/alerts-manual-on-phone.png` | Phone prototype | `#/` · Manual mode on · 6:52 PM · bell opened | `8496c7e751440a366ed1d4422ef40dae2c96a59616f685151acbce9f56202844` |
| `screens/operations-map-selected-tank-desktop.png` | Desktop prototype | `#/operations/map` · Normal day · 8:36 AM · Ember’s Tank selected | `acf5f22e2ae4000705900ca7d77108a2300b18861723afa0db2bf19166cf03a0` |
| `screens/operations-map-selected-room-desktop.png` | Desktop prototype | `#/operations/map` · Normal day · 8:36 AM · Water room selected | `167c16965b9c49adcf29e620ca418f5c2ae608f3251ba844f8cb1db30160cafd` |
| `screens/operations-map-no-selection-desktop.png` | Desktop prototype | `#/operations/map` · Normal day · 8:36 AM · Grow-out B clicked again (selection cleared) | `9943b30ccd1909f4377d63ee76bb2800d3d094cad2e258c6c2eea06d963808d2` |
| `screens/home-normal-desktop.png` | Desktop prototype | `#/` · Normal day · 8:36 AM | `17d8c39cf135e93d37c26c9423b00f7ac552109bddfd0001f0c60ee59d510d85` |
| `screens/home-manual-on-desktop.png` | Desktop prototype | `#/` · Manual mode on · 6:52 PM | `7761fc6b985ad06f2a9d5ec1a1823d75910e69249cfea7ca5d0457de067d5861` |
| `screens/operations-overview-out-of-salt-desktop.png` | Desktop prototype | `#/operations` · Out of salt + line full · 6:40 PM | `52a0466a7ac31ccd2e82739dd806261f83a18205af9c9fb57b3b57ed45ec273f` |
| `screens/operations-overview-manual-on-desktop.png` | Desktop prototype | `#/operations` · Manual mode on · 6:52 PM | `9dd63361bc53f82a58203556ca464d8beb90e4a3959b7e1fd4030a10d81943fe` |
| `screens/operations-issues-salt-low-desktop.png` | Desktop prototype | `#/operations/issues` · Normal day · 8:36 AM | `4b450a2cfb9c72c307cce1caa1084769d2b7cc4e614e4a75d0b22aad6b48a2d5` |
| `screens/operations-issues-salt-arriving-desktop.png` | Desktop prototype | `#/operations/issues` · Out of salt + line full · 6:40 PM · stock budget $300 | `ae0640468ad0d0819cc25a5a1a13c0e282a1825585f04d566aefc16689e344d4` |
| `screens/operations-issues-decided-desktop.png` | Desktop prototype | `#/operations/issues` · Out of salt + line full · 6:40 PM · stock budget $300 · Quarantine 2 added | `6a996591ca3a277b76b63bcd5dfb7a5f11e4c6ca95bc833e09d2a515aa37b4cd` |
| `screens/operations-manual-off-desktop.png` | Desktop prototype | `#/operations/manual` · Normal day · 8:36 AM | `9b2043178ebdaab7959237c82e4d6f8d328a3e576e7af35266094f6524520ebc` |
| `screens/operations-map-water-desktop.png` | Desktop prototype | `#/operations/map?layer=water` · Normal day · 8:36 AM | `6a13290a6b7b5be33ce4c34bccb2db04babb683df1a0d9a0a3405f2ff5939e3c` |
| `screens/operations-map-food-desktop.png` | Desktop prototype | `#/operations/map?layer=food` · Normal day · 8:36 AM | `2ba30e790205443d596e6fd0c5a07842d194537338947e9d2850fe523252d0af` |
| `screens/operations-map-animals-desktop.png` | Desktop prototype | `#/operations/map?layer=animals` · Normal day · 8:36 AM | `6db2d22347c391a365c13f07d542934515bcb5cbd26a1fa11e916bd3a199d5dd` |
| `screens/operations-lines-paused-by-you-desktop.png` | Desktop prototype | `#/operations/lines` · Normal day · 8:36 AM · Snowflake line off | `7f9f6f169f4db2c8659a6e47e06fa56b48b5f81a815874cccfcfad07b22a76cb` |
| `screens/operations-water-locked-early-desktop.png` | Desktop prototype | `#/operations/water` · Early game · Day 4 | `549c253138604a35ce7a735c65e35a59f0e4d9408896ed24d16d141bdd48361b` |
| `screens/operations-lines-early-desktop.png` | Desktop prototype | `#/operations/lines` · Early game · Day 4 | `6d11e5806b053c883c3a7b3aab48d05b6a952fde0852d9cf99dacaa468745c80` |
| `screens/livestock-production-royal-desktop.png` | Desktop prototype | `#/livestock/production/royal` · Normal day · 8:36 AM | `a8b44ce361a6b23a5d15d0412f36c49611c6471458f177b6a5a6b1d51f81ef3d` |
| `screens/livestock-production-early-desktop.png` | Desktop prototype | `#/livestock/production` · Early game · Day 4 | `b2b70daa410aab4ae60632f1115719b2ef93cd7082de036d3d0c53b022686d78` |
| `screens/build-facility-rooms-desktop.png` | Desktop prototype | `#/build/facility` · Normal day · 8:36 AM | `3e2f8682cf0628ef546938302d86d9de51938f324c8d958ee3246d45308f6897` |
| `screens/build-facility-food-desktop.png` | Desktop prototype | `#/build/facility/food` · Normal day · 8:36 AM | `5f92acf49acbc1a429bc632723e84eff1218dee6b5dbbe9c2cb6967ee2921546` |
| `screens/visitors-staff-budget-short-desktop.png` | Desktop prototype | `#/visitors/staff` · Normal day · 8:36 AM | `d6c73fe2e8eb30500e7b462eb40cefa3f628a10e7cf961c92fef864861a5e4a7` |
| `screens/visitors-staff-budget-raised-desktop.png` | Desktop prototype | `#/visitors/staff` · Normal day · 8:36 AM · stock budget $300 | `5931ecb52bd279ca7cf8a8d490718ffb6c9ea486847b5365f1dbf362c0600971` |
| `screens/research-facility-late-desktop.png` | Desktop prototype | `#/research` · Normal day · 8:36 AM · scrolled to the end | `cc2e88286878c1d88bc4ba37e988e6763557d85214bbe3abba84cf24ee0939ca` |
| `screens/research-facility-early-desktop.png` | Desktop prototype | `#/research` · Early game · Day 4 · scrolled to the end | `7ce976a676a5ebfd85503a9a678fac7daf7702b43d9720b8d3caf724706f3f60` |
| `screens/settings-notifications-automation-desktop.png` | Desktop prototype | `#/settings/notifications` · Normal day · 8:36 AM · notifications allowed | `14c0f9e9342c31674dd99495273ca62227d231e5191a839ee096582649d6df1c` |
| `screens/tank-card-held-desktop.png` | Desktop prototype | `#/tanks/ember/equipment` · Manual mode on · 6:52 PM | `02a6514018cd3d4b4895ff3d1d64531d8579c676562391ebfc8a3ca138230ecc` |
| `screens/tanks-early-desktop.png` | Desktop prototype | `#/tanks` · Early game · Day 4 | `2cbdf412100d450d31ee404b5c56c3a12e790369369ef65c6e325966b3bb4916` |
| `screens/alerts-salt-low-desktop.png` | Desktop prototype | `#/` · Normal day · 8:36 AM · bell opened | `8bd15ebeec9a1405c486ed0ca5be84334c0203439066166df1cb13a2100b9eb6` |
| `screens/alerts-manual-on-desktop.png` | Desktop prototype | `#/` · Manual mode on · 6:52 PM · bell opened | `311362e9d8c72096548d45be3f77cb79ba434705c28126251b981dd9dd673487` |
| `screens/operations-issues-locked-before-desk-phone.png` | Phone prototype | `#/operations/issues` · Normal day · 8:36 AM · Operations Desk researched off | `a7eb6269427b4906cecff9e9dfcd0935a1c4165a617e737c7f73c5fba1eab735` |
| `screens/research-facility-before-desk-phone.png` | Phone prototype | `#/research` · Normal day · 8:36 AM · Operations Desk researched off · scrolled to Facility | `14bd9761dcb85bc326dbccde4d2b098879c1b83d52d8ae25b4e46b678eb3b7c7` |
| `screens/operations-issues-locked-before-desk-desktop.png` | Desktop prototype | `#/operations/issues` · Normal day · 8:36 AM · Operations Desk researched off | `3a465f1f80c0c4e24e3cd6a834af54da9894729be2d0c4ab2d59a4d08281f27d` |
| `screens/research-facility-before-desk-desktop.png` | Desktop prototype | `#/research` · Normal day · 8:36 AM · Operations Desk researched off · scrolled to Facility | `ee624fb033207ba3c97e8e844a7105a8a38ec0e412edd25134c8fc092141d1ac` |

## Board files on the canvas (Version 23)

| Board file | SHA-256 |
|---|---|
| `project/auto-f-desk-alerts.dc.html` | `83460fe48311fba6bb79e2f6b2932d621be2c90d3c8ae1b80b874b642718497b` |
| `project/auto-f-desk-build.dc.html` | `58c9d4afab7a491aab65a8eb3661c67c06a4b21a545edaff040662f64dfa0f84` |
| `project/auto-f-desk-early-map.dc.html` | `6b5b04b6466fc6b9dd2f46bb0757f992836bb0e409afbbfc1713399495c79fd0` |
| `project/auto-f-desk-early.dc.html` | `f7a6aa958057bc0109b9e626ac24a00fa81efc4d09d037ba925b17df6e83d77f` |
| `project/auto-f-desk-feed.dc.html` | `9956d48911e0cac4d8a66f01651822a5a15f6f704799c4201c4e204f2f952e69` |
| `project/auto-f-desk-issues.dc.html` | `c967134acb4529f1cc7203fbf87c983becedc35b267476541412d2c1e1b39940` |
| `project/auto-f-desk-lines.dc.html` | `33a225ddb70f8e76a2a771d58c32e4a483b6388c8818229e08e6ab364d219514` |
| `project/auto-f-desk-manual.dc.html` | `ecb154c48dfd131ecc7d946b2f35afa9089b88e96e46a545325d5adef9cf842a` |
| `project/auto-f-desk-map.dc.html` | `acc6e98d7b571d1cb1dfb3567c7ced0f70ba4d5d038f4fe7c31095618d52f427` |
| `project/auto-f-desk-market.dc.html` | `32c6fe8078fe23f78adaf691f947b4ed98caf9010af750e664acf11b6f3db16a` |
| `project/auto-f-desk-overview.dc.html` | `a266d42043f5c4d202518fc6d2e3c68c04ab5bf87e1596045d85da2c03c3c5e1` |
| `project/auto-f-desk-tanks.dc.html` | `d9cd994f50705a6425314d8500a86622b8cdbc0074d6047c0c85751a0eb1b116` |
| `project/auto-f-desk-water.dc.html` | `9cf86cb3480eb764ac49a5f9e3dddc8585b29abbe1524d4b7398514a5a16c8eb` |
| `project/auto-f-phone-alerts.dc.html` | `ef8c49da675cccfd5338b32fd651053898cf0ecbc6e65c92350a3eb0b986746c` |
| `project/auto-f-phone-build.dc.html` | `1390b8bffaced974755431655dca0c1416021b6a771e8c04561c0b85f7c605c5` |
| `project/auto-f-phone-early-map.dc.html` | `bf2bcff26724252541ca735d911efbc3604145042cc4f92a793074edcc78eb45` |
| `project/auto-f-phone-early.dc.html` | `24a6b19df1af06c05d69536bd6475c20a8dc1bdfed8fa3670ac56b8e97b86969` |
| `project/auto-f-phone-feed.dc.html` | `e21ac5d3572c2af03961c2a592711f771aba2c36f5770228376fc180a34479ba` |
| `project/auto-f-phone-issues.dc.html` | `996afcf29b0cdda43aa514bbb92422d83a38a5e644399964c01b5e0e3101a199` |
| `project/auto-f-phone-lines.dc.html` | `e41f4de3f72091b7bddc94b424dc732e1ee53f6ac74168f35635998473706d49` |
| `project/auto-f-phone-manual.dc.html` | `17cf9a9157b0ec50b987df07fd89d1b16065775d749afd6cb08b476e3426f1c2` |
| `project/auto-f-phone-map.dc.html` | `e7a123855287d7374e3ead9a91e09282173280af64c43c7852e760e239f77212` |
| `project/auto-f-phone-market.dc.html` | `482f862a92eab743c0467286e098dfdfb86c8eebf02c08c4650f16d40a623dd3` |
| `project/auto-f-phone-overview.dc.html` | `91ed7777b746153b1d9fb6af95c5b87355cdb5cccadbb0c49a6ad34715fcecef` |
| `project/auto-f-phone-tanks.dc.html` | `1fd67043c8e67a6da1b4e63cdeae10699e9e627ef5f8247e8729db42a63e531e` |
| `project/auto-f-phone-water.dc.html` | `57c67e9ebcd240f1e5578fe08f99f28f75b61adf81c1d350947fdf519b2460e6` |
| `project/auto-g-desk-newline-1.dc.html` | `080af2dfe518633bd9f7aac6482104b4c7784392377a49f85dadd6cedb523e83` |
| `project/auto-g-desk-newline-2.dc.html` | `ae0227c013ba497a560e6e88518f27ead47151e584529dc86e4bdf6f8a481d07` |
| `project/auto-g-desk-newline-3.dc.html` | `e6f80f40a670a8c0bfbd76f8011b19277303bd131db778db0d6bc2d7221317f3` |
| `project/auto-g-desk-nodesk-alerts.dc.html` | `d26143e1bba3ada7202946c890dcd60a1b549f240cc6d75ebdc93e8c1e7dd067` |
| `project/auto-g-desk-nodesk.dc.html` | `913d11c1a8b71f7ddb4ddaabe586ec67fcaa58170b7032e2f254bd39a4327e68` |
| `project/auto-g-desk-production-full.dc.html` | `a7417b48c7e1823999a8e40842bd25c17c57477a83dedef6429b096e90a65edc` |
| `project/auto-g-desk-room.dc.html` | `64deeac4cbcbc914463eab3a69a87f27d2776e48925d43b830a7bb61f4e47401` |
| `project/auto-g-desk-salt.dc.html` | `a4aef5eb8ca5c1d165e28e8ee9510aee789b695dcfe38934259518a63fc9fbe9` |
| `project/auto-g-phone-newline-1.dc.html` | `b0ec7daf5a8f68cb9ca0a573b4976af2b6e75eaee497847ddb491e7849c52b5e` |
| `project/auto-g-phone-newline-2.dc.html` | `606b2907747545c1a0e23c73d5c6fd58ad89dcc8488e936dcd9e59de3eb0e26e` |
| `project/auto-g-phone-newline-3.dc.html` | `12ccba4b7728996b029538dcad1eac44697581f2c742a293ded218125c22a31b` |
| `project/auto-g-phone-nodesk-alerts.dc.html` | `3a39373f164a19e980821d8adc0785023da9a674a821d3c8fecb8426b89048ce` |
| `project/auto-g-phone-nodesk.dc.html` | `65e9787346c7a0bc5b2f7660a0d284fad7a17606cc727aaea9e0d02e74f16a8f` |
| `project/auto-g-phone-production-full.dc.html` | `e70eb2b07dbbfd1c6344baa6cf68739e2353aec41149e52e754d6262b40ea088` |
| `project/auto-g-phone-room.dc.html` | `2c6056b6d9335eb4c244efbbcdfa7bddaf570ba3f4c64aec675adcaecc3e2f4e` |
| `project/auto-g-phone-salt.dc.html` | `973747e7c3635f89bd0610f8b21877d195ed6bed372e4fd51cc46ddef7ce6986` |
| `project/auto-proto-phone.dc.html` | `c6b184b0b30909aa11b602a1d5abbe270c9a5f3917e5abe3cbde426a61844861` |
| `project/auto-proto-desk.dc.html` | `eb0e7ca777a36e45f76bf37c8563a3f4461528506583a3a0837042fa43a3dd7f` |
