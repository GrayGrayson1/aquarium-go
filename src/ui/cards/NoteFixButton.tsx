/**
 * Audit 2026-11-17 (D16) — a Condition note's link on the creature card (see ./noteFixes). OWNER: lane "ui-shell".
 */
import type { Creature } from '@/types';
import { useShopSearch } from '../panels/market/shopFilters';
import { FixButton } from './FixButton';
import { fixForCreatureNote } from './noteFixes';

export function NoteFixButton({ c, note }: { c: Creature; note: string }) {
  if (c.status !== 'alive' && c.status !== 'listed') return null;
  const f = fixForCreatureNote(c, note);
  if (!f) return null;
  return <FixButton link={f.link} testId="creature-note-fix" onGo={f.search ? () => useShopSearch.setState({ q: f.search! }) : undefined} />;
}
