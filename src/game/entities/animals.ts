import * as THREE from "three";

// =========================================================================
// 0. NAMEPLATE (pet names floating above the animal)
// =========================================================================
export function attachNameplate(root: THREE.Group, name: string, nameplate?: THREE.Sprite, yOffset = 1.5): THREE.Sprite {
  if (nameplate) {
    root.remove(nameplate);
    (nameplate.material as THREE.Material).dispose();
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.roundRect(8, 4, 240, 40, 8);
  ctx.fill();
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText(name.slice(0, 24), 128, 24);

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    depthTest: false,
    transparent: true
  }));
  sprite.position.set(0, yOffset, 0);
  sprite.scale.set(1.1, 0.21, 1);
  sprite.renderOrder = 999; // always drawn on top of everything
  root.add(sprite);
  return sprite;
}

export type AnimalType = "cow" | "sheep" | "pig" | "chicken" | "horse" | "dog" | "strider" | "cat";

export function isSolitary(type: AnimalType): boolean {
  return type === "cat";
}
export type AnimalSex = "male" | "female";

export interface AnimalEntity {
  id: string;
  type: AnimalType;
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
  walkProgress?: number;
  isGrazing: boolean;
  grazingTimer: number;
  panicTimer: number;
  walkTimer?: number;
  idleTimer?: number;
  wanderTier?: "calm" | "roamer" | "explorer";
  isSheared?: boolean;
  herdCheck?: boolean;
  herdTarget?: number | null;
  herdDist?: number;
  lookTargetYaw?: number;
  lookTargetPitch?: number;
  lookTimer?: number;
  socialPhase?: "approach" | "disperse";
  socialTargetId?: string;
  rideMoveYaw?: number;
  // Pet system: name/owner/sex/riding
  name?: string;
  sex: AnimalSex;
  ownerId?: string;
  ridden?: boolean;
  nameplate?: THREE.Sprite;
  collarMesh?: THREE.Mesh;
  collarColor?: string;
  // movement helpers
  climbTargetY?: number;
  jumpCooldown?: number;
  stuckT?: number;
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  wings?: THREE.Mesh[];
  fleeceMesh?: THREE.Mesh;
  tailMesh?: THREE.Mesh;
}

// =========================================================================
// 1. COW MODEL (Exact 1:1 Minecraft Box Spec: 1px = 0.0625m)
// =========================================================================
export function createCowMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
} {
  const root = new THREE.Group();

  const hideMat = new THREE.MeshLambertMaterial({ color: 0x4a3222 }); // Dark brown
  const patchMat = new THREE.MeshLambertMaterial({ color: 0xeae6df }); // White spots
  const snoutMat = new THREE.MeshLambertMaterial({ color: 0xd69a85, polygonOffset: true, polygonOffsetFactor: -1 }); // Pink snout
  const hornMat = new THREE.MeshLambertMaterial({ color: 0xb5b2ab }); // Gray horns

  // 1. Torso / Body (12 x 18 x 10 px = 0.75m x 1.125m x 0.625m)
  const bodyGeom = new THREE.BoxGeometry(0.75, 0.625, 1.125);
  const bodyMesh = new THREE.Mesh(bodyGeom, hideMat);
  bodyMesh.position.set(0, 0.95, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // White spotted flanks (with 1cm distinct relief to eliminate z-fighting)
  const patchGeom = new THREE.BoxGeometry(0.77, 0.38, 0.50);
  const patchMesh = new THREE.Mesh(patchGeom, patchMat);
  patchMesh.position.set(0, 0.95, 0.1);
  root.add(patchMesh);

  // 2. Head Group (8 x 8 x 6 px) - Positioned with 4cm clearance from torso front face
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0.60);

  const headGeom = new THREE.BoxGeometry(0.50, 0.50, 0.38);
  const headMesh = new THREE.Mesh(headGeom, hideMat);
  headMesh.position.set(0, 0, 0.19);
  headGroup.add(headMesh);

  // Pink Snout (8 x 4 x 4 px)
  const snoutGeom = new THREE.BoxGeometry(0.50, 0.25, 0.25);
  const snoutMesh = new THREE.Mesh(snoutGeom, snoutMat);
  snoutMesh.position.set(0, -0.12, 0.38);
  headGroup.add(snoutMesh);

  // Horns (1 x 3 x 1 px on left and right)
  const hornGeom = new THREE.BoxGeometry(0.0625, 0.1875, 0.0625);
  const leftHorn = new THREE.Mesh(hornGeom, hornMat);
  leftHorn.position.set(-0.28, 0.25, 0.15);
  const rightHorn = new THREE.Mesh(hornGeom, hornMat);
  rightHorn.position.set(0.28, 0.25, 0.15);
  headGroup.add(leftHorn, rightHorn);

  // Eyes (white base + black pupil on the head front face, z = 0.19 + 0.19)
  const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f1e8 });
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x120d08 });
  const eyeWhiteGeom = new THREE.BoxGeometry(0.09, 0.11, 0.012);
  const pupilGeom = new THREE.BoxGeometry(0.05, 0.06, 0.014);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
    eye.position.set(sx * 0.125, 0.09, 0.382);
    const pupil = new THREE.Mesh(pupilGeom, pupilMat);
    pupil.position.set(sx * 0.115, 0.09, 0.386);
    headGroup.add(eye, pupil);
  }

  root.add(headGroup);

  // 3. 4 Legs with Top Hip-Joint Pivot (4 x 12 x 4 px = 0.24m x 0.75m x 0.24m)
  const legGeom = new THREE.BoxGeometry(0.24, 0.75, 0.24);
  legGeom.translate(0, -0.375, 0);

  const legPositions = [
    [-0.24, 0.75, 0.36],  // FL
    [0.24, 0.75, 0.36],   // FR
    [-0.24, 0.75, -0.36], // RL
    [0.24, 0.75, -0.36]   // RR
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, hideMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    root.add(legMesh);
    legs.push(legMesh);
  });

  return { root, headGroup, legs };
}

