---
id: mechanics/camera-exposure
title: "Camera exposure: analytic TTL meter + Program Auto (legacy-sim)"
kind: mechanic
wiki:
game_version: ""
fetched_at: 2026-09-08
updated_at: 2026-09-08
status: implemented
tags: ["rendering", "exposure", "metering", "camera", "audit-2026-09-08"]
related_docs: ["docs/HUMAN_TEST_CHECKLIST.md"]
---

# Camera exposure: analytic TTL meter + Program Auto (legacy-sim)

Full audit vs. photographic standards completed 2026-09-08. Short version:
the HUD mimics a still-camera P-mode (matrix/center/spot, f/shutter/ISO,
EV comp), but the meter is a feed-forward analytic lux synthesis, the
N/t/S readouts are display-only, and aperture is NOT linked to DOF.

## Vanilla specs (photography standards)

- Exposure `H = E·t` (lux-seconds); camera settings `EV = log2(N^2/t)`.
- Reflected-light equation `N^2/t = L·S/K`, `K = 12.5` (Canon/Nikon/Sekonic)
  or `14` (Minolta/Pentax); incident-light `N^2/t = E·S/C`, `C = 250`
  (flat) / `320-340` (hemispherical). Assumes ~12-18% average reflectance.
- Metering patterns: spot 1-5%, partial 10-15%, center-weighted 60-80%,
  multi-zone/matrix (segments + AF-point bias + exposure database),
  highlight-weighted (clipping avoidance).
- Reciprocity: aperture stops trade against shutter halvings/doublings.
- Movie cameras: rotary shutter, 180 deg => 1/48 s at 24 fps; exposure via
  T-stops + ND + EI; metering usually handheld incident dome, not TTL auto.
- DOF `~= 2u^2Nc/f^2`: linear in N, inverse-square in f, square in u,
  asymmetric near/far. No aperture => no DOF change, no shutter => no
  motion-blur change.

## Our implementation (legacy-sim model)

| Concern | Where |
|---|---|
| Lux synthesis + matrix/center/spot weighting + Program Auto | `src/game/engine/lightMeter.ts` (`estimateViewLux`, `stepLightMeter`) |
| Meter state (`meterLux/mStepN/mStepT/mStepISO/meterGain/wbK/evComp`) | `src/game/state/gameState.ts` |
| Per-frame stepping + crosshair raycast + WB + halo dimming | `src/game/engine/renderLoop.ts` |
| P-mode HUD readout + comp dial | `src/components/gui/HUD.tsx` |
| Metering/EV settings UI | `src/components/gui/OptionsMenu.tsx` (Lighting tab) |
| Exposure model presets (legacy-sim vs iso-ettl) | `src/game/engine/exposurePresets.ts` |
| Settings persistence (`exposure_model` column) | `src/services/api.ts`, `server/index.js`, `server/db.js` |

- Lux sources: `direct = 9000·sunUp` (real sunny ~82 klux: our scale is ~8x
  compressed), sky zenith/horizon models, sun-disc glare 4.1M, moon glare
  6000, point emitters inverse-square capped 4 x 1200 / 3000 total.
- Geometry probe: 5-tap circle / 9-tap frame of `rayHit` + `skyOpen` +
  `lightVisible`, coarse albedo LUT, crosshair block+face override
  (AF-linked spot equivalent). Matrix highlight rescue: `min(blended, peak/4)`.
- Adaptation lag matrix 1.3 s / center 0.8 s / spot 0.15 s = eye emulation;
  real meters are instantaneous.
- Program: `R = log2(meterExp/115.4) - comp`, iris f/2.0-8 first, then
  shutter 1/30-1/8000, then ISO 100-12800 (1/3-stop ladder). `METER_REF_LUX`
  bakes in a ~3-stop dark-cinematic grade; emitters get 6x emphasis and a
  0.3-stop night lift. Render exposure is ONLY `toneMappingExposure = gain`;
  snapped N/t/S never feed back (comment in code: "display-only").
- White balance: per-emitter Kelvin + daylight `3200+3300·sqrt(sunUp)`
  model, 0.75 adaptation strength, applied as post `uWB` multiplier.
- DOF (`src/game/engine/postFx.ts`): focus from crosshair raycast clamped
  0.5-10 blocks, `focusScale = (1-focus/10)^1.5`, `CoC = |d-focus|/focus`,
  radius from `dofStrength` slider. `meterN` has zero inputs to DOF:
  changing f/2.8 -> f/8 does nothing to blur. `fovToMM` is HUD-only.

## Deviations / limitations

- No `K/C` traceability, no incident-dome mode, no gray-card calibration,
  no focal-plane measurement (see `mechanics/ettl-iso2721` for the ISO path).
- Absolute EV runs ~3 stops hot of sunny-16 at saturation (f/8 1/8000).
- Shutter never produces motion blur; aperture never changes exposure or DOF.
- Still-camera P-line (1/30-1/8000); no shutter-angle / T-stop / ND cinema
  behavior.

## Ruleset when modifying

- `stepLightMeter` signature and `GameState` meter fields are HUD/debug
  dependencies (`renderLoop.ts`, `HUD.tsx`, `MeterDebugOverlay.tsx`).
- Keep legacy-sim branch bit-identical when touching the ISO branch.
- Machine gates: `npx tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`, `node scripts/test-worker-meshing.mjs`,
  `npm run kb:check`.

## Open work

- ISO-ETTL model (`exposureModel = "iso-ettl"`): C=250 anchor, 1x emitters,
  no lift/grade. Scaffold only; focal-plane calibration still open.
- Aperture->DOF coupling (`maxRadius propto 1/N`, `fovToMM` focal length
  into CoC) and shutter->motion-blur both not started.
- Human verification: Lighting tab presets; `?meter=1` overlay shows
  LUX + P f/shutter/ISO per mode.
