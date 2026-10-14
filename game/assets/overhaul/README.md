# Original visual assets

Created with the built-in ImageGen tool for The Ashen Realms. The Word reference images guided the art direction; none were shipped as playable scenery. Existing LPC credits remain in `../lpc/`.

The production prompt set specifies painterly fantasy realism, weathered medieval materials, warm torchlight against cool shadows, complete silhouettes, and no text/UI/watermarks:

- **Architecture:** transparent 4×2 sheet; hall, forge, inn, Blue Lantern tavern, chapel, cottage, bakery and market. Elevated camera from the south; varied timber/stone silhouettes.
- **Crypt and landmarks:** transparent 4×2 sheet; carved sarcophagus, guardian statue, broken pillar, vaulted arch, mausoleum entrance, tribal camp, wrought-iron lantern and organic cliff.
- **NPCs:** transparent 4×3 sheet; scholar, smith, baker, innkeeper, crier, merchant, pilgrim, farmer, guard, traveler, pack horse and village dog. Natural adult proportions and distinct costumes.
- **Village props:** transparent 4×2 sheet; stone fountain, wagon, barrels, crates, bench, flowerbed, fence and arched bridge.
- **Vegetation:** transparent 4×2 sheet; crooked oak, irregular pine, willow, dead snag, fallen log, ferns, brambles and heather/rocks.
- **Materials:** seamless 2×2 sheet; irregular cobblestones, ancient masonry, muddy gravel and fractured rock. Separate seamless cool flagstone floor.
- **Crypt arrival:** 16:9 vaulted burial entrance, carved guardians, torchlight and mist, empty foreground for the actual party and dark right side for narrative.
- **Crypt combat:** 16:9 vaulted burial arena with an open flagstone fighting floor, carved side niches, cobwebs and two warm braziers against cool blue ambient shadows.

The 32 portraits and 256 direction/stride sprites in `../identity/` use four classes, four ancestries and two appearances. Body sheet columns are north/east/south/west; rows are male/female Fighter, Rogue, Wizard and Cleric. Walking edits preserve costumes and facing while adding a stride. Elf, Dwarf and Halfling edits preserve the grid and introduce ancestry proportions/features. The source portrait atlas is retained there. `tools/import-art.ps1` crops cell assets and trims transparent margins; `tools/validate-overhaul.mjs` checks the production registry.

Current limitations: faces/hair are illustrative variants rather than exact portrait-to-body likenesses; equipment overlays support the current weapon types, while complete armor-specific costumes and full combat pose sheets remain future work.
