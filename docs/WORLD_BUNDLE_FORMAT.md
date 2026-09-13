# Hollowpine World Bundle Format v1

Portable, self-contained per-world container: **moving one file moves one
world** (vanilla `level.dat` + `region/` model, SQLite-dressed).
Status: format defined; export/import endpoints + UI are future work. The
version stamps below are live since bundle v1 (see `server/worldVersions.js`).

## 1. Container

A single SQLite file (`<world-name>.hollowpine.db`). A bundle is valid iff it
contains a `bundle_meta` table with `format_version = 1`.

```sql
CREATE TABLE bundle_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- keys: format_version, data_version, gen_version, biome_version,
--       game_build, source_world_id, source_world_name, seed_text,
--       exported_at, exporter_user_id
```

## 2. Contents (world-scoped rows only)

| Table | Rows | Notes |
|---|---|---|
| `worlds` | 1 (the world) | Carries `seed`, `world_type`, `world_time`, `gen_version`, `biome_version`, `data_version` (= manifest) |
| `world_blocks` | all for world | Absolute-coordinate diffs + per-row `data_version` |
| `world_chests` | all for world | `slots` JSON may embed item ids (remap applies) |
| `world_animals` | all for world | Owner ids travel along (may dangle — see §5) |
| `player_state` | all for world | Per (world, user) snapshots |
| `spawn_points` | all for world | Per (user, world) |
| `chunk_baselines` | all for world | Frozen full-chunk voxels (future; absent in v1 exports) |
| `custom_assets` | referenced subset only | Every custom-asset id appearing in blocks/blobs above |

Explicitly EXCLUDED: `users` (server-local accounts), `user_preferences`
(per-user client settings), `block_edits_log` (audit history, optional),
global `texture_overrides` (worldgen-scoped, see §5).

## 3. Import procedure

1. Validate: `bundle_meta.format_version` known, else reject. Read manifest versions.
2. Gate: `needsMigration(manifest)` (`server/worldVersions.js`).
   - Newer than current code → **reject** with a clear error (never apply raw).
   - Older → run the registered upgrade chain for each skipped version, then import.
   - Current → import directly.
3. Allocate a FRESH world id (never reuse the source id — prevents collisions
   with an existing same-seed world).
4. Custom-asset remap: for each bundled asset, reuse the target id if free,
   else assign the next free id and rewrite EVERY reference (`world_blocks`
   rows, chest `slots` JSON, baseline blobs).
5. Insert world-scoped rows under the new id; record provenance
   (`bundle_meta` copied into import log).

## 4. Version rules (`server/worldVersions.js`)

- `DATA_VERSION`: persisted-data schema + block-id registry revision.
- `GEN_VERSION`: terrain generator code revision (bump on ANY output change
  for the same seed).
- `BIOME_VERSION`: `catalog/biome-registry.json` revision.
- Writers always stamp CURRENT; missing stamp reads as 1. Versions only increase.

## 5. Known limitations (v1)

- Owner ids (`world_animals.owner_id`, `spawn_points.user_id`) reference
  source-server accounts. Import keeps them; if no same-id user exists they
  dangle until matched — future work: match by username when unambiguous.
- `texture_overrides` are global to `worldgen.db`; v1 does not scope them per
  world. Exporting a world does not carry its editor textures yet.
- Baseline blobs freeze terrain: a world imported onto a server with a NEWER
  generator keeps its built chunks byte-identical; untouched chunks generate
  with the importer's generator (documented seam behavior, same as vanilla
  old/new-chunk borders after updates).
