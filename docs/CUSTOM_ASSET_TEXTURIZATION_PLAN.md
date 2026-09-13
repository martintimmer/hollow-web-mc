# Custom Asset Texturization Plan

_Status: proposed — authored 2026-09-03_
_Related: `docs/CUSTOM_ASSET_VOXEL_PLAN.md`, `catalog/voxelize.mjs`, `src/game/voxelMesh.ts`_

---

## 1. Problem

Voxelized custom assets lose their texture. House fence `1198` (and farm-fence `1212`)
render as **8 flat brown tones** instead of the GLB's wood-grain texture.

Confirmed bottlenecks in `catalog/voxelize.mjs`:

1. **Per-triangle centroid sampling.** Each triangle contributes **one** color, sampled at
   its centroid UV (`u = (uvA.x+uvB.x+uvC.x)/3`). Every voxel overlapped by that triangle
   gets that single color → grain/seams/planks are averaged away.
2. **Palette ≤ 64 colors with crude quantization.** When more colors than 64, they're
   bucketed to 3 bits/channel (512 buckets) and the 64 most frequent are kept — tones
   collapse.
3. **Flat per-voxel faces.** `src/game/voxelMesh.ts` colors each voxel face with one
   palette color; there is no per-face UV/texture sampling in the game.

---

## 2. Goals

- The fence (and any textured model) shows its **actual texture** — wood grain, plank
  lines, seams — on the voxel faces, at Minecraft-like per-block resolution (16 px/block).
- Keep data compact (a few KB per asset) and rendering native (chunk-style geometry, no GLB).

---

## 3. Approach (ranked by fidelity vs effort)

### T1 — Per-voxel texture sampling + denser palette  *(low effort, immediate win)*
- Sample per **voxel**, not per triangle: for each voxel overlapped by a triangle, project
  the voxel center onto the triangle plane, barycentric-interpolate the UV, and sample the
  original texture at that point → each voxel gets the color at its position.
- Raise the palette cap **64 → 256**; use nearest-color mapping instead of 3-bit buckets.
- Result: the fence face shows a **coarse wood-grain pattern** (each voxel a shade of the
  grain) instead of 8 flat tones. Still flat per-voxel faces, but recognizably textured.
- Files: `catalog/voxelize.mjs` (`flattenTriangles` → per-voxel sampling, `quantize`);
  re-voxelize 1198/1212 from the backup GLBs.

### T2 — Per-asset texture tile + UV-mapped voxel faces  *(medium effort, the real fix)*
- Bake the model's texture into a compact **per-asset tile** and render voxel faces by
  **UV-mapping into the original texture**, so grain/planks appear exactly like a Minecraft
  block texture.
- Implementation:
  - Voxelizer: for each **exposed** voxel face, project its 4 corners onto the nearest
    source surface triangle and interpolate UVs → the face samples the original texture.
    Emit the tile (base64) + per-face UVs in the payload (v2 format).
  - Game `voxelMesh.ts`: build the merged voxel mesh with a **CanvasTexture tile + UV
    attribute** (instead of flat vertex colors); same for held item + thumbnails.
  - Block-kind already uses per-face textures (unchanged); this extends that to voxel-kind.
- Data: ~4–16 KB tile per asset (128×128 or voxel-grid-aligned).
- Result: **actual wood grain on the fence** — Minecraft-like, and it also improves
  `1199`/`1211` cube blocks if they have GLB textures.

### T3 — Resolution fidelity (optional tuning)
- Raise voxel resolution **16 → 32** per cell for model-kind assets (more shape + texture
  detail). Payload grows ~4× (grid) but stays KB-scale. Exposed-face-only meshing already
  bounds triangles.

---

## 4. Recommended sequence

1. **T1** now — low risk, immediate visual improvement, re-verify the fence.
2. **T2** next — the real texture fix; touches payload format + `voxelMesh.ts` + server +
   build-page client voxelizer parity.
3. **T3** optional — per-asset `res` option (models default 16, can opt 32).

---

## 5. Phases

