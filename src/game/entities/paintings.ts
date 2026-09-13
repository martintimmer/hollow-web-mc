import * as THREE from "three";

export interface PaintingDef {
  name: string;
  w: number; // width in blocks
  h: number; // height in blocks
  author: string;
  title: string;
  url: string;
}

const P = (name: string, w: number, h: number, author = "", title = ""): PaintingDef => ({
  name,
  w,
  h,
  author,
  title: title || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  url: `/textures/paintings/${name}.png`,
});

const Z = "Kristoffer Zetterstrand";
const B = "Sarah Boeving";

export const PAINTING_ITEM_ID = 1046;

export const PAINTINGS: PaintingDef[] = [
  P("alban", 1, 1, Z, "Alban"),
  P("aztec", 1, 1, Z, "Aztec"),
  P("aztec2", 1, 1, Z, "Aztec II"),
  P("bomb", 1, 1, Z, "Bomb"),
  P("kebab", 1, 1, Z, "Kebab"),
  P("meditative", 1, 1, B, "Meditative"),
  P("plant", 1, 1, Z, "Plant"),
  P("wasteland", 1, 1, Z, "Wasteland"),
  P("graham", 1, 2, Z, "Graham"),
  P("prairie_ride", 1, 2, B, "Prairie Ride"),
  P("wanderer", 1, 2, Z, "Wanderer"),
  P("courbet", 2, 1, Z, "Courbet"),
  P("creebet", 2, 1, "", "Creebet"),
  P("pool", 2, 1, Z, "Pool"),
  P("sea", 2, 1, Z, "Sea"),
  P("sunset", 2, 1, Z, "Sunset"),
  P("baroque", 2, 2, B, "Baroque"),
  P("bust", 2, 2, Z, "Bust"),
  P("earth", 2, 2, "", "Earth"),
  P("fire", 2, 2, "", "Fire"),
  P("humble", 2, 2, B, "Humble"),
  P("match", 2, 2, Z, "Match"),
  P("skull_and_roses", 2, 2, Z, "Skull and Roses"),
  P("stage", 2, 2, "", "Stage"),
  P("void", 2, 2, "", "Void"),
  P("wind", 2, 2, "", "Wind"),
  P("wither", 2, 2, "", "Wither"),
  P("bouquet", 3, 3, "", "Bouquet"),
  P("cavebird", 3, 3, "", "Cavebird"),
  P("cotan", 3, 3, "", "Cotan"),
  P("dennis", 3, 3, B, "Dennis"),
  P("endboss", 3, 3, "", "Endboss"),
  P("fern", 3, 3, "", "Fern"),
  P("owlemons", 3, 3, "", "Owlemons"),
  P("sunflowers", 3, 3, "", "Sunflowers"),
  P("tides", 3, 3, "", "Tides"),
  P("backyard", 3, 4, "", "Backyard"),
  P("pond", 3, 4, "", "Pond"),
  P("changing", 4, 2, "", "Changing"),
  P("fighters", 4, 2, Z, "Fighters"),
  P("finding", 4, 2, "", "Finding"),
  P("lowmist", 4, 2, "", "Lowmist"),
  P("passage", 4, 2, "", "Passage"),
  P("donkey_kong", 4, 3, Z, "Donkey Kong"),
  P("skeleton", 4, 3, Z, "Skeleton"),
  P("burning_skull", 4, 4, "", "Burning Skull"),
  P("orb", 4, 4, "", "Orb"),
  P("pigscene", 4, 4, Z, "Pigscene"),
  P("pointer", 4, 4, Z, "Pointer"),
  P("unpacked", 4, 4, "", "Unpacked"),
];

export function paintingsOfSize(w: number, h: number): PaintingDef[] {
  return PAINTINGS.filter((p) => p.w === w && p.h === h);
}

export interface PlacedPainting {
  id: string;
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
  def: PaintingDef;
  mesh: THREE.Mesh;
}

export interface PaintingRect {
  nx: number;
  nz: number;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

const texCache = new Map<string, THREE.Texture | null>();
const pendingUpgrades = new Map<string, THREE.Mesh[]>();

function fallbackCanvas(def: PaintingDef): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(16, def.w * 16);
  canvas.height = Math.max(16, def.h * 16);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2c1d11";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4a5a6a";
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  return canvas;
}

