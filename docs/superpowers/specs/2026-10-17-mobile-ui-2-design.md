# Mobile UI 2.0 Design

## Purpose

Redesign The Ashen Realms mobile exploration interface so the world remains visually dominant while touch movement and navigation feel like a modern mobile RPG. Preserve the current Canvas renderer, grid movement, collision, encounters, interactions, animation, content, Lantern Road quest, save compatibility, and desktop presentation.

Work remains on `feature/mobile-polish`. The finished branch may be pushed to GitHub after validation, but it must not be merged to `main`, deployed, or used to alter production infrastructure.

## Audited Baseline

- Exploration movement is authoritative in `game.js`: every input calls `moveCommand(dx, dy)`, which records the prior state and delegates to `tryMove(dx, dy)`.
- `tryMove()` applies facing, calls the shared `walkable()` collision path, advances the existing tile position, triggers `AshenAnimation.move()`, resolves entrances and encounters, refreshes the HUD, and preserves save behavior.
- World positions are integer grid cells. The animation system visually interpolates between cells; the game does not support arbitrary floating-point world positions.
- Keyboard movement is sampled by the existing animation-frame input loop. The current mobile D-pad uses separate press-and-hold timers to issue the same cardinal move commands.
- The mobile controls currently contain four directional buttons, ACT, and BAG. Pointer capture and cancellation exist only for a pressed direction button.
- Exploration HUD elements are DOM overlays on the full-viewport Canvas. Mobile landscape currently shows the title panel, location panel, quest card, minimap, Save/Sound/Help, Inventory/Spells/Journal, D-pad, ACT, BAG, and HUD toggle at once.
- Existing Playwright coverage in `tests/browser/mobile.spec.mjs` verifies six touch buttons, repeated cardinal movement, contextual interaction, inventory access, combat touch targets, responsive bounds, and screenshots. These assertions must be replaced with equivalent or stronger coverage rather than disabled.
- The baseline branch is clean at `cd79191` and includes the Lantern Road side quest.

## Product Principles

- The game world is the primary mobile surface; persistent controls communicate through shape and iconography rather than large text panels.
- Touch is another input source for the existing game commands, never a second movement or collision engine.
- Controls remain usable with two thumbs and independent pointers.
- Every essential feature remains reachable without a keyboard.
- Mobile-only presentation changes do not reduce desktop information density or change desktop input.
- Effects use opacity, transform, and restrained shadows. Avoid continuous filters, animated blur, or other high-cost decoration.

## Chosen Movement Architecture

### Analog intent adapter

Replace `.pad-dirs` with one `#mobileJoystick` control containing a fixed translucent base, a movable thumb knob, and a subtle directional ornament. Pointer events produce a normalized vector and magnitude:

- Clamp the knob to the joystick radius.
- Ignore vectors inside an approximately 18% dead zone.
- Recenter the knob and clear movement intent on release, cancellation, lost capture, blur, modal opening, combat entry, or another mode change.
- Apply `touch-action: none`, prevent default pointer movement, and use pointer capture for the joystick's active pointer.
- Track only the pointer that began on the joystick. ACT and BAG retain independent pointer handling, allowing a second finger to interact while movement continues.

The existing `requestAnimationFrame` input loop samples joystick intent. It calls `moveCommand()` at a cadence derived from magnitude, ranging from a deliberate walk near the dead zone to the current animation-safe repeat speed near the edge. It does not create another animation loop or update the Canvas solely to animate the control.

### Mapping 360-degree intent to the grid

The game remains cardinal and tile-based. A small axis-credit accumulator converts a vector into cardinal commands:

- Pure horizontal or vertical vectors issue only that axis.
- Diagonal vectors alternate horizontal and vertical commands in proportion to their vector components.
- Every generated step passes unchanged through `moveCommand()`, `tryMove()`, and `walkable()`.
- Facing and character animation continue to come from the accepted cardinal step.
- A blocked step remains blocked by the existing engine. The joystick may choose the other intended axis on a later scheduled step, producing natural wall sliding without bypassing collision.

This provides continuous 360-degree thumb intent and proportional cadence without inventing diagonal world coordinates or changing saves, encounters, NPC occupancy, object proximity, or map transitions.

### Desktop compatibility

Keyboard handling remains unchanged. The joystick is hidden outside the existing mobile viewport conditions, when the dashboard/windowed mode is active, and while an overlay or combat screen owns input.

