# DESIGN-0.5: the approved 0.5 screens

The 45 static screens of the approved 0.5 design, exported from the canvas into the repo so a reviewer can compare
the game with them (owner, ADR-0029 decision 5, E5; B-185). The written spec,
`docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md`, wins over these pictures (its "How to use this document", point 4),
and the owner's later decisions win over both: see "Later decisions" below before reporting a difference.

- **Canvas:** the owner's "Design" canvas, https://claude.ai/artifact/SaZzQpkftDTxcZuzZQfgBk (private to the owner;
  the same canvas DESIGN-S3D came from). The two live prototypes (`Main.dc.html`, `desktop-prototype.dc.html`; spec
  Appendix B) stay there: they are interactive and weren't exported.
- **Version captured:** version id `1791264082-fb19` (Version 23, published 2026-10-06 05:21 UTC, the version
  DESIGN-S3D's `SOURCE.md` records). Every board file was read from it and hashed (the table at the end).
- **Export date:** 2026-10-14, by Claude Code in the owner's session, at the owner's request.
- **How the screens were made:**
  - Each board file is static markup: its logic returns nothing, and it has no template holes, loops or child
    components. So it was rendered as plain HTML, without the canvas runtime, in Chromium 153.0.8010.12 (Playwright
    1.63.0, the copy in the test clone) at 1×, at the board's own size: phone 390×844, desktop 1440×948. The desktop
    boards include the browser's address bar showing the link.
  - The boards' 16 images (uploaded to the canvas, referenced as `/_blob/<id>`) were downloaded from the canvas and
    served from disk. The Inter and Fraunces fonts loaded from Google Fonts, as the boards link them. Every other
    request would have been blocked; none was made.
  - A check ran on every render: both fonts loaded, every image loaded, and the board's root box sat at 0,0 at
    exactly the board size.
  - The PNGs are full colour (DESIGN-S3D's were reduced to 256 colours), 15.8 MB in all.
  - **Method check:** two DESIGN-S3D boards rendered the same way (`auto-f-phone-overview`, `auto-g-desk-room`)
    match the repo's captures of them (`operations-overview-normal-phone.png`, `home-room-view-desktop.png`) in
    layout, text and images. The differences come from that capture's 256-colour dithering: a mean channel
    difference of 7.05 and 5.29 out of 255, and 0.16% and 0.11% of pixels differing by more than 48.
- **Names:** the board file's name with `.png` (`phone-offer.dc.html` → `screens/phone-offer.png`), so the spec's
  Appendix A finds them. They don't follow DESIGN-S3D's `<screen>-<state>-<viewport>` names.

## The screens

Screen, link and state are the spec's Appendix A. "Spec" is the section the screen illustrates. The prototype
uses fixed sample data (money, stock, animals, social data), so numbers and names in the pictures are samples.

### Navigation

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-home.png` | Phone · Tank view with the tab bar | `#/` | — | §5.2 |
| `screens/phone-more.png` | Phone · More | `#/more` | — | §5.3 |
| `screens/phone-guide.png` | Phone · Guide points to Research | `#/more` | guide on the Research step | §5.5 |
| `screens/desk-home.png` | Desktop · Dock with Social | `#/` | — | §5.4 |
| `screens/desk-early.png` | Desktop · Early game locks | `#/visitors` | early game | §5.7 |

### Shop and Prismatic

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-shop-prism.png` | Phone · Shop · Prismatic only | `#/shop?prismatic=1` | — | §7.2, §7.3 |
| `screens/phone-offer.png` | Phone · Prismatic offer | `#/shop/fish/offer_k3x9` | — | §7.4, §7.5 |
| `screens/phone-offer-genes.png` | Phone · Offer genes, before the lab | `#/shop/fish/offer_k3x9` | — | §7.4.1 |
| `screens/desk-shop-rare.png` | Desktop · Shop · Rare genes | `#/shop?rare=1` | panel maximised | §7.2, §7.3 |
| `screens/desk-offer.png` | Desktop · Offer with link copied | `#/shop/fish/offer_k3x9` | link copied | §6.6, §7.4 |

### Shop edge cases

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-offer-blocked.png` | Phone · No tank fits | `#/shop/fish/offer_c2pq` | — | §7.5 |
| `screens/phone-offer-gone.png` | Phone · Offer that’s gone | `#/shop/fish/offer_zz00` | — | §7.6 |
| `screens/phone-shop-empty.png` | Phone · No Prismatic in stock | `#/shop?prismatic=1` | no Prismatic in stock | §7.2 |
| `screens/phone-low-money.png` | Phone · Not enough money | `#/shop/fish/offer_k3x9` | $40 in the bank | §7.5 |
| `screens/phone-broken.png` | Phone · Broken link | `#/` | broken-link toast | §6.5 |

### Genetics

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-cambodian.png` | Phone · Cambodian betta (new gene) | `#/shop/fish/offer_m5cb` | — | §8.7 |
| `screens/phone-catalog.png` | Phone · Betta morph catalog | `#/encyclopedia/betta` | — | §8.5, §8.7 |
| `screens/desk-research.png` | Desktop · Genetics Lab research | `#/research` | — | §9.1 |
| `screens/desk-shop-rare-lab.png` | Desktop · Rare genes after the lab | `#/shop?rare=1` | panel maximised, Genetics Lab researched | §7.2, §9.1 |
| `screens/desk-offer-lab.png` | Desktop · Carriers revealed | `#/shop/fish/offer_r4vt` | Genetics Lab researched | §7.4.1, §9.1 |
| `screens/desk-catalog.png` | Desktop · Betta genes and catalog | `#/encyclopedia/betta` | panel maximised | §8.5, §8.7 |

### Notifications and links

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-notif-off.png` | Phone · Notifications off | `#/settings/notifications` | — | §12.3 |
| `screens/phone-notif-prompt.png` | Phone · System permission prompt | `#/settings/notifications` | permission prompt open | §12.4 |
| `screens/phone-notif-on.png` | Phone · Notifications on | `#/settings/notifications` | notifications granted | §12.3, §12.5 |
| `screens/phone-lock.png` | Phone · Lock-screen alerts | — | phone locked, notifications granted, Auto-feed paused, all categories on | §12.7, §12.8 |
| `screens/phone-opening.png` | Phone · Opening from the alert | — | loading from a notification | §6.4, §12.6 |
| `screens/phone-from-push.png` | Phone · Offer opened from the alert | `#/shop/fish/offer_k3x9` | opened from the notification | §12.6 |
| `screens/phone-banner.png` | Phone · Alert while playing | `#/` | Prismatic alert showing, notifications granted | §12.8 |
| `screens/phone-alerts.png` | Phone · Alerts drawer | `#/` | Alerts drawer open, Auto-feed paused | §10.2 |
| `screens/desk-perm.png` | Desktop · Browser permission prompt | `#/settings/notifications` | permission prompt open | §12.4 |
| `screens/desk-notif.png` | Desktop · System notification | `#/` | Prismatic alert showing, notifications granted | §12.8 |

### Automation and production

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-card-equip.png` | Phone · Tank card · Automation | `#/tanks/ember/equipment` | — | §10.1 |
| `screens/phone-card-owned.png` | Phone · Auto-clean unlocked | `#/tanks/ember/equipment` | owns the Auto Water Changer | §10.3 |
| `screens/phone-feed-paused.png` | Phone · Auto-feed paused | `#/tanks/ember/equipment` | Auto-feed paused | §10.2 |
| `screens/phone-production.png` | Phone · Production line | `#/livestock/production` | — | §11.1 |
| `screens/desk-card.png` | Desktop · Tank card · Auto-clean on | `#/tanks/ember` | owns the Auto Water Changer | §10.1, §10.3 |
| `screens/desk-supplies.png` | Desktop · Supplies · Auto Water Changer | `#/market/supplies` | — | §7.8, §10.3 |
| `screens/desk-production.png` | Desktop · Production line | `#/livestock/production` | panel maximised | §11.1 |

### Social

| File | Screen | Link | State | Spec |
|---|---|---|---|---|
| `screens/phone-signin.png` | Phone · Social sign-in | `#/social` | — | §13.2 |
| `screens/phone-signin-error.png` | Phone · Sign-in error | `#/social` | validation error | §13.2 |
| `screens/phone-invite.png` | Phone · Club invite, signed out | `#/social/join/HIGHLAND-4821` | — | §13.3 |
| `screens/phone-join.png` | Phone · Join the club | `#/social/join/HIGHLAND-4821` | signed in | §13.3 |
| `screens/phone-clubs.png` | Phone · Clubs | `#/social/clubs` | signed in, member of Highland Betta Club | §13.5 |
| `screens/phone-leaderboard.png` | Phone · Leaderboards | `#/social/leaderboards` | signed in, Prismatics leaderboard, owns a Prismatic | §13.5 |
| `screens/desk-social.png` | Desktop · Social overview | `#/social` | signed in, member of Highland Betta Club, panel maximised | §13.4 |

## Later decisions

Where a screen and a later owner decision differ, the decision wins. These change what the screens show:

- **Settings is a gear in the top bar, not dock item 11** (ADR-0026 decision 1, ADR-0027 item 1): every desktop
  screen shows the old dock. The dock also gains Operations after Build (DESIGN-S3D, chunk 5).
- **The More sheet's top sits at about 40% of the height, not 48%**, to fit the Operations row (ADR-0027 item 2):
  `phone-more.png`, `phone-guide.png`.
- **Production lines follow DESIGN-S3D SPEC §8.6 and §8.6.1, not 0.5 §11.1's single line card** (ADR-0025;
  ADR-0005 decision 6: several lines per species). The tiles read "Quarantine" for "Listed now", and This week shows
  sales and count with a second line for the net after food and power (ADR-0026 decision 3, ADR-0027 item 3):
  `phone-production.png`, `desk-production.png`.
- **Social is reachable only in dev mode** until a real backend exists (ADR-0005 decision 3, SOC-011): the Social
  screens, the Social dock item and More tile are built and tested as designed but hidden from players. Its empty
  trades and friends lists, which no screen shows, are ADR-0028's.
- **Lock-screen delivery is the native app's, which is deferred** (ADR-0003, 0.5 §12.7): `phone-lock.png` shows
  the later phase; on the web, notifications arrive as §12.6 says.

## Hashes

| File | Board file | Board file SHA-256 | PNG SHA-256 |
|---|---|---|---|
| `screens/phone-home.png` | `project/phone-home.dc.html` | `928581e1d3455a570d250524a5240ed950adb9fc45e570d410435821931a0a54` | `7aa897eb61a5c34e8748c4f2271593a86f42018dd9202a42e9eb8161410d9131` |
| `screens/phone-more.png` | `project/phone-more.dc.html` | `e634ff1865c441f6d69180442beae48ea14a50f293080b9b370280191170d8fb` | `25b32cc9ff04533ece2e3ff10c842123e72c5c908fe95407e8629e506b2e23e8` |
| `screens/phone-guide.png` | `project/phone-guide.dc.html` | `dbdf7d454f041c70cc6a7ba3d916192902415e2a7250b6879b9544faf046b838` | `90d50b856431a27d1913da2e386c1d56d1fa2b0eec39dd79d8674d993628730e` |
| `screens/desk-home.png` | `project/desk-home.dc.html` | `5761cb3eb28b93be3730d09ca5dacae3f3f77b76b09cc1c9d02b246e762142e9` | `f56d8098e65c6508636c44b2f3a7e4df06d0f3fe38ccaa2a44011d5f4d2ea54c` |
| `screens/desk-early.png` | `project/desk-early.dc.html` | `7f1b955610025fbdb10a8153199989518634500d42129443b8093378be8efcb6` | `9cd177228ca95d91fa536db23c06e851915129f5e029176dc18f44598c9e03e6` |
| `screens/phone-shop-prism.png` | `project/phone-shop-prism.dc.html` | `b6f94a1ae74336fe0a88c64bed6a7a4b8507eb0232848f0c446e47b8d3e0b724` | `b466b7304c4f238de7531bcca1edc6751d352c4da3f779b6688905b7d6c75f7d` |
| `screens/phone-offer.png` | `project/phone-offer.dc.html` | `7f1b6a4756b5ceda201055e2828e0e00a542caf4749ff6cb782b5260797a5548` | `9c3b900ca50d9ea3f650ae89130270aadc03c3bf629a5fae383e6c91194c6a77` |
| `screens/phone-offer-genes.png` | `project/phone-offer-genes.dc.html` | `1de09c6a2ec0bc7e8110ae34cd970c646131cfd5980c02a649df1e2459cac4f6` | `a0e2acaedc481be46a32441de5d671f84f6f48b022e8042e27351420ba41f8d5` |
| `screens/desk-shop-rare.png` | `project/desk-shop-rare.dc.html` | `85ecfbb87e897e8f80023a8c3cf4a0e8b8c3d31d16c23162c59c2e77ab745d45` | `bdec6acab9dcf47e28ef65c99284cc886ad905047568884f93c09a690a6c2568` |
| `screens/desk-offer.png` | `project/desk-offer.dc.html` | `6d8d3e2a2b0e1a1b1c8e936145315b625f3a4e1a5fa29c32739e89ab98ab25f4` | `7913452c4f0c39aafc06ad1fd54cbe451c57f3ee493d8ff2d85178aa15206e18` |
| `screens/phone-offer-blocked.png` | `project/phone-offer-blocked.dc.html` | `c5ea1d5f4ffa8e1fa70fbf3bece5f6ef21c0cad4dd391182e8e4cad1a7cb32dc` | `92204937c4d94b58857c0572e0c971e4d4959c8d045c81ed061603cd175cdd3f` |
| `screens/phone-offer-gone.png` | `project/phone-offer-gone.dc.html` | `819ef757bd3b015500a4ffcca726f4c946fb4ec6f1048c1164cc823b2b773d04` | `4fe2a16f6cb9b2cec44bea57f2d32c2a30560148346bd8dfc7314e11a4998390` |
| `screens/phone-shop-empty.png` | `project/phone-shop-empty.dc.html` | `69f0bd5a35433e0fd7c82076731d2bb26cd303843ddee2282a3a10e29132e135` | `a300536696156ac00e2a5a921293c6d4680b7a1f0367b2b4cbe2c597b203514e` |
| `screens/phone-low-money.png` | `project/phone-low-money.dc.html` | `4947d7a04f49e9f90dd6728c45b55656f6a47574b46de8f3a1095781c4e48d01` | `c9e839aa0119c6a1dd9fc9d794d5d2d4e364fb74e87c842be9040c3f087b6ec1` |
| `screens/phone-broken.png` | `project/phone-broken.dc.html` | `c91720fe4165369e9521360c7ca3cc2e29d420548df2fb96376855278732b36c` | `28ffe062f6aac97eb63bfc8004a9b678d9a49d5a349275db44bd971e49b9356c` |
| `screens/phone-cambodian.png` | `project/phone-cambodian.dc.html` | `ecadeb3952069c18f8fbd8afe6170063ed841c9baa1be5bed7152d660ca0a8ef` | `eb299def2bf60334d391d20da9f614d12873a976edb7ef69223ad8b9db1d3285` |
| `screens/phone-catalog.png` | `project/phone-catalog.dc.html` | `48e942b217312841874944ef79273c4630f0811fa873845e74c8c9677fadc2bb` | `fda0d362c6c45071bdf3a37bc25f48289554dda20d7bac4e47556e3ca1bdea62` |
| `screens/desk-research.png` | `project/desk-research.dc.html` | `244f1ba37a1a21f25b115b6d7ee7aa6329a461d3b59e3a8230adb5feaad83ec7` | `47b6d2e01fe7d07291ab452e5f72ccbe2a85b0e492abf26a0b2dc97226c6027f` |
| `screens/desk-shop-rare-lab.png` | `project/desk-shop-rare-lab.dc.html` | `7161f5a862c7f843b200c481bac2c2fa33ac6568ced704145edcce13404681a6` | `e3ff43dc41ed94e37b50fce00aeb24ae31f3b68e22eaa9c02ef5e399407cbc1e` |
| `screens/desk-offer-lab.png` | `project/desk-offer-lab.dc.html` | `7e4c9a9e94184c02e8fde50fa1b52531ad42c54c1ed0ffa105c81cf3f7b44a54` | `9407a74c78cda424b97e5c03b6f6e559716bd411f5e907e42cf4bef51c54306d` |
| `screens/desk-catalog.png` | `project/desk-catalog.dc.html` | `5c5d10cd3e5d5e04e54bf533780cccc93391b064db9ac2f302916399c1641c5d` | `b3b6d989b9d8242853faf5f57d1c8a2bc4dacd0c8b354a25844bef49dc69643d` |
| `screens/phone-notif-off.png` | `project/phone-notif-off.dc.html` | `892f82d7e616a42c0c22f5597c439c7486ae364dbd52d9af0c214958a9524b13` | `916fcb705241e95af3a24426301f4118b26bc3a4cbbc8467b28e56f59690d863` |
| `screens/phone-notif-prompt.png` | `project/phone-notif-prompt.dc.html` | `d647f697fb050502179f57c33af2a89c5c51523084b52380f635acd4668ebec0` | `a32eb06e4c7d4086e84b3ac5640e1871a2ee6bb3b18e7905a1f4638946b33f26` |
| `screens/phone-notif-on.png` | `project/phone-notif-on.dc.html` | `e33202f993cfbd04861531d7346053e2b4e946222c649290714bd902b69f4b21` | `b553647c8d752016145ec91444aee0109d4cba77d8a8d5c561ef72ee652de787` |
| `screens/phone-lock.png` | `project/phone-lock.dc.html` | `41bfad8ad2fc7e95172ca4488cb3ec087a73db3a5d59dfd674d50594dfaa52db` | `c8b314ae05610fe3803dfa3c94242c6a244cba237d18c27de3d72787f2560d7b` |
| `screens/phone-opening.png` | `project/phone-opening.dc.html` | `96c0c6cd9b42eff53d434ca4ba1007acbe32e008ee2af762091820730f8fd56a` | `a606808f820e180d23786e4427f0b45471a3f2f8d59b977f39ed333987d48e19` |
| `screens/phone-from-push.png` | `project/phone-from-push.dc.html` | `34bdceda86d15af9c61b81656d55457577c564666b880d1031580700507e24a8` | `2c9f1596a9c41e44bf5b79b66e4192835e9c28ada112af4b1ada1d7491a91475` |
| `screens/phone-banner.png` | `project/phone-banner.dc.html` | `8ed428bf0acd377104f95afeaaf758d53cca5391b21591e0ec07d907e9e8c327` | `fb713979021989882d2a3fc4ff29331a349bb62db31a53454190dc5ec517c739` |
| `screens/phone-alerts.png` | `project/phone-alerts.dc.html` | `967e031271eb412fb7e62c2c020cc5739586a2d9dbe55952b7f217797a77c8a6` | `c6615ce844d1c85b162b3f5703155c7fb77e3044e1466c6b9562fb253e88609d` |
| `screens/desk-perm.png` | `project/desk-perm.dc.html` | `5f7e874135b469427cc0e49ce630f27c31f24df1400ad2d93c73b0edcec72f38` | `1d7bcdbdee1933b13e30347f45d39822ff12ced74fdcca690fa6e1c6eba9e41e` |
| `screens/desk-notif.png` | `project/desk-notif.dc.html` | `098b024fdc4013be762f6eb94189d7ae89dd506448dbed11573e563cf63a680d` | `58a2a5aaf4a691b50d62ae5b4d44a5c71872f1ed386a35302bcf4c2b66c750bb` |
| `screens/phone-card-equip.png` | `project/phone-card-equip.dc.html` | `eeb70c2e59d726efc74fd2d8b9c32c2fa06e9c1c5d0c8a1716d1535614ec2ee3` | `707567a3e0293e20efe10de0d300c185c6d0d847a6f50e144a4c79b297683bc3` |
| `screens/phone-card-owned.png` | `project/phone-card-owned.dc.html` | `3f1f81de582a29fcf6ee17535284d18b07c5d536b3ed9943746c490a7022baa1` | `c1137c49324190287f5cf033ae76ee5c0174ab4b098e08447b26ba610bf638e0` |
| `screens/phone-feed-paused.png` | `project/phone-feed-paused.dc.html` | `2b8d5e4c75d7a537071c05c3877ba72e99699a40f59a8a8ed0c11411ff6b9f96` | `9d3fa4fde774c2855bd632ada00874831e56da893abeb281edc4fde08b73fd0e` |
| `screens/phone-production.png` | `project/phone-production.dc.html` | `1c3680bddece51481b5e6c367596e982232c6e321585beb5ab290d4256ea0151` | `597edffab12d939df65145443409e25dcca4696cf46b904fe54daa592dfebe0e` |
| `screens/desk-card.png` | `project/desk-card.dc.html` | `8788a0d2ed771c30286d157d2195c378d930d79635e732eea9e77fa251011bc3` | `c8286defac60909914f8f4fdb5997ff007aa79d3475a4e5730927fc4a433fb09` |
| `screens/desk-supplies.png` | `project/desk-supplies.dc.html` | `5aafaf2b7b399be91ca3eb6e4352a6dbee0d3bf02c69ecde9fc4fb3f5b4d663f` | `f17f88258be24a9af957c6c865d87ff05dca70abbc157c7b2134d872c8e2ae07` |
| `screens/desk-production.png` | `project/desk-production.dc.html` | `66b0bb090dea71938bda4d66f4b9bccbf14f2ff06e4a3866d1350e11032a74a7` | `c9d1b341943223cf916f4047f8d3d776a9c72573b370467b99765f09fd4ac52d` |
| `screens/phone-signin.png` | `project/phone-signin.dc.html` | `4fc8026fdd35921a1042aa9426284d2626fc25c0093a2c9e46895f77d582f3b9` | `1333e591f56b325612b61ab5acc436b91c76474d031aef7f3fc29ccc2d81bd16` |
| `screens/phone-signin-error.png` | `project/phone-signin-error.dc.html` | `4f300582b225da8cec3d829d3bbdbe6d85c40bfb06e7ace9854b64e65c819f0e` | `b94fc46592ae7556404bbdb7f67dbeef5c654998a70241745bb5e958f1da1eea` |
| `screens/phone-invite.png` | `project/phone-invite.dc.html` | `112985c602e852d9310092582ead639a2c18641c9f4a3015612504ea2c63e7a7` | `b0cc9011d1164ce258d051698ff76745c386f45ef7380e6c841eb61ee41208f7` |
| `screens/phone-join.png` | `project/phone-join.dc.html` | `c8f411c31db906886bab7156bd8be1148d355a2ccd753a6d17fa259de0aa05c2` | `bac807961a232ef87663eda94aea7c335f52e6dd11456289a641a8cab422a53a` |
| `screens/phone-clubs.png` | `project/phone-clubs.dc.html` | `714405926edc4a2dee85ade8c12ba6dece6ddced21149868b8a062b4805f6f7c` | `3b7a14d7ebf0102325c0862322fd6efc305260be57729d7ecdc52ece57f17416` |
| `screens/phone-leaderboard.png` | `project/phone-leaderboard.dc.html` | `ff066e8fb4f9bbe81b89838d36957b9ff495d138f90158c439f21adbaa5ef3a0` | `463c4786e313ad8d398ec5848baa5946dd33d52387a9a7503a6c058a6afdb6b4` |
| `screens/desk-social.png` | `project/desk-social.dc.html` | `2c8837f8a10660593529e09cddcf781411177647e3aa247ea79b0e8b01ca9f38` | `faa5f8919cd7a3ac21e5123457e2ebd0a40e5be9c934cf8a5547607ba3745d6f` |
