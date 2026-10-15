# Authored interior environments

The Wayfarer Tavern now uses painted architecture and transparent furniture sprites. Its bottle shelves, stone hearth with burning logs, timber framing, leaded windows, wall decorations, worn oak flooring, rug, storage and open entrance are recognizable artwork. The keeper stands behind a substantial bar; Pella and Rook sit at separate dining tables. Benches, a gaming table and storage leave a central route from the entrance to the bar and side routes to the patrons.

All seven buildings use the same scene system with different plans: the council hall has a dais, archives and council benches; the smith has a forge, tool bench, anvil, quenching barrel and stock; the inn has four partitioned sleeping alcoves and a communal area; the chapel has an apse, altar, columns and pews; the cottage has a cooking hearth, pantry, sleeping area and supper table; the bakery has a domed oven, bread counter, kneading table and grain storage.

## Delivered assets

Located in `assets/interiors_v2/`:

| Asset | Contents |
| --- | --- |
| `tavern_shell.png` | Dedicated 1422 × 1106 tavern architecture, fixed hearth, shelves, materials and baked lighting |
| `architecture_atlas.png` | 1741 × 903 atlas of six distinct architectural backgrounds |
| `furniture_atlas.png` | 1448 × 1086 RGBA atlas: bar, table, chair, bench, barrel, crates, bed, anvil, forge, workbench, altar and bookcase |
| `trade_atlas.png` | 1254 × 1254 RGBA atlas: bread counter, kneading table, gaming table and reception desk |
| `manifest.json` | Measured atlas crop coordinates and source dimensions |
| `generation_prompts.json` | Full prompts and provenance for the four built-in image_gen generations |

The previous `assets/interiors/*.png` backgrounds and generic decorative overlay are superseded during normal play. They remain on disk for compatibility. No LPC art or attribution files were removed. The reception desk is available for future scene refinements; the inn currently uses its painted reception counter.

## Scene authoring and gameplay integration

`interiors.js` owns the authored scene definitions, image loading, background and foreground passes, sprite drawing, local light sources and navigation footprints. Each prop has an art rectangle, explicit occupied floor cells and a depth value. These are deliberately separate: a chair back or forge hood is taller than its footprint. Atlas coordinates are measured from the delivered images rather than assuming the generator produced a perfectly regular grid.

The map remains an 18 × 14 array of 24-pixel navigation tiles. Scene configuration stamps walls and furniture into that existing array. The southern entrance remains at `(8,13)`, approached through `(8,12)`; entry is still `(8,10)`. Walkable areas are connected, including all inn alcoves. Painted wall wings block the southern row beside the doorway. Furniture joins the existing actor depth pass; foreground wall wings draw after actors. Material textures, detailed construction and contact shading come from the artwork. Low-intensity lighting pulses at the actual hearth, forge, oven and candle positions complement the painted lighting.

The keeper and seated patrons have accessible `talk` anchors. Interactions still call the existing dialogue, recruitment, merchant and quest handlers. An anchor lets the player speak across a counter without walking into it. The NPC's displayed position remains separate from that anchor.

The interior camera fits the whole room in the default desktop view. Higher zooms follow the player. Portrait screens use the portion of the canvas actually visible under CSS `object-fit: cover` to keep the player in view at both room edges. Portrait camera framing also keeps the player above the HUD docks when approaching the doorway. The overhead game and combat renderer remain in place.

The `ashen-realms-v1.2-save` key and save version remain intact. Loading an older interior save on newly occupied furniture or an NPC relocates only its coordinates to the nearest open cell. Character data, inventory, gold and quest flags remain authoritative.

## Verification

Run from `game/`:

```powershell
node --check game.js
node --check interiors.js
node --check network.js
node --check server.mjs
npm.cmd test
node tools/playwright.mjs test tests/browser/interiors.spec.mjs
```

The interior browser suite checks every walkable cell's connection to the entrance, all exits, all NPC conversation points, occupied prop cells, real movement into the bar, keeper and patron dialogue, Rook recruitment, southern exit, legacy-save relocation and reload. It also checks deterministic rendering, asset/page errors, HUD controls, both room edges and four zoom levels at desktop and portrait phone sizes. Screenshots are saved under `artifacts/interiors/`.

During implementation, 106 existing unit tests passed and syntax checks passed. The five interior browser test bodies were executed directly against Chromium using Playwright and its assertions because the CLI worker runner stalled at startup in this host. This distinction is recorded rather than claiming a successful CLI run.

## Remaining artwork

No additional asset is required to render or navigate the delivered interiors. Further polish would benefit from these specific assets:

- Six individual higher-resolution room backgrounds replacing the architecture atlas's approximately 580 × 452 panels, especially for large displays at close zoom.
- Dedicated seated directional sprites for Pella and Rook, and a serving pose for the keeper. Current characters use their existing artwork with furniture occlusion.
- Separate animated fire, embers and candle sprite frames. Current flames are painted into the art, with subtle animated illumination.
- Additional dining-table arrangements and individual stools, wall tools and storage variants to reduce repeated props as more rooms are authored.

These are future art refinements; primitive replacement props are not presented as finished assets.
