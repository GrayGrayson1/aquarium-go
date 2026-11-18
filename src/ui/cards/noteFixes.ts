/**
 * Audit 2026-11-17 (D16) — the creature card's Condition notes link to where each problem is fixed, as the tank card's
 * rows do (./FixButton, ../common/fixLinks). Pure (node-safe). OWNER: lane "ui-shell".
 */
import type { Creature } from '@/types';
import { findSpecies } from '@/data/species';
import type { FixLink } from '../common/fixLinks';

export interface NoteFix {
  link: FixLink;
  /** For the shop: what to search for on arrival (the species' name). */
  search?: string;
}

export function fixForCreatureNote(c: Pick<Creature, 'tankId' | 'speciesId'>, note: string): NoteFix | null {
  const tankId = c.tankId;
  if (!tankId) return null;
  if (note.startsWith('Habitat:')) {
    // review of D16: each habitat note goes to what fixes it (welfare.ts habitatFit's notes)
    if (/ substrate is unsuitable/.test(note)) return { link: { label: 'Change substrate', to: { kind: 'panel', panel: 'build', target: 'tab:substrate' } } };
    if (/the light is (brighter|dimmer) than it likes/.test(note)) return { link: { label: 'Lighting', to: { kind: 'card', tankId, tab: 'gear', fix: 'lighting' } } };
    if (/sharp decor/.test(note)) return { link: { label: 'See decor', to: { kind: 'panel', panel: 'build', target: `decor:${tankId}` } } };
    return { link: { label: 'Add decor', to: { kind: 'panel', panel: 'build', target: `decor:${tankId}` } } };
  }
  if (/^Stressed — mainly lonely/.test(note)) {
    const sp = findSpecies(c.speciesId);
    return { link: { label: 'Find more in the shop', to: { kind: 'panel', panel: 'market', target: 'tab:shop' } }, ...(sp ? { search: sp.commonName } : {}) };
  }
  if (note.startsWith('Healing from injuries')) return { link: { label: 'See compatibility', to: { kind: 'card', tankId, tab: 'life', fix: 'compat' } } };
  // hunger has the Feed row right above the notes; an illness's cure is in its own callout
  if (/^(Starving|Very hungry|Getting peckish|Ill with)/.test(note)) return null;
  if (/\bwater\b/i.test(note)) return { link: { label: 'Water care', to: { kind: 'card', tankId, tab: 'water', fix: 'care' } } };
  return null;
}
