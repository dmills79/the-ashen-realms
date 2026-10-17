# Mobile Expansion and Continuous Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver four verified improvement cycles that make The Ashen Realms comfortable on touch devices, stabilize browser coverage, improve delivery freshness, and add the polished Lantern Road side quest.

**Architecture:** Retain the Canvas renderer and existing DOM overlays. Responsive CSS exposes the existing mobile dock, `game.js` routes pointer input through current gameplay commands, `server.mjs` adds validator-backed cache policy, and the existing environment-interaction/save systems host the new quest without changing save version or key.

**Tech Stack:** Browser JavaScript, Canvas 2D, CSS, Node.js 20+, Node test runner, Playwright 1.64, dependency-free Node HTTP server.

**Spec:** `docs/superpowers/specs/2026-10-17-mobile-expansion-design.md`

## Global Constraints

- Work only on `feature/mobile-polish`; do not create another branch, merge to `main`, deploy, or modify production infrastructure.
- Preserve the `ashen-realms-v1.2-save` key and versions 2–5, existing gameplay, art, animations, environments, NPC systems, LAN behavior, and improved tavern/interior rendering.
- Do not add a runtime dependency, engine, or build step.
- Verify 360×800, 390×844, 768×1024, landscape phone sizes, and 1440×900 with real Chromium rendering.
- End each cycle with focused tests, the relevant full suites, inspected screenshots, regression fixes, and one dedicated implementation commit.
- Do not proceed to the next cycle with a critical failure.

## Review Focus

- A canceled or interrupted pointer must stop movement; Cycle 2 tests `pointercancel`, release, blur, and modal opening.
- A phone with safe-area insets must keep controls and modal actions inside the visible viewport; Cycle 1 tests all required viewports and CSS safe-area declarations.
- Keyboard and mouse controls must remain unchanged; Cycle 2 repeats keyboard movement and combat activation after touch tests.
- Legacy saves with no Lantern Road fields must load unchanged and receive false defaults; Cycle 4 extends the version 2–5 migration matrix.
- Repeated lantern interaction or quest turn-in must never duplicate rewards; Cycle 4 tests idempotent lighting and repeated acolyte conversations.

---

### Task 1: Cycle 1 — Responsive Mobile Interface

**Files:**
- Modify: `game/index.html`
- Modify: `game/style.css`
- Create: `game/tests/browser/mobile.spec.mjs`
- Screenshot output (ignored): `game/artifacts/mobile-expansion/cycle-1/`

**Interfaces:**
- Consumes: Existing `.mobilepad`, `.pad-dirs`, `.actionkey`, `.world-hud`, `.overlay`, `.modal`, world action, combat, and character-creation DOM.
- Produces: A visible `.mobilepad` in full-screen exploration; safe-area-aware full-screen surfaces; reusable Playwright helpers `startMobileAdventure(page)`, `expectInsideViewport(page, selector)`, and `expectNoPageOverflow(page)` local to `mobile.spec.mjs`.

- [ ] **Step 1: Write failing responsive-layout browser tests**

Add parameterized tests named `mobile exploration and modal layout at <width>x<height>` for `{360,800}`, `{390,844}`, `{768,1024}`, and `{1440,900}`. Assert:

- `.mobilepad` is visible at both phone widths and hidden at 1440×900.
- Each visible touch control and modal primary action has a nonzero box wholly inside the viewport.
- `document.documentElement.scrollWidth <= innerWidth` and `document.body.scrollWidth <= innerWidth`.
- Inventory, party, journal, shop, and NPC dialogue can scroll internally and expose their return/choice button.
- The Canvas remains nonzero and full-screen exploration stays active.

Capture world, inventory/dialogue, and combat screenshots under `artifacts/mobile-expansion/cycle-1/` for 360×800, 390×844, 768×1024, and 1440×900.

- [ ] **Step 2: Run the focused tests and verify the current dock fails**

Run: `npm.cmd run test:browser -- tests/browser/mobile.spec.mjs`

Expected: FAIL because `.mobilepad` is behind/outside the fixed exploration frame and because at least one phone layout does not reserve its control area.

- [ ] **Step 3: Add safe-area viewport support and responsive layout rules**

In `index.html`, change the viewport meta content to include `viewport-fit=cover`.

