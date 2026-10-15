# Living World Implementation Plan

> For agentic workers: use superpowers:executing-plans inline, milestone by milestone, with test-first behavioral verification and checkpoints.

Goal: build a living painterly RPG without replacing the Canvas/grid gameplay engine.
Architecture: additive scene, animation, lighting and simulation modules; integer gameplay positions remain authoritative, interpolated visual positions are presentation-only. NPC occupancy and persistent interaction collision share one scene service.
Tech stack: existing JavaScript, Node 20+, Canvas 2D, browser Image atlases, node:test, Playwright/Chromium.
Spec: user milestone brief and ../LIVING_WORLD_INSPECTION.md.

Global constraints: preserve ashen-realms-v1.2-save, version 5 stats, quests, inventory, equipment, combat rules, keyboard controls, LAN grid positions, LPC attribution and existing tavern composition. No new runtime dependency or engine migration.

Review focus: legacy saves missing world metadata; rapid direction changes during motion; exits during interpolation; moving NPC occupancy/dead ends; hidden tabs or large time deltas. Tests belong to the owning milestone.

## A — Tavern polish
Files: grounding.js, identity.js, sprites.js, presentation.js, interiors.js, game.js; grounding tests and browser interior checks.
Interfaces: AshenGrounding.point(x,y,sx,sy), depth(actor), shadow(ctx,x,y,options); centered foot plane, cached soft alpha mask, sorted actor depth.
- [ ] Failing grounding tests: literal cell-center coordinates, raised seated/counter depths; browser layer/route checks.
- [ ] Implement minimal integration, keep footprints and open routes coherent.
- [ ] Run full unit suite, browser room navigation/screenshots, CPU measurements; checkpoint and summary.

## B — Character animation
Files: animation.js, identity.js, game.js, animation tests.
Interfaces: controller.sample(id,x,y,dir,time), transition(id,state,time,duration), actionTiming(kind); visual interpolation independent of stats.
- [ ] Fail tests for halfway motion, chained steps, cardinal facing, teleports, state completion and exact impact timing.
- [ ] Use existing real walk frames for player/companions, illustrated atlas states for combat. Preserve 480ms impact/900ms completion and prevent stale session callbacks. Effects preparation/projectile/impact tied to same timeline.
- [ ] Run full suite plus actual movement/combat checks and screenshots; checkpoint. Document absent NPC working/seated and eight-direction frames.

## C — Lighting and living NPCs
Files: world-time.js, lighting.js, npc-behavior.js, game.js, scene definitions, tests.
Interfaces: clock.normalize/read/advance, lighting.draw(ctx,scene,view,time), NPCs.update(scene,dt,walkable,occupied)/entities(scene)/pauseForInteraction(id).
- [ ] Fail clock tests for dawn/dusk/wrap, legacy step-phase, large/hidden-tab deltas; pathfinding tests for blocked furniture and occupied destinations.
- [ ] Add saved configurable time, cached light masks, authentic fire-frame art, full/reduced/off quality. Smooth lighting, indoor/exterior distinction, battle-time integration.
- [ ] Data schedules for traveler entry/bar/seating/exit and guards/townsfolk, static quest anchors with idle actions. Pause while modals/combat active. No pathfinding in render.
- [ ] Full unit suite, clock save reload, NPC occupancy and reachable quest checks, night screenshots and performance; checkpoint.

## D — Environmental interactions
Files: interactions.js, interiors.js, game.js, object-state tests/browser checks.
Interfaces: objects.forScene, nearby(player,direction), perform(object,state), collision(object,state), saved world.objects.
- [ ] Fail tests for chair occupation/standing, door toggle and collision synchronization, container idempotence and reload.
- [ ] Reuse E, facing priority and existing modal/HUD; NPC dialogue wins when nearby. Inspect hearth/tables, read notes, sit, open realistic doors/containers without new loot economics.
- [ ] Full suite, navigation and state persistence checks; checkpoint.

## E — Reusable environment engine
Files: scene-runtime.js, scene data, renderer hooks, docs/asset requirements, benchmark tool.
Interfaces: scene registry records layers, props, collisions, lights, ambience, NPCs, objects, portals, encounter/quest metadata and bounds.
- [ ] Fail lifecycle/cache tests for bounded retained state and invalidation; exercise repeated transitions and real frame pacing.
- [ ] Cache prop drawables/light masks, cull artwork, throttle NPC and HUD work, bounded actor registry, lazy unused interior assets. Respect reduced motion and device quality.
- [ ] Full suite, 60-transition heap/caches and RAF timing, document measured findings without FPS guarantees; checkpoint.

## F — World visual overhaul
Files: environment.js, presentation.js, scene data, game.js, generated environmental assets/manifests and art pipeline docs.
- [ ] Test critical roads, bridge, portals, dungeon gates, quest accessibility against authored props before adding geometry.
- [ ] Improve forest route-aware vegetation/landmarks, coherent town working spaces and lighting, dungeon foreground occlusion, all interior full-resolution art, location-aware battle backgrounds. Preserve playable geography.
- [ ] Generate original assets where existing art cannot meet benchmark; list exact missing animation frames and asset limits.
- [ ] Full unit/browser campaign regression, desktop/mobile screenshots, performance comparison and fresh whole-change review; checkpoint/report.
