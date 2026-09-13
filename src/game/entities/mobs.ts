import * as THREE from "three";

export type MobType = "zombie" | "skeleton" | "creeper" | "spider" | "enderman" | "pigman" | "ghast";

export interface HostileMobEntity {
  id: string;
  type: MobType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  targetYaw: number;
  pitch: number;
  ground: boolean;
  health: number;
  maxHealth: number;
  speed: number;
  animTime: number;
  isAggro: boolean;
  fuseTimer?: number;
  attackCooldown: number;
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  jawGroup?: THREE.Group;
  fireGroup?: THREE.Group;
  tentacles?: THREE.Group[];
  faceMesh?: THREE.Mesh;
  // survival helpers
  burnTimer?: number;
  fallStartY?: number;
  jumpCooldownM?: number;
}

// ── 3D Procedural Fireplace Flame Envelope ────────────────────────────────────
let cachedFireTex: THREE.CanvasTexture | null = null;
function getProceduralFireTexture(): THREE.CanvasTexture {
  if (cachedFireTex) return cachedFireTex;
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 128;
  const ctx = cv.getContext("2d")!;

  // Warm glowing fireplace gradient (deep embers red -> vibrant campfire orange -> golden flame tips)
  const grad = ctx.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0.0, "rgba(255, 35, 0, 0.96)");
  grad.addColorStop(0.25, "rgba(255, 110, 0, 0.92)");
  grad.addColorStop(0.6, "rgba(255, 205, 30, 0.88)");
  grad.addColorStop(0.85, "rgba(255, 245, 120, 0.65)");
  grad.addColorStop(1.0, "rgba(255, 255, 200, 0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);

  // Tongue-of-flame cutouts & jagged pixelated flame silhouettes
  ctx.fillStyle = "rgba(255, 240, 90, 0.95)";
  for (let c = 0; c < 5; c++) {
    const x = c * 13 + 3;
    const h = 75 + ((c * 37) % 35);
    ctx.beginPath();
    ctx.moveTo(x - 2, 128);
    ctx.lineTo(x + 5, 128 - h);
    ctx.lineTo(x + 12, 128);
    ctx.closePath();
    ctx.fill();
  }

  // Secondary bright inner core flames
  ctx.fillStyle = "rgba(255, 255, 210, 0.98)";
  for (let c = 0; c < 4; c++) {
    const x = c * 14 + 8;
    const h = 50 + ((c * 23) % 25);
    ctx.beginPath();
    ctx.moveTo(x - 1, 128);
    ctx.lineTo(x + 4, 128 - h);
    ctx.lineTo(x + 9, 128);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  cachedFireTex = tex;
  return tex;
}

export function createMobFireGroup(width = 0.85, height = 1.9): THREE.Group {
  const group = new THREE.Group();
  group.name = "fireGroup";
  group.visible = false;

  const tex = getProceduralFireTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height * 0.5, 0);

  // 3 intersecting flame billboard planes for full volumetric fireplace 3D look
  const p1 = new THREE.Mesh(geo, mat);
  const p2 = new THREE.Mesh(geo, mat);
  p2.rotation.y = Math.PI / 3;
  const p3 = new THREE.Mesh(geo, mat);
  p3.rotation.y = (Math.PI * 2) / 3;

  group.add(p1, p2, p3);
  return group;
}

// =========================================================================
// 1. ZOMBIE MODEL (Outstretched Arms + Shuffling Limp)
// =========================================================================
export function createZombieMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  fireGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshLambertMaterial({ color: 0x558a44 }); // Decayed green
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0x009688 }); // Cyan shirt
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x3f2b6e }); // Purple pants

  // 1. Head (8 x 8 x 8 px = 0.5m x 0.5m x 0.5m)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.45, 0);

  const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMesh = new THREE.Mesh(headGeom, skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);
  root.add(headGroup);

  // 2. Torso (8 x 12 x 4 px = 0.5m x 0.75m x 0.25m)
  const torsoGeom = new THREE.BoxGeometry(0.5, 0.75, 0.25);
  const torsoMesh = new THREE.Mesh(torsoGeom, shirtMat);
  torsoMesh.position.set(0, 0.825, 0);
  torsoMesh.castShadow = true;
  root.add(torsoMesh);

  // 3. Outstretched Arms (4 x 12 x 4 px)
  const armGeom = new THREE.BoxGeometry(0.22, 0.75, 0.22);
  const leftArm = new THREE.Mesh(armGeom, skinMat);
  leftArm.position.set(-0.35, 1.05, 0.28);
  leftArm.rotation.x = -Math.PI / 2; // Locked forward 90 degrees
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeom, skinMat);
  rightArm.position.set(0.35, 1.05, 0.28);
  rightArm.rotation.x = -Math.PI / 2;
  rightArm.castShadow = true;
  root.add(leftArm, rightArm);

  // 4. Legs (4 x 12 x 4 px)
  const legGeom = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  const leftLeg = new THREE.Mesh(legGeom, pantsMat);
  leftLeg.position.set(-0.13, 0.375, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeom, pantsMat);
  rightLeg.position.set(0.13, 0.375, 0);
  rightLeg.castShadow = true;
  root.add(leftLeg, rightLeg);

  // 5. Fireplace Fire Envelope
  const fireGroup = createMobFireGroup(0.95, 1.95);
  root.add(fireGroup);

  return { root, headGroup, arms: [leftArm, rightArm], legs: [leftLeg, rightLeg], fireGroup };
}

