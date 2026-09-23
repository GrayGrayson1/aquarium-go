/**
 * Aquarium Go UI kit. OWNER: lane "ui-shell" (restyle freely; keep component names + props stable — lane
 * "ui-panels" builds on these). New components may be added; existing props are never removed.
 *
 * Design language: dark frosted glass, 1px light borders, Fraunces for names/titles, Inter for UI.
 * Status is always icon + word + colour. Touch targets ≥ 40px on primary controls.
 */
import { useEffect, useId, useRef, type ReactNode, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, TriangleAlert, OctagonAlert, X, Minus, Plus, Lock } from 'lucide-react';
import type { StatusLevel } from '@/types';
import { sfx } from '@/audio/sfx';
import './kit.css';
import '../styles/tokens.css';

export function Panel({ title, subtitle, actions, children, className, strong, style, onClose, bodyClassName, testId, icon }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; strong?: boolean; style?: CSSProperties; onClose?: () => void; bodyClassName?: string;
  /** data-testid on the root (e.g. `panel-market`). */
  testId?: string;
  /** Small leading icon in the header. */
  icon?: ReactNode;
}) {
  return (
    <section className={clsx('ag-panel', strong && 'ag-panel--strong', className)} style={style} data-testid={testId}>
      {(title || actions || onClose) && (
        <header className="ag-panel__head">
          {icon && <span className="ag-panel__icon" aria-hidden>{icon}</span>}
          <div className="ag-grow">
            {title && <h2 className="ag-panel__title">{title}</h2>}
            {subtitle && <div className="ag-panel__sub">{subtitle}</div>}
          </div>
          {actions}
          {onClose && (
            <IconButton label="Close" onClick={onClose} className="ag-iconbtn--quiet">
              <X size={18} />
            </IconButton>
          )}
        </header>
      )}
      <div className={clsx('ag-panel__body', bodyClassName)}>{children}</div>
    </section>
  );
}

