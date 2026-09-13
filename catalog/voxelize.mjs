// Voxelizer: GLB -> compact voxel payload (docs/CUSTOM_ASSET_VOXEL_PLAN.md, P1)
//
// Usage:
//   node catalog/voxelize.mjs --db [--res 16] [--out /tmp/voxelized] [--verify]
//   node catalog/voxelize.mjs --file <x.glb> [--res 16] [--w 1 --h 1 --scale 100]
//
// Output payload:
//   { kind: "voxel"|"block", res, grid:{gx,gy,gz,data:<base64>}, palette:[...],
//     footprint:{w,h,scale} }
//   grid.data = base64 of Uint8Array: 0 = empty, else palette index + 1.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import * as jpeg from "jpeg-js";

// ---- Node DOM shims so three's GLTFLoader can run headlessly (textures -> 1x1 stub) ----
if (typeof globalThis.window === "undefined" && !globalThis.document) {
  globalThis.self = globalThis;
  globalThis.document = {
    createElementNS: () => {
      const img = { onload: null, onerror: null };
      Object.defineProperty(img, "src", {
        set() { setTimeout(() => img.onload && img.onload(), 0); },
      });
      img.width = 1;
      img.height = 1;
      return img;
    },
    createElement: () => ({ getContext: () => ({}), toDataURL: () => "data:," }),
  };
  globalThis.URL = globalThis.URL || {};
  URL.createObjectURL = () => "blob:stub";
  URL.revokeObjectURL = () => {};
  // three's ImageLoader reads data:/blob: URIs through FileReader (Node has none).
  globalThis.FileReader = class {
    readAsDataURL() { setTimeout(() => this.onload && this.onload({ target: { result: "data:image/png;base64,iVBORw0KGgo=" } }), 0); }
    readAsArrayBuffer() { setTimeout(() => this.onload && this.onload({ target: { result: new ArrayBuffer(0) } }), 0); }
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const DB_PATH = path.join(REPO, "data", "minecraft.db");

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}
const has = (name) => process.argv.includes(name);

// ---------------------------------------------------------------------------
// GLB -> geometry (three) + embedded images (pngjs)
// ---------------------------------------------------------------------------

function glbChunks(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const binStart = 20 + jsonLen + 8;
  const bin = buf.subarray(binStart);
  return { json, bin };
}

function decodeImage(mimeType, bytes) {
  if (!bytes || bytes.length < 8) return null;
  const sig = (bytes[0] << 8) | bytes[1];
  if (/png/i.test(mimeType || "") || (bytes[0] === 0x89 && bytes[1] === 0x50)) {
    try {
      const png = PNG.sync.read(bytes);
      return { w: png.width, h: png.height, data: png.data }; // RGBA
    } catch {
      return null;
    }
  }
  if (/jpe?g/i.test(mimeType || "") || sig === 0xffd8) {
    try {
      const jpg = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 512 });
      return { w: jpg.width, h: jpg.height, data: jpg.data }; // RGBA
    } catch {
      return null;
    }
  }
  return null;
}

function extractImages(glbBuf) {
  const { json, bin } = glbChunks(glbBuf);
  const images = (json.images || []).map((im) => {
    if (im.bufferView != null) {
      const bv = json.bufferViews[im.bufferView];
      const start = bv.byteOffset || 0;
      return decodeImage(im.mimeType, bin.subarray(start, start + bv.byteLength));
    }
    if (typeof im.uri === "string" && im.uri.startsWith("data:")) {
      const b64 = im.uri.split(",")[1];
      return decodeImage(im.mimeType, Buffer.from(b64, "base64"));
    }
    return null;
  });
  const matImage = (matIdx) => {
    const mat = json.materials?.[matIdx];
    const texIdx = mat?.pbrMetallicRoughness?.baseColorTexture?.index;
    if (texIdx == null) return null;
    const src = json.textures?.[texIdx]?.source;
    if (src == null) return null;
    return images[src] || null;
  };
  return { json, matImage };
}

async function loadGltf(glbBuf) {
  const THREE = await import("three");
  const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
  const loader = new GLTFLoader();
  const arr = new Uint8Array(glbBuf).buffer;
  return new Promise((res, rej) =>
    loader.parse(arr.slice(0), "", (g) => res({ THREE, scene: g.scene, gltf: g }), rej)
  );
}

