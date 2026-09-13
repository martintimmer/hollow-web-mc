import * as THREE from "three";
import type { GameState } from "../game/state/gameState";
import { BLOCK_MAP, BED_ID, BED_BYTE } from "../game/blocks";
import { CHH } from "../game/world";
import { validateSceneDoc } from "./scenes";
import { PROFESSIONS, createVillagerMesh } from "../game/villagers";
import { createCowMesh, createSheepMesh, createPigMesh, createChickenMesh, createHorseMesh, createDogMesh } from "../game/entities/animals";
import { createBoatMesh } from "../game/entities/boat";
import { createArticulatedChest } from "../game/chest";
import {
  generateCherryTree,
  generateOakTree,
  generateCrimsonMapleTree,
  generateGoldenAspenTree,
  generateWarpedTree,
  generateBambooGroves,
  generateRedwoodTree,
  generateDarkOakTree,
  generateHugeMushroom,
  generateMangroveTree,
  generateAcaciaTree,
  generatePalmTree,
  generateMeadowTree,
  generateBirchTree,
  generateAlpinePine,
  generateJungleTree
} from "../game/terrain/trees";
import { generateCoralReef, generateKelpForest, generateSunkenShipwreck } from "../game/terrain/ocean";
import {
  STYLES,
  HOUSE_DESIGN_META,
  buildLampPost,
  buildWell,
  buildGarden,
  generateSteppedFountain,
  generateStiltLakeHouse
} from "../game/terrain/structures";
import { scanStructureFromBounds, type BlueprintDoc } from "./blueprintScanner";
import { encodeCanvasToJpegBlob } from "../game/snapshotEncoder";
import type { OrbitView } from "../game/engine/orbitControls";
import { orbitView } from "../game/engine/orbitControls";

export interface BrushSpec {
  shape: "cube" | "sphere" | "cylinder";
  radius: number;
  height: number;
}

export function brushBounds(spec: BrushSpec, cx: number, cy: number, cz: number) {
  const r = Math.max(1, Math.min(16, spec.radius || 3));
  const h = Math.max(1, Math.min(16, spec.height || 3));
  return {
    x0: cx - r, y0: cy, z0: cz - r,
    x1: cx + r, y1: cy + h - 1, z1: cz + r
  };
}

export function brushContains(spec: BrushSpec, cx: number, cy: number, cz: number, x: number, y: number, z: number): boolean {
  const r = spec.radius || 3;
  const h = spec.height || 3;
  if (y < cy || y >= cy + h) return false;
  if (spec.shape === "cube") {
    return Math.abs(x - cx) <= r && Math.abs(z - cz) <= r;
  }
  if (spec.shape === "cylinder") {
    const d2 = (x - cx) ** 2 + (z - cz) ** 2;
    return d2 <= r * r;
  }
  if (spec.shape === "sphere") {
    const midY = cy + h / 2;
    const dy = (y - midY) / (h / 2);
    const d2 = ((x - cx) / r) ** 2 + dy ** 2 + ((z - cz) / r) ** 2;
    return d2 <= 1;
  }
  return true;
}

export interface SimDeckBridgeOptions {
  simStampRun: (name: string, fn: (w: (x: number, y: number, z: number, id: number) => void) => void, bounds?: [number, number, number, number, number, number]) => { voxels: number; ms: number };
  simUndo: () => number;
  simRunKind?: (kind: string, params: Record<string, number | string>, x: number, z: number, side: string) => any;
  simWriteCell?: (x: number, y: number, z: number, id: number, dirty: Set<string>) => void;
  simRebuildSkip?: (skipIdx: number) => void;
  simLog: (m: string) => void;
  simLogRing: () => string[];
  simStamps: any[];
  simPlaced: any[];
  simFlat: () => boolean;
  mobMgr: any;
  showToast: (m: string) => void;
  surfaceAt: (x: number, z: number) => any;
  terrainHeight: (x: number, z: number) => number;
  rngAt: (x: number, z: number) => () => number;
  pine: (x: number, z: number, base: number, r: () => number, snowy: boolean) => void;
  buildHouse: (H: any) => void;
  clearUp: (x: number, z: number, from: number) => void;
  wellAt?: (cx: number, cz: number, base: number) => void;
  lampPost?: (x: number, z: number, base: number) => void;
  getChunk?: (cx: number, cz: number) => any;
  genChunk?: (cx: number, cz: number) => any;
  registerEmitter?: (x: number, y: number, z: number, id: number) => void;
  buildMesh?: (cx: number, cz: number, priority?: number) => void;
  setWorldTime: (t: number) => void;
  setHotbar: (h: number[]) => void;
  spawnVehicle: (styleId?: string) => string | null;
  wandManager: any;
  updateAreaBoxMesh: () => void;
  simSceneGet?: () => any;
  simSceneRestore?: (doc: any) => any;
  scene: THREE.Scene;
  thumbs: Map<number, string>;
}

