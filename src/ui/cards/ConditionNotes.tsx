/**
 * Audit 2026-11-17 (D8, D16) — the creature card's Condition notes: the sim writes them with °C, shown here in the
 * player's unit, each with its fix link. OWNER: lane "ui-shell".
 */
import type { Creature } from '@/types';
import { convertTempText } from '../common/format';
import { NoteFixButton } from './NoteFixButton';

export function ConditionNotes({ c, notes, unit }: { c: Creature; notes: readonly string[]; unit: 'C' | 'F' }) {
  if (notes.length === 0) return null;
  return (
    <ul className="ag-wellbeing__notes">
      {notes.slice(0, 3).map((n, i) => (
        <li key={i}>
          {convertTempText(n, unit)} <NoteFixButton c={c} note={n} />
        </li>
      ))}
    </ul>
  );
}