// =========================================================================
// 2. SHEEP MODEL (Fluffy Fleece Shell + Removable Wool Layer)
// =========================================================================
export function createSheepMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  fleeceMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const woolMat = new THREE.MeshLambertMaterial({ color: 0xe8e5df });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });

  // 1. Inner Body (10 x 16 x 6 px)
  const bodyGeom = new THREE.BoxGeometry(0.625, 0.50, 1.0);
  const bodyMesh = new THREE.Mesh(bodyGeom, skinMat);
  bodyMesh.position.set(0, 0.90, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Outer Fluffy Fleece Coat (12 x 18 x 8 px)
  const fleeceGeom = new THREE.BoxGeometry(0.78, 0.65, 1.15);
  const fleeceMesh = new THREE.Mesh(fleeceGeom, woolMat);
  fleeceMesh.position.set(0, 0.90, 0);
  fleeceMesh.castShadow = true;
  root.add(fleeceMesh);

  // 2. Head Group (6 x 6 x 8 px) - Positioned with clearance from fleece
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.08, 0.62);

  const headGeom = new THREE.BoxGeometry(0.38, 0.38, 0.50);
  const headMesh = new THREE.Mesh(headGeom, skinMat);
  headMesh.position.set(0, 0, 0.20);
  headGroup.add(headMesh);

  const crownGeom = new THREE.BoxGeometry(0.42, 0.20, 0.36);
  const crownMesh = new THREE.Mesh(crownGeom, woolMat);
  crownMesh.position.set(0, 0.18, 0.08);
  headGroup.add(crownMesh);

  // Eyes: white base + dark pupil on the head front face (cow-style)
  const sheepEyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f1e8 });
  const sheepPupilMat = new THREE.MeshLambertMaterial({ color: 0x120d08 });
  const sheepEyeWhiteGeom = new THREE.BoxGeometry(0.075, 0.09, 0.012);
  const sheepPupilGeom = new THREE.BoxGeometry(0.04, 0.05, 0.014);
  for (const sx of [-1, 1]) {
    const eyeW = new THREE.Mesh(sheepEyeWhiteGeom, sheepEyeWhiteMat);
    eyeW.position.set(sx * 0.095, 0.03, 0.450);
    const pupil = new THREE.Mesh(sheepPupilGeom, sheepPupilMat);
    pupil.position.set(sx * 0.09, 0.03, 0.455);
    headGroup.add(eyeW, pupil);
  }

  root.add(headGroup);

  // 3. 4 Legs with Top Hip-Joint Pivot
  const legGeom = new THREE.BoxGeometry(0.20, 0.75, 0.20);
  legGeom.translate(0, -0.375, 0);

  const legPositions = [
    [-0.24, 0.75, 0.36],
    [0.24, 0.75, 0.36],
    [-0.24, 0.75, -0.36],
    [0.24, 0.75, -0.36]
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, skinMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
root.add(legMesh);
    legs.push(legMesh);
  });

  return { root, headGroup, legs, fleeceMesh };
}

// =========================================================================
// 3. PIG MODEL (Stout Pink Body + Snout)
// =========================================================================
export function createPigMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
} {
  const root = new THREE.Group();

  const pigPinkMat = new THREE.MeshLambertMaterial({ color: 0xf5a3a3 });
  const snoutPinkMat = new THREE.MeshLambertMaterial({ color: 0xeb8888, polygonOffset: true, polygonOffsetFactor: -1 });

  // 1. Torso (10 x 16 x 8 px = 0.625m x 1.0m x 0.50m)
  const bodyGeom = new THREE.BoxGeometry(0.625, 0.50, 1.0);
  const bodyMesh = new THREE.Mesh(bodyGeom, pigPinkMat);
  bodyMesh.position.set(0, 0.56, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // 2. Head Group (8 x 8 x 8 px) - Positioned with clearance
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.75, 0.54);

  const headGeom = new THREE.BoxGeometry(0.50, 0.50, 0.50);
  const headMesh = new THREE.Mesh(headGeom, pigPinkMat);
  headMesh.position.set(0, 0, 0.12);
  headGroup.add(headMesh);

  // Snout (4 x 3 x 1 px)
  const snoutGeom = new THREE.BoxGeometry(0.25, 0.18, 0.10);
  const snoutMesh = new THREE.Mesh(snoutGeom, snoutPinkMat);
  snoutMesh.position.set(0, -0.08, 0.38);
  headGroup.add(snoutMesh);

  // Eyes (white + dark pupil on the head front, z = 0.12 + 0.25, above snout line)
  const pigEyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf7f4ee });
  const pigPupilMat = new THREE.MeshLambertMaterial({ color: 0x191410 });
  const pigEyeWhiteGeom = new THREE.BoxGeometry(0.075, 0.085, 0.012);
  const pigPupilGeom = new THREE.BoxGeometry(0.042, 0.05, 0.014);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(pigEyeWhiteGeom, pigEyeWhiteMat);
    eye.position.set(sx * 0.115, 0.115, 0.372);
    const pupil = new THREE.Mesh(pigPupilGeom, pigPupilMat);
    pupil.position.set(sx * 0.108, 0.115, 0.376);
    headGroup.add(eye, pupil);
  }

  root.add(headGroup);

  // 3. 4 Stubby Legs with Top Hip-Joint Pivot
  const legGeom = new THREE.BoxGeometry(0.22, 0.38, 0.22);
  legGeom.translate(0, -0.19, 0);

  const legPositions = [
    [-0.22, 0.38, 0.32],
    [0.22, 0.38, 0.32],
    [-0.22, 0.38, -0.32],
    [0.22, 0.38, -0.32]
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, pigPinkMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    root.add(legMesh);
    legs.push(legMesh);
  });

  return { root, headGroup, legs };
}

