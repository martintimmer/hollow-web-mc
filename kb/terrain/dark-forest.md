---
id: terrain/dark-forest
title: "Dark Roofed Forest (dark_forest biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Dark_Forest
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: absent
tags: [biome, terrain, dark-forest]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md]
---

# Dark Roofed Forest

STUB — auto-created by `scripts/kbExpand.mjs` on 2026-09-05. Facts below are
from `catalog/biome-registry.json`; vanilla behavior still needs research
from https://minecraft.wiki/w/Dark_Forest before implementing.

## Registry facts (source of truth: `catalog/biome-registry.json`)

| registry id | `dark_oak` |
| vanilla | dark_forest |
| tree | dark_oak |
| density | 0.024 |
| map color | rgb(8, 28, 21) |
| notes | Huge mushrooms (r<0.18) |

## Vanilla specs

- TODO: temperature, downfall, precipitation, surface blocks, flora, fauna, structures.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/biome-registry.json` id `dark_oak` (implemented, `kb` was null) |
| Selection | `src/game/terrain/biomes.ts` |
| Surface/scatter | `src/game/terrain/terrainGenerator.ts` |
| Visualizer | `seed-page/main.ts` (`/seed.html` links `/kb/terrain/dark-forest`) |

## Deviations / limitations

- TODO: where the generator differs from vanilla.

## Ruleset when modifying

- Keep `catalog/biome-registry.json` as source of truth (re-seeded into the worldgen DB on boot).
- Set the biome's `kb:` field to `terrain/dark-forest.md` once this entry is real.
- Gates: `npm run kb:check`, `npm run sim:test`.

## Open work

- Research vanilla specs from the wiki link above; flip `status:` to `partial`/`implemented` once real.
