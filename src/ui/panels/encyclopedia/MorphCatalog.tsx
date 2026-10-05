/**
 * Encyclopedia genetics sections: named strains, the morph catalog (colour tree) and Prismatic finds.
 * OWNER: lane "genetics" (ui). Prop-driven and pure (no game store), so it renders server-side in tests.
 *
 * Everything shown is derived from the species' genetics (src/sim/life/morphCatalog.ts) and the player's discoveries.
 * Undiscovered entries reveal only trait names the player has already seen in some morph — never hidden alleles.
 */
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, CircleCheck, Dna, Lock, Network, Sparkles } from 'lucide-react';
import type { MorphStrain, PrismaticFind, SpeciesDefinition } from '@/types';
import { morphCatalog, seenTraitIds, strainTier, oneInLabel, prismaticChance, type CatalogEntry, type CatalogGroup } from '@/sim/life';
import { Chip, SectionHead } from '../common/parts';
import { RARITY_LABEL, RARITY_TONE, plural } from '../common/format';
import { discoveredMorphNames } from './morphs';

const ORIGIN_LABEL: Record<PrismaticFind['origin'], string> = { shop: 'bought', bred: 'bred from a Prismatic parent', spontaneous: 'bred in your shop' };

export interface GeneticsSectionsProps {
  sp: SpeciesDefinition;
  discoveredMorphs: readonly string[];
  discoveredStrains: readonly string[];
  prismaticFinds: readonly PrismaticFind[];
  /** Hide the catalog for species without named colour morphs (their variation is individual, not genetic). */
  showCatalog: boolean;
}

/** Named strains + morph catalog + Prismatic box for one species page. */
export function GeneticsSections({ sp, discoveredMorphs, discoveredStrains, prismaticFinds, showCatalog }: GeneticsSectionsProps) {
  const cat = useMemo(() => morphCatalog(sp), [sp]);
  const seenNames = new Set(discoveredMorphNames([...discoveredMorphs], sp.id));
  const seenTraits = seenTraitIds(sp, seenNames);
  const strainsFound = new Set(discoveredStrains.filter((k) => k.startsWith(`${sp.id}:`)).map((k) => k.slice(sp.id.length + 1)));
  return (
    <>
      {(sp.genetics.strains?.length ?? 0) > 0 && <StrainList sp={sp} found={strainsFound} seenTraits={seenTraits} />}
      {showCatalog && cat.entries.length > 1 && <CatalogTree sp={sp} groups={cat.groups} total={cat.entries.length} seenNames={seenNames} seenTraits={seenTraits} />}
      <PrismaticBox sp={sp} finds={prismaticFinds.filter((f) => f.speciesId === sp.id)} />
    </>
  );
}

function ruleName(sp: SpeciesDefinition, id: string): string {
  return sp.genetics.phenotypes.find((r) => r.id === id)?.name ?? id;
}

/** Recognised strains: name + tier + recipe (trait names the player has seen; ??? for the rest). */
export function StrainList({ sp, found, seenTraits }: { sp: SpeciesDefinition; found: ReadonlySet<string>; seenTraits: ReadonlySet<string> }) {
  const strains = sp.genetics.strains ?? [];
  const n = strains.filter((s) => found.has(s.id)).length;
  return (
    <section data-testid="enc-strains">
      <SectionHead title={`Named strains · ${n}/${strains.length}`} icon={<Dna size={14} />} />
      <p className="pn-tiny pn-muted" style={{ marginBottom: 6 }}>
        Recognised combinations collectors seek. Breed or buy one to log it; each adds a premium to its value.
      </p>
      <div className="pn-strains">
        {strains.map((s) => (
          <StrainRow key={s.id} sp={sp} s={s} known={found.has(s.id)} seenTraits={seenTraits} />
        ))}
      </div>
    </section>
  );
}

function StrainRow({ sp, s, known, seenTraits }: { sp: SpeciesDefinition; s: MorphStrain; known: boolean; seenTraits: ReadonlySet<string> }) {
  const tier = strainTier(sp, s);
  const secret = !known && s.hidden;
  return (
    <div className={clsx('pn-strain', !known && 'is-unknown')}>
      {known ? <CircleCheck size={14} className="pn-good-ic" aria-label="Discovered" /> : <Lock size={13} aria-label="Not yet discovered" />}
      <span className="pn-strain__name">{secret ? '??? strain' : s.name}</span>
      <Chip tone={RARITY_TONE[tier]}>{RARITY_LABEL[tier]}</Chip>
      {!secret && (
        <span className="pn-strain__recipe">
          {s.requires.map((id, i) => (
            <span key={id} className="pn-strain__part">
              {i > 0 && <span className="pn-strain__plus" aria-hidden>+ </span>}
              <Chip tone={known || seenTraits.has(id) ? 'aqua' : 'neutral'}>{known || seenTraits.has(id) ? ruleName(sp, id) : '???'}</Chip>
            </span>
          ))}
          {(s.excludes ?? []).map((id) => (
            <Chip key={`x-${id}`}>not {known || seenTraits.has(id) ? ruleName(sp, id) : '???'}</Chip>
          ))}
        </span>
      )}
      {known && s.note && <span className="pn-tiny pn-muted">{s.note}</span>}
    </div>
  );
}

