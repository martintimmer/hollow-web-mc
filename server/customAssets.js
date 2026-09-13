import fs from "fs";
import path from "path";
import { voxelizeBuffer } from "../catalog/voxelize.mjs";

const CATALOG_PATH = path.resolve(process.cwd(), "catalog/completeRegistry.json");
const MAX_ASSET_BYTES = 200 * 1024 * 1024;

function safeSpan(value) {
  const span = Number(value);
  return Number.isInteger(span) && span >= 1 && span <= 6 ? span : 1;
}

function staticCatalogMaxId() {
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    const rows = Array.isArray(raw) ? raw : (raw.blocks || raw.items || []);
    return rows.reduce((max, row) => Math.max(max, Number(row?.id) || 0), 0);
  } catch {
    return 1210;
  }
}

function rowToAsset(row, skipVoxel = false) {
  const [id, name, prompt, filename, mimeType, sizeBytes, dimensionsJson, triangles, placementWidth, placementHeight, placementScale, assetType, voxelData, authorId, createdAt] = row;
  let dimensions = [1, 1, 1];
  try {
    const parsed = JSON.parse(dimensionsJson || "[1,1,1]");
    if (Array.isArray(parsed) && parsed.length === 3) dimensions = parsed.map(Number);
  } catch {}
  let voxel = null;
  if (voxelData && !skipVoxel) {
    try { voxel = JSON.parse(voxelData); } catch {}
  }
  return {
    id: Number(id), name, prompt, filename, mimeType, size: Number(sizeBytes), dimensions,
    triangles: Number(triangles) || 0,
    assetType: assetType || (voxel?.kind) || "voxel",
    voxel,
    placement: {
      width: safeSpan(placementWidth),
      height: safeSpan(placementHeight),
      scale: Math.max(25, Math.min(100, Number(placementScale) || 100))
    },
    authorId, createdAt
  };
}

const ASSET_COLS = "id, name, prompt, filename, mime_type, size_bytes, dimensions, triangles, placement_width, placement_height, placement_scale, asset_type, voxel_data, author_id, created_at";

export function listCustomAssets(db) {
  const result = db.exec(`SELECT ${ASSET_COLS} FROM custom_assets ORDER BY id`);
  const assets = result.length ? result[0].values.map((row) => rowToAsset(row, true)) : [];
  const highest = assets.reduce((max, asset) => Math.max(max, asset.id), Math.max(1210, staticCatalogMaxId()));
  return { assets, nextId: highest + 1 };
}

export function getCustomAsset(db, id) {
  const result = db.exec(`SELECT ${ASSET_COLS.replace("author_id, created_at", "data_base64, author_id, created_at")} FROM custom_assets WHERE id = ?`, [Number(id)]);
  if (!result.length || !result[0].values.length) return null;
  const [assetId, name, prompt, filename, mimeType, sizeBytes, dimensionsJson, triangles, placementWidth, placementHeight, placementScale, assetType, voxelData, dataBase64, authorId, createdAt] = result[0].values[0];
  const metadata = rowToAsset([assetId, name, prompt, filename, mimeType, sizeBytes, dimensionsJson, triangles, placementWidth, placementHeight, placementScale, assetType, voxelData, authorId, createdAt]);
  return { ...metadata, dataBase64 };
}

