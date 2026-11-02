/**
 * chunk 19 (ADR-0055 decision 1, QOL-001) — panels stay open: a tool started from a panel keeps a side sheet open and
 * steps a bottom sheet aside, which comes back when the tool ends on its own terms and not when the player went
 * somewhere else meanwhile.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { useUI, type UIState } from '@/state/ui';
import { asideDecision, startToolFromPanel, clearAside } from '@/ui/panels/common/aside';

type S = Parameters<typeof asideDecision>[0];
type P = Parameters<typeof asideDecision>[1];
const base: S = { panel: null, panelAside: 'build', tool: 'decor_place', photoMode: false, hudHidden: false, screen: 'game', selectedCreatureId: null };
const prev: P = { tool: 'decor_place', selectedCreatureId: null, panelAside: 'build' };

describe('QOL-001: when a stepped-aside panel comes back', () => {
  it('comes back when a placement tool ends (placed, Done, Cancel, Escape)', () => {
    for (const tool of ['decor_place', 'decor_move', 'tank_place'] as const) {
      expect(asideDecision({ ...base, tool: 'none' }, { ...prev, tool }, false)).toBe('return');
    }
  });
  it('waits while the tool runs, and through "Place another" (one placement tool to another)', () => {
    expect(asideDecision(base, prev, false)).toBe('wait');
    expect(asideDecision({ ...base, tool: 'decor_place' }, { ...prev, tool: 'decor_move' }, false)).toBe('wait');
  });
  it('is dropped when the player goes somewhere else', () => {
    expect(asideDecision({ ...base, panel: 'market' }, prev, false)).toBe('drop');
    expect(asideDecision({ ...base, tool: 'none', photoMode: true }, prev, false)).toBe('drop');
    expect(asideDecision({ ...base, tool: 'none', hudHidden: true }, prev, false)).toBe('drop');
    expect(asideDecision({ ...base, tool: 'none' }, prev, true)).toBe('drop'); // the tank card opened (it ends the tool)
    expect(asideDecision({ ...base, screen: 'title' }, prev, false)).toBe('drop');
    expect(asideDecision({ ...base, selectedCreatureId: 'c1' }, prev, false)).toBe('drop');
    expect(asideDecision({ ...base, tool: 'feed' }, prev, false)).toBe('drop'); // another kind of tool took over
  });
  it('does nothing without a stepped-aside panel', () => {
    expect(asideDecision({ ...base, panelAside: null, tool: 'none' }, prev, false)).toBe('wait');
  });
});

describe('QOL-001: starting a tool from a panel', () => {
  beforeEach(() => {
    clearAside();
    useUI.setState({ panel: 'build', panelAside: null, tool: 'none', view: 'tank' } as Partial<UIState>);
  });
  it('keeps a side sheet open (computers)', () => {
    startToolFromPanel({ tool: 'decor_place', placingDecorDefId: 'java_fern', view: 'tank' }, false);
    const ui = useUI.getState();
    expect(ui.panel).toBe('build');
    expect(ui.panelAside).toBeNull();
    expect(ui.tool).toBe('decor_place');
  });
  it('steps a bottom sheet aside (phones), remembering the panel', () => {
    startToolFromPanel({ tool: 'decor_place', placingDecorDefId: 'java_fern', view: 'tank' }, true);
    const ui = useUI.getState();
    expect(ui.panel).toBeNull();
    expect(ui.panelAside).toBe('build');
    expect(ui.tool).toBe('decor_place');
  });
  it('never takes a panel from the patch (a caller cannot close it by accident)', () => {
    startToolFromPanel({ tool: 'decor_move', panel: null } as Parameters<typeof startToolFromPanel>[0], false);
    expect(useUI.getState().panel).toBe('build');
  });
});
