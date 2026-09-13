# Build Asset Environment

Updated 2026-09-01.

## Current result

`/build.html` is a standalone asset workshop. It accepts `.glb` and `.gltf` uploads, with Meshy `.glb` exports as the recommended input. Each successful upload becomes a browser-persisted inventory item backed by IndexedDB. The page previews the model, reports its dimensions and triangle count, and lets the creator save any `1–6 × 1–6` footprint with a 25–100% scale. The prompt is the item name; actual placement happens in the game as a single custom block item whose rendered overlay can span the saved footprint.

The page reads the server inventory before offering a production ID. A user must confirm the displayed next ID before **Insert to game** can publish the binary model. Publishing is enabled only when the page is opened on `:PROD`; `:DEV` is a read-only development inventory view so the two databases cannot be mixed. Production asset rows can be removed with the `×` control; deletion is authenticated and limited to the uploader. Inventory search matches both the prompt-derived name and the numeric game ID, and rows remain keyed by ID so similarly named assets are separate items.

The preview is static by default. **Rotate 90°** turns the selected model and footprint guide manually; there is no animation-driven auto-rotation. Placement changes are previewed immediately and can be saved at any width and height from 1 through 6.

After a published asset catalog is loaded, every imported model automatically gets a thumbnail rendered from its GLB materials for creative inventory, hotbar, and cursor views. The same fitted GLB model is loaded for the first-person held item, so the hand view uses the imported geometry and textures instead of a generic puzzle icon or atlas tile.

When placing an asset in the production game, its orientation is snapped from the player camera yaw to one of four right angles and stored in the block direction table. The same direction is restored after reload and sent to other players through block-edit updates.

## Meshy import finding

Meshy assets can be imported when exported as GLB because geometry, materials, and textures are packaged in one file. A raw GLTF file can be parsed only when its referenced buffers and textures are available to the page; the single-file upload flow therefore recommends GLB and gives a useful error for external-resource GLTF files.

Imported models are registered as dynamic custom blocks in the production catalog. A saved footprint is carried in the asset metadata, while the current world storage still records custom blocks in individual `world_blocks` cells. It is collision-solid and its GLB is fetched from the custom-asset store and rendered as an overlay. The custom overlay is deliberately non-opaque to both the worker and main-thread voxel meshers: neighboring solid blocks keep all faces adjacent to the asset, preventing transparent-looking holes. The GLB materials are double-sided for thin meshes such as fences. This is not voxelized geometry; converting a multi-cell asset into a true Minecraft-style block still requires block-state and voxelization decisions.

## 2026-09-02 fixes

- `CUSTOM_ASSET_ID_MIN 1210→1198` (`src/game/customAssetConstants.ts:1`) — `1199` `1211` were below threshold → `side:-1` voxel hole `src/game/engine/atlas.ts:127` skipped, `ensureCustomAssetEntity` skipped → invisible.
- `GLB` `MeshStandardMaterial` `BLEND` `transparent:true` → `MeshBasicMaterial` `DoubleSide` `transparent:false` `src/game/customAssets.ts:46` + `src/game/engine/sceneSetup.ts:130` for held, `1×` `Mesh` `6` prims `1` group → `6` groups `clearGroups` `src/game/customAssets.ts:287` so per-face `+Y` top `16×16` correctly sampled.
- `TextureLoader.load(dataURL)` async → `CanvasTexture(Image)` sync `src/game/customAssets.ts:237`.
- `y-=center.y` + `x+0.5,y+0.5,z+0.5` (`src/game/customAssets.ts:43` + `src/components/Game.tsx:1558`) → `1×1×1` fills `y` to `y+1` centered (was `50%` overflow).
- `syncCustomAssetsCatalog` now re-scans `s.chunks` after `registerCustomAssets` + `modelCache` bust for stale `StandardMaterial` (`src/game/customAssets.ts:144`).

## Follow-up plan

1. Add a shared asset manifest so build inventory items can be referenced by saved scenes and blueprints.
2. Add transform controls for moving and rotating placed instances in the build page; saved 1–6 footprint, manual preview rotation, and scale controls are now present.
3. Add server-side asset moderation, quotas, and cleanup for production uploads.
4. Add an explicit voxelize pipeline for assets that should become true Minecraft blocks.
5. Add production scene export/import for custom one-cell placements.
