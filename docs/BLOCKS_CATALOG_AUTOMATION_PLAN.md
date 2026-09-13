# Blocks Catalog Automation Plan

Updated 2026-09-01.

## Objective

Make `/blocks.html` a complete, game-faithful catalog that lists every registry
block, inventory-only item, and published imported asset. Every entry gets three
images generated from the same rendering rules used by the game:

1. `inventory.png` — the creative-inventory appearance.
2. `held.png` — the first-person hand appearance.
3. `placed.png` — the in-world placement appearance.

The pipeline is intentionally hybrid. Python automates catalog preparation,
change detection, validation, and orchestration. TypeScript/Three.js remains the
renderer because it has the game atlas, meshers, GLB loader, lighting, special
shapes, and material rules already loaded.

## Current gaps

- `block-page/main.ts` imports `catalog/completeRegistry.json` at bundle time, so
  a new registry block is invisible until the blocks bundle is rebuilt.
- The page has separate approximation code for cubes, doors, trapdoors, fences,
  and chests instead of calling one shared preview implementation.
- The item card builder uses `items.slice(0, 300)`, so the page cannot promise a
  complete catalog.
- Published custom assets are available through `/api/custom-assets` but are not
  merged into the blocks catalog.
- There is no manifest revision or per-entry fingerprint, so the page cannot know
  which images need regeneration.
- A same-name item can be visually confused unless every card and image path is
  keyed by numeric ID.

## Target data flow

```text
completeRegistry.json + block-shapes.json + KB + thumbnails + custom-assets API
                              │
                    Python catalog sync
                              │
       public/catalog/runtime-manifest.json + change report
                              │
                 browser preview renderer
              ┌───────────────┼────────────────┐
              │               │                │
        inventory.png     held.png         placed.png
              └───────────────┼────────────────┘
                              │
                    blocks.html live catalog
```

## Source of truth and manifest

Add `public/catalog/runtime-manifest.json` as the generated, browser-readable
catalog. It must contain one row per ID, including IDs from the standard registry
and published custom assets.

Suggested row shape:

```json
{
  "id": 1198,
  "name": "House fence",
  "category": "decoration",
  "kind": "custom-asset",
  "shape": "3d",
  "source": "custom-asset",
  "sourceFingerprint": "sha256:...",
  "placement": { "width": 2, "height": 2, "scale": 100 },
  "images": {
    "inventory": "/catalog/previews/1198/inventory.png",
    "held": "/catalog/previews/1198/held.png",
    "placed": "/catalog/previews/1198/placed.png"
  }
}
```

Standard rows use the registry ID, face tiles, `block-shapes.json`, and the
existing `public/catalog/thumbnails.json`. Custom rows use the published asset
ID, prompt-derived name, GLB filename/hash, and saved placement metadata. IDs
are the primary key; names are display text only.

The manifest also includes:

- `schemaVersion`
- `generatedAt`
- `catalogRevision`
- `standardRegistryFingerprint`
- `customAssetRevision`
- `counts` for total entries, placeable blocks, items, and custom assets

## Python automation

### 1. `scripts/catalog/sync_catalog.py`

Responsibilities:

- Read `catalog/completeRegistry.json`, `catalog/block-shapes.json`,
  `catalog/textureTileMap.json`, `kb/index.json`, and the vanilla thumbnail map.
- Fetch published assets from `GET /api/custom-assets` using `--base-url`; allow
  `--base-url http://127.0.0.1:PROD` for production or `:DEV` for development.
- Merge standard and custom rows by numeric ID.
- Reject duplicate IDs, missing names, malformed placement spans, and custom IDs
  that collide with standard IDs.
- Compute a deterministic fingerprint for each row from the ID, relevant
  registry fields, shape, placement, asset filename/hash, and renderer version.
- Preserve unchanged rows and emit only changed IDs in
  `public/catalog/catalog-change-report.json`.
- Write the manifest atomically through a temporary file and rename.

It must never edit `src/game/blocks.ts` directly. Registry changes continue to
flow through the existing catalog generation process.

### 2. `scripts/catalog/render_previews.py`

Responsibilities:

- Read the change report and render only new or changed IDs by default.
- Open a dedicated `/catalog-renderer.html` page in a controlled browser session.
- Ask the TypeScript renderer to create the three images using the shared game
  preview module.
- Write 256px PNGs to `public/catalog/previews/<id>/`.
- Render custom GLBs from their actual materials and textures, including alpha,
  double-sided thin geometry, saved scale, and saved footprint.
- Render doors, trapdoors, chests, fences, torches, slabs, billboards, and cubes
  through the same shape dispatch used by the game.
- Use a stable camera, lights, transparent background, and renderer version so
  unchanged entries do not churn in git or deployments.

The Python script orchestrates the work; it must not reimplement Three.js mesh
geometry in Python. A `--all` option regenerates every image when the renderer or
lighting version changes.

### 3. `scripts/catalog/check_catalog.py`

Responsibilities:

- Verify the manifest has unique IDs and no missing required fields.
- Verify every row has all three image paths for placeable entries.
- Verify image files exist, are valid PNGs, and are non-empty.
- Verify every standard registry row and every published custom asset appears.
- Verify similarly named rows remain separate by ID.
- Verify the counts in the manifest equal the rendered rows.
- Report stale, orphaned, or missing preview directories.

