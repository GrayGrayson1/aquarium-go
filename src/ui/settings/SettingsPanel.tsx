/**
 * Settings (ui.panel === 'settings'): sound, graphics, accessibility, gameplay, saves and credits.
 * Works on the title screen and in game. OWNER: lane "ui-shell".
 */
import { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Fish,
  MousePointerClick,
  Monitor,
  Accessibility,
  Contrast,
  Type,
  Thermometer,
  FlaskConical,
  Save,
  Lightbulb,
  Mic,
  Download,
  Upload,
  LogOut,
  Wrench,
  Gauge,
  Heart,
  Eye,
} from 'lucide-react';
import { useUI } from '@/state/ui';
import { useGame } from '@/state/game';
import { useSettings } from '@/state/settings';
import { useRenderQuality } from '@/render/shared/quality'; // lane:pc-perf
import type { QualityLevel } from '@/types';
import { sfx } from '@/audio/sfx';
import { Sheet } from '../common/Sheet';
import { Button, Row, Segmented, Slider, Tabs, Toggle, Section, Modal } from '../kit';
import { usePrefs } from '../common/prefs';
import { listSlots, saveNow, exportCurrent, importFile, loadIntoGame, deleteSlot, SAVE_SLOTS, slotLabel, watchSaves, timeAgo, isSameGame, loadKeepAdvice, type SaveMeta } from '../common/saves';
import { SaveRow } from '../screens/LoadDialog';

type Tab = 'general' | 'display' | 'saves' | 'about';

const QUALITY: { id: QualityLevel; label: string; note: string }[] = [
  { id: 'low', label: 'Low', note: 'Fastest. Simpler water and shadows.' },
  { id: 'medium', label: 'Medium', note: 'Balanced for laptops and tablets.' },
  { id: 'high', label: 'High', note: 'Rich caustics, soft shadows, depth haze.' },
  { id: 'ultra', label: 'Ultra', note: 'Everything, at full resolution.' },
];

function VolumeRow({ k, label, icon }: { k: 'master' | 'music' | 'aquarium' | 'ui'; label: string; icon: React.ReactNode }) {
  const v = useSettings((s) => s.volume[k]);
  return (
    <Row label={label} icon={icon}>
      <div className="ag-volrow">
        <Slider label={`${label} volume`} value={v} min={0} max={1} step={0.05} onChange={(x) => useSettings.getState().setVolume(k, x)} />
        <span className="ag-small ag-tabular ag-volrow__val">{Math.round(v * 100)}</span>
      </div>
    </Row>
  );
}

