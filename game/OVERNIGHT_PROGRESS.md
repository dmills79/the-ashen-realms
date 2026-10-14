# Overnight development progress

Branch: `feature/visual-overhaul`. Latest implementation commit: `724f57a94c870875662fd4de377da24260e1ee19`. The new combat overhaul is **local only, not pushed**, as requested. A progress-record commit follows; `git rev-parse HEAD` reports the final checkout hash.

## Supplied battle interface reference — 14 October 2026

- Implemented the attached image's composition: portrait initiative queue and round marker, a scene-side location/foe/chronicle column, framed party cards, a six-category command rail, illustrated action cards, live action descriptions, and a target/condition panel. Enlarged battle-only characters and added the focused enemy's in-scene HP plate. Exploration sizing and combat rules remain unchanged.
- Hover/focus inspections show actual weapon, damage dice, attack bonus, formation penalty, MP cost, target scope, DEX save DC and healing. Previewing spends no resource or turn. SPELLS is a functional category, disabled when no spell is available. Existing hotkeys, class skills, items, guard, retreat and automation remain functional. Phone layouts offer a DETAILS toggle; short desktop windows retain the reference composition.
- Assets: 16 original ImageGen action icons, 12 enemy portraits cropped from existing registered artwork, and a native gold/bronze frame; approximately 340 KB total. Production files and the final generation prompt are in `assets/battle/ui/`. Rebuild tool: `tools/import-battle-ui.ps1`.
- Files: `game.js`, `index.html`, `battle-reference.css`, `assets/battle/ui/`, importer, two engine inspector checks, six reference browser checks, and the updated forest UI assertion. Unrelated lockfile and supplied reference files remain unstaged.
- Validation: **106/106 unit tests passed; full Chromium browser suite 65/65 passed**. Includes creation/review, all identities, saving/loading, navigation, equipment, Rogue skills, combat actions, victory/defeat/retreat, quests and audio. Syntax and `git diff --check` passed. Initial stale visual assertions were updated to inspect the new illustrated cards and actual item name; no test failure remains.
- Inspected crypt captures at 1440×900, 1024×768 and 970×550 and mobile captures at 390×844/640×360, plus seven-size combat regressions. Local previews: `artifacts/battle-reference/crypt-1440-900.png` and `crypt-970-550.png`. Artifacts remain ignored by Git. Non-Chromium testing and bespoke new attack/cast pose art remain outside this pass.
- Launch: from `game/`, `npm.cmd start`, then `http://127.0.0.1:8844`; refresh the browser to load the new CSS. No dependency installation, merge or push was performed.

## Wilderness battle / tactical formation update — 14 October 2026

- Read the entire `Wilderness Background and Battle UI.docx` and inspected all three extracted images. References remain in `design-references/extracted_wilderness_battle_ui/`, untracked.
- Integrated the supplied realistic forest painting, cropped its black frame, and created matching evening/night lighting edits with built-in ImageGen. Three optimized JPEGs live in `assets/battle/`; exact prompts and provenance are in its README. Existing character artwork is preserved, with subtle illumination grading, row placement and depth ordering.
- Upgraded commands and class ability cards, portrait initiative indicators, textured dark panels, readable row badges, target information and event details. Initiative remains visible on phones. Bows fire arrows rather than lunging; misses and criticals have distinct battlefield text.
- Formation is configurable outside combat through **PARTY & FORMATION → PARTY FORMATION** (or `P`, then PARTY FORMATION), saved per character. Class supplies a legacy default; every character can change rows. No character name controls placement.
- Visible conscious front-row defenders receive four times each rear ally's melee target weight. Screened rear allies receive 25% less melee damage, rounded upward after guard. Rear single-target melee strikes have −2 to hit; bows/spells are exempt. Wisp/shaman magic, bat dives and area attacks bypass protection. An explicit enemy `attackRange` supports ranged exceptions. If defenders fall or hide, cover and the melee penalty end. Solo/all-rear parties remain playable.
- Initiative still rolls **d20 + DEX modifier each round** and sorts independently of formation. Changes are rejected during combat. Existing stats, progression, equipment, quests and save key/version remain intact.
- Lighting uses the existing saved `G.steps` journey counter with gradual day/evening/night blends; there is no new timer or gameplay rule. Exact presentation cycle is documented beside the artwork.
- Files changed: `game.js`, `formation.js`, `index.html`, `combat.css`, `combat-refinements.css`, `package.json`, `tests/{p0,formation}.test.mjs`, `tests/browser/{combat,formation}.spec.mjs`, and `assets/battle/`.
- Validation: **104/104 unit tests passed**. Full Chromium regression run: **58/59 passed**, exposing a three-pixel phone command overflow. Corrected it; final affected combat/formation/UI run: **22/22 passed**, including the failed case. Strengthened all-command containment checks subsequently passed **10/10 combat tests** at seven sizes, in expanded/windowed views. The other 37 browser cases passed in the full run.
- Tested real formation UI/save/reload, class-based legacy migration, weighted targeting, cover/guard arithmetic, bows/magic, hidden/fallen defenders, initiative independence, actual item/guard/spell/attack encounter victory, retreat, defeat recovery, background loading, keyboard/focus/log behavior, creation, equipment, navigation and main quest completion. Inspected day/evening/night/transition and desktop/mobile screenshots. No known introduced gameplay regression remains in these tested paths.
- Syntax checks for game/network/server/formation and `git diff --check` passed. Tests used isolated saves on port 8877; user saves on 8844 were untouched. The pre-existing `package-lock.json` edit and design documents were not staged. Nothing was merged or pushed.
- Limits: Chromium verification only; extended campaign balance and bespoke attack/cast pose sheets remain future work. Formation and lighting are implemented, not placeholder controls. No build/bundling command exists; the Node server serves the checked production files directly.
- Launch from `game/`: `npm.cmd start`; open `http://127.0.0.1:8844`. Tests: `npm.cmd test` and `npm.cmd run test:browser`. Existing saves require the same hostname and port.

