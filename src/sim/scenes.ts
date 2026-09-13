// Hollowpine Sim — scene documents (pure TS: serializable, no engine refs).
// A scene replays a stamp history: ordered stamps, each with per-cell writes.

export interface StampCell {
  x: number; y: number; z: number;
  prev: number;  // block id before the stamp
  next: number;  // block id written by the stamp
}

export interface SceneStamp {
  name: string;
  cells: StampCell[];
}

export interface SceneDoc {
  version: 1;
  seed: string;
  savedAt: string;
  stamps: SceneStamp[];
}

export function createScene(seed: string, stamps: SceneStamp[]): SceneDoc {
  return { version: 1, seed, savedAt: new Date().toISOString(), stamps };
}

/** Structural validation (returns null when a doc is not ours/truncated). */
export function validateSceneDoc(raw: unknown): SceneDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<SceneDoc>;
  if (d.version !== 1 || !Array.isArray(d.stamps)) return null;
  if (typeof d.seed !== "string") return null;
  for (const s of d.stamps) {
    if (!s || typeof s.name !== "string" || !Array.isArray(s.cells)) return null;
    for (const c of s.cells) {
      if (typeof c.x !== "number" || typeof c.y !== "number" || typeof c.z !== "number" ||
          typeof c.prev !== "number" || typeof c.next !== "number") return null;
    }
  }
  return d as SceneDoc;
}

export function sceneVoxelCount(doc: SceneDoc): number {
  let n = 0;
  for (const s of doc.stamps) n += s.cells.length;
  return n;
}

/** Ring-trim maintenance: keep newest `keep` entries. */
export function pickAutoSceneIds(idTsPairs: Array<{ id: string; ts: string }>, keep = 10): string[] {
  const sorted = [...idTsPairs].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return sorted.slice(keep).map((e) => e.id);
}
