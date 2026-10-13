# The Ashen Realms — Next Generation 3D, Wizardry Dungeons, and Troop Command

## Design identity

**One world, three complementary modes:**

1. **RPG exploration** — stylized hand-painted 3D fantasy in third-person or 3/4 overhead camera. Towns, wilderness, recruitable companions, interactive interiors, branching quests, and 4d6/d20 progression.
2. **Wizardry-inspired dungeon expeditions** — optional immersive first-person dungeon camera, maze exploration, mapping, traps, hidden doors, limited resources and threatening turn-based encounters.
3. **Squad-command encounters** — special larger-scale defensive battles, where players recruit infantry, archers and magical support, issue move/attack/defend/hold orders, and protect caravans or settlements. Troops should complement heroes, not replace the d20 RPG combat.

Cooperative LAN play connects up to four friends in one adventuring party for the first synchronized combat release. The current lobby protocol allows up to eight connections; this does not mean eight-member balanced d20 party gameplay is implemented.

## Visual quality bar (not yet implemented)

- Original stylized **3D** art, not larger pixel sprites. Use hand-painted textures with PBR materials for natural highlights and richer surface detail.
- Models created in Blender, exported as **glTF/GLB**, with 1K/2K textures as budget permits and compressed mesh/texture variants for the browser.
- Distinct player-class models with customization variations; rigged walk, idle, attack, cast, hit, death and gesture animations.
- Modular environment kits: medieval architecture, wooden interiors, caves, crypt masonry, vegetation, rivers, bridges, props, ruins, weather.
- Lighting: directional sun shadows, warm lantern/torch point lights, emissive magic, screen-space fog and selective bloom, optimized light counts and LOD.
- Browser rendering target: **Babylon.js** for 3D worlds/cameras/rigs/materials/lighting and an HTML/CSS overlay for party and network UI. The present 2D Canvas code remains a temporary renderer, not part of the final 3D game scene.

### Early production assets

| Asset family | First gold-standard scene | Requirements |
|---|---|---|
| Hero | 1 fighter | Rigged 3D model, idle/walk/attack, fantasy armor variations |
| NPC | Blacksmith | Full 3D character, dialogue camera |
| Buildings | Forge + village lane | Enterable shop, floor/wall meshes, doors, props |
| Wilderness | Forest clearing | Layered ground cover, rocks, trees, river, animated foliage |
| Dungeon | Crypt entrance + two rooms | First-person camera option, torch lighting, traps |
| Enemy | Skeleton | Rigged foe, melee animations, loot visualization |
| Troops | Swordsman + archer | Selection rings, formation target, stop/follow/attack |
| UI | Character editor | High-detail model preview, ancestry/class palette, stats & dice |

## Networking architecture

A **server-authoritative** game simulation is essential before launching shared combat, unit orders or valuable persistent characters. The browser sends commands; the server validates and applies them, broadcasts state deltas, and keeps the durable game state. The current v0.6 LAN server only relays presence, movement coordinates and chat; it is deliberately not authoritative.

Planned services:

- **Client:** Babylon.js 3D world + menus + websocket connection
- **Server:** authoritative party/session, combat turns, RNG/d20 rolls, quests, troop commands and inventory
- **Persistence:** SQLite initially; PostgreSQL if demand grows
- **Networking:** room/lobby/session messages using WebSockets with sequence IDs and reconnect strategy
- **Security:** server-owned RNG, authentication, input validation, rate limits, HTTPS/WSS for public hosting
- **Hosting:** LAN first on a trusted computer; later a Linux VPS or other service capable of persistent server processes, with reverse proxy and TLS

## Recommended milestone order

**v0.6 LAN Foundation — current preview:** players see each other, same-lobby chat, room joining; original single-player Chapter I remains intact.

**v0.6 Shared Adventuring Party:** invite/join a party, authoritative map position, shared dungeon instance, synced pickups and quest interaction, reconnect/disconnect handling, party permissions.

**v0.7 Cooperative d20 Combat:** deterministic server rolls, initiative, per-player character turns, shared enemy health, status and XP/loot allocation, group wipes and recovery.

**v0.8 The 3D Gold-Standard Scene:** Babylon.js proof of concept: one Havenmere street, enterable forge, one animated hero and NPC, dynamic torch/sun lighting, first-person dungeon section. Approve art direction before converting every map.

**v0.9 Troop Command:** controllable 4–12 unit squads, box selection, formation and attack-move orders, scripted Havenmere defense mission; expand carefully after latency and server load testing.

**v1.0 Integrated Chapter I:** polished stylized-3D campaign with shared-party co-op, first-person dungeon option, one troop encounter and persistent saves; make feature and performance tradeoffs as testing reveals costs.

These are design targets, not functionality already present in v0.6 or delivery dates.