function GeneralTab() {
  const s = useSettings();
  const up = s.update;
  const auto = s.qualityAuto !== false;
  // lane:pc-perf — Auto shows what it picked (and what it is running now, if it had to step down to stay smooth)
  const running = useRenderQuality();
  const q = QUALITY.find((x) => x.id === s.quality) ?? QUALITY[2];
  const runningLabel = QUALITY.find((x) => x.id === running)?.label ?? q.label;
  return (
    <>
      <Section title="Graphics">
        <div className="ag-quality" role="radiogroup" aria-label="Graphics quality">
          <button
            type="button"
            role="radio"
            aria-checked={auto}
            className="ag-quality__opt ag-quality__opt--auto"
            data-testid="settings-quality-auto"
            onClick={() => {
              sfx('click');
              up({ qualityAuto: true });
            }}
          >
            <Gauge size={16} aria-hidden />
            <span>
              Auto{auto && (
                <span className="ag-quality__cur" data-testid="settings-quality-auto-current">
                  {' '}
                  · {runningLabel}
                </span>
              )}
            </span>
          </button>
          {QUALITY.map((it) => (
            <button
              key={it.id}
              type="button"
              role="radio"
              aria-checked={!auto && s.quality === it.id}
              className="ag-quality__opt"
              data-testid={`settings-quality-${it.id}`}
              onClick={() => {
                sfx('click');
                up({ quality: it.id, qualityAuto: false });
              }}
            >
              <Monitor size={16} aria-hidden />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
        <div className="ag-small ag-muted" data-testid="settings-quality-note">
          {auto
            ? `Picked for this device: ${runningLabel}${running !== s.quality ? ` (stepped down from ${q.label} to stay smooth)` : ''}. Resolution adapts to keep motion smooth.`
            : `${q.note} Resolution still adapts on big or busy screens.`}
        </div>
      </Section>
      <Section title="Sound">
        <Row label="Mute everything" icon={s.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}>
          <Toggle label="Mute" checked={s.muted} onChange={(v) => up({ muted: v })} />
        </Row>
        <VolumeRow k="master" label="Master" icon={<Volume2 size={16} />} />
        <VolumeRow k="music" label="Music" icon={<Music size={16} />} />
        <VolumeRow k="aquarium" label="Aquarium" icon={<Fish size={16} />} />
        <VolumeRow k="ui" label="Interface" icon={<MousePointerClick size={16} />} />
      </Section>
    </>
  );
}

function DisplayTab() {
  const s = useSettings();
  const up = s.update;
  const calm = usePrefs((p) => p.calmHud);
  return (
    <>
      <Section title="Accessibility">
        <Row label="Reduced motion" description="Calmer animation and no camera sway." icon={<Accessibility size={16} />}>
          <Toggle label="Reduced motion" checked={s.reducedMotion} onChange={(v) => up({ reducedMotion: v })} />
        </Row>
        <Row label="High contrast" description="Solid panels and brighter text." icon={<Contrast size={16} />}>
          <Toggle label="High contrast" checked={s.highContrast} onChange={(v) => up({ highContrast: v })} />
        </Row>
        <Row label="Text size" icon={<Type size={16} />}>
          <Segmented
            size="sm"
            label="Text size"
            value={s.textScale <= 0.95 ? 0.9 : s.textScale <= 1.05 ? 1 : s.textScale <= 1.2 ? 1.15 : 1.3}
            onChange={(v) => up({ textScale: v })}
            items={[
              { id: 0.9, label: 'S' },
              { id: 1, label: 'M' },
              { id: 1.15, label: 'L' },
              { id: 1.3, label: 'XL' },
            ]}
          />
        </Row>
      </Section>
      <Section title="Gameplay">
        <Row label="Temperature" description="Cards, panels and the guide show temperatures in this unit." icon={<Thermometer size={16} />}>
          <Segmented size="sm" label="Temperature unit" value={s.tempUnit} onChange={(u) => up({ tempUnit: u })} items={[{ id: 'C', label: '°C' }, { id: 'F', label: '°F' }]} />
        </Row>
        <Row label="Exact water values" description="Show numbers, not just Good / Watch / Danger." icon={<FlaskConical size={16} />}>
          <Toggle label="Exact water values" checked={s.advancedWater} onChange={(v) => up({ advancedWater: v })} />
        </Row>
        <Row label="Autosave" description="Saves quietly every few minutes and when you leave." icon={<Save size={16} />}>
          <Toggle label="Autosave" checked={s.autosave} onChange={(v) => up({ autosave: v })} />
        </Row>
        <Row label="Guide hints" description="Show the tutorial coach card." icon={<Lightbulb size={16} />}>
          <Toggle label="Guide hints" checked={s.showTutorialHints} onChange={(v) => up({ showTutorialHints: v })} />
        </Row>
        <Row label="Fade interface while watching" description="The HUD softly fades after a few quiet seconds in tank view. Move the pointer to bring it back." icon={<Eye size={16} />}>
          <Toggle label="Fade interface while watching" checked={calm} onChange={(v) => usePrefs.getState().update({ calmHud: v })} />
        </Row>
        <Row label="Party mode microphone" description="Let party lights follow your own music. Asked only when party mode starts." icon={<Mic size={16} />}>
          <Toggle label="Party mode microphone" checked={s.partyUseMicrophone} onChange={(v) => up({ partyUseMicrophone: v })} />
        </Row>
        <Row label="Camera sensitivity" icon={<Gauge size={16} />}>
          <div className="ag-volrow">
            <Slider label="Camera sensitivity" value={s.cameraSensitivity} min={0.4} max={2} step={0.1} onChange={(v) => up({ cameraSensitivity: v })} />
            <span className="ag-small ag-tabular ag-volrow__val">{s.cameraSensitivity.toFixed(1)}×</span>
          </div>
        </Row>
      </Section>
    </>
  );
}

type SaveConfirm = { kind: 'load'; slot: string } | { kind: 'overwrite'; slot: string };

/**
 * lane:fix-core (P7-03/S14-05/S06-07) — Load and Overwrite in the save list used to act on one click: the running
 * game was replaced (or a checkpoint destroyed) with no confirmation and nothing saved first. Both now confirm in a
 * modal that says what happens to the current game; loading autosaves it first (loadIntoGame) and can park it in a
 * free slot; a displaced slot's previous copy is listed as "Previous …" so an overwrite can be undone.
 */
function SavesTab() {
  const game = useGame((s) => s.game);
  const inGame = !!game && !game.isShowcase;
  const [saves, setSaves] = useState<SaveMeta[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<SaveConfirm | null>(null);
  const [importSlot, setImportSlot] = useState<string>('slot3');
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => listSlots().then(setSaves);
  useEffect(() => {
    void refresh();
    return watchSaves(() => void refresh());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bySlot = new Map((saves ?? []).map((s) => [s.slot, s]));
  const previousOf = (slot: string) => (saves ?? []).find((s) => s.previousOf === slot);

  const doLoad = async (slot: string) => {
    setBusy(true);
    const g = await loadIntoGame(slot);
    setBusy(false);
    if (g) useUI.getState().set({ panel: null });
    else void refresh();
  };
  const doOverwrite = async (slot: string) => {
    setBusy(true);
    await saveNow(slot, true);
    setBusy(false);
    void refresh();
  };
  // Load in game asks first; from the title there is nothing running to lose.
  const askLoad = (slot: string) => (inGame ? setConfirm({ kind: 'load', slot }) : void doLoad(slot));

  const target = confirm ? bySlot.get(confirm.slot) : undefined;
  const advice = confirm?.kind === 'load' ? loadKeepAdvice(saves ?? [], game) : null;
  const sameAsRunning = !!(target && game && isSameGame(target, game));
  const describe = (m: SaveMeta | undefined) => (m ? `${m.shopName} (Day ${m.day}, saved ${timeAgo(m.savedAt)})` : '');

  return (
    <>
      <Section title="Save slots">
        <div className="ag-savelist">
          {SAVE_SLOTS.map((slot) => {
            const meta = bySlot.get(slot);
            const prev = previousOf(slot);
            const row = meta ? (
              <div key={slot} className="ag-slotwrap">
                <SaveRow
                  s={meta}
                  busy={busy}
                  promotes={prev ?? undefined}
                  onLoad={game?.saveId && inGame && slot === 'auto' ? undefined : () => askLoad(slot)}
                  onDelete={async () => {
                    await deleteSlot(slot);
                    void refresh();
                  }}
                />
                {inGame && slot !== 'auto' && (
                  <Button size="sm" variant="ghost" disabled={busy} data-testid={`save-overwrite-${slot}`} onClick={() => setConfirm({ kind: 'overwrite', slot })}>
                    <Save size={14} /> Overwrite with current game
                  </Button>
                )}
              </div>
            ) : (
              <div key={slot} className="ag-saverow ag-saverow--empty">
                <div className="ag-grow">
                  <div className="ag-saverow__title">{slotLabel(slot)}</div>
                  <div className="ag-saverow__meta">Empty</div>
                </div>
                {inGame && slot !== 'auto' && (
                  <Button size="sm" disabled={busy} data-testid={`save-here-${slot}`} onClick={() => void doOverwrite(slot)}>
                    <Save size={14} /> Save here
                  </Button>
                )}
              </div>
            );
            if (!prev) return row;
            return (
              <div key={slot} className="ag-slotwrap">
                {row}
                <SaveRow
                  s={prev}
                  busy={busy}
                  onLoad={() => askLoad(prev.slot)}
                  onDelete={async () => {
                    await deleteSlot(prev.slot);
                    void refresh();
                  }}
                />
              </div>
            );
          })}
        </div>
      </Section>
      <Section title="Transfer">
        <div className="ag-row ag-wrap" style={{ gap: 8 }}>
          {inGame && (
            <Button size="sm" onClick={() => { if (exportCurrent()) useUI.getState().toast('Save file downloaded.', 'success'); }}>
              <Download size={14} /> Export save file
            </Button>
          )}
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import into
          </Button>
          <Segmented size="sm" label="Import slot" value={importSlot} onChange={setImportSlot} items={SAVE_SLOTS.filter((s) => s !== 'auto').map((s) => ({ id: s, label: slotLabel(s).replace('Slot ', '#') }))} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              setImportError(null);
              const r = await importFile(f, importSlot);
              if (r.ok) {
                useUI.getState().toast(`Imported into ${slotLabel(importSlot)}.`, 'success');
                void refresh();
              } else setImportError(r.error ?? 'Import failed.');
            }}
          />
        </div>
        {importError && <div className="ag-callout ag-callout--danger">{importError}</div>}
      </Section>
      {inGame && (
        <Section title="Leave">
          <Button
            variant="danger"
            onClick={async () => {
              await saveNow('auto', false);
              sfx('close');
              useUI.getState().set({ panel: null, screen: 'title', selectedCreatureId: null, photoMode: false, partyMode: false, hudHidden: false, tool: 'none' });
            }}
          >
            <LogOut size={16} /> Save and return to title
          </Button>
        </Section>
      )}
      <Modal
        open={confirm?.kind === 'load'}
        onClose={() => setConfirm(null)}
        title={`Load ${slotLabel(confirm?.slot ?? '')}?`}
        subtitle={sameAsRunning ? 'This is an earlier copy of the aquarium you are playing. Your current progress is saved to Autosave first.' : 'Your current game is saved to Autosave first.'}
        width={540}
        testId="load-confirm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            {!sameAsRunning && advice?.freeSlot && (
              <Button
                data-testid="load-confirm-park"
                onClick={async () => {
                  const slot = confirm!.slot;
                  const park = advice.freeSlot!;
                  setConfirm(null);
                  setBusy(true);
                  const ok = await saveNow(park, true);
                  setBusy(false);
                  if (ok) await doLoad(slot);
                  else void refresh();
                }}
              >
                Save to {slotLabel(advice.freeSlot)} &amp; load
              </Button>
            )}
            <Button
              variant="primary"
              data-testid="load-confirm-load"
              onClick={() => {
                const slot = confirm!.slot;
                setConfirm(null);
                void doLoad(slot);
              }}
            >
              Load
            </Button>
          </>
        }
      >
        <p className="ag-muted" style={{ margin: 0 }}>
          {target ? `${describe(target)} replaces what you see now.` : ''} {!sameAsRunning && advice ? advice.text : ''}
        </p>
      </Modal>
      <Modal
        open={confirm?.kind === 'overwrite'}
        onClose={() => setConfirm(null)}
        title={`Replace ${slotLabel(confirm?.slot ?? '')}?`}
        subtitle={target ? `${slotLabel(target.slot)} holds ${describe(target)}.` : undefined}
        width={460}
        testId="overwrite-confirm"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Keep it</Button>
            <Button
              variant="danger"
              data-testid="overwrite-confirm-replace"
              onClick={() => {
                const slot = confirm!.slot;
                setConfirm(null);
                void doOverwrite(slot);
              }}
            >
              Replace
            </Button>
          </>
        }
      >
        <p className="ag-muted" style={{ margin: 0 }}>
          {sameAsRunning
            ? `It will be brought up to date with the aquarium you are playing (Day ${Math.floor((game?.clock.hour ?? 0) / 24) + 1}).`
            : `It will be replaced with ${game?.shopName ?? 'your current game'} (Day ${Math.floor((game?.clock.hour ?? 0) / 24) + 1}). The old copy stays listed as “${slotLabel((confirm?.slot ?? '') + '.backup')}”, so this can be undone.`}
        </p>
      </Modal>
    </>
  );
}

