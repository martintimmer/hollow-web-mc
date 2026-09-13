import * as THREE from "three";

export interface BoatEntity {
  id: string;
  itemId: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  roll: number;
  isRidden: boolean;
  rowTime: number;
  root: THREE.Group;
  leftOar: THREE.Mesh;
  rightOar: THREE.Mesh;
}

const BOAT_DRIVE_SPEED = 7.5;
const BOAT_TURN_RATE = 2.4;

export function isBoatItem(id: number, getDef?: (id: number) => { name?: string; itemTexture?: string } | undefined): boolean {
  if (!id || id <= 0) return false;
  if (typeof getDef === "function") {
    const b = getDef(id);
    return !!b && /boat$/i.test(b.name || "") && !/chest/i.test(b.name || "") && !!(b as { itemTexture?: string }).itemTexture;
  }
  return [1163, 719, 873, 959, 999, 1041, 1123].includes(id);
}

export function createBoatMesh(): {
  root: THREE.Group;
  leftOar: THREE.Mesh;
  rightOar: THREE.Mesh;
} {
  const root = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6337 }); // Oak Wood Planks
  const oarMat = new THREE.MeshLambertMaterial({ color: 0x583c1e });  // Darker Oak Oars

  // 1. Boat Floor (1.4m x 0.1m x 0.85m)
  const floorGeom = new THREE.BoxGeometry(0.85, 0.1, 1.4);
  const floorMesh = new THREE.Mesh(floorGeom, woodMat);
  floorMesh.position.set(0, 0.05, 0);
  floorMesh.castShadow = true;
  root.add(floorMesh);

  // 2. Left and Right Walls
  const wallLongGeom = new THREE.BoxGeometry(0.1, 0.45, 1.4);
  const leftWall = new THREE.Mesh(wallLongGeom, woodMat);
  leftWall.position.set(-0.425, 0.28, 0);
  leftWall.castShadow = true;
  const rightWall = new THREE.Mesh(wallLongGeom, woodMat);
  rightWall.position.set(0.425, 0.28, 0);
  rightWall.castShadow = true;
  root.add(leftWall, rightWall);

  // 3. Front and Back Walls
  const wallShortGeom = new THREE.BoxGeometry(0.85, 0.45, 0.1);
  const frontWall = new THREE.Mesh(wallShortGeom, woodMat);
  frontWall.position.set(0, 0.28, 0.7);
  frontWall.castShadow = true;
  const backWall = new THREE.Mesh(wallShortGeom, woodMat);
  backWall.position.set(0, 0.28, -0.7);
  backWall.castShadow = true;
  root.add(frontWall, backWall);

  // 4. Left and Right Animated Oars
  const oarGeom = new THREE.BoxGeometry(0.08, 0.08, 0.95);
  oarGeom.translate(0, 0, 0.4);

  const leftOar = new THREE.Mesh(oarGeom, oarMat);
  leftOar.position.set(-0.46, 0.42, 0);
  leftOar.rotation.y = 0.3;
  leftOar.castShadow = true;

  const rightOar = new THREE.Mesh(oarGeom, oarMat);
  rightOar.position.set(0.46, 0.42, 0);
  rightOar.rotation.y = -0.3;
  rightOar.castShadow = true;

  root.add(leftOar, rightOar);
  return { root, leftOar, rightOar };
}

export function updateBoatKinematics(
  boat: BoatEntity,
  dt: number,
  waterLevel = 62,
  drag = 0.96
) {
  // 1. Buoyancy & Wave Bobbing (waterLevel doubles as ground-rest height on land)
  const targetY = waterLevel - 0.2 + Math.sin(boat.rowTime * 2.2) * 0.03;
  boat.y += (targetY - boat.y) * Math.min(1, dt * 6.0);

  // 2. Rowing Animation
  if (boat.isRidden && (Math.abs(boat.vx) > 0.1 || Math.abs(boat.vz) > 0.1)) {
    boat.rowTime += dt * 6.0;
    const oarSwing = Math.sin(boat.rowTime) * 0.45;
    boat.leftOar.rotation.y = 0.3 + oarSwing;
    boat.rightOar.rotation.y = -0.3 - oarSwing;
  } else {
    boat.leftOar.rotation.y = 0.3;
    boat.rightOar.rotation.y = -0.3;
  }

  // 3. Position & Rotation Integration
  boat.x += boat.vx * dt;
  boat.z += boat.vz * dt;
  boat.vx *= drag;
  boat.vz *= drag;

  boat.root.position.set(boat.x, boat.y, boat.z);
  boat.root.rotation.y = boat.yaw;
}

export interface BoatDriveInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export function driveBoat(boat: BoatEntity, dt: number, input: BoatDriveInput): void {
  if (input.left) boat.yaw += BOAT_TURN_RATE * dt;
  if (input.right) boat.yaw -= BOAT_TURN_RATE * dt;
  const thrust = (input.forward ? BOAT_DRIVE_SPEED : 0) + (input.back ? -BOAT_DRIVE_SPEED * 0.35 : 0);
  if (thrust !== 0) {
    boat.vx += Math.sin(boat.yaw) * thrust * dt;
    boat.vz += Math.cos(boat.yaw) * thrust * dt;
    const spd = Math.hypot(boat.vx, boat.vz);
    const max = BOAT_DRIVE_SPEED * 1.15;
    if (spd > max) {
      boat.vx = (boat.vx / spd) * max;
      boat.vz = (boat.vz / spd) * max;
    }
  }
}
