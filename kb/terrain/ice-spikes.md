---
id: terrain/ice-spikes
title: "Ice Spikes (sub-zero glacial spires biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Ice_Spikes
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [ice-spikes, biome, terrain, polar, packed-ice, snow, glacial, spires, seed-generator]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Ice Spikes

The **Ice Spikes** biome is a rare, breathtaking sub-zero polar biome where the landscape is
dominated by immense towering spires, columns, and conical needles of solid **packed ice**
protruding dozens of blocks into the sky over frozen snow-sheeted tundras.

## Vanilla specs (from the wiki)

- **Climate**:
  - Temperature: `0.0` (sub-zero arctic freezing).
  - Downfall: `0.5`.
  - Precipitation: Yes (always snow, never rain).
  - Foliage color: `#80A755` / Grass color: `#80B497` (frozen pale sage).
  - Water color: `#3D57D6` (deep sub-polar indigo; all open surface water freezes into ice).
- **Surface Blocks**:
  - Top layer: **Snow Block** (Block ID: 51) and **Packed Ice** (Block ID: 53) covering the tundra.
  - Subsurface: Packed ice and dirt transitioning into solid stone.
  - Snow layers accumulate atop all exposed solid blocks.
- **Ice Spike Formations**:
  - **Tall Spikes**: Narrow cylindrical columns $3..5$ blocks in diameter tapering at the top,
    shooting $15..50$ blocks upward (often topping out at $y = 90..115$).
  - **Short Spikes / Cones**: Broad conical mounds $8..12$ blocks in base diameter and $10..18$ blocks high.
  - Built entirely from **Packed Ice** (`53`), which never melts near torches or light sources.
- **Terrain & Elevation**:
  - Generated in areas with high weirdness ($|W| > 0.70$) and low temperature.
  - Generally flat to undulating plains surrounded by frozen rivers and snowy plains, providing
    high contrast against the dramatic vertical needle spires.
- **Flora & Fauna**:
  - No trees generate naturally.
  - Polar bears (adults and cubs), Strays (skeletons with slowness arrows), Snow Foxes, and White Rabbits.
- **Structures**:
  - Igloos with hidden basement alchemy labs (under carpet).

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Biome Selection | `src/game/terrain/biomes.ts` | Listed as planned in `catalog/biome-registry.json`; missing from `BIOME_TARGETS` |
| Polar Freezing | `src/game/terrain/terrainGenerator.ts` → `surfaceAt` | Cold check ($tm < 0.35$) puts snowy grass (`54`); alpine snowline puts snow cap (`51`) |
| Packed Ice & Ice Blocks | `src/game/blocks.ts` | Fully registered (Ice: 52, Packed Ice: 53, Blue Ice: 2224) |
| Spike Architecture | `terrainGenerator.ts` → `scatter` + `trees.ts` → `generateIceSpike` | Implemented: tall packed-ice needles (20–40 high, 3×3 shaft + base flare) and cone mounds (10–16 high, radius ≤ 3); no trees generate |
| Map Color | `catalog/biome-registry.json` | `[170, 198, 232]` |

## Impact on our seed generator

Under the new Biome Understanding Architecture:
1. **Dedicated Voronoi Target**: Positioned at $T = 0.05, H = 0.25$ with weirdness threshold
   $wNoise > 0.72$ with sub-zero temperature (single standard generator).
2. **Ground Materialization**:
   - `top = 51` (`Snow Block`).
   - `sub = 53` (`Packed Ice`).
   - All surface water freezes into `Ice` (`52`).
3. **Procedural Ice Spike Generator**:
   In the chunk scatter pass, evaluate a 2D cellular peak noise:
   - When a peak cell center is found:
     - Generate a tapered vertical needle of Packed Ice (`53`) rising 20–40 blocks above surface.
     - Add broad cone base around bottom 4–6 layers.
   - Creates the unmistakable silhouette of the vanilla Ice Spikes biome against the frozen sky!

## Deviations / limitations

- Packed ice does not slide player physics differently from standard blocks unless friction
  controller is toggled.
- Igloos are not yet registered in structure placement.

## Ruleset when modifying

- Ice spikes must use Packed Ice (`53`), never standard water ice (`52`), so they never melt
  near placed torches.
- Gate: `npm run kb:check`, `npm run sim:test`.
