/**
 * Individual-profile and species care-fact blocks shared by shop, wizard, encyclopedia. OWNER: lane "ui-panels".
 * Potentials are shown as descriptive bands (Ordinary → Remarkable), never raw numbers, and never as moral worth.
 */
import { Thermometer, Droplets, Waves, Ruler, Gauge, Utensils, Users, Shield } from 'lucide-react';
import type { Potentials, SpeciesDefinition } from '@/types';
import { potentialBand, structureLabel as lifeStructureLabel, temperamentWord as lifeTemperamentWord, curiosityWord as lifeCuriosityWord } from '@/sim/life';
import { Chip } from './parts';
import { DIFFICULTY_LABEL, DIFFICULTY_TONE, TEMPERAMENT_LABEL, DIET_LABEL, type ChipTone } from './format';
import { safe, useTempText } from './hooks';

const BAND_TONE: Record<string, ChipTone> = { Remarkable: 'gold', Exceptional: 'violet', Promising: 'aqua', Ordinary: 'neutral' };

export function structureLabel(sp: SpeciesDefinition | undefined): string {
  if (sp) {
    const l = safe(() => lifeStructureLabel(sp), '');
    if (l) return l;
  }
  switch (sp?.behaviorSet) {
    case 'axolotl':
      return 'Gill fullness';
    case 'betta':
    case 'gourami':
    case 'livebearer':
    case 'goldfish':
      return 'Fin form';
    case 'seahorse':
      return 'Body form';
    case 'clownfish':
      return 'Band quality';
    case 'pea_puffer':
      return 'Body shape';
    default:
      return sp?.category === 'invertebrate' ? 'Form' : 'Body & fins';
  }
}

export function band(v: number): string {
  return safe(() => potentialBand(v), v >= 90 ? 'Remarkable' : v >= 75 ? 'Exceptional' : v >= 55 ? 'Promising' : 'Ordinary');
}

export function temperamentWord(v: number): string {
  const w = safe(() => lifeTemperamentWord(v), '');
  if (w) return w;
  return v >= 75 ? 'Very bold' : v >= 58 ? 'Bold' : v >= 42 ? 'Balanced' : v >= 25 ? 'Timid' : 'Very timid';
}
export function curiosityWord(v: number): string {
  const w = safe(() => lifeCuriosityWord(v), '');
  if (w) return w;
  return v >= 75 ? 'Very curious' : v >= 58 ? 'Curious' : v >= 42 ? 'Easy-going' : 'Reserved';
}

/** Potential bands as a compact list. `highlightOnly` shows only Promising+ traits (card summaries). */
export function PotentialBands({ p, sp, highlightOnly, max = 8 }: { p: Potentials; sp?: SpeciesDefinition; highlightOnly?: boolean; max?: number }) {
  const rows: { k: string; label: string; v: number }[] = [
    { k: 'color', label: 'Colour', v: p.color },
    { k: 'pattern', label: 'Pattern', v: p.pattern },
    { k: 'structure', label: structureLabel(sp), v: p.structure },
    { k: 'size', label: 'Size', v: p.size },
    { k: 'hardiness', label: 'Hardiness', v: p.hardiness },
    { k: 'fertility', label: 'Fertility', v: p.fertility },
  ];
  const list = (highlightOnly ? rows.filter((r) => r.v >= 55).sort((a, b) => b.v - a.v) : rows).slice(0, max);
  if (highlightOnly && list.length === 0) return <span className="pn-small pn-muted">A steady, healthy individual.</span>;
  return (
    <div className={highlightOnly ? 'pn-chips' : 'pn-bands'}>
      {list.map((r) =>
        highlightOnly ? (
          <Chip key={r.k} tone={BAND_TONE[band(r.v)]}>
            {r.label}: {band(r.v)}
          </Chip>
        ) : (
          <div key={r.k} className="pn-band">
            <span className="pn-band__label">{r.label}</span>
            <span className={`pn-band__pips pn-band__pips--${band(r.v).toLowerCase()}`} aria-hidden>
              {[55, 75, 90].map((t, i) => (
                <i key={i} className={r.v >= t ? 'on' : ''} />
              ))}
            </span>
            <Chip tone={BAND_TONE[band(r.v)]}>{band(r.v)}</Chip>
          </div>
        ),
      )}
      {!highlightOnly && (
        <>
          <div className="pn-band">
            <span className="pn-band__label">Temperament</span>
            <span className="pn-band__word">{temperamentWord(p.temperament)}</span>
          </div>
          <div className="pn-band">
            <span className="pn-band__label">Curiosity</span>
            <span className="pn-band__word">{curiosityWord(p.curiosity)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** Care stat chips (temp, pH, salinity, min tank, difficulty…). */
export function CareChips({ sp, full, hideDifficulty }: { sp: SpeciesDefinition; full?: boolean; hideDifficulty?: boolean }) {
  const { t } = useTempText();
  return (
    <div className="pn-chips">
      <Chip icon={<Thermometer size={12} />} title={t(`Tolerates ${sp.tempC.min}–${sp.tempC.max} °C`)}>
        {t(`${sp.tempC.idealMin}–${sp.tempC.idealMax} °C`)}
      </Chip>
      <Chip icon={<Droplets size={12} />} title={`Tolerates pH ${sp.pH.min}–${sp.pH.max}`}>
        pH {sp.pH.idealMin}–{sp.pH.idealMax}
      </Chip>
      {sp.salinitySG && (
        <Chip icon={<Waves size={12} />} title="Specific gravity">
          SG {sp.salinitySG.idealMin.toFixed(3)}–{sp.salinitySG.idealMax.toFixed(3)}
        </Chip>
      )}
      <Chip icon={<Gauge size={12} />}>{sp.recommendedMinTankGallons}+ gal</Chip>
      {!hideDifficulty && <Chip tone={DIFFICULTY_TONE[sp.difficulty]}>{DIFFICULTY_LABEL[sp.difficulty]}</Chip>}
      {full && (
        <>
          <Chip icon={<Ruler size={12} />}>{sp.adultSizeCm} cm adult</Chip>
          <Chip icon={<Shield size={12} />}>{TEMPERAMENT_LABEL[sp.temperament]}</Chip>
          <Chip icon={<Utensils size={12} />}>{DIET_LABEL[sp.diet]}</Chip>
          <Chip icon={<Users size={12} />}>{socialWord(sp)}</Chip>
        </>
      )}
    </div>
  );
}

export function socialWord(sp: SpeciesDefinition): string {
  const k = sp.social.kind;
  switch (k) {
    case 'solitary':
      return 'Keep alone';
    case 'solitary_or_pair':
      return 'Alone or a pair';
    case 'pair':
      return 'Pairs';
    case 'pair_hierarchy':
      return 'Bonded pair';
    case 'harem':
      return 'Harem';
    case 'group':
      return `Groups of ${sp.social.idealGroup}+`;
    case 'shoal':
      return `Shoal of ${sp.social.minGroup}+`;
    case 'school':
      return `School of ${sp.social.minGroup}+`;
    case 'colony':
      return 'Colony';
    default:
      return 'Social';
  }
}
