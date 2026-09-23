/**
 * Encyclopedia — species grid by environment (discovered = portrait, undiscovered = silhouette + ? + unlock hint),
 * full species pages (every encyclopedia field, care chips, gets-along/avoid via speciesPair, morphs, sources) and
 * the "Aquarium Science" articles. Never implies releasing animals is okay. OWNER: lane "ui-panels".
 *
 * Deep links: 'species:<id>' | 'science:<articleId>' | 'tab:science'
 */
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { BookOpen, Search, Lock, ExternalLink, MapPin, Home, Ruler, Utensils, Shield, Users, Box, Handshake, Egg, Leaf, Sparkles, Eye, FlaskConical, ChevronDown, CircleCheck, OctagonAlert, Info, Palette, Waves } from 'lucide-react';
import type { GameState, SpeciesDefinition, CompatVerdict } from '@/types';
import { useUI } from '@/state/ui';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { speciesPair } from '@/sim/compat';
import { breedingSystemInfo } from '@/sim/life/breeding';
import { PanelLayout, SubView } from '../common/PanelLayout';
import { usePanelGame, safe } from '../common/hooks';
import { speciesUnlocked } from '../common/derive';
import { Button } from '@/ui/kit';
import { Chip, Seg, EmptyState, SectionHead, Callout } from '../common/parts';
import { SpeciesPortrait } from '../common/Portrait';
import { CareChips } from '../common/Profile';
import { VerdictBadge } from '../common/CompatPreview';
import { ENV_LABEL, RARITY_LABEL, RARITY_TONE, DIFFICULTY_LABEL, DIFFICULTY_TONE, VERDICT_RANK, FOOD_TAG_LABEL, titleCase } from '../common/format';
import { ARTICLES } from './science';

type Tab = 'species' | 'science';
type Show = 'all' | 'discovered' | 'freshwater' | 'marine' | 'brackish'; // lane:brackish: + 'brackish'

export function EncyclopediaPanel() {
  const g = usePanelGame(1500);
  const target = useUI((s) => s.panelTarget);
  const [tab, setTab] = useState<Tab>('species');
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [article, setArticle] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('species:')) {
      setTab('species');
      setSpeciesId(target.slice(8));
    } else if (target.startsWith('science:')) {
      setTab('science');
      setArticle(target.slice(8));
    } else if (target === 'tab:science') setTab('science');
    else if (target === 'tab:species') setTab('species');
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  if (!g) return null;
  const known = discoveredSet(g);
  const total = ALL_SPECIES.length;

  return (
    <PanelLayout
      title="Encyclopedia"
      icon={<BookOpen size={20} />}
      subtitle={`${known.size} of ${total} species discovered · ${g.progress.discoveredMorphs.length} ${g.progress.discoveredMorphs.length === 1 ? 'morph' : 'morphs'} seen`}
      scrollKey={`${tab}:${speciesId ?? ''}`}
      toolbar={
        speciesId ? undefined : (
          <Seg<Tab>
            label="Encyclopedia section"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'species', label: <><BookOpen size={14} /> Species</> },
              { id: 'science', label: <><FlaskConical size={14} /> Aquarium science</> },
            ]}
          />
        )
      }
    >
      {tab === 'species' && speciesId ? (
        <SpeciesPage g={g} id={speciesId} known={known.has(speciesId)} onBack={() => setSpeciesId(null)} onOpen={setSpeciesId} />
      ) : tab === 'species' ? (
        <SpeciesGrid g={g} known={known} onOpen={setSpeciesId} />
      ) : (
        <Science open={article} setOpen={setArticle} />
      )}
    </PanelLayout>
  );
}

/**
 * What an undiscovered species' tile should say. The data's unlock hint ("Unlocks with beginner freshwater fish") is
 * only true while the species is still locked: once it is unlocked, or sitting in the shop right now, say that instead.
 */
function availability(g: GameState, sp: SpeciesDefinition): { text: string; offerId?: string; available: boolean } {
  const offer = g.market.stock.find((o) => o.speciesId === sp.id && o.expiresHour > g.clock.hour) ?? g.market.stock.find((o) => o.speciesId === sp.id);
  if (offer) return { text: 'In the shop now', offerId: offer.id, available: true };
  if (safe(() => speciesUnlocked(g, sp), false)) return { text: 'Unlocked to buy', available: true };
  return { text: sp.unlock?.hint || 'Keep exploring to discover', available: false };
}

function discoveredSet(g: GameState): Set<string> {
  const s = new Set(g.progress.discoveredSpecies);
  for (const c of Object.values(g.creatures)) if (c.status !== 'dead') s.add(c.speciesId);
  return s;
}