function sampleImageBilinear(img, uu, vv) {
  const fx = uu * (img.w - 1);
  const fy = (1 - vv) * (img.h - 1);
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(img.w - 1, x0 + 1), y1 = Math.min(img.h - 1, y0 + 1);
  const dx = fx - x0, dy = fy - y0;
  const p00 = (y0 * img.w + x0) * 4;
  const p10 = (y0 * img.w + x1) * 4;
  const p01 = (y1 * img.w + x0) * 4;
  const p11 = (y1 * img.w + x1) * 4;
  const d = img.data;
  const r = (d[p00] * (1 - dx) + d[p10] * dx) * (1 - dy) + (d[p01] * (1 - dx) + d[p11] * dx) * dy;
  const g = (d[p00 + 1] * (1 - dx) + d[p10 + 1] * dx) * (1 - dy) + (d[p01 + 1] * (1 - dx) + d[p11 + 1] * dx) * dy;
  const b = (d[p00 + 2] * (1 - dx) + d[p10 + 2] * dx) * (1 - dy) + (d[p01 + 2] * (1 - dx) + d[p11 + 2] * dx) * dy;
  return { r, g, b };
}

// ---------------------------------------------------------------------------
// Flatten meshes -> triangles with a representative color
// ---------------------------------------------------------------------------

function flattenTriangles({ THREE, scene, gltf }, matImage, json) {
  scene.updateMatrixWorld(true);
  const tris = [];
  const V = new THREE.Vector3();
  const P = new THREE.Vector3();
  const uvA = new THREE.Vector2();
  const uvB = new THREE.Vector2();
  const uvC = new THREE.Vector2();
  const parser = gltf?.parser;

  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const pos = g.getAttribute("position");
    if (!pos) return;
    const uv = g.getAttribute("uv");
    const idx = g.index;
    const m = o.matrixWorld;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];

    for (const grp of groups) {
      const mat = Array.isArray(o.material) ? o.material[grp.materialIndex] : o.material;
      // glTF parser association for the material or primitive
      let gltfMatIdx = parser?.associations?.get(mat)?.materials;
      if (gltfMatIdx == null) {
        const meshIdx = parser?.associations?.get(o)?.meshes;
        const primIdx = parser?.associations?.get(o)?.primitives;
        if (meshIdx != null && primIdx != null && json?.meshes?.[meshIdx]?.primitives?.[primIdx]?.material != null) {
          gltfMatIdx = json.meshes[meshIdx].primitives[primIdx].material;
        } else {
          gltfMatIdx = grp.materialIndex;
        }
      }

      let base = { r: 1, g: 1, b: 1 };
      if (mat && mat.color) {
        base = { r: mat.color.r, g: mat.color.g, b: mat.color.b };
      }
      if (gltfMatIdx != null && json?.materials?.[gltfMatIdx]?.pbrMetallicRoughness?.baseColorFactor) {
        const factor = json.materials[gltfMatIdx].pbrMetallicRoughness.baseColorFactor;
        base = { r: factor[0], g: factor[1], b: factor[2] };
      }

      const img = matImage ? matImage(gltfMatIdx) : null;
      const end = grp.start + grp.count;
      for (let k = grp.start; k < end; k += 3) {
        const a = idx ? idx.getX(k) : k;
        const b = idx ? idx.getX(k + 1) : k + 1;
        const c = idx ? idx.getX(k + 2) : k + 2;
        V.fromBufferAttribute(pos, a).applyMatrix4(m); const p0 = V.clone();
        V.fromBufferAttribute(pos, b).applyMatrix4(m); const p1 = V.clone();
        V.fromBufferAttribute(pos, c).applyMatrix4(m); const p2 = V.clone();
        let col = { r: base.r, g: base.g, b: base.b };
        let uvArr = null;
        if (img && uv) {
          uvA.fromBufferAttribute(uv, a); uvB.fromBufferAttribute(uv, b); uvC.fromBufferAttribute(uv, c);
          uvArr = [[uvA.x, uvA.y], [uvB.x, uvB.y], [uvC.x, uvC.y]];
          const u = (uvA.x + uvB.x + uvC.x) / 3;
          const v = (uvA.y + uvB.y + uvC.y) / 3;
          const sampled = sampleImageBilinear(img, ((u % 1) + 1) % 1, ((v % 1) + 1) % 1);
          col = {
            r: base.r * (sampled.r / 255),
            g: base.g * (sampled.g / 255),
            b: base.b * (sampled.b / 255),
          };
        }
        tris.push({ p0, p1, p2, col, uvs: uvArr, img: img || null, base: { r: base.r, g: base.g, b: base.b } });
      }
    }
  });
  return tris;
}

// ---------------------------------------------------------------------------
// Fit to footprint box, then voxelize
// ---------------------------------------------------------------------------

