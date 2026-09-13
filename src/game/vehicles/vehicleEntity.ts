/**
 * @file src/game/vehicles/vehicleEntity.ts
 * VehicleEntity: a swap-in VehicleModel (mockup mesh today, imported FBX next)
 * + pure physics state. update(dt, input, world) steps physics and syncs the
 * mesh (position/yaw, wheel spin + front-wheel steer, body pitch/roll).
 */

import * as THREE from "three";
import {
  stepVehiclePhysics,
  createVehiclePhysicsState,
  type VehicleInput,
  type VehiclePhysicsState,
  type VehicleWorld
} from "./vehiclePhysics";
import { vehicleStyle } from "./vehicleDefs";
import { createMockupCar } from "./createMockupCar";
import type { VehicleArticulations, VehicleModel, VehiclePanel } from "./vehicleModel";

export interface VehicleEntity {
  id: string;
  style: string;
  root: THREE.Group;
  wheels: VehicleModel["wheels"];
  seatY: number;
  steeringWheel?: THREE.Group;
  steeringWheelMesh?: THREE.Mesh;
  trunkHinge?: THREE.Group;
  doors?: { left: THREE.Group; right: THREE.Group };
  wipers?: { left: THREE.Group; right: THREE.Group };
  articulations: VehicleArticulations;
  seats: { x: number; z: number; name: string }[];
  seatIndex: number;
  trunkOpen: boolean;
  doorsOpenLeft: boolean;
  doorsOpenRight: boolean;
  hoodOpen: boolean;
  hatchOpen: boolean;
  state: VehiclePhysicsState;
  tunables: ReturnType<typeof vehicleStyle>["tunables"];
  occupied: boolean;
  moveSeat: (dir: "up" | "down" | "left" | "right") => boolean;
  getSeatOffset: () => { x: number; z: number };
  toggleTrunk: () => void;
  toggleDoor: (side?: "left" | "right" | "both") => void;
  togglePanel: (kind: "trunk" | "hood" | "hatch") => void;
  getTrunkWorldPos: () => THREE.Vector3;
  getDoorWorldPos: (side: "left" | "right") => THREE.Vector3;
  update: (dt: number, input: VehicleInput, world: VehicleWorld) => void;
}

