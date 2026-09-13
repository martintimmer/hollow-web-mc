import express from "express";
import http from "http";
import cors from "cors";
import fs from "fs";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { getDb, saveDb } from "./db.js";
import { getWorldgenDb, saveWorldgenDb, saveWorldgenDbSync } from "./worldgen-db.js";
import { getCustomDb, saveCustomDb, migrateCustomObjectsFromGameDb } from "./custom-db.js";
import { listBlueprints, getBlueprint, saveBlueprint, deleteBlueprint } from "./blueprints.js";
import { listCustomAssets, getCustomAsset, saveCustomAsset, deleteCustomAsset, migrateCustomAssets, updateCustomAssetData } from "./customAssets.js";
import { DATA_VERSION, GEN_VERSION, BIOME_VERSION } from "./worldVersions.js";

const PORT = Number(process.env.WEBMC_PORT || process.env.PORT || 5401);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = path.resolve(process.env.WEBMC_SNAPSHOTS_DIR || path.join(__dirname, "../snapshots"));
const ARTIFACT_IMG_DIR = path.resolve(process.env.WEBMC_ARTIFACT_DIR || path.join(__dirname, "../data/artifacts"));
try {
  if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_IMG_DIR)) fs.mkdirSync(ARTIFACT_IMG_DIR, { recursive: true });
} catch (e) {}