function fitToBox(tris, w, h, scalePct) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const t of tris) for (const p of [t.p0, t.p1, t.p2]) {
    if (p.x < min.x) min.x = p.x; if (p.x > max.x) max.x = p.x;
    if (p.y < min.y) min.y = p.y; if (p.y > max.y) max.y = p.y;
    if (p.z < min.z) min.z = p.z; if (p.z > max.z) max.z = p.z;
  }
  const origSize = {
    x: Math.max(1e-6, max.x - min.x),
    y: Math.max(1e-6, max.y - min.y),
    z: Math.max(1e-6, max.z - min.z),
  };
  const sx = origSize.x, sy = origSize.y, sz = origSize.z;
  const s = Math.min(w / sx, h / sy, w / sz) * (scalePct / 100);
  const cx = (min.x + max.x) / 2, cy = (min.y + max.y) / 2, cz = (min.z + max.z) / 2;
  for (const t of tris) for (const p of [t.p0, t.p1, t.p2]) {
    p.x = (p.x - cx) * s + w / 2;
    p.y = (p.y - cy) * s + 0.5;
    p.z = (p.z - cz) * s + w / 2;
  }
  // cube-like? footprint 1x1 and roughly equal original dims => block-type
  const mx = Math.max(sx, sy, sz), mn = Math.min(sx, sy, sz);
  const cubeLike = w === 1 && h === 1 && mx / mn < 1.5;
  return { w, h, cubeLike, origSize };
}

const PROBE_CORNERS = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, 0.5],
  [0.5, 0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5],
];

// Per-voxel supersampling: for each surface voxel we probe the triangle at the
// center + 8 corners, cluster the sampled colors, and assign the color/UV of the
// region that covers most of the voxel. Boundary voxels (e.g. wheel↔body) snap to
// the majority region instead of bleeding the center sample, so distinct colors
// (black wheels, white roofs, dual-tone paint) stay crisp. Interior voxels resolve
// to the center probe, so flat/uniform textures (like the fence's wood) are unchanged.
const COLOR_SIM = 20; // tighter RGB distance threshold keeps two-tone stripes crisp

function sampleTriangleAt(t, u, v) {
  let uu = -1, vv = -1;
  if (t.uvs) {
    const w0 = 1 - u - v;
    uu = w0 * t.uvs[0][0] + u * t.uvs[1][0] + v * t.uvs[2][0];
    vv = w0 * t.uvs[0][1] + u * t.uvs[1][1] + v * t.uvs[2][1];
    uu = ((uu % 1) + 1) % 1;
    vv = ((vv % 1) + 1) % 1;
  }
  let color = ((t.col.r * 255) | 0) << 16 | ((t.col.g * 255) | 0) << 8 | ((t.col.b * 255) | 0);
  if (t.img && t.uvs) {
    const sampled = sampleImageBilinear(t.img, uu, vv);
    color =
      (Math.min(255, Math.max(0, Math.round(t.base.r * sampled.r))) << 16) |
      (Math.min(255, Math.max(0, Math.round(t.base.g * sampled.g))) << 8) |
      Math.min(255, Math.max(0, Math.round(t.base.b * sampled.b)));
  }
  return { c: color, u: uu, v: vv };
}

function resolveVotes(list) {
  const clusters = [];
  for (const vote of list) {
    let found = false;
    for (const cl of clusters) {
      const r = ((cl[0].c >> 16) & 255) - ((vote.c >> 16) & 255);
      const g = ((cl[0].c >> 8) & 255) - ((vote.c >> 8) & 255);
      const b = (cl[0].c & 255) - (vote.c & 255);
      if (r * r + g * g + b * b <= COLOR_SIM * COLOR_SIM) { cl.push(vote); found = true; break; }
    }
    if (!found) clusters.push([vote]);
  }
  let best = clusters[0], bestScore = -Infinity;
  for (const cl of clusters) {
    let minD = Infinity;
    for (const v of cl) if (v.d < minD) minD = v.d;
    // prefer the region with the most coverage; tie-break toward the voxel center
    const score = cl.length * 1000 - minD;
    if (score > bestScore) { bestScore = score; best = cl; }
  }
  let win = best[0];
  for (const v of best) if (v.d < win.d) win = v;
  return win;
}

