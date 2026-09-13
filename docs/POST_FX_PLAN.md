# Post-Processing Effects Plan — Depth of Field & Chromatic Aberration

**Date:** 2026-08-30 · **Status:** implemented (2026-08-30 — see §4 as-built notes)
**Requested:** "Add new functions to the settings: DOF with blur + chromatic aberration; confirm the plan & how it improves rendering."

---

## 1. Context & goals

Add two real-time post-processing effects as **opt-in settings**:

1. **Depth of Field (DOF)** — a blur whose radius grows with the pixel's distance from a focal plane, so blocks near/behind the focus point defocus like a real lens.
2. **Chromatic Aberration (CA)** — a subtle per-channel radial color fringing near the screen edges (and away from focus if we combine it with DOF).

Both are **disabled by default** so the current 60 FPS performance and the `ci:perf` golden frames stay byte-for-byte unchanged. Enabling them is a pure gain in visual polish with a predictable, measurable cost.

---

## 2. Investigation findings (grounded in the current code)

### 2.1 Renderer — no post-processing today
- `WebGLRenderer({ antialias: false, preserveDrawingBuffer: false })`, `setPixelRatio(1.0)`, `setSize(innerWidth, innerHeight)` — `Game.tsx:1653-1658`.
- Every frame renders directly: `s.renderer.render(s.scene, s.camera)` — `renderLoop.ts:753` (also 766 & 793 for snapshot/archive captures).
- Camera: `PerspectiveCamera(baseFov||70, aspect, 0.08, 800)` — `Game.tsx:1648`. near=0.08, far=800 are sufficient for depth-based DOF.
- Materials are `MeshLambertMaterial`/`MeshBasicMaterial` bound to the runtime atlas `CanvasTexture` (`Game.tsx:1674+`). Post-fx runs on the finished framebuffer, so it is independent of how textures are produced.
- Existing "grading" is a CSS filter, not a shader: `filter: saturate() brightness() contrast()` on the canvas container — `Game.tsx:4875`.

### 2.2 Available building blocks (three r185, WebGL2 confirmed)
All present in `node_modules/three/examples/jsm/`:
- `postprocessing/EffectComposer.js`, `RenderPass.js`, `ShaderPass.js`, `OutputPass.js`, `BokehPass.js`.
- `shaders/BokehShader.js`, `BokehShader2.js`, `DOFMipMapShader.js`, `FocusShader.js`, `DepthLimitedBlurShader.js`.

**Decision:** use `EffectComposer` + `RenderPass` + two **custom `ShaderPass`** effects (DOF + CA) + `OutputPass`, rather than `BokehPass`:
- `BokehPass` re-renders the scene with a depth-displacement override material (≈2× scene draw calls) and a heavy disk kernel — too expensive for a voxel world that already targets 60 FPS.
- A single-render custom DOF (color+depth target, one gather pass) + a 3-tap CA pass is cheaper and fully controllable.

### 2.3 Settings UI — existing patterns
- `OptionsMenu.tsx` has a sidebar (`Video / Audio / Gameplay / World / World Gen / Account`) and a Video tab with quality presets, sliders (render distance, vibrance, FOV…) and toggles (Dynamic Shadows).
- All settings are React state in `Game.tsx` (e.g. `vibrance`, `contrast`, `shadows` at `Game.tsx:193-199`) and persist via the user `preferences` API (`Game.tsx:824-899`).
- Presets: `handleApplyPreset` (`Game.tsx:374`) + `qualityPreset` state (`Game.tsx:199`).

### 2.4 Constraints
- `ci:perf` (`scripts/ci-perf.mjs --gate`) asserts draw-call/tris/frame-time limits **and** compares golden frames by MAE (`snapshots/golden`). Any default-on post-fx would shift the framebuffer → goldens would need a REBASELINE. **Keep post-fx default OFF.**
- Mobile / coarse-pointer devices are already gated for shadows (`Game.tsx:1661`); post-fx should follow the same default-off policy.

---

## 3. Settings UI (new "functions")

### 3.1 New state (`Game.tsx`)
```ts
const [dof, setDof] = useState(false);
const [dofStrength, setDofStrength] = useState(0.4);   // 0..1
const [ca, setCa] = useState(false);
const [caStrength, setCaStrength] = useState(0.25);    // 0..1
```
Persisted in `preferences` (mirror `vibrance`/`brightness` at `Game.tsx:824-899`).

