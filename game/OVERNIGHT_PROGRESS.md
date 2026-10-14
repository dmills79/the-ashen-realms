# Overnight development progress

Branch: `feature/visual-overhaul`. Existing package-lock.json change preserved.

- Read all design-document text; extracted and inspected all 13 embedded images in `design-references/extracted_ashen_improvements/`.
- Integrated compact attribute parchment, richer review sheet, male/female selection, centralized portraits and save-compatible appearance migration.
- Created 32 original painted portraits (four ancestries × four classes × two appearances) plus source atlas under `assets/identity/` using built-in ImageGen. Prompt specifies an 8×4 sheet, class/appearance columns and ancestry rows, warm torchlight and cool shadows; no reference screenshots used as game assets.
- Added combat EXP/remaining-to-level, AC and accessible real-state condition badges.
- Unit tests: 85/85 passed. Creator browser tests: 13/13 passed after moving airborne sampling before screenshot capture. Female Elf Wizard review/HUD/combat/save-reload passed. Combat: 10/10 passed, including updated condition semantics and all seven viewport layouts.
- Inspected 1366×768 review screenshot; shortened sheet content to fit the tavern viewport.

Remaining: directional/appearance sprite integration, Havenmere, crypt, entry screens, terrain, audio and Rogue mechanics; full browser regression and visual QA. Skills beyond class abilities are not a general proficiency system in this game; review shows actual trained attributes and combat proficiency rather than fabricated mechanics.

Current commit: pending first milestone commit.

