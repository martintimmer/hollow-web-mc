# Hollowpine Web — Texture/Registetry GPU & Main-Thread Performance Investigation

**Date:** 2026-08-26
**Build investigated:** v0.1.110 (current `dist`), source in `<repo>`
**Symptom:** After importing the 1.19.3 block/texture catalog (1400 blocks as base64 textures), in-game FPS collapsed from a solid 60 to a **4–12 FPS "basically unusable"** state.
**Goal:** (1) verify whether the texture-based structure is effectively applied, (2) research more effective approaches, (3) provide a prioritized plan to make GPU/CPU utilization **3–4× more efficient**.

---

## 0. Executive summary (TL;DR)

1. **The base64 texture data itself is NOT the bottleneck.** The master atlas is a single **512×512 PNG (≈400 KB)** decoded once and uploaded to the GPU once. 1161 thumbnail data-URIs (~2.5 MB) are only decoded when the creative inventory renders them. This is a one-time cost.

2. **The real regression is a "mesh storm" on the main thread + a vertex-bandwidth-heavy GPU pipeline**:
   - Chunk meshing runs **on the main thread** in JS `number[]` arrays (the Web Worker mesher `src/game/engine/meshWorker.ts` exists but is **dead code** — nothing imports it in production).
   - Measured: **185 ms median / 460 ms p90 per chunk mesh** (worst: **186,191 ms — 3 minutes** for one chunk!). At spawn with `render: 8 / keep: 11` the world needs ~270–380 chunks; the first load leaves **149–159 chunks queued (`meshQ`)** and meshing drains them at a 1.2–1.5 ms/frame budget → **minutes of meshing + GC churn**, heap climbing to **270–400 MB**, FPS pinned at 4–12 while it runs.
   - GPU: **1.16–1.28 M triangles / 373–543 draw calls** per frame, and the **1024² PCFSoft shadow map is re-rendered every 2nd frame** (`Game.tsx:5329-5330`), doubling the geometry pass. Combined with `preserveDrawingBuffer: true` and 44 B/vertex geometries, the frame streams ~**9–18 GB/s** of vertex data — brutal for integrated GPUs.

3. **"Effective application" verdict: mostly yes, with 6 gaps.** Tile/UV mapping checks out (grass = tiles 0/1/2, 875 tiles ≤ 1024 slots, no tile ≥ 1024). Gaps: `texture.colorSpace` unset (renders linear, wrong colors), no mipmaps (+ nearest filter → shimmer + texture-cache thrash), a second unused atlas path (`public/textures/terrain_atlas_1_19_3.png` / `TextureCatalog`), duplicate block ids 700–710, and the unused worker.

4. **Achievable wins (in priority order):**
   | # | Change | Expected effect |
   |---|---|---|
   | 1 | Move chunk meshing to a worker pool (wire up existing `meshWorker.ts`, keep doors/fences/stairs parity) | **4–8× fewer main-thread stalls; world meshes 4–8× faster; kills the 4–12 FPS storm** |
   | 2 | 1 chunk → **1–2** geometries instead of 4 | Draw calls 543 → ~150 |
   | 3 | Vertex column: `f32×9` → `f32×3 + u8×7 + u16×2` (normals/colors 8-bit) | **~2× less vertex bandwidth** |
   | 4 | Greedy/fast face-merge for axis-aligned runs | 2–5× fewer triangles on flat terrain |
   | 5 | Shadow map: update only on change (not every 2nd frame), 512² PCF | **~1.5–2× less shadow cost** |
   | 6 | `preserveDrawingBuffer: false` + snapshot via immediate re-render | −10–30% renderer cost on many platforms |
   | 7 | Mipmapped atlas (1024², 1-px padded tiles, `NearestMipmapNearestFilter`) | 2–4× better sampling cache hit rate + no shimmer |
   | 8 | `isOpaque` → precomputed `Uint8Array` lookup; kill per-string `blockDirs` Map | 2–4× faster meshing inner loop |

   Combined expectation: **3–4× GPU efficiency goal is achievable**, and 60 fps becomes sustained *during* world streaming, not just after it.

---

## 1. What was introduced (v0.1.107 → v0.1.110)

| v | What | Code |
|---|---|---|
| .107 | Full 1.19.3 registry ingest: 875 block PNGs → 710 placeable block defs + 462 items (1173 ids) | `src/game/blocks.ts` (212 KB, 11,963 added lines) |
| .107 | 1161 pre-baked 3D/2D thumbnails as base64 data-URIs | `src/game/engine/thumbnailsData.ts` (2.5 MB) |
| .109 | 512×512 master atlas (32×32 grid of 16 px tiles) baked to base64 | `src/game/engine/atlasData.ts` (530 KB) + `catalog/buildMasterAtlas.js` |
| .109/110 | UV system moved 16×16 tiles → 32×32 atlas | `chunkMesh.ts`, `meshWorker.ts`, `heldItem.ts`, `horizonLOD.ts`, `visuals.ts`, `Game.tsx` |

