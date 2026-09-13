# Custom Assets: Voxelization Plan (kill GLB-entity rendering)

_Status: proposed — authored 2026-09-03_
_Related: `kb/blocks/custom-asset.md`, `docs/BUILD_ASSET_ENVIRONMENT_PLAN.md`, `docs/KNOWN_ISSUES.md`_

---

## 1. Problem statement

Block-type custom assets (e.g. skirting `1199`, porch `1211`) render **invisible /
transparent** in the world, while model-type assets (e.g. House fence `1198`) render
fine. Separately, the whole system is inefficient:

- **Cold-load exposes GLBs.** On world join, `Game.tsx` `loadCustomThumbnails()`
  downloads the **full GLB for every custom asset** (5.5 MB each) just to paint a
  96×96 inventory icon.
- **GLB is the wrong storage/rendering unit.** A block's real content is per-face
  16×16 / 512×512 textures (see `texture_overrides` in `worldgen.db`, "atlas" key =
  4.5 MB), not a heavyweight model file.
- **No voxel mesh exists for custom blocks.** `atlas.ts`, `meshWorker.ts` and
  `chunkMesher.ts` all *skip* `customAssetId` blocks, so a custom block depends
  entirely on the fragile GLB-entity path.
- **`assetType` is not persisted.** The game cannot even tell "block" from "model".

**Decision (project decision):** Hollowpine must NOT render imported assets as GLB
entities. Imported 3D assets must be converted into **native voxel geometry** — the
same way torch and door are built — and the GLB is discarded after conversion.

---

## 2. Investigation log — why block-type assets are invisible

Every finding from the 2026-09-03 debugging session, kept for the record.

### 2.1 GLB materials use `alphaMode: BLEND`

Parsed the stored GLBs (three `GLTFLoader` in Node + GLB JSON inspection):

| id | name | type | materials | notes |
|---|---|---|---|---|
| 1198 | House fence | model | 1 × **OPAQUE** (default) | works |
| 1199 | Skirting | block/cube | 3 × **`alphaMode: BLEND`** | invisible |
| 1211 | porch | block/cube | 3 × **`alphaMode: BLEND`** | invisible |
| 1212 | farm-fence | model | (similar to 1198) | — |

1199/1211 parse as **6 separate quad meshes** (one per cube face), every material
`MeshStandardMaterial transparent=true` — the documented "invisible in the voxel
scene" failure mode.

### 2.2 Fixes applied (did NOT resolve visibility)

- `src/game/customAssets.ts` `fitModelToBlock` replaces all materials with **opaque
  `MeshBasicMaterial`** (`transparent:false`, `DoubleSide`) — confirmed working by
  client telemetry `1199-post-fit` = `MeshBasicMaterial t=false map=true` in
  `data/client-errors.log`.
- `fitModelToBlock` also forces `depthTest/depthWrite:true`, `side:DoubleSide`,
  Nearest-filtered SRGB textures.
- `src/components/Game.tsx` `ensureCustomAssetEntity` override branch previously
  forced `m.transparent = true` with possibly blank/stale override textures →
  fully invisible. Changed to **opaque + fall back to the model's own texture**
  (`const tex = override || firstTex`).
- Committed: `0dd13c7` (`customAssets.ts`), `2e1bb69` (`Game.tsx`), `838380b`
  (version bump v0.1.430).

### 2.3 Why the fixes still did not satisfy

Even with opaque materials confirmed at the model level, block-type assets remained
invisible for the user on v0.1.430. Conclusion: **the GLB-entity architecture is the
wrong approach for block-type assets.** A block must be a voxel in the chunk mesh,
not a lone entity whose material path can diverge.

### 2.4 Efficiency findings

- `Game.tsx:1491` `loadCustomThumbnails()` → `loadCustomAssetThumbnails()`
  (`customAssets.ts:479`) → `loadCustomAssetModel()` (`:174`) →
  `apiGetCustomAssetData()` (`services/customAssets.ts`) downloads the whole GLB per
  asset at boot.
- `server/customAssets.js` stores `data_base64` per asset (the GLB bytes).
- `texture_overrides` ("atlas" key) already holds the per-face textures users
  actually need: `block_1199_single_side/top/bottom`, `block_1211_single_side`, … .
- `assetType: "model" | "texture"` exists only in `build-page/main.ts:19`; it is
  **not** stored server-side and **not** in `CustomAssetMeta`
  (`services/customAssets.ts`).

---

## 3. As-is architecture (current)

```
build.html ──GLB──▶ POST /api/custom-assets (server stores data_base64)
Game boot ──▶ GET /api/custom-assets (metadata) + GET /api/custom-assets/{id} (GLB) for thumbnails
Place block id≥1198 ──▶ ensureCustomAssetEntity ──▶ loadCustomAssetModel ──▶ GLTFLoader
Mesher: atlas.ts:127 / meshWorker.ts:205 / chunkMesher.ts:261  SKIP custom blocks (no voxel mesh)
```

---

## 4. Target architecture (to-be)

