/**
 * chunk 19 (ADR-0055 decision 7, QOL-008) — where the guide's spotlight points for each step, as the player moves
 * through it: the feed step points at Feed, then at the food to pick once the picker is open, then at the tool's own
 * instructions once a food is in hand; the habitat step at Build, then at its Decor tab, then at the suggested piece,
 * then at the placing instructions; the water step at the tank card, then at the reading the step asks about; and so
 * on. Pure over a small picture of the screen (tests/sim/qol-guide.test.ts): candidates are CSS selectors, best
 * first (src/ui/tutorial/Spotlight.tsx shows the first one drawn). `dim` dims the rest of the screen (a control to tap
 * now); a step that waits for play (visits, reputation) or for watching an animal never dims. OWNER: lane "ui-shell".
 */

export interface GuideScreen {
  panel: string | null;
  popover: string | null;
  tool: string;
  tankCardOpen: boolean;
  /** The phone layout (tab bar and More), where some destinations live in More. */
  mobile: boolean;
}

export interface GuideAim {
  candidates: string[];
  dim: boolean;
  hand: boolean;
}

/** The coach card's own "Show me" button: the target when the step's place is the 3D scene. */
export const SHOW_ME = '[data-guide-showme]';

/** Destinations that live in the phone's More sheet (src/ui/hud/TabBar.tsx MORE_ITEMS). */
const IN_MORE = new Set(['visitors', 'shows', 'social', 'research', 'finances', 'encyclopedia']);

/** The reading the water step asks each starter to check (its words: temperature, salinity or ammonia). */
export function waterParamFor(starterId: string): 'temp' | 'salinity' | 'ammonia' {
  if (starterId === 'pea_puffer') return 'ammonia';
  if (starterId === 'ocellaris_clownfish' || starterId === 'lined_seahorse') return 'salinity';
  return 'temp';
}

/** A dock destination: its dock button, or on a phone More then its tile. */
function dock(id: string, s: GuideScreen): string[] {
  if (s.mobile && IN_MORE.has(id)) return s.popover === 'more' ? [`[data-testid="more-${id}"]`] : ['[data-testid="dock-more"]'];
  return [`[data-tutorial-id="dock-${id}"]`];
}

const aim = (candidates: string[], dim = true, hand = true): GuideAim => ({ candidates, dim, hand });

export function guideAim(stepId: string, hintTarget: string, starterId: string, s: GuideScreen): GuideAim | null {
  switch (stepId) {
    case 'meet':
      return aim(['[data-testid="creature-card"] [data-tutorial-id="creature-name"]', SHOW_ME], false);
    case 'camera':
      return aim(['[data-tutorial-id="camera-modes"]', '[data-testid="tool-camera"]', SHOW_ME]);
    case 'feed': {
      const target = hintTarget === 'tool-target-feed' ? 'tool-target-feed' : 'tool-feed';
      if (s.popover === 'food' || s.popover === 'target_food') return aim(['.ag-foodlist .ag-food:has(.ag-food__tag):not(.is-empty)', '.ag-foodlist .ag-food:not(.is-empty)']);
      if (s.tool === 'feed' || s.tool === 'target_feed') return aim(['.ag-toolhint'], false);
      return aim([`[data-tutorial-id="${target}"]`]);
    }
    case 'water':
      if (s.tankCardOpen) return aim([`[data-testid="tank-card"] [data-param="${waterParamFor(starterId)}"]`, '[data-testid="tank-card"] [data-param]']);
      return aim(['[data-tutorial-id="tank-card-toggle"]']);
    case 'habitat':
      if (s.tool === 'decor_place') return aim(['.ag-toolhint'], false);
      if (s.panel === 'build') return aim(['[data-testid="panel-build"] .pn-decor.is-suggested', '[data-testid="build-tab-decor"][aria-selected="false"]', '[data-testid="panel-build"] .pn-decor:not(.is-locked)']);
      return aim(dock('build', s));
    case 'observe':
      return aim([SHOW_ME], false);
    case 'first_money':
    case 'first_goal':
      return aim(['[data-tutorial-id="hud-money"]'], false, false);
    case 'market':
      return s.panel === 'market' ? null : aim(dock('market', s));
    case 'upgrade':
      return s.panel === 'build' ? null : aim(dock('build', s), false, false);
    case 'preview':
      return s.panel === 'research' || s.panel === 'visitors' || s.panel === 'build' ? null : aim(dock('research', s));
    default:
      return hintTarget.startsWith('dock-') ? aim(dock(hintTarget.slice(5), s)) : null;
  }
}
