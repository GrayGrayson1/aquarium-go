/**
 * Synthetic legacy "v0" save used to prove the migration path (tests + `?fixture=core_legacy_v0`). OWNER: lane "core".
 *
 * It is built by taking a real, seeded new game and rewriting it into the prototype shape described in
 * ./migrations.ts (money at top level, tanks as an array, no schemaVersion / simDebtHours / isShowcase /
 * discoveredMorphs ...). Using a real game keeps every species / tier id valid as the content grows.
 */
import { newGame } from '@/sim/newGame';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export function makeLegacyV0Save(seed = 20240601): Json {
  const g = newGame({ starterId: 'betta', starterName: 'Legacy', seed, shopName: 'Old Reef Shop' });
  const s: Json = JSON.parse(JSON.stringify(g));
  delete s.schemaVersion;
  delete s.isShowcase;
  s.money = s.finance.money;
  delete s.finance;
  s.tanks = s.tankOrder.map((id: string) => {
    const t = s.tanks[id];
    delete t.simDebtHours;
    delete t.tapPressure;
    delete t.signage;
    if (t.water) {
      delete t.water.foodByTag;
      delete t.water.level;
    }
    return t;
  });
  delete s.tankOrder;
  for (const c of Object.values(s.creatures) as Json[]) {
    delete c.visitorWows;
    delete c.history;
    if (c.repro) delete c.repro.totalOffspringRaised;
  }
  delete s.progress.discoveredMorphs;
  delete s.progress.counters;
  delete s.market.history;
  s.lastTickRealMs = s.lastSavedRealMs = s.createdRealMs = Date.UTC(2024, 5, 1);
  return s;
}
