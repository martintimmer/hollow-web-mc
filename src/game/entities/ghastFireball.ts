import * as THREE from "three";
import { isSolid } from "../blocks";
import { disposeEntityRoot } from "../state/gameState";

export interface GhastFireball {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  root: THREE.Group;
  light: THREE.PointLight;
  age: number;
  deflected: boolean;
}

export class GhastFireballManager {
  fireballs: GhastFireball[] = [];
  scene: THREE.Scene | null = null;
  private seq = 0;

  attach(scene: THREE.Scene) {
    this.scene = scene;
  }

  clear() {
    if (!this.scene) return;
    for (const f of this.fireballs) {
      this.scene.remove(f.root); disposeEntityRoot(f.root);
    }
    this.fireballs = [];
  }

  spawnFireball(
    x: number,
    y: number,
    z: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    speed = 16
  ): GhastFireball | null {
    if (!this.scene) return null;

    const dx = targetX - x;
    const dy = targetY - y;
    const dz = targetZ - z;
    const len = Math.hypot(dx, dy, dz) || 1;

    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;
    const vz = (dz / len) * speed;

    const root = new THREE.Group();
    root.position.set(x, y, z);

    // Glowing core
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    const coreGeom = new THREE.SphereGeometry(0.32, 8, 8);
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    root.add(coreMesh);

    // Outer plasma corona
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.65
    });
    const outerGeom = new THREE.SphereGeometry(0.48, 8, 8);
    const outerMesh = new THREE.Mesh(outerGeom, outerMat);
    root.add(outerMesh);

    // Dynamic fire light
    const light = new THREE.PointLight(0xff6600, 2.5, 12);
    root.add(light);

    this.scene.add(root);

    const fb: GhastFireball = {
      id: ++this.seq,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      root,
      light,
      age: 0,
      deflected: false
    };

    this.fireballs.push(fb);
    return fb;
  }

  update(
    dt: number,
    player: { x: number; y: number; z: number },
    damagePlayer: (amount: number) => void,
    getBlock: (x: number, y: number, z: number) => number,
    onExplosion?: (x: number, y: number, z: number) => void,
    onTrail?: (x: number, y: number, z: number) => void
  ) {
    if (!this.scene) return;

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.age += dt;

      // Timeout after 7s
      if (fb.age > 7.0) {
        this.scene.remove(fb.root); disposeEntityRoot(fb.root);
        this.fireballs.splice(i, 1);
        continue;
      }

      // Move
      fb.x += fb.vx * dt;
      fb.y += fb.vy * dt;
      fb.z += fb.vz * dt;
      fb.root.position.set(fb.x, fb.y, fb.z);

      // Flame particles trail
      if (onTrail && Math.random() < 0.7) {
        onTrail(fb.x, fb.y, fb.z);
      }

      // 1. Check Player hit (if not deflected)
      const distToPlayer = Math.hypot(fb.x - player.x, fb.y - (player.y + 0.9), fb.z - player.z);
      if (!fb.deflected && distToPlayer < 1.3) {
        damagePlayer(10);
        if (onExplosion) onExplosion(fb.x, fb.y, fb.z);
        this.scene.remove(fb.root); disposeEntityRoot(fb.root);
        this.fireballs.splice(i, 1);
        continue;
      }

      // 2. Check solid block impact
      const bx = Math.floor(fb.x);
      const by = Math.floor(fb.y);
      const bz = Math.floor(fb.z);
      const blockId = getBlock(bx, by, bz);

      if (blockId > 0 && isSolid(blockId)) {
        if (onExplosion) onExplosion(fb.x, fb.y, fb.z);
        this.scene.remove(fb.root); disposeEntityRoot(fb.root);
        this.fireballs.splice(i, 1);
        continue;
      }
    }
  }

  /**
   * Try to deflect a fireball near the player (e.g. left click punch or arrow strike).
   */
  tryDeflect(
    rayOrigin: { x: number; y: number; z: number },
    rayDir: { x: number; y: number; z: number }
  ): boolean {
    for (const fb of this.fireballs) {
      const toFbX = fb.x - rayOrigin.x;
      const toFbY = fb.y - rayOrigin.y;
      const toFbZ = fb.z - rayOrigin.z;
      const dist = Math.hypot(toFbX, toFbY, toFbZ);

      if (dist < 3.5) {
        // Reverse direction along look vector with 1.4x speed
        const speed = Math.hypot(fb.vx, fb.vy, fb.vz) * 1.4;
        fb.vx = rayDir.x * speed;
        fb.vy = rayDir.y * speed;
        fb.vz = rayDir.z * speed;
        fb.deflected = true;
        return true;
      }
    }
    return false;
  }
}
