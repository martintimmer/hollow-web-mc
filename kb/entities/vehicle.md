---
id: entities/vehicle
title: "Vehicle: drivable car entity with articulated panels"
kind: entity
wiki: https://minecraft.wiki/w/Minecart
game_version: "1.19.3 (Java)"
fetched_at: 2026-08-31
updated_at: 2026-08-31
status: partial
tags: ["vehicle", "car", "entity", "riding", "doors", "trunk", "glb"]
related_docs: ["docs/VEHICLE_SYSTEM_PLAN.md", "docs/CAR_VISUAL_STYLE_PLAN.md"]
---

# Vehicle

The project vehicle is a custom drivable entity inspired by Minecraft's rideable minecart, but it uses arcade wheeled physics and a Three.js model with named articulated panels.

## Vanilla specs

- The closest vanilla analogue is the rideable minecart, an entity that carries a passenger and is controlled by rail movement rather than road steering.
- Minecarts have a compact entity model and a passenger relationship; they do not define car doors, trunks, hoods, or hinged visual panels.
- The car system is therefore a project-specific entity mechanic, not a vanilla block or entity reproduction.

## Our implementation

| Concern | Where |
|---|---|
| Entity state | `src/game/vehicles/vehicleEntity.ts` (`VehicleEntity`) |
| Physics | `src/game/vehicles/vehiclePhysics.ts` (`stepVehiclePhysics`) |
| Model contract | `src/game/vehicles/vehicleModel.ts` (`VehicleModel`) |
| Procedural styles | `src/game/vehicles/create*.ts` + `vehicleDefs.ts` |
| Imported model path | `src/game/vehicles/fbxVehicle.ts` + SimDeck upload |
| Interaction | `src/components/Game.tsx` vehicle E-key raycasts |
| UI | `src/components/sim/SimDeck.tsx` |

## Deviations / limitations

- Cars use free-space arcade driving rather than rails, minecart momentum, or vanilla minecart dimensions.
- The procedural fallback is low-poly and does not provide realistic collision for individual panels.
- Panel interaction is visual state only: opening a door or trunk does not yet create a separate physics collider or inventory container.
- Imported models require a stable node naming convention for wheels and articulated parts; arbitrary meshes cannot be guaranteed to animate correctly.

## Ruleset when modifying

- Preserve the `VehicleModel` wheel names `wheel_FL`, `wheel_FR`, `wheel_RL`, and `wheel_RR` and keep wheel spin/steer synchronized with `vehicleEntity.ts`.
- Keep imported GLB/GLTF models optional; the procedural fallback must remain available in SimDeck.
- Articulated nodes must rotate around authored hinge pivots and must be raycastable while closed and open.
- Do not claim physical storage or panel collision unless state and collision behavior are implemented.
- Machine gates to run: `tsc -b`, `npm run build`, `npm run sim:test`, `node catalog/textureCheck.mjs`, `node scripts/test-worker-meshing.mjs`.

## Open work

- Replace the box-primitive production cars with an authored low-poly GLB model and explicit door, hood, trunk, hatch, wheel, glass, and interior node names.
- Add panel metadata/state for hood, trunk, liftgate, four doors, and optional fuel flap.
- Add separate panel collision and real trunk inventory only if gameplay requires it.
