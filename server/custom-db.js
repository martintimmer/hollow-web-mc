import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { atomicWriteFileSync } from "./atomic-write.js";

// Dedicated custom-objects database — keeps user-generated assets (custom
// blocks, blueprints) completely OUT of the main game-asset DB and the
// worldgen/texture-override DB. Editing a vanilla texture in editor.html writes
// only to worldgen.db and can never disable or corrupt custom objects.
// Env-overridable so the dev/sim instance uses its own file.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(process.env.WEBMC_CUSTOM_DB_PATH || path.join(__dirname, "../data/custom.db"));
let dbInstance = null;
let saveScheduled = false;

export async function getCustomDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      console.log(`[CUSTOM-DB] Loaded existing SQLite database from ${DB_PATH}`);
    } catch (e) {
      console.error("[CUSTOM-DB] Failed to load existing SQLite database, creating new one:", e);
      dbInstance = new SQL.Database();
    }
  } else {
    console.log(`[CUSTOM-DB] Creating fresh SQLite database at ${DB_PATH}`);
    dbInstance = new SQL.Database();
  }

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS custom_blueprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      biome_affinity TEXT NOT NULL,
      spawn_naturally INTEGER NOT NULL DEFAULT 1,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      depth INTEGER NOT NULL,
      total_blocks INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      package_name TEXT DEFAULT 'default'
    );

    CREATE TABLE IF NOT EXISTS custom_assets (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'model/gltf-binary',
      size_bytes INTEGER NOT NULL,
      dimensions TEXT NOT NULL DEFAULT '[1,1,1]',
      triangles INTEGER NOT NULL DEFAULT 0,
      placement_width INTEGER NOT NULL DEFAULT 1,
      placement_height INTEGER NOT NULL DEFAULT 1,
      placement_scale INTEGER NOT NULL DEFAULT 100,
      asset_type TEXT NOT NULL DEFAULT 'voxel',
      voxel_data TEXT,
      data_base64 TEXT,
      author_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  return dbInstance;
}

function scheduleSave() {
  if (saveScheduled) return;
  saveScheduled = true;
  setTimeout(() => {
    saveScheduled = false;
    if (dbInstance) {
      const data = dbInstance.export();
      atomicWriteFileSync(DB_PATH, Buffer.from(data));
    }
  }, 50);
}

export function saveCustomDb() {
  scheduleSave();
}

/** Synchronous save (used right after a write that must not be lost). */
export function saveCustomDbSync() {
  if (dbInstance) {
    const data = dbInstance.export();
    atomicWriteFileSync(DB_PATH, Buffer.from(data));
  }
}

/**
 * One-time migration: copy any custom assets + blueprints that used to live in
 * the main game DB into the dedicated custom DB. Only runs when the custom DB
 * is empty so it is idempotent.
 */
export async function migrateCustomObjectsFromGameDb() {
  const db = await getCustomDb();
  const have = db.exec("SELECT COUNT(*) FROM custom_assets");
  if (have.length && have[0].values[0][0] > 0) return;

  const { getDb } = await import("./db.js");
  try {
    const gdb = await getDb();
    const assets = gdb.exec(
      "SELECT id, name, prompt, filename, mime_type, size_bytes, dimensions, triangles, placement_width, placement_height, placement_scale, asset_type, voxel_data, data_base64, author_id, created_at FROM custom_assets"
    );
    if (assets.length && assets[0].values.length) {
      for (const v of assets[0].values) {
        db.run(
          `INSERT INTO custom_assets (id, name, prompt, filename, mime_type, size_bytes, dimensions, triangles, placement_width, placement_height, placement_scale, asset_type, voxel_data, data_base64, author_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          v
        );
      }
      console.log(`[CUSTOM-DB] Migrated ${assets[0].values.length} custom assets from game DB`);
    }
    const bps = gdb.exec(
      "SELECT id, name, author, category, biome_affinity, spawn_naturally, width, height, depth, total_blocks, data_json, created_at, package_name FROM custom_blueprints"
    );
    if (bps.length && bps[0].values.length) {
      for (const v of bps[0].values) {
        db.run(
          `INSERT INTO custom_blueprints (id, name, author, category, biome_affinity, spawn_naturally, width, height, depth, total_blocks, data_json, created_at, package_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          v
        );
      }
      console.log(`[CUSTOM-DB] Migrated ${bps[0].values.length} blueprints from game DB`);
    }
    if ((assets.length && assets[0].values.length) || (bps.length && bps[0].values.length)) {
      saveCustomDbSync();
    }
  } catch (e) {
    console.error("[CUSTOM-DB] migration skipped:", e.message || e);
  }
}