/**
 * fishart portraits sandbox (lane "fishart", dev only): renders portrait cards for every fish entry in the gallery
 * (and every special creature species) via usePortrait / useSpeciesPortrait.
 * URL: /src/dev/sandboxes/fishart-standalone.html?s=portraits [&only=betta] [&size=192] [&all=1]
 */
import { usePortrait, useSpeciesPortrait } from '@/render/portraits';
import { galleryEntries, type GalleryEntry } from './fishart-gallery-data';
import { ROSTER } from '@/data/species/roster';

const q = new URLSearchParams(location.search);
const size = Number(q.get('size') ?? 176);

function Card({ e }: { e: GalleryEntry }) {
  const url = usePortrait({ speciesId: e.species.id, appearance: e.appearance }, size);
  return (
    <figure style={{ margin: 0, width: size, font: '11px Inter, system-ui', color: '#cfe' }}>
      <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', background: '#0b1419', border: '1px solid rgba(255,255,255,.08)' }}>
        {url ? <img src={url} width={size} height={size} alt={e.label} /> : null}
      </div>
      <figcaption style={{ marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</figcaption>
    </figure>
  );
}

function SpeciesCard({ id }: { id: string }) {
  const url = useSpeciesPortrait(id, size);
  return (
    <figure style={{ margin: 0, width: size, font: '11px Inter, system-ui', color: '#cfe' }}>
      <div style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', background: '#0b1419', border: '1px solid rgba(255,255,255,.08)' }}>
        {url ? <img src={url} width={size} height={size} alt={id} /> : null}
      </div>
      <figcaption>{id}</figcaption>
    </figure>
  );
}

export default function FishartPortraits() {
  const entries = galleryEntries(q.get('only')?.split(',').filter(Boolean) ?? null);
  const specials = q.get('all') === '1' ? ROSTER.filter((r) => r.visual === 'special').map((r) => r.id) : [];
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#060d11', padding: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' }}>
      {entries.map((e) => (
        <Card key={e.key} e={e} />
      ))}
      {specials.map((id) => (
        <SpeciesCard key={id} id={id} />
      ))}
    </div>
  );
}
