/* Articulated Minecraft Storage Chest: 3D Geometry, Textures, Shaders & Animation */
import * as THREE from "three";

export interface ChestEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  root: THREE.Group;
  baseMesh: THREE.Mesh;
  lidGroup: THREE.Group;
  lidMesh: THREE.Mesh;
  latchMesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  isOpen: boolean;
  currentAngle: number;
  targetAngle: number;
  isAlcove?: boolean;
  isLarge?: boolean;
}

export interface ChestPair {
  isLarge: boolean;
  leftX: number;
  rightX: number;
  minX: number;
  maxX: number;
}

/**
 * Large-chest pairing ruleset (vanilla "two singles → one double; a chest beside a
 * double stays single; add another → two doubles", and so on):
 * chests merge pairwise along X, left→right, each chest pairing with at most ONE
 * neighbour. Given a block at (x,y,z), return the pair it belongs to (or itself if
 * single). Works across chunk borders via `getBlock`.
 */
export function computeChestPair(
  getBlock: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number
): ChestPair {
  const chest = (xx: number) => getBlock(xx, y, z) === 43;
  if (!chest(x)) return { isLarge: false, leftX: x, rightX: x, minX: x, maxX: x };

  // Contiguous run of chests containing x.
  let x0 = x;
  while (chest(x0 - 1)) x0--;
  let x1 = x;
  while (chest(x1 + 1)) x1++;

  // Greedy pairing left→right: each unpaired chest prefers an unpaired left
  // neighbour, else an unpaired right neighbour, else stays single.
  const partner = new Map<number, number>();
  for (let xx = x0; xx <= x1; xx++) {
    if (partner.has(xx)) continue;
    if (chest(xx - 1) && !partner.has(xx - 1)) {
      partner.set(xx - 1, xx);
      partner.set(xx, xx - 1);
    } else if (chest(xx + 1) && !partner.has(xx + 1)) {
      partner.set(xx, xx + 1);
      partner.set(xx + 1, xx);
    } else {
      partner.set(xx, xx);
    }
  }

  const p = partner.get(x);
  if (p !== undefined && p !== x) {
    const leftX = Math.min(x, p);
    const rightX = Math.max(x, p);
    return { isLarge: true, leftX, rightX, minX: leftX, maxX: rightX };
  }
  return { isLarge: false, leftX: x, rightX: x, minX: x, maxX: x };
}



export function createChestFaceImageData(type: "side" | "top" | "bottom"): ImageData {
  // Check if custom raw pixels are stored from the editor (100% synchronous)
  try {
    const raw = JSON.parse(localStorage.getItem("mc_custom_chest_pixels") || "{}");
    if (raw[type] && Array.isArray(raw[type]) && raw[type].length === 1024) {
      return new ImageData(new Uint8ClampedArray(raw[type]), 16, 16);
    }
  } catch {}

  const imgData = new ImageData(16, 16);
  const d = imgData.data;
  const hex = (h: string) => [parseInt(h.slice(1,3), 16), parseInt(h.slice(3,5), 16), parseInt(h.slice(5,7), 16), 255];
  
  // High contrast palette: Dark outer lines + Light golden brown interior
  const DARK_OUTER = hex("#140d07");
  const DARK_BORDER = hex("#261a11");
  const DARK_ACCENT = hex("#38271a");
  const DARK_SEAM = hex("#422e1f");
  
  const LIGHT_WOOD_1 = hex("#d89e46");
  const LIGHT_WOOD_2 = hex("#c68c3a");
  const LIGHT_WOOD_3 = hex("#e8b65c");
  const LIGHT_WOOD_4 = hex("#b88032");
  const LIGHT_WOOD_5 = hex("#a87028");

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const idx = (y * 16 + x) * 4;
      const isPerimeter = (x === 0 || x === 15 || y === 0 || y === 15);
      const isInnerBorder = (x === 1 || x === 14 || y === 1 || y === 14);
      
      let col = LIGHT_WOOD_2;
      
      if (isPerimeter) {
        col = DARK_OUTER;
      } else if (isInnerBorder) {
        col = ((x + y) % 3 === 0) ? DARK_ACCENT : DARK_BORDER;
      } else {
        // Inner 12x12 Light Brown Area
        const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const rand = h - Math.floor(h);
        
        if (type === "side" && (y === 7 || y === 8)) {
          col = (y === 7) ? DARK_SEAM : LIGHT_WOOD_5; // Plank horizontal divider
        } else if (type === "top" && (x === 7 || x === 8)) {
          col = (x === 7) ? DARK_SEAM : LIGHT_WOOD_5; // Plank vertical divider
        } else if (rand > 0.75) {
          col = LIGHT_WOOD_3; // Sunlit warm grain highlight
        } else if (rand > 0.4) {
          col = LIGHT_WOOD_1; // Light golden brown
        } else if (rand > 0.15) {
          col = LIGHT_WOOD_2; // Base warm golden brown
        } else {
          col = LIGHT_WOOD_4; // Grain shadow
        }
      }
      
      d[idx] = col[0];
      d[idx + 1] = col[1];
      d[idx + 2] = col[2];
      d[idx + 3] = col[3];
    }
  }
  return imgData;
}

