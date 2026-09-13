import * as THREE from "three";
import { isSolid } from "../blocks";

/**
 * Arrow projectile system (bow weapon).
 *
 * Infinite ammo; arrows are spawned by the player (bow) and visually by
 * skeletons. One-way combat: player arrows damage hostile mobs; mob arrows are
 * purely visual (they never damage the player). Arrows fly a gravity arc, stick
 * into solid surfaces with hit sparks, and despawn after their range or a short
 * stick timer.
 */
export interface ArrowEntity {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  owner: "player" | "mob";
  root: THREE.Group;
  stuck: boolean;
  stickTime: number;
  dist: number;
}

export const ARROW_GRAV = -18;
export const ARROW_RANGE = 15;
export const ARROW_SPEED = 34;

const _dir = new THREE.Vector3();

export class ArrowManager {
  arrows: ArrowEntity[] = [];
  private scene: THREE.Scene | null = null;
  private seq = 0;

  attach(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnArrow(
    px: number, py: number, pz: number,
    dx: number, dy: number, dz: number,
    speed = ARROW_SPEED,
    owner: "player" | "mob" = "player"
  ): ArrowEntity | null {
    if (!this.scene) return null;
    const g = new THREE.Group();

    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.30),
      new THREE.MeshLambertMaterial({ color: 0xa08850 })
    );
    g.add(stick);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.10, 6),
      new THREE.MeshLambertMaterial({ color: 0xd8d0c0 })
    );
    tip.position.set(0, 0, 0.20);
    g.add(tip);

    const fletchMat = new THREE.MeshLambertMaterial({ color: 0xe9e2d0 });
    for (let k = 0; k < 3; k++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.10), fletchMat);
      const a = (k / 3) * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.035, Math.sin(a) * 0.035, -0.12);
      f.rotation.z = a;
      g.add(f);
    }

    const dir = _dir.set(dx, dy, dz).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    g.position.set(px, py, pz);
    this.scene.add(g);

    const ar: ArrowEntity = {
      id: ++this.seq,
      x: px, y: py, z: pz,
      vx: dir.x * speed, vy: dir.y * speed, vz: dir.z * speed,
      owner,
      root: g,
      stuck: false,
      stickTime: 0,
      dist: 0
    };
    this.arrows.push(ar);
    return ar;
  }

  update(
    dt: number,
    getBlock: (x: number, y: number, z: number) => number,
    mobMgr: { mobs: Array<{ id: string; type: string; x: number; y: number; z: number }>; damageMob?: (id: string, amt: number, onDeath?: (x: number, y: number, z: number) => void) => void },
    fx?: { spawnBurst: (cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, color: THREE.Color, count?: number) => void } | null
  ) {
    const steps = 6;
    const sdt = dt / steps;
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      if (a.stuck) {
        a.stickTime += dt;
        if (a.stickTime > 6) this.remove(i);
        continue;
      }

      let hit = false;
      for (let k = 0; k < steps && !hit; k++) {
        a.vy += ARROW_GRAV * sdt;
        const nx = a.x + a.vx * sdt;
        const ny = a.y + a.vy * sdt;
        const nz = a.z + a.vz * sdt;
        a.dist += Math.hypot(nx - a.x, ny - a.y, nz - a.z);
        a.x = nx; a.y = ny; a.z = nz;

        // Solid block collision → stick into the surface with hit sparks.
        const bid = getBlock(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z));
        if (bid !== 0 && bid !== 39 && bid !== 40 && isSolid(bid)) {
          a.x -= a.vx * sdt; a.y -= a.vy * sdt; a.z -= a.vz * sdt;
          a.stuck = true;
          a.stickTime = 0;
          if (fx) fx.spawnBurst(a.x, a.y, a.z, 0, 0, 0, new THREE.Color(0xcccccc), 8);
          hit = true;
          break;
        }

        // Mob collision — only the player's arrows hurt mobs.
        if (a.owner === "player" && mobMgr && mobMgr.mobs) {
          const ms = mobMgr.mobs;
          for (let m = 0; m < ms.length; m++) {
            const mob = ms[m];
            const d = Math.hypot(mob.x - a.x, mob.y + 0.8 - a.y, mob.z - a.z);
            if (d < 0.6) {
              const dmg = mob.type === "spider" ? 5 : (mob.type === "creeper" ? 6 : 4);
              if (mobMgr.damageMob) mobMgr.damageMob(mob.id, dmg, fx ? (x, y, z) => fx.spawnBurst(x, y + 0.5, z, 0, 1, 0, new THREE.Color(0xff7777), 10) : undefined);
              if (fx) fx.spawnBurst(a.x, a.y, a.z, 0, 0, 0, new THREE.Color(0xff6666), 10);
              this.remove(i);
              hit = true;
              break;
            }
          }
        }
      }
      if (hit) continue;

      // Range cap → despawn silently.
      if (a.dist > ARROW_RANGE) {
        this.remove(i);
        continue;
      }

      a.root.position.set(a.x, a.y, a.z);
      a.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _dir.set(a.vx, a.vy, a.vz).normalize());
    }
  }

  remove(i: number) {
    const a = this.arrows[i];
    if (!a) return;
    this.scene?.remove(a.root);
    a.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material)?.dispose();
      }
    });
    this.arrows.splice(i, 1);
  }

  clear() {
    for (let i = this.arrows.length - 1; i >= 0; i--) this.remove(i);
  }
}