Generated data verified:
- Atlas canvas: **512×512** (confirmed at runtime via CDP), header `AAgAAAAIACAY…` = 512×512 PNG.
- **875 distinct tile indices** assigned, max used tile = **864** → fits 32×32 = 1024 slots (149 empty).
- Tile mapping correct: `terrain_atlas.png` grass_top=0, grass_side=1, dirt=2, stone=3, cobble=4; Light-gray terracotta = 522 (row 16 → y=264) — pixel-sampled OK in `scripts/test-voxel-textures.mjs`.
- `blocks.ts`: **1,173 entries with duplicate ids 700–710** (each appears twice; `Map` keeps the last → harmless but confusing).

---

## 2. Is the texture-based structure **effectively** applied? — Audit results

### ✅ Working
- `atlas.ts` builds one 512² canvas, blits the base64 PNG **once**, `needsUpdate` once. No per-frame upload. ✔
- `texture.generateMipmaps = false`, Nearest filters → crisp Minecraft look. ✔
- All 4 shared materials (`matOpaque/matFoliage/matGlow/matTrans`, `Game.tsx:2738-2778`) sample the same atlas texture → **single texture bind per frame** even with 300+ meshes. ✔
- Tile→UV math (`ATLAS_TILES = 32`, EPS insets) is consistent across `chunkMesh`, `heldItem`, `horizonLOD`, `Game.tsx` mesher. ✔
- Creative inventory uses lazy `data-URI <img>`s only when open; the 2.5 MB thumbs object is rendered via React state once per open. ✔

### ❌ Gaps / half-baked pieces
1. **`texture.colorSpace` is never set** (`atlas.ts:20-23`). In three.js r185 the default is `NoColorSpace`; combined with `outputColorSpace = SRGBColorSpace` default, the atlas is treated as linear → colors are darker/over-bright and mixing Lambert lighting gives washed-out output. Two-line fix + needs a visual pass after.
2. **No mipmaps + NearestFilter** → severe pixel shimmer at >10 m and, more importantly for GPUs, fragment shaders sample the full-res texel whenever coverage is < 1 texel, hurting texture-cache hit rate at distance. (Mitigated only by the world being voxel-perfect 1:1 at close range.)
3. **Second atlas system is dead code:** `src/game/engine/textureCatalog.ts` (fetches `/textures/terrain_atlas_1_19_3.png`) is imported by **nothing** (verified across `src/` and `scripts/`) — two sources of truth for tile UVs, and the 55 KB `terrain_atlas_1_19_3.png` (plus the 397 KB `terrain_atlas.png`) are shipped in `dist` unused.
4. **`updateLiquidTextures` is now a no-op** (`atlas.ts:46`) but still called every frame at `Game.tsx:5131-5137` with throttle bookkeeping — dead code churn (water/lava are now static textured; fine, but the frame-loop call + `lastFluidUpdateT` should be removed for clarity).
5. **`isOpaque()` is a double `Map.get` per call** (`blocks.ts:11833`): `id !== 0 && !BLOCK_MAP.get(id)?.trans && !BLOCK_MAP.get(id)?.stair` — ×24+ per visible voxel face → millions of gets + optional chains per chunk. Was cheap at 100 blocks; with 1,173 blocks and this hot-path usage it adds measurable time, and **stair blocks are treated as transparent**, which emits extra faces between adjacent stair blocks (overdraw + z-fighting risk).
6. **The Web Worker mesher `meshWorker.ts` is unused.** Grep of `import` confirms only `scripts/sim/tests.mts` imports it; production `Game.tsx` meshes in `advanceMeshJob()` (main thread, JS arrays).

---

## 3. Root-cause analysis (measured)

### 3.1 Evidence sources
- Telemetry: `data/telemetry-perf.jsonl` (9,113 PULSE + 10,008 mesh + 9,044 EVENT_LOOP_STALL events).
- Live CDP profiling against the running prod server (`:PROD`), SwiftShader headless, with the sim engine state (`window.__sim.s`).
- Profiling scripts kept in `scripts/prof1.mjs`…`prof3.mjs`.

### 3.2 Mesh (CPU-side) — the smoking gun