function voxelize(tris, res) {
  // fitted bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const t of tris) for (const p of [t.p0, t.p1, t.p2]) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
  }
  const gx = Math.max(1, Math.round((maxX - minX) * res));
  const gy = Math.max(1, Math.round((maxY - minY) * res));
  const gz = Math.max(1, Math.round((maxZ - minZ) * res));
  const toVox = (p) => [
    ((p.x - minX) / Math.max(1e-6, maxX - minX)) * gx,
    ((p.y - minY) / Math.max(1e-6, maxY - minY)) * gy,
    ((p.z - minZ) / Math.max(1e-6, maxZ - minZ)) * gz,
  ];

  const total = gx * gy * gz;
  const solid = new Int32Array(total); // 0/1 shape flag during pass A, packed RGB after pass B
  const src = new Int32Array(total).fill(-1); // source triangle index per voxel (T2 UV mapping)
  const uvsArr = new Float32Array(total * 2).fill(-1); // per-voxel center UV (u,v) or -1
  const VOXEL_RAD = 0.9;
  // Supersample up to 10M volume voxels (covers multi-block assets up to 6x6 footprint).
  const supersample = total <= 10000000;
  const votes = supersample ? new Array(total) : null;

  for (let ti = 0; ti < tris.length; ti++) {
    const t = tris[ti];
    const A = toVox(t.p0), B = toVox(t.p1), C = toVox(t.p2);
    let nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
    let ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
    let nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) continue;
    nx /= len; ny /= len; nz /= len;
    const d = nx * A[0] + ny * A[1] + nz * A[2];

    const lo = [
      Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]) - VOXEL_RAD)),
      Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]) - VOXEL_RAD)),
      Math.max(0, Math.floor(Math.min(A[2], B[2], C[2]) - VOXEL_RAD)),
    ];
    const hi = [
      Math.min(gx - 1, Math.ceil(Math.max(A[0], B[0], C[0]) + VOXEL_RAD)),
      Math.min(gy - 1, Math.ceil(Math.max(A[1], B[1], C[1]) + VOXEL_RAD)),
      Math.min(gz - 1, Math.ceil(Math.max(A[2], B[2], C[2]) + VOXEL_RAD)),
    ];
    const v0x = B[0] - A[0], v0y = B[1] - A[1], v0z = B[2] - A[2];
    const v1x = C[0] - A[0], v1y = C[1] - A[1], v1z = C[2] - A[2];
    const dot00 = v0x * v0x + v0y * v0y + v0z * v0z;
    const dot01 = v0x * v1x + v0y * v1y + v0z * v1z;
    const dot11 = v1x * v1x + v1y * v1y + v1z * v1z;
    const inv = 1 / (dot00 * dot11 - dot01 * dot01 + 1e-9);

    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const cx = i + 0.5, cy = j + 0.5, cz = k + 0.5;
      const o = i + j * gx + k * gx * gy;
      const proj = (px, py, pz) => {
        const qx = px - nx * (nx * px + ny * py + nz * pz - d);
        const qy = py - ny * (nx * px + ny * py + nz * pz - d);
        const qz = pz - nz * (nx * px + ny * py + nz * pz - d);
        const v2x = qx - A[0], v2y = qy - A[1], v2z = qz - A[2];
        const dot02 = v0x * v2x + v0y * v2y + v0z * v2z;
        const dot12 = v1x * v2x + v1y * v2y + v1z * v2z;
        const u = (dot11 * dot02 - dot01 * dot12) * inv;
        const v = (dot00 * dot12 - dot01 * dot02) * inv;
        return { u, v, inside: u >= -0.001 && v >= -0.001 && u + v <= 1.001 };
      };

      const center = proj(cx, cy, cz);
      const centerDist = nx * cx + ny * cy + nz * cz - d;
      if (Math.abs(centerDist) <= VOXEL_RAD && center.inside && solid[o] === 0) solid[o] = 1;

      if (supersample) {
        const sample = (px, py, pz, dd) => {
          // Corners of a surface voxel sit up to VOXEL_RAD + 0.5 from the face plane
          // (center within VOXEL_RAD + corner offset). A tighter gate would drop the
          // far-side corner votes at two-material interfaces, letting one region's
          // color bleed across the seam.
          if (Math.abs(nx * px + ny * py + nz * pz - d) > VOXEL_RAD + 0.5) return;
          const bc = proj(px, py, pz);
          if (!bc.inside) return;
          const sm = sampleTriangleAt(t, bc.u, bc.v);
          if (!votes[o]) votes[o] = [];
          votes[o].push({ c: sm.c, u: sm.u, v: sm.v, d: dd, ti });
        };
        if (Math.abs(centerDist) <= VOXEL_RAD && center.inside) sample(cx, cy, cz, 0);
        for (const [px, py, pz] of PROBE_CORNERS) sample(cx + px, cy + py, cz + pz, Math.hypot(px, py, pz));
      } else if (Math.abs(centerDist) <= VOXEL_RAD && center.inside) {
        const sm = sampleTriangleAt(t, center.u, center.v);
        solid[o] = sm.c;
        src[o] = ti;
        uvsArr[o * 2] = sm.u;
        uvsArr[o * 2 + 1] = sm.v;
      }
    }
  }

  if (supersample) {
    for (let o = 0; o < total; o++) {
      if (solid[o] !== 1) continue;
      const list = votes[o];
      if (!list || !list.length) continue; // every center-covered voxel has its center vote
      const win = resolveVotes(list);
      solid[o] = win.c;
      src[o] = win.ti;
      uvsArr[o * 2] = win.u;
      uvsArr[o * 2 + 1] = win.v;
    }
  }
  return { solid, src, uvsArr, gx, gy, gz, fitMin: { x: minX, y: minY, z: minZ }, fitMax: { x: maxX, y: maxY, z: maxZ } };
}

