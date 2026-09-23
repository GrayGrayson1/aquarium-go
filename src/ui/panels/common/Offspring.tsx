/**
 * Expected offspring morphs for a pair (lifecycle lane's exact genetics). OWNER: lane "ui-panels".
 */
import { Dna } from 'lucide-react';
import type { Creature } from '@/types';
import { predictOffspringMorphs, morphDisplayName } from '@/sim/life';
import { findSpecies } from '@/data/species';
import { safe } from './hooks';

export function OffspringOdds({ a, b, max = 4 }: { a: Creature; b: Creature; max?: number }) {
  const sp = findSpecies(a.speciesId);
  if (!sp || a.speciesId !== b.speciesId) return null;
  const mom = a.sex === 'female' ? a : b.sex === 'female' ? b : a;
  const dad = mom === a ? b : a;
  const odds = safe(() => predictOffspringMorphs(sp, mom.genome, dad.genome), [] as { morphName: string; chance: number }[]);
  if (!odds.length) return null;
  const top = [...odds].sort((x, y) => y.chance - x.chance).slice(0, max);
  return (
    <div className="pn-odds">
      <div className="pn-odds__head">
        <Dna size={13} aria-hidden /> Expected young
      </div>
      <div className="pn-odds__bar" role="img" aria-label={top.map((o) => `${Math.round(o.chance * 100)}% ${o.morphName}`).join(', ')}>
        {top.map((o, i) => (
          <span key={o.morphName} className={`pn-odds__seg pn-odds__seg--${i}`} style={{ flexGrow: Math.max(0.02, o.chance) }} />
        ))}
      </div>
      <ul className="pn-odds__list">
        {top.map((o, i) => (
          <li key={o.morphName}>
            <i className={`pn-odds__key pn-odds__seg--${i}`} aria-hidden />
            <b className="pn-num-t">{Math.round(o.chance * 100)}%</b> {safe(() => morphDisplayName(sp, o.morphName), o.morphName)}
          </li>
        ))}
      </ul>
    </div>
  );
}