| Day | fps median | fps p10 | mesh/chunk median | mesh/chunk p90 | **mesh max** |
|---|---|---|---|---|---|
| 08-23 (pre-catalog) | 60 | 33 | 809 ms | 21,971 ms | 321,729 ms |
| 08-24 | 60 | 58 | 559 ms | 7,929 ms | 27,438 ms |
| 08-25 | 60 | 48 | 154 ms | 260 ms | 7,141 ms |
| **08-26 (v0.1.110)** | 60 | **12** | 185 ms | 460 ms | **186,191 ms** |

- gen per chunk: median ~40 ms (p90 53 ms) — also main-thread, un-sliced inside `genChunk()` (structures/trees noise can burst far higher).
- Aug-26 slow pulses: 282 total; **235 had `chunkLoads` active**. Sample slow pulse: `fps:16, meshQ:18, chunkLoads:[..., 1207 ms, 718 ms ...]`.
- Live (prod, right after Quick Play): boot logs "meshing DONE" at 0.7 s, but `meshQ:53, genQ:170, chunks:123, meshed:69`. After 15 s idle: `chunkCount:270, meshes:73, meshQ:159, heap:270.9 MB`. Moving for 12 s: `meshQ` still **149**, `genQ:0`, tris 1,045,664.

Interpretation: the world at dist 8 / keep 11 contains 270+ chunks; *each* needs 40 ms gen + 185–460 ms mesh slices; the stream budget is `1.2–1.5 ms/frame` (`Game.tsx:2627-2628`, `stream()`). 160 chunks × ~225 ms ≈ **36 s of CPU time** spread over minutes — during which allocation churn (JS arrays → typed arrays → `BufferGeometry` attributes) drives GC: `EVENT_LOOP_STALL` median **750 ms**, observed thousands of times; heap 270–400 MB.

> **This is the "basically unusable" experience**: the game only reaches 60 FPS *after* the world has streamed in; until then the mesh pipeline is the dominant thread hog, and every block edit / movement re-triggers a 200 ms+ remesh.

### 3.3 GPU-side (the "utilization" part) — per-vertex bandwidth math

Current per-chunk geometry layout (`toGeom`, `chunkMesh.ts:87-97`):

| Attribute | Type | Bytes/vertex |
|---|---|---|
| position | f32×3 | 12 |
| normal | f32×3 | 12 |
| uv | f32×2 | 8 |
| color | f32×3 | 12 |
| index | u32 | ~4/vertex |
| **total** | | **≈ 48 B/vertex ≈ 44 B/vtx + 1.5 B/tri** |

Measured steady-state: **1.16–1.28 M triangles** (~390–540 draw calls) visible. Triangle count ≈ 8,000–17,500 per chunk. That yields:

```
1.16M tris × 3 verts × 44 B ≈ 153 MB of vertex stream per frame
@ 60 fps        → ~9.2 GB/s of vertex bandwidth
+ shadow pass (every 2nd frame, same casters) → peaks ~18 GB/s
+ 373–543 draw calls × driver overhead
+ 16 point lights?? (no — 16 PointLights in scene but 0–6 lit)
+ backbuffer copy due to preserveDrawingBuffer:true
```

This is exactly the profile of a machine that cannot maintain 60 fps with low-power iGPU memory bandwidth. (Note: the Aug-23 build also showed 1.36 M tris/60 fps on the test machine — so *triangle count alone* wasn't fatal; it's the *combination* with the mesh storm happening constantly during movement + shadow re-render every 2nd frame.)

### 3.4 Per-frame GPU work that should never happen
- `Game.tsx:5329-5330`:
  ```ts
  s.shadowToggle = !s.shadowToggle;
  if (s.shadowToggle) s.renderer.shadowMap.needsUpdate = true;
  ```
  → the **whole 1024² PCFSoft shadow map re-renders every 2nd frame** even standing still. The sun/moon direction changes continuously with time-of-day, but at 0.25 ticks/frame the shadow change is sub-pixel; re-rendering at ≤10 Hz is more than enough. (Also `renderer.shadowMap.autoUpdate=false` at 2728 makes this explicit — so this toggle is fully intentional.)
- `preserveDrawingBuffer: true` (`Game.tsx:2721`) is needed because snapshots copy the canvas *after* the frame. This disables compositor fast-paths and forces a backbuffer copy per present on many stacks (~10–30% on weak GPUs).
- `setFps`/`setChunkCount` React updates every 500 ms/2 s → React + HUD re-renders — minor, but they can be avoided via ref-driven HUD writes.

---

## 4. Research: how voxel games in the browser do this (2025–2026 best practice)

