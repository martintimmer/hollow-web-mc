# Latitude Plan — EV slider as capture window + correct lux metering

Status: L0+L1 IMPLEMENTED 2026-09-08 (see §8). Applies to BOTH
`legacy-sim` and `iso-ettl` for the EV window; lux rescale iso-only per §7.1.
KB: `kb/mechanics/camera-exposure.md`, `kb/mechanics/ettl-iso2721.md`;
prior plan: `docs/TTL_METERING_PLAN.md` (P1 done).

## 1. Problem (your brief, restated as spec)

1. The EV 11–16 "Dynamic Range" slider does not behave like dynamic range.
   Today it only widens gain-clamp latitude (`GAIN_DOWN/UP_HALF_STOPS`,
   `lightMeter.ts:49-50,595-596`), nudges a CSS contrast factor
   (`evContrastFactor`, `11→1.2 … 16→0.82`) and bloom. `NeutralToneMapping`
   then softly fits everything on screen. Nothing ever truly clips, and
   moving the slider "changes a bit" at most.
2. Target behavior: EV sets a CAPTURE WINDOW in stops, anchored on the
   metered mid. Inside → visible with tone; outside → crushed blacks /
   clipped whites, exactly like SDR vs HDR capture:
   - EV11 ≈ narrow (≈8 stops, ~1500:1): a 10-lux shadow and a 3000-lux sky
     (≈8.2 stops apart) cannot both hold — one end clips.
   - EV16 ≈ full (≈17 stops, ~1–100 000 lux): noon sun + deep shade coexist,
     no highlight clipping, no dimmed shadows.
3. The lux numbers feeding all of this are wrong, so the window would frame
   garbage: sun 9000 (real ~100 000), moonlit night ~100+ (real ~0.1–0.5),
   no up/down sky asymmetry per face, 13-entry albedo LUT, zero bounce, and
   the P1 meter tap is LDR 8-bit (blind above 1.0). Lux must be redesigned
   first so the window has true values to frame.

## 2. Target model

Window width: `stops(ev) = ev` over the EV 8–17 slider (user decision
2026-09-08: the number IS the stops) → EV8 = 8 stops, EV17 = 17 stops. Check against your examples: 10→3000 lux = 8.2 stops
(clips one end at EV11 ✓, comfortable at EV16 ✓); 1→100 000 lux =
16.6 stops ≤ 17 ✓.

Pipeline per frame:
`sceneLux(color, per-zone) → anchor mid M (metered 18%-gray scene value) →
x = log2(L / M) → grade(x; width) → display`, with `grade` = S-curve whose
shoulder/toe hardness scales as `1/width`: EV11 ≈ linear + hard clamp
(SDR-like), EV16 ≈ long soft shoulder + open toe (HDR-like). Gain positions
the window (mid-gray → display 0.18); width shapes it. Exposure comp slides
the window ±stops (unchanged semantics, now honest).

## 3. Lux remodel (do first — L0)

Scale (lux-like, sunny-16 anchored, both models):
- Sun disc/direct: `100 000 × elevationCurve(sunUp)` clear noon, not 9000.
- Sky hemisphere: 10 000–25 000 by sun elevation; overcast 5 000–15 000;
  horizon/zenith split kept.
- Moonlight: 0.1–0.5 lux by phase (currently ~100× hot — biggest single
  error); starlight floor ~0.001.
- Emissives: keep per-id table as relative emission, divide by ~40 to land
  torch-at-2m ≈ real tens-of-lux, and DROP the legacy 6× emphasis to 1× in
  both models (the window, not a fudge factor, handles night look).

Face estimator (per aimed/tap surface, `estimateViewLux` + zone taps):
- `L = albedo(face) × [sun × max(0,n·l) × shadowVis + sky × skyVis(n) +
  bounce] + emissive`, with `skyVis(n) = 0.5 + 0.5×ny` (up faces full sky,
  down faces ~none — your "opposite side darker" case falls out naturally),
  opposite-face floor replaced by `bounce ≈ openness × neighborAlbedo × sky`.
- `albedo(face)`: precompute mean-texel RGB per block+face from the atlas
  ONCE at load (no per-frame cost) replacing the 13-entry LUT; neighbor
  albedo sampled from adjacent opaque blocks (already raycast-adjacent).
