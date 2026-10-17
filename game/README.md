# The Ashen Realms v1.8 — Mobile Expansion

The current development release adds safe-area responsive exploration, contextual hold-to-move touch controls, full-size mobile combat targets, reliable browser-test shutdown on Windows, and explicit cache revalidation/version headers. The save key remains `ashen-realms-v1.2-save`; no save migration or production deployment is required.

# Living World completion

The current Canvas 2D game now includes identity-matched directional walking/action artwork, inventory-selected weapon sprites, active NPC routines with real seating, dynamic saved world lighting, interactive persistent objects, independent architectural foregrounds and upgraded world scenery. See [the environment engine](docs/ENVIRONMENT_ENGINE.md), [asset pipeline](docs/LIVING_WORLD_ASSETS.md), and [milestone evidence](docs/LIVING_WORLD_PROGRESS.md). Existing campaign mechanics, save key and LPC credits are preserved.

# The Ashen Realms — Visual Overhaul Preview

Building interiors now use authored painterly architecture, transparent furniture sprites, shared depth sorting and aligned navigation footprints. The Wayfarer Tavern has a bar, seated patrons, hearth, storage and clear walkways; six other buildings have distinct plans. See [interior environments](INTERIOR_ENVIRONMENTS.md) for assets, scene authoring, verification and remaining art refinements.

Milestone 2 adds 16 illustrated character/enemy animation sheets, a manifest-driven renderer, and an animation preview at `http://127.0.0.1:8844/characters.html`. The original portraits, artwork fallbacks, campaign, combat rules, and save key remain intact. Milestone 1 provides the responsive combat layout and structured event log.

See [the character art pipeline](CHARACTER_ART_PIPELINE.md) for the delivered artwork, preview, validation commands, and remaining animation/art limitations. The LPC integration notes below describe the preceding release; the new illustrated sheets now render first, with those original assets retained as fallbacks.

---

# The Ashen Realms v1.7 — LPC Character Preview (previous release)

This is an incremental, playable visual integration of the user's **LPC Revised** open-art ZIP into the existing v1.6 Node.js/browser RPG. It is **not** a finished world/graphics overhaul.

## Run on Windows

Open a PowerShell window in the `game` folder and run `npm.cmd start`; visit `http://127.0.0.1:8844`. Use the same browser host/port as before to retain browser save access. The single-file HTML edition runs without Node.js; it has no LAN presence/chat.

## P0 combat rules and verification

The existing classes, campaign, artwork, and save key are retained. Current rules:

- Natural 1 misses; natural 20 hits and doubles damage dice only. Area saves do not critical-hit.
- Poison deals 2 HP at the start of each of the next two affected hero turns. Antidote, Purifying Light, and rest can clear it earlier.
- Guard halves damage until that hero's next turn. Battle Cry and Smoke Veil halve damage through the end of the following round. Protection does not stack, and ends when the encounter ends.
- Frost Lance has a 50% chance, after a hit on a surviving target, to reduce attack by 1 for the rest of the encounter.
- Weapon bonuses and Martial Training affect physical damage. Spellcraft and Runestaff's +3 spell bonus affect single-target and area spell damage, not healing.
- Every stocked consumable is available in combat. Rations heal the conscious party directly; a successful item use spends one item and one turn. An unusable item spends neither.
- Saves from versions 2–5 still use `ashen-realms-v1.2-save`. Loading validates the complete candidate before replacing the current adventure and clears temporary combat protection. Invalid saves are left untouched.

From the `game` folder, run `npm.cmd test` on Windows or `npm test` elsewhere. The regression suite uses Node's built-in test runner and needs no installed packages. Browser storage, audio, rendering APIs, and timers are simulated; it does not access real saves. For browser verification, check character creation, movement, manual/automatic combat, items, equipment swapping, shops, and save/reload at the same host and port.

## Changes

- Composited ten original LPC Revised layered character sheets into four directional rows each of idle, walking, and slash frames (64px per frame, 8 columns × 12 rows).
- The game now uses LPC Revised art for the four RPG classes during exploration and combat, plus several humanoid foes. Existing enemy sprites remain for non-humanoid creatures and selected encounters.
- Preserves quests, spells, MP, character progression, loot, merchants, auto-combat tactics, music, and the Node server.
- Exact existing save key is unchanged; old saves still belong to their original browser storage origin.

