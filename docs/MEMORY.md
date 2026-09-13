# Hollowpine Engine — Memory, Architecture Knowledge & Invariants

This document serves as the project's permanent architectural memory bank, recording fundamental invariants, model knowledge, system design choices, and historical lessons learned from past debugging autopsies.

---

## 🏛️ 1. Core Architectural Invariants

### A. Environment Isolation
- **Production Game:**
  - Public game client connecting to the Express backend backed by the production SQLite database.
  - Full survival/creative gameplay, procedural world selection (`apiGetWorlds`), multiplayer WebSocket syncing (`/ws`), persistent block modifications (`apiSaveBlockEdits`), and player state syncing.
- **Simulation Deck & Studio (dev-only):**
  - Dedicated admin-gated sandbox environment running `server/sim.js` backed by its own dev database.
  - Proxies authentication to the production auth API without ever opening or modifying the production database.
  - Boots directly to a flat grass stage at $y=64$ (`simFlat()`) with all production IO disabled (`s.simMode = true`).
  - **Invariant:** `initSession()` must early-exit on `isSim()` so login modals and world selection modals never appear in the sim environment.

### B. Pure Game Logic Separation
- Modules in `src/game/*` (e.g. `xp.ts`, `smelt.ts`, `recipes.ts`, `inventory.ts`, `noise.ts`, `blocks.ts`) must remain **pure**:
  - No React hooks or component dependencies.
  - Testable via headless unit harness `npm run sim:test` (`scripts/sim/tests.mts`).
  - Exit code $0$ signifies complete test suite passage.

---

## ⚙️ 2. Key Subsystems & State Machines

### A. Sim Bridge Architecture (`window.__sim`)
- The game canvas closure exposes runtime hooks to the global `window.__sim.api`:
  - `stampTree`, `stampStructure`, `stampBlock`, `stampMob`, `stampVillager`, `stampEntity`.
  - `objects()`: Returns all placed objects on the stage (`simPlaced`).
  - `moveObject()`, `removeObject()`, `updateParams()`: Manipulates placed items.
  - `clearPad()`, `undo()`: Flushes the pad or steps backward through stamp deltas.
  - `sceneGet()`, `sceneRestore()`: Exports/restores deterministic `scene.json` documents.
- `simPlaced` tracks metadata (`id`, `kind`, `label`, `params`, `x`, `z`, `side`, `stampIdx`).
- `simStamps` records exact voxel cell diffs (`x`, `y`, `z`, `prev`, `next`) for deterministic undo and rebuild-skip replay (`simRebuildSkip`).

### B. Chunk Meshing & WebWorker Pipeline
- **Main-Thread vs Worker Meshing:**
  - `src/game/engine/chunkMesh.ts`: Main-thread greedy mesh builder.
  - `src/game/engine/meshWorker.ts`: Pure zero-copy chunk mesh builder generating raw `Float32Array` (`pos`, `norm`, `uv`, `col`) and `Uint32Array` (`idx`) transferable buffers.
- **Spawn Area Meshing Invariant:**
  - `buildSpawnArea()` must call `buildMesh(mcx, mcz, 0)` synchronously (`sliceMs = 0`). Micro-slicing during boot risks stalling unmeshed chunks behind the 1-FPS idle gate.

### C. 1-FPS Idle Engine Gate (`uiPaused`)
- When any modal is open (`menuOpen`, `pauseOpen`, `titleScreenOpen`, `worldSelectOpen`, `dead`) or when the browser tab is hidden, `s.uiPaused` is set to `true`.
- The `requestAnimationFrame` loop is cancelled, and the engine polls at a 1-second interval (`idleTimer`), reducing CPU utilization to near $0\%$.
- When joining a world or closing menus, `handleEnter()` must explicitly reset `s.uiPaused = false` to resume active 60/120Hz rendering.

---

## 🔍 3. Root-Cause Autopsies & Lessons Learned

### A. Chunk Meshing Stall on `:PROD`
- **Symptom:** World loaded with 0 visible chunks after clicking "Join World".
- **Cause:** `buildMesh` was called with `sliceMs = 1.5` during spawn generation. Chunks that exceeded 1.5 ms were pushed into `s.meshResume`. Because the world select modal had put the engine into `uiPaused = true`, the render loop was sleeping and never drained `s.meshResume`.
- **Solution:** Spawn chunk meshing uses `sliceMs = 0` (synchronous completion), and `rebuildAndSpawnWorld` explicitly clears `uiPaused` and triggers `rescan()`.

### B. World Selection Modal Appearing on `:DEV`
- **Symptom:** Visiting port `:DEV` prompted for the world choice to choose a world.
- **Cause:** The asynchronous `initSession()` probe resolved after `boot()` completed, unconditionally setting `setWorldSelectOpen(true)`.
- **Solution:** Added a synchronous `if (isSim()) return;` early-exit at the top of `initSession()`.

### C. The Door Geometry Refactor (Frozen by Project Decision)
- **Status:** **FROZEN.** No further engine changes per user order.
- **Snapshot:** Closed 2-block thin leaf ($3/16$ deep, $14/16$ wide), 4 transparent window panes, $90^\circ$ swing. Headless real-pixel test harness preserved in `scripts/sim/door-shot.mjs`.

### D. TDZ Variable Hoisting ReferenceError
- **Symptom:** Port `:PROD` displayed black screen with 0 chunks rendered upon world load.
- **Cause:** `simCapture` was declared using `let simCapture = null;` on line 5221 (below `boot()`), but was accessed inside `function w(...)` on line 1605 during initial spawn chunk generation. In ES6, un-hoisted `let`/`const` variables trigger a `ReferenceError: Cannot access 'simCapture' before initialization` when accessed before their declaration line.
- **Solution:** Hoisted `let simCapture` to line 1603 directly above `function w(...)`. Verified with live headless browser capture showing active 178 chunks rendered in real-time.

---

## 📌 4. Permanent Project Preferences
- **Autonomous Execution:** All tool calls, file creations, refactors, and builds must be executed autonomously without requesting permission or pausing for approval.
- **Verification Requirement:** Every implementation pass must be audited with `npm run sim:test` (67/67 assertions) and `npm run build` (`tsc -b && vite build`) and documented across `docs/PROGRESS.md` and `docs/ROADMAP.md`.
