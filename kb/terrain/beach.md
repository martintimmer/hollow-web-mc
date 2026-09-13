---
id: terrain/beach
title: "Beach (coastal biome style)"
kind: mechanic
wiki: https://minecraft.wiki/w/Beach
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-28
updated_at: 2026-08-28
status: partial
tags: [beach, biome, terrain, coast, sand, sandstone, shore, seed-generator]
related_docs: [docs/GAME_MODULARIZATION_PLAN.md]
---

# Beach

Coastal transition biome from mainland to ocean: a low, mostly flat band of **sand**
over **sandstone** at sea level, with no trees. Near mountains it is replaced by
**stony shores**, and in cold climates by **snowy beaches**.

## Vanilla specs (from the wiki)

- **Climate**: temperature 0.8, downfall 0.4, precipitation yes.
- **Blocks**: `sand` surface, `sandstone` below; the sand strip commonly continues
  a few blocks **underwater** along the shore.
- **Structures**: **Buried Treasure** (buried in sand) and occasionally a **Shipwreck**
  stranded on the beach.
- **Mobs**: **turtles** spawn on beaches (creature category, group 2–5); other passive
  animals do **not** spawn.
- **Variants**:
  - *Snowy Beach* — in frozen/cold biomes, sand surface becomes snow-covered (our
    `top = 51` snow / `sub = 10` sand).
  - *Stony Shore* — generated instead of beach adjacent to mountains / tall cliffs.
- **Generation rules**:
  - Generated on coasts bordering non-deep oceans and most flatland biomes; rarely
    land-locked.
  - Width/shape varies with the surrounding terrain (wide & hilly, short & flat, or
    jagged with tall cliffs).
  - Since 1.18 beaches are **generally wider** and prefer **flat coastlines**.
  - No beach is generated where a **desert borders an ocean** (21w42a fix).
- **ID**: `beach` (Java), numeric 16 (Bedrock).

## Our implementation

| Concern | Where |
|---|---|
| Surface block decision (the beach band) | `src/game/terrain/terrainGenerator.ts` → `createTerrainContext.surfaceAt` |
| Beach vegetation (sugar cane) | `terrainGenerator.ts` → `createChunkGenerator.scatter` |
| Shipwrecks | `terrainGenerator.ts` `genChunk` (deep-ocean rule) + `src/game/terrain/ocean.ts` |
| Biome Voronoi (no explicit beach entry) | `src/game/terrain/biomes.ts` (`BIOME_TARGETS` has no `beach`) |
| Map color for sand tile | `src/game/engine/worldMap.ts` (`MAPCOL` entry) |
| World/seed archetypes | `src/game/world/index.ts` (`TYPES`, `WorldType`) |

Beach-like coast is produced **inside `surfaceAt`** (not by the biome Voronoi), keyed on
elevation + slope + temperature:

```ts
// terrainGenerator.ts surfaceAt(x, z) — beach band (sand / sandstone)
if (h <= SEA) {
  top = frozen ? 51 : 10; sub = 10;            // ocean beach / seabed
} else if (h <= SEA + 2 && slope <= 1.8) {
  top = frozen ? 51 : 10; sub = 19;            // Beach Sand & Sandstone
} else if (h >= alpineSnowLine || (h >= 102 && cold)) {
  top = 51; sub = 52;                          // snow cap
} else if (slope >= 2.5) {
  top = 5; sub = 5;                            // steep cliff → stone (≈ stony shore)
} else if (slope >= 1.8) {
  top = 11; sub = 6;                           // gravel scree
}
```

`scatter` adds a single **sugar cane** on the water’s-edge cell (`surf.h === SEA + 1`
with an adjacent `h <= SEA` neighbor), which is the only beach flora.

## Impact on our seed generator

The beach style is a **post-biome, elevation/slope/temperature filter**, so it reacts to
the same seed inputs that drive the rest of the terrain. Different seed archetypes
(`WorldType` in `src/game/world/index.ts` + the seed string → `seedMix`) change the noise fields
these rules read, and therefore how the coastline reads:

| Seed-generator input | Field the beach reads | Effect on the beach |
|---|---|---|
| **Seed / `seedMix`** | `vnoise`/`ridge` landscape | Where coastlines fall, and how jagged vs smooth the shore is |
| **`w.scale`** (world size) | `continentalAt`, `terrainHeight` | Bigger scale → broader coastal bands → wider, more continuous beaches |
| **`w.mtn`** (mountain factor) | `slope` (from `terrainHeight` neighbors) | High mtn → steep cliffs at sea → beach replaced by **stone (stony shore)** |
| **`w.temp`** (global temperature) | `tempAt` → `frozen`/`cold` | Cold → sand becomes **snow** (snowy beach); hot → sand persists, more sugar cane |
| **`w.island`** | `rawHeight` (+ island offset) | Island worlds → coastline everywhere → beaches ring every island |
| **`SEA` level** | `h <= SEA`, `h <= SEA + 2` | Higher sea → flood plains → wider submerged sand apron; the `SEA+2` band is the actual beach width |
| **Erosion / river carving** | `rawHeight` carve passes | Rivers cutting to coast → sand riverbed (`top=10, sub=21`) mixed into the beach |
| **Desert–ocean adjacency** | (not implemented) | Vanilla 21w42a skips a beach when desert touches ocean; we do not special-case this yet |

So a "beach-heavy" or "archipelago" seed style would be realized by tuning `w.scale` up,
`w.mtn` down, and/or `w.island` on — the beach band itself (`SEA+2`, sand→sandstone) can
then be widened to match vanilla 1.18 by increasing the band from `SEA + 2` to `SEA + 3/4`
and flattening the slope threshold.

## Deviations / limitations

- **No dedicated `beach` biome** in `biomes.ts` — beach is purely an `surfaceAt` elevation
  rule, so it never shows in the biome Voronoi or the map’s biome coloring as "Beach".
- **Shipwrecks only generate in deep ocean** (`C_chunk < -0.22 && h <= SEA - 9`), never
  stranded on beaches as vanilla allows.
- **No Buried Treasure** on beaches.
- **No turtles** spawn on beaches.
- Beach band is **2 blocks wide** (`h <= SEA + 2`) vs vanilla 1.18’s generally wider
  beaches.
- **No desert→ocean beach suppression** (21w42a).
- No gravel-beach variant (removed in vanilla long ago; only used for the scree rule).

## Ruleset when modifying

- Keep the `surfaceAt` ordering stable: ocean → beach → snow cap → cliff → gravel (later
  branches must not shadow earlier ones for the same cell).
- If you touch beach/coast visuals, run `node scripts/ci-perf.mjs --gate` (golden-frame
  MAE) plus `npx tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`.
- New seeds/biome styles must keep `genChunk` deterministic for the same `(seed, world)`.

## Open work

- Consider adding a real `beach` entry to `BIOME_TARGETS` (temp ~0.8/hum ~0.4) so the map
  and any biome HUD show "Beach".
- Wider beach band + dune/flat coastline preference (vanilla 1.18 parity).
- Stranded shipwrecks + buried treasure on the sand strip.
- Desert–ocean beach suppression rule.