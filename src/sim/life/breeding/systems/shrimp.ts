/**
 * shrimp_berried (Neocaridina: cherry shrimp) and shrimp_larval_marine (Amano, cleaner & peppermint shrimp).
 * OWNER: lane "breeding".
 *
 * Female: idle ─(male present, mature, clean stable water, readiness ≥ 55)─▶ berried (eggs under her tail:
 *         clutch 'eggs' visual 'berried', carried → follows her) ─(incubationHours)─▶ hatch ─▶ resting
 * Neocaridina: fully formed shrimplets hatch straight into the tank ('fry_cloud'); they graze biofilm, hide in moss,
 *   and are eaten by almost any fish (compat youngOnly risks + predatorTags 'shrimp_fry'). Colonies are bounded by
 *   tank capacity (readiness falls with stocking; minting is capacity-capped).
 * Larval-marine species carry eggs too, but their planktonic larvae need brackish/marine rearing that this build
 *   doesn't offer — the hatch is explained and the larvae are lost.
 * Simultaneous hermaphrodites (Lysmata) pair with any other adult.
 */
import type { Creature } from '@/types';
import type { BreedingModule, RearingPlan, StepEnv } from '../types';
import { createClutch } from '../clutch';
import { bumpCounter } from '@/sim/facility';
import { approxDuration, isMature, plural, rollClutchSize, roleOf, say, setStage, spName, spawningWaterIssue, startResting, tickTimers } from '../common';

const BERRY_READY = 55;

