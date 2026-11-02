/**
 * chunk 19 (ADR-0055 decision 2, QOL-002) — the small link under a problem on the tank card or in the alerts drawer:
 * its words say the fix ("Water change", "Repair", "Buy food") and it goes there (src/ui/common/fixLinks.ts).
 * OWNER: lane "ui-shell".
 */
import { ArrowRight } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { goFix, type FixLink } from '../common/fixLinks';

export function FixButton({ link, testId, onGo }: { link: FixLink | null | undefined; testId?: string; /** after going (e.g. close the drawer) */ onGo?: () => void }) {
  if (!link) return null;
  return (
    <button
      type="button"
      className="ag-fixlink"
      data-testid={testId}
      data-fix-to={link.to.kind === 'card' ? `card:${link.to.tab}:${link.to.fix}` : link.to.kind === 'panel' ? `panel:${link.to.panel}:${link.to.target ?? ''}` : link.to.kind}
      onClick={(e) => {
        e.stopPropagation();
        sfx('click');
        goFix(link.to);
        onGo?.();
      }}
    >
      {link.label} <ArrowRight size={12} aria-hidden />
    </button>
  );
}
