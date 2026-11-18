/**
 * Systems with no in-game breeding loop: fragmentation (corals — propagated by fragging, handled by aquascape/coral
 * growth) and not_in_game (documented species that are not bred in captivity here). OWNER: lane "breeding".
 */
import type { BreedingModule, RearingPlan } from '../types';

const NONE: RearingPlan = {
  phases: [],
  eggTags: [],
  youngTags: [],
  parentsEatEggs: false,
  guardEggs: false,
  guardianEatsFry: false,
  planktonic: false,
  hatchAtNight: false,
  larvaeViable: false,
  starveSeverity: 1,
  coverShelter: 0,
  yolkFrac: 0,
};

export const fragmentationModule: BreedingModule = {
  id: 'fragmentation',
  breedable: false,
  plan: NONE,
  explain: (sp) => `${sp.commonName} is propagated by fragging — cutting a healthy piece and letting it grow on a new plug — rather than by pairing.`,
  step: () => {},
  check: (cc) => {
    cc.reasons.push(`${cc.sp.commonName} isn’t bred in pairs — corals are propagated by fragging.`);
  },
  force: () => 'Corals are propagated by fragging, not pairing.',
};

export const notInGameModule: BreedingModule = {
  id: 'not_in_game',
  breedable: false,
  plan: NONE,
  explain: (sp) => {
    const note = sp.breeding.notes?.trim();
    return note ? note : `${sp.commonName} is rarely or never bred in home aquariums, so it can’t be bred in Aquarium Go.`;
  },
  step: () => {},
  check: (cc) => {
    const note = cc.sp.breeding.notes?.trim();
    cc.reasons.push(note ? `${cc.sp.commonName} can’t be bred in Aquarium Go: ${note}` : `${cc.sp.commonName} is rarely bred in captivity and can’t be bred in Aquarium Go.`);
  },
  force: () => 'This species can’t be bred in Aquarium Go.',
};
