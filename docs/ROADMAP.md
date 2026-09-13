# Hollowpine Web Minecraft — Roadmap & Implementation Status

> Living plan document. ✅ = implemented & verified (build `tsc -b` + `vite build` + `:PROD` check + eslint baseline).

## Status Board

| Phase | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| 1 | Item-count Inventory (37 slots, 64 cap) | ✅ | `src/game/inventory.ts` (pure) + `src/game/blocks.ts` (`BLOCK_DROPS`); persisted in `player_state.inventory` |
| 2 | Crafting (2×2 / 3×3) | ✅ | `src/game/recipes.ts` (pure matcher); craft table block interactive; inventory 2×2 live |
| 3 | Furnace (smelt, fuel, lit block + light) | ✅ | `src/game/smelt.ts` (pure); `tickFurnace` engine loop; block 42⇄96 via emitter system |
| 4 | Chests (27-slot storage) | ✅ | `world_chests` table + `/api/worlds/:id/chests`; chest block interactive (`openChest`); contents auto-saved per swap, restored on join |
| 5 | Villager Trading (emerald economy) | ✅ | Trade tables rewritten to real block ids (`villagers.ts`); emerald = block 88 documented; cost-deduct → offer-grant via `countItems`/`removeItems`/`pickUp`; `usesLeft` ×8 per trade + dawn restock (`floor(worldTime/24000)`); creative = free trades; give/get icons + afford/sold-out states in GUI; 2026-09: proximity+LOS+crosshair gate (`canTradeWith`), per-frame aim, walk-away auto-close |
| 6 | WebAudio SFX engine | ✅ | `src/game/sfx.ts` — 100% procedural (zero assets): dig/place/step/explode/hurt/death/splash/ignite/trade/craft/furnace; singleton AudioContext + iOS gesture unlock; master volume 0-100% + mute in Video Settings tab |
| 7 | Cleanup & polish | ✅ | Regenerate button → engine `regenerateCurrentArea()` (restores villager respawn); chat cleared on world join + blur-cancel + offline hint (`multiplayer.isConnected`); TNT explosion releases trapped liquids; README/info.md/FEATURES docs drift fixed. *Deferred: remote-avatar held-item sprite.* |
| 8 | Stretch | ⏳ | XP from mine/smelt + enchanting; death item drops w/ 5-min despawn; hostile mobs; hunger system (sprint gate ≤6, regen ≥18, starvation) |

## Refactor Plan — `Game.tsx` monolith **9,308 → 5,045 lines** (✅ major engine modularization done)

| Module | Target file | Status |
| :--- | :--- | :--- |
| State & voxel storage | `game/state/gameState.ts` · `game/world/chunkData.ts` | ✅ |
| Terrain & villages | `game/terrain/terrainGenerator.ts` (`createChunkGenerator`), `regionMutations`, `trees/structures/ocean` | ✅ |
| Meshing | `game/engine/chunkMesher.ts` · `meshPipeline.ts` · `meshWorker.ts` | ✅ |
| Streaming & horizon | `game/engine/chunkStreamer.ts` | ✅ |
| Cartography | `game/engine/worldMap.ts` | ✅ |
| Render loop | `game/engine/renderLoop.ts` (frame/hudSnapshot) | ✅ |
| Physics | `game/physics/playerPhysics.ts` (`stepPlayerPhysics`) | ✅ |
| Interaction | `game/interaction/playerInteraction.ts` (`placeBlock`) | ✅ |
| Entities/AI | `game/entities/villagerAI.ts` · `spawner` · `animals` | ✅ |
| Sim bridge | `sim/simDeckBridge.ts` · `simBridge.ts` · `sim/worldgen` | ✅ |
| React hooks (session/modals/input) + JSX polish | `src/components/hooks/*`, UI split | ⏳ next (Game.tsx → <800) |

Rules: `ui → game → three/services`; `game/` never imports React; gates per phase (`tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`, `node scripts/ci-perf.mjs --gate`).

## Builder Mode & Studio Studio — Future Roadmap (Top 10 Feature Pipeline)

