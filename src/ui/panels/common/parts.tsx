/**
 * Small building blocks shared by the management panels (on top of the ui-shell kit). OWNER: lane "ui-panels".
 */
import { useId, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';
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

/** Segmented radio group — keyboard accessible (arrow keys), ≥40px touch targets. */
export function Seg<T extends string>({ value, onChange, items, label, size = 'md', className, testIdPrefix }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; disabled?: boolean; title?: string }[]; label: string; size?: 'sm' | 'md'; className?: string; testIdPrefix?: string }) {
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
    <div role="radiogroup" aria-label={label} className={clsx('pn-seg', size === 'sm' && 'pn-seg--sm', className)} onKeyDown={onKey}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={it.id === value}
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
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
          }}
          onBlur={() => onChange(clampV(value))}
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

export function Checkbox({ checked, onChange, label, hideLabel, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; hideLabel?: boolean; testId?: string }) {
  return (
    <label className="pn-check" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} data-testid={testId} onChange={(e) => { sfx('click'); onChange(e.target.checked); }} />
      <span className="pn-check__box" aria-hidden />
      <span className={hideLabel ? 'pn-sr' : 'pn-check__label'}>{label}</span>
    </label>
  );
}
