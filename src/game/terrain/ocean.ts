/* Procedural Ocean System: Coral Reefs, Kelp Forests, Sea Pickles, Seagrass & Sunken Shipwrecks */
import type { VoxelWriter, RandomFunc } from "./trees";
import { SEA } from "../world";

export function generateCoralReef(x: number, y: number, z: number, r: RandomFunc, w: VoxelWriter) {
  // Corals strictly generate underwater with at least 3m water depth
  if (y > SEA - 3) return;

  const coralType = 127 + Math.floor(r() * 4); // Tube (127), Brain (128), Fire (129), Horn (130)
  const maxPossibleH = Math.max(1, (SEA - 2) - y);
  const height = Math.min(maxPossibleH, 1 + Math.floor(r() * 3));
  const rad = 1 + (r() < 0.35 ? 1 : 0);

  // Main Coral Mound / Colony (strictly submerged below SEA - 1)
  for (let dy = 1; dy <= height; dy++) {
    const curY = y + dy;
    if (curY > SEA - 2) break;
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.hypot(dx, dz) <= rad + 0.35) {
          w(x + dx, curY, z + dz, coralType);
        }
      }
    }
  }

  // Branching Horns & Sea Pickles on top (strictly y <= SEA - 1)
  const topY = y + height + 1;
  if (topY <= SEA - 1) {
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (r() < 0.45) {
          w(x + dx, topY, z + dz, coralType);
          if (r() < 0.35 && topY + 1 <= SEA - 1) {
            w(x + dx, topY + 1, z + dz, 132); // Glowing Sea Pickle submerged on top
          }
        }
      }
    }
  }
}

export function generateKelpForest(x: number, y: number, z: number, r: RandomFunc, w: VoxelWriter) {
  if (y > SEA - 2) return;
  const maxHeight = Math.min(SEA - 1, y + 3 + Math.floor(r() * 8));
  for (let ky = y + 1; ky <= maxHeight; ky++) {
    w(x, ky, z, 131); // Kelp
  }
}

export function generateSunkenShipwreck(x: number, y: number, z: number, _r: RandomFunc, w: VoxelWriter) {
  const length = 12;
  const width = 5;
  const halfLen = Math.floor(length / 2);
  const halfWid = Math.floor(width / 2);

  // 1. Keel & Hull Framing (Oak Logs 16 & Planks 17)
  for (let dz = -halfLen; dz <= halfLen; dz++) {
    const hullWidth = Math.max(1, Math.floor(halfWid * (1.0 - Math.abs(dz) / (halfLen + 1))));
    // Keel
    w(x, y + 1, z + dz, 16);
    // Ribs & Outer Planking
    for (let dx = -hullWidth; dx <= hullWidth; dx++) {
      const isEdge = Math.abs(dx) === hullWidth;
      const isFloor = Math.abs(dx) < hullWidth;
      if (isFloor) {
        w(x + dx, y + 1, z + dz, 17); // Oak Floor
      }
      if (isEdge) {
        w(x + dx, y + 1, z + dz, 16); // Lower Hull Log
        w(x + dx, y + 2, z + dz, 17); // Mid Hull Plank
        if (dz > -halfLen + 2 && dz < halfLen - 2) {
          w(x + dx, y + 3, z + dz, 17); // Upper Deck Railing
        }
      }
    }
  }

  // 2. Stern Cabin & Captain's Quarters (Rear of ship)
  const sternZ = z + halfLen - 2;
  for (let cy = 2; cy <= 4; cy++) {
    w(x - 1, y + cy, sternZ, 17);
    w(x + 1, y + cy, sternZ, 17);
    w(x, y + cy, sternZ + 1, 17);
  }
  w(x, y + 5, sternZ, 17); // Cabin Roof
  w(x, y + 2, sternZ, 43); // Sunken Treasure Chest!

  // 3. Tilted Mast & Crow's Nest
  const mastZ = z - 1;
  const mastH = Math.min(8, SEA + 1 - y);
  for (let my = 2; my <= mastH; my++) {
    w(x, y + my, mastZ, 16);
  }
  // Yardarm crossbeam & torn sail
  if (y + mastH - 2 <= SEA + 2) {
    w(x - 1, y + mastH - 2, mastZ, 16);
    w(x + 1, y + mastH - 2, mastZ, 16);
    w(x - 2, y + mastH - 2, mastZ, 16);
    w(x + 2, y + mastH - 2, mastZ, 16);
    // Torn white sail remnant
    w(x - 1, y + mastH - 3, mastZ, 13);
    w(x + 1, y + mastH - 3, mastZ, 13);
  }
}
