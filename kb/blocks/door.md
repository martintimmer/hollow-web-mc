---
id: blocks/door
title: Door
kind: block
wiki: https://minecraft.wiki/w/Door
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-09-01
status: implemented
tags: [door, two-block, toggle, wood, hinge, 3-16-thick]
related_docs: [docs/CHEST_MODEL_SPEC.md]
---

# Door

A switchable barrier occupying **two block spaces** (lower + upper half); 3⁄16 thick
in JE (0.1875, 0.1825 in BE) — the rest of the space is passable. Wooden doors open
by hand/redstone; iron doors only by redstone (we ship oak wooden only).

## Vanilla specs (from wiki)

- **Variants**: wooden (oak, spruce, birch, jungle, acacia, dark oak, mangrove,
  cherry, bamboo, crimson, warped…), iron, copper (1.21). We only have **oak**.
- **Placement**: must sit on a full solid block face; bottom half at the aimed
  block, top half above. Occupies the side of the block closest to the player.
- **Facing/hinge**: placed on the side of the block closest to (or behind) the
  player. Hinge rules: adjacent matching door with handle touching → double door
  (hinges opposite); else hinge on the side with more adjacent solid faces; else
  (JE) closest to player aim.
- **Two-block structure**: two separate blocks; breaking one half removes both
  (upper half drops nothing, lower drops the door item). `setblock` on one half
  yields graphical bugs — the upper depends on the lower.
- **Behavior**: water/lava flow around doors; mobs can spawn in the door space;
  open/close creak audible 16 blocks; usable as air pockets underwater (JE, not
  waterlogged); wooden doors burn (fuel: smelt 1 item per door; nether wood/iron
  are not fuel).
- **Block states** (JE): `facing` (n/s/e/w), `half` (lower/upper), `hinge`
  (left/right), `open`, `powered`.
- **Sounds**: wood sound type (`block.wood.*` family) + unique door creak
  (`block.wooden_door.open/close`); zombie attack/break door sounds exist.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `src/game/blocks.ts` ids **105 "Oak door (closed)"** (`solid:1`) and **106 "Oak door (open)"** (`solid:0`); tiles 106/107 (oak_door_top / oak_door_bottom) |
| Meshing | `src/game/engine/chunkMesh.ts` `pushDoor(x,y,z,id,part,facing)` — frame+holes panel design: stiles 2px, horizontal/vertical crossbars, tiles 106/107; **part** = below-door → upper panel, above-door → lower panel, alone → full leaf (vanilla two-block split); **facing** (0..3) rotates the leaf via `rotateBoxFacing` so the door faces the player. Dispatched in `meshWorker.ts` and `Game.tsx` `advanceMeshJob` (parity). Thin door ids 105/106 are excluded from opaque neighbor-face culling so adjacent blocks keep their near faces. |
| Interaction | `src/game/interaction/playerInteraction.ts` — right-click/E toggles 105↔106 on **both halves** (`above`/`below` neighbor checks, `edit()` both); toast "Door Opened/Closed"; `playDoorUse` sfx. Closing onto the player is refused with a "step out of the doorway" toast (prevents the unstuck-elevator roof launch); placement overlap-check covers the upper half too |
| Breaking | `breakBlock` — breaking either half removes **both halves** (vanilla parity) |
| Redstone | redstone torch toggle adjacent doors (`Game.tsx` "REDSTONE TORCH / POWER" section) |
| Crafting | `src/game/recipes.ts` — 6 oak planks (2×3) → 3 oak doors |
| Placement | 2-block pair; facing derived from player yaw (same cardinal mapping as stairs), stored in `s.blockDirs` + chunk-local `dirs` (value = facing+1) for both cells; catalogue door spawns as a proper 2-block pair (test: `scripts/test-door-snap-and-single-blocks.mjs`) |
| Sound | `src/game/sfx.ts` `playDoorUse` |

## Deviations / limitations

- **Oak wooden only** — no iron/copper/other woods.
- **Facing implemented, hinge not** — the leaf faces the player (cardinal facing
  via `blockDirs`), but there is no `hinge` left/right rule (double-door pairing,
  solid-adjacency hinge choice) — the hinge stays on the same leaf corner.
- **Open state is a full-height leaf swap** — open leaf = the panel swung 90°-style
  approximation (two full-height leaf slabs), not a real 3⁄16-thin animated panel
  (see the door-saga history in `docs/` + git log).
- **No double doors** (adjacent matching doors don't pair).
- **No waterlogging/air-pocket semantics**, no mob-spawning-in-door-space check,
  no zombie door-attack, no fuel (furnace fuel list not implemented for doors).
- Breaking drops: both halves vanish, lower-half-style drop — but drops the item in
  both creative/survival via the standard drop path (door id 105 → itself).
- **Closed door is full-solid here** (not a 3⁄16 panel), so the physics unstuck
  resolves sideways first and only lifts (max 1.2 m/frame) as a last resort;
  closing a door onto the player is refused instead of intersecting.

## Ruleset when modifying

- **Two ids are one door** — 105/106 (and 107/108 trapdoors) must stay paired in
  registry, meshing, and interaction; breaking/toggling logic assumes `above/below`
  neighbor checks. Keep worker/main-thread `pushDoor` parity.
- Door tiles 106/107 are pinned by the vanilla texture set; custom slats history is
  in git (door-saga commits) — do not re-derive door tiles from name matching.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/test-door-trapdoor-angles.mjs`,
  `node scripts/test-door-snap-and-single-blocks.mjs`, plus the standard
  `textureCheck` / `test-worker-meshing` / `ci:perf`.

## Open work

- U12 (per-wood door slats — dedicated tile slots for each wood type).
- U15 (model-JSON loader) would replace the hand-made panel with the real
  `blockstates/*_door.json` + `models/block/*_door_*.json`, giving facing, hinge,
  and true 3⁄16 geometry.
- Iron door (redstone-only) is a natural follow-up (id + `powered` state + gate).