interface ChestFaceSlot {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  material: THREE.MeshLambertMaterial;
}

let faceSlots: Record<"side" | "top" | "bottom", ChestFaceSlot> | null = null;
let sharedChestTextures: { woodMat: THREE.Material[]; latchMat: THREE.Material; shadowMat: THREE.Material } | null = null;

export function reloadChestTextures() {
  if (!faceSlots) return;
  let overrides: Record<string, string> = {};
  try {
    overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
  } catch {}

  const faces: Array<"side" | "top" | "bottom"> = ["side", "top", "bottom"];
  for (const f of faces) {
    const slot = faceSlots[f];
    if (!slot) continue;
    const customSrc = overrides[`block_43_${f}`] || (f === "side" ? (overrides["877"] || overrides["block_43_side"]) : null);
    if (customSrc) {
      const img = new Image();
      img.onload = () => {
        slot.ctx.clearRect(0, 0, 16, 16);
        slot.ctx.drawImage(img, 0, 0, 16, 16);
        slot.texture.needsUpdate = true;
        slot.material.needsUpdate = true;
      };
      img.src = customSrc;
      if (img.complete && img.naturalWidth > 0) {
        slot.ctx.clearRect(0, 0, 16, 16);
        slot.ctx.drawImage(img, 0, 0, 16, 16);
        slot.texture.needsUpdate = true;
        slot.material.needsUpdate = true;
      }
    } else {
      slot.ctx.clearRect(0, 0, 16, 16);
      slot.ctx.putImageData(createChestFaceImageData(f), 0, 0);
      slot.texture.needsUpdate = true;
      slot.material.needsUpdate = true;
    }
  }
}

export function getOrCreateChestMaterials(forceRefresh = false) {
  if (sharedChestTextures && !forceRefresh) {
    reloadChestTextures();
    return sharedChestTextures;
  }

  if (!faceSlots) {
    const makeSlot = (type: "side" | "top" | "bottom"): ChestFaceSlot => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.imageSmoothingEnabled = false;
      ctx.putImageData(createChestFaceImageData(type), 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.MeshLambertMaterial({ map: texture });
      return { canvas, ctx, texture, material };
    };

    faceSlots = {
      side: makeSlot("side"),
      top: makeSlot("top"),
      bottom: makeSlot("bottom")
    };
  }

  // 2. Procedural 16x16 Silver Latch
  const latchCv = document.createElement("canvas");
  latchCv.width = latchCv.height = 16;
  const lctx = latchCv.getContext("2d", { willReadFrequently: true })!;
  lctx.imageSmoothingEnabled = false;

  lctx.fillStyle = "#a8a8a8";
  lctx.fillRect(0, 0, 16, 16);
  lctx.fillStyle = "#333333";
  lctx.strokeRect(0.5, 0.5, 15, 15);
  lctx.fillStyle = "#ffffff";
  lctx.fillRect(3, 3, 10, 2);
  lctx.fillStyle = "#e0e0e0";
  lctx.fillRect(2, 5, 12, 4);
  lctx.fillStyle = "#606060";
  lctx.fillRect(4, 9, 8, 5);
  lctx.fillStyle = "#151515";
  lctx.fillRect(7, 10, 2, 3);

  const latchTex = new THREE.CanvasTexture(latchCv);
  latchTex.magFilter = latchTex.minFilter = THREE.NearestFilter;
  latchTex.generateMipmaps = false;
  latchTex.colorSpace = THREE.SRGBColorSpace;
  const latchMat = new THREE.MeshLambertMaterial({ map: latchTex });

  const boxMats = [
    faceSlots.side.material,
    faceSlots.side.material,
    faceSlots.top.material,
    faceSlots.bottom.material,
    faceSlots.side.material,
    faceSlots.side.material
  ];

  sharedChestTextures = { woodMat: boxMats, latchMat, shadowMat: faceSlots.side.material };
  reloadChestTextures();
  return sharedChestTextures;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
      reloadChestTextures();
    }
  });
  window.addEventListener("focus", () => {
    reloadChestTextures();
  });
}

