/**
 * Naming: the chosen individual gets a name (suggestion chips) and the shop gets its name. Begin creates the
 * real game from the exact individual the player saw. OWNER: lane "ui-shell".
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Dices, Store } from 'lucide-react';
import { getSpecies } from '@/data/species';
import { STARTER_SETUPS, newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { useOnboarding } from './onboarding';
import { Portrait } from '../common/Portrait';
import { personalityLabel, sexRoleText } from '../common/format';
import { aOrAn } from '@/sim/economy/util'; // lane:qa-play
import { Button, Chip, TextField } from '../kit';
import { saveNow } from '../common/saves';
import { safe, useIsMobile } from '../common/safe';

/** The sim keeps names to 24 characters (src/sim/life/actions.ts renameCreature). */
const NAME_MAX = 24;

const SHOP_IDEAS = ['Tidewater Aquatics', 'The Quiet Current', 'Driftwood & Fin', 'Glasshouse Aquarium', 'Little Lagoon', 'Blue Hour Aquatics'];

/**
 * lane:qa-play — personality tags as adjectives: several labels are nouns ("a decor inspector little axolotl",
 * "a explorer betta"), so the blurb uses its own word for each, with the right article.
 */
const TRAIT_ADJECTIVE: Record<string, string> = {
  bold: 'bold',
  shy: 'shy',
  explorer: 'adventurous',
  food_obsessed: 'food-obsessed',
  glass_curious: 'glass-curious',
  nest_builder: 'nest-building',
  homebody: 'home-loving',
  social: 'sociable',
  solitary: 'independent',
  night_owl: 'night-loving',
  showoff: 'showy',
  easily_startled: 'skittish',
  patient_feeder: 'patient',
  competitive_feeder: 'competitive',
  decor_inspector: 'inquisitive',
};

function warmLine(name: string, speciesId: string, personality: string[], morph: string): string {
  const sp = getSpecies(speciesId);
  const who = name.trim() || 'Your new companion';
  const word = personality[0] ? TRAIT_ADJECTIVE[personality[0]] ?? personalityLabel(personality[0]).toLowerCase() : 'curious';
  const trait = `${aOrAn(word)} ${word}`;
  const morphText = !morph || /^wild\s*type$/i.test(morph) ? '' : `${morph.toLowerCase()} `;
  const lines: Record<string, string> = {
    axolotl: `${who} is ${trait} little ${morphText}axolotl, already walking the sand and flicking those feathery gills at you.`,
    betta: `${who} is ${trait} ${morphText}betta who has noticed you — expect a flare of fins when you lean close to the glass.`,
    pea_puffer: `${who} is ${trait} ${morphText}pea puffer, hovering by the glass and swivelling one eye, then the other, to size you up.`,
    ocellaris_clownfish: `${who} is ${trait} ${morphText}clownfish, waddling through the live rock like it owns the place.`,
    lined_seahorse: `${who} is ${trait} ${morphText}lined seahorse, tail wrapped around a branch, watching the water drift by.`,
  };
  return lines[speciesId] ?? `${who} is ${trait} ${sp.commonName.toLowerCase()}, settling into a brand-new home.`;
}