// =========================================================================
// 1b. ZOMBIE PIGMAN (Zombified Piglin: Pink/decayed skin, snout, golden sword)
// =========================================================================
export function createPigmanMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  fireGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const pigSkinMat = new THREE.MeshLambertMaterial({ color: 0xdf9a9a }); // Pig pink
  const rotSkinMat = new THREE.MeshLambertMaterial({ color: 0x5a8848 }); // Decayed zombie green
  const loinMat = new THREE.MeshLambertMaterial({ color: 0x483222 }); // Brown loincloth
  const goldSwordMat = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // Golden sword

  // 1. Head (0.5 x 0.5 x 0.5)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.45, 0);

  const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMesh = new THREE.Mesh(headGeom, pigSkinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Decayed bone/skull patch on left side of head
  const rotPatchGeom = new THREE.BoxGeometry(0.26, 0.51, 0.51);
  const rotPatch = new THREE.Mesh(rotPatchGeom, rotSkinMat);
  rotPatch.position.set(-0.13, 0, 0);
  headGroup.add(rotPatch);

  // Pig Snout (0.22 wide, 0.14 tall, 0.08 deep)
  const snoutGeom = new THREE.BoxGeometry(0.22, 0.14, 0.08);
  const snoutMesh = new THREE.Mesh(snoutGeom, pigSkinMat);
  snoutMesh.position.set(0, -0.1, 0.28);
  headGroup.add(snoutMesh);
  root.add(headGroup);

  // 2. Torso (0.5 x 0.75 x 0.25)
  const torsoGeom = new THREE.BoxGeometry(0.5, 0.75, 0.25);
  const torsoMesh = new THREE.Mesh(torsoGeom, pigSkinMat);
  torsoMesh.position.set(0, 0.825, 0);
  torsoMesh.castShadow = true;
  root.add(torsoMesh);

  // Torso rot patch
  const torsoRotGeom = new THREE.BoxGeometry(0.26, 0.45, 0.26);
  const torsoRot = new THREE.Mesh(torsoRotGeom, rotSkinMat);
  torsoRot.position.set(-0.13, 0.85, 0);
  root.add(torsoRot);

  // 3. Arms (0.22 x 0.75 x 0.22)
  const armGeom = new THREE.BoxGeometry(0.22, 0.75, 0.22);
  const leftArm = new THREE.Mesh(armGeom, rotSkinMat);
  leftArm.position.set(-0.35, 1.05, 0.28);
  leftArm.rotation.x = -Math.PI / 2;
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeom, pigSkinMat);
  rightArm.position.set(0.35, 1.05, 0.28);
  rightArm.rotation.x = -Math.PI / 2.3;
  rightArm.castShadow = true;

  // Golden Sword attached to right hand
  const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.04), goldSwordMat);
  swordBlade.position.set(0, -0.35, 0.3);
  swordBlade.rotation.x = Math.PI / 4;
  rightArm.add(swordBlade);

  root.add(leftArm, rightArm);

  // 4. Legs (0.24 x 0.75 x 0.24)
  const legGeom = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  const leftLeg = new THREE.Mesh(legGeom, loinMat);
  leftLeg.position.set(-0.13, 0.375, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeom, loinMat);
  rightLeg.position.set(0.13, 0.375, 0);
  rightLeg.castShadow = true;
  root.add(leftLeg, rightLeg);

  // 5. Fire Envelope
  const fireGroup = createMobFireGroup(0.95, 1.95);
  root.add(fireGroup);

  return { root, headGroup, arms: [leftArm, rightArm], legs: [leftLeg, rightLeg], fireGroup };
}

