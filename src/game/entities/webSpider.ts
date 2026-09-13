import * as THREE from "three";
import { isCobwebId } from "../cobweb";
import { BLOCK_MAP } from "../blocks";
import { disposeEntityRoot } from "../state/gameState";

export interface WebSpiderLeg {
  hip: THREE.Group;
  knee: THREE.Group;
  phase: number;
  baseYaw: number;
  baseKneeZ: number;
  side: 1 | -1;
}

export interface WebSpiderMesh {
  root: THREE.Group;
  headGroup: THREE.Group;
  legs: WebSpiderLeg[];
  abdomen: THREE.Mesh;
}

export function createWebSpiderMesh(): WebSpiderMesh {
  const root = new THREE.Group();

  const chitinMat = new THREE.MeshLambertMaterial({ color: 0x4a3421, emissive: 0x1c1208 });
  const jointMat = new THREE.MeshLambertMaterial({ color: 0x2a1d12, emissive: 0x120b05 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xc49a5a, emissive: 0x3a2a0e });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3524 });
  const fangMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc0, emissive: 0x333026 });
  const silkMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });

  // Cephalothorax (front body segment)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.14, 0.1);
  const cephGeom = new THREE.BoxGeometry(0.2, 0.14, 0.22);
  const ceph = new THREE.Mesh(cephGeom, chitinMat);
  ceph.castShadow = true;
  headGroup.add(ceph);
  // Head plate ridge + pale median spot (reads at tiny sizes)
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.16), jointMat);
  ridge.position.set(0, 0.085, 0.01);
  headGroup.add(ridge);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.1), stripeMat);
  crown.position.set(0, 0.085, -0.02);
  headGroup.add(crown);

  // 8 eyes: 2 large front + 3 small pairs receding (oversized + unlit so the
  // spiderling reads even at hatch size)
  const bigEyeGeom = new THREE.BoxGeometry(0.05, 0.05, 0.025);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(bigEyeGeom, eyeMat);
    eye.position.set(side * 0.05, 0.02, 0.115);
    headGroup.add(eye);
  }
  const smallEyeGeom = new THREE.BoxGeometry(0.028, 0.028, 0.02);
  const rows: Array<[number, number]> = [[0.075, 0.06], [0.085, 0.01], [0.075, -0.04]];
  for (const [spread, z] of rows) {
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(smallEyeGeom, eyeMat);
      eye.position.set(side * spread, 0.045, z);
      headGroup.add(eye);
    }
  }

  // Fangs (chelicerae): angled ivory cones approximated with thin boxes
  for (const side of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.09, 0.025), fangMat);
    fang.position.set(side * 0.055, -0.09, 0.1);
    fang.rotation.x = 0.35;
    fang.castShadow = true;
    headGroup.add(fang);
  }
  // Pedipalps (small feelers beside the fangs)
  for (const side of [-1, 1]) {
    const palp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, 0.02), jointMat);
    palp.position.set(side * 0.1, -0.06, 0.09);
    palp.rotation.x = -0.3;
    headGroup.add(palp);
  }
  root.add(headGroup);

  // Abdomen (rear segment) with 3 pale chevron stripes
  const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.32), chitinMat);
  abdomen.position.set(0, 0.16, -0.22);
  abdomen.castShadow = true;
  root.add(abdomen);
  for (let i = 0; i < 3; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 0.05), stripeMat);
    stripe.position.set(0, 0.2, -0.12 - i * 0.09);
    stripe.rotation.x = -0.15;
    root.add(stripe);
  }
  // Pale rear spot above the spinnerets
  const rearSpot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.05), stripeMat);
  rearSpot.position.set(0, 0.19, -0.37);
  root.add(rearSpot);
  // Spinnerets: twin silk nubs at the rear tip
  for (const side of [-1, 1]) {
    const spin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.07), jointMat);
    spin.position.set(side * 0.05, 0.12, -0.4);
    root.add(spin);
  }
  // Silk dragline: anchors the spider to its web (child of root, so it
  // travels along and always reads as attached)
  const dragline = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.012), silkMat);
  dragline.position.set(0, 0.06, -0.33);
  root.add(dragline);

  // 8 jointed legs: hip group (yaw ripple) + upper segment, knee group (flex)
  // + lower segment. Each side gets its own mirrored geometry so the upper
  // segment starts inside the body (hip at |x|=0.09 < half-width 0.10) and
  // reaches outward — legs are visibly rooted, never crossing the body.
  const legs: WebSpiderLeg[] = [];
  const upperGeomR = new THREE.BoxGeometry(0.18, 0.05, 0.05);
  upperGeomR.translate(0.08, 0, 0);
  const upperGeomL = new THREE.BoxGeometry(0.18, 0.05, 0.05);
  upperGeomL.translate(-0.08, 0, 0);
  const lowerGeomR = new THREE.BoxGeometry(0.16, 0.038, 0.038);
  lowerGeomR.translate(-0.07, 0, 0);
  const lowerGeomL = new THREE.BoxGeometry(0.16, 0.038, 0.038);
  lowerGeomL.translate(0.07, 0, 0);
  const kneeBeadGeom = new THREE.BoxGeometry(0.055, 0.055, 0.055);
  const spreadAngles = [0.65, 0.25, -0.2, -0.6];
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1] as const) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.09, 0.13, 0.14 - i * 0.11);
      const upper = new THREE.Mesh(side > 0 ? upperGeomR : upperGeomL, chitinMat);
      upper.castShadow = true;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.set(side * 0.17, 0, 0);
      const bead = new THREE.Mesh(kneeBeadGeom, stripeMat);
      knee.add(bead);
      const lower = new THREE.Mesh(side > 0 ? lowerGeomR : lowerGeomL, jointMat);
      lower.castShadow = true;
      knee.add(lower);
      hip.add(knee);
      hip.rotation.y = side * spreadAngles[i];
      hip.rotation.z = side * -0.5;
      knee.rotation.z = side * 0.95;
      root.add(hip);
      legs.push({ hip, knee, phase: (i * 2 + (side < 0 ? 0 : 1)) * (Math.PI / 4), baseYaw: side * spreadAngles[i], baseKneeZ: side * 0.95, side });
    }
  }

  return { root, headGroup, legs, abdomen };
}