### 3.2 UI — new "Effects" section in the Video tab (`OptionsMenu.tsx`)
Reuse existing widget styles:
- **🎯 Depth of Field** — toggle button (`ON/OFF`) + slider `Dof Strength` (0–100%).
- **🌈 Chromatic Aberration** — toggle button + slider `CA Amount` (0–100%).
- **Presets** (`handleApplyPreset`):
  - `smooth` → both OFF.
  - `balanced` → CA 15%, DOF OFF (keeps 60 FPS).
  - `beautiful` → DOF 40% + CA 25% (subtle cinematic).

---

## 4. Post-processing pipeline — `src/game/engine/postFx.ts` (new)

### 4.0 As-built architecture (supersedes the EffectComposer sketch below)

three r185 hardcodes linear output for every non-XR render target (`WebGLPrograms.getParameters`),
so any scene→RT→composite pipeline blends transparents in linear space and visibly washes out
water/clouds vs the direct path (verified by pixel diff). For byte-parity the as-built pipeline
keeps the base frame on the canvas:

```
renderer.render(scene, camera)          # direct → canvas (identical programs + sRGB blending)
2D-canvas copy → CanvasTexture upload   # canvas → copyCtx.drawImage → needsUpdate (avoids
                                        # copyTexSubImage2D, which fails on display-p3 buffers)
[DOF]  depth pre-pass (scene.overrideMaterial = MeshBasicMaterial, full-res DepthTexture)
       → 8-tap depth-aware bokeh gather at 0.5× into dofRT
present pass (composite + CA)           # reads tSharp=copy, tBlur=dofRT, tDepth
       col = mix(sharp, blur, smoothstep(0.02, 0.45, baseBlur + coc)) ± CA radial fringing
```

- **Wide-gamut canvas tag:** the WebGL2 context is created with `colorSpace: 'display-p3'`
  (or 'srgb') per the persisted preference — the dynamic `drawingBufferColorSpace` setter alone
  is not honored by all browsers, which shifted P3/BT.2020 hue. The 2D copy canvas is created
  with a matching `colorSpace` and falls back to sRGB.

- **In-focus sharpness:** the composite mixes by per-pixel CoC, so in-focus pixels come straight
  from the full-res canvas copy — the half-res blur only ever touches defocus areas (fixes the
  "everything slightly pixelated" artifact of routing the whole frame through the half-res target).
- **Full-frame lens feel (focus-plane model):** the focus plane follows the crosshair but caps at
  `MAX_FOCUS = 10` blocks; overall blur scales with `(1 - focus/10)^1.5` — very close focus =
  strong blur, focus at 10+ blocks or sky = essentially sharp (hyperfocal-like), with
  `baseBlur = strength × 0.10 × focusScale` and `maxRadius = 4 + strength × 24` texels (half-res).
- **CA curve:** `pow(len, 1.5) × 20` radial displacement — barely visible center, strong corners.
- **Wide-gamut output:** `display-p3`, `rec709`, and `bt2020` spaces are registered at runtime via
  `THREE.ColorManagement.define` (all use the sRGB OETF — three only supports sRGB/linear
  transfers). A **Color Gamut** selector in the Video tab switches live and persists per-user
  (`color_gamut` column); sRGB fallback via try/catch.
- **Parity:** effects OFF → `renderPostFx` returns false → the direct `renderer.render` runs
  unchanged; effects ON at zero strength → present pass copies the canvas copy 1:1 (MAE 0 by
  construction, confirmed by pixel readback during development).
- **Wide-gamut output:** a `display-p3` color space (P3 primaries, sRGB transfer, D65) is
  registered via `THREE.ColorManagement.define` and set as the renderer's output + drawing-buffer
  color space in `Game.tsx` (try/catch fallback to sRGB where unsupported).

### 4.2 Depth for DOF — explicit RT construction (S2 gotcha)
`EffectComposer`'s default render targets have **no** `DepthTexture`. Construct the composer with a
custom target:
- `new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h), ... })` passed to
  `new EffectComposer(renderer, rt)`.