export async function saveCustomAsset(db, input) {
  const { requestedId, name, prompt, filename, mimeType, dimensions, triangles, placement, data, authorId } = input;
  if (!Number.isInteger(requestedId) || requestedId <= 0) throw new Error("A valid requested ID is required");
  if (!String(name || "").trim() || !String(prompt || "").trim()) throw new Error("A user prompt is required");
  if (!String(filename || "").trim()) throw new Error("A filename is required");
  if (!Buffer.isBuffer(data) || data.length === 0) throw new Error("The uploaded model is empty");
  if (data.length > MAX_ASSET_BYTES) throw new Error("The uploaded model is larger than 200 MB");
  const current = listCustomAssets(db);
  if (requestedId !== current.nextId) {
    const error = new Error(`ID ${requestedId} is no longer available`);
    error.code = "ID_CONFLICT";
    error.nextId = current.nextId;
    throw error;
  }
  const safeDimensions = Array.isArray(dimensions) && dimensions.length === 3
    ? dimensions.map((value) => Math.max(0, Math.min(1000, Number(value) || 0)))
    : [1, 1, 1];
  const safePlacement = {
    width: safeSpan(placement?.width),
    height: safeSpan(placement?.height),
    scale: Math.max(25, Math.min(100, Math.round(Number(placement?.scale) || 100)))
  };
  const now = new Date().toISOString();

  // Voxelize server-side: the client never needs the GLB after upload.
  let voxel = null;
  let assetType = "voxel";
  try {
    const v = await voxelizeBuffer(data, {
      res: 48,
      w: safePlacement.width,
      h: safePlacement.height,
      scale: safePlacement.scale,
      name: String(name).trim()
    });
    voxel = v.payload;
    assetType = voxel.kind;
  } catch (e) {
    console.error("[custom-assets] voxelize failed:", e.message);
  }

  db.run(
    `INSERT INTO custom_assets (id, name, prompt, filename, mime_type, size_bytes, dimensions, triangles, placement_width, placement_height, placement_scale, asset_type, voxel_data, data_base64, author_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      requestedId,
      String(name).trim().slice(0, 120),
      String(prompt).trim().slice(0, 500),
      path.basename(String(filename)).slice(0, 180),
      String(mimeType || "model/gltf-binary").slice(0, 80),
      data.length,
      JSON.stringify(safeDimensions),
      Math.max(0, Math.min(100000000, Math.round(Number(triangles) || 0))),
      safePlacement.width,
      safePlacement.height,
      safePlacement.scale,
      assetType,
      voxel ? JSON.stringify(voxel) : null,
      "", // data_base64 — GLB discarded after voxelization (column is NOT NULL)
      String(authorId || "unknown").slice(0, 120),
      now
    ]
  );
  return getCustomAsset(db, requestedId);
}

export async function updateCustomAssetData(db, id, data) {
  const existing = getCustomAsset(db, id);
  if (!existing) throw new Error("Custom asset not found");
  let voxel = null;
  let assetType = "voxel";
  try {
    const v = await voxelizeBuffer(data, {
      res: 48,
      w: existing.placement.width,
      h: existing.placement.height,
      scale: existing.placement.scale,
      name: existing.name
    });
    voxel = v.payload;
    assetType = voxel.kind;
  } catch (e) {
    console.error("[custom-assets] re-voxelize failed:", e.message);
  }
  db.run("UPDATE custom_assets SET asset_type = ?, voxel_data = ?, data_base64 = '', size_bytes = ? WHERE id = ?", [assetType, voxel ? JSON.stringify(voxel) : null, data.length, Number(id)]);
  return getCustomAsset(db, id);
}

export async function migrateCustomAssets(db) {
  let migrated = 0;
  const r = db.exec("SELECT id, data_base64, placement_width, placement_height, placement_scale FROM custom_assets WHERE voxel_data IS NULL OR voxel_data = ''");
  if (r.length && r[0].values.length) {
    for (const row of r[0].values) {
      const [id, b64, pw, ph, ps] = row;
      if (!b64) continue;
      try {
        const { payload } = await voxelizeBuffer(Buffer.from(b64, "base64"), {
          res: 48,
          w: safeSpan(pw),
          h: safeSpan(ph),
          scale: Math.max(25, Math.min(100, Number(ps) || 100))
        });
        db.run("UPDATE custom_assets SET asset_type = ?, voxel_data = ?, data_base64 = '' WHERE id = ?", [payload.kind, JSON.stringify(payload), Number(id)]);
        migrated++;
        console.log(`[custom-assets] migrated ${id} -> ${payload.kind}`);
      } catch (e) {
        console.error(`[custom-assets] migration failed for ${id}:`, e.message);
      }
    }
  }
  // Purge any leftover GLB bytes once an asset is voxelized (no-GLB policy)
  db.run("UPDATE custom_assets SET data_base64 = '' WHERE voxel_data IS NOT NULL AND voxel_data != '' AND data_base64 IS NOT NULL AND data_base64 != ''");
  const purgedNow = db.getRowsModified();
  return migrated + (purgedNow > 0 ? purgedNow : 0);
}

export function deleteCustomAsset(db, id, authorId) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return { error: "INVALID_ID" };
  const asset = getCustomAsset(db, numericId);
  if (!asset) return { error: "NOT_FOUND" };
  if (asset.authorId && asset.authorId !== authorId) return { error: "FORBIDDEN" };
  db.run("DELETE FROM custom_assets WHERE id = ?", [numericId]);
  return { asset };
}