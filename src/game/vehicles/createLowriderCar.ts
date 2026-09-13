/**
 * @file src/game/vehicles/createLowriderCar.ts
 * "Voodoo" — lowrider archetype: lowered body, two-tone paint (contrasting
 * roof), chrome wire wheels with knock-off spinners. Shares the hardtop
 * cabin/interior kit at a reduced ride height; front faces -Z.
 */

import * as THREE from "three";
import type { VehicleModel } from "./vehicleModel";
import { createCarMaterials } from "./carMaterials";
import { makeWheelBuilder } from "./wheelKit";
import { addLicensePlates } from "./plateTexture";
import { addGrille, addExhaustTips, addHoodOrnament } from "./exteriorDetails";
import { addRearviewMirror, addShifterAndHandbrake, addDoorCard } from "./interiorDetails";
import { softenBox } from "./carGeometry";

const RIDE_DROP = 0.14; // lowered suspension — everything but the wheel radius sits this much closer to the ground

export function createLowriderCar(): VehicleModel {
  const group = new THREE.Group();

  const mats = createCarMaterials(0x7a1fb0, 0xf2f0e8); // purple body, white roof — two-tone
  const paintMat = mats.paint, roofMat = mats.roofPaint, trimMat = mats.trim, interiorMat = mats.interior,
    dashMat = mats.dash, seatMat = mats.seat, glassMat = mats.glass, headMat = mats.head, tailMat = mats.tail;

  const y0 = (y: number) => y - RIDE_DROP;

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(softenBox(geo), mat);
    m.position.set(x, y0(y), z);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  add(new THREE.BoxGeometry(1.76, 0.4, 4.35), paintMat, 0, 0.55, 0);
  add(new THREE.BoxGeometry(0.08, 0.3, 2.7), paintMat, 0.88, 0.62, -0.3);
  add(new THREE.BoxGeometry(0.08, 0.3, 2.7), paintMat, -0.88, 0.62, -0.3);
  add(new THREE.BoxGeometry(1.74, 0.12, 1.1), paintMat, 0, 0.72, -1.5, -0.03);
  add(new THREE.BoxGeometry(1.74, 0.12, 0.9), paintMat, 0, 0.72, 1.6, 0.04);

  add(new THREE.BoxGeometry(1.46, 0.56, 0.04), glassMat, 0, 1.24, -1.76, -0.6);
  add(new THREE.BoxGeometry(0.06, 0.66, 0.06), roofMat, -0.72, 1.10, -1.76);
  add(new THREE.BoxGeometry(0.06, 0.66, 0.06), roofMat, 0.72, 1.10, -1.76);
  add(new THREE.BoxGeometry(1.5, 0.04, 0.04), trimMat, 0, 1.50, -1.90);

  // two-tone roof — the lowrider signature contrast panel
  add(new THREE.BoxGeometry(1.6, 0.06, 2.5), roofMat, 0, 1.54, -0.55);
  add(new THREE.BoxGeometry(0.07, 0.5, 0.08), roofMat, -0.87, 1.27, -0.28);
  add(new THREE.BoxGeometry(0.07, 0.5, 0.08), roofMat, 0.87, 1.27, -0.28);
  add(new THREE.BoxGeometry(0.08, 0.64, 0.08), roofMat, -0.79, 1.15, 0.78);
  add(new THREE.BoxGeometry(0.08, 0.64, 0.08), roofMat, 0.79, 1.15, 0.78);
  add(new THREE.BoxGeometry(0.02, 0.26, 0.9), glassMat, -0.91, 0.97, 0.28);
  add(new THREE.BoxGeometry(0.02, 0.26, 0.9), glassMat, 0.91, 0.97, 0.28);
  add(new THREE.BoxGeometry(1.42, 0.5, 0.04), glassMat, 0, 1.2, 0.85, 0.55);

  // bright chrome bumpers — lowriders run heavy chrome
  add(new THREE.BoxGeometry(1.8, 0.2, 0.24), trimMat, 0, 0.34, -2.12);
  add(new THREE.BoxGeometry(1.8, 0.2, 0.24), trimMat, 0, 0.34, 2.12);
  add(new THREE.BoxGeometry(0.06, 0.22, 3.6), trimMat, 0.91, 0.4, 0);
  add(new THREE.BoxGeometry(0.06, 0.22, 3.6), trimMat, -0.91, 0.4, 0);
  for (const sx of [-0.55, 0.55]) {
    add(new THREE.BoxGeometry(0.24, 0.15, 0.05), headMat, sx, 0.62, -2.08);
    add(new THREE.BoxGeometry(0.26, 0.17, 0.02), trimMat, sx, 0.62, -2.1);
    const hl = new THREE.PointLight(0xfff2b0, 2.5, 7);
    hl.position.set(sx, y0(0.62), -2.06);
    group.add(hl);
  }
  for (const sx of [-0.55, 0.55]) {
    add(new THREE.BoxGeometry(0.34, 0.14, 0.05), tailMat, sx, 0.62, 2.11);
    const tl = new THREE.PointLight(0xff3020, 1.8, 5);
    tl.position.set(sx, y0(0.62), 2.1);
    group.add(tl);
  }
  addLicensePlates(group, -2.14, 2.14, y0(0.34));
  addGrille(group, mats, { y: y0(0.44), z: -2.13, width: 0.78, height: 0.2 });
  addExhaustTips(group, mats, { y: y0(0.28), z: 2.18, spread: 0.5 });
  addHoodOrnament(group, mats, { y: y0(0.79), z: -2.0 });

  const doorL = new THREE.Group();
  doorL.position.set(-0.91, y0(0.62), -0.85);
  const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.95), paintMat);
  doorLMesh.position.set(0.03, 0, 0.48);
  doorLMesh.castShadow = true;
  doorL.add(doorLMesh);
  const doorGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.27, 0.75), glassMat);
  doorGlassL.position.set(0.03, 0.17, 0.48);
  doorL.add(doorGlassL);
  const doorHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleL.position.set(0.05, -0.02, 0.75);
  doorL.add(doorHandleL);
  addDoorCard(doorL, mats, { x: 0.07, y: 0.02, z: 0.48, width: 0.85, height: 0.33 });
  group.add(doorL);

  const doorR = new THREE.Group();
  doorR.position.set(0.91, y0(0.62), -0.85);
  const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.95), paintMat);
  doorRMesh.position.set(-0.03, 0, 0.48);
  doorRMesh.castShadow = true;
  doorR.add(doorRMesh);
  const doorGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.27, 0.75), glassMat);
  doorGlassR.position.set(-0.03, 0.17, 0.48);
  doorR.add(doorGlassR);
  const doorHandleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleR.position.set(-0.05, -0.02, 0.75);
  doorR.add(doorHandleR);
  addDoorCard(doorR, mats, { x: -0.07, y: 0.02, z: 0.48, width: 0.85, height: 0.33 });
  group.add(doorR);

  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, y0(0.78), 1.15);
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.9), paintMat);
  trunkLid.position.set(0, 0, 0.45);
  trunkLid.castShadow = true;
  trunkHinge.add(trunkLid);
  const trunkFloor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.7), interiorMat);
  trunkFloor.position.set(0, -0.06, 0.35);
  trunkHinge.add(trunkFloor);
  group.add(trunkHinge);

  add(new THREE.BoxGeometry(1.4, 0.05, 2.2), interiorMat, 0, 0.62, -0.4);
  add(new THREE.BoxGeometry(1.45, 0.28, 0.25), dashMat, 0, 0.92, -1.35);
  add(new THREE.BoxGeometry(1.45, 0.05, 0.3), dashMat, 0, 1.06, -1.35, -0.18);
  add(new THREE.BoxGeometry(0.28, 0.08, 1.0), dashMat, 0, 0.72, -0.65);
  addShifterAndHandbrake(group, mats, { x: 0, y: y0(0.76), z: -0.5 });
  addRearviewMirror(group, mats, { y: y0(1.5), z: -1.85 });
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(-0.35, y0(1.02), -1.22);
  steeringGroup.rotation.x = 0.45;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 8), trimMat);
  column.position.set(0, -0.08, 0.08);
  column.rotation.x = 0.25;
  column.castShadow = true;
  steeringGroup.add(column);
  // thin gold chain-link steering wheel — lowrider staple, chrome-gold rim
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 18), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 }));
  wheel.name = "steerWheel";
  wheel.position.set(0, 0.14, 0);
  wheel.rotation.x = Math.PI / 2;
  wheel.castShadow = true;
  steeringGroup.add(wheel);
  group.add(steeringGroup);

  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wiperL = new THREE.Group();
  wiperL.position.set(-0.28, y0(1.48), -1.78);
  wiperL.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.45), wiperMat));
  group.add(wiperL);
  const wiperR = new THREE.Group();
  wiperR.position.set(0.28, y0(1.48), -1.78);
  wiperR.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.45), wiperMat));
  group.add(wiperR);

  const seat = (sx: number, sz: number) => {
    add(new THREE.BoxGeometry(0.5, 0.14, 0.5), seatMat, sx, 0.96, sz);
    add(new THREE.BoxGeometry(0.5, 0.55, 0.12), seatMat, sx, 1.28, sz + 0.27);
    add(new THREE.BoxGeometry(0.44, 0.1, 0.1), seatMat, sx, 1.42, sz + 0.26, -0.35);
  };
  seat(-0.35, -0.75);
  seat(0.35, -0.75);
  add(new THREE.BoxGeometry(1.3, 0.14, 0.45), seatMat, 0, 0.96, 0.75);
  add(new THREE.BoxGeometry(1.3, 0.4, 0.12), seatMat, 0, 1.22, 1.02);

  // chrome wire wheels + knock-off spinners — the lowrider signature
  const makeWheel = makeWheelBuilder(mats, "wireSpoke", 0.34);
  const wheels = {
    FL: makeWheel(-0.96, -1.4, "wheel_FL"),
    FR: makeWheel(0.96, -1.4, "wheel_FR"),
    RL: makeWheel(-0.96, 1.4, "wheel_RL"),
    RR: makeWheel(0.96, 1.4, "wheel_RR")
  };
  // wheels stay grounded at their own radius — only the body drops (RIDE_DROP), not the tires
  group.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);

  return { root: group, wheels, steeringWheel: steeringGroup, wipers: { left: wiperL, right: wiperR } as any, trunkHinge, trunkLid, doors: { left: doorL, right: doorR }, seatY: 1.52 - RIDE_DROP };
}
