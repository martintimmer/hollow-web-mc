// Hollowpine Sim Server — separate process, port 5450 (env SIM_PORT).
// Admin-only: requires the SIM_ADMIN_USERNAME env. Dev DB only.
// Production session check is PROXIED to the live game server (/api/auth/me) —
// this process NEVER opens the production database file.
import express from "express";
import http from "http";
import cors from "cors";
import fs from "fs";
import path from "path";
import initSqlJs from "sql.js";
import { fileURLToPath } from "url";
import { atomicWriteFileSync } from "./atomic-write.js";

const PORT = Number(process.env.SIM_PORT || 5450);
const ADMIN_USER = process.env.SIM_ADMIN_USERNAME || "";
if (!ADMIN_USER) console.warn("[SIM] SIM_ADMIN_USERNAME not set — admin endpoints will deny all sessions.");
const GAME_API = process.env.SIM_GAME_API || "http://127.0.0.1:5401";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_DB_PATH = path.resolve(process.env.SIM_DB_PATH || path.join(__dirname, "../data/sim-dev.db"));

const app = express();
const SIM_CORS_ORIGINS = (process.env.SIM_CORS_ORIGINS || process.env.WEBMC_CORS_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: SIM_CORS_ORIGINS.length ? SIM_CORS_ORIGINS : false, credentials: true }));
app.use(express.json({ limit: "25mb" }));

// ---------- sim-dev database (sql.js, own file) ----------
let devDb = null;
let devDbDirty = false;

function saveDevDb() {
  if (!devDb || !devDbDirty) return;
  try { atomicWriteFileSync(DEV_DB_PATH, Buffer.from(devDb.export())); devDbDirty = false; } catch (e) { console.error("[SIM] saveDevDb failed:", e); }
}

async function getDevDb() {
  if (devDb) return devDb;
  const SQL = await initSqlJs();
  devDb = new SQL.Database(fs.existsSync(DEV_DB_PATH) ? fs.readFileSync(DEV_DB_PATH) : new Uint8Array(0));
  devDb.run(`
    CREATE TABLE IF NOT EXISTS sim_scenes(
      id TEXT PRIMARY KEY, ts TEXT, name TEXT NOT NULL, seed TEXT NOT NULL, body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sim_stamps(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, scene_id TEXT,
      catalog_id TEXT, anchor TEXT, params TEXT, bounds TEXT, pre_diff TEXT
    );
    CREATE TABLE IF NOT EXISTS sim_admin_log(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT, detail TEXT
    );
    CREATE TABLE IF NOT EXISTS sim_run_results(
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, suite TEXT, result TEXT
    );
  `);
  devDbDirty = true;
  saveDevDb();
  console.log("[SIM] dev DB ready");
  return devDb;
}

function q(db, sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally { stmt.free(); }
}

function run(db, sql, params = []) {
  db.run(sql, params);
  devDbDirty = true;
}

// ---------- admin auth: proxy cookie → live game server /api/auth/me ----------
function requireSimAdmin(req, res, next) {
  const cookie = req.headers.cookie || "";
  const tokenCand = req.headers["x-sim-token"];
  // Token path is only honored if the env token exists.
  if (process.env.SIM_TOKEN && tokenCand === process.env.SIM_TOKEN) { next(); return; }
  if (!cookie) { res.status(401).json({ error: "Sim access requires an admin session" }); return; }

  const req2 = http.request(`${GAME_API}/api/auth/me`, { headers: { cookie }, method: "GET" }, (r2) => {
    let body = "";
    r2.on("data", (d) => { body += d; });
    r2.on("end", () => {
      try {
        const j = JSON.parse(body);
        if (j && j.user && j.user.username === ADMIN_USER) { next(); return; }
        res.status(401).json({ error: "Not the sim admin" });
      } catch {
        res.status(401).json({ error: "Auth proxy failed" });
      }
    });
  });
  req2.on("error", () => res.status(503).json({ error: "Game API unreachable" }));
  req2.setTimeout(3000, () => req2.destroy());
  req2.end();
}

function audit(actor, action, detail = {}) {
  getDevDb().then((db) => {
    run(db, "INSERT INTO sim_admin_log (ts, actor, action, detail) VALUES (?, ?, ?, ?)",
      [new Date().toISOString(), actor, action, JSON.stringify(detail)]);
    saveDevDb();
  }).catch(() => {});
}

// ---------- routes ----------
app.get("/api/sim/access", (req, res) => {
  // Session check against the game auth API; a 200 unlocks the deck.
  const cookie = req.headers.cookie || "";
  if (process.env.SIM_TOKEN && req.headers["x-sim-token"] === process.env.SIM_TOKEN) {
    return res.json({ allowed: true, username: ADMIN_USER });
  }
  const req2 = http.request(`${GAME_API}/api/auth/me`, { headers: { cookie }, method: "GET" }, (r2) => {
    let body = "";
    r2.on("data", (d) => { body += d; });
    r2.on("end", () => {
      try {
        const j = JSON.parse(body);
        if (j && j.user && j.user.username === ADMIN_USER) return res.json({ allowed: true, username: ADMIN_USER });
        res.status(401).json({ allowed: false });
      } catch { res.status(401).json({ allowed: false }); }
    });
  });
  req2.on("error", () => res.status(503).json({ allowed: false, error: "Game API unreachable" }));
  req2.setTimeout(3000, () => req2.destroy());
  req2.end();
});

