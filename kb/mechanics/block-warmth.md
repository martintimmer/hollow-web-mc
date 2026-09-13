---
id: mechanics/block-warmth
title: Block warmth tiers (heat-aware placement)
kind: mechanic
wiki: https://minecraft.wiki/w/Block_colors
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-06
status: partial
tags: [warmth, heat, climate, worldgen, ice, sand, lava, seed-generator]
related_docs: [docs/CLIMATE_HYDROLOGY_PLAN.md, docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Block warmth tiers

Every block carries a warmth tier from **FROZEN (−2)** to **HOT (+2)**. The tier is
authoritative for heat-aware world generation: warm dunes/islands and frozen
mountaintops each own their territory, and FROZEN natural blocks are never placed
adjacent to WARM terrain. All IDs verified against `catalog/completeRegistry.json`.

## Canonical tier table

| Tier | Value | Block IDs |
|---|---|---|
| FROZEN | −2 | Ice `52`, Packed Ice `53`, Blue Ice `200`, Snow Block `51`, Snow `627`, Powder Snow `556`, Frosted Ice `371–374`, Grass Block Snow `383` |
| COLD | −1 | Snowy Grass `54`, Spruce Leaves `24`, Soul Fire `630–631`, Soul Torch `81`, Soul Lantern `82` |
| TEMPERATE | 0 | Everything else (default) |
| WARM | +1 | Sand `10`, Sandstone `11`, Red Sand `584`, Red Sandstone `585`, Terracotta `663`, Orange `515`, Yellow `710`, Brown `221`, Red `589`, White `700`, Light Gray `452`, Cactus `227`, Dead Bush `309` |
| HOT | +2 | Lava `40`/`430`/`431`, Fire `102`, Torch `80`, Magma Block `99`/`478`, Lit Furnace `96`, Glowstone `47`, Campfire `85`, Jack o'Lantern `87`/`418` |

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Tier catalog | this entry | Done (table above) |
| Warmth field | `src/game/terrain/terrainGenerator.ts` → `warmthAt` | Planned (CLIMATE_HYDROLOGY Phase 1): `clamp(round(tempAt * 4) - 2)` |
| Frozen/warm separation | `src/game/terrain/terrainGenerator.ts` → `applyTransitionBand` | Done: mid-temp FROZEN/WARM lowlands downgrade to oak/birch/plains (mountains exempt) |
| Emitter melting | gameplay tick (future) | Documented only: HOT melts adjacent FROZEN over time |

## Deviations / limitations

- Packed Ice (`53`) never melts near torches or light sources (ice-spikes rule) —
  it is exempt from emitter melting.
- Soul fire blocks read as COLD (blue freezing flame) though they still burn players;
  tier describes placement/climate affinity, not damage.
- Unlisted IDs default to TEMPERATE.

## Ruleset when modifying

- Never place natural FROZEN blocks (`52`, `51`, `627`) within 2 columns of WARM
  terrain (`10`, `11`, `584`, terracotta) and vice versa.
- Beach snow-vs-sand flips key off low-frequency temperature (wavelength ≥ 500).
- Gate: `npm run kb:check`, `npm run sim:test`.
