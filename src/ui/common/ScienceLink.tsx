/**
 * Audit 2026-11-17 (J5): "What’s this?" beside a word the Encyclopedia's Aquarium science explains (ammonia, the
 * Biological filter, salinity, compatibility, genes). It opens that article (`#/encyclopedia/science/<id>`).
 */
import type { ReactNode } from 'react';
import { sfx } from '@/audio/sfx';
import { go } from '../nav/router';

export function ScienceLink({ article, label, children = 'What’s this?' }: { article: string; /** For screen readers: what the article explains. */ label: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      className="ag-linkbtn ag-sciencelink"
      aria-label={label}
      title={label}
      data-testid={`science-link-${article}`}
      onClick={(e) => {
        e.stopPropagation();
        sfx('open');
        go({ kind: 'panel', panel: 'encyclopedia', tab: 'science', target: `science:${article}` });
      }}
    >
      {children}
    </button>
  );
}
