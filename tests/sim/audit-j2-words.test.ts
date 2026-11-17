// @vitest-environment node
/**
 * Audit 2026-11-17, the wording sweep's second half (J21 to J40) and its follow-ups: the words players read say what
 * they mean, in the game's own vocabulary. Copy is asserted exactly where a constant or a sim line carries it; words
 * typed into JSX are checked in the source (the jargon they replaced must not come back).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SEX_LABEL, PURPOSE_HINT } from '@/ui/panels/common/format';
import { CRITERION_LABEL } from '@/data/shows';
import { AUTOMATION_LOCK_HINT } from '@/ui/cards/Automation';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';

const src = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');

describe('Audit 2026-11-17 (J22): jargon gets plain words where it appears', () => {
  it('labels and hints', () => {
    expect(SEX_LABEL.unknown).toBe('Sex not known yet');
    expect(PURPOSE_HINT.breeding).toBe('Getting ready to spawn, away from tank mates.');
    expect(CRITERION_LABEL.deportment).toBe('Behaviour');
    expect(AUTOMATION_LOCK_HINT).toBe('Research Better Life Support, or raise Husbandry mastery by caring for your tanks.');
    expect(UNLOCK_RULE_BY_KEY.gear_autofeeder.hint).toBe(AUTOMATION_LOCK_HINT);
  });

  it('the words typed into the screens', () => {
    const cases: [string, string, string][] = [
      ['ui/panels/market/Listings.tsx', 'bids from NPC buyers', 'bids from buyers arrive here'],
      ['ui/settings/SettingsPanel.tsx', 'The HUD softly fades', 'The buttons fade after a few quiet seconds in tank view. Move the pointer or tap to bring them back.'],
      ['ui/hud/ToolRail.tsx', 'No pointer?', 'Or drop it at the surface:'],
      ['ui/panels/market/FragListing.tsx', 'LPS and SPS', 'stony corals more than soft corals'],
      ['ui/panels/build/BuildPanel.tsx', ' gph`', ' gallons an hour`'],
      ['ui/hud/AlertsAutomation.tsx', 'Add QT tank', 'Add quarantine tank'],
      ['ui/panels/market/Shop.tsx', 'Sold as one lot ·', 'Sold together · '],
      ['ui/panels/market/Shop.tsx', 'aria-label="Unsexed"', 'aria-label="Sex not known yet"'],
      ['ui/panels/market/CreateListing.tsx', 'aria-label="Unsexed"', 'aria-label="Sex not known yet"'],
      ['ui/panels/livestock/Production.tsx', 'Pair conditioning', 'Pair getting ready'],
      ['ui/panels/shows/Upcoming.tsx', 'Purse <', 'Prizes <strong>'],
      ['ui/panels/shows/Upcoming.tsx', 'table show', 'A friendly club show · judge'],
      ['ui/panels/shows/EnterFlow.tsx', 'Purse <', 'Prize <b>'],
      ['ui/panels/operations/Overview.tsx', 'husbandry mastery with regular care', 'raise Husbandry mastery by caring for your tanks.'],
      ['ui/panels/operations/LinesTab.tsx', '{ id: \'quarantine\', label: \'QT\' }', 'full: \'Quarantine\''],
      ['ui/panels/visitors/StaffTab.tsx', '<RoleTag role={m.role} />', 'docent: \'gives talks\''],
    ];
    for (const [file, gone, now] of cases) {
      const s = src(file);
      expect(s, `${file}: ${gone}`).not.toContain(gone);
      expect(s, `${file}: ${now}`).toContain(now);
    }
  });
});

describe('Audit 2026-11-17 (J24, the part that needs no choice): one name for the quick-sale buyer inside one box', () => {
  it('the quick-sell box and the reputation line say "the local fish store", as the box’s own price line does', () => {
    const box = src('ui/panels/livestock/LivestockPanel.tsx');
    expect(box).not.toContain('Quick sell to the local shop?');
    expect(box).toContain('title="Quick sell to the local fish store?"');
    expect(box).toContain('The local fish store offers');
    expect(src('sim/economy/listings.ts')).toContain("'Sold unwell animals to the local fish store'");
  });
});