// =========================================================================
// 4. CHICKEN MODEL (Biped Bird + Wattle + Flapping Wings)
// =========================================================================
export function createChickenMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  wings: THREE.Mesh[];
} {
  const root = new THREE.Group();

  const whiteFeatherMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const yellowBeakMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
  const redWattleMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });

  // 1. Plump Body (6 x 8 x 6 px = 0.375m x 0.50m x 0.375m)
  const bodyGeom = new THREE.BoxGeometry(0.38, 0.38, 0.50);
  const bodyMesh = new THREE.Mesh(bodyGeom, whiteFeatherMat);
  bodyMesh.position.set(0, 0.38, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // 2. Head Group (4 x 6 x 3 px)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.48, 0.24);

  const headGeom = new THREE.BoxGeometry(0.25, 0.38, 0.20);
  const headMesh = new THREE.Mesh(headGeom, whiteFeatherMat);
  headMesh.position.set(0, 0.12, 0.05);
  headGroup.add(headMesh);

  // Yellow Beak (4 x 2 x 2 px)
  const beakGeom = new THREE.BoxGeometry(0.25, 0.12, 0.12);
  const beakMesh = new THREE.Mesh(beakGeom, yellowBeakMat);
  beakMesh.position.set(0, 0.08, 0.18);
  headGroup.add(beakMesh);

  // Red Wattle (2 x 4 x 2 px)
  const wattleGeom = new THREE.BoxGeometry(0.12, 0.20, 0.12);
  const wattleMesh = new THREE.Mesh(wattleGeom, redWattleMat);
  wattleMesh.position.set(0, -0.05, 0.12);
  headGroup.add(wattleMesh);

  // Eyes (black beads flanking the beak line, z = 0.05 + 0.10)
  const chickenEyeMat = new THREE.MeshLambertMaterial({ color: 0x14100b });
  const chickenEyeGeom = new THREE.BoxGeometry(0.045, 0.05, 0.012);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(chickenEyeGeom, chickenEyeMat);
    eye.position.set(sx * 0.085, 0.175, 0.152);
    headGroup.add(eye);
  }

  root.add(headGroup);

  // 3. 2 Side Wings (1 x 4 x 6 px)
  const wingGeom = new THREE.BoxGeometry(0.06, 0.25, 0.38);
  const leftWing = new THREE.Mesh(wingGeom, whiteFeatherMat);
  leftWing.position.set(-0.22, 0.40, 0);
  const rightWing = new THREE.Mesh(wingGeom, whiteFeatherMat);
  rightWing.position.set(0.22, 0.40, 0);
  root.add(leftWing, rightWing);

  // 4. 2 Biped Legs with Top Hip-Joint Pivot (3 x 5 x 3 px)
  const legGeom = new THREE.BoxGeometry(0.12, 0.32, 0.14);
  legGeom.translate(0, -0.16, 0);

  const leftLeg = new THREE.Mesh(legGeom, yellowBeakMat);
  leftLeg.position.set(-0.10, 0.32, 0);
  const rightLeg = new THREE.Mesh(legGeom, yellowBeakMat);
  rightLeg.position.set(0.10, 0.32, 0);
  root.add(leftLeg, rightLeg);

  return { root, headGroup, legs: [leftLeg, rightLeg], wings: [leftWing, rightWing] };
}

