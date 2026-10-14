# Battle interface artwork

Sixteen original illustrated action icons were generated with the built-in ImageGen tool, inspected, cropped from an equal 4×4 atlas, and exported as 192×192 JPEGs (quality 92). Twelve 128×128 enemy portraits are crops of the existing registered `characters_v2` artwork. `frame.svg` is a native vector frame with bronze/gold corner ornament. Total production artwork is approximately 340 KB.

Rebuild icon crops and enemy portraits on Windows with:

```powershell
./tools/import-battle-ui.ps1 -Source <generated-atlas.png>
```

The source atlas remains in the generated-image cache. Production assets are stored here and served directly by the Node server. No commercial game art or unsupported gameplay effects were imported from the supplied UI reference.

Final ImageGen prompt, opaque square atlas:

“Use case: stylized-concept. Production fantasy RPG action icon atlas. Exactly 4 columns by 4 rows of equal square cells, square image, no gaps. Every icon is individually centered with ample inset margin, dark near-black textured vignette background, premium realistic painterly fantasy illustration, crisp silhouette, dramatic warm gold highlights with restrained jewel-colored spell glow. No words, no letters, no numbers, no frames, no UI mockup. Readable at 80px. Row 1 left to right: silver sword diagonal, crossed steel daggers with violet shadow aura, hooded silhouette dissolving into shadows, wooden bow with arrow. Row 2: blue violet arcane orb, icy crystal spear, fireball, radiant golden sunburst holy magic. Row 3: green healing hands with luminous energy, bronze shield with protective blue ward, small ruby red potion bottle, small sapphire blue mana potion bottle. Row 4: boot moving through smoke representing escape, spectral green skull poison, dark spellbook with silver runes, ornate bronze armored gauntlet. Keep every subject entirely inside its own cell and all sixteen cells identical dimensions.”