In `style.css`:

- Add safe-area variables with zero fallbacks.
- Give exploration/title frames a `100vh` fallback followed by `100dvh`.
- Position `.mobilepad` fixed above the game frame at an explicit z-index only during `html.world-explore`, on narrow/coarse-pointer layouts.
- Hide the pad when `.overlay` is open, during combat/title/creation, and in windowed exploration.
- Reserve bottom space by relocating/compacting the phone roster and world action row; keep the central playable view unobstructed.
- Make overlays and modals safe-area-aware, use visual-viewport-constrained height, and preserve internal scrolling.
- Give actionable phone controls a minimum 44px hit dimension while keeping desktop selectors unchanged.
- Add phone-landscape and tablet rules rather than changing desktop defaults.

- [ ] **Step 4: Run focused layout tests and inspect Cycle 1 screenshots**

Run: `npm.cmd run test:browser -- tests/browser/mobile.spec.mjs`

Expected: PASS. Inspect every Cycle 1 PNG for overlap, clipping, unreadable labels, hidden modal actions, and excessive world obstruction. Correct CSS and repeat until clean.

- [ ] **Step 5: Run Cycle 1 regression gates**

Run:

```powershell
npm.cmd test
npm.cmd run test:browser -- tests/browser/title.spec.mjs tests/browser/creator.spec.mjs tests/browser/ui.spec.mjs tests/browser/combat.spec.mjs tests/browser/mobile.spec.mjs
node --check game.js
```

Expected: Node suite and focused browser suites PASS; no syntax errors.

- [ ] **Step 6: Commit Cycle 1**

```powershell
git add game/index.html game/style.css game/tests/browser/mobile.spec.mjs
git commit -m "Make the mobile interface viewport safe"
```

---

### Task 2: Cycle 2 — Touch Controls and Gameplay

**Files:**
- Modify: `game/game.js`
- Modify: `game/index.html`
- Modify: `game/style.css`
- Modify: `game/tests/browser/mobile.spec.mjs`
- Screenshot output (ignored): `game/artifacts/mobile-expansion/cycle-2/`

**Interfaces:**
- Consumes: `moveCommand(dx, dy)`, `interact()`, `inventory()`, `doorHint()`, `mode`, `isOverlay()`, and existing `data-dir` buttons.
- Produces: `mobileActionLabel()` returning a short display label; `stopTouchMove()` clearing all held-touch state; `bindMobileControls()` wiring pointer-safe movement and actions without changing keyboard listeners.

- [ ] **Step 1: Write failing touch-flow browser tests**

Extend `mobile.spec.mjs` with tests named:

- `touch tap and hold move the party and release stops movement`
- `pointer cancellation and overlays cannot leave movement held`
- `touch action enters, talks, opens inventory and returns to play`
- `touch combat selects a command and target while keyboard still works`

Use Playwright pointer events against actual buttons. In a deterministic open wilderness area, assert a tap changes position by one cell, a hold changes position more than once, and position stops changing after release/cancel. Open a modal during a hold and assert no later movement. Place the player beside a town door/NPC using the test API, activate the contextual action, and assert the expected location/dialogue. Start combat, click command and target buttons, then use the existing keyboard path in a fresh encounter.

- [ ] **Step 2: Run focused tests and verify hold/cancel/context failures**

Run: `npm.cmd run test:browser -- tests/browser/mobile.spec.mjs`

Expected: New touch-flow cases FAIL because direction controls only have `onclick`, cannot repeat, and the action label is always `ACT`.

- [ ] **Step 3: Implement pointer-safe touch movement**

In `game.js`:

- Add one held-pointer record and one repeat timer; do not create a second movement implementation.
- On primary `pointerdown`, capture the pointer, call `moveCommand(dx,dy)` immediately, then repeat at the established exploration cadence.
- Suppress the synthetic click for a pointer-driven direction so a tap remains exactly one step.
- Call `stopTouchMove()` on pointer release, cancellation, lost capture, window blur, overlay opening, combat start, title transition, and any mode mismatch observed by the render/update loop.
- Keep `onclick` or equivalent keyboard activation for assistive/keyboard-triggered button use.
- Do not vibrate unless `navigator.vibrate` exists; vibration failure must be ignored.

- [ ] **Step 4: Add contextual labels and pressed feedback**

