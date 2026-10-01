/**
 * Starter reveal: five cards turn over in sequence; choosing one swaps the living tank behind the UI to that
 * starter's opening aquarium. OWNER: lane "ui-shell".
 */
import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Snowflake, Leaf, WavesHorizontal, Sun, GraduationCap, Compass, Sparkles } from 'lucide-react';
import { STARTER_IDS, getSpecies, type StarterId } from '@/data/species';
import { STARTER_SETUPS } from '@/sim/newGame';
import type { WaterClass, Creature } from '@/types';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { useOnboarding } from './onboarding';
import { Portrait } from '../common/Portrait';
import { DIFFICULTY_LABEL, WATER_CLASS_LABEL, personalityLabel, personalityLine, sexRoleText } from '../common/format';
import { Button, Chip } from '../kit';
import { SHORT_LANDSCAPE_QUERY, useIsMobile, useMedia } from '../common/safe';

export function WaterIcon({ wc, size = 13 }: { wc: WaterClass; size?: number }) {
  if (wc === 'freshwater_cool') return <Snowflake size={size} aria-hidden />;
  if (wc === 'freshwater_planted') return <Leaf size={size} aria-hidden />;
  if (wc === 'freshwater_tropical') return <Sun size={size} aria-hidden />;
  return <WavesHorizontal size={size} aria-hidden />;
}

const WATER_TONE: Record<string, 'aqua' | 'good' | 'violet' | 'gold'> = {
  freshwater_cool: 'aqua',
  freshwater_planted: 'good',
  freshwater_tropical: 'gold',
};

export function WaterChip({ wc, size }: { wc: WaterClass; size?: 'sm' | 'md' }) {
  return (
    <Chip tone={WATER_TONE[wc] ?? 'violet'} icon={<WaterIcon wc={wc} />} size={size}>
      {WATER_CLASS_LABEL[wc]}
    </Chip>
  );
}

function DifficultyPips({ id }: { id: StarterId }) {
  const d = DIFFICULTY_LABEL[getSpecies(id).difficulty] ?? DIFFICULTY_LABEL.intermediate;
  return (
    <span className={clsx('ag-pips', `ag-pips--${d.tone}`)} title={`${d.label} difficulty`}>
      <span className="ag-pips__row" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= d.pips ? 'on' : ''} />
        ))}
      </span>
      <span>{d.label}</span>
    </span>
  );
}

function isWild(m: string | undefined) {
  return !m || /^wild\s*type$/i.test(m);
}

function StarterCard({ id, index, preview, selected, onSelect }: { id: StarterId; index: number; preview?: Creature; selected: boolean; onSelect: () => void }) {
  const sp = getSpecies(id);
  const setup = STARTER_SETUPS[id];
  return (
    <motion.button
      type="button"
      className={clsx('ag-starter', selected && 'is-selected')}
      data-testid={`starter-card-${id}`}
      aria-pressed={selected}
      aria-label={`${sp.starterIdentity ?? sp.commonName}: ${sp.commonName}`}
      onClick={onSelect}
      initial={{ opacity: 0, y: 40, rotateY: -80, scale: 0.92 }}
      animate={{ opacity: 1, y: selected ? -8 : 0, rotateY: 0, scale: 1 }}
      transition={{ delay: 0.25 + index * 0.16, type: 'spring', stiffness: 170, damping: 22 }}
      style={{ transformPerspective: 900 }}
    >
      <span className="ag-starter__shine" aria-hidden />
      {/* lane:fix-panels — the card is 192px wide (cover-cropped), so 192 (×DPR) is all it can show; each portrait renders while the cards animate in, and the job's cost scales with its pixels */}
      <Portrait subject={preview ?? { speciesId: id }} shape="card" className="ag-starter__art" size={192} />
      <span className="ag-starter__body">
        <span className="ag-starter__identity">{sp.starterIdentity}</span>
        <span className="ag-starter__name">{sp.commonName}</span>
        <span className="ag-starter__meta">
          <WaterIcon wc={setup.waterClass} size={12} /> {WATER_CLASS_LABEL[setup.waterClass]}
        </span>
      </span>
    </motion.button>
  );
}