function AboutTab() {
  const dev = useSettings((s) => s.devMode);
  return (
    <>
      <Section title="Aquarium Go">
        <p className="ag-about">
          A living aquarium where every creature is an individual. Every animal, plant, ripple and sound in this game is generated live by code — no stock art, models or recordings.
        </p>
        <p className="ag-about ag-muted">
          Market values are a game economy, never a measure of an animal’s worth. Party mode is just for fun: real fish don’t dance.
        </p>
      </Section>
      <Section title="Credits">
        <div className="ag-credits">
          <div><strong>Fraunces</strong> typeface — Undercase Type · SIL Open Font License 1.1</div>
          <div><strong>Inter</strong> typeface — Rasmus Andersson · SIL Open Font License 1.1</div>
          <div><strong>Lucide</strong> icons — Lucide contributors · ISC License</div>
          <div><strong>Simplex noise (GLSL)</strong> — Ian McEwan &amp; Stefan Gustavson · MIT</div>
          <div className="ag-muted">Built with React, Three.js, React Three Fiber, drei, postprocessing, Zustand, Immer, idb-keyval, Motion and clsx (MIT / Zlib / Apache-2.0).</div>
          <div className="ag-muted">
            <Heart size={12} aria-hidden style={{ verticalAlign: '-1px' }} /> Species facts are drawn from published husbandry and biology sources listed in the encyclopedia.
          </div>
        </div>
      </Section>
      <Section title="Developer">
        <Row label="Developer tools" description="Adds a wrench button with testing tools. Not for normal play." icon={<Wrench size={16} />}>
          <Toggle label="Developer tools" checked={dev} onChange={(v) => useSettings.getState().update({ devMode: v })} />
        </Row>
      </Section>
    </>
  );
}

