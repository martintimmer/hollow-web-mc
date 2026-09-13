import * as THREE from "three";
import { isSim, isSimPort } from "../../services/simMode";
import { PR, PH, EYE, FLY, SPRINT, WALK, GRAV, JUMP } from "../world";
import type { GameState } from "../state/gameState";
import { isSolid, isStair, isFence, isSlab, isOpaque, BLOCK_MAP } from "../blocks";
import { isCobwebId } from "../cobweb";
import { getBlock } from "../world/chunkData";
import type { VillageData } from "../terrain/terrainGenerator";

export function collides(s: GameState, x: number, y: number, z: number): boolean {
  const x0 = Math.floor(x - PR), x1 = Math.floor(x + PR);
  const y0 = Math.floor(y - 0.65), y1 = Math.floor(y + PH - 0.001);
  const z0 = Math.floor(z - PR), z1 = Math.floor(z + PR);

  for (let yy = y0; yy <= y1; yy++) {
    for (let zz = z0; zz <= z1; zz++) {
      for (let xx = x0; xx <= x1; xx++) {
        const blk = getBlock(s, xx, yy, zz);
        if (!blk) continue;

        if (isFence(blk)) {
          // Height range: yy to yy + 1.5
          if (y < yy + 1.5 - 0.001 && y + PH > yy) {
            const plMinX = x - PR, plMaxX = x + PR;
            const plMinZ = z - PR, plMaxZ = z + PR;

            // 1. Central Post (4x16x4 px = 0.375 to 0.625)
            if (plMaxX > xx + 0.375 && plMinX < xx + 0.625 && plMaxZ > zz + 0.375 && plMinZ < zz + 0.625) {
              return true;
            }

            // 2. Connecting Crossrails
            const connects = (nx: number, ny: number, nz: number) => {
              const nb = getBlock(s, nx, ny, nz);
              if (!nb) return false;
              return isFence(nb) || isOpaque(nb) || (isSolid(nb) && !BLOCK_MAP.get(nb)?.stair && !BLOCK_MAP.get(nb)?.slab);
            };

            // North rail (z - 1): z in [zz, zz + 0.375], x in [xx + 0.4375, xx + 0.5625]
            if (connects(xx, yy, zz - 1)) {
              if (plMaxX > xx + 0.4375 && plMinX < xx + 0.5625 && plMaxZ > zz && plMinZ < zz + 0.375) return true;
            }
            // South rail (z + 1): z in [zz + 0.625, zz + 1.0], x in [xx + 0.4375, xx + 0.5625]
            if (connects(xx, yy, zz + 1)) {
              if (plMaxX > xx + 0.4375 && plMinX < xx + 0.5625 && plMaxZ > zz + 0.625 && plMinZ < zz + 1.0) return true;
            }
            // West rail (x - 1): x in [xx, xx + 0.375], z in [zz + 0.4375, zz + 0.5625]
            if (connects(xx - 1, yy, zz)) {
              if (plMaxX > xx && plMinX < xx + 0.375 && plMaxZ > zz + 0.4375 && plMinZ < zz + 0.5625) return true;
            }
            // East rail (x + 1): x in [xx + 0.625, xx + 1.0], z in [zz + 0.4375, zz + 0.5625]
            if (connects(xx + 1, yy, zz)) {
              if (plMaxX > xx + 0.625 && plMinX < xx + 1.0 && plMaxZ > zz + 0.4375 && plMinZ < zz + 0.5625) return true;
            }
          }
          continue;
        }

        if (isSlab(blk)) {
          const isTop = s.blockDirs.get(`${xx},${yy},${zz}`) === 1;
          const slabY0 = isTop ? yy + 0.5 : yy;
          const slabY1 = isTop ? yy + 1.0 : yy + 0.5;
          if (y < slabY1 - 0.005 && y + PH > slabY0) return true;
          continue;
        }

        if (isStair(blk)) {
          if (y < yy + 0.5 - 0.005) return true;
          if (y < yy + 1.0 - 0.005) {
            const facing = s.blockDirs.get(`${xx},${yy},${zz}`) ?? 0;
            if (facing === 0 && z + PR > zz + 0.5 && z - PR < zz + 1.0) return true;
            if (facing === 1 && z - PR < zz + 0.5 && z + PR > zz) return true;
            if (facing === 2 && x + PR > xx + 0.5 && x - PR < xx + 1.0) return true;
            if (facing === 3 && x - PR < xx + 0.5 && x + PR > xx) return true;
          }
          continue;
        } else if (isSolid(blk)) {
          if (y < yy + 1.0 - 0.005 && y + PH > yy) return true;
        }
      }
    }
  }
  return false;
}

