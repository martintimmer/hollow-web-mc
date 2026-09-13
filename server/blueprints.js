// Hollowpine — Backend Blueprints Storage & Registry
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINTS_DIR = path.join(__dirname, "../data/blueprints");

try {
  if (!fs.existsSync(BLUEPRINTS_DIR)) {
    fs.mkdirSync(BLUEPRINTS_DIR, { recursive: true });
  }
} catch (e) {
  /* ignore */
}

export function initBlueprintsTable(db) {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS custom_blueprints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT NOT NULL,
        package_name TEXT DEFAULT 'Default Package',
        biome_affinity TEXT NOT NULL,
        spawn_naturally INTEGER NOT NULL DEFAULT 1,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        depth INTEGER NOT NULL,
        total_blocks INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    try {
      db.run("ALTER TABLE custom_blueprints ADD COLUMN package_name TEXT DEFAULT 'Default Package'");
    } catch {
      // Column already exists
    }
  } catch (err) {
    console.error("[blueprints] table init failed:", err);
  }
}

export function listBlueprints(db) {
  try {
    const res = db.exec(`
      SELECT id, name, author, category, package_name, biome_affinity, spawn_naturally, width, height, depth, total_blocks, created_at
      FROM custom_blueprints
      ORDER BY created_at DESC
    `);
    if (!res.length || !res[0].values.length) return [];
    const cols = res[0].columns;
    return res[0].values.map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        obj[col] = row[i];
      });
      try {
        obj.biome_affinity = JSON.parse(obj.biome_affinity);
      } catch {
        obj.biome_affinity = ["plains"];
      }
      obj.spawn_naturally = !!obj.spawn_naturally;
      obj.package_name = obj.package_name || "Default Package";
      return obj;
    });
  } catch (err) {
    console.error("[blueprints] list failed:", err);
    return [];
  }
}

export function getBlueprint(db, id) {
  try {
    const res = db.exec("SELECT data_json FROM custom_blueprints WHERE id = ?", [id]);
    if (!res.length || !res[0].values.length) return null;
    return JSON.parse(res[0].values[0][0]);
  } catch (err) {
    console.error(`[blueprints] get ${id} failed:`, err);
    return null;
  }
}

export function saveBlueprint(db, doc) {
  if (!doc || !doc.id || !doc.name || !Array.isArray(doc.blocks)) {
    throw new Error("Invalid blueprint document");
  }

  const jsonStr = JSON.stringify(doc);
  const biomeStr = JSON.stringify(doc.biomeAffinity || ["plains"]);
  const now = doc.createdAt || new Date().toISOString();

  // Save to SQLite
  db.run(`
    INSERT INTO custom_blueprints (
      id, name, author, category, package_name, biome_affinity, spawn_naturally, width, height, depth, total_blocks, data_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      author=excluded.author,
      category=excluded.category,
      package_name=excluded.package_name,
      biome_affinity=excluded.biome_affinity,
      spawn_naturally=excluded.spawn_naturally,
      width=excluded.width,
      height=excluded.height,
      depth=excluded.depth,
      total_blocks=excluded.total_blocks,
      data_json=excluded.data_json,
      created_at=excluded.created_at
  `, [
    doc.id,
    doc.name,
    doc.author || "Player",
    doc.category || "house",
    doc.packageName || "Default Package",
    biomeStr,
    doc.spawnNaturally ? 1 : 0,
    doc.dimensions?.width || 1,
    doc.dimensions?.height || 1,
    doc.dimensions?.depth || 1,
    doc.totalBlocks || doc.blocks.length,
    jsonStr,
    now
  ]);

  // Also backup to disk
  try {
    const filePath = path.join(BLUEPRINTS_DIR, `${doc.id}.json`);
    fs.writeFileSync(filePath, jsonStr, "utf8");
  } catch (e) {
    console.warn(`[blueprints] disk backup for ${doc.id} failed:`, e);
  }

  return { ok: true, id: doc.id };
}

export function deleteBlueprint(db, id) {
  try {
    db.run("DELETE FROM custom_blueprints WHERE id = ?", [id]);
    const filePath = path.join(BLUEPRINTS_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true };
  } catch (err) {
    console.error(`[blueprints] delete ${id} failed:`, err);
    return { ok: false, error: String(err) };
  }
}
