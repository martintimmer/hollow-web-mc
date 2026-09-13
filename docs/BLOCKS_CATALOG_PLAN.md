# Blocks & Entities Catalog Page — `/blocks.html` Specification & Audit

> **Status:** Implemented & Verified  
> **Last Audit:** 2026-09-01  
> **Companion Automation Plan:** [`docs/BLOCKS_CATALOG_AUTOMATION_PLAN.md`](./BLOCKS_CATALOG_AUTOMATION_PLAN.md)  
> **Live Surface:** `http://127.0.0.1:DEV/blocks.html` (Dev) / `http://127.0.0.1:PROD/blocks.html` (Prod)

Companion to `/seed.html` and `/kb.html`. A unified diagnostic, cataloging, and inspection surface that catalogs every block, item, and published custom entity in the game. It renders each entry's **three real looks** (inventory icon, held item, and placed voxel), links directly to the **Minecraft Wiki** and the repository's **Knowledge Base**, indicates implementation and shape status, and displays **live per-world placement statistics** directly from the database.

---

## 1. Data Sources & Census

| Source | File / Endpoint | Purpose & Output |
|---|---|---|
| Master catalog | `catalog/completeRegistry.json` | 1,173 base vanilla entries (id, name, category, face tiles, solid/transparent flags). |
| Runtime registry | `src/game/blocks.ts` (`BLOCK_MAP`) | In-game block definitions, geometry flags, foliage, stairs, and atlas indices. |
| Vanilla texture atlas | `src/game/engine/atlasData.ts` | Authentic 512×512 terrain atlas (32×32 tiles, NearestFilter, sRGB). |
| Texture→tile map | `catalog/textureTileMap.json` | 877 verified texture file names mapped to tile positions in the master atlas. |
| Asset manifest | `catalog/manifest.json` | Upstream asset reference (`InventivetalentDev/minecraft-assets` 1.19.3). |
| Inventory icons | `public/catalog/thumbnails.json` | Base64 isometric inventory thumbnail data URIs. |
| Shape registry | `catalog/block-shapes.json` | Shape taxonomy: `cube`, `3d`, `cross`, and `flat`. |
| Knowledge base | `kb/index.json` + `kb/blocks/*.md`, `kb/entities/*.md` | Architectural and mechanical specifications, status badges, and source code anchors. |
| Live placement stats | `GET /api/blocks/stats` (`world_blocks`) | Hand-placed voxel frequencies aggregated across active world databases. |
| Live entity stats | `GET /api/entities/stats` (`world_animals`) | Living mobs and animals partitioned by type and world. |
| Custom assets API | `GET /api/custom-assets` (`custom_assets`) | Published imported GLB models with placement dimensions and metadata. |
| Runtime manifest | `public/catalog/runtime-manifest.json` | Unified browser manifest merging standard registry and live custom assets. |
| Wikipedia | `https://minecraft.wiki/w/<Name_underscored>` | Direct external documentation links for standard vanilla entities. |

### Census & Shape Distribution
- **Total entries:** 1,197 standard registry entries + published custom assets (1,198+ entries).
- **Placeable blocks (732 total):**
  - **Cube blocks (470):** Standard 6-face textured voxels rendered with the game's terrain atlas.
  - **3D-model blocks (262):** Non-cube voxels including:
    - `3d` models (126): Doors (upper/lower leaves with open/closed states), trapdoors, articulated chests, stairs, fences, slabs, anvils, bells, beds.
    - `cross` billboards (83): Flowers, saplings, tall grass, crops, mushrooms.
    - `flat` decals (48): Rails, ladders, redstone dust, vines, lily pads.
- **Inventory items (465):** Tile-less items, tools, weapons, and food items rendered with isometric sprites.

### The Three Game-Faithful Looks
1. **Inventory:** High-resolution isometric thumbnail from `thumbnails.json` or custom asset icon pipeline.
2. **Held:** First-person hand appearance matching `heldItem.ts` (3D mini-mesh at scale 0.62 for blocks, flat sprite for tools/items).
3. **Placed:** In-world placed voxel rendered using Three.js `MeshLambertMaterial` with atlas textures and authentic lighting matching `chunkMesh.ts`.

