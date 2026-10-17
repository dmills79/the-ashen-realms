# Mobile Expansion and Continuous Improvement Design

## Purpose

Make The Ashen Realms comfortable and complete on smartphones while preserving its current desktop presentation, Canvas renderer, artwork, mechanics, and `ashen-realms-v1.2-save` compatibility. Deliver the work as four independently tested and committed cycles on `feature/mobile-polish`; do not merge, deploy, or alter production infrastructure.

## Current Baseline

- The game uses a fixed full-viewport Canvas during exploration, with DOM overlays for the world HUD, menus, dialogue, and combat.
- Responsive CSS and a `.mobilepad` already exist, but the pad is outside the fixed `.gameframe` stacking context. It is therefore inaccessible during full-screen exploration even though narrow-screen CSS enables it.
- Mouse and keyboard input are mature. Combat and modal buttons already accept pointer activation, but exploration lacks usable touch movement.
- The existing test infrastructure is substantial: 189 Node tests pass. The baseline Playwright run executes 84 cases, with 82 passing and two failures requiring investigation rather than suppression.
- Existing screenshots show the desktop world remains polished. On a 390×844 viewport the exploration HUD is readable but dense, and no movement controls are visible.

## Guiding Constraints

- Keep the current engine and the established `game.js`, DOM-overlay, and supporting-module architecture.
- Preserve existing art, animation, NPC behavior, environments, improved tavern/interior rendering, combat rules, keyboard/mouse controls, and LAN behavior.
- Preserve save key `ashen-realms-v1.2-save` and accept versions 2–5. New quest fields must default safely when absent.
- Do not introduce a runtime dependency or require a build step.
- Keep touch controls compact, contextual, and visually consistent with the cinematic fantasy interface.
- Treat 360×800, 390×844, 768×1024, landscape phone sizes, and 1440×900 as required browser-rendered checkpoints.
- Complete each cycle with focused automated coverage, the full relevant suites, visual inspection, screenshots, and a dedicated commit. Critical failures block the next cycle.

## Chosen Approach

Enhance the existing responsive UI and input paths rather than creating a second mobile interface or interpreting gestures directly on the Canvas. The existing mobile pad will become an exploration-only fixed touch dock above the game frame. Existing interaction, modal, inventory, combat, and menu functions remain the single behavior source for every input method.

This approach has the smallest regression surface: keyboard, mouse, and touch invoke the same game commands, while CSS controls presentation by viewport and pointer capability.

## Cycle 1: Mobile Interface

### Layout

- Promote the existing mobile controls into the full-screen exploration stacking context using fixed positioning and an explicit z-index; the DOM may remain in its current location.
- Show the dock on narrow viewports and coarse-pointer devices during exploration only. Hide it during title, character creation, modal dialogue, and combat.
- Apply `env(safe-area-inset-*)` padding to full-screen exploration, overlays, and the touch dock. Use dynamic viewport units with a safe fallback.
- Reserve the lower corners for controls by compacting or repositioning the party roster and inventory/spells/journal actions on phones.
- Keep the playable Canvas full-screen and avoid horizontal document scrolling.

### Menus and content

- Make dialogue, inventory, party, journal, map, shops, and character-management modals fit within the visual viewport and scroll internally.
- Maintain at least 44×44 CSS-pixel primary touch targets where space permits; compact secondary text without making body copy unreadable.
- Preserve desktop dimensions and visual hierarchy outside the mobile media conditions.

### Verification

- Add Playwright layout assertions for required portrait/tablet/desktop viewports and representative exploration, dialogue, inventory, party, shop, and combat screens.
- Assert that visible controls stay inside the viewport and that no page-level horizontal overflow exists.
- Capture and inspect screenshots at every required size.

## Cycle 2: Touch Controls and Gameplay

### Controller behavior

- Keep tap-to-step behavior for each direction.
- Add pointer press-and-hold movement with the same repeat interval and collision/encounter logic as keyboard movement.
- Stop movement on `pointerup`, `pointercancel`, lost pointer capture, blur, overlay opening, combat start, or mode change.
- Prevent browser scrolling, selection, and synthetic duplicate clicks within the control surface.

### Context and feedback

- Derive the action button label from the existing `doorHint()`/interaction data, using short labels such as `TALK`, `ENTER`, `OPEN`, `SIT`, `STAND`, or `ACT`.
- Keep a compact menu button that opens inventory, while the existing HUD provides party, spells, journal, save, sound, and help.
- Add pressed/active visual feedback and accessible labels. Any optional vibration feedback must be feature-detected and must never be required for success.
- Combat continues to use the existing command, card, target, and modal buttons; mobile CSS ensures those targets are comfortable and selected states remain clear.