function makeShrimp(id: 'shrimp_berried' | 'shrimp_larval_marine', plan: RearingPlan, viable: boolean): BreedingModule {
  return {
    id,
    breedable: true,
    plan,
    explain: (sp) =>
      viable
        ? `${sp.commonName} females carry their eggs under the tail until tiny shrimplets hatch.`
        : `${sp.commonName} larvae drift as plankton and need special ${sp.environment === 'marine' ? 'marine' : 'brackish'} larval rearing — beyond this shop for now.`,

    step(env: StepEnv) {
      const { state, tank, species: sp, members, hour, ctx } = env;
      const b = sp.breeding;
      const adults = members.filter((c) => isMature(c, sp, hour));
      for (const c of adults) tickTimers(c, hour);
      const herm = sp.sexSystem === 'simultaneous_hermaphrodite';
      const males = adults.filter((c) => herm || roleOf(c, sp) === 'male');
      const females = adults.filter((c) => herm || roleOf(c, sp) === 'female');
      const waterIssue = spawningWaterIssue(tank, sp);
      const temp = tank.water.tempC;
      const goodTemp = temp >= sp.tempC.idealMin - 1 && temp <= sp.tempC.idealMax + 1;
      const matureTank = (tank.water.bioMaturity ?? 0) >= 0.45;

      for (const f of females) {
        const r = f.repro;
        if (r.stage === 'berried') {
          const cl = r.clutchId ? state.clutches[r.clutchId] : undefined;
          if (!cl || cl.stage !== 'eggs' || cl.visual !== 'berried') startResting(f, hour, b.cooldownDays * 24);
          continue;
        }
        if (r.stage !== 'idle' && r.stage !== 'conditioning') continue;
        const mate: Creature | undefined = males.find((m) => m !== f && m.stats.health >= 40);
        if (!mate || waterIssue || !goodTemp || !matureTank || f.stats.breedingReadiness < BERRY_READY) {
          if (r.stage === 'idle' && mate) setStage(f, 'conditioning', hour);
          continue;
        }
        const n = rollClutchSize(ctx.rng, sp, f);
        const cl = createClutch(state, {
          sp,
          tank,
          mother: f,
          father: mate,
          hour,
          stage: 'eggs',
          count: n,
          visual: 'berried',
          nextStageHour: hour + b.incubationHours,
          guardedById: f.id,
          notes: 'Eggs carried under the female’s tail.',
        });
        setStage(f, 'berried', hour);
        f.repro.carryingUntilHour = cl.nextStageHour;
        f.repro.clutchId = cl.id;
        const key = `berried_${sp.id}`;
        const seen = state.progress.counters[key] ?? 0;
        bumpCounter(state, key);
        say(state, ctx, {
          kind: 'breeding',
          text: viable
            ? `${f.name} is berried — you can see ${plural(n, 'tiny egg')} fanned under her tail!`
            : `${f.name} is carrying eggs. ${spName(sp)[0].toUpperCase()}${spName(sp).slice(1)} larvae need special ${sp.environment === 'marine' ? 'marine' : 'brackish'} rearing, so they won’t survive here.`,
          tankId: tank.id,
          creatureId: f.id,
          toast: seen < 2,
        });
      }
    },

    check(cc) {
      const { tank, sp } = cc;
      if (!viable) {
        const r = `${sp.commonName} larvae need specialised ${sp.environment === 'marine' ? 'marine' : 'brackish'} larval rearing that isn’t available yet.`;
        cc.reasons.push(r);
        cc.startBlockers.push(r);
        cc.steps.push('Females may still carry eggs — enjoy the sight, but the larvae can’t be raised in this shop yet.');
        return;
      }
      if (!tank) return;
      const issue = spawningWaterIssue(tank, sp);
      if (issue) {
        cc.reasons.push(issue);
        cc.steps.push('Keep ammonia and nitrite at zero with small, regular water changes.');
      }
      if ((tank.water.bioMaturity ?? 0) < 0.45) {
        cc.reasons.push('The tank is too new — shrimp breed in mature tanks rich in biofilm.');
        cc.steps.push('Give the tank time to mature (or add moss and leaf litter for biofilm).');
      }
      const t = tank.water.tempC;
      if (t < sp.tempC.idealMin - 1 || t > sp.tempC.idealMax + 1) {
        cc.reasons.push(`Shrimp breed best at ${sp.tempC.idealMin}–${sp.tempC.idealMax} °C.`);
        cc.steps.push(`Adjust the heater to about ${Math.round((sp.tempC.idealMin + sp.tempC.idealMax) / 2)} °C.`);
      }
    },

    force(state, male, female, tank, hour) {
      if (tank.water.bioMaturity < 0.45) tank.water.bioMaturity = 0.6;
      setStage(female, 'idle', hour);
      female.repro.partnerId = male.id;
      return `${female.name} is ready to become berried.`;
    },

    status(state, c, sp, hour) {
      if (c.repro.stage !== 'berried') return null;
      const cl = c.repro.clutchId ? state.clutches[c.repro.clutchId] : undefined;
      const due = (c.repro.carryingUntilHour ?? hour) - hour;
      return { label: cl ? `Berried — ${plural(cl.count, 'egg')}` : 'Berried', detail: `Hatching in ${approxDuration(due)}`, progress: c.repro.progress };
    },
  };
}

export const shrimpBerriedModule = makeShrimp(
  'shrimp_berried',
  {
    phases: [{ stage: 'fry', frac: 1, foods: ['biofilm', 'algae_wafer', 'flake', 'infusoria', 'vegetable', 'baby_brine'], natural: ['biofilm', 'algae'], visual: 'fry_cloud', label: 'shrimplets' }],
    eggTags: ['eggs'],
    youngTags: ['shrimp_fry'],
    parentsEatEggs: false,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: false,
    hatchAtNight: false,
    larvaeViable: true,
    starveSeverity: 0.6,
    coverShelter: 0.7,
    yolkFrac: 0.05,
  },
  true,
);

export const shrimpLarvalMarineModule = makeShrimp(
  'shrimp_larval_marine',
  {
    phases: [{ stage: 'larvae', frac: 1, foods: ['infusoria'], natural: [], visual: 'fry_cloud', label: 'larvae' }],
    eggTags: ['eggs'],
    youngTags: ['shrimp_fry'],
    parentsEatEggs: false,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: true,
    hatchAtNight: true,
    larvaeViable: false,
    nonViableText:
      'The shrimp eggs hatched overnight into drifting larvae. They need weeks of specialised brackish or marine larval rearing — something this shop can’t offer yet — so they were lost to the current.',
    starveSeverity: 1,
    coverShelter: 0,
    yolkFrac: 0,
  },
  false,
);
