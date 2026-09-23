# Asset & Third-Party Ledger

Aquarium Go ships **no external art, models, textures, or audio files**. All creatures, decor, environments, and textures are generated procedurally in code, and all sound is synthesized live with the Web Audio API.

## Fonts (bundled via npm, no network at runtime)

| Asset | Source | License | Use |
|---|---|---|---|
| Fraunces (variable) | @fontsource-variable/fraunces (Undercase Type) | SIL Open Font License 1.1 | Display titles, creature names |
| Inter (variable) | @fontsource-variable/inter (Rasmus Andersson) | SIL Open Font License 1.1 | UI text |

## Icons

| Asset | Source | License | Use |
|---|---|---|---|
| Lucide icons | lucide-react | ISC | UI icons |

## Code snippets / techniques

| Snippet | Source | License | Where |
|---|---|---|---|
| 3D simplex noise (GLSL) | ashima/webgl-noise (Ian McEwan, Stefan Gustavson) | MIT | src/render/shared/glsl.ts |
| Animated Voronoi caustics | Original implementation (Aquarium Go) | Project | src/render/shared/glsl.ts |

## Libraries

Runtime libraries (MIT unless noted): react, react-dom, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing (Zlib), zustand, immer, idb-keyval (Apache-2.0), motion, clsx, simplex-noise.

<!-- Lanes: append rows under your own heading below. -->

## Lane: core

| Item | Source | License | Where |
|---|---|---|---|
| cyrb53 53-bit string hash (algorithm) | bryc, "cyrb53" (github.com/bryc/code, jshash) | Public domain | `src/persistence/serialize.ts` (`cyrb53`) — save checksums + determinism hash |

## Lane: brackish

| Item | Source | License | Where |
|---|---|---|---|
| Estuary species models (figure-eight puffer, bumblebee goby, sailfin molly, banded archerfish) | Original procedural body plans (Aquarium Go) | Project | `src/render/creatures/fish/{figure_eight_puffer,bumblebee_goby,sailfin_molly,banded_archerfish}.ts` |
| Mangrove roots, oyster shells, estuary pebbles, mangrove seedling | Original procedural generators (Aquarium Go) | Project | `src/render/decor/gen/estuary.ts` |
| Species facts | Cited per species (FishBase, Seriously Fish, USGS NAS, Florida Museum, ADW, Australian Museum, Vailati et al. 2012, Wikipedia, The Puffer Forum) — facts only, no text or images copied | — | `src/data/species/brackish/*`, `docs/research/brackish.md` |

## Lane: shows

| Item | Source | License | Where |
|---|---|---|---|
| Trophy art: lathe cups and bowls, pleated rosettes, shield plaques, wall shelf and glass vitrine | Original procedural geometry (Aquarium Go) | Project | `src/render/facility/Trophies.tsx` |
| Rosette / cup / plaque / bowl icons | Original inline SVG (Aquarium Go) | Project | `src/ui/panels/shows/Ribbons.tsx` |
| Normal CDF via the Abramowitz & Stegun 7.1.26 erf approximation (a published formula, own implementation) | Abramowitz & Stegun, *Handbook of Mathematical Functions* (1964, US NBS) | Public domain | `src/sim/shows/judging.ts` (`normCdf`) |
| Show, club, judge and exhibitor names | Original (Aquarium Go) — no real shows, societies or people | Project | `src/data/shows.ts` |
