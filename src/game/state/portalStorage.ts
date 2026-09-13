/**
 * Portal & Multiple Spawn Points Storage.
 * Persists user-created portals and Home spawn point across sessions.
 */

export interface SpawnPortal {
  id: string; // Unique ID, e.g. "portal_12_65_-40"
  name: string;
  x: number;
  y: number;
  z: number;
  isHome: boolean;
  createdAt: number;
}

const STORAGE_KEY_PREFIX = "hollowpine_portals_";

function getStorageKey(worldId?: string): string {
  return STORAGE_KEY_PREFIX + (worldId || "default");
}

export function loadPortals(worldId?: string): SpawnPortal[] {
  try {
    const raw = localStorage.getItem(getStorageKey(worldId)) || localStorage.getItem(STORAGE_KEY_PREFIX + "default");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load portals from localStorage", e);
  }
  return [];
}

export function savePortals(portals: SpawnPortal[], worldId?: string): void {
  try {
    const key = getStorageKey(worldId);
    localStorage.setItem(key, JSON.stringify(portals));
    if (worldId && worldId !== "default") {
      localStorage.setItem(STORAGE_KEY_PREFIX + "default", JSON.stringify(portals));
    }
  } catch (e) {
    console.warn("Failed to save portals to localStorage", e);
  }
}

export function getHomePortal(worldId?: string): SpawnPortal | null {
  const portals = loadPortals(worldId);
  const home = portals.find((p) => p.isHome);
  if (home) return home;
  return portals[0] || null;
}

export function saveOrUpdatePortal(portal: SpawnPortal, worldId?: string): SpawnPortal[] {
  const portals = loadPortals(worldId);
  const existingIdx = portals.findIndex(
    (p) => p.id === portal.id || (Math.floor(p.x) === Math.floor(portal.x) && Math.floor(p.z) === Math.floor(portal.z))
  );

  if (portal.isHome) {
    for (const p of portals) {
      p.isHome = false;
    }
  }

  if (existingIdx >= 0) {
    portals[existingIdx] = { ...portals[existingIdx], ...portal };
  } else {
    // If this is the first portal ever saved, make it home automatically
    if (portals.length === 0) {
      portal.isHome = true;
    }
    portals.push(portal);
  }

  savePortals(portals, worldId);
  return portals;
}

export function setPortalAsHome(id: string, worldId?: string): SpawnPortal[] {
  const portals = loadPortals(worldId);
  for (const p of portals) {
    p.isHome = p.id === id;
  }
  savePortals(portals, worldId);
  return portals;
}

export function renamePortal(id: string, name: string, worldId?: string): SpawnPortal[] {
  const clean = name.trim().slice(0, 24);
  if (!clean) return loadPortals(worldId);
  const portals = loadPortals(worldId);
  const p = portals.find((q) => q.id === id);
  if (p) p.name = clean;
  savePortals(portals, worldId);
  return portals;
}

export function deletePortal(id: string, worldId?: string): SpawnPortal[] {
  const portals = loadPortals(worldId).filter((p) => p.id !== id);
  if (portals.length > 0 && !portals.some((p) => p.isHome)) {
    portals[0].isHome = true;
  }
  savePortals(portals, worldId);
  return portals;
}
