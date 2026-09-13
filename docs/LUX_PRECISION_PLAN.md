# Lux Precision Plan — calibrated measurement + honest corner readout

Status: D1–D4 IMPLEMENTED 2026-09-08 (D0 sweep is a human protocol, see
checklist); D1 adapted — slow cross-calibration anchor instead of a
synthetic scene (no special scene needed, §1).
KB: `kb/mechanics/camera-exposure.md`, `kb/mechanics/ettl-iso2721.md`.

## 0. Why the corner lies today (diagnosis — read before fixing)

The HUD corner (`Game.tsx:1257`, `expoLux = stateRef.current.meterLux`)
shows a smoothed analytic assertion, not a measurement:

1. **Two truths, never reconciled.** Analytic lux (L0 rescale: sun 100k,
   moon 0.3, emitters ÷40) is *asserted* from constants no test ever
   checked. Rendered pixels live in arbitrary three.js units (sun light
   intensity 1.2). P1 fusion transfers only *ratios* (zone/frame mean), so a
   wrong absolute constant flows straight to the corner with nothing to
   contradict it.
2. **Daytime zones saturate.** The P1 meter tap is LDR 8-bit: everything
   above 1.0 reads 1.0, so bright-frame ratios compress toward 1.0 and the
   fusion "confirms" the analytic value by going blind — correct look by
   accident, wrong numbers by construction.
3. **Unverified geometry factors.** Zone frustum factors (0.9/0.7), facing
   floors, `skyVis` lobes, bounce coefficient 0.6, albedo cache (cold start,
   tile→face mapping) — all reasonable, none measured against ground truth.
4. **No ground truth anywhere.** No test asserts noon-wall ≈ 80–100k or
   moonlit-snow ≈ 0.3; no gray card; no EV100 table check. Precision cannot
   improve without a reference.

## 1. Calibration design (the fix, in order)

**D0 — diagnosis protocol (first, no code changes).** Scripted sweep:
clear-noon → sunset → full-moon → new-moon × aim-at (sun wall / shade wall /
anti-sun face / torch 2 m / open sky), logging `meterLux, meterSceneLux,
ttlZoneLux[63], ttlLin frame mean` vs the physical expectation table
(§4). Run once by hand (`?meter=1`), record deltas in this doc. This tells
us WHICH constant is guilty before touching any.

**D1 — pixelsPerLux anchor solve.** LANDED 2026-09-08 as slow
cross-calibration (`ttlAnchor`, `ttlMeter.ts`) instead of a synthetic scene:
every HDR tap applies `anchor += (analytic/imaged − anchor) × 0.05`,
clamped [1, 1e9]. Global scale only — re-converges on light-rig changes,
cannot oscillate with the ~1 s meter loop. Sunny-16 cross-check holds: 100k
lux → R ≈ 6.4 over the f/2.8 1/50 ref (≈ f/8 1/500 ISO100).

**D2 — HDR zone tap.** LANDED 2026-09-08: second tiny pass (36×28
HalfFloat, pinned exposure-1, every 10th frame, `DataUtils.fromHalfFloat`
readback, LDR-only fallback on throw). Zones are **absolute lux**
(`ttlZoneAbsLux = imaged × anchor`); `ttlZoneLux` analytic sweep is now the
cross-check, not the source.

**D3 — pure-function unit tests.** LANDED 2026-09-08:
`scripts/lux-tests.mts` (22 cases: N·L cardinals, skyVis lobes, emitter
falloff+cap, window/EV math, clip counter, absolute zones). Run:
`npx tsx scripts/lux-tests.mts`.

**D4 — corner display.** LANDED 2026-09-08 (minus hover detail): P-cluster
shows `[LUX EV▲n TAG]` — calibrated lux, derived EV100, HDR clip-up count,
LEG/ISO tag. `?meter=1` gains the anchor row (`anchor × mean lx`).
Crosshair face readout + `±stops` + `▼` crush-count stay open (small).

## 2. File touch-list (for the implementation turn)

- `ttlMeter.ts`: HDR tap + anchor solve + absolute zones.
- `lightMeter.ts`: extract pure face/sky/emitter functions (D3), anchor
  constant, cross-check assert vs analytic (warn to console on drift >1 EV).
- `scripts/sim/tests.mts` or new `scripts/lux-anchor.mjs`: D0 sweep + D3
  unit cases.
- `HUD.tsx` + `Game.tsx:1252-1257`: D4 readout (lux, EV100, ±stops,
  clip arrows, LEG/ISO tag).
- `MeterDebugOverlay.tsx`: anchor value + analytic-vs-imaged delta row.

## 3. Acceptance (§4 = physical expectation table, ±0.5 EV or ±30% lux)

| Scene | Expect |
|---|---|
| Clear-noon sunlit 18% ground | 15–25 klux, EV100 ≈ 12.5–13.3 |
| Clear-noon white wall, sun face | 80–100 klux, EV100 ≈ 15 |
| Same wall, shaded side | 10–20 klux |
| Same wall, anti-sun face | bounce-only, 1–5% of sun face, never 0 |
| Overcast noon ground | 5–15 klux |
| Full-moon snow | 0.2–0.6 lux |
| New-moon cave | ≤ 0.02 lux |
| Torch 2 m, dark | tens of lux, falls ≈ 1/d² |
| Sun disc in frame | M-lux glare spike, clipped zones > 0 |

Corner must match table in ISO preset; legacy shows same *ratios* on its
own scale with LEG tag. LDR-saturation blindness (D0.2) must be gone via D2
(no "ratio = 1.00" on bright frames).

## 4. Decisions needed

1. Anchor scene: scripted synthetic view (deterministic, my reco) vs your
   hand-picked world spot (realistic, fragile across worldgen)?
2. HDR tap cost: second tiny render every 10th frame (reco, ~0.2 ms) vs
   float-readback probe with LDR fallback (no extra render, driver-dependent)?
3. Corner density: full `[lux EV100 ±stops ▲▼]` always, or compact lux-only
   with details behind `?meter=1`?