export function NamingScreen() {
  const { starterId, previews, seed, name, shopName, set } = useOnboarding();
  const inputRef = useRef<HTMLInputElement>(null);
  const [starting, setStarting] = useState(false);
  const mobile = useIsMobile();

  useEffect(() => {
    if (!starterId) useUI.getState().set({ screen: 'starter' });
  }, [starterId]);

  if (!starterId) return null;
  const sp = getSpecies(starterId);
  const setup = STARTER_SETUPS[starterId];
  const preview = previews[starterId];
  const sex = preview ? sexRoleText(preview, sp, preview.bornHour + setup.ageDays * 24) : null;
  const finalName = (name.trim() || setup.nameIdeas[0]).slice(0, NAME_MAX);

  const begin = async () => {
    if (starting) return;
    setStarting(true);
    sfx('celebrate');
    const g = safe(
      'newGame',
      () => newGame({ starterId, starterName: finalName, shopName: shopName.trim() || undefined, seed, starterCreature: preview }),
      null,
    );
    if (!g) {
      setStarting(false);
      useUI.getState().toast('Something went wrong creating your aquarium. Please try again.', 'danger');
      return;
    }
    useGame.getState().setGame(g);
    useUI.getState().set({
      screen: 'game',
      view: 'tank',
      focusedTankId: g.tankOrder[0] ?? null,
      selectedCreatureId: null,
      cameraMode: 'front',
      panel: null,
      tool: 'none',
      hudHidden: false,
      pendingStarterId: null,
    });
    await saveNow('auto', false);
  };

  return (
    <motion.div className="ag-screen ag-naming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="ag-reveal__veil" aria-hidden />
      <motion.form
        className="ag-naming__card"
        data-occlude={mobile ? 'bottom' : 'left'}
        onSubmit={(e) => {
          e.preventDefault();
          void begin();
        }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <button type="button" className="ag-backlink" onClick={() => { sfx('close'); useUI.getState().set({ screen: 'starter' }); }}>
          <ArrowLeft size={16} aria-hidden /> Back to the starters
        </button>

        <div className="ag-naming__hero">
          <Portrait subject={preview ?? { speciesId: starterId }} shape="circle" className="ag-naming__art" size={256} />
          <div className="ag-grow">
            <div className="ag-overline">{sp.starterIdentity}</div>
            <h1 className="ag-naming__title">
              Name your <em>{sp.commonName.toLowerCase()}</em>
            </h1>
            <div className="ag-naming__facts">
              {preview && !/^wild\s*type$/i.test(preview.morphName) && <span>{preview.morphName}</span>}
              {sex && <span>{sex.label}</span>}
              {preview?.personality.map((t) => <span key={t}>{personalityLabel(t)}</span>)}
            </div>
          </div>
        </div>

        <p className="ag-naming__warm">{warmLine(finalName, starterId, preview?.personality ?? [], preview?.morphName ?? '')}</p>

        <TextField
          label="Their name"
          placeholder={setup.nameIdeas[0]}
          value={name}
          maxLength={NAME_MAX}
          hint={name.length >= NAME_MAX - 6 ? (name.length >= NAME_MAX ? `${NAME_MAX}/${NAME_MAX} — that’s the longest a name can be.` : `${name.length}/${NAME_MAX} characters`) : undefined}
          autoComplete="off"
          spellCheck={false}
          testId="name-input"
          onChange={(e) => set({ name: e.target.value })}
          id="ag-name-input"
        />
        <div className="ag-naming__ideas" role="group" aria-label="Name ideas">
          {setup.nameIdeas.map((n) => (
            <Chip key={n} selected={name === n} onClick={() => set({ name: n })}>
              {n}
            </Chip>
          ))}
          <Chip
            icon={<Dices size={13} aria-hidden />}
            onClick={() => {
              const pool = setup.nameIdeas.filter((n) => n !== name);
              set({ name: pool[Math.floor(Math.random() * pool.length)] ?? setup.nameIdeas[0] });
            }}
          >
            Surprise me
          </Chip>
        </div>

        <div className="ag-naming__shop">
          <TextField
            label={
              <>
                <Store size={12} aria-hidden style={{ verticalAlign: '-2px' }} /> Your aquarium’s name
              </>
            }
            placeholder="My Aquarium"
            value={shopName}
            maxLength={32}
            autoComplete="off"
            onChange={(e) => set({ shopName: e.target.value })}
          />
          <div className="ag-naming__ideas ag-naming__ideas--quiet">
            {SHOP_IDEAS.slice(0, 4).map((n) => (
              <Chip key={n} size="sm" selected={shopName === n} onClick={() => set({ shopName: n })}>
                {n}
              </Chip>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" block data-testid="name-confirm" disabled={starting}>
          <span className="ag-naming__begin">{starting ? 'Filling the tank…' : `Begin with ${finalName}`}</span> <ArrowRight size={18} aria-hidden />
        </Button>
        <p className="ag-naming__foot">Your tank arrives established and safe — the filter is already mature.</p>
      </motion.form>
      <FocusName inputRef={inputRef} />
    </motion.div>
  );
}

/** Focus the name input after the entrance animation (TextField does not forward refs). */
function FocusName({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = (inputRef.current ?? document.getElementById('ag-name-input')) as HTMLInputElement | null;
      if (el && window.matchMedia('(pointer: fine)').matches) el.focus();
    }, 500);
    return () => window.clearTimeout(t);
  }, [inputRef]);
  return null;
}
