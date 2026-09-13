---
id: blocks/torch
title: Torch
kind: block
wiki: https://minecraft.wiki/w/Torch
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-08-27
status: implemented
tags: [torch, light, wall-torch, ceiling, orientation, non-solid]
related_docs: [kb/blocks/_block.md]
---

# Torch

Non-solid light-emitting block: a 2px stick with a small glowing head. Ids
80 (torch), 81 (soul torch), 84 (redstone torch).

## Vanilla specs (from wiki)

- **Stats**: hardness 0 (instantly breakable, 0.05 s, any tool), blast resistance 0,
  stackable 64, transparent, luminous **14**, non-solid (no collision).
- **Placement**: top OR sides of solid blocks; the aimed face decides:
  - top face → floor torch (stick up, head top),
  - side face → **wall torch** (separate `wall_torch` block in vanilla) — the stick
    points horizontally away from the attached wall, the head at the free end,
  - underside (BE) → upside-down torch (head down).
- **States (JE)**: wall torch `facing` north/south/east/west = where the top of the
  torch is facing (the plug sits on the opposite face).
- **Removed & drops itself** when its attachment block moves/removed, water flows in,
  piston pushes; lava destroys it without drops. Gravity blocks fall around it.
- **Light 14**; melts snow (2 blocks) and ice (3 blocks).
- Crafting: coal/charcoal + stick → 4 torches.

## Our implementation

| Concern | Where |
|---|---|
| Registry | ids 80/81/84 (category utility, `glow`/`lightPower` → point light, `trans:1`) |
| Meshing | `src/game/engine/chunkMesh.ts` `pushTorchPost(x,y,z,tile,orient,topTile?,bottomTile?)` — floor (3x thicker 6px post, 11px height), ceiling (6px post hanging down), wall N/S/E/W (3x thicker 22.5° slanted 6px stick leaning outward into the room from the attached wall face with full 6-sided UV mapping); dispatched with `orient` from chunk `dirs` in `meshWorker.ts` + `Game.tsx advanceMeshJob` (parity). The tiny 2px top/bottom caps sample the tile's flame-tip/stick-end sub-rects (`pushSolidBox` topUV/bottomUV) instead of squashing the whole 16×16 tile onto them. |
| Per-face overrides | `src/game/engine/customFaceTiles.ts` reserves atlas slots 879-884 for the torch/soul/redstone top+bottom caps. The editor writes a distinct "top"/"bottom" texture there; `atlas.ts redrawAtlas` bakes the slots (vanilla tile default, override wins) and resolves `block_<id>_top` overrides to the custom slot; the mesher samples it for that face. Chunks containing torches are remeshed on override change (`Game.tsx` storage handler) so existing worlds pick it up. |
| Placement | `placeBlock` derives the orientation from the hit face: `ny=1` floor, `nx/nz=±1` wall (W/E/N/S mapping), `ny=-1` ceiling; stored in `s.blockDirs` + chunk `dirs` (value = 0 floor · 1 N · 2 S · 3 W · 4 E · 5 ceiling); persisted to SQLite database `world_blocks.dir` |
| Held item | `src/game/engine/heldItem.ts` `createHeldTorchMesh(atlasTexture, tile, isLeftHand)` — 3x thicker textured 3D wooden shaft + dark charcoal collar + luminous glowing flame head and bright core, positioned and angled naturally for main hand (right) and offhand (left) mirroring Java Edition |
| Breaking | instant (families `mineHoldTime` — instant category) |

## Deviations / limitations

- One block id for floor/wall/ceiling (vanilla splits `wall_torch`); orientation is
  stored in the facing table, not block states.
- **Single atlas tile for all faces** (side/top/bottom all resolve to tile 81 for a
  torch): the side faces always sample one shared tile. A separate editor "top"/"bottom"
  edit is rendered on the small cap faces via dedicated override slots (see Per-face
  overrides above), not on the whole model.
- No particle smoke/flame (torch particles not implemented; light comes from the
  emitter point-light pool).
- No falling-block interplay, no water-flow destruction, no torch melting of
  ice/snow.

## Ruleset when modifying

- Orientation codes (0 floor, 1 N, 2 S, 3 W, 4 E, 5 ceiling) must stay in sync
  between placement (`Game.tsx`), worker (`meshWorker.ts`), and main-thread mesher.
- Wall/ceiling geometry only makes sense if the neighbouring block matches — the
  mesher does not validate attachments (broken-away torches are decorative).
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/probe-torch-looks.mjs`, plus standard gates.

## Open work

- Torch particles / flame flicker; attachment validation; water-flow destruction.
