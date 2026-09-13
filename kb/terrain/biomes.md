---
id: terrain/biomes
title: Biomes (registry & sampling)
kind: terrain
wiki: https://minecraft.wiki/w/Biome
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-03
updated_at: 2026-09-03
status: partial
tags: [biomes, terrain, registry, seed, elevation, climate]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, mechanics/worldgen.md]
spec: {"biomesLinked": true}
---

# Biomes (registry & sampling)

Biome registry + sampling functions that drive terrain color, height, and flora.
Source of truth is `catalog/biome-registry.json`, re-seeded into the worldgen DB
on every server start. Pairs with `mechanics/worldgen.md`.

## Vanilla specs

- ~50+ biomes in 1.19.3 with temperature/precipitation driving terrain & colors.
- Biome affects surface blocks, foliage color, mob spawns, structures.

## Our implementation

| Concern | Where |
|---|---|
| Sampling | `src/game/terrain/biomes.ts` (`sampleBiome`) |
| Registry | `catalog/biome-registry.json` (seeded into `server/worldgen-db.js`) |
| Elevation plan | `docs/ALL_BIOMES_ELEVATION_PLAN.md` |
| Beach style | `terrain/beach.md` |

## Deviations / limitations

- Not all biomes implemented (see `docs/ALL_BIOMES_ELEVATION_PLAN.md` for the
  available-vs-planned split). Single standard Voronoi selection with regional climate modulation.

## Ruleset when modifying

- Add/change biomes in `catalog/biome-registry.json` (source of truth), not in code.
- Worldgen DB is separate from `minecraft.db` — never cross-contaminate.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Full biome coverage; per-biome foliage/color parity.