export function updateWebSpiderKinematics(mesh: WebSpiderMesh, animTime: number, moving: boolean): void {
  const amp = moving ? 1 : 0.15;
  for (const leg of mesh.legs) {
    leg.hip.rotation.y = leg.baseYaw + Math.sin(animTime * 7 + leg.phase) * 0.28 * amp;
    leg.hip.rotation.z = leg.side * -0.5 + Math.abs(Math.cos(animTime * 7 + leg.phase)) * 0.08 * amp;
    leg.knee.rotation.z = leg.baseKneeZ + Math.cos(animTime * 7 + leg.phase) * 0.3 * amp;
  }
  mesh.abdomen.position.y = 0.16 + Math.sin(animTime * 3.1) * 0.008;
  mesh.abdomen.scale.set(1, 1 + Math.sin(animTime * 3.1) * 0.03, 1);
}

export interface WebSpiderEntity {
  id: string;
  root: THREE.Group;
  webX: number;
  webY: number;
  webZ: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tx: number;
  ty: number;
  tz: number;
  retargetTimer: number;
  vy: number;
  grounded: boolean;
  animTime: number;
  hatchDay: number;
  name?: string | null;
  ownerId?: string | null;
  sex?: string;
  nameplate?: THREE.Object3D | null;
  mesh: WebSpiderMesh;
}

export interface CarriedSpider {
  hatchDay: number;
  name?: string | null;
  ownerId?: string | null;
  sex?: string;
}

// Hatchlings are 8/100 of a block (minimum that still reads in gameplay);
// past 4 days old they are already big (full 25/100 size). Pure for sim tests.
export function webSpiderScaleForAge(ageDays: number): number {
  const age = Math.max(0, Math.min(4, Math.floor(ageDays)));
  return 0.08 + age * (0.17 / 4);
}

export function webSpiderIsBig(ageDays: number): boolean {
  return ageDays > 4;
}

const MAX_WEB_SPIDERS = 32;

export class WebSpiderManager {
  spiders = new Map<string, WebSpiderEntity>();
  scene: THREE.Scene | null = null;

  init(scene: THREE.Scene): void {
    this.scene = scene;
  }

  clear(): void {
    if (this.scene) {
      for (const sp of this.spiders.values()) {
        this.scene.remove(sp.mesh.root);
        disposeEntityRoot(sp.mesh.root);
      }
    }
    this.spiders.clear();
  }

  spawn(webX: number, webY: number, webZ: number, hatchDay = 0): boolean {
    return this.release(webX, webY, webZ, { hatchDay });
  }