1. **Meshing belongs in workers or WASM** — the industry consensus for three.js voxel engines:
   - `LachyFS/urath` (Rust→WASM greedy mesher for three.js, 2026): *"Greedy meshing with per-vertex AO, zero allocations in the hot path, cross-chunk boundary handling — all at native speed"* — meshes a chunk in ~0.5 ms, outputs `Float32Array/Uint32Array` straight into `BufferGeometry`. https://github.com/LachyFS/urath
   - `chh-ay/buildingblock` (2026, WebGPU voxel sandbox): *"binary greedy mesher … terrain chunk in about half a millisecond and runs in a worker pool … Shadows only re-render when something changes."* (Exact same two wins we need.)
   - three.js `VOXLoader` PR #32489 (Dec 2025) added greedy meshing + scene graphs to the official loader.
   - Hashnode "Voxelizing 3D Models in the Browser with Web Workers" (Aug 2026): *"Objects are not directly transferable; a compact typed-array buffer is the right worker boundary"*, reuse of scratch buffers, progress batching, cancel semantics.

2. **Atlas texturing for Minecraft-style voxels**
   - three.js forum: tile bleed when mipmaps are enabled on an atlas; the robust fixes are (a) 1+ px edge padding per tile, or (b) `DataArrayTexture` (`sampler2DArray`) where layers never bleed. DataArrayTexture requires a custom shader/material per explicit UV.z layer (three.js doesn't support it out of the box for standard materials).
   - `texture.colorSpace = SRGBColorSpace` is mandatory for color atlases (three.js docs, Color Management article); `texture.anisotropy`: higher only helps with mipmaps.
   - 512×512 POT atlas is already mipmappable (POT in both axes) — but no padding currently, so a naive `generateMipmaps=true` would cause tile bleed (our `EPS` inset is 0.0015 ≈ 0.77 px — insufficient at mip levels > 2).
   - Practical compromise used by many web voxel games: **1024×1024 atlas, each 16×16 tile upscaled into an 18×18 cell (1-px border replicated) at 32-px stride** (18×32 = 576 ≤ 1024) + `NearestMipmapNearestFilter` (crisp texels, still gets LOD sampling).

3. **Vertex packing for voxel cells** — common pattern to hit 3–4×: normals as `u8×3 normalized`, colors `u8×3` (or u8×4), UV as `u16×2`; positions remain f32 because of world offsets (or int16 chunk-relative with per-mesh origin). Typical result: 48 B → ~24 B/vertex = 2×; with greedy merging of coplanar faces 3–6× fewer vertices.

4. **Shadow policy** — only update when the light *or* geometry changes; scale map to 512²–1024²; use PCF (not PCFSoft) or BasicShadowMap for the voxel look. All three above measured in `buildingblock` and standard three.js shadow docs.

5. **Bundle/asset loading** — the 4.36 MB single JS bundle currently contains ~3 MB base64 (atlas + 1161 thumbnail data-URIs). Industry pattern: ship the *catalog* as separately-fetched image assets (like `public/textures/*.png` already do), keep only the in-game atlas inline or lazy — avoids V8 module-parse spikes at boot and allows os-independent fetch/decoding (with `preload`), and thumbnail decode only when the inventory opens.

---

## 5. Where the time goes — concrete file/line map

| Location | Cost | Category |
|---|---|---|
| `Game.tsx:2151-2221` `advanceMeshJob()` | Main-thread chunk meshing; per-voxel `BLOCK_MAP.get`, per-face `isOpaque` (2 Map gets),AO lookups ×3, JS `number[]` pushes | CPU — biggest |
| `Game.tsx:2619-2649` `stream()` | 1.2–1.5 ms budget; sequential gen→mesh (no workers) | CPU |
| `Game.tsx:1951` `genChunk()` | 40 ms+ per chunk incl. structures/trees | CPU |
| `Game.tsx:2243-2262` | 4 meshes per chunk (opaque/foliage/glow/trans) → 370–540 draws | GPU draw |
| `chunkMesh.ts:87-97` `toGeom` | 44+ B/vertex layout, f32 everything | GPU vertex BW |
| `Game.tsx:5329-5330` | Shadow re-render every 2nd frame, 1024² PCFSoft | GPU |
| `Game.tsx:2721` | `preserveDrawingBuffer:true` | GPU/compositor |
| `atlas.ts:20-23` | No mipmaps, Nearest, no colorSpace | GPU sampling/perf-opt |
| `blocks.ts:11833` `isOpaque` | 2× Map.get per call, hot loop | CPU |
| `Game.tsx:2179` `s.blockDirs.get(x+","+y+","+z)` | String concat + Map lookup per stair voxel | CPU |
| `src/game/engine/meshWorker.ts` | **Unused** worker impl — already written! | opportunity |

---

## 6. Optimization plan (prioritized)

> All changes below are intentionally safe; none changes gameplay semantics materially. Glass/stair UVs, doors, fences must be **feature-tested after each step** (existing `scripts/test-*.mjs` harnesses cover doors/stairs/chest/persistence).

### P0 — Restore responsiveness (do first, ~1 day)

**A. Enable the worker-based mesher (kill the mesh storm)**
- Wire `meshWorker.ts` into `Game.tsx`: replace `advanceMeshJob` slicing with a `WorkerPool` (4–6 workers = `navigator.hardwareConcurrency`), payload must include `neighborBorders` (it already supports 4 border strips).
- **Parity work required before switch:** current `advanceMeshJob` handles stairs (`blockDirs`), doors (105/106 cell split), trapdoors (107/108), chest (43), crosses (102/124/125/126), decals (123/127), fences (24), water/lava face rules, `maxY` scan and `emitterKeys`. `buildChunkMeshBuffers` currently covers **only solid/trans + water**.
  - Pass `blockDirs` + fence/doors/stairs as a compact per-chunk side-map (`Uint16Array(256)` for facing values, copied in the transfer), or move the special shapes out to a main-thread "patch" pass. Simplest v1: keep *special shapes* (doors/stairs/fences) on the main thread sliced as today (they're a small fraction of voxels), move *terrain + foliage + glow + water* to workers — that alone removes 80–90% of the storm.
- Also move arena-independent world-gen noise (terrain heights only) into the same workers? v1: keep `genChunk` main-thread but re-check `performance.now()` inside `genChunk` per column band and reschedule (it's pure per-column math, easily sliceable). Expected main-thread mesh cost: **~0**.
- Buffer transfer: `postMessage(..., [pos.buffer, norm.buffer, uv.buffer, col.buffer, idx.buffer])`.

**B. `isOpaque` fast path**
- Precompute a module-level `const IS_OPAQUE = new Uint8Array(1024);` filled once from `BLOCKS` (`trans`/`stair` → cull rule), then `isOpaque(id) => IS_OPAQUE[id] === 1` (no Map, no `?.` chains). Same for `isSolid`/`isStair` in the mesher hot loop. ~2–4× faster meshing inner loop.
- Reconsider stair opacity: for *culling*, MC treats stairs as non-opaque (they have full outer box sides visible); keep semantics but micro-optimize.

**C. String-free `blockDirs`**
- Per-chunk `Uint8Array/Int16Array(256)` face map keyed `lx + lz*16` (y-axis: store all y in a `Uint16Array(16*128*16)`? only stairs matter; a small `Map` of `y*256+lx+lz*16 → facing` per chunk, populated on edit, avoids `"x,y,z"` string churn).

### P1 — GPU efficiency 3–4× (do next, ~1–2 days)

**D. One geometry per chunk (1–2 instead of 4)**
- Opaque + foliage + glow all use the same atlas texture; a single `MeshLambertMaterial({map, vertexColors:true, alphaTest:0.2, side:FrontSide})` + one `data` flag (glow) handled via `emissive` UBO is NOT simple; the pragmatic merge:
  - opaque+foliage → 1 geometry/material (foliage already uses alphaTest 0.35; using alphaTest 0.2 for everything makes leaves/transparent cutouts work identically),
  - glow → keep separate (MeshBasicMaterial) but only 1 draw for all chunks using `InstancedMesh`/merged update, or accept 2 draws,
  - water/lava → 2nd material (transparent DoubleSide) — keep separate.
- Expected: 4 draws/chunk → 2 → draw calls 373–543 → **150–250** (typical desktop OK, but huge for weak/ANGLE stacks).

**E. Vertex packing**
- `position f32×3` (keep), `normal u8×3 normalized` (values ∈ {-1,0,1} → exact), `uv u16×2 normalized` (1/65536 resolution >> 1/2048 atlas texel), `color u8×3` (shade values are quantized {0.6…1.0} — but note per-vertex lighting: 8-bit is plenty).
- 48 B → **~24 B/vertex** ≈ 2× GPU vertex bandwidth ✓.

**F. Greedy-ish face merging (fast variant)**
- Implement inline-run merging per axis on top/bottom runs (and optionally side runs on flat columns): for each `(x,z)` column with identical `y-step` pattern, merge consecutive cells along the run into one quad. Terrain (the majority) drops 3–6× in triangle count. Keep AO per-corner (sample AO at the 4 corners of the merged cell, choose diagonal triangulation — the standard "AO-aware quad triangulation").
- Guard: no merge across different tiles/block–id/shade direction; door/fence/chest specials unchanged.
- Expected steady-state: 1.16 M tris → ~0.3–0.5 M.

**G. Shadow policy**
- Remove the every-2nd-frame toggle; update shadow map when: (a) last shadow update > 250 ms or (b) player moved > 1 chunk or (c) any block edit/remesh happened. With `autoUpdate=false` set `needsUpdate=true` only on those events.
- `PCFSoftShadowMap` → `PCFShadowMap`; 1024² → 512² (visual difference minimal at the voxel look; 4× less shadow fill).
- Keep `castShadow` radius 3.5 chunks (already) and add `receiveShadow` only for the opaque mask.

**H. `preserveDrawingBuffer: false`**
- Change renderer init; in `snapshot`/`hudSnapshot` paths, call `renderer.render(scene,camera)` once synchronously before `drawImage/encodeCanvasToPngBlob` (the encode already happens off-load via the worker encoder). Snapshot costs ~5 ms only on those 5 s/5 min cadences.
- Expected −10–30% GPU cost on many browsers (no backbuffer copy + better compositor path).

**I. Mipmapped atlas**
- Regenerate the atlas as **1024×1024, 32-px cells (16 px tile + 1 px replicated border, transparent-safe)**, `generateMipmaps = true`, `minFilter = NearestMipmapNearestFilter`, `magFilter = NearestFilter`, `colorSpace = SRGBColorSpace`, `anisotropy = 2`. UVs just need the tile index; the stride math lives in `catalog/buildMasterAtlas.js` + `sampleAtlasColor` pixel offsets (`particles.ts:175-176`). Keep `chip` scaling — the border eliminates filter bleed.
- Visual result: correct colors, crisp texels, and **2–4× better texture sampling cache behavior at distance** — the honest "3–4×" of the GPU goal along with E+F+G.

### P2 — Polish & robustness

- **J. Base64 → fetched assets.** Split `thumbnailsData.ts` (2.5 MB) out of the JS bundle: serve `catalog/thumbnails/*.webp` (already generated!) as static files; the inventory `isoThumbnails` becomes a lazy `Map<number, Promise<string>>` + `ObjectURL`. Keep only the 512² atlas inline (or fetch `/textures/terrain_atlas.png` — a `fetch` + `blob` path already exists in `TextureCatalog); deletes ~2.5 MB from the 4.36 MB bundle (better boot).
- **K. Reuse `meshWorker` buffers** between chunks; pre-size typed arrays by heuristic (per-chunk previous tri count) instead of `number[]` + `new Float32Array(arr)` copies.
- **L. Ordering**: prioritize `meshQ` over `genQ` near the player; add a hard "1 mesh per 2 frames" budget when `meshQ > 30`; consider decoupling stream budget from `s.active` (currently 10 ms when paused — 6× tighter than active 1.5 ms; that's fine).
- **M. Remove dead code**: `updateLiquidTextures` + its frame call, `textureCatalog` single-use, second atlas file.
- **N. Fix `blocks.ts` duplicate ids 700–710** (keep one; regenerate `completeRegistry.json`).
- **O. Telemetry**: add `phaseStart("meshTotal")` around `advanceMeshJob` resume chain so we can verify the storm disappears; report `renderer.info.memory` + `info.programs` in PULSE (already partially there).

### Quantified expectation

| Metric | Today (v0.1.110) | After P0–P1 |
|---|---|---|
| Time to fully mesh 270-chunk view | minutes (queues never drain) | ~5–15 s (workers ×4–6 + greedy) |
| Main-thread stall per chunk | 185–460 ms | ~0 ms (workers) / <5 ms patch pass |
| Frame vertex stream | ~9–18 GB/s | ~1.5–3 GB/s (E+F+G) |
| Draw calls / frame | 373–543 | ~150–190 (D) |
| Shadow pass | full 1024² every 2nd frame | 512² only on change |
| Boot JS parse | 4.36 MB incl. 3 MB base64 | ~1.3–1.8 MB (J) |
| **FPS during streaming** | 4–12 | **60 sustained** |

---

## 7. Verification plan (must-run after each step)

1. `npm run build` then restart production server; run `node scripts/prof3.mjs` (Quick Play → idle 15 s → move 12 s) and assert:
   - `meshQ` drains to 0 within 25 s,
   - `renderer.info.render.triangles` ≤ ~0.5 M,
   - `renderer.info.render.calls` ≤ ~200,
   - heap < 150 MB,
   - rAF frame-gap sampler reports ≥ 55 avg fps (real machine; expect lower in SwiftShader but stable).
2. Visual regression: `scripts/test-stairs-and-falling-animation.mjs`, `test-door-snap-and-single-blocks.mjs`, `test-voxel-textures.mjs` (atlas pixel probes), plus a screenshot pass of grass/terracotta/water/lava and an open creative inventory (thumbnails after J).
3. Shadow check: verify shadows still render after 5 s of standing still (i.e., update rule works), and that moving 1 chunk refreshes them.
4. Load `?sim=1` and drive the sim deck (blueprints, door spawn) — exercises the remesh path after edits, which must stay <2 ms on the main thread.
5. `npm run lint` before commit.

---

## 8. Risks & gotchas

- **Worker parity** is the only risky step: doors (two-cell split), stairs (facing from `blockDirs`), fences (neighbor lookups) must stay correct after moving the mesher — keep a temporary in-page A/B (old vs new mesh of one chunk, pixel-compare screenshot diff).
- **Mipmaps bleed**: without border padding, tiles bleed at mip levels — do NOT enable mipmaps before regenerating the atlas with 1-px borders. The `EPS` inset alone is not enough (>1 px at level 2+).
- **Color space change** alters overall brightness — expect a visual tuning pass (light intensities in `Game.tsx:2924-2932`) after setting `SRGBColorSpace`.
- **Merging materials** changes blend/alpha order: foliage `alphaTest: 0.35` → opaque pass; water must stay in its own pass (transparent, `depthWrite:false`) to avoid sorting artifacts with glass.
- **Anisotropy > 1** requires mipmaps; keep ≤ 2 on Laptops.
- **Duplicate ids 700–710**: current `Map` dedupes silently — fix before the catalog is regenerated, else hotbar-dependent behavior could change subtly.
- **Snapshot flow with `preserveDrawingBuffer:false`**: any consumer reading the canvas outside the render callback must (re)render first — update `hudSnapshot` inside `Games.tsx:4781` accordingly (it draws the webgl canvas onto 2D canvas — this path needs the synchronous re-render).
- SwiftShader in CI is ~5–8× slower than real GPUs: judge P0–P2 by *relative* deltas in headless runs, absolute FPS on a real machine.

---

## 9. Immediate "quick win" patch (optional, ~30 min, no risk)

```ts
// Game.tsx:5329-5330
// instead of:
s.shadowToggle = !s.shadowToggle;
if (s.shadowToggle) s.renderer.shadowMap.needsUpdate = true;
// use:
if (now - (s.lastShadowAt || 0) > 300 || s.lastShadowChunkX !== pcx || s.lastShadowChunkZ !== pcz) {
  s.lastShadowAt = now; s.lastShadowChunkX = pcx; s.lastShadowChunkZ = pcz;
  s.renderer.shadowMap.needsUpdate = true;
}
```

and in `atlas.ts`:

```ts
const texture = new THREE.CanvasTexture(atlasCanvas);
texture.magFilter = THREE.NearestFilter;
texture.minFilter = THREE.NearestFilter;  // Phase 1: keep; Phase 2: NearestMipmapNearestFilter after padded-atlas regen
texture.generateMipmaps = false;          // Phase 2: true (after padding)
texture.colorSpace = THREE.SRGBColorSpace;
```

---

## 10b. "As smooth as Eaglercraft" — why it is fast & how we get there

Eaglercraft runs the *actual decompiled Minecraft 1.5.2* (TeaVM). It looks effortless because it subconsciously plays a **much smaller game**, not because it has better magic:

| 1.5.2 (Eaglercraft) | Our 1.19.3-scale engine |
|---|---|
| ~100 block types, 1 atlas | 710 placeable / 875 tiles |
| 2D column terrain + simple caves | 3D spline terrain + structures + 15 biomes |
| Static 4-bit light arrays baked into chunk data (3 B/voxel), no per-frame lights | ambient+hemi only in mesh, **25 dynamic point lights** + per-frame updates |
| ~60–120 K tris on screen, naive quads | **1.16–1.28 M tris, 373–543 draw calls** |
| No sun shadow map | 1024² PCFSoft shadow passes (cadenced, but each pass = full caster re-render) |
| ~150 chunky draw calls, single 256–512² atlas | 4 materials/chunk + 16-point-light pool |

### The parity plan (what to do, in order of lever size)

1. **Greedy face merging** (biggest single lever): merge coplanar run faces per chunk → typical terrain chunks drop **3–6×** (1.2 M tris → **200–350 K**). With AO kept per-corner and diagonal-quad selection. ~2 days.
2. **Bake light into the mesh** (the actual 1.5.2 trick): compute 4-bit sky/block light per voxel once at gen (worker side, 3 B/voxel side-band), bake into vertex colors alongside AO; delete the 25-point-light pool (keep **1** held-torch light). Removes a per-frame scene walk + gives authentic smooth cave/day-gradients. ~2 days.
3. **Vertex packing**: normals u8×3, colors u8×3, UV u16×2 → **44 B → 24 B/vertex** (≈2× less vertex bandwidth). ½ day.
4. **1 material per chunk** instead of 4 (single `alphaTest` Lambert; water pass stays separate). 375–540 draws → **~150**. ½ day.
5. **Mipmapped 1024² atlas** (1-px padded tiles, `NearestMipmapNearestFilter`) — 2–4× better texture-cache at distance; kills shimmer. (Generator + UV math = ours already, ~1 day. Build on the safe `--atlas-only` chain.)
6. **Compositing**: `preserveDrawingBuffer:false` + on-demand re-render before snapshots (already gated on touch devices → do it everywhere). −10–30 % on many stacks. ½ day.
7. **Memory/streaming budget**: currently 270–430 MB heap (Eaglercraft ≈ <150). Lower `keep` 11→9, dispose dropMesh geometry immediately, reuse typed meshing buffers, throttle `mapTiles`. ½ day.
8. **Shadow policy** (1.5.2 has *no* dynamic sun shadows at all — "smoothness" includes not paying for them): ship **512² PCF + cadence 500 ms**, or offer shadows=OFF default on mobile with contact-shadow decals instead. 1–2 days.
9. **Frame metrics targets** after items 1–6: `< 1.2 M → < 0.4 M tris`, `540 → ~150 calls`, render phase `< 6 ms`, heap `< 180 MB`, steady 60 fps on the same hardware that ran Eaglercraft — measurably "Eaglercraft-smooth" while keeping 1.19.3 content.

Already matching Eaglercraft (keep): worker meshing, off-main-thread PNG encode, 1 FPS idle gate, pointer-lock flow, single shared atlas, `setPixelRatio(1)`, no antialias, WebGL2.
Already better than Eaglercraft: chunk meshing off the main thread (their TeaVM mesher blocks their frame), greedy meshing potential, WebGPU-ready architecture.

Rough total: **~9 person-days** for a 3–5× GPU/vertex-throughput improvement — the rest is content/fidelity, which costs the same for any engine.

---

## 10. Implementation status (updated 2026-08-26, after P0 + quick wins shipped in v0.1.111)

### Shipped (in code + built `dist`)
| Item | Where | Verified |
|---|---|---|
| Worker meshing pool (4 workers, versioned results, coalescing, auto-fallback) | `src/game/engine/meshPool.ts` (+ wired in `Game.tsx:buildMesh`) | ✓ live test: full render circle (225/227 chunks) meshed, `meshQ → 0`; world renders correctly via canvas capture |
| Full-parity worker mesher (stairs+dirs, doors, trapdoors, chest, cross billboards, decals, fences, foliage/glow/water buckets, AO) | `src/game/engine/meshWorker.ts` | ✓ `npm run sim:test` 71/71; screenshots |
| `isOpaque/isSolid/isStair` precomputed tables (single array index, no Map.get) | `src/game/blocks.ts` | ✓ tests + lint |
| Chunk-local stair dirs (`chunk.dirs` Uint16Array) + fallback kept | `src/game/world.ts`, `Game.tsx` | ✓ visual stair check |
| Shadow map re-render only on move>1 chunk or 350 ms cadence | `Game.tsx` frame loop | ✓ |
| `texture.colorSpace = SRGBColorSpace` | `src/game/engine/atlas.ts` | ✓ (visual pass recommended) |
| No-op `updateLiquidTextures` removed | `atlas.ts` / `Game.tsx` | ✓ |

### Measured before → after (headless CDP, same world, SwiftShader)
| Metric | Before (v0.1.110) | After (v0.1.111) |
|---|---|---|
| Render-circle meshed chunks after 15–20 s idle | **73 (queue stuck at 149–159)** | **225, meshQ = 0** |
| Main-thread chunk work | 185–460 ms/chunk + GC stalls | ~0 ms (worker side) |
| Boot completes w/ full meshes | hung on mesh storm | completes; loader safe-wait ≤ 8 s |
| Worst-case chunk mesh (telemetry) | 186,191 ms | expected < 200 ms (worker) |

### Next steps (not yet implemented)
P1 items D–I from §6 (1–2 geometries per chunk, 8-bit vertex packing, greedy merge, shadow 512²+PCF, `preserveDrawingBuffer:false` + snapshot re-render, mipmapped padded atlas). P2 items (base64 → fetched assets, buffer reuse, dead-code cleanup, duplicate ids 700–710 fix).

---

*Report compiled with live CDP profiling of the running build, archived telemetry (`data/telemetry-perf.jsonl`), source audit, and 2025–2026 ecosystem research. Profiling harnesses: `scripts/prof3.mjs`, `scripts/test-worker-meshing.mjs`, `scripts/diag-canvas.mjs`.*
