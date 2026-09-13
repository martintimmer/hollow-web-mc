// Hollowpine — Studio / Builder Mode State Manager
// Seamless 1-click transition between live exploration worlds and the Builder Studio flat pad.

export interface SavedPlayerLocation {
  worldId: string;
  worldName: string;
  seedText: string;
  worldType: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  fly: boolean;
  gameMode: string;
  inventory?: unknown[];
  hotbar?: number[];
  activeSlot?: number;
}

let cachedLocation: SavedPlayerLocation | null = null;
let studioActive = false;

const STUDIO_STORAGE_KEY = "mc_studio_cached_loc";

export function isStudioActive(): boolean {
  return studioActive;
}

export function setStudioActive(active: boolean) {
  studioActive = active;
}

export function cachePlayerLocation(loc: SavedPlayerLocation) {
  cachedLocation = loc;
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(loc));
  } catch {
    /* localStorage unavailable */
  }
}

export function getCachedPlayerLocation(): SavedPlayerLocation | null {
  if (cachedLocation) return cachedLocation;
  try {
    const raw = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (raw) {
      cachedLocation = JSON.parse(raw);
      return cachedLocation;
    }
  } catch {
    /* ignore parse error */
  }
  return null;
}

export function clearCachedPlayerLocation() {
  cachedLocation = null;
  try {
    localStorage.removeItem(STUDIO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
