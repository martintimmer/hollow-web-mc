---
id: mechanics/ettl-iso2721
title: "ISO 2721 TTL auto-exposure + Canon E-TTL methodology notes"
kind: mechanic
wiki:
game_version: ""
fetched_at: 2026-09-08
updated_at: 2026-09-08
status: partial
tags: ["rendering", "exposure", "metering", "standards", "iso-2721", "e-ttl"]
related_docs: []
---

# ISO 2721 TTL auto-exposure + Canon E-TTL methodology notes

Reference notes for the `iso-ettl` exposure model. Sourcing: ISO catalog
abstract + searchable preview excerpts of ISO-2721-2013 (sample PDF; full
text paywalled — §3-5 + ToC verified, nominal tables NOT verified), Canon
E-TTL/E-TTL II docs, Wikipedia (`Light meter`, `Exposure value`,
`Metering mode`). "ETTL" below means two related but distinct things:
(1) generic evaluative through-the-lens auto-exposure per ISO 2721, and
(2) Canon's E-TTL (II) flash-metering system. Both inform our model.

## ISO 2721:2013 methodology (film-based cameras, auto controls of exposure)

Scope: specifies exposure AT THE FOCAL PLANE as a function of field
luminance + film speed; applies to built-in or coupled automatic controls
that regulate focal-plane illuminance and/or exposure time. Pointer/needle
match systems included. Explicitly NOT for digital cameras (our game is
doubly out of scope — we adapt the method, not the certification).

1. Focal-plane exposure `H = ∫∫ E(r,t) dr dt` over the prescribed area and
   shutter-open interval. "Automatic setting" = control holds `H`
   substantially constant for a preset film speed across all field
   luminances within the camera's exposure capability (capability quoted in
   EV at ISO 100/21 deg).
2. Scales for f-number / time / EV / speed follow ISO 2720 values.
3. Out-of-range indication: for colour-reversal cameras, a viewfinder signal
   when luminance exceeds capability by >1 EV either way (only required if
   capability does not already cover 4-4096 cd/m2, uniform source); plus a
   long-exposure warning whenever the setting would be longer than ~1/30 s.
4. Sensor spectral response: continuous over 380-780 nm, no discontinuities;
   daylight/tungsten response ratio within ±1/3 EV (2856 K vs 4700 K);
   <10% of response from >700 nm and <10% from <380 nm (equal-energy test).
5. Calibration = adjusting the mechanism so measured focal-plane exposure is
   within limits. Measured with a device in the focal plane: circular area,
   concentric with lens axis, diameter = 3/4 of the format's shorter side
   (smaller allowed for medium/large format with area correction, Annex B),
   lens focused >= 5 m, photopic V(λ) (or correlatable) sensor large enough
   to catch all transmitted flux. Annex A gives the measurement method,
   Annex C the performance test.
6. Calibration source: uniform Lambertian surface, subtends >= 1.25x the
   photometric field, continuous visible spectrum, ±4% luminance uniformity,
   4700 ± 200 K distribution temperature with bounded spectral-radiance
   deviation (420-1050 nm), >= 85% luminance at 60 deg off-axis. Adjustable
   over capability range + over-range increments.
7. Test conditions: optical axis horizontal (or normal-use position),
   23 ± 3 C, 65 ± 20% RH, no stray light, set-point approached from both
   directions (hysteresis recorded), >= 3 s settle after luminance changes.
8. Acceptance angles of the photoelectric system (specific + oblique) are
   characterized, not assumed.

## Canon E-TTL / E-TTL II methodology (flash, evaluative TTL)

1. Old TTL/A-TTL: dedicated sensor in the mirror box metered flash reflected
   off the film DURING exposure and quenched the flash in real time.
2. E-TTL (1995): same evaluative ambient sensor; sequence per shot =
   ambient reading -> low-power pre-flash -> pre-flash reading minus ambient
   = flash-only reading -> compute main-flash power -> open shutter, fire.
   No in-exposure quenching (mirror blocks the sensor; digital sensors don't
   reflect like film). Exposure biased to the ACTIVE AF point (AIM multipoint).
