/**
 * Offer detail › Temperament (0.5 spec §9.2): two inherited tendencies as meters, with numbers once the Genetics Lab
 * reveals genes; a group gets one line instead. OWNER: lane "ui-panels".
 */
import { Smile } from 'lucide-react';
import type { Creature, SpeciesDefinition } from '@/types';
import { temperamentWord, curiosityWord } from '@/sim/life';
import { SectionHead } from '../common/parts';

export function OfferTemperament({ sp, lead, groupSize, labOwned }: { sp: SpeciesDefinition; lead: Creature; groupSize: number; labOwned: boolean }) {
  const p = lead.genome.potentials;
  return (
    <section data-testid="offer-temperament">
      <SectionHead title="Temperament" icon={<Smile size={14} />} />
      {groupSize > 1 ? (
        <p className="ag-temper__group">A group of {groupSize}: each {sp.commonName.toLowerCase()} has its own temperament. They inherit it from their parents.</p>
      ) : (
        <div className="ag-temper">
          <TemperMeter label="Temperament" lo="Shy" hi="Bold" value={p.temperament} word={temperamentWord(p.temperament)} exact={labOwned} />
          <TemperMeter label="Curiosity" lo="Reserved" hi="Curious" value={p.curiosity} word={curiosityWord(p.curiosity)} exact={labOwned} />
          <p className="ag-temper__foot">Inherited: young land near their parents’ average. Personality quirks are each animal’s own.</p>
        </div>
      )}
    </section>
  );
}

function TemperMeter({ label, lo, hi, value, word, exact }: { label: string; lo: string; hi: string; value: number; word: string; exact: boolean }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));
  return (
    <div className="ag-temper__row">
      <span className="ag-temper__label">{label}</span>
      <span className="ag-temper__meter">
        <span className="ag-temper__track" role="img" aria-label={`${label}: ${exact ? `${word} · ${Math.round(v)}` : word}`}>
          <span className="ag-temper__thumb" style={{ left: `${v}%` }} />
        </span>
        <span className="ag-temper__ends" aria-hidden>
          <span>{lo}</span>
          <span>{hi}</span>
        </span>
      </span>
      <span className="ag-temper__word">{exact ? `${word} · ${Math.round(v)}` : word}</span>
    </div>
  );
}
