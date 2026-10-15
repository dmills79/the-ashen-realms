# Living World Environment Engine

The existing Canvas 2D renderer, 24-pixel navigation grid, game rules and save key remain in place. No new runtime dependency or engine migration was introduced.

## Scene contract

scene-runtime.js registers all eleven locations with map bounds, layers, independent scenic footprints, lights, ambience identifiers, spawn observations, NPC schedules, interactions, portals and encounter/quest metadata. game.js still owns the established quest, inventory, combat and transition rules. Scene metadata describes those rules rather than silently replacing them.

interiors.js owns authored high-resolution room shells, independent timber/column foregrounds, furniture source rectangles, floor footprints and explicit prop depths. architecture.js registers town buildings and solid furniture in the actor depth pass; masonry.js derives cached continuous dungeon wall runs from existing blocked cells. world-props.js owns crypt and camp scenery and its independent footprints. environment.js owns route-aware forest trees and cached terrain materials. Tree trunks block their own cells; the road corridor and its one-cell shoulder remain clear. Do not add collision to the painted canopy silhouette.

All positions use grid cells. Character feet use the cell center. Animation positions are presentation-only; the integer player cell remains authoritative for movement, LAN presence and encounters. Props sort at their floor base. Explicit south foreground architecture renders afterward. Near-player canopy and crypt arch fades preserve visibility.

## Adding content

1. Author the room or outdoor layout and preserve purposeful walkways.
2. Add original/licensed sprites with explicit source rectangles and floor anchors; register actual dimensions, not requested generation dimensions.
3. Define collision separately from artwork bounds. Register scenic metadata with the scene contract.
4. Use the existing E interaction dispatch and existing dialog for labels and descriptions. Keep quest NPC interaction anchors discoverable.
5. Put persistent flags under world.objects with scene:id keys. Rendering and collision must read the same state.
6. Define light/fire sources in lighting.js. Use cached masks with restrained source-local intensity and original flame frames.
7. Define active-scene NPC schedules and routes in npc-behavior.js. Use its pathfinder and occupancy reservations; never move NPCs in a drawing function.
8. Run the unit suite, route audit, real browser checks, both viewport sizes and all supported zoom levels. Inspect screenshots after imagery has decoded.

## Lifecycle and compatibility

world-time.js migrates legacy step-based daylight to a saved configurable clock. Hidden tabs, overlays and combat pause exploration simulation. Only the active NPC scene is simulated. Loading clears transient NPC paths; ambient NPC occupancy never relocates a saved player.

The existing ashen-realms-v1.2-save key and version-5 data remain compatible. Legacy saves inside newly solid furniture, trees or tombs relocate only their position. Equipment, party, inventory, stats and quest flags remain intact.

Fallback ART textures use a 24-entry LRU; scene drawable lists retain at most four locations. Character animation records are bounded at 256. Two reusable lighting masks serve warm/cool sources. Static terrain canvases are cached per existing map. These counts do not describe total decoded image or GPU memory.

## Reproducible checks

From game/: npm.cmd test; node --check game.js; node --check network.js; node --check server.mjs.

Canonical browser command: npm.cmd run test:browser. The worker runner stalled on this host, so it is not reported as passed. Diagnostic alternative against the running default server: node tools/check-living-world-browser.mjs. This executes the selected existing spec callbacks with real Playwright assertions and a new Chromium context for each case. It does not reproduce worker hooks or the complete browser suite.

node tools/benchmark-living-world.mjs measures a settled 180-frame tavern RAF sample plus warmed render-call CPU timings. It records host and limitations in artifacts/living-world/benchmark.json. Start the server on 8844 first; changing origin changes the browser's save storage.

CharacterMotion lazily loads identity-matched PNG sheets with 12 desktop / 6 small-viewport atlas entries and 48 / 24 isolated frame canvases. Numeric ambient pose references use the same measured-frame renderer and exclusions. Equipment artwork follows actual inventory selection; missing corpse hand anchors suppress held gear rather than floating it.

NPC route waypoints can specify action, duration and a real seat. Seating reserves the seat and its standing anchor; actors cannot pass through player or NPC occupancy. Routes depart through authored doors when schedules end. Quest NPC identities/dialog remain at accessible anchors.

See LIVING_WORLD_ASSETS.md for delivered artwork and optional refinements and LIVING_WORLD_PROGRESS.md for milestone evidence.
