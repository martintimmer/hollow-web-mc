---
id: terrain/badlands
title: "Badlands / Mesa (canyon & terracotta strata biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Badlands
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [badlands, mesa, biome, terrain, terracotta, red-sand, canyon, plateau, gold-ore, seed-generator]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Badlands (Mesa)

The **Badlands** (formerly known as **Mesa**) is a dramatic, arid mountainous biome famous for
its towering stepped plateaus, steep canyon ravines, striking multi-colored horizontal bands of
**terracotta**, surface **red sand**, and abundant gold ore veins reaching near-surface elevations.

## Vanilla specs (from the wiki)

- **Climate**:
  - Temperature: `2.0` (dry desert heat).
  - Downfall: `0.0`.
  - Precipitation: None.
  - Foliage color: `#9E814D` / Grass color: `#90814D` (parched olive-brown).
  - Water color: `#3F76E4`.
- **Surface & Stratigraphic Blocks**:
  - Top layer: **Red Sand** (Block ID: 584) on flat mesa tops and canyon floors (1–3 blocks).
  - Plateau bluffs & cliffs: Exposed horizontal strata of **Terracotta** (uncolored terracotta
    interleaved with Orange, Yellow, White, Brown, Red, and Light Gray terracotta).
  - Subsurface: transitions into Red Sandstone and Stone at depth.
- **Mineral Abundance**:
  - Gold Ore generates between $y = -64$ and $y = 79$ with significantly elevated frequency,
    making Badlands canyons the premiere early-game mining territory for gold.
- **Terrain & Elevation**:
  - Sheer stepped mesas and tiered tablelands rising sharply from $y = 65$ up to $y = 85..105$.
  - Plateau tops are relatively flat, while canyon walls are near-vertical cliffs.
- **Flora & Vegetation**:
  - Extremely sparse vegetation: solo **Dead Bushes** (Block ID: 309) and occasional **Cacti** (Block ID: 227).
  - Wooded Badlands variant generates plateau tops with sparse oak trees on coarse dirt.
- **Structures**:
  - **Badlands Mineshaft**: Generates exposed on surface cliffs and canyon walls, constructed
    with **Dark Oak Planks** and fences rather than standard oak.

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Biome Selection | `src/game/terrain/biomes.ts` | Listed as planned in `catalog/biome-registry.json`; missing from `BIOME_TARGETS` |
| Stepped Terracing Math | `src/game/terrain/terrainGenerator.ts` → `rawHeight` | Terraced plateau step function was removed with the Odyssey map type; mesas use stratified terracotta instead. |
| Terracotta Strata | `src/game/terrain/terrainGenerator.ts` → `surfaceAt` | **Missing**: No terracotta band mapping; cliffs generate as plain stone (`5`) and scree (`11`) |
| Terracotta Blocks | `src/game/blocks.ts` | Fully registered (Orange: 515, Yellow: 516+, Red, White, Brown, etc.) |
| Red Sand Blocks | `src/game/blocks.ts` | Fully registered (Red Sand: 584, Red Sandstone: 585) |
| Map Color | `catalog/biome-registry.json` | `[216, 127, 51]` |

## Impact on our seed generator

Badlands is one of the most visually stunning biomes in Minecraft, but requires two core
systems to operate in unison:
1. **Vertical Stepped Terracing**: The existing terrace formula in `rawHeight`:
   ```ts
   const step = 12;
   const stepIdx = Math.floor(hRel / step);
   const terraced = stepIdx * step + smoothstep((stepFrac - 0.75) / 0.25) * step;
   ```
   can be extended to badlands coordinates in all world types.
2. **Deterministic Terracotta Stratigraphy**: In `surfaceAt`, if `biome.id === "badlands"`:
   - For gentle surfaces: `top = 584` (`Red Sand`), `sub = 585` (`Red Sandstone`).
   - For steep cliff walls ($slope \ge 1.8$): determine block ID by $y \pmod{16}$ or deterministic
     band lookup array `[TERRACOTTA, ORANGE, WHITE, TERRACOTTA, YELLOW, BROWN, RED, ...]`.
   - Players looking at a mesa will immediately recognize the iconic Minecraft stratified color bands!

## Deviations / limitations

- Surface mineshafts in badlands are not yet implemented.
- Red sand falling physics matches standard sand.

## Ruleset when modifying

- Stratigraphy must be world-y aligned (not relative to local height) so bands stretch
  continuously across canyons and plateaus.
- Gate: `npm run kb:check`, `npm run sim:test`.
