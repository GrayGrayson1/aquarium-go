/**
 * Small building blocks shared by the management panels (on top of the ui-shell kit). OWNER: lane "ui-panels".
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
import { Button, revealInStrip } from '@/ui/kit';
import { sfx } from '@/audio/sfx';
import type { ChipTone } from './format';

export function Chip({ tone = 'neutral', icon, children, title, className, onClick, pressed, testId }: { tone?: ChipTone; icon?: ReactNode; children?: ReactNode; title?: string; className?: string; onClick?: () => void; pressed?: boolean; testId?: string }) {
  const cls = clsx('pn-chip', tone !== 'neutral' && `pn-chip--${tone}`, onClick && 'pn-chip--btn', pressed && 'is-on', className);
  if (onClick)
    return (
      <button type="button" className={cls} title={title} aria-pressed={pressed} data-testid={testId} onClick={() => { sfx('click'); onClick(); }}>
        {icon}
        {children}
      </button>
    );
  return (
    <span className={cls} title={title} data-testid={testId}>
      {icon}
      {children}
    </span>
  );
}

/**
 * Segmented radio group — keyboard accessible (arrow keys), ≥40px touch targets. `tabs`: a panel's section strip,
 * announced as tabs (role=tablist/tab, aria-selected; lane:ui-shell ACC-001), with the active one scrolled into view.
 */
