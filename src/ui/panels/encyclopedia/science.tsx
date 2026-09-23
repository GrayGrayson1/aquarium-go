/**
 * "Aquarium Science" — short, accurate articles with progressive disclosure. Original text; facts follow standard
 * aquarium-husbandry references (see docs/research). Never implies releasing animals is okay. OWNER: lane "ui-panels".
 */
import type { ReactNode } from 'react';

export interface Article {
  id: string;
  title: string;
  teaser: string;
  body: ReactNode;
}

function NitrogenCycleDiagram() {
  const node = (x: number, label: string, sub: string, color: string) => (
    <g transform={`translate(${x} 0)`}>
      <rect x={-54} y={18} width={108} height={52} rx={14} fill="rgba(255,255,255,0.04)" stroke={color} strokeOpacity={0.6} />
      <text x={0} y={42} textAnchor="middle" className="pn-diagram__t">
        {label}
      </text>
      <text x={0} y={58} textAnchor="middle" className="pn-diagram__s">
        {sub}
      </text>
    </g>
  );
  const arrow = (x1: number, x2: number, label: string) => (
    <g>
      <line x1={x1} x2={x2 - 6} y1={44} y2={44} stroke="rgba(200,235,245,0.45)" strokeWidth={1.5} />
      <path d={`M${x2 - 8} 39 L${x2} 44 L${x2 - 8} 49 Z`} fill="rgba(200,235,245,0.6)" />
      <text x={(x1 + x2) / 2} y={32} textAnchor="middle" className="pn-diagram__s">
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 560 130" className="pn-diagram" role="img" aria-label="Nitrogen cycle: fish waste and leftover food become ammonia; bacteria turn ammonia into nitrite, then nitrite into nitrate; water changes and plants remove nitrate.">
      {node(62, 'Waste & food', 'rots into', '#9fb6bd')}
      {arrow(116, 172, '')}
      {node(226, 'Ammonia', 'very toxic', '#f87171')}
      {arrow(280, 336, 'bacteria')}
      {node(392, 'Nitrite', 'toxic', '#fbbf24')}
      <g transform="translate(0 64)">
        <line x1={392} x2={392} y1={6} y2={22} stroke="rgba(200,235,245,0.45)" strokeWidth={1.5} />
        <path d="M387 20 L392 28 L397 20 Z" fill="rgba(200,235,245,0.6)" />
        <text x={404} y={20} className="pn-diagram__s">
          bacteria
        </text>
        <rect x={286} y={30} width={212} height={32} rx={12} fill="rgba(74,222,128,0.06)" stroke="#4ade80" strokeOpacity={0.5} />
        <text x={392} y={51} textAnchor="middle" className="pn-diagram__t">
          Nitrate — removed by water changes & plants
        </text>
      </g>
    </svg>
  );
}

