# Visual overhaul — Milestone 1

Branch: `feature/visual-overhaul`. This milestone changes combat presentation only. The existing campaign, character generation, class rules, turn timing, equipment, quests, local save key, networking, and artwork remain in place.

## Inspection and scope

The six images in `../design-references/` were reviewed. The combat screenshots show duplicate party statistics in windowed mode, tall empty side rails in expanded mode, and inconsistent character/enemy art. The exploration screenshot shows visible terrain squares; the title and character-creation screenshots show the current modal-based screens. Those latter problems belong to later milestones.

The game remains vanilla JavaScript and Canvas 2D with HTML/CSS overlays. In `game.js`, `drawBattle`, `battleHeroPoint`, `battleEnemyPoint`, and the backdrop functions control battle staging; `renderCinemaHud` and `renderCombatMenu` construct the interface. `drawLPC`, `drawActorSprite`, and `drawEnemy` select sprite sheets. `drawLocation`/`drawTile` control exploration; `drawTitle`/`mainMenu` control the title; `characterCreate`/`newHero` control creation. Persistent state is `G`; temporary encounters are `combat`.

Available art includes four illustrated class portraits, ten LPC humanoid sheets, sixteen original five-frame character/enemy sheets, terrain/hero/enemy atlases, illustrated town facades and interiors, and town/forest/crypt/camp battle backgrounds. They are reused without editing. LPC attribution files are retained. Sprite generation utilities exist, but some use old absolute output paths; asset-pipeline work is deferred to Milestone 2.

## Completed

- One combat party HUD shows portraits, HP, MP, level, class, poison, Guard, and timed protection. The exploration dashboard is hidden during both battle modes.
- A compact enemy strip replaces the right rail. The field uses the available width with correctly proportioned sprites and aspect-preserving background cropping.
- Desktop and portrait use a party strip beneath the scene. Short landscape uses a compact party rail to preserve battlefield height. Actions and events occupy reserved regions outside the scene.
- Active actors and hovered/keyboard-focused targets have ground markers. Remaining initiative appears in the desktop header.
- Hit, miss, critical, healing, status, ability, item, round, and death events have explicit types and metadata. Attack entries identify both participants and show roll/AC details; area entries show save details.
- The encounter keeps at most 100 events. The log has its own scrollbar, preserves the reading position when commands change, and follows new entries only when already at the bottom. LATEST returns to the newest event. Log text remains HTML-escaped.
- Combat styles are centralized in `combat.css`; obsolete combat overrides were removed from `style.css`.
- The Python server also serves `combat.css`; the Node static server already supports it.
- Windowed/expanded controls, number keys, Escape, tactics, and existing combat calculations remain available. Effects update their anchors during resizing.

## Verification

Run from `game/`:

```bash
node --check game.js
node --check network.js
node --check server.mjs
npm test
ASHEN_BROWSER_CHANNEL=chrome npm run test:browser
```

The optional channel setting uses an already installed Chrome instead of downloading Chromium. Without it, the existing Playwright browser configuration applies. No dependencies or browsers were installed for this milestone.

Final results: 51 unit checks passed (also verified by running `node tests/p0.test.mjs` directly), and all 14 browser tests passed in installed Chrome. JavaScript syntax and `git diff --check` passed. Python syntax passed through AST parsing; the Python server was not run because aiohttp is not installed. No installation was attempted.

The browser suite covers windowed and expanded combat at 1440×900, 1920×1080, 1024×768, 390×844, 360×640, 844×390, and 640×360. It checks panel bounds, one visible party HUD, all three party portraits, battlefield size, keyboard attacks, critical/death events, item healing, scroll/focus preservation, statuses, resizing mid-ability, victory, and movement after combat. Existing title, creation, inventory, party, shop, and save/reload smoke checks also run. Unit additions cover event metadata, area deaths, actual item healing, and bounded transient history.

Screenshots: `artifacts/visual-overhaul/`. Browser report: `playwright-report/index.html`. Test contexts isolate their saves from the normal game at port 8844. Fixture HP values in screenshots are intentionally increased to keep encounters open during layout checks.

## Preview

```bash
cd game
npm start
```

Open `http://127.0.0.1:8844`, start or continue an adventure, and enter a battle. Use WINDOWED/EXPAND in the combat header. To inspect a specific encounter, the existing console API supports:

```js
window.AshenRealms.beginCombat(['slime', 'wolf']);
```

This command works during exploration; it uses normal combat rules. Existing saves remain at the same browser hostname and port.

## Remaining art and visual work

No artwork was replaced. LPC heroes still differ from illustrated portraits; several enemies, especially the smiling slime and angular wolf, do not meet the intended dark-fantasy style. LPC has idle/walk/slash rows but no dedicated cast/hit/death rows in the bundled sheets. Existing backgrounds are illustrated but often stylized, and panoramic cropping can lose architectural context.

Milestone 2 needs a consistent portrait/sprite family for Arden, Sister Elowen, Rook, all four classes, and enemy families. Priority replacements are the slime and wolf, with transparent full-body frames, consistent ground anchors and proportions, and idle/attack/cast/hit/death states. Future environment work needs cohesive terrain transitions, vegetation, riverbanks, and wide battle staging art. Image-generation capabilities are available for an approved later art milestone; no new art was generated here.

World terrain, title, and character-creation redesigns remain deferred. Milestone 2 must not begin until Milestone 1 is approved.

## Milestone 2 update

Milestone 1 was approved, and Milestone 2 is now implemented. The historical artwork limitations above are superseded by 16 new illustrated sheets and the manifest-driven renderer. See [CHARACTER_ART_PIPELINE.md](CHARACTER_ART_PIPELINE.md) for current deliverables, provenance, verification, and remaining limitations. The original assets and LPC credits remain intact; Milestone 3 has not begun.

## Milestone 3

Outdoor terrain now uses cached continuous materials, illustrated woodland ground, painted oaks, a new Havenmere gatehouse, softened road verges, a unified river crossing and subtle water/mist animation. Map generation, collisions, quests and save formats are unchanged. See [WORLD_ENVIRONMENT.md](WORLD_ENVIRONMENT.md) for changed components, preview instructions, verification and remaining artwork.

## Milestone 4

The title screen now has illustrated Havenmere-at-night scenery, one prominent title, responsive journey controls and subtle cinematic atmosphere. Settings reuse sound/music and world zoom controls, with preferences stored separately from adventure saves; reduced-motion preferences are respected. See [TITLE_SCREEN.md](TITLE_SCREEN.md). Character creation (Milestone 5) remains unchanged.

## Milestone 5

Character creation now provides class portraits, ancestry/class cards, detailed dice, two score-allocation methods, live starting statistics and a separate review before beginning. Shared creation arithmetic preserves all existing rules and companion creation. Existing portraits are reused; ancestry-specific art remains a documented need. See [CHARACTER_CREATOR.md](CHARACTER_CREATOR.md).
