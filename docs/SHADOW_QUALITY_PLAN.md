# Shadow Quality Tiers + Cascaded Shadow Maps (P1)

_Status: proposed — authored 2026-09-03_
_Scope: CORE_ENGINE_ROADMAP_PLAN.md P1. three r185 (`CSM.js` available)._

---

## 1. Current state

- One sun `DirectionalLight` (`Game.tsx:2171`), single **512² PCF** shadow map.
- `renderer.shadowMap.type = THREE.PCFShadowMap` is **hard-coded** (`Game.tsx:2093`);
  `autoUpdate = false` + manual `shadowMap.needsUpdate = true` on sun movement
  (`renderLoop.ts:918`).
- `shadows` boolean toggle (preference) controls `enabled` + `sun.castShadow`.
- Quality presets (smooth/balanced/beautiful) only affect horizon/render distance + postfx
  (`Game.tsx:714`) — **not** shadow quality.
- Custom assets already use Lambert + cast/receive shadow (see CUSTOM_ASSET_SHADOWS_PLAN).

## 2. Goal

Configurable shadow quality tied to visual tiers:
- **Basic** → `BasicShadowMap` (fastest, hard edges)
- **Detailed** → `PCFSoftShadowMap` (soft, default)
- **Advanced** → CSM (cascaded directional shadow maps, near crisp → far soft)
- Persisted per-user, with a manual override that quality presets auto-set until overridden.

**Primary user requirement:** *blocks and 3D assets must cast clearly-visible shadows onto
the ground as the sun moves.* The mechanism exists (chunks ≤3.5 chunks cast, custom assets
cast, ground receives, sun updates every 500ms / on move) but the single **512² map over a
±64-unit area + bright ambient/hemisphere (0.35/0.55)** makes shadows faint to invisible.
So tiers/CSM alone are not enough — visibility is a first-class sub-goal (P1c).

## 3. Implementation

### P1a — Shadow tiers (Basic / Detailed / Advanced via map type) — low risk
1. **State:** `shadowTier: "basic" | "detailed" | "advanced"` in `Game.tsx`, default from
   quality preset (smooth→basic, balanced→detailed, beautiful→advanced).
2. **Effect** (replaces the current `shadows` effect at `Game.tsx:733`):
   `renderer.shadowMap.enabled = shadows`, `renderer.shadowMap.type = mapTypeFor(shadowTier)`
   (`BasicShadowMap` | `PCFSoftShadowMap` | `PCFShadowMap`), `sun.castShadow = shadows`.
   For `advanced` initially use `PCFShadowMap` until P1b lands.
3. **UI:** `OptionsMenu.tsx` Video tab → "Shadow Quality" selector (Basic / Detailed /
   Advanced) next to the existing Dynamic Shadows toggle.
4. **Persistence:** add `shadow_tier` to the preferences payload (`Game.tsx:1398`),
   `api.ts` type + default, `server/db.js` `user_preferences` ALTER column, restore on load.
5. **Preset mapping:** when `qualityPreset` changes, set `shadowTier` from the preset unless
   the user has manually overridden it (track a `shadowTierOverridden` flag).

### P1b — CSM for Advanced tier — higher risk, gated behind Advanced
1. Create a `CSM` from `three/examples/jsm/csm/CSM.js` for the sun:
   - `cascades: 4`, `shadowMapSize: 1024`, `fade: true`, `lightDirection` from the current
     sun direction, `camera`, `parent: scene`, `maxFar` from frustum/render distance.
2. `csm.setupMaterial(...)` on the world Lambert materials (`matMerged`, `matOpaque`,
   `matFoliage`, `matTrans`) — must **coexist** with the existing `onBeforeCompile` hooks
   (specular `setSpecularEnabled`, foliage wind-sway).
3. `renderer.shadowMap.type = THREE.CSMShadowMap`; drive `csm.updateFrustums()` per frame in
   `renderLoop.ts` (replacing the manual `needsUpdate` path for the sun).
