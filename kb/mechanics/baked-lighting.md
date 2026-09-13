---
id: mechanics/baked-lighting
title: "Light propagation & vertex-color lighting (REVERTED 2026-09-05)"
kind: mechanic
wiki: https://minecraft.wiki/w/Light
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-04
updated_at: 2026-09-05
status: absent
tags: [light, skylight, blocklight, torch, cave, vertex-color, mesher]
related_docs: [mechanics/lighting.md]
owner: lighting
---

# Light propagation & vertex-color lighting — REVERTED

This documents the **removed** baked-light experiment (2026-09-05). It was
reverted to the `8c89d24` lighting model after repeated regressions:
water rendered yellow (block-light channel `b=0` zeroed blue albedo),
stones/reflections cast yellow (day-active warm point-light pool + warm baked
tint), plus FPS/memory cost from per-chunk light floods. The design goal was to
restore the model they considered good.

## Our implementation

Nothing — this system does not exist in the tree. What runs today is the
pre-experiment model documented in `mechanics/lighting.md` (emissive tiles +
point-light pool, no per-voxel propagation). The section below records exactly
what was removed so a re-attempt does not rediscover it by diff-archaeology.

## What was reverted

- Deleted the baked-light modules (lightField.ts / bakedLight.ts, not tracked).
- `chunkMesh.ts`/`meshWorker.ts`/`chunkMesher.ts`: vertex colors are pure
  grayscale `(AO·shade, AO·shade, AO·shade)` again (full albedo preserved —
  water blue, no color corruption).
- `Game.tsx`: removed `addBakedLight`/`uSkyLight` wiring and
  `invalidateLightForEdit` call-sites.
- `renderLoop.ts`: restored warm-tinted sun (`cSunCol` cream→orange, 2.1),
  per-emitter point-light colors (`em.col`), held torch 2.4, and removed the
  `uSkyLight` uniform update.
- `specular.ts`: removed the `vColor.g` sky-gate (glints back to full strength).

## Vanilla specs (still authoritative for the future)

- Two 0-15 channels: sky (full 15 down through transparent cells, water/leaves
  attenuate) and block (torch 14, glowstone 15, lava 15). Flood-fill BFS, -1/step.
- Brightness ≈ max(blockLight, skyLight × daylight factor). Torches never tint
  daylight — the sun dominates at noon (torch ≈ 2 vs sun ≈ 100).
- Block light is warm-white, not per-block colored in classic Java (colored
  emitters are the Vibrant Visuals experimental path).

## Deviations / limitations

- Versus vanilla (`Light` 0–15 sky+block channels): we have no propagation at
  all — caves are lit only by the point-light pool (see `mechanics/lighting.md`).
- The removed experiment's three failure modes (albedo-zeroing via shared
  vertex-color channels, synchronous per-chunk floods on the dispatch path,
  uncoordinated multi-session shipping) are documented under `If re-attempted`
  below and must all be addressed before any retry.

## Ruleset when modifying

- Do NOT reintroduce vertex-color light channels without fixing the
  albedo-zeroing failure first (separate attribute, or liquids gated out) and
  without moving the flood off the mesh-dispatch path.
- Coordinate with the lighting owner before touching anything in this area —
  see the collision note in `AGENTS.md` (2026-09-05).
- Gates: `npm run kb:check`, `npm run sim:test`; visual changes additionally
  need human verification (agents do not run browser probes).

## Open work

- U1 in `docs/KNOWN_ISSUES.md` (bake 4-bit sky+block light) is the tracked
  successor task; `mechanics/lighting.md` holds the current-model spec.
- `## If re-attempted (lessons)` below is the design input for that task.

## If re-attempted (lessons)

- Do NOT overload vertex color channels that also act as albedo multipliers
  (`diffuseColor *= vColor`) — a 0 channel destroys albedo (water yellow).
  Either keep vertex colors grayscale and pass light via a separate attribute/
  texture, or gate liquids out of the light channels.
- Never run per-chunk floods synchronously on the mesh-dispatch path (cost
  4-12 ms main-thread × border recursion).
- Coordinate with other sessions sharing the working tree before shipping.

## Human checklist after revert

- Water reads blue at noon; stones neutral; specular glints white.
- Caves: no baked pools — torches/lava use the point-light pool as before
  (per-emitter color, `power×(1.2+1.2×nightFactor)`).
- FPS back to pre-baked-lighting levels (no per-chunk light floods).