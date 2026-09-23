/**
 * livebearer — guppies, endlers, mollies, platies. OWNER: lane "breeding".
 *
 * Female: idle ─(mature male present OR stored sperm, readiness ≥ 50)─▶ gravid (gestation = incubationHours;
 *         renderers can fill the belly from `repro.progress`) ─▶ drops fry (clutch 'fry', visual 'fry_cloud')
 *         ─▶ resting (cooldownDays) ─▶ gravid again…
 * Stored sperm: mating with a male stores up to STORED_BROODS further broods (bounded), so a lone female can still
 * drop a few batches. Fry are eaten by adults unless there is dense cover or a nursery. No runaway: readiness falls
 * with stocking (common.readinessTarget), and minted juveniles are capped by tank capacity.
 * Too many males per female → the males harass her (stress), a classic guppy-keeping lesson.
 */
import type { BreedingModule, StepEnv } from '../types';
import { createClutch } from '../clutch';
import { bumpCounter } from '@/sim/facility';
import {
  approxDuration,
  habitatOf,
  hurt,
  isMature,
  pickSite,
  plural,
  rollClutchSize,
  roleOf,
  say,
  setStage,
  spPlural,
  startResting,
  throttleTank,
  throttleTankBackoff,
  tickTimers,
} from '../common';

const STORED_BROODS = 2;
const GRAVID_READY = 50;

export const livebearerModule: BreedingModule = {
  id: 'livebearer',
  breedable: true,
  plan: {
    phases: [{ stage: 'fry', frac: 1, foods: ['flake', 'infusoria', 'baby_brine', 'pellet_small', 'daphnia'], natural: ['biofilm', 'infusoria', 'algae'], visual: 'fry_cloud', label: 'fry' }],
    eggTags: [],
    youngTags: ['fry'],
    parentsEatEggs: true,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: false,
    hatchAtNight: false,
    larvaeViable: true,
    starveSeverity: 0.7,
    coverShelter: 0.85,
    yolkFrac: 0.05,
  },

  step(env: StepEnv) {
    const { state, tank, species: sp, members, hour, dt, ctx } = env;
    const b = sp.breeding;
    const adults = members.filter((c) => isMature(c, sp, hour));
    for (const c of adults) tickTimers(c, hour);
    const males = adults.filter((c) => roleOf(c, sp) === 'male');
    const females = adults.filter((c) => roleOf(c, sp) === 'female');
    const activeMale = males.find((m) => m.stats.health >= 40);

    for (const f of females) {
      const r = f.repro;
      if (r.stage === 'gravid') {
        if (r.carryingUntilHour !== undefined && hour >= r.carryingUntilHour) {
          const father = r.partnerId ? state.creatures[r.partnerId] : undefined;
          const n = Math.max(1, Math.round(rollClutchSize(ctx.rng, sp, f) * (0.6 + 0.4 * (f.stats.breedingReadiness / 100))));
          const site = pickSite(tank, 'plants_low', `${f.id}:${hour.toFixed(1)}`, 2);
          createClutch(state, {
            sp,
            tank,
            mother: f,
            father: father ?? null,
            hour,
            stage: 'fry',
            count: n,
            visual: 'fry_cloud',
            nextStageHour: hour + b.fryRearingHours,
            anchor: site.anchor,
            extraAnchors: site.extra,
            notes: 'Live-born fry hiding in the plants.',
          });
          startResting(f, hour, b.cooldownDays * 24);
          const key = `drops_${sp.id}`;
          const seen = state.progress.counters[key] ?? 0;
          bumpCounter(state, key);
          const cover = habitatOf(state, tank).cover;
          const tip = tank.purpose === 'nursery' ? '' : cover >= 0.5 ? ' The dense plants give them places to hide.' : ' Adults eat fry — dense plants or a nursery tank will save more of them.';
          say(state, ctx, { kind: 'breeding', text: `${f.name} dropped ${plural(n, 'fry', 'fry')}!${tip}`, tankId: tank.id, creatureId: f.id, toast: seen < 3 });
        }
        continue;
      }
      if (r.stage !== 'idle' && r.stage !== 'conditioning') continue;
      if (f.stats.breedingReadiness < GRAVID_READY) {
        if (r.stage === 'idle' && activeMale) setStage(f, 'conditioning', hour);
        continue;
      }
      let mated = false;
      if (activeMale) {
        r.partnerId = activeMale.id;
        r.storedBroods = STORED_BROODS;
        mated = true;
      } else if ((r.storedBroods ?? 0) > 0) {
        r.storedBroods = (r.storedBroods ?? 0) - 1;
        mated = true;
      }
      if (!mated) continue;
      setStage(f, 'gravid', hour);
      r.carryingUntilHour = hour + b.incubationHours * ctx.rng.range(0.9, 1.1);
    }

    // Male-heavy groups: constant chasing stresses the females.
    if (males.length > 0 && females.length > 0 && males.length >= females.length * 1.5) {
      for (const f of females) hurt(f, 2.5 * dt, 0, 0, 'harassment');
      if (throttleTankBackoff(tank, `lb_ratio_${sp.id}`, hour, 72)) {
        say(state, ctx, { kind: 'tip', text: `The male ${spPlural(sp)} are chasing the females non-stop — keep two or three females for every male.`, tankId: tank.id });
      }
    }
  },

  check(cc) {
    const { state, tank, sp, hour } = cc;
    if (!tank) return;
    const inTank = Object.values(state.creatures).filter((c) => c.tankId === tank.id && c.speciesId === sp.id && isMature(c, sp, hour));
    const males = inTank.filter((c) => roleOf(c, sp) === 'male').length;
    const females = inTank.filter((c) => roleOf(c, sp) === 'female').length;
    if (males >= females * 1.5 && females > 0) cc.steps.push('Keep two or three females per male so the females aren’t harassed.');
    if (habitatOf(state, tank).cover < 0.5) cc.steps.push('Dense plants (or a nursery tank) save far more fry from being eaten.');
  },

  force(state, male, female, tank, hour) {
    female.repro.partnerId = male.id;
    female.repro.storedBroods = STORED_BROODS;
    setStage(female, 'gravid', hour);
    female.repro.carryingUntilHour = hour + 1;
    return `${female.name} is gravid and about to drop fry.`;
  },

  status(state, c, sp, hour) {
    const r = c.repro;
    if (r.stage === 'gravid') {
      const due = (r.carryingUntilHour ?? hour) - hour;
      return { label: due > 0 ? `Gravid — fry due in ${approxDuration(due)}` : 'Gravid — fry due any moment', detail: (r.storedBroods ?? 0) > 0 ? `Stored sperm for ${plural(r.storedBroods ?? 0, 'more brood')}` : undefined, progress: r.progress };
    }
    return null;
  },
};
