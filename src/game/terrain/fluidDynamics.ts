import { CHH } from "../world";
import type { GameState } from "../state/gameState";
import { getBlock, setRaw, ckey, getChunk } from "../world/chunkData";

export const WATER_MAX = 15;
export const LAVA_MAX = 8;
export const SLOW_AFTER = 10;

export function createFluidSimulator() {
  const fluidLevel = new Map<string, number>();
  const fluidFromFlow = new Set<string>();
  const fluidKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

  function dryUpFluids(
    s: GameState,
    sx: number,
    sy: number,
    sz: number,
    id: number,
    callbacks: {
      buildMesh: (cx: number, cz: number) => void;
    }
  ): void {
    const comp = new Set<string>();
    const stack: [number, number, number][] = [[sx, sy, sz]];
    comp.add(fluidKey(sx, sy, sz));
    const dirs6: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

    while (stack.length) {
      const [cx, cy, cz] = stack.pop()!;
      for (const [dx, dy, dz] of dirs6) {
        const nx = cx + dx, ny = cy + dy, nz = cz + dz;
        const k = fluidKey(nx, ny, nz);
        if (comp.has(k)) continue;
        if (getBlock(s, nx, ny, nz) !== id) continue;
        comp.add(k);
        stack.push([nx, ny, nz]);
      }
    }

    const sources = [...comp].filter((k) => !fluidFromFlow.has(k) && k !== fluidKey(sx, sy, sz));
    let dry: string[] = [];
    if (sources.length === 0) {
      dry = [...comp];
    } else {
      const reach = new Set(sources);
      const q = [...sources];
      while (q.length) {
        const k = q.pop()!;
        const [cx, cy, cz] = k.split(",").map(Number);
        for (const [dx, dy, dz] of dirs6) {
          const nk = fluidKey(cx + dx, cy + dy, cz + dz);
          if (comp.has(nk) && !reach.has(nk)) { reach.add(nk); q.push(nk); }
        }
      }
      dry = [...comp].filter((k) => !reach.has(k));
    }

    if (!dry.length) return;
    const drySet = new Set(dry);
    s.liquidQ = s.liquidQ.filter((it) => !drySet.has(fluidKey(it[0], it[1], it[2])));
    const dirtyChunks = new Set<string>();

    const markDirty = (bx: number, bz: number) => {
      dirtyChunks.add(ckey(bx >> 4, bz >> 4));
      if ((bx & 15) === 0) dirtyChunks.add(ckey((bx >> 4) - 1, bz >> 4));
      if ((bx & 15) === 15) dirtyChunks.add(ckey((bx >> 4) + 1, bz >> 4));
      if ((bz & 15) === 0) dirtyChunks.add(ckey(bx >> 4, (bz >> 4) - 1));
      if ((bz & 15) === 15) dirtyChunks.add(ckey(bx >> 4, (bz >> 4) + 1));
    };

    for (const k of dry) {
      const [cx, cy, cz] = k.split(",").map(Number);
      setRaw(s, cx, cy, cz, 0);
      fluidLevel.delete(k);
      fluidFromFlow.delete(k);
      markDirty(cx, cz);
    }

    dirtyChunks.forEach((k) => {
      const [ccx, ccz] = k.split(",").map(Number);
      if (getChunk(s, ccx, ccz)) callbacks.buildMesh(ccx, ccz);
    });
  }

  function stepLiquids(
    s: GameState,
    callbacks: {
      buildMesh: (cx: number, cz: number) => void;
      showToast?: (m: string) => void;
      villagesNear: (x: number, z: number) => any[];
      villagePlan: (v: any) => any;
    }
  ): void {
    if (s.liquidQ.length === 0) return;
    const px = s.player.x, pz = s.player.z;
    const batchSize = Math.min(s.liquidQ.length, 24);
    const nextQ: [number, number, number, number, number, number?][] = [];
    const dirtyChunks = new Set<string>();

    const markDirty = (bx: number, bz: number) => {
      dirtyChunks.add(ckey(bx >> 4, bz >> 4));
      if ((bx & 15) === 0) dirtyChunks.add(ckey((bx >> 4) - 1, bz >> 4));
      if ((bx & 15) === 15) dirtyChunks.add(ckey((bx >> 4) + 1, bz >> 4));
      if ((bz & 15) === 0) dirtyChunks.add(ckey(bx >> 4, (bz >> 4) - 1));
      if ((bz & 15) === 15) dirtyChunks.add(ckey(bx >> 4, (bz >> 4) + 1));
    };

    const persistCell = (bx: number, by: number, bz: number, bid: number) => {
      const k = `${bx},${by},${bz}`;
      s.edits.set(k, bid);
      const wid = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
      s.pendingEdits.push({ worldId: wid, edit: { x: bx, y: by, z: bz, blockId: bid, prevBlockId: 0, action: "flow" } });
    };

    for (let i = 0; i < batchSize; i++) {
      const item = s.liquidQ.shift();
      if (!item) continue;
      const [x, y, z, id, flowDist, slowDelay = 0] = item;

      if (flowDist >= SLOW_AFTER && slowDelay === 1) {
        item[5] = 0;
        s.liquidQ.push(item);
        continue;
      }

      const d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 > 1600) continue;

      const cur = getBlock(s, x, y, z);
      if (cur !== id && cur !== 0) continue;
      if (y <= 1 || y >= CHH - 2) continue;

      const below = getBlock(s, x, y - 1, z);

      // Waterfall / Lavafall straight down
      if (below === 0) {
        setRaw(s, x, y - 1, z, id);
        persistCell(x, y - 1, z, id);
        markDirty(x, z);
        fluidLevel.set(fluidKey(x, y - 1, z), flowDist);
        fluidFromFlow.add(fluidKey(x, y - 1, z));
        nextQ.push([x, y - 1, z, id, flowDist, 0]);
        continue;
      }

      // Vertical Fluid Reactions
      if (id === 39 && below === 40) {
        setRaw(s, x, y - 1, z, 36); // Water onto lava -> Obsidian
        persistCell(x, y - 1, z, 36);
        markDirty(x, z);
        callbacks.showToast?.("Obsidian formed! 🪨");
        continue;
      } else if (id === 40 && below === 39) {
        setRaw(s, x, y - 1, z, 5); // Lava onto water -> Stone
        persistCell(x, y - 1, z, 5);
        markDirty(x, z);
        callbacks.showToast?.("Stone formed! 🌋");
        continue;
      }

      // Lateral Flow & Reactions
      const maxDist = id === 39 ? WATER_MAX : LAVA_MAX;
      if (flowDist < maxDist) {
        const dirsAll = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
        const dirs = flowDist >= SLOW_AFTER ? [dirsAll[flowDist % 4]] : dirsAll;

        for (const [dx, dz] of dirs) {
          const nx = x + dx, nz = z + dz;
          const target = getBlock(s, nx, y, nz);
          const newLevel = flowDist + 1;

          if (id === 39 && target === 40) {
            setRaw(s, nx, y, nz, 6);
            persistCell(nx, y, nz, 6);
            markDirty(nx, nz);
            callbacks.showToast?.("Cobblestone created! 🧱");
          } else if (id === 40 && target === 39) {
            setRaw(s, nx, y, nz, 6);
            persistCell(nx, y, nz, 6);
            markDirty(nx, nz);
            callbacks.showToast?.("Cobblestone created! 🧱");
          } else if (id === 40 && (target === 51 || target === 52 || target === 53)) {
            setRaw(s, nx, y, nz, 39);
            persistCell(nx, y, nz, 39);
            markDirty(nx, nz);
            fluidLevel.set(fluidKey(nx, y, nz), 0);
            fluidFromFlow.delete(fluidKey(nx, y, nz));
            nextQ.push([nx, y, nz, 39, 0, 0]);
          } else if (target === 0) {
            let isHouseInterior = false;
            for (const v of callbacks.villagesNear(nx, nz)) {
              if (Math.hypot(nx - v.vx, nz - v.vz) < v.r + 4) {
                const plan = callbacks.villagePlan(v);
                for (const h of plan.houses) {
                  if (nx >= h.x0 && nx <= h.x1 && nz >= h.z0 && nz <= h.z1 && y >= h.base && y <= h.base + (h.style?.h || 4)) {
                    isHouseInterior = true;
                    break;
                  }
                }
                if (isHouseInterior) break;
              }
            }
            if (isHouseInterior) continue;

            setRaw(s, nx, y, nz, id);
            persistCell(nx, y, nz, id);
            markDirty(nx, nz);
            fluidLevel.set(fluidKey(nx, y, nz), newLevel);
            fluidFromFlow.add(fluidKey(nx, y, nz));
            nextQ.push([nx, y, nz, id, newLevel, newLevel >= SLOW_AFTER ? 1 : 0]);
          }
        }
      }
    }

    s.liquidQ = s.liquidQ.concat(nextQ);

    dirtyChunks.forEach(k => {
      const [cx, cz] = k.split(",").map(Number);
      if (getChunk(s, cx, cz)) callbacks.buildMesh(cx, cz);
    });
  }

  return { dryUpFluids, stepLiquids };
}
