# TTL Metering Plan — real through-the-lens measurement for the ISO E-TTL model

Status: investigation complete 2026-09-08, not yet implemented.
KB: `kb/mechanics/ettl-iso2721.md`, `kb/mechanics/camera-exposure.md`.
Goal: replace the analytic lux synthesis inside the `iso-ettl` exposure model
with measurement of light that actually traveled through the lens — a real
TTL meter — while `legacy-sim` stays bit-identical.

## 1. What "real TTL" means here (and what it cannot mean)

Real chain: scene luminance → lens → focal-plane illuminance `E ∝ L/N²` →
sensor zones → `N²/t = LS/K`. Our engine already computes the left half of
that chain every frame (three.js r185 lighting → linear HDR frame). The
missing link is only that `stepLightMeter` never looks at the frame; it
re-derives lux from sun angle + raycasts (`src/game/engine/lightMeter.ts`).

What we CAN do (true TTL): meter the linear HDR pixels of the actual view.
What we CANNOT do honestly: claim focal-plane lux traceability — three.js
light units are arbitrary (sun directional 1.2 vs real ~100 000 lux;
`sceneSetup.ts:465-491`). Absolute scale needs one empirical anchor
(sunny-16); everything else is then relative and physical (ratios in r155+
physical-lights mode are meaningful).

## 2. Investigation findings (ground the design)

1. Tap point: `postFx.ts` `sceneRT` (HalfFloat, full-res) holds LINEAR
   un-tonemapped HDR — `PRESENT_FRAG` applies `tonemapping_fragment` itself,
   proving the RT is pre-grade. But it exists only when postFx is active
   (default OFF renders direct to canvas). So: dedicated meter target.
2. Feedback-loop analysis: canvas pixels are post-gain (meter would chase its
   own `toneMappingExposure`). A meter pass MUST pin `toneMapping =
   NoToneMapping` + `toneMappingExposure = 1` (same save/restore pattern as
   the viewmodel rig pass, `renderLoop.ts:1322-1332`) → no loop by construction.
3. API: `renderer.readRenderTargetPixels` (standard, r185 OK). 112×63 RGBA =
   ~28 KB sync readback at ~12 Hz is negligible; no async PBO needed at v1.
4. Zones for free: RGB per zone = Nikon's RGB-sensor metering analog
   (color-aware matrix + per-channel highlight clipping). Crosshair raycast
   already gives the AF point (`renderLoop.ts:1301-1306`) = Canon AIM analog.
5. Absolute scale: `useLegacyLights` absent → physical mode, ratios valid.
   Anchor options ranked: (a) sunny-16 solve at clear noon (1-line, robust);
   (b) analytic model as incident-light absolute + framebuffer as reflected
   distribution (fusion, recommended v1); (c) in-world 18% gray-card
   calibration scene (best, phase 2).

## 3. Design

- New `src/game/engine/ttlMeter.ts`: owns a 112×63 `UnsignedByteType` RT
  (LDR-linear enough for zone ratios; HDR kept for clip detection via a
  second 28×16 HalfFloat tap — cheap), renders `scene` with the live camera
  every 5th frame when `exposureModel === "iso-ettl"`, exposure pinned to 1.
- Zone engine: 7×5 grid (Canon 35-zone analog; 63-zone = 9×7 stretch goal).
  Per zone: log-luminance mean + per-channel means + clipped fraction.
  Modes: spot = center zone (+crosshair/AF bias), center = 60/40 Gaussian
  weight, matrix = all zones with AF-point bias + color-aware de-weight of
  clipped zones (E-TTL II hot-spot rejection analog), highlight-weighted =
  exposure set by 98th-percentile zone (clipping avoidance).
- Fusion v1: absolute level from analytic `estimateViewLux` (incident
  analog), distribution/protection from zones. Pure-reflected mode behind a
  flag once sunny-16 anchor is validated.
- Program: existing Av/Tv/Sv structure, `refLux` from C=250 derivation
  (already scaffolded); ADD out-of-range signals per ISO 2721 §4.2:
  viewfinder-style `OVER +1.7` / `UNDER -2.3` tag in HUD P-readout + `<1/30 s`
  long-exposure dot. FEL analog: freeze meter 16 s for recompose (button in
  Lighting tab); FEC analog already exists (`evComp`).
- UI: `?meter=1` overlay gains 7×5 ASCII zone map + per-zone EV; Lighting tab
  gains FEL-lock button + over/under indicator. No new persisted columns.

## 4. Phases

- P0 scaffold (done): `ExposureModel`, ISO-anchored program branch, presets,
  Lighting tab, persistence.
- P1 meter pass + spot/center from real pixels, fusion with analytic
  absolute; acceptance: `?meter=1` zone map tracks a torch pan; legacy-sim
  pixel-identical; gates green. Files: new `ttlMeter.ts`, `renderLoop.ts`
  hook, `lightMeter.ts` branch.
- P2 matrix/highlight-weighted + RGB color awareness + out-of-range/FEL UI;
  acceptance: sunset-backlit portrait exposes face (AF bias), mirror-like
  water glint ignored, over/under tags correct at saturation.
- P3 gray-card calibration scene + pure-reflected mode + sunny-16 anchor
  validation across weather/time; acceptance: EV100 table spot-checks
  (clear noon ≈15, overcast ≈12, moonlit ≈−3..−6) within ±1 EV.

## 5. Risks & non-goals

- Extra scene render: ~7 kpx, no shadows recompute (maps cached) — measure,
  skip frames if >1 ms.
- three version quirks (RT color-space handling) — pin with a unit-ish probe
  (`scripts/` smoke asserting meter-RT mean scales 2× with sun 1.2→2.4).
- Spectral honesty: no real spectra; Kelvin LUT stays an approximation,
  documented in KB.
- Non-goals: flash pre-flash hardware analog (held torch stays analytic),
  aperture→DOF / shutter→blur coupling (separate projects), changing
  legacy-sim numbers ever.

## 6. Decisions (recorded 2026-09-08)

1. Default model after P2 validates: UNDECIDED — keep Legacy default, revisit.
2. Zone count: 63 Nikon-style (9x7 grid). Meter RT 108x84 (12 px/zone).
3. FEL-lock button: DROPPED — no FEL UI; recompose-lock not needed.
