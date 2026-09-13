# Hollowpine Web Minecraft — Architecture & Engine Overview

## 1. Technical Stack & Core Modules
- **Rendering Engine**: Three.js (WebGL 2.0 / WebGPU ready)
- **UI Framework**: React 19 + Tailwind CSS + Custom Minecraft Java/Bedrock GUI
- **Asset Pipeline**: Authentic vanilla 1.19.3 assets — a **512×512 master terrain atlas** (32×32 tiles, source `InventivetalentDev/minecraft-assets`) baked into `atlasData.ts` (mirrored by `public/textures/terrain_atlas.png`, validated by `textureCheck.mjs`), plus a fetched **isometric thumbnail cache** (`/catalog/thumbnails.json`, ~2.5 MB) for inventory icons. Custom baked tiles for chest/bed/etc. (`catalog/customTiles.json`); porch tile `890` baked surgically (no regen). Block registry: `catalog/completeRegistry.json` → `src/game/blocks.ts` (append-only; `syncBlocksTs.mjs` template is stale — drops `fence`/`durability` — so regenerate is NOT used); shapes in `catalog/block-shapes.json`.
- **Serving**: Nginx static server + separate Express game APIs for the prod and dev/sim environments (each with its own SQLite database) + an admin-gated sim API.

## 1a. Modular engine (Game.tsx 9,308 → 5,045 lines)
The engine is split into factory-pattern modules under `src/game/` — `chunkMesher`, `chunkStreamer`,
`renderLoop`, `playerPhysics`, `playerInteraction`, `worldMap`, `terrainGenerator` (+ `meshPipeline`,
`materials`, `explosions`, `fluidDynamics`, `gameState`, `chunkData`, `structurePlacer`, `villagerAI`).
`Game.tsx` orchestrates them and renders the React overlays. (Full plan: `docs/GAME_MODULARIZATION_PLAN.md`.)

## 1b. Data & config stores (world data separated from game assets)
- **Game-asset DB** (`minecraft.db`): users, worlds, player_state, world_blocks, chests, blueprints, animals.
- **World-gen/config DB** (`<worldgen-db>`, dev `sim-worldgen.db`): `gen_presets`, `biome_registry`,
  `world_gen` (per-seed reports), `texture_overrides` (editor-saved block/chest textures).
- Source of truth for the biome/seed catalog: `catalog/biome-registry.json`; block shapes:
  `catalog/block-shapes.json`.

## 1c. Diagnostic / tooling pages (static, built by Vite)
- `/seed.html` — seed & biome visualizer (runs the real generator; biome/height maps, registry, reports).
- `/blocks.html` — blocks/entities catalog (3 looks per block, wiki/KB, cube vs 3D split, live stats).
- `/kb.html` — structured knowledge-base site (frontmatter statuses, cross-links; `/kb/` markdown alias).
- `/editor.html` — block texture studio ("Save & Apply" → DB via `POST /api/textures/overrides` → game live-reloads).

---

## 2. Performance & Mobile GPU Optimization (Apple Silicon / iPad M2)

### A. Shadow Map Architecture
- **Celestial Directional Light Shadow Mapping**: Single orthographic shadow pass, per-tier config (`basic 512/Basic`, `detailed 768/PCF`, `advanced 1024/PCFSoft` with shrinking radius for texel density).
- **On-demand shadow refresh**: `shadowMap.autoUpdate = false`; re-renders at most 2×/s or on chunk change (was every frame).
- **Point Light Illumination**: Analytical $O(1)$ shader evaluation, no cubemap passes; dynamic pool bounded by preset (2/4/6) plus baked L2 vertex lighting.
- **Result**: Drastic reduction in GPU fillrate overhead, sustaining silky-smooth 60/120 FPS on iPad M2 and mobile devices.

### B. Chunk Streaming & Meshing
- **Worker pool** (`meshPool.ts`): up to 8 module workers (`meshWorker.ts`, zero-copy transfers), FIFO with same-chunk coalescing, sliced main-thread fallback; pool depth/busy/fallback counters in telemetry.
- **Mesh-first streaming** (`chunkStreamer.ts`): ready meshes dispatch before new gens when backlogged; budget scales with queue depth (≤5 ms) plus a flight boost above 8 m/s; keep ring = render+2; height cache 64k entries.
- **Far-ring fast meshing**: chunks beyond render−2 skip per-vertex AO in both mesher paths (identical output per flag, ~2× faster far meshing).
- **Distant horizon LOD** (`horizonLOD.ts`): 2×2 frustum-culled tiles, 4/8/16-block rings from the live heightmap (`terrainGenerator.horizonColumn`: real heights, snow caps, beaches, forest canopy, village clearings) with overlap + seam skirts, one cheap sun/moon-lit `MeshLambertMaterial`, cross-build sample cache. Costs ~4 draws to the camera far plane.
- **Liquid Simulation & Batched Remeshing**: Cellular automaton in `liquidQ` (36 m cull); dirty chunks rebuilt once per tick.

### C. Maps, Weather & Telemetry
- **2D maps** (`worldMap.ts`): minimap 20 FPS, fullscreen map every frame while open with tile budgets 32/48→real/far; pure `worldToScreen`/`screenToWorld` helpers (unit-tested); spawn pins + hover ghost markers.
- **Weather lighting** (`weatherMachine.ts`): discrete state machine, but all light scalars ease exponentially (τ = 4 s, ~95% in 12 s) — no visible snap on storms or clear-ups.
- **Telemetry** (`telemetry.ts` → `/api/debug/perf` → `data/telemetry-perf.jsonl`): FPS drops, slow phases, chunk-op stalls, per-pulse context (chunks/meshed/queues/calls/tris/heap/pool/horizon). Analyze with `node scripts/chunk-efficiency.mjs`.

### D. Hardware-Accelerated Viewport Compositing
- The full-screen WebGL canvas mount employs `transform-gpu` and `will-change: transform` to prevent Safari / WebKit compositor framebuffer readbacks during live vibrance/contrast filtering.

---

## 3. World Generation & Seed System
- **Java-Compatible String Hashing**: Uses 32-bit `javaHash` algorithm.
- **Biome & Topography**: Multi-octave Perlin noise generation simulating continental plains, oceans, snowy peaks, and taiga forests.
- **Procedural Villages**: Automated grid planning generating multi-story houses, oak staircases, street lamps, town wells, crop gardens, and fenced livestock pens (`VillagePlan.pens`, `buildPen`) stocked with calm cows.
- **Villagers & Animals**: Profession-gated AI (`villagerAI.ts`, e.g. farmer-only `tending_cows`); trade gate `canTradeWith` (range + LOS + crosshair); solitary explorer cats exempt from herd/social steering; named pets persisted per user with teleport list.