export { voxelize };

// Fill interior: BFS from border empties; enclosed empties become solid (fill).
function fillSolid(grid, srcIn, uvsIn, gx, gy, gz) {
  const total = gx * gy * gz;
  const solidMask = new Uint8Array(total);
  for (let i = 0; i < total; i++) solidMask[i] = grid[i] ? 1 : 0;
  const outside = new Uint8Array(total);
  // seed all border cells that are empty
  const seed = [];
  for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) for (let k = 0; k < gz; k++) {
    if (i === 0 || j === 0 || k === 0 || i === gx - 1 || j === gy - 1 || k === gz - 1) {
      if (!solidMask[i + j * gx + k * gx * gy]) { outside[i + j * gx + k * gx * gy] = 1; seed.push(i + j * gx + k * gx * gy); }
    }
  }
  while (seed.length) {
    const o = seed.pop();
    const i = o % gx, j = ((o / gx) | 0) % gy, k = (o / (gx * gy)) | 0;
    const nb = [[i - 1, j, k], [i + 1, j, k], [i, j - 1, k], [i, j + 1, k], [i, j, k - 1], [i, j, k + 1]];
    for (const [x, y, z] of nb) {
      if (x < 0 || y < 0 || z < 0 || x >= gx || y >= gy || z >= gz) continue;
      const o2 = x + y * gx + z * gx * gy;
      if (!outside[o2] && !solidMask[o2]) { outside[o2] = 1; seed.push(o2); }
    }
  }
  // Fill every enclosed empty region with the MAJORITY color of the solid shell that
  // surrounds it (connected-component flood + shell color vote). A single-color seam
  // between two touching parts (e.g. a red body meeting a black wheel) no longer
  // floods the neighbour's interior, because each region takes the colour its own
  // walls vote for.
  const colors = new Int32Array(total);
  const srcOut = new Int32Array(total).fill(-1);
  const uvsOut = new Float32Array(total * 2).fill(-1);
  for (let o = 0; o < total; o++) {
    if (!outside[o]) {
      colors[o] = grid[o]; // keep existing color (0 if it was enclosed-empty)
      srcOut[o] = srcIn[o];
      uvsOut[o * 2] = uvsIn[o * 2];
      uvsOut[o * 2 + 1] = uvsIn[o * 2 + 1];
    }
  }
  const seen = new Uint8Array(total);
  const comp = [];
  const stack = [];
  for (let s = 0; s < total; s++) {
    if (colors[s] || outside[s] || seen[s]) continue;
    comp.length = 0;
    stack.length = 0;
    stack.push(s); seen[s] = 1;
    const shell = [];
    while (stack.length) {
      const o = stack.pop();
      comp.push(o);
      const i = o % gx, j = ((o / gx) | 0) % gy, k = (o / (gx * gy)) | 0;
      const nb = [[i - 1, j, k], [i + 1, j, k], [i, j - 1, k], [i, j + 1, k], [i, j, k - 1], [i, j, k + 1]];
      for (const [x, y, z] of nb) {
        if (x < 0 || y < 0 || z < 0 || x >= gx || y >= gy || z >= gz) continue;
        const o2 = x + y * gx + z * gx * gy;
        if (colors[o2]) { shell.push(o2); continue; }
        if (!outside[o2] && !seen[o2]) { seen[o2] = 1; stack.push(o2); }
      }
    }
    if (!comp.length || !shell.length) continue;
    // majority colour among the enclosing solid voxels
    const counts = new Map();
    for (const b of shell) { const c = colors[b]; counts.set(c, (counts.get(c) || 0) + 1); }
    let bestC = 0, bestN = -1, rep = -1;
    for (const [c, n] of counts) if (n > bestN) { bestN = n; bestC = c; }
    for (const b of shell) if (colors[b] === bestC) { rep = b; break; }
    if (rep < 0) continue;
    for (const o of comp) {
      colors[o] = bestC;
      srcOut[o] = srcIn[rep];
      uvsOut[o * 2] = uvsIn[rep * 2];
      uvsOut[o * 2 + 1] = uvsIn[rep * 2 + 1];
    }
  }
  return { colors, src: srcOut, uvs: uvsOut };
}