## Minimal Mobile HUD

The compact design applies to exploration viewports below 900 CSS pixels. Desktop keeps the existing world HUD and button layout.

### Persistent layer

Only the following remain persistently visible on mobile exploration:

- A compact location/gold pill near the safe top-left edge.
- A quest sigil button near the location pill. It shows a small progress/attention state without persistent quest copy.
- A compact minimap button near the safe top-right edge.
- A settings button near the minimap.
- The virtual joystick at the safe bottom-left edge.
- A prominent translucent ACT button at the safe bottom-right edge.
- A smaller BAG button adjacent to ACT.

The decorative game title block, persistent party roster, desktop HUD toggle, keyboard help, and expanded tool rows are hidden on mobile exploration. Party management remains available from the BAG tools tray.

### Quest interaction

`#worldQuestBtn` remains the source for active quest title and description.

- Collapsed: render as a 44-pixel minimum sigil with an accessible name derived from the active quest.
- Tap: expand into a compact readable card containing the current title and objective.
- Tap again, tap outside, open another HUD surface, open a modal, or start combat: collapse it.
- Quest state and notification content continue to come from `questTitle()` and `objective()`; no quest data is duplicated in the control layer.

### Minimap interaction

`#worldMapBtn` and its existing Canvas remain authoritative.

- Collapsed: show a compact framed map glyph/preview with a 44-pixel minimum hit target.
- First tap: expand the existing minimap into a readable preview with its clock and an explicit `OPEN MAP` label.
- Second tap while expanded: call the existing `mapMenu()`.
- Tap outside, open another HUD surface, open a modal, or start combat: collapse it.

### BAG tools tray

The existing `#mobileMenu` BAG button toggles a compact lower-right tray. The tray exposes Inventory, Spells, Journal, and Party/Formation through the existing functions and IDs where possible. Selecting an item closes the tray before opening its destination. ACT remains unobstructed and independently usable.

### Settings tray

A new compact settings toggle opens a top-right tray containing Save, Sound, and Help. These buttons retain their current handlers and live labels. Opening settings closes quest, map, and BAG expansions; choosing an action closes the tray before executing it.

### Surface coordination

One lightweight controller owns the expanded/collapsed state of mobile HUD surfaces. Opening one compact surface closes the others. Opening a modal or leaving exploration closes all compact surfaces and stops joystick input. Expanded controls expose `aria-expanded`, trays have descriptive labels, and interactive targets remain at least 44 by 44 CSS pixels.

## Responsive and Safe-Area Behavior

- Use the existing `--safe-top`, `--safe-right`, `--safe-bottom`, and `--safe-left` variables at every mobile anchor.
- Primary landscape checkpoints are 844×390, 852×393, 932×430, and 740×360.
- Retain portrait coverage at 390×844 and desktop coverage at 1440×900.
- Landscape joystick diameter targets approximately 104–116 pixels depending on available height. Portrait may use up to 124 pixels.
- ACT remains at least 56 pixels in diameter; BAG and compact HUD controls remain at least 44 pixels.
- Expanded trays and cards must fit within the visual viewport, avoid joystick/ACT hit regions, and scroll internally only if their content cannot fit.
- No page-level horizontal scrolling is permitted.
- CSS falls back safely when environment safe-area values are zero or unsupported.

## Visual Language

- Controls use translucent blue-black surfaces, warm brass borders, soft inset highlights, and restrained shadows consistent with the existing fantasy HUD.
- Idle joystick opacity is reduced; pointer engagement increases border, knob, and rune contrast using opacity and transform transitions.
- The joystick knob returns with a short ease-out transition after release. During active tracking it follows the pointer without a transition to avoid lag.
- Pressed ACT, BAG, tool, and settings controls retain the existing gold feedback language.
- Icons are text/SVG-free CSS and Unicode marks already compatible with the current dependency-free page. No external icon package or runtime dependency is added.
- `prefers-reduced-motion: reduce` removes nonessential recenter and tray transitions without changing control behavior.

## Input and State Safety

- The joystick ignores non-primary mouse buttons but accepts a touch pointer even when another touch is active elsewhere.
- A second pointer cannot steal the active joystick.
- Pointer release outside the base is handled through capture and global safety cancellation.
- Modal display, title transitions, combat start, browser blur, and document visibility changes clear joystick intent.
- Touch handlers are non-passive only where `preventDefault()` is required on the joystick surface; no document-wide touch listeners are introduced.
- UI expansion state is presentation-only and is never added to adventure saves or localStorage.
- Existing localStorage key and save versions remain unchanged.