export function damagePlayer(
  s: GameState,
  rawAmount: number,
  callbacks: {
    playHurt: () => void;
    playDeath: () => void;
    setHealth: (h: number) => void;
    setDead: (d: boolean) => void;
    setHurtTick: (fn: (t: number) => number) => void;
  }
): void {
  // Mortal only in production survival: never in creative, peaceful,
  // or the sim environment.
  if (s.creative || s.dead || rawAmount <= 0 || s.gameplayMode === "peaceful" || isSimPort()) return;
  const reduction = Math.min(0.72, (s.armorDefense || 0) * 0.036);
  const dmg = Math.max(1, Math.round(rawAmount * (1 - reduction)));
  const nextHealth = Math.max(0, (s.health ?? 20) - dmg);
  s.health = nextHealth;
  callbacks.setHealth(nextHealth);
  s.lastDamageAt = performance.now();
  callbacks.setHurtTick(t => t + 1);

  if (nextHealth <= 0) {
    s.dead = true;
    callbacks.setDead(true);
    s.active = false;
    s.steering = false;
    s.keys = {};
    document.exitPointerLock?.();
    callbacks.playDeath();
  } else {
    callbacks.playHurt();
  }
}

export function healPlayer(
  s: GameState,
  amount: number,
  setHealth: (h: number) => void
): void {
  if (s.dead) return;
  const next = Math.min(20, (s.health ?? 20) + amount);
  s.health = next;
  setHealth(next);
}

export function processFallingBlocks(
  s: GameState,
  dt: number,
  callbacks: {
    edit: (x: number, y: number, z: number, id: number, recordUndo?: boolean) => void;
    playDig: (id: number) => void;
    checkFallingBlocks: (x: number, y: number, z: number) => void;
  }
): void {
  for (let i = s.fallingBlocks.length - 1; i >= 0; i--) {
    const fb = s.fallingBlocks[i];
    fb.vy -= 26.0 * dt;
    fb.y += fb.vy * dt;
    fb.mesh.position.y = fb.y + 0.5;

    const targetY = Math.floor(fb.y);
    const belowId = getBlock(s, fb.x, targetY, fb.z);

    if (belowId !== 0 && belowId !== 39 && belowId !== 40) {
      if (s.scene) s.scene.remove(fb.mesh);
      fb.mesh.geometry.dispose();
      s.fallingBlocks.splice(i, 1);

      const destY = targetY + 1;
      if (belowId === 8 || belowId === 80 || belowId === 81 || belowId === 84 || belowId === 124 || belowId === 125 || belowId === 126) {
        callbacks.playDig(fb.blockId);
        if (s.fx) {
          const col = fb.blockId === 10 ? new THREE.Color(0xdcc88a) : new THREE.Color(0x8a8a8a);
          s.fx.spawnBurst(fb.x + 0.5, destY + 0.5, fb.z + 0.5, 0, 1, 0, col, 12);
        }
      } else {
        callbacks.edit(fb.x, destY, fb.z, fb.blockId, false);
        callbacks.playDig(fb.blockId);
        if (s.fx) {
          const col = fb.blockId === 10 ? new THREE.Color(0xdcc88a) : new THREE.Color(0x8a8a8a);
          s.fx.spawnBurst(fb.x + 0.5, destY + 0.5, fb.z + 0.5, 0, 1, 0, col, 6);
        }
        callbacks.checkFallingBlocks(fb.x, destY + 1, fb.z);
      }
    }
  }
}

export interface PlayerStepTimers {
  oxygenTimer: number;
  lavaTimer: number;
  magmaTimer: number;
  cactusTimer: number;
  suffocationTimer: number;
  randomTickTimer: number;
  drownTimer: number;
  freezeTimer: number;
  freezeHurtTimer: number;
  regenTimer: number;
  stepSoundT: number;
  posInfoTimer: number;
  posInfoKey: string;
  lastCompassSent: number;
  lastVillageKey: string;
  wasInWater: boolean;
}

export interface PlayerPhysicsCtx {
  s: GameState;
  timers: PlayerStepTimers;
  getBlock: (x: number, y: number, z: number) => number;
  edit: (x: number, y: number, z: number, id: number, broadcast?: boolean) => void;
  showToast: (msg: string) => void;
  respawn: () => void;
  damagePlayer: (raw: number) => void;
  playStep: (id: number) => void;
  playDig: (id: number) => void;
  playSplash: () => void;
  processRandomTicks: () => void;
  checkFallingBlocks: (x: number, y: number, z: number) => void;
  findNearestVillage: (x: number, z: number) => (VillageData & { dist: number }) | null;
  setHealth: (h: number) => void;
  setOxygenBubbles: (v: number | ((prev: number) => number)) => void;
  setPosInfo: (p: { x: number; y: number; z: number; heading: string; state: string }) => void;
  setCompassHeading: (a: number) => void;
  setNearestVillage: (v: { name: string; x: number; z: number; dist: number; angle: number; bearing: string } | null) => void;
}

