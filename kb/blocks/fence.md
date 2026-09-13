---
id: blocks/fence
title: Wooden & Nether Brick Fence
kind: block
wiki: https://minecraft.wiki/w/Fence
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-29
updated_at: 2026-09-05
status: implemented
tags: [fence, barrier, wood, nether-brick, connected-states, 1.5-height, transparent]
related_docs: [kb/blocks/_block.md]
---

# Fence (Wooden & Nether Brick)

A 1.5-block-high barrier block that prevents players and mobs from jumping over. Standalone fences appear as a thick 4×4 px vertical post; adjacent fences, fence gates, or solid blocks dynamically connect via upper and lower horizontal crossrails.

## Vanilla specs (from Minecraft Wiki)

- **Hardness & Blast Resistance**: 
  - Wooden Fences: Hardness 2.0, Blast Resistance 3.0 (axe mined, flammable).
  - Nether Brick Fence: Hardness 2.0, Blast Resistance 6.0 (pickaxe mined, non-flammable).
- **Collision Box & Height**:
  - Visual height: 1.0 block ($16\text{px}$).
  - Collision box height: **1.5 blocks** ($24\text{px}$), preventing standard jumps (player max jump = 1.25 blocks) without Jump Boost or carpets placed on top.
- **States & Connection Logic**:
  - `north`, `south`, `east`, `west`: boolean states representing connections in each orthogonal direction.
  - When standalone (no connections): renders central post ($4\times 4\times 16\text{px}$, centered from $0.375$ to $0.625$ in $X$ and $Z$).
  - When connected to adjacent solid blocks, fences, or fence gates: renders central post + two horizontal rails per connected direction:
    - Upper crossrail: $y \in [12/16, 15/16]$ ($0.75$ to $0.9375$), $2\text{px}$ wide ($0.4375$ to $0.5625$).
    - Lower crossrail: $y \in [6/16, 9/16]$ ($0.375$ to $0.5625$), $2\text{px}$ wide ($0.4375$ to $0.5625$).
- **Color & Wood Variants**:
  - Oak Fence, Spruce Fence, Birch Fence, Jungle Fence, Acacia Fence, Dark Oak Fence, Mangrove Fence, Bamboo Fence, Crimson Fence, Warped Fence, Nether Brick Fence.

## Our implementation

| Subsystem | File & Function | Mechanism |
| :--- | :--- | :--- |
| **Registry** | [`src/game/blocks.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/blocks.ts) | 11 fence variant definitions with plank/brick atlas tiles, `trans: 1`, `solid: 1`, `fence: 1`. `isFence(id)` helper. |
| **Chunk Mesher** | [`src/game/engine/chunkMesh.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/chunkMesh.ts) `pushFence()` | Generates 3D box quads for central $4\times 4$ post + dynamic North/South/East/West crossrails based on `connects(x±1, y, z±1)`. |
| **Worker Meshing** | [`src/game/engine/meshWorker.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/meshWorker.ts) & [`chunkMesher.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/chunkMesher.ts) | Dispatches `pushFence()` for all fence IDs with neighbor block lookup. |
| **Player Collision** | [`src/game/physics/playerPhysics.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/physics/playerPhysics.ts) `collides()` | Enforces 1.5-block collision height ($y \in [yy, yy + 1.5]$) so players cannot leap over 1-high fences. |
| **Mob Pathfinding** | [`src/game/entities/spawner.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/spawner.ts) | Treats fences as impassable non-climbable barriers (animals stay inside pens). |
| **3D Builder Preview** | [`block-page/editor.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/block-page/editor.ts) `buildEditorFence()` | Renders 3D post and crossbars in real-time rotating editor preview. |
| **Custom 3D Asset Fences** | [`src/game/customAssets.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/customAssets.ts) | 3D custom assets such as **House fence** (ID 1198) are classified as full 3D assets (`kind: "custom-asset"` / `3d-asset`) loaded from GLB models, rather than vanilla voxel fences. See [`kb/blocks/custom-asset.md`](https://github.com/martintimmer/hollow-web-mc/blob/main/kb/blocks/custom-asset.md). |

## Deviations / limitations

- Custom GLB fences (e.g. House fence 1198) are full 3D assets, not voxel
  fences: no `pushFence` connection logic, no 1.5-block collision guarantee —
  see `kb/blocks/custom-asset.md` for the placeholder/retry behavior that
  caused the purple-fence incidents (placeholder now brown, retried until the
  catalog registers).
- Tool-speed families (axe for wood, pickaxe for nether brick) and flammability
  are not verified against the `mineHoldTime` system — assumed, not tested.

## Ruleset when modifying

- The `fence: 1` registry flag is the dispatch key: any new fence id must set
  it in `catalog/completeRegistry.json` (never hand-edit `src/game/blocks.ts`)
  or it meshes as a plain cube with no connections.
- Keep `pushFence` parity between `meshWorker.ts` and the main-thread mesher,
  and keep the 1.5-block height in `src/game/physics/playerPhysics.ts`
  consistent with the mesher (visual 1.0 vs collision 1.5 is vanilla).
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/test-worker-meshing.mjs`, `npm run kb:check`.

## Open work

- Verify axe-vs-pickaxe break times per fence material against vanilla.
- Fence gates: confirm whether gate blocks exist and connect to `pushFence`
  rails (undocumented — see `npm run kb:expand` redstone/building gaps).
- Animal-pen behavior (cows held, farmers tending) is covered by gameplay
  tests, not by a fence unit probe.
