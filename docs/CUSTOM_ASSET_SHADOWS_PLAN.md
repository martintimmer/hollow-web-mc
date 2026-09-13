# Custom Asset Lighting & Shadows Plan

_Status: proposed — authored 2026-09-03_
_Related: `src/game/voxelMesh.ts`, `docs/CUSTOM_ASSET_VOXEL_PLAN.md`_

---

## 1. Problem

Custom objects (voxel-built fences, blocks, models) look flat and are **not affected by
the sun or shadows**, while the rest of the world is. Verified cause:

- World chunks use **`MeshLambertMaterial` + vertex colors** (`Game.tsx` `matMerged`/
  `matOpaque`) lit by a **directional sun** (`Game.tsx:2171` `DirectionalLight`, moved with
  time of day), plus `receiveShadow`/`castShadow` near the player
  (`chunkMesher.ts:111` `isShadowCaster`).
- Custom assets (`src/game/voxelMesh.ts`) use **`MeshBasicMaterial`** (unlit) with **no
  shadow flags** → they ignore the sun entirely and neither cast nor receive shadows.

## 2. Goal

Custom objects become part of the world's lighting:
- **Sun diffuse shading** — top faces bright, side faces dimmer, changing as the sun moves
  (same look as world blocks).
- **Cast + receive shadows** from the sun (and cast onto the world / onto each other).

## 3. Approach

### Core change — `src/game/voxelMesh.ts`
1. Switch custom-asset materials from `MeshBasicMaterial` → **`MeshLambertMaterial`**
   (identical params to the world's `matOpaque`):
   - **voxel-kind** (`buildVoxel`): `MeshLambertMaterial({ vertexColors: true, side: DoubleSide,
     transparent: false, depthTest: true, depthWrite: true })`.
   - **block-kind** (`faceMat` in `buildBlock`): `MeshLambertMaterial({ map, color, side:
     DoubleSide, ... })` (keeps per-face override textures).
2. Set **`mesh.castShadow = true; mesh.receiveShadow = true;`** on every custom-asset mesh
   (both kinds).

### Why this is enough
- Lambert is lit by the scene's sun `DirectionalLight` → automatic diffuse shading that
  follows the sun as it moves (the render loop already updates the light).
- `receiveShadow=true` lets the sun's shadow map fall on custom objects; world chunks
  already `receiveShadow=true` (so custom objects cast shadows onto the ground) and
  `castShadow=true` near the player (so custom objects receive world shadows).
- Ambient (0.35) + hemisphere (0.55) keep shadowed sides readable, matching the world.

### Secondary checks
- **Held item** (`sceneSetup.ts`): voxel models already skip material replacement
  (`userData.voxel`), so the Lambert material is preserved in the held view.
- **Thumbnails** (`customAssets.ts`): the thumbnail renderer already has lights — Lambert
  works unchanged.
- **Specular**: world Lambert materials get sun-specular; custom assets will be matte (fine —
  blocks are matte).

## 4. Risks / notes
- Double-sided Lambert: three.js handles back-face normals for `DoubleSide`; keep `DoubleSide`
  so voxel faces are visible from inside.
- Custom assets don't carry the world's baked AO/`shade` vertex data — they rely on Lambert
  diffuse only. This matches the directional look; if AO is desired later, bake a per-face AO
  into the vertex colors (follow-up).
- Shadow camera is ±64 units around `sun.target` (the player) — custom assets near the player
  are covered.

## 5. Verification
- `npx tsc -b`, `npm run build`, `npm run kb:check`.
- Node: build a custom mesh → assert material is `MeshLambertMaterial` and `castShadow`/
  `receiveShadow` are true.
- Human (browser): place the fence at noon vs sunset — top bright, sides shaded, and the
  fence casts a shadow on the ground; toggle Shadows in Video settings.

## 6. Files
- `src/game/voxelMesh.ts` (materials + shadow flags) — primary.
- Verify `src/game/engine/sceneSetup.ts` (held) + `src/game/customAssets.ts` (thumbnails) need
  no change.

## 7. Implementation status — ✅ DONE
- `voxelMesh.ts`: `faceMat` (block-kind) and the voxel-kind material switched from
  `MeshBasicMaterial` → `MeshLambertMaterial` (vertexColors/map preserved); both mesh kinds
  already set `castShadow`/`receiveShadow = true`.
- Verified in Node: voxel-kind → `MeshLambertMaterial`, block-kind → 6× `MeshLambertMaterial`,
  both `castShadow:true receiveShadow:true`.
- Rebuilt client to v0.1.442. Human check pending (noon vs sunset, fence shadow on ground).