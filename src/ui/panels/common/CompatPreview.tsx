/**
 * Compatibility preview: verdict + reasons (+ mitigations) — "compatibility is explained, never hidden".
 * Used before every purchase / move. Renders ui-shell's CompatView (src/ui/common/CompatView.tsx) so compatibility
 * reads the same everywhere, plus a hard environment-gate block. OWNER: lane "ui-panels".
 */
import clsx from 'clsx';
import { CircleCheck, Info, TriangleAlert, OctagonAlert, Ban, Lightbulb } from 'lucide-react';
import type { CompatReason, CompatReport, CompatVerdict } from '@/types';
import { StatusBadge } from '@/ui/kit';
import { pct } from './format';
import { useTempText } from './hooks';
import { CompatView, VerdictBadge as ShellVerdictBadge } from '@/ui/common/CompatView';

const SEV_ICON = {
  positive: CircleCheck,
  info: Info,
  caution: TriangleAlert,
  warning: TriangleAlert,
  critical: OctagonAlert,
} as const;

const SEV_WORD: Record<CompatReason['severity'], string> = {
  positive: 'Good',
  info: 'Note',
  caution: 'Caution',
  warning: 'Warning',
  critical: 'Critical',
};

/** Verdict pill for lists/cards (no test id — the preview's own badge carries `compat-verdict`). */
export function VerdictBadge({ verdict, size = 'sm' }: { verdict: CompatVerdict; size?: 'sm' | 'md' | 'lg' }) {
  return <ShellVerdictBadge verdict={verdict} size={size} testId={null} />;
}

export function ReasonRow({ r }: { r: CompatReason }) {
  const Icon = SEV_ICON[r.severity] ?? Info;
  const { t } = useTempText();
  return (
    <li className={clsx('pn-reason', `pn-reason--${r.severity}`)} data-testid="compat-reason">
      <span className="pn-reason__icon" aria-hidden>
        <Icon size={15} />
      </span>
      <div className="pn-reason__body">
        <div className="pn-reason__text">
          <span className="pn-sr">{SEV_WORD[r.severity]}: </span>
          {t(r.text)}
          {typeof r.probability === 'number' && r.probability > 0 && <span className="pn-reason__prob"> · ~{pct(Math.min(1, r.probability))} chance per week</span>}
        </div>
        {r.mitigation && (
          <div className="pn-reason__mit">
            <Lightbulb size={12} aria-hidden /> {t(r.mitigation)}
          </div>
        )}
      </div>
    </li>
  );
}

export interface CompatPreviewProps {
  report: CompatReport | null;
  /** Hard environment gate (freshwater animal into a marine tank, etc.). */
  gate?: { ok: boolean; reason?: string };
  title?: string;
  compact?: boolean;
  /** Max reasons before "show all". */
  limit?: number;
  /** lane:qa-play — species being added: its reasons first, pre-existing issues labelled (see CompatView). */
  focusSpeciesId?: string;
  /** lane:ui-panels (ADR-0020) — verdict wording (the shop's offer detail passes the long labels). */
  labels?: Record<CompatVerdict, string>;
}

export function CompatPreview({ report, gate, title = 'Compatibility', compact, limit = 5, focusSpeciesId, labels }: CompatPreviewProps) {
  if (gate && !gate.ok) {
    return (
      <div className="pn-compat pn-compat--blocked" role="alert">
        <div className="pn-compat__head">
          <span className="pn-compat__title">{title}</span>
          <span data-testid="compat-verdict" data-verdict="incompatible">
            <StatusBadge status="danger" label="Wrong water" />
          </span>
        </div>
        <ul className="pn-reasons">
          <li className="pn-reason pn-reason--critical" data-testid="compat-reason">
            <span className="pn-reason__icon" aria-hidden>
              <Ban size={15} />
            </span>
            <div className="pn-reason__body">
              <div className="pn-reason__text">{gate.reason ?? 'This animal cannot live in this tank’s water.'}</div>
              <div className="pn-reason__mit">
                <Lightbulb size={12} aria-hidden /> Choose a tank with the right water, or set up a new one in Build.
              </div>
            </div>
          </li>
        </ul>
      </div>
    );
  }
  if (!report) return null;
  return (
    <div className="pn-compatwrap">
      <CompatView report={report} title={<span className="pn-compat__title">{title}</span>} compact={compact} limit={limit} focusSpeciesId={focusSpeciesId} labels={labels} />
    </div>
  );
}