// =========================================================================
// 5. HORSE MODEL (~2 Blocks Tall, Athletic Build, Neck, Mane, Ears, Eyes & Saddle)
// =========================================================================
export function createHorseMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  tailMesh?: THREE.Mesh;
} {
  const root = new THREE.Group();

  const coatMat = new THREE.MeshLambertMaterial({ color: 0x7c4722 }); // Warm chestnut brown
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x24160d }); // Dark brown/black mane, tail & hooves
  const muzzleMat = new THREE.MeshLambertMaterial({ color: 0x482914 }); // Muzzle
  const saddleBlanketMat = new THREE.MeshLambertMaterial({ color: 0x8b2626 }); // Dark red saddle blanket
  const saddleLeatherMat = new THREE.MeshLambertMaterial({ color: 0x2e1809 }); // Leather saddle
  const ironStirrupMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e }); // Iron stirrups
  const earMat = new THREE.MeshLambertMaterial({ color: 0x6e3d1c });

  // 1. Torso / Body (0.70m x 0.68m x 1.35m) - positioned at y = 1.10m
  const bodyGeom = new THREE.BoxGeometry(0.70, 0.68, 1.35);
  const bodyMesh = new THREE.Mesh(bodyGeom, coatMat);
  bodyMesh.position.set(0, 1.10, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Saddle Blanket (cloth pad)
  const blanketGeom = new THREE.BoxGeometry(0.72, 0.38, 0.65);
  const blanketMesh = new THREE.Mesh(blanketGeom, saddleBlanketMat);
  blanketMesh.position.set(0, 1.10, -0.05);
  root.add(blanketMesh);

  // Leather Saddle (seat + girth)
  const saddleGeom = new THREE.BoxGeometry(0.74, 0.12, 0.48);
  const saddleMesh = new THREE.Mesh(saddleGeom, saddleLeatherMat);
  saddleMesh.position.set(0, 1.36, -0.05);
  root.add(saddleMesh);

  // Iron Stirrups (left & right hanging down the flank)
  const stirrupGeom = new THREE.BoxGeometry(0.04, 0.32, 0.06);
  const leftStirrup = new THREE.Mesh(stirrupGeom, ironStirrupMat);
  leftStirrup.position.set(-0.38, 1.02, -0.05);
  const rightStirrup = new THREE.Mesh(stirrupGeom, ironStirrupMat);
  rightStirrup.position.set(0.38, 1.02, -0.05);
  root.add(leftStirrup, rightStirrup);

  // Tail (hanging from rear, slightly angled)
  const tailGeom = new THREE.BoxGeometry(0.12, 0.58, 0.12);
  tailGeom.translate(0, -0.25, 0);
  const tailMesh = new THREE.Mesh(tailGeom, darkMat);
  tailMesh.position.set(0, 1.25, -0.68);
  tailMesh.rotation.x = -0.20;
  root.add(tailMesh);

  // 2. Head & Neck Group (pivot at upper-front of torso: [0, 1.10, 0.55])
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.10, 0.55);

  // Neck (angled upward & forward)
  const neckGeom = new THREE.BoxGeometry(0.28, 0.65, 0.32);
  const neckMesh = new THREE.Mesh(neckGeom, coatMat);
  neckMesh.position.set(0, 0.32, 0.12);
  neckMesh.rotation.x = 0.28;
  headGroup.add(neckMesh);

  // Mane (dark ridge along the back of the neck)
  const maneGeom = new THREE.BoxGeometry(0.10, 0.68, 0.12);
  const maneMesh = new THREE.Mesh(maneGeom, darkMat);
  maneMesh.position.set(0, 0.35, -0.05);
  maneMesh.rotation.x = 0.28;
  headGroup.add(maneMesh);

  // Head Box (at top of neck: y ≈ 0.65, z ≈ 0.25)
  const headGeom = new THREE.BoxGeometry(0.32, 0.34, 0.44);
  const headMesh = new THREE.Mesh(headGeom, coatMat);
  headMesh.position.set(0, 0.65, 0.25);
  headGroup.add(headMesh);

  // Muzzle / Snout (lower front of the head)
  const muzzleGeom = new THREE.BoxGeometry(0.28, 0.22, 0.32);
  const muzzleMesh = new THREE.Mesh(muzzleGeom, muzzleMat);
  muzzleMesh.position.set(0, 0.54, 0.52);
  headGroup.add(muzzleMesh);

  // Nostrils on the muzzle front
  const nostrilMat = new THREE.MeshLambertMaterial({ color: 0x1a0d06 });
  const nostrilGeom = new THREE.BoxGeometry(0.06, 0.05, 0.012);
  for (const sx of [-1, 1]) {
    const nostril = new THREE.Mesh(nostrilGeom, nostrilMat);
    nostril.position.set(sx * 0.08, 0.52, 0.682);
    headGroup.add(nostril);
  }

  // Pointed Ears on top of head (left & right) - reaches ~2.07m overall height
  const earGeom = new THREE.BoxGeometry(0.07, 0.18, 0.06);
  const leftEar = new THREE.Mesh(earGeom, earMat);
  leftEar.position.set(-0.11, 0.88, 0.12);
  leftEar.rotation.z = -0.12;
  const rightEar = new THREE.Mesh(earGeom, earMat);
  rightEar.position.set(0.11, 0.88, 0.12);
  rightEar.rotation.z = 0.12;
  headGroup.add(leftEar, rightEar);

  // Eyes (white base + dark pupil on head sides/front)
  const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f1e8 });
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x120d08 });
  const eyeWhiteGeom = new THREE.BoxGeometry(0.015, 0.09, 0.09);
  const pupilGeom = new THREE.BoxGeometry(0.018, 0.05, 0.05);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
    eye.position.set(sx * 0.162, 0.68, 0.28);
    const pupil = new THREE.Mesh(pupilGeom, pupilMat);
    pupil.position.set(sx * 0.165, 0.68, 0.29);
    headGroup.add(eye, pupil);
  }

  root.add(headGroup);

  // 3. 4 Athletic Legs with Hooves (pivot at top hip joint y = 0.95m, height = 0.95m reaching ground y = 0)
  const legGeom = new THREE.BoxGeometry(0.20, 0.95, 0.20);
  legGeom.translate(0, -0.475, 0);

  const hoofGeom = new THREE.BoxGeometry(0.21, 0.22, 0.21);
  hoofGeom.translate(0, -0.84, 0);

  const legPositions = [
    [-0.22, 0.95, 0.44],  // FL
    [0.22, 0.95, 0.44],   // FR
    [-0.22, 0.95, -0.44], // RL
    [0.22, 0.95, -0.44]   // RR
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, coatMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;

    // Dark Hoof attached as child of legMesh so it swings with the leg
    const hoofMesh = new THREE.Mesh(hoofGeom, darkMat);
    legMesh.add(hoofMesh);

    root.add(legMesh);
    legs.push(legMesh);
  });

  return { root, headGroup, legs, tailMesh };
}