```
build.html: GLB ──▶ VOXELIZER ──▶ compact voxel payload (~5 KB) ──▶ POST /api/custom-assets
Game boot: GET /api/custom-assets (metadata only; thumbnails from voxel/override data, NO GLB)
Place block id≥1198: chunk mesher emits voxel faces from the payload (native, like torch/door)
GLB: discarded after voxelization; never shipped to clients
```

---

## 5. How Hollowpine interprets an imported 3D asset (the spec)

1. **Voxelize once at upload.** Rasterize the model's surface into a 3D grid,
   default **16×16×16 per 1×1×1 cell** (configurable 8–32). Each cell is empty or a
   material index.
2. **Quantize materials.** Map the model's textures/colors to a small palette
   (default ≤ 64 entries). Optionally preserve a compact per-asset texture tile.
3. **Only exposed faces.** Greedy meshing keeps visible faces only → minimal
   triangles.
4. **Fit + orient.** Fit to the 1–6 footprint, axis-align, center in the cell
   (no overflow), matching `fitModelToBlock` rules.
5. **Block-type assets** (a texture upload, or any model that voxelizes to a plain
   box): store as a normal block with per-face textures (`side`/`top`/`bottom`) —
   identical to a vanilla block.
6. **Rendering = native mesher.** The voxel payload feeds `meshWorker.ts` /
   `chunkMesher.ts` exactly like torch/door geometry. Held item, inventory icon and
   thumbnails render from the same voxel data. **No GLTFLoader, no entity, no GLB.**

---

## 6. Compact data format

```jsonc
{
  "res": 16,               // voxel resolution per axis (8–32)
  "grid": "…",             // packed material index per voxel (empty=0), RLE or Uint8
  "palette": ["#RRGGBB", …], // ≤64 RGBA entries (or tile refs for textured block-type)
  "footprint": { "w": 1, "h": 1, "scale": 100 }, // placement, mirrors CustomAssetPlacement
  "kind": "voxel" | "block", // block = per-face texture block (side/top/bottom)
  "faces": { "side": "…", "top": "…", "bottom": "…" } // only for kind:"block"
}
```

Estimated size: 16³ grid ≈ **4 KB** + palette ≈ 1 KB + header. Compare: 5.5 MB GLB.

---

## 7. Implementation plan

### P0 — Stop boot GLB downloads (quick, high impact, low risk)
- `customAssets.ts` `loadCustomAssetThumbnails()`: never call `loadCustomAssetModel`.
  - Block-type: draw the 96×96 icon from the override/face texture directly.
  - Model-type: skip at boot; generate lazily when placed, or persist a server-side
    thumbnail at upload time.
- Result: login loads **no GLB bytes**.

### P1 — Voxelizer + format (foundation) — ✅ DONE
- New `catalog/voxelize.mjs` (+ a client-side TS port) turning a GLB into the
  section-6 payload.
- Node-based verification: voxelize existing 1198/1199/1211/1212 GLBs, report size
  + re-render check.
- Files: `catalog/voxelize.mjs`, `build-page/voxelize.ts` (shared), tests.

**P1 results (2026-09-03, res=16):**

| id | name | kind | grid | GLB → payload | reduction |
|---|---|---|---|---|---|
| 1198 | House fence | voxel | 32×23×2 | 5.8 MB → 2.1 KB | ~100% |
| 1199 | Skirting | block | 16³ (solid) | 444 KB → 5.6 KB | 98.7% |
| 1211 | porch | block | 16³ (solid) | 988 KB → 5.6 KB | 99.4% |
| 1212 | farm-fence | voxel | 32×23×2 | 5.9 MB → 2.1 KB | ~100% |

**Findings / notes:**
- Meshy "cube" assets (skirting/porch) are exported as **6 duplicated full-box
  meshes** (24 verts each, AABB `[-.5,.5]³`) — surface voxelization yields a broken
  shell, so cube-like + 1×1 footprint is classified as **`kind:"block"`** (solid
  cube; client textures it with per-face textures).
- Real models (fences) voxelize into a correct lattice shape.
- Node decodes embedded **PNG** (`pngjs`) and **JPEG** (`jpeg-js`) textures for color
  sampling — 1198/1212 fences re-voxelized to an 8-color wood palette (was white).
  The client-side voxelizer (browser canvas) samples the same for new uploads.
- Data-format contract added to `services/customAssets.ts`:
  `CustomAssetKind`, `VoxelGrid`, `VoxelPayload`.

### P2 — Storage & schema — ✅ DONE
- `server/db.js`: `custom_assets` gains `asset_type` (`block`|`voxel`) + `voxel_data`
  (compact payload). `data_base64` kept (nullable) during transition.
- `server/customAssets.js`: `saveCustomAsset` **voxelizes server-side on upload**
  (`voxelizeBuffer` from `catalog/voxelize.mjs`) and stores `asset_type` +
  `voxel_data`; catalog/API return `assetType` + `voxel` per asset. Added
  `migrateCustomAssets(db)`.
- `server/index.js`: awaits async `saveCustomAsset`; runs `migrateCustomAssets`
  at startup (ALTER columns + re-voxelize legacy rows, then `saveDb`).
