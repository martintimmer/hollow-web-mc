/**
 * @file src/game/vehicles/fbxVehicle.ts
 * FBX import scaffolding (V1): parse an FBX (binary or ASCII) into a VehicleModel
 * so imported cars drive with the exact same entity/physics as the mockup.
 *  - normalizeModelToVehicle: AABB scale to target length, recenter, ground at 0,
 *    optional 180° flip (FBX rigs usually face +Z; the engine drives -Z).
 *  - detectVehicleWheels: finds 4 wheel nodes (name contains wheel/tire/tyre),
 *    maps them FL/FR/RL/RR by world position, wraps them in YXZ groups so the
 *    entity can spin/steer them.
 */

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { VehicleArticulations, VehicleModel, VehiclePanel, VehicleWheels } from "./vehicleModel";

/** Scale a model so its longest horizontal axis ≈ targetLength, recentered & grounded. */
export function normalizeModelToVehicle(root: THREE.Object3D, targetLength = 4.2): THREE.Box3 {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.z, 0.001);
  const s = targetLength / longest;
  root.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(root);
  const c = b2.getCenter(new THREE.Vector3());
  root.position.x -= c.x;
  root.position.z -= c.z;
  root.position.y -= b2.min.y;
  return b2;
}

/** Optional 180° yaw flip — most DCC car rigs face +Z; the engine drives -Z. */
export function flipModelForward(root: THREE.Object3D) {
  root.rotation.y += Math.PI;
}

const WHEEL_NAME_RE = /(wheel|tire|tyre)/i;

function namedNode(root: THREE.Object3D, pattern: RegExp): THREE.Object3D | undefined {
  let found: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (!found && pattern.test(o.name || "")) found = o;
  });
  return found;
}

function panel(node: THREE.Object3D | undefined, axis: "x" | "y", angle: number): VehiclePanel | undefined {
  if (!node) return undefined;
  const closedRotation = node.rotation.clone();
  const openRotation = closedRotation.clone();
  if (axis === "x") openRotation.x += angle;
  else openRotation.y += angle;
  return { node, closedRotation, openRotation };
}

export function detectVehicleArticulations(root: THREE.Object3D): VehicleArticulations | undefined {
  const leftDoor = namedNode(root, /(^|[_ .-])(door[_ .-]?(fl|frontleft|left|driver)|front[_ .-]?left[_ .-]?door)([_ .-]|$)/i);
  const rightDoor = namedNode(root, /(^|[_ .-])(door[_ .-]?(fr|frontright|right|passenger)|front[_ .-]?right[_ .-]?door)([_ .-]|$)/i);
  const trunk = namedNode(root, /(^|[_ .-])(trunk|trunklid|boot)([_ .-]|$)/i);
  const hood = namedNode(root, /(^|[_ .-])hood([_ .-]|$)/i);
  const hatch = namedNode(root, /(^|[_ .-])(hatch|liftgate|tailgate)([_ .-]|$)/i);
  const articulations: VehicleArticulations = {
    doors: {
      left: panel(leftDoor, "y", 1.134),
      right: panel(rightDoor, "y", -1.134)
    },
    trunk: panel(trunk, "x", -0.785),
    hood: panel(hood, "x", 0.785),
    hatch: panel(hatch, "x", -1.05)
  };
  if (!articulations.doors?.left && !articulations.doors?.right && !articulations.trunk && !articulations.hood && !articulations.hatch) return undefined;
  return articulations;
}

/** Finds wheel nodes by name and maps them FL/FR/RL/RR by world position. */
export function detectVehicleWheels(root: THREE.Object3D): VehicleWheels | null {
  const found: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (WHEEL_NAME_RE.test(o.name || "")) found.push(o);
  });
  if (found.length < 4) return null;

  const withPos = found.map((o) => {
    const p = new THREE.Vector3();
    o.getWorldPosition(p);
    return { o, p };
  });
  // forward = -Z: smallest z pair = front; L = smaller x
  withPos.sort((a, b) => a.p.z - b.p.z);
  const front = [withPos[0], withPos[1]].sort((a, b) => a.p.x - b.p.x);
  const rear = [withPos[withPos.length - 2], withPos[withPos.length - 1]].sort((a, b) => a.p.x - b.p.x);

  const wrap = (o: THREE.Object3D): THREE.Group => {
    const g = new THREE.Group();
    g.rotation.order = "YXZ";
    const wp = new THREE.Vector3();
    o.getWorldPosition(wp);
    g.position.copy(wp);
    if (o.parent) o.parent.remove(o);
    g.add(o);
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    return g;
  };

  return { FL: wrap(front[0].o), FR: wrap(front[1].o), RL: wrap(rear[0].o), RR: wrap(rear[1].o) };
}

function emptyWheelFallback(): VehicleWheels {
  const mk = () => {
    const g = new THREE.Group();
    g.rotation.order = "YXZ";
    return g;
  };
  return { FL: mk(), FR: mk(), RL: mk(), RR: mk() };
}

/**
 * Parses an FBX buffer into a drivable VehicleModel (V1).
 * @param buffer   FBX bytes (binary ≥6400 or ASCII ≥7.0)
 * @param flipZ    rotate 180° so the model faces -Z (default: true)
 */
export function createFbxVehicleModel(buffer: ArrayBuffer, flipZ = true): VehicleModel {
  const loader = new FBXLoader();
  const root = loader.parse(buffer, "") as THREE.Group;
  const box = normalizeModelToVehicle(root);
  if (flipZ) flipModelForward(root);

  const wheels = detectVehicleWheels(root) || emptyWheelFallback();
  root.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);
  const articulations = detectVehicleArticulations(root);

  const size = box.getSize(new THREE.Vector3());
  const seatY = Math.min(Math.max(size.y * 0.55, 0.9), 1.5);

  return { root, wheels, seatY, articulations };
}

/**
 * Auto-detects FBX vs GLTF/GLB by filename and parses into a VehicleModel.
 * Supports .fbx (binary/ASCII) and .glb/.gltf. Falls back to FBX parse for unknown.
 */
export async function createVehicleModelFromBuffer(buffer: ArrayBuffer, filename = "model.fbx"): Promise<VehicleModel> {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "glb" || ext === "gltf") {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    const gltf: any = await new Promise((res, rej) => loader.parse(buffer, "", res as any, rej as any));
    const root = (gltf.scene as THREE.Group) || new THREE.Group();
    const box = normalizeModelToVehicle(root);
    const wheels = detectVehicleWheels(root) || emptyWheelFallback();
    root.add(wheels.FL, wheels.FR, wheels.RL, wheels.RR);
    const articulations = detectVehicleArticulations(root);
    const size = box.getSize(new THREE.Vector3());
    return { root, wheels, seatY: Math.min(Math.max(size.y * 0.55, 0.9), 1.5), articulations };
  }
  return createFbxVehicleModel(buffer, true);
}
