# Minecraft 1.19.3 Texture Application — Investigation, Fixes & Repair Plan

**Date:** 2026-08-26 · **Build:** v0.1.112 (includes hotfixes + this plan)
**Reported:** "I don't believe all 1400 are applied correctly — some render with no colors, the sun is a wood block."
**Methods:** raw atlas bitmap audit (px-level slot analysis), face-tile cross-check of every block in `src/game/blocks.ts` against `catalog/textureTileMap.json`, generator source review, live CDP canvas capture.

---

## 1. What was redacted — confirmed bugs (all now FIXED)

### 1.1 🟢 The "wood block sun" — `acacia_log_top`
- Sun: `Game.tsx` → `createVoxelCelestialBox(tex, scene, 79, 44)`; moon: tile `80`.
- In the OLD procedural atlas, slots 79/80 were hand-drawn sun/moon. The NEW master atlas **never re-bakes them** — the `canonicalMap` in `catalog/buildMasterAtlas.js` skips 79/80, so the alphabetical filler wrote:
  - slot **79 = `acacia_log_top.png`** → the sun is literally a wood block (✔ verified in the bitmap)
  - slot **80 = `acacia_sapling.png`** → the moon is a sapling
- **Fix (shipped):** dedicated `createCelestialTexture()` in `src/game/engine/atlas.ts` — a private 512² canvas laid out on the same 32-col grid (sun = tile 0, moon = tile 1), used only by the sun/moon cubes. Verified live: sun pixel `[255,229,60]`, moon `[232,232,224]` (see `scripts/test-sun-and-textures.mjs`).

### 1.2 🟢 Doors render as slime & sponge
- `pushDoor` hardcoded tiles **142/143**, and the master atlas assigns:
  - slot 142 = `slime_block.png`, slot 143 = `sponge.png` (canonicalMap really maps them there — 142/143 were custom "door slat" slots in the OLD procedural atlas only)
- **Fix:** `pushDoor` now uses **106 (`oak_door_top`, window frame) / 107 (`oak_door_bottom`, solid panel)** — the authentic door split. Trapdoor already used 108 ✓.