const app = express();
const CORS_ORIGINS = (process.env.WEBMC_CORS_ORIGINS || "")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: CORS_ORIGINS.length ? CORS_ORIGINS : false, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "200mb" }));
app.use(express.raw({ type: "image/*", limit: "50mb" }));
app.use(express.text({ type: ["text/*", "application/x-www-form-urlencoded"], limit: "1mb" }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Cross-instance sync secret (dev <-> prod texture/asset relay).
const RELAY_SECRET = process.env.WEBMC_RELAY_SECRET || "";
if (!RELAY_SECRET) console.warn("[relay] WEBMC_RELAY_SECRET not set — cross-instance sync disabled.");
function isRelayRequest(req) {
  return !!RELAY_SECRET && req.headers["x-relayed"] === "1" && req.headers["x-relay-secret"] === RELAY_SECRET;
}

// Mutating API routes require a session (or a valid relay secret for peer sync).
// Auth/debug/worldgen tooling stay open.
const AUTH_EXEMPT_PREFIXES = ["/api/auth/", "/api/debug/", "/api/worldgen/"];
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (AUTH_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();
  if (isRelayRequest(req)) return next();
  if (!getAuthUserId(req)) return res.status(401).json({ error: "Authentication required" });
  next();
});

// Password hashing: scrypt with per-user salt. Legacy unsalted sha256 still
// verifies once and is upgraded transparently on the next successful login.
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
function hashPassword(pwd) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pwd ?? ""), salt, 32, SCRYPT_PARAMS);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
function verifyPassword(pwd, stored) {
  if (typeof stored === "string" && stored.startsWith("scrypt$")) {
    const [, saltHex, keyHex] = stored.split("$");
    try {
      const key = crypto.scryptSync(String(pwd ?? ""), Buffer.from(saltHex, "hex"), 32, SCRYPT_PARAMS);
      return crypto.timingSafeEqual(key, Buffer.from(keyHex, "hex"));
    } catch { return false; }
  }
  const legacy = crypto.createHash("sha256").update(String(pwd ?? "")).digest("hex");
  return stored === legacy;
}
function sessionCookie(req, userId, maxAge = 2592000) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `mc_session=${userId}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

// In-memory WebSocket room tracking
// roomName -> Set of WebSocket clients
const rooms = new Map();
// ws -> { userId, username, worldId, x, y, z, yaw, pitch, skinColor, slotItem }
const clientMeta = new Map();

function broadcastToRoom(roomName, data, excludeWs = null) {
  const clients = rooms.get(roomName);
  if (!clients) return;
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ==========================================
// 1. AUTHENTICATION REST API
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  const { username, password, skinColor } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const cleanName = username.trim();
  const db = await getDb();

  try {
    const existing = db.exec("SELECT id FROM users WHERE username = ?", [cleanName]);
    if (existing.length && existing[0].values.length) {
      return res.status(409).json({ error: "Username already exists. Please choose another name or login." });
    }

    const userId = "usr_" + crypto.randomBytes(6).toString("hex");
    const now = new Date().toISOString();
    const hash = hashPassword(password);
    const skin = skinColor || "#e0913a";

    db.run(
      "INSERT INTO users (id, username, password_hash, skin_color, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, cleanName, hash, skin, now, now]
    );
    saveDb();

    res.json({
      success: true,
      user: { id: userId, username: cleanName, skinColor: skin }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// Helper to extract the authenticated user from the session cookie.
function getAuthUserId(req) {
  const match = req.headers.cookie ? req.headers.cookie.match(/mc_session=([^;]+)/) : null;
  return match ? match[1] : "";
}

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const cleanName = username.trim();
  const db = await getDb();

  try {
    const result = db.exec("SELECT id, username, skin_color, password_hash FROM users WHERE username = ?", [cleanName]);

    if (!result.length || !result[0].values.length) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const [id, uname, skin, storedHash] = result[0].values[0];
    if (!verifyPassword(password, storedHash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    if (!String(storedHash).startsWith("scrypt$")) {
      db.run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(password), id]);
    }

    const now = new Date().toISOString();
    db.run("UPDATE users SET last_login = ? WHERE id = ?", [now, id]);
    saveDb();

    // Fetch user preferences from SQLite
    const prefRes = db.exec(
      "SELECT render_distance, vibrance, brightness, contrast, fov, shadows, auto_step, max_fps, dof, dof_strength, ca, ca_strength, color_gamut, bokeh, specular, specular_strength, quality_preset, weather, shadow_tier, touch_controls, exposure_model FROM user_preferences WHERE user_id = ?",
      [id]
    );
    let preferences = {
      renderDistance: 8,
      vibrance: 140,
      brightness: 105,
      contrast: 105,
      fov: 70,
      shadows: true,
      autoStep: false,
      maxFps: 0,
      dof: false,
      dofStrength: 40,
      ca: false,
      caStrength: 25,
      colorGamut: "display-p3",
      bokeh: false,
      specular: false,
      specularStrength: 60,
      qualityPreset: "balanced",
      shadowTier: "detailed",
      weather: "cloudy",
      touchControls: false,
      exposureModel: "legacy-sim"
    };
    if (prefRes.length && prefRes[0].values.length) {
      const [rd, vib, br, ct, fv, sh, as, mf, df, dfs, cf, cfs, cg, bk, sp, sps, qp, wthr, st, tc, em] = prefRes[0].values[0];
      preferences = {
        renderDistance: rd,
        vibrance: vib,
        brightness: br,
        contrast: ct,
        fov: fv || 70,
        shadows: !!sh,
        autoStep: !!as,
        maxFps: mf,
        dof: !!df,
        dofStrength: dfs ?? 40,
        ca: !!cf,
        caStrength: cfs ?? 25,
        colorGamut: cg || "display-p3",
        bokeh: !!bk,
        specular: !!sp,
        specularStrength: sps ?? 60,
        qualityPreset: qp || "balanced",
        shadowTier: st || "detailed",
        touchControls: !!tc,
        weather: wthr || "cloudy",
        exposureModel: em === "iso-ettl" ? "iso-ettl" : "legacy-sim"
      };
    }

    res.setHeader("Set-Cookie", sessionCookie(req, id));

    res.json({
      success: true,
      user: { id, username: uname, skinColor: skin },
      preferences
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const db = await getDb();
  try {
    const result = db.exec("SELECT id, username, skin_color FROM users WHERE id = ?", [userId]);
    if (!result.length || !result[0].values.length) {
      return res.status(404).json({ error: "User not found" });
    }
    const [id, username, skinColor] = result[0].values[0];

    const prefRes = db.exec(
      "SELECT render_distance, vibrance, brightness, contrast, fov, shadows, auto_step, max_fps, dof, dof_strength, ca, ca_strength, color_gamut, bokeh, specular, specular_strength, quality_preset, weather, shadow_tier, touch_controls, exposure_model FROM user_preferences WHERE user_id = ?",
      [id]
    );
    let preferences = {
      renderDistance: 8,
      vibrance: 140,
      brightness: 105,
      contrast: 105,
      fov: 70,
      shadows: true,
      autoStep: false,
      maxFps: 0,
      dof: false,
      dofStrength: 40,
      ca: false,
      caStrength: 25,
      colorGamut: "display-p3",
      bokeh: false,
      specular: false,
      specularStrength: 60,
      qualityPreset: "balanced",
      shadowTier: "detailed",
      weather: "cloudy",
      touchControls: false,
      exposureModel: "legacy-sim"
    };
    if (prefRes.length && prefRes[0].values.length) {
      const [rd, vib, br, ct, fv, sh, as, mf, df, dfs, cf, cfs, cg, bk, sp, sps, qp, wthr, st, tc, em] = prefRes[0].values[0];
      preferences = {
        renderDistance: rd,
        vibrance: vib,
        brightness: br,
        contrast: ct,
        fov: fv || 70,
        shadows: !!sh,
        autoStep: !!as,
        maxFps: mf,
        dof: !!df,
        dofStrength: dfs ?? 40,
        ca: !!cf,
        caStrength: cfs ?? 25,
        colorGamut: cg || "display-p3",
        bokeh: !!bk,
        specular: !!sp,
        specularStrength: sps ?? 60,
        qualityPreset: qp || "balanced",
        shadowTier: st || "detailed",
        touchControls: !!tc,
        weather: wthr || "cloudy",
        exposureModel: em === "iso-ettl" ? "iso-ettl" : "legacy-sim"
      };
    }

    res.json({ user: { id, username, skinColor }, preferences });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
  res.json({ success: true });
});

// ==========================================
// 2. WORLDS & MAPS REST API
// ==========================================

app.get("/api/worlds", async (req, res) => {
  const userId = getAuthUserId(req);
  const db = await getDb();

  try {
    const result = db.exec(
      "SELECT id, name, owner_id, is_public, seed, seed_text, world_type, world_time, day_count, created_at, last_played, gen_version, biome_version, data_version FROM worlds ORDER BY last_played DESC"
    );

    const worlds = [];
    if (result.length && result[0].values.length) {
      for (const row of result[0].values) {
        const [id, name, owner_id, is_public, seed, seed_text, world_type, world_time, day_count, created_at, last_played, gen_version, biome_version, data_version] = row;
        
        // Count active online players in this world room
        const roomName = `world:${id}`;
        const activeCount = rooms.has(roomName) ? rooms.get(roomName).size : 0;

        worlds.push({
          id,
          name,
          ownerId: owner_id,
          isPublic: !!is_public,
          seed,
          seedText: seed_text,
          worldType: world_type,
          worldTime: world_time,
          dayCount: day_count ?? 0,
          createdAt: created_at,
          lastPlayed: last_played,
          genVersion: gen_version ?? 1,
          biomeVersion: biome_version ?? 1,
          dataVersion: data_version ?? 1,
          onlinePlayers: activeCount,
          isOwner: owner_id === userId
        });
      }
    }

    res.json({ worlds });
  } catch (err) {
    console.error("Fetch worlds error:", err);
    res.status(500).json({ error: "Failed to fetch worlds" });
  }
});

app.post("/api/worlds", async (req, res) => {
  const userId = getAuthUserId(req);
  const { name, seedText, worldType, isPublic } = req.body;

  if (!name) return res.status(400).json({ error: "World name is required" });

  const db = await getDb();
  try {
    const worldId = "wld_" + crypto.randomBytes(6).toString("hex");
    const sText = (seedText || "hollowpine").trim();
    
    // Java-compatible hash for seed integer
    let seedInt = 0;
    for (let i = 0; i < sText.length; i++) {
      seedInt = (Math.imul(31, seedInt) + sText.charCodeAt(i)) | 0;
    }
    seedInt = Math.abs(seedInt) || 123456;

    const wType = "standard";
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO worlds (id, name, owner_id, is_public, seed, seed_text, world_type, world_time, created_at, last_played, gen_version, biome_version, data_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [worldId, name.trim(), userId, isPublic !== false ? 1 : 0, seedInt, sText, wType, 6000, now, now, GEN_VERSION, BIOME_VERSION, DATA_VERSION]
    );
    saveDb();

    res.json({
      success: true,
      world: {
        id: worldId,
        name: name.trim(),
        ownerId: userId,
        seed: seedInt,
        seedText: sText,
        worldType: wType,
        worldTime: 6000,
        createdAt: now,
        lastPlayed: now,
        genVersion: GEN_VERSION,
        biomeVersion: BIOME_VERSION,
        dataVersion: DATA_VERSION,
        isPublic: true,
        onlinePlayers: 0
      }
    });
  } catch (err) {
    console.error("Create world error:", err);
    res.status(500).json({ error: "Failed to create world" });
  }
});

app.delete("/api/worlds/:id", async (req, res) => {
  const worldId = req.params.id;
  const userId = getAuthUserId(req);

  if (worldId === "wld_default") {
    return res.status(400).json({ error: "Cannot delete the default spawn world" });
  }

  const db = await getDb();
  try {
    db.run("DELETE FROM worlds WHERE id = ?", [worldId]);
    db.run("DELETE FROM world_blocks WHERE world_id = ? OR world_id = ?", [worldId, `${worldId}_nether`]);
    db.run("DELETE FROM world_chests WHERE world_id = ? OR world_id = ?", [worldId, `${worldId}_nether`]);
    db.run("DELETE FROM world_boats WHERE world_id = ? OR world_id = ?", [worldId, `${worldId}_nether`]);
    db.run("DELETE FROM player_state WHERE world_id = ? OR world_id = ?", [worldId, `${worldId}_nether`]);
    db.run("DELETE FROM block_edits_log WHERE world_id = ? OR world_id = ?", [worldId, `${worldId}_nether`]);
    saveDb();

    res.json({ success: true, deletedId: worldId });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete world" });
  }
});

// Join world: returns world details, player state, and all modified blocks
app.post("/api/worlds/:id/join", async (req, res) => {
  const worldId = req.params.id;
  const userId = getAuthUserId(req) || "guest";
  const db = await getDb();

  try {
    const isNether = worldId.endsWith("_nether");
    const baseWorldId = isNether ? worldId.replace(/_nether$/, "") : worldId;
    const worldRes = db.exec("SELECT id, name, owner_id, seed, seed_text, world_type, world_time, day_count, gen_version, biome_version, data_version FROM worlds WHERE id = ?", [baseWorldId]);
    if (!worldRes.length || !worldRes[0].values.length) {
      return res.status(404).json({ error: "World not found" });
    }

    const [id, baseName, ownerId, seed, seedText, baseWorldType, worldTime, dayCount, gen_version, biome_version, data_version] = worldRes[0].values[0];
    const name = isNether ? `${baseName} (Nether)` : baseName;
    const worldType = isNether ? "nether" : baseWorldType;

    // Fetch player state for this user in this world
    const stateKey = `${worldId}:${userId}`;
    let playerRes = db.exec(
      "SELECT pos_x, pos_y, pos_z, yaw, pitch, flying, game_mode, hotbar, active_slot, inventory FROM player_state WHERE id = ?",
      [stateKey]
    );
    if (!playerRes.length || !playerRes[0].values.length) {
      playerRes = db.exec(
        "SELECT pos_x, pos_y, pos_z, yaw, pitch, flying, game_mode, hotbar, active_slot, inventory FROM player_state WHERE world_id = ? ORDER BY last_online DESC LIMIT 1",
        [worldId]
      );
    }

    let playerState = null;
    if (playerRes.length && playerRes[0].values.length) {
      const [pos_x, pos_y, pos_z, yaw, pitch, flying, game_mode, hotbarJson, active_slot, inventoryJson] = playerRes[0].values[0];
      playerState = {
        x: pos_x,
        y: pos_y,
        z: pos_z,
        yaw,
        pitch,
        flying: !!flying,
        gameMode: game_mode,
        hotbar: JSON.parse(hotbarJson || "[]"),
        activeSlot: active_slot,
        inventory: JSON.parse(inventoryJson || "[]")
      };
    }

    // Fetch all modified blocks and their directions/rotations for this world
    const blocksRes = db.exec("SELECT x, y, z, block_id, dir FROM world_blocks WHERE world_id = ?", [worldId]);
    const blockEdits = {};
    const blockDirs = {};
    if (blocksRes.length && blocksRes[0].values.length) {
      for (const [x, y, z, blockId, dir] of blocksRes[0].values) {
        const key = `${x},${y},${z}`;
        blockEdits[key] = blockId;
        if (typeof dir === "number") {
          blockDirs[key] = dir;
        }
      }
    }

    // Fetch all chest contents for this world (key `${x},${y},${z}` → 27 slots)
    const chestsRes = db.exec("SELECT x, y, z, slots FROM world_chests WHERE world_id = ?", [worldId]);
    const chests = {};
    if (chestsRes.length && chestsRes[0].values.length) {
      for (const [x, y, z, slotsJson] of chestsRes[0].values) {
        try {
          chests[`${x},${y},${z}`] = JSON.parse(slotsJson || "[]");
        } catch (e) {
          chests[`${x},${y},${z}`] = [];
        }
      }
    }

    // Fetch all persisted animals (pets + wildlife) for this world
    const animalsRes = db.exec("SELECT id, type, name, sex, owner_id, x, y, z, yaw FROM world_animals WHERE world_id = ?", [worldId]);
    const animals = [];
    if (animalsRes.length && animalsRes[0].values.length) {
      for (const [aid, atype, aname, asex, aowner, ax, ay, az, ayaw] of animalsRes[0].values) {
        animals.push({ id: aid, type: atype, name: aname || null, sex: asex, ownerId: aowner || null, x: ax, y: ay, z: az, yaw: ayaw });
      }
    }

    // Fetch all persisted boats for this world
    const boatsRes = db.exec("SELECT id, item_id, x, y, z, yaw FROM world_boats WHERE world_id = ?", [worldId]);
    const boats = [];
    if (boatsRes.length && boatsRes[0].values.length) {
      for (const [bid, bitem, bx, by, bz, byaw] of boatsRes[0].values) {
        boats.push({ id: bid, itemId: bitem, x: bx, y: by, z: bz, yaw: byaw });
      }
    }

    // Fetch persisted villager trade ledgers for this world (vkey → day/offers/uses/purse)
    const tradesRes = db.exec("SELECT vkey, trade_day, offers_json, uses_json, purse_json FROM villager_trades WHERE world_id = ?", [worldId]);
    const trades = {};
    if (tradesRes.length && tradesRes[0].values.length) {
      for (const [vkey, trade_day, offersJson, usesJson, purseJson] of tradesRes[0].values) {
        try {
          trades[vkey] = {
            tradeDay: trade_day,
            offers: JSON.parse(offersJson || "[]"),
            uses: JSON.parse(usesJson || "[]"),
            purse: JSON.parse(purseJson || "{}")
          };
        } catch (e) {
          trades[vkey] = { tradeDay: 0, offers: [], uses: [], purse: {} };
        }
      }
    }

    // Fetch persisted wall paintings for this world (pkey `${x},${y},${z}` → spot)
    const paintingsRes = db.exec("SELECT x, y, z, nx, nz, variant FROM world_paintings WHERE world_id = ?", [worldId]);
    const paintings = {};
    if (paintingsRes.length && paintingsRes[0].values.length) {
      for (const [px, py, pz, pnx, pnz, variant] of paintingsRes[0].values) {
        paintings[`${px},${py},${pz}`] = { x: px, y: py, z: pz, nx: pnx, nz: pnz, variant };
      }
    }

    // Update world last_played
    db.run("UPDATE worlds SET last_played = ? WHERE id = ?", [new Date().toISOString(), worldId]);
    saveDb();

    res.json({
      world: { id, name, ownerId, seed, seedText, worldType, worldTime, dayCount: dayCount ?? 0, genVersion: gen_version ?? 1, biomeVersion: biome_version ?? 1, dataVersion: data_version ?? 1 },
      playerState,
      blockEdits,
      blockDirs,
      chests,
      animals,
      boats,
      trades,
      paintings
    });
  } catch (err) {
    console.error("Join world error:", err);
    res.status(500).json({ error: "Failed to join world" });
  }
});

// Save boats — merge by id plus explicit removals (broken boats must vanish).
app.post("/api/worlds/:id/boats", async (req, res) => {
  const worldId = req.params.id;
  const { boats, removed } = req.body;

  const db = await getDb();
  try {
    if (boats !== undefined && !Array.isArray(boats)) return res.status(400).json({ error: "boats array is required" });
    if (removed !== undefined && !Array.isArray(removed)) return res.status(400).json({ error: "removed array is required" });
    const now = new Date().toISOString();
    db.run("BEGIN TRANSACTION");
    for (const b of (boats || []).slice(0, 100)) {
      if (!b || typeof b.x !== "number" || typeof b.y !== "number" || typeof b.z !== "number") continue;
      const itemId = Number.isInteger(b.itemId) && b.itemId > 0 ? b.itemId : 1041;
      db.run(
        `INSERT INTO world_boats (id, world_id, item_id, x, y, z, yaw, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           world_id = excluded.world_id,
           item_id = excluded.item_id,
           x = excluded.x,
           y = excluded.y,
           z = excluded.z,
           yaw = excluded.yaw,
           updated_at = excluded.updated_at`,
        [
          String(b.id || `${worldId}_${Math.random().toString(36).slice(2, 10)}`),
          worldId, itemId, b.x, b.y, b.z, b.yaw || 0, now
        ]
      );
    }
    for (const rid of (removed || []).slice(0, 100)) {
      db.run("DELETE FROM world_boats WHERE id = ? AND world_id = ?", [String(rid), worldId]);
    }
    db.run("COMMIT");
    saveDb();
    res.json({ success: true, count: (boats || []).length, removed: (removed || []).length, savedAt: now });
  } catch (err) {
    try { db.run("ROLLBACK"); } catch {}
    console.error("Save boats error:", err);
    res.status(500).json({ error: "Failed to save boats" });
  }
});

// Save animals (pets + wildlife) — merge by id so a partial or transiently-empty
// snapshot can never delete rows another snapshot owns (pets survive portal trips).
app.post("/api/worlds/:id/animals", async (req, res) => {
  const worldId = req.params.id;
  const { animals } = req.body;

  const db = await getDb();
  try {
    if (!Array.isArray(animals)) return res.status(400).json({ error: "animals array is required" });
    const now = new Date().toISOString();
    db.run("BEGIN TRANSACTION");
    for (const a of animals.slice(0, 200)) {
      if (!a || typeof a.x !== "number" || !a.type) continue;
      db.run(
        `INSERT INTO world_animals (id, world_id, type, name, sex, owner_id, x, y, z, yaw, updated_at, data_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           world_id = excluded.world_id,
           type = excluded.type,
           name = excluded.name,
           sex = excluded.sex,
           owner_id = excluded.owner_id,
           x = excluded.x,
           y = excluded.y,
           z = excluded.z,
           yaw = excluded.yaw,
           data_version = excluded.data_version,
           updated_at = excluded.updated_at`,
        [
          String(a.id || `${worldId}_${Math.random().toString(36).slice(2, 10)}`),
          worldId,
          String(a.type),
          a.name ? String(a.name).slice(0, 40) : null,
          a.sex === "male" ? "male" : "female",
          a.ownerId ? String(a.ownerId) : null,
          a.x, a.y, a.z, a.yaw || 0, now, DATA_VERSION
        ]
      );
    }
    db.run("COMMIT");
    saveDb();
    res.json({ success: true, count: animals.length, savedAt: now });
  } catch (err) {
    try { db.run("ROLLBACK"); } catch {}
    console.error("Save animals error:", err);
    res.status(500).json({ error: "Failed to save animals" });
  }
});

// Save player position, hotbar, and world celestial time
app.post("/api/worlds/:id/state", async (req, res) => {
  const worldId = req.params.id;
  const userId = getAuthUserId(req) || "guest";
  const { x, y, z, yaw, pitch, flying, gameMode, hotbar, activeSlot, worldTime, dayCount, inventory } = req.body;

  const db = await getDb();
  try {
    const stateKey = `${worldId}:${userId}`;
    const now = new Date().toISOString();
    const hotbarJson = JSON.stringify(hotbar || [1, 2, 5, 6, 17, 16, 37, 46, 35, 50]);
    const inventoryJson = JSON.stringify(inventory || []);

    db.run(
      `INSERT INTO player_state (id, world_id, user_id, pos_x, pos_y, pos_z, yaw, pitch, flying, game_mode, hotbar, active_slot, inventory, last_online)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         pos_x = excluded.pos_x,
         pos_y = excluded.pos_y,
         pos_z = excluded.pos_z,
         yaw = excluded.yaw,
         pitch = excluded.pitch,
         flying = excluded.flying,
         game_mode = excluded.game_mode,
         hotbar = excluded.hotbar,
         active_slot = excluded.active_slot,
         inventory = excluded.inventory,
         last_online = excluded.last_online`,
      [
        stateKey, worldId, userId,
        x || 0, y || 15, z || 0,
        yaw || 0, pitch || 0,
        flying ? 1 : 0,
        gameMode || "creative",
        hotbarJson,
        activeSlot || 0,
        inventoryJson,
        now
      ]
    );

    if (worldTime !== undefined) {
      db.run("UPDATE worlds SET world_time = ?, last_played = ? WHERE id = ?", [worldTime, now, worldId]);
    }
    if (Number.isInteger(dayCount) && dayCount >= 0) {
      db.run("UPDATE worlds SET day_count = ?, last_played = ? WHERE id = ?", [dayCount, now, worldId]);
    }

    saveDb();
    res.json({ success: true, savedAt: now });
  } catch (err) {
    console.error("Save state error:", err);
    res.status(500).json({ error: "Failed to save player state" });
  }
});

// Save batch block modifications and append to block_edits_log
app.post("/api/worlds/:id/blocks", async (req, res) => {
  const worldId = req.params.id;
  const userId = getAuthUserId(req);
  const { edits } = req.body; // Array of { x, y, z, blockId, prevBlockId, action }

  if (!edits || !Array.isArray(edits)) {
    return res.status(400).json({ error: "edits array is required" });
  }

  const db = await getDb();
  const now = new Date().toISOString();

  try {
    for (const edit of edits) {
      const { x, y, z, blockId, dir = 0, prevBlockId = 0, action = "edit" } = edit;
      const coordKey = `${worldId}:${x},${y},${z}`;

      // Update world_blocks fast snapshot (with rotation/facing)
      db.run(
        `INSERT INTO world_blocks (coord_key, world_id, x, y, z, block_id, dir, updated_by, updated_at, data_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(coord_key) DO UPDATE SET
           block_id = excluded.block_id,
           dir = excluded.dir,
           updated_by = excluded.updated_by,
           data_version = excluded.data_version,
           updated_at = excluded.updated_at`,
        [coordKey, worldId, x, y, z, blockId, Number(dir) || 0, userId, now, DATA_VERSION]
      );

      // Append to immutable block_edits_log
      db.run(
        `INSERT INTO block_edits_log (world_id, user_id, x, y, z, prev_block_id, new_block_id, action, timestamp, data_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [worldId, userId, x, y, z, prevBlockId, blockId, action, now, DATA_VERSION]
      );
    }

    saveDb();
    res.json({ success: true, count: edits.length, timestamp: now });
  } catch (err) {
    console.error("Save blocks error:", err);
    res.status(500).json({ error: "Failed to save block edits" });
  }
});