---

## 2. Server Endpoints (`server/index.js`)

All routes read directly from the active game SQLite database (dev: `sim-dev.db`, prod: `minecraft.db`) and require no additional databases:

- `GET /api/blocks/stats`:
  - Returns `{ grandTotal, distinctWorlds, worlds, byBlock }`.
  - Queries `world_blocks` grouped by `block_id` and `world_id`, joined with `worlds` table.
  - Sorts blocks descending by placement frequency.
- `GET /api/entities/stats`:
  - Returns `{ total, byType }`.
  - Aggregates `world_animals` by `type` and `world_id`.
- `GET /api/custom-assets`:
  - Returns `{ assets, nextId }` containing all published user-imported GLBs and placement footprints.
- `GET /api/custom-assets/:id`:
  - Streams the raw binary GLB model with appropriate MIME type headers.

---

## 3. Page Layout & User Interface (`/blocks.html`)

1. **Header & Navigation Bar:**
   - Deep links to `/kb.html` (Knowledge Base), `/seed.html` (Seed Inspector), and `/editor.html` (Texture Studio).
   - **Live Overview Bar:** Displays real-time counts for total catalog size, cube blocks, 3D-model blocks, items, KB-backed entries, hand-placed blocks, active worlds, and animals/mobs.
2. **Control Filters:**
   - **Search:** Real-time text search querying block names and numeric IDs.
   - **Category:** Dynamic dropdown populated from active catalog categories (natural, building, decoration, redstone, tools, combat, etc.).
   - **Status:** Filter by `all`, `implemented` (in-world vanilla), `partial / item`, or `custom`.
   - **Placement Toggle:** Checkbox to isolate only blocks that have been hand-placed in a world.
3. **Card Grid Layout (2-Column Responsive):**
   - Explicit 2-column grid layout for high readability.
   - Large visual canvas per look (~167px).
   - Badges on every card:
     - Shape badge (`cube`, `3D model`, `cross-billboard`, `flat decal`).
     - Implementation pill (`kb:implemented`, `kb:partial`, `in-world`, `item`, or `custom`).
     - Texture source pill (`<filename>.png`).
     - Quick link to Texture Studio (`🎨 Recolor`).
     - Live placement count (`placed ×N — <world>×N` or `not hand-placed`).
   - Lazy rendering via `IntersectionObserver` / scroll-driven batching to keep page load instantaneous and memory footprint minimal.
4. **Items Section:**
   - Dedicated panel for non-voxel inventory items.
   - Displays all 465 items without truncation.
5. **Animals & Mobs Table:**
   - Displays mob types, counts, per-world distribution, KB specification links, and Wikipedia links.
6. **Texture Audit Panel:**
   - Compares active atlas tile utilization against upstream vanilla PNG files (`InventivetalentDev/minecraft-assets 1.19.3`).
7. **Interactive 3D Inspection Modal:**
   - Clicking any card launches a modal overlay with an interactive Three.js 3D viewport.
   - Supports mouse-drag orbit rotation, mouse-wheel zooming, and an auto-rotate toggle.
   - Articulated blocks (e.g. Chest `#43`) provide interactive state toggling (Open / Close lid with animation).
   - Custom GLB assets are rendered with double-sided materials and centered bounding boxes.
   - Direct button to launch Texture Studio preloaded with the selected block ID.

---

## 4. Status Rules & Taxonomy

- `implemented`: Block has voxel geometry in the mesher and has an associated Knowledge Base entry in `kb/index.json`.
- `in-world`: Placeable block supported by the terrain mesher without a dedicated KB entry.
- `partial`: Item with partial implementation or tile-less inventory item.
- `custom`: Block or asset with no vanilla counterpart (e.g., custom trees, imported GLBs).
- `texture`: Verified against `textureTileMap.json` pointing to an authentic 1.19.3 texture asset.

---

## 5. Architectural Components & Files

