#!/bin/zsh
WT=/Volumes/Dev/Projects/AquariumGo-review-adv
S=$(cd "$(dirname "$0")" && pwd)
cd $WT || exit 1
cp $S/tests/zz-adv-subscriber.test.ts $S/tests/zz-adv-market.test.ts tests/sim/
cp src/game/GameLoop.tsx $S/GameLoop.orig2.tsx; cp src/sim/economy/listings.ts $S/listings.orig.ts
perl -0pi -e 's/    done = 0;\n    slowedFor = null;\n//' src/game/GameLoop.tsx
perl -0pi -e 's/  if \(state\.offlineGrace\) return 1;\n//' src/sim/economy/listings.ts
git diff --stat -- src/game/GameLoop.tsx src/sim/economy/listings.ts
echo "== pre-fix behaviour (both S0 changes reverted) $(date +%T)"
npx vitest run tests/sim/zz-adv-subscriber.test.ts tests/sim/zz-adv-market.test.ts > $S/M3.log 2>&1; echo "M3 exit=$?"
cp $S/GameLoop.orig2.tsx src/game/GameLoop.tsx; cp $S/listings.orig.ts src/sim/economy/listings.ts
git diff --stat -- src
echo "== done $(date +%T)"