export interface PlayerPhysics {
  stepPlayerPhysics: (dt: number) => void;
}

const collideAt = collides;
const EYE_SNEAK = 1.27; // vanilla crouch eye height (~1.5-block camera)

export function createPlayerPhysics(ctx: PlayerPhysicsCtx): PlayerPhysics {
  const s = ctx.s;
  const T = ctx.timers;
  const collides = (x: number, y: number, z: number) => collideAt(s, x, y, z);

  function findRestY(px: number, py: number, pz: number): { restY: number; landedOn: number } {
    const x0 = Math.floor(px - PR), x1 = Math.floor(px + PR);
    const z0 = Math.floor(pz - PR), z1 = Math.floor(pz + PR);
    const yy = Math.floor(py);
    let foundFence = false;
    let fenceTopY = yy + 1.5;
    let foundStair = false;
    let foundSlab = false;
    let isTopSlab = false;
    let isUpperStep = false;
    let isSolidFloor = false;
    let landedOn = ctx.getBlock(Math.floor(px), Math.floor(py), Math.floor(pz));

    for (const checkY of [yy, yy - 1]) {
      for (let zz = z0; zz <= z1; zz++) {
        for (let xx = x0; xx <= x1; xx++) {
          const b = ctx.getBlock(xx, checkY, zz);
          if (b) landedOn = b;
          if (isFence(b)) {
            const plMinX = px - PR, plMaxX = px + PR;
            const plMinZ = pz - PR, plMaxZ = pz + PR;

            let overlapsFence = false;
            if (plMaxX > xx + 0.375 && plMinX < xx + 0.625 && plMaxZ > zz + 0.375 && plMinZ < zz + 0.625) {
              overlapsFence = true;
            }
            const connects = (cnx: number, cny: number, cnz: number) => {
              const nb = ctx.getBlock(cnx, cny, cnz);
              if (!nb) return false;
              return isFence(nb) || isOpaque(nb) || (isSolid(nb) && !BLOCK_MAP.get(nb)?.stair && !BLOCK_MAP.get(nb)?.slab);
            };
            if (connects(xx, checkY, zz - 1) && plMaxX > xx + 0.4375 && plMinX < xx + 0.5625 && plMaxZ > zz && plMinZ < zz + 0.375) overlapsFence = true;
            if (connects(xx, checkY, zz + 1) && plMaxX > xx + 0.4375 && plMinX < xx + 0.5625 && plMaxZ > zz + 0.625 && plMinZ < zz + 1.0) overlapsFence = true;
            if (connects(xx - 1, checkY, zz) && plMaxX > xx && plMinX < xx + 0.375 && plMaxZ > zz + 0.4375 && plMinZ < zz + 0.5625) overlapsFence = true;
            if (connects(xx + 1, checkY, zz) && plMaxX > xx + 0.625 && plMinX < xx + 1.0 && plMaxZ > zz + 0.4375 && plMinZ < zz + 0.5625) overlapsFence = true;

            if (overlapsFence && py <= checkY + 1.5 && s.player.y >= checkY + 1.5 - 0.35) {
              foundFence = true;
              fenceTopY = Math.max(fenceTopY, checkY + 1.5);
            }
          } else if (checkY === yy) {
            if (isSlab(b)) {
              foundSlab = true;
              if (s.blockDirs.get(`${xx},${yy},${zz}`) === 1) isTopSlab = true;
            } else if (isStair(b)) {
              foundStair = true;
              const facing = s.blockDirs.get(xx + "," + yy + "," + zz) ?? 0;
              if (facing === 0 && pz + PR > zz + 0.5) isUpperStep = true;
              else if (facing === 1 && pz - PR < zz + 0.5) isUpperStep = true;
              else if (facing === 2 && px + PR > xx + 0.5) isUpperStep = true;
              else if (facing === 3 && px - PR < xx + 0.5) isUpperStep = true;
            } else if (isSolid(b)) {
              isSolidFloor = true;
            }
          }
        }
      }
    }

    let restY = yy + 1.0;
    if (foundFence) {
      restY = fenceTopY;
    } else if (foundSlab && !isTopSlab && !isSolidFloor) {
      restY = yy + 0.5;
    } else if (foundStair && !isUpperStep && !isSolidFloor) {
      restY = yy + 0.5;
    }
    return { restY, landedOn };
  }

  function stepPlayerPhysics(dt: number) {
    if (s.riddenAnimal) {
      const a = s.riddenAnimal;
      const MOUNT_H = a.type === "horse" ? 1.62 : (a.type === "pig" ? 1.18 : (a.type === "sheep" ? 1.32 : 1.35));
      s.player.x = a.x;
      s.player.y = a.y + MOUNT_H;
      s.player.z = a.z;
      s.player.vx = s.player.vy = s.player.vz = 0;
      s.player.fly = false;
      s.player.ground = true;
      const shiftNow = !!s.keys["ShiftLeft"];
      if (shiftNow && !s.rideShiftHeld && performance.now() - (s.lastDismountAt || 0) > 300) {
        s.lastDismountAt = performance.now();
        const ox = a.x + Math.sin(a.yaw) * 1.7;
        const oz = a.z + Math.cos(a.yaw) * 1.7;
        let gy = Math.max(4, Math.floor(a.y) - 1);
        while (gy > 4 && !isSolid(ctx.getBlock(Math.floor(ox), gy, Math.floor(oz)))) gy--;
        s.player.x = ox;
        s.player.z = oz;
        s.player.y = gy + 1.05;
        a.ridden = false;
        s.riddenAnimal = null;
        s.rideShiftHeld = false;
        ctx.showToast("🐾 Dismounted");
      } else {
        s.rideShiftHeld = shiftNow;
      }
      if (s.camera) {
        s.camera.position.set(s.player.x, s.player.y + EYE, s.player.z);
        s.camera.rotation.y = s.player.yaw;
        s.camera.rotation.x = s.player.pitch;
      }
      return;
    }
    // Keep in sync with canToggleFly() in interaction/gameInput.ts:
    // sim may fly without creative mode.
    const isFlying = (s.creative || isSim()) && s.player.fly;
    const sprinting = !isFlying && s.sprintHold && !s.sneak;
    const spd = isFlying ? FLY : (sprinting ? SPRINT : WALK) * (s.sneak ? 0.3 : 1);
    const eyeH = s.sneak ? EYE_SNEAK : EYE;
    let fx = 0, fz = 0;
    if (s.keys["KeyW"]) fz -= 1;
    if (s.keys["KeyS"]) fz += 1;
    if (s.keys["KeyA"]) fx -= 1;
    if (s.keys["KeyD"]) fx += 1;
    const len = Math.hypot(fx, fz) || 1;
    fx /= len; fz /= len;
    const sy = Math.sin(s.player.yaw), cy = Math.cos(s.player.yaw);
    const wx =  fx * cy + fz * sy;
    const wz = -fx * sy + fz * cy;
    const moving = fx !== 0 || fz !== 0;

    const feetX = Math.floor(s.player.x), feetY = Math.floor(s.player.y), feetZ = Math.floor(s.player.z);
    const headX = Math.floor(s.player.x), headY = Math.floor(s.player.y + eyeH), headZ = Math.floor(s.player.z);
    const feetBlock = ctx.getBlock(feetX, feetY, feetZ);
    const headBlock = ctx.getBlock(headX, headY, headZ);
    const inWater = (feetBlock === 39 || headBlock === 39);
    const inLava = (feetBlock === 40 || headBlock === 40);
    const inWeb = isCobwebId(feetBlock) || isCobwebId(headBlock);
    const submerged = (headBlock === 39);

    let groundBlock = 0;
    if (!isFlying) {
      groundBlock = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y - 0.2), Math.floor(s.player.z));
      if (!groundBlock) {
        groundBlock = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y - 0.6), Math.floor(s.player.z));
      }
    }
    const isIce = (groundBlock === 52 || groundBlock === 53);
    const isSoulSand = (groundBlock === 57);

    if (isFlying || inWater || inLava || s.creative) s.fallPeakY = s.player.y;
    else if (s.player.ground) s.fallPeakY = s.player.y;
    else s.fallPeakY = Math.max(s.fallPeakY, s.player.y);

    if (isFlying) {
      const flyTargetVx = moving ? wx * spd : 0;
      const flyTargetVz = moving ? wz * spd : 0;

      if (moving) {
        s.player.vx += (flyTargetVx - s.player.vx) * Math.min(1, 14 * dt);
        s.player.vz += (flyTargetVz - s.player.vz) * Math.min(1, 14 * dt);
      } else {
        const drag = Math.pow(0.86, dt * 60);
        s.player.vx *= drag;
        s.player.vz *= drag;
        if (Math.hypot(s.player.vx, s.player.vz) < 0.05) {
          s.player.vx = 0;
          s.player.vz = 0;
        }
      }

      let up = 0;
      if (s.keys["Space"]) up += 1;
      if (s.keys["ShiftLeft"]) up -= 1;
      const flyTargetVy = up * spd * 0.75;
      if (up !== 0) {
        s.player.vy += (flyTargetVy - s.player.vy) * Math.min(1, 16 * dt);
      } else {
        s.player.vy *= Math.pow(0.82, dt * 60);
        if (Math.abs(s.player.vy) < 0.05) s.player.vy = 0;
      }
      s.player.ground = false;
    } else if (inWater) {
      const swimSpeed = (sprinting ? SPRINT * 0.75 : WALK * 0.85);
      const tx = moving ? wx * swimSpeed : 0, tz = moving ? wz * swimSpeed : 0;
      s.player.vx += (tx - s.player.vx) * Math.min(1, 6 * dt);
      s.player.vz += (tz - s.player.vz) * Math.min(1, 6 * dt);

      let baseWaterBlock = 0;
      for (let checkY = feetY; checkY >= Math.max(1, feetY - 20); checkY--) {
        const b = ctx.getBlock(feetX, checkY, feetZ);
        if (b !== 39 && b !== 0) {
          baseWaterBlock = b;
          break;
        }
      }
      if (baseWaterBlock === 57) {
        s.player.vy = Math.min(12, s.player.vy + 20 * dt);
        s.oxygen = 10;
      } else if (baseWaterBlock === 99) {
        s.player.vy = Math.max(-10, s.player.vy - 16 * dt);
      } else {
        s.player.vy = Math.max(-6, s.player.vy - (GRAV * 0.15) * dt);
      }

      if (s.keys["Space"]) {
        s.player.vy = Math.min(3.8, s.player.vy + 16 * dt);
      } else if (s.keys["ShiftLeft"]) {
        s.player.vy = Math.max(-4.2, s.player.vy - 14 * dt);
      } else if (baseWaterBlock !== 57 && baseWaterBlock !== 99) {
        s.player.vy *= Math.pow(0.85, dt * 60);
      }
      s.player.ground = false;
    } else if (inLava) {
      const lavaSpeed = WALK * 0.45;
      const tx = moving ? wx * lavaSpeed : 0, tz = moving ? wz * lavaSpeed : 0;
      s.player.vx += (tx - s.player.vx) * Math.min(1, 3 * dt);
      s.player.vz += (tz - s.player.vz) * Math.min(1, 3 * dt);
      s.player.vy = Math.max(-2.5, s.player.vy - (GRAV * 0.08) * dt);
      if (s.keys["Space"]) {
        s.player.vy = Math.min(2.0, s.player.vy + 10 * dt);
      }
      s.player.ground = false;
    } else {
      let moveSpd = spd;
      if (isSoulSand) moveSpd *= 0.5;
      if (inWeb) moveSpd *= 0.25;

      const accel = s.player.ground ? (isIce ? 2.5 : 12) : 3.5;
      const tx = moving ? wx * moveSpd : 0, tz = moving ? wz * moveSpd : 0;
      s.player.vx += (tx - s.player.vx) * Math.min(1, accel * dt);
      s.player.vz += (tz - s.player.vz) * Math.min(1, accel * dt);

      if (!moving && s.player.ground) {
        const drag = Math.pow(isIce ? 0.98 : 0.65, dt * 60);
        s.player.vx *= drag;
        s.player.vz *= drag;
      }

      // Gravity always accelerates downward unless swimming/climbing/flying
      s.player.vy = Math.max(-78, s.player.vy - GRAV * dt); // vanilla terminal fall ~78 m/s

      const onLadder = (feetBlock === 140 || headBlock === 140);
      if (onLadder) {
        s.fallPeakY = s.player.y;
        s.player.vy = Math.max(-2.5, s.player.vy);
        if (s.keys["Space"]) {
          s.player.vy = 3.2;
        } else if (s.keys["ShiftLeft"]) {
          s.player.vy = 0;
        }
        s.player.ground = false;
      } else if (inWeb) {
        s.fallPeakY = s.player.y;
        s.player.vy = Math.max(-1.5, s.player.vy);
        if (s.keys["Space"]) {
          s.player.vy = Math.min(2.2, s.player.vy + 30 * dt);
        } else if (s.keys["ShiftLeft"]) {
          s.player.vy = Math.max(-3, s.player.vy - 10 * dt);
        }
        s.player.ground = false;
      } else if (s.keys["Space"] && s.player.ground) {
        s.player.vy = JUMP;
        if (isIce && sprinting) {
          s.player.vx *= 1.15;
          s.player.vz *= 1.15;
        }
        s.player.ground = false;
      }
    }

    if (isFlying) {
      s.fallPeakY = s.player.y;
      const nx = s.player.x + s.player.vx * dt;
      const ny = s.player.y + s.player.vy * dt;
      const nz = s.player.z + s.player.vz * dt;
      if (!collides(nx, ny, nz)) {
        s.player.x = nx;
        s.player.y = ny;
        s.player.z = nz;
        s.player.ground = false;
      } else {
        if (!collides(nx, s.player.y, s.player.z)) s.player.x = nx; else s.player.vx = 0;
        if (!collides(s.player.x, ny, s.player.z)) s.player.y = ny; else s.player.vy = 0;
        if (!collides(s.player.x, s.player.y, nz)) s.player.z = nz; else s.player.vz = 0;
      }
    } else {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(s.player.vx), Math.abs(s.player.vy), Math.abs(s.player.vz)) * dt / 0.18));
      const h = dt / steps;

      // Sneak edge-stop: while crouched on the ground, don't walk off a ledge —
      // the player stops at the block edge (can peek over and see the side face).
      const groundedAt = (x: number, y: number, z: number) => {
        const b1 = ctx.getBlock(Math.floor(x), Math.floor(y - 0.2), Math.floor(z));
        if (b1 !== 0 && b1 !== 39 && b1 !== 40) return true;
        const fx = Math.floor(x), fy = Math.floor(y - 0.6), fz = Math.floor(z);
        const fb = ctx.getBlock(fx, fy, fz);
        if (isFence(fb)) {
          const plMinX = x - PR, plMaxX = x + PR;
          const plMinZ = z - PR, plMaxZ = z + PR;
          return (plMaxX > fx + 0.375 && plMinX < fx + 0.625 && plMaxZ > fz + 0.375 && plMinZ < fz + 0.625);
        }
        return false;
      };
      const sneakEdge = s.sneak && s.player.ground;

      if (collides(s.player.x, s.player.y, s.player.z)) {
        const rr = findRestY(s.player.x, s.player.y, s.player.z);
        if (rr.restY >= s.player.y - 0.05 && rr.restY <= s.player.y + 0.02) {
          // Valid support right here (footprint straddling stair/slab/fence
          // seams): do nothing — the landing solver owns this spot. Any push
          // or lift here becomes a lift/fall yo-yo with the Y pass.
        } else if (rr.restY > s.player.y + 0.02 && rr.restY <= s.player.y + 1.2) {
          s.player.y = rr.restY;
        } else {
          let free = false;
          for (const r of [0.3, 0.6, 1.0]) {
            const opts: Array<[number, number]> = [[r, 0], [-r, 0], [0, r], [0, -r]];
            for (const [ox, oz] of opts) {
              if (!collides(s.player.x + ox, s.player.y, s.player.z + oz)) {
                s.player.x += ox;
                s.player.z += oz;
                free = true;
                break;
              }
            }
            if (free) break;
          }
          if (!free) {
            let lifted = 0;
            while (lifted < 1.2 && collides(s.player.x, s.player.y, s.player.z)) {
              s.player.y += 0.05;
              lifted += 0.05;
            }
          }
        }
        s.player.vy = 0;
      }

      for (let i = 0; i < steps; i++) {
        const nx = s.player.x + s.player.vx * h;
        const dirX = Math.sign(s.player.vx || 1);
        const leadX = nx + dirX * PR;
        const obstacleBlockX = ctx.getBlock(Math.floor(leadX), Math.floor(s.player.y), Math.floor(s.player.z));
        const isStepBlockX = isStair(obstacleBlockX) || isSlab(obstacleBlockX) || isStair(ctx.getBlock(Math.floor(leadX), Math.floor(s.player.y + 0.5), Math.floor(s.player.z))) || isSlab(ctx.getBlock(Math.floor(leadX), Math.floor(s.player.y + 0.5), Math.floor(s.player.z)));
        const canStepX = s.autoStep || isStepBlockX;
        const stepHeightX = isStepBlockX ? 0.52 : (s.autoStep ? 1.02 : 0.55);

        if (!collides(nx, s.player.y, s.player.z) && !(sneakEdge && groundedAt(s.player.x, s.player.y, s.player.z) && !groundedAt(nx, s.player.y, s.player.z))) {
          s.player.x = nx;
        } else if (s.player.ground && canStepX && !collides(nx, s.player.y + stepHeightX, s.player.z)) {
          s.player.x = nx;
          s.player.y += stepHeightX;
          s.player.vy = 0;
        } else {
          s.player.vx = 0;
        }

        const nz = s.player.z + s.player.vz * h;
        const dirZ = Math.sign(s.player.vz || 1);
        const leadZ = nz + dirZ * PR;
        const obstacleBlockZ = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y), Math.floor(leadZ));
        const isStepBlockZ = isStair(obstacleBlockZ) || isSlab(obstacleBlockZ) || isStair(ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y + 0.5), Math.floor(leadZ))) || isSlab(ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y + 0.5), Math.floor(leadZ)));
        const canStepZ = s.autoStep || isStepBlockZ;
        const stepHeightZ = isStepBlockZ ? 0.52 : (s.autoStep ? 1.02 : 0.55);

        if (!collides(s.player.x, s.player.y, nz) && !(sneakEdge && groundedAt(s.player.x, s.player.y, s.player.z) && !groundedAt(s.player.x, s.player.y, nz))) {
          s.player.z = nz;
        } else if (s.player.ground && canStepZ && !collides(s.player.x, s.player.y + stepHeightZ, nz)) {
          s.player.z = nz;
          s.player.y += stepHeightZ;
          s.player.vy = 0;
        } else {
          s.player.vz = 0;
        }

        const nyRaw = s.player.y + s.player.vy * h;
        const ny = s.player.vy === 0 ? nyRaw - 0.06 : nyRaw;
        if (!collides(s.player.x, ny, s.player.z)) {
          s.player.y = nyRaw;
          s.player.ground = false;
        } else {
          if (s.player.vy <= 0) {
            const { restY, landedOn } = findRestY(s.player.x, ny, s.player.z);
            const fallDist = s.fallPeakY - restY;

            if (landedOn === 137 && !s.sneak) {
              s.player.vy = Math.min(24, -s.player.vy * 0.82);
              s.player.ground = false;
              s.fallPeakY = s.player.y;
              ctx.playStep(18);
              if (s.fx) s.fx.spawnBurst(s.player.x, ny + 0.5, s.player.z, 0, 1, 0, new THREE.Color(0x73c94d), 12);
            } else if (s.player.vy >= -3 && s.player.y - restY > (s.player.vy === 0 ? 0.05 : 0.6)) {
              s.player.vy = 0;
            } else {
              s.player.y = restY;
              s.player.ground = true;

              if (landedOn === 55 && fallDist > 1.2) {
                ctx.edit(Math.floor(s.player.x), Math.floor(ny), Math.floor(s.player.z), 2);
                ctx.playDig(2);
              }

              if (!inWater && !inLava && fallDist > 3.25) {
                let rawDamage = Math.floor(fallDist - 3);
                if (landedOn === 49) {
                  rawDamage = Math.max(1, Math.floor(rawDamage * 0.2));
                  ctx.showToast("🌾 Hay Bale cushioned your fall!");
                } else if (landedOn === 137) {
                  rawDamage = 0;
                }
                if (rawDamage > 0) ctx.damagePlayer(rawDamage);
              }
              s.fallPeakY = s.player.y;
            }
          } else {
            s.player.y = Math.floor(ny + PH) - PH - 0.002;
          }
          s.player.vy = 0;
        }
      }
    }
    if (s.player.y < -25) ctx.respawn();

    if (!s.creative && inLava && !s.dead) {
      T.lavaTimer += dt;
      if (T.lavaTimer >= 0.5) { T.lavaTimer = 0; ctx.damagePlayer(3); }
    } else {
      T.lavaTimer = 0;
    }

    if (!s.creative && !s.dead && s.player.ground && groundBlock === 99 && !s.sneak) {
      T.magmaTimer += dt;
      if (T.magmaTimer >= 0.5) { T.magmaTimer = 0; ctx.damagePlayer(1); }
    } else {
      T.magmaTimer = 0;
    }

    if (!s.creative && !s.dead && (feetBlock === 120 || headBlock === 120)) {
      T.cactusTimer += dt;
      if (T.cactusTimer >= 0.5) { T.cactusTimer = 0; ctx.damagePlayer(1); }
    } else {
      T.cactusTimer = 0;
    }

    if (!s.creative && !s.dead && !isFlying && (headBlock === 10 || headBlock === 12 || isSolid(headBlock))) {
      T.suffocationTimer += dt;
      if (T.suffocationTimer >= 0.5) { T.suffocationTimer = 0; ctx.damagePlayer(1); }
    } else {
      T.suffocationTimer = 0;
    }

    T.randomTickTimer += dt;
    if (T.randomTickTimer >= 0.4) {
      T.randomTickTimer = 0;
      ctx.processRandomTicks();
    }

    processFallingBlocks(s, dt, { edit: ctx.edit, playDig: ctx.playDig, checkFallingBlocks: ctx.checkFallingBlocks });

    if (!s.creative && !s.dead && s.health > 0 && s.health < 20 && performance.now() - s.lastDamageAt > 5000) {
      T.regenTimer += dt;
      if (T.regenTimer >= 2.5) {
        T.regenTimer = 0;
        const nh = Math.min(20, s.health + 1);
        s.health = nh;
        ctx.setHealth(nh);
      }
    } else {
      T.regenTimer = 0;
    }

    const hs = Math.hypot(s.player.vx, s.player.vz);
    s.player.bob = s.player.ground && hs > 0.6 ? s.player.bob + dt * hs * 2.1 * (s.sneak ? 0.55 : 1) : s.player.bob * 0.92;
    const bobY = s.player.ground ? Math.sin(s.player.bob * 2) * 0.035 * Math.min(1, hs / 4) : 0;

    if (s.player.ground && hs > 1.2 && !isFlying) {
      T.stepSoundT += dt;
      const stepInterval = (sprinting ? 0.28 : 0.38) * (s.sneak ? 1.7 : 1);
      if (T.stepSoundT > stepInterval) {
        T.stepSoundT = 0;
        const underBlock = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y - 0.2), Math.floor(s.player.z));
        ctx.playStep(underBlock);
      }
    } else {
      T.stepSoundT = 0;
    }
    if (inWater && !T.wasInWater) ctx.playSplash();
    T.wasInWater = inWater;

    const baseFov = s.baseFov || 70;
    const zoomedBase = s.zoomActive ? baseFov * (s.zoomFactor ?? 0.5) : baseFov;
    const fovT = zoomedBase + (sprinting && !s.zoomActive && hs > 2.5 ? 8 : 0) - (submerged ? 10 : 0);
    if (s.camera) {
      const diff = fovT - s.camera.fov;
      if (Math.abs(diff) > 0.01) {
        s.camera.fov += diff * Math.min(1, dt * 8);
        s.camera.updateProjectionMatrix();
      }
    }
    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (s.shakeT > 0) {
      const amp = s.shakeT * 0.32;
      shakeX = (Math.random() - 0.5) * amp;
      shakeY = (Math.random() - 0.5) * amp;
      shakeZ = (Math.random() - 0.5) * amp;
    }
    s.camera!.position.set(s.player.x + shakeX, s.player.y + eyeH + bobY + shakeY, s.player.z + shakeZ);
    s.camera!.rotation.y = s.player.yaw;
    s.camera!.rotation.x = s.player.pitch;

    let b = (-s.player.yaw * 180 / Math.PI) % 360;
    if (b < 0) b += 360;
    const dirNames = ["N","NE","E","SE","S","SW","W","NW"];
    const card = dirNames[Math.round(b / 45) % 8];

    if (submerged && !isFlying) {
      T.oxygenTimer += dt;
      if (T.oxygenTimer >= 2.0) {
        T.oxygenTimer = 0;
        ctx.setOxygenBubbles(prev => Math.max(0, prev - 1));
      }
      if ((s.oxygen || 0) <= 0 && !s.creative && !s.dead) {
        T.drownTimer += dt;
        if (T.drownTimer >= 1.5) { T.drownTimer = 0; ctx.damagePlayer(2); }
      }
    } else if (!submerged && (s.oxygen || 0) < 10) {
      s.oxygen = 10;
      T.oxygenTimer = 0;
      ctx.setOxygenBubbles(10);
    }

    const feetPowder = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y + 0.2), Math.floor(s.player.z)) === 556;
    if (feetPowder && !s.creative && !s.dead) {
      const wasFrozen = T.freezeTimer;
      T.freezeTimer += dt;
      if (wasFrozen < 5 && T.freezeTimer >= 5) ctx.showToast("❄️ Freezing! Get out of the powder snow!");
      if (T.freezeTimer >= 7) {
        T.freezeHurtTimer += dt;
        if (T.freezeHurtTimer >= 2) { T.freezeHurtTimer = 0; ctx.damagePlayer(1); }
      }
    } else {
      T.freezeTimer = 0;
      T.freezeHurtTimer = 0;
    }

    T.posInfoTimer += dt;
    if (T.posInfoTimer >= 0.15) {
      T.posInfoTimer = 0;
      const normAngle = ((b % 360) + 360) % 360;
      let dComp = Math.abs(normAngle - T.lastCompassSent) % 360;
      if (dComp > 180) dComp = 360 - dComp;
      if (T.lastCompassSent < 0 || dComp >= 1) {
        T.lastCompassSent = normAngle;
        ctx.setCompassHeading(normAngle);
      }
      const pxx = Number(s.player.x.toFixed(1));
      const pyy = Number(s.player.y.toFixed(1));
      const pzz = Number(s.player.z.toFixed(1));
      const infoHeading = `${card} ${b.toFixed(0)}°`;
      const infoState = isFlying ? "flying" : (submerged ? "underwater" : (inWater ? "swimming" : (s.player.ground ? "on ground" : "falling")));
      const pkey = pxx + "," + pyy + "," + pzz + "|" + infoHeading + "|" + infoState;
      if (pkey !== T.posInfoKey) {
        T.posInfoKey = pkey;
        ctx.setPosInfo({ x: pxx, y: pyy, z: pzz, heading: infoHeading, state: infoState });
      }

      const nv = ctx.findNearestVillage(s.player.x, s.player.z);
      if (nv) {
        const dx = nv.vx - s.player.x, dz = nv.vz - s.player.z;
        const worldAngle = (Math.atan2(dx, -dz) * 180) / Math.PI;
        const nAngle = ((worldAngle % 360) + 360) % 360;
        const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const bearing = dirs[Math.round(nAngle / 45) % 8];
        const vkey = (nv.name || "Village") + "|" + nv.vx + "|" + nv.vz + "|" + (Math.round(nv.dist / 2) * 2) + "|" + (Math.round(nAngle / 5) * 5);
        if (vkey !== T.lastVillageKey) {
          T.lastVillageKey = vkey;
          ctx.setNearestVillage({
            name: nv.name || "Village",
            x: nv.vx,
            z: nv.vz,
            dist: nv.dist,
            angle: nAngle,
            bearing
          });
        }
      }
    }
  }

  return { stepPlayerPhysics };
}