4. Toggle: Advanced on → CSM; off → PCFSoftShadowMap (Detailed). `CSMHelper` optional dev aid.
5. Custom assets keep `castShadow`/`receiveShadow`; they participate in the cascade nearest
   the player automatically.

### P1c — Visible ground shadows (the user-facing requirement)
1. **Resolution:** raise the near shadow map so a block (~1 unit) spans several texels:
   - Single-map tiers: 512 → **1024** (and shadow camera range tightened so texel density
     near the player is high, e.g. ±48).
   - CSM: cascade 0 (nearest) `1024–2048` for crisp block/asset shadows near the player.
2. **Darkness:** the ambient (0.35) + hemisphere (0.55) washes shadows out (~0.9 lit even in
   shade). Make shadows readable without changing the overall look: add a per-tier
   **shadow-darkening** — either lower the hemisphere slightly, or scale ambient by a
   sun-aware factor, and/or use `shadow.bias/normalBias` correctly (already set).
3. **Custom assets:** confirm the fence/3D assets visibly cast onto the ground in every tier
   (they already `castShadow`/`receiveShadow`; verify with the sun at low angle where shadows
   are longest).
4. **Verify in browser:** noon → short ground shadow; sunset → long shadow; toggle tiers;
   confirm blocks + assets both cast. This is the acceptance test for the whole plan.

## 4. Files

| Change | File |
|---|---|
| State/effect/preset/prefs | `src/components/Game.tsx` |
| CSM setup + per-frame update | `src/components/Game.tsx`, `src/game/engine/renderLoop.ts` |
| UI selector | `src/components/gui/OptionsMenu.tsx` |
| Preference type/default | `src/services/api.ts` |
| `user_preferences.shadow_tier` column | `server/db.js` (+ restore in `Game.tsx`) |

## 5. Risks & mitigations

- **CSM × shader hooks (highest risk):** CSM's `setupMaterial` adds defines/uniforms to the
  same Lambert materials already patched by specular + wind-sway `onBeforeCompile`. Mitigate:
  chain the patches (CSM's modification + existing replacements), and test each material.
  If a conflict is unresolvable, keep Advanced = `PCFShadowMap` (still a visible upgrade) and
  land CSM later.
- **`autoUpdate=false` + CSM:** CSM manages its own shadow maps via `updateFrustums`; set the
  map type to `CSMShadowMap` and update CSM each frame for Advanced, else keep the current
  manual `needsUpdate` path.
- **Perf:** CSM = 4×1024² maps — gate behind Advanced and scale cascade count with render
  distance. Mobile/low tier = Basic/PCFSoft.
- **Persistence drift:** add the column with a guarded `ALTER TABLE` (same pattern as `fov`).

## 6. Verification

- `npx tsc -b`, `npm run build`, `npm run ci:perf` (golden-frame MAE gate).
- Node: assert `mapTypeFor(tier)` mapping.
- Human (browser): Video → Shadow Quality Basic/Detailed/Advanced; sun moves → shadows
  update; Advanced shows crisper near shadows; custom fence casts/receives in all tiers;
  preset change auto-sets the tier until overridden; persists across reload.

## 7. Sequence

1. P1a (tiers + UI + persistence + preset mapping) — verify.
2. P1b (CSM on Advanced) — verify; fallback to PCF if shader conflicts.

## 8. Implementation status

- **P1a + P1c ✅ DONE:** `shadowTier` state (basic/detailed/advanced), shadow map type
  (`BasicShadowMap`/`PCFSoftShadowMap`/`PCFShadowMap`), per-tier resolution
  (512/768/1024), tighter shadow camera (±48), Shadow Quality selector in Video settings,
  `shadow_tier` preference persisted (client + `user_preferences` column + server prefs
  SELECT/INSERT/UPDATE), quality-preset auto-mapping until manually overridden. Verified:
  server `/auth/me` returns `shadowTier: detailed`.
- **P1b (CSM) pending** — the higher-risk step (shader coexistence with specular + wind-sway).