Implement `mobileActionLabel()` by reducing `doorHint()` into `STAND`, `ENTER`, `EXIT`, `OPEN`, `CLOSE`, `SIT`, `TALK`, `INSPECT`, or `ACT`. Refresh the text/`aria-label` whenever the HUD refreshes and after movement/interactions. Add `aria-pressed`/`.pressed` state during held input and mobile-only CSS feedback. Keep `mobileMenu` wired to the existing inventory flow.

- [ ] **Step 5: Run touch tests and inspect Cycle 2 screenshots**

Run: `npm.cmd run test:browser -- tests/browser/mobile.spec.mjs`

Expected: PASS. Capture/inspect portrait and landscape exploration with controls idle, pressed, beside an NPC/object, inventory open, and combat target selection under `artifacts/mobile-expansion/cycle-2/`.

- [ ] **Step 6: Run Cycle 2 regression gates**

Run:

```powershell
npm.cmd test
npm.cmd run test:browser -- tests/browser/mobile.spec.mjs tests/browser/ui.spec.mjs tests/browser/interiors.spec.mjs tests/browser/combat.spec.mjs
node --check game.js
node --check network.js
```

Expected: All selected suites PASS; keyboard movement, modal input, combat, and networking syntax remain intact.

- [ ] **Step 7: Commit Cycle 2**

```powershell
git add game/game.js game/index.html game/style.css game/tests/browser/mobile.spec.mjs
git commit -m "Add contextual touch gameplay controls"
```

---

### Task 3: Cycle 3 — Browser Reliability, Visual Polish, Performance, and Cache Freshness

**Files:**
- Modify: `game/tests/browser/characters.spec.mjs`
- Modify: `game/tests/browser/overnight.spec.mjs`
- Modify: `game/tests/browser/mobile.spec.mjs`
- Modify: `game/style.css` only for screenshot-proven regressions
- Modify: `game/server.mjs`
- Modify: `game/package.json`
- Modify: `game/package-lock.json`
- Modify: `game/index.html`
- Modify: `game/README.md`
- Screenshot output (ignored): `game/artifacts/mobile-expansion/cycle-3/`
- Benchmark output (ignored): `game/artifacts/living-world/benchmark.json`

**Interfaces:**
- Consumes: Current Playwright animation traces, location-entry flow, `world.clock`, Node static-file response path, and existing living-world benchmark.
- Produces: Stable assertions for the same animation/backtracking guarantees; `cacheHeaders(extension)` or equivalent server helper; HTTP validators/304 behavior; visible/package/server version `1.8.0`.

- [ ] **Step 1: Record the pre-change performance baseline**

Start the local server on port 8844 and run `node tools/benchmark-living-world.mjs`. Preserve the printed median, p95, FPS, and resource counts in working notes before any optimization. If the script fails, diagnose the environment before changing renderer code.

- [ ] **Step 2: Reproduce both baseline browser failures repeatedly**

Run:

```powershell
npm.cmd run test:browser -- tests/browser/characters.spec.mjs --repeat-each=5
npm.cmd run test:browser -- tests/browser/overnight.spec.mjs --repeat-each=5
```

Inspect traces and identify the exact failed assertion. For the character case, determine whether movement was blocked or the draw event was missed. For crypt entry, compare all state fields and saved storage while measuring whether only `world.clock.minutes` advances.

- [ ] **Step 3: Write/adjust tests to express stable gameplay guarantees**

- Place the animation test actor on a known walkable corridor before asserting a real walk frame, and verify both position change and rendered `walk` state. Keep attack/death and no-extra-turn assertions.
- In the crypt backtracking test, freeze `G.world.clock.rate` while comparing exact state, or compare a documented gameplay-state projection only if investigation proves the clock is intentionally elapsed presentation state. Keep exact assertions for location, coordinates, direction, steps, supplies, quest flags, and the saved localStorage string.
- Add repeated focused runs as the acceptance criterion; do not skip, loosen to truthiness, or increase timeouts as the sole fix.

- [ ] **Step 4: Write failing cache/version browser assertions**

In `mobile.spec.mjs` (or a focused `delivery` describe block), request `/`, `/style.css`, `/game.js`, and an image. Assert:

- HTML, CSS, and JS use `Cache-Control: no-cache` and return an `ETag`.
- Image and audio media use a bounded public cache and return an `ETag`.
- A matching `If-None-Match` receives 304 with no body.
- The document footer/package-visible copy identifies `v1.8`.

Run: `npm.cmd run test:browser -- tests/browser/mobile.spec.mjs`

Expected: FAIL because the current server has no cache policy or validator and visible/server versions are stale.

- [ ] **Step 5: Implement cache revalidation and release identification**

In `server.mjs`, derive a stable quoted ETag from `stat.size` and `stat.mtimeMs`, set it before streaming, answer matching `If-None-Match` with 304, and set:

- `no-cache` for `.html`, `.css`, `.js`, and `.json`.
- `public, max-age=86400` for image/audio/font media.

Retain current traversal restrictions, MIME types, and streaming. Update `package.json`, the root package entry in `package-lock.json`, the footer/release copy in `index.html`, the server startup message, and concise README release notes to `1.8.0`/`v1.8`.

- [ ] **Step 6: Inspect screenshots and apply only measured polish**

Run the Cycle 1/2 mobile screenshot paths plus desktop exploration, tavern, inventory, and combat. Fix only visible clipping, stacking, scaling, or contrast regressions. If the benchmark shows no actionable renderer hotspot, record that and make no speculative renderer change.

- [ ] **Step 7: Verify reliability, delivery, and performance**

Run:

```powershell
npm.cmd run test:browser -- tests/browser/characters.spec.mjs --repeat-each=5
npm.cmd run test:browser -- tests/browser/overnight.spec.mjs --repeat-each=5
npm.cmd run test:browser -- tests/browser/mobile.spec.mjs
npm.cmd test
node --check game.js
node --check network.js
node --check server.mjs
npm.cmd run assets:validate
node tools/benchmark-living-world.mjs
```

Expected: Repeated flaky-test reproductions and all checks PASS. Compare post-change benchmark numbers and resource counts with Step 1; report headless limitations.

- [ ] **Step 8: Commit Cycle 3**

```powershell
git add game/tests/browser/characters.spec.mjs game/tests/browser/overnight.spec.mjs game/tests/browser/mobile.spec.mjs game/style.css game/server.mjs game/package.json game/package-lock.json game/index.html game/README.md
git commit -m "Stabilize browser delivery and mobile presentation"
```

---

### Task 4: Cycle 4 — The Lantern Road Side Quest

**Files:**
- Modify: `game/interactions.js`
- Modify: `game/game.js`
- Modify: `game/tests/interactions.test.mjs`
- Modify: `game/tests/p0.test.mjs`
- Create: `game/tests/browser/lantern-road.spec.mjs`
- Modify: `game/README.md`
- Screenshot output (ignored): `game/artifacts/mobile-expansion/cycle-4/`

**Interfaces:**
- Consumes: `AshenInteractions.forScene/nearby/perform/props/draw/hint/state`, `G.world.objects`, `action('acolyte')`, `useEnvironment(dx,dy)`, `journalMenu()`, `normalizeSave(data)`, `saveGame()`.
- Produces: Three wild objects keyed `wild:lantern-west`, `wild:lantern-bridge`, and `wild:lantern-east`; `perform()` result `{lit:boolean,text:string}` for lanterns; `lanternRoadProgress()` returning an integer 0–3; flags `lanternQuest` and `lanternRoadComplete`.

- [ ] **Step 1: Write failing lantern interaction unit tests**

In `tests/interactions.test.mjs`, add tests asserting:

- `forScene('wild')` returns exactly the three named lanterns with cells/approach anchors `lantern-west [10,17]/[10,18]`, `lantern-bridge [22,15]/[22,16]`, and `lantern-east [30,21]/[30,22]`.
- First `perform()` sets `active`, returns `lit:true`, and leaves the lantern non-blocking.
- Repeated `perform()` returns `lit:false` and preserves state.
- JSON round-trip plus `validate()` preserves active state.
- `props('wild', world)` uses the atlas `lantern` frame and marks active lanterns for glow rendering.

Run: `node --test tests/interactions.test.mjs`

Expected: FAIL because wild lanterns and lantern behavior do not exist.

- [ ] **Step 2: Implement generic persistent lantern interactions**

In `interactions.js`:

