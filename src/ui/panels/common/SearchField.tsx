/**
 * chunk 19 (ADR-0055 decision 3, QOL-003) — the search box every list shares (the Encyclopedia's and Livestock's
 * look): a magnifier, the field, a clear button. Escape clears it first; on an empty field Escape leaves the field
 * (PanelHost), and the next one closes the panel.
 * OWNER: lane "ui-panels".
 */
import { useRef } from 'react';
import { Search, X } from 'lucide-react';

export function SearchField({ value, onChange, placeholder, label, testId, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; /** What the field searches (its accessible name). */ label: string; testId?: string; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className="pn-search pn-searchfield">
      <Search size={15} aria-hidden />
      <input
        ref={ref}
        className="pn-input"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            // the field's own Escape: clear it, and keep the panel open
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }
        }}
      />
      {value && (
        <button
          type="button"
          className="pn-searchfield__clear"
          aria-label="Clear search"
          data-testid={testId ? `${testId}-clear` : undefined}
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </label>
  );
}
