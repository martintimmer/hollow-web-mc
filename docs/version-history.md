# Hollowpine — Minecraft Web Edition: Version History & Changelog

This document tracks all version increments, feature implementations, and bug fixes in chronological order.

---

## Build `v0.1.210` — August 29, 2026

### 📦 Articulated 3D Chest Subsystem & Dual-Texture Elimination
- **Voxel Mesh Quad Suppression:** Suppressed Block ID 43 from chunk meshing (`meshWorker.ts` & `chunkMesher.ts`) so chests render exclusively as discrete 3D entities with zero z-fighting or dual-quad overlap.
- **Player-Facing Placement ($180^\circ$ Rotation):** Chests calculate placement yaw relative to player position so the silver clasp faces the player and the hinged lid opens backward away from the player.
- **Persistent Entity Lifecycle:** Placed chests persist as `s.chestEntities` at $0^\circ$ closed resting angle without destroying or swapping back to static chunk textures upon closing.
- **Large Chest (Double Chest) Merging & Splitting:** Adjacent horizontal chests automatically merge into a continuous 2-block wide 3D model ($W=1.875$, 54 slots) with shared lid articulation and latch; mining one half cleanly splits the remaining half back into a single 27-slot chest.
- **Full-World Chunk Chest Spawner:** `attachChunkMeshes()` automatically scans incoming chunks and instantiates 3D chest entities for all pre-existing and worldgen chests.
- **Synchronous Custom Pixel Ingestion:** Direct 16×16 raw RGBA byte storage in `mc_custom_chest_pixels` + storage/focus event listeners in `chest.ts` for instantaneous, 100% synchronous texture reloading on frame 1.

### 🕯️ Authentic 3D Slender Torch Post Model
- **Canonical Slender Proportions:** Re-engineered `pushTorchPost()` from chunky $6\text{px}\times 6\text{px}$ boxes into authentic **2px × 2px × 10px slender posts** ($0.125 \times 0.625 \times 0.125$) on floors.
- **Wall & Ceiling Mounts:** Slender $20^\circ$ angled wooden posts on walls and vertical hanging posts on ceilings with full glowing luminescence.

### 🎨 Block Texture Editor (`editor.html`) 3D Viewport Binding
- **Model Geometry Parity:** `update3DGeometry()` binds the 3D rotating preview to authentic 3D geometry for Torches, Lanterns, Stairs, Slabs, and Articulated Chests.
- **Transparent Cutout Rendering:** Added `transparent: true`, `alphaTest: 0.1`, and `side: THREE.DoubleSide` to builder materials for crisp, artifact-free pixel cutouts on torches and foliage.
- **Independent Face Tabs:** Removed "All Faces" button and decoupled `setPixel()` / `blitFaceToAtlas()` so editing the `Top` face strictly modifies only the top face without affecting `Side` or `Bottom`.

### 🚀 OptiFine Engine Architectural Roadmap
- Created `docs/OPTIFINE_OPTIMIZATIONS_AND_ROADMAP.md` detailing feasibility and phased implementation plans for Handheld Dynamic Lights, Frustum Chunk Scheduling, Connected Textures (CTM), Better Grass, and Video Options.

### 🐙 Git & GitHub Integration
- Configured remote repository `martintimmer/hollow-web-mc` and synchronized all engine modules, pages, tools, tests, and documentation to GitHub.

---

## Build `v0.1.207` — August 28, 2026

### 🧩 Game.tsx modularization (9,308 → 5,045 lines)
- Extracted engine subsystems into dedicated modules (factory pattern): `chunkMesher`, `chunkStreamer` (rescan/stream/horizon), `renderLoop` (frame/hudSnapshot), `playerPhysics` (stepPlayerPhysics), `playerInteraction` (placeBlock), `worldMap` (cartography), `terrainGenerator` (genChunk/scatter/villages), plus `meshPipeline`, `materials`, `explosions`, `fluidDynamics`, `gameState`, `chunkData`, `structurePlacer`, `villagerAI`.
- Fixed a boot-crash TDZ (`simPlaced` read before init) that broke every boot; `meshPipeline.ts` was wired in (was orphaned).
- **Efficiency rating** logged at boot: `Game.tsx 5045 lines (baseline 9308) · 66 modules · score 46/100 · rating B`.