  release(webX: number, webY: number, webZ: number, data: CarriedSpider): boolean {
    if (!this.scene) return false;
    const key = `${webX},${webY},${webZ}`;
    if (this.spiders.has(key)) return false;
    if (this.spiders.size >= MAX_WEB_SPIDERS) return false;
    const mesh = createWebSpiderMesh();
    mesh.root.scale.setScalar(webSpiderScaleForAge(0));
    const angle = Math.random() * Math.PI * 2;
    const sp: WebSpiderEntity = {
      id: `webspider_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      root: mesh.root,
      webX,
      webY,
      webZ,
      x: webX + 0.5 + Math.cos(angle) * 0.25,
      y: webY + 1.0,
      z: webZ + 0.5 + Math.sin(angle) * 0.25,
      yaw: angle,
      tx: webX + 0.5,
      ty: webY + 1.0,
      tz: webZ + 0.5,
      retargetTimer: 2 + Math.random() * 3,
      vy: 0,
      grounded: false,
      animTime: Math.random() * 10,
      hatchDay: data.hatchDay,
      name: data.name ?? null,
      ownerId: data.ownerId ?? null,
      sex: data.sex ?? (Math.random() < 0.5 ? "male" : "female"),
      nameplate: null,
      mesh,
    };
    mesh.root.position.set(sp.x, sp.y, sp.z);
    mesh.root.rotation.y = sp.yaw;
    this.scene.add(mesh.root);
    this.spiders.set(key, sp);
    return true;
  }

  // Mug catch: lift the spider off its web, keeping age/name/owner for release.
  take(webX: number, webY: number, webZ: number): CarriedSpider | null {
    const key = `${webX},${webY},${webZ}`;
    const sp = this.spiders.get(key);
    if (!sp || sp.grounded) return null;
    if (this.scene) this.scene.remove(sp.mesh.root);
    disposeEntityRoot(sp.mesh.root);
    this.spiders.delete(key);
    return { hatchDay: sp.hatchDay, name: sp.name ?? null, ownerId: sp.ownerId ?? null, sex: sp.sex };
  }

  spiderAt(webX: number, webY: number, webZ: number): WebSpiderEntity | null {
    return this.spiders.get(`${webX},${webY},${webZ}`) ?? null;
  }

  // Aim test for sign-naming: nearest spider roughly in front of the crosshair.
  aimSpider(px: number, py: number, pz: number, dx: number, dy: number, dz: number, maxDist = 4): WebSpiderEntity | null {
    let best: WebSpiderEntity | null = null;
    let bestScore = Infinity;
    for (const sp of this.spiders.values()) {
      const sx = sp.x - px;
      const sy = (sp.y + 0.1) - py;
      const sz = sp.z - pz;
      const dist = Math.hypot(sx, sy, sz);
      if (dist > maxDist || dist < 0.25) continue;
      const dot = (sx * dx + sy * dy + sz * dz) / dist;
      if (dot < 0.5) continue;
      const score = dist * (2 - dot);
      if (score < bestScore) { bestScore = score; best = sp; }
    }
    return best;
  }

  // Owned spiders for the pets menu (mirrors the animal pet filter).
  ownedEntries(ownerId: string): Array<{ id: string; type: string; name: string | null; sex: string; ownerId: string | null; x: number; y: number; z: number }> {
    const out: Array<{ id: string; type: string; name: string | null; sex: string; ownerId: string | null; x: number; y: number; z: number }> = [];
    for (const sp of this.spiders.values()) {
      if (!!ownerId && sp.ownerId === ownerId) {
        out.push({ id: sp.id, type: "spider", name: sp.name ?? null, sex: sp.sex ?? "female", ownerId: sp.ownerId ?? null, x: sp.x, y: sp.y, z: sp.z });
      }
    }
    return out;
  }

  removeAt(webX: number, webY: number, webZ: number): void {
    const key = `${webX},${webY},${webZ}`;
    const sp = this.spiders.get(key);
    if (!sp) return;
    if (this.scene) this.scene.remove(sp.mesh.root);
    disposeEntityRoot(sp.mesh.root);
    this.spiders.delete(key);
  }

  private pickWebTarget(sp: WebSpiderEntity): void {
    const roll = Math.random();
    if (roll < 0.55) {
      // Top face stroll
      sp.tx = sp.webX + 0.12 + Math.random() * 0.76;
      sp.ty = sp.webY + 1.0;
      sp.tz = sp.webZ + 0.12 + Math.random() * 0.76;
    } else if (roll < 0.85) {
      // Side faces: cling just outside the block
      const face = Math.floor(Math.random() * 4);
      sp.ty = sp.webY + 0.2 + Math.random() * 0.65;
      if (face === 0) { sp.tx = sp.webX - 0.14; sp.tz = sp.webZ + 0.1 + Math.random() * 0.8; }
      else if (face === 1) { sp.tx = sp.webX + 1.14; sp.tz = sp.webZ + 0.1 + Math.random() * 0.8; }
      else if (face === 2) { sp.tz = sp.webZ - 0.14; sp.tx = sp.webX + 0.1 + Math.random() * 0.8; }
      else { sp.tz = sp.webZ + 1.14; sp.tx = sp.webX + 0.1 + Math.random() * 0.8; }
    } else {
      // Inside the web mass
      sp.tx = sp.webX + 0.2 + Math.random() * 0.6;
      sp.ty = sp.webY + 0.3 + Math.random() * 0.5;
      sp.tz = sp.webZ + 0.2 + Math.random() * 0.6;
    }
    sp.retargetTimer = 3 + Math.random() * 4;
  }

  private groundYAt(getBlock: (x: number, y: number, z: number) => number, x: number, z: number, fromY: number): number {
    const fx = Math.floor(x), fz = Math.floor(z);
    for (let gy = Math.floor(fromY); gy > Math.floor(fromY) - 8 && gy > 0; gy--) {
      if (BLOCK_MAP.get(getBlock(fx, gy - 1, fz))?.solid) return gy;
    }
    return Math.max(1, Math.floor(fromY));
  }

  update(dt: number, getBlock: (x: number, y: number, z: number) => number, dayCount = 0): void {
    for (const [key, sp] of [...this.spiders]) {
      const age = dayCount - sp.hatchDay;
      sp.mesh.root.scale.setScalar(webSpiderScaleForAge(age));
      sp.animTime += dt * 2.2;
      const webGone = !isCobwebId(getBlock(sp.webX, sp.webY, sp.webZ));

      if (webGone && !sp.grounded) {
        if (webSpiderIsBig(age)) {
          // Big spiders fall to the ground and remain (as pets, if claimed).
          sp.grounded = true;
          sp.vy = 0;
          sp.retargetTimer = 0;
        } else {
          if (this.scene) this.scene.remove(sp.mesh.root);
          disposeEntityRoot(sp.mesh.root);
          this.spiders.delete(key);
          continue;
        }
      }

      if (sp.grounded) {
        // Gravity fall, then slow ground wander near the landing spot.
        const g = this.groundYAt(getBlock, sp.x, sp.z, sp.y + 0.5);
        if (sp.y > g + 0.001) {
          sp.vy = Math.max(-20, sp.vy - 25 * dt);
          sp.y = Math.max(g, sp.y + sp.vy * dt);
        } else {
          sp.y = g;
          sp.vy = 0;
          sp.retargetTimer -= dt;
          const dx = sp.tx - sp.x, dz = sp.tz - sp.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.08 || sp.retargetTimer <= 0) {
            const a = Math.random() * Math.PI * 2;
            const r = 0.5 + Math.random() * 2.0;
            sp.tx = sp.webX + 0.5 + Math.cos(a) * r;
            sp.tz = sp.webZ + 0.5 + Math.sin(a) * r;
            sp.ty = this.groundYAt(getBlock, sp.tx, sp.tz, sp.y + 2);
            sp.retargetTimer = 4 + Math.random() * 4;
          } else {
            const step = Math.min(dist, 0.35 * dt);
            sp.x += (dx / dist) * step;
            sp.z += (dz / dist) * step;
            sp.y += (sp.ty - sp.y) * Math.min(1, 3 * dt);
            this.faceMotion(sp, dx, dz, dt);
          }
        }
      } else {
        // Web crawl: top face, side faces, and inside the web mass.
        sp.retargetTimer -= dt;
        const dx = sp.tx - sp.x, dy = sp.ty - sp.y, dz = sp.tz - sp.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < 0.06 || sp.retargetTimer <= 0) {
          this.pickWebTarget(sp);
        } else {
          const step = Math.min(dist, 0.3 * dt);
          sp.x += (dx / dist) * step;
          sp.y += (dy / dist) * step;
          sp.z += (dz / dist) * step;
          this.faceMotion(sp, dx, dz, dt);
        }
      }
      sp.mesh.root.position.set(sp.x, sp.y, sp.z);
      sp.mesh.root.rotation.y = sp.yaw;
      updateWebSpiderKinematics(sp.mesh, sp.animTime, true);
    }
  }

  private faceMotion(sp: WebSpiderEntity, dx: number, dz: number, dt: number): void {
    if (Math.hypot(dx, dz) < 1e-6) return;
    const targetYaw = Math.atan2(dx, dz);
    let d = targetYaw - sp.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    sp.yaw += d * Math.min(1, 6 * dt);
  }
}
