/**
 * @file src/game/vehicles/createSportsCar.ts
 * "Cheetah" — sports car archetype: low, wide, short cabin, rear delta-wing
 * spoiler, wide-track 5-spoke alloys, bold gloss paint. Front faces -Z.
 */

import * as THREE from "three";
import type { VehicleModel } from "./vehicleModel";
import { createCarMaterials } from "./carMaterials";
import { makeWheelBuilder } from "./wheelKit";
import { addLicensePlates } from "./plateTexture";
import { addGrille, addExhaustTips } from "./exteriorDetails";
import { addRearviewMirror, addShifterAndHandbrake, addDoorCard } from "./interiorDetails";
import { softenBox } from "./carGeometry";

export function createSportsCar(): VehicleModel {
  const group = new THREE.Group();

  const mats = createCarMaterials(0xf0c419); // signature Cheetah yellow
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

  // low, wide chassis — shorter overall than the sedan
  add(new THREE.BoxGeometry(1.9, 0.34, 3.9), paintMat, 0, 0.46, 0);
  add(new THREE.BoxGeometry(0.08, 0.26, 2.4), paintMat, 0.95, 0.5, -0.2);
  add(new THREE.BoxGeometry(0.08, 0.26, 2.4), paintMat, -0.95, 0.5, -0.2);
  add(new THREE.BoxGeometry(1.86, 0.1, 1.15), paintMat, 0, 0.6, -1.35, -0.08);
  add(new THREE.BoxGeometry(1.86, 0.1, 0.55), paintMat, 0, 0.6, 1.55, 0.06);

  // low, raked windshield — cab-forward sports profile
  add(new THREE.BoxGeometry(1.58, 0.42, 0.04), glassMat, 0, 1.0, -1.55, -0.85);
  add(new THREE.BoxGeometry(0.06, 0.5, 0.06), paintMat, -0.78, 0.9, -1.55);
  add(new THREE.BoxGeometry(0.06, 0.5, 0.06), paintMat, 0.78, 0.9, -1.55);
  add(new THREE.BoxGeometry(1.62, 0.04, 0.04), trimMat, 0, 1.22, -1.65);

  // short, low roof
  add(new THREE.BoxGeometry(1.5, 0.05, 1.35), paintMat, 0, 1.24, -0.85);
  add(new THREE.BoxGeometry(0.07, 0.36, 0.08), paintMat, -0.85, 1.06, -0.55);
  add(new THREE.BoxGeometry(0.07, 0.36, 0.08), paintMat, 0.85, 1.06, -0.55);
  add(new THREE.BoxGeometry(0.02, 0.2, 0.5), glassMat, -0.92, 0.94, -0.15);
  add(new THREE.BoxGeometry(0.02, 0.2, 0.5), glassMat, 0.92, 0.94, -0.15);
  // steep fastback backlight down to the deck
  add(new THREE.BoxGeometry(1.44, 0.55, 0.04), glassMat, 0, 1.0, 0.15, 1.0);

  // rear delta-wing spoiler on struts
  add(new THREE.BoxGeometry(0.05, 0.22, 0.05), trimMat, -0.7, 0.82, 1.7);
  add(new THREE.BoxGeometry(0.05, 0.22, 0.05), trimMat, 0.7, 0.82, 1.7);
  add(new THREE.BoxGeometry(1.7, 0.04, 0.3), paintMat, 0, 0.94, 1.72);

  add(new THREE.BoxGeometry(1.94, 0.16, 0.2), trimMat, 0, 0.28, -1.92);
  add(new THREE.BoxGeometry(1.94, 0.16, 0.2), trimMat, 0, 0.28, 1.92);
  add(new THREE.BoxGeometry(0.05, 0.16, 3.3), trimMat, 0.98, 0.32, 0);
  add(new THREE.BoxGeometry(0.05, 0.16, 3.3), trimMat, -0.98, 0.32, 0);
  for (const sx of [-0.62, 0.62]) {
    add(new THREE.BoxGeometry(0.26, 0.13, 0.05), headMat, sx, 0.5, -1.9);
    add(new THREE.BoxGeometry(0.28, 0.15, 0.02), trimMat, sx, 0.5, -1.92);
    const hl = new THREE.PointLight(0xfff2b0, 2.5, 7);
    hl.position.set(sx, 0.5, -1.88);
    group.add(hl);
  }
  for (const sx of [-0.62, 0.62]) {
    add(new THREE.BoxGeometry(0.38, 0.12, 0.05), tailMat, sx, 0.55, 1.91);
    const tl = new THREE.PointLight(0xff3020, 1.8, 5);
    tl.position.set(sx, 0.55, 1.9);
    group.add(tl);
  }
  addLicensePlates(group, -1.94, 1.94, 0.28);
  addGrille(group, mats, { y: 0.34, z: -1.93, width: 0.95, height: 0.16, bars: 9 });
  addExhaustTips(group, mats, { y: 0.24, z: 1.98, spread: 0.6 });

  const doorL = new THREE.Group();
  doorL.position.set(-0.98, 0.5, -0.65);
  const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.85), paintMat);
  doorLMesh.position.set(0.03, 0, 0.42);
  doorLMesh.castShadow = true;
  doorL.add(doorLMesh);
  const doorGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.6), glassMat);
  doorGlassL.position.set(0.03, 0.14, 0.42);
  doorL.add(doorGlassL);
  const doorHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleL.position.set(0.05, -0.02, 0.65);
  doorL.add(doorHandleL);
  addDoorCard(doorL, mats, { x: 0.07, y: 0.0, z: 0.42, width: 0.7, height: 0.28 });
  group.add(doorL);

  const doorR = new THREE.Group();
  doorR.position.set(0.98, 0.5, -0.65);
  const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.85), paintMat);
  doorRMesh.position.set(-0.03, 0, 0.42);
  doorRMesh.castShadow = true;
  doorR.add(doorRMesh);
  const doorGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.6), glassMat);
  doorGlassR.position.set(-0.03, 0.14, 0.42);
  doorR.add(doorGlassR);
  const doorHandleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleR.position.set(-0.05, -0.02, 0.65);
  doorR.add(doorHandleR);
  addDoorCard(doorR, mats, { x: -0.07, y: 0.0, z: 0.42, width: 0.7, height: 0.28 });
  group.add(doorR);

  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, 0.62, 1.35);
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.55), paintMat);
  trunkLid.position.set(0, 0, 0.27);
  trunkLid.castShadow = true;
  trunkHinge.add(trunkLid);
  const trunkFloor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.4), interiorMat);
  trunkFloor.position.set(0, -0.05, 0.2);
  trunkHinge.add(trunkFloor);
  group.add(trunkHinge);

  add(new THREE.BoxGeometry(1.5, 0.05, 1.7), interiorMat, 0, 0.5, -0.35);
  add(new THREE.BoxGeometry(1.55, 0.24, 0.22), dashMat, 0, 0.78, -1.15);
  add(new THREE.BoxGeometry(1.55, 0.05, 0.26), dashMat, 0, 0.9, -1.15, -0.2);
  add(new THREE.BoxGeometry(0.26, 0.07, 0.75), dashMat, 0, 0.6, -0.55);
  addShifterAndHandbrake(group, mats, { x: 0, y: 0.64, z: -0.45 });
  addRearviewMirror(group, mats, { y: 1.2, z: -1.6 });
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(-0.35, 0.86, -1.02);
  steeringGroup.rotation.x = 0.5;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8), trimMat);
  column.position.set(0, -0.07, 0.07);
  column.rotation.x = 0.25;
  column.castShadow = true;
  steeringGroup.add(column);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 18), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6 }));
  wheel.name = "steerWheel";
  wheel.position.set(0, 0.12, 0);
  wheel.rotation.x = Math.PI / 2;
  wheel.castShadow = true;
  steeringGroup.add(wheel);
  group.add(steeringGroup);

  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wiperL = new THREE.Group();
  wiperL.position.set(-0.26, 1.18, -1.58);
  wiperL.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.4), wiperMat));
  group.add(wiperL);
  const wiperR = new THREE.Group();
  wiperR.position.set(0.26, 1.18, -1.58);
  wiperR.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.4), wiperMat));
  group.add(wiperR);

  const seat = (sx: number, sz: number) => {
    add(new THREE.BoxGeometry(0.46, 0.12, 0.46), seatMat, sx, 0.78, sz);
    add(new THREE.BoxGeometry(0.46, 0.5, 0.1), seatMat, sx, 1.06, sz + 0.24);
    add(new THREE.BoxGeometry(0.4, 0.09, 0.09), seatMat, sx, 1.2, sz + 0.23, -0.4);
  };
  seat(-0.35, -0.55);
  seat(0.35, -0.55);

  // wide-track 5-spoke alloys
  const makeWheel = makeWheelBuilder(mats, "alloy5spoke", 0.37);
  const wheels = {
    FL: makeWheel(-1.02, -1.25, "wheel_FL"),
    FR: makeWheel(1.02, -1.25, "wheel_FR"),
    RL: makeWheel(-1.02, 1.35, "wheel_RL"),
    RR: makeWheel(1.02, 1.35, "wheel_RR")
  };
  group.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);

  return { root: group, wheels, steeringWheel: steeringGroup, wipers: { left: wiperL, right: wiperR } as any, trunkHinge, trunkLid, doors: { left: doorL, right: doorR }, seatY: 1.22 };
}
