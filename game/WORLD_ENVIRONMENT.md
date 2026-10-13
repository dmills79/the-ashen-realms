# Milestone 3 — world environment

Implemented on `feature/visual-overhaul`, retaining the existing browser/Canvas engine.

## Delivered

- `environment.js` renders continuous outdoor materials across Havenmere, Gloamwood and Gromclaw camp. Static terrain is cached at twice logical resolution and cropped to the camera; the tile atlas remains available for furniture, obstacles, dungeon floors and interiors.
- New illustrated woodland ground, ancient oak and Havenmere gatehouse PNGs are in `assets/environment_v3/`. These are actual generated raster assets, not enlarged legacy sprites. Exact built-in imagegen prompts are recorded in `assets/environment_v3/generation.json`. Original artwork and LPC attribution remain intact.
- Broad tonal fields and detailed ground texture replace cell-by-cell grass patches. World-aligned paving, worn road surfaces, softened verges and rounded outer road corners reduce grid repetition.
- Duplicate fountain atlas tiles beneath the town fountain have been removed; the original blocked footprint remains.
- The river uses continuous current lines and shaded banks. One timber deck spans the original walkable crossing, including the western path approach; subtle glints and mist animate without using gameplay randomness.
- Town tree positions, buildings and public props remain fixed. Sparse woodland trees use the same ground-depth ordering as characters, avoid road corridors and fade near the player. Traversable forest retains low undergrowth rather than becoming a new collision obstacle.
- Havenmere's world landmark uses a painted gatehouse at its original entrance. Town facades, camp structures, dungeon destinations and interior illustrations retain their existing coordinates and interactions.

## Preservation and fallback

No map generation, walkability, entity coordinates, quest rules, combat calculations or save schemas changed in this milestone. The `ashen-realms-v1.2-save` key is unchanged. Environmental images load independently, invalidate the static cache when ready, and retain procedural ground or existing town artwork when unavailable. Trees are visual decoration only; their proximity fade makes their traversable tiles readable.

The three outdoor map caches total roughly 25 MB of RGBA backing pixels, plus decoded artwork. Repeated frames crop existing canvases rather than rebuild materials. This is bounded by the existing three outdoor map objects. It does not introduce another animation loop or dependency.

## Validation and preview

From `game/`, run `npm start` and open `http://127.0.0.1:8844`. Continue an existing save or start a new game, walk east out of Havenmere, inspect the river crossing, then travel to Emberfall Crypt and Gromclaw camp. Existing zoom and keyboard movement controls remain available.

Validation passed: 62 unit checks and 21 browser checks, JavaScript syntax and diff whitespace checks. These include four environment unit checks, existing combat/character regressions, desktop/mobile browser screenshots, unchanged map data and collision results before/after rendering, keyboard settlement travel and save/reload. Review screenshots under `artifacts/environment-overhaul/` after browser tests. Run `npm test` and `npm run test:browser`; the installed Chrome can be selected with `ASHEN_BROWSER_CHANNEL=chrome`.

## Remaining art and limitations

- The river route, road network and collision perimeter retain their original grid geometry. Soft banks and rounded road corners improve presentation without moving gameplay boundaries.
- Woodland currently uses one oak illustration. Additional oak/pine/birch silhouettes, fallen trees, reeds and varied rock outcrops would reduce recognizable asset reuse.
- Town facades, camp tents, fences, crates, crypt masonry and several props still use the older art style. A matched environmental prop pack and illustrated crypt/camp entrance assets remain desirable.
- Mist and water glints are implemented; wind-driven foliage animation requires suitable layered or animated foliage assets.
- Title screen and character creation (Milestones 4 and 5) have not been started.

## Files changed in this milestone

- Added `environment.js`, `assets/environment_v3/ancient_oak.png`, `woodland_ground.png`, `havenmere_gate.png`, and `generation.json`.
- Updated `game.js` for the continuous ground pass, depth-sorted woodland trees, illustrated town trees and gatehouse, animation pass and duplicate fountain cleanup.
- Updated `index.html` and `server.py` to load/serve the environment renderer; updated `package.json` to include environment unit checks.
- Added `tests/environment.test.mjs` and `tests/browser/environment.spec.mjs`.
- Added this report and updated `README.md` and `VISUAL_OVERHAUL.md`. Other uncommitted files belong to the earlier approved milestones; no dependencies were added.
