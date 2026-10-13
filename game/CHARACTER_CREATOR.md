# Milestone 5 — character creation

Implemented on `feature/visual-overhaul`, preserving the existing game and character artwork.

## Delivered

- A fantasy creator with a prominent class portrait, ancestry cards, class cards, clear descriptions, unique strengths, class training bonuses and the actual level-one ability.
- A live preview of HP, MP and unequipped AC, with an expandable explanation of their calculations. Changing ancestry, class or score assignments updates these values.
- Six illustrated pip-dice roll cards. Each shows all four dice, exactly one discarded die, the retained total and its assigned attribute. Reroll animation respects the device's reduced-motion preference.
- Two score-allocation methods: choose an existing roll from an attribute's menu, or select a roll card and click an attribute score. Both swap the existing assignments, so every roll remains used exactly once. Auto-assign retains the existing class priorities; clicking the already-selected class preserves manual allocations.
- Visible final scores, modifiers and separate ancestry/class bonuses for all six attributes. The expandable rules explanation describes the existing Ashen Realms class-training house rule.
- A separate final review with portrait, name, ancestry, class, starting vitals, all attributes and modifiers, the first ability, bonus summaries and starting supplies. Edit returns to the same draft; Enter the Realm commits it through the existing game-start function.
- Native arrow-key cursor movement in text fields and navigation in assignment menus are preserved; Escape returns to the title even when a field has focus.
- Responsive desktop, phone and short landscape layouts. The creator body scrolls inside the panel while the header and navigation remain visible. Selection updates preserve scrolling and keyboard focus.

## Rules and save preservation

`roll4d6`, `rollStatSet` and `autoAssign` are unchanged. Creation still rolls six sets of four d6, discards one lowest die from each set, applies the same ancestry/class increases and uses the same HP/MP formulas. No rules bug was identified that required changing them.

The arithmetic formerly inside `newHero` is now shared through `creationStats`. Preview updates do not create heroes, consume random numbers, generate IDs, modify rolls or write saves. The final hero is still built through `newHero` and `startGame`. Companion creation and save compatibility remain intact, including `ashen-realms-v1.2-save`.

Returning to the title or inspecting/editing the review leaves an existing adventure save untouched. Starting the new adventure retains the game's existing behaviour of saving the new character. No dependency was installed and the application was not rewritten.

## Files changed

- Added `creator.css`, isolated to character creation/review panels.
- Updated `game.js` for the creator, review, shared stat calculation and test-only preview access.
- Updated `index.html` to load the stylesheet; updated `server.py` to serve it.
- Added `tests/browser/creator.spec.mjs`.
- Updated `tests/p0.test.mjs` with dice, assignment and creation-formula checks; updated existing browser creation flows in `ui.spec.mjs` and `title.spec.mjs` to select class cards and pass through review.
- Added this report and updated `README.md` and `VISUAL_OVERHAUL.md`. Other uncommitted changes belong to earlier milestones.

## Validation

Results: **72 unit checks passed**. The full browser suite passed all **40 checks**, followed by **7 final creator checks** after the portrait/keyboard refinements (six repeated viewport checks plus one new keyboard/reduced-motion check). This covers 41 distinct browser checks. JavaScript syntax, Python syntax parsing and Git whitespace checks passed.

Creator checks cover 1440×900, 1024×768, 390×844, 360×640, 844×390 and 640×360. Browser checks cover all 16 ancestry/class combinations, exact preview-to-created-hero equality, assignment swapping, auto-assignment, reroll consumption of exactly 24 dice, preservation through review/edit, existing save isolation, safe rendering of names and the blank-name fallback.

Seven new rule checks cover tied lowest dice, score extremes, stable class assignment with tied totals, all ancestry/class formulas and preview updates without RNG consumption. The full suite also checks existing characters, both combat layouts, exploration, inventory, merchants, title settings and save/reload.

Screenshots are written to `artifacts/creator-overhaul/`. Run `npm test` and `npm run test:browser` from `game/`; installed Chrome can be selected with `ASHEN_BROWSER_CHANNEL=chrome`.

## Preview and remaining artwork

Run `npm start` from `game/`, open `http://127.0.0.1:8844`, and choose New Game. Choose ancestry and class, allocate your rolls, review the adventurer, and either edit or enter the realm.

No new portrait artwork was generated or replaced in this milestone. The creator reuses the game's existing four class portraits. Ancestry choices affect the real attributes; ancestry-specific appearance, gender/face customisation and equipment previews require additional artwork and are not implemented. Some preserved portraits contain visual ancestry cues that will not match every selected ancestry. The inherited portrait resolution also limits how much additional detail can be shown.
