---
id: terrain/jungle
title: "Jungle (dense tropical rainforest biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Jungle
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-06
status: partial
tags: [jungle, biome, terrain, tropical, dense-canopy, vines, seed-generator]
related_docs: [docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Jungle

The **Jungle** is a dense, humid tropical rainforest: towering canopy trees with
interlocking crowns, hanging vines, ferns and bushes choking the floor, and the
richest green tints in the game.

## Vanilla specs (from the wiki)

- **Climate**: hot and very humid (high temperature, near-max downfall); rain.
- **Grass color**: `#59C93C` (intense tropical emerald).
- **Surface Blocks**: grass over dirt; dense leaf litter.
- **Flora**: tall jungle trees (often 2×2), vines, ferns, large ferns, cocoa pods,
  melons; jungle-exclusive wood type.
- **Fauna**: parrots, ocelots, pandas; chickens.
- **Structures**: jungle temples.

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Biome Selection | `src/game/terrain/biomes.ts` | Voronoi target (T 0.79, H 0.95), density 0.018 |
| Canopy Trees | `trees.ts` → `generateJungleTree` | 8–12 block trunks, layered crowns, hanging vines |
| Undergrowth | `terrainGenerator.ts` → `scatter` | Ferns (`361`), tropical bushes (`1202`), vine tendrils |
| Tints | `biomes.ts` | Grass `#59C93C`, foliage `#309B21` |
| Wildlife | `herdTable.ts` | Chickens, pigs, sheep (no parrots/ocelots yet) |
| Map Color | `catalog/biome-registry.json` | `[34, 139, 34]` |

## Deviations / limitations

- No cocoa pods, melons, parrots, ocelots, pandas, or jungle temples yet.
- Single-trunk trees only (no 2×2 emergent giants).

## Ruleset when modifying

- Jungle floor must stay dense: keep combined tree + undergrowth coverage high.
- Gate: `npm run kb:check`, `npm run sim:test`.
