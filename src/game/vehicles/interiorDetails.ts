/**
 * @file src/game/vehicles/interiorDetails.ts
 * Shared interior flourishes (rearview mirror, shifter + handbrake lever,
 * door interior card) so cabins read as furnished rather than a bare
 * dash+seat block reused with different scale.
 */

import * as THREE from "three";
import type { CarMaterials } from "./carMaterials";

/** Rearview mirror hanging from the windshield header, facing the driver. */
export function addRearviewMirror(group: THREE.Group, mats: CarMaterials, opts: { x?: number; y: number; z: number }) {
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), mats.trim);
  stalk.position.set(opts.x ?? 0, opts.y - 0.07, opts.z);
  group.add(stalk);
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x9fb4c2, metalness: 0.7, roughness: 0.2 }));
  mirror.position.set(opts.x ?? 0, opts.y - 0.14, opts.z);
  group.add(mirror);
}

/** Floor-mounted gear shifter + handbrake lever on the center console. */
export function addShifterAndHandbrake(group: THREE.Group, mats: CarMaterials, opts: { x: number; y: number; z: number }) {
  const shifterBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), mats.dash);
  shifterBase.position.set(opts.x - 0.08, opts.y, opts.z);
  group.add(shifterBase);
  const shifterStick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.14, 6), mats.trim);
  shifterStick.position.set(opts.x - 0.08, opts.y + 0.08, opts.z);
  group.add(shifterStick);
  const shifterKnob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mats.interior);
  shifterKnob.position.set(opts.x - 0.08, opts.y + 0.15, opts.z);
  group.add(shifterKnob);

  const hbBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.1), mats.dash);
  hbBase.position.set(opts.x + 0.07, opts.y, opts.z);
  group.add(hbBase);
  const hbLever = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), mats.trim);
  hbLever.position.set(opts.x + 0.07, opts.y + 0.08, opts.z - 0.03);
  hbLever.rotation.x = -0.3;
  group.add(hbLever);
}

/** Interior door card (panel + armrest) on the inward face of a door group. */
export function addDoorCard(doorGroup: THREE.Group, mats: CarMaterials, opts: { x: number; y: number; z: number; width: number; height: number }) {
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.015, opts.height, opts.width), mats.interior);
  card.position.set(opts.x, opts.y, opts.z);
  doorGroup.add(card);
  const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, opts.width * 0.5), mats.dash);
  armrest.position.set(opts.x - 0.01, opts.y + opts.height * 0.15, opts.z);
  doorGroup.add(armrest);
}