export function setupSimDeckBridge(
  s: GameState,
  options: SimDeckBridgeOptions
) {
  let simPlacedSeq = options.simPlaced.length;

  const ckey = (cx: number, cz: number) => `${cx},${cz}`;

  const simWriteCell = options.simWriteCell ?? ((x: number, y: number, z: number, id: number, dirty: Set<string>) => {
    if (y < 0 || y >= CHH) return;
    if (id === BED_ID) id = BED_BYTE;
    const cx = x >> 4, cz = z >> 4;
    let ch = options.getChunk ? options.getChunk(cx, cz) : s.chunks.get(ckey(cx, cz));
    if (!ch && options.genChunk) { ch = options.genChunk(cx, cz); }
    if (!ch || !ch.data) return;
    const off = y * 256 + (z & 15) * 16 + (x & 15);
    if (off >= ch.data.length) return;
    ch.data[off] = id;
    if (id && y > ch.maxY) ch.maxY = y;
    if (options.registerEmitter) options.registerEmitter(x, y, z, id);
    if (id === 39 || id === 40) s.liquidQ.push([x, y, z, id, 0, 0]);
    dirty.add(ckey(cx, cz));
  });

  const simRebuildSkip = options.simRebuildSkip ?? ((skipIdx: number) => {
    const keep = options.simStamps.map((stamp, i) => ({ stamp, i })).filter((k) => k.i !== skipIdx);
    const savedPlaced = options.simPlaced.filter((p) => p.stampIdx !== skipIdx);
    while (options.simStamps.length) options.simUndo();
    const dirty = new Set<string>();
    const idxMap = new Map<number, number>();
    keep.forEach((k, ri) => { idxMap.set(k.i, ri); });
    for (const k of keep) {
      for (const c of k.stamp.cells) simWriteCell(c.x, c.y, c.z, c.next, dirty);
      options.simStamps.push(k.stamp);
    }
    options.simPlaced.length = 0;
    savedPlaced.forEach((p) => options.simPlaced.push({ ...p, stampIdx: idxMap.get(p.stampIdx) ?? p.stampIdx }));
    for (const key of dirty) {
      const [cx, cz] = key.split(",").map(Number);
      if (options.buildMesh) options.buildMesh(cx, cz, 1.5);
    }
  });

  const simRunKind = options.simRunKind ?? ((kind: string, params: Record<string, number | string>, x: number, z: number, side: string) => {
    const px = Math.floor(x), pz = Math.floor(z);
    const base = options.simFlat() ? 64 : options.surfaceAt(px, pz).h;
    if (kind.startsWith("tree:")) {
      const kid = kind.slice(5);
      const height = Math.min(24, Math.max(2, Number(params.height ?? 9)));
      const layers = Math.min(5, Math.max(1, Number(params.layers ?? 4)));
      const snowy = String(params.snowy ?? "0") === "1";
      return options.simStampRun(kind, (w) => {
        const r = options.rngAt(px * 1.61 + (kid.length * 7), pz * 1.61 + (kid.length * 3));
        switch (kid) {
          case "tree.oak.classic": generateOakTree(px, pz, base, r, w); break;
          case "tree.oak.giant": generateOakTree(px, pz, base, r, w, { height, layers }); break;
          case "tree.cherry": generateCherryTree(px, pz, base, r, w); break;
          case "tree.maple": generateCrimsonMapleTree(px, pz, base, r, w); break;
          case "tree.aspen": generateGoldenAspenTree(px, pz, base, r, w); break;
          case "tree.warped": generateWarpedTree(px, pz, base, r, w); break;
          case "tree.bamboo": generateBambooGroves(px, pz, base, r, w, options.terrainHeight); break;
          case "tree.redwood": generateRedwoodTree(px, pz, base, r, w); break;
          case "tree.dark_oak": generateDarkOakTree(px, pz, base, r, w); break;
          case "tree.mushroom.red": generateHugeMushroom(px, pz, base, r, w, true); break;
          case "tree.mushroom.brown": generateHugeMushroom(px, pz, base, r, w, false); break;
          case "tree.birch": generateBirchTree(px, pz, base, r, w); break;
          case "tree.mangrove": generateMangroveTree(px, pz, base, r, w); break;
          case "tree.acacia": generateAcaciaTree(px, pz, base, r, w); break;
          case "tree.palm": generatePalmTree(px, pz, base, r, w); break;
          case "tree.meadow": generateMeadowTree(px, pz, base, r, w); break;
          case "tree.alpine": generateAlpinePine(px, pz, base, r, w); break;
          case "tree.jungle": generateJungleTree(px, pz, base, r, w, { tier: "canopy" }); break;
          case "tree.jungle.emergent": generateJungleTree(px, pz, base, r, w, { tier: "emergent" }); break;
          case "tree.spruce": options.pine(px, pz, base, r, snowy); break;
          default: generateOakTree(px, pz, base, r, w);
        }
      }, [px - 9, base - 1, pz - 9, px + 9, base + height + 4, pz + 9]);
    }
    if (kind.startsWith("house:")) {
      const S = STYLES.find((st) => st.key === kind.slice(6));
      if (!S) return { voxels: 0, ms: 0 };
      const wDim = Math.min(S.wMax, Math.max(S.wMin, Math.round(Number(params.width ?? S.wMin))));
      const x0 = px - Math.floor(wDim / 2), z0 = pz - Math.floor(wDim / 2);
      const H = { x0, z0, x1: x0 + wDim - 1, z1: z0 + wDim - 1, base, style: S, side };
      return options.simStampRun(kind, () => options.buildHouse(H), [x0 - 1, base - 4, z0 - 1, x0 + wDim, base + S.h + 4, z0 + wDim]);
    }
    if (kind.startsWith("block:")) {
      const bid = BLOCK_MAP.has(Number(params.id)) ? Number(params.id) : 1;
      const y0 = base + 1;
      const isDoor = bid === 105 || bid === 106; // doors are 2-block objects
      return options.simStampRun(kind, (w) => {
        w(px, y0, pz, bid);
        if (isDoor) w(px, y0 + 1, pz, bid);
      },
        [px, y0, pz, px + 1, y0 + (isDoor ? 3 : 2), pz + 1]);
    }
    const f = kind.startsWith("feature:") ? kind.slice(8) : kind;
    switch (f) {
      case "well": return options.simStampRun(kind, () => { if (options.wellAt) options.wellAt(px, pz, base); }, [px - 3, base - 1, pz - 3, px + 3, base + 6, pz + 3]);
      case "lamp": return options.simStampRun(kind, () => { if (options.lampPost) options.lampPost(px, pz, base); }, [px - 2, base - 1, pz - 2, px + 2, base + 6, pz + 2]);
      case "garden": return options.simStampRun(kind, (w2) => buildGarden(px - 3, pz - 3, px + 4, pz + 4, w2, options.clearUp, () => base), [px - 4, base - 1, pz - 4, px + 5, base + 4, pz + 5]);
      case "fountain": return options.simStampRun(kind, (w2) => generateSteppedFountain(px, pz, base, w2, options.clearUp), [px - 4, base - 1, pz - 4, px + 4, base + 7, pz + 4]);
      case "stilt": return options.simStampRun(kind, (w2) => generateStiltLakeHouse(px, pz, base + 1, base, w2, options.clearUp), [px - 8, base, pz - 8, px + 8, base + 10, pz + 8]);
      case "coral": return options.simStampRun(kind, (w2) => generateCoralReef(px, base, pz, options.rngAt(px * 2.33, pz * 2.33), w2), [px - 10, base - 2, pz - 10, px + 10, base + 10, pz + 10]);
      case "kelp": return options.simStampRun(kind, (w2) => generateKelpForest(px, base, pz, options.rngAt(px * 2.33, pz * 2.33), w2), [px - 10, base - 2, pz - 10, px + 10, base + 10, pz + 10]);
      case "wreck": return options.simStampRun(kind, (w2) => generateSunkenShipwreck(px, base, pz, options.rngAt(px * 2.33, pz * 2.33), w2), [px - 10, base - 2, pz - 10, px + 10, base + 10, pz + 10]);
      default: return { voxels: 0, ms: 0 };
    }
  });

  const simSceneGet = options.simSceneGet ?? (() => ({
    version: 1 as const,
    seed: s.seedText,
    savedAt: new Date().toISOString(),
    stamps: options.simStamps.map((st) => ({ name: st.cells[0] ? "stamp" : "stamp", cells: st.cells.map((c: any) => ({ x: c.x, y: c.y, z: c.z, prev: c.prev, next: c.next })) }))
  }));

  const simSceneRestore = options.simSceneRestore ?? ((raw: unknown): number => {
    const doc = validateSceneDoc(raw);
    if (!doc) return -1;
    while (options.simStamps.length) options.simUndo();
    let total = 0;
    for (const st of doc.stamps) {
      const dirty = new Set<string>();
      for (const c of st.cells) {
        if (c.y < 0 || c.y >= CHH) continue;
        const cx = c.x >> 4, cz = c.z >> 4;
        let ch = options.getChunk ? options.getChunk(cx, cz) : s.chunks.get(ckey(cx, cz));
        if (!ch && options.genChunk) { ch = options.genChunk(cx, cz); }
        if (!ch || !ch.data) continue;
        const off = c.y * 256 + (c.z & 15) * 16 + (c.x & 15);
        if (off >= ch.data.length) continue;
        ch.data[off] = c.next;
        if (c.next && c.y > ch.maxY) ch.maxY = c.y;
        if (options.registerEmitter) options.registerEmitter(c.x, c.y, c.z, c.next);
        dirty.add(ckey(cx, cz));
      }
      total += st.cells.length;
      for (const k of dirty) {
        const [cx, cz] = k.split(",").map(Number);
        if (options.buildMesh) options.buildMesh(cx, cz, 1.5);
      }
      options.simStamps.push({ cells: st.cells.map((c: any) => ({ k: `${c.x},${c.y},${c.z}`, x: c.x, y: c.y, z: c.z, prev: c.prev, next: c.next })) });
    }
    options.simLog(`scene restored — ${total} cells / ${doc.stamps.length} stamps`);
    return total;
  });

  const __stampRec = (
    kind: string, label: string, params: Record<string, number | string>, x: number, z: number, side: string,
    run: (wWriter: (x: number, y: number, z: number, id: number) => void) => void,
    bounds: [number, number, number, number, number, number]
  ) => {
    const res = options.simStampRun(label, run, bounds);
    options.simPlaced.push({ id: `p${++simPlacedSeq}`, kind, label, params, x, z, side, stampIdx: options.simStamps.length - 1 });
    return res;
  };

  (window as unknown as { __simRunKind?: unknown }).__simRunKind = simRunKind;
  (window as unknown as { __simWriteCell?: unknown }).__simWriteCell = simWriteCell;
  (window as unknown as { __simRebuildSkip?: unknown }).__simRebuildSkip = simRebuildSkip;
  (window as unknown as { __stampRec?: unknown }).__stampRec = __stampRec;
  (window as unknown as { __mobMgr?: unknown }).__mobMgr = options.mobMgr;
  (window as unknown as { __simLogRing?: () => string[] }).__simLogRing = options.simLogRing;

  (window as unknown as { __sim?: unknown }).__sim = {
    s,
    api: {
      stampRun: options.simStampRun,
      undo: options.simUndo,
      spawnVehicle: options.spawnVehicle,
      brushPaint: (spec: BrushSpec, cx: number, cy: number, cz: number, blockId: number) => {
        const b = brushBounds(spec, cx, cy, cz);
        const res = options.simStampRun(`brush:${spec.shape}:${blockId}`, (w) => {
          for (let x = b.x0; x <= b.x1; x++)
            for (let z = b.z0; z <= b.z1; z++)
              for (let y = b.y0; y <= b.y1; y++)
                if (brushContains(spec, cx, cy, cz, x, y, z)) w(x, y, z, blockId);
        }, [b.x0, b.y0, b.z0, b.x1, b.y1, b.z1]);
        options.showToast(`🖌️ ${spec.shape} brush → ${res.voxels} blocks of #${blockId}`);
        return res.voxels;
      },
      brushErase: (spec: BrushSpec, cx: number, cy: number, cz: number) => {
        const b = brushBounds(spec, cx, cy, cz);
        const res = options.simStampRun(`brush:${spec.shape}:erase`, (w) => {
          for (let x = b.x0; x <= b.x1; x++)
            for (let z = b.z0; z <= b.z1; z++)
              for (let y = b.y0; y <= b.y1; y++)
                if (brushContains(spec, cx, cy, cz, x, y, z) && s.getBlockFn?.(x, y, z) !== 0) w(x, y, z, 0);
        }, [b.x0, b.y0, b.z0, b.x1, b.y1, b.z1]);
        options.showToast(`🖌️ erased ${res.voxels} blocks`);
        return res.voxels;
      },
      stampTree: (kid: string, params: { height?: number; layers?: number; snowy?: string }, x: number, z: number) => {
        const surf = options.surfaceAt(Math.floor(x), Math.floor(z));
        const base = options.simFlat() ? 64 : surf.h;
        const height = Math.min(24, Math.max(2, params.height ?? 9));
        const layers = Math.min(5, Math.max(1, params.layers ?? 4));
        const snowy = params.snowy === "1";
        return __stampRec(
          `tree:${kid}`, `tree:${kid}`, { ...params, height, layers } as Record<string, number | string>,
          Math.floor(x), Math.floor(z), "S",
          (w) => {
            const r = options.rngAt(Math.floor(x * 1.61 + (kid.length * 7)), Math.floor(z * 1.61 + (kid.length * 3)));
            const X = Math.floor(x), Z = Math.floor(z);
            switch (kid) {
              case "tree.oak.classic": generateOakTree(X, Z, base, r, w); break;
              case "tree.oak.giant": generateOakTree(X, Z, base, r, w, { height, layers }); break;
              case "tree.cherry": generateCherryTree(X, Z, base, r, w); break;
              case "tree.maple": generateCrimsonMapleTree(X, Z, base, r, w); break;
              case "tree.aspen": generateGoldenAspenTree(X, Z, base, r, w); break;
              case "tree.warped": generateWarpedTree(X, Z, base, r, w); break;
              case "tree.bamboo": generateBambooGroves(X, Z, base, r, w, options.terrainHeight); break;
              case "tree.redwood": generateRedwoodTree(X, Z, base, r, w); break;
              case "tree.dark_oak": generateDarkOakTree(X, Z, base, r, w); break;
              case "tree.mushroom.red": generateHugeMushroom(X, Z, base, r, w, true); break;
              case "tree.mushroom.brown": generateHugeMushroom(X, Z, base, r, w, false); break;
              case "tree.birch": generateBirchTree(X, Z, base, r, w); break;
              case "tree.mangrove": generateMangroveTree(X, Z, base, r, w); break;
              case "tree.acacia": generateAcaciaTree(X, Z, base, r, w); break;
              case "tree.palm": generatePalmTree(X, Z, base, r, w); break;
              case "tree.meadow": generateMeadowTree(X, Z, base, r, w); break;
              case "tree.alpine": generateAlpinePine(X, Z, base, r, w); break;
              case "tree.spruce": options.pine(X, Z, base, r, snowy); break;
              default: generateOakTree(X, Z, base, r, w);
            }
          },
          [Math.floor(x) - 9, base - 1, Math.floor(z) - 9, Math.floor(x) + 9, base + height + 4, Math.floor(z) + 9]
        );
      },
      spawnFront: (dist = 6) => {
        const fdx = -Math.sin(s.player.yaw), fdz = -Math.cos(s.player.yaw);
        return {
          x: Math.floor(s.player.x + fdx * dist),
          z: Math.floor(s.player.z + fdz * dist)
        };
      },
      timeSet: (tick: number) => {
        s.time = Math.max(0, Math.min(23999, Math.round(tick)));
        options.setWorldTime(s.time);
      },
      orbitEnable: (enable: boolean, target?: { x: number; y: number; z: number }) => {
        if (!s.orbit) return false;
        if (target) s.orbit.target.set(target.x, target.y, target.z);
        else if (!s.orbit.target.lengthSq()) s.orbit.target.set(s.player.x, s.player.y + 1, s.player.z);
        s.orbit.enabled = enable;
        return enable;
      },
      orbitView: (view: OrbitView) => {
        if (!s.orbit) return;
        orbitView(s.orbit, view);
      },
      orbitSetTarget: (x: number, y: number, z: number) => {
        if (!s.orbit) return;
        s.orbit.target.set(x, y, z);
      },
      orbitFocus: (x: number, y: number, z: number) => {
        if (!s.orbit) return;
        s.orbit.target.set(x, y, z);
        s.orbit.enabled = true;
        options.showToast(`🎯 Focused on (${Math.round(x)}, ${Math.round(y)}, ${Math.round(z)})`);
      },
      orbitState: () => (s.orbit ? {
        enabled: s.orbit.enabled,
        view: s.orbit.view,
        distance: Math.round(s.orbit.distance * 10) / 10,
        target: { x: Math.round(s.orbit.target.x * 10) / 10, y: Math.round(s.orbit.target.y * 10) / 10, z: Math.round(s.orbit.target.z * 10) / 10 }
      } : null),
      focusShots: async (_radius = 7, _height = 3.2) => {
        void _radius; void _height;
        const tgt = options.simPlaced.length ? options.simPlaced[options.simPlaced.length - 1] : null;
        const fx = tgt ? tgt.x + 0.5 : s.player.x - Math.sin(s.player.yaw) * 4;
        const fz = tgt ? tgt.z + 0.5 : s.player.z - Math.cos(s.player.yaw) * 4;
        const baseY = tgt ? (options.simFlat() ? 64 : options.surfaceAt(tgt.x, tgt.z).h) : s.player.y;
        const dist = Math.hypot(s.player.x - fx, s.player.z - fz);
        const radius = Math.min(30, Math.max(2.5, dist));
        const flyY = baseY + Math.min(4.5, 1.35 + radius * 0.06);
        const saved = { x: s.player.x, y: s.player.y, z: s.player.z, yaw: s.player.yaw, pitch: s.player.pitch, fly: s.player.fly };
        const cv = s.renderer?.domElement as HTMLCanvasElement | undefined;
        if (!cv) return { count: 0 };
        const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
        const focusYaw = tgt ? s.player.yaw : 0;
        let count = 0;

        for (let i = 0; i < 3; i++) {
          const ang = (i === 0 ? 0 : i === 1 ? (2 * Math.PI) / 3 : (4 * Math.PI) / 3) + Math.PI / 2 + focusYaw;
          const dx = Math.cos(ang), dz = Math.sin(ang);
          s.player.x = fx + dx * radius;
          s.player.z = fz + dz * radius;
          s.player.y = flyY;
          s.player.fly = true;
          s.player.yaw = Math.atan2(-(fx - s.player.x), -(fz - s.player.z));
          s.player.pitch = -Math.min(0.10, 0.028 + radius * 0.008);
          await sleep(420);
          const blob = await encodeCanvasToJpegBlob(cv, cv.width, cv.height);
          if (blob) {
            count++;
            const name = `focus-${i}.jpg`;
            fetch(`/api/debug/snapshot?name=${encodeURIComponent(name)}`, {
              method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob
            }).catch(() => {});
          }
        }
        s.player.x = saved.x; s.player.y = saved.y; s.player.z = saved.z;
        s.player.yaw = saved.yaw; s.player.pitch = saved.pitch; s.player.fly = saved.fly;
        options.simLog(`focusShots: ${count} JPEG views @ radius ${radius.toFixed(1)} around (${fx.toFixed(0)},${fz.toFixed(0)})`);
        return { count, radius: Math.round(radius * 10) / 10 };
      },
      clearPad: () => {
        let n = 0;
        while (options.simStamps.length) { if (options.simUndo() > 0) n++; else break; }
        options.simLog(`clearPad: wiped ${n} stamps`);
        return n;
      },
      stampMob: (kind: "zombie" | "creeper" | "skeleton" | "spider" | "all", x: number, z: number) => {
        if (!s.scene) return { type: "none" };
        if (!s.mobInit) { options.mobMgr.init(s.scene); s.mobInit = true; }
        const kinds = kind === "all" ? (["zombie", "creeper", "skeleton", "spider"] as const) : [kind];
        let n = 0;
        for (const k of kinds) {
          const sx = Math.floor(x) + n * 3, sz = Math.floor(z);
          const mob = options.mobMgr.spawnHostileMobOf(k, sx, sz, options.surfaceAt);
          if (mob) { mob.x = sx + 0.5; mob.z = sz + 0.5; n++; }
        }
        return { type: kind, count: n };
      },
      stampVillager: (profIdx = 0, skinIdx = 0, x: number, z: number) => {
        if (!s.scene) return { type: "none", count: 0 };
        const prof = PROFESSIONS[profIdx % PROFESSIONS.length] || PROFESSIONS[0];
        const vMesh = createVillagerMesh(prof, skinIdx);
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        vMesh.root.position.set(Math.floor(x) + 0.5, base, Math.floor(z) + 0.5);
        s.scene.add(vMesh.root);
        options.simPlaced.push({
          id: `p${++simPlacedSeq}`,
          kind: `villager:${prof.name}`,
          label: `${prof.badge} ${prof.name}`,
          params: { professionIdx: profIdx, skinIdx },
          x: Math.floor(x),
          z: Math.floor(z),
          side: "S",
          stampIdx: options.simStamps.length - 1
        });
        return { type: prof.name, count: 1 };
      },
      spawnAnimal: (type: "cow" | "sheep" | "pig" | "chicken" | "horse" | "dog", x: number, z: number) => {
        if (!s.scene) return { ok: false };
        if (!s.mobInit) { options.mobMgr.init(s.scene); s.mobInit = true; }
        const y = (options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h) + 1;
        options.mobMgr.spawnSingleAnimal(Math.floor(x) + 0.5, y, Math.floor(z) + 0.5, type);
        return { ok: true };
      },
      mobs: () => ({
        animals: options.mobMgr.animals.map((a: any) => ({ t: a.type, x: Math.round(a.x * 10) / 10, y: a.y, z: Math.round(a.z * 10) / 10 })),
        villagers: [...s.villagers.values()].map(v => ({ x: Math.round(v.x * 10) / 10, y: v.y, z: Math.round(v.z * 10) / 10, state: v.state, targetX: v.targetX, targetZ: v.targetZ }))
      }),
      stampEntity: (kind: string, x: number, z: number) => {
        if (!s.scene) return { type: "none", count: 0 };
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        let group: THREE.Object3D | null = null;
        if (kind === "cow") group = createCowMesh().root;
        else if (kind === "sheep") group = createSheepMesh().root;
        else if (kind === "pig") group = createPigMesh().root;
        else if (kind === "chicken") group = createChickenMesh().root;
        else if (kind === "horse") group = createHorseMesh().root;
        else if (kind === "dog") group = createDogMesh().root;
        else if (kind === "chest") group = createArticulatedChest().root;
        else if (kind === "boat") group = createBoatMesh().root;
        if (group) {
          group.position.set(Math.floor(x) + 0.5, base, Math.floor(z) + 0.5);
          s.scene.add(group);
          options.simPlaced.push({
            id: `p${++simPlacedSeq}`,
            kind: `entity:${kind}`,
            label: kind,
            params: {},
            x: Math.floor(x),
            z: Math.floor(z),
            side: "S",
            stampIdx: options.simStamps.length - 1
          });
          return { type: kind, count: 1 };
        }
        return { type: kind, count: 0 };
      },
      stampStructure: (styleKey: string, width: number, x: number, z: number, side = "S") => {
        // Individually-spawnable researched interiors: `design:<key>` builds the
        // design's own shell + interior recipe (fixed footprint, side honored).
        if (styleKey.startsWith("design:")) {
          const meta = HOUSE_DESIGN_META.find((d) => d.key === styleKey.slice(7));
          if (!meta) return { voxels: 0, ms: 0 };
          const DS = STYLES.find((st) => st.key === meta.shell);
          if (!DS) return { voxels: 0, ms: 0 };
          const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
          const wDim = Math.min(DS.wMax, Math.max(DS.wMin, meta.w));
          const x0 = Math.floor(x) - Math.floor(wDim / 2), z0 = Math.floor(z) - Math.floor(wDim / 2);
          const H = { x0, z0, x1: x0 + wDim - 1, z1: z0 + wDim - 1, base, style: DS, side: (["N", "S", "E", "W"].includes(side) ? side : "S"), designKey: meta.key };
          return __stampRec(
            `house-design:${meta.key}`, `house-design:${meta.key}`, { design: meta.key, side: H.side } as Record<string, number | string>,
            Math.floor(x), Math.floor(z), H.side,
            () => options.buildHouse(H),
            [x0 - 1, base - 4, z0 - 1, x0 + wDim, base + DS.h + 6, z0 + wDim]
          );
        }
        const S = STYLES.find((st) => st.key === styleKey);
        if (!S) return { voxels: 0, ms: 0 };
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        const wDim = Math.min(S.wMax, Math.max(S.wMin, Math.round(width)));
        const x0 = Math.floor(x) - Math.floor(wDim / 2), z0 = Math.floor(z) - Math.floor(wDim / 2);
        const H = { x0, z0, x1: x0 + wDim - 1, z1: z0 + wDim - 1, base, style: S, side: (["N", "S", "E", "W"].includes(side) ? side : "S") };
        return __stampRec(
          `house:${S.key}`, `house:${S.key}`, { width, side: H.side } as Record<string, number | string>,
          Math.floor(x), Math.floor(z), H.side,
          () => options.buildHouse(H),
          [x0 - 1, base - 4, z0 - 1, x0 + wDim, base + S.h + 4, z0 + wDim]
        );
      },
      stampGarden: (x: number, z: number) => {
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        const x0 = Math.floor(x) - 3, z0 = Math.floor(z) - 3;
        return __stampRec(
          "feature:garden", "feature:garden", {}, Math.floor(x), Math.floor(z), "S",
          (w2) => buildGarden(x0, z0, x0 + 7, z0 + 7, w2, options.clearUp, () => base),
          [x0 - 1, base - 1, z0 - 1, x0 + 8, base + 4, z0 + 8]
        );
      },
      stampFountain: (x: number, z: number) => {
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        return __stampRec("feature:fountain", "feature:fountain", {}, Math.floor(x), Math.floor(z), "S",
          (w2) => generateSteppedFountain(Math.floor(x), Math.floor(z), base, w2, options.clearUp),
          [Math.floor(x) - 4, base - 1, Math.floor(z) - 4, Math.floor(x) + 4, base + 7, Math.floor(z) + 4]);
      },
      stampStiltLake: (x: number, z: number) => {
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        return __stampRec("feature:stilt", "feature:stilt", {}, Math.floor(x), Math.floor(z), "S",
          (w2) => generateStiltLakeHouse(Math.floor(x), Math.floor(z), base + 1, base, w2, options.clearUp),
          [Math.floor(x) - 8, base, Math.floor(z) - 8, Math.floor(x) + 8, base + 10, Math.floor(z) + 8]);
      },
      stampOcean: (kind: "coral" | "kelp" | "wreck", x: number, z: number) => {
        const base = options.simFlat() ? 62 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        const r = options.rngAt(Math.floor(x * 2.33), Math.floor(z * 2.33));
        return __stampRec(`feature:${kind}`, `feature:${kind}`, {}, Math.floor(x), Math.floor(z), "S",
          (w2) => {
            if (kind === "coral") generateCoralReef(Math.floor(x), base, Math.floor(z), r, w2);
            else if (kind === "kelp") generateKelpForest(Math.floor(x), base, Math.floor(z), r, w2);
            else generateSunkenShipwreck(Math.floor(x), base, Math.floor(z), r, w2);
          },
          [Math.floor(x) - 10, base - 2, Math.floor(z) - 10, Math.floor(x) + 10, base + 10, Math.floor(z) + 10]);
      },
      stampWell: (x: number, z: number) => {
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        return __stampRec("feature:well", "feature:well", {}, Math.floor(x), Math.floor(z), "S",
          (w2) => buildWell(Math.floor(x), Math.floor(z), base, w2, options.clearUp),
          [Math.floor(x) - 3, base - 1, Math.floor(z) - 3, Math.floor(x) + 3, base + 6, Math.floor(z) + 3]);
      },
      stampLamp: (x: number, z: number) => {
        const base = options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h;
        return __stampRec("feature:lamp", "feature:lamp", {}, Math.floor(x), Math.floor(z), "S",
          (w2) => buildLampPost(Math.floor(x), Math.floor(z), base, w2, options.clearUp),
          [Math.floor(x) - 2, base - 1, Math.floor(z) - 2, Math.floor(x) + 2, base + 6, Math.floor(z) + 2]);
      },
      stampBlock: (id: number, x: number, z: number) => {
        const base = (options.simFlat() ? 64 : options.surfaceAt(Math.floor(x), Math.floor(z)).h) + 1;
        const bid = BLOCK_MAP.has(id) ? id : 1;
        const isDoor = bid === 105 || bid === 106;
        const isLargeGrass = bid === 1200;
        const isTropicalBush = bid === 1202;
        return __stampRec(`block:${bid}`, `block:${bid}`, { id: bid } as Record<string, number | string>, Math.floor(x), Math.floor(z), "S",
          (w) => {
            w(Math.floor(x), base, Math.floor(z), bid);
            if (isDoor) w(Math.floor(x), base + 1, Math.floor(z), bid);
            if (isLargeGrass) w(Math.floor(x), base + 1, Math.floor(z), 1201);
            if (isTropicalBush) w(Math.floor(x), base + 1, Math.floor(z), 1203);
          },
          [Math.floor(x), base, Math.floor(z), Math.floor(x) + 1, base + (isDoor || isLargeGrass || isTropicalBush ? 2 : 1), Math.floor(z) + 1]);
      },
      regenerated: (seedish?: string) => { if (s.rebuildAndSpawnWorld) s.rebuildAndSpawnWorld(seedish || s.seedText, s.type); },
      objects: () => options.simPlaced.map((p) => ({ id: p.id, label: p.label, params: p.params, x: p.x, z: p.z, side: p.side })),
      removeObject: (id: string) => {
        const idx = options.simPlaced.findIndex((p) => p.id === id);
        if (idx < 0) return false;
        const stampIdx = options.simPlaced[idx].stampIdx;
        options.simPlaced.splice(idx, 1);
        simRebuildSkip(stampIdx);
        return true;
      },
      moveObject: (id: string, dx: number, dz: number) => {
        const idx = options.simPlaced.findIndex((p) => p.id === id);
        if (idx < 0) return false;
        const p = options.simPlaced[idx];
        const nx = p.x + dx, nz = p.z + dz;
        options.simPlaced.splice(idx, 1);
        simRebuildSkip(p.stampIdx);
        const res = simRunKind(p.kind, p.params, nx, nz, p.side);
        options.simPlaced.push({ ...p, x: nx, z: nz, stampIdx: options.simStamps.length - 1 });
        return res;
      },
      updateParams: (id: string, patch: Record<string, number | string>) => {
        const idx = options.simPlaced.findIndex((p) => p.id === id);
        if (idx < 0) return false;
        const p = options.simPlaced[idx];
        const next: Record<string, number | string> = { ...p.params, ...patch };
        options.simPlaced.splice(idx, 1);
        simRebuildSkip(p.stampIdx);
        const res = simRunKind(p.kind, next, p.x, p.z, p.side);
        options.simPlaced.push({ ...p, params: next, stampIdx: options.simStamps.length - 1 });
        return res;
      },
      sceneGet: simSceneGet,
      sceneRestore: simSceneRestore,
      snapCurrentView: async () => {
        const cv = s.renderer?.domElement as HTMLCanvasElement | undefined;
        if (!cv) return { ok: false, error: "no canvas" };
        const blob = await encodeCanvasToJpegBlob(cv, cv.width, cv.height);
        if (blob) {
          const name = `live-snap.jpg`;
          await fetch(`/api/debug/snapshot?name=${encodeURIComponent(name)}`, {
            method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob
          }).catch(() => {});
          const tsName = `live-snap-${Date.now()}.jpg`;
          await fetch(`/api/debug/snapshot?name=${encodeURIComponent(tsName)}`, {
            method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob
          }).catch(() => {});
          options.simLog(`snapCurrentView: saved snapshot ${name} (${s.player.x.toFixed(1)}, ${s.player.y.toFixed(1)}, ${s.player.z.toFixed(1)})`);
          return { ok: true, name, tsName };
        }
        return { ok: false, error: "encode failed" };
      },
      startBuilding: () => {
        s.simBuildingMode = true;
        s.creative = true;
        s.player.fly = true;
        if (!s.hotbar) {
          s.hotbar = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
      },
      stopBuilding: () => {
        s.simBuildingMode = false;
      },
      toggleBuilding: () => {
        s.simBuildingMode = !s.simBuildingMode;
        if (s.simBuildingMode) {
          s.creative = true;
          s.player.fly = true;
        }
      },
      isBuilding: () => !!s.simBuildingMode,
      selectBlueprintWand: (doc: BlueprintDoc | null) => {
        options.wandManager.selectBlueprint(doc);
        if (doc) {
          options.showToast(`🪄 Blueprint "${doc.name}" equipped! Left-Click to place, 'R' to rotate, Esc to cancel.`);
        }
      },
      rotateWand: () => {
        options.wandManager.rotate();
        return options.wandManager.state.rotation;
      },
      clearWand: () => {
        options.wandManager.selectBlueprint(null);
      },
      isWandActive: () => !!options.wandManager.state.activeDoc,
      getWandState: () => ({
        activeDoc: options.wandManager.state.activeDoc,
        rotation: options.wandManager.state.rotation,
        targetPos: options.wandManager.state.targetPos
      }),
      toggleAreaSelect: (force?: boolean) => {
        const next = typeof force === "boolean" ? force : !s.areaSelectMode;
        s.areaSelectMode = next;
        if (!next) {
          if (s.areaBoxMesh) { options.scene.remove(s.areaBoxMesh); s.areaBoxMesh = null; }
          if (s.areaBoxFill) { options.scene.remove(s.areaBoxFill); s.areaBoxFill = null; }
        } else {
          options.updateAreaBoxMesh();
        }
        return s.areaSelectMode;
      },
      setAreaPos1: (x: number, y: number, z: number) => {
        s.areaPos1 = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
        options.updateAreaBoxMesh();
      },
      setAreaPos2: (x: number, y: number, z: number) => {
        s.areaPos2 = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
        options.updateAreaBoxMesh();
      },
      getAreaBounds: () => {
        if (!s.areaPos1 || !s.areaPos2) return null;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        return {
          pos1: s.areaPos1,
          pos2: s.areaPos2,
          x0, y0, z0, x1, y1, z1,
          width: x1 - x0 + 1,
          height: y1 - y0 + 1,
          depth: z1 - z0 + 1,
          totalBlocks: (x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1)
        };
      },
      clearAreaSelect: () => {
        s.areaPos1 = null;
        s.areaPos2 = null;
        s.areaSelectMode = false;
        if (s.areaBoxMesh) { options.scene.remove(s.areaBoxMesh); s.areaBoxMesh = null; }
        if (s.areaBoxFill) { options.scene.remove(s.areaBoxFill); s.areaBoxFill = null; }
        if (s.areaGizmo) { options.scene.remove(s.areaGizmo); s.areaGizmo = null; }
      },
      isAreaSelectActive: () => !!s.areaSelectMode,
      areaMove: (dx: number, dy: number, dz: number) => {
        if (!s.areaPos1 || !s.areaPos2) return 0;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        const moves: Array<{ x: number; y: number; z: number; id: number; tx: number; ty: number; tz: number }> = [];
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
          const id = s.getBlockFn?.(x, y, z) || 0;
          if (id !== 0) moves.push({ x, y, z, id, tx: x + dx, ty: y + dy, tz: z + dz });
        }
        const res = options.simStampRun(`area:move:${dx},${dy},${dz}`, (w) => {
          for (const m of moves) w(m.x, m.y, m.z, 0);
          for (const m of moves) w(m.tx, m.ty, m.tz, m.id);
        }, [Math.min(x0, x0 + dx), Math.min(y0, y0 + dy), Math.min(z0, z0 + dz), Math.max(x1, x1 + dx), Math.max(y1, y1 + dy), Math.max(z1, z1 + dz)]);
        s.areaPos1 = { x: s.areaPos1.x + dx, y: s.areaPos1.y + dy, z: s.areaPos1.z + dz };
        s.areaPos2 = { x: s.areaPos2.x + dx, y: s.areaPos2.y + dy, z: s.areaPos2.z + dz };
        options.updateAreaBoxMesh();
        options.showToast(`↔ Moved ${res.voxels} blocks by (${dx},${dy},${dz})`);
        return res.voxels;
      },
      fillArea: (blockId: number) => {
        if (!s.areaPos1 || !s.areaPos2) return 0;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        const res = options.simStampRun(`area:fill:${blockId}`, (w) => {
          for (let x = x0; x <= x1; x++) {
            for (let z = z0; z <= z1; z++) {
              for (let y = y0; y <= y1; y++) {
                w(x, y, z, blockId);
              }
            }
          }
        }, [x0, y0, z0, x1, y1, z1]);
        options.showToast(`📐 Filled ${res.voxels} blocks with #${blockId}`);
        return res.voxels;
      },
      clearArea: () => {
        if (!s.areaPos1 || !s.areaPos2) return 0;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        const res = options.simStampRun("area:clear", (w) => {
          for (let x = x0; x <= x1; x++) {
            for (let z = z0; z <= z1; z++) {
              for (let y = y0; y <= y1; y++) {
                if (s.getBlockFn?.(x, y, z) !== 0) w(x, y, z, 0);
              }
            }
          }
        }, [x0, y0, z0, x1, y1, z1]);
        options.showToast(`📐 Cleared ${res.voxels} blocks in selection`);
        return res.voxels;
      },
      replaceArea: (fromId: number, toId: number) => {
        if (!s.areaPos1 || !s.areaPos2) return 0;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        const res = options.simStampRun(`area:replace:${fromId}->${toId}`, (w) => {
          for (let x = x0; x <= x1; x++) {
            for (let z = z0; z <= z1; z++) {
              for (let y = y0; y <= y1; y++) {
                if (s.getBlockFn?.(x, y, z) === fromId) w(x, y, z, toId);
              }
            }
          }
        }, [x0, y0, z0, x1, y1, z1]);
        options.showToast(`📐 Replaced ${res.voxels} blocks (${fromId} ➔ ${toId})`);
        return res.voxels;
      },
      copyArea: () => {
        if (!s.areaPos1 || !s.areaPos2) return null;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        const doc = scanStructureFromBounds((x, y, z) => s.getBlockFn?.(x, y, z) || 0, x0, y0, z0, x1, y1, z1, { name: "Clipboard Selection" });
        if (doc) {
          (s as any).simClipboard = doc;
          options.showToast(`📋 Copied ${doc.totalBlocks} blocks to clipboard!`);
        } else {
          options.showToast("Nothing to copy in selected area");
        }
        return doc;
      },
      pasteArea: () => {
        const clip = (s as any).simClipboard as BlueprintDoc | null;
        if (!clip) {
          options.showToast("Clipboard is empty! Copy an area first.");
          return false;
        }
        options.wandManager.selectBlueprint(clip);
        options.showToast(`🪄 Pasting "${clip.name}" (${clip.totalBlocks} blocks) — Aim & Click to place, 'R' to rotate!`);
        return true;
      },
      cutArea: () => {
        if (!s.areaPos1 || !s.areaPos2) return null;
        const x0 = Math.min(s.areaPos1.x, s.areaPos2.x), x1 = Math.max(s.areaPos1.x, s.areaPos2.x);
        const y0 = Math.min(s.areaPos1.y, s.areaPos2.y), y1 = Math.max(s.areaPos1.y, s.areaPos2.y);
        const z0 = Math.min(s.areaPos1.z, s.areaPos2.z), z1 = Math.max(s.areaPos1.z, s.areaPos2.z);
        const doc = scanStructureFromBounds((x, y, z) => s.getBlockFn?.(x, y, z) || 0, x0, y0, z0, x1, y1, z1, { name: "Cut Selection" });
        if (doc) {
          (s as any).simClipboard = doc;
          options.simStampRun("area:cut", (w) => {
            for (let x = x0; x <= x1; x++) {
              for (let z = z0; z <= z1; z++) {
                for (let y = y0; y <= y1; y++) {
                  if (s.getBlockFn?.(x, y, z) !== 0) w(x, y, z, 0);
                }
              }
            }
          }, [x0, y0, z0, x1, y1, z1]);
          options.showToast(`✂️ Cut ${doc.totalBlocks} blocks to clipboard!`);
        }
        return doc;
      },
      setHotbar: (newHotbar: number[]) => {
        s.hotbar = [...newHotbar];
        options.setHotbar([...newHotbar]);
      },
      isoThumbnails: options.thumbs,
      log: () => options.simLogRing()
    }
  };

  options.simLog("__sim bridge exposed (stamp/undo/stampTree/regenerate + state ref)");
}
