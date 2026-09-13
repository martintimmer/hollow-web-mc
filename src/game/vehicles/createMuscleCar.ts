/**
 * @file src/game/vehicles/createMuscleCar.ts
 * "Sabre" — muscle car archetype: long hood, short deck, hood scoop, matte
 * black paint, 5-spoke alloys. Shares the hardtop cabin/interior/pillar kit;
 * front faces -Z.
 */

import * as THREE from "three";
import type { VehicleModel } from "./vehicleModel";
import { createCarMaterials } from "./carMaterials";
import { makeWheelBuilder } from "./wheelKit";
import { createStripeLiveryTexture, addStripeDecal } from "./livery";
import { addLicensePlates } from "./plateTexture";
import { addGrille, addExhaustTips } from "./exteriorDetails";
import { addRearviewMirror, addShifterAndHandbrake, addDoorCard } from "./interiorDetails";
import { softenBox } from "./carGeometry";

export function createMuscleCar(): VehicleModel {
  const group = new THREE.Group();

  const mats = createCarMaterials(0x17181c);
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

  // chassis — long hood / short deck (front = -Z)
  add(new THREE.BoxGeometry(1.8, 0.42, 4.5), paintMat, 0, 0.55, 0);
  add(new THREE.BoxGeometry(0.08, 0.32, 2.3), paintMat, 0.9, 0.62, -0.55);
  add(new THREE.BoxGeometry(0.08, 0.32, 2.3), paintMat, -0.9, 0.62, -0.55);
  // long hood
  add(new THREE.BoxGeometry(1.78, 0.13, 1.85), paintMat, 0, 0.72, -1.85, -0.03);
  // hood scoop
  add(new THREE.BoxGeometry(0.55, 0.09, 0.7), trimMat, 0, 0.86, -2.0);
  // short deck/trunk
  add(new THREE.BoxGeometry(1.78, 0.12, 0.55), paintMat, 0, 0.72, 1.95, 0.05);

  // windshield + A pillars (further back, matching the longer hood)
  add(new THREE.BoxGeometry(1.5, 0.55, 0.04), glassMat, 0, 1.24, -1.98, -0.6);
  add(new THREE.BoxGeometry(0.06, 0.65, 0.06), paintMat, -0.75, 1.10, -1.98);
  add(new THREE.BoxGeometry(0.06, 0.65, 0.06), paintMat, 0.75, 1.10, -1.98);
  add(new THREE.BoxGeometry(1.55, 0.04, 0.04), trimMat, 0, 1.5, -2.12);

  // roof — short, fastback-leaning cabin
  add(new THREE.BoxGeometry(1.64, 0.06, 1.85), paintMat, 0, 1.54, -0.9);
  add(new THREE.BoxGeometry(0.07, 0.5, 0.08), paintMat, -0.9, 1.27, -0.65);
  add(new THREE.BoxGeometry(0.07, 0.5, 0.08), paintMat, 0.9, 1.27, -0.65);
  add(new THREE.BoxGeometry(0.08, 0.6, 0.08), paintMat, -0.82, 1.14, 0.35);
  add(new THREE.BoxGeometry(0.08, 0.6, 0.08), paintMat, 0.82, 1.14, 0.35);
  add(new THREE.BoxGeometry(0.02, 0.24, 0.75), glassMat, -0.94, 0.97, -0.1);
  add(new THREE.BoxGeometry(0.02, 0.24, 0.75), glassMat, 0.94, 0.97, -0.1);
  // fastback-slanted backlight
  add(new THREE.BoxGeometry(1.46, 0.5, 0.04), glassMat, 0, 1.2, 0.42, 0.7);

  // bumpers + rocker trim
  add(new THREE.BoxGeometry(1.84, 0.18, 0.22), trimMat, 0, 0.34, -2.32);
  add(new THREE.BoxGeometry(1.84, 0.18, 0.22), trimMat, 0, 0.34, 2.32);
  add(new THREE.BoxGeometry(0.05, 0.2, 3.8), trimMat, 0.94, 0.4, 0);
  add(new THREE.BoxGeometry(0.05, 0.2, 3.8), trimMat, -0.94, 0.4, 0);
  for (const sx of [-0.6, 0.6]) {
    add(new THREE.BoxGeometry(0.26, 0.15, 0.05), headMat, sx, 0.62, -2.28);
    add(new THREE.BoxGeometry(0.28, 0.17, 0.02), trimMat, sx, 0.62, -2.3);
    const hl = new THREE.PointLight(0xfff2b0, 2.5, 7);
    hl.position.set(sx, 0.62, -2.26);
    group.add(hl);
  }
  for (const sx of [-0.6, 0.6]) {
    add(new THREE.BoxGeometry(0.36, 0.14, 0.05), tailMat, sx, 0.62, 2.31);
    const tl = new THREE.PointLight(0xff3020, 1.8, 5);
    tl.position.set(sx, 0.62, 2.3);
    group.add(tl);
  }
  addLicensePlates(group, -2.34, 2.34, 0.34);
  addGrille(group, mats, { y: 0.44, z: -2.33, width: 0.85, height: 0.2, bars: 9 });
  addExhaustTips(group, mats, { y: 0.28, z: 2.38, spread: 0.55 });

  // doors
  const doorL = new THREE.Group();
  doorL.position.set(-0.94, 0.62, -1.05);
  const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.15), paintMat);
  doorLMesh.position.set(0.03, 0, 0.55);
  doorLMesh.castShadow = true;
  doorL.add(doorLMesh);
  const doorGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.9), glassMat);
  doorGlassL.position.set(0.03, 0.17, 0.55);
  doorL.add(doorGlassL);
  const doorHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleL.position.set(0.05, -0.02, 0.9);
  doorL.add(doorHandleL);
  addDoorCard(doorL, mats, { x: 0.07, y: 0.02, z: 0.55, width: 1.0, height: 0.35 });
  group.add(doorL);

  const doorR = new THREE.Group();
  doorR.position.set(0.94, 0.62, -1.05);
  const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.15), paintMat);
  doorRMesh.position.set(-0.03, 0, 0.55);
  doorRMesh.castShadow = true;
  doorR.add(doorRMesh);
  const doorGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.9), glassMat);
  doorGlassR.position.set(-0.03, 0.17, 0.55);
  doorR.add(doorGlassR);
  const doorHandleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleR.position.set(-0.05, -0.02, 0.9);
  doorR.add(doorHandleR);
  addDoorCard(doorR, mats, { x: -0.07, y: 0.02, z: 0.55, width: 1.0, height: 0.35 });
  group.add(doorR);

  // trunk
  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, 0.78, 1.68);
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.6), paintMat);
  trunkLid.position.set(0, 0, 0.3);
  trunkLid.castShadow = true;
  trunkHinge.add(trunkLid);
  const trunkFloor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.45), interiorMat);
  trunkFloor.position.set(0, -0.06, 0.22);
  trunkHinge.add(trunkFloor);
  group.add(trunkHinge);

  // Sabre racing stripes — hood + roof + trunk decals (trunk one rides the lid when it opens)
  const stripeTex = createStripeLiveryTexture("#f2f0e8", 0.14);
  addStripeDecal(group, stripeTex, { width: 0.55, length: 1.55, y: 0.795, z: -1.9 });
  addStripeDecal(group, stripeTex, { width: 0.55, length: 1.7, y: 1.575, z: -0.9 });
  addStripeDecal(trunkHinge, stripeTex, { width: 0.55, length: 0.45, y: 0.033, z: 0.3 });

  // interior
  add(new THREE.BoxGeometry(1.5, 0.05, 2.0), interiorMat, 0, 0.62, -0.5);
  add(new THREE.BoxGeometry(1.55, 0.28, 0.25), dashMat, 0, 0.92, -1.6);
  add(new THREE.BoxGeometry(1.55, 0.05, 0.3), dashMat, 0, 1.06, -1.6, -0.18);
  add(new THREE.BoxGeometry(0.28, 0.08, 0.9), dashMat, 0, 0.72, -0.85);
  addShifterAndHandbrake(group, mats, { x: 0, y: 0.76, z: -0.7 });
  addRearviewMirror(group, mats, { y: 1.48, z: -2.05 });
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(-0.35, 1.02, -1.45);
  steeringGroup.rotation.x = 0.45;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 8), trimMat);
  column.position.set(0, -0.08, 0.08);
  column.rotation.x = 0.25;
  column.castShadow = true;
  steeringGroup.add(column);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.024, 8, 18), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.6 }));
  wheel.name = "steerWheel";
  wheel.position.set(0, 0.14, 0);
  wheel.rotation.x = Math.PI / 2;
  wheel.castShadow = true;
  steeringGroup.add(wheel);
  group.add(steeringGroup);

  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wiperL = new THREE.Group();
  wiperL.position.set(-0.28, 1.46, -2.0);
  wiperL.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.45), wiperMat));
  group.add(wiperL);
  const wiperR = new THREE.Group();
  wiperR.position.set(0.28, 1.46, -2.0);
  wiperR.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.45), wiperMat));
  group.add(wiperR);

  const seat = (sx: number, sz: number) => {
    add(new THREE.BoxGeometry(0.5, 0.14, 0.5), seatMat, sx, 0.96, sz);
    add(new THREE.BoxGeometry(0.5, 0.55, 0.12), seatMat, sx, 1.28, sz + 0.27);
    add(new THREE.BoxGeometry(0.44, 0.1, 0.1), seatMat, sx, 1.42, sz + 0.26, -0.35);
  };
  seat(-0.35, -0.95);
  seat(0.35, -0.95);
  add(new THREE.BoxGeometry(1.3, 0.14, 0.4), seatMat, 0, 0.96, 0.55);
  add(new THREE.BoxGeometry(1.3, 0.4, 0.12), seatMat, 0, 1.22, 0.8);

  // 5-spoke alloys — the muscle-car staple
  const makeWheel = makeWheelBuilder(mats, "alloy5spoke");
  const wheels = {
    FL: makeWheel(-1.0, -1.55, "wheel_FL"),
    FR: makeWheel(1.0, -1.55, "wheel_FR"),
    RL: makeWheel(-1.0, 1.6, "wheel_RL"),
    RR: makeWheel(1.0, 1.6, "wheel_RR")
  };
  group.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);

  return { root: group, wheels, steeringWheel: steeringGroup, wipers: { left: wiperL, right: wiperR } as any, trunkHinge, trunkLid, doors: { left: doorL, right: doorR }, seatY: 1.42 };
}
