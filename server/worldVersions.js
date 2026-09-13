// Hollowpine world data versions (vanilla DataVersion equivalent).
//
// Every persisted world row declares the versions that wrote it so future code
// can upgrade old data on read instead of silently misinterpreting it:
// - DATA_VERSION: overall persisted-data schema + block id registry revision.
//   Bump on any breaking change to stored rows (new/renamed block ids, column
//   changes, bundle format changes).
// - GEN_VERSION: terrain generator code revision. Bump when terrain output
//   changes for the same seed (noise, biomes, structures, caves, ores).
// - BIOME_VERSION: biome registry revision (`catalog/biome-registry.json`).
//   Bump when biome ids, flora or surface rules change.
// - BUNDLE_FORMAT_VERSION: portable World Bundle container version
//   (see docs/WORLD_BUNDLE_FORMAT.md).
//
// Rules: versions only ever increase; writers always stamp CURRENT; readers
// treat a missing stamp as 1; anything newer than CURRENT must be rejected,
// anything older goes through the (future) upgrade chain, never applied raw.

export const DATA_VERSION = 1;
export const GEN_VERSION = 5;
export const BIOME_VERSION = 1;
export const BUNDLE_FORMAT_VERSION = 1;

export function currentVersions() {
  return { data_version: DATA_VERSION, gen_version: GEN_VERSION, biome_version: BIOME_VERSION };
}

export function needsMigration(manifest) {
  const m = manifest || {};
  const from = {
    data_version: Number(m.data_version ?? m.dataVersion ?? 1),
    gen_version: Number(m.gen_version ?? m.genVersion ?? 1),
    biome_version: Number(m.biome_version ?? m.biomeVersion ?? 1)
  };
  const to = currentVersions();
  if (from.data_version > DATA_VERSION || from.gen_version > GEN_VERSION || from.biome_version > BIOME_VERSION) {
    return { migrate: false, newer: true, from, to, reason: "written by newer code" };
  }
  const migrate =
    from.data_version < DATA_VERSION ||
    from.gen_version < GEN_VERSION ||
    from.biome_version < BIOME_VERSION;
  return { migrate, newer: false, from, to, reason: migrate ? "stale versions" : "current" };
}