- Add three authored wild lantern definitions beside existing walkable Gloamwood paths without adding collision.
- Generalize `props()` so tavern props remain unchanged and wild lantern props render through the existing `interaction_atlas.png` lantern frame.
- Add lantern `perform()` handling that sets `active` once and returns the generic `lit` result.
- Add a subtle active glow in `draw()` using Canvas state save/restore; do not introduce new art or a continuous expensive filter.
- Extend `hint()` with `LIGHT`/`INSPECT` wording.

- [ ] **Step 3: Write failing quest/save tests**

In `tests/p0.test.mjs`, add assertions that:

- New games initialize `lanternQuest:false` and `lanternRoadComplete:false`.
- Versions 2, 3, 4, and 5 with those properties absent still load with false defaults while preserving all existing progress.
- Three lit object keys yield progress 3 after save/reload.
- Turning in after three lights awards exactly 30 gold and one Moonwater (`ether`) once; repeated acolyte action cannot award again.

Add `lantern-road.spec.mjs` for desktop 1440×900 and phone 390×844. Test acceptance from the chapel acolyte, pre-quest lantern refusal, touch/action lighting at all three sites, journal `0/3` through `3/3`, save/reload persistence, one-time reward, and completed dialogue. Capture acceptance, lit-road, journal-ready, and completion screenshots.

- [ ] **Step 4: Run quest tests and verify failures**

Run:

```powershell
node --test tests/interactions.test.mjs tests/p0.test.mjs
npm.cmd run test:browser -- tests/browser/lantern-road.spec.mjs
```

Expected: FAIL because quest flags, acolyte flow, journal progress, gating, and reward do not exist.

- [ ] **Step 5: Implement quest rules and compatibility**

In `game.js`:

- Initialize/default both flags in `startGame()` and `normalizeSave()` without changing save version 5 or the storage key.
- Add `lanternRoadProgress()` that reads only the three authored `G.world.objects` keys.
- Replace the acolyte’s informational line with state-aware acceptance, progress, completion, and completed dialogue.
- Gate lantern activation in `useEnvironment()` until accepted; after each first light, log progress and save. At 3/3, direct the player back to the chapel.
- On first valid turn-in, set `lanternRoadComplete`, add exactly 30 gold and one `ether`, log completion, refresh, save, and show reward copy. Never reward again.
- Add state-specific Lantern Road text to `journalMenu()`.
- Keep the main quest objective and all existing acolyte/healer behavior intact.

- [ ] **Step 6: Run focused quest tests and inspect Cycle 4 screenshots**

Run:

```powershell
node --test tests/interactions.test.mjs tests/p0.test.mjs
npm.cmd run test:browser -- tests/browser/lantern-road.spec.mjs
```

Expected: PASS. Inspect both viewport sets for lantern visibility, glow restraint, journal readability, touch-dock access, and dialogue/reward clarity.

- [ ] **Step 7: Run final full verification**

Run:

```powershell
npm.cmd test
npm.cmd run test:browser
node --check game.js
node --check network.js
node --check server.mjs
npm.cmd run assets:validate
node tools/benchmark-living-world.mjs
git diff --check
git status --short --branch
```

Expected: All Node and Playwright tests PASS, syntax and asset validation PASS, benchmark completes without resource-budget regression, and only intended Cycle 4 files are uncommitted before the commit. If the Playwright wrapper again hangs after reporting all cases, diagnose and record the teardown issue rather than silently treating it as a pass.

- [ ] **Step 8: Commit Cycle 4**

```powershell
git add game/interactions.js game/game.js game/tests/interactions.test.mjs game/tests/p0.test.mjs game/tests/browser/lantern-road.spec.mjs game/README.md
git commit -m "Add the Lantern Road side quest"
```

## Completion Evidence

After Task 4, collect:

- The design, plan, and six resulting commit hashes (two documentation commits plus four cycles).
- Per-cycle Node/Playwright command totals and any investigated limitations.
- Clickable paths to representative desktop and mobile screenshots from every cycle.
- Baseline and final benchmark summaries, explicitly labeled as headless measurements.
- Remaining issues ranked critical/high/medium/low.
- Four recommended next cycles without making further edits.
- An explicit statement that no real iOS/Android hardware test, production deploy, or merge to `main` occurred.
