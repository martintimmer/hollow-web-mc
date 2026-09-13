# AI Asset Platform: Sideloader & Tooling Groundwork Plan

> **Objective:** Establish the foundational tooling, schema bridges, CLI scripts, reference photo harnesses, and runtime sideloaders required to test, import, inspect, and benchmark assets before activating the AI generator pipeline.

---

## 1. Executive Summary & Why Sideloader Groundwork Comes First

Before connecting Gemini VLM image recognition and automated modular city building, we need an airtight foundation to:
1. **Load, test, and hot-reload assets** (Blueprints, Semantic Specs, City Packs) without manual DB manipulation.
2. **Benchmark reference photos** headlessly against vision prompts, mock models, and validation schemas.
3. **Verify procedural building generators** in headless test harnesses with strict architectural linting (watertight walls, valid block IDs, proper stair/slab orientations).
4. **Provide instant drag-and-drop UI loading** in the in-game `SimDeck` for real-time stamping.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     DEVELOPER & AI WORKFLOW                            │
├────────────────────────┬───────────────────────────────────────────────┤
│ Reference Photos       │ fixtures/ai-reference-photos/*.jpg            │
│ Semantic Recipes       │ catalog/ai/specs/*.json                       │
│ Pre-baked Blueprints   │ public/catalog/blueprints/*.json              │
└───────────┬────────────┴───────────────────────┬───────────────────────┘
            │                                     │
            ▼                                     ▼
┌────────────────────────┐             ┌─────────────────────────────────┐
│ CLI Sideloader & Linter│             │ In-Browser Sideload Dropzone    │
│ (sideload-asset.mjs)   │             │ (SimDeck Drag-and-Drop)         │
│ - lint & validate      │             │ - instant stamp on pad          │
│ - photo vision test    │             │ - live 3D preview & edit        │
│ - generator benchmark  │             │ - save to worldgen DB           │
└───────────┬────────────┘             └────────────────┬────────────────┘
            │                                           │
            └───────────────────┬───────────────────────┘
                                ▼
               ┌─────────────────────────────────┐
               │ Unified Asset Runtime           │
               │ (src/sim/assetSideloader.ts)    │
               │ - BlueprintDoc                  │
               │ - SemanticSpec → Generator      │
               │ - Materials summary & 3D icons  │
               └─────────────────────────────────┘
```

---

## 2. Core Modules to Build

### Module A: Unified Asset Sideloader Engine (`src/sim/assetSideloader.ts`)
A clean TypeScript bridge that parses, validates, and registers incoming assets at runtime.

- **Supported Asset Types:**
  1. `BlueprintDoc` (Pre-baked voxel arrays, 100% compatible with existing `blueprintScanner.ts`).
  2. `SemanticAssetSpec` (High-level architectural parameters: style, footprint, floor heights, roof shape, material roles).
  3. `SceneSpec` / `CityPack` (Collections of structures, street furniture, and road vectors).
- **Auto-Enrichment Functions:**
  - `computeBoundingBox(blocks)`: Derives exact width, height, and depth.
  - `computeMaterialsBreakdown(blocks)`: Aggregates total block counts and human-readable names.
  - `normalizeGroundAnchor(blocks)`: Calculates bottom-center alignment for clean terrain stamping.
  - `generateSlabAndStairOrientations(blocks)`: Ensures directional blocks have valid `blockDirs` metadata.

---

### Module B: CLI Sideloader & Validation Suite (`scripts/sideload-asset.mjs`)
A Node.js CLI tool for developers and CI automation.

```bash
# 1. Import and validate an external blueprint JSON or folder
node scripts/sideload-asset.mjs import ./my-cottage.json --category house --package "Nordic Village"

# 2. Export an asset from the database to a clean standalone JSON
node scripts/sideload-asset.mjs export bp_cottage_01 -o ./exports/

# 3. Test a reference photo against the vision prompt & generator
node scripts/sideload-asset.mjs test-photo ./fixtures/ai-reference-photos/timber_cottage.jpg --mode mock

# 4. Lint an asset for structural and Minecraft physical validity
node scripts/sideload-asset.mjs lint ./my-cottage.json

# 5. Run headless generator benchmarks
node scripts/sideload-asset.mjs benchmark-generators
```

#### Structural Linter Checks (`lintAsset`):
- **Voxel Bounds:** All voxels fit within declared dimensions.
- **Valid Catalog IDs:** Every block ID exists in `BLOCK_MAP` (1..1198) and is not `0` (air).
- **Watertight Enclosure:** Exterior walls form a closed perimeter; no single-block holes unless glazed.
- **Roof Overhang Integrity:** Eaves and gables extend 1 block past exterior walls.
- **Door Clearance:** 2-block vertical clearance above floor level at door locations.
- **Lighting Guarantee:** At least 1 light emitter (`glow: 1` e.g., lantern, torch) per enclosed structure.

---

### Module C: Reference Photo Test Harness (`fixtures/ai-reference-photos/`)
A dedicated directory for photo samples paired with a ground-truth testing manifest.

- **Directory Structure:**
  ```
  fixtures/ai-reference-photos/
  ├── manifest.json
  ├── 01_timber_cottage_front.jpg
  ├── 01_timber_cottage_side.jpg
  ├── 02_stone_watchtower.jpg
  ├── 03_desert_sandstone_house.jpg
  ├── 04_blacksmith_forge.jpg
  └── 05_nordic_longhouse.jpg
  ```
- **Manifest Format (`manifest.json`):**
  ```json
  [
    {
      "id": "timber_cottage",
      "files": ["01_timber_cottage_front.jpg", "01_timber_cottage_side.jpg"],
      "expectedStyle": "medieval_timber",
      "expectedFootprint": "rectangle",
      "expectedDimensions": { "minWidth": 6, "maxWidth": 10, "minHeight": 6, "maxHeight": 9 },
      "requiredPaletteRoles": {
        "foundation": ["cobblestone", "stone_bricks"],
        "frame": ["oak_log", "dark_oak_log"],
        "walls": ["oak_planks", "white_terracotta"],
        "roof": ["dark_oak_stairs", "spruce_stairs"]
      }
    }
  ]
  ```

---

### Module D: Procedural Generator Hot-Reload Test Suite (`scripts/test-generators.mjs`)
A headless test runner for procedural generators in `catalog/ai/generators/`.

- **Generator Modules to Verify:**
  1. `generateFoundation(footprint, depth, material)`: Generates solid perimeter + fill with slope adaptation.
  2. `generateTimberFrame(dimensions, logMaterial, floorHeight)`: Generates structural corner posts and floor rings.
  3. `generateWalls(footprint, wallMaterial, windowSlots, doorSlot)`: Insets wall panels with glass panes and doors.
  4. `generateGableRoof(dimensions, stairMaterial, slabMaterial, overhang)`: Generates authentic stepped stair roof.
  5. `generateHippedRoof(dimensions, stairMaterial, slabMaterial)`: Generates 4-way slope pyramid/hipped roof.
  6. `generateInterior(dimensions, floorMaterial, lightMaterial)`: Adds flooring, partition walls, and lanterns.
- **Assertions:**
  - Execution speed < 50ms for any building up to 20x20x20.
  - Generates zero detached floating blocks.
  - Generates valid `BlueprintDoc` objects passing all linter rules.

---

### Module E: In-Browser Drag-and-Drop Sideloader in `SimDeck` (`src/components/sim/SimDeck.tsx`)
A seamless in-game interface for designers and testers.

1. **Dropzone Tab in SimDeck ("Import / Sideload"):**
   - Drag any `.json` or image file directly into the Sim Deck.
   - For `.json` (Blueprint / Semantic Spec): Instantly parses, displays 3D bounding box preview, and offers **[🧱 Stamp on Pad]** and **[💾 Save to Registry]**.
   - For images: Loads into the AI photo analyzer queue.
2. **Instant Hot-Reload Listener:**
   - Listens to `window.addEventListener("sideload-asset", ...)` for automated test scripts and browser devtools injection.

---

## 3. Implementation Phasing & Milestones

| Phase | Deliverables | Verification Criteria |
|---|---|---|
| **Phase S1** | `src/sim/assetSideloader.ts` + `catalog/ai/asset-spec.ts` | Unit tests: Schema parsing, dimension computation, materials breakdown. |
| **Phase S2** | `scripts/sideload-asset.mjs` CLI tool + Linter | CLI imports test JSON, lints structure, exports clean blueprint. |
| **Phase S3** | `catalog/ai/generators/*.ts` + `scripts/test-generators.mjs` | Headless suite builds 5 building styles in < 50ms each. |
| **Phase S4** | `fixtures/ai-reference-photos/` + Vision Prompt Harness | Test suite runs manifest photos through mock/CLI and asserts semantic schema. |
| **Phase S5** | `SimDeck.tsx` UI Drag-and-Drop Sideloader | Browser E2E: Drag file -> instant 3D stamp on local flat-pad with undo. |

---

## 4. Key Files to Create

1. `src/sim/assetSideloader.ts`: Runtime loader & schema normalizer.
2. `catalog/ai/asset-spec.ts`: TypeScript interface for Semantic Specs.
3. `scripts/sideload-asset.mjs`: CLI import/export/lint/photo-test utility.
4. `scripts/test-generators.mjs`: Automated headless generator test suite.
5. `catalog/ai/generators/`: Pure procedural generator modules.
6. `fixtures/ai-reference-photos/manifest.json`: Photo test fixtures and expected architectural mappings.
7. `src/components/sim/SimDeck.tsx`: Drag-and-drop UI sideloader.
