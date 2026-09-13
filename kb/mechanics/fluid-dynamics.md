---
id: mechanics/fluid-dynamics
title: Fluid dynamics (water & lava)
kind: mechanic
wiki: https://minecraft.wiki/w/Water
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: partial
tags: [water, lava, fluid, physics, buoyancy, swimming, drowning, obsidian, nether]
related_docs: [docs/NETHER_DIMENSION_PLAN.md, entities/boat.md, entities/squid.md]
spec: {"fluidIds": true, "consts": {"src/game/terrain/fluidDynamics.ts": {"WATER_MAX": 15, "LAVA_MAX": 8, "SLOW_AFTER": 10}}}
---

# Fluid dynamics (water & lava)

Queue-driven flow simulation (sources + spread + reactions) plus swim,
oxygen/drowning, lava damage, fog/overlay, and buoyancy hooks used by boats
and squids. Water id 39, lava id 40.

## Vanilla specs

- Still water sources are infinite; flowing water spreads **7 blocks** from a
  source, lava **3** (overworld) / 7 (nether), falling straight down first.
- Water + lava source → **obsidian**; flowing lava + flowing water →
  **cobblestone** (or stone, direction-dependent). No lava flow in vanilla
  water mechanics beyond that.
- Soul sand pushes entities **up** (bubble column), magma pulls **down**.
- Swimming is slower than walking; sprint-swimming fastest; boats beat both.
- Drowning: air depletes underwater, then steady damage. Lava deals heavy
  contact damage plus fire.

## Our implementation

| Concern | Where |
|---|---|
| Flow simulator | `src/game/terrain/fluidDynamics.ts` `createFluidSimulator()` → `{ dryUpFluids, stepLiquids }`; `WATER_MAX = 15`, `LAVA_MAX = 8`, `SLOW_AFTER = 10` |
| Tick + queue | `s.liquidQ` entries `[x,y,z,id,flowDist,slowDelay]` (`src/game/state/gameState.ts`); stepped from `src/game/engine/renderLoop.ts` every **0.16 s** (~6.25 Hz), **24 cells/call**, culled past ~40 blocks XZ, guarded `1 < y < CHH-2` (`CHH = 128`) |
| Spread | waterfall first, then 4-neighbour lateral while `flowDist < maxDist`; past `SLOW_AFTER` only 1 direction/tick (round-robin `flowDist % 4`); flow cells persist via `s.edits` + `pendingEdits` (`action: "flow"`) and invalidate chunk + border neighbours |
| Reactions | 39 over 40 → **36 obsidian** ("Obsidian formed!"); 40 over 39 → **5 stone** ("Stone formed!"); lateral 39↔40 → **6 cobblestone**; 40 touching 51/52/53 (snow/ice/packed ice) converts to 39 source |
| Source removal | `dryUpFluids` — 6-dir flood-fill: no source left deletes all connected cells, else deletes unreachable-from-source cells; always remeshes |
| Swim physics | `src/game/physics/playerPhysics.ts` `stepPlayerPhysics` — `inWater` (feet/head 39), `inLava` (40), `submerged` (head 39) |
| Oxygen/drowning | same file — submerged + not flying: **−1 bubble/2 s from 10**; at 0 (+survival, +alive): `damagePlayer(2)` **every 1.5 s**; resurface resets to 10 |
| Contact damage | lava `damagePlayer(3)`/0.5 s; magma 99 + cactus 120 + suffocation `damagePlayer(1)`/0.5 s; fall >3.25 blocks → `floor(dist-3)` (water/lava landings exempt) |
| Water look/sound | `renderLoop.ts` head-block fog (water `0x103b66` near 0.5 far ≤26; lava `0x881800`), `HUD.tsx` blue overlay + bubbles, splash SFX on enter, FOV −10 submerged, swim exhaustion drain |
| Consumers | boats (`entities/boat.md`), squids (`entities/squid.md`) |
| Enqueue sites | worldgen springs, explosions, player place/break (`terrainGenerator.ts`, `explosions.ts`, `interaction/playerInteraction.ts`) — all push `[x,y,z,id,0]` |

### Swim numbers (from `playerPhysics.ts`)

| State | Horizontal | Vertical |
|---|---|---|
| Swim walk | `WALK×0.85` = 3.669 | sink 4.8/s², terminal −6; Space up cap 3.8; Shift dive cap −4.2; else damp 0.85 |
| Swim sprint | `SPRINT×0.75` = 4.209 | same |
| Soul sand 57 below | — | lift `vy+20·dt` cap 12 + oxygen refill 10 |
| Magma 99 below | — | drag `vy−16·dt` floor −10 |
| Lava | `WALK×0.45` = 1.943 | sink 2.56/s² term −2.5; Space cap 2.0 |

Base: `WALK = 4.317, SPRINT = 5.612, GRAV = 32` (`src/game/world/index.ts`).

## Deviations / limitations

- Spread distances (15/8) exceed vanilla (7/3) — custom tuning, wider floods.
- No fire-ignite, no lava-flow slowdown with distance beyond `SLOW_AFTER`,
  no swimming animation, no bubble columns as transport (soul-sand lift only).
- Ice id 52 counts as water for squids but not for swim detection (quirk).
- Burns use direct damage ticks; no fire-tick/afterburn state.

## Ruleset when modifying

- Block ids are load-bearing across files: 39/40/36/5/6/51/52/53/57/99 must
  stay in sync with `src/game/blocks.ts` — never renumber without grepping
  `fluidDynamics.ts`, `playerPhysics.ts`, `squid.ts`, `boat.ts`.
- `WATER_MAX`/`LAVA_MAX`/`SLOW_AFTER` gate both spread math and mesher
  expectations; the 24-cell batch + 40-block cull are the perf ceiling — raise
  the tick rate, not the batch, if flow feels slow.
- Flow writes go through `persistCell` (edits + pendingEdits) or they vanish
  on save; chunk invalidation must include border neighbours.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.

## Open work

- Vanilla 7/3 spread parity decision (currently 15/8 by tuning, undocumented
  reason — record it or change it).
- Fire spread/afterburn; swim animation; bubble-column transport blocks.
- Lava damage tuning vs armor (`armorDefense` interaction unverified).
