/**
 * @file src/game/vehicles/exteriorDetails.ts
 * Shared exterior flourishes (grille, dual exhaust tips, hood ornament) that
 * each car archetype calls with its own placement/size so the fleet reads as
 * distinct cars, not the same panel language recolored.
 */

import * as THREE from "three";
import type { CarMaterials } from "./carMaterials";

/** Dark backing plate + N vertical chrome bars — front grille. */
export function addGrille(
  group: THREE.Group,
  mats: CarMaterials,
  opts: { x?: number; y: number; z: number; width: number; height: number; bars?: number }
) {
  const backing = new THREE.Mesh(new THREE.BoxGeometry(opts.width, opts.height, 0.03), mats.interior);
  backing.position.set(opts.x ?? 0, opts.y, opts.z);
  backing.castShadow = true;
  group.add(backing);
  const bars = opts.bars ?? 7;
  const barW = opts.width / (bars * 2);
  for (let i = 0; i < bars; i++) {
    const bx = (opts.x ?? 0) - opts.width / 2 + barW + (i * opts.width) / bars;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(barW * 0.6, opts.height * 0.9, 0.04), mats.trim);
    bar.position.set(bx, opts.y, opts.z - 0.005);
    group.add(bar);
  }
}

/** Dual chrome exhaust tips poking out under the rear bumper. */
export function addExhaustTips(group: THREE.Group, mats: CarMaterials, opts: { y: number; z: number; spread: number }) {
  for (const sx of [-opts.spread, opts.spread]) {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.16, 12), mats.trim);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(sx, opts.y, opts.z);
    tip.castShadow = true;
    group.add(tip);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.8 }));
    bore.rotation.x = Math.PI / 2;
    bore.position.set(sx, opts.y, opts.z + 0.08);
    group.add(bore);
  }
}

/** Small vertical chrome accent on the hood nose (lowrider/luxury flourish). */
export function addHoodOrnament(group: THREE.Group, mats: CarMaterials, opts: { x?: number; y: number; z: number }) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6), mats.trim);
  stem.position.set(opts.x ?? 0, opts.y + 0.035, opts.z);
  group.add(stem);
  const wing = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 6), mats.trim);
  wing.position.set(opts.x ?? 0, opts.y + 0.075, opts.z);
  group.add(wing);
}
