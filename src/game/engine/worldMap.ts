import type { GameState } from "../state/gameState";
import type { Chunk } from "../world";
import { CH, CHH, SEA } from "../world";
import { REGION, type VillageData, type SurfaceInfo } from "../terrain/terrainGenerator";

export interface WorldMapCtx {
  s: GameState;
  ckey: (cx: number, cz: number) => string;
  getChunk: (cx: number, cz: number) => Chunk | undefined;
  surfaceAt: (x: number, z: number) => SurfaceInfo;
  getBiome: (x: number, z: number) => any;
  hash2: (x: number, z: number) => number;
  villagesNear: (x: number, z: number, blend?: number) => VillageData[];
  villageAt: (rx: number, rz: number) => VillageData | null;
  villagePlan: (v: any) => any;
  terrainHeight: (x: number, z: number) => number;
}

const MAPCOL: [number, number, number][] = [
  [  0,  0,  0], [104,157, 74], [134, 96, 67], [120, 85, 55], [100, 70, 45],
  [140,140,140], [128,128,128], [115,130,115], [154,154,154], [165,165,165],
  [222,208,157], [215,200,150], [141,136,128], [155,160,170], [ 50, 50, 50],
  [ 35, 25, 55], [111, 83, 52], [177,133, 79], [ 62,122, 46], [230,225,215],
  [215,195,155], [ 93,143, 55], [ 78, 58, 38], [104, 80, 50], [ 40, 84, 48],
  [ 86, 68, 28], [184,135,100], [ 50,119, 29], [186, 99, 54], [ 60, 39, 18],
  [110,110,110], [180,155,140], [240,225, 75], [210, 35, 35], [ 24, 69,168],
  [ 93,236,245], [ 23,221, 98], [186,220,232], [ 40, 35, 46], [ 44, 94,168],
  [232, 82, 14], [150,110, 66], [138,138,138], [141,100, 40], [138, 99, 55],
  [219, 56, 38], [246,214,108], [223,182, 85], [181,216,208], [214,173, 40],
  [148, 68, 55], [243,246,250], [169,210,234], [160,198,232], [226,238,246],
  [112, 83, 56], [114, 41, 41], [ 81, 64, 53], [ 48, 24, 28], [223,221,166],
  [170,122,169], [ 91,152,143], [230,227,218], [181, 58, 48], [ 46, 60,178],
  [219,183, 40], [ 79,163, 40], [ 25, 25, 25], [123, 46,178], [219,105, 31],
  [150,110, 65], [128,128,128], [154,154,154], [140,140,140], [165,165,165],
  [180, 90, 60], [104, 80, 50], [184,135,100], [170,122,169], [255,200, 80],
  [ 80,200,255], [ 50,180,255], [255,160, 40], [255, 40, 40], [255,140, 40],
  [ 80,200,255], [255,170, 30], [255,150, 70], [255,230,120], [240,170,255],
  [140,255,170], [255,255,255], [200, 50,255], [220,255,255], [ 70,255,255],
  [255,100, 20], [200,140,255], [150, 30,255], [255,100, 30], [150,240,170],
  [255,220, 70], [255,140, 20], [255,170, 90], [140,140,140], [140,100, 70],
  [140,100, 70], [140,100, 70], [140,100, 70],
  [255,183,213], [216, 40, 29], [245,183,  0], [123, 44,191], [ 56,176,  0],
  [ 45,106, 79], [  8, 28, 21], [112,224,  0], [ 82,121,111], [138,154, 91],
  [ 74, 37, 52], [ 92, 29, 36], [ 22, 97, 91], [139, 58, 28], [255,183,213]
];

export interface WorldMap {
  paintTile: (img: ImageData, ids: Uint8Array, hs: Int16Array, wx0: number, wz0: number) => void;
  buildTileReal: (cx: number, cz: number) => { cv: HTMLCanvasElement; real: boolean } | null;
  buildTileFar: (cx: number, cz: number) => { cv: HTMLCanvasElement; real: boolean };
  tileFor: (cx: number, cz: number, allowFar: boolean, stride?: number) => { cv: HTMLCanvasElement; real: boolean; soft?: boolean } | null;
  drawMap: (cv: HTMLCanvasElement | null, blocksPerPx: number, circular: boolean, markers?: MapMarker[]) => void;
}

export interface MapMarker {
  x: number;
  z: number;
  color: string;
  icon?: string;
  label?: string;
  ghost?: boolean;
  pulse?: boolean;
}

