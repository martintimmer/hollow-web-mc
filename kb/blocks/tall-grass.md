---
id: blocks/tall-grass
title: Tall Grass / High Grass
kind: block
wiki: https://minecraft.wiki/w/Tall_Grass
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-02
updated_at: 2026-09-02
status: implemented
tags: [tall-grass, high-grass, foliage, decoration, non-solid, cross-billboard, shears, bonemeal]
related_docs: [kb/blocks/_block.md]
---

# Tall Grass / High Grass

Decorative foliage: single-high `Tall Grass` and double-high `High Grass` (bottom/top). Spawns on grass, drops seeds.

## Vanilla specs (from wiki)

- **Variants:** `tall_grass` (single, 1×1 cross), `large_fern` (fern variant), `double` `tall_grass` `half=lower/upper` (`tall_grass_bottom.png` / `tall_grass_top.png`).
- **Properties:** `solid 0` `trans 1` `foliage 1`, hardness 0, stackable 64, non-solid, no collision, light transparent, flammable, replaced by fluids.
- **Obtaining:** shears or silk touch, otherwise drops `0-2` wheat seeds (we map to `high grass` top?). Bonemeal on grass spreads tall grass.
- **Placement:** on `grass block`/`dirt` top, cross-billboard `X` shape (two intersecting quads).

## Our implementation

| Concern | Where |
|---|---|
| Registry | `124 Tall grass` `single` `side 129` `foliage` `trans` `src/game/blocks.ts:1311` + `1200 High Grass` `bottom` `815` / `1201 High Grass (Top)` `816` `src/game/blocks.ts:1200` (double) |
| Meshing | `src/game/engine/chunkMesh.ts` `pushCrossBillboard` for `102,124-126` + `1200/1201` double uses `pushCrossBillboard` per half (bottom at `y`, top at `y+1`). Worker parity `meshWorker.ts:212`. |
| Inventory search | `src/components/gui/InventoryModal.tsx:204` `isSurvivalView` now `&& searchQuery.trim().length===0` + survival search bar `774` always visible so `I` → `tall grass` finds `124`/`1200` even in survival. |
| Generation | `src/game/terrain/trees` `bamboo` etc. scatter `tall grass` via `foliage` `trans` blocks. |

## Deviations / limitations

- No `large_fern` variant separate — `124` covers both.
- No shears/silk touch gating — instant break drops nothing (survival `mineHoldTime` instant for `foliage`).
- No bonemeal spread.

## Ruleset when modifying

- Keep `foliage:1` `trans:1` and `side` tile `129` for `124`, `815/816` for `1200/1201` in sync with `catalog/completeRegistry.json` and `textureTileMap.json` (`tall_grass_bottom.png` `815` `tall_grass_top.png` `816`).
- Keep `pushCrossBillboard` parity.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`.

## Open work

- Shears drop + bonemeal spread (U28 gameplay polish).
