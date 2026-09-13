# Vehicle System Implementation Plan — FBX Cars as Drivable Vehicles

**Date:** 2026-08-30 · **Status:** proposed (V0 mockup approved as starting point)
**Goal (user):** create and/or import cars (**FBX format**) into the game as assets and use
them as **actual moving vehicles** with real car physics — acceleration, brake, handbrake,
mass/weight, top speed, traction, slopes, collision. Start with a **very easy mockup**, then
improve the model.

---

## 1. Why this works in this engine (investigation findings)

| Need | Precedent already in the engine |
|---|---|
| Non-voxel 3D entity rendering | `src/game/chest.ts` `ChestEntity` — chests are animated `THREE` meshes with a per-chunk lifecycle (`chunkMesher.ts spawnChunkChestEntities`) and per-frame update (`renderLoop.ts:387`). A car is the same pattern. |
| Mounted/steered entity | `src/game/entities/spawner.ts:496-520` — ridden animals: player mounts, camera steers, Space hop. A car = "ridden entity that accelerates". |
| Mesh built from primitives (zero assets) | `createArticulatedChest`, `createHeldBowMesh`, `createHeldTorchMesh`, mob/animal builders. |
| FBX loading | `three/examples/jsm/loaders/FBXLoader.js` is in `node_modules` — supports **binary (≥6400) and ASCII (≥7.0)** FBX, bundles its own `fflate` (no new npm deps), returns a `THREE.Group` with meshes + materials. `GLTFLoader`/`OBJLoader` also present. |
| Input map | `s.keys["KeyW"/"KeyS"/"Space"/...]` (`Game.tsx` key handlers) — WASD/Space already routed. |
| Persistence | `world_blocks`/`custom_blueprints` tables + `saveDb()` pattern (`server/db.js`); add a `world_vehicles` table the same way. |

---

## 2. Asset pipeline: create & import

**Two sources of car models, one entity system:**

1. **Created (procedural, mockup first)** — `createMockupCar(style)` builds the car from
   three primitives (chassis, cabin, slanted windshield, cylinder wheels as **named child
   groups** `wheel_FL/FR/RL/RR`, bumpers, headlights). Zero external assets (repo rule).
   This is the **V0 starting mockup**; later styles (`createSedanCar`, `createPickupCar`…)
   improve the shape.
2. **Imported (FBX)** — the user uploads a `.fbx` (or `.glb` as a bonus since the loader
   is free); the engine parses it with `FBXLoader`, normalizes it, detects wheel nodes,
   and registers it as a vehicle style. This is the "mod-authentic" path (mods ship their
   own models; the user supplies the car file).

**Import pipeline (per model):**
```
FBX file (binary or ASCII)
  → upload (SimDeck Vehicles tab) → stored data/vehicle-models/<id>.fbx
  → served GET /api/vehicle-models/:id
  → FBXLoader.parse() → THREE.Group (meshes + materials)
  → normalize: AABB → scale so length ≈ 4.2, width ≤ 2.2, height ≤ 2.4 blocks (1 block = 1 m);
      rotate if the model's forward axis is not +Z; ground at y = 0
  → material pass: Phong/Standard keep metallic/roughness; missing external textures →
      fallback solid colors (embedded textures work)
  → wheel detection: nodes whose name contains "wheel" (front = also contains "F"/"L|R");
      manual override UI in case naming differs
  → register style { id, name, model, wheelNodes, tunables }
```
**Constraints & fallbacks:** FBX is Autodesk-proprietary but the loader is bundled;
ASCII FBX ≥7.0 works, binary ≥6400 works. Normalize scales away the usual FBX-in-cm
problem. Triangle budget: warn >20k tris, refuse >80k (perf gate: 258k tris total).

---

## 3. Vehicle entity & physics architecture

```
VehicleEntity                        vehiclePhysics (PURE — sim:test)
  ├ root: THREE.Group                 state: p{x,y,z}, yaw, v (forward speed),
  ├ wheelNodes[4]                     vy, steerAngle, per-style tunables
  ├ style: VehicleDef                 step(dt, input, ground, collide): void
  ├ enter/exit(attaches player)       where input = {throttle, brake, handbrake, steer}
  └ update(dt): physics + visuals
```

### 3.1 Physics model (arcade car — the numbers are tunables, not hardcoded)

