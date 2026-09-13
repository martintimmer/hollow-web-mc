---
id: entities/painting
title: "Painting"
kind: entity
wiki: https://minecraft.wiki/w/Painting
game_version: "1.21.1 (Java)"
fetched_at: 2026-09-07
updated_at: 2026-09-07
status: implemented
tags: [painting, entity, decoration, wall, village, texture]
related_docs: []
---

# Painting

Hangable wall art entity. Researched 2026-09-07 from the wiki; 50 vanilla
textures vendored under `public/textures/paintings/`.

## Vanilla specs (from wiki)

- Paintings are **entities**, not blocks: they can share space with water,
  torches, or any block whose collision box does not intersect the painting
  hitbox. They cannot intersect other paintings or item frames. Players and
  mobs walk through them (secret doorways work on players, not on mob
  pathfinding). Light propagates through them; they are non-flammable.
- There are **47 paintings**: 40 by Kristoffer Zetterstrand, 6 by Sarah
  Boeving, 1 by Jens Bergensten. JE has preset painting items (Functional
  Blocks tab) that always place the same canvas; tooltip shows author, title
  and size. Four unused elemental paintings live in Operator Utilities.
- **Placement = max-size fit + random.** When placed, the painting checks the
  space around its center point and always uses the **maximum fitting size**,
  then picks a **random canvas of that size**. Blocking off wall area forces
  smaller sizes. A painting cannot cover an empty gap: every covered cell
  needs a supporting wall block behind it.
- Removing support breaks the painting after **20 game ticks** (1 s) and drops
  a painting item. Attacking it breaks it directly.
- MERS roughness textures exist per painting for Vibrant Visuals (out of
  scope here).

## Canvas catalogue (sizes verified from PNG headers, 16 px = 1 block)

| Size | Canvases |
|---|---|
| 1×1 | alban, aztec, aztec2, bomb, kebab, meditative, plant, wasteland |
| 1×2 | graham, prairie_ride, wanderer |
| 2×1 | courbet, creebet, pool, sea, sunset |
| 2×2 | baroque, bust, earth, fire, humble, match, skull_and_roses, stage, void, wind, wither |
| 3×3 | bouquet, cavebird, cotan, dennis, endboss, fern, owlemons, sunflowers, tides |
| 3×4 | backyard, pond |
| 4×2 | changing, fighters, finding, lowmist, passage |
| 4×3 | donkey_kong, skeleton |
| 4×4 | burning_skull, orb, pigscene, pointer, unpacked |

Known artists: Zetterstrand originals include kebab, aztec, alban, bomb,
plant, wasteland, wanderer, graham, pool, sea, sunset, match, bust, fighters,
skeleton, donkey_kong, pigscene, pointer. Boeving: meditative, prairie_ride,
baroque, humble (plus most 3×3/3×4/4×4 additions incl. dennis). Bergensten: 1.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `src/game/blocks.ts` id **1046 "Painting"** (`category: item`, `solid: 0`, `itemTexture: painting.png`) — item only, placed via `tryPlacePainting`, never meshed |
| Catalogue + mesh | `src/game/entities/paintings.ts` — 50-file `PAINTINGS` (`public/textures/paintings/*.png`, lazy texture cache with gradient fallback), `createPaintingMesh` + `layoutPaintingMesh`, pure `findPaintingSpot` (max-size fit, support + overlap) |
| Runtime | `src/game/engine/engineInit.ts` painting section — `s.paintingGroup`, `spawn/removePaintingEntity`, `tryPlacePainting` (E with item), `tryBreakPainting` (left-click raycast), `syncPaintings` support sweep, village `hangHousePaintings` (wall-snapped, seeded variant, max 2/house) |
| Persistence | `server/db.js` `world_paintings` + `POST /api/worlds/:id/paintings` (place/remove); join returns `paintings` map → `s.paintingData` → boot spawn |
| Village placeholder | `src/game/terrain/structures.ts` `wallArt()` keeps wool art AND emits `artCb` spots consumed by `buildHouse` |

## Deviations / limitations (2026-09-07: P0–P3 implemented, P4 open)

- No preset-variant items, no author/title tooltip, no walk-through parity
  (painting quads currently block the crosshair ray but not movement —
  movement collision vs entities is engine-wide behavior), no MERS textures.
- Village canvases are wall-snapped near wool `wallArt`, max 2 per house.

## Ruleset when modifying

- Painting art is **entity quads, never meshed cubes**: no registry meshing branch, no atlas tile, no `isNonOccludingShape` entry.
- Canvas pixel size MUST equal `16 × blocks` (checked by file headers above); frame geometry stays `w*0.96 × h*0.96` so adjacent canvases never z-fight.
- Chunk unload must remove painting entities; chunk build must respawn exactly the persisted set (same discipline as `chestEntities` / `customAssetEntities`).
- Machine gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.
  Human check: place each size class on a test wall; break support → item drop ≤1 s.

## Open work (P4 remaining)

- Preset-variant items + author/title/size tooltip; walk-through parity;
  MERS textures (never).

## Human verification (optional, gameplay entries)

- Creative tab (sim 3D Models tab): painting item present; use on 1-wide, 2-wide
  and 4-wide walls → 1×1/2×2/4×2-class canvas appears, centered, framed.
- Break one support block → painting pops as an item within ~1 s.
- Village house with wallArt: real canvas hangs where wool art was; survives
  relog and `/regenerate`-adjacent chunk rebuilds.
