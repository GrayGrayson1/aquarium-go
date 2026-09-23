/**
 * Gallery data for the fishart sandboxes: every fish species (from the roster) plus curated morph variants built by
 * applying the species' own phenotype rules. OWNER: lane "fishart" (dev only).
 */
import * as THREE from 'three';
import type { Creature, CreatureRuntime, CreatureVisualParams, SpeciesDefinition } from '@/types';
import { ROSTER } from '@/data/species/roster';
import { findSpecies } from '@/data/species';

export interface GalleryEntry {
  key: string;
  label: string;
  species: SpeciesDefinition;
  creature: Creature | null;
  appearance: CreatureVisualParams;
  phase: number;
  scale: number;
  puff?: number;
  flutter?: number;
}

const FALLBACK_VISUAL: CreatureVisualParams = {
  bodyColor: '#9aa6a0',
  bodyColor2: '#5d6b66',
  bellyColor: '#e7e9e2',
  finColor: '#b9c4c0',
  finColor2: '#e2e8e4',
  accentColor: '#2a3230',
  eyeColor: '#c9b060',
  pattern: 'solid',
  patternScale: 1,
  patternContrast: 0.6,
  patternSeed: 7,
  iridescence: 0.3,
  metallic: 0.2,
  translucency: 0.3,
  finType: 'default',
  finLength: 1,
  bodyDepth: 1,
  gillFullness: 0,
};

function stubSpecies(id: string): SpeciesDefinition {
  const r = ROSTER.find((x) => x.id === id);
  return {
    id,
    commonName: r?.commonName ?? id,
    scientificName: r?.scientificName ?? '',
    behaviorSet: r?.behaviorSet ?? 'schooling_small',
    genetics: { loci: [], phenotypes: [], baseVisual: FALLBACK_VISUAL, variation: 0, notes: '' },
    adultSizeCm: 5,
  } as unknown as SpeciesDefinition;
}

/** Apply named phenotype rules (base first, overlays after) onto the species base visual. */
export function morph(sp: SpeciesDefinition, ids: string[], extra: Partial<CreatureVisualParams> = {}): CreatureVisualParams {
  let v: CreatureVisualParams = { ...sp.genetics.baseVisual };
  const rules = sp.genetics.phenotypes ?? [];
  for (const id of ids) {
    const r = rules.find((x) => x.id === id);
    if (r) v = { ...v, ...r.visual };
  }
  return { ...v, ...extra };
}

function fakeCreature(sp: SpeciesDefinition, id: string, sex: Creature['sex'] = 'male'): Creature {
  return { id, speciesId: sp.id, sex, reproRole: sex === 'female' ? 'female' : 'male', lifeStage: 'adult', sizeCm: sp.adultSizeCm } as unknown as Creature;
}

/** Curated morph variants per species (ids from each species' phenotype rules). Unknown ids are ignored. */
const VARIANTS: Record<string, { label: string; ids: string[]; extra?: Partial<CreatureVisualParams>; sex?: Creature['sex']; puff?: number }[]> = {
  betta: [
    { label: 'Red Veiltail', ids: ['red', 'veil'] },
    { label: 'Royal Blue Halfmoon', ids: ['royal', 'halfmoon'] },
    { label: 'Turquoise Crowntail', ids: ['turq', 'crown'] },
    { label: 'Steel Plakat', ids: ['steel', 'plakat'] },
    { label: 'Copper Dragon HM', ids: ['copper', 'dragon', 'halfmoon'] },
    { label: 'Black Melano DT', ids: ['black', 'double'] },
    { label: 'Yellow Veiltail', ids: ['yellow', 'veil'] },
    { label: 'Opaque White HM', ids: ['white', 'halfmoon'] },
    { label: 'Marble Crowntail', ids: ['red', 'marble', 'crown'] },
    { label: 'Butterfly Halfmoon', ids: ['royal', 'butterfly', 'halfmoon'] },
    { label: 'Bi-colour Veil', ids: ['mixed', 'bicolor', 'veil'] },
    { label: 'Female (Red)', ids: ['red', 'veil'], sex: 'female' },
  ],
  pea_puffer: [
    { label: 'Wild Type', ids: ['wild'] },
    { label: 'Golden', ids: ['golden'] },
    { label: 'Bold-spotted male', ids: ['wild', 'bold'], sex: 'male' },
    { label: 'Puffed (fright)', ids: ['wild'], puff: 1 },
  ],
  ocellaris_clownfish: [
    { label: 'Orange Ocellaris', ids: ['orange'] },
    { label: 'Black Ocellaris', ids: ['black'] },
    { label: 'Snowflake', ids: ['snowflake'] },
    { label: 'Platinum', ids: ['platinum'] },
    { label: 'Misbar', ids: ['orange', 'misbar'] },
  ],
  // lane:brackish — estuary species
  figure_eight_puffer: [
    { label: 'Wild Type', ids: ['wild'] },
    { label: 'Golden', ids: ['golden'] },
    { label: 'Bold-ringed', ids: ['wild', 'bold_rings'] },
    { label: 'Puffed (fright)', ids: ['wild'], puff: 1 },
  ],
  bumblebee_goby: [
    { label: 'Wild male', ids: ['wild'], sex: 'male' },
    { label: 'Wild female', ids: ['wild'], sex: 'female' },
    { label: 'Deep Gold', ids: ['deep_gold'] },
    { label: 'Broad-banded', ids: ['wild', 'broad_bands'] },
  ],
  sailfin_molly: [
    { label: 'Wild male', ids: ['wild'], sex: 'male' },
    { label: 'Wild female', ids: ['wild'], sex: 'female' },
    { label: 'Black male', ids: ['black'], sex: 'male' },
    { label: 'Black female', ids: ['black'], sex: 'female' },
    { label: 'Dalmatian male', ids: ['dalmatian'], sex: 'male' },
    { label: 'Dalmatian female', ids: ['dalmatian'], sex: 'female' },
    { label: 'Gold male', ids: ['gold'], sex: 'male' },
    { label: 'Gold Lyretail male', ids: ['gold', 'lyretail'], sex: 'male' },
    { label: 'Black Lyretail male', ids: ['black', 'lyretail'], sex: 'male' },
    { label: 'Dalmatian Lyretail female', ids: ['dalmatian', 'lyretail'], sex: 'female' },
  ],
  banded_archerfish: [
    { label: 'Banded', ids: ['wild'] },
    { label: 'Bold-banded', ids: ['wild', 'rich_colour'] },
  ],
};