## Limitations / accuracy

- LPC Revised is **top-down pixel art**, not high-definition 3D. It is a clear visual-style test, not proof that every location or encounter now has matching art.
- Humanoid monsters are temporary recolored LPC human bases; dedicated creature anatomy, movement sets, clothing/equipment visibility, environment tile replacement, and full combat staging redesign remain TODO.
- Art shown by combat portraits and large background images still comes from prior builds; these are not fully unified with LPC yet.
- Movement animations use the existing grid-step input; continuous movement has not been re-implemented.
- Some NPCs reuse the four class sprite templates.
- Render and browser smoke checks are described separately if supplied; no networked combat has been added.

## License / credits

LPC Revised source: https://github.com/ElizaWy/LPC
License: OGA-BY 3.0 / CC-BY 3.0 as applicable; attribution is mandatory. The original repository `Credits.txt`, relevant class-level credit lists, and additional layer details are preserved under `assets/lpc/ATTRIBUTIONS.txt` and `assets/lpc/SOURCE_Credits.txt`. Check individual license information before public release.

---

# The Ashen Realms v1.7 — LPC Character Preview

This is an incremental, playable visual integration of the user's **LPC Revised** open-art ZIP into the existing v1.6 Node.js/browser RPG. It is **not** a finished world/graphics overhaul.

## Run on Windows

Open a PowerShell window in the `game` folder and run `npm.cmd start`; visit `http://127.0.0.1:8844`. Use the same browser host/port as before to retain browser save access. The single-file HTML edition runs without Node.js; it has no LAN presence/chat.

## Changes

- Composited ten original LPC Revised layered character sheets into four directional rows each of idle, walking, and slash frames (64px per frame, 8 columns × 12 rows).
- The game now uses LPC Revised art for the four RPG classes during exploration and combat, plus several humanoid foes. Existing enemy sprites remain for non-humanoid creatures and selected encounters.
- Preserves quests, spells, MP, character progression, loot, merchants, auto-combat tactics, music, and the Node server.
- Exact existing save key is unchanged; old saves still belong to their original browser storage origin.

## Limitations / accuracy

- LPC Revised is **top-down pixel art**, not high-definition 3D. It is a clear visual-style test, not proof that every location or encounter now has matching art.
- Humanoid monsters are temporary recolored LPC human bases; dedicated creature anatomy, movement sets, clothing/equipment visibility, environment tile replacement, and full combat staging redesign remain TODO.
- Art shown by combat portraits and large background images still comes from prior builds; these are not fully unified with LPC yet.
- Movement animations use the existing grid-step input; continuous movement has not been re-implemented.
- Some NPCs reuse the four class sprite templates.
- Render and browser smoke checks are described separately if supplied; no networked combat has been added.

## License / credits

LPC Revised source: https://github.com/ElizaWy/LPC
License: OGA-BY 3.0 / CC-BY 3.0 as applicable; attribution is mandatory. The original repository `Credits.txt`, relevant class-level credit lists, and additional layer details are preserved under `assets/lpc/ATTRIBUTIONS.txt` and `assets/lpc/SOURCE_Credits.txt`. Check individual license information before public release.

---

# The Ashen Realms v1.6 — Loot, Music and Interiors

## Windows install

1. Download the v1.6 Node.js ZIP and extract it to a new directory.
2. Open PowerShell **inside the `game` folder** containing `package.json`.
3. Run `npm.cmd start` and visit `http://127.0.0.1:8844`.
4. Stop the server with Ctrl+C. No subscriptions or NPM installation are necessary.

