# Car Design Plan — Realistic Low-Poly Vehicles

**Revision:** 2026-08-31  ·  **Status:** re-scoped after implementation audit

## Decision

The engine can display convincing low-poly cars with working doors, hood, trunk, and liftgate. It cannot produce a realistic finished car by stacking more rectangular primitives. The current procedural fleet is useful as a fallback and physics test asset, but the production visual path should be an authored GLB/GLTF model with proper surfaces, panel gaps, glass, materials, and hinge pivots.

The target is believable game-ready realism, not a photorealistic CAD model: clean silhouettes at normal gameplay distance, readable panel seams and gaps up close, correct reflections, and coherent interior/exterior construction.

## Audit of the previous plan

The previous A–G plan declared a visual pass complete after adding colors, roofs, lights, plates, wheel decorations, and repeated box details. That improved feature coverage but not the underlying model quality.

| Area | Actual state | Consequence |
|---|---|---|
| Body | Mostly independent `BoxGeometry` pieces | Toy-like silhouette, hard intersections, no fender or shoulder surfacing |
| Doors | Thin boxes in a root group | They rotate, but lack a believable outer skin, inner trim, glass frame, and authored hinge relationship |
| Trunk/hatch | A generic hinged slab | It opens visually, but imported models had no panel metadata or hood/liftgate support |
| Interior | Repeated boxes | Details exist but do not read as a designed cabin at normal camera distance |
| Wheels | Procedural cylinders and spokes | Readable as wheels, but not production-grade tire/rim geometry |
| Import | Wheel detection only | A realistic uploaded model could not animate its doors or trunk reliably |
| Gameplay | E-key raycasts panel groups | Panel state is visual only; no panel collision, storage, locks, or persistence |

## What changed in this revision

- Added `VehiclePanel` and `VehicleArticulations` to the model contract.
- GLB/GLTF and FBX imports now detect named `door_FL`, `door_FR`, `door_left`, `door_right`, `hood`, `trunk`/`boot`, and `hatch`/`liftgate` nodes.
- Imported articulated nodes retain their authored closed rotation and animate toward an open rotation instead of assuming every asset starts at zero rotation.
- The E-key panel raycast now supports trunk, liftgate, hood, and both doors; it still falls back to existing procedural door/trunk groups.
- The built-in Bravura hood now has its own rear hinge group and participates in the same eased open/close animation.
- All six procedural builders now soften their box-based additive panels with low-segment rounded geometry. This is a readability improvement, not a claim that the procedural fleet is now realistic.
- Added and indexed `kb/entities/vehicle.md` for the custom vehicle entity/mechanic.

## Production asset contract

The preferred source asset is GLB/GLTF with embedded textures and a small, deliberate node hierarchy. FBX remains supported for compatibility, but GLB is the review format.

Required node names:

```text
vehicle_root
  body_shell
  glass_windshield
  glass_side_FL / glass_side_FR / glass_rear
  door_FL / door_FR
  wheel_FL / wheel_FR / wheel_RL / wheel_RR
  hood
  trunk              # sedan/coupe
  hatch              # hatchback/wagon instead of trunk
  interior
```

Door, hood, trunk, and hatch nodes must be groups whose origins sit on the real hinge axis. Meshes may be nested below those groups. Wheel nodes must be the rotating wheel groups, not decorative child meshes.

Geometry and material targets:

- 8–18k triangles for a complete hero car; warn above 20k and reject above 80k.
- Separate body shell, bumpers, lights, glass, tires, rims, brakes, interior, and panel meshes.
- Real silhouette breaks: wheel arches, hood crown, shoulder line, beltline, roof pillars, bumper corners, and underbody shadow.
- Panel gaps should be dark recesses or small separations; do not draw them as floating black stripes.
- Use consistent real-world scale and apply transforms before export.
- Painted body is non-metallic; chrome and brake hardware metallic; rubber rough; glass transparent and slightly tinted.
- Keep transparent glass surfaces thin and avoid duplicate coplanar panes.

## Implementation phases

### Phase 1 — Asset-ready runtime foundation

**Status: in progress**

- Keep the articulation contract and imported-node detection.
- Add explicit `panelId`, `openAngle`, and optional `interactionDistance` metadata for non-standard assets.
- Add a SimDeck importer report: bounds, triangle count, missing wheel groups, missing panel groups, and detected panel names.
- Add a preview state that opens each detected panel before spawning.