// =========================================================================
// 1c. GHAST MODEL (4x4 Floating Ghost + 9 Dangling Tentacles + Shooting Face)
// =========================================================================
export function createGhastMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  fireGroup: THREE.Group;
  tentacles: THREE.Group[];
  faceMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const ghastMat = new THREE.MeshLambertMaterial({ color: 0xf4f4f4 });
  const tentacleMat = new THREE.MeshLambertMaterial({ color: 0xe5e5e5 });
  const faceNormalMat = new THREE.MeshBasicMaterial({ color: 0x484848 });
  const tearMat = new THREE.MeshBasicMaterial({ color: 0x7a7a8c });

  // 1. Head / Main Cuboid Body (2.2 x 2.2 x 2.2 m)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0, 0);

  const bodyGeom = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  const bodyMesh = new THREE.Mesh(bodyGeom, ghastMat);
  bodyMesh.castShadow = true;
  headGroup.add(bodyMesh);

  // Closed Eyes (two horizontal slits)
  const eyeGeom = new THREE.BoxGeometry(0.35, 0.09, 0.02);
  const leftEye = new THREE.Mesh(eyeGeom, faceNormalMat);
  leftEye.position.set(-0.45, 0.15, 1.11);
  const rightEye = new THREE.Mesh(eyeGeom, faceNormalMat);
  rightEye.position.set(0.45, 0.15, 1.11);
  headGroup.add(leftEye, rightEye);

  // Weeping Tears (two vertical lines trailing below eyes)
  const tearGeom = new THREE.BoxGeometry(0.12, 0.55, 0.02);
  const leftTear = new THREE.Mesh(tearGeom, tearMat);
  leftTear.position.set(-0.45, -0.22, 1.11);
  const rightTear = new THREE.Mesh(tearGeom, tearMat);
  rightTear.position.set(0.45, -0.22, 1.11);
  headGroup.add(leftTear, rightTear);

  // Mouth
  const mouthGeom = new THREE.BoxGeometry(0.4, 0.22, 0.02);
  const faceMesh = new THREE.Mesh(mouthGeom, faceNormalMat);
  faceMesh.position.set(0, -0.42, 1.11);
  headGroup.add(faceMesh);

  root.add(headGroup);

  // 2. 9 Dangling Tentacles in a 3x3 array beneath body
  const tentacles: THREE.Group[] = [];
  const armMeshes: THREE.Mesh[] = [];
  const coords = [-0.65, 0, 0.65];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const tentGroup = new THREE.Group();
      tentGroup.position.set(coords[c], -1.1, coords[r]);

      const tMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 1.1, 0.18),
        tentacleMat
      );
      tMesh.position.y = -0.55;
      tMesh.castShadow = true;
      tentGroup.add(tMesh);

      root.add(tentGroup);
      tentacles.push(tentGroup);
      armMeshes.push(tMesh);
    }
  }

  // 3. Fire envelope
  const fireGroup = createMobFireGroup(2.4, 2.4);
  root.add(fireGroup);

  return {
    root,
    headGroup,
    arms: armMeshes,
    legs: [],
    fireGroup,
    tentacles,
    faceMesh
  };
}

// =========================================================================
// 2. CREEPER MODEL (Frowning Face + 4 Bottom Quad Legs + Priming Scale)
// =========================================================================
export function createCreeperMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  fireGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const creeperMat = new THREE.MeshLambertMaterial({ color: 0x3cb348 }); // Camouflage green
  const faceMat = new THREE.MeshLambertMaterial({ color: 0x1f4724 });    // Dark mouth/eyes

  // 1. Head (8 x 8 x 8 px)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0);

  const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const headMesh = new THREE.Mesh(headGeom, creeperMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Frowning Face Details
  const faceGeom = new THREE.BoxGeometry(0.38, 0.38, 0.05);
  const faceMesh = new THREE.Mesh(faceGeom, faceMat);
  faceMesh.position.set(0, -0.04, 0.25);
  headGroup.add(faceMesh);
  root.add(headGroup);

  // 2. Torso (8 x 12 x 4 px)
  const torsoGeom = new THREE.BoxGeometry(0.5, 0.75, 0.25);
  const torsoMesh = new THREE.Mesh(torsoGeom, creeperMat);
  torsoMesh.position.set(0, 0.625, 0);
  torsoMesh.castShadow = true;
  root.add(torsoMesh);

  // 3. 4 Quad Legs (4 x 6 x 4 px)
  const legGeom = new THREE.BoxGeometry(0.22, 0.38, 0.22);
  const legPositions = [
    [-0.14, 0.19, 0.16],  // FL
    [0.14, 0.19, 0.16],   // FR
    [-0.14, 0.19, -0.16], // RL
    [0.14, 0.19, -0.16]   // RR
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, creeperMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    root.add(legMesh);
    legs.push(legMesh);
  });

  // 4. Fireplace Fire Envelope
  const fireGroup = createMobFireGroup(0.9, 1.7);
  root.add(fireGroup);

  return { root, headGroup, arms: [], legs, fireGroup };
}

