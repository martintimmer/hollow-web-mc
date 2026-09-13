---
id: terrain/plains
title: "Plains (temperate grassland biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Plains
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [plains, biome, terrain, grassland, flowers, horses, village, seed-generator]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Plains

The **Plains** is an expansive, open temperate grassland biome in the Overworld characterized
by vast expanses of lush grass, gentle rolling lowlands, high flower biodiversity, and high
frequencies of peaceful wildlife and human settlements.

## Vanilla specs (from the wiki)

- **Climate**:
  - Temperature: `0.8` (moderate temperate).
  - Downfall: `0.4`.
  - Precipitation: Yes (rain).
  - Foliage color: `#77AB2F` / Grass color: `#91BD59` (vibrant yellow-green).
  - Water color: `#3F76E4`.
- **Surface Blocks**:
  - Top layer: `grass_block` (1 block).
  - Subsurface: `dirt` (3–4 blocks), then `stone`.
- **Terrain & Elevation**:
  - Low erosion and moderate continentalness values produce expansive flat-to-rolling terrain
    predominantly situated between $y = 62$ and $y = 74$.
  - Water bodies generate as winding, slow-moving rivers or small ponds.
- **Flora & Vegetation**:
  - Trees are sparse: solo oak trees (or rarely bees on oak) generate with very low density
    ($\le 0.002$).
  - Dense coverage of **Tall Grass**, **Dandelions**, and **Poppies**.
  - Variants like *Sunflower Plains* produce fields of 2-block-tall sunflowers facing East.
- **Fauna (Mob Spawning)**:
  - Primary spawn zone for horses, donkeys, sheep, cows, pigs, chickens, and rabbits.
- **Structures**:
  - **Plains Village** (the most common village archetype).
  - Pillager Outpost, Ruined Portal, Buried Treasure (near coastal edges).

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Biome Selection | `src/game/terrain/biomes.ts` | Merged into `oak_forest` low-density branch (`fDensity <= 0.5`) |
| Surface Block Decision | `src/game/terrain/terrainGenerator.ts` → `surfaceAt` | Uses default `top = 1` (grass) / `sub = 2` (dirt) |
| Tree Density | `scatter` in `terrainGenerator.ts` | Oak trees generate when roll < density |
| Flowers & Flora | `scatter` in `terrainGenerator.ts` | Modest flower scatter (dandelion, poppy, daisy) |
| Village Architecture | `terrainGenerator.ts` → `buildHouse` | Village houses with oak planks, cobblestone, farm plots |
| Map Color | `catalog/biome-registry.json` | `[104, 157, 74]` |

## Impact on our seed generator

In the current seed pipeline, Plains does not have a dedicated entry in `BIOME_TARGETS` within
`biomes.ts`; instead, it is approximated whenever `oak_forest` samples low forest noise
(`fDensity <= 0.5 → density = 0.008`).

Under the new Biome Understanding Architecture:
1. **Dedicated Voronoi Target**: Positioned at $T = 0.70, H = 0.40$ (between Savanna and Oak Forest).
2. **Terrain Shaping**: Low elevation relief multiplier (`hill = 0.65`) preserving broad flat horizons
   ideal for village generation and player sprint-riding.
3. **Flower Variety Scatter**: Enhanced density of multi-color tulips, oxeye daisies, and tall grass.

## Deviations / limitations

- Currently shares tree morphology and biome ID with `oak_forest`.
- No separate Sunflower Plains variant with directional facing sunflower meshes.
- Horses currently spawn from animal generator globally rather than having biome-weighted density.

## Ruleset when modifying

- Maintain gentle slope profile; villages reject cells with local height delta $> 6$ blocks.
- Ensure tree density remains sparse ($\le 0.004$) so clear line of sight is preserved.
- Gate: `npm run kb:check`, `npm run sim:test`.
