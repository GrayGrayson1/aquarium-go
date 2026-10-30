/**
 * ray_viviparous — the motoro stingray. Chunk 17 (ADR-0053; the koi-ray-brackish research, "Motoro stingray").
 * OWNER: lane "breeding".
 *
 * Female: idle ─(a mature, healthy male in the tank, readiness ≥ 50)─▶ pregnant (incubationHours, ± 10 %)
 *         ─▶ gives birth to 1–8 pups, each a small, independent copy of its parents (minted straight away as
 *         juveniles: no fry stage) ─▶ resting (cooldownDays; three times as long after every third litter, as keepers
 *         rest a female after two or three) ─▶ pregnant again…
 * No stored sperm (unlike the guppy livebearer): a female without a male stays idle. The male bites the edge of her
 * disc while courting: the game says so, and it costs her nothing. Draws on the step's `ctx.rng` only in a tank with
 * a ready female ray and a male.
 */
import type { BreedingModule, StepEnv } from '../types';
import { createClutch, mintJuveniles } from '../clutch';
import { bumpCounter } from '@/sim/facility';
import { addHistory, approxDuration, isMature, plural, rollClutchSize, roleOf, say, setStage, spPlural, startResting, tickTimers, toastWorthy, breedNotice } from '../common';

const PREGNANT_READY = 50;
/** Every this many litters she rests three times as long. */
const LITTERS_BEFORE_LONG_REST = 3;
const BIRTH = 'Gave birth to';

const littersOf = (c: { history?: { kind: string; text: string }[] }) => (c.history ?? []).filter((e) => e.kind === 'bred' && e.text.startsWith(BIRTH)).length;

export const rayViviparousModule: BreedingModule = {
  id: 'ray_viviparous',
  breedable: true,
  plan: {
    phases: [],
    eggTags: [],
    youngTags: ['fry'],
    parentsEatEggs: false,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: false,
    hatchAtNight: false,
    larvaeViable: true,
    starveSeverity: 0.6,
    coverShelter: 0,
    yolkFrac: 1,
  },

  step(env: StepEnv) {
    const { state, tank, species: sp, members, hour, ctx } = env;
    const b = sp.breeding;
    const adults = members.filter((c) => isMature(c, sp, hour));
    for (const c of adults) tickTimers(c, hour);
    const male = adults.find((c) => roleOf(c, sp) === 'male' && c.stats.health >= 40);

    for (const f of adults) {
      if (roleOf(f, sp) !== 'female') continue;
      const r = f.repro;
      if (r.stage === 'gravid') {
        if (r.carryingUntilHour === undefined || hour < r.carryingUntilHour) continue;
        const father = r.partnerId ? state.creatures[r.partnerId] : undefined;
        const n = rollClutchSize(ctx.rng, sp, f);
        const cl = createClutch(state, { sp, tank, mother: f, father: father ?? null, hour, stage: 'fry', count: n, visual: 'fry_cloud', nextStageHour: hour, notes: 'Newborn pups.' });
        addHistory(f, 'bred', `${BIRTH} ${plural(n, 'pup')}.`, hour);
        const long = littersOf(f) % LITTERS_BEFORE_LONG_REST === 0;
        startResting(f, hour, b.cooldownDays * 24 * (long ? 3 : 1));
        bumpCounter(state, `births_${sp.id}`);
        const loud = toastWorthy(state, sp, 'birth');
        say(state, ctx, {
          kind: 'breeding',
          text: `${f.name} gave birth to ${plural(n, 'pup')}, each a tiny copy of its parents and on its own from the start.${long ? ` After ${LITTERS_BEFORE_LONG_REST} litters she needs a long rest.` : ''}`,
          tankId: tank.id,
          creatureId: f.id,
          toast: loud,
          ...(loud ? { notice: breedNotice('birth', f.name, n, tank) } : {}),
        });
        mintJuveniles(state, cl, tank, sp, hour, ctx);
        continue;
      }
      if (r.stage !== 'idle' && r.stage !== 'conditioning') continue;
      if (!male) continue;
      if (f.stats.breedingReadiness < PREGNANT_READY) {
        if (r.stage === 'idle') setStage(f, 'conditioning', hour);
        continue;
      }
      r.partnerId = male.id;
      setStage(f, 'gravid', hour);
      r.carryingUntilHour = hour + b.incubationHours * ctx.rng.range(0.9, 1.1);
      if (toastWorthy(state, sp, 'mated')) {
        say(state, ctx, { kind: 'breeding', text: `${male.name} bit the edge of ${f.name}’s disc as they mated: that is how rays court, and the marks heal. She is pregnant.`, tankId: tank.id, creatureId: f.id });
      }
    }
  },

  check(cc) {
    const { state, tank, sp, hour } = cc;
    if (!tank) return;
    const inTank = Object.values(state.creatures).filter((c) => c.tankId === tank.id && c.speciesId === sp.id && c.status === 'alive' && isMature(c, sp, hour));
    const males = inTank.filter((c) => roleOf(c, sp) === 'male');
    if (males.length > 1) cc.steps.push(`Two male ${spPlural(sp)} fight: keep one male with one or more females.`);
    if (cc.male.sizeCm > cc.female.sizeCm) cc.steps.push(`${cc.female.name} should be the bigger of the two: the male bites her disc while courting.`);
  },

  force(state, male, female, tank, hour) {
    female.repro.partnerId = male.id;
    setStage(female, 'gravid', hour);
    female.repro.carryingUntilHour = hour + 1;
    return `${female.name} is pregnant and about to give birth.`;
  },

  status(state, c, sp, hour) {
    const r = c.repro;
    if (r.stage !== 'gravid') return null;
    const due = (r.carryingUntilHour ?? hour) - hour;
    return { label: due > 0 ? `Pregnant: pups due in ${approxDuration(due)}` : 'Pregnant: pups due any moment', progress: r.progress };
  },
};
