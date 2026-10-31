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

function fakeCreature(sp: SpeciesDefinition, id: string, sex: Creature['sex'] = 'male', stage: Creature['lifeStage'] = 'adult'): Creature {
  return { id, speciesId: sp.id, sex, reproRole: sex === 'female' ? 'female' : 'male', lifeStage: stage, sizeCm: sp.adultSizeCm } as unknown as Creature;
}

/** Curated morph variants per species (ids from each species' phenotype rules). Unknown ids are ignored. */
const VARIANTS: Record<string, { label: string; ids: string[]; extra?: Partial<CreatureVisualParams>; sex?: Creature['sex']; puff?: number; stage?: Creature['lifeStage'] }[]> = {
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
  // chunk 16 — young and sex colours
  emperor_angelfish: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  sailfin_tang: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  chocolate_tang: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile (yellow mimic)', ids: [], stage: 'juvenile' },
  ],
  lyretail_anthias: [
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Male', ids: [], sex: 'male' },
    { label: 'Juvenile', ids: [], sex: 'female', stage: 'juvenile' },
  ],
  melanurus_wrasse: [
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Male', ids: [], sex: 'male' },
    { label: 'Juvenile', ids: [], sex: 'female', stage: 'juvenile' },
  ],
  maroon_clownfish: [
    { label: 'White Stripe', ids: ['white_stripe'], sex: 'male' },
    { label: 'Gold Stripe', ids: ['gold_stripe'], sex: 'male' },
    { label: 'Lightning', ids: ['lightning'], sex: 'male' },
    { label: 'Female', ids: ['white_stripe'], sex: 'female' },
    { label: 'Juvenile', ids: ['white_stripe'], stage: 'juvenile' },
  ],
  // chunk 16, wave C — the freshwater forms, sexes and young
  freshwater_angelfish: [
    { label: 'Silver', ids: [] },
    { label: 'Marble', ids: ['marble'] },
    { label: 'Koi', ids: ['gold_marble', 'blushing', 'koi_white'] },
    { label: 'Black Lace', ids: ['black_lace'] },
    { label: 'Black', ids: ['black'] },
    { label: 'Gold', ids: ['gold'] },
    { label: 'Zebra', ids: ['zebra'] },
    { label: 'Smokey', ids: ['smokey'] },
    { label: 'Clown', ids: ['clown'] },
    { label: 'Veil', ids: ['veil'] },
    { label: 'Superveil', ids: ['superveil'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  // chunk 17 wave A: big freshwater
  oscar: [
    { label: 'Wild', ids: ['wild'] },
    { label: 'Tiger', ids: ['tiger'] },
    { label: 'Red', ids: ['red'] },
    { label: 'Albino Tiger', ids: ['albino_tiger'] },
    { label: 'Albino Red', ids: ['albino_red'] },
    { label: 'Lutino', ids: ['lutino'] },
    { label: 'Long-fin Tiger', ids: ['tiger', 'longfin'] },
    { label: 'Juvenile tiger', ids: ['tiger'], stage: 'juvenile' },
  ],
  clown_loach: [
    { label: 'Male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Borneo', ids: ['borneo'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  black_ghost_knifefish: [
    { label: 'Black ghost', ids: [] },
    { label: 'White', ids: ['white'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  fahaka_puffer: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  ornate_bichir: [
    { label: 'Male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Juvenile (external gills)', ids: [], stage: 'juvenile' },
  ],
  silver_arowana: [
    { label: 'Male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Platinum', ids: ['platinum'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  // chunk 17 wave B: koi and brackish
  koi: [
    { label: 'Kohaku', ids: ['kohaku'] },
    { label: 'Taisho Sanke', ids: ['taisho_sanke'] },
    { label: 'Shiro Bekko', ids: ['shiro_bekko'] },
    { label: 'Showa', ids: ['showa'] },
    { label: 'Tancho Kohaku', ids: ['kohaku', 'tancho'] },
    { label: 'Shiro Utsuri', ids: ['shiro_utsuri'] },
    { label: 'Hi Utsuri', ids: ['hi_utsuri'] },
    { label: 'Asagi', ids: ['asagi'] },
    { label: 'Shusui', ids: ['asagi', 'doitsu'] },
    { label: 'Goshiki', ids: ['goshiki'] },
    { label: 'Platinum Ogon', ids: ['platinum_ogon'] },
    { label: 'Yamabuki Ogon', ids: ['yamabuki_ogon'] },
    { label: 'Chagoi', ids: ['chagoi'] },
    { label: 'Soragoi', ids: ['soragoi'] },
    { label: 'Karashi', ids: ['karashi'] },
    { label: 'Butterfly Kohaku', ids: ['kohaku', 'butterfly'] },
    { label: 'Ginrin Kohaku', ids: ['kohaku', 'ginrin'] },
  ],
  silver_mono: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  spotted_scat: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile (ruby)', ids: [], stage: 'juvenile' },
  ],
  // chunk 17 wave C: big marine fish
  blue_tang: [
    { label: 'Pacific', ids: [] },
    { label: 'Yellow Belly', ids: ['yellow_belly'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  naso_tang: [
    { label: 'Male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  queen_angelfish: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  clown_triggerfish: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  panther_grouper: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  // chunk 17, wave D
  coral_catshark: [
    { label: 'Adult', ids: [] },
    { label: 'Hatchling', ids: [], stage: 'juvenile' },
  ],
  epaulette_shark: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  brownbanded_bamboo_shark: [
    { label: 'Adult', ids: [] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  german_blue_ram: [
    { label: 'Male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Electric Blue', ids: ['electric_blue'] },
    { label: 'Gold', ids: ['gold'] },
    { label: 'Balloon', ids: ['balloon'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  harlequin_rasbora: [
    { label: 'Male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Golden', ids: ['golden'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
  ],
  zebra_danio: [
    { label: 'Wild', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Leopard', ids: ['leopard'] },
    { label: 'Long-fin', ids: ['longfin'] },
    { label: 'Long-fin Leopard', ids: ['leopard', 'longfin'] },
    { label: 'Golden', ids: ['golden'] },
  ],
  platy: [
    { label: 'Red Mickey Mouse', ids: ['red', 'mickey'] },
    { label: 'Red Mickey Mouse female', ids: ['red', 'mickey'], sex: 'female' },
    { label: 'Gold Wagtail', ids: ['gold', 'wagtail'] },
    { label: 'Blue Moon', ids: ['blue', 'moon'] },
    { label: 'Red Tuxedo', ids: ['red', 'tuxedo'] },
    { label: 'Gold Comet', ids: ['gold', 'comet'] },
    { label: 'Red Crescent', ids: ['red', 'crescent'] },
    { label: 'Gold Twin-spot', ids: ['gold', 'twin'] },
    { label: 'Salt-and-pepper', ids: ['salt_pepper'] },
    { label: 'Red Hi-fin', ids: ['red', 'hifin'] },
    { label: 'Wild Grey', ids: [] },
    { label: 'Juvenile', ids: ['red'], stage: 'juvenile' },
  ],
  swordtail: [
    { label: 'Green male', ids: [] },
    { label: 'Green female', ids: [], sex: 'female' },
    { label: 'Red male', ids: ['red'] },
    { label: 'Black', ids: ['black'] },
    { label: 'Red Tuxedo', ids: ['red', 'tuxedo'] },
    { label: 'Red Wagtail', ids: ['red', 'wagtail'] },
    { label: 'Albino', ids: ['albino'] },
    { label: 'Red Lyretail female', ids: ['red', 'lyretail'], sex: 'female' },
    { label: 'Red Hi-fin', ids: ['red', 'hifin'] },
    { label: 'Red Hi-fin Lyretail female', ids: ['red', 'hifin_lyre'], sex: 'female' },
    { label: 'Juvenile', ids: ['red'], stage: 'juvenile' },
  ],
  dwarf_gourami: [
    { label: 'Wild male', ids: [] },
    { label: 'Female', ids: [], sex: 'female' },
    { label: 'Powder Blue', ids: ['powder_blue'] },
    { label: 'Flame', ids: ['flame'] },
    { label: 'Neon Blue', ids: ['neon'] },
    { label: 'Juvenile', ids: [], stage: 'juvenile' },
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
        out.push({ key: `${r.id}:${v.label}`, label: `${sp.commonName} · ${v.label}`, species: sp, creature: fakeCreature(sp, `${r.id}-${n}`, v.sex ?? 'male', v.stage), appearance: app, phase: n * 1.37, scale, puff: v.puff });
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