Longitudinal (per frame, dt):
```
F_engine = throttle * engineForce * (1 - v/topSpeed)     // linear torque falloff
F_brake  = brake     * brakeForce * sign(v)
F_hand   = handbrake * handbrakeForce * sign(v)
F_drag   = dragC * v * |v|
F_roll   = rollingR * mass * g * sign(v)
F_slope  = mass * g * sin(groundSlope)                  // downhill acceleration
a = (F_engine - F_brake - F_hand - F_drag - F_roll + F_slope) / mass
v = clamp(v + a*dt, -reverseMax, topSpeed)
```
Lateral & steering:
```
steerInput → targetSteer = steerInput * steerMax
steerAngle lerps to target (rate-limited, speed-scaled: no turning at standstill,
reversed when reversing)
dYaw = (v / wheelBase) * tan(steerAngle) * dt
lateral velocity l is damped by grip:  l *= (1 - grip*dt)   // handbrake: grip → gripHand (≈0.2)
```
Ground & suspension (visual):
```
raycast down → groundY; if p.y > groundY: vy -= g*dt, p.y += vy*dt else land (p.y = groundY)
pitch = -k1 * a (nose-dive on brake), roll = -k2 * lateralAccel (body roll in corners)
wheel spin: wheelAngle += v / wheelRadius * dt (visual)
```
Collision (voxels):
```
AABB vs getBlock (reuse the collides()-style grid test, car box ≈ 1.9×1.5×4.3):
on hit → stop velocity along the colliding axis (slide along walls), small restitution 0.1
```

### 3.2 Default tunables (VehicleDef — per style)

| Param | Sedan (mockup) | Meaning |
|---|---|---|
| mass | 1300 kg | weight: heavier → slower accel, more momentum |
| engineForce | 5200 N | a ≈ 4 m/s² (0–100 km/h ≈ 7 s, arcade) |
| brakeForce | 9000 N | ≈ -6.9 m/s² |
| handbrakeForce | 6800 N | stronger stop + slide (grip drops to 0.2) |
| topSpeed | 34 m/s (~122 km/h) | clamped |
| reverseMax | 6 m/s | |
| steerMax | 0.50 rad | front-wheel angle |
| wheelBase | 2.7 m | turn radius |
| grip | 2.2 /s | lateral traction |
| dragC | 0.012 | aero |
| rollingR | 0.02 | rolling resistance |
| wheelRadius | 0.35 m | wheel-spin visual |

---

## 4. Work units (each = one autonomous cycle)

### V0 — THE MOCKUP: procedural car + physics + drive (start here)
- `createMockupCar()` — smooth low-poly sedan from primitives (≤3k tris): rounded chassis
  (two stacked boxes + slanted windshield box), 4 cylinder wheels in **named groups**
  `wheel_FL/FR/RL/RR`, chrome bumpers, emissive headlight spheres, glass cabin.
- `vehiclePhysics.ts` (pure) + `vehicleEntity.ts` (mesh + physics + wheel spin/steer).
- `Game.tsx`: `s.vehicles` map + `s.activeVehicle`; E enters/exits (attaches player like the
  ridden-animal branch); while driving WASD = throttle/brake/steer, Space = handbrake.
- Spawn a car on the sim pad (SimDeck quick button) and drive it.
- **Acceptance:** enter → W reaches ≥10 m/s in ≤4 s → S stops ≤3 s → Space stops faster →
  A/D steers only while moving → wall collision stops the car (no clipping) → E exits.

### V1 — FBX import
- `fbxVehicle.ts`: load + normalize + wheel-node detection (+ manual override UI).
- Server: `data/vehicle-models/` storage + `GET/POST /api/vehicle-models`.
- SimDeck **Vehicles tab**: list styles, upload `.fbx`/`.glb`, preview bounds, spawn.
- **Acceptance:** upload a car FBX → auto-scaled to ~1×2×1 → wheels spin while driving →
  same driving acceptance as V0.

### V2 — Physics polish
- Slope gravity (climb slows, downhill free-rolls), handbrake slides (grip drop + drift),
  reverse gear + reversing steering, suspension roll/pitch visuals, per-style tunables
  (mass/power differ between sedan/pickup/van).
