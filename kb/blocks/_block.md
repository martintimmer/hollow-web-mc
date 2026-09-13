---
id: blocks/_block
title: "Block (general semantics)"
kind: block
wiki: https://minecraft.wiki/w/Block
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-27
updated_at: 2026-09-01
status: implemented
tags: [block, fundamentals, grid, opacity, gravity, textures]
related_docs: [docs/ARCHITECTURE.md, docs/MINECRAFT_BLOCK_MECHANICS_PLAN.md]
---

# Block (general semantics)

Reference semantics for all blocks. Individual blocks get their own entry; this file
holds the shared rules every block change must respect.

## Vanilla specs (from wiki)

- Blocks live in a **1 m³ grid**. Some occupy partial cells: slabs, snow layers,
  ladders, vines, stairs, turtle eggs, sea pickles.
- **Air** is itself a block (in JE: air / cave air / void air) — absence = air block.
- **Opaque** blocks occupy their full cubic meter; **transparent** (glass, flowers)
  do not block sight; opaque blocks block light entirely, transparent ones let it pass
  (or weaken it).
- **Light**: emitted per block (sea lantern, glowstone); light values vary per block.
- **Gravity blocks** (fall when unsupported → falling entities): sand, red sand,
  gravel, anvils (all damage levels), dragon eggs, concrete powder (all colors),
  scaffolding, snow layers (BE only), pointed dripstone, suspicious sand/gravel.
- **Auto-step**: player can step up automatically if height difference ≤ 0.6 blocks.
- **Textures**: 16×16 px per face (different per face for logs etc.); animated
  textures: water, lava, fire, nether portal, prismarine, …
- **Breaking** emits sounds/particles (except fall-away, fluid wash, replaced, support
  removed, leaf decay cases).

## Our implementation

| Concern | Where |
|---|---|
| Registry (1,174 entries) | `src/game/blocks.ts` — `BLOCKS` array + `BLOCK_MAP`, `isSolid`, `isOpaque`, `isStair`, `isItemOnly` |
| Generator | `catalog/buildCompleteCatalog.js` → `catalog/completeRegistry.json`; `catalog/buildMasterAtlas.js --atlas-only` bakes tiles; corrections via `catalog/patchBlockTiles.mjs`, `patchBlockFlags.mjs`, `patchRegistryIds.mjs` |
| World storage | per-chunk `Uint8Array` 16×128×16 byte ids (`src/components/Game.tsx` `genChunk`), stored bytes < 256 (see BED_BYTE hack); dynamic custom asset ids are registered above the static catalog range |
| Meshing | `src/game/engine/chunkMesh.ts` + `meshWorker.ts` (worker) — full-cube path plus ~15 special shapes; custom 3D asset ids skip voxel geometry and do not cull neighboring faces |
| Textures | 512² atlas, 32×32 slots of 16px, `src/game/engine/atlas.ts` + `atlasData.ts` |
| Flags of note | `trans`, `foliage`, `glow/lightPower/lightCol/lightDist`, `stair`, `slab`, `liquid`, `solid` |

## Deviations / limitations

- **Slabs render as full cubes** — no half-block geometry (slab flag exists in the
  registry but the mesher ignores it). Only stairs have partial geometry.
- **Gravity blocks: partial** — sand (10) and gravel (12) fall
  (`Game.tsx:3694-3724` `checkFallingBlocks`/`spawnFallingBlock` → falling entities).
  Concrete powder, anvils, dragon eggs, etc. do NOT fall yet.
- **No light blocking/transmission model** — light is dynamic point lights (25-pool)
  + sun/ambient/hemi, not per-block propagation. (U1 light-bake planned.)
- **Custom 3D asset overlays** are collision-solid and can span a saved 1–6 × 1–6 footprint, but world storage still has one anchor cell. They render separately from voxel geometry, so they are intentionally non-opaque for face culling; placement direction is saved in `world_blocks.dir` as one of four right-angle facings.
- **Water/lava** are single ids (39/40) with a simplified flow system (falls, lateral
  spread, water+lava reactions, ice melting); spread cells are persisted as block
  edits so lakes survive relog. No waterlogging.
- **Animated textures** (water/lava/fire/prismarine) are static — animation is a
  planned shader (U14).
- **Items vs blocks**: shared numeric registry; `isItemOnly` = has `itemTexture` or
  category item/tools/combat/food. Block ids end at 710; items start at 711.

## Ruleset when modifying

- NEVER hand-edit `src/game/blocks.ts` in a way a generator would overwrite — fix
  `catalog/completeRegistry.json` (+ patch scripts) instead; regenerating the atlas is
  destructive (U9 — do not run casually).
- Keep worker (`meshWorker.ts`) and main-thread (`Game.tsx advanceMeshJob`) meshing in
  **parity** — any shape change must land in both.
- New block ids: keep placeable blocks < 711 or fix `isItemOnly` semantics (U7 history).
- Gates: `tsc -b` && `npm run build` && `npm run sim:test` && `node catalog/textureCheck.mjs`
  && `node scripts/test-worker-meshing.mjs`; visual changes additionally `npm run ci:perf`.

## Open work

- U1 (light bake), U2 (mip atlas), U3 (greedy), U14 (animated liquids), U15 (model-JSON
  loader), U9–U13 (texture gen hardening) — see `docs/KNOWN_ISSUES.md`.
