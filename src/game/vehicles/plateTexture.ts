/**
 * @file src/game/vehicles/plateTexture.ts
 * Procedural canvas license-plate texture (front + rear decal), shared and
 * cached across every car style — zero external assets.
 */

import * as THREE from "three";

let cached: THREE.CanvasTexture | null = null;

function getPlateTexture(): THREE.CanvasTexture {
  if (cached) return cached;
  const w = 128, h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#eef0e4";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.fillStyle = "#1a3f8a";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HP-1976", w / 2, h / 2);
  cached = new THREE.CanvasTexture(canvas);
  cached.needsUpdate = true;
  return cached;
}

/** Adds a front (facing -Z) and rear (facing +Z) plate to the car body. */
export function addLicensePlates(group: THREE.Group, frontZ: number, rearZ: number, y: number) {
  const mat = new THREE.MeshStandardMaterial({ map: getPlateTexture(), roughness: 0.6, metalness: 0.05 });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), mat);
  front.position.set(0, y, frontZ);
  front.rotation.y = Math.PI;
  group.add(front);
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), mat);
  rear.position.set(0, y, rearZ);
  group.add(rear);
}
