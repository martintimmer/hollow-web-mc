# Core Engine & Gameplay Roadmap Plan

_Status: proposed — authored 2026-09-03_
_Scope: the "Core Engine & Rendering / World Gen / Physics / UI" feature list mapped to this
codebase. Most items already exist; this plan isolates the real gaps and sequences the work._

---

## 1. Status map (spec → codebase)

| Spec item | Status | Where |
|---|---|---|
| Chunk loading + Web Workers | ✅ implemented | `meshPool.ts:43` (`new Worker(meshWorker.ts)`), `chunkStreamer.ts`, `meshWorker.ts` |
| Frustum culling | ✅ implemented | `chunkMesher.ts` `m.frustumCulled = true` per chunk mesh |
| Stable 60 fps target | ✅ mostly | worker meshing, LOD/horizon by quality preset (`Game.tsx:714`) |
| Visual tiers (Basic/Detailed/Advanced) | 🟡 partial | quality presets smooth/balanced/beautiful exist (distance/horizon/postfx); **shadow map type is hard-coded `PCFShadowMap`** (`Game.tsx:2093`) — no Basic/PCFSoft/Cascaded tiers |
| Cascaded Shadow Maps (sun) | ❌ missing | single directional light, one 512² PCF shadow map (`Game.tsx:2171`) |
| InstancedMesh for blocks + custom voxelized GLB assets | ❌ missing | custom assets are one merged `BufferGeometry` **per placed block** (entity); InstancedMesh only used for particles/weather |
| Simplex noise, seed-driven terrain | ✅ implemented | `src/game/noise.ts` (`makeNoise(seedMix)`), `terrainGenerator.ts` |
| Biome temp+moisture intersection | ✅ implemented | `sampleBiome(…, tempNoise, humNoise, …)` (`biomes.ts:165`), elevation modifiers, odyssey set |
| Weather cycles (clear/rain/snow) | 🟡 partial | `weather.ts` instanced rain/snow/thunder, biome-aware snow; not a formal time-based state machine |
| AABB collision + gravity (2010s feel) | ✅ implemented | `src/game/physics/playerPhysics.ts` (`collides`, gravity, auto-step) |
| Camera raycast block place/mine | ✅ implemented | `Game.tsx:2476` `raycast`, `raycastLiquid`, `Raycaster` |
| Game modes (Creative/Survival) | ✅ implemented | creative toggle + `/gamemode`, survival/peaceful/hardcore (`Game.tsx:237`) |
| Inventory (custom blocks/entities) | ✅ implemented | `src/game/inventory.ts`, custom asset catalog + voxel payloads |
| Cinematic menus (DOF-blurred live scene) | ✅ implemented | menus + `postFx.ts` DOF, `OptionsMenu.tsx` |
| HTML overlays + chat | ✅ implemented | `HUD.tsx` chat (mentions/timers), DOM UI |
| Custom voxelized GLB assets | ✅ implemented | `docs/CUSTOM_ASSET_VOXEL_PLAN.md` (P1–P3 + T1–T3) |

**Bottom line:** ~85% already exists. The genuine gaps are **shadow quality tiers/CSM**,
**InstancedMesh for repeated blocks & custom assets**, a **formal weather state machine**,
and tuning passes (biomes, AABB feel).

---

## 2. Implementation phases (the real work)

### P1 — Shadow quality tiers + Cascaded Shadow Maps
- Add configurable shadow type per tier: **Basic** → `BasicShadowMap`, **Detailed** →
  `PCFSoftShadowMap`, **Advanced** → `PCFShadowMap` now + **CSM** (sun) later.
- Wire to the existing quality presets (smooth/balanced/beautiful) + a Shadow setting.
- **CSM** (`three/examples/jsm/csm/CSM.js`) for the directional sun: 3–4 cascades, sized to
  render distance, `CSMShadowMap`. Toggle-able; off for low tiers.
- Files: `Game.tsx` (shadow setup), `OptionsMenu.tsx` (UI), quality-preset mapping.
- Gates: `tsc -b`, `npm run build`, `ci:perf` (golden-frame MAE).

### P2 — InstancedMesh for custom assets (mass repetition)
- Currently each placed custom block is an entity with its own geometry. Convert the
  **voxel-kind** custom assets to a per-asset **`InstancedMesh`** pool (one geometry per
  asset id, `instanceMatrix` per placed block, per-instance color via `instanceColor`).
- Block-kind stays entity-free: render as native chunk voxels where possible (already a
  known follow-up), else instanced cubes.
- Update `ensureCustomAssetEntity` (`Game.tsx`) + `voxelMesh.ts` to build a shared geometry
  and a pool; placement/removal updates an instance matrix.
- Files: `src/game/voxelMesh.ts`, `Game.tsx` (custom asset entities), new `customAssetInstances.ts`.
- Gates: `tsc -b`, `npm run build`, `test-worker-meshing`, `ci:perf`.

### P3 — Formal weather state machine — ✅ DONE
- New `src/game/weatherMachine.ts`: time-based global cycle clear → cloudy → rain/thunder
  (or **snow in cold biomes**) → clear, with per-state durations and transition
  probabilities; seeded from the saved cloud-weather preference.
- Biome influence from the world seed: `surfaceAt(player).cold/frozen` (temperature noise)
  turns rain into snow; drives precipitation + sky/cloud/lighting states each frame.
- `renderLoop` steps the machine; `s.weatherType` (precip) + `s.cloudWeather` (sky) update
  accordingly. `/weather` now accepts `clear|cloudy|rain|snow|thunder` and forces the state.
- Files: `src/game/weatherMachine.ts`, `renderLoop.ts`, `Game.tsx`.

### P4 — Biome & seed tuning (verification pass)
- Audit `biomes.ts` temp/moisture thresholds vs `ALL_BIOMES_ELEVATION_PLAN.md`; add missing
  biome foliage/color parity and per-biome mob rules where trivial.
- Confirm the seed visualizer (`/seed.html`) reflects any threshold changes.

### P5 — 2010s feel: AABB & interaction tuning
- Audit `playerPhysics.ts` gravity/jump/step constants vs the "authentic 2010s" target
  (jump height ~1.25 blocks, gravity ~28, auto-step 0.5–0.6).
- Verify survival hold-timer mining + creative instant-break event listeners.
- Files: `playerPhysics.ts`, `Game.tsx` interaction.

---

## 3. Ordering & recommendation

**P1 → P2 → P3**, then P4/P5 as tuning passes. P1 (shadow tiers/CSM) and P2
(InstancedMesh) are the two headline gaps; both are contained and testable via existing gates.

---

## 4. Gates (every change)

```
npx tsc -b
npm run build
npm run sim:test
node catalog/textureCheck.mjs
node scripts/test-worker-meshing.mjs
npm run kb:check
npm run pages:check
e2e: npx playwright test e2e/test-1199.spec.js
```

---

## 5. Risks / notes
- CSM increases shadow cost + memory; gate behind Advanced tier and render-distance-scaled
  cascades.
- InstancedMesh changes the custom-asset entity path (placement/removal/yaw/offset) — must
  keep held-item + thumbnails + positioning (offset) behavior.
- Weather state machine must not break the existing `/weather` command or per-user persistence.