---
id: blocks/trapdoor
title: Trapdoor
kind: block
wiki: https://minecraft.wiki/w/Trapdoor
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-09-01
status: implemented
tags: [trapdoor, toggle, wood, half-block, redstone, 3-16-thick]
related_docs: []
---

# Trapdoor

A solid, openable 1×1 barrier — a horizontal, truncated form of its door type.
Occupies the **top or bottom half** of a block (per placement), 3⁄16 thick in JE
(0.1875; 0.1825 BE); opens downward from the top half or upward from the bottom half.

## Vanilla specs (from wiki)

- **Variants**: wooden (all wood types), iron, copper (1.21). We only have **oak**.
- **Opening**: wooden/copper by player or redstone; **iron only by redstone**.
  Can be opened/closed with a player or mob inside. Attachment block can be removed
  after placement without breaking the trapdoor.
- **Top vs bottom**: placed on the upper part → opens **downward**; lower part →
  opens **upward**. Hinge is on the side it's attached to.
- **Solid when closed** (lanterns can hang on/below a closed trapdoor); non-solid
  when open. Blocks flowing water/lava.
- **Crawl**: closing a trapdoor 1 block above the ground forces the player to
  **crawl** until 1.5 blocks of headroom return.
- **Climbable** (JE): an open trapdoor directly above a ladder on the same wall side
  can be climbed through like the ladder.
- **Redstone component**: activated by adjacent power components/powered blocks
  (incl. above/below), powered comparator/repeater facing it, or redstone dust
  pointing at it; state change takes 1 game tick; a manually-closed wooden/copper
  trapdoor stays closed until a new activation.
- **Mob pathing quirk**: mobs treat trapdoors as always closed → they walk off open
  trapdoors (mob-trap exploit, MC-50556 "Works As Intended").
- **Block states** (JE): `facing`, `half` (top/bottom), `open`, `powered`,
  `waterlogged` (since 1.13).
- **Sounds**: wood family + trapdoor creak (unique since 1.9; separate from doors
  since 16w04a). Audible 16 blocks.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `src/game/blocks.ts` ids **107 "Oak trapdoor (closed)"** (`solid:1`) and **108 "Oak trapdoor (open)"** (`solid:0`); tile 108 (oak_trapdoor.png) |
| Meshing | `src/game/engine/chunkMesh.ts` `pushTrapdoor(x,y,z,id,facing,halfTop)` — closed: horizontal 3⁄16 slab with 2×2 grille, **bottom half (y 0..0.1875) or top half (y 0.8125..1.0)** per placement; open: vertical 3⁄16 panel standing against the wall on `facing`'s side (`rotateBoxFacing`). Dispatched in `meshWorker.ts` and `Game.tsx` `advanceMeshJob` (parity). Thin trapdoor ids 107/108 are excluded from opaque neighbor-face culling so adjacent blocks keep their near faces. |
| Interaction | `src/components/Game.tsx` — right-click toggles 107↔108 ("Window Shutter Opened/Closed"); `playDoorUse`-family sfx |
| Placement | facing from player yaw (same cardinal mapping as stairs); **half** from the aim point's vertical fraction within the cell (frac > 0.5 → top half); stored in `s.blockDirs` + chunk-local `dirs` (value = facing+1 + halfTop*4) |
| Redstone | redstone torch toggle adjacent trapdoors (`Game.tsx` redstone section) |
| Tests | `scripts/test-trapdoor-interactive.mjs`, `scripts/test-door-trapdoor-angles.mjs` |

## Deviations / limitations

- **Oak wooden only** — no iron/copper/other woods (iron's redstone-only rule absent
  since iron trapdoors don't exist yet).
- **Open/closed = two block ids** (107/108) instead of an `open` blockstate.
- **Facing + half implemented; open direction approximated** — closed top-half and
  bottom-half slabs render correctly; the open state always stands against the
  facing wall (vanilla swings down from the top half / up from the bottom half
  against the same wall — visually equivalent panel, direction of travel differs).
- **No crawl**, no ladder-climb-through, no mob-pathfinding quirk, no waterlogging,
  no pistons.
- Redstone "activation" is a direct torch-adjacency toggle, not the full 1-tick
  mechanism rule set.

## Ruleset when modifying

- Keep the 105/106 + 107/108 id pairs consistent across registry, meshing, and
  interaction (door/trapdoor family).
- Keep worker/main-thread `pushTrapdoor` parity.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/test-trapdoor-interactive.mjs`,
  `node scripts/test-door-trapdoor-angles.mjs`, plus the standard
  `textureCheck` / `test-worker-meshing` / `ci:perf`.

## Open work

- U12 (per-wood door slats — trapdoor wood variants are the same family).
- U15 (model-JSON loader) would give real `facing`/`half` states and the 3⁄16
  geometry with up/down swing.
- Iron trapdoor (redstone-only) pairs with the iron door follow-up.