function SaveNowFooter() {
  const game = useGame((s) => s.game);
  const [busy, setBusy] = useState(false);
  if (!game || game.isShowcase) return null;
  return (
    <div className="ag-row" style={{ gap: 10 }}>
      <span className="ag-grow ag-small ag-muted">Autosave keeps your progress. Save now any time.</span>
      <Button
        variant="primary"
        size="sm"
        data-testid="settings-save"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await saveNow('auto', true);
          setBusy(false);
        }}
      >
        <Save size={14} /> Save now
      </Button>
    </div>
  );
}

export function SettingsPanel() {
  const open = useUI((s) => s.panel === 'settings');
  const inGame = useGame((s) => !!s.game && !s.game.isShowcase);
  const [tab, setTab] = useState<Tab>('general');
  const close = () => useUI.getState().set({ panel: null });
  return (
    <Sheet open={open} onClose={close} side="right" testId="panel-settings" label="Settings" className="ag-settings" title="Settings" subtitle="Saved on this device" footer={inGame ? <SaveNowFooter /> : undefined}>
      <div className="ag-tcard__tabs">
        <Tabs<Tab>
          value={tab}
          onChange={(t) => {
            setTab(t);
            document.querySelector('[data-testid="panel-settings"] .ag-sheet__body')?.scrollTo({ top: 0 });
          }}
          items={[
            { id: 'general', label: 'General' },
            { id: 'display', label: 'Play & access' },
            { id: 'saves', label: 'Saves' },
            { id: 'about', label: 'About' },
          ]}
        />
      </div>
      <div className="ag-tcard__content">
        {tab === 'general' && <GeneralTab />}
        {tab === 'display' && <DisplayTab />}
        {tab === 'saves' && <SavesTab />}
        {tab === 'about' && <AboutTab />}
      </div>
    </Sheet>
  );
}