- `services/customAssets.ts`: `CustomAssetMeta` gains `assetType`, `voxel`;
  `apiInsertCustomAsset` accepts/persists `assetType`.
- `build-page/main.ts`: passes `assetType` (`"texture"` → `"block"`) on insert.
- Verified in-memory against the real DB: 1198→voxel, 1199/1211→block,
  1212→voxel (2–5.6 KB payloads); upload path stores a 2 KB voxel payload.
- **Deploy note:** the running API (prod :PROD-API / dev :DEV-API) must be restarted once
  for the ALTER + migration to persist to `<game-db>`.
- `GET /api/custom-assets/:id` still returns the GLB (legacy) until P4 removes it;
  the client should switch to `asset.voxel`.

### P3 — Native voxel rendering (core) — ✅ DONE (voxel-payload geometry)
- **Decision (documented deviation):** the full chunk-mesher route for `voxel` kind is
  deferred — it needs worker voxel-data sync + per-block atlas tile baking (U9/U12
  territory, high risk). Instead custom assets now render as **native geometry built
  from the stored voxel payload**, which already achieves the goals (no GLB, visible,
  compact):
  - `src/game/voxelMesh.ts` `buildVoxelMesh`: `block` kind → opaque 1×1×1 textured
    cube (per-face override textures from `mc_custom_atlas_overrides`, else palette
    color); `voxel` kind → merged box faces from the grid with palette vertex colors.
    Verified in Node: fence = 2×1.44×0.125 (3760 tris), block = 1×1×1 (12 tris).
  - `loadCustomAssetModel` (customAssets.ts) builds from `asset.voxel` — **GLTFLoader /
    GLB fetching removed entirely**; thumbnails no longer download GLBs at boot.
  - `Game.tsx` `ensureCustomAssetEntity` and `sceneSetup.ts` (held item) detect
    `userData.voxel` models and render/clone directly.
- **Deploy note:** requires the P2 migration to have run (restart the API once).
  Without `asset.voxel`, `loadCustomAssetModel` returns null → magenta cube fallback.
- Remaining: move `voxel` kind into the chunk mesher (worker sync) + bake block face
  tiles into the atlas (later phase).

### P4 — Client cleanup / GLB removal — ✅ DONE
- Client: removed `apiGetCustomAssetData` (unused); no GLB/GLTFLoader path remains for
  custom assets in the game (`src/game/vehicles/fbxVehicle.ts` GLTFLoader is unrelated).
- Server: `saveCustomAsset` **stops storing the GLB** (`data_base64 = ''`); new
  `updateCustomAssetData` re-voxelizes on `PUT /:id/data` (sideloader cross-sync);
  `GET /api/custom-assets/:id` returns the asset JSON + voxel (no GLB bytes).
- Migration purge: leftover `data_base64` is emptied for voxelized rows and persisted
  (`saveDb` runs when migration touches rows).
- **Applied live:** restarted prod API (`:PROD-API`); migration re-voxelized 1198/1199/1211/1212
  and purged the GLBs (verified `glb 0 B`, `voxel 2–5.6 KB` each; DB backup at
  `<game-db>.bak-p3-voxel`).

### P5 — Gates & verification
- `tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`,
  `node scripts/test-worker-meshing.mjs`, `kb:check`, `pages:check`,
  `e2e/test-1199.spec.js`; human visual check in browser.

---

## 8. Existing assets migration

| id | name | new kind | action |
|---|---|---|---|
| 1198 | House fence | model | voxelize stored GLB (1.4×1×0.09 → fit footprint 2×2) |
| 1199 | Skirting | block | convert to per-face texture block (keep `block_1199_*` overrides) |
| 1211 | porch | block | convert to per-face texture block (keep `block_1211_*` overrides) |
| 1212 | farm-fence | model | voxelize stored GLB |

---

## 9. Machine gates (every code change)

```
npx tsc -b
npm run build
npm run sim:test
node catalog/textureCheck.mjs
node scripts/test-worker-meshing.mjs
npm run kb:check
npm run pages:check
e2e: npx playwright test e2e/test-1199.spec.js
```

---

## 10. Risks

- **P3 mesher change** is the highest risk (worker/main parity, atlas slots).
  Mitigation: sequence after P1/P2, keep `test-worker-meshing` green.
- Block-type texture orientation on faces (`+Y top`, `-Y bottom` — see AGENTS.md
  build-asset checklist).
- Palette quantization may change appearance vs the original GLB texture; keep the
  per-asset tile fallback for fidelity-critical faces.

---

## 11. Open questions

1. Keep the original GLB server-side as an optional "source" for re-editing, or
   delete entirely after voxelization? (User leans: no GLB.)
2. Default voxel resolution — 16 (matches Minecraft's 16×16 texture grid) vs 32 for
   fidelity?
3. Palette size cap — 64 colors sufficient?
4. Where does voxelization run — client (build-page, as today) or server
   (upload API)? Server keeps the client thin and is deterministic.
5. Do model-type assets also lose the GLB entity, or do they keep a (lazy) GLB
   entity for fidelity? (Project decision leans: no GLB at all → models must voxelize.)