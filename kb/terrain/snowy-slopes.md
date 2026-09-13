---
id: terrain/snowy-slopes
title: "Alpine Dwarf Pines (snowy_slopes biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Snowy_Slopes
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: absent
tags: [biome, terrain, snowy-slopes]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md]
---

# Alpine Dwarf Pines

STUB — auto-created by `scripts/kbExpand.mjs` on 2026-09-05. Facts below are
from `catalog/biome-registry.json`; vanilla behavior still needs research
from https://minecraft.wiki/w/Snowy_Slopes before implementing.

## Registry facts (source of truth: `catalog/biome-registry.json`)

| registry id | `alpine` |
| vanilla | snowy_slopes |
| tree | alpine |
| density | 0.005 |
| map color | rgb(19, 42, 19) |
| notes | elev >= SNOWLINE-2 |

## Vanilla specs

- TODO: temperature, downfall, precipitation, surface blocks, flora, fauna, structures.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/biome-registry.json` id `alpine` (implemented, `kb` was null) |
| Selection | `src/game/terrain/biomes.ts` |
| Surface/scatter | `src/game/terrain/terrainGenerator.ts` |
| Visualizer | `seed-page/main.ts` (`/seed.html` links `/kb/terrain/snowy-slopes`) |

## Deviations / limitations

- TODO: where the generator differs from vanilla.

## Ruleset when modifying

- Keep `catalog/biome-registry.json` as source of truth (re-seeded into the worldgen DB on boot).
- Set the biome's `kb:` field to `terrain/snowy-slopes.md` once this entry is real.
- Gates: `npm run kb:check`, `npm run sim:test`.

## Open work

- Research vanilla specs from the wiki link above; flip `status:` to `partial`/`implemented` once real.
