/**
 * @file src/game/vehicles/createCompactCar.ts
 * "Blista" — compact hatchback archetype: short wheelbase, small mass, tall
 * greenhouse, steel poverty-cap wheels. Front faces -Z.
 */

import * as THREE from "three";
import type { VehicleModel } from "./vehicleModel";
import { createCarMaterials } from "./carMaterials";
import { makeWheelBuilder } from "./wheelKit";
import { addLicensePlates } from "./plateTexture";
import { addGrille } from "./exteriorDetails";
import { addRearviewMirror, addShifterAndHandbrake, addDoorCard } from "./interiorDetails";
import { softenBox } from "./carGeometry";

export function createCompactCar(): VehicleModel {
  const group = new THREE.Group();

  const mats = createCarMaterials(0x3f8ecf); // cheerful economy-car blue
  const paintMat = mats.paint, trimMat = mats.trim, interiorMat = mats.interior, dashMat = mats.dash,
    seatMat = mats.seat, glassMat = mats.glass, headMat = mats.head, tailMat = mats.tail;

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(softenBox(geo), mat);
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // small, tall-greenhouse hatchback body
  add(new THREE.BoxGeometry(1.5, 0.4, 3.1), paintMat, 0, 0.5, 0);
  add(new THREE.BoxGeometry(0.07, 0.28, 2.0), paintMat, 0.74, 0.56, -0.1);
  add(new THREE.BoxGeometry(0.07, 0.28, 2.0), paintMat, -0.74, 0.56, -0.1);
  add(new THREE.BoxGeometry(1.46, 0.1, 0.65), paintMat, 0, 0.66, -1.1, -0.05);

  add(new THREE.BoxGeometry(1.24, 0.5, 0.04), glassMat, 0, 1.1, -1.32, -0.45);
  add(new THREE.BoxGeometry(0.06, 0.6, 0.06), paintMat, -0.6, 1.0, -1.32);
  add(new THREE.BoxGeometry(0.06, 0.6, 0.06), paintMat, 0.6, 1.0, -1.32);
  add(new THREE.BoxGeometry(1.28, 0.04, 0.04), trimMat, 0, 1.34, -1.42);

  // tall, upright roof (economy hatch proportions)
  add(new THREE.BoxGeometry(1.4, 0.06, 1.9), paintMat, 0, 1.4, -0.35);
  add(new THREE.BoxGeometry(0.06, 0.42, 0.07), paintMat, -0.75, 1.18, -0.15);
  add(new THREE.BoxGeometry(0.06, 0.42, 0.07), paintMat, 0.75, 1.18, -0.15);
  add(new THREE.BoxGeometry(0.07, 0.5, 0.07), paintMat, -0.7, 1.14, 0.65);
  add(new THREE.BoxGeometry(0.07, 0.5, 0.07), paintMat, 0.7, 1.14, 0.65);
  add(new THREE.BoxGeometry(0.02, 0.22, 0.65), glassMat, -0.8, 0.98, 0.2);
  add(new THREE.BoxGeometry(0.02, 0.22, 0.65), glassMat, 0.8, 0.98, 0.2);
  // near-vertical hatch glass (economy-hatch look)
  add(new THREE.BoxGeometry(1.24, 0.5, 0.04), glassMat, 0, 1.1, 0.85, 0.25);
  add(new THREE.BoxGeometry(1.3, 0.06, 0.5), paintMat, 0, 0.68, 1.28);

  add(new THREE.BoxGeometry(1.54, 0.14, 0.18), trimMat, 0, 0.28, -1.5);
  add(new THREE.BoxGeometry(1.54, 0.14, 0.18), trimMat, 0, 0.28, 1.5);
  for (const sx of [-0.5, 0.5]) {
    add(new THREE.BoxGeometry(0.2, 0.13, 0.05), headMat, sx, 0.56, -1.48);
    add(new THREE.BoxGeometry(0.22, 0.15, 0.02), trimMat, sx, 0.56, -1.5);
    const hl = new THREE.PointLight(0xfff2b0, 2.2, 6);
    hl.position.set(sx, 0.56, -1.46);
    group.add(hl);
  }
  for (const sx of [-0.5, 0.5]) {
    add(new THREE.BoxGeometry(0.3, 0.13, 0.05), tailMat, sx, 0.6, 1.51);
    const tl = new THREE.PointLight(0xff3020, 1.6, 4);
    tl.position.set(sx, 0.6, 1.5);
    group.add(tl);
  }
  addLicensePlates(group, -1.52, 1.52, 0.28);
  // small, plain grille — no exhaust flourish; this is the budget car of the fleet
  addGrille(group, mats, { y: 0.34, z: -1.51, width: 0.7, height: 0.14, bars: 5 });

  const doorL = new THREE.Group();
  doorL.position.set(-0.77, 0.56, -0.6);
  const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.8), paintMat);
  doorLMesh.position.set(0.025, 0, 0.4);
  doorLMesh.castShadow = true;
  doorL.add(doorLMesh);
  const doorGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.6), glassMat);
  doorGlassL.position.set(0.025, 0.16, 0.4);
  doorL.add(doorGlassL);
  const doorHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.07), trimMat);
  doorHandleL.position.set(0.045, -0.02, 0.62);
  doorL.add(doorHandleL);
  addDoorCard(doorL, mats, { x: 0.055, y: 0.0, z: 0.4, width: 0.65, height: 0.26 });
  group.add(doorL);

  const doorR = new THREE.Group();
  doorR.position.set(0.77, 0.56, -0.6);
  const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.8), paintMat);
  doorRMesh.position.set(-0.025, 0, 0.4);
  doorRMesh.castShadow = true;
  doorR.add(doorRMesh);
  const doorGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.6), glassMat);
  doorGlassR.position.set(-0.025, 0.16, 0.4);
  doorR.add(doorGlassR);
  const doorHandleR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.07), trimMat);
  doorHandleR.position.set(-0.045, -0.02, 0.62);
  doorR.add(doorHandleR);
  addDoorCard(doorR, mats, { x: -0.055, y: 0.0, z: 0.4, width: 0.65, height: 0.26 });
  group.add(doorR);

  // hatch (rear liftgate) instead of a trunk lid
  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, 1.36, -0.3);
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.9, 0.05), paintMat);
  trunkLid.position.set(0, -0.45, 1.15);
  trunkLid.castShadow = true;
  trunkHinge.add(trunkLid);
  const trunkFloor = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.6), interiorMat);
  trunkFloor.position.set(0, -0.72, 0.9);
  trunkHinge.add(trunkFloor);
  group.add(trunkHinge);

  add(new THREE.BoxGeometry(1.2, 0.05, 1.5), interiorMat, 0, 0.56, -0.2);
  add(new THREE.BoxGeometry(1.24, 0.24, 0.2), dashMat, 0, 0.8, -1.0);
  add(new THREE.BoxGeometry(1.24, 0.04, 0.24), dashMat, 0, 0.92, -1.0, -0.2);
  add(new THREE.BoxGeometry(0.22, 0.07, 0.7), dashMat, 0, 0.64, -0.5);
  addShifterAndHandbrake(group, mats, { x: 0, y: 0.68, z: -0.4 });
  addRearviewMirror(group, mats, { y: 1.32, z: -1.36 });
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(-0.3, 0.88, -0.9);
  steeringGroup.rotation.x = 0.48;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8), trimMat);
  column.position.set(0, -0.07, 0.07);
  column.rotation.x = 0.25;
  column.castShadow = true;
  steeringGroup.add(column);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 18), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6 }));
  wheel.name = "steerWheel";
  wheel.position.set(0, 0.12, 0);
  wheel.rotation.x = Math.PI / 2;
  wheel.castShadow = true;
  steeringGroup.add(wheel);
  group.add(steeringGroup);

  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wiperL = new THREE.Group();
  wiperL.position.set(-0.24, 1.32, -1.35);
  wiperL.add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.013, 0.35), wiperMat));
  group.add(wiperL);
  const wiperR = new THREE.Group();
  wiperR.position.set(0.24, 1.32, -1.35);
  wiperR.add(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.013, 0.35), wiperMat));
  group.add(wiperR);

  const seat = (sx: number, sz: number) => {
    add(new THREE.BoxGeometry(0.42, 0.12, 0.42), seatMat, sx, 0.88, sz);
    add(new THREE.BoxGeometry(0.42, 0.48, 0.1), seatMat, sx, 1.14, sz + 0.22);
  };
  seat(-0.3, -0.55);
  seat(0.3, -0.55);
  add(new THREE.BoxGeometry(1.1, 0.12, 0.4), seatMat, 0, 0.88, 0.55);
  add(new THREE.BoxGeometry(1.1, 0.36, 0.1), seatMat, 0, 1.1, 0.78);

  // steel poverty caps — the budget-car wheel
  const makeWheel = makeWheelBuilder(mats, "povertyCap", 0.32);
  const wheels = {
    FL: makeWheel(-0.78, -1.0, "wheel_FL"),
    FR: makeWheel(0.78, -1.0, "wheel_FR"),
    RL: makeWheel(-0.78, 1.05, "wheel_RL"),
    RR: makeWheel(0.78, 1.05, "wheel_RR")
  };
  group.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);

  return { root: group, wheels, steeringWheel: steeringGroup, wipers: { left: wiperL, right: wiperR } as any, trunkHinge, trunkLid, doors: { left: doorL, right: doorR }, seatY: 1.32 };
}
