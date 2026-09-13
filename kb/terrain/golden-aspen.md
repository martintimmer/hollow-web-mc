---
id: terrain/golden-aspen
title: "Golden Aspen Woods (custom biome)"
kind: terrain
wiki: null
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: absent
tags: [biome, terrain, golden-aspen]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md]
---

# Golden Aspen Woods

STUB — auto-created by `scripts/kbExpand.mjs` on 2026-09-05. Facts below are
from `catalog/biome-registry.json`; vanilla behavior still needs research
from N/A (custom biome, no wiki page) before implementing.

## Registry facts (source of truth: `catalog/biome-registry.json`)

| registry id | `golden_aspen` |
| vanilla | custom |
| tree | aspen |
| density | 0.014 |
| map color | rgb(245, 183, 0) |
| notes | Custom autumn biome |

## Vanilla specs

- TODO: temperature, downfall, precipitation, surface blocks, flora, fauna, structures.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/biome-registry.json` id `golden_aspen` (implemented, `kb` was null) |
| Selection | `src/game/terrain/biomes.ts` |
| Surface/scatter | `src/game/terrain/terrainGenerator.ts` |
| Visualizer | `seed-page/main.ts` (`/seed.html` links `/kb/terrain/golden-aspen`) |

## Deviations / limitations

- TODO: where the generator differs from vanilla.

## Ruleset when modifying

- Keep `catalog/biome-registry.json` as source of truth (re-seeded into the worldgen DB on boot).
- Set the biome's `kb:` field to `terrain/golden-aspen.md` once this entry is real.
- Gates: `npm run kb:check`, `npm run sim:test`.

## Open work

- Research vanilla specs from the wiki link above; flip `status:` to `partial`/`implemented` once real.
