/**
 * chunk 19 (ADR-0055 decision 3, QOL-004) — whether Find anything is open. Its own module so the rules that need to
 * know (a phone's stepped-aside sheet, src/ui/panels/common/aside.ts) don't load the palette. OWNER: lane "ui-shell".
 */
import { create } from 'zustand';

export const useFind = create<{ open: boolean }>(() => ({ open: false }));
