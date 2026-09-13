/* Texture-override persistence bridge: the Block Texture Editor (/editor.html)
 * POSTs its saved overrides to the DB, and the game fetches + live-applies them
 * (on boot and via a light version poll) so texture changes persist and update
 * blocks on the fly. The in-game apply itself reuses the existing localStorage
 * keys + storage/focus reload machinery (atlas.ts redrawAtlas, chest.ts
 * reloadChestTextures). */

export interface TextureOverrideDoc {
  atlas?: Record<string, string>;
  chestPixels?: Record<string, number[]>;
  version?: { version?: number; updatedAt?: string };
}

const ATLAS_KEY = "mc_custom_atlas_overrides";
const CHEST_KEY = "mc_custom_chest_pixels";
const VERSION_KEY = "mc_custom_atlas_version";

export function applyTextureOverrides(doc: TextureOverrideDoc): void {
  if (!doc) return;
  const chestPixels = (doc as any).chest_pixels || doc.chestPixels;
  if (doc.atlas) localStorage.setItem(ATLAS_KEY, JSON.stringify(doc.atlas));
  if (chestPixels) localStorage.setItem(CHEST_KEY, JSON.stringify(chestPixels));
  const ver = doc.version && doc.version.version ? String(doc.version.version) : String(Date.now());
  localStorage.setItem(VERSION_KEY, ver);
  // Re-dispatch so the SAME tab's atlas.ts/chest.ts storage listeners re-apply now.
  window.dispatchEvent(new StorageEvent("storage", { key: VERSION_KEY, newValue: ver }));
  window.dispatchEvent(new StorageEvent("storage", { key: ATLAS_KEY, newValue: JSON.stringify(doc.atlas || {}) }));
  window.dispatchEvent(new CustomEvent("custom-assets-updated", { detail: { version: ver } }));
}

export async function fetchTextureOverrides(): Promise<void> {
  try {
    const res = await fetch("/api/textures/overrides");
    if (res.ok) {
      const doc: TextureOverrideDoc = await res.json();
      applyTextureOverrides(doc);
    }
  } catch {
    /* server unreachable — keep current localStorage state */
  }
  // NOTE: custom-object registration is intentionally NOT here. Texture edits
  // live in worldgen.db; custom assets live in their own DB and are loaded by
  // syncCustomAssetsCatalog() on boot — decoupled so a texture save can never
  // disable or clobber custom objects.
}

export async function saveTextureOverrides(
  atlas: Record<string, string>,
  chestPixels: Record<string, number[]>,
  version?: number
): Promise<boolean> {
  try {
    const res = await fetch("/api/textures/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atlas, chestPixels, version: version ?? Date.now() })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTextureOverrideVersion(): Promise<number> {
  try {
    const res = await fetch("/api/textures/overrides?meta=1");
    if (!res.ok) return 0;
    const doc: TextureOverrideDoc = await res.json();
    return Number((doc.version && doc.version.version) || 0);
  } catch {
    return 0;
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastKnownVersion = 0;

/**
 * Lightweight live update: every 3 s poll ONLY the override version (meta endpoint,
 * a few bytes) and re-apply the full doc (incl. the ~4.5 MB atlas) only when it
 * changed. The old poll re-downloaded the whole atlas every tick. Returns a stop handle.
 */
export function startTextureOverridePolling(intervalMs = 3000): () => void {
  lastKnownVersion = Number(localStorage.getItem(VERSION_KEY) || 0);
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const v = await fetchTextureOverrideVersion();
    if (!v || v === lastKnownVersion) return;
    lastKnownVersion = v;
    try {
      await fetchTextureOverrides();
    } catch {
      /* transient network error — try again next tick */
    }
  }, intervalMs);
  return () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
}