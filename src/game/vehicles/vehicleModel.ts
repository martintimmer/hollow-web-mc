/**
 * @file src/game/vehicles/vehicleModel.ts
 * VehicleModel abstraction: a swap-in 3D model (mockup mesh today, imported FBX
 * next) with named wheel groups and a driver eye height. The entity drives any
 * model that satisfies this contract.
 */

import * as THREE from "three";

export interface VehicleWheels {
  FL: THREE.Group;
  FR: THREE.Group;
  RL: THREE.Group;
  RR: THREE.Group;
}

export interface VehiclePanel {
  node: THREE.Object3D;
  closedRotation: THREE.Euler;
  openRotation: THREE.Euler;
}

export interface VehicleArticulations {
  doors?: { left?: VehiclePanel; right?: VehiclePanel };
  trunk?: VehiclePanel;
  hood?: VehiclePanel;
  hatch?: VehiclePanel;
}

export interface VehicleModel {
  root: THREE.Group;
  wheels: VehicleWheels;
  /** driver eye height above the ground (m) — higher for cabrio (no roof) */
  seatY: number;
  steeringWheel?: THREE.Group;
  wipers?: { left: THREE.Group; right: THREE.Group };
  trunkLid?: THREE.Object3D;
  trunkHinge?: THREE.Group;
  hoodHinge?: THREE.Group;
  doors?: { left: THREE.Group; right: THREE.Group };
  articulations?: VehicleArticulations;
}
