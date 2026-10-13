# Illustrated character assets

These 16 transparent PNG animation sheets were generated specifically for The Ashen Realms with the built-in `image_gen` tool during Milestone 2. They are actual replacement raster artwork, not enlarged LPC sprites or CSS stand-ins.

The four existing class portraits supplied facial identity references for Arden/Fighter, Sister Elowen/Cleric, Rook/Rogue, and Wizard. The newly generated Fighter sheet supplied the shared painted style for the other 15 sheets. The original portraits were not modified.

Exact prompt recipes are recorded in `generation.json`: Fighter has its full initial prompt; each other character uses `sharedPrompt + character.subject`. For the three remaining heroes, the input references were their original portrait followed by the new Fighter sheet. Enemy generation used the Fighter sheet as a style reference. No external third-party artwork was downloaded.

The source PNG bytes are copied directly from the built-in generator into this directory. The importer reads them without resampling or rewriting them. Individual figures are located using connected transparency components. The runtime isolates overlapping frame regions in cached canvases, preventing an adjacent pose's staff, limbs, or spell effect from leaking into the current pose.

Every sheet contains 12 poses: two idle, two walk, two attack, two cast/roar, two hit, and two defeat frames. Sheets are 1448×1086. The generated rows are approximately a 4×3 layout; measured frame bounds and anchors in `manifest.json` are authoritative.

Existing LPC sheets and all mandatory credit files remain untouched under `../lpc/`. They remain available as renderer fallbacks. Their attribution requirements continue to apply when those assets are distributed.

Limitations: two key poses per animation state, mirrored left-facing art, and no dedicated rear-facing sheets. Town NPCs still reuse class archetypes; equipment is represented by class silhouettes rather than separate interchangeable artwork layers.
