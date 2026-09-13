/**
 * @file src/sim/gizmo.ts
 * In-scene transform gizmo (U19): axis arrows (X red, Y green, Z blue) anchored
 * to the selection's min corner, complementing the existing yellow area box.
 * Visual-only anchors; actual translation is exposed as `areaMove` in the sim
 * bridge (U20) so blocks can be nudge/moved without drag raycasting.
 */
import * as THREE from "three";

const ARROW_LEN = 1.4;

export function createAxisGizmo(): THREE.Group {
  const group = new THREE.Group();
  group.renderOrder = 10;
  group.userData.isGizmo = true;

  const axes: Array<[number, number, number, number]> = [
    [1, 0, 0, 0xff4422],
    [0, 1, 0, 0x44dd44],
    [0, 0, 1, 0x3366ff]
  ];

  for (const [dx, dy, dz, color] of axes) {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(dx, dy, dz),
      new THREE.Vector3(0, 0, 0),
      ARROW_LEN,
      color,
      0.34,
      0.15
    );
    // draw on top of the world
    arrow.traverse((o) => { (o as THREE.Mesh).renderOrder = 10; });
    group.add(arrow);
  }
  return group;
}

/** Position the gizmo at the min corner of a selection (slightly outside). */
export function placeAxisGizmo(group: THREE.Group, minX: number, minY: number, minZ: number): void {
  group.position.set(minX - 0.55, minY - 0.12, minZ - 0.55);
}