- **Resize must also resize the depth texture** — `composer.setSize` alone does not; `resizePostFx`
  sets `rt.depthTexture.image.width/height` (or recreates both RTs) on window resize.
- WebGL2 (three r185) writes depth into that texture automatically during `RenderPass`.
- DOF shader converts the sampled depth `z ∈ [0,1]` → linear distance via the standard projection
  inversion using `cameraNear`/`cameraFar`. Depth precision note: near=0.08 / far=800 is wide, but
  WebGL2 24-bit depth is ample for CoC purposes — no changes to camera planes needed.

### 4.3 DOF shader (single-pass gather)
```glsl
// uniforms: tDiffuse, tDepth, cameraNear, cameraFar, focus, aperture, offsets[8], weights[8]
float linearDepth(float z) {
  float zN = 2.0 * z - 1.0;
  return 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - zN * (cameraFar - cameraNear));
}
void main() {
  float d  = linearDepth(texture2D(tDepth, vUv).x);
  float coc = clamp(abs(d - focus) / focus, 0.0, 1.0) * aperture; // 0 at focus → far from focus
  vec3  col = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 suv = vUv + offsets[i] * coc;
    float sd = linearDepth(texture2D(tDepth, suv).x);
    // depth-aware rejection: don't smear foreground colors onto background edges
    float sw = weights[i] * step(abs(sd - d), max(abs(d - focus), 1.0) * 0.5 + 0.5);
    col  += texture2D(tDiffuse, suv).rgb * sw;
    wsum += sw;
  }
  gl_FragColor = vec4(col / max(wsum, 1e-4), 1.0);
}
```
- Kernel taps = fixed 8 radial offsets; radius ∝ `coc`; strength slider scales `aperture`.
- **Depth-aware taps (baked in, not deferred):** each tap samples depth and is rejected when its
  depth differs materially from the center pixel's — without this, radius-scaled gathering produces
  haloing/bleeding artifacts at object silhouettes.
- **Half-res DOF is the default, not a knob:** the DOF pass reads/writes a 0.5× target and the
  result is upsampled (bilinear) into the CA pass input. Standard practice — halves DOF cost and
  hides gather aliasing. The old 0.75× idea is dropped.
- **Focus source:** the player's crosshair target distance (`ctx.raycast`, already used for
  digging/placing). When aiming at the sky / no hit → set focus very far (everything sharp), so the
  world isn't randomly defocused.
- **Focus smoothing (S3, not an afterthought):** raycast focus jumps discretely between targets;
  smooth it temporally — `focus = lerp(focus, targetFocus, ~0.1)` per frame — or DOF visibly snaps
  every time the crosshair moves to a new block.

### 4.4 Chromatic aberration shader (3-tap)
```glsl
void main() {
  vec2 d  = vUv - 0.5;                                   // radial from screen center
  vec2 rr = vec2(1.0/resolution.x, 1.0/resolution.y) * length(d) * amount * 2.0;
  vec3 col;
  col.r = texture2D(tDiffuse, vUv + d * rr).r;           // red pushed out
  col.g = texture2D(tDiffuse, vUv).g;                    // green center
  col.b = texture2D(tDiffuse, vUv - d * rr).b;           // blue pulled in
  gl_FragColor = vec4(col, 1.0);
}
```
- Optional later refinement: scale the offset by DOF `coc` so fringing concentrates on defocused areas (nicer, still cheap).

### 4.5 Public API
```ts
createPostFx(renderer, scene, camera): PostFx        // builds composer; starts all passes disabled
updatePostFx(fx, settings)                            // toggles pass.enabled + uniform values
setPostFxFocus(fx, distance)                          // per-frame DOF focus (smoothing lives inside postFx)
resizePostFx(fx, w, h)                                // composer.setSize + resize the DepthTexture (see 4.2)
renderPostFx(fx): boolean                             // composer.render(); false if disabled
```

---

## 5. Integration points (exact)