| # | Feature | Planned Subsystem | Scope & Capabilities |
| :- | :--- | :--- | :--- |
| **B1** | **Blender-Style Orbit Camera** | `src/game/engine/orbitControls.ts` | `Alt + Drag` orbit around target, mouse-wheel zoom, middle-click pan, orthogonal top/side projection toggles. |
| **B2** | **3D In-Scene Transform Gizmos & Bounding Box** | `src/sim/gizmo.ts` | Render glowing wireframe box around selected placed object $(x_0,y_0,z_0) \to (x_1,y_1,z_1)$ with canvas translation arrows. |
| **B3** | **Region Box Selection & Blueprints** | `src/sim/blueprints.ts` | 2-click volume selection (Corner A $\to$ Corner B), save as custom `.blueprint`, stamp copies with rotation. |
| **B4** | **Voxel Sculpting Brushes** | `src/sim/brushes.ts` | Sphere, cylinder, cuboid, and plane terraforming brushes with adjustable radius ($1\text{m} - 8\text{m}$). |
| **B5** | **Eyedropper & Global Palette Swapper** | `src/sim/palette.ts` | 1-click material picker + global find-and-replace (e.g. Oak Planks $\to$ Crimson Planks across selected structure). |
| **B6** | **Lighting & Atmosphere Studio** | `src/sim/atmosphere.ts` | Live sliders for sun angle, ambient occlusion intensity, fog color/density, shadow bias, and rain toggle. |
| **B7** | **Kinematic & Entity Animation Sliders** | `src/sim/animControls.ts` | Interactive test sliders for chest opening ($0^\circ \to 90^\circ$), villager trades, and animal walking speeds. |
| **B8** | **Vertical $Y$-Slice Voxel X-Ray** | `src/sim/xray.ts` | Height scrubber that peels away roof layers above level $Y$ for interior floor-by-floor inspection. |
| **B9** | **Schematic & Sponge NBT Import/Export** | `src/sim/schematics.ts` | Compatibility with standard `.schem` and `.litematic` files for external Minecraft world builds. |
| **B10** | **Visual History Timeline (Undo/Redo Scrubber)** | `src/components/sim/SimDeck.tsx` | Time-travel timeline scrubber stepping through the session's stamp history. |

## Engine & Builder Mode Bug Audit Backlog

- [x] **Port DEV World Select Prompt**: Resolved via early-exit `isSim()` guard in `initSession()`.
- [x] **Port PROD Chunk Meshing Stall**: Resolved via `sliceMs = 0` synchronous spawn meshing and unpause on join.
- [ ] **Entity Mesh Orphan Cleanup**: Ensure `removeObject(id)` and `undo()` purge `THREE.Group` meshes from `s.scene` and dispose geometries when entity stamps are removed.
- [ ] **Spatial Emitter & Light Node Purge**: Explicitly clear `s.emitters` and `s.lanterns` when executing `clearPad()`.
- [ ] **3D Height Offset ($dy$) in `moveObject`**: Extend translation parameters to support vertical elevation and subterranean stacking.
- [ ] **Structure Orientation Preservation**: Retain cardinal `side` (`N`, `S`, `E`, `W`) across all `simRebuildSkip` transforms.

## Gameplay Systems — reference facts (Wikipedia-grounded)

- Day/night: 40 min full cycle (24000 ticks at 1×).
- Survival: health 20 HP/10 hearts; armor mitigates attacks.
- Hunger (Phase 8): ≤6 → no sprint; 0 → starvation; ≥18 → passive regen.
- Death: inventory drops at death (Phase 8 skip-toggle), respawn at spawn; drops despawn 5 min.
- Crafting: 2×2 inventory / 3×3 crafting table (already implemented per article caption).
- Furnace: cooks food & smelts ore; +XP from smelting (Phase 8).
- Trading: emeralds; villager professions; daily restock (Phase 5).
- Creative: infinite resources, no damage/hunger; flight toggle.

## Changelog (recent)