### Verification

- Use Playwright pointer/touch-style events to move, hold, release, collide, enter a building, talk to an NPC, open/close inventory, select combat commands and targets, and confirm keyboard controls still work.
- Include portrait and landscape phone coverage.

## Cycle 3: Visual Polish, Reliability, and Performance

### Test-failure investigation

- Reproduce the character animation failure independently and determine whether the expected state was never rendered or the test sampled an intentionally short-lived frame too late. Preserve the behavioral assertion and stabilize the observation at the engine boundary if needed.
- Reproduce the crypt-entry failure independently. The observed difference is only continuously advancing `world.clock.minutes`; determine whether backing out should pause/restore world time or whether the test must compare gameplay state while explicitly excluding elapsed presentation time. Do not disable either test.

### Visual and runtime work

- Correct screenshot-observed clipping, stacking, scaling, and control/HUD conflicts without replacing finished artwork.
- Measure the existing living-world benchmark before optimizing. Only retain performance changes with measurable benefit or a clear reduction in unnecessary work.
- Avoid permanent high-cost paint effects on typical phones; respect reduced-motion preferences.

### Delivery freshness

- Update the visible/package release identifier for this improvement set.
- Add explicit static response caching rules: HTML must revalidate; JavaScript and CSS must revalidate so deployments are reliably picked up; fingerprint-free media may use a bounded public cache with validators supplied by the server.
- Keep the server dependency-free and add automated header coverage.

### Verification

- Run focused reproductions, the complete Node suite, the complete Playwright suite, JavaScript syntax checks, the asset validator, and the existing headless benchmark.
- Compare benchmark results against the baseline and report that headless timings are not real-device guarantees.

## Cycle 4: The Lantern Road

### Quest flow

- The chapel acolyte offers a short side quest, “The Lantern Road,” asking the party to relight three waylanterns along Gloamwood Road.
- Acceptance and completion are represented by additive boolean flags that default to false for older saves.
- Three non-blocking lantern interactions are placed on existing walkable roadside positions. They reuse the lantern frame in `assets/living_world/interaction_atlas.png` and the persistent `G.world.objects` mechanism.
- Each lantern can be lit once after the quest begins, produces immediate visual and textual feedback, and persists across save/reload.
- The journal shows not-started, active progress (`n/3`), ready-to-return, and completed states.
- Returning to the acolyte after all three are lit grants one modest, one-time reward using existing inventory/currency systems. Repeated conversations cannot duplicate it.

### Architecture

- `interactions.js` owns lantern definitions, rendering, persistence, and generic `lit` results; it does not own quest rewards.
- `game.js` owns quest acceptance, progress interpretation, journal copy, completion, reward, and save defaults.
- Existing interaction art and lighting conventions are reused; no placeholder art is introduced.

### Verification

- Add Node coverage for lantern persistence and validation.
- Add Playwright coverage for accepting the quest, lighting each lantern, observing journal progress, saving/reloading, receiving the reward once, and using the flow at desktop and mobile sizes.
- Re-run the complete regression suites and capture final desktop/mobile quest screenshots.

## Error Handling and Compatibility

- Pointer handlers must tolerate canceled gestures and mode changes without leaving movement stuck.
- Controls must remain harmless when no adventure exists or a modal blocks exploration.
- Save normalization supplies missing quest flags and world-object state without changing existing version numbers or rejecting valid legacy saves.
- Malformed flags and world objects continue to fail validation before replacing the active game.
- Optional browser APIs and safe-area variables must degrade to the current keyboard/mouse layout.

## Test and Commit Gates

For every cycle:

1. Write a failing regression test for the behavior being changed.
2. Implement the smallest compatible change.
3. Run focused Node and/or Playwright tests.
4. Run `npm.cmd test` and the relevant browser regression group.
5. Inspect desktop and mobile screenshots, correct regressions, and rerun.
6. Commit only after the cycle is green except for a documented, proven pre-existing limitation that does not affect the cycle.

Before completion, run the full Node and Playwright suites, syntax checks for `game.js`, `network.js`, and `server.mjs`, the asset validator, and the living-world benchmark. Real-device iOS/Android testing is unavailable unless actual hardware becomes available; report this limitation explicitly.

## Out of Scope

- Engine replacement, renderer rewrite, multiplayer combat, new production infrastructure, production deployment, or merging to `main`.
- Replacing existing finished art or rebuilding the world map.
- Broad combat or balance changes unrelated to touch usability.
- Claiming native iOS or Android certification from desktop browser emulation.