### 1.3 🟢 Chests render as acacia log / acacia door-top
- `pushChest` used tile 56; slot 56 = `acacia_log.png` (and slot 55 = `acacia_door_top.png`).
- Cause: `chest_side.png`/`chest_top.png` **do not exist in block/** — vanilla chest textures live in `textures/entity/chest/*.png` (64×64 entity sheet), so the canonical slots leaked to alphabetical filler.
- **Fix:** chest model now uses **oak planks (9)**; entity-sheet chest texture is a follow-up (see plan §3).

### 1.4 🟢 Block auto-assignment collisions ("no colors / wrong colors")
The generator's `cleanSnake` name-matching + legacy-slot retention produced wrong face tiles for a set of blocks. Verified at pixel level; fixed by `catalog/patchBlockTiles.mjs` (id → `textureTileMap` tile):

| id | Block | Was (wrong) | Now (right) |
|---|---|---|---|
| 43 | Chest | 55/56 (acacia door/log) | 9 (oak planks) |
| 109 | Cherry blossom leaves | 110 (activator rail!) | 8 (oak leaves placeholder, cherry = 1.20) |
| 119 | Cherry wood | 120/121 (log top/allium!) | 9 (oak planks placeholder) |
| 123 | Pink petal carpet | 128 (amethyst block!) | 620 (pink tulip placeholder) |
| 281 | Crimson | 323 (crimson door bottom!) | 122 (crimson_stem) |
| 410 | Hopper | 471/473 (hopper_top/inside) | 472 (hopper_outside) |
| 494 | Mushroom | 574 (mushroom_block_inside) | 575 (mushroom_stem) |
| 595 | Redstone Dust Overlay | **705 (fully-empty slot → black!)** | 702 (redstone_dust_dot) |
| 616 | Sculk Shrieker Inner | 731 (sculk!) | 744 (shrieker inner top) |
| 681 | Warped | (was door bottom) | 124 (warped_stem) |

Post-fix audit (see §4 tools): **0 EMPTY slots referenced** (before: 3 for Redstone Overlay). The only "BLACK" hits are `black_concrete.png` — legitimately black.

### 1.5 System-level causes (NOT yet fixed — need regeneration)
1. **Legacy slot model is the root poison.** `canonicalMap` pins hand-picked files to 0–145, but **6 entries point to files that don't exist in the 1.19.3 download**: `chest_side.png`(55), `chest_top.png`(56), `cherry_leaves.png`(110), `cherry_log.png`(120), `cherry_log_top.png`(121), `pink_petals.png`(128) — cherry/pink-petals are **1.20** textures! Every missing slot silently leaks to the alphabetical filler → **cross-block slot sharing** (same slot referenced by 2+ unrelated blocks): 55,56,110,120,121,128,142,143,144,145,705.
2. **`buildMasterAtlas.js` rewrites `src/game/blocks.ts` from a STALE template** — its template still contains the old `isSolid/isOpaque...` bodies and **would erase the v0.1.111 precomputed lookup tables** on the next regen. Never run `npm run build:textures` (= `catalog/buildAtlas.js`, an even older procedural generator) without warning.
3. **Anisotropic/source-size hazard:** 54 files are taller than 16 px (animated strips & assemblies e.g. `lantern.png` 16×48, `prismarine.png` 16×64, `water_still.png` 16×512, `seagrass.png` 16×288). `blitTile` crops the top-left 16×16 (frame 0) — visually acceptable, but a few (e.g. `prismarine.png` 16×64, `magma.png` 16×48) warrant a first-frame close look.
4. `textureTileMap.json` + atlas + blocks.ts are output of ONE generator run — any future regen must keep the three in lockstep **and** re-run the audit (§4) before shipping.
5. `public/textures/terrain_atlas_1_19_3.png` is a second, STALE atlas (256², different generator `buildExactTileAtlas.js`) referenced only by dead code `textureCatalog.ts` — confusion source.

---

## 2. State of the catalog (what is actually fine)
- **Glyph coverage:** 875/875 distinct block-pngs stitched; 925 tiles occupied of 1024 (some holes in 876+, unreferenced). Max referenced tile = 864.
- **Core world blocks verified correct:** grass (0/1/2), dirt(2), stone(3), cobble(4), sand(5), oak log/planks/leaves(6/7/8/9), glass(10), water(11), lava(77), ores (37–43), ice(21), snow(20), sugar cane… all face-tile checks OK on ids 0–140 with few exceptions above.
- **Thumbnails:** 1161/1162 ids have valid data-URIs (only Air=0 missing — intentional); no empty strings.
- **Water/lava rendering** uses tinted still frames — acceptable; animated flow is a future shader task.

---

## 3. Fix plan (ordered)

### Phase 1 — Hotfixes (DONE this session)
- Celestial texture for sun/moon · doors → 106/107 · chest → planks · `patchBlockTiles.mjs` 10-id correction · audit `EMPTY=0`.

### Phase 2 — Safe generator rework (recommended, ~half day)
Status: PARTIALLY DONE (2026-08-26):
- ✅ `buildMasterAtlas.js` now refuses to run without `--atlas-only` (guards blocks.ts from being clobbered — perf tables + corrections safe). Safe regenerable pipeline: `npm run build:textures` = `buildMasterAtlas.js --atlas-only → patchBlockTiles.mjs → patchBlockFlags.mjs → textureCheck.mjs`.
- ✅ `catalog/patchBlockTiles.mjs` / `catalog/patchBlockFlags.mjs` = the idempotent tile/flag layer (replaces the old "generator rewrites blocks.ts" flow).
- ✅ Stale duplicates removed: `buildExactTileAtlas.js`, `public/textures/terrain_atlas_1_19_3.png`, dead `textureCatalog.ts`.
- ⏳ Still open (needs a dedicated atlas REBAKE on a branch — do NOT run casually):
  1. Kill the legacy pinned slots (the actual atlas slice layout is unchanged since v0.1.110; current tiles verified correct by `textureCheck.mjs` — the rework only matters for FUTURE regens).
  2. Missing-name policy → `catalog/unmatchedBlocks.json` warning list.
  3. PNG source guard (width==16 assert; animated first-frame crop logging).
  4. 1.20 texture pack option (`--extend-1.20`) for cherry/pink petals; current placeholders documented.
  5. Special-tiles region for chest face (crop `entity/chest/normal.png`), per-wood door slats if ever needed.

### Phase 3 — Verification harness (CI-reusable)
- `catalog/auditTextures2.mjs` extended into `catalog/textureCheck.mjs` with **hard failures** for:
  - empty alpha+solid face referenced · double-occupancy slot cross-referenced by distinct blocks (whitelist e.g. our intentional aliases) ·
  - a block whose face tile's file is not part of its `textureFiles`/cleaned name (with the same fuzzy matcher — audited post-generator) ·
  - 16×16-with-alpha pixel check for foliage/glass classes.
- npm script `"audit:textures": "node catalog/textureCheck.mjs"` — run in `npm run build` pipeline (pre-commit).
- Visual A/B: `scripts/diag-canvas.mjs` at day/night + point camera at a chest & door placed via `__simWriteCell`; compare against reference shots in `docs/images/`.

### Phase 4 — Optional polish after regen
- Register sun/moon separately already done; consider MC-authentic **sun sprite** (circle w/ corner glow) vs square — looks intentional; keep square pixel-art (approved by the "wood block" removal).
- Animated water/lava (two-frame shader) note: static frames look fine but a uTime-based 2-frame scroll on `water/lava` buckets is a cheap win — separate task.
- `iconCache` thumbnails: 1161 fine.

---

## 4. Tools added (scripts)
| File | Purpose |
|---|---|
| `catalog/auditTextures.mjs` | slot-level audit vs older registry (diagnostic) |
| `catalog/auditTextures2.mjs` | **ground-truth audit vs `blocks.ts` + declared textureFiles** |
| `catalog/patchBlockTiles.mjs` | idempotent id→tile override patcher for `blocks.ts` |
| `scripts/test-worker-meshing.mjs` | worker meshing regressions (still passes) |
| `scripts/test-sun-and-textures.mjs` | celestial pixel + canvas capture test (PASS) |

## 5. Mobile QoL — X close buttons (DONE)
iPads have no Escape key, so every popup now has a big tappable ✕:
- **ChestModal** (was the only GUI without close affordance — its `onClose` was dead code),
- **InventoryModal** (header, right of search box),
- **PauseMenu** (✓ sim mode + prod mode; acts as Resume),
- Crafting/Furnace/VillagerTrade already had ✕ (they keep "✕ Close (Esc)" labels), BlueprintModal already had one.
All buttons call the same handlers as ESC (pointer-lock re-acquire included). Verified: build passes, worker smoke ✓.

---

## 6. First-32 block in-world verification (2026-08-26, requested change)

Method: `catalog/contactSheet.mjs` (raw atlas slot crops + per-slot stats) + `scripts/test-first32-in-world.mjs` (all 32 blocks placed row-wise on the flat sim pad via `__sim.api.stampRun`, day-lighting, canvas captured close-up from two angles).

Artifacts: `snapshots/tiles-check-32.png` (atlas side-tile contact sheet), `snapshots/first32-left.jpg` (ids 1–16), `snapshots/first32-right.jpg` (ids 17–32), `snapshots/first32-in-world.jpg` (overview).

### Verdict: ALL 32 appear normally ✅

| id | Block | side tile (file) | In-world | Notes |
|---|---|---|---|---|
| 1 | Grass block | 1 grass_block_side ✓ | ✓ | green cap + dirt side + AO ✓ |
| 2 | Dirt | 2 ✓ | ✓ | |
| 3 | Coarse dirt | 64 coarse_dirt ✓ | ✓ | |
| 4 | Podzol | 66 podzol_side ✓ | ✓ | tan top w/ needles side ✓ |
| 5 | Stone | 3 ✓ | ✓ | neutral gray (vanilla) |
| 6 | Cobblestone | 4 ✓ | ✓ | |
| 7 | Mossy cobblestone | 60 ✓ | ✓ | |
| 8 | Stone bricks | 19 ✓ | ✓ | |
| 9 | Smooth stone | 63 ✓ | ✓ | |
| 10 | Sand | 5 ✓ | ✓ | |
| 11 | Sandstone | 61/62 ✓ | ✓ | |
| 12 | Gravel | 24 ✓ | ✓ | |
| 13 | Clay | 67 ✓ | ✓ | |
| 14 | Bedrock | 35 ✓ | ✓ | |
| 15 | Obsidian | 36 ✓ | ✓ | dark purple-black ✓ |
| 16 | Oak log | 6 ✓ | ✓ | bark side + rings ✓ |
| 17 | Oak planks | 9 ✓ | ✓ | |
| 18 | Oak leaves | 8 ✓ | ✓ | alphaTest holes = intended |
| 19 | Birch log | 26 ✓ | ✓ | pale w/ speckles ✓ |
| 20 | Birch planks | 27 ✓ | ✓ | |
| 21 | Birch leaves | 28 ✓ (blitted) | ✓ | map-slot aliased 28↔117 (same file twice in canonicalMap — cosmetic only, texture correct) |
| 22 | Spruce log | 25 ✓ | ✓ | |
| 23 | Spruce planks | 29 ✓ | ✓ | |
| 24 | Spruce leaves | 23 ✓ | ✓ | |
| 25 | Jungle log | 30 ✓ | ✓ | |
| 26 | Jungle planks | 31 ✓ | ✓ | |
| 27 | Jungle leaves | 32 ✓ (blitted) | ✓ | same bool aliasing as 21 |
| 28 | Acacia planks | 33 ✓ | ✓ | |
| 29 | Dark oak planks | 34 ✓ | ✓ | |
| 30 | Coal ore | 37 ✓ | ✓ | |
| 31 | Iron ore | 38 ✓ | ✓ | |
| 32 | Gold ore | 39 ✓ | ✓ | |

Icons note: leaves show the intended see-through pattern (foliage material alphaTest 0.35, textured holes) — that's vanilla behavior, not a texture bug.
ids 33–64 name→file audit also correct (ores, glass, water/lava, crafting table/furnace/TNT/lantern/glowstone, wool, brick/snow/ice, netherrack/soul sand, purpur/prismarine…). Known intentional aliases: Dirt path (55) = dirt ✓ correct per vanilla; Chest (43) = oak planks placeholder; Cherry (109/119) = oak leaves/planks placeholders (1.20 textures).

### If you still see specific wrong blocks
1. Tell us the **exact block name** (e.g. from the tooltip / creative hover).
2. Then we capture a zoomed in-world screenshot for it; the audit already proves the *atlas* side is right for 0–64, so suspects concentrate on ids 65–140 (canonical pinned set, contains lantern(17 slot conflicts), amethyst(100), fire(105) — note **fire is cross-billboard** and **coral/sapling/flora use cross-billboards**) and ids 141+ (filler-set, collisions patched but some remain intentionally aliased).

---

## 6b. ids 65–114 verification (2026-08-26)

Method: same as §6 (`scripts/test-block-row.mjs 65 50…`, 5 close-up captures `snapshots/tex-65to114-{A..E}.jpg`).

### ✅ Correct (texture + render shape)
Wool 65–69 (yellow/green/black/purple/orange ✓), all stairs 70–79 (each uses its host texture ✓), redstone lamp lit/off 83/104 (orange glowing ✓), jack o'lantern 87 ✓, shroomlight 88 ✓, froglights 89–91 ✓, crying obsidian 93 ✓, beacon 94 (blue glow ✓), lit furnace 96 ✓ (front_on at slot 99), amethyst cluster 97 (translucent purple ✓), fire 102 (cross-billboard ✓), campfire 85 / soul campfire 86 (now `campfire_log_lit` / `soul_campfire_log_lit` ✓), brewing stand 103 (now `brewing_stand` — was torch!), cherry leaves 109 (oak placeholder — documented), bamboo stalk 113 ✓, jungle palm 114 ✓; **leaf placeholders fixed**: 110 crimson maple → dark oak leaves (116), 111 golden aspen → birch leaves (28), 112 warped violet → mangrove leaves (118). Fire/glowberry cross-billboard renders correctly.

### ⚠️ Texture correct — but SHAPE makes them look black/cube-broken (the "no colors" impression)
These are mostly-transparent sprite textures mapped onto a full 16³ cube, so most of the cube becomes dark/void pixels:

| id | block | opaque px/256 | Effect |
|---|---|---|---|
| 80 | Torch | 20 | near-black cube |
| 81 | Soul torch | 20 | near-black cube |
| 84 | Redstone torch | 26 | near-black cube |
| 82 | Soul lantern | 106 | dark-blue cube |
| 92 | End rod | 58 | sparse white-on-black cube |
| 95 | Conduit | 144 | dark navy cube |
| 100 | Glow lichen | 105 | dark patch cube |
| 98 | Nether portal | 256? | pale/odd cube (should be tall banner) |
| 46 | Lantern (earlier tier) | — | same class |

**Root-cause:** the mesher only knows ~8 shapes (full cube / stairs / doors / trapdoor / chest / fence / cross-billboard / flat decal) — everything else is a full cube. **FIXED (2026-08-26):** dedicated shapes shipped — torch / soul torch / redstone torch = thin 2-px posts (`pushTorchPost`), lantern / soul lantern = hanging cage (`pushLantern`), end rod = rod + caps (`pushEndRod`), amethyst cluster = 3-shard cluster (`pushAmethystCluster`), brewing stand = plinth + column + arms (`pushBrewingStand`), nether portal = thin double-sided panel (`pushPortalPanel`), glow lichen = floor decal, glow berries = cross-billboard — all wired in BOTH the main-thread mesher (`Game.tsx`) and the worker mesher (`meshWorker.ts`, full parity). Their blocked-flag `trans: 1` was set via `catalog/patchBlockFlags.mjs` so neighbors no longer cull faces against them and they use the alphaTest cutout material. Verified in-world: `snapshots/tex-lights-80to104-{A..D}.jpg`, `snapshots/tex-lantern-46-A.jpg` — all render as recognizable shapes, no more black cubes.

## 6c. ids 115–194 verification (2026-08-26)

Method: `scripts/test-block-row.mjs 115 80 …`, 6 close-up captures (`snapshots/tex-115to194-{A..F}.jpg`).

### ✅ Correct (verified in-world)
- Foliage family: dark oak / birch / mangrove / acacia leaves ✓; cherry wood (documented oak-planks placeholder — 1.20 texture); crimson stem ✓; warped cyan stem ✓; redwood bark (mangrove-log placeholder, no redwood files); pink petal carpet (pink-tulip placeholder; renders as tiny decal); tall grass / dandelion / poppy cross-billboards ✓; bamboo family (stalk, block, fence, gate, planks, mosaic, small/large/single leaves, door, trapdoor) ✓; **ladder = new thin-wall shape** (no more ladder-cube); coral blocks ×4 ✓; kelp / sea pickle / seagrass ✓ (plant bucket); slime / sponge / wet sponge ✓; bucket ids 134–136 are ITEM-category (never placeable — noise only).
- 141–160: acacia door/leaves/log/sapling/trapdoor ✓ (door = thin leaf), activator rail (decal), allium (flower cross), amethyst block ✓, ancient debris / andesite ✓, anvil (cube, acceptable), attached melon/pumpkin stems ✓, azalea leaves/plant ✓, azure bluet ✓, bamboo cluster ✓, barrel / barrel top ✓, basalt ✓, bee nest / beehive (front-honey variants ✓).
- 161–194: bamboo fence gate/particles ✓, barrel ✓, basalt ✓, bee nest / beehive ✓, beetroots (stage0, dark soil look — acceptable), bell ✓, big dripleaf & tip ✓, birch door/trapdoor/sapling ✓, candles ✓ (small), black concrete family (black = **legitimately black**), black glazed terracotta, black shulker box, black stained glass (+ pane aliased to glass tile — accepted for this model), black terracotta, blackstone, blast furnace ✓.

### 🔧 Fixed along the way
- **Ladder (140)** — added `pushLadder` thin-wall shape (both meshers).
- **Bamboo plant (169)** — was `bamboo_block`, now `bamboo_stalk` (114).

## 6d. Gray foliage & plant tint layer (2026-08-27, user report "violet leaves and tall grass are gray")

**Root cause (final):** vanilla MC stores leaves, grass/fern/vine/lily textures as RAW GRAYSCALE and tints per-biome at render time; the atlas had tints baked only for the 4 legacy leaf slots (oak/spruce/birch/jungle) → dark-oak, mangrove, acacia (and tall grass, ferns, vines, lily pads) sampled GRAY. Sweep found low-chroma slots: 116–119 (leaves), 129 grass, 421 fern, 496/497 large fern, 815/816 tall grass, 834 vine, 529 lily pad.

**Fix (shipped):** centralized `FILE_TINTS` table in `buildMasterAtlas.js` with vanilla-neutral colors + 1.35× boost on the tint multiply; atlas re-baked (`npm run build:textures` chain). Verified: tall-grass slot chroma 2→167, mangrove 2→102, dark oak 4→128; in-world capture shows green grass tufts, green dark-oak leaves, and violet-teal warped roots (id 112 reverted from mangrove to `warped_roots`, which is violet-colored in the set).

Also fixed in same session: **sun invisible** (celestial texture drawn at flipped-bottom rows → moved to top rows, flipY-correct); **sign/items placeable in world** → `placeBlock` now rejects `isItemOnly` ids (they rendered as grass-cubes, tile default 0); **3s 0-fps drops** → touch-device snapshot capture disabled (iOS encoder fallback blocked the main thread ~3.5 s, telemetry `capture: 3539ms`).

## 7. Immediate next actions (recommended order)
1. ✅ (done) ship hotfixes (sun, doors, chest, 10 overrides, X buttons) — **shipped in dist now**.
2. ✅ (done) First-32 in-world verification — all normal (this document §6).
2. Do one manual visual pass in-browser: chest, oak door (closed/open), spider-rail blocks, flowers, crimson/warped stems, shrieker, redstone dust.
3. Run Phase-2 generator rework with a texture assigner script on a branch; then run `textureCheck.mjs`, diff a before/after screenshot set.
4. Then Phase-3 (audit CI) + Phase-4 (1.20 pack or placeholder docs).

*All audits reproducible via the scripts above; the full history of this investigation lives in `docs/PERFORMANCE_INVESTIGATION.md` (§ texture findings were appended into this document instead).*