### 🌍 Seed & Biome visualizer — `/seed.html`
- Standalone page running the **real generator** (`createTerrainContext`) — biome + height maps for any seed × world type, distribution bars, 53-biome registry (23 implemented / 30 planned), KB progress, and per-seed reports.
- **Separate world-generation DB** (`server/worldgen-db.js` → `<worldgen-db>`, dev `sim-worldgen.db`): seeds/presets/biome registry/`world_gen` reports + `texture_overrides`, fully split from the game-asset `minecraft.db`. APIs: `/api/worldgen/summary|report|reports`, `/api/blocks/stats`, `/api/entities/stats`.

### 🧱 Blocks & Entities catalog — `/blocks.html`
- Full catalog of all 1,172 blocks/items with the **three real looks** (inventory thumbnail, held, placed) rendered from the vanilla 512² atlas; wiki + KB links, status badges, live per-world placement stats.
- **Cube vs 3D-model split** (`catalog/block-shapes.json`): 453 cube + 257 3D/cross/flat (doors, torches, signs, bells, lilac, wheat…) + 462 items. 2-per-row layout with large previews.

### 📚 Structured knowledge base — `/kb.html`
- Structured KB website (frontmatter kind/wiki/status, grouped, cross-linked to `blocks.html` + `seed.html`); nginx `/kb/` alias; `kb/terrain/beach.md` (biome style → seed-generator impact).

### 📱 Mobile controls rework
- ▲/▼ move, **HIT** (left-click), **TAKE** (right-click/E: trade/ride/place — full action), **JUMP** (single = jump, double-tap = fly toggle, creative-only), **camera joystick**, multi-touch. `s.mobileActions` bridge.

### 🧰 Chest fixes & pairing ruleset
- Netherrack (id 56) no longer opens/ejects chests.
- **`computeChestPair`** ruleset: two singles → one double; a chest beside a double stays single; add another → two doubles; correct 54/27-slot pairing + break-split.
- Chests always render as 3D entities (fixed invisible-on-main-thread-mesh bug); goldens re-baked.

### 🎨 Texture overrides persisted to DB + live apply
- `/editor.html` "Save & Apply" POSTs overrides to `/api/textures/overrides` (`texture_overrides` table); game fetches on boot + 3 s poll re-applies on the fly (`src/services/textureOverrides.ts`).