**Done when:** an uploaded GLB reports its panel contract, previews every detected panel, and drives with the same physics as a procedural car.

### Phase 2 — Build one hero car

Create one authored Bravura hardtop first. Do not build six variants until this asset passes close inspection.

- Exterior: coherent body shell, fenders, bumpers, grille, lamps, mirrors, handles, plates, exhaust, and panel gaps.
- Cabin: windshield, side glass, pillars, seats, steering wheel, dash, mirror, pedals, shifter, and handbrake.
- Articulation: two front doors, hood, trunk lid, and four wheels with correct pivots.
- Presentation: three neutral paint colors, controlled chrome, functional lamps, and no texture dependencies outside the GLB.

**Done when:** a human can orbit the parked car at close range and cannot identify major box intersections, floating trim, missing panel backs, or incorrect hinge motion.

### Phase 3 — Real panel behavior

- Animate doors, hood, trunk, and hatch with per-panel closed/open poses and eased motion.
- Prevent driving while a panel is open, or close panels automatically when entering; choose one rule and show it in the HUD.
- Place the player at the actual opened door and select a free exit position on that side.
- Identify the target in the toast as “door”, “hood”, “trunk”, or “liftgate”.
- Add panel collision only after the visual state is stable; a false collision box is worse than no collision.

**Done when:** each panel can be targeted from the correct side, opens around its real hinge, does not snap or detach, and cannot trap the player.

### Phase 4 — Vehicle content

Derive the remaining styles from authored assets or controlled variants, not by recoloring the same box kit.

| Style | Visual priority |
|---|---|
| Bravura | Hero sedan; validate the full asset contract first |
| Cabriolet | Same design language with roof and glass removed correctly, not a roofless box |
| Sabre | Long hood, short deck, muscle stance, hood scoop, stripe livery |
| Voodoo | Low stance, wire wheels, two-tone paint, detailed chrome, hydraulics |
| Cheetah | Low/wide body, raked glass, aero surfaces, rear wing |
| Blista | Tall hatchback, proper liftgate, narrow economy proportions |

### Phase 5 — Gameplay depth

Only after Phase 3 is accepted:

- Separate hood/trunk/hatch state from visual animation state.
- Add a real trunk container if storage is wanted; opening a mesh alone is not storage.
- Persist vehicle position, style, panel state, and damage only after a persistence schema is agreed.
- Add sounds, brake lights, turn signals, tire marks, and damage as separate systems.

## Non-goals

- No ripped GTA assets or copyrighted vehicle meshes.
- No promise that procedural boxes become realistic through material tweaks alone.
- No per-panel physics collider until it is needed and tested.
- No six-car content pass before one hero car proves the geometry, material, and articulation workflow.

## Verification

Machine gates after each code change:

```text
npx tsc -b
npm run build
npm run sim:test
node catalog/textureCheck.mjs
node scripts/test-worker-meshing.mjs
```

Agents do not run browser probes. Human visual verification is required in `:DEV`:

1. Open the dev game, join a world, and spawn Bravura from SimDeck.
2. Orbit at bumper, wheel, roof, side, and interior distance. Confirm the rounded fallback has softer highlights and no new floating geometry.
3. Aim at the front/rear panel and press E. Confirm trunk/hood open and close smoothly without snapping; aim at each side door and confirm the correct door opens around its front hinge.
4. Import a GLB with the required node names. Confirm the same panel targets are detected and the uploaded door/hood/trunk/hatch rotate around authored pivots.
5. Drive forward, steer, brake, and exit. Confirm wheel spin/steer still track and open panels do not corrupt the camera or player position.
6. Treat this as a foundation review. The Bravura hero asset is not “realistic” until the Phase 2 close-orbit checklist passes.

## Archived previous plan

The original GTA: San Andreas styling checklist follows below for reference; its A–G “shipped” status is superseded by this revision.

**Date:** 2026-08-31 · **Status:** Units A–G shipped · builds on `VEHICLE_SYSTEM_PLAN.md`
**Goal (user):** restyle the existing procedural vehicle mockup so it reads as a
PS2-era **GTA: San Andreas** car — closed hardtop silhouettes, boxy rectangular
lamps, flat bold paint with chrome trim contrast, distinct body archetypes
(sedan/muscle/lowrider/sports/compact), and SA-style wheel variety.

