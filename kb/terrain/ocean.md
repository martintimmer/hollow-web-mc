---
id: terrain/ocean
title: "Ocean (ocean biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Ocean
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: absent
tags: [biome, terrain, ocean]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md]
---

# Ocean

STUB — auto-created by `scripts/kbExpand.mjs` on 2026-09-05. Facts below are
from `catalog/biome-registry.json`; vanilla behavior still needs research
from https://minecraft.wiki/w/Ocean before implementing.

## Registry facts (source of truth: `catalog/biome-registry.json`)

| registry id | `ocean` |
| vanilla | ocean |
| tree | — |
| density | 0 |
| map color | rgb(44, 94, 168) |
| notes | h<=SEA → water; gravel seabed + sand/dirt/clay patches (see mechanics/underwater-life) |

## Vanilla specs

- TODO: temperature, downfall, precipitation, surface blocks, flora, fauna, structures.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/biome-registry.json` id `ocean` (implemented, `kb` was null) |
| Selection | `src/game/terrain/biomes.ts` |
| Surface/scatter | `src/game/terrain/terrainGenerator.ts` |
| Visualizer | `seed-page/main.ts` (`/seed.html` links `/kb/terrain/ocean`) |

## Deviations / limitations

- TODO: where the generator differs from vanilla.

## Ruleset when modifying

- Keep `catalog/biome-registry.json` as source of truth (re-seeded into the worldgen DB on boot).
- Set the biome's `kb:` field to `terrain/ocean.md` once this entry is real.
- Gates: `npm run kb:check`, `npm run sim:test`.

## Open work

- Research vanilla specs from the wiki link above; flip `status:` to `partial`/`implemented` once real.
