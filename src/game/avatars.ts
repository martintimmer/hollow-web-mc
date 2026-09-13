/* Remote player avatar factory (extracted from Game.tsx — R2) */
import * as THREE from "three";

export function createRemoteAvatar(username: string, skinColor = "#e0913a"): THREE.Group {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(skinColor) });
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0x2288cc });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x334488 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x4a2d18 });

  // 1. Head (0.5 x 0.5 x 0.5)
  const headGeom = new THREE.BoxGeometry(0.48, 0.48, 0.48);
  const head = new THREE.Mesh(headGeom, skinMat);
  head.position.y = 1.48;
  head.castShadow = true;
  group.add(head);

  // Hair cap
  const hairGeom = new THREE.BoxGeometry(0.50, 0.20, 0.50);
  const hair = new THREE.Mesh(hairGeom, hairMat);
  hair.position.set(0, 1.64, 0);
  group.add(hair);

  // 2. Torso (0.5 x 0.72 x 0.26)
  const torsoGeom = new THREE.BoxGeometry(0.5, 0.72, 0.26);
  const torso = new THREE.Mesh(torsoGeom, shirtMat);
  torso.position.y = 0.88;
  torso.castShadow = true;
  group.add(torso);

  // 3. Arms (0.22 x 0.70 x 0.22)
  const armGeom = new THREE.BoxGeometry(0.22, 0.70, 0.22);
  const leftArm = new THREE.Mesh(armGeom, skinMat);
  leftArm.position.set(-0.38, 0.87, 0);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeom, skinMat);
  rightArm.position.set(0.38, 0.87, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // 4. Legs (0.24 x 0.72 x 0.24)
  const legGeom = new THREE.BoxGeometry(0.23, 0.72, 0.23);
  const leftLeg = new THREE.Mesh(legGeom, pantsMat);
  leftLeg.position.set(-0.13, 0.36, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeom, pantsMat);
  rightLeg.position.set(0.13, 0.36, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // 5. Floating Nameplate (2D Canvas Sprite)
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 8, 256, 48);
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
  ctx.strokeRect(0, 8, 256, 48);
  ctx.fillStyle = "#ffffa0";
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(username, 128, 32);

  const nameTexture = new THREE.CanvasTexture(canvas);
  nameTexture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: nameTexture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.y = 2.0;
  sprite.scale.set(1.6, 0.4, 1);
  sprite.renderOrder = 999; // always on top of everything
  group.add(sprite);

  return group;
}

