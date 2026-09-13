import * as THREE from "three";

export interface SquidEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  roll: number;
  inWater: boolean;
  suffocateTimer: number;
  health: number;
  maxHealth: number;
  animTime: number;
  tentacleAngle: number;
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  tentacles: THREE.Group[];
}

// =========================================================================
// 1. SQUID MODEL GENERATOR (Exact Minecraft Box Specification)
// =========================================================================
export function createSquidMesh(): {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  tentacles: THREE.Group[];
} {
  const root = new THREE.Group();

  const squidBodyMat = new THREE.MeshLambertMaterial({ color: 0x1c3b5e }); // Deep oceanic indigo
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xd9826a });      // Pinkish/orange beak
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });        // White eye base
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f2238 });      // Dark pupil

  // 1. Mantle Body (12 x 12 x 12 px = 0.75m x 0.75m x 0.75m)
  const bodyGeom = new THREE.BoxGeometry(0.75, 0.75, 0.75);
  const bodyMesh = new THREE.Mesh(bodyGeom, squidBodyMat);
  bodyMesh.position.set(0, 0.6, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Beak Ring Mouth on Underside
  const beakGeom = new THREE.BoxGeometry(0.24, 0.08, 0.24);
  const beakMesh = new THREE.Mesh(beakGeom, beakMat);
  beakMesh.position.set(0, 0.20, 0);
  root.add(beakMesh);

  // 2 Side Eyes
  for (const side of [-1, 1]) {
    const eyeBase = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), eyeMat);
    eyeBase.position.set(side * 0.24, 0.48, 0.38);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), pupilMat);
    pupil.position.set(side * 0.24, 0.48, 0.385);
    root.add(eyeBase, pupil);
  }

  // 2. 8 Articulated Radial Tentacles (2 x 18 x 2 px = 0.125m x 1.125m x 0.125m)
  const tentacleGeom = new THREE.BoxGeometry(0.125, 1.125, 0.125);
  // Shift pivot to top of tentacle
  tentacleGeom.translate(0, -0.5625, 0);

  const tentacles: THREE.Group[] = [];
  const radius = 0.28;

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const pivotGroup = new THREE.Group();
    pivotGroup.position.set(Math.sin(angle) * radius, 0.22, Math.cos(angle) * radius);
    pivotGroup.rotation.y = angle; // Face outward

    const tentacleMesh = new THREE.Mesh(tentacleGeom, squidBodyMat);
    tentacleMesh.castShadow = true;
    pivotGroup.add(tentacleMesh);

    root.add(pivotGroup);
    tentacles.push(pivotGroup);
  }

  return { root, bodyMesh, tentacles };
}

// =========================================================================
// 2. SQUID UNDERWATER KINEMATICS & PROPULSION CONTROLLER
// =========================================================================
export function updateSquidKinematics(
  squid: SquidEntity,
  dt: number,
  getBlock: (x: number, y: number, z: number) => number
) {
  squid.animTime += dt * 3.2;

  // 1. Water Detection & Physics
  const curBlock = getBlock(Math.floor(squid.x), Math.floor(squid.y), Math.floor(squid.z));
  squid.inWater = (curBlock === 39 || curBlock === 52); // Water or Ice

  if (squid.inWater) {
    squid.suffocateTimer = 0;

    // Periodic propulsion thrust: tentacles flare outward, then squid accelerates forward
    const cycle = squid.animTime % (Math.PI * 2);
    const isThrusting = cycle < 1.2;

    if (isThrusting) {
      // Tentacles flare open to 40 degrees (0.70 rad)
      squid.tentacleAngle = Math.sin(cycle / 1.2 * Math.PI) * 0.70;

      // Thrust impulse in facing direction
      const thrust = 1.6 * dt;
      squid.vx += Math.sin(squid.yaw) * Math.cos(squid.pitch) * thrust;
      squid.vy += Math.sin(squid.pitch) * thrust * 0.6;
      squid.vz += Math.cos(squid.yaw) * Math.cos(squid.pitch) * thrust;
    } else {
      // Tentacles close straight
      squid.tentacleAngle *= 0.88;
    }

    // Hydrodynamic Drag
    squid.vx *= 0.96;
    squid.vy *= 0.96;
    squid.vz *= 0.96;

    // Random underwater course change
    if (Math.random() < 0.02) {
      squid.yaw += (Math.random() - 0.5) * 1.5;
      squid.pitch = THREE.MathUtils.clamp(squid.pitch + (Math.random() - 0.5) * 0.8, -0.6, 0.6);
    }
  } else {
    // Beached on land: Fall under gravity & suffocate
    squid.vy = Math.max(-12, squid.vy - 16 * dt);
    squid.vx *= 0.8;
    squid.vz *= 0.8;
    squid.tentacleAngle = 0.2;
    squid.suffocateTimer += dt;
    if (squid.suffocateTimer > 15.0) {
      squid.health = 0; // Suffocates after 15s on dry land
    }
  }

  // 2. Position Integration
  squid.x += squid.vx * dt;
  squid.y += squid.vy * dt;
  squid.z += squid.vz * dt;

  // 3. Update Visual Transforms
  squid.root.position.set(squid.x, squid.y, squid.z);
  squid.root.rotation.set(squid.pitch, squid.yaw, squid.roll);

  // Apply tentacle flare angles radially
  for (let i = 0; i < squid.tentacles.length; i++) {
    squid.tentacles[i].rotation.x = squid.tentacleAngle;
  }
}
