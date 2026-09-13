# AI Asset Creation Platform — Semi-Automated Designer Studio + AI Heavy Lifting + Spawning Pipeline

> **Status: Phase 1, Phase 2 & Phase 2.5 Completed & Verified in Game Engine.**
> **v2 Contract Change (2026-08-30): PARAM-SPEC-FIRST + hard lint/retry gate.**
> The AI now emits compact `SemanticAssetSpec` objects (dimensions/stories/roof/palette),
> NOT raw voxel lists. Every spec is resolved deterministically (`specToBlueprint` →
> `houseGenerator` for structures, `generateSimpleObjectFromSpec` for objects/foliage)
> and passed through `lintBlueprint`; failures are repaired (clamped) and retried ≤2×
> with lint errors as feedback. Implemented in `catalog/ai/generateAssetsWithValidation.ts`,
> wired into the SimDeck Designer flow (`generateAssetsWithRetry` + per-asset lint badges)
> and the sideload dropzone, with the master AI prompt + `catalog/ai/GEMINI_GUIDELINES.md`
> updated to the param-spec contract.
>
> **Refined Workflow: Semi-Automated Human-in-the-Loop Asset Creation Pipeline.**
>
> Goal: A semi-automated asset pipeline where:
> 1. **Upload & Package Stage**: User uploads 1–3 reference photos in the UI, specifies a Scene/Theme name (e.g., `san-andreas`, `vice-city`, `medieval`), which creates `/docs/<theme-name>/`, saves the photos, and auto-generates the **Master AI Generation Prompt**.
> 2. **AI Heavy Lifting Stage**: The user feeds this prompt + photos to the AI coding agent / Gemini CLI. The AI analyzes the images (real-world photos or game renders), applies the **Universal Metric Scale ($1\text{ block} = 1.0\text{ meter}$)**, generates the individual 3D voxel blueprints (`bp_*.json`) + scene assembly JSON, and places them into `/catalog/blueprints/`.
> 3. **In-Simulator Spawning & Testing**: The simulation area (`/?sim=1`) automatically renders a dedicated category button (e.g. `🌴 San Andreas`), allowing instant 1-click spawning, inspecting, and editing of all individual 3D objects and the full scene assembly.
>
> Foundation we have built & verified:
> - `SimDeck` docked Designer Studio with 5 sub-tabs (`Photos`, `Report`, `Recipe`, `Scene`, `Transform`) + `🌴 San Andreas` spawnable category.
> - **Universal AI Prompt Exporter & 1-Click Clipboard Copy** (`POST /api/ai/package`, `GET /api/ai/packages`).
> - **Universal Metric Scale Standard ($1\text{m} = 1\text{ voxel}$)** with dimension lookup table for trucks, cars, houses, street objects, and props.
> - **Comprehensive Multi-Category Block Dictionary** (vehicles, rubber tires, metals, glass, concrete 16-colors, terracotta, slabs, stairs, lights).
> - Watertight procedural assembler (`catalog/ai/generators/houseGenerator.ts`) and `/api/ai/palette` catalog.
> - Directional block rotation table (`src/sim/blockRotation.ts`) and slope conformity foundation skirts (`src/sim/terrainConformity.ts`).
> - Blueprint Wand (`src/sim/blueprintScanner.ts` + `structurePlacer.ts`) with cyan 3D wireframe bounding box preview.
> - Fast image downscaling canvas compressor (`src/sim/imageCompressor.ts`).
> - **Litematica export (`src/sim/litematicExporter.ts`)**: any generated asset exports as a `.litematic` (v6 NBT, palette-packed BlockStates) for real Minecraft via the Litematica mod — the "no pre-probed blocks needed" route. Decision recorded in `catalog/ai/GEMINI_GUIDELINES.md` (procedural-first; Gemini's image-to-voxel "Route 2" rejected: needs GPU + unreliable color mapping).

---

## The Core Semi-Automated Pipeline

```
  1. [UPLOAD & PACKAGE] (Designer Studio UI)
     User drops 1-3 reference photos in SimDeck + enters Scene Slug ("san-andreas")
     ├── Saves photos to: /docs/<scene-slug>/photo_1.jpg, photo_2.jpg
     └── Auto-generates Master AI Prompt: /docs/<scene-slug>/AI_PROMPT.md (with 1-click clipboard copy)
             │
             ▼
  2. [AI HEAVY LIFTING (Gemini / Antigravity Agent)]
     User gives prompt & photo paths to AI
     ├── AI analyzes visual perspectives, massing, materials & real-world metric scale (1m = 1 block)
     ├── AI selects block IDs from multi-category dictionary (tires, metals, glass, concrete, stone, wood)
     ├── AI generates individual 3D blueprints (bp_*.json) in /catalog/blueprints/
     └── AI creates full scene layout (scene_*.json) & registers category
             │
             ▼
  3. [IN-SIMULATOR SPAWNING & MODULAR PLACEMENT] (Game Engine /?sim=1)
     User opens In-Game Simulator (/?sim=1)
     ├── Dedicated category button appears in Catalog (e.g. 🌴 San Andreas)
     ├── 1-Click Spawning of individual objects with Blueprint Wand preview
     └── 1-Click "Stamp Full Scene" generates entire neighborhood on terrain
```

---

## Captured Design Decisions (D1–D18)

**D18 · Universal Real-World Metric Scale Standard ($1\text{ Block} = 1.0\text{ Meter}$) & Multi-Category Catalog (New).**
- In Minecraft/Hollowpine, **$1\text{ block} = 1.0\text{ meter} \times 1.0\text{ meter} \times 1.0\text{ meter}$**.
- When feeding real-world non-Minecraft photos (e.g. a flatbed delivery truck, sports car, crane, fire hydrant, skyscraper, or suburban house), the prompt provides explicit target dimensions:
  - **Pickup Trucks / SUVs / Vans**: $3\text{m } W \times 2-3\text{m } H \times 5-6\text{m } L$ ($3 \times 2-3 \times 5-6$ blocks).
  - **Semi-Trucks / Freight / Buses**: $3-4\text{m } W \times 4\text{m } H \times 12-16\text{m } L$.
  - **Sedans / Lowriders / Cars**: $3\text{m } W \times 2\text{m } H \times 4-5\text{m } L$.
  - **1-Story Houses / Garages**: $8-12\text{m } W \times 4-5\text{m } H \times 8-12\text{m } D$.
  - **2-Story Houses / Mansions**: $10-16\text{m } W \times 8-10\text{m } H \times 10-16\text{m } D$.
  - **Utility Poles / Lamps**: $1\text{m } W \times 8-10\text{m } H$.
- The prompt includes a full multi-category block dictionary with exact IDs for rubber tires (`#186`/`#257`), metals/mechanics (`#414`/`#413`/`#151`/`#236`/`#410`), concrete in all 16 colors, glass/tinted glass (`#38`/`#377`), headlights/taillights (`#48`/`#47`/`#591`), slabs, and stairs.

**D17 · Semi-Automated "Package, Prompt & AI Heavy Lifting" Workflow.**
- Instead of requiring a real-time monolithic backend to do all asset assembly invisibly:
  1. **Upload & Package Tool**: When photos are uploaded, the system creates `/docs/<scene-name>/`, stores the compressed images, and outputs a formatted, copy-pasteable **AI Generation Prompt**.
  2. **AI Heavy Lifting**: The prompt instructs the AI (Gemini / Antigravity) with the exact palette block IDs, watertight rules, walkability clearances, and schema. The AI creates the `bp_<object>.json` files and scene assembly.
  3. **Auto-Category Ingestion**: The simulator dynamically displays the scene's objects under a dedicated category button for instant spawning, testing, and tweaking.

**D1 · Asset representation = Hybrid (parametric parts + optional voxel).**
- P1: the recipe editor edits *parts* and shows the *resolved voxels* live; a
  "bake to voxels" toggle produces a fast-to-spawn `blocks[]`.
- P2: Gemini may emit **either** a parts-recipe **or** a baked voxel list; the
  validator accepts both and can convert parts→voxels for validation.
- P3: city variation = per-plot overrides of parts (materials, size, roof) —
  one house asset, many looks.

**D2 · Spawnable assets = buildings + street objects + foliage.**
- P1: the registry tags every asset `kind: structure | object | foliage`.
- P3: the city planner puts structures on plots and scatters objects/foliage
  along roads and yards; all are spawnable via the same stamp.

**D3 · One unified output contract + the AI *fetches* the build catalog.**
- The **Asset Spec JSON is the single contract**; strict guidelines guarantee
  Gemini always emits a compatible file.
- **New hard requirement**: a machine-readable **build palette endpoint**
  (`/api/ai/palette`) that the AI fetches/reads to learn which materials exist
  and then *decides which to use* — the system must expose its own catalog to the
  AI, not hard-code it in the prompt.
- P1: the studio shows the schema + a live palette browser; specs are validated
  against the schema before Generate.
- P2: the guidelines = the schema + rules + a link to `/api/ai/palette`; any
  incompatible output is rejected with an error message and Gemini auto-retries.
- P3: variation picks only from the same served palette (consistency).

**D4 · Build palette = curated ~120 blocks + our customs.**
- A hand-picked `catalog/ai/build-palette.json` (~120 vanilla 1.5.3 blocks:
  woods, stone, planks, roofs, glass, doors, fences, stairs, lanterns…) **plus**
  our custom woods/leaves (maple, aspen, violet, palm, redwood, bamboo, cherry).
- P1: block picker = this palette. P2: `/api/ai/palette` serves it (compact, with
  id + name + shape). P3: the city's visual style is defined by it.

**D5 · Multi-image = different perspectives of ONE scene.**
- New recognition stage before generation: the AI must (1) link the N images
  (same scene), (2) list the objects it sees in them, (3) guess the asset(s) the
  user intends to create.
- P1: multi-image dropzone + a **Recognition Report** panel showing the linked
  perspectives, the detected object list, and the intended asset(s) before the
  spec editor opens.
- P2: the guidelines include the perspective-linking protocol; the mock returns
  a plausible recognition report + a Timber Cottage spec.
- P3: when the scene contains multiple objects, the report can seed a street
  layout (which object goes on which plot).

**D6 · Recognition of MANY objects → one ASSET per object + a SCENE assembly.**
- When the AI detects farmhouse + barn + spruce trees, it must **individually
  create each object** (one Asset Spec each) and **set up the scene** (a Scene
  spec that positions them together: front/side/back → center + beside + around).
- New `SceneSpec = { objects: AssetSpec[], layout: [{objectId, x, z, rot, y}], ... }`.
- P1: the recipe editor becomes **per-object tabs**, plus a **Scene tab** that
  places all objects and generates the whole scene as ONE undoable stamp.
- P2: Gemini outputs one spec per detected object + a scene layout.

**D7 · Materials usage breakdown per object.**
- Each object's part list must show **how many of each material/block were used**
  (computed from the resolved voxels, e.g. `Oak planks ×240, Dark oak ×180,
  Glass ×12, Stone ×40`).
- P1: a "Materials used" table per object (auto-counted from `blocks[]`), shown
  in the recipe editor and in the registry.
- P3: the city planner can reuse the same materials summary for style.

**D8 · Gap analysis — "what must be designed first".**
- If some detected objects cannot be found (no matching asset in the registry,
  not yet generated), the system **describes the objects that have to be designed
  first** to complete the scene: a **Needs list** with per-object status
  `ready | needs-design | needs-blocks`, and a "Design it now" action per gap.
- P1: the Recognition/Scene panel shows the Needs list; clicking "Design it now"
  opens an empty spec for that object.

**D9 · Inventory awareness.**
- The builder **understands current object/material availability**: it knows what
  is already in the **registry** (saved assets) and which **palette blocks** exist.
  Availability is surfaced per object (✅ in inventory / ⚠️ needs new blocks /
  ❌ not designed) and per material (have / need).
- P1: an "Inventory" panel = registry assets + palette; the studio refuses to mark
  a scene ready until all its objects are `ready`.
- P2: Gemini receives the current inventory so it reuses existing assets instead of
  re-creating them.

**D10 · Photoshop-style in-world selection & transform (move / rotate).**
- The Builder Studio already has a selection gizmo (U19, axis-translation at the
  selection's min corner). This is extended into a full **marquee tool**:
  - drag a selection box over any placed blocks (like a Photoshop marquee), then
  - **move** the selection to a different position (drag translate, snap to grid),
  - **rotate** the selection (90° voxel steps around its center; free rotation is
    not voxel-safe so it stays 90°-stepped),
  - the move is a **capture → clear → re-stamp** through `simStampRun`, so it is
    undoable and remeshes correctly.
- Works on scanned/created objects AND on arbitrary hand-built areas — same tool.

**D11 · ONE platform: Builder Studio + Designer are the same engine (no duplication).**
- The Designer is NOT a second builder: it is an extension of the Builder Studio.
  Every capability (stamp engine, selection/transform gizmo, blueprints/templates,
  brushes, block editor, registry) lives in ONE place and the Designer reuses it.
- Design assets are the same objects the Builder Studio already understands
  (`BlueprintDoc`-compatible), so a generated house is immediately selectable,
  movable, rotatable, and hand-editable with the existing tools.
- Exact page shape (single page with a designer dock vs. linked pages) is decided
  in Q&A — see "open decisions" below.

**D12 · Directional Block Rotation Table (Stair/Door/Log/Torch metadata rotation).**
- Rotating a blueprint $(x, z) \to (-z, x)$ rotates block coordinates, but block face orientations (e.g. stairs facing North/East/South/West, doors, logs) must rotate with them.
- A lookup table `rotateBlockId(id, steps)` rotates directional block variants so rotated roofs and stairs always face the correct slope.

**D13 · Slope Adaptation & Downward Foundation Skirt.**
- Placing blueprints on natural wilderness terrain with uneven elevations:
  - Downward Foundation Skirt: raycasts down from every $y=0$ perimeter column to true terrain surface, filling cobblestone/stone brick foundation pillars.
  - Interior Clearance Carving: automatically clears terrain blocks inside the room volume $[y_0+1 \dots y_{\text{roof}}]$ to Air (`#0`).

**D14 · Compound Multi-Block Assembler (Doors, Beds, Walkability).**
- Multi-block integrity rules in the assembler:
  - Doors are 2 vertical blocks (lower door `#105` + upper door `#106`/clearance).
  - Walkability guarantee: ensures at least 2 vertical blocks of air clearance above all interior floor tiles.

**D15 · Image Pre-Compressor (Sub-3-second Gemini Vision Turnaround).**
- Client/server auto-downscales uploaded reference photos to max $768\times 768\text{ px}$ (JPEG 85%, $<100\text{ KB}$).
- Speeds up Gemini vision processing from 30s to $<3$ seconds and eliminates CLI token/buffer timeouts.

**D16 · Plot Setbacks & Road Orientation Vectors.**
- City planner blueprints define `frontMargin` (distance to road curb) and default `facing` (`"S"`, `"N"`, `"E"`, `"W"`).
- Automatically rotates houses 180° when placed across opposite sides of a street and prevents porch overhang collisions into roads.

### Resolved decisions (Q&A 2026-08-30)
- **QD-1 Platform shape = Designer dock inside the Builder Studio.** The sim world
  stays the canvas; the Designer (image upload, recognition, per-object recipe
  editors, materials table, scene tab) is a **docked panel/mode inside the Builder
  Studio** — one page, zero duplication, all sharing `window.__sim` deck, stamp
  engine, gizmo, blueprints.
- **QD-2 Selection scope = marquee on ANY blocks.** Drag a Photoshop-style marquee
  over any placed blocks → move/rotate that exact area (hand-built or recognized).
- **QD-2b Rotation = 90° steps only** around the selection center (voxel-safe).
- **QD-3 Registry = extend the existing blueprints/templates system.** Blueprints
  gain `kind: structure|object|foliage`, `materialsUsed[]`, `availability`, and the
  designer's assets ARE blueprints. One list, one spawn flow, no second registry.
- **QD-4 Editing = voxel edits + parametric re-gen.** After Generate you can use the
  existing voxel tools (marquee/move/rotate/brush/block editor) AND edit the asset
  spec to "re-generate this object in place".
- **QD-5 Persistence = local sim DB + packs.** Assets/scenes persist in the sim DB
  (dev env), grouped by `packageName` for city packs; no cross-user sharing yet.

### Pipeline (revised for D5–D11)
```
 2-3 perspective images ─► [RECOGNITION] link perspectives → list ALL objects → guess intended scene
        │                                  (one object per image-derived asset)
        ▼
   /api/ai/palette + current Inventory (registry) ──► materials/blocks the AI may use
        │
        ▼
   Per-object Asset Specs + SceneSpec layout (D3 contract; kind=structure|object|foliage)
        │
        ▼
   GAP ANALYSIS: per object ready | needs-design | needs-blocks → "design these first" list
        │
        ▼
   Designer dock: recognition report → per-object editors (materials-used
        table) → Scene tab → live voxel preview → Generate via simStampRun → blueprints
        ▼
   Blueprint registry (inventory) ──► City planner (D2 layout, D1 variation, D4 style)
```

## Phase 0 — Asset vocabulary, generator library & guidelines (the "how to")
The intelligence of the platform lives here, so it comes first.

1. **Asset Spec schema** (`catalog/ai/asset-spec.json` + TS types): a `BlueprintDoc`
   PLUS a "recipe" section for parametric generation:
   ```json
   {
     "name": "Timber Cottage",
     "category": "house",
     "biomeAffinity": ["plains","forest"],
     "dimensions": {"width":7,"height":6,"depth":5},
     "style": "medieval",
     "materials": {"walls": 5, "roof": 58, "floor": 9, "door": 503, "window": 102},
     "parts": [
       {"kind":"box","x0":0,"y0":0,"z0":0,"x1":6,"y1":4,"z1":4,"blockId":5},
       {"kind":"roof","style":"gable","blockId":58,"overhang":1},
       {"kind":"door","at":"door","blockId":503},
       {"kind":"window","face":"front","count":2,"blockId":102}
     ],
     "blocks": [ ... ]   // optional: fully-resolved voxel list (fastest to spawn)
   }
   ```
   Two generation modes: **parametric** (parts → resolved by a script) or **voxel**
   (pre-baked `blocks[]` — what Gemini can emit directly for pixel-faithful assets).

2. **Generator script library** (`catalog/ai/generators/`): small pure functions
   `spec → BlueprintDoc` for each part kind (`box`, `roof:gable|flat|pyramid`,
   `door`, `window`, `porch`, `chimney`, `pillar`, `stairs`). These ARE the "scripts
   on how to do it" — reusable, testable in the sim, shared by AI and hand use.

3. **Guidelines / system prompt** (`catalog/ai/GEMINI_GUIDELINES.md`): the exact
   prompt sent with the images. It teaches Gemini:
   - the build vocabulary (D4 curated `build-palette.json` ≈120 blocks + our customs,
     name → id — **inlined in the prompt** since the CLI has no tool-calling),
   - the Asset Spec JSON schema (must return it — the frozen D3 contract),
   - rules: parts-mode is the default (box/roof/door/window/stairs); 1-voxel units;
     block ids only from the palette; anchor at ground center; roof overhangs; and
   - the D5/D6 protocol: link N perspective images → list ALL objects → one Asset
     Spec per object + a SceneSpec layout.

## Phase 1 — The Designing Environment (Designer Dock inside SimDeck) [COMPLETED]

The Designer is a docked panel/mode inside the Builder Studio (`SimDeck`):
- **1. Photos panel**: Drag-and-drop 1–3 reference photos with instant client-side canvas compression to 768px JPEG (<100KB), intent prompt input.
- **2. Report panel**: Perspective linking status, detected scene objects list with readiness tags (`✅ ready / ❌ needs-design`).
- **3. Recipe editor**: Parametric sliders (width, depth, stories), live **Materials Used Breakdown** table with exact block counts, **[🧱 Stamp on Pad]**, and **[💾 Save Blueprint]**.
- **4. Scene tab**: Multi-asset positioning table with $(X, Z)$ and rotation offsets, **[🧱 Generate Full Scene Stamp]** with slope conformity.
- **5. Transform tool (D10/D12)**: Area box marquee + 90° clockwise rotation with directional block state lookup table (`rotateBlockId`).

## Phase 2 — Catalog Integration & San Andreas Blueprints [COMPLETED]
- **Build Palette Bridge**: Curated 120-block catalog served via `/api/ai/palette` and AI vision endpoint `/api/ai/asset`.
- **San Andreas Spawnable Category**: Dedicated `🌴 San Andreas` button in SimDeck Catalog tab, with 6 spawnable entries (CJ's House, Garage, Sweet's House, Fan Palm, Utility Pole, Grove Street Cul-de-Sac).
- **In-Engine Testing & Screenshots**: 76 pure logic and unit tests passing in `scripts/sim/tests.mts`, in-engine browser verification via CDP snapshots.

### Phase 2.5 — Semi-Automated Package & Master Prompt Exporter [COMPLETED & VERIFIED]

To streamline the human-in-the-loop workflow:
1. **Scene Package Staging & Prompt Generator**:
   - `Photos` tab in `SimDeck` includes **Package Slug** (e.g. `san-andreas`, `vice-city`) and **Display Title**.
   - Clicking **`[📁 Save to /docs & Generate Master AI Prompt]`**:
     - Calls backend `POST /api/ai/package`.
     - Creates `/docs/<theme-slug>/` directory.
     - Saves uploaded reference images (`photo_1.jpg`, `photo_2.jpg`, ...).
     - Auto-generates `/docs/<theme-slug>/AI_PROMPT.md` with the **Universal Metric Scale Standard ($1\text{m} = 1\text{ block}$)**, multi-category block dictionaries (vehicles, metals, concrete, glass, stones, woods), JSON schemas, and watertight rules.
   - UI renders staging badge, a 1-click **`[📋 Copy Master AI Prompt]`** button, and collapsible prompt viewer.
2. **Defensive Pipeline Hardening**:
   - Added null/undefined defensive guards to `houseGenerator.ts`, `blockRotation.ts`, and `terrainConformity.ts` to guarantee 0 unhandled TypeErrors.
   - Automated in-browser CDP test (`scripts/test-package-export.mjs`) verifying UI and prompt generation.

---

## AI Agent Reference Manual & Implemented Subsystems Guide

> **For any AI Assistant reading this codebase:**
> Below is the complete reference of endpoints, files, schemas, and coordinate standards used across the Hollowpine 3D asset generation engine.

### 1. Key Endpoints & Server Handlers
- **`POST /api/ai/package`** ([`server/ai-bridge.js`](https://github.com/martintimmer/hollow-web-mc/blob/main/server/ai-bridge.js)):
  - Input: `{ slug: string, title?: string, images?: string[], notes?: string }`
  - Output: `{ success: true, slug, title, folder: "docs/<slug>", promptPath: "docs/<slug>/AI_PROMPT.md", promptContent, imageCount }`
  - Action: Creates package folder on disk, saves images, generates comprehensive `AI_PROMPT.md`.
- **`GET /api/ai/packages`** ([`server/ai-bridge.js`](https://github.com/martintimmer/hollow-web-mc/blob/main/server/ai-bridge.js)):
  - Output: `{ packages: Array<{ slug, title, hasPrompt, photoCount, folder }> }`
- **`GET /api/ai/palette`** ([`server/ai-bridge.js`](https://github.com/martintimmer/hollow-web-mc/blob/main/server/ai-bridge.js)):
  - Output: Material roles and block category lookups.
- **`POST /api/ai/asset`** ([`server/ai-bridge.js`](https://github.com/martintimmer/hollow-web-mc/blob/main/server/ai-bridge.js)):
  - Input: `{ images, intent }` $\to$ Returns recognition report, asset specs, and scene assembly layout.

### 2. Client Engine & Simulation Modules
- **`SimDeck.tsx`** ([`src/components/sim/SimDeck.tsx`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/components/sim/SimDeck.tsx)):
  - Main simulation dock with `Catalog`, `Params`, `Placed`, `Tests`, `Inspect`, `Scenes`, `Sideload`, and `Designer` tabs.
  - `Designer` dock has 5 subtabs: `📷 Photos`, `📋 Report`, `✏️ Recipe`, `🏙️ Scene`, and `🎯 Transform`.
- **`catalog.ts`** ([`src/sim/catalog.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/sim/catalog.ts)):
  - Master catalog registry mapping category groups (`trees`, `blocks`, `houses`, `san_andreas`, `features`, `mobs`, `villagers`, `entities`) to spawnable items.
- **`terrainConformity.ts`** ([`src/sim/terrainConformity.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/sim/terrainConformity.ts)):
  - `stampBlocksWithConformity(blocks, anchorX, baseY, anchorZ, w, heightLookup, options)`
  - Raycasts downward from $y=0$ perimeter voxels on slopes to construct continuous stone brick foundation skirts and carves interior natural terrain to Air (`#0`).
- **`blockRotation.ts`** ([`src/sim/blockRotation.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/sim/blockRotation.ts)):
  - `rotateBlueprintDoc(doc, steps)` & `rotateBlockId(id, steps)`
  - Rotates voxel coordinates and directional metadata (stairs `#70-#79`, doors `#105-#106`, logs `#16-#29`).
- **`blueprintScanner.ts`** ([`src/sim/blueprintScanner.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/sim/blueprintScanner.ts)):
  - `lintBlueprint(doc)`: Validates bounding box dimensions, counts materials, checks structural integrity, foundation contact, and interior walkability clearance.

### 3. Authoritative File Schemas

#### A. Individual Blueprint: `catalog/blueprints/bp_<object_slug>.json`
```json
{
  "version": 1,
  "id": "bp_cj_house_grove_st",
  "name": "CJ's House (The Johnson House)",
  "category": "house",
  "packageName": "San Andreas Grove Street",
  "biomeAffinity": ["plains", "forest"],
  "dimensions": { "width": 12, "height": 9, "depth": 10 },
  "anchor": { "ax": 0, "ay": 0, "az": 0 },
  "blocks": [
    { "dx": 0, "dy": 0, "dz": 0, "id": 8 },
    { "dx": 1, "dy": 0, "dz": 0, "id": 8 }
  ]
}
```

#### B. Scene Assembly: `catalog/blueprints/scene_<scene_slug>.json`
```json
{
  "version": 1,
  "id": "scene_san-andreas",
  "name": "San Andreas Grove Street Full Scene",
  "packageName": "San Andreas Grove Street",
  "layout": [
    { "objectId": "bp_cj_house_grove_st", "x": 6, "y": 65, "z": 10, "rot": 0 },
    { "objectId": "bp_cj_garage_grove_st", "x": -4, "y": 65, "z": 11, "rot": 0 },
    { "objectId": "bp_sweets_house_grove_st", "x": -15, "y": 65, "z": 12, "rot": 0 },
    { "objectId": "bp_fan_palm_grove_st", "x": 16, "y": 65, "z": 6, "rot": 0 },
    { "objectId": "bp_utility_pole_grove_st", "x": 16, "y": 65, "z": 16, "rot": 0 }
  ]
}
```

---

## Phase 3 — Modular City Planner

- **City Planner Tab** in SimDeck:
  - Choose assets from registry and scene packages.
  - Plot grid generator with road networks (`roadStrip`), streetlights (`lampPost`), building setbacks (`frontMargin`), and road-facing rotation.
  - 1-click "Stamp Full City / Cul-de-Sac" generator.

## Phase 4 — Verification & Hardening

- Pure logic regression tests in `scripts/sim/tests.mts` for every blueprint package.
- Headless in-browser CDP visual snapshot tests for UI and in-world stamped scenes.
- Zero TypeScript compile errors (`tsc -b`), clean production builds (`npm run build`).
- Headless probes: generate a house → assert blueprint is well-formed (all block ids
  valid, within bounds, contiguous) **and structurally sound** (no floating blocks,
  door on ground floor, roof covers, interior reachable); rotation → rotated-voxel-set
  equality; spawn → voxel count + remesh; undo → full restore; city → roads connect
  plots; scene-status unit cases; materials-count unit cases.
- Gates: `tsc -b`, `npm run build`, `sim:test`, `ci-perf --gate`, textureCheck.

---

## Risk assessment & de-risking (2026-08-30)

Honest weak points, ranked by likelihood of breaking, and how the plan neutralizes each:

1. **Image → voxel quality (biggest risk).** The CLI can return *format-valid but
   structurally broken* output (unconnected rooms, floating roofs, wrong-face doors).
   Schema validation catches bad JSON, not bad architecture.
   → **Mitigation:** **parts-mode is the DEFAULT** generation path (a `box + gable-roof +
   door + window` recipe always resolves to a valid house); baked-voxel mode is opt-in.
   Add a **structural-quality check** to the harness (not just schema validation).
2. **CLI parsing (brittle shell).** `gemini` output often wraps JSON in prose/markdown,
   logs to stderr, may not honor `--output-format json` cleanly; temp files + timeouts;
   binary lives on the user's machine.
   → **Mitigation:** robust JSON extractor (strip fences, first balanced-brace scan),
   auto-retry ≤2× with the validation error fed back, `AI_MOCK_ONLY=1` fallback, Tune tab.
3. **Rotation / move geometry.** Rotating an arbitrary marquee selection 90° around its
   center then capture→clear→re-stamp is real voxel math (clipped corners, gaps,
   collisions with existing blocks).
   → **Mitigation:** build + unit-test the rotation transform FIRST as a pure module
   (rotated-voxel-set equality), before any UI.
4. **Scene-status / gap logic (D8/D9).** The `ready | needs-design | needs-blocks`
   state machine across objects + inventory lookup is easy to get subtly wrong.
   → **Mitigation:** pure function `sceneStatus(scene, registry)` with unit cases.
5. **Regressing the working sim.** Extending blueprints + embedding a dock touches code
   that works (wand, deck, blueprintScanner).
   → **Mitigation:** additive-only blueprint changes, dock talks ONLY to the
   `window.__sim` bridge, full gates on every change.

**How we make it realistic:** test the pure logic first (generator lib invariants,
rotation equality, scene status, materials counts) in `sim:test`; a **structural
quality harness** probe; a **realistic-but-flawed mock** that exercises the repair
paths before the CLI is wired; a **real-photo smoke test**
whose failure modes get folded back into `GEMINI_GUIDELINES.md`.

---

## Investigation: FBX import — would it resolve the "coarse/blocky asset" issue? (2026-08-30)

**Design question:** instead of voxel blueprints, import FBX 3D assets (as the earlier
Gemini recommendation implies) so the cars look detailed rather than blocky.

### What FBX would actually do

| Aspect | Verdict | Evidence |
|---|---|---|
| Parser availability | ✅ Available in-repo | `three/examples/jsm/loaders/FBXLoader.js` exists in `node_modules` (bundles its own `fflate` — **no new npm dep**); `GLTFLoader`/`OBJLoader` also present. |
| Non-voxel entity precedent | ✅ Feasible | The engine already renders chests as articulated 3D `THREE` entity meshes (`src/game/chest.ts` `ChestEntity`, updated in `renderLoop.ts:387`), separate from the chunk mesh. A "static mesh prop entity" is the same pattern. |
| Real 3D geometry | ✅ Yes | Smooth/curved vehicle bodies, real proportions — genuinely more "detailed" than any voxel build at 1-block resolution. |
| **Minecraft integration** | ❌ No | Minecraft (Java) cannot render FBX at all — it's voxels + blockstate models. An FBX car could only live in **our engine** as decoration. It can never be a placeable/breakable/recolorable block, never survive the world save, never export to real MC (only `.litematic` can). |
| **AI can produce it** | ❌ No | Gemini (the current pipeline's "AI heavy lifting") cannot author an FBX. You'd need a mesh source: hand-model in Blender, or the image-to-3D route (TripoSR/Stable Fast 3D) — already rejected (needs GPU + unreliable color mapping). So FBX **does not fix** the AI output quality problem. |
| Voxel-contract breakage | ❌ Big | No per-block edits/brushes/atlas-recolor, no blueprint/`.litematic` export, no sim stamp/undo machinery, no "authentic Minecraft" aesthetic. |
| Effort | Medium–high | New prop-entity system: FBX/GLTF parse + cache, scene attach + frustum culling + `castShadow`, snapshot/minimap/undo handling, validation (FBX is Autodesk-proprietary binary; best-effort schema), perf against the `docs/perf-limits.json` tri gate (258k tris) — a single 5–20k-tri car is fine, but meshes don't integrate with the block editor/catalog. |

### Conclusion (revised 2026-08-30 — goal confirmed)

- **FBX/mesh importing does NOT fix the "AI voxel output is too coarse" problem** — that
  is a voxel-craftsmanship issue (sub-block detail: slabs/trim/glass, already shipped).
- **BUT the underlying goal is valid and separate**: *detailed 3D cars that you can
  actually USE — the mod-car route* (MrCrayfish's-style Vehicle Mod). Those are exactly
  non-voxel 3D model entities: rendered in-world, drivable, ~1×2×1 footprint. Our engine
  already has the two precedents needed:
  - **non-voxel entities**: `chest.ts` renders articulated 3D `THREE.ChestEntity` meshes
    (per-chunk lifecycle, `chunkMesher.ts spawnChunkChestEntities`, per-frame update in
    `renderLoop.ts:387`);
  - **mountable/ridden**: `spawner.ts:496-520` ridden-animal steering (camera-steer,
    hop with Space) — a car reuses the "player mounts an entity and it moves" pattern.
- **Consequence:** add a **separate engine feature — 3D Vehicle/Prop Entity System
  (V-series)** below. The AI asset platform (voxel blueprints → sim + `.litematic`) stays
  as-is; mesh vehicles are built by the engine (primitives — zero external assets, per repo
  rule) with **optional GLTF/FBX importing** for user-supplied models (the mod-authentic
  path: mods ship their own model files; the user supplies a car model, the engine loads it).

**Decision:** ✅ ADD the V-series vehicle entity system (this is the goal). Keep voxel
blueprints for MC-authentic AI assets; FBX/GLTF importing applies only as an *optional mesh
source* for vehicle models, loaded by the engine (never by the AI pipeline).

---

## V-series — 3D Vehicle/Prop Entity System ("mod cars") — THE GOAL

> **Full implementation plan: [`docs/VEHICLE_SYSTEM_PLAN.md`](VEHICLE_SYSTEM_PLAN.md)**
> (FBX create/import pipeline, vehicle entity, physics — accel/brake/handbrake/mass/top
> speed/traction/collision, V0 mockup → V4 polish, tests & gates). Summary below.

> **Goal:** detailed, drivable 3D cars in the game (like Minecraft vehicle mods) — rendered
> as non-voxel entity meshes (≈1×2 blocks footprint), placeable in the world, enterable and
> drivable by the player. Vehicles are optional *mesh assets*: the engine builds the shipped
> cars procedurally from primitives (zero external assets), and the user can sideload custom
> models (GLTF preferred, FBX supported via `three/FBXLoader`).

### V1 — Vehicle entity core (like ChestEntity but a car)
- New `src/game/vehicles/vehicleEntity.ts`: `VehicleEntity { id, root: THREE.Group, x,y,z, yaw, speed, drive(steer, throttle), update(dt) }`.
- **Primitive-built car meshes** (`createCarMesh(style)`) from three primitives — smooth
  body (rounded box / extrusion), cylinder wheels, transparent windshield, chrome bumpers —
  reusing the repo's zero-asset mesh approach (`createArticulatedChest`, `createHeldBowMesh`).
- Registry `vehicleStyles: { sedan, pickup, muscle, van }` → `createCarMesh`.
- Spawn/de-spawn: `s.vehicles: Map<string, VehicleEntity>`; placed like chest entities
  (per-chunk reconcile) so they render with the world, culled with `frustumCulled`,
  `castShadow` on.

### V2 — Place & enter ("use" the car)
- Place: player holds a "vehicle key" item (slot) → right-click places the vehicle entity
  at the aimed block (non-voxel entity, so it sits ON blocks, not in them).
- Enter: right-click/«E» on the vehicle → player mounts it (reuse ridden-animal mounting
  UX: attach player to `vehicle.root`, hide player mesh, camera stays first-person).
- Exit: «E»/«Shift» → unmount at the door-side block (voxel-collision-checked).

### V3 — Driving
- WASD = accelerate/steer/brake; vehicle moves along its yaw (max ~8 m/s, lerp accel),
  player steers like the ridden-animal branch (`spawner.ts:496-520` pattern).
- VRoll on hills, simple 1-block step-up on flat ground, block-collision stop (reuse
  `collides()`-style AABB against `getBlock`).
- Engine sound (procedural), speed-based pitch; headlights (`s.heldTorchLight`-style
  point light) toggle.

### V4 — Persistence & sim integration
- Persist vehicles per world: new `world_vehicles` table (id, x,y,z, yaw, style) with
  `/api/vehicles` GET/POST — or (lighter) persist via an entity JSON like `player_state`.
- SimDeck: "Vehicles" catalog tab → spawn/despawn/test-drive; vehicles render on the pad.
- Undo/interaction: vehicle placement enters `simStamps`-style undo when in sim mode.

### V5 — Sideload custom models (GLTF/FBX)
- Drop a `.glb`/`.gltf` (or `.fbx`) on the SimDeck vehicle tab → parsed with
  `GLTFLoader`/`FBXLoader` (both bundled with three — no new deps), auto-scaled/normalized
  to a ~1×2×1 box, ambient-lit via existing materials, registered as a vehicle style.
- Validation: parse success + bounds sane + triangle budget (>1k tris → warn; >50k → cap)?

### Acceptance (V3 milestone = "cars working in-game")
- Place car → enter («E») → drive with WASD (speed ≥4 m/s, smooth accel, steering works,
  stops at walls) → exit («E») → re-enter works.
- Car renders as a smooth detailed mesh (not voxel cubes), casts shadows, is culled;
  procedural sedan + pickup styles ship in repo.
- Cars survive reload (persist), appear on the sim pad, and a custom GLTF sideload works.
- Gates: `tsc -b`, `npm run build`, `sim:test`, `textureCheck`, `ci:perf` (vehicle prop
  perf: ≤ ~20k tris added, frameP95 stays in limit).

### Feasibility anchors (already in engine)
- Non-voxel entity precedent: `chest.ts` `ChestEntity` + `chunkMesher.ts spawnChunkChestEntities`.
- Mounted steering precedent: `spawner.ts:496-520` ridden branch (camera-steer + Space hop).
- Mesh-from-primitives precedent: `createArticulatedChest`, `createHeldBowMesh`, mob/animal builders.
- Loaders available: `three/examples/jsm/loaders/{GLTFLoader,FBXLoader}.js` in-repo.
- Perf gate: `docs/perf-limits.json` (258k tris) — keep vehicle meshes low-poly.

### Links to AI pipeline (clarity)
- The AI asset platform generates **voxel blueprints** (sim placement, `.litematic` export).
- Vehicle models are **engine-authored or user-sideloaded meshes** — the AI pipeline does
  NOT generate them (no FBX from LLMs). If desired later: AI picks *vehicle parameters*
  (style/color/wheel type) → drives a `createCarMesh(style, color)` variant — same
  param-spec-first philosophy, applied to primitive mesh assembly.

---

## How to start (recommended execution order — de-risked)
1. **Phase 0 (pure logic first)**: `catalog/ai/build-palette.json` (~120 vanilla +
   customs) → `catalog/ai/asset-spec.ts` types + `assetSpecToBlueprint()` converter →
   generator lib (`box / roof:gable|flat|pyramid / door / window / stairs / porch /
   chimney`) → `buildPrompt()` template with the **mock contract** → a resolved
   **Timber Cottage** example. All unit-tested in `sim:test` (voxel invariants).
2. **Rotation + move** as a pure testable module (rotated-voxel-set equality) — the
   riskiest geometry, proven before UI.
3. **Designer dock (P1)**: input → recognition report (mock) → gap list → per-object
   editors with materials-used table → live voxel preview → Generate via `simStampRun`
   → Save to blueprints (extended).
4. **Phase 2**: wire the real `gemini` CLI behind `AI_GEMINI_BIN` (mock fallback stays);
   validate the frozen contract against the user's smoke-test results.
5. **Phase 3**: city planner + road layout + packs.
6. **Phase 4**: probes + gates.

Each phase is independently shippable and machine-verifiable. The first milestone is:
**generate Timber Cottage (mock) → spawn → undo** — the loop you described, end-to-end.

**Key files to create**: `catalog/ai/build-palette.json`, `catalog/ai/asset-spec.ts`
(+ `.json`), `catalog/ai/generators/*.ts`, `catalog/ai/buildPrompt.ts` (+ mock),
`catalog/ai/GEMINI_GUIDELINES.md`, Designer dock files (in the sim UI layer),
`server/ai-bridge.mjs`, `server/worldgen-db.js` (blueprint extension: `kind`,
`materialsUsed`, `availability`), `docs/AI_ASSET_PLATFORM_PROGRESS.md`.