### Phase T1 — Per-voxel sampling + palette 256 — ✅ DONE
- `catalog/voxelize.mjs`: moved texture sampling from per-triangle centroid into the
  voxel loop — for each voxel+triangle overlap it barycentric-interpolates the UV at the
  voxel center and samples the texture (wrapped), preserving grain. Kept the centroid
  color as fallback for the cube path.
- Palette: cap raised 64 → 255 with 5-bit/channel rounding (merges JPEG/noise
  near-duplicates) and nearest-color mapping.
- Re-voxelized `1198`/`1212` from the backup GLBs via the server API.
- **Result:** fence palette 8 → **61 wood tones** (e.g. `#805838 #986840 #a07048 …`),
  grain preserved per voxel. Verified via API + DB file.

### Phase T2 — Texture tile + UV-mapped faces — ✅ DONE (per-voxel tile sampling)
- Voxelizer: bakes the model's primary texture into a **64×64 PNG tile** and stores
  each voxel's **center UV** (Uint32 `u<<16|v`, `0xFFFFFFFF` = palette fallback).
  (`buildVoxelTex`, `catalog/voxelize.mjs`)
- `voxelMesh.ts`: for voxel-kind, samples the tile per voxel (browser canvas decode) →
  **per-voxel vertex colors from the real texture**; falls back to the palette when no
  tile/UV. (A per-triangle basis approach was tried but the fence's UVs are per-triangle,
  giving a 234 KB payload; the per-voxel-UV approach is ~24 KB and gives smooth grain.)
- Payload v2: `{ kind, res, grid, palette, tile, uvs }`.
- Re-voxelized `1198`/`1212` (24 KB each) and rebuilt the client.
- **Result:** fence renders with smooth wood-grain colors (one texture sample per voxel,
  ~736 colors) instead of 61 quantized bands.
- **Reliability fix:** the tile is now decoded asynchronously (Image `onload`) in
  `loadCustomAssetModel` and passed into `buildVoxelMesh` — the old synchronous
  `img.complete` check raced and silently fell back to the palette (looking like a single
  brown). Verified: res-32 mesh yields **1041 distinct vertex colors** from the tile.
- **Two-tone wood (manual):** low-contrast tiles (uniform brown textures like the fence)
  are remapped to a clear two-tone wood — median-luminance threshold → `#a8753f` light /
  `#4f3119` dark, following the grain shape. Verified: fence mesh is a ~50/50 light/dark
  split (visible planks/grain). Already-textured tiles (std ≥ 26) are left untouched.
- **8-tone wood + higher detail (final):** replaced the harsh 2-tone with a smooth
  **8-tone brown gradient** (light oak `#c69a6b` → deep walnut `#413019`) via luminance
  banding, tile raised 64 → **96×96**, and voxel resolution raised **32 → 48** for
  smaller pixels. Fence: 96×69×6 grid, ~132 KB, 8 browns with a natural
  mid-tone-dominant distribution. Re-voxelized 1198/1212; rebuilt to v0.1.441.

### Phase T3 — Resolution fidelity — ✅ DONE (voxel res 16 → 32 for models)
- Default voxel resolution for model-kind assets raised **16 → 32** (server + CLI).
  Block-kind stays at 16 (solid cube; the game renders a box geometry).
- Per-voxel UV storage made compact (one `Uint16` per solid cell, 8-bit UV channels) so
  the payload stays small: House fence now 64×46×4 grid, **~50 KB** (20K triangles).
- Re-voxelized `1198`/`1212`; rebuilt client (v0.1.438).
- **Result:** smoother shape + finer grain on the fence (was 32×23×2 @ res 16).

---

## 6. Gates (every change)

```
npx tsc -b
npm run build
node scripts/test-worker-meshing.mjs
npm run kb:check
e2e: npx playwright test e2e/test-1199.spec.js
```

---

## 7. Risks / notes

- Voxelization is inherently an approximation; T2 renders the texture at voxel-face
  resolution (~16 px/block), which is exactly Minecraft-style and should look right.
- T2 changes the voxel mesh from vertex-color to textured+UV — must keep worker/main-thread
  and held/thumbnail parity (`voxelMesh.ts` is the single builder, so parity holds).
- Palette fallback keeps older payloads (v1) rendering if `tile` is absent.