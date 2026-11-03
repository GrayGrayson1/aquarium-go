#!/bin/zsh
# Sequential test runs in the review worktree (never the main checkout).
WT=/Volumes/Dev/Projects/AquariumGo-review-adv
S=$(cd "$(dirname "$0")" && pwd)
cd $WT || exit 1
git checkout -q -- . ; git checkout -q --detach 70e1858ba4d98f1f4d741ac3c9c65824a37c5b85 && git clean -fdq -e node_modules -e .adv-review
echo "== R2 npm test @ $(git rev-parse --short HEAD) $(date +%T)"
npm test > $S/R2-npm-test.log 2>&1; echo "R2 exit=$?"
grep -E "Test Files|^ +Tests " $S/R2-npm-test.log
echo "== R1 npm run typecheck $(date +%T)"
npm run typecheck > $S/R1-typecheck.log 2>&1; echo "R1 exit=$?"
tail -5 $S/R1-typecheck.log
cp $S/tests/zz-adv-*.test.ts tests/sim/
echo "== R3a no-assertion control $(date +%T)"
npx vitest run tests/sim/zz-adv-noassert.test.ts > $S/R3a.log 2>&1; echo "R3a exit=$?"
echo "== R3b .only control $(date +%T)"
npx vitest run tests/sim/zz-adv-only.test.ts > $S/R3b.log 2>&1; echo "R3b exit=$?"
echo "== R3c integrity + fuzz + loop probes $(date +%T)"
npx vitest run tests/sim/zz-adv-integrity.test.ts tests/sim/zz-adv-crafted-fuzz.test.ts tests/sim/zz-adv-loop.test.ts > $S/R3c.log 2>&1; echo "R3c exit=$?"
echo "== R3d vitest list of the integrity probe $(date +%T)"
npx vitest list --json tests/sim/zz-adv-integrity.test.ts > $S/R3d-list.json 2> $S/R3d-list.err; echo "R3d exit=$?"
echo "== M1 mutation: drop the GameLoop catch reset $(date +%T)"
cp src/game/GameLoop.tsx $S/GameLoop.orig.tsx
perl -0pi -e 's/    done = 0;\n    slowedFor = null;\n//' src/game/GameLoop.tsx
git diff --stat -- src/game/GameLoop.tsx
npx vitest run tests/sim/core-fastmutate-atomic.test.ts > $S/M1.log 2>&1; echo "M1 exit=$?"
cp $S/GameLoop.orig.tsx src/game/GameLoop.tsx
echo "== M2 mutation (control): fastMutate publishes on throw $(date +%T)"
cp src/game/fastMutate.ts $S/fastMutate.orig.ts
perl -0pi -e 's/    resetFastMutate\(\);\n    throw e;/    publish(current);\n    throw e;/' src/game/fastMutate.ts
git diff --stat -- src/game/fastMutate.ts
npx vitest run tests/sim/core-fastmutate-atomic.test.ts > $S/M2.log 2>&1; echo "M2 exit=$?"
cp $S/fastMutate.orig.ts src/game/fastMutate.ts
git status --short
echo "== done $(date +%T)"