// Save a single chest's 27-slot contents (upsert); empty-chest slot arrays are stored as-is
app.post("/api/worlds/:id/chests", async (req, res) => {
  const worldId = req.params.id;
  const userId = getAuthUserId(req) || "guest";
  const { x, y, z, slots } = req.body;

  const db = await getDb();
  try {
    if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number" || !Array.isArray(slots)) {
      return res.status(400).json({ error: "x, y, z (numbers) and slots (array) are required" });
    }
    const chestKey = `${worldId}:${x},${y},${z}`;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO world_chests (chest_key, world_id, x, y, z, slots, updated_by, updated_at, data_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(chest_key) DO UPDATE SET
         slots = excluded.slots,
         updated_by = excluded.updated_by,
         data_version = excluded.data_version,
         updated_at = excluded.updated_at`,
      [chestKey, worldId, x, y, z, JSON.stringify(slots), userId, now, DATA_VERSION]
    );
    saveDb();
    res.json({ success: true, key: `${x},${y},${z}` });
  } catch (err) {
    console.error("Save chest error:", err);
    res.status(500).json({ error: "Failed to save chest" });
  }
});

// Save one villager's trade ledger (day/offers/uses/purse), upsert by world+vkey.
app.post("/api/worlds/:id/trades", async (req, res) => {
  const worldId = req.params.id;
  const { vkey, tradeDay, offers, uses, purse } = req.body;

  const db = await getDb();
  try {
    if (typeof vkey !== "string" || !vkey || !Array.isArray(offers) || !Array.isArray(uses) || typeof purse !== "object" || !purse) {
      return res.status(400).json({ error: "vkey (string), offers/uses (arrays) and purse (object) are required" });
    }
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO villager_trades (vkey, world_id, trade_day, offers_json, uses_json, purse_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(vkey) DO UPDATE SET
         trade_day = excluded.trade_day,
         offers_json = excluded.offers_json,
         uses_json = excluded.uses_json,
         purse_json = excluded.purse_json,
         updated_at = excluded.updated_at`,
      [vkey, worldId, tradeDay | 0, JSON.stringify(offers).slice(0, 4000), JSON.stringify(uses).slice(0, 4000), JSON.stringify(purse).slice(0, 4000), now]
    );
    saveDb();
    res.json({ success: true, key: vkey });
  } catch (err) {
    console.error("Save villager trade error:", err);
    res.status(500).json({ error: "Failed to save villager trade" });
  }
});

