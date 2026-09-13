# Comprehensive Codebase Modularization & Game.tsx Shrink Plan

## 1. Executive Summary & Core Objective

[`src/components/Game.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/Game.tsx) originally contained over 9,300 lines of mixed concerns: React UI rendering, session management, Three.js lifecycle, terrain generation, physics, AI, mesh processing, and simulation harnesses.

In Phase 1, the core data layer was extracted into 6 initial modules, reducing `Game.tsx` by 230 lines.

This updated plan provides the end-to-end roadmap to shrink `Game.tsx` from **~9,078 lines down to < 800 lines** (a >90% reduction) by methodically extracting 12 self-contained subsystems organized into 5 logical layers.

---

## 2. Complete Target Subsystem Architecture

```mermaid
graph TD
    subgraph Layer 1: Core State & Voxel Storage
        STATE["1. Shared Mutable State<br/>src/game/state/gameState.ts"]
        CHUNK_DATA["2. Voxel & Chunk Storage<br/>src/game/world/chunkData.ts"]
        MUTATIONS["3. Region Mutations & Craters<br/>src/game/terrain/regionMutations.ts"]
        PLACER["4. Structure & Blueprint Placer<br/>src/game/blueprints/structurePlacer.ts"]
    end

    subgraph Layer 2: Terrain & World Generation
        TERRAIN_GEN["5. Procedural Terrain & Noise<br/>src/game/terrain/terrainGenerator.ts"]
    end

    subgraph Layer 3: Graphics & Rendering Engine
        SCENE_SETUP["6. Three.js Scene, Sky & Arm<br/>src/game/engine/sceneSetup.ts"]
        CHUNK_MESHER["7. Chunk Meshing & Slicing<br/>src/game/engine/chunkMesher.ts"]
        RENDER_LOOP["8. Animation & Streaming Loop<br/>src/game/engine/renderLoop.ts"]
    end

    subgraph Layer 4: Physics, AI & Mechanics
        PHYSICS["9. Player Kinematics & Collisions<br/>src/game/physics/playerPhysics.ts"]
        INTERACTION["10. Raycasting, Mining & Fluids<br/>src/game/interaction/playerInteraction.ts"]
        VILLAGER_AI["11. Villager AI & Pathfinding<br/>src/game/entities/villagerAI.ts"]
    end

    subgraph Layer 5: Sim Deck & React Hooks
        SIM_DECK["12. Sim Deck & Scenario Bridge<br/>src/sim/simDeckBridge.ts"]
        HOOK_SESSION["13. Session & Auto-Save Hook<br/>src/components/hooks/useWorldSession.ts"]
        HOOK_MODALS["14. GUI Modal State Hook<br/>src/components/hooks/useGameModals.ts"]
        HOOK_INPUT["15. Pointer Lock & Input Hook<br/>src/components/hooks/useGameInput.ts"]
    end

    subgraph Orchestration View
        GAME["Game.tsx (< 800 lines)<br/>Mounts Hooks & Renders Overlays"]
    end

    GAME --> HOOK_SESSION
    GAME --> HOOK_MODALS
    GAME --> HOOK_INPUT
    GAME --> SCENE_SETUP
    GAME --> RENDER_LOOP
    RENDER_LOOP --> PHYSICS
    RENDER_LOOP --> INTERACTION
    RENDER_LOOP --> VILLAGER_AI
    RENDER_LOOP --> CHUNK_MESHER
    CHUNK_MESHER --> CHUNK_DATA
    TERRAIN_GEN --> CHUNK_DATA
    INTERACTION --> MUTATIONS
    MUTATIONS --> CHUNK_DATA
    CHUNK_DATA --> STATE
```

---

## 3. Subsystem Breakdown & Extraction Inventory

### 🏔️ Module 5: Procedural Terrain & Noise Engine
* **Target File:** [`src/game/terrain/terrainGenerator.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/terrainGenerator.ts)
* **Estimated Lines Extracted:** ~600 lines (from `Game.tsx` lines 1450–2050)
* **Responsibilities:**
  * Procedural noise samplers: `rawHeight`, `terrainHeight`, `vnoise`, `tempAt`, `riverAt`, `cave3D`.
  * Biome elevation and surface block mapping: `surfaceAt(x, z)`.
  * Village locator: `villageAt(rx, rz)`, `findClosestVillage(px, pz)`.
  * Chunk voxel generator: `generateChunkData(s, cx, cz)`.

### 🎨 Module 6: Three.js Scene, Sky & Arm Setup
* **Target File:** [`src/game/engine/sceneSetup.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/sceneSetup.ts)
* **Estimated Lines Extracted:** ~500 lines (from `Game.tsx` lines 2650–3150)
* **Responsibilities:**
  * Scene initialization: `initThreeScene(container, canvas)`.
  * Camera and WebGLRenderer configuration with shadow maps.
  * Celestial environment: sun, moon, stars, sky dome, dynamic clouds (`makeClouds`).
  * First-person player arm and held item attachment groups (main hand & offhand).

### ⚙️ Module 7: Chunk Mesher & Worker Slicing
* **Target File:** [`src/game/engine/chunkMesher.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/chunkMesher.ts)
* **Estimated Lines Extracted:** ~600 lines (from `Game.tsx` lines 2050–2650)
* **Responsibilities:**
  * WebWorker meshing pool orchestration and fallback main-thread mesher.
  * Sliced meshing job step: `advanceMeshJob(job, budgetMs)`.
  * Directional face lighting, AO lookup, and typed buffer serialization.

