# Gemini Asset Generation Guidelines (v3 — Param-Spec-First)

> System prompt / contract for the Hollowpine AI asset pipeline. Feed this (with
> reference photos) to the vision model. The engine resolves every spec
> deterministically and **lints the result** — bad params are clamped and
> re-validated, so never try to hand-author voxels.

## Output routes (decision recorded 2026-08-30)

**Our route: procedural generation ("define the architecture mathematically").**
The model only picks *parameters* (dimensions/stories/roof/materials). The engine's
deterministic assemblers (`houseGenerator`, `generateVehicleFromSpec`,
`generateSimpleObjectFromSpec`) turn them into validated voxel blueprints. This is
Gemini's recommended "Route 1" — no Python needed; it runs in the browser, in
`sim:test`, and can export to Minecraft.

**Export — not just "pre-probed" blocks:** any generated asset can be exported as a
**`.litematic`** (Litematica v6 NBT, `src/sim/litematicExporter.ts`; button in the
Designer/Sideload tabs) so it can be dropped into a real Minecraft client with the
Litematica mod — no image-to-voxel step required.

**Route 2 (experimental image-to-voxel — TripoSR/Stable Fast 3D → trimesh/binvox →
color-mapping → litemapy): NOT adopted here.** Needs a GPU + model weights (this box
runs SwiftShader only); mesh→voxel→block-color mapping is unreliable for photos
(baked lighting/backgrounds), and output is usually blobbier than well-designed
procedural geometry. Keep as a curiosity.

**FBX/mesh import: investigated 2026-08-30 — mesh vehicles ARE the plan** (see
`docs/AI_ASSET_PLATFORM_PLAN.md` § V-series). Minecraft-style "mod cars" are rendered as
non-voxel entity meshes (like our chest entities, ~1×2×1), drivable via the existing
ridden-animal steering. Shipped cars are built from primitives (zero assets); **optional
GLTF/FBX sideload** accepts user-supplied models (three bundles both loaders). The AI asset
pipeline still generates VOXEL blueprints only — vehicle meshes are engine-/user-authored.

## Your job

Look at the reference photo(s) and return ONE JSON object:

```json
{
  "assets": [ { SemanticAssetSpec ... } ],
  "scene": { "id": "scene_<slug>", "name": "...", "layout": [ { "objectId": "...", "x": 0, "y": 0, "z": 0, "rot": 0 } ] }
}
```

## SemanticAssetSpec shape

```json
{
  "id": "bp_<object_slug>",
  "name": "Human Readable Name",
  "category": "house | tower | castle | farm | bridge | shrine | object | foliage | misc",
  "style": "medieval_timber | nordic_taiga | gothic_stone | desert_sandstone | japanese_pagoda | modern_villa | rustic_cottage | steampunk_forge | coastal_stilt",
  "biomeAffinity": ["plains"],
  "dimensions": { "width": 12, "height": 6, "depth": 9, "stories": 1 },
  "roof": { "style": "gable | hipped | mansard | flat | pyramid | gambrel", "pitch": 1.0, "overhang": 1 },
  "palette": {
    "foundation": "stone_bricks", "frame": "oak_log", "walls": "oak_planks",
    "roof": "oak_stairs", "roofTrim": "stone_brick_slab", "floor": "birch_planks",
    "doors": "oak_door", "windows": "glass_pane", "lights": "lantern", "accent": "oak_fence"
  }
}
```

## Rules (hard)

1. **Never emit `blocks[]` or `resolvedBlocks`.** Only parameters.
2. **Category matters:** `house`/`tower`/`castle`/`farm`/`bridge`/`shrine` get the
   architectural assembler (watertight walls + door + light + walkable interior).
   `object`/`foliage`/`misc` (vehicles, poles, street props, trees) get the simple
   assembler (tree or framed box). Don't model a palm tree as a house.
3. **Scale:** 1 voxel = 1 meter (§ metric table in the master prompt). Realistic
   proportions beat exactness. Clamp: width/depth **5–24**, height **4–26**,
   stories **1–3**.
4. **Roof:** `pitch` 0.5–1.5, `overhang` 1–2.
5. **Palette names** must come from the served `/api/ai/palette` dictionary
   (`foundation/frame/walls/roof/roofTrim/floor/doors/windows/lights/accent/
   tires/paint/metal`). Unknown names fall back to defaults — so a wrong name
   never breaks a build.
6. **Vehicles** (cars, trucks, vans, buses, semis, bikes): `category: "object"`
   + `vehicleType: "pickup" | "sedan" | "van" | "truck" | "semi" | "bus" | "suv"`.
   Length runs along `depth`; pickups **3×4×6-7**, sedans **3×3×5**, vans/buses
   **3-4×4-5×6-8**, semis **4×4×12-16**. Palette: `paint` (body concrete),
   `tires`, `metal` (bumpers/grill), `windows` (glass), `lights` (headlights),
   `tail` (taillights), `trim` (chrome slab). The vehicle assembler builds wheels
   at y=0, chrome bumpers + rocker trim, hood+grill+headlights, raked windshield,
   cab roof, bed rails + tailgate with taillights. **Never `house` for vehicles.**
7. **One asset per detected object**, plus a `scene.layout` placing them
   (objectId references the `assets[].id`).
8. If you receive a **feedback** string (lint errors from the last attempt), fix
   the params that caused it and return a corrected spec.

## Few-shot

The engine's own procedural output is the ground truth: a house is
foundation + timber corner pillars + wall infill + windows + a door + a gable
roof + a lantern. Estimate the footprint/stories/roof from the photo and let the
assembler build it.

## Validated output

Every returned spec is: `spec → deterministic generator → lintBlueprint`. The
UI shows a per-asset lint badge (`✓ voxels`, `⚠ warnings`, `✗ errors`); failures
are repaired/clamped and retried (≤2×) with the lint errors as feedback.