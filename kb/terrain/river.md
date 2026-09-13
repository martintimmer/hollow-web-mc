---
id: terrain/river
title: "River (river biome)"
kind: terrain
wiki: https://minecraft.wiki/w/River
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: absent
tags: [biome, terrain, river]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md]
---

# River

Strahler-ordered river network: mountain source pools feed meandering trunk rivers
(λ≈560, meander + domain warp) and tributary creeks (λ≈210). Discharge field sets
width 4 (headwater creeks) to ~34 (grand inter-peak rivers); arid/high reaches run as
dry canyons. Beds are Sand (`10`) over Clay (`256`) with grass oasis banks in arid
zones; frozen reaches cap with Ice (`52`).

## Registry facts (source of truth: `catalog/biome-registry.json`)

| registry id | `river` |
| vanilla | river |
| tree | — |
| density | 0 |
| map color | rgb(44, 94, 168) |
| notes | trunk/tributary carve + sand riverbed (top=10/sub=256) |

## Vanilla specs

- TODO: temperature, downfall, precipitation, surface blocks, flora, fauna, structures.

## Our implementation

| Concern | Where |
|---|---|
| Registry | `catalog/biome-registry.json` id `river` (implemented, `kb` was null) |
| Selection | `src/game/terrain/biomes.ts` |
| Surface/scatter | `src/game/terrain/terrainGenerator.ts` |
| Visualizer | `seed-page/main.ts` (`/seed.html` links `/kb/terrain/river`) |

## Deviations / limitations

- TODO: where the generator differs from vanilla.

## Ruleset when modifying

- Keep `catalog/biome-registry.json` as source of truth (re-seeded into the worldgen DB on boot).
- Set the biome's `kb:` field to `terrain/river.md` once this entry is real.
- Gates: `npm run kb:check`, `npm run sim:test`.

## Open work

- Research vanilla specs from the wiki link above; flip `status:` to `partial`/`implemented` once real.
