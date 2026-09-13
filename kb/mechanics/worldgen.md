---
id: mechanics/worldgen
title: World generation & seed visualizer
kind: mechanic
wiki: https://minecraft.wiki/w/World_generation
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-03
status: partial
tags: [worldgen, terrain, biomes, seed, nether, atlas]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, docs/NETHER_DIMENSION_PLAN.md]
---

# World generation & seed visualizer

Procedural terrain from a seed: biomes, height, structures, plus a separate
worldgen DB and a seed visualizer page. Overworld + Nether generators exist.

## Vanilla specs

- Seed → deterministic biome/height; dimensions (overworld, nether, end).
- Biome registry drives flora/terrain; nether has its own generator.

## Our implementation

| Concern | Where |
|---|---|
| Terrain generator | `src/game/terrain/terrainGenerator.ts` |
| Biome sampling | `src/game/terrain/biomes.ts` (`sampleBiome`) |
| Nether generator | `src/game/terrain/netherGenerator.ts` (`NETHER_LAVA_LEVEL`, `NETHERRACK_ID`, `SOUL_SAND_ID`, basalt/blackstone ids) |
| Structures / trees | `src/game/terrain/structures.ts`, `trees.ts` (`generateCustomTree` composer: 7 trunk styles × 7 canopy shapes, species presets, trunk-through-canopy + protruding branches) |
| Tree placement | `terrainGenerator.ts` `scatter` (one candidate per 7×7 cell via `treeCellCandidate`, ±8 margin, cluster-modulated acceptance) |
| Worldgen DB (separate) | `server/worldgen-db.js`; biome registry `catalog/biome-registry.json` |
| Seed APIs | `server/index.js:1532` (`/api/worldgen/summary|report|reports`) |
| Visualizer | `/seed.html` (built from `seed-page/` via `vite.seed.config.ts`) |

## Deviations / limitations

- Not all biomes implemented (see `terrain/beach.md` + `ALL_BIOMES_ELEVATION_PLAN`).
- End dimension absent; nether is partial (lava level + base blocks).

## Ruleset when modifying

- Worldgen data lives in the **separate** worldgen DB, never `minecraft.db`.
- Biome registry is source of truth — re-seeded on every server start.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Remaining biomes, End dimension, full nether feature set.
- GEN_VERSION 5 (2026-09-06): composable trees — every broadleaf/conifer/palm builder
  routes through `generateCustomTree` (7 trunk styles × 7 canopy shapes, trunk runs
  through the canopy with protruding branches, layered multi-story crowns, species
  presets for materials/heights/habits); trunk size classes 1×1/2×2/3×3 with
  allometric canopies, per-biome trunk materials, jittered-grid spacing (one
  candidate per 7×7 cell, ±8 margin, cluster modulation), jungle
  understory/canopy/emergent tiers, density-scaled horizon lift; mangrove second
  story, palm lean directions.
