export interface User {
  id: string;
  username: string;
  skinColor: string;
}

export interface WorldMeta {
  id: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  seed: number;
  seedText: string;
  worldType: string;
  worldTime: number;
  dayCount?: number;
  createdAt: string;
  lastPlayed: string;
  onlinePlayers?: number;
  isOwner?: boolean;
}

export interface InventorySlot {
  id: number;
  count: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  flying: boolean;
  gameMode: string;
  hotbar: number[];
  activeSlot: number;
  inventory?: Array<InventorySlot | null>;
}

export interface BlockLogEntry {
  seqId: number;
  userId: string;
  x: number;
  y: number;
  z: number;
  prevBlockId: number;
  newBlockId: number;
  action: string;
  timestamp: string;
}

export interface UserPreferences {
  renderDistance: number;
  vibrance: number;
  brightness: number;
  contrast: number;
  fov: number;
  shadows: boolean;
  autoStep: boolean;
  maxFps: number;
  dof: boolean;
  dofStrength: number;
  ca: boolean;
  caStrength: number;
  colorGamut: string;
  bokeh: boolean;
  specular: boolean;
  specularStrength: number;
  qualityPreset: "smooth" | "balanced" | "beautiful";
  shadowTier: "basic" | "detailed" | "advanced";
  weather: "clear" | "cloudy" | "overcast";
  touchControls: boolean;
  exposureModel: "legacy-sim" | "iso-ettl";
}

export interface AuthResponse {
  user: User;
  preferences: UserPreferences;
}

const BASE_URL = ""; // Proxied by Nginx to backend

// 1. Auth API (100% Server & Session Cookie Driven - ZERO LocalStorage)
export async function apiLogin(username: string, password?: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: password ?? "" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Login failed");
  }
  return await res.json();
}

export async function apiRegister(username: string, password: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Registration failed");
  }
}

export async function apiGetMe(): Promise<AuthResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST" });
  } catch (e) {
    console.warn("Logout error:", e);
  }
}

// 2. Worlds API
export async function apiGetWorlds(): Promise<WorldMeta[]> {
  const res = await fetch(`${BASE_URL}/api/worlds`);
  if (!res.ok) throw new Error("Failed to load worlds");
  const data = await res.json();
  return data.worlds || [];
}

export async function apiCreateWorld(name: string, seedText: string, worldType: string): Promise<WorldMeta> {
  const res = await fetch(`${BASE_URL}/api/worlds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, seedText, worldType })
  });
  if (!res.ok) throw new Error("Failed to create world");
  const data = await res.json();
  return data.world;
}

export async function apiDeleteWorld(worldId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/worlds/${worldId}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete world");
}

export async function apiJoinWorld(worldId: string): Promise<{
  world: WorldMeta;
  playerState: PlayerState | null;
  blockEdits: Record<string, number>;
  blockDirs?: Record<string, number>;
  chests: Record<string, Array<InventorySlot | null>>;
  animals: Array<{ id: string; type: string; name: string | null; sex: string; ownerId: string | null; x: number; y: number; z: number; yaw: number }>;
  boats: Array<{ id: string; itemId: number; x: number; y: number; z: number; yaw: number }>;
}> {
  const res = await fetch(`${BASE_URL}/api/worlds/${worldId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!res.ok) throw new Error("Failed to join world");
  return await res.json();
}

export async function apiSaveAnimals(
  worldId: string,
  animals: Array<{ id: string; type: string; name?: string | null; sex?: string; ownerId?: string | null; x: number; y: number; z: number; yaw?: number }>
): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/animals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ animals }),
    keepalive: true
  });
}

export async function apiSaveBoats(
  worldId: string,
  boats: Array<{ id: string; itemId: number; x: number; y: number; z: number; yaw?: number }>,
  removed: string[] = []
): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/boats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boats, removed }),
    keepalive: true
  });
}

export async function apiSaveChest(
  worldId: string,
  x: number,
  y: number,
  z: number,
  slots: Array<InventorySlot | null>
): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/chests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x, y, z, slots })
  });
}

export interface ServerSpawn {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  isHome: boolean;
  createdAt: number;
}

export async function apiGetSpawns(worldId: string): Promise<ServerSpawn[]> {
  const res = await fetch(`${BASE_URL}/api/spawns?worldId=${encodeURIComponent(worldId)}`);
  if (!res.ok) throw new Error("Failed to fetch spawns");
  const data = await res.json();
  return Array.isArray(data.spawns) ? data.spawns : [];
}