export interface MapView {
  W: number;
  H: number;
  scale: number;
  yaw: number;
  px: number;
  pz: number;
}

export function worldToScreen(v: MapView, x: number, z: number): { sx: number; sy: number } {
  const dx = (x - v.px) * v.scale, dz = (z - v.pz) * v.scale;
  const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw);
  return { sx: v.W / 2 + dx * cy - dz * sy, sy: v.H / 2 + dx * sy + dz * cy };
}

export function screenToWorld(v: MapView, sx: number, sy: number): { x: number; z: number } {
  const dx = (sx - v.W / 2) / v.scale, dz = (sy - v.H / 2) / v.scale;
  const cy = Math.cos(v.yaw), sn = Math.sin(v.yaw);
  return { x: v.px + dx * cy + dz * sn, z: v.pz - dx * sn + dz * cy };
}

const COMPASS = [["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["W", -1, 0]] as const;

const SPIRAL: [number, number][] = (() => {
  const arr: [number, number][] = [];
  for (let dz = -48; dz <= 48; dz++) for (let dx = -48; dx <= 48; dx++) arr.push([dx, dz]);
  arr.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]));
  return arr;
})();

export function createWorldMap(ctx: WorldMapCtx): WorldMap {
  const s = ctx.s;

  function getMapBlockColor(id: number): readonly [number, number, number] {
    if (id === 1205 || id === 1206) return [194, 188, 179] as const; // Porch stairs
    if (id === 277) return [180, 25, 40] as const; // Crimson Nylium
    if (id === 677) return [22, 126, 134] as const; // Warped Nylium
    if (id === 173) return [75, 75, 82] as const; // Basalt
    if (id === 193) return [40, 35, 42] as const; // Blackstone
    if (id === 632) return [75, 55, 45] as const; // Soul Soil
    if (id === 57) return [81, 64, 53] as const; // Soul Sand
    if (id === 56) return [114, 41, 41] as const; // Netherrack
    if (id === 40) return [232, 82, 14] as const; // Lava
    if (id === 98) return [160, 45, 230] as const; // Nether Portal
    if (id === 47) return [255, 215, 90] as const; // Glowstone
    if (id === 88) return [255, 170, 80] as const; // Shroomlight
    if (id === 630 || id === 631) return [40, 200, 255] as const; // Soul Fire
    return MAPCOL[id] || ([120, 120, 120] as const);
  }

  function paintTile(img: ImageData, ids: Uint8Array, hs: Int16Array, wx0: number, wz0: number) {
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const i = z * 16 + x, id = ids[i], h = hs[i], o = i * 4;
      if (!id) { img.data[o + 3] = 0; continue; }
      const col = getMapBlockColor(id);
      const hn = z > 0 ? hs[i - 16] : ctx.terrainHeight(wx0 + x, wz0 + z - 1);
      let f = 1 + Math.max(-0.32, Math.min(0.32, (h - hn) * 0.13));
      f *= 0.72 + Math.min(1, h / (CHH * 0.72)) * 0.46;
      img.data[o]     = Math.min(255, col[0] * f);
      img.data[o + 1] = Math.min(255, col[1] * f);
      img.data[o + 2] = Math.min(255, col[2] * f);
      img.data[o + 3] = 255;
    }
  }

  function buildTileReal(cx: number, cz: number) {
    const c = ctx.getChunk(cx, cz);
    if (!c) return null;
    const cv = document.createElement("canvas"); cv.width = cv.height = 16;
    const ctx2 = cv.getContext("2d")!;
    const img = ctx2.createImageData(16, 16);
    const ids = new Uint8Array(256), hs = new Int16Array(256);
    const yTop = Math.min(CHH - 1, c.maxY);
    const isNether = s.dimension === "nether";

    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      let id = 0, y = yTop;
      if (isNether) {
        // In the Nether: bypass solid bedrock ceiling (Y >= 120) and scan cavern floor
        y = Math.min(yTop, 119);
        while (y > 32 && c.data[y * 256 + z * 16 + x] !== 0) y--;
        while (y > 31 && c.data[y * 256 + z * 16 + x] === 0) y--;
        id = c.data[y * 256 + z * 16 + x] || (y <= 31 ? 40 : 56);
      } else {
        for (; y >= 0; y--) { const blk = c.data[y * 256 + z * 16 + x]; if (blk) { id = blk; break; } }
      }
      ids[z * 16 + x] = id; hs[z * 16 + x] = y < 0 ? 0 : y;
    }
    paintTile(img, ids, hs, cx * 16, cz * 16);
    ctx2.putImageData(img, 0, 0);
    return { cv, real: true };
  }

  function buildTileFar(cx: number, cz: number, stride = 1) {
    const st = Math.max(1, Math.min(8, stride | 0));
    const cv = document.createElement("canvas"); cv.width = cv.height = 16;
    const ctx2 = cv.getContext("2d")!;
    const img = ctx2.createImageData(16, 16);
    const ids = new Uint8Array(256), hs = new Int16Array(256);
    const gx0 = cx * 16, gz0 = cz * 16;
    const isNether = s.dimension === "nether";

    for (let z = 0; z < 16; z += st) for (let x = 0; x < 16; x += st) {
      const wx = gx0 + x, wz = gz0 + z;
      let id = 0, h = 0;
      if (isNether) {
        const h2 = ctx.hash2(wx * 4, wz * 4);
        if (h2 < 0.22) { id = 40; h = 31; }
        else if (h2 < 0.45) { id = 277; h = 48; }
        else if (h2 < 0.65) { id = 677; h = 52; }
        else if (h2 < 0.8) { id = 57; h = 42; }
        else { id = 56; h = 58; }
      } else {
        const surf = ctx.surfaceAt(wx, wz);
        if (surf.h <= SEA) { id = surf.cold ? 52 : 39; h = SEA; }
        else {
          const biome = ctx.getBiome(wx, wz);
          id = surf.top;
          if ((id === 1 || id === 54) && ctx.hash2(wx * 7, wz * 13) < biome.density * 1.6) {
            id = biome.leafId;
          }
          h = surf.h;
        }
      }
      for (let fz = z; fz < Math.min(16, z + st); fz++) for (let fx = x; fx < Math.min(16, x + st); fx++) {
        ids[fz * 16 + fx] = id; hs[fz * 16 + fx] = h;
      }
    }

    const vs = ctx.villagesNear(gx0 + 8, gz0 + 8);
    for (const v of vs) {
      const p = ctx.villagePlan(v);
      for (const rd of p.roads) {
        for (let rz = Math.max(0, rd.z0 - gz0); rz <= Math.min(15, rd.z1 - gz0); rz++) {
          for (let rx = Math.max(0, rd.x0 - gx0); rx <= Math.min(15, rd.x1 - gx0); rx++) {
            ids[rz * 16 + rx] = 6;
            hs[rz * 16 + rx] = p.base;
          }
        }
      }
      for (const h of p.houses) {
        for (let hz = Math.max(0, h.z0 - gz0); hz <= Math.min(15, h.z1 - gz0); hz++) {
          for (let hx = Math.max(0, h.x0 - gx0); hx <= Math.min(15, h.x1 - gx0); hx++) {
            ids[hz * 16 + hx] = h.style.roof || 17;
            hs[hz * 16 + hx] = p.base + (h.style.h || 4);
          }
        }
      }
    }

    paintTile(img, ids, hs, gx0, gz0);
    ctx2.putImageData(img, 0, 0);
    return { cv, real: false, soft: st > 1 };
  }

  function tileFor(cx: number, cz: number, allowFar: boolean, stride = 1): { cv: HTMLCanvasElement; real: boolean; soft?: boolean } | null {
    const k = ctx.ckey(cx, cz), have = s.mapTiles.get(k), live = ctx.getChunk(cx, cz);
    if (have) {
      if (live && !have.real && s.tileBudgetReal > 0) {
        s.tileBudgetReal--;
        const n = buildTileReal(cx, cz);
        if (n) { s.mapTiles.set(k, n); return n; }
      }
      if (!live && !have.real && have.soft && stride <= 1 && s.tileBudgetFar > 0) {
        s.tileBudgetFar--;
        const n = buildTileFar(cx, cz, 1);
        if (n) { s.mapTiles.set(k, { cv: n.cv, real: false }); return s.mapTiles.get(k)!; }
      }
      return have;
    }
    let made = null;
    if (live) {
      if (s.tileBudgetReal > 0) {
        s.tileBudgetReal--;
        made = buildTileReal(cx, cz);
      } else if (s.tileBudgetFar > 0) {
        s.tileBudgetFar--;
        made = buildTileFar(cx, cz, stride);
      }
    } else if (allowFar && s.tileBudgetFar > 0) {
      s.tileBudgetFar--;
      made = buildTileFar(cx, cz, stride);
    }
    if (!made) return null;
    s.mapTiles.set(k, made);
    return made;
  }

  function drawMap(cv: HTMLCanvasElement | null, blocksPerPx: number, circular: boolean, markers?: MapMarker[]) {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, circular ? 1.5 : 1);
    const cw = cv.clientWidth || (circular ? 160 : 700), ch = cv.clientHeight || (circular ? 160 : 700);
    if (!cw || !ch) return;
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    }
    const ctx2 = cv.getContext("2d")!;
    const W = cv.width, H = cv.height, scale = blocksPerPx * dpr;

    ctx2.setTransform(1, 0, 0, 1, 0, 0);
    ctx2.fillStyle = "#0a0e12";
    ctx2.fillRect(0, 0, W, H);

    ctx2.save();
    if (circular) { ctx2.beginPath(); ctx2.arc(W / 2, H / 2, Math.min(W, H) / 2, 0, 7); ctx2.clip(); }
    ctx2.imageSmoothingEnabled = false;
    ctx2.translate(W / 2, H / 2);
    ctx2.rotate(s.player.yaw);
    ctx2.scale(scale, scale);
    const ccx = s.mapPanOn ? s.mapPanX : s.player.x;
    const ccz = s.mapPanOn ? s.mapPanZ : s.player.z;
    ctx2.translate(-ccx, -ccz);

    const reach = Math.hypot(W, H) / 2 / scale;
    const R = Math.min(Math.ceil(reach / CH) + 1, 48);
    const pcx = Math.floor(ccx / CH), pcz = Math.floor(ccz / CH);
    const over = 1 / scale;
    const killR = reach / CH + 0.75, killR2 = killR * killR;
    for (const [ox, oz] of SPIRAL) {
      if (ox * ox + oz * oz > killR2) break;
      if (ox > R || ox < -R || oz > R || oz < -R) continue;
      const cx = pcx + ox, cz = pcz + oz;
      const ad = Math.max(Math.abs(ox), Math.abs(oz));
      const stride = ad <= 2 ? 1 : ad <= 8 ? (scale >= 2 ? 2 : 1) : ad <= 20 ? 2 : 4;
      const t = tileFor(cx, cz, true, stride);
      if (t) ctx2.drawImage(t.cv, cx * CH, cz * CH, CH + over, CH + over);
    }
    if (s.mapTiles.size > 8000) {
      let evicted = 0;
      for (const k of s.mapTiles.keys()) {
        if (s.mapTiles.size <= 7000 || evicted >= 400) break;
        const sep = k.indexOf(",");
        const cx = Number(k.slice(0, sep)), cz = Number(k.slice(sep + 1));
        if (Math.hypot(cx - pcx, cz - pcz) > R + 2) { s.mapTiles.delete(k); evicted++; }
      }
    }
    if (markers) {
      for (const m of markers) {
        if (m.ghost || m.pulse) {
          ctx2.save();
          ctx2.strokeStyle = m.color;
          ctx2.lineWidth = 0.5;
          const rr = m.pulse ? 3 + Math.sin(performance.now() / 250) * 1.2 : 3;
          if (m.ghost) ctx2.setLineDash([1.5, 1.5]);
          ctx2.beginPath();
          ctx2.arc(m.x, m.z, rr, 0, Math.PI * 2);
          ctx2.stroke();
          ctx2.restore();
        } else {
          ctx2.save();
          ctx2.fillStyle = m.color;
          ctx2.strokeStyle = "rgba(0,0,0,.7)";
          ctx2.lineWidth = 0.6;
          ctx2.beginPath();
          ctx2.arc(m.x, m.z, 2.2, 0, Math.PI * 2);
          ctx2.fill();
          ctx2.stroke();
          if (m.icon) {
            ctx2.font = "5px ui-monospace, monospace";
            ctx2.textAlign = "center";
            ctx2.textBaseline = "middle";
            ctx2.fillText(m.icon, m.x, m.z - 4.2);
          }
          if (m.label && !circular) {
            ctx2.font = "4px ui-monospace, monospace";
            const tw = ctx2.measureText(m.label).width;
            ctx2.fillStyle = "rgba(12,16,20,.85)";
            ctx2.fillRect(m.x - tw / 2 - 1, m.z + 3, tw + 2, 5.5);
            ctx2.fillStyle = "#fff";
            ctx2.textAlign = "center";
            ctx2.textBaseline = "middle";
            ctx2.fillText(m.label, m.x, m.z + 5.8);
          }
          ctx2.restore();
        }
      }
    }
    ctx2.restore();

    const rx = Math.round(s.player.x / REGION), rz = Math.round(s.player.z / REGION);
    const cy = Math.cos(s.player.yaw), sy = Math.sin(s.player.yaw);
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -3; dx <= 3; dx++) {
        const v = ctx.villageAt(rx + dx, rz + dz);
        if (v) {
          const rdx = (v.vx - ccx) * scale;
          const rdz = (v.vz - ccz) * scale;
          const sx = W / 2 + (rdx * cy - rdz * sy);
          const syPos = H / 2 + (rdx * sy + rdz * cy);

          if (sx > 10 * dpr && sx < W - 10 * dpr && syPos > 10 * dpr && syPos < H - 10 * dpr) {
            ctx2.save();
            ctx2.fillStyle = "#55ff55";
            ctx2.strokeStyle = "#000000";
            ctx2.lineWidth = 2 * dpr;
            ctx2.beginPath();
            ctx2.arc(sx, syPos, 5 * dpr, 0, Math.PI * 2);
            ctx2.fill();
            ctx2.stroke();

            if (!circular) {
              const label = `🏰 ${v.name || "Village"}`;
              ctx2.font = `bold ${10 * dpr}px ui-monospace, Menlo, monospace`;
              const tw = ctx2.measureText(label).width;
              ctx2.fillStyle = "rgba(12, 16, 20, 0.85)";
              ctx2.strokeStyle = "#55ff55";
              ctx2.lineWidth = 1.2 * dpr;
              ctx2.beginPath();
              ctx2.roundRect(sx - tw / 2 - 4 * dpr, syPos - 18 * dpr, tw + 8 * dpr, 14 * dpr, 3 * dpr);
              ctx2.fill();
              ctx2.stroke();

              ctx2.fillStyle = "#ffffff";
              ctx2.textAlign = "center";
              ctx2.textBaseline = "middle";
              ctx2.fillText(label, sx, syPos - 11 * dpr);
            }
            ctx2.restore();
          }
        }
      }
    }

    ctx2.save();
    const pdx = (s.player.x - ccx) * scale, pdz = (s.player.z - ccz) * scale;
    ctx2.translate(W / 2 + (pdx * cy - pdz * sy), H / 2 + (pdx * sy + pdz * cy));
    ctx2.beginPath();
    ctx2.moveTo(0, -8 * dpr); ctx2.lineTo(5.5 * dpr, 7 * dpr);
    ctx2.lineTo(0, 3.5 * dpr); ctx2.lineTo(-5.5 * dpr, 7 * dpr);
    ctx2.closePath();
    ctx2.fillStyle = "#e0913a";
    ctx2.strokeStyle = "rgba(0,0,0,.65)"; ctx2.lineWidth = 2 * dpr;
    ctx2.stroke(); ctx2.fill();
    ctx2.restore();

    const rad = Math.min(W, H) / 2 - 13 * dpr;
    ctx2.save();
    ctx2.translate(W / 2, H / 2);
    ctx2.font = `${(circular ? 11 : 14) * dpr}px ui-monospace, Menlo, monospace`;
    ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
    for (const [label, vx, vz] of COMPASS) {
      const x = (vx * cy - vz * sy) * rad, y = (vx * sy + vz * cy) * rad;
      ctx2.fillStyle = "rgba(6,9,12,.7)";
      ctx2.beginPath(); ctx2.arc(x, y, 8.5 * dpr, 0, 7); ctx2.fill();
      ctx2.fillStyle = label === "N" ? "#e0913a" : "rgba(233,224,203,.8)";
      ctx2.fillText(label, x, y + 0.5 * dpr);
    }
    ctx2.restore();

    if (circular) {
      ctx2.setTransform(1, 0, 0, 1, 0, 0);
      ctx2.strokeStyle = "rgba(233,224,203,.35)"; ctx2.lineWidth = 2.5 * dpr;
      ctx2.beginPath(); ctx2.arc(W / 2, H / 2, Math.min(W, H) / 2 - 1.2 * dpr, 0, 7); ctx2.stroke();
    }
  }

  return { paintTile, buildTileReal, buildTileFar, tileFor, drawMap };
}