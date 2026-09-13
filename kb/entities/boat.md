---
id: entities/boat
title: Boat
kind: entity
wiki: https://minecraft.wiki/w/Boat
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-05
updated_at: 2026-09-05
status: implemented
tags: [boat, vehicle, water, riding, transport, buoyancy]
related_docs: [mechanics/fluid-dynamics.md, entities/vehicle.md]
spec: {"consts": {"src/game/entities/boat.ts": {"BOAT_DRIVE_SPEED": 7.5, "BOAT_TURN_RATE": 2.4}}}
---

# Boat

Rideable water vehicle with sine bobbing and paddle steering. **7 wooden
variants** (Oak 1041, Spruce 1123, Birch 719, Jungle 959, Acacia 1163, Dark
Oak 873, Mangrove 999) plus chest-boat variants in the registry; spawner also
docks 2 decorative boats near water.

## Vanilla specs

- One variant per wood type (+ bamboo raft); floats on water; paddle steering
  (each oar driven separately); carries the rider (+1 passenger/mob in JE).
- Breaks on high-speed land impact, dropping sticks + planks.

## Our implementation

| Concern | Where |
|---|---|
| Model + kinematics | `src/game/entities/boat.ts` — `createBoatMesh`, `updateBoatKinematics(boat, dt, waterLevel = 62)` |
| Buoyancy | `targetY = waterLevel − 0.2 + sin(rowTime×2.2)×0.03` (±3 cm bob), eased `dt×6.0`; doubles as ground-rest on land |
| Drive | `BOAT_DRIVE_SPEED = 7.5`, `BOAT_TURN_RATE = 2.4`; W thrust 7.5 fwd / S 2.625 back, clamp 8.625; oars swing (`sin(rowTime)×0.45`) only when ridden + moving |
| Launch/board/ride | aim at water + E/right-click launches (survival consumes one; land shows hint); empty-hand E boards ("Rowing — WASD/Shift"); Shift disembarks waterside; left-click breaks into a pickupable boat item |
| Persistence | dimension-aware saves; relog keeps boats; Nether trips + world deletes handled |
| Docked spawns | `src/game/entities/spawner.ts` docks 2 boats near water surfaces |

## Deviations / limitations

- No per-variant model differences verified (shared hull mesh assumed —
  confirm before claiming); no paddle-per-side input (WASD steering instead).
- No high-speed land-breakage damage (beached boats just barely move).
- Single rider; no passenger/mob slot.
- Old revisions of this entry claimed a single model and cited the wrong
  bobbing anchor (`boat.ts:75` is oar setup) — both corrected 2026-09-05.

## Ruleset when modifying

- Boat Y must track the fluid water level (`waterLevel` default 62 = sea
  level; keep in sync with `fluidDynamics.ts` water id 39 and sea level).
- Board/disembark must never bury the player (waterside placement rule) and
  must keep dimension-aware save keys.
- Variant ids live in the registry — add hulls there, not in `boat.ts`.
- Gates: `tsc -b`, `npm run build`, `npm run sim:test`, `npm run kb:check`.
  Human check: water-launch toast, WASD turn/paddle, Shift disembark,
  left-click pickup, relog persistence.

## Open work

- Verify per-variant hull differences; passenger seat; land-impact breakage.
- Paddle-per-side (A/D oars) control scheme as an option.