**Constraint:** the repo is zero-external-assets (README). This is a **procedural
styling pass only** — primitives + canvas textures, like every other asset in the
engine. No ripped GTA:SA models/textures, ever.

---

## 1. Current state (baseline)

`src/game/vehicles/createMockupCar.ts` is the only registered style (`sedan` in
`vehicleDefs.ts`): a **roofless cabriolet** — boxy chassis, sphere headlights,
single hardcoded blue metallic paint (`0x2f6fd0`, metalness 0.55), decent
chrome-dish wheels, visible interior/dash/steering wheel. `VehicleModel` /
`VehicleStyle` already provide the right seams (each style lazily builds its own
model with 4 named wheel groups + optional doors/trunk/wipers), so new archetypes
are additive, not a rewrite. SimDeck has one spawn button + an FBX-upload path
(V1); no style/color picker yet.

## 2. What reads as "SA" that's missing today

| Trait | Current | Target |
|---|---|---|
| Roofline | open cabrio only | closed hardtop (default) + cabrio kept as a variant |
| Lamps | glowing spheres | flush rectangular box lenses |
| Paint | glossy modern PBR (metalness 0.55) | flatter, bolder single-color gloss (metalness ~0.2) |
| Trim | chrome present but subtle | brighter chrome contrast on bumpers/grille/mirrors/exhaust |
| Body variety | one generic shape | sedan / muscle / lowrider / sports / compact silhouettes |
| Wheels | one chrome-dish design for everything | chrome wire (lowrider) / 5-spoke alloy (sports) / poverty cap (beater) |
| Paint scheme | flat single color | optional two-tone / stripe livery (lowrider signature) |

## 3. Work units

### Unit A — Paint & lamp pass on the existing mockup (start here, low risk)
- Flatten `paintMat` (metalness ↓ to ~0.2, roughness ~0.5), bolder default hue.
- Replace sphere headlights with flush rectangular box lenses (keep emissive +
  point lights). Widen/flatten taillight bars to match.
- Brighten chrome trim (`trimMat`) contrast against the flatter paint.
- **Acceptance:** spawn the car — paint looks flat/bold, not glossy-modern;
  headlights are rectangular lens units, not glowing balls; chrome bumpers/grille
  pop against the body color.

### Unit B — Hardtop roof variant
- New `createHardtopCar.ts` (or a `roofed` param sharing chassis/door/interior
  code with the mockup): roof panel, B/C pillars, rear backlight glass.
- Keep the existing cabrio as an explicit "convertible" style — don't delete it.
- **Acceptance:** default spawn is now a closed 2-box-silhouette hardtop sedan
  viewed from outside; convertible still spawnable/driveable as before.

### Unit C — Wheel-style kit
- Refactor `makeWheel()` into a small parameterized module: chrome wire/dish
  (lowrider), 5-spoke alloy (sports), steel poverty cap (beater/sedan).
- Selected per `VehicleStyle`.
- **Acceptance:** each archetype below spawns with its intended wheel look.

### Unit D — New body archetypes
Each a `createXCar.ts` returning `VehicleModel`, registered in `vehicleDefs.ts`
with its own `VehicleTunables`:
- **Sedan/"Bravura"** — hardtop from Unit B, mid stats (baseline).
- **Muscle/"Sabre"** — long hood, short deck, hood scoop; higher `engineForce`/mass.
- **Lowrider/"Voodoo"** — low `bodyHeight`, wire wheels, two-tone paint, lower `topSpeed`.
- **Sports/"Cheetah"** — low & wide, rear spoiler; higher `topSpeed`/`steerMax`.
- **Compact/"Blista"** — short wheelbase, small mass, lower stats.
- **Acceptance:** 5 visually distinct silhouettes selectable from SimDeck, each
  drivable with its own feel (per sim:test mass/force assertions already proven
  in `VEHICLE_SYSTEM_PLAN.md`).

### Unit E — Livery / two-tone paint
- Small canvas-texture generator (matches the engine's existing procedural
  texture-atlas pattern) for racing stripes / hard two-tone split, applied as a
  map on the paint material.
- **Acceptance:** lowrider spawns two-tone by default; a stripe livery is
  selectable and renders correctly on the hood/roof/trunk without UV seams.

### Unit F — Stretch polish
- Lowrider hydraulics bounce (bound to an input while parked).
- Procedural canvas license-plate texture, front + rear.

### Unit G — SimDeck hook-up
- Extend the single spawn button into a style + paint-color picker calling
  `spawnVehicle(styleId, colorHex?)`.

