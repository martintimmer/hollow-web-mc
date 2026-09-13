---
id: mechanics/light-levels
title: "Light levels: our reach vs vanilla"
kind: mechanic
wiki: https://minecraft.wiki/w/Light
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-07
updated_at: 2026-09-07
status: implemented
tags: [light, glow, emitters, vanilla-parity, torch, fire]
related_docs: [kb/mechanics/lighting.md]
---

# Light levels: our reach vs vanilla

Every light-emitting block's reach (`lightDist`, set by
`catalog/patchLightDist.mjs` from the Java Edition table at
`https://minecraft.wiki/w/Light#Light-emitting_blocks`) next to the vanilla
level. Pool cutoff is `dist + 2` with decay 2, so reach ≈ vanilla radius.

### Lux equivalents

Our engine works in levels, not lux. Per the wiki's Vibrant Visuals
conversion (one block-light unit = 90.190359 lumen ≈ lux at one block),
each level equates to:

| Level | Lux | Our emitters at this level |
|---|---|---|
| 15 | 1352.9 | Beacon, Campfire, Conduit, Fire, Glowstone, Jack o'lantern, Lantern, Lava, Lava bucket, Froglights ×3, Redstone lamp, Sea lantern, Shroomlight |
| 14 | 1262.7 | End rod, Glow berries, Torch |
| 13 | 1172.5 | Lit furnace |
| 12 | 1082.3 | Respawn anchor (+parts, emitter-only), Sea pickle |
| 11 | 992.1 | Nether portal |
| 10 | 901.9 | Crying obsidian, Soul campfire, Soul fire, Soul lantern, Soul torch |
| 9 | 811.7 | Redstone ore |
| 7 | 631.3 | Enchanting table (emitter-only), Glow lichen, Redstone torch |
| 5 | 451.0 | Amethyst cluster |
| 4 | 360.8 | Large amethyst bud (emitter-only) |
| 3 | 270.6 | Candles ×17 (emitter-only), Magma block |
| 2 | 180.4 | Medium amethyst bud (emitter-only) |
| 1 | 90.2 | Brewing stand, Brown mushroom (emitter-only), Dragon egg (emitter-only), Small amethyst bud (emitter-only) |

| Block | ID(s) | Our reach | Vanilla | Note |
|---|---|---|---|---|
| Beacon | 94 | 15 | 15 | was 18 |
| Conduit | 95 | 15 | 15 | was 16 |
| Fire | 102 | 15 | 15 | — |
| Sea pickle (3-cluster visual) | 132 | 12 | 12 | was 10 |
| Glowstone | 47 | 15 | 15 | was 16 |
| Jack o'lantern | 87 | 15 | 15 | — |
| Lantern | 46 | 15 | 15 | was 16 |
| Lava | 40 | 15 | 15 | was 18 |
| Campfire (lit) | 85 | 15 | 15 | — |
| Redstone lamp (lit) | 83 | 15 | 15 | was 16 |
| Sea lantern | 48 | 15 | 15 | was 16 |
| Shroomlight | 88 | 15 | 15 | — |
| Froglights ×3 | 89–91 | 15 | 15 | were 16 |
| Lava bucket (item) | 136 | 15 | 15 | was 14 |
| End rod | 92 | 14 | 14 | — |
| Torch | 80 | 14 | 14 | was 15 |
| Glow berries | 101 | 14 | 14 | was 12 |
| Lit furnace | 96 | 13 | 13 | — |
| Nether portal | 98 | 11 | 11 | was 12 |
| Soul torch | 81 | 10 | 10 | was 13 |
| Soul lantern | 82 | 10 | 10 | was 14 |
| Soul campfire | 86 | 10 | 10 | was 14 |
| Soul fire | 630 | 10 | 10 | glow newly enabled |
| Crying obsidian | 93 | 10 | 10 | was 12 |
| Redstone ore (lit) | 33 | 9 | 9 | was 10 |
| Redstone torch | 84 | 7 | 7 | was 9 |
| Glow lichen | 100 | 7 | 7 | was 10 |
| Sea pickle note | 132 | 12 | 6/9/12/15 by count | ours renders 3 → 12 |
| Amethyst cluster | 97 | 5 | 5 | was 9 |
| Magma block | 99 | 3 | 3 | was 10 |
| Brewing stand (lit) | 103 | 1 | 1 | was 11 |
| Glow Item Frame | 378 | — | 0 (no light) | legacy dup id, render-only |
| Jack O Lantern | 418 | — | 15 | legacy dup id |
| Redstone Lamp | 596 | — | 15 | legacy dup id |

Vanilla emitters missing a fullbright mesh that still cast point light use the
emitter-only `light: 1` flag (joins the pool, keeps the shaded mesh):

| Block | ID(s) | Our reach | Vanilla |
|---|---|---|---|
| Candles ×17 (static single) | 185–703 | 3 | 3 (1-candle) |
| Enchanting table | 353 | 7 | 7 |
| Brown mushroom | 216 | 1 | 1 |
| Dragon egg | 347 | 1 | 1 |
| Large / medium / small amethyst bud | 428 / 486 / 619 | 4 / 2 / 1 | 4 / 2 / 1 |
| Respawn anchor (+parts) | 601–603 | 12 | 0/3/7/12/15 by charge (static model: assume charged) |

## Our implementation

| Concern | Where |
|---|---|
| Reach values | `catalog/completeRegistry.json` → `src/game/blocks.ts` (`lightDist`), via `catalog/patchLightDist.mjs` (also sets `light: 1` emitter-only flags; `BlockDef.light` declared in `blocks.ts`) |
| Point-light pool | `src/game/engine/renderLoop.ts` (~60 ms tick): gathers emitters within 40 m, keeps nearest 2/4/6 by quality preset, fire family weighted ×0.25, cutoff `dist + 2`, decay 2, night boost, fire flicker |
| Far-visible flames | `matGlow` is fog-immune (`fog: false`, alphaTest 0.08) in `sceneSetup.ts` + `materials.ts`; torch heads emit enlarged unlit `pushTorchFlame` quads (both meshers); campfire crosses at scale 0.85 |

## Deviations / limitations

- Point-light halos still only apply near-field (bounded pool by design — see U1 in `docs/KNOWN_ISSUES.md`); flames themselves read at any distance.
- No flood-fill light propagation: reach is a radial cutoff, not vanilla taxicab falloff.
- Legacy dup ids 378/418/596 untouched (U7); glow item frame emits no vanilla light.
- Not yet emitters (don't exist in our catalog): lit copper bulbs, trial/vault blocks, ender chest, lava cauldron (single cauldron has no fluid state), end gateway, cave-vine berries as a block state, candle cake, firefly bush, sculk family.

## Ruleset when modifying

- Reach numbers live in the registry — edit via `catalog/patchLightDist.mjs`, never `src/game/blocks.ts` by hand.
- `pushTorchFlame` dispatch must stay identical in `chunkMesher.ts` / `meshWorker.ts`.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`, `npm run kb:check`.

## Human verification

1. At night, walk 60+ blocks from a torch, campfire, and portal: flames stay bright (previously faded out).
2. Stand close: surroundings still lift with warm light + fire flicker; only the nearest few emitters cast (pool).