export function galleryEntries(only: string[] | null): GalleryEntry[] {
  const out: GalleryEntry[] = [];
  const fish = ROSTER.filter((r) => r.visual === 'fish' && (!only || only.includes(r.id) || only.includes('all')));
  let n = 0;
  for (const r of fish) {
    const sp = findSpecies(r.id) ?? stubSpecies(r.id);
    const vars = VARIANTS[r.id];
    const size = sp.adultSizeCm ?? 5;
    const scale = Math.max(0.55, Math.min(1, 0.55 + Math.log10(Math.max(1, size)) * 0.25));
    const focused = !!only && only.includes(r.id);
    if (vars) {
      const list = focused ? vars : vars.slice(0, 3);
      for (const v of list) {
        n++;
        const app = morph(sp, v.ids, { patternSeed: 101 + n * 37, ...(v.extra ?? {}) });
        out.push({ key: `${r.id}:${v.label}`, label: `${sp.commonName} · ${v.label}`, species: sp, creature: fakeCreature(sp, `${r.id}-${n}`, v.sex ?? 'male'), appearance: app, phase: n * 1.37, scale, puff: v.puff });
      }
    } else {
      // species morphs from its own phenotype list: every base rule, then every overlay applied on the first base
      const phen = sp.genetics.phenotypes ?? [];
      const bases = phen.filter((p) => p.layer === 'base' && p.when.length).slice(0, focused ? 10 : 2);
      const overlays = focused ? phen.filter((p) => p.layer === 'overlay').slice(0, 14) : [];
      const list: { label: string; ids: string[]; sex?: Creature['sex'] }[] = [{ label: 'Base', ids: [] }, ...bases.map((b) => ({ label: b.name, ids: [b.id] }))];
      if (!focused) list.splice(2);
      const first = bases[0]?.id;
      for (const o of overlays) list.push({ label: `+ ${o.name}`, ids: first ? [first, o.id] : [o.id] });
      if (focused) list.push({ label: 'Female', ids: first ? [first] : [], sex: 'female' });
      for (const v of list) {
        n++;
        out.push({ key: `${r.id}:${v.label}:${n}`, label: `${sp.commonName} · ${v.label}`, species: sp, creature: fakeCreature(sp, `${r.id}-${n}`, v.sex ?? 'male'), appearance: morph(sp, v.ids, { patternSeed: 101 + n * 37 }), phase: n * 1.37, scale });
      }
    }
  }
  return out;
}

export function makeRuntime(speciesId: string): CreatureRuntime {
  return {
    id: 'gallery',
    speciesId,
    tankId: 'gallery',
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    speedBL: 0.5,
    swimPhase: 0,
    bend: 0,
    finFlare: 0,
    gillFlick: 0,
    mouthOpen: 0,
    eyeL: 0,
    eyeR: 0,
    flutter: 0,
    tailCurl: 0,
    puff: 0,
    belly: 0,
    colorIntensity: 0.9,
    pose: 'swim',
    behavior: 'gallery',
    lengthM: 0.05,
    visible: true,
    selected: false,
    ai: {},
  };
}