export function Seg<T extends string>({ value, onChange, items, label, size = 'md', className, testIdPrefix, tabs }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; disabled?: boolean; title?: string }[]; label: string; size?: 'sm' | 'md'; className?: string; testIdPrefix?: string; tabs?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tabs) return;
    const strip = ref.current;
    revealInStrip(strip, [...(strip?.querySelectorAll<HTMLElement>('[data-seg]') ?? [])].find((e) => e.dataset.seg === value));
  }, [tabs, value]);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.id === value);
    const next = enabled[(idx + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    if (next) {
      sfx('click');
      onChange(next.id);
      const el = (e.currentTarget.querySelector(`[data-seg="${next.id}"]`) as HTMLButtonElement | null);
      el?.focus();
    }
  };
  return (
    <div ref={ref} role={tabs ? 'tablist' : 'radiogroup'} aria-label={label} className={clsx('pn-seg', size === 'sm' && 'pn-seg--sm', className)} onKeyDown={onKey}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role={tabs ? 'tab' : 'radio'}
          aria-checked={tabs ? undefined : it.id === value}
          aria-selected={tabs ? it.id === value : undefined}
          tabIndex={it.id === value ? 0 : -1}
          disabled={it.disabled}
          title={it.title}
          data-seg={it.id}
          data-testid={testIdPrefix ? `${testIdPrefix}${it.id}` : undefined}
          className="pn-seg__opt"
          onClick={() => {
            if (it.id !== value) sfx('click');
            onChange(it.id);
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string; className?: string }) {
  return (
    <label className={clsx('pn-select', className)}>
      <span className="pn-sr">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Interactive or static card. Interactive cards are buttons for keyboard users. */
export function Card({ children, className, onClick, selected, testId, label, tone }: { children: ReactNode; className?: string; onClick?: () => void; selected?: boolean; testId?: string; label?: string; tone?: 'gold' | 'danger' | 'watch' | 'good' | null }) {
  const cls = clsx('pn-card', onClick && 'pn-card--btn', selected && 'is-selected', tone && `pn-card--${tone}`, className);
  if (!onClick)
    return (
      <div className={cls} data-testid={testId}>
        {children}
      </div>
    );
  return (
    <div
      className={cls}
      data-testid={testId}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onClick={(e) => {
        // Ignore clicks that originated on nested interactive controls.
        const inner = (e.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="switch"], [role="radio"], [data-stop]');
        if (inner && inner !== e.currentTarget && e.currentTarget.contains(inner)) return;
        onClick();
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="pn-empty">
      {icon && <div className="pn-empty__icon">{icon}</div>}
      <div className="pn-empty__title">{title}</div>
      {children && <div className="pn-empty__text">{children}</div>}
      {action && <div className="pn-empty__action">{action}</div>}
    </div>
  );
}

export function KV({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="pn-kv">
      <span className="pn-kv__k">{label}</span>
      <span className="pn-kv__v">
        {children}
        {hint && <span className="pn-kv__hint">{hint}</span>}
      </span>
    </div>
  );
}

export function Tile({ label, value, hint, icon, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'aqua' | 'coral' | 'gold' | 'good' | 'watch' | 'danger' | 'violet' }) {
  return (
    <div className={clsx('pn-tile', tone && `pn-tile--${tone}`)}>
      <div className="pn-tile__top">
        {icon && <span className="pn-tile__icon">{icon}</span>}
        <span className="pn-tile__label">{label}</span>
      </div>
      <div className="pn-tile__value">{value}</div>
      {hint && <div className="pn-tile__hint">{hint}</div>}
    </div>
  );
}

/** Thin bar meter with an accessible label; value 0..100. */
export function Bar({ value, tone = 'auto', label, invert, thin }: { value: number; tone?: 'auto' | 'good' | 'watch' | 'danger' | 'aqua' | 'gold' | 'coral'; label: string; invert?: boolean; thin?: boolean }) {
  const v = Math.max(0, Math.min(100, isFinite(value) ? value : 0));
  const eff = invert ? 100 - v : v;
  const t = tone === 'auto' ? (eff >= 60 ? 'good' : eff >= 30 ? 'watch' : 'danger') : tone;
  return (
    <div className={clsx('pn-bar', thin && 'pn-bar--thin')} role="meter" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`pn-bar__fill pn-bar__fill--${t}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function NumberField({ value, onChange, min = 0, max = 1e9, step = 1, prefix, label, testId, bigStep }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; prefix?: string; label: string; testId?: string; bigStep?: number }) {
  const id = useId();
  const clampV = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  const inc = bigStep ?? step;
  // lane:fix-panels — what the player has typed so far, while the field has focus. Clamping every keystroke on a
  // controlled input turned "95" into $285 (9 → min 71, then "715" → max 285); now the typed text stays on screen while
  // the parent gets the amount that would actually be used (an out-of-range draft clamped, so a "Send $…" button
  // never shows one amount and sends another), and blur / Enter tidies the field to that amount.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (raw: string | null) => {
    const n = raw == null || raw.trim() === '' ? value : Number(raw);
    onChange(clampV(Number.isFinite(n) ? n : value));
    setDraft(null);
  };
  return (
    <div className="pn-num">
      <button type="button" className="pn-num__btn" aria-label={`Decrease ${label}`} onClick={() => { sfx('click'); onChange(clampV(value - inc)); }} disabled={value <= min}>
        <Minus size={16} />
      </button>
      <label htmlFor={id} className="pn-num__field">
        {prefix && <span className="pn-num__prefix">{prefix}</span>}
        <input
          id={id}
          data-testid={testId}
          type="number"
          inputMode="numeric"
          aria-label={label}
          value={draft ?? (Number.isFinite(value) ? value : 0)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const n = Number(raw);
            if (raw.trim() === '' || !Number.isFinite(n)) return;
            onChange(n >= min && n <= max ? n : clampV(n));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(draft);
          }}
          onBlur={() => commit(draft)}
        />
      </label>
      <button type="button" className="pn-num__btn" aria-label={`Increase ${label}`} onClick={() => { sfx('click'); onChange(clampV(value + inc)); }} disabled={value >= max}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function SectionHead({ title, children, icon }: { title: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="pn-shead">
      <h3 className="pn-shead__title">
        {icon}
        {title}
      </h3>
      {children && <div className="pn-shead__actions">{children}</div>}
    </div>
  );
}

/** Inline callout for warnings/advice (icon + text, never colour alone). */
export function Callout({ tone = 'info', icon, title, children, action }: { tone?: 'info' | 'good' | 'watch' | 'danger' | 'gold'; icon?: ReactNode; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={clsx('pn-callout', `pn-callout--${tone}`)} role={tone === 'danger' ? 'alert' : undefined}>
      {icon && <span className="pn-callout__icon">{icon}</span>}
      <div className="pn-callout__body">
        {title && <div className="pn-callout__title">{title}</div>}
        {children && <div className="pn-callout__text">{children}</div>}
      </div>
      {action && <div className="pn-callout__action">{action}</div>}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, hideLabel, testId, disabled, title }: { checked: boolean; onChange: (v: boolean) => void; label: string; hideLabel?: boolean; testId?: string; disabled?: boolean; title?: string }) {
  return (
    <label className={clsx('pn-check', disabled && 'is-disabled')} title={title} onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} disabled={disabled} data-testid={testId} onChange={(e) => { sfx('click'); onChange(e.target.checked); }} />
      <span className="pn-check__box" aria-hidden />
      <span className={hideLabel ? 'pn-sr' : 'pn-check__label'}>{label}</span>
    </label>
  );
}

/** lane:fix-panels — rows a paged list shows at first and adds per step (about six screens of animal rows). */
export const PAGE_ROWS = 40;

/**
 * lane:fix-panels — how many rows of a long list to show: starts at PAGE_ROWS, grows as the sentinel scrolls into
 * view, and starts over whenever `resetKey` changes (a new filter, sort or tab). Long lists (337 animals on a big
 * facility) used to mount every row at once, and every row asked for a portrait render.
 */
export function usePaged(total: number, resetKey: unknown): { shown: number; more: () => void } {
  const [shown, setShown] = useState(PAGE_ROWS);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else setShown(PAGE_ROWS);
  }, [resetKey]);
  return { shown: Math.min(shown, total), more: () => setShown((n) => Math.min(total, n + PAGE_ROWS)) };
}

/** Sentinel at the foot of a paged list: asks for more rows as it comes into view, with a button for good measure. */
export function LoadMore({ remaining, onMore, noun = 'row' }: { remaining: number; onMore: () => void; noun?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onMore);
  cb.current = onMore;
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        cb.current();
        // still in view once the new rows are in (tall window, short page)? observe again so it fires again
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          io.unobserve(el);
          io.observe(el);
        }, 150);
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => {
      window.clearTimeout(timer);
      io.disconnect();
    };
  }, []);
  if (remaining <= 0) return null;
  return (
    <div ref={ref} className="pn-row" style={{ justifyContent: 'center', padding: '6px 0' }} data-testid="load-more">
      <Button size="sm" variant="ghost" onClick={onMore}>
        Show {Math.min(remaining, PAGE_ROWS)} more · {remaining} {noun}{remaining === 1 ? '' : 's'} left
      </Button>
    </div>
  );
}