### 🎯 Movement & OptiFine-style controls
- **Z = zoom** (hold → FOV 0.5× smooth scope; Ctrl+Z = undo).
- **Shift = sneak/crouch** (slow walk ~0.3×, lowered camera 1.27, **sneak edge-stop** so you don't fall off ledges and can peek over).
- **Double-tap W then hold = sprint** (running).

### 🗂 Diagnostic & tooling
- `docs/BLOCKS_CATALOG_PLAN.md`, `docs/OPTIFINE_OPTIMIZATIONS_AND_ROADMAP.md`; efficiency/progress tracking in `docs/PROGRESS.md`; CI gates (`tsc`, `build` → index/seed/blocks/kb, `sim:test` 71/71, `textureCheck`, `ci-perf` GATE GREEN).

---

## Build `v0.1.118` — August 27, 2026

### 🛏️ Sleep only from the bed & real Red Bed block
- **Bug**: sleep trigger checked ids 12/81 — which are **Gravel** and **Soul torch** in the current registry — so clicking E on gravel printed "You can only sleep at night!".
- Red Bed (id 1162 / storage byte 134 — world data is a `Uint8Array`, bytes only; registry id translates at write time in placeBlock + sim writers) with a custom baked bed texture (red blanket + white pillow + wooden frame, slot 878) and a real bed model (mattress + headboard + footboard). Sleep (E/right-click) only on the bed.

### 💧 Minecraft-wiki liquid physics
- Water from a single source now spreads up to **15 blocks**, slowing to one-direction-per-tick past 10 blocks; lava max 8; **waterfalls keep their budget** (unlimited vertical fall, level preserved).
- Every flow cell records its flow level; when the **source block is deleted, the connected puddle dries up** (same for lava) — including orphaned cells, with queued propagation purged so it cannot re-fill. The old "infinite source spring" rule (2+ adjacent waters auto-source-ified the whole puddle) removed — it defeated dry-up and is not how vanilla behaves.
- Frozen to sim: liquid stamps now also enqueue liquid simulation (previously sim-placed water never flowed).

### 🕯️ Real shapes: torch & chest
- Torch: canonical proportions (2 px stick + glowing tip), not a square block.
- Chest: real two-tier chest silhouette — base box + protruding lid + side clamps (not a plain cube), with the authentic baked chest texture.



### 📦 Real chest texture (baked from the entity sheet)
- The chest block was a documented oak-planks placeholder (vanilla chest is an *entity* texture). New: `buildMasterAtlas.js` bakes a custom **chest tile** (slot 877) from `entity/chest/normal.png` — wood front panel crop + dark frame + gold latch. Chest block (43) and the 3D voxel chest use it (`pushChest(tile)`); verified in-world.

### 🪣 Lava bucket / item blocks in the simulation
- Root cause: the sim block picker included ITEM ids (bucket classes, tools, signs…). Placing them wrote an item id into the world, which the mesher textured with the item's junk block tile (e.g. lava bucket → andesite). `blocksPickList()` now projects **placeable blocks only** (`isItemOnly` excluded) → 696 valid entries.

### 📚 Sim catalog 150-cap removed
- The SimDeck grid rendered `filtered.slice(0, 150)` — only ~150 blocks were reachable. Replaced with load-more pagination (150 per page, "Show more (N more)").

### ✅ Verified authentic (no changes needed)
- **White wool** (62) = `white_wool.png` (white fuzz weave — matches vanilla); **torch** family shape+texture correct (thin post w/ torch.png); row capture confirmed.

---

## Build `v0.1.116` — August 27, 2026

### 🔊 Sound default OFF
- Music & sound effects default to OFF on fresh sessions (user opts in via Options); saved preferences still respected.

### ⏸ True pause on inactive page
- Opening the Pause Menu (Esc / window blur / tab switch) now also FREEZES the run-loop (world, mobs, time, liquids) — the frame loop idles at 1 fps while any menu is open; it resumes instantly on close. Previously only `uiPaused` gated the loop, so the menu opened but the world kept running.

### 👀 Cow & sheep eyes
- Cows: white eye + black pupil pair on the head front face; sheep: narrow black bead eyes (classic MC look). Both ride the animated head group.

### ☀️ Sun shadows — plan check + lighting rebalance (docs/ARCHITECTURE.md §A exists)
- The directional-shadow plan is real (single 1024² PCFSoft pass tracking the celestial orbit). Depth-probing validated: shadow map renders & the configuration is correct (frustum ±64m, map 1024², `updateProjectionMatrix()`, `normalBias 0.01` added).
- Root cause of "shadows invisible": **sunlight vs ambient ratio** — combined ambient+hemisphere (~0.7, sun 1.2) left shadowed terrain ~40% as bright as lit terrain → shadows washed out. Day lighting rebalanced: sun 2.1 vs ambient 0.24/0.12 → direct-sunlight block shadows read clearly. Long shadows follow the sun angle as designed (morning/evening).
- NOTE: SwiftShader (headless) still renders them faintly; final anti-aliasing/softness is hardware-dependent — please validate on-device; PCF-hard fallback can be toggled if version-specific issues appear.

---

## Build `v0.1.115` — August 27, 2026

### 🎨 Foliage Color Fix (raw-grayscale textures were showing GRAY)
- **Root cause:** vanilla stores most foliage/plants as RAW GRAYSCALE, tinted per-biome at render time. The atlas only had 4 legacy leaf tints baked; dark-oak/mangrove/acacia leaves, tall grass, ferns, vines, lily pads rendered gray ("no color").
- **Fix:** centralized `FILE_TINTS` in `catalog/buildMasterAtlas.js` (vanilla-style neutral colors) + a 1.35 boost on the tint multiply (plain multiply made leaves too dark). Atlas re-baked via the safe chain (`npm run build:textures`), runtime probe: tall grass chroma 2→167, mangrove 2→102, dark oak 4→128.
- **Warped violet leaves (112)** reverted to the violet-teal `warped_roots` texture (had been swapped to the then-gray mangrove tiles).

### ☀️ Sun restored ("sun is missing")
- `createCelestialTexture` drew the sun/moon on the BOTTOM rows of the 512² canvas, but CanvasTexture has `flipY: true` (v=1 = top row) — the GPU was sampling the empty flipped region. Sun/moon now drawn at the top rows; verified visible in a live sky capture (`snapshots/sun-tint-guard.jpg`).

### ✕ Item blocks guard ("sign shows a different block")
- Item-category blocks (Oak Sign, tools, food etc.) could be placed into the world; the mesher, having no tile, defaulted to tile 0 → a grass-textured cube. `placeBlock` now rejects item-only ids with a toast.

### 📸 3-second freezes ("0 fps for ~3s")
- Telemetry root-caused periodic drops to the client-side snapshot encoder: on touch devices (iPad Safari) the fallback path (`createImageBitmap`/`toDataURL` on the WebGL canvas) blocks the main thread for seconds (`capture: 3539ms` measured).
- Fix: auto view-capture + HUD archives are **disabled on coarse-pointer/touch devices**; encoder worker timeout tightened 10s → 2.5s (no long hangs elsewhere).

---

## Build `v0.1.114` — August 26, 2026

### 🔍 Texture verification sweep ids 115–194 (docs/TEXTURE_FIX_PLAN.md §6c)
- All 80 blocks verified in-world (6 close-up captures `snapshots/tex-115to194-{A..F}.jpg`) — correct textures, documented placeholders only.
- **Ladder (140)** — new `pushLadder` thin-wall shape (both meshers) — no more ladder-cube.
- **Bamboo plant (169)** — tile corrected to `bamboo_stalk` (was `bamboo_block`).
- Verified: `tsc` clean, `sim:test` 71/71, `textureCheck: PASS`.

---

## Build `v0.1.113` — August 26, 2026

### 🕯️ Light & Decorative Family — Dedicated 3D Shapes (no more black cubes)
- New shape meshers in `chunkMesh.ts` — `pushTorchPost` (torch/soul torch/redstone torch = thin 2-px posts), `pushLantern` (lantern/soul lantern = hanging cage), `pushEndRod` (rod + end caps), `pushAmethystCluster` (3-shard cluster), `pushBrewingStand` (plinth + column + arms), `pushPortalPanel` (thin double-sided panel); glow lichen becomes a floor decal, glow berries a cross-billboard.
- Wired into BOTH meshers (main-thread `Game.tsx` + worker `meshWorker.ts` — full parity) + `trans: 1` flag batch via `catalog/patchBlockFlags.mjs` so neighbor faces are no longer culled and the alphaTest cutout material is used.
- Verified in-world (`snapshots/tex-lights-80to104-*.jpg`): light family now renders as recognizable objects instead of dark 16³ cubes.

### 🛡️ Texture Pipeline Hardening (see docs/TEXTURE_FIX_PLAN.md)
- `catalog/textureCheck.mjs` — CI hard-fail audit (empty slots / wrong-face files / shared-slot report); `npm run audit:textures`.
- `buildMasterAtlas.js` now hard-refuses to run without `--atlas-only` (protects blocks.ts runtime tables & corrections). Safe rebuild: `npm run build:textures`.
- Tile/flag corrections all idempotent via `patchBlockTiles.mjs` + `patchBlockFlags.mjs`.
- Removed stale duplicates: `buildExactTileAtlas.js`, `public/textures/terrain_atlas_1_19_3.png`, dead `textureCatalog.ts`.
- Fixes bundled: campfire→`campfire_log_lit`, soul campfire→`soul_campfire_log_lit`, brewing stand→`brewing_stand` (was torch), biome leaves 110–112 → dark oak/birch/mangrove leaves.

---

## Build `v0.1.112` — August 26, 2026

### 🎨 Texture Application Hotfixes (authentic 1.19.3 atlas repair) — findings in `docs/TEXTURE_FIX_PLAN.md`
- **Sun & Moon — "wood block sun" fixed**: the sun/moon now use their own dedicated 512² celestial atlas (`createCelestialTexture()` in `atlas.ts`). They previously sampled leftover atlas slots 79/80 that held `acacia_log_top.png`/`acacia_sapling.png` after the master-atlas regen.
- **Oak Doors fixed (were slime/sponge)**: `pushDoor` was hardcoding legacy slots 142/143 (now `slime_block`/`sponge`); remapped to authentic `oak_door_top` (106) / `oak_door_bottom` (107) split.
- **Chests fixed (were acacia log/door-top)**: `pushChest` now textures oak planks (9) — vanilla chest is an entity texture absent from the block set.
- **10 blocks recorrected** via `catalog/patchBlockTiles.mjs` (idempotent tiles patcher): Chest, Cherry leaves/wood, Pink petal carpet, Crimson, Hopper, Mushroom, Redstone Dust Overlay (was an EMPTY slot → black!), Sculk Shrieker Inner, Warped.
- **Auditor tooling**: `catalog/auditTextures2.mjs` (ground-truth block-vs-atlas verification) — post-fix: **0 empty slots referenced**, only legit black concrete flagged.

### 📱 Mobile Close Buttons (✕) — touch-friendly popups (iPad has no Esc key)
- ChestModal (its `onClose` was previously dead code), InventoryModal, and PauseMenu (both sim & prod layouts) now have a big tappable ✕ that runs the exact same close path as Escape.
- Crafting/Furnace/VillagerTrade/Blueprint already had close buttons.

---

## Build `v0.1.111` — August 26, 2026

### ⚡ P0 Performance Rebuild: Worker-Pool Chunk Meshing + Fast Block Lookups (60 FPS restoration)
- **Worker-Pool Chunk Meshing**: All chunk meshing now happens off the main thread in a pool of 1–4 Web Workers ((`src/game/engine/meshPool.ts`)) running the full-parity mesher (`src/game/engine/meshWorker.ts` — stairs+facings, doors, trapdoors, chests, cross billboards, decals, fences, foliage/glow/water buckets, 3-block ambient occlusion, neighbor border strips for seamless edges).
- **Versioned Async Results**: Every mesh request carries a chunk version; stale or superseded results are dropped automatically, so block edits while meshing never produce flicker or dead locks.
- **Boot Parallelization**: `buildSpawnArea` now fires all spawn-pad meshes in parallel and awaits the pool (synchronous sliced fallback is kept for environments without Web Workers — it auto-fails over).
- **Precomputed Block Lookup Tables**: `isOpaque` / `isSolid` / `isStair` / `isTrans` are now single array-index lookups instead of 1–2 `Map.get` calls per voxel-face test (2–4× faster meshing inner loop).
- **Chunk-Local Stair Facings**: `Chunk.dirs` (`Uint16Array`) mirrors stair orientations for the worker mesher — no string-keyed per-voxel lookups.
- **Smart Shadow Map Cadence**: The 1024² PCFSoft shadow map no longer re-renders every 2nd frame — only when the player crosses a chunk boundary or every 350 ms.
- **Correct Color Space**: Terrain atlas now tags `SRGBColorSpace` (authentic Minecraft colors, sRGB-linear lighting pass).
- **Removed Dead Code**: No-op `updateLiquidTextures` frame hook deleted; `MeshPool` coalesces duplicate queued requests for the same chunk (prevents queue explosion while flying).
- Verification: `npm run sim:test` 71/71; live headless test (`scripts/test-worker-meshing.mjs`) — full 225-chunk render circle meshed, `meshQ` drains to 0, world renders via direct canvas capture; detailed findings/benchmarks in `docs/PERFORMANCE_INVESTIGATION.md`.

---

## Build `v0.1.110` — August 26, 2026

### 🎨 Pure Terrain Atlas Rendering & Clean GPU Pipeline (Zero Procedural Noise)
- **Eliminated Obsolete Procedural Overwrites**: Removed 850 lines of legacy procedural canvas drawing code from [`src/game/engine/atlas.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/atlas.ts) that was overwriting authentic textures at broken 16×16 offsets.
- **100% Authentic Block Face Mappings**: Preserved exact canonical Grass Block textures (Top: 0 `grass_block_top.png`, Side: 1 `grass_block_side.png`, Bottom: 2 `dirt.png`) and exact tile indices for Light Gray Terracotta (522), Deepslate, Mud Bricks, and all 710 placeable blocks.
- **Zero GPU Bandwidth Choke**: Disabled redundant 11-times-per-second full canvas texture GPU re-uploads, maintaining solid 60 FPS performance without micro-stuttering or frame dips.

---

## Build `v0.1.109` — August 26, 2026

### 🚀 60 FPS Performance Optimization & 512×512 Master Terrain Atlas (Phase A, B & C)
- **60 FPS Performance Restoration (Phase A)**: Eliminated runtime synchronous `toDataURL()` canvas generation for 1,173 items in [`src/game/engine/atlas.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/atlas.ts), restoring solid 60 FPS gameplay.
- **512×512 Master Terrain Atlas (Phase B)**: Compiled all 875 official block textures into a unified 32×32 grid terrain atlas ([`catalog/buildMasterAtlas.js`](https://github.com/martintimmer/hollow-web-mc/blob/main/catalog/buildMasterAtlas.js) -> [`src/game/engine/atlasData.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/atlasData.ts)).
- **Authentic In-World Voxel Rendering (Phase C)**: Assigned exact unique tile coordinates for all 710 placeable blocks in [`src/game/blocks.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/blocks.ts). Blocks placed in the world (Bamboo Blocks, Deepslate, Mud Bricks, Cherry Wood, etc.) render with their real textures instead of Stone.
- **Upgraded Chunk Meshing & Voxel UVs**: Updated [`chunkMesh.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/chunkMesh.ts), [`meshWorker.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/meshWorker.ts), [`heldItem.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/heldItem.ts), and [`visuals.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/visuals.ts) to calculate UV coordinates across the 32×32 master atlas grid.

---

## Build `v0.1.108` — August 26, 2026

### 🎮 Creative Inventory Drag & Drop & Full World Placement (Phase 2 & 3)
- **Creative Hotbar Drag & Drop**: Left-click on any of the 1,173 items in the Creative Catalog to pick up a full 64-stack onto the cursor, and click any hotbar slot (1–9) to immediately assign and equip it.
- **Shift-Click Quick-Equip**: Shift-clicking any block or item in the creative inventory instantly assigns a 64-stack to the first empty hotbar slot (or active slot).
- **In-World Voxel Placement**: Equipped blocks placed via right-click or <kbd>E</kbd> in the world render immediately with chunk remeshing, physics collision, sound effects, particle bursts, and multiplayer database persistence.

---

## Build `v0.1.107` — August 26, 2026

### 🌐 Complete Official Minecraft 1.19.3 Catalog Ingestion (Phase 1)
- **1,173 Total Registered Entities**: Parsed all 875 official block PNGs and 519 item PNGs into 710 distinct placeable block definitions and 462 distinct items in [`src/game/blocks.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/blocks.ts) and [`catalog/completeRegistry.json`](https://github.com/martintimmer/hollow-web-mc/blob/main/catalog/completeRegistry.json).
- **1,161 Pre-Baked 3D/2D Mini Thumbnails**: Generated high-DPI 3D isometric block projections and 2D pixel-art item icons across the entire registry in [`src/game/engine/thumbnailsData.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/thumbnailsData.ts).
- **Complete Creative Tabs Coverage**: Organized all 1,173 assets across Building, Decoration, Redstone, Transportation, Natural, Food, Tools, Combat, Colored Wool, and Survival categories with full-text search.

---

## Build `v0.1.106` — August 26, 2026

### 🎒 Creative Inventory Registry Expansion & Categorization (Phase 2)
- **Official Tools & Utilities**: Registered Wooden, Stone, Iron, Golden, Diamond, and Netherite Pickaxes, Axes, Shovels, Hoes, Shears, Fishing Rods, Compasses, Clocks, and Flint & Steel into the global items registry ([`src/game/blocks.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/blocks.ts)).
- **Combat Weapons & Armor**: Registered Wooden, Stone, Iron, Golden, Diamond, and Netherite Swords, Bows, Crossbows, Arrows, Shields, and full Iron/Diamond Armor sets with authentic 1.19.3 item icons.
- **Foodstuffs & Farm Produce**: Registered Apples, Golden Apples, Bread, Cooked Beef, Cooked Porkchops, Golden Carrots, Cookies, Cakes, Wheat, Carrots, and Potatoes.
- **Refined Creative Tabs**: Enhanced filtering across all 11 tabs in [`InventoryModal.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/gui/InventoryModal.tsx) (Tools, Combat, Foodstuffs, Building, Decoration, Redstone, Transportation, Natural, Colored Wool, Survival) with instant full-text search.

---

## Build `v0.1.105` — August 26, 2026

### 🎨 Authentic 1.19.3 Dual-Layer Mini Thumbnail Pre-Baking (Phase 1)
- **3D Isometric Block Thumbnails**: Generated 48×48 authentic 3D isometric projections for all solid blocks, stairs, and slabs directly from official 1.19.3 Minecraft face PNGs with directional lighting (100% top, 84% left, 68% right) and foliage tinting.
- **2D Pixel-Art Item Thumbnails**: Integrated authentic 16×16 item icons for tools, swords, armor, food, flowers, saplings, and doors from `catalog/textures/item/` and `catalog/textures/block/`.
- **Zero-Latency Pre-Baked Cache**: Exported 200 high-DPI base64 thumbnails in [`src/game/engine/thumbnailsData.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/thumbnailsData.ts) and [`catalog/thumbnailsCache.json`](https://github.com/martintimmer/hollow-web-mc/blob/main/catalog/thumbnailsCache.json) for 0ms inventory loading.

---

## Build `v0.1.104` — August 26, 2026

### 🎮 Inactive / Blur Menu Trigger & State Sync Fix
- **Modal State Mirroring**: Added reactive state sync hooks in `Game.tsx` for `titleScreenOpen`, `worldSelectOpen`, and `pauseOpen` to resolve a bug where `s.titleScreenOpen` remained `true` after login, which previously blocked auto-pause from activating on tab switch/window blur.
- **Window Blur Auto-Pause**: Tab switching, clicking away from the window, or losing window focus now reliably opens the Pause Menu (`pauseOpen = true`).

### 🧹 UI Cleanliness & Version Watermark
- **Removed Overlapping Build Tag Chip**: Completely removed the injected `build ${BUILD_TAG}` chip in `src/main.tsx` that was colliding with and covering the version number in the bottom right corner.
- **Clean Single Version Watermark**: Display only `Hollowpine v0.1.104` in the bottom-right corner.

### 📦 Lossless Atomic Ctrl+Click & Shift+Click Transfer
- **Eliminated Iteration Race Conditions**: Rewrote Ctrl+Click (mass move) and Shift+Click (stack quick-transfer) in `ChestModal.tsx` to operate on in-memory clones across all slots atomically before triggering state dispatch, completely resolving item loss during multi-item transfers.

### ☁️ Smooth Continuous Cloud Movement
- **Eliminated 20-Second Cloud Jump**: Replaced the `% 16` modulo wrapping on cloud coordinates in `Game.tsx` with continuous drift over the full `1024` periodic tile span (`s.clouds.userData.totalSpan`), eliminating sudden backward teleport jumps.

---

## Build `v0.1.103` — August 26, 2026

### 🌐 Real-Time Multi-User Chest Synchronization
- **Live Collaborative Chests**: If multiple players have the same chest open at the same time, any item added, moved, split, or withdrawn by one player is immediately broadcast via WebSocket (`CHEST_UPDATE`) and reflected in real-time on all other viewing players' screens.
- **Immediate Database Upsert**: Server validates and commits live chest modifications to SQLite (`world_chests`) concurrently with broadcast so data is never lost.
- **Audio Cue**: Plays Minecraft chest sound when remote players update chest items while you are looking at it.

---

## Build `v0.1.102` — August 26, 2026

### 🏷️ Persistent Version Watermark
- Added permanent `Hollowpine v0.1.102` font-mono indicator in the lower-right corner of the HUD (`HUD.tsx`).

### 📦 Chest Slot State Retention & Reopen Architecture
- **Eliminated Closure Overwrite**: Completely eliminated stale React state closure in `closeChest()` by reading directly from `s.chestMap.get(key) || s.chestSlots`, preventing accidental overwrites with empty initial arrays.
- **Triple-redundant Persistence**: Every slot update is mirrored in engine state, persistent browser `localStorage`, and SQLite `world_chests`.

### 🎨 Creative Inventory Layout & Tab Anti-Collision Fix
- **Dynamic Container Auto-Spacing**: Expanded creative inventory window container from `330px` to `min-h-[360px] w-[484px]` with a dedicated `Hotbar` section separator (`border-t-2 border-[#8B8B8B]/40`).
- **Zero Collision for Bottom Tabs**: Re-aligned the bottom category tabs ("Foodstuffs", "Tools and Utilities", "Combat", "Survival Inventory") to prevent overlapping or covering the 9-slot hotbar across all screen aspect ratios.

---

## Build `v0.1.101` — August 26, 2026

### 🎮 Mouse Cursor & OG Minecraft Idle / Focus Engine
- **Window Blur / Inactivity Auto-Pause**: When switching tabs, clicking outside the game window, or when the window loses focus (`window.onblur`, `document.visibilitychange`), the game automatically pauses and opens the Pause Menu (`pauseOpen = true`).
- **Interactive Click Auto-Resume**: Clicking anywhere on the canvas immediately closes the Pause Menu, requests pointer lock (`cv.requestPointerLock()`), hides the mouse cursor, and resumes gameplay without extra clicks.
- **Escape Key Single-Press Flow**:
  - 1st press of <kbd>Escape</kbd>: Instantly opens the Pause Menu and unfreezes the mouse cursor.
  - 2nd press of <kbd>Escape</kbd>: Dismisses the Pause Menu, re-engages pointer lock, hides the mouse cursor, and resumes playing.

### 📦 Robust Chest Memory & Database Persistence
- **State Overwrite Fix**: Fixed the stale closure issue in `closeChest()` where closing the chest was overwriting active slot modifications with empty initial state.
- **Direct Multi-Layer Persistence**: Every slot modification in `ChestModal.tsx` immediately writes to:
  1. Active memory (`s.chestSlots`, `s.chestMap`).
  2. Browser `localStorage` fallback keyed by `${worldId}_${x},${y},${z}`.
  3. Server SQLite database (`world_chests` table via `POST /api/worlds/:id/chests`).
- **Coordinate Reopening**: Reopening any chest at any coordinate immediately retrieves and displays its persisted items.

### 🎨 Creative Inventory Catalog Drag & Drop
- **Ghosting / Forbidden Icon (🚫 / ❌) Fix**: Added `draggable={false}` and `pointer-events-none` across all item images and `onDragStart={e => e.preventDefault()}` on all slot buttons, preventing the native browser drag event from interfering with custom Minecraft drag & drop.
- **Catalog Drag & Trash**:
  - Clicking an item in the creative catalog grabs a full 64 stack onto the floating cursor.
  - Dropping onto any hotbar slot (1–9) assigns that slot.
  - Dragging any item from the hotbar back onto the creative catalog area and clicking deletes/trashes it cleanly.

---

## Build `v0.1.1` — August 26, 2026

- Rebuilt `ChestModal.tsx` to match the exact visual layout of `docs/images/chest-inventory-management.png`.
- Implemented left-click (1 item) vs. right-click (full 64 stack) vs. Ctrl+Click (mass move) vs. Shift+Click (quick transfer).
- Enforced strict 3×9 (27) slot storage limits on Chest and Inventory.
- Initialized toolbar to empty (`[0, 0, 0, 0, 0, 0, 0, 0, 0]`) by default.
- Added Minecraft purple-bordered floating tooltips for utility buttons.
- Suppressed item quantity numbers in Creative Mode (`!creative && count > 1`).
- Implemented global hotkey isolation so typing in any text field (including <kbd>C</kbd>) types characters without opening chat.
- Auto-focused search field when opening the inventory modal.
- Added first-person left arm and off-hand torch system (<kbd>F</kbd> key swap).
- Fixed stair 180° orientation and half-height step landing.
- Added dynamic falling entity physics for sand and gravel blocks.