## Testing Strategy

### Test-driven changes

Update `tests/browser/mobile.spec.mjs` first and observe failures against the current D-pad/HUD. Tests exercise browser pointer events and inspect game state through the existing test API.

Required automated coverage:

1. Joystick cardinal movement in all four directions from known walkable cells.
2. Diagonal vector input produces movement on both axes while every result remains a valid grid step.
3. Magnitude affects cadence without exceeding the established maximum movement rate.
4. Release, cancellation, lost capture, blur, and modal opening recenter the knob and stop movement.
5. Collision blocks joystick movement through world geometry.
6. Joystick movement produces the existing interpolated walking state and directional character artwork.
7. An independent pointer can press ACT while the joystick pointer remains active.
8. Contextual NPC/object interaction retains labels and opens the expected dialogue or interaction.
9. Combat commands, spell selection, targets, and items remain touch operable with 44-pixel targets.
10. Quest and minimap controls expand, collapse, and expose the full map.
11. BAG exposes Inventory, Spells, Journal, and Party; settings exposes working Save, Sound, and Help actions.
12. Landscape, portrait, and desktop layouts remain within viewport bounds, have no page overflow, and preserve desktop keyboard controls.

Safe-area verification uses nonzero test overrides for the CSS safe variables because desktop Chromium does not emulate physical display cutouts. This verifies layout arithmetic but is not equivalent to real iPhone or Android hardware testing.

### Visual verification

Capture exploration screenshots for 844×390, 852×393, 932×430, 740×360, 390×844, and 1440×900. Capture representative expanded quest, expanded minimap, BAG tray, settings tray, inventory, and combat states. Inspect every image for overlap, clipping, undersized hit targets, excess panel coverage, visual imbalance, and desktop regression; correct critical findings before completion.

### Full verification gate

Before committing the implementation and pushing:

- Run focused Playwright mobile tests during development.
- Run `npm.cmd test`.
- Run the complete `npm.cmd run test:browser` suite.
- Run `node --check game.js`, `node --check network.js`, and `node --check server.mjs`.
- Run `npm.cmd run assets:validate`.
- Run the existing living-world benchmark and report measured FPS/frame-time results.
- Confirm a clean working tree after the final commit and confirm the pushed remote commit matches local HEAD.

## Expected Files

- `game/index.html`: joystick and compact mobile HUD markup; version identification if release metadata is updated.
- `game/style.css`: joystick, compact trays, responsive landscape/portrait layout, safe areas, transitions, and desktop isolation.
- `game/game.js`: joystick intent adapter, lifecycle cancellation, compact HUD coordination, and existing command bindings.
- `game/tests/browser/mobile.spec.mjs`: joystick, multitouch, HUD, responsive, and screenshot coverage.
- `game/package.json` and delivery metadata only if the visible release identifier is incremented consistently.

No artwork, world data, quest logic, save schema, server architecture, or runtime dependency is expected to change.

## Performance Expectations

- Reuse the existing animation-frame input loop; do not add an always-running joystick loop.
- Update knob transforms only while the joystick pointer moves or resets.
- Avoid new Canvas work for HUD animation.
- Use composited opacity/transform transitions and no continuous backdrop-filter animation.
- Keep the existing approximately 60 FPS benchmark result on the available desktop Chromium environment. Report this as a development measurement, not a guarantee for physical phones.

## Failure Handling

- If pointer capture is unavailable, window-level release/cancel safety still stops movement.
- If a HUD target becomes unavailable because no game is active or a modal is open, handlers return without changing state.
- If a requested movement direction is blocked, existing bump feedback and collision behavior remain authoritative.
- If a viewport is too short for an expanded tray, the tray becomes internally scrollable and must not cover both ACT and joystick simultaneously.

## Out of Scope

- Floating-point character coordinates, freeform physics, diagonal collision geometry, or a replacement movement engine.
- Changes to world layout, quests, combat balance, assets, NPC behavior, multiplayer, or save format.
- Replacing the desktop HUD or keyboard/mouse controls.
- Adding a framework, icon library, gesture dependency, or build step.
- Merging to `main`, deploying to production, or modifying production infrastructure.
- Claiming real-device iOS or Android compatibility from desktop Chromium emulation alone.
