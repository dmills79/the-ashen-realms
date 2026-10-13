# Milestone 2 — illustrated characters and enemies

Implemented on `feature/visual-overhaul` after approval of Milestone 1. This milestone replaces character artwork and its presentation without changing combat rules, quests, inventory, movement destinations, character creation calculations, or saves.

## Delivered artwork

`assets/characters_v2/` contains 16 new 1448×1086 transparent sheets, with 12 full-body poses each (192 poses total): Fighter, Cleric, Rogue, Wizard, Mire Slime, Dusk Wolf, goblin scout, hexcaller, orc reaver, Gruk Bloodtusk, brigand, sentinel, Bell Warden, skeleton, grave wisp, and crypt bat.

Heroes use realistic adult proportions and identities based on the original portraits. Arden has dark hair/beard, worn steel armor, sword and shield; Elowen has chestnut hair, ivory robes and a staff; Rook has a dark hood, leather and daggers. Rook's halfling stature is represented in both exploration and battle. The Wizard preserves the original dark-haired elf portrait. Slime is now an organic faceless swamp creature; the wolf has natural anatomy and detailed fur.

Artwork was generated through the built-in imagegen skill/tool. Exact prompt recipes and reference roles are in `assets/characters_v2/generation.json` and `PROVENANCE.md`. Originals, portraits, and LPC attribution files remain intact.

## Pipeline and renderer

- `generation.json` stores the art briefs, names, and intended world/battle heights.
- `tools/character-assets.mjs` reads PNGs using Node's built-in filesystem/zlib modules. No image-processing packages or external build tools are required.
- Registration identifies complete figures from connected alpha components. Rectangular grid assumptions are deliberately avoided: staffs and spell silhouettes may extend into adjacent nominal cells. Exclusion spans identify pixels belonging to neighboring figures.
- The importer emits `assets/characters_v2/manifest.json` and its classic-script equivalent, `character-assets.js`. They contain measured source rectangles, ground anchors, standing reference heights, facing, and animation timings.
- `sprites.js` loads the four hero sheets initially and enemy sheets when needed. The engine retains the LPC/original-art fallback if a replacement is loading or unavailable. Overlapping regions are isolated once per pose in cached canvases; generated PNG files are not modified.
- Rendered size derives from standing height, independent of frame padding. Hit and defeat poses retain that scale, so fallen figures are not stretched back to standing height. Ground shadows use the same anchor and scale.
- Idle/walking animation uses elapsed time, not frame count. Actions use the existing cinematic clock. Hit reactions last 380 ms; defeat plays in 350 ms, within the existing 420 ms between damage resolution and turn completion. No turns or combat delays are added.
- Reactions live in the renderer's transient map, never on saved heroes. They are cleared when encounters end or a save is loaded.
- The exploration actor pass now sorts NPCs, party members, and LAN peers by ground position. Keyboard and direct/touch movement trigger walking only after a successful step. Coordinates and collisions are unchanged.

## Authoring and verification

From `game/`:

```bash
npm run assets:build
npm run assets:validate
npm test
ASHEN_BROWSER_CHANNEL=chrome npm run test:browser
```

`assets:build` changes only the generated manifests. `assets:validate` compares them against the source sheets and recipes without modifying files. The browser channel setting uses an installed Chrome; otherwise the existing Playwright browser configuration applies. No dependencies were installed.

The current regression suites include the 51 original combat/save/item checks, seven asset/renderer checks, and 18 browser checks. New checks cover all sheets/states, PNG registration, alpha isolation, animation timing, ground placement, lazy loading, failed-art fallback, world NPC scaling, actual casting/hit/death actions, and transient state. The Milestone 1 viewport and UI suites remain in place.

Final results: all 58 unit checks and all 18 Chrome browser tests passed. Manifest validation, JavaScript/Python syntax, and Git whitespace checks passed. The Python server was syntax-checked but not run because aiohttp is not installed; no installation was attempted.

## Preview

```bash
cd game
npm start
```

Game: `http://127.0.0.1:8844/`.

Animation atelier: `http://127.0.0.1:8844/characters.html` — inspect every character, switch states, pause, and mirror facing. It uses the same renderer and metadata as the game. Both included servers expose the preview and renderer scripts.

Browser screenshots are written to `artifacts/character-overhaul/` and `artifacts/visual-overhaul/`. Test browser contexts use isolated saves at port 8877.

## Remaining visual work

Two key poses per state provide readable animation, but longer in-between sequences would make movement and attacks smoother. Left-facing figures are mirrored; north/south movement uses the same three-quarter view rather than dedicated rear/front art. Unique NPC outfits/portraits, ancestry-specific faces, and visible equipment layers remain future art work.

Existing stylized terrain and backgrounds now differ from the more detailed character art. Those environment issues belong to Milestone 3. The title and character creator retain their current presentation for Milestones 4 and 5. No later milestone was started.
