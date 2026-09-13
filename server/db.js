import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { atomicWriteFileSync } from "./atomic-write.js";

// Main game-asset database. Override with WEBMC_DB_PATH; the dev/sim instance
// uses its own file so the two environments NEVER share worlds/players/chests/edits.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(process.env.WEBMC_DB_PATH || path.join(__dirname, "../data/minecraft.db"));
let dbInstance = null;
let saveScheduled = false;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      console.log(`[DB] Loaded existing SQLite database from ${DB_PATH}`);
    } catch (e) {
      console.error("[DB] Failed to load existing SQLite database, creating new one:", e);
      dbInstance = new SQL.Database();
    }
  } else {
    console.log(`[DB] Creating fresh SQLite database at ${DB_PATH}`);
    dbInstance = new SQL.Database();
  }

  // Initialize Tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      skin_color TEXT DEFAULT '#e0913a',
      created_at TEXT NOT NULL,
      last_login TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      seed INTEGER NOT NULL,
      seed_text TEXT NOT NULL,
      world_type TEXT NOT NULL,
      world_time INTEGER DEFAULT 6000,
      day_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_played TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_state (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      pos_z REAL NOT NULL,
      yaw REAL DEFAULT 0,
      pitch REAL DEFAULT 0,
      flying INTEGER DEFAULT 1,
      game_mode TEXT DEFAULT 'creative',
      hotbar TEXT DEFAULT '[]',
      active_slot INTEGER DEFAULT 0,
      inventory TEXT DEFAULT '[]',
      last_online TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS world_blocks (
      coord_key TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      z INTEGER NOT NULL,
      block_id INTEGER NOT NULL,
      dir INTEGER DEFAULT 0,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS world_animals (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT,
      sex TEXT NOT NULL DEFAULT 'female',
      owner_id TEXT,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      yaw REAL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS world_boats (
      id TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      z REAL NOT NULL,
      yaw REAL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS block_edits_log (
      seq_id INTEGER PRIMARY KEY AUTOINCREMENT,
      world_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      z INTEGER NOT NULL,
      prev_block_id INTEGER NOT NULL,
      new_block_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS world_chests (
      chest_key TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      z INTEGER NOT NULL,
      slots TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS villager_trades (
      vkey TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      trade_day INTEGER NOT NULL DEFAULT 0,
      offers_json TEXT NOT NULL DEFAULT '[]',
      uses_json TEXT NOT NULL DEFAULT '[]',
      purse_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS world_paintings (
      pkey TEXT PRIMARY KEY,
      world_id TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      z INTEGER NOT NULL,
      nx INTEGER NOT NULL DEFAULT 0,
      nz INTEGER NOT NULL DEFAULT 1,
      variant TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      render_distance INTEGER DEFAULT 8,
      vibrance INTEGER DEFAULT 140,
      brightness INTEGER DEFAULT 105,
      contrast INTEGER DEFAULT 105,
      fov INTEGER DEFAULT 70,
      shadows INTEGER DEFAULT 1,
      auto_step INTEGER DEFAULT 0,
      max_fps INTEGER DEFAULT 0,
      dof INTEGER DEFAULT 0,
      dof_strength INTEGER DEFAULT 40,
      ca INTEGER DEFAULT 0,
      ca_strength INTEGER DEFAULT 25,
      color_gamut TEXT DEFAULT 'display-p3',
      bokeh INTEGER DEFAULT 0,
      specular INTEGER DEFAULT 0,
      specular_strength INTEGER DEFAULT 60,
      quality_preset TEXT DEFAULT 'balanced',
      weather TEXT DEFAULT 'cloudy',
      exposure_model TEXT DEFAULT 'legacy-sim'
    );
    CREATE TABLE IF NOT EXISTS spawn_points (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      world_id TEXT NOT NULL,
      name TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      z INTEGER NOT NULL,
      is_home INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

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
      created_at TEXT NOT NULL
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

  try {
    dbInstance.run("ALTER TABLE custom_assets ADD COLUMN asset_type TEXT NOT NULL DEFAULT 'voxel'");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE custom_assets ADD COLUMN voxel_data TEXT");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN fov INTEGER DEFAULT 70");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN dof INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN dof_strength INTEGER DEFAULT 40");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN ca INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN ca_strength INTEGER DEFAULT 25");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN color_gamut TEXT DEFAULT 'display-p3'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN bokeh INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN specular INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN specular_strength INTEGER DEFAULT 60");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN quality_preset TEXT DEFAULT 'balanced'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN weather TEXT DEFAULT 'cloudy'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN shadow_tier TEXT DEFAULT 'detailed'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN touch_controls INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE user_preferences ADD COLUMN exposure_model TEXT DEFAULT 'legacy-sim'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE worlds ADD COLUMN gen_version INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE worlds ADD COLUMN biome_version INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE worlds ADD COLUMN data_version INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE world_blocks ADD COLUMN data_version INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE world_chests ADD COLUMN data_version INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE worlds ADD COLUMN day_count INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE world_animals ADD COLUMN data_version INTEGER DEFAULT 1");
  } catch (e) {}
  try {
    dbInstance.run("ALTER TABLE block_edits_log ADD COLUMN data_version INTEGER DEFAULT 1");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE player_state ADD COLUMN hotbar TEXT DEFAULT '[]'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE player_state ADD COLUMN flying INTEGER DEFAULT 1");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE player_state ADD COLUMN game_mode TEXT DEFAULT 'creative'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE player_state ADD COLUMN active_slot INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE player_state ADD COLUMN inventory TEXT DEFAULT '[]'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE custom_blueprints ADD COLUMN package_name TEXT DEFAULT 'default'");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE world_blocks ADD COLUMN dir INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE custom_assets ADD COLUMN placement_width INTEGER NOT NULL DEFAULT 1");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE custom_assets ADD COLUMN placement_height INTEGER NOT NULL DEFAULT 1");
  } catch (e) {}

  try {
    dbInstance.run("ALTER TABLE custom_assets ADD COLUMN placement_scale INTEGER NOT NULL DEFAULT 100");
  } catch (e) {}

  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  if (saveScheduled) return;

  saveScheduled = true;
  setTimeout(() => {
    try {
      const data = dbInstance.export();
      const buffer = Buffer.from(data);
      atomicWriteFileSync(DB_PATH, buffer);
      saveScheduled = false;
    } catch (e) {
      console.error("[DB] Error saving SQLite database to disk:", e);
      saveScheduled = false;
    }
  }, 100);
}
