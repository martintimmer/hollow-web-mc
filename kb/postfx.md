---
id: postfx
title: "Post-Processing Effects: DOF + Chromatic Aberration"
kind: system
wiki: 
game_version: ""
fetched_at: 2026-08-30
updated_at: 2026-09-05
status: implemented
tags: ["rendering", "postfx", "dof", "chromatic-aberration", "p3", "settings"]
related_docs: ["docs/POST_FX_PLAN.md"]
---

# Post-Processing Effects: DOF + Chromatic Aberration

Opt-in, default-OFF full-screen effects: crosshair-driven Depth of Field (lens
bokeh) and radial Chromatic Aberration, plus wide-gamut Display-P3 output.

## Our implementation

| Concern | Where |
|---|---|
| PostFx module (color copy, depth pre-pass, half-res DOF gather, composite+CA present) | `src/game/engine/postFx.ts` (`createPostFx`, `updatePostFx`, `setPostFxFocus`, `renderPostFx`, `renderWithPostFx`) |
| Render-loop routing + per-frame focus raycast | `src/game/engine/renderLoop.ts` (3 render sites + focus block) |
| Composer lifecycle | `src/components/Game.tsx` (created after renderer, disposed in engine cleanup) |
| Settings UI (Video tab → Post-Processing Effects) | `src/components/gui/OptionsMenu.tsx` |
| State + persistence + presets | `src/components/Game.tsx` (`dof/dofStrength/ca/caStrength`), `src/services/api.ts`, `server/index.js`, `server/db.js` (`user_preferences` columns `dof, dof_strength, ca, ca_strength` 0-100) |
| Display-P3 output | `src/components/Game.tsx` (ColorManagement.define + outputColorSpace) |

## Deviations / ruleset

- Base frame always renders directly to the canvas; the effect pipeline works on a
  copy of the finished frame taken via a color-matched 2D canvas (`drawImage` +
  `CanvasTexture.needsUpdate`, NOT `copyTexSubImage2D` — that fails on `display-p3`
  drawing buffers and blacks out the post-fx path). Effects OFF ⇒ byte-identical
  direct path.
- The WebGL2 context is created with a `colorSpace` context attribute per the persisted
  gamut (the dynamic `drawingBufferColorSpace` setter alone is ignored by some browsers,
  which shifted P3/BT.2020 hue).
- DOF is a composite: half-res bokeh gather mixed by per-pixel CoC, so in-focus areas
  stay full-res sharp; `baseBlur = strength×0.10` gives the full-frame lens feel.
- Focus = crosshair raycast, temporally smoothed (lerp ~8/s), clamped to MAX_FOCUS = 10
  blocks; overall blur scales with `(1 - focus/10)^1.5` — focusing very close gives strong
  blur, focusing at 10+ blocks or the sky gives essentially none (hyperfocal-like). Sky /
  no hit fades blur out.
- CA uses a `pow(len, 1.5) * 20` radial curve — minimal in the center, strong at corners.
- Sun Glint (`specular` + `specular_strength` preference columns, `src/game/engine/specular.ts`): Blinn-Phong specular
  injected into the LIVE Lambert materials (`matMerged`/`matOpaque`/`matTrans` in Game.tsx via
  `onBeforeCompile`). Reflectivity is a per-ATLAS-TILE LUT (32×32 DataTexture) sampled in the
  fragment shader by tile index derived from `vMapUv` — zero mesh/mesher changes (no
  meshWorker/advanceMeshJob parity impact). Water strongest, glass/ice/metals high, stone family
  moderate, everything else matte. Sun dir/color are updated per frame in renderLoop from the
  active celestial light (view-space transform).
- Bokeh modes: soft (default, 8-tap ring gather) vs circular (`bokeh` preference column):
  16-tap Vogel spiral disk (golden-angle, radius `sqrt(i/16)`)
  for round lens-style bokeh highlights.
- `display-p3`, `rec709`, and `bt2020` color spaces are registered at runtime (not in three
  r185 core; all use the sRGB OETF since three only supports sRGB/linear transfers). A
  **Color Gamut** selector in Video settings switches them live and persists per-user
  (`color_gamut` column). sRGB fallback via try/catch.
- Agents must not verify this visually with Chromium probes — see AGENTS.md checklist.

## Open work

- Bloom pass for emissives (torch/glowstone halos currently come only from
  the point-light pool, not the post chain).
- FXAA toggle for Smooth-preset players (post chain already owns the final
  composite, so AA fits there).
- Auto quality scaling: drop DOF gather to quarter-res under sustained low
  FPS instead of a manual toggle.
- Preset expansion: per-effect strength curves beyond the current
  Smooth/Balanced/Beautiful mappings.
