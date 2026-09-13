---
id: blocks/custom-asset
title: Custom 3D Asset Block (GLB)
kind: block
wiki: https://minecraft.wiki/w/Block
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-02
updated_at: 2026-09-03
status: implemented
tags: [custom-asset, glb, 3d-model, 1x1x1, build.html, blocks.html, texture-override, voxelize]
related_docs: [docs/BUILD_ASSET_ENVIRONMENT_PLAN.md, docs/CUSTOM_ASSET_VOXEL_PLAN.md, kb/blocks/_block.md]
---

# Custom 3D Asset Block (GLB)

Player-uploaded `GLB`/`GLTF` models that become placeable `1×1×1` blocks (e.g. `Skirting` `1199`, `House fence` `1198`, `porch` `1211`).

## Vanilla specs

- No vanilla equivalent — this is a Hollowpine extension. Vanilla has `1 m³` grid, `16×16` per-face textures, `slab` `0.5 m` etc. Custom assets reuse the same grid but with arbitrary `GLTF` geometry.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `custom_assets` `sql.js` `<game-db>` (`id>=1198` `CUSTOM_ASSET_ID_MIN 1198` `src/game/customAssetConstants.ts:1`), `BLOCKS` `side:-1` `customAssetId` `src/game/customAssets.ts:77` `BLOCK_MAP` |
| Upload | `/build.html` `Meshy` `GLB` → `POST /api/custom-assets` `X-Custom-Asset-Meta` `requestedId: nextId` (`Math.max(1210, staticCatalogMaxId)+1` `server/customAssets.js:44`), `1–6×1–6` footprint `scale 25–100` |
| Placement | `src/game/engine/engineInit.ts:383` `ensureCustomAssetEntity` `x+0.5,y+0.5,z+0.5` `customAssetYaw`. Preserves the true 3D model geometry (`model.clone(true)`) with `MeshBasicMaterial` `DoubleSide` `map:firstTex` `SRGB` `NearestFilter` `center.y` (models like House fence 1198 retain their arbitrary GLTF fence mesh, never collapsed into a 1x1x1 cube). Per-face texture overrides are applied onto the model's existing mesh materials. |
| Per-face edits | `editor.html` `Save & Apply` → `localStorage mc_custom_atlas_overrides` `block_${id}_single_side/top/bottom` `data:image/png` `512×512`/`16×16` + `POST /api/textures/overrides` `worldgen.db` `texture_overrides` `atlas`. `src/game/customAssets.ts:237` `CanvasTexture(Image)` sync + **`transparent:false` (opaque block faces)** `DoubleSide` — block faces MUST stay opaque; `transparent:true` made the whole block render invisible (alpha-border `16×16` cut the cube to nothing), while the un-overridden 3D-model path stayed visible. `src/game/engine/atlas.ts:127` skips `custom` `id>=1198` for atlas (correct — GLB uses own `map`, not atlas). |
| Thumbnail | `src/game/customAssets.ts:154` `renderCustomAssetThumbnail` draws first `map.image` `96×96` `8,8,80,80` on `8B8B8B` (like `editor.html` cube) — guaranteed visible vs `WebGL` `MeshStandard` `BLEND` transparent `96×96` `clearColor 0,0`. `src/game/engine/engineInit.ts:553` `syncCustomAssetsCatalog` re-scans `s.chunks` after `registerCustomAssets` + `modelCache` bust for stale `StandardMaterial`. |
| Held | `src/game/engine/sceneSetup.ts:130` same `BasicMaterial` `DoubleSide` |
| Persistence | `world_blocks` `block_id` `dir` + `worldgen` `texture_overrides` `atlas` version poll `src/services/textureOverrides.ts:74` `3s` |

## Deviations / limitations

- `1×1×1` only for `GLB` — footprint `1–6` scales `x`/`z` via `fitModelToBlock` `scale Math.min(width/size.x, height/size.y, 1/size.z)`, but world storage still one anchor cell; multi-cell `voxelize` not yet.
- No `waterlogged`, `double` slab handling.

## Ruleset when modifying

- Keep `CUSTOM_ASSET_ID_MIN 1198` in sync with `catalog/completeRegistry.json` max `1201` + `1210` guard (`server/customAssets.js:44`).
- Keep `MeshBasicMaterial` `DoubleSide` + `clearGroups` `6×6` parity between `fitModelToBlock` + `held` + `thumbnail` + `ensureCustomAssetEntity` per-face.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`.

## Open work

- **Voxel-render pipeline is live (P1–P3 of `docs/CUSTOM_ASSET_VOXEL_PLAN.md`)**: custom
  assets no longer use GLBs. `asset.voxel` payloads render native geometry
  (`src/game/voxelMesh.ts`); block-type = opaque textured cube, model-type = voxel grid
  with palette vertex colors. Server voxelizes on upload; boot no longer downloads GLBs.
- Move `voxel`-kind custom assets into the chunk mesher (worker sync) + bake block
  face tiles into the atlas (chunk-mesh integration, later phase).
- Shared `asset manifest` for blueprints.