function StarterDetail({ id, preview }: { id: StarterId; preview?: Creature }) {
  const sp = getSpecies(id);
  const setup = STARTER_SETUPS[id];
  const sex = preview ? sexRoleText(preview, sp, preview.bornHour + setup.ageDays * 24) : null;
  return (
    <motion.div
      key={id}
      className="ag-sdetail"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10, transition: { duration: 0.14 } }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="ag-sdetail__identity">{sp.starterIdentity}</div>
      <h2 className="ag-sdetail__name">{sp.commonName}</h2>
      <div className="ag-sdetail__sci">{sp.scientificName}</div>
      <p className="ag-sdetail__blurb">{sp.starterBlurb}</p>

      <div className="ag-sdetail__chips">
        <WaterChip wc={setup.waterClass} />
        <DifficultyPips id={id} />
      </div>

      <div className="ag-sdetail__facts">
        <div className="ag-sfact">
          <GraduationCap size={16} aria-hidden />
          <div>
            <div className="ag-sfact__label">What it teaches</div>
            <div className="ag-sfact__text">{setup.teaches}</div>
          </div>
        </div>
        <div className="ag-sfact">
          <Compass size={16} aria-hidden />
          <div>
            <div className="ag-sfact__label">Your path</div>
            <div className="ag-sfact__text">{setup.pathNote}</div>
          </div>
        </div>
      </div>

      {preview && (
        <div className="ag-sdetail__individual">
          <div className="ag-sfact__label">
            <Sparkles size={12} aria-hidden /> This individual
          </div>
          <div className="ag-sdetail__indline">
            {isWild(preview.morphName) ? 'Wild-type colouring' : preview.morphName}
            {sex && ` · ${sex.label}`}
          </div>
          <div className="ag-sdetail__traits">
            {preview.personality.map((t) => (
              <span className="ag-trait" key={t} title={personalityLine(t)}>
                <strong>{personalityLabel(t)}</strong>
                <span>{personalityLine(t)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function StarterReveal() {
  const { previews, starterId, choose } = useOnboarding();
  const mobile = useIsMobile();
  // a phone held sideways keeps the desktop arrangement (left column + low rail; screens.css)
  const sideways = useMedia(SHORT_LANDSCAPE_QUERY);
  const band = mobile && !sideways;
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!Object.keys(useOnboarding.getState().previews).length) useOnboarding.getState().begin();
  }, []);

  // keyboard: ← → to browse, Enter to confirm
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const cur = useOnboarding.getState().starterId;
      const idx = cur ? STARTER_IDS.indexOf(cur) : -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const n = e.key === 'ArrowRight' ? (idx + 1) % STARTER_IDS.length : (idx - 1 + STARTER_IDS.length) % STARTER_IDS.length;
        sfx('hover');
        useOnboarding.getState().choose(STARTER_IDS[n]);
      } else if (e.key === 'Enter' && cur && !(e.target as HTMLElement)?.closest?.('button, a, input')) {
        confirm();
      } else if (e.key === 'Escape') {
        useUI.getState().set({ screen: 'title' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // keep the chosen card in view on phones
  useEffect(() => {
    if (!starterId || !railRef.current) return;
    const el = railRef.current.querySelector<HTMLElement>(`[data-testid="starter-card-${starterId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [starterId]);

  const confirm = () => {
    if (!useOnboarding.getState().starterId) return;
    sfx('confirm');
    useUI.getState().set({ screen: 'naming' });
  };

  const cards = useMemo(() => STARTER_IDS, []);

  return (
    <motion.div className="ag-screen ag-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="ag-reveal__veil" aria-hidden />
      {/* camera framing: details (left; phones: bottom), card rail (bottom); on phones the title is a top band (on wider
          screens it sits above the detail column, which already covers that side) */}
      <header className="ag-reveal__head" data-occlude={band ? 'top' : 'left'}>
        <button type="button" className="ag-backlink" onClick={() => { sfx('close'); useUI.getState().set({ screen: 'title' }); }}>
          <ArrowLeft size={16} aria-hidden /> Title
        </button>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="ag-overline">Chapter one</div>
          <h1 className="ag-reveal__title">Choose your first companion</h1>
          {!mobile && <p className="ag-reveal__sub">Five animals, five very different first chapters. You can welcome the others later.</p>}
        </motion.div>
      </header>

      <div className="ag-reveal__detail" data-occlude={band ? 'bottom' : 'left'}>
        <div className="ag-reveal__detailScroll">
          <AnimatePresence mode="wait">
            {starterId ? (
              <StarterDetail key={starterId} id={starterId} preview={previews[starterId]} />
            ) : (
              <motion.p
                key="hint"
                className="ag-reveal__hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.6 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                Pick a card to meet them — their home will appear behind you.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="ag-reveal__cta">
          <Button variant="primary" size="lg" data-testid="starter-confirm" disabled={!starterId} onClick={confirm}>
            {starterId ? `Choose the ${getSpecies(starterId).commonName.toLowerCase()}` : 'Choose a companion'} <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="ag-reveal__bottom" data-occlude="bottom">
        <div className="ag-reveal__rail" ref={railRef} role="listbox" aria-label="Starter creatures">
          {cards.map((id, i) => (
            <StarterCard
              key={id}
              id={id}
              index={i}
              preview={previews[id]}
              selected={starterId === id}
              onSelect={() => {
                sfx(starterId === id ? 'click' : 'open');
                choose(id);
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
