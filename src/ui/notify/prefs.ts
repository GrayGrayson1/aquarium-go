/**
 * Notification preferences (0.5 spec §12.2): per device, in localStorage under `aquarium-go.notify.v1`, never in the
 * save. A missing or malformed value reads as the defaults (rules.ts `normalizePrefs`). OWNER: lane "notify".
 */
import { create } from 'zustand';
import { DEFAULT_NOTIFY_PREFS, normalizePrefs, type NotifyCategory, type NotifyPrefs } from './rules';

export const NOTIFY_PREFS_KEY = 'aquarium-go.notify.v1';

function load(): NotifyPrefs {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(NOTIFY_PREFS_KEY) : null;
    return normalizePrefs(raw ? JSON.parse(raw) : DEFAULT_NOTIFY_PREFS);
  } catch {
    return normalizePrefs(DEFAULT_NOTIFY_PREFS);
  }
}

function save(p: NotifyPrefs): void {
  try {
    localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify({ categories: p.categories, quiet: p.quiet }));
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}

interface NotifyPrefsStore extends NotifyPrefs {
  setCategory(c: NotifyCategory, on: boolean): void;
  setQuiet(on: boolean): void;
  /** A grant applies the category defaults (§12.4): every category but Shows on. Quiet hours keep their switch. */
  applyDefaults(): void;
  /** Read the stored value again (another tab may have changed it). */
  reload(): void;
}

export const useNotifyPrefs = create<NotifyPrefsStore>((set, get) => {
  const commit = (p: NotifyPrefs) => {
    set(p);
    save(p);
  };
  return {
    ...load(),
    setCategory: (c, on) => commit({ categories: { ...get().categories, [c]: on }, quiet: get().quiet }),
    setQuiet: (on) => commit({ categories: get().categories, quiet: { ...get().quiet, on } }),
    applyDefaults: () => commit({ categories: normalizePrefs(DEFAULT_NOTIFY_PREFS).categories, quiet: get().quiet }),
    reload: () => set(load()),
  };
});

/** The preferences as plain data (what the rules read). */
export const notifyPrefs = (): NotifyPrefs => {
  const s = useNotifyPrefs.getState();
  return { categories: s.categories, quiet: s.quiet };
};
