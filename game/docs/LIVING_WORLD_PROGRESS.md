# Living World ledger — plan: docs/plans/2026-10-14-living-world.md

Phase 0: inspected; baseline 106 tests pass; safe checkpoint 399ebc4.
Ruling: execute in this existing feature checkout under a Git checkpoint — preserves uncommitted tavern/reference files; cost if wrong: branch can be recovered from checkpoint.
Ruling: user supplied specification and explicitly requested continued inline execution; no repeated design approval gates — cost if wrong: revise additive milestone modules.
Pre-flight: A grounding feeds B motion feet; B timeline feeds C NPC/lighting render; C saved clock feeds D object states; D scene occupancy feeds E/F content. Shared source of collision remains map + scene footprints.

Milestone A: complete. grounding.js aligns tile-center feet, shared visual offsets, depth sort and one cached soft shadow mask. identity/sprites/presentation/game/index integrated. RED→GREEN grounding tests; full suite108/108; Chromium alpha center83/edge4/corner0, routes to keeper/Pella/Rook/exit verified; screenshot A-tavern.png reviewed. Tavern CPU median 0.10000000149011612ms / p95 0.3999999985098839ms. Missing dedicated seated poses remains documented, not simulated as real animation.

Milestone B: complete runtime. animation.js provides bounded FSM, 160ms visual motion, cardinal facing, velocity-derived gait and shared combat phases; effects.js supplies restrained preparation/projectile/impact effects. identity preloads real directional walk alternates; actor depth follows interpolated feet; camera follows motion. Existing 480ms/900ms combat callbacks preserved. Full unit suite112/112; browser halfway x8.51 at82ms, idle at214ms, deterministic enemy HP200 before impact/184 after; no page errors. Custom ancestry/appearance combat pose sheets remain an explicit art gap; idle identities are preserved.