### ⏱️ Module 8: Animation & Chunk Streaming Loop
* **Target File:** [`src/game/engine/renderLoop.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/engine/renderLoop.ts)
* **Estimated Lines Extracted:** ~850 lines (from `Game.tsx` lines 5150–6000)
* **Responsibilities:**
  * Main `requestAnimationFrame` loop (`frame(now)`).
  * Dynamic chunk streaming radius (`rescan(pcx, pcz)`) with load budgets.
  * Horizon mountain LOD mesh updater (`updateHorizonMesh`).
  * Celestial sun/moon orbit ticking and ambient atmosphere modulation.
  * FPS, chunk count, and HUD telemetry calculation.

### 🏃 Module 9: Player Kinematics & Physics Engine
* **Target File:** [`src/game/physics/playerPhysics.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/physics/playerPhysics.ts)
* **Estimated Lines Extracted:** ~600 lines (from `Game.tsx` lines 3850–4450)
* **Responsibilities:**
  * Physics tick step: `stepPlayerPhysics(s, dt)`.
  * AABB swept collision testing: `boxCollides`, `sweptBox`.
  * Vertical movement handling: gravity, jump velocity, auto-stepping (stairs & 1-block steps), ladder wall climbing (`#140`), swimming, ice inertia.
  * Fall damage calculation and camera shake triggers.

### ⛏️ Module 10: Player Interaction, Mining & Fluids
* **Target File:** [`src/game/interaction/playerInteraction.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/interaction/playerInteraction.ts)
* **Estimated Lines Extracted:** ~700 lines (from `Game.tsx` lines 4450–5150)
* **Responsibilities:**
  * Raycast targeting: `raycastBlock(s)`.
  * Block placement logic: `placeBlock(s, hit, slotItem)` with orientation resolution (stairs, torches, doors, beds).
  * Mining tick and tool durability degradation: `stepMining(s, dt)`.
  * Item drop pickup and auto-stacking.
  * Cellular automata fluid propagation queue: `stepLiquids(s, budget)`.

### 👥 Module 11: Villager AI & Social Runtime
* **Target File:** [`src/game/entities/villagerAI.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/entities/villagerAI.ts)
* **Estimated Lines Extracted:** ~400 lines (from `Game.tsx` lines 3250–3650)
* **Responsibilities:**
  * Villager simulation loop: `stepVillagers(s, dt)`.
  * Profession assignment, trading cooldown resets, and scheduled daily pathfinding.
  * Interaction prompts (`nearVillager`) and greeting vocalizations.

### 🎛️ Module 12: Sim Deck & Headless Scenario Bridge
* **Target File:** [`src/sim/simDeckBridge.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/sim/simDeckBridge.ts)
* **Estimated Lines Extracted:** ~950 lines (from `Game.tsx` lines 6000–6950)
* **Responsibilities:**
  * Installs complete `window.__sim` API surface.
  * Exposes `stampRun`, `undo`, `stampTree`, `stampStructure`, `brushPaint`, `brushErase`.
  * In-browser scenario suites runner.
  * Viewport transform gizmos and snapshot capture handlers.

### 🪝 Module 13–15: React Custom Hooks
* **Target Files:**
  * [`src/components/hooks/useWorldSession.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/hooks/useWorldSession.ts) (~350 lines): World select/create/delete, API joins, auto-save timers.
  * [`src/components/hooks/useGameModals.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/hooks/useGameModals.ts) (~450 lines): Inventory, crafting, furnace, chest, pet modal states and item swaps.
  * [`src/components/hooks/useGameInput.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/hooks/useGameInput.ts) (~300 lines): Pointer lock listener, keyboard map, touch on-screen controls, orbit controls.

---

## 4. Line Reduction Projection

| Phase | Milestone | Extracted Modules | `Game.tsx` Line Count | Cumulative Reduction |
|---|---|---|---|---|
| **Baseline** | Initial monolith | None | **9,308 lines** | 0% |
| **Phase 1 (Done)** | State & Data Foundation | `gameState`, `chunkData`, `regionMutations`, `structurePlacer`, `meshPipeline`, `simBridge` | **9,078 lines** | -2.5% |
| **Phase 2** | Terrain & World Gen | `terrainGenerator.ts` | **~8,480 lines** | -8.9% |
| **Phase 3** | Graphics & Meshing Engine | `sceneSetup.ts`, `chunkMesher.ts`, `renderLoop.ts` | **~6,530 lines** | -29.8% |
| **Phase 4** | Physics, Mining & AI | `playerPhysics.ts`, `playerInteraction.ts`, `villagerAI.ts` | **~4,830 lines** | -48.1% |
| **Phase 5** | Sim Deck & Automation | `simDeckBridge.ts` | **~3,880 lines** | -58.3% |
| **Phase 6** | React Custom Hooks | `useWorldSession.ts`, `useGameModals.ts`, `useGameInput.ts` | **~2,780 lines** | -70.1% |
| **Phase 7** | JSX & UI Polish | Streamlined container & modal bindings | **< 800 lines** | **> 91.4% reduction** |

---

## 5. Migration Safety Gates & Test Protocol

To ensure 100% regression-free refactoring, each phase must satisfy:
1. `npx tsc -b && npm run build` (0 compile errors).
2. `npm run sim:test` (all 71 pure-logic unit tests passing).
3. `node catalog/textureCheck.mjs` (all block/atlas indices verified).
4. `node scripts/test-worker-meshing.mjs` (worker meshing smoke checks pass).
5. `node scripts/test-stair-db-and-animal-persistence.mjs` (database persistence checks pass).
6. `node scripts/test-left-hand-torch-and-stair-fixes.mjs` (headless browser rendering tests pass).
