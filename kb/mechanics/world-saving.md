---
id: mechanics/world-saving
title: "Vanilla world saving, versions & migration"
kind: mechanic
wiki: https://minecraft.wiki/w/Java_Edition_level_format
game_version: "1.19.3 (Java)"
fetched_at: 2026-09-04
updated_at: 2026-09-04
status: partial
tags: [world, save, seed, migration, anvil, dataversion, export, import]
related_docs: []
---

# Vanilla world saving, versions & migration

How vanilla Java Edition persists worlds so builds survive seed changes,
version updates, and folder moves — the model our world portability work adapts.

## Vanilla specs

- **World = self-contained folder.** Identity = folder containing `level.dat`;
  moving/copying the folder moves/imports the world. Per-dimension `region/`,
  `entities/`, `poi/` subfolders; per-player `<uuid>.dat` files.
  (`https://minecraft.wiki/w/Java_Edition_level_format`)
- **`level.dat` = world manifest.** Seed, spawn pos, time of day, generator
  settings, plus `DataVersion` int and `version_history` list of every data
  version the world has seen.
- **Generated chunks are stored whole** (Anvil `r.<x>.<z>.mca`, paletted
  sections, empty sections skipped). A generated chunk is NEVER regenerated:
  seed or generator changes only affect not-yet-generated chunks, so old builds
  physically cannot float. (`https://minecraft.wiki/w/Anvil_file_format`)
- **Biomes are saved per column**, not recomputed — same freeze principle
  applied to worldgen inputs, preventing post-update biome shifting.
- **Upgrades via DataVersion + DataFixerUpper.** Every blob declares the
  version that wrote it; loaders run registered upgraders on read. Old worlds
  open on new versions through the upgrade chain, never silently.

## Our implementation

| Concern | Where |
|---|---|
| Worlds table (seed, type, time) | `server/db.js` (`worlds`), `server/index.js` join |
| Edit diffs (absolute coords) | `world_blocks` + `block_edits_log` |
| Chests / animals / player state | `world_chests`, `world_animals`, `player_state` |
| Spawn points (per user+world) | `spawn_points`, `/api/spawns` |
| Custom assets referenced by builds | `custom_assets` (DB-global ids, e.g. porch `1211`) |
| Generator + biome registry | `src/game/terrain/*`, `catalog/biome-registry.json`, `server/worldgen-db.js` |

## Deviations / limitations

- We store procedural **diffs**, vanilla stores **generated chunks**. Consequence:
  changing the seed (or shipping a generator tweak) silently invalidates every
  build — absolute-coordinate diffs re-apply onto moved terrain (floating/
  buried builds). Vanilla cannot hit this by construction.
- No manifest versions: `worlds` rows carry no generator/biome-registry/data
  version, so a stale world loads without any migration gate.
- No per-world container: all worlds share `minecraft.db`, so "move a file =
  move a world" is impossible today; custom-asset ids are DB-global, so a
  moved world can lose its referenced assets.
- Texture overrides live in the global `worldgen.db` (`texture_overrides`),
  unscopen per world — export must decide their scope.

## Ruleset when modifying

- Never mix generations: a persisted row must always know the generator +
  data version that wrote it (target: `gen_version`, `biome_version`,
  `data_version` on write paths).
- Touched-chunk baselines (`chunk_baselines`), once introduced, are the
  source of truth for edited chunks — procedural gen must never overwrite them.
- Custom-asset references inside exported blobs must be remapped on import
  (ids are DB-global); never assume an id means the same asset elsewhere.
- Machine gates: `npx tsc -b`, `npm run build`, `npm run sim:test`,
  `node catalog/textureCheck.mjs`, `npm run kb:check`.

## Open work

- ~~`gen_version` / `biome_version` / `data_version` stamps + world manifest fields~~ DONE 2026-09-04 (`server/worldVersions.js`, `server/db.js` migrations, stamped on every write, returned by list/join).
- ~~World Bundle v1 spec~~ DONE 2026-09-04 (`docs/WORLD_BUNDLE_FORMAT.md`).
- `chunk_baselines` freeze-on-edit for touched chunks (+ one-shot migration of
  existing `world_blocks` diffs against the current seed).
- World Bundle export/import endpoints + UI (per `docs/WORLD_BUNDLE_FORMAT.md` §3, incl. custom-asset remap).
- Upgrade registry executing on `needsMigration().migrate` (block-id remaps, type renames).