function SpeciesGrid({ g, known, onOpen }: { g: GameState; known: Set<string>; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  const needle = q.trim().toLowerCase();
  const list = ALL_SPECIES.filter((sp) => {
    const k = known.has(sp.id);
    if (show === 'discovered' && !k) return false;
    if ((show === 'freshwater' || show === 'marine' || show === 'brackish') && sp.environment !== show) return false;
    if (needle) {
      if (!k) return false;
      return `${sp.commonName} ${sp.scientificName} ${sp.group}`.toLowerCase().includes(needle);
    }
    return true;
  });
  const envs = (['freshwater', 'marine', 'brackish'] as const).filter((e) => list.some((s) => s.environment === e));
  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-row pn-gap-2 pn-row--wrap">
        <label className="pn-search">
          <Search size={15} />
          <input className="pn-input" placeholder="Search species" title="Search the species you have discovered" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search discovered species" />
        </label>
        <div className="pn-chips">
          {(
            [
              ['all', 'All'],
              ['discovered', 'Discovered'],
              ['freshwater', 'Freshwater'],
              ['marine', 'Marine'],
              ['brackish', 'Brackish'], // lane:brackish
            ] as [Show, string][]
          ).map(([id, label]) => (
            <Chip key={id} onClick={() => setShow(id)} pressed={show === id}>
              {label}
            </Chip>
          ))}
        </div>
      </div>
      {list.length === 0 && (
        <EmptyState icon={<Search size={22} />} title="No species found">
          {needle ? 'Undiscovered species can’t be searched — keep exploring.' : 'Nothing in this view yet.'}
        </EmptyState>
      )}
      {envs.map((env) => (
        <section key={env}>
          <SectionHead title={`${ENV_LABEL[env]} · ${list.filter((s) => s.environment === env && known.has(s.id)).length}/${list.filter((s) => s.environment === env).length}`} icon={env === 'marine' ? <Waves size={14} /> : <Leaf size={14} />} />
          <div className="pn-specgrid">
            {list
              .filter((s) => s.environment === env)
              .sort((a, b) => Number(known.has(b.id)) - Number(known.has(a.id)) || a.commonName.localeCompare(b.commonName))
              .map((sp) => {
                const k = known.has(sp.id);
                const avail = k ? null : availability(g, sp);
                return (
                  <button key={sp.id} type="button" className={clsx('pn-spec', !k && 'is-unknown')} onClick={() => onOpen(sp.id)} aria-label={k ? sp.commonName : `Undiscovered species: ${avail?.text ?? ''}`}>
                    <SpeciesPortrait speciesId={sp.id} size={72} silhouette={!k} />
                    <span className="pn-spec__name">{k ? sp.commonName : 'Undiscovered'}</span>
                    {k ? <span className="pn-spec__sci">{sp.scientificName}</span> : <span className={clsx('pn-spec__hint', avail?.available && 'is-available')}>{avail?.text}</span>}
                    {k && sp.isStarter && <span className="pn-spec__badge">Starter</span>}
                  </button>
                );
              })}
          </div>
        </section>
      ))}
      <Callout tone="good" icon={<Leaf size={16} />}>
        Every animal here stays in your care or goes to another keeper. Aquarium animals should never be released into the wild.
      </Callout>
    </div>
  );
}

function FactRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="pn-fact">
      <span className="pn-fact__icon" aria-hidden>
        {icon}
      </span>
      <div className="pn-grow">
        <div className="pn-fact__label">{label}</div>
        <div className="pn-fact__text">{children}</div>
      </div>
    </div>
  );
}

