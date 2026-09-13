/**
 * @file src/game/vehicles/createHardtopCar.ts
 * Closed hardtop variant of the mockup sedan — same chassis/interior/wheel kit
 * as createMockupCar.ts, plus a roof panel, B/C pillars, and a rear backlight
 * (SA-style boxy 2-box silhouette instead of the open cabrio). Front faces -Z.
 */

import * as THREE from "three";
import type { VehicleModel } from "./vehicleModel";
import { createCarMaterials } from "./carMaterials";
import { makeWheelBuilder } from "./wheelKit";
import { addLicensePlates } from "./plateTexture";
import { addGrille, addExhaustTips } from "./exteriorDetails";
import { addRearviewMirror, addShifterAndHandbrake, addDoorCard } from "./interiorDetails";
import { softenBox } from "./carGeometry";

export function createHardtopCar(): VehicleModel {
  const group = new THREE.Group();

  const mats = createCarMaterials(0xb3141f);
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

  // chassis (front = -Z)
  add(new THREE.BoxGeometry(1.72, 0.42, 4.3), paintMat, 0, 0.55, 0);
  // raised side sills / door base
  add(new THREE.BoxGeometry(0.08, 0.32, 2.7), paintMat, 0.86, 0.62, -0.3);
  add(new THREE.BoxGeometry(0.08, 0.32, 2.7), paintMat, -0.86, 0.62, -0.3);
  // hood (front, slight slope down to the nose)
  const hoodHinge = new THREE.Group();
  hoodHinge.position.set(0, 0.72, -0.95);
  const hoodPanel = new THREE.Mesh(softenBox(new THREE.BoxGeometry(1.7, 0.12, 1.1)), paintMat);
  hoodPanel.position.set(0, 0, -0.55);
  hoodPanel.rotation.x = -0.05;
  hoodPanel.castShadow = true;
  hoodPanel.receiveShadow = true;
  hoodHinge.add(hoodPanel);
  group.add(hoodHinge);
  // trunk base (rear)
  add(new THREE.BoxGeometry(1.7, 0.12, 0.9), paintMat, 0, 0.72, 1.6, 0.05);

  // windshield — transparent glass with A pillars
  add(new THREE.BoxGeometry(1.44, 0.58, 0.04), glassMat, 0, 1.25, -1.75, -0.62);
  add(new THREE.BoxGeometry(0.06, 0.68, 0.06), paintMat, -0.71, 1.11, -1.75);
  add(new THREE.BoxGeometry(0.06, 0.68, 0.06), paintMat, 0.71, 1.11, -1.75);
  // top cowl trim
  add(new THREE.BoxGeometry(1.5, 0.04, 0.04), trimMat, 0, 1.52, -1.90);

  // ── roof — closed hardtop silhouette (2-box SA profile) ─────────────────
  add(new THREE.BoxGeometry(1.58, 0.06, 2.5), paintMat, 0, 1.56, -0.55);
  // B pillars (between front door and rear quarter window)
  add(new THREE.BoxGeometry(0.07, 0.52, 0.08), paintMat, -0.86, 1.28, -0.28);
  add(new THREE.BoxGeometry(0.07, 0.52, 0.08), paintMat, 0.86, 1.28, -0.28);
  // C pillars (roof to rear deck)
  add(new THREE.BoxGeometry(0.08, 0.66, 0.08), paintMat, -0.78, 1.16, 0.78);
  add(new THREE.BoxGeometry(0.08, 0.66, 0.08), paintMat, 0.78, 1.16, 0.78);
  // rear quarter windows (B to C pillar)
  add(new THREE.BoxGeometry(0.02, 0.26, 0.9), glassMat, -0.90, 0.98, 0.28);
  add(new THREE.BoxGeometry(0.02, 0.26, 0.9), glassMat, 0.90, 0.98, 0.28);
  // rear backlight — slopes down-and-back from roof to trunk
  add(new THREE.BoxGeometry(1.4, 0.52, 0.04), glassMat, 0, 1.22, 0.85, 0.55);

  // bumpers + side skirts
  add(new THREE.BoxGeometry(1.76, 0.18, 0.22), trimMat, 0, 0.34, -2.12);
  add(new THREE.BoxGeometry(1.76, 0.18, 0.22), trimMat, 0, 0.34, 2.12);
  add(new THREE.BoxGeometry(0.05, 0.2, 3.6), trimMat, 0.9, 0.4, 0);
  add(new THREE.BoxGeometry(0.05, 0.2, 3.6), trimMat, -0.9, 0.4, 0);
  // headlights — flush rectangular lens units + point lights
  for (const sx of [-0.55, 0.55]) {
    add(new THREE.BoxGeometry(0.24, 0.15, 0.05), headMat, sx, 0.62, -2.08);
    add(new THREE.BoxGeometry(0.26, 0.17, 0.02), trimMat, sx, 0.62, -2.1); // chrome lens surround
    const hl = new THREE.PointLight(0xfff2b0, 2.5, 7);
    hl.position.set(sx, 0.62, -2.06);
    group.add(hl);
  }
  for (const sx of [-0.55, 0.55]) {
    add(new THREE.BoxGeometry(0.34, 0.14, 0.05), tailMat, sx, 0.62, 2.11);
    const tl = new THREE.PointLight(0xff3020, 1.8, 5);
    tl.position.set(sx, 0.62, 2.1);
    group.add(tl);
  }
  addLicensePlates(group, -2.14, 2.14, 0.34);
  addGrille(group, mats, { y: 0.44, z: -2.13, width: 0.75, height: 0.2 });
  addExhaustTips(group, mats, { y: 0.28, z: 2.18, spread: 0.5 });

  // ── doors — hinged at front edge (65 deg open) ──────────────────────────
  const doorL = new THREE.Group();
  doorL.position.set(-0.90, 0.62, -0.85);
  const doorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.95), paintMat);
  doorLMesh.position.set(0.03, 0, 0.48);
  doorLMesh.castShadow = true;
  doorL.add(doorLMesh);
  const doorGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.75), glassMat);
  doorGlassL.position.set(0.03, 0.18, 0.48);
  doorL.add(doorGlassL);
  const doorHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleL.position.set(0.05, -0.02, 0.75);
  doorL.add(doorHandleL);
  addDoorCard(doorL, mats, { x: 0.07, y: 0.02, z: 0.48, width: 0.85, height: 0.35 });
  group.add(doorL);

  const doorR = new THREE.Group();
  doorR.position.set(0.90, 0.62, -0.85);
  const doorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.95), paintMat);
  doorRMesh.position.set(-0.03, 0, 0.48);
  doorRMesh.castShadow = true;
  doorR.add(doorRMesh);
  const doorGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.75), glassMat);
  doorGlassR.position.set(-0.03, 0.18, 0.48);
  doorR.add(doorGlassR);
  const doorHandleR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), trimMat);
  doorHandleR.position.set(-0.05, -0.02, 0.75);
  doorR.add(doorHandleR);
  addDoorCard(doorR, mats, { x: -0.07, y: 0.02, z: 0.48, width: 0.85, height: 0.35 });
  group.add(doorR);

  // ── trunk (hinged at front edge, opens 45 deg upward) ──────────────────────
  const trunkHinge = new THREE.Group();
  trunkHinge.position.set(0, 0.78, 1.15);
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.9), paintMat);
  trunkLid.position.set(0, 0, 0.45);
  trunkLid.castShadow = true;
  trunkHinge.add(trunkLid);
  const trunkFloor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.7), interiorMat);
  trunkFloor.position.set(0, -0.06, 0.35);
  trunkHinge.add(trunkFloor);
  group.add(trunkHinge);

  // ── interior (glimpsed through the glass — closed car) ──────────────────
  add(new THREE.BoxGeometry(1.4, 0.05, 2.2), interiorMat, 0, 0.62, -0.4); // floor
  add(new THREE.BoxGeometry(1.45, 0.28, 0.25), dashMat, 0, 0.92, -1.35);
  add(new THREE.BoxGeometry(1.45, 0.05, 0.3), dashMat, 0, 1.06, -1.35, -0.18);
  add(new THREE.BoxGeometry(0.3, 0.12, 0.06), interiorMat, -0.35, 1.0, -1.5);
  add(new THREE.BoxGeometry(0.28, 0.08, 1.0), dashMat, 0, 0.72, -0.65);
  addShifterAndHandbrake(group, mats, { x: 0, y: 0.76, z: -0.5 });
  addRearviewMirror(group, mats, { y: 1.5, z: -1.85 });
  // steering wheel — grouped so it rotates around the column axis
  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(-0.35, 1.02, -1.22);
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

  // windshield wipers
  const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wiperL = new THREE.Group();
  wiperL.position.set(-0.28, 1.48, -1.78);
  const wiperBladeL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.45), wiperMat);
  wiperBladeL.position.set(0, 0, 0.22);
  wiperL.add(wiperBladeL);
  group.add(wiperL);
  const wiperR = new THREE.Group();
  wiperR.position.set(0.28, 1.48, -1.78);
  const wiperBladeR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.45), wiperMat);
  wiperBladeR.position.set(0, 0, 0.22);
  wiperR.add(wiperBladeR);
  group.add(wiperR);

  // seats: driver + passenger (facing -Z) + rear bench
  const seat = (sx: number, sz: number) => {
    add(new THREE.BoxGeometry(0.5, 0.14, 0.5), seatMat, sx, 0.96, sz);
    add(new THREE.BoxGeometry(0.5, 0.55, 0.12), seatMat, sx, 1.28, sz + 0.27);
    add(new THREE.BoxGeometry(0.44, 0.1, 0.1), seatMat, sx, 1.42, sz + 0.26, -0.35);
  };
  seat(-0.35, -0.75);
  seat(0.35, -0.75);
  add(new THREE.BoxGeometry(1.3, 0.14, 0.45), seatMat, 0, 0.96, 0.75);
  add(new THREE.BoxGeometry(1.3, 0.4, 0.12), seatMat, 0, 1.22, 1.02);

  // ── wheels — classic chrome dish ──────────────────────────────────────────
  const makeWheel = makeWheelBuilder(mats, "chromeDish");
  const wheels = {
    FL: makeWheel(-0.96, -1.4, "wheel_FL"),
    FR: makeWheel(0.96, -1.4, "wheel_FR"),
    RL: makeWheel(-0.96, 1.4, "wheel_RL"),
    RR: makeWheel(0.96, 1.4, "wheel_RR")
  };
  group.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);

  // seatY sits a bit lower than the cabrio's — head clears the 1.56m roofline
  return { root: group, wheels, steeringWheel: steeringGroup, wipers: { left: wiperL, right: wiperR } as any, trunkHinge, trunkLid, hoodHinge, doors: { left: doorL, right: doorR }, seatY: 1.45 };
}