// Save one wall painting (place), upsert by world+coord.
app.post("/api/worlds/:id/paintings", async (req, res) => {
  const worldId = req.params.id;
  const { x, y, z, nx, nz, variant, remove } = req.body;

  const db = await getDb();
  try {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return res.status(400).json({ error: "x, y, z (integers) are required" });
    }
    const pkey = `${worldId}:${x},${y},${z}`;
    const now = new Date().toISOString();
    if (remove) {
      db.run("DELETE FROM world_paintings WHERE pkey = ?", [pkey]);
    } else {
      if (typeof variant !== "string" || !variant || ![0, 1, -1].includes(nx) || ![0, 1, -1].includes(nz)) {
        return res.status(400).json({ error: "variant (string) and nx/nz (0|1|-1) are required" });
      }
      db.run(
        `INSERT INTO world_paintings (pkey, world_id, x, y, z, nx, nz, variant, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(pkey) DO UPDATE SET
           nx = excluded.nx,
           nz = excluded.nz,
           variant = excluded.variant,
           updated_at = excluded.updated_at`,
        [pkey, worldId, x, y, z, nx, nz, String(variant).slice(0, 64), now]
      );
    }
    saveDb();
    res.json({ success: true, key: `${x},${y},${z}` });
  } catch (err) {
    console.error("Save painting error:", err);
    res.status(500).json({ error: "Failed to save painting" });
  }
});

// Get chronological block modification audit log
app.get("/api/worlds/:id/logs", async (req, res) => {
  const worldId = req.params.id;
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const db = await getDb();

  try {
    const result = db.exec(
      "SELECT seq_id, user_id, x, y, z, prev_block_id, new_block_id, action, timestamp FROM block_edits_log WHERE world_id = ? ORDER BY seq_id DESC LIMIT ?",
      [worldId, limit]
    );

    const logs = [];
    if (result.length && result[0].values.length) {
      for (const row of result[0].values) {
        const [seq_id, user_id, x, y, z, prev_block_id, new_block_id, action, timestamp] = row;
        logs.push({
          seqId: seq_id,
          userId: user_id,
          x, y, z,
          prevBlockId: prev_block_id,
          newBlockId: new_block_id,
          action,
          timestamp
        });
      }
    }

    res.json({ worldId, logs });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch block logs" });
  }
});

// ==========================================
// 3. USER PREFERENCES REST API
// ==========================================

