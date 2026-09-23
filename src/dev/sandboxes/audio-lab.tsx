/**
 * Audio lab sandbox (?sandbox=audio-lab). OWNER: lane "audio".
 * Audition every SFX, force music moods, toggle ambience equipment/view/visitors, run party mode and watch the
 * music-reactive values live.
 */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AudioRoot } from '@/audio/AudioRoot';
import { sfx, SFX_IDS } from '@/audio/sfx';
import { unlockAudio, meterReading } from '@/audio/engine';
import { forceMood, setVisitorPresence } from '@/audio/director';
import { startPartyMode, stopPartyMode } from '@/audio/party';
import { useAudioStore } from '@/audio/store';
import { audioReactive } from '@/runtime/audioReactive';
import type { MusicMood } from '@/audio/theory';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { useSettings } from '@/state/settings';
import { FIXTURES } from '@/dev/fixtures';
import type { EquipmentInstance } from '@/types';

const MOOD_LIST: (MusicMood | null)[] = [null, 'title', 'tank', 'facility', 'night', 'market', 'off'];
const EQUIP = ['filter_hob_small', 'filter_canister', 'filter_sponge', 'airstone', 'powerhead_small', 'skimmer_hob', 'fan_clip'];

const box: React.CSSProperties = { background: 'rgba(20,30,40,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 12, marginBottom: 12 };
const btn: React.CSSProperties = { margin: 3, padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: '#12303a', color: '#dff', cursor: 'pointer', font: '12px Inter, sans-serif' };

export default function AudioLab() {
  const status = useAudioStore();
  const settings = useSettings();
  const ui = useUI();
  const [mood, setMood] = useState<MusicMood | null>(null);
  const [equip, setEquip] = useState<string[]>([]);
  const [visitors, setVisitors] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [meter, setMeter] = useState({ rms: 0, peak: 0 });

  // a real world so the director has a tank + facility to listen to
  useEffect(() => {
    if (!useGame.getState().game) {
      const g = FIXTURES.betta?.();
      if (g) {
        useGame.getState().setGame(g);
        useUI.getState().set({ screen: 'game', view: 'tank', focusedTankId: g.tankOrder[0] ?? null });
      }
    }
  }, []);

  useEffect(() => {
    const tid = useUI.getState().focusedTankId;
    useGame.getState().mutate((d) => {
      const t = tid ? d.tanks[tid] : null;
      if (!t) return;
      t.equipment = t.equipment.filter((e) => !e.id.startsWith('lab_'));
      for (const defId of equip) t.equipment.push({ id: `lab_${defId}`, defId, installedHour: 0, condition: 1, on: true } as EquipmentInstance);
    });
  }, [equip]);

  useEffect(() => setVisitorPresence(visitors > 0 ? visitors : null), [visitors]);

  // live meters
  useEffect(() => {
    let raf = 0;
    const hist: number[] = [];
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvas.current;
      if (!c) return;
      const g = c.getContext('2d');
      if (!g) return;
      const W = c.width;
      const H = c.height;
      g.fillStyle = '#081418';
      g.fillRect(0, 0, W, H);
      const r = audioReactive;
      const bars: [string, number, string][] = [
        ['level', r.level, '#5EEAD4'],
        ['bass', r.bass, '#FF8A65'],
        ['mid', r.mid, '#F5C451'],
        ['treble', r.treble, '#a5b4fc'],
        ['beat', r.beat, '#ffffff'],
      ];
      bars.forEach(([name, v, col], i) => {
        g.fillStyle = col;
        g.fillRect(10 + i * 70, H - 20 - v * (H - 50), 50, v * (H - 50));
        g.fillStyle = '#9bb';
        g.font = '11px Inter, sans-serif';
        g.fillText(name, 10 + i * 70, H - 6);
      });
      g.fillStyle = `hsl(${r.hue * 360}, 80%, ${40 + r.beat * 30}%)`;
      g.fillRect(370, 20, 60, 60);
      g.fillStyle = '#9bb';
      g.fillText(`hue ${r.hue.toFixed(2)} · ${r.source}`, 360, 100);
      const m = meterReading();
      hist.push(m.rms);
      if (hist.length > 200) hist.shift();
      g.strokeStyle = '#5EEAD4';
      g.beginPath();
      hist.forEach((v, i) => {
        const y = 150 - Math.min(1, v * 8) * 120;
        if (i === 0) g.moveTo(450 + i, y);
        else g.lineTo(450 + i, y);
      });
      g.stroke();
      g.fillText('master RMS', 450, 145);
    };
    raf = requestAnimationFrame(draw);
    const id = setInterval(() => setMeter(meterReading()), 250);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const db = (v: number) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : '-∞');

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: 'radial-gradient(circle at 30% 20%, #10323c, #050b0e)', color: '#dff', font: '13px Inter, sans-serif', padding: 20 }} onPointerDown={() => unlockAudio()}>
      <AudioRoot />
      <h1 style={{ font: '600 26px Fraunces, serif', margin: '0 0 12px' }}>Audio Lab</h1>
      <div style={box}>
        <b>Engine</b> — {status.supported ? 'Web Audio supported' : 'no Web Audio'} · context: {status.contextState} · unlocked: {String(status.unlocked)} · mood: {status.mood} · master {db(meter.rms)} dBFS rms / {db(meter.peak)} peak
        {!status.unlocked && <div style={{ color: '#F5C451' }}>Click anywhere to unlock audio.</div>}
      </div>
      <div style={box}>
        <b>SFX</b>
        <div>
          {SFX_IDS.map((id) => (
            <button key={id} style={btn} onClick={() => sfx(id)} onMouseEnter={() => id === 'hover' && sfx('hover')}>
              {id}
            </button>
          ))}
        </div>
      </div>
      <div style={box}>
        <b>Music mood</b>
        <div>
          {MOOD_LIST.map((m) => (
            <button key={String(m)} style={{ ...btn, background: mood === m ? '#1f5f6b' : btn.background }} onClick={() => { setMood(m); forceMood(m); }}>
              {m ?? 'auto'}
            </button>
          ))}
        </div>
      </div>
      <div style={box}>
        <b>Ambience</b> — view:{' '}
        {(['tank', 'facility'] as const).map((v) => (
          <button key={v} style={{ ...btn, background: ui.view === v ? '#1f5f6b' : btn.background }} onClick={() => useUI.getState().set({ view: v })}>
            {v}
          </button>
        ))}
        <div>
          {EQUIP.map((id) => (
            <label key={id} style={{ marginRight: 12 }}>
              <input type="checkbox" checked={equip.includes(id)} onChange={(e) => setEquip((cur) => (e.target.checked ? [...cur, id] : cur.filter((x) => x !== id)))} /> {id}
            </label>
          ))}
        </div>
        <div>
          visitors {visitors.toFixed(2)} <input type="range" min={0} max={1} step={0.01} value={visitors} onChange={(e) => setVisitors(+e.target.value)} />
        </div>
      </div>
      <div style={box}>
        <b>Volumes</b>
        {(['master', 'music', 'aquarium', 'ui'] as const).map((k) => (
          <span key={k} style={{ marginRight: 14 }}>
            {k} <input type="range" min={0} max={1} step={0.01} value={settings.volume[k]} onChange={(e) => settings.setVolume(k, +e.target.value)} />
          </span>
        ))}
        <label>
          <input type="checkbox" checked={settings.muted} onChange={(e) => settings.update({ muted: e.target.checked })} /> muted
        </label>
      </div>
      <div style={box}>
        <b>Party mode</b> — status: {status.partyStatus} {status.partyMessage ? `(${status.partyMessage})` : ''}
        <div>
          {/* same path as the game: the UI flips ui.partyMode; AudioRoot's director starts/stops party mode */}
          <button style={btn} onClick={() => { settings.update({ partyUseMicrophone: false }); useUI.getState().set({ partyMode: true }); }}>start (built-in groove)</button>
          <button style={btn} onClick={() => { settings.update({ partyUseMicrophone: true }); useUI.getState().set({ partyMode: true }); }}>start (microphone)</button>
          <button style={btn} onClick={() => useUI.getState().set({ partyMode: false })}>stop</button>
          <button style={btn} onClick={() => void startPartyMode({ mic: false })}>direct API start</button>
          <button style={btn} onClick={() => stopPartyMode()}>direct API stop</button>
        </div>
        <canvas ref={canvas} width={660} height={160} style={{ marginTop: 8, borderRadius: 8 }} />
      </div>
    </div>
  );
}

/** Mount the lab into a bare page (see audio-standalone.html) — independent of App/Scene. */
export function mountAudioLab(el: HTMLElement | null): void {
  if (!el) return;
  createRoot(el).render(<AudioLab />);
}
