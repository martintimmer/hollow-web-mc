# Environment Optimization Plan (perf-first)

Constraint: every change must be RAM/GPU-neutral or better. Standing budgets:
draw calls are the binding constraint (~1900 at RD10 = render-BOUND); no new
meshes/lights/passes without removing one; no new per-frame CPU loops (1 Hz
timers max); no resident audio nodes (one-shots only); texture RAM flat
(single shared canvases, no new atlases). Items marked [GPU↓]/[RAM↓] actively
reduce current cost.

## 1. Sun
Issues:
- No halo sprite; sunsets tint only the directional while ambient stays white.
- Shadow map re-renders 2×/sec all night for a 0.02-intensity moonlight nobody sees.
Improvements:
- Bake the halo into the existing 512px celestial tile (0 new draw calls, 0 RAM)
  + warm-tint hemi at sunset via the existing per-frame write. [neutral]
- Skip shadow-map refresh when `nightFactor > 0.9` (and reuse last map) — ~half
  of all shadow renders disappear. [GPU↓]

## 2. Moon
Issues:
- Single static texture; moonlight constant 0.02 regardless of phase/elevation.
- Halo sprite draws even at day/below horizon (opacity 0, still a draw call).
Improvements:
- Redraw ONE shared canvas on phase change only (CPU once per ~20 min, 1 texture
  resident) + scale night directional per phase. [neutral]
- `visible=false` moon + halo when below horizon or `dayFactor > 0.8` — removes
  2 draw calls for most of the day. [GPU↓]

## 3. Stars
Issues:
- 950-point draw call persists through noon at opacity 0.
- Uniform size/color field (flat look).
Improvements:
- `visible=false` when computed opacity ≤ 0 — removes 1 draw call all day. [GPU↓]
- Two-size field baked into the existing buffer (0 new calls); skip twinkle
  (a twinkle uniform is cheap but static stars cost literally nothing). [neutral]

## 4. Sky gradient
Issues:
- `night` uniform uploaded but never read in-shader (dead cost + confusion).
- Single-glow sunset; no weather response overhead exists yet (good — keep it so).
Improvements:
- Delete-or-wire the dead uniform; drive rain darkening + anti-solar pink band
  through EXISTING uniforms (`warm`, `night`, `sdir`) — pure arithmetic in the
  current single pass. [neutral]
- No new passes, ever, for sky: bands beat sprites on fill-rate. [neutral]

## 5. Clouds
Issues:
- Manual `/weather` rebuilds the 128-cell canopy synchronously (hitch); auto
  transitions never morph coverage (visual bug, §6 of audit).
- Overcast DoubleSide transparent = worst overdraw in the sky pass.
Improvements:
- Cross-fade opacity on auto-transitions (0 rebuilds, 0 hitches); rebuild only on
  manual change, chunked across frames. [GPU↓ vs today’s hitches]
- Flip overcast canopy to opaque (`transparent=false`) at opacity ≥ 0.95 — kills
  transparency sorting + blending overdraw for the densest case. [GPU↓]

## 6. Rain
Issues:
- 300 instance matrices recomputed on CPU every frame.
- Renders in deserts (wasted fill) and with no sound (feel gap, not perf).
Improvements:
- Move fall to shader (time uniform + per-instance seed attribute): zero CPU
  updates, trivial GPU; instance count becomes nearly free. [CPU↓]
- Biome-inhibit dry biomes + collapse instances outside ~30 m to a zero-scale
  (fewer rasterized quads, same 1 draw call). [GPU↓]

## 7. Snowfall
Issues:
- Same per-frame CPU cost as rain (shared system).
- Zero accumulation; layer geometry would cost RAM + remesh.
Improvements:
- Share the rain shader-fall path (same mesh, no new geometry/memory). [CPU↓]
- Accumulation as top-face whitening via the existing tint path, driven by a
  uniform while snowing — 0 geometry, 0 storage, reversible for free. [neutral]

## 8. Thunder/lightning
Issues:
- Timer-only today (cheap, keep that property); naive implementations add bolt
  meshes + dynamic lights (the two most expensive things possible here).
- `weatherIntensity` dead at 0.
Improvements:
- Flash envelope on the EXISTING sun directional + sky `warm` uniform (0 draw
  calls, 0 lights) + one-shot thunder crack via existing SFX with distance delay
  (0 resident nodes). [neutral]
- Strike logic reuses spawner + block-edit paths (no new systems); cap concurrent
  strike FX at 1. [neutral]

## 9. Temperature/climate
Issues:
- `tempAt` noise evals are gen-time (fine); danger is adding per-frame sampling.
- Model drives zero gameplay (all cost, no benefit).
Improvements:
- Gameplay effects on a 1 Hz timer (freeze ticks, hunger drain), never per-frame;
  reuse cached per-chunk surface temp — zero new noise evals at runtime. [neutral]
- Powder-snow freeze first (art exists): one status check inside the existing
  1 Hz player tick, no new loops. [neutral]

