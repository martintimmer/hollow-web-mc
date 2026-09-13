export interface CustomAssetMeta {
  id: number;
  name: string;
  prompt: string;
  filename: string;
  mimeType: string;
  size: number;
  dimensions: [number, number, number];
  triangles: number;
  placement: CustomAssetPlacement;
  assetType?: CustomAssetKind;
  voxel?: VoxelPayload | null;
  authorId?: string;
  createdAt: string;
}

export type CustomAssetSpan = 1 | 2 | 3 | 4 | 5 | 6;

export interface CustomAssetPlacement {
  width: CustomAssetSpan;
  height: CustomAssetSpan;
  scale: number;
}

export type CustomAssetKind = "block" | "voxel";

export interface VoxelGrid {
  gx: number;
  gy: number;
  gz: number;
  data: string; // base64 of Uint8Array: 0 = empty, else palette index + 1
}

export interface VoxelPayload {
  kind: CustomAssetKind;
  res: number;
  grid: VoxelGrid;
  palette: string[];
  footprint: CustomAssetPlacement;
  tile?: string; // data URL of the baked 64x64 texture (T2)
  uvs?: string;  // base64 Uint32Array: per-voxel center UV (u<<16|v), 0xFFFFFFFF = fallback (T2)
}

export interface CustomAssetCatalog {
  assets: CustomAssetMeta[];
  nextId: number;
}

export async function apiGetCustomAssets(): Promise<CustomAssetCatalog> {
  const res = await fetch("/api/custom-assets", { credentials: "include" });
  if (!res.ok) throw new Error("Could not read the game inventory");
  return await res.json();
}

export async function apiGetCustomAsset(id: number): Promise<CustomAssetMeta | null> {
  const res = await fetch(`/api/custom-assets/${id}`, { credentials: "include" });
  if (!res.ok) return null;
  return await res.json();
}

function encodeMetadata(value: unknown): string {
  return encodeURIComponent(JSON.stringify(value));
}

export async function apiInsertCustomAsset(input: {
  requestedId: number;
  name: string;
  prompt: string;
  filename: string;
  mimeType: string;
  dimensions: [number, number, number];
  triangles: number;
  placement: CustomAssetPlacement;
  assetType?: CustomAssetKind;
  data: ArrayBuffer;
}): Promise<{ ok: boolean; asset: CustomAssetMeta; nextId: number }> {
  const res = await fetch("/api/custom-assets", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Custom-Asset-Meta": encodeMetadata({
        requestedId: input.requestedId,
        name: input.name,
        prompt: input.prompt,
        filename: input.filename,
        mimeType: input.mimeType,
        dimensions: input.dimensions,
        triangles: input.triangles,
        placement: input.placement,
        assetType: input.assetType
      })
    },
    body: input.data
  });
  const responseText = await res.text();
  let payload: { error?: string; nextId?: number; ok?: boolean; asset?: CustomAssetMeta } = {};
  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = {};
  }
  if (!res.ok) {
    const fallback = res.status === 413
      ? "The server rejected this upload because it is too large. Try a smaller GLB."
      : `The server rejected the upload (HTTP ${res.status}).`;
    const error = new Error(payload.error || fallback) as Error & { nextId?: number };
    error.nextId = payload.nextId;
    throw error;
  }
  if (!payload.asset || typeof payload.nextId !== "number") throw new Error("The server returned an incomplete insert response.");
  return payload as { ok: boolean; asset: CustomAssetMeta; nextId: number };
}

export async function apiUpdateCustomAssetPlacement(id: number, placement: CustomAssetPlacement): Promise<CustomAssetMeta> {
  const res = await fetch(`/api/custom-assets/${id}/placement`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placement })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Could not save placement (HTTP ${res.status}).`);
  if (!payload.asset) throw new Error("The server returned an incomplete placement response.");
  return payload.asset as CustomAssetMeta;
}

export async function apiDeleteCustomAsset(id: number): Promise<{ id: number; nextId: number }> {
  const res = await fetch(`/api/custom-assets/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Could not remove asset (HTTP ${res.status}).`);
  return { id: Number(payload.id), nextId: Number(payload.nextId) };
}
