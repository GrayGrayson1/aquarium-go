/**
 * Offer detail › Genes (0.5 spec §7.4.1): one row per locus with its expressed trait, rule summary and copies chip, and
 * the footer (locked, Genetics Lab advice, or nothing hidden). The logic lives in ./offerGenetics. OWNER: lane "ui-panels".
 */
import { useMemo } from 'react';
import clsx from 'clsx';
import { Dna, Lock, Sparkles } from 'lucide-react';
import type { Creature, SpeciesDefinition } from '@/types';
import { SectionHead } from '../common/parts';
import { geneRows, genesFooter, type GeneRow } from './offerGenetics';

/** At most this many of the player's animals are tried for the lab advice's pairing forecast (each forecast enumerates
 *  up to 576 young genotypes for a betta). */
const MAX_PARTNERS = 6;

export function OfferGenes({ sp, creature, labOwned, partners }: { sp: SpeciesDefinition; creature: Creature; labOwned: boolean; partners: readonly Creature[] }) {
  // the panel re-renders on every game publish: compute only when the animal, the lab or the candidate partners change
  const partnerKey = partners.slice(0, MAX_PARTNERS).map((p) => p.id).join(',');
  const { rows, footer } = useMemo(() => {
    const rows = geneRows(sp, creature.genome, labOwned);
    return { rows, footer: genesFooter(sp, creature, rows, labOwned, partners.slice(0, MAX_PARTNERS)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, creature.id, labOwned, partnerKey]);
  if (!sp.genetics.loci.length) return null;
  return (
    <section data-testid="offer-genes">
      <SectionHead title="Genes" icon={<Dna size={14} />} />
      <ul className="ag-genes" role="list">
        {rows.map((r) => (
          <li key={r.locusId} className="ag-gene" data-testid={`offer-gene-${r.locusId}`}>
            <span className="ag-gene__locus">
              {r.label}
              {r.isNew && <span className="ag-gene__new">NEW</span>}
            </span>
            <span className="ag-gene__trait">
              <b>{r.trait}</b>
              <span className="ag-gene__rule">{r.summary}</span>
            </span>
            <CopiesChip c={r.copies} />
          </li>
        ))}
      </ul>
      <p className={clsx('ag-genes__foot', `is-${footer.kind}`)}>
        {footer.kind === 'locked' ? <Lock size={12} aria-hidden /> : <Dna size={12} aria-hidden />} {footer.text}
      </p>
    </section>
  );
}

function CopiesChip({ c }: { c: GeneRow['copies'] }) {
  return (
    <span className={clsx('ag-copies', `ag-copies--${c.kind}`, c.rare && 'is-rare')} title={c.title}>
      {c.kind === 'hidden' && <Lock size={10} aria-hidden />}
      {c.rare && <Sparkles size={10} aria-hidden />}
      {c.text}
    </span>
  );
}
