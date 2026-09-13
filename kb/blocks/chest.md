---
id: blocks/chest
title: Chest
kind: block
wiki: https://minecraft.wiki/w/Chest
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-08-27
status: implemented
tags: [storage, container, axe, entity-render, 27-slots, animation, lid, large-chest, blockstates]
related_docs: [docs/CHEST_MODEL_SPEC.md]
spec: {"slots": {"invMain": 27, "hotbar": 9, "chest": 27}}
---

# Chest

A block used to store items. Vanilla: two adjacent chests join into a **large chest**
(54 slots). We implement the single chest (27 slots) with an articulated opening-lid
entity; the static block form has a baked front-face tile.

## Vanilla specs (from wiki)

### Stats

- **Hardness 2.5, blast resistance 2.5** — breakable with anything, axe fastest.
  Breaking times: default 3.75 s; wooden axe 1.9, stone 0.95, copper 0.75, iron 0.65,
  diamond 0.5, netherite 0.45, golden 0.35.
- **Renewable: yes. Stackable: yes (64). Luminous: no. Transparent: yes
  (non-conductive → a chest above does not block the one below from opening).
  Waterloggable: yes. Flammable: no (lava can still ignite air beside it).
  Map color: 13 WOOD. Note-block instrument: Bass.**
- Considered a **solid block** for placing; hitbox is a full block even though the
  model is smaller than a full cube.

### Capacity

| Chest | Slots | Max items (64-stack) | With shulker boxes |
|---|---|---|---|
| Small | 27 | 1,728 | 46,656 |
| Large | 54 | 3,456 | 93,312 |

- GUI labeled "Chest" / "Large Chest". JE large-chest GUI: top 3 rows = left half,
  bottom 3 = right half.
- Breaking drops the chest + contents. Breaking one half of a large chest drops only
  that half's items; the other half keeps working as a small chest.

### Looks & animation (the GIF)

- Since Beta 1.8 the chest uses an **entity-style model, not a full cube**: body
  ~14/16 × 14/16 footprint, base 10/16 high + lid 4/16 high, inset 1 px per side —
  smaller than the block but the **hitbox stays a full block**.
- The lid is hinged on the **back top edge** and **animates open/closed** when used
  (the Chest.gif / Large_Chest.gif behavior). A **3D lock/latch** was added to the
  model later (1.9).
- The **front (latch side) faces away from adjacent solid blocks**; if placed
  independent of other blocks it faces **west**.
- **Open/close sounds**: unique creak today; originally reused door sounds (history
  notes several sound changes).
- Quirk (JE): with tick speed frozen, the lid does not animate but sounds still play.
- JE: breaking/walking produces **oak plank particles**.

### Opening rules

- **Cannot open if a conductive (solid-full) block is above.** The lid can phase
  through bottom-half slabs (JE) and stairs. Bottom slabs block opening in BE.
- Cats sitting on top prevent opening. Chests can be stacked (non-conductive).
- Opening is possible even while being hurt.

### Small vs large chest

- Two chests placed adjacent (not sneaking, same facing) **merge into a large chest**;
  sneak-placement keeps them separate (JE). Trapped chests never merge with chests.
- Large chest = continuous 2×1 model with a shared lid across both halves.
- **Block states**: `facing` (north/south/east/west), `type` (single | left | right),
  `waterlogged` (true/false).

### Crafting & generation

- Crafting: 8 planks (any wood type) in a ring → 1 chest.
- Natural generation (loot tables): monster rooms, strongholds, villages, jungle/
  desert pyramids, nether fortresses, end cities, igloo basements, woodland mansions,
  shipwrecks, ocean ruins, buried treasure, pillager outposts, bastion remnants,
  ruined portals, ancient cities, trial chambers, abandoned camps (upcoming).

## Our implementation