- Engine sound (procedural, pitch ∝ RPM) + headlight point lights.
- **Acceptance:** park on a hill → rolls down; handbrake on grass → slides; heavier van
  accelerates measurably slower at same power (sim:test asserts mass scaling).

### V3 — Persistence, multiple cars, UX
- `world_vehicles` table (`server/db.js`) + save/load vehicles per world (position, yaw,
  style id) — cars survive reload like chests.
- Multiple vehicles, enter the nearest one, exit door-side placement.
- Chase-camera option, mobile controls (virtual pedals), FPS-perf probe with 5 cars.

### V4 — Polish & content (after the mockup is accepted)
- Improved procedural models (`createSedanCar`, `createPickupCar`, `createMuscleCar`) as
  the "later improve the model" step — still swappable with any imported FBX.
- Breaklights on brake, tire particles on handbrake, horn.

---

## 5. Files to create

| File | Purpose |
|---|---|
| `src/game/vehicles/vehiclePhysics.ts` | pure physics (sim:test-able) |
| `src/game/vehicles/vehicleDefs.ts` | styles + tunables table |
| `src/game/vehicles/vehicleEntity.ts` | THREE entity: mesh + physics + wheels + lights |
| `src/game/vehicles/createMockupCar.ts` | V0 procedural mockup builder |
| `src/game/vehicles/fbxVehicle.ts` | FBX/GLTF load → normalize → wheel detect |
| `src/game/vehicles/vehicleAudio.ts` | procedural engine loop |
| `server/vehicle-models.js` + routes in `server/index.js` | upload/list/serve models + `world_vehicles` persistence |
| `src/components/sim/SimDeck.tsx` | Vehicles tab (list/upload/spawn/test-drive) |
| `src/game/state/gameState.ts`, `Game.tsx`, `renderLoop.ts` | state, input routing, per-frame update |
| `scripts/test-vehicle-drive.mjs` | headless CDP drive probe |
| `scripts/sim/tests.mts` | vehiclePhysics unit suite |

---

## 6. Testing & gates

- **Unit (sim:test, pure physics):** accel curve monotonic & reaches top speed; top-speed
  clamp; reverse clamp; braking distance finite & handbrake < brake distance; no steering
  at v=0; mass scaling (double mass → half accel at same force); collision stops forward
  velocity; slope adds/subtracts correct sign.
- **CDP probe:** spawn mockup → enter → throttle 2 s → assert position moved ≥10 blocks,
  heading changed with steer, wall-stop leaves v=0, exit restores controls.
- **Machine gates:** `npx tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`, `node scripts/test-worker-meshing.mjs`,
  `npm run ci:perf` (car adds ≤ ~10k tris; frameP95 within `docs/perf-limits.json`).
- **Docs:** update `docs/AI_ASSET_PLATFORM_PLAN.md` V-series status + KB entry
  (`kb/entities/vehicle.md`) when V2 lands.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| FBX quirks (cm scale, axis, external textures) | normalize by AABB; yaw-correct on import; embedded textures only, fallback materials |
| Perf (FBX too high-poly) | tri budget warn 20k / refuse 80k; procedural cars ≤3k; culling + shadow flag |
| Voxel collision vs fast car (tunneling) | substep physics (≤0.25 m per substep) or swept AABB per frame |
| Enter/exit in tight spaces | exit raycasts for a free door-side cell; falls back to nearest open cell |
| Input conflicts (E used for interact) | E near-vehicle = enter/exit only while `s.activeVehicle` set or vehicle targeted |
| Mobile | defer to V3 (virtual pedals), desktop first |

---

## 8. First milestone — V0 mockup (exact scope, starting now)

Deliver a **drivable procedural sedan**:
- `createMockupCar()` — ~2.5k tris, `wheel_*` named groups, metallic paint material,
  glass cabin, emissive headlights.
- `vehiclePhysics.ts` + `vehicleDefs.ts` with the §3.2 sedan tunables.
- `vehicleEntity.ts` update loop (physics + wheel spin/steer + roll/pitch).
- `Game.tsx` wiring: spawn via SimDeck quick action, E enter/exit, WASD drive, Space handbrake.
- 6 unit tests in `scripts/sim/tests.mts` + `scripts/test-vehicle-drive.mjs` probe.
- Gates green; mockup screenshots into `snapshots/`.
