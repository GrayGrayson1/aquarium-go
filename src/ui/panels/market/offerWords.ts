/**
 * Audit 2026-11-17 (D21) — a species as the subject of a sentence about all of them: "Royal grammas need…", not the
 * singular title-case name before a plural verb ("Royal Gramma need…"). OWNER: lane "ui-panels".
 */
import type { SpeciesDefinition } from '@/types';
import { pluralName } from '@/sim/economy/util';

export function capitalPlural(sp: Pick<SpeciesDefinition, 'commonName'>): string {
  const p = pluralName(sp.commonName);
  return p.charAt(0).toUpperCase() + p.slice(1);
}
