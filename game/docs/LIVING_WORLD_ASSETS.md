# Living World Art Pipeline

Detailed painterly dark fantasy art uses a steep overhead, north-up camera, natural materials and restrained light. Existing artwork and LPC attribution are retained. No external game artwork was downloaded. Original generation prompts and source paths are in assets/living_world/generation.json.

## Completed production assets

The existing tavern shell, furnishings, trade props, town buildings, forest vegetation and battle paintings remain the foundation. This completion adds57 original PNG assets:

- 32 identity-matched walk atlases cover four ancestries, four classes and both appearances, with four cardinal facings.28 have six distinct phases per direction; four have five actual phases. No frames are duplicated to meet a requested grid.
- 8 ancestry/appearance combat atlases each provide all four classes with windup, melee impact, cast preparation/release, hit, defend, death and ranged release artwork. These are timed key poses, not claims of continuous six-frame attack animation.
- 6 non-Human seated atlases provide class-specific idle, drinking and conversation poses. Existing Human seated artwork remains supported.
- One ambient action atlas provides standing drink/serve/converse and seated idle/drink/converse poses for the actual Rogue and Cleric traveler identities.
- Six high-resolution, furniture-free room shells replace the low-resolution secondary interior panels: hall, smith, inn, chapel, cottage and bakery.
- Structural atlas and continuous dungeon wall sprites supply independent timber partitions, columns and masonry foregrounds.
- Terrain transition atlas supplies painted trail banks, paving fringes and river banks along cached smoothed map contours.
- Equipment atlas provides iron sword, Ashblade, runestaff and oak bow selected from actual inventory equipment. Unmeasured corpse hands suppress held gear.

## Registration and rendering

Run node tools/measure-motion-atlases.mjs --ambient assets/living_world/ambient_poses.png from game/. The dependency-free PNG decoder measures full-body alpha components and absolute foot anchors; strong-alpha seeds separate faint bridges between neighboring figures. Crops may cross nominal cells. Row-run exclusion masks remove foreign neighboring pixels without clipping complete limbs. Bounded runtime frame canvases apply these masks once. measurement-report.json records dimensions, real frame counts and errors; an invalid/incomplete directory cannot overwrite the final manifest.

The four five-row layouts are explicitly declared in the measuring tool; actual component row positions handle the empty bottom margin. No missing phase is synthesized. Manifests contain measured source rectangles and common standing reference heights, so defeated bodies retain scale. Active combat poses also contain visually calibrated source-pixel hand anchors and weapon angles; these anatomical points are estimates rather than alpha measurements. The runtime never borrows another ancestry or appearance.

Town buildings, furniture and dungeon walls enter the same foot-depth pass as actors. Inn wall pieces sample continuous artwork in separate depth bands. Collision uses authored floor footprints independently of alpha silhouettes. Room shell and structural art switch together after decoding. Town roads, doors, protected quest approaches and existing map geometry remain intact.

## Remaining limitations and future asset briefs

All currently required identity/action/structural asset categories are supplied. Four directions are supported; optional diagonal art would require four additional views for every identity at the same measured foot anchor. Additional in-between combat frames could improve fluidity, but actual impact/release timing already matches gameplay. Optional alternate camp tents, more tree species and terrain material variants would reduce repetition. These are future refinements, not represented as delivered artwork.

The game retains its existing grid-based overhead movement and authored map topology. Outdoor textures remain reusable materials and can repeat at high zoom; complete roof interiors are not simulated. NPC behavior is supported for authored current roles and schedules; the engine does not invent homes or dialogue for nonexistent residents. Performance observations are host-specific; GPU memory and Safari/Firefox/mobile hardware performance have not been certified.