// ---------------------------------------------------------------------------
// Palette quantization
// ---------------------------------------------------------------------------

function quantize(colors, total) {
  const r5 = (v) => (v >> 3) << 3; // 5 bits/channel key for bucketing
  const buckets = new Map(); // key -> { count, sumR, sumG, sumB }
  for (let o = 0; o < total; o++) {
    const c = colors[o];
    if (!c) continue;
    const cr = (c >> 16) & 255, cg = (c >> 8) & 255, cb = c & 255;
    const key = (r5(cr) << 16) | (r5(cg) << 8) | r5(cb);
    let b = buckets.get(key);
    if (!b) {
      b = { count: 0, sumR: 0, sumG: 0, sumB: 0 };
      buckets.set(key, b);
    }
    b.count++;
    b.sumR += cr;
    b.sumG += cg;
    b.sumB += cb;
  }
  const entries = [...buckets.entries()];
  entries.sort((a, b) => b[1].count - a[1].count);
  const cap = 255;
  // Compute weighted centroid RGB for true 24-bit color fidelity
  const palette = entries.slice(0, cap).map(([_, b]) => {
    const r = Math.round(b.sumR / b.count);
    const g = Math.round(b.sumG / b.count);
    const bl = Math.round(b.sumB / b.count);
    return (r << 16) | (g << 8) | bl;
  });
  const palIdx = new Map();
  entries.slice(0, cap).forEach(([key], i) => palIdx.set(key, i + 1));
  const grid = new Uint8Array(total);
  for (let o = 0; o < total; o++) {
    const c = colors[o];
    if (!c) continue;
    const cr = (c >> 16) & 255, cg = (c >> 8) & 255, cb = c & 255;
    const key = (r5(cr) << 16) | (r5(cg) << 8) | r5(cb);
    let idx = palIdx.get(key);
    if (!idx) {
      let best = 1, bestD = Infinity;
      for (let p = 0; p < palette.length; p++) {
        const pr = (palette[p] >> 16) & 255, pg = (palette[p] >> 8) & 255, pb = palette[p] & 255;
        const dd = (cr - pr) ** 2 + (cg - pg) ** 2 + (cb - pb) ** 2;
        if (dd < bestD) { bestD = dd; best = p + 1; }
      }
      idx = best;
    }
    grid[o] = idx;
  }
  return { palette: palette.map((c) => "#" + c.toString(16).padStart(6, "0")), grid };
}

// ---------------------------------------------------------------------------
// T2: per-asset texture tile + per-voxel UV basis (barycentric UV mapping)
// ---------------------------------------------------------------------------

function scaleImage(img, maxSize) {
  if (img.w <= maxSize && img.h <= maxSize) return img;
  const scale = Math.min(maxSize / img.w, maxSize / img.h);
  const w = Math.max(1, Math.round(img.w * scale));
  const h = Math.max(1, Math.round(img.h * scale));
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / scale);
      const si = (sy * img.w + sx) * 4;
      const oi = (y * w + x) * 4;
      out[oi] = img.data[si]; out[oi + 1] = img.data[si + 1]; out[oi + 2] = img.data[si + 2]; out[oi + 3] = img.data[si + 3];
    }
  }
  return { w, h, data: out };
}

// If a baked tile has little luminance contrast (uniform textures like the fence's
// near-flat wood), remap it to a smooth 8-tone wood gradient (light oak -> deep walnut)
// so grain/tonal variation reads clearly instead of a single color.
const WOOD_TONES = [
  [198, 154, 107], // #c69a6b light oak
  [176, 136, 79],  // #b0884f
  [156, 116, 65],  // #9c7441
  [138, 101, 54],  // #8a6536
  [119, 87, 45],   // #77572d
  [100, 74, 38],   // #644a26
  [82, 61, 31],    // #523d1f
  [65, 48, 25]     // #413019 deep walnut
];
function applyMultiToneWood(img, isWood = false) {
  if (!isWood) return; // Only apply wood tones to wood/fence assets — never to vehicles, machines, or paint
  const n = img.w * img.h;
  const lum = new Float32Array(n);
  let sum = 0;
  let minL = 255, maxL = 0;
  for (let i = 0; i < n; i++) {
    lum[i] = 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
    sum += lum[i];
    if (lum[i] < minL) minL = lum[i];
    if (lum[i] > maxL) maxL = lum[i];
  }
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i++) varSum += (lum[i] - mean) * (lum[i] - mean);
  const std = Math.sqrt(varSum / n);
  if (std >= 26) return; // already visibly textured — keep it
  const range = Math.max(1e-6, maxL - minL);
  for (let i = 0; i < n; i++) {
    const band = Math.min(7, Math.floor(((lum[i] - minL) / range) * 8));
    const c = WOOD_TONES[band];
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
  }
}