```text

├── block-page/
│   ├── blocks.html              # Catalog HTML markup, modal DOM, styling
│   ├── main.ts                  # Offscreen Three.js renderer, modal controller, catalog logic
│   ├── editor.html              # Texture Studio & Recolor UI
│   └── editor.ts                # Texture Studio canvas and recolor engine
├── catalog/
│   ├── completeRegistry.json    # Static base catalog
│   ├── block-shapes.json        # Shape definitions (cube, 3d, cross, flat)
│   ├── textureTileMap.json      # File-to-tile map (877 entries)
│   └── manifest.json            # Upstream asset manifest
├── public/catalog/
│   ├── runtime-manifest.json    # Dynamic browser-facing manifest (1197+ entries)
│   ├── catalog-change-report.json# Incremental manifest change report
│   ├── preview-job.json         # Automated batch render job spec
│   └── thumbnails.json          # Precomputed isometric inventory data URIs
├── scripts/catalog/
│   ├── sync_catalog.py          # Manifest generator with hash fingerprinting
│   ├── check_catalog.py         # Integrity and schema validator
│   ├── render_previews.py       # Python headless rendering orchestrator
│   └── render_previews.mjs      # Chromium CDP batch preview generator
├── scripts/
│   └── probe-blocks-catalog.mjs # Full automated headless probe for /blocks.html
├── server/
│   └── index.js                 # API routes (/api/blocks/stats, /api/entities/stats, /api/custom-assets)
└── vite.blocks.config.ts        # Vite configuration bundling blocks and editor pages into dist/
```

---

## 6. Automated Tooling & Scripts

Additions to `package.json`:

```json
{
  "scripts": {
    "catalog:sync": "python3 scripts/catalog/sync_catalog.py --base-url http://127.0.0.1:DEV",
    "catalog:previews": "python3 scripts/catalog/render_previews.py",
    "catalog:check": "python3 scripts/catalog/check_catalog.py",
    "build:blocks": "vite build --config vite.blocks.config.ts",
    "build:blocks:catalog": "npm run catalog:sync && npm run catalog:previews && npm run catalog:check && npm run build:blocks"
  }
}
```

- **Catalog Synchronization:** `python3 scripts/catalog/sync_catalog.py --base-url <url>` pulls published assets from the database and updates `runtime-manifest.json` and `catalog-change-report.json` atomically.
- **Catalog Verification:** `python3 scripts/catalog/check_catalog.py` validates manifest counts, schema conformance, required image URIs, and ID uniqueness.

---

## 7. Audit & Verification Findings

### Automated Machine Gates
All project gates pass cleanly:
1. `npx tsc -b` — **PASS** (Zero TypeScript compilation errors).
2. `npm run build` — **PASS** (Main game, seed inspector, blocks catalog, and asset environment bundles built cleanly into `dist/`).
3. `npm run sim:test` — **PASS** (99/99 pure logic harness tests passing).
4. `node catalog/textureCheck.mjs` — **PASS** (Atlas integrity confirmed across 877 tiles).

### Headless Browser Audit (`scripts/probe-blocks-catalog.mjs`)
Executed against `http://127.0.0.1:DEV/blocks.html`:
- `PASS · statbar populated` (1197 catalog entries, 470 cube blocks, 262 3D-model blocks, 465 items, 70 KB-backed, 377 hand-placed blocks).
- `PASS · progress text populated` (All entries accounted for).
- `PASS · audit text populated` (Vanilla texture files used: 639 of 877 atlas tiles from 1.19.3).
- `PASS · total cards > 1000` (1197 rendered cards in DOM).
- `PASS · categories populated` (15 categories loaded into selector).
- `PASS · first card looks rendered` (Inventory, held, and placed looks rendered non-blank).
- `PASS · scroll triggers rendering` (IntersectionObserver/scroll-batch renders looks as cards enter viewport).
- `PASS · search filter 'diamond' works` (Filtered view updates accurately).
- `PASS · modal opens and closes` (Interactive 3D modal initializes Three.js canvas and closes cleanly).
- `PASS · debug hooks present` (`window.__blocksDebug` and `window.__blocksCatalogRenderPreviews` available).
- `PASS · no console errors` (Zero uncaught JavaScript exceptions or runtime errors).
- Visual snapshot generated and verified: `snapshots/blocks-catalog-probe.jpg`.