3. E-TTL II (2004, body-side firmware): compares ambient vs pre-flash levels
   PER ZONE (35/63 segments) to find the subject (flash-dominant delta =
   close subject), ignores hot-spot zones (mirror-like reflectance), folds in
   lens-to-subject distance (guide-number cross-check) when available, and
   de-links metering from the AF point so recompose-after-focus works.
4. User tools: FEL (flash exposure lock — pre-flash reading held ~16 s while
   recomposing), FEC (flash exposure compensation, ±stops, light subjects
   +0.5..+1.5 / dark subjects −1..−2), evaluative vs average flash patterns
   (evaluative isolates subject = best when ambient dominates; average reads
   whole frame = more consistent when flash dominates).

## Mapping to our code

| Standard concept | Legacy-sim (today) | ISO-ETTL scaffold (target) |
|---|---|---|
| Reference equation | `R = log2(lux/115.4)`, invented | `EV100 = log2(lux/2.5)` (C=250, S=100); program ref `EV 8.61` = f/2.8 1/50 |
| Focal-plane constancy | gain does all, N/t/S display-only | same renderer hook, but gain anchored to C=250 derivation |
| Emitters | 6x emphasis, 4 x 1200 / 3000 cap | 1x (flash-only reading analog: no ambient cross-talk) |
| Night lift / dark grade | 0.3-stop lift, ~3-stop dark grade | none (neutral grade; comp dial is the only bias, like FEC) |
| Highlight protection | `min(blended, peak/4)` hack | keep as v1; roadmap: per-zone ambient/delta comparison a la E-TTL II |
| Calibration source | none (analytic sun 9000 lux) | roadmap: 4700 K Lambertian test scene + 3/4-frame focal-plane probe |
| Out-of-range signal | none | roadmap: viewfinder-style >1 EV over/under + <1/30 s warnings |
| Spectral | hard-coded Kelvin LUT | roadmap: continuity assertion 380-780 nm on sensor response |

Anchor: `src/game/engine/lightMeter.ts` (`ExposureModel`, `ISO_*` consts,
`stepLightMeter` branch), presets in `src/game/engine/exposurePresets.ts`,
meter pass in `src/game/engine/ttlMeter.ts` (P1: 9x7 zone RT, pinned
NoToneMapping/exposure-1, every 5th frame, iso-ettl only), fusion in
`estimateViewLux` (P1: spot/center corrected by imaged distribution, +-2
stops authority, matrix stays analytic until P2).

## Ruleset when modifying

- Never change legacy-sim numbers in the same edit as ISO-branch work.
- Every ISO constant cites its source (K=12.5 per ISO 2720 camera practice;
  C=250 flat incident; program ref EV 8.61 = log2(2.8^2/(1/50))).
- No paywalled-text pasting: paraphrase only (done above).

## Open work

- P1 DONE (2026-09-08): 63-zone meter pass + spot/center fusion + `?meter=1`
  zone map. Matrix still analytic.
- L0 DONE (2026-09-08): physical-ish scale iso-only (sun 100k, moon
  0.02–0.45, emitters ÷40), skyVis/bounce, facing floor 0.02, atlas albedo
  (`faceAlbedo`), 63-ray HDR sweep (`ttlZoneLux`). Legacy lux untouched.
- L1 DONE (2026-09-08): EV slider 8–17, stops = EV, tanh window grade in
  present (forced when ev<17), window banner + clip counter in overlay.
- D1/D2 DONE (2026-09-08): HDR HalfFloat zone tap (36×28, every 10th frame)
  + slow cross-calibration anchor (`ttlAnchor`, ±5%/tap, [1,1e9]); absolute
  zone lux (`ttlZoneAbsLux`); corner shows `[LUX EV ▲n TAG]`.
- D3 DONE (2026-09-08): `scripts/lux-tests.mts`, 22 cases.
- Open: crosshair face readout, ±stops, ▼ crush-count, P2 zonal matrix.
- Distance-aware flash analog for held torch (we log distance already).
- 4700 K calibration scene + focal-plane probe test (Annex A analog).