- Incident vs reflected split (fixes the core conceptual bug): eye-position
  taps estimate incident; zone/surface terms estimate reflected
  (`albedo × incident`). `meterSceneLux` becomes true scene luminance.

Meter tap upgrade (extends TTL P1): second 28×21 HalfFloat tap alongside the
108×84 LDR tap so zones see 1–100 000 without clipping; LDR tap keeps cheap
ratios, HDR tap carries absolute + clip fractions. `ttlFrameMean` becomes
lux-like after the sunny-16 anchor solve.

## 4. Window grade (L1)

- `PRESENT_FRAG` (`postFx.ts:190-247`): add `uWinWidth` (stops) +
  `uWinMid` uniforms; parametric S-curve before `tonemapping_fragment`.
  When postFx is OFF (default path), approximate with the existing
  gain + CSS-contrast levers and DOCUMENT the weaker match — or force the
  present pass on when `ev < 16`. Decision needed (see §7.3).
- `stops(ev)` formula + anchor in `lightMeter.ts` shared by both models;
  `evContrastFactor`/`evBloomStrength` tables re-derived as `f(width)`.
- `?meter=1` overlay: window banner `[lo … M … hi] lux + width stops`,
  clipped-zone count from HDR tap.

## 5. Phases & acceptance

- L0 lux remodel (scale, face/sky/bounce, albedo LUT, HDR tap, incident/
  reflected split). Acceptance: clear-noon white wall ≈ 80–100 klux, shaded
  wall ≈ 10–20 klux, opposite face ≈ bounce-only (dark, not black), moonlit
  snow ≈ 0.2–0.5 lux, torch at 2 m ≈ tens of lux — all in `?meter=1`.
- L1 window grade (`stops(ev)`, S-curve, fallback). Acceptance: EV11 noon
  scene — sunlit wall white-clipped OR shade crushed (not both held);
  EV16 same scene — both held; 10/3000 split-view behaves per §2.
- L2 calibration & tables: EV100 spot-checks (noon 15, overcast 12,
  moonlit −3…−6) ±1 EV; HUMAN_TEST_CHECKLIST scenarios; KB updates.
- Gates each phase: `tsc`, `build`, `sim:test`, `textureCheck`,
  worker-meshing (env-flaky, compare to baseline), `kb:check`,
  `pages:check`; restarts per AGENTS.md.

## 6. Risks

- Rescaling sun 9k→100k shifts EVERYTHING (legacy look included) — mitigated
  by re-anchoring gain the same commit; still the highest-blast-radius item,
  hence L0 lands alone with before/after screenshots.
- Atlas albedo LUT: tinted/special tiles (water, leaves) need manual
  reflectance overrides — keep LUT as fallback for non-opaque ids.
- Hard clip at EV11 is a deliberate aesthetic change; sunset lovers may
  object — comp dial remains the escape hatch.

## 7. Decisions (recorded 2026-09-08)

1. Rescale behind `iso-ettl` only first — DONE (legacy lux bit-identical;
   legacy gain-latitude tables re-indexed for EV8–17 as ordered).
2. Atlas-derived albedo LUT — APPROVED + DONE (`faceAlbedo` in
   `lightMeter.ts`, `sampleAtlasMeanLuma` in `particles.ts`, 512-entry
   cache, LUT fallback).
3. PostFx-OFF fallback — force present pass whenever `ev < 17` — DONE
   (`grade`/`gradeWidth` in `PostFxSettings`, `uGain`/`uWinWidth`/`uGradeOn`
   uniforms, `setPostFxGrade` per frame, NoToneMapping wrap on present).

## 8. What landed (L0+L1, 2026-09-08)

- L0 iso-ettl: sun 100k / sky 15k-zenith / moon 0.02–0.45 lux, emitters ÷40,
  `skyVis(n)=0.5+0.5ny`, bounce term, facing floor 0.02, atlas albedo,
  63-ray HDR analytic sweep (`ttlZoneLux`, ≤4 Hz).
- L1 both models: EV slider 8–17 (`latitudeStops`), 10-entry gain/contrast/
  bloom tables, tanh window grade in `PRESENT_FRAG` (hard clip narrow, soft
  shoulder wide, mid 0.18), `?meter=1` window banner `[lo…hi] + clip n/63`.
- Example checks: 10→3000 lux = 8.2 stops (clips one end at EV8 ✓); 1→100k
  = 16.6 stops ≤ 17 (holds at EV17 ✓).