// =========================================================================
// 3. SPIDER MODEL (8 Sprawling Bent Legs + Glowing Red Eyes)
// =========================================================================
export function createSpiderMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  fireGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x241d1a }); // Dark chitin
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef233c });   // Crimson red eyes

  // 1. Head (Cephalothorax: 8 x 8 x 8 px)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.45, 0.32);

  const headGeom = new THREE.BoxGeometry(0.48, 0.42, 0.48);
  const headMesh = new THREE.Mesh(headGeom, bodyMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Glowing Red Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), eyeMat);
    eye.position.set(side * 0.12, 0.05, 0.25);
    headGroup.add(eye);
  }
  root.add(headGroup);

  // 2. Abdomen (10 x 8 x 12 px = 0.625m x 0.50m x 0.75m)
  const abdGeom = new THREE.BoxGeometry(0.625, 0.50, 0.75);
  const abdMesh = new THREE.Mesh(abdGeom, bodyMat);
  abdMesh.position.set(0, 0.55, -0.35);
  abdMesh.castShadow = true;
  root.add(abdMesh);

  // 3. 8 Sprawling Legs (4 Left, 4 Right)
  const legGeom = new THREE.BoxGeometry(0.85, 0.10, 0.10);
  const legs: THREE.Mesh[] = [];

  for (let i = 0; i < 4; i++) {
    const zOffset = 0.22 - i * 0.18;

    // Left Leg
    const leftLeg = new THREE.Mesh(legGeom, bodyMat);
    leftLeg.position.set(-0.52, 0.38, zOffset);
    leftLeg.rotation.z = 0.35; // Angled outward & down
    leftLeg.castShadow = true;
    root.add(leftLeg);
    legs.push(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeom, bodyMat);
    rightLeg.position.set(0.52, 0.38, zOffset);
    rightLeg.rotation.z = -0.35;
    rightLeg.castShadow = true;
    root.add(rightLeg);
    legs.push(rightLeg);
  }

  // 4. Fireplace Fire Envelope
  const fireGroup = createMobFireGroup(1.4, 0.95);
  root.add(fireGroup);

  return { root, headGroup, arms: [], legs, fireGroup };
}

// =========================================================================
// 4. SKELETON MODEL (Slender Ribcage + Bone Limbs)
// =========================================================================
export function createSkeletonMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  arms: THREE.Mesh[];
  legs: THREE.Mesh[];
  fireGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const boneMat = new THREE.MeshLambertMaterial({ color: 0xd9d9ce }); // Bone white
  const bowMat = new THREE.MeshLambertMaterial({ color: 0x5a3d28 });  // Wood bow

  // 1. Skull
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.45, 0);

  const headGeom = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  const headMesh = new THREE.Mesh(headGeom, boneMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);
  root.add(headGroup);

  // 2. Ribcage Torso
  const torsoGeom = new THREE.BoxGeometry(0.45, 0.75, 0.20);
  const torsoMesh = new THREE.Mesh(torsoGeom, boneMat);
  torsoMesh.position.set(0, 0.825, 0);
  torsoMesh.castShadow = true;
  root.add(torsoMesh);

  // 3. Stick Bone Arms
  const armGeom = new THREE.BoxGeometry(0.12, 0.75, 0.12);
  const leftArm = new THREE.Mesh(armGeom, boneMat);
  leftArm.position.set(-0.30, 0.825, 0);
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeom, boneMat);
  rightArm.position.set(0.30, 0.825, 0);
  rightArm.castShadow = true;
  
  const bowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.12), bowMat);
  bowMesh.position.set(0, -0.30, 0.18);
  rightArm.add(bowMesh);
  root.add(leftArm, rightArm);

  // 4. Bone Legs
  const legGeom = new THREE.BoxGeometry(0.14, 0.75, 0.14);
  const leftLeg = new THREE.Mesh(legGeom, boneMat);
  leftLeg.position.set(-0.12, 0.375, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeom, boneMat);
  rightLeg.position.set(0.12, 0.375, 0);
  rightLeg.castShadow = true;
  root.add(leftLeg, rightLeg);

  // 5. Fireplace Fire Envelope
  const fireGroup = createMobFireGroup(0.9, 1.95);
  root.add(fireGroup);

  return { root, headGroup, arms: [leftArm, rightArm], legs: [leftLeg, rightLeg], fireGroup };
}