## 4. Sequencing

A → B → C are the highest visual return per effort and touch no physics code.
D is where it starts reading as SA (silhouette variety). E/F/G are polish/UX on
top. Every unit stays inside the existing `VehicleModel` contract, so
`vehicleEntity.ts`, `vehiclePhysics.ts`, and the FBX (V1) import path are
untouched.

## 5. Shipped summary (2026-08-31)

- **A/B** (`createMockupCar.ts`, `createHardtopCar.ts`): flat bold paint, chrome
  rectangular lamps, closed hardtop as the default `sedan` style; open cabrio
  preserved as `convertible`.
- **C** (`wheelKit.ts`): 4 wheel presets — `chromeDish`, `alloy5spoke`,
  `wireSpoke` (+ knock-off spinners), `povertyCap`.
- **D**: 4 new archetypes registered in `vehicleDefs.ts`, each its own tunables
  + `createXCar.ts`: `muscle` (Sabre — long hood/hood scoop/alloy5spoke),
  `lowrider` (Voodoo — two-tone purple/white, lowered, wireSpoke),
  `sports` (Cheetah — low/wide, rear spoiler, alloy5spoke), `compact`
  (Blista — small hatchback, povertyCap). Shared material/wheel code lives in
  `carMaterials.ts` + `wheelKit.ts`.
- **E** (`livery.ts`): canvas-texture racing-stripe decals (hood/roof/trunk
  segments) applied to the Sabre muscle car.
- **F**: `plateTexture.ts` canvas license plates (front + rear) on all 6
  styles; lowrider hydraulics bounce in `vehicleEntity.ts` — hold handbrake
  (Space) while parked in a `lowrider` to hop.
- **G**: SimDeck's spawn control is now a style picker (`listVehicleStyles()`)
  + "SPAWN CAR" button, calling the existing `spawnVehicle(styleId)` — no
  `Game.tsx` changes needed since that signature already took a style id.

## 6. Detail pass (2026-08-31, post-review)

The first A–G pass was too shallow — reskinning (paint/roof/wheel-style) without
real interior/exterior/wheel fidelity. A follow-up investigation found one
confirmed bug and several real gaps, both fixed:

- **Bug fixed:** `createLowriderCar.ts` lowered the body correctly via a
  `RIDE_DROP` offset but then *also* subtracted it from wheel Y position,
  sinking the tires 0.14m into the ground. Wheels now stay grounded at their
  own radius; only the body drops.
- **Wheel rotation verified, not assumed:** ran the actual Three.js Euler
  composition (`YXZ`, spin=`rotation.x`, steer=`rotation.y`) through a
  standalone script — confirmed the rolling axis stays horizontal regardless
  of spin, only rotating in-plane by the steer angle. Math was already
  correct; what was weak was geometry fidelity (see next point).
- **`wheelKit.ts` detail:** tires got blocky tread (16 radial blocks, not a
  smooth drum — visible spin read), `chromeDish` got a real dished/concave
  profile (lip + recessed disc) instead of a flat cylinder, and open-spoke
  styles (`alloy5spoke`, `wireSpoke`) show a brake rotor behind the spokes
  (`alloy5spoke` adds a colored caliper accent too).
- **New `exteriorDetails.ts`:** grille (backing plate + N chrome bars, width/
  bar-count varies per archetype) and dual chrome exhaust tips on 5 of 6
  styles (Blista skips both — deliberately plain, it's the budget car);
  `addHoodOrnament` on the Voodoo lowrider only.
- **New `interiorDetails.ts`:** rearview mirror, floor shifter + handbrake
  lever, and door interior cards (panel + armrest, visible when a door is
  opened) — added to all 6 styles, closing the "doors are blank on the
  inside" and "same bare dash copy-pasted" gaps.
- **Pillars re-confirmed correct** per body style (not changed, just
  verified): Cabriolet = A-pillar only (no roof); Bravura/Sabre/Voodoo =
  full A/B/C; Cheetah/Blista = A + one intermediate pillar (fastback taper,
  no distinct C).

## 7. Verification

Per `AGENTS.md`: no headless browser probes from agents. After each unit:
`npx tsc -b && npm run build && npm run sim:test`, then a human visual check on
`:DEV` — spawn each style from SimDeck, walk around it, drive it, confirm wheel
spin/steer and roofline/pillars look right from outside.
