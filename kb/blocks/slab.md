---
id: blocks/slab
title: Slab
kind: block
wiki: https://minecraft.wiki/w/Slab
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-02
updated_at: 2026-09-02
status: implemented
tags: [slab, half-block, building, stone, wood, crafting, stonecutting]
related_docs: [kb/blocks/_block.md]
---

# Slab

Half-height version of its full block. Our recent batch adds 10 popular stone slabs.

## Vanilla specs (from wiki)

- **Size:** 0.5 m high (8/16), full `x`/`z`. Bottom and top variants (`type=bottom/top/double`). Double slab is full cube but retains slab item.
- **Variants:** 68+ (stone, cobblestone, mossy cobblestone, smooth stone, stone brick, mossy stone brick, granite, polished granite, diorite, polished diorite, andesite, polished andesite, cobbled deepslate, polished deepslate, deepslate brick/tile, tuff, brick, mud brick, sandstone, smooth sandstone, cut sandstone, red sandstone, prismarine, nether brick, blackstone, quartz, cut copper, oak/birch/spruce etc. + wool/concrete upcoming).
- **Obtaining:** crafting 3 blocks → 6 slabs, or stonecutter 1 → 2.
- **Placement:** bottom half by default; looking at top half of a block or sneaking inverts to top half.
- **Physics:** solid, opaque per half, supports fall damage, allows levers/torches on top, mobs spawn on top, chests open below top slabs.

## Our implementation

| Concern | Where |
|---|---|
| Registry | ids `1185-1197` (13) + `1188 Stone Brick Slab` `1189 Mossy Stone Brick` `1190 Granite` `1191 Diorite` `1192 Andesite` `1193 Brick` `1194 Sandstone` `1195 Quartz` `1196 Nether Brick` `1197 Deepslate Brick` + `1200/1201 High Grass` is grass, not slab — see `tall-grass.md`. All `slab:1` `solid:1` `category building` `src/game/blocks.ts` |
| Meshing | `src/game/engine/chunkMesh.ts` `pushSlab(x,y,z,def,isTop,hideTop,hideBottom)` — `BoxGeometry(1,0.5,1)` at `y` or `y+0.5`, `MeshLambert` `map` from `def.top/bottom/side`. Worker + main-thread parity (`meshWorker.ts` + `Game.tsx advanceMeshJob`). |
| Held item | `src/game/engine/heldItem.ts` `createHeldSlabMesh` — 3D half-cube scaled `1.5` and angled like `Fence` |
| Inventory | `src/components/gui/InventoryModal.tsx` `isCustom` includes `slab` → slab pill, `120` slab thumbs via `catalog/thumbnails.json` `thumbnailsCache.json` |
| Physics | `src/game/physics/playerPhysics.ts` `isSlab` check, `playerPhysics` step 0.5 auto-step, `y0` collision `slab` top at `y+0.5` |

## Deviations / limitations

- No `type=double` — double slab is two half slabs stacked as two separate blocks (vanilla merges to full cube).
- No `waterlogged` — slabs are not waterloggable.
- No smooth stone / polished variants beyond the 10 popular ones.

## Ruleset when modifying

- Keep `slab:1` flag and `side/top/bottom` tile pins in sync between `catalog/completeRegistry.json` and `src/game/blocks.ts` (generated via `catalog/patchRegistryIds.mjs` + `patchBlockTiles.mjs`).
- Keep `pushSlab` parity between `chunkMesh.ts` and `meshWorker.ts`.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`.

## Open work

- U2 (mip atlas) — 1px padding for slab top faces.
- U15 (model-JSON loader) — slab `type` will become JSON `elements` `from 0,0,0 to 16,8,16`.