This is the fast gate used before publishing the catalog.

### 4. Optional watcher: `scripts/catalog/watch_catalog.py`

For local development only:

- Watch registry, shape, thumbnail, KB, and generated-manifest inputs.
- Poll `/api/custom-assets` every few seconds.
- Run sync, changed-ID rendering, and `npm run build:blocks` after a change.
- Debounce bursts so one upload produces one refresh.

The watcher must not run against production databases except when explicitly
given `--base-url http://127.0.0.1:PROD`.

## Shared TypeScript renderer

Create `src/game/catalogPreview.ts` and move preview decisions out of
`block-page/main.ts`. It should expose:

- `renderInventoryPreview(entry)`
- `renderHeldPreview(entry)`
- `renderPlacedPreview(entry)`
- `loadCustomAssetPreview(entry)`

The renderer should reuse the game’s atlas, held-item factories, special mesh
functions, custom GLB loader, material flags, and placement fitting. The page and
the Python-driven renderer then consume the same output instead of maintaining a
second visual implementation that can drift from gameplay.

For custom assets, all three views must come from the fitted GLB model. The held
view scales the same model for the hand; the inventory view uses a stable icon
camera; the placed view uses the saved width/height/scale and a world-like camera.

## `blocks.html` changes

1. Replace the static `completeRegistry.json` import with a fetch of
   `/catalog/runtime-manifest.json`.
2. Fetch `/api/custom-assets` on boot and on a visibility/focus refresh. Merge by
   ID and update the manifest view without a page rebuild when a new asset is
   published or removed.
3. Render all entries. Remove `items.slice(0, 300)`.
4. Keep `blockCards` keyed by numeric ID. If two names match, both cards remain
   visible and independently addressable.
5. Use the manifest’s three image paths for all cards. Lazy-load images with
   `loading="lazy"`, but do not omit rows.
6. Show a small state badge: `ready`, `rendering`, `stale`, or `missing preview`.
7. When the catalog revision changes, update only changed cards and images rather
   than rebuilding the entire DOM.
8. Keep the existing filters, live placement statistics, KB links, wiki links,
   and interactive modal. The modal should use the same shared preview model.
9. Display a catalog status line with revision, last update time, and counts.

## Update behavior

### New standard block

1. Update the catalog source and regenerate the normal runtime registry.
2. Run `sync_catalog.py`; the new ID receives a fingerprint.
3. `render_previews.py` creates its three images.
4. `check_catalog.py` validates completeness.
5. `npm run build:blocks` publishes the updated page.

### New imported asset

1. Publish it through `/build.html` so it receives a unique production ID.
2. The page/API revision changes.
3. `sync_catalog.py` discovers the asset and marks its ID changed.
4. The GLB renderer creates inventory, held, and placed images from the actual
   asset material.
5. `blocks.html` picks it up on its next refresh; no hard-coded name list is
   needed.

### Asset removal or replacement

- A removed ID becomes an orphan in the change report and is deleted from the
  manifest after validation.
- A replaced GLB changes its content fingerprint and regenerates all three
  images for the same ID.
- Old preview files are removed only after the manifest no longer references
  them and the cleanup report identifies them explicitly.

## Commands

Add these package scripts:

```json
{
  "catalog:sync": "python3 scripts/catalog/sync_catalog.py --base-url http://127.0.0.1:DEV",
  "catalog:previews": "python3 scripts/catalog/render_previews.py",
  "catalog:check": "python3 scripts/catalog/check_catalog.py",
  "build:blocks:catalog": "npm run catalog:sync && npm run catalog:previews && npm run catalog:check && npm run build:blocks"
}
```

The CI/deployment command should use the appropriate explicit base URL and never
silently mix the `:PROD` production database with the `:DEV` development DB.

## Acceptance criteria

- `/blocks.html` lists every standard registry row, every inventory-only item,
  and every published custom asset.
- A catalog with two identical names still shows two separate cards with two
  separate IDs and previews.
- Every placeable entry has inventory, held, and placed images.
- The door, trapdoor, fence, chest, torch, slab, billboard, and custom GLB
  previews visually match the corresponding in-game geometry and materials.
- Changing a block texture, shape, placement, or GLB regenerates only that ID’s
  three images.
- Adding or removing a published custom asset appears after catalog refresh
  without editing `blocks.html`.
- A new standard registry block appears after the automated sync/build command.
- `catalog:check` fails on duplicate IDs, missing images, stale references, or
  incomplete counts.
- The page remains usable on desktop, iPad, and iPhone widths with lazy image
  loading and no WebGL renderer created for every card.

## Execution order

1. Build the manifest schema and Python sync/check scripts.
2. Extract shared game-faithful preview rendering from `block-page/main.ts`.
3. Add the dedicated browser renderer page and Python preview orchestration.
4. Convert `blocks.html` to manifest/API loading and full ID-keyed rendering.
5. Add the watcher and package commands.
6. Run the standard gates, then perform human visual checks on representative
   cube, door, trapdoor, chest, torch, fence, item, and imported-GLB rows.
