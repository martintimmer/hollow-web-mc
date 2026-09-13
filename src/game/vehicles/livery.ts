/**
 * @file src/game/vehicles/livery.ts
 * Procedural canvas-texture livery (racing stripes) — zero external assets,
 * same "synthesize at runtime" approach as the game's terrain texture atlas.
 * Stripes are applied as flat decal planes on the hood/roof/trunk top
 * surfaces rather than a single wraparound body texture, so there's no UV
 * seam to solve across the car's separate chassis primitives.
 */

import * as THREE from "three";

/** A tileable square canvas with two vertical stripes on a transparent ground. */
export function createStripeLiveryTexture(stripeColor = "#ffffff", stripeWidthFrac = 0.16): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const w = size * stripeWidthFrac;
  const gap = size * 0.05;
  const cx = size / 2;
  ctx.fillStyle = stripeColor;
  ctx.fillRect(cx - gap / 2 - w, 0, w, size);
  ctx.fillRect(cx + gap / 2, 0, w, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Lays one stripe-decal plane flat on a body panel (hood, roof, or trunk lid). */
export function addStripeDecal(
  group: THREE.Group,
  tex: THREE.CanvasTexture,
  opts: { width: number; length: number; x?: number; y: number; z: number }
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, metalness: 0.15 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(opts.width, opts.length), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(opts.x ?? 0, opts.y, opts.z);
  mesh.renderOrder = 1;
  group.add(mesh);
  return mesh;
}