## Earlier overnight work (historical)

## Implemented and verified

1. **Creation/review:** retained the tavern; compact two-column assignment; six parchment score cards with real rolls, bonuses, totals and modifiers; skills, training, vitals and supplies; male/female selection; shared portrait/body identity and compatible legacy appearance migration. Physical dice logic retained and tested.
2. **Combat:** unified portraits, EXP/remaining-to-level, AC, accessible real-condition icons, equipped weapon overlays, original painted crypt arena and animated flames aligned to braziers. Existing targeting, tactics, spells and event log retained.
3. **Havenmere:** painted facades, market/cart/fountain/lantern/furniture assets, chimney smoke, distinct civilian costumes, travelers, guard, horse and dog. Original doors, NPC actions and collisions retained.
4. **Crypt:** cached irregular flagstones/masonry, arches, sarcophagi, statues, broken pillars and torchlight over the existing encounter/navigation layout.
5. **Entries:** reusable cinematic crypt/camp presentation with actual party figures and Continue/Go Back. Back/Escape restore position, steps and stealth duration without setting quest flags or rewriting saves.
6. **Wilderness:** winding road, meandering river, painted bridge/cliffs, varied trees/undergrowth/debris and visible crypt/camp landmarks. Water cell centers follow the river; older saves on changed banks relocate to nearby dry ground without losing progress.
7. **Audio:** seven original synthesized themes, gesture-gated playback, bounded crossfades, persisted music/effects levels and settings accessible during play.
8. **Mechanics:** Rogue hiding/detection and later 3d6 Backstab with advantage; 12-step silent movement; DEX/proficiency trap disarming. Equipment inspection/removal, Runestaff Runic Flare and Silverguard poison ward affect actual gameplay. Criticals still double dice only.
9. **Regression/polish:** repaired portrait fallback recursion, invisible arrival figures, screenshot timing, floating combat flames and diagnostic rendering that spawned extra animation loops. No known gameplay failures remain in tested paths.

## Validation

- `npm.cmd test`: **93/93 passed**, including dice combinations, critical/backstab damage, poison/healing, gear counts, magical effects, old saves and riverbank migration.
- Full Chromium suite: **50/50 passed**. Final affected combat/environment/overnight suite: **20/20 passed**, including the added main-quest/save test. That quest test passed again after final flame alignment. The suite now contains 51 browser tests.
- Creation/title/combat layouts checked at desktop and mobile sizes: 1920×1080, 1440×900, 1366×768 where applicable, 1024×768, 390×844, 360×640, 844×390 and 640×360.
- Inspected screenshots of review, village, crypt, wilderness, equipment, arrival and Warden combat. Tests used isolated saves on port 8877; user saves on 8844 were untouched.
- `node tools/validate-overhaul.mjs`: **288 identity PNGs validated**; seven 32-second audio loops have audible energy and no clipping. Game/network/server/new-module syntax and `git diff --check` passed.
- Two-client LAN behavior and non-Chromium browsers were not retested; networking code was not changed.

## Changed files and original assets

Runtime: `game.js`, `identity.js`, `presentation.js`, `environment.js`, `audio.js`, `tavern-creator.js`, `index.html`, `creator.css`, `combat.css`, `arrival.css`, `style.css`, `server.mjs` (WAV MIME support).

Tests/tools: `tests/p0.test.mjs`, `tests/browser/{creator,characters,combat,overnight}.spec.mjs`, `tools/{import-art.ps1,generate-soundscape.mjs,validate-overhaul.mjs}`.

Built-in ImageGen created 32 portraits, 256 directional/stride body images and 51 scene/prop/material images. Seven WAV themes were synthesized locally. Prompt specifications/provenance: `assets/overhaul/README.md` and `assets/audio/overhaul/README.md`. LPC credits remain intact. The supplied DOCX and 13 extracted references remain local/untracked.

## Remaining work and assumptions

- Exact portrait/body facial likeness, especially some Elf wizard/cleric hair and beards, needs another art pass. Ancestry/class/appearance selections drive the shared registry correctly.
- Walking uses paired poses. Full attack/cast pose sheets and armor-specific costumes remain unfinished; current weapon types have overlays, and portraits use class costumes.
- Village street plan and crypt architecture inherit parts of the existing grid. Further perspective, room depth, lighting and bank-edge polish would improve concept fidelity.
- Cinematic entries cover crypt and camp; other destinations can adopt the system.
- Choir textures are synthesized. Recorded female vocals, monastic choir and professionally produced instruments remain asset requirements. Playback/waveform quality were tested; no human listening review was performed.
- No general D&D skill/proficiency subsystem was invented; review shows the checks and training actually used by the game.

## Version control and launch

`e43b6b5`: character identity/parchment/combat HUD. `1f87d97`: original assets/tools. `12f20b0`: integrated environments, entries, audio, Rogue/equipment mechanics and tests. All three implementation commits were pushed to `origin/feature/visual-overhaul`. No merge or force-push occurred; the pre-existing lockfile edit was not staged.

From `game/`, run `npm.cmd start` and open `http://127.0.0.1:8844`. Keep the same hostname/port to access existing saves. Verify with `npm.cmd test`, `npm.cmd run test:browser` and `node tools/validate-overhaul.mjs`.

