/**
 * Facility, visitors, exhibit scoring, reputation, unlocks, research, quests & tutorial chains.
 * OWNER: lane "facility". Barrel — implementation lives in the sibling modules:
 *   layout.ts       footprints, placement validation, nav grid, reachability, A* (shared with 3D visitors)
 *   exhibit.ts      exhibit scoring (welfare-gated, diminishing returns on size)
 *   visitors.ts     arrivals, visits, satisfaction, revenue, reactions, friend visits
 *   progression.ts  reputation, mastery, unlocks, research, tutorial, quests, achievements, UI helpers
 *   actions.ts      upgrades, opening, admission, tank placement, signage, fixtures
 */
import type { GameState, ExhibitReport } from '@/types';
import { exhibitReport } from './exhibit';

export { initialFacility, upgradeFacility, setOpenToPublic, setAdmission, setOpenHours, placeTank, findFreeSpot, toggleSignage, validatePlacement, validateFixture, addFixture, removeFixture, facilityUpgradeInfo, SIGN_COST } from './actions';
export type { FacilityUpgradeInfo } from './actions';
export {
  initProgress,
  settleStartingProgress,
  stepProgression,
  isUnlocked,
  unlock,
  unlockLabel,
  bumpCounter,
  scapeEditsKey,
  addMastery,
  addReputation,
  masteryLevel,
  counterValue,
  evalCond,
  condLabel,
  grantReward,
  startResearch,
  cancelResearch,
  claimQuest,
  tutorialAdvance,
  tutorialWants,
  tutorialSkip,
  tutorialStepId,
  currentTutorialStep,
  activeQuests,
  unlockProgress,
  researchList,
} from './progression';
export type { TutorialStepView, QuestView, UnlockProgressView, ResearchView, CondStatus } from './progression';
export { stepVisitors, visitorSummary, fairAdmission, isOpenAt, ARCHETYPES, archetypeLabel, WEEKDAYS, weekdayOf } from './visitors';
export type { VisitorSummary, VisitorArchetype, ArchetypeDef } from './visitors';
export { exhibitInfo, sizeFactor, EXHIBIT_WEIGHTS } from './exhibit';
export type { ExhibitInfo, ExhibitFactorKey } from './exhibit';
export { stateReachability, computeReachability, buildNavGrid, findPath, tankFootprint, tankFrontZone, viewingPoint, placedTanks, layoutSignature, isWalkable, lineOfSight } from './layout';
export type { NavGrid, Placement, PlacementCheck, Reachability, OBB, PlacedTank } from './layout';
export { reactionLineCount } from './reactions';

export function exhibitScore(state: GameState, tankId: string): ExhibitReport {
  return exhibitReport(state, tankId);
}
