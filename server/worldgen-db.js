import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { atomicWriteFileSync } from "./atomic-write.js";

// Separate world-generation database — keeps seed/biome/preset metadata OUT of the
// main game-asset db (users, blocks, chests, blueprints). Env-overridable so the
// dev/sim instance uses its own file and never shares with prod.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(process.env.WEBMC_WORLDGEN_DB_PATH || path.join(__dirname, "../data/worldgen.db"));
const CATALOG_PATH = path.join(__dirname, "../catalog/biome-registry.json");

let wgInstance = null;
let saveScheduled = false;

async function loadCatalog() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  } catch (e) {
    console.error("[WORLDGEN-DB] Failed to read catalog/biome-registry.json:", e);
    return { presets: [], biomes: [], structure: { pipeline: [] } };
  }
}

let lastLoadedMtime = 0;

export async function getWorldgenDb() {
  const fileExists = fs.existsSync(DB_PATH);
  const currentMtime = fileExists ? fs.statSync(DB_PATH).mtimeMs : 0;

  if (wgInstance && currentMtime <= lastLoadedMtime) {
    return wgInstance;
  }

  const SQL = await initSqlJs();

  if (fileExists) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      wgInstance = new SQL.Database(fileBuffer);
      lastLoadedMtime = currentMtime;
      console.log(`[WORLDGEN-DB] Loaded/Reloaded SQLite database from ${DB_PATH} (mtime: ${currentMtime})`);
    } catch (e) {
      console.error("[WORLDGEN-DB] Failed to load existing database, creating new one:", e);
      wgInstance = new SQL.Database();
    }
  } else {
    console.log(`[WORLDGEN-DB] Creating fresh SQLite database at ${DB_PATH}`);
    wgInstance = new SQL.Database();
  }

  wgInstance.run(`
    CREATE TABLE IF NOT EXISTS gen_presets (
      world_type TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      scale REAL NOT NULL,
      hill REAL NOT NULL,
      mtn REAL NOT NULL,
      temp REAL NOT NULL,
      island REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS biome_registry (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vanilla TEXT,
      implemented INTEGER NOT NULL DEFAULT 0,
      kb TEXT,
      wiki TEXT,
      map_col TEXT,
      tree TEXT,
      density REAL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS world_gen (
      id TEXT PRIMARY KEY,
      world_id TEXT,
      seed_text TEXT NOT NULL,
      seed_int INTEGER NOT NULL,
      world_type TEXT NOT NULL,
      generator_version TEXT,
      sampled_px INTEGER,
      biome_counts_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS texture_overrides (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await seedCatalog();
  return wgInstance;
}

async function seedCatalog() {
  const catalog = await loadCatalog();
  const db = wgInstance;

  db.run("DELETE FROM gen_presets");
  for (const p of catalog.presets || []) {
    db.run(
      "INSERT OR REPLACE INTO gen_presets (world_type, label, scale, hill, mtn, temp, island) VALUES (?,?,?,?,?,?,?)",
      [p.key, p.label, p.scale, p.hill, p.mtn, p.temp, p.island]
    );
  }
  for (const b of catalog.biomes || []) {
    db.run(
      "INSERT OR REPLACE INTO biome_registry (id, name, vanilla, implemented, kb, wiki, map_col, tree, density, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [b.id, b.name, b.vanilla || null, b.implemented ? 1 : 0, b.kb || null, b.wiki || null, JSON.stringify(b.mapCol || null), b.tree || null, b.density || 0, b.notes || ""]
    );
  }
  saveWorldgenDbSync();
}

export function saveWorldgenDbSync() {
  if (!wgInstance) return;
  try {
    const data = wgInstance.export();
    atomicWriteFileSync(DB_PATH, Buffer.from(data));
    lastLoadedMtime = fs.statSync(DB_PATH).mtimeMs;
  } catch (e) {
    console.error("[WORLDGEN-DB] Error saving SQLite database synchronously:", e);
  }
}

export function saveWorldgenDb() {
  if (!wgInstance) return;
  if (saveScheduled) return;

  saveScheduled = true;
  setTimeout(() => {
    try {
      const data = wgInstance.export();
      atomicWriteFileSync(DB_PATH, Buffer.from(data));
      lastLoadedMtime = fs.statSync(DB_PATH).mtimeMs;
      saveScheduled = false;
    } catch (e) {
      console.error("[WORLDGEN-DB] Error saving SQLite database to disk:", e);
      saveScheduled = false;
    }
  }, 100);
}

export function resetWorldgenDb() {
  wgInstance = null;
  saveScheduled = false;
  try { fs.unlinkSync(DB_PATH); } catch (e) {}
}