export async function apiSaveSpawn(worldId: string, spawn: { id?: string; name: string; x: number; y: number; z: number; isHome: boolean }): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/spawns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ worldId, ...spawn })
  });
  if (!res.ok) throw new Error(res.status === 400 ? (await res.json().catch(() => ({}))).error || "Failed to save spawn" : "Failed to save spawn");
  const data = await res.json();
  return data.id;
}

export async function apiRenameSpawn(id: string, name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/spawns/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error("Failed to rename spawn");
}

export async function apiDeleteSpawn(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/spawns/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete spawn");
}

export async function apiSavePlayerState(
  worldId: string,
  state: Partial<PlayerState> & { worldTime?: number; dayCount?: number }
): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
    keepalive: true // survive page unload/logout so the final tick's worldTime lands
  });
}

export interface VillagerTradeLedger {
  tradeDay: number;
  offers: number[];
  uses: number[];
  purse: Record<string, number>;
}

export interface WorldPainting {
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  variant: string;
}

export async function apiSavePainting(worldId: string, p: WorldPainting): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/paintings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
    keepalive: true
  });
}

export async function apiRemovePainting(worldId: string, x: number, y: number, z: number): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/paintings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x, y, z, remove: true }),
    keepalive: true
  });
}
export async function apiSaveVillagerTrade(
  worldId: string,
  vkey: string,
  ledger: VillagerTradeLedger
): Promise<void> {
  await fetch(`${BASE_URL}/api/worlds/${worldId}/trades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vkey, ...ledger }),
    keepalive: true
  });
}

export async function apiSaveBlockEdits(
  worldId: string,
  edits: Array<{ x: number; y: number; z: number; blockId: number; dir?: number; prevBlockId?: number; action?: string }>
): Promise<void> {
  if (!edits.length) return;
  const res = await fetch(`${BASE_URL}/api/worlds/${worldId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edits })
  });
  if (!res.ok) throw new Error(`save block edits failed: HTTP ${res.status}`);
}

// Offline-sync queue helpers. Pending edits are tagged with the world they
// belong to so a flush can never write overworld edits into the nether (or
// vice versa) when the player changed dimension while offline.
export interface PendingEdit {
  worldId: string;
  edit: { x: number; y: number; z: number; blockId: number; dir?: number; prevBlockId?: number; action?: string };
}

export function groupPendingByWorld(queue: PendingEdit[]): Array<{ worldId: string; batch: PendingEdit["edit"][]; items: PendingEdit[] }> {
  const groups: Array<{ worldId: string; batch: PendingEdit["edit"][]; items: PendingEdit[] }> = [];
  const byWorld = new Map<string, { worldId: string; batch: PendingEdit["edit"][]; items: PendingEdit[] }>();
  for (const item of queue) {
    let g = byWorld.get(item.worldId);
    if (!g) {
      g = { worldId: item.worldId, batch: [], items: [] };
      byWorld.set(item.worldId, g);
      groups.push(g);
    }
    g.batch.push(item.edit);
    g.items.push(item);
  }
  return groups;
}

// Send every world-group; return whatever failed so the caller re-queues it.
// Group order and in-group order are preserved; successes are dropped.
export async function flushPendingQueue(
  queue: PendingEdit[],
  send: (worldId: string, batch: PendingEdit["edit"][]) => Promise<void>
): Promise<PendingEdit[]> {
  const remaining: PendingEdit[] = [];
  for (const g of groupPendingByWorld(queue)) {
    try {
      await send(g.worldId, g.batch);
    } catch {
      for (const item of g.items) remaining.push(item);
    }
  }
  return remaining;
}

export async function apiGetBlockLogs(worldId: string, limit = 50): Promise<BlockLogEntry[]> {
  const res = await fetch(`${BASE_URL}/api/worlds/${worldId}/logs?limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.logs || [];
}

// 3. User Preferences API (100% Server Database Synchronized)
export async function apiGetPreferences(): Promise<UserPreferences> {
  try {
    const res = await fetch(`${BASE_URL}/api/preferences`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.preferences;
  } catch {
    return {
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
  }
}

export async function apiSavePreferences(prefs: Partial<UserPreferences>): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs)
    });
  } catch (e) {
    console.warn("Failed to persist preferences to server:", e);
  }
}

// 4. Custom Blueprints & Worldgen Registry API
export async function apiGetBlueprints(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/blueprints`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.blueprints || [];
  } catch {
    return [];
  }
}

export async function apiGetBlueprint(id: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/blueprints/${id}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiSaveBlueprint(doc: any): Promise<{ ok: boolean; id?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/api/blueprints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc)
    });
    if (!res.ok) throw new Error("Save blueprint failed");
    return await res.json();
  } catch (e) {
    console.warn("Failed to save blueprint:", e);
    return { ok: false };
  }
}

export async function apiDeleteBlueprint(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/api/blueprints/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