| File | Change |
|---|---|
| `src/game/engine/postFx.ts` | **new** — module above |
| `src/components/Game.tsx` | build `createPostFx` after scene/camera/materials (~:1666); store on `s`; pass into render-loop ctx; call `resizePostFx` inside existing `onResize` (:3821); add `dof/ca/...` state (:193) + `OptionsMenu` props (:5109) + persistence (:824) + preset hook (:374) |
| `src/game/engine/renderLoop.ts` | replace `s.renderer.render(scene, camera)` (:753, :766, :793) with `renderPostFx(fx) ? ... : renderer.render(...)`; update `setPostFxFocus` each frame from `ctx.raycast` (temporal lerp applied inside postFx, see 4.3) |
| `src/components/gui/OptionsMenu.tsx` | add Effects section + toggles/sliders; new props `dof/dofStrength/ca/caStrength` + setters |
| `src/game/state/gameState.ts` | add `postFx` ref slot (holds the composer) so renderLoop can reach it |

---

## 6. Performance & safety

- **Default OFF** → `renderer.render` path is byte-for-byte the current frame; `ci:perf` goldens + limits unchanged → gate stays green with no REBASELINE.
- **Color-space parity (must verify, not assume):** direct `renderer.render` and
  `composer.render()` + `OutputPass` can produce different output (tone mapping / sRGB handling).
  The probe (§7) asserts a pixel comparison of post-fx-OFF-through-composer vs the raw path so
  toggling the composer in never shifts colors.
- **ci:perf golden capture path (check before S3):** §2.4 assumes goldens only break if effects are
  default-on — but if the perf harness applies a quality preset (e.g. `beautiful`) before capture,
  the preset wiring in §3.2 shifts goldens even with effects default-OFF. Confirm how
  `scripts/ci-perf.mjs` captures frames; if presets are applied, cap preset-driven post-fx in the
  capture path or REBASELINE knowingly.
- DOF cost ≈ 8 texture taps + 1 depth read per pixel **at 0.5× resolution** (half-res is the
  default, see 4.3); CA ≈ 3 taps. At full res (pixelRatio 1) this is modest on a real GPU;
  SwiftShader (headless tests) will be slower — documented, not gated when OFF.
- Mobile/coarse-pointer default OFF (same policy as shadows).

---

## 7. Verification & gates

1. **Machine gates (agent):** `npx tsc -b`, `npm run build`, `npm run sim:test`,
   `node catalog/textureCheck.mjs`, `node scripts/test-worker-meshing.mjs` (known baseline
   failures only). Per AGENTS.md, agents do NOT run headless-Chromium probes.
2. **Human visual check:** see the "Human visual test checklist" section in `AGENTS.md`
   (DOF focus sharpness, CA corner fringing, ON/OFF parity, presets, persistence, P3 richness).
3. **ci:perf (human-run, spawns Chromium):** post-fx OFF keeps the render path byte-identical, so
   goldens stay valid for the post-fx change itself. The **Display-P3 output** can shift captured
   pixels on wide-gamut pipelines — if the frame-diff gate fails after this change, rebaseline
   once with `node scripts/ci-perf.mjs --capture`.
4. **KB:** add/update a `postfx` KB entry documenting the two effects, the focus model, and the
   perf trade-off.

---

## 8. Decisions (resolved)

1. **Default state** — **post-fx OFF at boot.** Keeps goldens stable; presets may opt in.
2. **Focus model** — **auto-focus on crosshair target**, temporally smoothed (see 4.3). No manual slider.
3. **UI placement** — **"Effects" section inside the Video tab.**
4. **CA + DOF interaction** — **CA always-on-when-enabled** (pure 3-tap). The depth-weighted CA
   refinement stays a documented follow-up, not part of S1–S4.

---

## 9. Work units (each = one autonomous cycle)

1. **S1 — settings + UI:** state, persistence, OptionsMenu Effects section, preset wiring. Gate: tsc/build.
2. **S2 — postFx module:** composer **with custom RT + DepthTexture (4.2)**, RenderPass, DOF (depth-aware taps, half-res target) + CA shaders, OutputPass, API. Gate: tsc/build + probe capture (incl. color-space parity check).
3. **S3 — integration:** renderLoop routing, per-frame focus with temporal smoothing, resize (incl. depth texture); **verify ci:perf capture path first** (§6); verify no regression with effects OFF.
4. **S4 — verification & docs:** post-fx probe assertions (variance-ratio, CA fringing, parity, frame-time), full gates, KB entry.