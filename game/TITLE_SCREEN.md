# Milestone 4 — title screen

Implemented on `feature/visual-overhaul` without changing the browser/Canvas architecture or installing dependencies.

## Delivered

- A single prominent typographic Ashen Realms title, chapter subtitle, concise story introduction and distinct New Game, Continue and Settings controls. How to Play remains available.
- Actual new illustrated Havenmere-at-night artwork: `assets/title_v4/havenmere_night.png`. This is a generated raster image, not an enlarged legacy backdrop. Exact prompt and built-in imagegen provenance are in `assets/title_v4/generation.json`. The original backdrop remains as a fallback.
- Subtle camera drift, mist and eight embers using CSS animation. Animation respects `prefers-reduced-motion` and can be paused in Settings. No gameplay randomness or extra animation loop is involved.
- Responsive desktop, phone portrait and short landscape layouts, readable contrast, visible keyboard focus and controls at least 44 pixels tall. Short screens may scroll vertically; the menu does not overflow horizontally.
- Settings for the existing sound/music toggle and exploration zoom, plus title animation. Preferences use `ashen-realms-presentation-v1`, separate from the unchanged `ashen-realms-v1.2-save` adventure key. Invalid preference values use defaults, and restricted storage retains session-only controls.
- New Game opens the existing character creator; Continue uses the existing save loader. Continue is disabled when no save exists. The main menu selects an initial keyboard focus and returns focus from Settings. Hidden dashboard controls are removed from keyboard navigation while on the title.
- Space activates focused buttons correctly. Existing movement shortcuts remain intact.

## Files changed

- Added `title.css` and `title-ui.js` for title presentation and isolated preferences.
- Added `assets/title_v4/havenmere_night.png` and `generation.json`.
- Updated `game.js` for the main menu, settings, preference application, keyboard button activation and removal of duplicate canvas title text.
- Updated `index.html` to load the title stylesheet, scene layers and preference script; updated the browser page title.
- Updated `server.py` to serve the new script and stylesheet.
- Added `tests/title.test.mjs` and `tests/browser/title.spec.mjs`; updated `package.json` to include preference unit checks.
- Added this report; updated `README.md` and `VISUAL_OVERHAUL.md`. Other outstanding files belong to earlier milestones.

## Validation

Final results: **65 unit checks and 31 browser checks passed**. JavaScript syntax, Python syntax parsing and Git whitespace checks also passed. The full browser suite covers both normal and expanded combat alongside title, exploration, inventory, party, merchants and save/reload.

The title-specific browser suite checks 1920×1080, 1440×900, 1024×768, 390×844, 360×640, 844×390 and 640×360. It verifies layout, keyboard activation, character creation entry, settings focus, preference persistence, Continue, system reduced motion, artwork fallback and restricted storage. Three new unit checks cover malformed preferences, isolation from adventure saves and blocked storage. Existing combat, character, exploration and inventory checks remain part of the full regression suite.

Screenshots are written to `artifacts/title-overhaul/`. Run `npm test` and `npm run test:browser` from `game/`; use `ASHEN_BROWSER_CHANNEL=chrome` to select installed Chrome where applicable.

## Preview and remaining work

Run `npm start` from `game/` and open `http://127.0.0.1:8844`. Reload an existing game page to see the title; saved adventures remain available through Continue. Preferences and saves remain tied to the browser origin.

The title artwork is complete for this milestone. The logo is styled live typography rather than a custom illustrated emblem. Portrait screens crop the wide landscape for readability; a dedicated portrait composition could expose more architectural detail. Broader environment/prop art differences documented in `WORLD_ENVIRONMENT.md` remain. Character creation styling and rules are preserved; Milestone 5 has not started.