// =========================================================================
// 6. DOG / WOLF MODEL (Authentic Minecraft Wolf/Dog Spec: smaller than cow, ~0.85m tall, eyes, collar)
// =========================================================================
export function createDogMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  tailMesh: THREE.Mesh;
  collarMesh: THREE.Mesh;
  collarMat: THREE.MeshLambertMaterial;
} {
  const root = new THREE.Group();

  const furMat = new THREE.MeshLambertMaterial({ color: 0xd6cfc4 }); // Pale warm wolf fur
  const chestMat = new THREE.MeshLambertMaterial({ color: 0xede8e1 }); // White chest fluff
  // Collar is GREY by default (vanilla: only owned dogs wear a colored collar).
  const collarMat = new THREE.MeshLambertMaterial({ color: 0x9a9a9a });
  const noseMat = new THREE.MeshLambertMaterial({ color: 0x1f1a17 }); // Dark snout tip
  const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xfaf8f5 }); // Eye white
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x1a110a }); // Eye pupil

  // 1. Torso / Body (0.36m wide x 0.36m tall x 0.55m long, center y = 0.50m)
  const bodyGeom = new THREE.BoxGeometry(0.36, 0.36, 0.55);
  const bodyMesh = new THREE.Mesh(bodyGeom, furMat);
  bodyMesh.position.set(0, 0.50, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Chest mane / fluff (slightly wider at front of torso)
  const chestGeom = new THREE.BoxGeometry(0.38, 0.38, 0.26);
  const chestMesh = new THREE.Mesh(chestGeom, chestMat);
  chestMesh.position.set(0, 0.51, 0.16);
  root.add(chestMesh);

  // Collar (wrapped around neck area) — grey until the dog is adopted (pet naming)
  const collarGeom = new THREE.BoxGeometry(0.39, 0.08, 0.10);
  const collarMesh = new THREE.Mesh(collarGeom, collarMat);
  collarMesh.position.set(0, 0.53, 0.28);
  root.add(collarMesh);

  // 2. Head Group at (0, 0.62, 0.36)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0.36);

  // Main Head Box (0.34m x 0.34m x 0.34m)
  const headGeom = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  const headMesh = new THREE.Mesh(headGeom, furMat);
  headMesh.position.set(0, 0, 0.17);
  headGroup.add(headMesh);

  // Snout / Muzzle (0.18m x 0.14m x 0.18m)
  const snoutGeom = new THREE.BoxGeometry(0.18, 0.14, 0.18);
  const snoutMesh = new THREE.Mesh(snoutGeom, chestMat);
  snoutMesh.position.set(0, -0.07, 0.35);
  headGroup.add(snoutMesh);

  // Dark Nose Tip
  const noseGeom = new THREE.BoxGeometry(0.08, 0.05, 0.03);
  const noseMesh = new THREE.Mesh(noseGeom, noseMat);
  noseMesh.position.set(0, -0.03, 0.445);
  headGroup.add(noseMesh);

  // Upright Pointed Ears
  const earGeom = new THREE.BoxGeometry(0.08, 0.12, 0.08);
  const leftEar = new THREE.Mesh(earGeom, furMat);
  leftEar.position.set(-0.12, 0.20, 0.12);
  const rightEar = new THREE.Mesh(earGeom, furMat);
  rightEar.position.set(0.12, 0.20, 0.12);
  headGroup.add(leftEar, rightEar);

  // Eyes (white base + dark pupil on front-sides)
  const eyeWhiteGeom = new THREE.BoxGeometry(0.07, 0.08, 0.012);
  const pupilGeom = new THREE.BoxGeometry(0.04, 0.05, 0.014);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
    eye.position.set(sx * 0.10, 0.04, 0.342);
    const pupil = new THREE.Mesh(pupilGeom, pupilMat);
    pupil.position.set(sx * 0.09, 0.04, 0.346);
    headGroup.add(eye, pupil);
  }

  root.add(headGroup);

  // 3. Tail (0.09m x 0.30m x 0.09m, angled up and back)
  const tailGeom = new THREE.BoxGeometry(0.09, 0.30, 0.09);
  tailGeom.translate(0, 0.15, 0); // pivot at base
  const tailMesh = new THREE.Mesh(tailGeom, furMat);
  tailMesh.position.set(0, 0.54, -0.28);
  tailMesh.rotation.x = -0.55; // perky tail raised backwards
  root.add(tailMesh);

  // 4. 4 Athletic Dog Legs (0.13m x 0.42m x 0.13m)
  const legGeom = new THREE.BoxGeometry(0.13, 0.42, 0.13);
  legGeom.translate(0, -0.21, 0); // pivot at hip joint

  const legPositions: [number, number, number][] = [
    [-0.11, 0.42, 0.18],  // Front Left
    [0.11, 0.42, 0.18],   // Front Right
    [-0.11, 0.42, -0.18], // Rear Left
    [0.11, 0.42, -0.18],  // Rear Right
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, furMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    root.add(legMesh);
    legs.push(legMesh);
  });

  return { root, headGroup, legs, tailMesh, collarMesh, collarMat };
}