app.get("/api/preferences", async (req, res) => {
  const userId = getAuthUserId(req) || "guest";
  const db = await getDb();

  try {
    const result = db.exec(
      "SELECT render_distance, vibrance, brightness, contrast, fov, shadows, auto_step, max_fps, dof, dof_strength, ca, ca_strength, color_gamut, bokeh, specular, specular_strength, quality_preset, weather, shadow_tier, touch_controls, exposure_model FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    if (result.length && result[0].values.length) {
      const [render_distance, vibrance, brightness, contrast, fov, shadows, auto_step, max_fps, dof, dof_strength, ca, ca_strength, color_gamut, bokeh, specular, specular_strength, quality_preset, weather, shadow_tier, touch_controls, exposure_model] = result[0].values[0];
      return res.json({
        preferences: {
          renderDistance: render_distance,
          vibrance,
          brightness,
          contrast,
          fov: fov || 70,
          shadows: !!shadows,
          autoStep: !!auto_step,
          maxFps: max_fps,
          dof: !!dof,
          dofStrength: dof_strength ?? 40,
          ca: !!ca,
          caStrength: ca_strength ?? 25,
          colorGamut: color_gamut || "display-p3",
          bokeh: !!bokeh,
          specular: !!specular,
          specularStrength: specular_strength ?? 60,
          qualityPreset: quality_preset || "balanced",
          shadowTier: shadow_tier || "detailed",
          touchControls: !!touch_controls,
          weather: weather || "cloudy",
          exposureModel: exposure_model === "iso-ettl" ? "iso-ettl" : "legacy-sim"
        }
      });
    }

    res.json({
      preferences: {
        renderDistance: 8,
        vibrance: 140,
        brightness: 105,
        contrast: 105,
        fov: 70,
        shadows: true,
        autoStep: false,
        maxFps: 0,
        dof: false,
        dofStrength: 40,
        ca: false,
        caStrength: 25,
        colorGamut: "display-p3",
        bokeh: false,
        specular: false,
        specularStrength: 60,
        qualityPreset: "balanced",
        shadowTier: "detailed",
        weather: "cloudy",
      touchControls: false,
      exposureModel: "legacy-sim"
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

app.post("/api/preferences", async (req, res) => {
  const userId = getAuthUserId(req) || "guest";
  const { renderDistance, vibrance, brightness, contrast, fov, shadows, autoStep, maxFps, dof, dofStrength, ca, caStrength, colorGamut, bokeh, specular, specularStrength, qualityPreset, weather, shadowTier, touchControls, exposureModel } = req.body;
  const db = await getDb();

  try {
    db.run(
      `INSERT INTO user_preferences (user_id, render_distance, vibrance, brightness, contrast, fov, shadows, auto_step, max_fps, dof, dof_strength, ca, ca_strength, color_gamut, bokeh, specular, specular_strength, quality_preset, weather, shadow_tier, touch_controls, exposure_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         render_distance = excluded.render_distance,
         vibrance = excluded.vibrance,
         brightness = excluded.brightness,
         contrast = excluded.contrast,
         fov = excluded.fov,
         shadows = excluded.shadows,
         auto_step = excluded.auto_step,
         max_fps = excluded.max_fps,
         dof = excluded.dof,
         dof_strength = excluded.dof_strength,
         ca = excluded.ca,
         ca_strength = excluded.ca_strength,
         color_gamut = excluded.color_gamut,
         bokeh = excluded.bokeh,
         specular = excluded.specular,
         specular_strength = excluded.specular_strength,
         quality_preset = excluded.quality_preset,
         shadow_tier = excluded.shadow_tier,
          touch_controls = excluded.touch_controls,
          exposure_model = excluded.exposure_model,
          weather = excluded.weather`,
      [
        userId,
        renderDistance || 8,
        vibrance || 140,
        brightness || 105,
        contrast || 105,
        fov || 70,
        shadows !== false ? 1 : 0,
        autoStep ? 1 : 0,
        maxFps || 0,
        dof ? 1 : 0,
        dofStrength ?? 40,
        ca ? 1 : 0,
        caStrength ?? 25,
        colorGamut || "display-p3",
        bokeh ? 1 : 0,
        specular ? 1 : 0,
        specularStrength ?? 60,
        qualityPreset || "balanced",
        weather || "cloudy",
        shadowTier || "detailed",
        touchControls ? 1 : 0,
        exposureModel === "iso-ettl" ? "iso-ettl" : "legacy-sim"
      ]
    );
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

// ==========================================
// 3.3 USER SPAWN POINTS (per-user, per-world, server-persisted)
// ==========================================

function spawnRowToJson(row) {
  const [id, name, x, y, z, is_home, created_at] = row;
  return { id, name, x, y, z, isHome: !!is_home, createdAt: Date.parse(created_at) || Date.now() };
}

app.get("/api/spawns", async (req, res) => {
  const userId = getAuthUserId(req) || "guest";
  const worldId = String(req.query.worldId || "");
  const db = await getDb();
  try {
    const r = db.exec(
      "SELECT id, name, x, y, z, is_home, created_at FROM spawn_points WHERE user_id = ? AND world_id = ? ORDER BY created_at ASC",
      [userId, worldId]
    );
    res.json({ spawns: (r.length ? r[0].values : []).map(spawnRowToJson) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch spawns" });
  }
});

app.post("/api/spawns", async (req, res) => {
  const userId = getAuthUserId(req) || "guest";
  const { worldId, id, name, x, y, z, isHome } = req.body || {};
  if (!worldId || typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
    return res.status(400).json({ error: "worldId and numeric x, y, z are required" });
  }
  const clean = String(name || "Spawn").trim().slice(0, 24) || "Spawn";
  const db = await getDb();
  try {
    const own = db.exec("SELECT id FROM spawn_points WHERE id = ? AND user_id = ?", [String(id || ""), userId]);
    const isUpdate = own.length && own[0].values.length;
    if (!isUpdate) {
      const cnt = db.exec("SELECT COUNT(*) FROM spawn_points WHERE user_id = ? AND world_id = ?", [userId, worldId]);
      if ((cnt.length && cnt[0].values[0][0]) >= 20) {
        return res.status(400).json({ error: "Spawn limit reached (20 per world)" });
      }
    }
    const now = new Date().toISOString();
    const sid = isUpdate ? String(id) : ("sp_" + crypto.randomBytes(6).toString("hex"));
    db.run("BEGIN TRANSACTION");
    if (isHome) db.run("UPDATE spawn_points SET is_home = 0 WHERE user_id = ? AND world_id = ?", [userId, worldId]);
    db.run(
      `INSERT INTO spawn_points (id, user_id, world_id, name, x, y, z, is_home, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         x = excluded.x,
         y = excluded.y,
         z = excluded.z,
         is_home = excluded.is_home,
         updated_at = excluded.updated_at`,
      [sid, userId, String(worldId), clean, Math.floor(x), Math.floor(y), Math.floor(z), isHome ? 1 : 0, now, now]
    );
    const home = db.exec("SELECT id FROM spawn_points WHERE user_id = ? AND world_id = ? AND is_home = 1", [userId, worldId]);
    if (!home.length || !home[0].values.length) {
      db.run("UPDATE spawn_points SET is_home = 1 WHERE id = ?", [sid]);
    }
    db.run("COMMIT");
    saveDb();
    res.json({ success: true, id: sid });
  } catch (err) {
    try { db.run("ROLLBACK"); } catch {}
    res.status(500).json({ error: "Failed to save spawn" });
  }
});

app.patch("/api/spawns/:id", async (req, res) => {
  const userId = getAuthUserId(req) || "guest";
  const clean = String((req.body || {}).name || "").trim().slice(0, 24);
  if (!clean) return res.status(400).json({ error: "A non-empty name is required" });
  const db = await getDb();
  try {
    db.run("UPDATE spawn_points SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?", [clean, new Date().toISOString(), req.params.id, userId]);
    saveDb();
    res.json({ success: true, id: req.params.id, name: clean });
  } catch (err) {
    res.status(500).json({ error: "Failed to rename spawn" });
  }
});

app.delete("/api/spawns/:id", async (req, res) => {
  const userId = getAuthUserId(req) || "guest";
  const db = await getDb();
  try {
    db.run("BEGIN TRANSACTION");
    db.run("DELETE FROM spawn_points WHERE id = ? AND user_id = ?", [req.params.id, userId]);
    const home = db.exec("SELECT id FROM spawn_points WHERE user_id = ? AND is_home = 1 LIMIT 1", [userId]);
    if (!home.length || !home[0].values.length) {
      db.run("UPDATE spawn_points SET is_home = 1 WHERE id = (SELECT id FROM spawn_points WHERE user_id = ? ORDER BY created_at ASC LIMIT 1)", [userId]);
    }
    db.run("COMMIT");
    saveDb();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    try { db.run("ROLLBACK"); } catch {}
    res.status(500).json({ error: "Failed to delete spawn" });
  }
});

// ==========================================
// 3.4 CUSTOM BLUEPRINTS & WORLDGEN CATALOG
// ==========================================

app.get("/api/custom-assets", async (req, res) => {
  try {
    const db = await getCustomDb();
    res.json(listCustomAssets(db));
  } catch (err) {
    console.error("[GET /api/custom-assets] error:", err);
    res.status(500).json({ error: "Failed to fetch custom assets" });
  }
});

app.get("/api/custom-assets/:id", async (req, res) => {
  try {
    const db = await getCustomDb();
    const asset = getCustomAsset(db, req.params.id);
    if (!asset) return res.status(404).json({ error: "Custom asset not found" });
    res.json({ ...asset, dataBase64: undefined });
  } catch (err) {
    console.error("[GET /api/custom-assets/:id] error:", err);
    res.status(500).json({ error: "Failed to fetch custom asset" });
  }
});

app.post("/api/custom-assets", async (req, res) => {
  const authorId = getAuthUserId(req) || "guest_builder";
  try {
    const encodedMeta = req.headers["x-custom-asset-meta"];
    if (typeof encodedMeta !== "string") return res.status(400).json({ error: "Asset metadata is required" });
    const meta = JSON.parse(decodeURIComponent(encodedMeta));
    const db = await getCustomDb();
    const asset = await saveCustomAsset(db, {
      requestedId: Number(meta.requestedId),
      name: meta.name,
      prompt: meta.prompt,
      filename: meta.filename,
      mimeType: meta.mimeType,
      dimensions: meta.dimensions,
      triangles: meta.triangles,
      placement: meta.placement,
      data: req.body,
      authorId
    });
    saveCustomDb();
    res.json({ ok: true, asset: { ...asset, dataBase64: undefined }, nextId: listCustomAssets(db).nextId });
  } catch (err) {
    if (err?.code === "ID_CONFLICT") return res.status(409).json({ error: err.message, nextId: err.nextId });
    console.error("[POST /api/custom-assets] error:", err);
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.patch("/api/custom-assets/:id/placement", async (req, res) => {
  const authorId = getAuthUserId(req);
  if (!authorId) return res.status(401).json({ error: "Log in before saving an asset placement" });
  try {
    const db = await getCustomDb();
    const existing = getCustomAsset(db, req.params.id);
    if (!existing) return res.status(404).json({ error: "Custom asset not found" });
    const placement = req.body?.placement || {};
    const width = Number.isInteger(Number(placement.width)) && Number(placement.width) >= 1 && Number(placement.width) <= 6 ? Number(placement.width) : 1;
    const height = Number.isInteger(Number(placement.height)) && Number(placement.height) >= 1 && Number(placement.height) <= 6 ? Number(placement.height) : 1;
    const scale = Math.max(25, Math.min(100, Math.round(Number(placement.scale) || 100)));
    db.run("UPDATE custom_assets SET placement_width = ?, placement_height = ?, placement_scale = ? WHERE id = ?", [width, height, scale, Number(req.params.id)]);
    saveCustomDb();
    const asset = getCustomAsset(db, req.params.id);
    res.json({ ok: true, asset: { ...asset, dataBase64: undefined } });
  } catch (err) {
    console.error("[PATCH /api/custom-assets/:id/placement] error:", err);
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.put("/api/custom-assets/:id/data", async (req, res) => {
  try {
    const assetId = Number(req.params.id);
    if (!Number.isInteger(assetId) || assetId <= 0) return res.status(400).json({ error: "Invalid asset ID" });
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    if (!buffer || buffer.length === 0) return res.status(400).json({ error: "Empty model data" });
    const db = await getCustomDb();
    const existing = getCustomAsset(db, assetId);
    if (!existing) return res.status(404).json({ error: "Custom asset not found" });

    const updated = await updateCustomAssetData(db, assetId, buffer);
    saveCustomDb();

    // Cross-sync between dev and prod (requires WEBMC_RELAY_SECRET)
    if (RELAY_SECRET && !isRelayRequest(req)) {
      const myPort = String(process.env.WEBMC_PORT || 5401);
      const peerPort = myPort === "5402" ? 5401 : 5402;
      try {
        await fetch(`http://127.0.0.1:${peerPort}/api/custom-assets/${assetId}/data`, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream", "X-Relayed": "1", "X-Relay-Secret": RELAY_SECRET },
          body: buffer
        });
      } catch {}
    }

    res.json({ ok: true, id: assetId, assetType: updated.assetType, voxelBytes: updated.voxel ? Buffer.byteLength(JSON.stringify(updated.voxel)) : 0 });
  } catch (err) {
    console.error("[PUT /api/custom-assets/:id/data] error:", err);
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.delete("/api/custom-assets/:id", async (req, res) => {
  const authorId = getAuthUserId(req) || "guest_builder";
  try {
    const db = await getCustomDb();
    const result = deleteCustomAsset(db, req.params.id, authorId);
    if (result.error === "INVALID_ID") return res.status(400).json({ error: "Custom asset ID is invalid" });
    if (result.error === "NOT_FOUND") return res.status(404).json({ error: "Custom asset not found" });
    if (result.error === "FORBIDDEN") return res.status(403).json({ error: "You can only remove assets you uploaded" });
    saveCustomDb();
    res.json({ ok: true, id: result.asset.id, nextId: listCustomAssets(db).nextId });
  } catch (err) {
    console.error("[DELETE /api/custom-assets/:id] error:", err);
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.get("/api/blueprints", async (req, res) => {
  try {
    const db = await getCustomDb();
    const list = listBlueprints(db);
    res.json({ blueprints: list });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blueprints" });
  }
});

app.get("/api/blueprints/:id", async (req, res) => {
  try {
    const db = await getCustomDb();
    const doc = getBlueprint(db, req.params.id);
    if (!doc) return res.status(404).json({ error: "Blueprint not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blueprint" });
  }
});

app.post("/api/blueprints", async (req, res) => {
  try {
    const db = await getCustomDb();
    const doc = req.body;
    const result = saveBlueprint(db, doc);
    saveCustomDb();
    res.json(result);
  } catch (err) {
    console.error("[POST /api/blueprints] error:", err);
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.delete("/api/blueprints/:id", async (req, res) => {
  try {
    const db = await getCustomDb();
    const result = deleteBlueprint(db, req.params.id);
    saveCustomDb();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete blueprint" });
  }
});

// ==========================================
// 3.4 AI ASSET STUDIO & PALETTE API (Phase 2)
// ==========================================
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

// ==========================================
// 3.5 CLIENT SCREEN DEBUG SNAPSHOT STREAM
// ==========================================

app.post("/api/debug/snapshot", (req, res) => {
  try {
    let buffer, ext = "png";
    if (Buffer.isBuffer(req.body)) {
      // Binary image/POST (blob upload)
      buffer = req.body;
      const ct = String(req.headers["content-type"] || "");
      const ctMatch = ct.match(/^image\/(\w+)/);
      if (ctMatch) ext = ctMatch[1];
    } else {
      // Legacy JSON dataURL upload
      const image = req.body && req.body.image;
      if (!image) return res.status(400).json({ error: "No image provided" });
      const imageMatch = image.match(/^data:image\/(\w+);base64,/);
      ext = (imageMatch && imageMatch[1]) || "png";
      buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    }
    if (!buffer || !buffer.length) return res.status(400).json({ error: "Empty image body" });

    const latestPath = path.join(SNAPSHOTS_DIR, `latest.${ext}`);
    const artifactPath = path.join(ARTIFACT_IMG_DIR, `client_view.${ext}`);

    fs.writeFileSync(latestPath, buffer);
    try { fs.writeFileSync(artifactPath, buffer); } catch (e) {}

    let savedPath = latestPath;
    const name = req.query && req.query.name;
    if (name) {
      const safeName = String(name).replace(/[^a-zA-Z0-9._-]/g, "");
      if (safeName) {
        savedPath = path.join(SNAPSHOTS_DIR, safeName);
        fs.writeFileSync(savedPath, buffer);
      }
    }
    console.log(`[SNAP] saved ${path.basename(savedPath)} (${buffer.length} bytes)`);

    res.json({ success: true, file: path.basename(savedPath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3.6 CLIENT PERFORMANCE TELEMETRY STREAM
// ==========================================

const PERF_LOG_DIR = path.resolve(process.env.WEBMC_LOG_DIR || path.join(__dirname, "../data"));
const PERF_LOG_FILE = path.join(PERF_LOG_DIR, "telemetry-perf.jsonl");
const PERF_LOG_MAX_BYTES = 50 * 1024 * 1024;
const PERF_LOG_GENERATIONS = 3;
const CLIENT_ERROR_LOG = path.join(PERF_LOG_DIR, "client-errors.log");
const CLIENT_ERROR_MAX_BYTES = 5 * 1024 * 1024;
const CLIENT_ERROR_GENERATIONS = 2;
try { if (!fs.existsSync(PERF_LOG_DIR)) fs.mkdirSync(PERF_LOG_DIR, { recursive: true }); } catch (e) {}
let perfStream = null;
try { perfStream = fs.createWriteStream(PERF_LOG_FILE, { flags: "a" }); } catch (e) {}

// Append-only debug logs rotate by size so they can't grow without bound.
// Rename chain is same-filesystem = instant.
function rotateLogIfNeeded(file, maxBytes, generations) {
  try {
    const st = fs.statSync(file);
    if (!st || st.size < maxBytes) return;
    for (let i = generations; i >= 1; i--) {
      const src = i === 1 ? file : file + "." + (i - 1);
      const dst = file + "." + i;
      try { if (fs.existsSync(src)) fs.renameSync(src, dst); } catch (e) {}
    }
  } catch (e) {}
}

// Client-side runtime error capture (sent via sendBeacon with a plain-text body)
app.post("/api/debug/client-error", (req, res) => {
  try {
    let text = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    if (Buffer.isBuffer(req.body)) text = req.body.toString("utf8");
    const LOG = CLIENT_ERROR_LOG;
    rotateLogIfNeeded(LOG, CLIENT_ERROR_MAX_BYTES, CLIENT_ERROR_GENERATIONS);
    fs.appendFileSync(LOG, text + "\n");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/debug/perf", (req, res) => {
  const { lines } = req.body;
  if (!lines || !Array.isArray(lines) || !lines.length) {
    return res.status(400).json({ error: "lines array is required" });
  }
  try {
    rotateLogIfNeeded(PERF_LOG_FILE, PERF_LOG_MAX_BYTES, PERF_LOG_GENERATIONS);
    const batch = [];
    for (const line of lines.slice(0, 500)) {
      if (!line || typeof line !== "string") continue;
      batch.push(line);
    }
    if (batch.length) fs.appendFileSync(PERF_LOG_FILE, batch.join("\n") + "\n");
    res.json({ success: true, count: batch.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. REAL-TIME MULTIPLAYER WEBSOCKET HUB
// ==========================================

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", async (msgStr) => {
    try {
      const msg = JSON.parse(msgStr.toString());

      // 1. JOIN WORLD ROOM
      if (msg.type === "JOIN_WORLD") {
        const { worldId, userId, username, skinColor, x, y, z } = msg;
        currentRoom = `world:${worldId}`;

        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        rooms.get(currentRoom).add(ws);

        clientMeta.set(ws, {
          userId,
          username: username || "Player",
          skinColor: skinColor || "#e0913a",
          worldId,
          x: x || 0,
          y: y || 15,
          z: z || 0,
          yaw: 0,
          pitch: 0,
          slotItem: 1
        });

        // Send existing players in room to this new client
        const existingPlayers = [];
        for (const otherWs of rooms.get(currentRoom)) {
          if (otherWs !== ws && clientMeta.has(otherWs)) {
            existingPlayers.push(clientMeta.get(otherWs));
          }
        }
        ws.send(JSON.stringify({ type: "ROOM_PLAYERS", players: existingPlayers }));

        // Broadcast to other players in room that someone joined
        broadcastToRoom(currentRoom, {
          type: "PLAYER_JOINED",
          player: clientMeta.get(ws)
        }, ws);

        console.log(`[WS] ${username} joined ${currentRoom}. Total: ${rooms.get(currentRoom).size}`);
      }

      // 2. PLAYER MOVEMENT SYNC & SERVER PERSISTENCE
      if (msg.type === "PLAYER_MOVE") {
        if (!currentRoom) return;
        const meta = clientMeta.get(ws);
        if (meta) {
          meta.x = msg.x;
          meta.y = msg.y;
          meta.z = msg.z;
          meta.yaw = msg.yaw;
          meta.pitch = msg.pitch;
          meta.slotItem = msg.slotItem || meta.slotItem;

          // Continually persist to SQLite database so crashes or sudden page reloads NEVER lose position!
          const nowMs = Date.now();
          if (nowMs - (meta.lastDbSaveAt || 0) > 250 && meta.worldId && meta.userId) {
            meta.lastDbSaveAt = nowMs;
            try {
              const db = await getDb();
              const now = new Date().toISOString();
              const stateKey = `${meta.worldId}:${meta.userId}`;
              db.run(
                `INSERT INTO player_state (id, world_id, user_id, pos_x, pos_y, pos_z, yaw, pitch, hotbar, last_online)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
                 ON CONFLICT(id) DO UPDATE SET
                   pos_x = excluded.pos_x,
                   pos_y = excluded.pos_y,
                   pos_z = excluded.pos_z,
                   yaw = excluded.yaw,
                   pitch = excluded.pitch,
                   last_online = excluded.last_online`,
                [stateKey, meta.worldId, meta.userId, meta.x, meta.y, meta.z, meta.yaw, meta.pitch, now]
              );
              saveDb();
            } catch (err) {
              console.error("[WS] Error saving player move to DB:", err);
            }
          }

          broadcastToRoom(currentRoom, {
            type: "PLAYER_MOVED",
            userId: meta.userId,
            username: meta.username,
            skinColor: meta.skinColor,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            pitch: msg.pitch,
            slotItem: meta.slotItem
          }, ws);
        }
      }

      // 3. REAL-TIME BLOCK MODIFICATION BROADCAST (Single block)
      if (msg.type === "BLOCK_EDIT") {
        if (!currentRoom) return;
        const { worldId, x, y, z, blockId, dir = 0, prevBlockId, action } = msg;
        const meta = clientMeta.get(ws);
        const userId = meta ? meta.userId : "player";

        // Save immediately to SQLite database
        const db = await getDb();
        const now = new Date().toISOString();
        const coordKey = `${worldId}:${x},${y},${z}`;

        db.run(
          `INSERT INTO world_blocks (coord_key, world_id, x, y, z, block_id, dir, updated_by, updated_at, data_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(coord_key) DO UPDATE SET
             block_id = excluded.block_id,
             dir = excluded.dir,
             updated_by = excluded.updated_by,
             data_version = excluded.data_version,
             updated_at = excluded.updated_at`,
          [coordKey, worldId, x, y, z, blockId, Number(dir) || 0, userId, now, DATA_VERSION]
        );

        db.run(
          `INSERT INTO block_edits_log (world_id, user_id, x, y, z, prev_block_id, new_block_id, action, timestamp, data_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [worldId, userId, x, y, z, prevBlockId || 0, blockId, action || "edit", now, DATA_VERSION]
        );
        saveDb();

        // Broadcast block update to all other connected players in real time
        broadcastToRoom(currentRoom, {
          type: "BLOCK_UPDATE",
          x, y, z,
          blockId,
          dir: Number(dir) || 0,
          userId,
          username: meta?.username || "Player"
        }, ws);
      }

      // 3.5 HIGH-PERFORMANCE BATCH MODIFICATION (TNT Blasts & Fill tools)
      if (msg.type === "BLOCK_EDIT_BATCH") {
        if (!currentRoom || !Array.isArray(msg.edits) || !msg.edits.length) return;
        const meta = clientMeta.get(ws);
        const userId = meta ? meta.userId : "player";
        const worldId = msg.worldId || currentRoom;
        const db = await getDb();
        const now = new Date().toISOString();

        db.run("BEGIN TRANSACTION");
        for (const edit of msg.edits) {
          const coordKey = `${worldId}:${edit.x},${edit.y},${edit.z}`;
          db.run(
            `INSERT INTO world_blocks (coord_key, world_id, x, y, z, block_id, dir, updated_by, updated_at, data_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(coord_key) DO UPDATE SET
               block_id = excluded.block_id,
               dir = excluded.dir,
               updated_by = excluded.updated_by,
               data_version = excluded.data_version,
               updated_at = excluded.updated_at`,
            [coordKey, worldId, edit.x, edit.y, edit.z, edit.blockId, Number(edit.dir) || 0, userId, now, DATA_VERSION]
          );
          db.run(
            `INSERT INTO block_edits_log (world_id, user_id, x, y, z, prev_block_id, new_block_id, action, timestamp, data_version)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [worldId, userId, edit.x, edit.y, edit.z, edit.prevBlockId || 0, edit.blockId, edit.action || "explode", now, DATA_VERSION]
          );
        }
        db.run("COMMIT");
        saveDb();

        broadcastToRoom(currentRoom, {
          type: "BLOCK_UPDATE_BATCH",
          edits: msg.edits,
          userId,
          username: meta?.username || "Player"
        }, ws);
      }

      // 3.6 REAL-TIME MULTI-USER CHEST SYNCHRONIZATION
      if (msg.type === "CHEST_UPDATE") {
        if (!currentRoom || typeof msg.x !== "number" || typeof msg.y !== "number" || typeof msg.z !== "number" || !Array.isArray(msg.slots)) return;
        const meta = clientMeta.get(ws);
        const userId = meta ? meta.userId : "player";
        const worldId = msg.worldId || currentRoom;
        const { x, y, z, slots } = msg;
        const chestKey = `${worldId}:${x},${y},${z}`;
        const now = new Date().toISOString();
        const db = await getDb();

        db.run(
          `INSERT INTO world_chests (chest_key, world_id, x, y, z, slots, updated_by, updated_at, data_version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(chest_key) DO UPDATE SET
             slots = excluded.slots,
             updated_by = excluded.updated_by,
             data_version = excluded.data_version,
             updated_at = excluded.updated_at`,
          [chestKey, worldId, x, y, z, JSON.stringify(slots), userId, now, DATA_VERSION]
        );
        saveDb();

        // Broadcast real-time chest slot change to all other active players in the world
        broadcastToRoom(currentRoom, {
          type: "CHEST_UPDATE",
          worldId,
          x, y, z,
          slots,
          userId,
          username: meta?.username || "Player"
        }, ws);
      }

      // 4. CHAT BROADCAST
      if (msg.type === "CHAT_MSG") {
        if (!currentRoom) return;
        const meta = clientMeta.get(ws);
        if (meta && msg.text) {
          broadcastToRoom(currentRoom, {
            type: "CHAT_MESSAGE",
            username: meta.username,
            userId: meta.userId,
            text: msg.text.slice(0, 150),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          });
        }
      }

    } catch (e) {
      console.error("[WS] Error parsing message:", e);
    }
  });

  ws.on("close", async () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      const meta = clientMeta.get(ws);
      if (meta) {
        // Save latest player coordinates & orientation to SQLite database
        try {
          if (meta.worldId && meta.userId) {
            const db = await getDb();
            const now = new Date().toISOString();
            const stateKey = `${meta.worldId}:${meta.userId}`;
            db.run(
              `INSERT INTO player_state (id, world_id, user_id, pos_x, pos_y, pos_z, yaw, pitch, hotbar, last_online)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
               ON CONFLICT(id) DO UPDATE SET
                 pos_x = excluded.pos_x,
                 pos_y = excluded.pos_y,
                 pos_z = excluded.pos_z,
                 yaw = excluded.yaw,
                 pitch = excluded.pitch,
                 last_online = excluded.last_online`,
              [stateKey, meta.worldId, meta.userId, meta.x, meta.y, meta.z, meta.yaw, meta.pitch, now]
            );
            saveDb();
          }
        } catch (err) {
          console.error("[WS] Error saving player state on disconnect:", err);
        }

        broadcastToRoom(currentRoom, {
          type: "PLAYER_LEFT",
          userId: meta.userId,
          username: meta.username
        });
        console.log(`[WS] ${meta.username} left ${currentRoom}`);
      }
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      }
    }
    clientMeta.delete(ws);
  });
});

// ==========================================
// BLOCK TEXTURE OVERRIDES API (persisted in the separate worldgen/config db)
// ==========================================
app.get("/api/textures/overrides", async (req, res) => {
  try {
    const wdb = await getWorldgenDb();
    if (req.query.meta === "1" || req.query.version === "1") {
      const rows = wdb.exec("SELECT value FROM texture_overrides WHERE key = 'version'");
      let ver = {};
      if (rows[0]) { try { ver = JSON.parse(rows[0].values[0][0]); } catch (e) {} }
      res.json({ version: ver });
      return;
    }
    const rows = wdb.exec("SELECT key, value, updated_at FROM texture_overrides");
    const obj = {};
    if (rows[0]) for (const [k, v] of rows[0].values) { try { obj[k] = JSON.parse(v); } catch (e) { obj[k] = v; } }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/textures/overrides", async (req, res) => {
  try {
    const { atlas, chestPixels, version } = req.body || {};
    const wdb = await getWorldgenDb();
    const now = new Date().toISOString();
    const upsert = (key, value) => wdb.run(
      "INSERT INTO texture_overrides (key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
      [key, JSON.stringify(value), now]
    );
    if (atlas) upsert("atlas", atlas);
    if (chestPixels) upsert("chest_pixels", chestPixels);
    upsert("version", { version: Number(version || Date.now()), updatedAt: now });
    saveWorldgenDbSync();

    // Cross-sync between dev and prod (requires WEBMC_RELAY_SECRET)
    if (RELAY_SECRET && !isRelayRequest(req)) {
      const myPort = String(process.env.WEBMC_PORT || 5401);
      const peerPort = myPort === "5402" ? 5401 : 5402;
      try {
        await fetch(`http://127.0.0.1:${peerPort}/api/textures/overrides`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Relayed": "1", "X-Relay-Secret": RELAY_SECRET },
          body: JSON.stringify(req.body)
        });
      } catch {}
    }

    res.json({ ok: true, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==========================================
// BLOCKS / ENTITIES LIVE STATS API (reads the main game-asset db)
// ==========================================
app.get("/api/blocks/stats", async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec(`
      SELECT b.block_id, COUNT(*) AS cnt, b.world_id, COALESCE(w.name, b.world_id) AS world_name
      FROM world_blocks b
      LEFT JOIN worlds w ON w.id = b.world_id
      GROUP BY b.block_id, b.world_id
      ORDER BY cnt DESC
    `);
    const perBlock = new Map();
    let grandTotal = 0;
    const worlds = new Map();
    if (rows[0]) {
      for (const [blockId, cnt, worldId, worldName] of rows[0].values) {
        grandTotal += cnt;
        worlds.set(worldId, worldName);
        const e = perBlock.get(blockId) || { count: 0, worlds: {} };
        e.count += cnt;
        e.worlds[worldId] = (e.worlds[worldId] || 0) + cnt;
        perBlock.set(blockId, e);
      }
    }
    const byBlock = [...perBlock.entries()].map(([blockId, v]) => ({ blockId, count: v.count, worlds: v.worlds })).sort((a, b) => b.count - a.count);
    res.json({ grandTotal, distinctWorlds: worlds.size, worlds: Object.fromEntries(worlds), byBlock });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/entities/stats", async (req, res) => {
  try {
    const db = await getDb();
    const rows = db.exec(`
      SELECT a.type, COUNT(*) AS cnt, a.world_id, COALESCE(w.name, a.world_id) AS world_name
      FROM world_animals a
      LEFT JOIN worlds w ON w.id = a.world_id
      GROUP BY a.type, a.world_id
      ORDER BY cnt DESC
    `);
    const byType = new Map();
    let total = 0;
    if (rows[0]) {
      for (const [type, cnt, worldId, worldName] of rows[0].values) {
        total += cnt;
        const e = byType.get(type) || { count: 0, worlds: {} };
        e.count += cnt;
        e.worlds[worldId] = (e.worlds[worldId] || 0) + cnt;
        byType.set(type, e);
      }
    }
    res.json({ total, byType: [...byType.entries()].map(([t, v]) => ({ type: t, count: v.count, worlds: v.worlds })).sort((a, b) => b.count - a.count) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ==========================================
// WORLD-GEN / SEED DATA API (separate worldgen.db — world data ≠ game assets)
// ==========================================
app.get("/api/worldgen/summary", async (req, res) => {
  try {
    const wdb = await getWorldgenDb();
    const presets = wdb.exec("SELECT world_type, label, scale, hill, mtn, temp, island FROM gen_presets ORDER BY rowid");
    const biomes = wdb.exec("SELECT id, name, vanilla, implemented, kb, wiki, map_col, tree, density, notes FROM biome_registry ORDER BY implemented DESC, id");
    const pRows = presets[0] ? presets[0].values.map((r) => ({ key: r[0], label: r[1], scale: r[2], hill: r[3], mtn: r[4], temp: r[5], island: r[6] })) : [];
    const bRows = biomes[0] ? biomes[0].values.map((r) => ({ id: r[0], name: r[1], vanilla: r[2], implemented: !!r[3], kb: r[4], wiki: r[5], mapCol: r[6] ? JSON.parse(r[6]) : null, tree: r[7], density: r[8], notes: r[9] })) : [];
    const implemented = bRows.filter((b) => b.implemented).length;
    const kbCount = bRows.filter((b) => b.implemented && b.kb).length;
    res.json({ presets: pRows, biomes: bRows, implemented, planned: bRows.length - implemented, kbLearned: kbCount, generatorVersion: "procedural terrain (Game.tsx → src/game/terrain refactor)" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get("/api/worldgen/reports", async (req, res) => {
  try {
    const wdb = await getWorldgenDb();
    const rows = wdb.exec("SELECT seed_text, seed_int, world_type, sampled_px, biome_counts_json, created_at FROM world_gen ORDER BY created_at DESC LIMIT 100");
    const list = rows[0] ? rows[0].values.map((r) => ({ seedText: r[0], seedInt: r[1], worldType: r[2], sampledPx: r[3], biomeCounts: r[4] ? JSON.parse(r[4]) : {}, createdAt: r[5] })) : [];
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/worldgen/report", async (req, res) => {
  try {
    const { seedText, seedInt, worldType, sampledPx, biomeCounts } = req.body || {};
    if (seedText === undefined || seedInt === undefined) return res.status(400).json({ error: "seedText and seedInt required" });
    const wdb = await getWorldgenDb();
    const id = `r_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    const now = new Date().toISOString();
    wdb.run(
      "INSERT INTO world_gen (id, world_id, seed_text, seed_int, world_type, generator_version, sampled_px, biome_counts_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [id, req.body.worldId || null, String(seedText), Number(seedInt), String(worldType || "standard"), "procedural terrain (Game.tsx → src/game/terrain refactor)", Number(sampledPx || 0), JSON.stringify(biomeCounts || {}), now, now]
    );
    saveWorldgenDb();
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Start Server
server.listen(PORT, "127.0.0.1", () => {
  console.log(`[SERVER] Hollowpine Web Minecraft Backend running on http://127.0.0.1:${PORT}`);
  console.log(`[SERVER] WebSocket Server active on ws://127.0.0.1:${PORT}/ws`);
  getWorldgenDb().then(() => console.log("[SERVER] World-gen DB ready (seed/biome registry separated from game assets)")).catch((e) => console.error("[SERVER] worldgen-db init failed:", e));
  getCustomDb()
    .then(async () => {
      await migrateCustomObjectsFromGameDb();
      const db = await getCustomDb();
      try {
        const changed = await migrateCustomAssets(db);
        if (changed > 0) {
          saveCustomDb();
          console.log(`[SERVER] custom-assets migration touched ${changed} rows (voxel + GLB purge)`);
        }
      } catch (e) {
        console.error("[SERVER] custom-assets migration error:", e);
      }
    })
    .catch((e) => console.error("[SERVER] custom-db init error:", e));
});