/**
 * Creates an articulated Minecraft storage chest 3D model.
 * 
 * Dimensions:
 * - Total Width: 14/16 = 0.875
 * - Base Height: 10/16 = 0.625
 * - Lid Height:   4/16 = 0.250
 * - Total Height: 14/16 = 0.875
 * - Articulation Hinge: along the back top edge of the base
 */
export function createArticulatedChest(options?: {
  yaw?: number;
  isLarge?: boolean;
  woodMaterial?: THREE.Material | THREE.Material[];
  latchMaterial?: THREE.Material;
}): ChestEntity {
  const defaultMats = getOrCreateChestMaterials(true);
  const woodMat = options?.woodMaterial || defaultMats.woodMat;
  const latchMat = options?.latchMaterial || defaultMats.latchMat;
  const root = new THREE.Group();

  const isLarge = !!options?.isLarge;
  const W = isLarge ? 1.875 : 0.875; // 30/16 for double chest, 14/16 for single chest
  const baseH = 0.625; // 10/16
  const lidH = 0.25; // 4/16
  const D = 0.875; // 14/16

  // 1. Base Body (Main Rectangular Prism with Pixel-Art Banding)
  const baseGeom = new THREE.BoxGeometry(W, baseH, D);
  const baseMesh = new THREE.Mesh(baseGeom, woodMat);
  baseMesh.position.set(0, baseH / 2, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  root.add(baseMesh);

  // 2. Hinged Lid Group (Articulation Axis at Back Top Edge of Base)
  // Back edge is at Z = -D/2 = -0.4375, Top of base is at Y = baseH = 0.625
  const lidGroup = new THREE.Group();
  const hingeZ = -D / 2;
  const hingeY = baseH;
  lidGroup.position.set(0, hingeY, hingeZ);

  // Lid Geometry: Sits flush atop base when closed (rotation.x = 0)
  // Relative to hinge (0, 0, 0), lid center is at (0, lidH / 2, D / 2)
  const lidGeom = new THREE.BoxGeometry(W, lidH, D);
  const lidMesh = new THREE.Mesh(lidGeom, woodMat);
  lidMesh.position.set(0, lidH / 2, D / 2);
  lidMesh.castShadow = true;
  lidMesh.receiveShadow = true;
  lidGroup.add(lidMesh);

  // 3. Central Multi-Piece Silver Metal Latch Mechanism
  const latchW = 0.125;
  const latchH = 0.25;
  const latchD = 0.0625;
  const latchGeom = new THREE.BoxGeometry(latchW, latchH, latchD);
  const latchMesh = new THREE.Mesh(latchGeom, latchMat);

  // Latch mounted to front face of lid
  latchMesh.position.set(0, 0, D + latchD / 2);
  latchMesh.castShadow = true;
  lidGroup.add(latchMesh);

  root.add(lidGroup);

  // Perfectly grid-aligned orientation (yaw = 0, no diagonal rotation)
  const baseYaw = options?.yaw ?? 0;
  root.rotation.y = baseYaw;

  return {
    id: `chest_${Math.random().toString(36).slice(2, 9)}`,
    x: 0,
    y: 0,
    z: 0,
    yaw: baseYaw,
    root,
    baseMesh,
    lidGroup,
    lidMesh,
    latchMesh,
    shadowMesh: baseMesh,
    isOpen: false,
    currentAngle: 0,
    targetAngle: 0,
    isLarge: !!options?.isLarge
  };
}

/**
 * Step chest lid articulation animation (smooth spring / lerp opening & closing)
 * When open: lid rotates backwards on hinge to ~-72° (-1.25 rad)
 * When closed: lid returns perfectly flush to 0°
 */
export function updateChestAnimation(chest: ChestEntity, dt: number) {
  // Target angle: -1.25 radians (~72 degrees backwards) when open, 0 when closed
  chest.targetAngle = chest.isOpen ? -1.25 : 0;

  // Smooth exponential interpolation
  const speed = 12;
  const diff = chest.targetAngle - chest.currentAngle;
  if (Math.abs(diff) > 0.001) {
    chest.currentAngle += diff * Math.min(1, speed * dt);
    chest.lidGroup.rotation.x = chest.currentAngle;
  } else if (chest.currentAngle !== chest.targetAngle) {
    chest.currentAngle = chest.targetAngle;
    chest.lidGroup.rotation.x = chest.targetAngle;
  }
}