// =========================================================================
// 6b. CAT MODEL (compact stray: small torso, pointy ears, thin upright tail)
// =========================================================================
export function createCatMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Mesh[];
  tailMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const furMat = new THREE.MeshLambertMaterial({ color: 0xc07a35 }); // Orange tabby
  const creamMat = new THREE.MeshLambertMaterial({ color: 0xead9bd }); // Cream chest/muzzle
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x4d7c2a }); // Green eyes
  const noseMat = new THREE.MeshLambertMaterial({ color: 0xd98a94 }); // Pink nose

  // 1. Torso / Body (0.30m wide x 0.28m tall x 0.48m long, center y = 0.36m)
  const bodyGeom = new THREE.BoxGeometry(0.30, 0.28, 0.48);
  const bodyMesh = new THREE.Mesh(bodyGeom, furMat);
  bodyMesh.position.set(0, 0.36, 0);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);

  // Cream chest fluff at front of torso
  const chestGeom = new THREE.BoxGeometry(0.26, 0.24, 0.16);
  const chestMesh = new THREE.Mesh(chestGeom, creamMat);
  chestMesh.position.set(0, 0.35, 0.20);
  root.add(chestMesh);

  // 2. Head Group at (0, 0.52, 0.30)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.52, 0.30);

  // Main Head Box (0.26m cube)
  const headGeom = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  const headMesh = new THREE.Mesh(headGeom, furMat);
  headMesh.position.set(0, 0, 0.13);
  headGroup.add(headMesh);

  // Cream muzzle
  const muzzleGeom = new THREE.BoxGeometry(0.14, 0.10, 0.08);
  const muzzleMesh = new THREE.Mesh(muzzleGeom, creamMat);
  muzzleMesh.position.set(0, -0.06, 0.28);
  headGroup.add(muzzleMesh);

  // Pink nose tip
  const noseGeom = new THREE.BoxGeometry(0.05, 0.04, 0.02);
  const noseMesh = new THREE.Mesh(noseGeom, noseMat);
  noseMesh.position.set(0, -0.03, 0.325);
  headGroup.add(noseMesh);

  // Tall pointed ears
  const earGeom = new THREE.BoxGeometry(0.07, 0.13, 0.05);
  const leftEar = new THREE.Mesh(earGeom, furMat);
  leftEar.position.set(-0.09, 0.18, 0.10);
  const rightEar = new THREE.Mesh(earGeom, furMat);
  rightEar.position.set(0.09, 0.18, 0.10);
  headGroup.add(leftEar, rightEar);

  // Green eyes on the front face
  const eyeGeom = new THREE.BoxGeometry(0.055, 0.07, 0.014);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(sx * 0.07, 0.03, 0.262);
    headGroup.add(eye);
  }

  root.add(headGroup);

  // 3. Tail (thin, held upright with a slight curl)
  const tailGeom = new THREE.BoxGeometry(0.06, 0.36, 0.06);
  tailGeom.translate(0, 0.18, 0); // pivot at base
  const tailMesh = new THREE.Mesh(tailGeom, furMat);
  tailMesh.position.set(0, 0.40, -0.24);
  tailMesh.rotation.x = -0.25;
  root.add(tailMesh);

  // Cream tail tip
  const tipGeom = new THREE.BoxGeometry(0.062, 0.09, 0.062);
  const tipMesh = new THREE.Mesh(tipGeom, creamMat);
  tipMesh.position.set(0, 0.36, 0);
  tailMesh.add(tipMesh);

  // 4. 4 Slim Legs (0.09m x 0.30m x 0.09m)
  const legGeom = new THREE.BoxGeometry(0.09, 0.30, 0.09);
  legGeom.translate(0, -0.15, 0); // pivot at hip joint

  const legPositions: [number, number, number][] = [
    [-0.09, 0.30, 0.16],  // Front Left
    [0.09, 0.30, 0.16],   // Front Right
    [-0.09, 0.30, -0.16], // Rear Left
    [0.09, 0.30, -0.16],  // Rear Right
  ];

  const legs: THREE.Mesh[] = [];
  legPositions.forEach(pos => {
    const legMesh = new THREE.Mesh(legGeom, furMat);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    root.add(legMesh);
    legs.push(legMesh);
  });

  return { root, headGroup, legs, tailMesh };
}