## 10. Weather machine
Issues:
- Precip toggles `visible` (pop); cloud rebuild path hitches (see §5).
- Dead helpers (`precipitationOf/skyOf/weatherIntensity`) mislead readers.
Improvements:
- 5 s precip strength ramp + opacity crossfade: removes both pops with no new
  objects. [neutral]
- Delete-or-wire dead helpers; sleep-clear + `/weather [seconds]` are code-only
  (0 runtime cost). [neutral]

## 11. Shadows
Issues:
- 2×/sec full-scene shadow re-render is the largest single GPU line item.
- Crisp shadows under overcast (wrong) + tight-frustum edge pop on ridges.
Improvements:
- Skip refresh at night (§1) + drop to `basic` tier dynamically under overcast
  (diffuse light hides the difference; 1024→512 map). Both strictly cut GPU
  below today. [GPU↓↓]
- Fade frustum edge with distance instead of widening it (wider = more casters =
  more GPU). [neutral]

## 12. Night & cave darkness
Issues:
- Point pool gather/sort every 60 ms is fine; light leaking through walls is a
  correctness gap, not a perf gap (do NOT build flood-fill here).
- Never-zero ambient floors wash out nights on bright displays.
Improvements:
- Depth/burial-scaled ambient floor reusing the cave-drone solidity sample
  (2 uniform writes, 0 new sampling): true-0 deep caves, free. [neutral]
- Torch flicker on ACTIVE lights only (no new lights) + underwater radius damp
  via the existing intensity write. [neutral]

## 13. Fog
Issues:
- Per-frame fog write is trivial (good); no weather response (gap, not cost).
- Far plane is static per preset while fog color animates (fine).
Improvements:
- Rain/thunder `far` shrink + slate lerp through the existing write (free
  uniforms, big feel win). [neutral]
- Height-based valley mist via the same write; never a second fog volume or
  fullscreen pass. [neutral]

## 14. Underwater
Issues:
- DOM overlay compositing already paid (keep, don't duplicate in WebGL).
- Sun stays noon-bright below the surface (leak); SFX unmuffled (music only).
Improvements:
- Dim sun + SKIP shadow refresh while head-submerged (overlay hides the world
  detail anyway) — net GPU saving during every dive. [GPU↓]
- Route SFX through the existing music lowpass node (shared node, 0 new nodes).
  [neutral]

## 15. Nether
Issues:
- Fixed 1.35 sun + active shadow map under flat red fog (shadows barely read).
- Silent (no ambient loops); HUD clock advances (wrong).
Improvements:
- Disable shadow-map rendering in the Nether (lava/emissive points carry the
  look) — removes the biggest GPU cost in the dimension. [GPU↓]
- Ambient groans/lava-pops as one-shots on the cave-drone 25–40 s timer pattern
  (0 resident nodes); freeze HUD clock (code-only). [neutral]

## 16. Day length / time / sleep
Issues:
- Time freezes in UI, desyncing the crude mob-night window from visual `isDay`
  (two authorities).
- 40-min day is undocumented-vs-Java (audit §5), causing silent tuning drift.
Improvements:
- Unify on ONE night authority + let time flow in menus (code-only, 0 cost);
  document the 40-min fork in `kb/mechanics/` so future tuning uses true values.
  [neutral]
- `/time add|query`, sleep-vote hooks: code-only, no runtime footprint. [neutral]

## Sequencing (perf wins first)
1. §11 shadow night-skip + overcast tier-drop, §1 night shadow skip [GPU↓↓]
2. §15 Nether shadow disable, §14 dive shadow skip [GPU↓]
3. §5 cloud opaque-overcast + fade (hitch removal), §6 rain shader-fall [CPU↓/GPU↓]
4. §2/§3 visibility gating (3 draw calls back most of the day) [GPU↓]
5. Everything else is feel-per-free: §8 storm flash, §12 cave floor, §13 storm fog,
   §9 powder-snow tick, §10 ramps, §16 unification.

## Implementation status (2026-09-06)
Done: §1 night/Nether/dive shadow skip + Nether castShadow-off; §2 moon phases
(visual only) + halo phase scale + visibility gating; §3 stars gating; §5 morph
dip-rebuild on any coverage change + opaque-from-birth overcast; §6 shader-side
rain fall + arid inhibit + patter one-shots; §8 flash envelope + thunder crack;
§9 powder-snow freeze tick; §10 precip fade ramps + sleep-clear + /time add|query;
§12 burial-scaled ambient; §13 storm fog; §14 dive sun-dim + shared SFX lowpass;
§15 Nether clock freeze + rumble timer; §16 time.ts single night authority.
Deviations: overcast tier-drop replaced by 2000 ms refresh slowdown (avoids
fighting Game.tsx tier ownership + realloc hitches; overcast direct=0.12 makes
shadows near-invisible anyway); rain loop replaced by patter one-shots (0 resident
nodes); moonlight kept constant, halo scales instead.
Deferred: strike mechanics (charge/trap/channeling), snow ground whitening,
sky anti-solar band, stars twinkle.
Gates: tsc clean except in-flight foreign SimDeck rewrite; sim 279/279. Shader
paths (rain fall, moon repaint) need human visual confirmation + console check.