function SpeciesPage({ g, id, known, onBack, onOpen }: { g: GameState; id: string; known: boolean; onBack: () => void; onOpen: (id: string) => void }) {
  const sp = findSpecies(id);
  const pairs = useMemo(() => {
    if (!sp) return { good: [], bad: [] as { s: SpeciesDefinition; v: CompatVerdict; why: string }[] };
    const rows = ALL_SPECIES.filter((o) => o.id !== sp.id && o.environment === sp.environment).map((o) => {
      const r = safe(() => speciesPair(sp, o), null);
      const worst = r?.reasons?.filter((x) => x.severity === 'critical' || x.severity === 'warning')[0] ?? r?.reasons?.[0];
      return { s: o, v: (r?.verdict ?? 'conditional') as CompatVerdict, score: r?.score ?? 50, why: worst?.text ?? '' };
    });
    const good = rows.filter((r) => VERDICT_RANK[r.v] <= 1).sort((a, b) => b.score - a.score).slice(0, 8);
    const bad = rows.filter((r) => VERDICT_RANK[r.v] >= 3).sort((a, b) => a.score - b.score).slice(0, 8);
    return { good, bad };
  }, [sp]);
  const breeding = useMemo(() => (sp ? safe(() => breedingSystemInfo(sp.id), null) : null), [sp]);

  if (!sp)
    return (
      <SubView onBack={onBack} backLabel="All species">
        <EmptyState icon={<BookOpen size={22} />} title="Unknown species" />
      </SubView>
    );

  if (!known) {
    return (
      <SubView onBack={onBack} backLabel="All species">
        <div className="pn-spechero pn-spechero--unknown">
          <SpeciesPortrait speciesId={sp.id} size={140} silhouette />
          <div className="pn-col pn-gap-2">
            <h3 className="pn-spechero__name">Undiscovered species</h3>
            <div className="pn-chips">
              <Chip>{ENV_LABEL[sp.environment]}</Chip>
              <Chip icon={<Lock size={11} />}>Not yet discovered</Chip>
            </div>
            {(() => {
              const avail = availability(g, sp);
              if (!avail.available) return <p className="pn-p">{sp.unlock?.hint || 'Keep growing your aquarium to discover this animal.'}</p>;
              return (
                <>
                  <p className="pn-p">{avail.offerId ? 'One is for sale in the shop right now. Bring it home to fill in this page.' : 'You can already buy this animal — it turns up in the shop from time to time. Bring one home to fill in this page.'}</p>
                  {avail.offerId && (
                    <div>
                      <Button size="sm" variant="primary" onClick={() => useUI.getState().set({ panel: 'market', panelTarget: `offer:${avail.offerId}` })}>
                        See it in the shop
                      </Button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </SubView>
    );
  }

  const e = sp.encyclopedia;
  const morphsSeen = new Set(g.progress.discoveredMorphs.filter((m) => m.startsWith(`${sp.id}:`)).map((m) => m.slice(sp.id.length + 1).toLowerCase()));
  const owned = Object.values(g.creatures).filter((c) => c.speciesId === sp.id && (c.status === 'alive' || c.status === 'listed')).length;

  return (
    <SubView onBack={onBack} backLabel="All species">
      <div className="pn-spechero">
        <SpeciesPortrait speciesId={sp.id} size={150} className="pn-spechero__portrait" />
        <div className="pn-col pn-gap-2 pn-grow">
          <div>
            <h3 className="pn-spechero__name">{sp.commonName}</h3>
            <div className="pn-spechero__sci">{sp.scientificName}</div>
          </div>
          <div className="pn-chips">
            <Chip>{ENV_LABEL[sp.environment]}</Chip>
            <Chip>{titleCase(sp.category)}</Chip>
            <Chip tone={RARITY_TONE[sp.rarity]}>{RARITY_LABEL[sp.rarity]}</Chip>
            <Chip tone={DIFFICULTY_TONE[sp.difficulty]}>{DIFFICULTY_LABEL[sp.difficulty]} care</Chip>
            {sp.captiveBredAvailable && <Chip tone="good">Captive-bred available</Chip>}
            {owned > 0 && <Chip tone="aqua">You keep {owned}</Chip>}
          </div>
          <p className="pn-lead">{e.summary}</p>
        </div>
      </div>

      <section>
        <SectionHead title="Care at a glance" icon={<Info size={14} />} />
        <CareChips sp={sp} full hideDifficulty />
      </section>

      <section className="pn-card pn-facts">
        <FactRow icon={<MapPin size={15} />} label="Native range">
          {sp.nativeRegion}
        </FactRow>
        <FactRow icon={<Home size={15} />} label="Habitat">
          {e.nativeHabitat}
        </FactRow>
        <FactRow icon={<Ruler size={15} />} label="Adult size">
          About {sp.adultSizeCm} cm · needs {sp.recommendedMinTankGallons}+ gallons ({sp.recommendedFootprint.minLengthIn}″ long or more)
        </FactRow>
        <FactRow icon={<Utensils size={15} />} label="Diet">
          {titleCase(sp.diet)} · {titleCase(sp.feedingStyle).toLowerCase()} feeder · eats {sp.foods.slice(0, 6).map((f) => FOOD_TAG_LABEL[f] ?? f.replace(/_/g, ' ')).join(', ')}
        </FactRow>
        <FactRow icon={<Shield size={15} />} label="Temperament">
          {titleCase(sp.temperament)}
          {sp.sameSpeciesRule.note ? ` — ${sp.sameSpeciesRule.note}` : ''}
        </FactRow>
        <FactRow icon={<Users size={15} />} label="Social structure">
          {e.socialStructure}
        </FactRow>
        <FactRow icon={<Box size={15} />} label="Tank needs">
          {e.tankNeeds}
        </FactRow>
        <FactRow icon={<Handshake size={15} />} label="Compatibility">
          {e.compatibilityNotes}
        </FactRow>
        <FactRow icon={<Egg size={15} />} label="Breeding">
          {e.breedingOverview}
          {breeding && !breeding.breedable && <span className="pn-muted"> (Not bred in this build.)</span>}
        </FactRow>
        <FactRow icon={<Leaf size={15} />} label={`Conservation${sp.conservation?.status ? ` · ${sp.conservation.status}` : ''}`}>
          {e.conservationNote}
          {sp.wildCaughtNote ? ` ${sp.wildCaughtNote}` : ''}
        </FactRow>
        <FactRow icon={<Sparkles size={15} />} label="Fun fact">
          {e.funFact}
        </FactRow>
        <FactRow icon={<Eye size={15} />} label="What you’ll see in Aquarium Go">
          {e.inGameBehavior}
        </FactRow>
      </section>

      <section>
        <SectionHead title="Tank mates" icon={<Handshake size={14} />} />
        <div className="pn-grid pn-grid--2">
          <div className="pn-card">
            <div className="pn-matehead pn-tone-good">
              <CircleCheck size={15} /> Gets along with
            </div>
            {pairs.good.length === 0 ? (
              <span className="pn-small pn-muted">Best kept on its own or with its own kind.</span>
            ) : (
              <ul className="pn-mates">
                {pairs.good.map((p) => (
                  <li key={p.s.id}>
                    <button type="button" className="pn-mate" onClick={() => onOpen(p.s.id)}>
                      <SpeciesPortrait speciesId={p.s.id} size={30} />
                      <span className="pn-grow pn-ellipsis">{p.s.commonName}</span>
                      <VerdictBadge verdict={p.v} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="pn-card">
            <div className="pn-matehead pn-tone-danger">
              <OctagonAlert size={15} /> Avoid
            </div>
            {pairs.bad.length === 0 ? (
              <span className="pn-small pn-muted">No serious conflicts in this environment.</span>
            ) : (
              <ul className="pn-mates">
                {pairs.bad.map((p) => (
                  <li key={p.s.id}>
                    <button type="button" className="pn-mate" onClick={() => onOpen(p.s.id)} title={p.why}>
                      <SpeciesPortrait speciesId={p.s.id} size={30} />
                      <span className="pn-grow pn-col" style={{ gap: 1, minWidth: 0 }}>
                        <span className="pn-ellipsis">{p.s.commonName}</span>
                        {p.why && <span className="pn-tiny pn-muted pn-ellipsis">{p.why}</span>}
                      </span>
                      <VerdictBadge verdict={p.v} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {sp.visualMorphs.length > 0 && (
        <section>
          <SectionHead title={`Morphs · ${sp.visualMorphs.filter((m) => morphsSeen.has(m.toLowerCase())).length}/${sp.visualMorphs.length} seen`} icon={<Palette size={14} />} />
          <div className="pn-chips">
            {sp.visualMorphs.map((m) => {
              const seen = morphsSeen.has(m.toLowerCase());
              return (
                <Chip key={m} tone={seen ? 'aqua' : 'neutral'} icon={seen ? <CircleCheck size={11} /> : <Lock size={10} />}>
                  {seen ? m : '???'}
                </Chip>
              );
            })}
          </div>
        </section>
      )}

      {sp.sourceReferences.length > 0 && (
        <section>
          <SectionHead title="Sources" icon={<BookOpen size={14} />} />
          <ul className="pn-sources">
            {sp.sourceReferences.map((s) => (
              <li key={s.id}>
                {s.url ? (
                  <a className="pn-link" href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title} <ExternalLink size={12} aria-hidden />
                  </a>
                ) : (
                  <span>{s.title}</span>
                )}
                {s.facts?.length > 0 && <span className="pn-tiny pn-muted">{s.facts.slice(0, 5).join(' · ')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Callout tone="good" icon={<Leaf size={16} />}>
        Never release aquarium animals into the wild — rehome them through a shop, club or rescue instead.
      </Callout>
    </SubView>
  );
}

function Science({ open, setOpen }: { open: string | null; setOpen: (id: string | null) => void }) {
  return (
    <div className="pn-stack">
      <p className="pn-lead" style={{ marginBottom: 4 }}>
        Short reads on the science that keeps aquariums alive. Tap one to open it.
      </p>
      {ARTICLES.map((a) => {
        const isOpen = open === a.id;
        return (
          <article key={a.id} className={clsx('pn-article', isOpen && 'is-open')}>
            <button type="button" className="pn-article__head" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen}>
              <span className="pn-article__icon" aria-hidden>
                {a.id === 'ethics' ? <Leaf size={16} /> : a.id === 'compatibility' ? <Handshake size={16} /> : a.id === 'salinity' ? <Waves size={16} /> : <FlaskConical size={16} />}
              </span>
              <span className="pn-grow">
                <span className="pn-article__title">{a.title}</span>
                <span className="pn-article__teaser">{a.teaser}</span>
              </span>
              <ChevronDown size={16} className="pn-article__chev" aria-hidden />
            </button>
            {isOpen && <div className="pn-article__body">{a.body}</div>}
          </article>
        );
      })}
    </div>
  );
}