function buildVoxelTex(tris, uvsArr, grid, gx, gy, gz, opts = {}) {
  const counts = new Map();
  for (const t of tris) if (t.img) counts.set(t.img, (counts.get(t.img) || 0) + 1);
  if (!counts.size) return null;

  const isWood = /\b(wood|fence|timber|plank|log|board|bark|tree|oak|birch|spruce|jungle|acacia|dark_oak|mangrove|cherry)\b/i.test(opts.name || "");

  // If the model has multiple textures (e.g. wheels, body, cabin), a single 2D tile
  // cannot represent all materials and would scramble the voxel colors.
  // In voxel games, multi-material assets natively use crisp per-voxel vertex colors.
  if (!isWood && counts.size > 1) return null;

  // If the model has high color diversity across distinct components (e.g. black tires,
  // red body, gray cabin), do not attach a single downscaled tile.
  if (!isWood && opts.palette && opts.palette.length > 8) {
    let maxDist = 0;
    const topHex = opts.palette.slice(0, 16);
    const palRgb = topHex.map((h) => {
      const v = parseInt(h.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    });
    for (let i = 0; i < palRgb.length; i++) {
      for (let j = i + 1; j < palRgb.length; j++) {
        const d = Math.hypot(palRgb[i][0] - palRgb[j][0], palRgb[i][1] - palRgb[j][1], palRgb[i][2] - palRgb[j][2]);
        if (d > maxDist) maxDist = d;
      }
    }
    if (maxDist > 80) return null;
  }

  let primary = null, primaryCount = 0;
  for (const [img, n] of counts) if (n > primaryCount) { primary = img; primaryCount = n; }
  const scaled = scaleImage(primary, 96);
  applyMultiToneWood(scaled, isWood);
  const png = PNG.sync.write({ width: scaled.w, height: scaled.h, data: scaled.data });
  const tile = "data:image/png;base64," + png.toString("base64");

  // Compact per-voxel center UV, one Uint16 per SOLID cell in scan order
  // (u<<8|v, 8-bit each; 0xFFFF = no UV -> palette fallback). Keeps payload small at high res.
  const total = gx * gy * gz;
  const entries = [];
  let mapped = 0;
  for (let o = 0; o < total; o++) {
    if (!grid[o]) continue;
    const u = uvsArr[o * 2], v = uvsArr[o * 2 + 1];
    if (u >= 0 && v >= 0) {
      entries.push((Math.min(255, Math.round(u * 255)) << 8) | Math.min(255, Math.round(v * 255)));
      mapped++;
    } else {
      entries.push(0xffff);
    }
  }
  return { tile, uvs: Buffer.from(new Uint16Array(entries).buffer).toString("base64"), mapped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function voxelizeBuffer(glbBuf, opts = {}) {
  const res = opts.res || 16;
  const w = opts.w, h = opts.h, scale = opts.scale;
  const { THREE, scene, gltf } = await loadGltf(glbBuf);
  const { json, matImage } = extractImages(glbBuf);
  const tris = flattenTriangles({ THREE, scene, gltf }, matImage, json);
  if (!tris.length) throw new Error("no triangles");
  const fitted = fitToBox(tris, w, h, scale);

  if (fitted.cubeLike) {
    // Block-type: full solid cube, no voxelization needed. Client textures the
    // cube with per-face textures (side/top/bottom). Palette = base color.
    // Grid res capped at 16 (informational — the game renders a box geometry).
    const g = Math.min(res, 16);
    const total = g * g * g;
    const grid = new Uint8Array(total).fill(1);
    const avg = { r: 0, g: 0, b: 0 };
    for (const t of tris) {
      avg.r += t.col.r; avg.g += t.col.g; avg.b += t.col.b;
    }
    avg.r /= tris.length; avg.g /= tris.length; avg.b /= tris.length;
    const payload = {
      kind: "block",
      res,
      grid: { gx: g, gy: g, gz: g, data: Buffer.from(grid).toString("base64") },
      palette: ["#" + (((avg.r * 255) | 0) << 16 | ((avg.g * 255) | 0) << 8 | ((avg.b * 255) | 0)).toString(16).padStart(6, "0")],
      footprint: { w, h, scale },
    };
    return { payload, stats: { gx: g, gy: g, gz: g, solidCount: total, palette: 1, kind: "block" } };
  }

  const { solid, src, uvsArr, gx, gy, gz } = voxelize(tris, res);
  const filled = fillSolid(solid, src, uvsArr, gx, gy, gz);
  const colors = filled.colors;
  const total = gx * gy * gz;
  const solidCount = colors.reduce((a, c) => a + (c ? 1 : 0), 0);
  const { palette, grid } = quantize(colors, total);
  const kind = solidCount >= total * 0.95 && palette.length <= 2 ? "block" : "voxel";
  const payload = {
    kind,
    res,
    grid: { gx, gy, gz, data: Buffer.from(grid).toString("base64") },
    palette,
    footprint: { w, h, scale },
  };
  if (kind === "voxel") {
    const tex = buildVoxelTex(tris, filled.uvs, grid, gx, gy, gz, { ...opts, palette });
    if (tex && tex.mapped > 0) {
      payload.tile = tex.tile;
      payload.uvs = tex.uvs;
    }
  }
  return { payload, stats: { gx, gy, gz, solidCount, palette: palette.length, kind, tile: !!payload.tile } };
}

async function main() {
  const res = Number(arg("--res", 48));
  const outDir = arg("--out", "/tmp/voxelized");
  fs.mkdirSync(outDir, { recursive: true });

  if (has("--file")) {
    const file = arg("--file");
    const w = Number(arg("--w", 1)), h = Number(arg("--h", 1)), scale = Number(arg("--scale", 100));
    const buf = fs.readFileSync(file);
    const { payload, stats } = await voxelizeBuffer(buf, { res, w, h, scale });
    const out = path.join(outDir, path.basename(file, path.extname(file)) + ".json");
    fs.writeFileSync(out, JSON.stringify(payload));
    printResult(path.basename(file), buf.length, out, payload, stats, has("--verify"));
    return;
  }

  if (has("--db")) {
    const initSqlJs = (await import("sql.js")).default;
    const SQL = await initSqlJs();
    const db = new SQL.Database(fs.readFileSync(DB_PATH));
    const r = db.exec(
      "SELECT id, name, data_base64, placement_width, placement_height, placement_scale FROM custom_assets ORDER BY id"
    );
    for (const row of r[0].values) {
      const [id, name, b64, pw, ph, ps] = row;
      const glbBuf = Buffer.from(b64, "base64");
      try {
        const { payload, stats } = await voxelizeBuffer(glbBuf, { res, w: Number(pw), h: Number(ph), scale: Number(ps) });
        const out = path.join(outDir, `${id}.json`);
        fs.writeFileSync(out, JSON.stringify(payload));
        printResult(`${id} ${name}`, glbBuf.length, out, payload, stats, has("--verify"));
      } catch (e) {
        console.log(`${id} ${name}: FAILED ${e.message}`);
      }
    }
    return;
  }
  console.log("usage: voxelize.mjs --db | --file <glb> [--res 16] [--out dir] [--verify]");
}

function printResult(label, glbBytes, out, payload, stats, verify) {
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload));
  const gridBytes = Buffer.from(payload.grid.data, "base64").length;
  console.log(`\n=== ${label}`);
  console.log(`  GLB ${glbBytes} B -> payload ${payloadBytes} B (grid ${gridBytes} B + palette) = ${(100 * payloadBytes / Math.max(1, glbBytes)).toFixed(2)}% (${(100 - 100 * payloadBytes / Math.max(1, glbBytes)).toFixed(1)}% smaller)`);
  console.log(`  grid ${stats.gx}x${stats.gy}x${stats.gz} (res ${payload.res}) solid ${stats.solidCount}/${stats.gx * stats.gy * stats.gz} palette ${stats.palette} kind ${stats.kind}`);
  console.log(`  saved: ${out}`);
  if (verify) {
    const { gx, gy, gz, data } = payload.grid;
    const buf = Buffer.from(data, "base64");
    const mid = Math.floor(gy / 2);
    console.log(`  Y-slice ${mid} of ${gy} (x rows, z cols):`);
    for (let i = 0; i < gx; i++) {
      let row = "";
      for (let k = 0; k < gz; k++) row += buf[i + mid * gx + k * gx * gy] ? "#" : ".";
      console.log("   " + row);
    }
  }
}

import { pathToFileURL } from "node:url";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}