export function paintingTexture(def: PaintingDef): THREE.Texture | null {
  if (texCache.has(def.name)) return texCache.get(def.name) ?? null;
  texCache.set(def.name, null);
  const img = new Image();
  img.onload = () => {
    try {
      const framed = document.createElement("canvas");
      framed.width = img.naturalWidth || img.width;
      framed.height = img.naturalHeight || img.height;
      const g = framed.getContext("2d")!;
      g.imageSmoothingEnabled = false;
      g.drawImage(img, 0, 0);
      g.fillStyle = "#1f150c";
      const b = 2;
      g.fillRect(0, 0, framed.width, b);
      g.fillRect(0, framed.height - b, framed.width, b);
      g.fillRect(0, 0, b, framed.height);
      g.fillRect(framed.width - b, 0, b, framed.height);
      const tex = new THREE.CanvasTexture(framed);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      texCache.set(def.name, tex);
      const waiting = pendingUpgrades.get(def.name);
      pendingUpgrades.delete(def.name);
      if (waiting) {
        for (const mesh of waiting) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.map = tex;
          mat.needsUpdate = true;
        }
      }
    } catch { /* keep fallback */ }
  };
  img.onerror = () => { /* keep fallback */ };
  img.src = def.url;
  return null;
}

export function createPaintingMesh(def: PaintingDef): THREE.Mesh {
  const tex = paintingTexture(def);
  const mat = new THREE.MeshBasicMaterial({
    map: tex ?? new THREE.CanvasTexture(fallbackCanvas(def)),
    side: THREE.DoubleSide,
  });
  if (mat.map) {
    mat.map.magFilter = THREE.NearestFilter;
    mat.map.minFilter = THREE.NearestFilter;
  }
  const geom = new THREE.PlaneGeometry(def.w * 0.96, def.h * 0.96);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = false;
  if (!tex) {
    const waiting = pendingUpgrades.get(def.name) ?? [];
    waiting.push(mesh);
    pendingUpgrades.set(def.name, waiting);
  }
  return mesh;
}

export function layoutPaintingMesh(mesh: THREE.Mesh, def: PaintingDef, x: number, y: number, z: number, nx: number, nz: number): void {
  if (nx !== 0) {
    mesh.position.set(x + (nx > 0 ? 0.005 : 0.995), y + def.h / 2, z + def.w / 2);
  } else {
    mesh.position.set(x + def.w / 2, y + def.h / 2, z + (nz > 0 ? 0.005 : 0.995));
  }
  mesh.rotation.set(0, Math.atan2(nx, nz), 0);
}

export interface PaintingSpot {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  variant: string;
}

const SIZE_ORDER: Array<[number, number]> = [[4, 4], [4, 3], [3, 4], [4, 2], [3, 3], [2, 2], [2, 1], [1, 2], [1, 1]];

export function findPaintingSpot(
  getBlock: (x: number, y: number, z: number) => number,
  isSupport: (id: number) => boolean,
  isOpen: (id: number) => boolean,
  existing: PaintingRect[],
  ax: number,
  ay: number,
  az: number,
  nx: number,
  nz: number,
  pick: (n: number) => number
): PaintingSpot | null {
  const ux = nz !== 0 ? 1 : 0;
  const uz = nx !== 0 ? 1 : 0;
  const overlaps = (x0: number, y0: number, z0: number, w: number, h: number): boolean => {
    for (const r of existing) {
      if (r.nx !== nx || r.nz !== nz) continue;
      if (nx !== 0 && r.x0 !== x0) continue;
      if (nz !== 0 && r.z0 !== z0) continue;
      const a0 = nx !== 0 ? z0 : x0, a1 = nx !== 0 ? z0 + w : x0 + w;
      const b0 = nx !== 0 ? r.z0 : r.x0, b1 = nx !== 0 ? r.z1 : r.x1;
      const c0 = y0, c1 = y0 + h;
      if (a0 < b1 && b0 < a1 && c0 < r.y1 && r.y0 < c1) return true;
    }
    return false;
  };
  const supported = (x0: number, y0: number, z0: number, w: number, h: number): boolean => {
    for (let dy = 0; dy < h; dy++) {
      for (let dw = 0; dw < w; dw++) {
        const cx = x0 + ux * dw, cy = y0 + dy, cz = z0 + uz * dw;
        if (!isOpen(getBlock(cx, cy, cz))) return false;
        const behind = getBlock(cx - nx, cy, cz - nz);
        if (!isSupport(behind)) return false;
      }
    }
    return true;
  };
  for (const [w, h] of SIZE_ORDER) {
    const variants = paintingsOfSize(w, h);
    if (!variants.length) continue;
    for (let oy = 0; oy < h; oy++) {
      for (let ox = 0; ox < w; ox++) {
        const x0 = ax - ux * ox, y0 = ay - oy, z0 = az - uz * ox;
        if (y0 < 1) continue;
        if (!supported(x0, y0, z0, w, h)) continue;
        if (overlaps(x0, y0, z0, w, h)) continue;
        return { x: x0, y: y0, z: z0, w, h, variant: variants[Math.floor(pick(variants.length)) % variants.length].name };
      }
    }
  }
  return null;
}