- 2026-09-04: **Stability + life + map + prefs bundle**: pet nether-wipe fixed (`world_animals` merge-by-id, dimension-aware + non-empty-guarded saves); villager trade gate (`canTradeWith`, HUD/per-frame aim, modal auto-close); farmer cow pens + `tending_cows` AI; stray cats (solitary explorers); world map overhaul (M toggle fix, 20 Hz minimap, cursor readout, right-click spawns, sidebar, per-user `/api/spawns`); touch-controls force-show pref (`user_preferences.touch_controls`, incl. prefs column-order fix) + hold-JUMP fly ascend; porch stairs `1205`/`1206` with rails (tile `890`); lit horizon/clouds, moon halo, sun +15%, ~10 s weather transitions; streaming upgrades (8 workers, mesh-first, fast-far meshing, keep+2). `sim:test` 145/145.
- 2026-08-24: **Phase 4 Shipped (Sim Polish, WebWorker Meshing, In-Browser Scenarios & 7-Group Catalog)**: Expanded simulation catalog with 7 categories (18 trees, 105+ blocks, 8 houses, 8 features, 5 mobs, 6 villagers, 7 entities) · interactive parameters inspector w/ live sliders & custom spawn · in-scene placed object tracker w/ ◀▶▲▼ coordinate offsets, rotation, & deletion · in-browser automated scenario runner (`SCENARIO_SUITES`) · scene JSON download/upload · WebWorker chunk meshing module (`src/game/engine/meshWorker.ts`) w/ transferable ArrayBuffers · `sim:test` 67/67 passing · build 0 errors.
- 2026-08-24: **Docs update pass — door work STOPPED on project decision.** Frozen door state in PROGRESS (closed 2-block thin leaf ✅ · 4 see-through panes ✅ · 90° open same design ✅ · one unresolved gray base quad, world-data verified clean, not resumed). Sim closed-loop harness exists (`scripts/sim/door-shot.mjs`: headless real-pixel renders → `snapshots/verify-*.jpg`; staged per `?simdoor=1`). Full autopsy + planned pixel-probe acceptance matrix in PROGRESS.
- 2026-08-23: **:PROD hardening + mob catalogue + real previews**: `uiPaused` gate excludes `loading` (idle can never stall world boot) · frame watchdog (5 s stall → auto-restart rAF) · `window.onerror` visible toasts (failures self-report) · **mobs**: `spawnHostileMobOf` extracted, `stampMob` bridge (zombie/creeper/skeleton/spider/all), sim tick enabled when mobs exist (live animation preview), 👾 Mobs tab · **real generated previews**: actual worldgen builders → mini voxel grid → isometric palette renderer — catalogue thumbnails now show the true object. `sim:test` 58/58.
- 2026-08-23: **SIM polish finale** — 60 s scene autosave + save-on-tab-hide with dev-DB ring trim (`pickAutoSceneIds keep 10`). **SIM PHASE COMPLETE** (sandbox, flat-pad, spawn-only, full catalogue, edit tools, scenes, admin infra, 56/56 harness). Next: gameplay backlog (buckets → food → enchanting → ambient/rain/redstone → death drops).
- 2026-08-23: **SIM edit-tools phase (plan §33.3)**: placed-object registry (`simPlaced`) + **`simRunKind`** shared dispatcher (spawn == edit path, no drift) + **`simRebuildSkip`** (remove-one-stamp with deterministic replay of the rest + re-indexing) · bridge `objects/removeObject/moveObject/updateParams` · SimDeck "**Edit placed (n)**" panel (◀▶▲▼ move, H−/H+, ✕ delete) + **keep-all** toggle (auto-undo single-specimen default off when unchecked). `sim:test` 56/56.
- 2026-08-23: **Spawn root-cause fix (plan Part 7)**: SimDeck `doSpawn` was stamping at literal (0,0) — now passes the real in-front anchor; `stampTree` now grounds on flat-pad y=64 (trees/houses were buried inside the stone plateau — the "invisible spawn") · **pad cleanup**: clouds hidden (creation + boot), boot `updateHorizonMesh` gated, fog tightened (near 20/far ≤90) · **spawn-only lockdown complete** (Q/E keys gated; mouse/hand/map/inventory already done). `sim:test` 56/56. Plan §31-33 = triage + reorg order.
- 2026-08-23: **SimDeck v3 (organization)**: map/cartography window now blocked in sim mode (render gate + M-key) · deck rewritten to the **type → item → spawn** flow: 4 type tabs (Trees/Blocks/Houses/Features) → dependent pickers (18 trees + oak sliders, all blocks, 8 houses + width + door-side, 8 features) → one big green **SPAWN** button (6 blocks in front of player) · collapse toggle · UNDO/SAVE/LOAD/REGEN bar. `sim:test` 30/30.
- 2026-08-23: **SIM UX rework (user feedback)**: sim deck now shows on `?sim=1` even before admin-ok (NO-ADMIN? chip) · relative `/api/sim/access` probe (fixes localhost↔127.0.0.1 cookie host mismatch) · **wildlife gated off sim** (`spawnInitialWildlife` was leaking animals into the pad) · **full tree catalogue: 18 rows** (every tree type + variations incl. giant-oak layers, mushroom red/brown, snowy spruce) with dropdown + oak sliders · **spawnFront(6)** anchor — every spawn button now drops the item 6 blocks in front of the player. `sim:test` 30/30.
- 2026-08-23: **SIM M5 — scene persistence + goldens (SIM phase complete)**: pure `sim/scenes.ts` (SceneDoc w/ per-cell prev+next, validate, ring-trim) · bridge `sceneGet`/`sceneRestore` (wipe → deterministic replay → emitters → sliced remesh) · SimDeck **SAVE SCENE / LOAD LATEST** via admin-gated `/api/sim/scenes` (dev DB) · golden regression `basic.golden.json` + scene roundtrip tests → **sim:test 29/29**.
- 2026-08-23: **SIM minimalism + Blocks catalogue**: sim mode now silences villagers/mobs/horizon-LOD/minimap (no characters, no distant horizon, no map); HUD hidden in sim (canvas + SimDeck only; load veil standalone) · **Blocks catalogue** — live BLOCK_MAP projection `blocksPickList()` + `stampBlock(id,x,z)` + «SPAWN BLOCK» selector in SimDeck (every block placeable on the flat pad). `sim:test` 17/17.
- 2026-08-23: **SIM M3 + Flat-Pad shipped**: `?sim=1&flat=1` — flat grass stage only (stone+grass y=64, no worldgen, render 4, spawn center) with single-specimen catalogue placement at pad center (auto-undo previous) · **writer routing fix** — engine `w()` is chunk-window-bound; added `simCapture` hook so worldgen builders (houses/wells/lamps) stamp across chunks correctly · bridge `stampStructure` (8 house styles via real `generateHouseStructure`, width param), `stampWell`, `stampLamp` · SimDeck Structures panel (style select + width slider + HOUSE/WELL/LAMP). Plan spec §7.2 added. `sim:test` 17/17.
- 2026-08-23: **SIM M2 shipped**: green oak extracted to `trees.ts` as `generateOakTree(opts height/layers/leaf)` (worldgen defaults byte-identical) · tree catalogue (`src/sim/catalog.ts`, oak/cherry/maple + params schemas) · `__sim.api.stampTree` (voxel-recorded tree stamping) · SimDeck tree panel (kind + height/layers sliders + live PLACE) · drift guards in `sim:test` (17/17) · **M1 infra final**: nginx :DEV public entry applied (sites-enabled, verified 200/401), sim.js internal :SIM-API as **systemd unit** `hollowpine-sim.service` (persistent), health via :DEV OK.
- 2026-08-23: **SIM M1 shipped** (data first — docs/PROGRESS.md): `server/sim.js` admin-only sim API on :DEV (cookie→`/api/auth/me` proxy; never opens prod DB — sql.js correction recorded) · `<dev-db>` (scenes/stamps/admin_log/run_results) · `?sim=1` sandbox world (`<sim-world-id>`, URL seed, prod IO fully short-circuited) · S1 **stamp/undo** primitive + `window.__sim` bridge · SimDeck M1 overlay (admin-gated) · `npm run sim:test` harness (tsx; 14/14) **caught real XP formula bug — totals now exact (L30=1395)** · nginx DEV block prepared (user applies) · .gitignore hygiene.
- 2026-08-23: **UI/IDLE pass 2** (docs/UI_IDLE_PAUSE_PLAN.md + BEDROCK_UI_RECREATION_PLAN.md): **Esc pause menu** overlay (resume/options/statistics/save-quit + icon row + player preview) · **1-FPS idle gate** — uiPaused cancels rAF & polls at 1s (menu/modals/title/death/hidden-tab), world freezes · **pointer-lock** state machine + Esc-unlock→pause parity + `unadjustedMovement` · **BootScreen** (dark pixel boot, original blocky wordmark + 5-step spinner + teal bar + green %), **LoadingOverlay** (Bedrock-style dialog, dither body, original tips, green marching bar), **Settings restyle** to Bedrock 3-region layout (header strip, grouped sidebar, content pane, green segments via .be-* classes), menu SFX (click/hover/tick/boot/tab-switch). Original procedural font/wordmark/tips (no copied assets). Note: canvas keeps last frame → frozen-world backdrop behind pause is free.
- 2026-08-23: **Gameplay-authenticity pass 1** (docs/GAMEPLAY_POLISH_SPEC.md): block-break/place **particles** w/ atlas colors + 10-stage **mining cracks** + target **outline** + **hold-to-mine** (material hold-times, 5×/25× underwater) · **XP system** (wiki orb tiers 1…2477, level curve to 30, magnet orbs, HUD bar, ore/smelt XP, level-up SFX) · **hunger core** (exhaustion model, sprint gate ≤6, regen ≥18, starvation, dynamic 🍗 HUD) · underwater **−10° FOV** + mining penalty · **sneak** (X) + **180° look** (Y) + **middle-mouse pick-block** · chest/door **SFX** ✓ autosave toast · **BUGFIX: world-gen ore ids were Chest/TNT/Glowstone/Lamps — now real ores (30-36)**.
- 2026-08-22: Phase 1 Inventory ✅, Phase 2 Crafting ✅, Phase 3 Furnace ✅, Phase 4 Chests ✅, Phase 5 Trading ✅, Phase 6 Audio ✅, Phase 7 Cleanup ✅, R1+R2 module split ✅, texture-atlas improvement pass (grass/stone/cobble/planks/water vs Minecraft Wiki refs).