// =========================================================================
// 5. HOSTILE MOB KINEMATICS UPDATE CONTROLLER
// =========================================================================
export function updateHostileMobKinematics(
  mob: HostileMobEntity,
  dt: number,
  playerPos: { x: number; y: number; z: number }
) {
  const speed = Math.hypot(mob.vx, mob.vz);
  mob.animTime += dt * (speed > 0.1 ? (speed * 6.5) : 1.5);

  mob.root.position.set(mob.x, mob.y, mob.z);
  mob.root.rotation.y = mob.yaw;

  // Head Tracking
  const dx = playerPos.x - mob.x;
  const dz = playerPos.z - mob.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 14.0) {
    const lookYaw = Math.atan2(dx, dz) - mob.yaw;
    mob.headGroup.rotation.y = THREE.MathUtils.clamp(lookYaw, -0.75, 0.75);
  }

  // Locomotion Kinematics
  if (mob.type === "zombie") {
    // Outstretched arm groaning sway
    mob.arms[0].rotation.x = -Math.PI / 2 + Math.sin(mob.animTime * 1.5) * 0.08;
    mob.arms[1].rotation.x = -Math.PI / 2 - Math.sin(mob.animTime * 1.5) * 0.08;

    // Asymmetrical dragging limp
    const stride = speed > 0.05 ? Math.sin(mob.animTime * 1.6) : 0;
    mob.legs[0].rotation.x = stride * 0.65;
    mob.legs[1].rotation.x = -stride * 0.45;
  } else if (mob.type === "creeper") {
    // 4-Leg Scurrying
    const stride = speed > 0.05 ? Math.sin(mob.animTime * 2.5) * 0.55 : 0;
    if (mob.legs.length === 4) {
      mob.legs[0].rotation.x = stride;
      mob.legs[1].rotation.x = -stride;
      mob.legs[2].rotation.x = -stride;
      mob.legs[3].rotation.x = stride;
    }

    // Priming Swell
    if (mob.fuseTimer && mob.fuseTimer > 0) {
      const swell = 1.0 + Math.min(0.35, mob.fuseTimer * 0.25);
      mob.root.scale.set(swell, swell, swell);
    } else {
      mob.root.scale.set(1, 1, 1);
    }
  } else if (mob.type === "spider") {
    // 8-Leg Undulating Ripple Crawl
    if (mob.legs.length === 8) {
      for (let i = 0; i < 8; i++) {
        const phase = i * (Math.PI / 4);
        const stride = speed > 0.05 ? Math.sin(mob.animTime * 3.0 + phase) * 0.45 : 0;
        mob.legs[i].rotation.y = (i % 2 === 0 ? 0.35 : -0.35) + stride;
      }
    }
  } else if (mob.type === "skeleton") {
    // Biped Legs
    const stride = speed > 0.05 ? Math.sin(mob.animTime * 1.8) * 0.65 : 0;
    mob.legs[0].rotation.x = stride;
    mob.legs[1].rotation.x = -stride;

    // Bow Aiming Arms
    mob.arms[0].rotation.x = -Math.PI / 2.5;
    mob.arms[1].rotation.x = -Math.PI / 2.2;
    mob.arms[1].rotation.y = -0.4;
  }

  // ── 3D Fireplace Burning Animation ──────────────────────────────────────────
  if (mob.fireGroup) {
    if (mob.burnTimer && mob.burnTimer > 0.05) {
      mob.fireGroup.visible = true;
      const t = mob.animTime * 10.0;
      // Organic harmonic flame undulation (dancing tongues of fire)
      const scaleY = 1.0 + Math.sin(t * 1.7) * 0.16 + Math.sin(t * 3.3) * 0.09;
      const scaleXZ = 1.0 + Math.cos(t * 2.1) * 0.08;
      mob.fireGroup.scale.set(scaleXZ, scaleY, scaleXZ);
      // Gentle crackle sway
      mob.fireGroup.rotation.y = Math.sin(t * 0.9) * 0.18;
    } else {
      mob.fireGroup.visible = false;
    }
  }
}
