---
id: terrain/desert
title: "Desert (arid sand & dunes biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Desert
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [desert, biome, terrain, arid, sand, sandstone, cactus, dead-bush, pyramid, seed-generator]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Desert

The **Desert** is an expansive, arid, sun-scorched biome in the Overworld dominated by deep
deposits of **sand** over **sandstone**, rolling dune relief, cacti, dead bushes, and barren
waste where rain never falls.

## Vanilla specs (from the wiki)

- **Climate**:
  - Temperature: `2.0` (extreme arid heat).
  - Downfall: `0.0`.
  - Precipitation: None (sky dims during storms but no rain or snow falls).
  - Foliage color: `#AEA42A` / Grass color: `#BFB755` (dry brownish yellow).
  - Water color: `#3F76E4`.
- **Surface Blocks**:
  - Top layer: `sand` (Block ID: 10, 3–4 blocks thick).
  - Subsurface: `sandstone` (Block ID: 11, 3–5 blocks), transitioning into `stone`.
- **Terrain & Elevation**:
  - Broad rolling dunes, wind-swept ripples, and occasional dry sandstone canyons.
  - No water springs on slopes; water only exists in rare desert wells or coastal boundaries.
- **Flora & Vegetation**:
  - **Cactus** (Block ID: 227): generates 1–3 blocks tall on sand with empty neighboring horizontal faces.
  - **Dead Bush** (Block ID: 309): scattered randomly across dry sand.
  - No oak or standard trees; oasis variants generate palm trees near water depressions.
- **Fauna & Monsters**:
  - Rabbits (desert coat variant).
  - **Husks** spawn in place of 80% of surface zombies (do not burn in sunlight, inflict Hunger).
- **Structures**:
  - **Desert Pyramid / Temple** (terracotta & sandstone with hidden TNT trap chamber).
  - **Desert Village** (sandstone & terracotta buildings).
  - **Desert Well** (small 5x5 sandstone water well).

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Biome Selection | `src/game/terrain/biomes.ts` | `desert_palm` Voronoi target ($T = 0.94, H = 0.12$) |
| Surface Block Decision | `src/game/terrain/terrainGenerator.ts` → `surfaceAt` | Biome-informed: `desert`/`desert_palm` yield sand (`10`) over sandstone (`11`), sandstone cliffs |
| Dune Flora | `terrainGenerator.ts` → `scatter` | Cacti 1–3 tall (`227`, ~1.2% of sand columns), dead bushes (`309`, ~3.3%), palms restricted to oasis water margins |
| Cactus & Dead Bush | `src/game/blocks.ts` | Registered (Cactus: 227, Dead Bush: 309), but not populated by generator |
| Map Color | `catalog/biome-registry.json` | `[45, 106, 79]` (oasis) / proposed desert `[218, 196, 134]` |

## Impact on our seed generator

Currently, seeds generate palm trees at hot/dry coordinates, but because `surfaceAt` does not
query `getBiome(x, z)`, all high-ground desert dunes are rendered as grass and dirt rather
than authentic sand and sandstone!

Under the new Biome Understanding Architecture:
1. **Biome-Informed `surfaceAt`**: When the sampled biome is `desert` or `desert_palm`:
   - `top = 10` (`sand`).
   - `sub = 11` (`sandstone`).
   - Inland desert dunes at $y = 65..95$ will immediately show authentic golden sand waves.
2. **Dune Terrain Waves**: Low-frequency rolling sinusoidal noise specifically applied to desert
   elevations to create authentic wind-swept sand dunes.
3. **Scatter Overhaul**:
   - Scatter **Cacti** (1–3 blocks tall) on sand.
   - Scatter **Dead Bushes** across barren dunes.
   - Restrict palm trees specifically to oasis zones ($h \le SEA + 4$ near water).

## Deviations / limitations

- Rain currently renders globally if weather is set to rainy; need per-biome precipitation inhibition.
- Desert pyramids and wells are not yet registered in structure generators.

## Ruleset when modifying

- Never place cacti adjacent to solid blocks horizontally (vanilla physics check).
- Sand must sit upon sandstone to prevent gravity collapse into underground caverns.
- Gate: `npm run kb:check`, `npm run sim:test`.
