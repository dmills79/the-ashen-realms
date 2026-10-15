# Living World Art Pipeline and Remaining Assets

Use detailed painterly dark fantasy art, natural materials and restrained illumination. Keep a steep overhead south-facing camera and north-up room axes. Do not replace missing production sprites with geometric illustrations.

## Original assets delivered

All files below live in assets/living_world/. generation.json records built-in ImageGen prompts and edits. Existing artwork and LPC attribution remain intact.

| Asset | Actual pixels | Layout and purpose |
| --- | --- | --- |
| fire_cycle.png | 1774 x 887 | 4 x 2 real flame frames; fixed base; fireplace/candle/forge/camp/crypt flames |
| tavern_npc_poses.png | 1254 x 1254 | 3 x 3; keeper working, Pella and Rook seated idle/drinking/conversation |
| interaction_atlas.png | 1536 x 1024 | Explicit measured crops; gate open/closed, chest open/closed, lantern, noticeboard |
| seated_male.png | 1254 x 1254 | 2 x 2; Human Fighter/Rogue/Wizard/Cleric seated poses |
| seated_female.png | 1254 x 1254 | Matching female Human seated poses |
| world_materials.png | 1254 x 1254 | 2 x 2; forest soil, trail gravel, stream, crypt stone. Reusable texture samples |
| world_props.png | 1536 x 1024 | 3 x 2; banner, stone/log fire, satchel, sign, rune seal, closed crypt gate |
| world_states.png | 1774 x 887 | Measured unequal content bounds: open gate [60,0,910,887], spent seal [1080,0,630,887] |

No external third-party game art was newly downloaded. Generated atlas layouts are inspected rather than assumed. Source padding and foot anchors are independent from draw size. Alpha samples were verified in browser; the image-generation preview backdrop is not reliable evidence of an opaque PNG.

The existing tavern shell, seven distinct interior layouts, furniture/trade atlases, town architecture, forest trees/undergrowth and battle illustrations were retained. Secondary room shell panels are roughly 580 x 452 at a 432 x 336 logical room size; they are not newly generated individual high-resolution room paintings.

## Remaining production art

These are concrete limitations, not completed animations or final worldwide art sign-off.

| Required asset | Dimensions / orientation | Frames and placement |
| --- | --- | --- |
| Extended identity walk cycles | 128 x 160 RGBA per frame; 4 cardinal views | 6-8 frames per view for each existing ancestry/class/gender identity; fixed foot center at 64,148. Existing cardinal standing + alternate stride is a real two-pose cycle, with limited fluidity. Eight-direction art is absent. |
| Customized combat actions | 192 x 192 RGBA; matching current illustrated body identity | Female Human and all non-Human variants: melee, ranged, cast, hit, defend/dodge, death; 6-8 action frames and explicit impact marker. Current matching standard male class atlases provide action poses; customized identities retain their appearance rather than being replaced with mismatched bodies. |
| Non-Human seated poses | 192 x 192 RGBA; south-facing overhead | 3 seated idle/drink/converse frames per class and gender; fixed seat/floor anchors. Current original seated player art covers Humans. |
| Ambient traveler action poses | 128 x 160 RGBA; 4 views | 3 standing drink/serve/converse poses, 3 chair poses; bind to explicitly reserved seats. Current travelers walk with real frames and pause at destinations; no complete serving or eating animation is claimed. |
| Interior foreground partitions | 512 x 512 RGBA modules; south and side walls | Separate inn partitions/door frames, cottage alcoves, hall/chapel columns, consistent with existing shells. These remain baked into secondary room backgrounds and cannot provide complete per-wall actor occlusion. |
| Outdoor architecture foreground | 512-1024 RGBA per building | Roof/eave/canopy cutouts and ground/trunk-only layers matching existing town buildings and trees. The forest fades protect readability; all outdoor roofs are not yet individually sorted foreground layers. |
| Dungeon structural set | 256 x 256 RGBA modules | North/east/west wall caps, corners, arch piers and rubble in the same overhead perspective. Existing masonry is textured and props depth-sort, but corridor wall silhouettes still follow the old geometric room plan. |
| Terrain edge transitions | 256 x 256 RGBA tileable masks/textures | Authored grass-to-paving, mud-to-trail and irregular river-bank transitions; no thick uniform edge outline. Current sampled materials improve detail but seams and repeated town/camp road shapes remain visible at large zoom. |

Full-resolution authored secondary shells and distinct camp tent variants would further reduce repetition. They must preserve existing room boundaries, doorway cells and clear routes, or include an explicitly reviewed geometry revision.

## Acceptance boundary

The tavern is the polished functional reference. The reusable systems and a first world visual pass are implemented. Milestone F still needs the structural foreground and terrain-edge art above before every environment can honestly be called equal to the tavern. No static mockup replaces gameplay. No unsupported hardware, mobile GPU, Firefox or Safari performance claim is made.