export function createVehicleEntity(styleId: string, x: number, y: number, z: number, yaw = 0, model?: VehicleModel): VehicleEntity {
  const style = vehicleStyle(styleId);
  const m: VehicleModel = model || (style.model ? style.model() : createMockupCar());
  const root = m.root;
  root.rotation.order = "YXZ";

  const state = createVehiclePhysicsState(x, y, z, yaw);

  const makePanel = (node: THREE.Object3D | undefined, axis: "x" | "y", angle: number): VehiclePanel | undefined => {
    if (!node) return undefined;
    const closedRotation = node.rotation.clone();
    const openRotation = closedRotation.clone();
    if (axis === "x") openRotation.x += angle;
    else openRotation.y += angle;
    return { node, closedRotation, openRotation };
  };
  const articulations: VehicleArticulations = m.articulations || {
    doors: {
      left: makePanel(m.doors?.left, "y", 1.134),
      right: makePanel(m.doors?.right, "y", -1.134)
    },
    trunk: makePanel(m.trunkHinge, "x", -0.785),
    hood: makePanel(m.hoodHinge, "x", 0.785)
  };
  const animatePanel = (part: VehiclePanel | undefined, open: boolean, dt: number) => {
    if (!part) return;
    const target = open ? part.openRotation : part.closedRotation;
    const rate = Math.min(1, dt * 7);
    part.node.rotation.x += (target.x - part.node.rotation.x) * rate;
    part.node.rotation.y += (target.y - part.node.rotation.y) * rate;
    part.node.rotation.z += (target.z - part.node.rotation.z) * rate;
  };

  const seats = [
    { x: -0.35, z: -0.55, name: "Driver" },
    { x: 0.35, z: -0.55, name: "Passenger" },
    { x: -0.35, z: 0.75, name: "Rear Left" },
    { x: 0.35, z: 0.75, name: "Rear Right" },
  ];

  // find steering wheel torus inside the steering group (second child)
  const steerWheelMesh = (m as any).steeringWheel?.children?.find((c: any) => c.geometry && c.geometry.type === "TorusGeometry") as THREE.Mesh | undefined;
  let wiperTime = 0;
  let hydraulicsTime = 0;

  const entity: VehicleEntity = {
    id: `veh_${Math.random().toString(36).slice(2, 9)}`,
    style: style.id,
    root,
    wheels: m.wheels,
    seatY: m.seatY,
    seats,
    seatIndex: 0,
    trunkOpen: false,
    doorsOpenLeft: false,
    doorsOpenRight: false,
    hoodOpen: false,
    hatchOpen: false,
    articulations,
    steeringWheel: (m as any).steeringWheel as THREE.Group | undefined,
    steeringWheelMesh: steerWheelMesh as any,
    trunkHinge: (m as any).trunkHinge as THREE.Group | undefined,
    doors: (m as any).doors as { left: THREE.Group; right: THREE.Group } | undefined,
    wipers: (m as any).wipers as { left: THREE.Group; right: THREE.Group } | undefined,
    state,
    tunables: style.tunables,
    occupied: false,
    moveSeat: (dir: "up" | "down" | "left" | "right") => {
      const cols = 2;
      const row = Math.floor(entity.seatIndex / cols);
      const col = entity.seatIndex % cols;
      let nr = row, nc = col;
      if (dir === "up") nr = Math.max(0, row - 1);
      if (dir === "down") nr = Math.min(1, row + 1);
      if (dir === "left") nc = Math.max(0, col - 1);
      if (dir === "right") nc = Math.min(1, col + 1);
      const ni = nr * cols + nc;
      if (ni !== entity.seatIndex) { entity.seatIndex = ni; return true; }
      return false;
    },
    getSeatOffset: () => seats[entity.seatIndex],
    toggleTrunk: () => { entity.trunkOpen = !entity.trunkOpen; },
    toggleDoor: (side: "left" | "right" | "both" = "both") => {
      if (side === "left" || side === "both") entity.doorsOpenLeft = !entity.doorsOpenLeft;
      if (side === "right" || side === "both") entity.doorsOpenRight = !entity.doorsOpenRight;
    },
    togglePanel: (kind: "trunk" | "hood" | "hatch") => {
      if (kind === "trunk") entity.trunkOpen = !entity.trunkOpen;
      if (kind === "hood") entity.hoodOpen = !entity.hoodOpen;
      if (kind === "hatch") entity.hatchOpen = !entity.hatchOpen;
    },
    getTrunkWorldPos: () => {
      const local = new THREE.Vector3(0, 0.78, 1.6);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      return new THREE.Vector3(state.x + local.x, state.y + local.y, state.z + local.z);
    },
    getDoorWorldPos: (side: "left" | "right") => {
      const sx = side === "left" ? -0.9 : 0.9;
      const local = new THREE.Vector3(sx, 0.62, -0.3);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
      return new THREE.Vector3(state.x + local.x, state.y + local.y, state.z + local.z);
    },
    update: (dt, input, world) => {
      stepVehiclePhysics(state, input, dt, entity.tunables, world);

      root.position.set(state.x, state.y, state.z);
      root.rotation.y = state.yaw;
      root.rotation.x = state.pitch;
      root.rotation.z = state.roll;

      // lowrider hydraulics — hold the handbrake to hop while parked (SA signature)
      if (entity.style === "lowrider") {
        hydraulicsTime += dt;
        if (input.handbrake && Math.abs(state.speed) < 1) {
          const bounce = Math.abs(Math.sin(hydraulicsTime * 9)) * 0.22;
          root.position.y += bounce;
          root.rotation.z += Math.sin(hydraulicsTime * 9) * 0.05;
        }
      }

      // wheels: spin about X (roll), front wheels steer about Y
      for (const w of [entity.wheels.FL, entity.wheels.FR, entity.wheels.RL, entity.wheels.RR]) {
        w.rotation.x = state.wheelSpin;
      }
      entity.wheels.FL.rotation.y = state.steerAngle;
      entity.wheels.FR.rotation.y = state.steerAngle;
      if (entity.steeringWheelMesh) {
        // spin around pole axis (wheel hole) — GTA style, pole is center
        (entity as any).steeringWheelMesh.rotation.y = state.steerAngle * 3.0;
      } else if (entity.steeringWheel) {
        entity.steeringWheel.rotation.y = state.steerAngle * 2.2;
      }
      // wipers — oscillate when moving or when trunk open (visual)
      wiperTime += dt * (Math.abs(state.speed) > 0.5 || entity.trunkOpen ? 3.2 : 0);
      if (entity.wipers) {
        const ang = Math.sin(wiperTime * 4.2) * 0.75;
        entity.wipers.left.rotation.z = ang;
        entity.wipers.right.rotation.z = ang - 0.15;
      }
      animatePanel(entity.articulations.trunk, entity.trunkOpen, dt);
      animatePanel(entity.articulations.hood, entity.hoodOpen, dt);
      animatePanel(entity.articulations.hatch, entity.hatchOpen, dt);
      animatePanel(entity.articulations.doors?.left, entity.doorsOpenLeft, dt);
      animatePanel(entity.articulations.doors?.right, entity.doorsOpenRight, dt);
    }
  };

  return entity;
}