app.get("/api/sim/health", (req, res) => {
  res.json({ ok: true });
});

// AI Asset Studio & Palette Bridge (Phase 2)
app.get("/api/ai/palette", async (req, res) => {
  try {
    const { getBuildPalette } = await import("./ai-bridge.js");
    res.json(getBuildPalette());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch build palette" });
  }
});

app.post("/api/ai/asset", async (req, res) => {
  try {
    const { analyzeAssetImages } = await import("./ai-bridge.js");
    const result = await analyzeAssetImages(req.body || {});
    res.json(result);
  } catch (err) {
    console.error("[POST /api/ai/asset] error:", err);
    res.status(500).json({ error: "Failed to analyze asset images" });
  }
});

app.post("/api/ai/package", async (req, res) => {
  try {
    const { createScenePackageAndPrompt } = await import("./ai-bridge.js");
    const result = await createScenePackageAndPrompt(req.body || {});
    res.json(result);
  } catch (err) {
    console.error("[POST /api/ai/package] error:", err);
    res.status(500).json({ error: "Failed to create scene package and prompt" });
  }
});

app.get("/api/ai/packages", async (req, res) => {
  try {
    const { listScenePackages } = await import("./ai-bridge.js");
    res.json({ packages: listScenePackages() });
  } catch (err) {
    console.error("[GET /api/ai/packages] error:", err);
    res.status(500).json({ error: "Failed to list scene packages" });
  }
});

app.use("/api/sim", requireSimAdmin);

app.get("/api/sim/catalog-meta", async (req, res) => {
  const db = await getDevDb();
  const scenes = q(db, "SELECT id, ts, name, seed, length(body) AS bytes FROM sim_scenes ORDER BY ts DESC LIMIT 50");
  res.json({ ok: true, admin: ADMIN_USER, scenes });
});

app.get("/api/sim/scenes", async (req, res) => {
  const db = await getDevDb();
  res.json({ scenes: q(db, "SELECT id, ts, name, seed, length(body) AS bytes FROM sim_scenes ORDER BY ts DESC LIMIT 100") });
});

app.get("/api/sim/scenes/:id", async (req, res) => {
  const db = await getDevDb();
  const rows = q(db, "SELECT * FROM sim_scenes WHERE id = ?", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

app.post("/api/sim/scenes", async (req, res) => {
  const { id, name, seed, body } = req.body || {};
  if (!id || typeof body !== "string") return res.status(400).json({ error: "id + body string required" });
  const db = await getDevDb();
  run(db, "INSERT OR REPLACE INTO sim_scenes (id, ts, name, seed, body) VALUES (?, ?, ?, ?, ?)",
    [id, new Date().toISOString(), name || "scene", seed || "sim:default", body]);
  saveDevDb();
  audit(ADMIN_USER, "scene.save", { id, bytes: body.length });
  res.json({ ok: true });
});

app.delete("/api/sim/scenes/:id", async (req, res) => {
  const db = await getDevDb();
  run(db, "DELETE FROM sim_scenes WHERE id = ?", [req.params.id]);
  saveDevDb();
  audit(ADMIN_USER, "scene.delete", { id: req.params.id });
  res.json({ ok: true });
});

app.post("/api/sim/stamp", async (req, res) => {
  const { catalogId, anchor, params, bounds, preDiff, sceneId } = req.body || {};
  const db = await getDevDb();
  run(db, "INSERT INTO sim_stamps (ts, scene_id, catalog_id, anchor, params, bounds, pre_diff) VALUES (?,?,?,?,?,?,?)",
    [new Date().toISOString(), sceneId || null, catalogId || "?", JSON.stringify(anchor || {}),
      JSON.stringify(params || {}), JSON.stringify(bounds || {}), JSON.stringify(preDiff || [])]);
  saveDevDb();
  audit(ADMIN_USER, "stamp", { catalogId, voxels: (preDiff || []).length });
  res.json({ ok: true });
});

app.post("/api/sim/run", async (req, res) => {
  const { suite, result } = req.body || {};
  const db = await getDevDb();
  run(db, "INSERT INTO sim_run_results (ts, suite, result) VALUES (?, ?, ?)",
    [new Date().toISOString(), suite || "?", JSON.stringify(result || {})]);
  saveDevDb();
  res.json({ ok: true });
});

app.get("/api/sim/logs", async (req, res) => {
  const db = await getDevDb();
  res.json({ logs: q(db, "SELECT * FROM sim_admin_log ORDER BY id DESC LIMIT 100") });
});

app.post("/api/sim/migrate", async (req, res) => {
  const { sceneId, dryRun = true } = req.body || {};
  res.json({ ok: true, dryRun, note: "Migration CLI is the Part 4 deliverable; POST is honored only to record intent.", sceneId });
});

// ---------- boot ----------
const server = http.createServer(app);
server.listen(PORT, "127.0.0.1", async () => {
  console.log(`[SIM] Sim Server on http://127.0.0.1:${PORT}`);
  console.log("[SIM] dev DB isolated from production.");
  await getDevDb().catch((e) => console.error("[SIM] dev db init error:", e));
});
