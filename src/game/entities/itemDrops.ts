// Hollowpine — 3D Dropped Mini-Block Items System
// Spawns miniature voxel items when blocks break in Survival mode.
// Simulates gravity, ground resting, idle spin/bob, magnetic pull, and inventory pickup.

import * as THREE from "three";
import { BLOCK_MAP, isSolid } from "../blocks";
import { createVoxelGeometry } from "../engine/chunkMesh";
import { playPop } from "../sfx";

export interface DroppedItem {
  id: number;
  count: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mesh: THREE.Mesh;
  rotY: number;
  age: number;
  pickupDelay: number;
}

export interface ItemDropManager {
  drops: DroppedItem[];
  spawnDrop: (x: number, y: number, z: number, id: number, count?: number, isNakedHand?: boolean) => DroppedItem | null;
  update: (
    dt: number,
    px: number,
    py: number,
    pz: number,
    onPickup: (id: number, count: number) => number,
    showToast?: (msg: string) => void
  ) => void;
  clear: () => void;
}

export function createItemDropManager(
  scene: THREE.Scene,
  matOpaque: THREE.Material,
  getBlock: (x: number, y: number, z: number) => number
): ItemDropManager {
  const drops: DroppedItem[] = [];
  const geomCache = new Map<number, THREE.BufferGeometry>();
  let lastInvFullToastAt = 0;

  function getMiniGeometry(blockId: number): THREE.BufferGeometry {
    let g = geomCache.get(blockId);
    if (!g) {
      const b = BLOCK_MAP.get(blockId);
      const side = b?.side ?? 1;
      const top = b?.top ?? b?.side ?? 1;
      const bot = b?.bottom ?? b?.side ?? 1;
      g = createVoxelGeometry(side, top, bot);
      geomCache.set(blockId, g);
    }
    return g;
  }

  function spawnDrop(x: number, y: number, z: number, id: number, count = 1, isNakedHand = false): DroppedItem | null {
    if (id <= 0 || id === 39 || id === 40) return null;
    const geom = getMiniGeometry(id);
    const mesh = new THREE.Mesh(geom, matOpaque);
    const scale = isNakedHand ? 0.20 : 0.26;
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = (isNakedHand ? 0.45 : 0.6) + Math.random() * 0.7;
    const drop: DroppedItem = {
      id,
      count,
      x,
      y,
      z,
      vx: Math.cos(angle) * speed,
      vy: (isNakedHand ? 1.8 : 2.2) + Math.random() * 0.8,
      vz: Math.sin(angle) * speed,
      mesh,
      rotY: Math.random() * Math.PI * 2,
      age: 0,
      pickupDelay: 0.35 // brief grace period so player sees the block pop out
    };
    drops.push(drop);
    return drop;
  }

  function update(
    dt: number,
    px: number,
    py: number,
    pz: number,
    onPickup: (id: number, count: number) => number,
    showToast?: (msg: string) => void
  ) {
    const clampedDt = Math.min(0.05, dt);
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.age += clampedDt;
      d.pickupDelay = Math.max(0, d.pickupDelay - clampedDt);

      // Despawn after 5 minutes (standard Minecraft despawn timer)
      if (d.age > 300) {
        scene.remove(d.mesh);
        drops.splice(i, 1);
        continue;
      }

      // ── Physics Simulation ──
      d.vy -= 9.8 * clampedDt;
      d.vy = Math.max(-14, d.vy);

      const nextY = d.y + d.vy * clampedDt;
      const checkBlockY = Math.floor(nextY - 0.12);
      const floorBlock = getBlock(Math.floor(d.x), checkBlockY, Math.floor(d.z));

      if (floorBlock > 0 && isSolid(floorBlock)) {
        d.y = checkBlockY + 1 + 0.14;
        d.vy = 0;
        d.vx *= Math.pow(0.5, clampedDt * 12);
        d.vz *= Math.pow(0.5, clampedDt * 12);
      } else {
        d.y = nextY;
      }

      d.x += d.vx * clampedDt;
      d.z += d.vz * clampedDt;
      d.vx *= Math.pow(0.85, clampedDt * 8);
      d.vz *= Math.pow(0.85, clampedDt * 8);

      // ── Visual Spin & Hover Bob ──
      d.rotY += clampedDt * 2.6;
      d.mesh.rotation.y = d.rotY;
      const bob = Math.sin((d.age + d.x * 2.0) * 3.2) * 0.04;
      d.mesh.position.set(d.x, d.y + bob, d.z);

      // ── Proximity Magnet & Pickup ──
      if (d.pickupDelay <= 0) {
        const dx = px - d.x;
        const dy = (py + 0.5) - d.y;
        const dz = pz - d.z;
        const dist = Math.hypot(dx, dy, dz);

        // Within 2.2m: magnetically pull towards player
        if (dist < 2.2 && dist > 0.05) {
          const magnetSpeed = dist < 0.9 ? 7.5 : 3.8;
          const pull = Math.min(dist, clampedDt * magnetSpeed);
          d.x += (dx / dist) * pull;
          d.y += (dy / dist) * pull;
          d.z += (dz / dist) * pull;
        }

        // Within 0.75m: collect into inventory
        if (dist < 0.75) {
          const leftover = onPickup(d.id, d.count);
          if (leftover === 0) {
            playPop();
            scene.remove(d.mesh);
            drops.splice(i, 1);
            continue;
          } else if (leftover < d.count) {
            playPop();
            d.count = leftover;
          } else {
            const now = performance.now();
            if (now - lastInvFullToastAt > 3500 && showToast) {
              lastInvFullToastAt = now;
              showToast("Inventory full! Cannot collect item 📦");
            }
          }
        }
      }
    }
  }

  function clear() {
    for (const d of drops) {
      scene.remove(d.mesh);
    }
    drops.length = 0;
  }

  return {
    drops,
    spawnDrop,
    update,
    clear
  };
}
