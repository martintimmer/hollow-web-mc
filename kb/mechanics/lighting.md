---
id: mechanics/lighting
title: Lighting (emissive glow & planned light bake)
kind: mechanic
wiki: https://minecraft.wiki/w/Light
game_version: "1.19.3 (Java)"
fetched_at:
updated_at: 2026-09-03
status: partial
tags: [lighting, glow, emissive, vertex-color, perf, U1]
related_docs: [docs/EAGLERCRAFT_SMOOTHNESS_PLAN.md, docs/PERFORMANCE_INVESTIGATION.md]
owner: lighting
experiment: 2026-09-05 lighting session editing lightField.ts/bakedLight.ts, frequent dist rebuilds — verify bundle hash before trusting visuals
---

# Lighting (emissive glow & planned light bake)

Current lighting is emissive-only: blocks with `glow`/`lightPower` are drawn
self-lit. Full sky+block light baking (U1) is an open perf/visual task.

## Vanilla specs

- 0-15 light level from sky + block light; smooth falloff; affects mob spawning,
  plant growth, rendering brightness.
- Sunlight is monochromatic white — it never tints. Warmth at sunrise/sunset
  lives in the sky/fog colors, not the light (`https://minecraft.wiki/w/Light`
  § Rendered brightness). Torch-level emitters read warm; moonlight is faint
  and cool.
- Face shading: top faces full brightness, north/south slightly darkened,
  bottom and east/west darkened most.
- Torch emits level 14; sky outdoors is 15; night internal sky light bottoms
  out near 4 (mobs spawn ≤ 7).

## Our implementation

| Concern | Where |
|---|---|
| Emissive glow today | `src/game/engine/meshWorker.ts:207` (`if (bdef.glow || bdef.lightPower)`) drives emissive tile/material |
| Sun / moon light | `renderLoop.ts`: directional sun is constant neutral white (`0xffffff`, intensity `dayFactor × 2.1`); moon faint cool (`0x38557a`, 0.02); sunset warmth lives only in the sky-dome/fog uniforms, never in the light color |
| Held-torch light | `src/game/engine/heldItem.ts` + `Game.tsx` lights section |
| Far-visible flames | `matGlow` is fog-immune (`fog: false` in `sceneSetup.ts` + `materials.ts`) so fire/campfire/portals read at any range; torch heads emit unlit `pushTorchFlame` quads into the glow bucket (both meshers, oriented like the stick) since the Lambert stick alone goes dark far away/at night |
| (planned) light bake | `meshWorker.ts` side-band `lightR`, `Game.tsx` lights; tunables `LIGHT_GAMMA` / `BLOCKLIGHT_SPREAD` |

## Deviations / limitations

- No per-voxel sky/block light propagation; no dynamic shadows from light level.
- We use a small pool of point lights + emissive tiles rather than baked vertex
  colors. This is the U1 item in `docs/KNOWN_ISSUES.md`.

## Ruleset when modifying

- Do not regress the 25-point-light pool without landing U1 (else perf cliff).
- Emissive mapping lives in the registry (`glow`/`lightPower` flags) — edit via
  `catalog/completeRegistry.json`, not `src/game/blocks.ts`.
- Gate: `npm run kb:check`, `npm run ci:perf`.

## Open work

- U1: bake 4-bit sky+block light into vertex colors; kill point-light pool.