// =========================================================================
// 7. ANIMAL ANIMATION & KINEMATICS UPDATE CONTROLLER
// =========================================================================
export function updateAnimalKinematics(
  animal: AnimalEntity,
  dt: number,
  playerPos: { x: number; y: number; z: number },
  allAnimals?: AnimalEntity[]
) {
  const speed = Math.hypot(animal.vx, animal.vz);

  // Stride progress strictly tied to actual travel displacement (1:1 ground placement)
  if (animal.walkProgress === undefined) animal.walkProgress = 0;
  if (speed > 0.05) {
    animal.walkProgress += speed * dt * 3.4; // 1 full stride every ~1.8m traveled
  } else {
    // Return legs to neutral standing stance when idle
    animal.walkProgress = (animal.walkProgress % (Math.PI * 2)) * 0.85;
  }
  animal.animTime += dt;

  // 1. Root Position & Direction Interpolation
  animal.root.position.set(animal.x, animal.y, animal.z);
  animal.root.rotation.y = animal.yaw;

  // Tail animation (gentle swish when walking or idle)
  if (animal.tailMesh) {
    const swishRate = speed > 0.05 ? 6.0 : 2.5;
    const swishAmp = speed > 0.05 ? 0.22 : 0.08;
    animal.tailMesh.rotation.z = Math.sin(animal.animTime * swishRate) * swishAmp;
  }

  // 2. Head Kinematics, Looking Around & Riding Steer
  const dx = playerPos.x - animal.x;
  const dz = playerPos.z - animal.z;
  const distToPlayer = Math.hypot(dx, dz);

  if (animal.ridden) {
    // When riding: head points dynamically in the direction we are steering/moving!
    const targetHeadYaw = animal.rideMoveYaw ?? 0;
    animal.headGroup.rotation.y += (targetHeadYaw - animal.headGroup.rotation.y) * Math.min(1, dt * 8.0);
    const headBob = speed > 0.05 ? Math.sin(animal.walkProgress) * 0.06 : 0;
    animal.headGroup.rotation.x += (headBob - animal.headGroup.rotation.x) * Math.min(1, dt * 8.0);
  } else if (animal.isGrazing) {
    // Grazing head dip down
    animal.grazingTimer += dt;
    const targetPitch = 0.70 + Math.sin(animal.animTime * 4.0) * 0.04;
    animal.headGroup.rotation.x += (targetPitch - animal.headGroup.rotation.x) * Math.min(1, dt * 5.0);
    animal.headGroup.rotation.y += (0 - animal.headGroup.rotation.y) * Math.min(1, dt * 5.0);
    if (animal.grazingTimer > 3.5) {
      animal.isGrazing = false;
      animal.grazingTimer = 0;
    }
  } else if (speed < 0.1) {
    // Stopped / Idle: use head to look around, look at other animals, or stare at player
    if (animal.lookTimer === undefined) animal.lookTimer = 0;
    animal.lookTimer -= dt;
    if (animal.lookTimer <= 0) {
      animal.lookTimer = 1.6 + Math.random() * 2.4;

      // Find closest companion animal within 8m
      let nearestCompanion: AnimalEntity | null = null;
      let minD2 = 8.0 * 8.0;
      if (allAnimals) {
        for (const other of allAnimals) {
          if (other === animal) continue;
          const ddx = other.x - animal.x, ddz = other.z - animal.z;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < minD2) {
            minD2 = d2;
            nearestCompanion = other;
          }
        }
      }

      const roll = Math.random();
      if (nearestCompanion && roll < 0.45) {
        // Turn head to look at nearby companion animal
        const lookAngle = Math.atan2(nearestCompanion.x - animal.x, nearestCompanion.z - animal.z) - animal.yaw;
        let normYaw = lookAngle;
        while (normYaw > Math.PI) normYaw -= 2 * Math.PI;
        while (normYaw < -Math.PI) normYaw += 2 * Math.PI;
        animal.lookTargetYaw = THREE.MathUtils.clamp(normYaw, -0.85, 0.85);
        animal.lookTargetPitch = 0.04 + (Math.random() - 0.5) * 0.12;
      } else if (distToPlayer < 6.0 && roll < 0.75) {
        // Turn head to look at player
        const lookAngle = Math.atan2(dx, dz) - animal.yaw;
        let normYaw = lookAngle;
        while (normYaw > Math.PI) normYaw -= 2 * Math.PI;
        while (normYaw < -Math.PI) normYaw += 2 * Math.PI;
        animal.lookTargetYaw = THREE.MathUtils.clamp(normYaw, -0.85, 0.85);
        animal.lookTargetPitch = (playerPos.y - animal.y > 0.5 ? -0.15 : 0.05);
      } else {
        // Glance around naturally to the left or right
        animal.lookTargetYaw = (Math.random() - 0.5) * 0.95;
        animal.lookTargetPitch = (Math.random() - 0.5) * 0.20;
      }
    }
    const targetYaw = animal.lookTargetYaw ?? 0;
    const targetPitch = animal.lookTargetPitch ?? 0;
    animal.headGroup.rotation.y += (targetYaw - animal.headGroup.rotation.y) * Math.min(1, dt * 4.5);
    animal.headGroup.rotation.x += (targetPitch - animal.headGroup.rotation.x) * Math.min(1, dt * 4.5);
  } else {
    // Walking: head aligns forward with gentle bobbing
    animal.headGroup.rotation.y += (0 - animal.headGroup.rotation.y) * Math.min(1, dt * 6.0);
    const headBob = Math.sin(animal.walkProgress) * 0.08;
    animal.headGroup.rotation.x += (headBob - animal.headGroup.rotation.x) * Math.min(1, dt * 6.0);
    animal.lookTargetYaw = 0;
    animal.lookTargetPitch = 0;
  }

  // 3. Dynamic Walking Leg Swing Kinematics
  if (animal.type === "chicken") {
    const stride = speed > 0.03 ? Math.sin(animal.walkProgress) * 0.55 : Math.sin(animal.walkProgress) * 0.1;
    animal.legs[0].rotation.x = stride;
    animal.legs[1].rotation.x = -stride;

    if (!animal.ground && animal.wings) {
      const flap = Math.sin(animal.animTime * 10.0) * 1.15;
      animal.wings[0].rotation.z = -flap;
      animal.wings[1].rotation.z = flap;
    } else if (animal.wings) {
      animal.wings[0].rotation.z = 0;
      animal.wings[1].rotation.z = 0;
    }
  } else {
    // 4-Leg Alternating Diagonal Trot
    const stride = speed > 0.03 ? Math.sin(animal.walkProgress) * 0.52 : Math.sin(animal.walkProgress) * 0.1;

    if (animal.legs.length === 4) {
      animal.legs[0].rotation.x = stride;  // Front Left
      animal.legs[1].rotation.x = -stride; // Front Right
      animal.legs[2].rotation.x = -stride; // Rear Left
      animal.legs[3].rotation.x = stride;  // Rear Right
    } else if (animal.legs.length === 2) {
      animal.legs[0].rotation.x = stride;
      animal.legs[1].rotation.x = -stride;
    }
  }
}