## What's new
- Five **original** offline OGG soundtrack themes, generated with additive synthesis (not sourced from copyrighted tracks): town, interior, wilderness, crypt, battle. Click SOUND ON after browser playback starts if needed. Soundtrack changes by environment and encounters.
- Real monster drops: every enemy family has an independent chance to drop potions, rations, Moonwater, salves, weapons, armor, and sometimes rare gear. All drops enter `G.bag`, appear in inventory and are included in the victory text.
- Gear such as the Ashen Longsword, Hunter Bow and Silverguard Mail affects real combat damage or Armor Class when equipped.
- Merchant quantity controls: BUY and SELL tabs, type a quantity or use +/- buttons; items are priced per unit, selling earns half base value, and quantities and gold are saved. Old gear must be unequipped before selling.
- Garrick runs the forge; Mira now sells **stackable travel rations** at the bakery; Pella offers a traveling-supplies store. Rations restore 7 HP to every conscious injured companion.
- All seven enterable Havenmere rooms have unique, more cohesive illustrated interiors with different furnishings and floors rather than a uniformly tiled interior.
- Existing quests, field spells, combat tactics, level progression and previous save key are retained.

## Save data
Local browser saves still use `ashen-realms-v1.2-save`. Keep the same browser hostname+port as before, and back up existing saves before upgrading.

## Art-source research (not embedded)
These were independently researched CC0 alternatives for the future consistent sprite overhaul. The downloads could not be retrieved during this build, so **this release DOES NOT include those third-party sprites**.
- Open RPG Fantasy Tilesets by finalbossblues — https://finalbossblues.itch.io/openrtp-tiles — CC0, 16x16 town, house, dungeon chipsets. Requires atlas adaptation to fit the existing engine.
- Kenney Tiny Dungeon — https://kenney-assets.itch.io/tiny-dungeon — CC0, 130+ sprites, tiled sample.
- Kenney Tiny Town — https://kenney.nl/assets/tiny-town — CC0, 16px compatible town tiles.
- OpenGameArt Town Theme RPG by cynicmusic — https://opengameart.org/content/town-theme-rpg — CC0, candidate for optional future soundtrack replacement.
- OpenGameArt Forest Ambience by TinyWorlds — https://opengameart.org/content/forest-ambience — CC0, candidate for optional future soundtrack replacement.

## Known limits
The combat and exploration sprites remain the existing stylized originals. The soundtrack is electronically synthesized, not an orchestra recording. LAN only syncs presence and chat; not cooperative battles. Browser audio playback is initiated by user gesture.

Milestone 3 adds continuous outdoor terrain, painted woodland assets, a Havenmere gatehouse, improved river/bridge rendering and subtle environmental animation. See [WORLD_ENVIRONMENT.md](WORLD_ENVIRONMENT.md) for preview, validation and remaining environment artwork. Existing saves retain their original hostname/port requirements.

Milestone 4 introduces a cinematic title menu with new Havenmere-at-night artwork, responsive New Game/Continue/Settings controls and separate sound, zoom and title-motion preferences. See [TITLE_SCREEN.md](TITLE_SCREEN.md) for files, artwork provenance, validation and preview instructions. Milestone 5 remains pending.

Milestone 5 replaces the character-creation form with portrait-led ancestry/class cards, pip-dice rolls, score swapping, live starting statistics and a final review. Existing 4d6-drop-lowest rules, bonuses and saves are preserved. See [CHARACTER_CREATOR.md](CHARACTER_CREATOR.md) for files, validation, preview and remaining portrait needs.

## Living world development checkpoint

The tavern now demonstrates shared foot-depth rendering, interpolated cardinal walking, synchronized combat effects, saved world time, source-local lighting, active-scene NPC routines, and persistent environmental interactions. Existing Canvas/grid gameplay and the save key remain in place.

See [engine guide](docs/ENVIRONMENT_ENGINE.md), [milestone evidence](docs/LIVING_WORLD_PROGRESS.md), and [asset inventory and remaining production art](docs/LIVING_WORLD_ASSETS.md). The town/forest/crypt/camp work is a first world visual pass; it is not a declaration that every location has reached final tavern quality.

Run npm.cmd test for unit checks. With the server running on port 8844, node tools/check-living-world-browser.mjs runs the diagnostic Chromium suite, and node tools/benchmark-living-world.mjs records warmed performance samples. The canonical browser worker stalled on this host and was not counted as passing.
