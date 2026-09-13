---
id: terrain/swamp
title: "Swamp (wetland marsh & murky waters biome)"
kind: terrain
wiki: https://minecraft.wiki/w/Swamp
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [swamp, biome, terrain, wetland, mud, clay, lily-pad, witch-hut, slime, seed-generator]
related_docs: [docs/ALL_BIOMES_ELEVATION_PLAN.md, docs/BIOME_TERRAIN_IMPROVEMENT_PLAN.md]
---

# Swamp

The **Swamp** is a warm, stagnant wetland biome characterized by flat, water-logged terrain
nestled at or slightly below sea level, shallow murky green pools, clay beds, mud deposits,
swamp oak trees draped in hanging vines, and thriving amphibious wildlife.

## Vanilla specs (from the wiki)

- **Climate**:
  - Temperature: `0.8` (humid warm).
  - Downfall: `0.9` (very wet).
  - Precipitation: Yes (rain).
  - Foliage & grass color: `#6A7039` (murky brownish-olive).
  - Water color: `#617B5D` (swamp green with high turbidity).
- **Surface Blocks**:
  - `grass_block`, `mud` (Block ID: 490), `dirt`, and extensive deposits of `clay` in shallow pools.
  - Subsurface: `dirt` (2–4 blocks) over `stone`.
- **Terrain & Elevation**:
  - Extremely flat topography with heights tightly bounded between $y = 61$ and $y = 65$.
  - Interlaced with winding shallow waterways, marsh islands, and disconnected stagnant ponds.
  - Water depth in swamp ponds is typically only 1–3 blocks deep.
- **Flora & Vegetation**:
  - **Swamp Oak Trees**: low canopy oak variants draped in hanging **Vines**.
  - **Lily Pads** (Block ID: 457): floating on the water surface.
  - **Blue Orchids** (exclusive naturally to swamps) and mushrooms (brown and red) on tree roots.
  - Mangrove variant generates taller mangrove prop roots in warm tropical wetland sectors.
- **Fauna & Monsters**:
  - **Slimes**: spawn naturally at night between $y = 50$ and $y = 70$ (rate scales with moon phase).
  - **Frogs** (warm green/orange swamp frogs) and Tadpoles in shallow pools.
  - **Witches** spawn with elevated frequency.
- **Structures**:
  - **Swamp Hut / Witch Hut**: elevated wooden stilt hut over murky water.
  - Fossil fragments buried in swamp mud.

## Our implementation

| Concern | Current Where | Status & Target |
|---|---|---|
| Biome Selection | `src/game/terrain/biomes.ts` | Only `mangrove` exists ($T = 0.82, H = 0.88$); classic swamp is missing |
| Surface Blocks | `src/game/terrain/terrainGenerator.ts` → `surfaceAt` | Mud (`490`)/grass patches over clay (`256`) in lowlands; submerged clay pond beds |
| Flora & Scatter | `terrainGenerator.ts` → `scatter` + `trees.ts` → `generateSwampOak` | Low swamp oaks with hanging vine (`674`) tendrils, mud rings, blue orchids (`201`); lily pads (`457`) on shallow ponds |
| Lily Pad Block | `src/game/blocks.ts` | Registered (Block ID: 457), but not scattered onto water bodies |
| Map Color | `catalog/biome-registry.json` | `[50, 119, 29]` |

## Impact on our seed generator

Under the new Biome Understanding Architecture:
1. **Dedicated Voronoi Target**: Positioned at $T = 0.76, H = 0.85$ (slightly cooler and distinct
   from tropical mangrove swamps).
2. **Depression Carving**: In swamp coordinates, suppress raw continental height to $y = 61..64$,
   creating characteristic interwoven marsh pools, muddy inlets, and shallow navigable channels.
3. **Surface Variation**: Intermittent patches of **Mud** (`490`), **Grass** (`1`), and submerged
   **Clay** (`21`) along pond bottoms.
4. **Flora Scatter**:
   - Scatter **Lily Pads** (`457`) on calm water cells adjacent to swamp shores.
   - Introduce low-canopy swamp oaks with vine tendrils.

## Deviations / limitations

- Vine blocks are rendered as billboard cross models rather than attaching to block faces.
- Slime moon-phase spawning rate is currently fixed rather than tied to lunar cycles.

## Ruleset when modifying

- Marsh water must remain shallow ($1..3$ blocks) so players and mobs can wade through without swimming.
- Lily pads must only be placed on top of still water blocks with air above.
- Gate: `npm run kb:check`, `npm run sim:test`.