/** What an undiscovered morph shows: the trait names already seen elsewhere, ??? for the rest. */
export function catalogHint(sp: SpeciesDefinition, e: CatalogEntry, seenTraits: ReadonlySet<string>): string {
  return e.traitIds.map((id) => (seenTraits.has(id) ? ruleName(sp, id) : '???')).join(' · ');
}

/** The colour tree: every reachable morph, grouped by base colour, with how often sellers stock it. */
export function CatalogTree({ sp, groups, total, seenNames, seenTraits, initiallyOpen }: { sp: SpeciesDefinition; groups: readonly CatalogGroup[]; total: number; seenNames: ReadonlySet<string>; seenTraits: ReadonlySet<string>; initiallyOpen?: readonly string[] }) {
  const flat = groups.length === 1 || total <= 10;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(initiallyOpen ?? []));
  const seen = groups.reduce((a, g) => a + g.entries.filter((e) => seenNames.has(e.morphName)).length, 0);
  const toggle = (name: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  return (
    <section data-testid="enc-catalog">
      <SectionHead title={`Morph catalog · ${seen}/${total} seen`} icon={<Network size={14} />} />
      <p className="pn-tiny pn-muted" style={{ marginBottom: 6 }}>
        Every colour and combination these genetics can produce, by base colour, rated by how often sellers stock it.
      </p>
      <div className="pn-catalog">
        {flat ? (
          <ul className="pn-catalog__list" style={{ paddingLeft: 10, paddingTop: 4 }}>
            {groups.flatMap((g) => g.entries).map((e) => (
              <CatalogRow key={e.morphName} sp={sp} e={e} seen={seenNames.has(e.morphName)} seenTraits={seenTraits} />
            ))}
          </ul>
        ) : (
          groups.map((g) => {
            const isOpen = open.has(g.name);
            const n = g.entries.filter((e) => seenNames.has(e.morphName)).length;
            const swatch = (g.baseId ? sp.genetics.phenotypes.find((r) => r.id === g.baseId)?.visual.bodyColor : undefined) ?? sp.genetics.baseVisual.bodyColor;
            return (
              <div key={g.name} className="pn-catalog__group">
                <button type="button" className="pn-catalog__head" aria-expanded={isOpen} onClick={() => toggle(g.name)}>
                  {isOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                  <span className="pn-catalog__swatch" style={{ background: swatch }} aria-hidden />
                  <span className="pn-catalog__title">{g.name}</span>
                  <span className="pn-catalog__count">
                    {n}/{g.entries.length}
                  </span>
                </button>
                {isOpen && (
                  <ul className="pn-catalog__list">
                    {g.entries.map((e) => (
                      <CatalogRow key={e.morphName} sp={sp} e={e} seen={seenNames.has(e.morphName)} seenTraits={seenTraits} />
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function CatalogRow({ sp, e, seen, seenTraits }: { sp: SpeciesDefinition; e: CatalogEntry; seen: boolean; seenTraits: ReadonlySet<string> }) {
  const strain = e.strains[0];
  return (
    <li className={clsx('pn-catalog__row', !seen && 'is-unknown')}>
      {seen ? <CircleCheck size={13} className="pn-good-ic" aria-label="Seen" /> : <Lock size={12} aria-label="Not yet seen" />}
      <span className="pn-catalog__label">{seen ? e.morphName : catalogHint(sp, e, seenTraits)}</span>
      {seen && strain && <Chip tone={RARITY_TONE[strainTier(sp, strain)]} icon={<Dna size={10} />}>{strain.name}</Chip>}
      <Chip tone={RARITY_TONE[e.tier]} title={`About ${oneInLabel(e.frequency)} market animals`}>
        {RARITY_LABEL[e.tier]}
      </Chip>
    </li>
  );
}

/** Prismatic animals of this species the player has owned — or the odds of meeting one. */
export function PrismaticBox({ sp, finds }: { sp: SpeciesDefinition; finds: readonly PrismaticFind[] }) {
  const shop = oneInLabel(prismaticChance({ source: 'shop' }));
  const bred = [0, 1, 2].map((n) => oneInLabel(prismaticChance({ source: 'bred', rareParents: n })));
  return (
    <section data-testid="enc-prismatic">
      <SectionHead title="Prismatic" icon={<Sparkles size={14} />} />
      <div className="pn-prismatic-box">
        {finds.length > 0 ? (
          <>
            <strong>
              {plural(finds.length, `Prismatic ${sp.commonName.toLowerCase()}`)} found
            </strong>
            <ul>
              {finds.slice(0, 4).map((f) => (
                <li key={f.creatureId} className="pn-small">
                  {f.name} — {f.morphName}, {ORIGIN_LABEL[f.origin]} on day {Math.floor(f.hour / 24) + 1}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="pn-small" style={{ margin: 0 }}>
            No Prismatic {sp.commonName.toLowerCase()} yet. About {shop} animals a seller stocks shimmer like this; bred young {bred[0]} — {bred[1]} with one Prismatic parent, {bred[2]} with two.
          </p>
        )}
        <p className="pn-tiny pn-muted" style={{ margin: '6px 0 0' }}>
          A game-only phenomenon: no real animal shimmers like this. It is never inherited outright — Prismatic parents only raise the odds.
        </p>
      </div>
    </section>
  );
}