export const ARTICLES: Article[] = [
  {
    id: 'nitrogen_cycle',
    title: 'The nitrogen cycle',
    teaser: 'Why invisible bacteria are the most important residents of every tank.',
    body: (
      <>
        <NitrogenCycleDiagram />
        <p>
          Everything an aquarium animal eats eventually becomes waste. Waste and uneaten food break down into <b>ammonia</b>, which is toxic even at low levels.
        </p>
        <p>
          Beneficial bacteria living on filter media, rocks and substrate convert ammonia into <b>nitrite</b> (also toxic), and a second group converts nitrite into <b>nitrate</b>, which is far less harmful. Nitrate builds up slowly and is removed by water changes and by growing plants.
        </p>
        <p>
          In Aquarium Go your filter’s bacteria are shown as <i>cycle progress</i>. A healthy, mature tank keeps ammonia and nitrite at zero.
        </p>
      </>
    ),
  },
  {
    id: 'cycling',
    title: 'What “cycling” means',
    teaser: 'A new tank needs weeks of patience before it can support animals.',
    body: (
      <>
        <p>
          A brand-new aquarium has almost no beneficial bacteria. “Cycling” is the process of growing them — usually by adding a small ammonia source (a pinch of food or bottled ammonia) and waiting until ammonia and nitrite both read zero within a day.
        </p>
        <p>
          Adding animals to an uncycled tank exposes them to toxic spikes, often called “new tank syndrome”. Mature filter media or bottled bacteria can speed things up, and adding animals gradually gives the bacteria time to keep pace.
        </p>
        <p>Never wash filter media in tap water: chlorine kills the very bacteria you worked to grow. Rinse it in old tank water instead.</p>
      </>
    ),
  },
  {
    id: 'water_changes',
    title: 'Why water changes matter',
    teaser: 'Small, regular changes keep water stable — and stable water keeps animals well.',
    body: (
      <>
        <p>
          Filters remove ammonia and nitrite, but not everything. Nitrate, dissolved organics and hormones accumulate over time, while minerals that buffer pH are used up. Partial water changes reset all of these at once.
        </p>
        <p>
          Many keepers change 10–30% weekly. Match the new water’s temperature (and salinity for marine tanks), and treat tap water with a dechlorinator. Large, sudden changes can shock sensitive animals — smaller, frequent changes are gentler.
        </p>
      </>
    ),
  },
  {
    id: 'salinity',
    title: 'Salinity & top-off',
    teaser: 'Water evaporates. Salt doesn’t.',
    body: (
      <>
        <p>
          Marine aquariums are kept around a specific gravity of 1.023–1.026, close to natural seawater. As water evaporates, the salt stays behind, so salinity slowly rises.
        </p>
        <p>
          Replace evaporated water with <b>fresh, purified water</b> (“top-off”), not salt water. Use salt mix only for water changes, mixed to the same salinity as the tank. An auto top-off unit keeps the level — and salinity — steady.
        </p>
        <p>Freshwater animals cannot live in marine water, and marine animals cannot live in fresh water. A few brackish species live in between.</p>
      </>
    ),
  },
  {
    id: 'compatibility',
    title: 'Reading compatibility',
    teaser: 'Water, size, temperament and appetite all decide who can share a tank.',
    body: (
      <>
        <p>Before every purchase Aquarium Go shows a compatibility verdict and the reasons behind it:</p>
        <ul>
          <li>
            <b>Water first</b> — temperature, pH and salinity ranges must overlap. A cool-water axolotl and a tropical betta can’t both be comfortable.
          </li>
          <li>
            <b>Size & mouths</b> — many fish eat anything that fits in their mouth, including shrimp and fry.
          </li>
          <li>
            <b>Temperament</b> — territorial species (like male bettas) fight their own kind; fin-nippers harass long-finned fish.
          </li>
          <li>
            <b>Feeding</b> — slow, deliberate feeders such as seahorses lose out to fast, competitive eaters.
          </li>
        </ul>
        <p>“Conditional” means it can work with the right setup — more cover, a bigger tank or target feeding. “High risk” and “Incompatible” mean real harm is likely.</p>
      </>
    ),
  },
  {
    id: 'ethics',
    title: 'Keeping animals responsibly',
    teaser: 'Captive-bred vs wild-caught — and why aquarium animals must never be released.',
    body: (
      <>
        <p>
          <b>Never release aquarium animals, plants or water into the wild.</b> Released pets can carry diseases, outcompete native wildlife and become invasive — goldfish, plecos and lionfish have all caused lasting damage. If you can no longer keep an animal, rehome it through a shop, club or rescue.
        </p>
        <p>
          <b>Captive-bred</b> animals are raised in aquaculture. They are usually hardier, already eat aquarium foods and take pressure off wild reefs and rivers. <b>Wild-caught</b> animals can be collected sustainably, but some fisheries harm habitats. Choosing captive-bred where possible is kinder to wild populations.
        </p>
        <p>Research an animal’s adult size, lifespan and needs before buying — many live for years and grow much larger than they look in the shop.</p>
      </>
    ),
  },
];