// =========================================================================
// 7. STRIDER MODEL (Nether Lava Walker)
// =========================================================================
export function createStriderMesh(): {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: THREE.Group[];
  bodyMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const warmMat = new THREE.MeshLambertMaterial({ color: 0x9c3226 }); // warm red in lava
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x732117 });
  const legMat = new THREE.MeshLambertMaterial({ color: 0x8a2c20 });
  const saddleMat = new THREE.MeshLambertMaterial({ color: 0x75431f });

  // 1. Head/Body (0.85 x 0.85 x 0.85)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.1, 0);

  const bodyGeom = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  const bodyMesh = new THREE.Mesh(bodyGeom, warmMat);
  bodyMesh.castShadow = true;
  headGroup.add(bodyMesh);

  // Saddle on top
  const saddleGeom = new THREE.BoxGeometry(0.65, 0.08, 0.65);
  const saddleMesh = new THREE.Mesh(saddleGeom, saddleMat);
  saddleMesh.position.set(0, 0.44, 0);
  headGroup.add(saddleMesh);

  // 6 Hair strands (3 left, 3 right)
  for (const sx of [-1, 1]) {
    for (let h = -1; h <= 1; h++) {
      const hairGeom = new THREE.BoxGeometry(0.08, 0.35, 0.08);
      const hairMesh = new THREE.Mesh(hairGeom, hairMat);
      hairMesh.position.set(sx * 0.46, h * 0.22, 0.1);
      hairMesh.rotation.z = sx * 0.3;
      headGroup.add(hairMesh);
    }
  }

  // Sad large eyes
  const eyeGeom = new THREE.BoxGeometry(0.14, 0.14, 0.02);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilGeom = new THREE.BoxGeometry(0.08, 0.08, 0.03);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x221111 });

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeom, eyeMat);
    eye.position.set(sx * 0.22, 0.05, 0.43);
    const pupil = new THREE.Mesh(pupilGeom, pupilMat);
    pupil.position.set(sx * 0.22, 0.03, 0.435);
    headGroup.add(eye, pupil);
  }

  root.add(headGroup);

  // 2. Two Long Legs with wide feet
  const legs: THREE.Group[] = [];
  const legGeom = new THREE.BoxGeometry(0.18, 0.95, 0.18);
  const footGeom = new THREE.BoxGeometry(0.24, 0.12, 0.36);

  for (const sx of [-0.28, 0.28]) {
    const legGroup = new THREE.Group();
    legGroup.position.set(sx, 0.95, 0);

    const legMesh = new THREE.Mesh(legGeom, legMat);
    legMesh.position.set(0, -0.475, 0);
    legMesh.castShadow = true;
    legGroup.add(legMesh);

    const footMesh = new THREE.Mesh(footGeom, legMat);
    footMesh.position.set(0, -0.9, 0.08);
    legGroup.add(footMesh);

    root.add(legGroup);
    legs.push(legGroup);
  }

  return { root, headGroup, legs, bodyMesh };
}
