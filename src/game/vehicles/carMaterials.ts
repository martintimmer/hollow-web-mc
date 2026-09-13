/**
 * @file src/game/vehicles/carMaterials.ts
 * Shared paint/trim/glass/lamp material factory for procedural car bodies
 * (createMockupCar, createHardtopCar, and the archetype builders) — flat, bold
 * PS2-era gloss paint + bright chrome trim, parameterized by body/roof color.
 */

import * as THREE from "three";

export interface CarMaterials {
  paint: THREE.MeshStandardMaterial;
  roofPaint: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  interior: THREE.MeshStandardMaterial;
  dash: THREE.MeshStandardMaterial;
  seat: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  tire: THREE.MeshStandardMaterial;
  hub: THREE.MeshStandardMaterial;
  hubDark: THREE.MeshStandardMaterial;
  head: THREE.MeshStandardMaterial;
  tail: THREE.MeshStandardMaterial;
}

export function createCarMaterials(bodyColor = 0xb3141f, roofColor = bodyColor): CarMaterials {
  return {
    paint: new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.2, roughness: 0.5 }),
    roofPaint: new THREE.MeshStandardMaterial({ color: roofColor, metalness: 0.2, roughness: 0.5 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 0.95, roughness: 0.12 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.85 }),
    dash: new THREE.MeshStandardMaterial({ color: 0x2d3037, roughness: 0.8 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x6b3b26, roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xc8e8ff, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.05, side: THREE.DoubleSide }),
    tire: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }),
    hub: new THREE.MeshStandardMaterial({ color: 0xc8ccd4, metalness: 0.95, roughness: 0.3 }),
    hubDark: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.7, metalness: 0.4 }),
    head: new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffe27a, emissiveIntensity: 2.2 }),
    tail: new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 1.8 })
  };
}