| Concern | Where |
|---|---|
| Registry | `src/game/blocks.ts` id **43** "Chest", category `utility`, `solid:1` + **`trans:1`** (vanilla transparency, set via `patchBlockFlags.mjs` TRANS_IDS), custom baked tile (`patchBlockTiles.mjs` → `customTiles.json`); `completeRegistry.json` mirrors side/top/bottom 877 |
| Rendering (in-world) | **Entity-only**: both meshers `continue` on `id === 43` (main `chunkMesher.ts advanceMeshJob` + `meshWorker.ts`) — the static `pushChest` box in `chunkMesh.ts` is now **dead code**; every chest voxel gets a discrete articulated model via `createArticulatedChest` (spawned in `chunkMesher.spawnChunkChestEntities`, called from BOTH `attachChunkMeshes` and the main-thread `completeMeshJob` so chests always render) |
| Large-chest pairing | `src/game/chest.ts` `computeChestPair(getBlock,x,y,z)` — deterministic vanilla ruleset: chests pair pairwise along X left→right (two singles → one double; a chest beside a double stays single; add another → two doubles…). Used by the entity spawn (single vs large), `spawnChestEntity` (run reconciliation on place/break), `openChest` (inventory pairing → 54 slots only for the true pair) and `breakBlock` (broken half ejects, survivor keeps its 27) |
| Texture override | `reloadChestTextures()` + `getOrCreateChestMaterials()` read `mc_custom_chest_pixels` / `mc_custom_atlas_overrides` from localStorage; `storage` + `focus` listeners re-apply live. `/editor.html` texture editor (`applyToGame()`) writes these AND persists them to the DB (`POST /api/textures/overrides` → `texture_overrides` in the worldgen db); the game fetches on boot + polls every 3 s so DB saves re-texture blocks on the fly (bridge: `src/services/textureOverrides.ts`) |
| Facing | `s.blockDirs` / chunk `dirs` set on placement (face toward player); entity `targetYaw` from `dirs` (facings `[0,π,π/2,−π/2]`) |
| Crafting | `src/game/recipes.ts` — 8-plank ring (3×3, `"ppp"/"p p"/"ppp"`) → 1 chest |
| Articulated entity | `src/game/chest.ts` — `createArticulatedChest` / `updateChestAnimation`; full geometry spec in `docs/CHEST_MODEL_SPEC.md` |
| Open/close lifecycle | `src/components/Game.tsx` — right-click/E on chest → `openChest`: **large-chest pair detection along X** (via `s.getBlockFn`), pair inventory keyed at the min-X cell, 27→54 slots, label "Large Chest"; `s.chestLarge`/`s.chestKey`; close saves under the pair key (`persistChest`, `handleSetChestSlots`) |
| Breaking | `breakBlock` **ejects stored contents** into the player inventory (vanilla parity); a large pair splits — broken half's 27 slots eject, the other half keeps its 27 as a small chest |
| Sound | `src/game/sfx.ts` `playChestOpen()` |
| UI | `src/components/gui/ChestModal.tsx` — 27/54-slot grid (3/6 rows × 9), drag & drop, capacity rules, Esc toggle; transfer loops sized by `chestSlots.length` |
| Persistence | `src/services/api.ts` `apiSaveChest` → `server/index.js` POST `/api/worlds/:id/chests` → `world_chests` table (`server/db.js`), keyed `x,y,z` (large pair saved under the min-X cell key) |
| Sim catalog | entity "entity:chest" → `createArticulatedChest().root` (`src/components/Game.tsx`) |
| Loot placement | shipwreck chests prefilled via `s.chestMap` in worldgen |

### Our model & animation numbers (from `chest.ts` / CHEST_MODEL_SPEC)

- **Width/Depth 14/16 (0.875)**, **base height 10/16 (0.625)**, **lid 4/16 (0.25)**,
  total 14/16 — inset 1 px per side vs the full block (matches vanilla).
- Hinge pivot at **back top edge** (0, 0.625, −0.4375); lid rotates
  **0 → −1.25 rad (~72° backwards)** when open; exponential lerp, speed 12.
- Procedural 64×64 pixel wood texture (6-shade golden-brown grain + dark metal
  banding + corner rivets) and a separate 16×16 silver latch texture (mount,
  clasp, keyhole) — instead of the vanilla `normal.png` sprite.

## Deviations / limitations

- **Pairing ruleset implemented** (`computeChestPair`): chests merge pairwise along X
  deterministically; still no sneak-placement prevention and no persistent `type=left/right`
  blockstate (pairing is recomputed live from the block layout, which matches the user
  flow "two singles → double; chest beside double stays single; add another → two doubles").
- **No waterlogging**, no lock/name NBT, no cats-blocking, no trapped chests, no
  chest minecarts / donkey packs / shulker-stacking semantics.
- **Conductive-block-above opening rule not implemented** — any chest opens.
- **Breaking** uses the family-based `mineHoldTime` scale, not the exact 2.5 s
  hardness/axe-speed table.
- **No oak-plank break particles** (generic burst).
- Lid target angle is ~72°, tuned by hand rather than vanilla's exact animation curve;
  default texture is procedural (the vanilla `normal.png` crop is unused) but is fully
  overridable via the `/editor.html` texture editor (live re-texture).

## Ruleset when modifying

- **Slot count stays 27** — `ChestModal.tsx` UI, `world_chests.slots` JSON shape, and
  `scripts/test-chest-drag-drop-and-capacity.mjs` all assume 27. A large-chest feature
  = placement-merge detector + 54-slot UI state + schema/persistence migration in one
  change (with `type=left/right` bookkeeping).
- Chest tile is **custom-baked** (not a 1.19.3 block texture) — keep `customTiles.json`
  + `patchBlockTiles.mjs` in sync; do not regen the atlas casually (U9).
- Keep worker/main-thread `pushChest` parity if the geometry changes; keep
  `chest.ts` entity geometry consistent with `docs/CHEST_MODEL_SPEC.md`.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`,
  `node scripts/test-chest-drag-drop-and-capacity.mjs`,
  `node scripts/test-chest-persistence-and-esc-toggle.mjs`, plus the standard
  `textureCheck` / `test-worker-meshing` / `ci:perf`.

## Open work

- Sneak-placement merge prevention + persistent `type=left/right` (currently
  open-time X-pair detection only) — see `docs/KNOWN_ISSUES.md`.
- U15 (vanilla model-JSON loader) could replace the hand-made `pushChest` with the
  real `blockstates/chest.json` + model, giving facing variants and true lid UVs.
- U12 sibling: per-wood door slats (the other custom-tile special region).
- Untested live: large-chest open/merge probe (headless CDP) — logic is gated by
  tsc/build/sim:test/textureCheck; a manual probe is still recommended.
