import { getDb } from "./db.js";
import { listCustomAssets } from "./customAssets.js";
export async function debugBlock(id) {
  const db = await getDb();
  const asset = listCustomAssets(db).assets.find(a => a.id === Number(id));
  return asset || null;
}