type BtnVariant = 'default' | 'primary' | 'coral' | 'danger' | 'ghost';
export function Button({ variant = 'default', size = 'md', block, className, onClick, silent, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; block?: boolean; silent?: boolean;
}) {
  return (
    <button
      type="button"
      className={clsx('ag-btn', variant !== 'default' && `ag-btn--${variant}`, size !== 'md' && `ag-btn--${size}`, block && 'ag-btn--block', className)}
      onClick={(e) => {
        if (!silent) sfx(variant === 'primary' ? 'confirm' : 'click');
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export function IconButton({ label, pressed, className, onClick, children, silent, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; pressed?: boolean; silent?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={clsx('ag-iconbtn', className)}
      onClick={(e) => {
        if (!silent) sfx('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode }[] }) {
  return (
    <div className="ag-tabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={it.id === value} className="ag-tab" onClick={() => { sfx('click'); onChange(it.id); }}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

export type BadgeTone = 'neutral' | 'good' | 'watch' | 'danger' | 'gold' | 'aqua' | 'violet';
export function Badge({ tone = 'neutral', children, className, title }: { tone?: BadgeTone; children: ReactNode; className?: string; title?: string }) {
  return <span title={title} className={clsx('ag-badge', tone !== 'neutral' && `ag-badge--${tone}`, className)}>{children}</span>;
}

/** Status is always icon + word + colour (never colour alone). */
export function StatusBadge({ status, label }: { status: StatusLevel; label?: string }) {
  const Icon = status === 'good' ? CircleCheck : status === 'watch' ? TriangleAlert : OctagonAlert;
  const word = label ?? (status === 'good' ? 'Good' : status === 'watch' ? 'Watch' : 'Danger');
  return (
    <Badge tone={status}>
      <Icon size={12} aria-hidden /> {word}
    </Badge>
  );
}

export function Meter({ label, value, max = 100, tone, display, invert }: { label?: ReactNode; value: number; max?: number; tone?: 'good' | 'watch' | 'danger' | 'auto'; display?: ReactNode; invert?: boolean }) {
  const safe = Number.isFinite(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, (safe / max) * 100));
  let t = tone;
  if (tone === 'auto') {
    const v = invert ? 100 - pct : pct;
    t = v >= 60 ? 'good' : v >= 30 ? 'watch' : 'danger';
  }
  return (
    <div className="ag-meter">
      {(label || display) && (
        <div className="ag-meter__row">
          <span>{label}</span>
          <span className="ag-meter__val">{display ?? Math.round(safe)}</span>
        </div>
      )}
      <div className="ag-meter__track" role="meter" aria-label={typeof label === 'string' ? label : undefined} aria-valuenow={Math.round(safe)} aria-valuemin={0} aria-valuemax={max}>
        <div className={clsx('ag-meter__fill', t && t !== 'auto' && `ag-meter__fill--${t}`)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="ag-stat">
      <span className="ag-stat__label">{label}</span>
      <span className="ag-stat__value">{value}</span>
      {hint && <span className="ag-stat__hint">{hint}</span>}
    </div>
  );
}

export function Section({ title, children, actions }: { title?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ag-section">
      {(title || actions) && (
        <div className="ag-row ag-section__head">
          {title && <h3 className="ag-section__title ag-grow">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, actions, width, testId }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode; width?: number; testId?: string }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    sfx('open');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    // Focus moves into the dialog (first field, else the close button) and returns to the opener afterwards.
    const opener = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const root = wrapRef.current;
      if (!root || root.contains(document.activeElement)) return;
      const target = root.querySelector<HTMLElement>('input, select, textarea') ?? root.querySelector<HTMLElement>('[aria-label="Close"]');
      target?.focus({ preventScroll: true });
    }, 80);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.clearTimeout(t);
      if (opener && opener !== document.body && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ag-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={wrapRef}
            className="ag-modal-wrap"
            style={width ? { width: `min(${width}px, 100%)` } : undefined}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            role="dialog"
            aria-modal="true"
          >
            <Panel className="ag-modal" strong title={title} subtitle={subtitle} onClose={onClose} testId={testId}>
              {children}
              {actions && <div className="ag-row ag-modal__actions">{actions}</div>}
            </Panel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toggle({ checked, onChange, label, disabled, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-testid={testId}
      className="ag-toggle"
      onClick={() => { sfx('click'); onChange(!checked); }}
    />
  );
}

export function Slider({ value, min = 0, max = 1, step = 0.01, onChange, label, disabled }: { value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; label: string; disabled?: boolean }) {
  const pct = ((Number.isFinite(value) ? value : min) - min) / (max - min || 1);
  return (
    <input
      className="ag-slider"
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : min}
      disabled={disabled}
      style={{ ['--fill' as string]: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Divider() {
  return <hr className="ag-divider" />;
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="ag-empty">
      {icon && <div className="ag-empty__icon" aria-hidden>{icon}</div>}
      {children}
    </div>
  );
}

export function formatMoney(v: number, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const n = Number.isFinite(v) ? v : 0;
  const abs = Math.abs(n);
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 });
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}$${s}`;
}

export function Money({ value, sign, cents }: { value: number; sign?: boolean; cents?: boolean }) {
  return <span className="ag-money" style={{ color: sign ? (value >= 0 ? 'var(--c-good)' : 'var(--c-danger)') : undefined }}>{formatMoney(value, { sign, cents })}</span>;
}

// ───────────────────────── additions (ui-shell) ─────────────────────────

/** Pill chip. With `onClick` it is a toggle button (aria-pressed = `selected`). */
export function Chip({ children, selected, onClick, tone, icon, className, title, testId, disabled, size = 'md' }: {
  children: ReactNode; selected?: boolean; onClick?: () => void; tone?: BadgeTone; icon?: ReactNode; className?: string; title?: string; testId?: string; disabled?: boolean; size?: 'sm' | 'md';
}) {
  const cls = clsx('ag-chip', tone && tone !== 'neutral' && `ag-chip--${tone}`, selected && 'is-selected', size === 'sm' && 'ag-chip--sm', onClick && 'ag-chip--btn', className);
  if (!onClick)
    return (
      <span className={cls} title={title} data-testid={testId}>
        {icon}
        {children}
      </span>
    );
  return (
    <button type="button" className={cls} aria-pressed={!!selected} title={title} data-testid={testId} disabled={disabled} onClick={() => { sfx('click'); onClick(); }}>
      {icon}
      {children}
    </button>
  );
}

/** Segmented control. `testIdPrefix` → data-testid `${prefix}${id}` on each segment. */
export function Segmented<T extends string | number>({ value, onChange, items, label, testIdPrefix, size = 'md', className }: {
  value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; title?: string; icon?: ReactNode; disabled?: boolean }[]; label: string; testIdPrefix?: string; size?: 'sm' | 'md'; className?: string;
}) {
  return (
    <div className={clsx('ag-seg', size === 'sm' && 'ag-seg--sm', className)} role="radiogroup" aria-label={label}>
      {items.map((it) => (
        <button
          key={String(it.id)}
          type="button"
          role="radio"
          aria-checked={it.id === value}
          aria-label={it.title ?? (typeof it.label === 'string' ? it.label : undefined)}
          title={it.title}
          disabled={it.disabled}
          data-testid={testIdPrefix ? `${testIdPrefix}${it.id}` : undefined}
          className="ag-seg__item"
          onClick={() => { sfx('click'); onChange(it.id); }}
        >
          {it.icon}
          {it.label !== '' && <span>{it.label}</span>}
        </button>
      ))}
    </div>
  );
}

/** −  value  + stepper (setpoints, schedules). */
export function Stepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, format, label, disabled }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => ReactNode; label: string; disabled?: boolean;
}) {
  const set = (v: number) => {
    const nv = Math.round(Math.max(min, Math.min(max, v)) / step) * step;
    if (nv !== value) {
      sfx('click');
      onChange(Number(nv.toFixed(4)));
    }
  };
  return (
    <div className="ag-stepper" role="group" aria-label={label}>
      <button type="button" className="ag-stepper__btn" aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => set(value - step)}>
        <Minus size={14} />
      </button>
      <span className="ag-stepper__val" aria-live="polite">{format ? format(value) : value}</span>
      <button type="button" className="ag-stepper__btn" aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => set(value + step)}>
        <Plus size={14} />
      </button>
    </div>
  );
}

/** Labelled text input. */
export function TextField({ label, hint, className, testId, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode; testId?: string }) {
  const id = useId();
  return (
    <label className={clsx('ag-field', className)} htmlFor={rest.id ?? id}>
      {label && <span className="ag-field__label">{label}</span>}
      <input id={rest.id ?? id} className="ag-input" data-testid={testId} {...rest} />
      {hint && <span className="ag-field__hint">{hint}</span>}
    </label>
  );
}

/** Label/value row. */
export function KV({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="ag-kv">
      <span className="ag-kv__label">{label}</span>
      <span className="ag-kv__value">{children}</span>
      {hint && <span className="ag-kv__hint">{hint}</span>}
    </div>
  );
}

/** Settings-style row: label + description on the left, control on the right. */
export function Row({ label, description, children, icon }: { label: ReactNode; description?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="ag-setrow">
      {icon && <span className="ag-setrow__icon" aria-hidden>{icon}</span>}
      <div className="ag-grow">
        <div className="ag-setrow__label">{label}</div>
        {description && <div className="ag-setrow__desc">{description}</div>}
      </div>
      <div className="ag-setrow__ctl">{children}</div>
    </div>
  );
}

/** Small locked state with the unlock hint (never hover-only). */
export function LockedNote({ children }: { children: ReactNode }) {
  return (
    <div className="ag-locked">
      <Lock size={14} aria-hidden /> <span>{children}</span>
    </div>
  );
}

/** Dots row for step progress. */
export function ProgressDots({ total, index, label }: { total: number; index: number; label?: string }) {
  return (
    <div className="ag-dots" role="progressbar" aria-label={label ?? 'Progress'} aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
      {Array.from({ length: Math.max(0, total) }, (_, i) => (
        <span key={i} className={clsx('ag-dot', i < index && 'is-done', i === index && 'is-current')} />
      ))}
    </div>
  );
}

/** Screen-reader-only text. */
export function SR({ children }: { children: ReactNode }) {
  return <span className="ag-sr">{children}</span>;
}
