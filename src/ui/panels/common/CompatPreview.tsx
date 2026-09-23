/**
 * Compatibility preview: verdict + reasons (+ mitigations) — "compatibility is explained, never hidden".
 * Used before every purchase / move. Renders ui-shell's CompatView (src/ui/common/CompatView.tsx) so compatibility
 * reads the same everywhere, plus a hard environment-gate block. OWNER: lane "ui-panels".
 */
import { useState } from 'react';
import clsx from 'clsx';
import { CircleCheck, Info, TriangleAlert, OctagonAlert, Ban, ChevronDown, Lightbulb } from 'lucide-react';
import type { CompatReason, CompatReport, CompatVerdict } from '@/types';
import { StatusBadge } from '@/ui/kit';
import { VERDICT_LABEL, verdictStatus, pct } from './format';
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

function LocalVerdictBadge({ verdict, testId }: { verdict: CompatVerdict; testId?: string }) {
  return (
    <span data-testid={testId} data-verdict={verdict} className="pn-verdict">
      <StatusBadge status={verdictStatus(verdict)} label={VERDICT_LABEL[verdict]} />
    </span>
  );
}

export function ReasonRow({ r }: { r: CompatReason }) {
  const Icon = SEV_ICON[r.severity] ?? Info;
  return (
    <li className={clsx('pn-reason', `pn-reason--${r.severity}`)} data-testid="compat-reason">
      <span className="pn-reason__icon" aria-hidden>
        <Icon size={15} />
      </span>
      <div className="pn-reason__body">
        <div className="pn-reason__text">
          <span className="pn-sr">{SEV_WORD[r.severity]}: </span>
          {r.text}
          {typeof r.probability === 'number' && r.probability > 0 && <span className="pn-reason__prob"> · ~{pct(Math.min(1, r.probability))} chance per week</span>}
        </div>
        {r.mitigation && (
          <div className="pn-reason__mit">
            <Lightbulb size={12} aria-hidden /> {r.mitigation}
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
}

export function CompatPreview({ report, gate, title = 'Compatibility', compact, limit = 5, focusSpeciesId }: CompatPreviewProps) {
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
      <CompatView report={report} title={<span className="pn-compat__title">{title}</span>} compact={compact} limit={limit} focusSpeciesId={focusSpeciesId} />
    </div>
  );
}

/** Legacy local renderer (kept for reference/testing when the shell view is unavailable). */
export function CompatPreviewLocal({ report, title = 'Compatibility', compact, limit = 5 }: CompatPreviewProps) {
  const [all, setAll] = useState(false);
  if (!report) return null;
  const reasons = [...report.reasons].sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
  const shown = all ? reasons : reasons.slice(0, limit);
  const status = verdictStatus(report.verdict);
  return (
    <div className={clsx('pn-compat', `pn-compat--${status}`, compact && 'pn-compat--compact')}>
      <div className="pn-compat__head">
        <span className="pn-compat__title">{title}</span>
        <LocalVerdictBadge verdict={report.verdict} testId="compat-verdict" />
      </div>
      {reasons.length === 0 ? (
        <p className="pn-compat__none">
          <CircleCheck size={14} aria-hidden /> No concerns found for this combination.
        </p>
      ) : (
        <ul className="pn-reasons">
          {shown.map((r, i) => (
            <ReasonRow key={i} r={r} />
          ))}
        </ul>
      )}
      {reasons.length > limit && (
        <button type="button" className="pn-link" onClick={() => setAll(!all)} aria-expanded={all}>
          <ChevronDown size={14} style={{ transform: all ? 'rotate(180deg)' : undefined }} aria-hidden /> {all ? 'Show fewer' : `Show all ${reasons.length} reasons`}
        </button>
      )}
    </div>
  );
}

function sevRank(s: CompatReason['severity']): number {
  return s === 'critical' ? 4 : s === 'warning' ? 3 : s === 'caution' ? 2 : s === 'info' ? 1 : 0;
}
