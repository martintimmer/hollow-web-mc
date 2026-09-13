---
id: terrain/nether
title: Nether dimension
kind: terrain
wiki: https://minecraft.wiki/w/The_Nether
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-03
updated_at: 2026-09-03
status: partial
tags: [nether, dimension, terrain, lava, basalt, soul-sand]
related_docs: [docs/NETHER_DIMENSION_PLAN.md, mechanics/worldgen.md]
---

# Nether dimension

Volcanic dimension generator with its own block set, lava seas, and soul-sand
basins. Pairs with `mechanics/worldgen.md` and `docs/NETHER_DIMENSION_PLAN.md`.

## Vanilla specs

- Bedrock floor/ceiling; lava seas at y~31; netherrack everywhere; basalt deltas,
  soul sand valleys, blackstone. No day/night; red sky.

## Our implementation

| Concern | Where |
|---|---|
| Generator | `src/game/terrain/netherGenerator.ts` |
| Key constants | `src/game/terrain/netherGenerator.ts:15` (`NETHER_LAVA_LEVEL=31`, `NETHERRACK_ID=56`, `LAVA_ID=40`, `SOUL_SAND_ID=57`, `SOUL_SOIL_ID=632`, `SOUL_FIRE_ID=630`, `BASALT_ID=173`, `SMOOTH_BASALT_ID=625`, `BLACKSTONE_ID=193`) |
| Tests | `scripts/test-nether-generator.mjs`, `scripts/test-nether-gate.mjs`, `scripts/probe-nether-gate.mjs` |

## Deviations / limitations

- Partial: base blocks + lava level only; no fortresses, bastions, or mobs yet.
- Travel from overworld and true portal-frame detection still open (see
  `ui/portal-modal.md`).

## Ruleset when modifying

- Block ids come from `catalog/completeRegistry.json`; never hardcode new ids in
  `netherGenerator.ts` without registering them.
- Gate: `npm run kb:check`, `npm run sim:test`.

## Open work

- Fortresses/bastions; nether mobs; portal-frame detection.
