# Known Issues — future task queue (reported 2026-08-27)

Prioritized list of gameplay/visual issues to fix in upcoming autonomous sessions.
Rules for each: repro → fix → machine-gate (`npm run ci:perf` + relevant smoke) → commit `fix(game): …`.

---

# Unimplemented plans (repo-wide backlog audit, 2026-08-27)

Sources audited: `PERFORMANCE_INVESTIGATION.md §6`, `TEXTURE_FIX_PLAN.md §Phase 2/4`,
`EAGLERCRAFT_SMOOTHNESS_PLAN.md` + `AUTONOMY_STATE.md`, `ROADMAP.md B-series`, `GAMEPLAY_POLISH_SPEC.md`,
`BROWSER_MC_FEASIBILITY.md §5`. Done-tracked items (D/E/G/H, L0/L3/L4/L6/L7/L8, dead-code cleanup, chest tile,
celestial): marked ✅ — rest = open.

| # | Plan item | Source | Status | Files / targets |
|---|---|---|---|---|
| U1 | **L2 light baking** (4-bit sky+block light at gen; bake into vertex colors) — **largely DONE 2026-09-04** (`lightField.ts` BFS + `bakedLight.ts` shader; point-light pool kept by design) | EAGLERCRAFT_SMOOTHNESS L2 | partial | `src/game/engine/lightField.ts`, `src/game/engine/bakedLight.ts`, `chunkMesh.ts` r/g/b vertex colors, `specular.ts` sky gate; see `kb/mechanics/baked-lighting.md` |
| U2 | **L5 mipmapped 1024² padded atlas** (1-px pad cells, `NearestMipmapNearest`, anisotropy 2; same as P1-I) | PERFORMANCE §6-I / L5 | open | `catalog/buildMasterAtlas.js` (cell stride 32), `atlas.ts`, `sampleAtlasColor` offsets; safe `--atlas-only` chain |
| U3 | **L1 greedy meshing trace** (checker/gray-slab artifact; −41% tris proven 110k→65k) | EAGLERCRAFT L1 | parked | `meshWorker.ts` (flag `USE_GREEDY=false`), quad-dump probe; hypotheses in `AUTONOMY_STATE.md` |
| U4 | **Base64 → fetched assets** (2.5 MB thumbnails out of the 4.36 MB bundle; lazy `Map<number,Promise<string>>` + ObjectURL) | PERFORMANCE §6-J | open | `thumbnailsData.ts` split, `catalog/thumbnails`, `Game.tsx`/`InventoryModal.tsx`/`HUD.tsx` consumers |
| U5 | **meshWorker buffer reuse** (pre-size + pool typed arrays; today `number[]` intermediates + fresh allocs per chunk) | PERFORMANCE §6-K | open | `meshWorker.ts` scratch pool |
| U6 | **Stream priority tuning** (meshQ over genQ near player; hard 1-mesh/2-frames cap at meshQ>30) | PERFORMANCE §6-L | open | `Game.tsx` `stream()` |
| U7 | ~~**Duplicate ids 700–710 fix**~~ → done via `catalog/patchRegistryIds.mjs` (items renumbered 700-710→1163-1173, blocks re-tiled, `isItemOnly` de-magicked) | PERFORMANCE §6-N | ✅ done | `catalog/patchRegistryIds.mjs` + generator root-cause fixes |
| U8 | **Telemetry additions** (`phaseStart("meshTotal")`; `renderer.info.memory` + `info.programs` in PULSE) | PERFORMANCE §6-O | open | `Game.tsx` perf calls, `telemetry.ts` PULSE ctx |
| U9 | **Atlas rebake rework — kill legacy pinned slots** (deterministic per-file unique assignment, collision asserts) | TEXTURE_FIX Phase 2 | open (do NOT run casually) | `buildMasterAtlas.js` + `textureCheck.mjs` asserts |
| U10 | **Missing-name policy** (`unmatchedBlocks.json` warning list; no silent stone/grass fallback) | TEXTURE_FIX Phase 2.4 | open | `buildMasterAtlas.js` |
| U11 | **PNG source guard** (width==16 assert; animated first-frame crop logging; suspicious frames {prismarine, magma, lantern, seagrass}) | TEXTURE_FIX Phase 2.5 | open | `buildMasterAtlas.js` |
| U12 | **Special-tiles region for per-wood door slats** (dedicated tile slots for models; chest done via entity-crop) | TEXTURE_FIX Phase 2.3 | open | `buildMasterAtlas.js` custom tiles |
| U13 | **`--extend-1.20` texture pack** (cherry 109/119, pink petals 123 real textures; placeholders documented) | TEXTURE_FIX Phase 2.6 | open | `scripts/download-catalog-textures.mjs` + bake |
| U14 | **Animated water/lava (2-frame shader)** (uTime-based frame scroll on slots 11/77) | TEXTURE_FIX Phase 4 polish | open | shader on `atlas`/material |
| U15 | **Block model-JSON loader** — full plan §U15 (vanilla blockstates/models JSON → generated recipes → mesher; Eaglercraft parity item) | BROWSER_MC_FEASIBILITY §5.2 | open (planned M1–M5) | fetch-models + `importBlockModels.mjs` → `src/game/engine/blockModels.ts`, `modelMesher.ts`, worker/mesher dispatch, audit regen |
| U16 | **Mob/chest contact-shadow blobs** (when sun shadows are off on mobile) | EAGLERCRAFT L8 note | open | `Game.tsx` decal pass + `animals.ts` hook |
| U17 | **Autonomous final report** (`AGENT_REPORT_EAGLERCRAFT_SMOOTH.md` auto-generation) | EAGLERCRAFT §Phase 5 | open | `scripts/metrics.mjs` renderer |
| U18 | **B1 Blender-style orbit camera** (alt-drag orbit/zoom/pan, top/side ortho toggles) | ROADMAP B1 | open (file `orbitControls.ts` missing) | `src/game/engine/orbitControls.ts` |
| U19 | **B2 In-scene transform gizmos + selection box** (wireframe box + translation arrows) | ROADMAP B2 | open (`gizmo.ts` missing) | `src/sim/gizmo.ts` |
| U20 | **B3 Region box selection & custom blueprints** | ROADMAP B3 | partial (area-select + blueprint API exist; view-edit-rotate import polish) | `src/sim/blueprints*`, `SimDeck` |
| U21 | **B4 Voxel sculpting brushes** (sphere/cylinder/cuboid/plane, r 1–8 m) | ROADMAP B4 | open (`brushes.ts` missing) | `src/sim/brushes.ts` |
| U22 | **B5 Eyedropper + palette swapper** (1-click pick, global find/replace material) | ROADMAP B5 | open (`palette.ts` missing) | `src/sim/palette.ts` |
| U23 | **B6 Lighting & Atmosphere Studio** (sun angle, AO intensity, fog, shadow bias, rain toggle) | ROADMAP B6 | open (`atmosphere.ts` MISSING — confirmed) | `src/sim/atmosphere.ts` |
| U24 | **B7 Kinematic animation sliders** (chest 0–90°, villager trade, animal speeds) | ROADMAP B7 | open | `src/sim/animControls.ts` |
| U25 | **B8 Y-slice voxel X-ray scrubber** | ROADMAP B8 | open | `src/sim/xray.ts` |
| U26 | **B9 Schematic/NBT import-export** (`.schem`, `.litematic`) | ROADMAP B9 | open | `src/sim/schematics.ts` |
| U27 | **B10 Visual history timeline scrubber** | ROADMAP B10 | open (SimDeck has undo/stamps only) | `src/components/sim/SimDeck.tsx` |
| U28 | **Gameplay polish backlog per spec order** (next: #2 food eating; subsequent items in spec) | GAMEPLAY_POLISH_SPEC | open | follow `docs/GAMEPLAY_POLISH_SPEC.md` item list |

**Priority suggestion for next sessions:** U1 (light bake — biggest visual/perf win) → U2 (mipmap atlas) → U3 (L1 trace) → U6/U5 (stream/buffers) → U9–U13 (texture gen hardening) → U15 (models) → U4/U14 → B-series studio tools (U18–U27, mostly independent UI/sim work) → U28.

---

## U29 — "Vintage Mode": fixed 1.5.2 inventory, identical to Eaglercraft (new task, 2026-08-27)

**User concept:** Eaglercraft only ships Minecraft **1.5.2** — which has a *small fixed* item set. That limitation actually feels good/vanilla. Task: inspect Eaglercraft's item set and offer it as a **fixed-amount inventory mode** for this game (a curated "vintage" catalog).

**Facts (verified research):**
- 1.5.2 is **pre-flattening**: blocks/items are numeric IDs + metadata (wool colors, planks, logs are sub-ids). Creative inventory order was *fixed by numeric ID* before 1.13 (wiki "Creative inventory historical layouts" confirms).
- Exact machine-readable source: **PrismarineJS `minecraft-data` → `data/pc/1.5.2/`**: `blocks.json` + `items.json` (numeric IDs/names/metadata) and `recipes.json` — the same ecosystem as our asset packs. Cross-check list = Eaglercraft's client assets.
- 1.5.2 total registry: blocks (id 1–~215) + items (~256–390ish) + metadata variants — exact counts derived at implementation time from the data files (auto-derived, no hand counts).

**Work units (each = one autonomous cycle):**
1. **V1 fetch+generate:** `catalog/fetchVintageData.mjs` pulls `pc/1.5.2 blocks+items` JSON → emits `catalog/vintageItems.json` `{ numericId, metadata?, mcName, ourBlockId? }` mapping each 1.5.2 id onto our 1.19.3 registry by name equivalence (e.g. `wool:0–15` → our wool ids; `planks:0–5` wooden types).
2. **V2 mode toggle:** `vintage: boolean` state (+settings toggle "Vintage inventory"); when ON: creative tabs/hotbar/sim block list show the mapped vintage set only; placement & crafting gates use mapped ids (block-placement semantics via existing `isItemOnly` etc.). All 1.19-only blocks invisible (kept in engine, just hidden in vintage UI).
3. **V3 gameplay parity:** recipes subset from `pc/1.5.2 recipes.json` (closest-name automapping); tools/armor set = 1.5.2 tiers (wood–diamond); block behaviors that exist in 1.19 stay (bed/torch/etc.).
4. **V4 gates:** vintage-mode snapshot test: inventory count == expected set count (from data), zero 1.19-only ids visible, sim:test green, hotbar/screenshots logged in `snapshots/vintage-*`.

**Acceptance (machine):** `npm run ci:perf` + a new `test-vintage.mjs` asserting: (a) vintage set count equals data-derived count, (b) every visible catalog id is in the mapping, (c) legacy 1.5.2 metadata variants all map (no nulls), (d) no crash on switching mode mid-session. **Research done enough; extra online research still useful at V1 if `minecraft-data` lacks 1.5.2 metadata variants** (fallback: wiki "Java Edition 1.5.2" item table → manual alias table).

---

## U15 — Vanilla block model-JSON loader (fleshed-out plan)

**Context (Eaglercraft comparison):** the vanilla game stores *every* block's geometry as **data** — `assets/minecraft/blockstates/*.json` + `models/block/*.json` (parent-inherited JSON: element boxes in 16ths, per-face texture slots, UV rects, rotations, `"uv"`/`"cull"` faces, `"shade"`, `tintindex`, AO flags, variant/multipart selection). Eaglercraft inherits this for free; **we hardcode ~15 hand-made shapes** in `chunkMesh.ts` (cube, stairs, door, trapdoor, chest, fence, cross-billboard, decals, torch/lantern/rod/portal/ladder/bed, ladder, specials) — which is why rails, chains, walls, panes, signs, pipes, buttons, coral species, torches-on-walls, crops, vines, hoppers, catwalks… still render as rough cubes. A model-JSON loader makes in-world visuals match the wiki renders per-block (and closes most of the remaining "shape nuance" list).

**Data source (verified):** `PrismarineJS/minecraft-assets` (rom1504) ships per-version packs incl. 1.19.1/1.19.3 with the JSON model tree (`blockstates`, `models/block`, `models/item`) alongside textures — same pack family our `catalog/textures` came from. Fetch script: `scripts/download-catalog-textures.mjs` extended with a `--models` flag (or a sibling `fetch-models.mjs`).

### Work units (each = one autonomous cycle)
1. **M1 ingestion:** fetch 1.19.3 `blockstates` + `models`; write `catalog/importBlockModels.mjs` → emits `src/game/engine/blockModels.ts`: per block id → list of "template recipes" resolved at *build time*: `{ boxes: [{from[16ths], to[16ths], faces: {dir: {uv, tile, cull, ao}}}] }` after parent chaining/rotation baking; plus `usedTextures` set for atlas slot resolution (reuse existing `textureTileMap.json`).
2. **M2 mesher core:** `src/game/engine/modelMesher.ts` — emit a model recipe into the packed vertex buffers (same u8/u16 format, same atlas math). Handles: `elements` 6-face boxes with `uv` rects (16ths → texel windows into the tile), `shade` per face (matches our AO multiplier), `tintindex` (leave 1.0 — biome tinting is later), `ao` flag (skip AO corners when `ao:false`: glass/water-ish), rotation `x/y` baking at import time.
3. **M3 worker + main-thread parity:** worker mesher uses `BLOCK_MODELS[id]` when present (else falls back to current custom shapes); the main-thread fallback path mirrors (or shares) it. Keep hand-made shapes as **overrides** for: doors, beds, chest, fences, torches/lantern/rods/portal (want crisp custom look + existing sim behavior), & cross-billboards (foliage/flowers) — everything else flips to JSON recipes.
4. **M4 states/variants:** `blockstates` variant picking — minimal first: pick deterministic first variant or weight by properties we track (facing/stairs via `s.blockDirs`, open/closed doors via ids already handled) → phase 2 support multipart (rails, fences, chains) via emission of multiple boxes.
5. **M5 gates & audit:** regenerate `docs/BLOCK_VISUAL_AUDIT.md` (per-block captures) — after M-mods, each block's signature derived from its JSON recipe; assert per-block risa profile (box-count vs FFF) & flag any `models` entry with unresolved texture slot (missing in atlas) for the missing-file list; `npm run ci:perf` (goldens must stay ≤ threshold — changes ONLY on whites for covered blocks via REBASELINE reasoning), `sim:test` green.

### Effort estimate
~5 cycles (M1 ≈1, M2 ≈1.5, M3 ≈1, M4 ≈0.5, M5 ≈1) with sub-session checkpoints; biggest risk = atlas UV mapping from 16ths & culling parity (mitigate: per-model diff harness that renders LOD vs recipe box-sum count).

### Acceptance
- Place a row of previously-wrong shapes (rail, chain, spike, sign, wall, pane, coral, crop) → each shows the vanilla silhouette (verify against `TEXTURE_FIX_PLAN` per-block audit + wiki renders)
- No visual regressions at goldens for currently-correct cubes
- `BLOCK_MODELS` table stays generated (script-asserted, no hand-edits)

---

# Reported gameplay issues (from live play, 2026-08-27)

---

## 1. Pigs & chickens have no eyes (cow/sheep were fixed — extend to all mobs)  ✅ pig/chicken · 🟡 zombie/skeleton/creeper
- **Status:** FIXED for pig & chicken (commit `e4e1e48`; eyes present `animals.ts:239-250` pig, `:320-327` chicken). REMAINING: zombie & skeleton meshes have no eyes, creeper only a solid face plate — see `src/game/entities/mobs.ts`.
- **Files:** `src/game/entities/animals.ts` (`createPigMesh`, `createChickenMesh`; cow/sheep done in v0.1.116 pattern: white base + black pupil / bead eyes on head front face).
- **Acceptance:** face-on capture of pig & chicken shows visible eyes riding the head group (blink/head anims included). Mirror the existing cow/sheep eye code; chicken = tiny black bead square on beak-line; pig = white+brown pupil like cow.
- Extend check to all mobs (zombie/skeleton/creeper faces — check `src/game/entities/mobs.ts`) and villager avatars.

## 2. Clouds follow the player (absolute-position bug) ✅
- **Status:** FIXED (commit `e4e1e48`). `Game.tsx:5532-5534` now drifts in pure world space (`driftX`/`driftZ` are time-derived only, no player anchor).
- **Symptom:** clouds move with the player — walking close to them shifts their world position; they must drift on their own across the sky.
- **Cause:** `Game.tsx` frame loop:
  ```ts
  s.clouds.position.set(p.x + driftX, 136, p.z);  // ← anchored to player each frame
  ```
- **Fix:** clouds get their **own persistent world position** (origin constant, e.g. `(0,136,0)`), drift computed in world space:
  ```ts
  s.clouds.position.set(driftX, 136, 0);   // driftX modulo totalSpan only
  ```
  (plus keep a slow world-z drift if desired). Player no longer carries them. Verify by teleporting 50 blocks: clouds stay put.
- File: `src/components/Game.tsx` (cloud section), `src/game/visuals.ts` `makeClouds` (mesh is already world-space; only the anchor needs correcting).

## 3. Animal wander & terrain interaction 🟡 (implemented + cliff-edge sense, ungated)
- **Status:** IMPLEMENTED (commit `3725e1f` + cliff-edge). `spawner.ts` has random-walk, herd attraction, voxel collision, and now **cliff-edge sense** (`groundSafeAt`, `spawner.ts:354-369`) — animals never step where the landing ground is water/lava or a >1-block drop; 1-block descents onto solid land are allowed. Remaining: pig wading ≤0.3, water-edge approach, motion-SNR + 30 s approach acceptance tests.
- **Symptoms:**
  - animals cannot walk **towards each other** (no social/herd behavior)
  - animals cannot **walk through walls** — but also cannot *collide* correctly (they pass through some solids? verify; requirement: solid collision like the player, no wall clipping)
  - animals cannot **walk on water** (they float/sink? currently entirely avoid water — need: can't/swim behavior; fish etc. remain water mobs)
  - animals **can't go to the water at all** (wander is confined to land; they should periodically approach water if within wander radius)
  - wander follows **patterns** (e.g., oscillation lines, constant turning) — must be **truly random**: random-walk with random turn angles/rest pauses, no observable pattern; different speeds per species
- **Files:** `src/game/entities/spawner.ts` (`MobManager.update`), `src/game/entities/animals.ts` (meshes only)
- **Acceptance (coverage):**
  - two animals placed 5 blocks apart → within 30 s they approach ≤2.5 blocks at least once (herd attraction with per-agent probability)
  - wall test: glass wall between pen halves → no animal crosses or clips
  - pond edge test: cows stop at shoreline; pigs may wade ≤0.3 deep but never sink; targets water source within 3 blocks of shore sometimes (probability gate, warm-up 60 s)
  - randomness: motion SNR check — heading histogram across 120 s is flat (no fixed turning period); no two agents sync
- Implement small per-agent state machine: `idle (1-4 s) → pick random angle (gauss around current, ±120°) → walk 1-3 s → repeat`; separation force (repel if <1.2 m); wall collision via existing `getBlock` AABB test (reuse `collides()`-style logic); water check via `getBlock(id 39) as liquid flag: stop at shore, allow 1-block edge, no dive; villager same rules.

## 4. Villagers: stuck in blocks, sink 1 block, ghost-trading through walls 🟡 (majority implemented, ungated)
- **Status:** IN PROGRESS — ghost-trading fixed 2026-09-04: single `canTradeWith` gate (≤2.6 m + voxel DDA + crosshair raycast on the villager, `src/game/villagers.ts`) enforced on HUD Trade button (`HUD.tsx`, now driven by per-frame `aimedVillager`), right-click, mobile take and E (`Game.tsx`), plus modal auto-close on walk-away and "Aim + E to Trade" nameplates. Farmer `tending_cows` pen visits + fenced cow pens in village plans also landed (`buildPen`, `VillagePlan.pens`, `spawnSingleAnimal` calm cows tagged `pen:<village>:<idx>`). Remaining: villager↔animal separation, sampled voxel-occupancy gate over 60 s, and machine-gating.
- **Symptoms:**
  - villagers can become **stuck inside blocks** (walk-in geometry on world load / after structure placement)
  - they **sink ~1 block** vs player eye-line (feet embed into ground block)
  - they can **talk/trade across walls, animals, and other villagers** (no line-of-sight); also no collision vs animals/walls (walk through fences/houses)
- **Files:** `src/game/villagers.ts` (wander/AI + `stepVillagers` in `Game.tsx`), `src/game/entities/spawner.ts`
- **Acceptance:**
  - villager feet rest exactly ON block top (y_position integer + settle − test on stairs/grass/snow)
  - after spawning a house/structure, villagers never intersect solid voxels (assert via sampled positions over 60 s — voxel occupancy check)
  - trading prompt (E) requires: raycast LOS hit is the villager itself (no occluder), distance ≤2.5 m, no other mob/villager between; attach villager-to-villager separation (same separation force as §3)
- Implementation notes: villager AABB uses same `collides(x,y,z)` style; after pathing, snap y to surface +0 (like mobs); LOS via `raycast` between eyes, excluding self; block-stepping allowed (like player step 0.5).

## 5. Moon sometimes not visible ✅
- **Status:** FIXED (commit `e4e1e48`). Opacity floor raised to `(moonDir.y + 0.35) / 0.5` at `Game.tsx:5569`.
- **Symptom:** at night the moon box sometimes absent/invisible (sun fix in v0.1.115 made sun stable; moon shares `createCelestialTexture` tile 1 — the fade rule may hide it: `(s.moonBox.material).opacity = max(0,(moonDir.y+0.05)/0.25)` — at low moon elevation opacity → 0; plus clouds overlay).
- **Acceptance:** over a full night cycle the moon is visible ≥60% of the time (excluding cloud cover); capture-based check at `time=18000` shows visible moon.
- Probable fix: raise opacity floor (e.g. `(moonDir.y + 0.35)/0.5`) and renderOrder above clouds; verify `y + 0.05` sign/direction (moonDir=-sunDir usage correct? audit).

## 6. Missing "+6h / time controls" button next to the menu button ✅
- **Status:** FIXED (commit `e4e1e48`). `HUD.tsx:171-177,188-194` re-add ⏩ +6h; handler `Game.tsx:8076-8077` advances `s.time = (s.time + 6000) % 24000`.
- **Symptom:** the menu button cluster lost its time-skip (+6 h) control (present in earlier builds near the pause/menu button).
- **Files:** `src/components/gui/HUD.tsx` (menu button cluster) & `Game.tsx` handlers (`timeFlow`, `timeSpeed` setters already exist; expose `onFastForward` = `s.time = (s.time + 6000) % 24000`).
- **Acceptance:** pressing +6h advances world time by exactly 6000 ticks, sun/moon jump accordingly, works in both sim & prod HUD.

---

## Harness to run after each fix
`npm run ci:perf` + `npm run sim:test` + `node scripts/test-worker-meshing.mjs` + (mob/villager) manual CDP probe with screenshots into `snapshots/`.

---

# Code-level audit & plan extension (2026-08-27)

Verified every item above against the current tree (`main` @ `e3b3ae8` + uncommitted working-tree
changes). This section corrects stale statuses, pins each plan item to real code anchors, and adds
newly discovered items. **Working tree currently dirty** (`git status`): `spawner.ts`, `animals.ts`,
`Game.tsx` carry the issue #3/#4 fixes that are **not yet committed** and **not yet machine-gated**.

## A. U-series — current-code anchors & corrections

- **U1 (light bake) — largely DONE 2026-09-04 (partial):** baked sky+block light fields ship in
  `src/game/engine/lightField.ts` (3×3-chunk-window BFS, 0-15 levels, cached per chunk,
  invalidated on edits via `invalidateLightForEdit`); vertex colors now carry r=AO·shade,
  g=sky/15, b=block/15 (`chunkMesh.ts` pushFace/applyCellLight, `meshWorker.ts` pushFaceInto);
  the Lambert shader reconstructs light (`src/game/engine/bakedLight.ts`: sun gated on sky
  exposure, ambient scaled by `uSkyLight`, warm block-light term) and sun glint is gated on
  sky exposure (`specular.ts`). Caves are dark, torches/glowstone/lava propagate, day/night
  scales without remeshing. NOT done (kept intentionally): the 25-point-light pool (still
  provides smooth dynamic accents + held torch — the old "retire the pool" goal is dropped);
  per-emitter colored block light; incremental (vanilla-style) light updates.
  See `kb/mechanics/baked-lighting.md`.
- **U2 (mipmapped atlas) — correction:** atlas is **512²** (`atlas.ts:62-63`,
  `buildMasterAtlas.js:24`), `NearestFilter`, `generateMipmaps=false` (`atlas.ts:70-72`). Cells
  blitted at exact 16px stride with **no 1-px padding** (`blitTile`, `buildMasterAtlas.js:38-67`) —
  required before any mipmap/anisotropy upgrade.
- **U3 (greedy) — confirmed parked:** `meshWorker.ts:85` `USE_GREEDY=false`; full impl present
  (`:81-189`). Re-enable after checker/gray-slab trace (see `AUTONOMY_STATE.md`).
- **U4 (thumbnails out of bundle) — confirmed:** `thumbnailsData.ts` = **2,507,942 B** inline
  `PREBAKED_THUMBNAILS: Record<number,string>` (base64 data URIs). Consumed via
  `createTextureAtlas()` → `isoThumbnails: Map<number,string>` (`atlas.ts:90-99`) and read in
  `InventoryModal.tsx`, `HUD.tsx` (paperdoll), `VillagerTradeModal.tsx`, `CraftingModal.tsx`,
  `FurnaceModal.tsx`. Refactor = emit `catalog/thumbnails/*.png` + lazy
  `Map<number,Promise<string>>` (ObjectURL); all `<img src={isoThumbnails.get(id)}>` sites live in
  those 5 files.
- **U5 (buffer reuse) — confirmed open:** `meshWorker.ts:60-63` builds six `number[]` intermediates
  per chunk, packed fresh in `packBuffers` (`:271-288`). No scratch pool. Note `meshPool.ts` is the
  *worker-process* pool (not the requested typed-array pool); the request implies a new
  `ScratchBuffers` module inside the worker.
- **U6 (stream priority) — confirmed open:** `stream()` (`Game.tsx:2768-2797`) drains
  `meshResume → genQ → meshQ`; no mesh-over-gen reorder near player, no hard 1-mesh/2-frame cap.
  Budget from `dynamicBudget` (`:5236`): 1.5/2.5 ms active.
- **U7 (duplicate ids 700–710) — verbatim confirmed:** `blocks.ts:8454-8589` (colored/decoration:
  White Terracotta, White Tulip, Wither Rose, Yellow Candle/Concrete/Concrete Powder/Glazed
  Terracotta/Shulker Box/Stained Glass/Stained Glass Pane, Yellow Terracotta — all `side/top/bottom`
  fallback `3`=stone) **and** `blocks.ts:8591-8665` (items: Acacia Boat … Bamboo Chest Raft).
  `BLOCK_MAP` is built by `Map(BLOCKS.map(...))` (`blocks.ts:455`) → **last write wins**, so the 11
  colored block defs are lost and their names resolve to the item defs instead. Fix in
  `completeRegistry.json`, then regen.
- **U8 (telemetry) — confirmed open:** `telemetry.ts:58-60` `phaseStart()` takes no name and returns
  a bare timestamp; PULSE payload (`:143-161`) has no `renderer.info.memory`/`info.programs`.
  Extend `PerfFrameContext` + the Game.tsx `ctx()` provider (cf. `:5709-5710`).
- **U9 (atlas rebake — kill pinned slots):** `buildMasterAtlas.js:116-256` `canonicalMap` pins ~135
  legacy slots (0–145 frame). Deterministic (sorted `blockFiles` + sequential open-slot fill
  `:272-292`) but still pinned; no collision asserts.
- **U10 (missing-name policy) — confirmed absent:** no `unmatchedBlocks.json`; silent
  `?? 3` (stone) fallback at `buildMasterAtlas.js:420-422` is exactly the "silent stone fallback"
  the item forbids.
- **U11 (PNG guard) — confirmed absent:** no `width===16` assert, no animated first-frame logging in
  `buildMasterAtlas.js` / `textureCheck.mjs`.
- **U12 (door slat tiles):** `customTiles.json` currently `{chest, bed}` only
  (`buildMasterAtlas.js:337-361`); no per-wood door region.
- **U13 (`--extend-1.20`):** `scripts/download-catalog-textures.mjs` has no such flag; cherry leaves
  slot 110 and pink_petals 128 already pinned (`buildMasterAtlas.js:223,241`).
- **U14 (animated water/lava):** no `uTime`; atlas is a static `CanvasTexture`; liquids (39/40)
  meshed normally in `meshWorker.ts`.
- **U15 (model-JSON loader) — confirmed absent:** `chunkMesh.ts` + `meshWorker.ts` dispatch ~15 hard
  shapes (stairs/door/trapdoor/chest/cross/flat-decal/fence/torch/lantern/end-rod/amethyst/portal/
  brewing/ladder/bed, `meshWorker.ts:212-252`). No `blockModels.ts`, `modelMesher.ts`,
  `fetch-models` flag in `download-catalog-textures.mjs`.
- **U16 (contact-shadow blobs) — absent:** no decal pass hook in `animals.ts`/`Game.tsx`.
- **U17 (auto report):** `scripts/metrics.mjs` absent (present: `ci-perf.mjs`, `probe-*.mjs`).
- **U18–U27 (B-series studio): file existence verified.** Missing: `src/game/engine/orbitControls.ts`
  and `src/sim/{gizmo,brushes,palette,atmosphere,animControls,xray,schematics}.ts` — all confirmed
  absent. **U20 partial** confirmed: `src/game/blueprints/wand.ts` + `stampCustomBlueprint`
  (`structures.ts`, used `SimDeck.tsx:216-222`) + `undo` (`SimDeck.tsx:474-476`). **U22 correction:**
  *palette swapping already half-done* — `SimDeck.tsx:490-494` hardcodes 5 hotbar palettes
  (Medieval/Modern/Nature/Redstone/Clear) that call `api.setHotbar`; only the eyedropper +
  find/replace are missing (so U22 is *partial*, not "palette.ts missing = open"). **U27** timeline
  scrubber absent (only undo/stamps).
- **U28:** remain on `GAMEPLAY_POLISH_SPEC` order.
- **U29 (vintage):** no `fetchVintageData.mjs` or `test-vintage.mjs` yet — fully greenfield as specced.

## B. Newly discovered items

- **U30 — dead module `src/game/engine/workerPool.ts`** (32 lines: legacy Float32 `payload`
  interface + `payloadToGeometry`). Zero importers (grep-confirmed); superseded by `meshWorker.ts`
  (L3 packed u8/u16 format) + `meshPool.ts`. Safe removal, with a `tsc -b` gate.
- **U31 — point-light pool allocation mismatch. ✅ fixed** (`Game.tsx:2965-2973`, pool now 25 lights
  matching the highest `maxLights`). Distinct from U1 (which removes the pool entirely).
- **U32 — villager collision reuses the player AABB.** `stepVillagers` calls the player-sized
  `collides()` (`Game.tsx:3183-3211`, `PR`/`PH`) — the root cause of the "sink ~1 block" symptom
  (villager PH ≈1.9 vs player). The working-tree 5c ground re-scan mitigates; a dedicated villager
  AABB (mirror `spawner.ts` `aSolid`/`tryMoveTo`) is the clean fix.

## C. Progress log & next phase

Landed: **#1/#2/#5/#6** (`e4e1e48`), **#3/#4** (`3725e1f`), **#3 cliff-edge** (`spawner.ts`
`groundSafeAt`), **U7** (`patchRegistryIds.mjs` + generator root-cause), **U31** (25-light pool),
**U4** (thumbnails out of bundle → `public/catalog/thumbnails.json`; bundle 4.36 MB→1.86 MB raw /
2.45 MB→0.74 MB gz), **U21** (`src/sim/brushes.ts` + bridge `brushPaint`/`brushErase` + SimDeck
sculpt strip), **U18** (`src/game/engine/orbitControls.ts` + bridge `orbitEnable/orbitView` +
capture-phase alt-drag/wheel/shift-pan input + SimDeck orbit buttons), **U19** (`src/sim/gizmo.ts`
axis arrows anchored to the area selection), **U20** (areaMove nudge — selection block translation,
SimDeck Nudge buttons; area-select itself was already implemented).
Also: **world-time persistence fixes** (fresh `worldTime` from join response, normalized 0-23999,
`keepalive` fetch saves, explicit saves on world-select/quit-to-login, sun frozen while
inventory/menu/map are open).
Gated green: `tsc`, `vite build`, `sim:test` 71/71, `textureCheck` PASS.

Remaining (in order): **U2** (mipmapped padded atlas) → **U3** (greedy per-cell UV fix, then
golden-frame MAE gate) → **U1** (bake 4-bit sky/block light into vertex colors, retire point-light
pool) → **U9–U13** → **U15**. **U30** (delete dead `workerPool.ts`) and **U32** (dedicated villager
AABB) remain quick wins. U18 ortho toggles remain a follow-up (camera-type swap is unsafe while
`s.camera` is the raycast source — currently delivered as perspective axis presets).
