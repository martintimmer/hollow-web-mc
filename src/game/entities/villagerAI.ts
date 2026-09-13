import * as THREE from "three";
import type { GameState } from "../state/gameState";
import { FARMER_PROFESSION, rollDailyOffers, saveVillagerLedger } from "../villagers";
import { BLOCK_MAP } from "../blocks";
import { GRAV } from "../world";
import { getBlock } from "../world/chunkData";
import { collides } from "../physics/playerPhysics";

export function stepVillagers(
  s: GameState,
  dt: number,
  callbacks: {
    setNearVillager: (v: any) => void;
  }
): void {
  if (!s.villagers.size) return;

  // Dawn restock: each villager rolls the day's offers once per in-game day.
  // Purchased offers stay locked until the next rotation brings new stock.
  const today = s.dayCount || 0;
  for (const v of s.villagers.values()) {
    if (!v.prof) continue;
    if (v.tradeDay !== today) {
      v.tradeDay = today;
      v.offerIdx = rollDailyOffers(v.prof.name, v.tkey || v.id, today);
      v.usesLeft = v.prof.trades.map(() => 1);
      saveVillagerLedger(s, v);
    }
  }

  const px = s.player.x, pz = s.player.z;
  let closestVillager: any = null;
  let closestDist = 4.5;

  const isNight = s.time > 12500 && s.time < 23500;
  const villagerList = Array.from(s.villagers.values());

  for (let i = 0; i < villagerList.length; i++) {
    const v = villagerList[i];
    v.stateTimer -= dt;

    // 1. Entity-Player Solid Collision & Repulsion Pushback
    const distToPlayer = Math.hypot(v.x - px, v.z - pz);
    if (distToPlayer < 0.85 && Math.abs(v.y - s.player.y) < 1.8) {
      const pushAngle = Math.atan2(v.x - px, v.z - pz);
      const pushForce = (0.85 - distToPlayer) * 3.5;
      v.x += Math.sin(pushAngle) * pushForce * dt * 5;
      v.z += Math.cos(pushAngle) * pushForce * dt * 5;
      s.player.x -= Math.sin(pushAngle) * pushForce * dt * 2.5;
      s.player.z -= Math.cos(pushAngle) * pushForce * dt * 2.5;
    }

    // 2. Entity-Entity Solid Collision between Villagers
    for (let j = i + 1; j < villagerList.length; j++) {
      const v2 = villagerList[j];
      const distV = Math.hypot(v.x - v2.x, v.z - v2.z);
      if (distV < 0.85 && Math.abs(v.y - v2.y) < 1.8) {
        const pushAngle = Math.atan2(v.x - v2.x, v.z - v2.z);
        const pushForce = (0.85 - distV) * 2.5;
        v.x += Math.sin(pushAngle) * pushForce * dt * 3;
        v.z += Math.cos(pushAngle) * pushForce * dt * 3;
        v2.x -= Math.sin(pushAngle) * pushForce * dt * 3;
        v2.z -= Math.cos(pushAngle) * pushForce * dt * 3;
      }
    }

    if (distToPlayer < closestDist) {
      closestDist = distToPlayer;
      closestVillager = v;
    }

    // 3. Anatomical 270° Head Rotation Limit (Max ±135° relative to body yaw)
    if (distToPlayer < 5.0) {
      const lookAngle = Math.atan2(px - v.x, pz - v.z);
      let diff = lookAngle - v.yaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const clampedDiff = Math.max(-2.356, Math.min(2.356, diff));
      v.mesh.headGroup.rotation.y = THREE.MathUtils.lerp(v.mesh.headGroup.rotation.y, clampedDiff, 0.18);

      if (Math.abs(diff) > 2.0 && v.state === "idle") {
        v.yaw += diff * 0.08;
      }
    } else {
      v.mesh.headGroup.rotation.y = THREE.MathUtils.lerp(v.mesh.headGroup.rotation.y, 0, 0.1);
    }

    // 4. Autonomous Behavior State Machine
    if (v.stateTimer <= 0) {
      if (isNight && v.house) {
        v.state = "sheltering";
        v.targetX = (v.house.x0 + v.house.x1) / 2;
        v.targetZ = (v.house.z0 + v.house.z1) / 2;
        v.stateTimer = 10 + Math.random() * 10;
      } else {
        const roll = Math.random();
        if (roll < 0.35) {
          v.state = "idle";
          v.stateTimer = 2 + Math.random() * 3;
        } else if (roll < 0.70) {
          v.state = "wandering";
          const angle = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * 6;
          v.targetX = v.x + Math.sin(angle) * dist;
          v.targetZ = v.z + Math.cos(angle) * dist;
          v.stateTimer = 4 + Math.random() * 4;
        } else if (v.prof && v.prof.name === FARMER_PROFESSION && v.pen && roll < 0.82) {
          v.state = "tending_cows";
          v.targetX = v.pen.x + (Math.random() * 4 - 2);
          v.targetZ = v.pen.z + (Math.random() * 4 - 2);
          v.stateTimer = 8 + Math.random() * 6;
        } else if (v.house) {
          v.state = "visiting_house";
          v.targetX = (v.house.x0 + v.house.x1) / 2;
          v.targetZ = (v.house.z0 + v.house.z1) / 2;
          v.stateTimer = 6 + Math.random() * 5;
        }
      }
    }

    // 5. Physics Movement with Voxel World Collision & Stair Stepping
    if (v.state !== "idle") {
      const dx = v.targetX - v.x;
      const dz = v.targetZ - v.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.4) {
        const spd = 1.25;
        v.vx = (dx / dist) * spd;
        v.vz = (dz / dist) * spd;

        const targetYaw = Math.atan2(dx, dz);
        let dyaw = targetYaw - v.yaw;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        v.yaw += dyaw * 0.12;

        v.walkCycle += dt * 7.5;
        v.mesh.leftLeg.rotation.x = Math.sin(v.walkCycle) * 0.45;
        v.mesh.rightLeg.rotation.x = -Math.sin(v.walkCycle) * 0.45;
        v.mesh.armsMesh.position.y = 0.88 + Math.sin(v.walkCycle * 2) * 0.02;

        // Voxel AABB Collision Resolution for X axis
        const nx = v.x + v.vx * dt;
        if (!collides(s, nx, v.y, v.z)) {
          v.x = nx;
        } else if (!collides(s, nx, v.y + 0.55, v.z)) {
          v.x = nx;
          v.y += 0.55;
        } else if (!collides(s, nx, v.y + 1.05, v.z)) {
          v.x = nx;
          v.y += 1.0;
        } else {
          v.vx = 0;
          v.targetX = v.x;
        }

        // Voxel AABB Collision Resolution for Z axis
        const nz = v.z + v.vz * dt;
        if (!collides(s, v.x, v.y, nz)) {
          v.z = nz;
        } else if (!collides(s, v.x, v.y + 0.55, nz)) {
          v.z = nz;
          v.y += 0.55;
        } else if (!collides(s, v.x, v.y + 1.05, nz)) {
          v.z = nz;
          v.y += 1.0;
        } else {
          v.vz = 0;
          v.targetZ = v.z;
        }
      } else {
        v.vx = 0;
        v.vz = 0;
        v.state = "idle";
        v.stateTimer = 2 + Math.random() * 3;
        v.mesh.leftLeg.rotation.x = 0;
        v.mesh.rightLeg.rotation.x = 0;
        v.mesh.armsMesh.position.y = 0.88;
      }
    } else {
      v.vx = 0;
      v.vz = 0;
      v.mesh.leftLeg.rotation.x = 0;
      v.mesh.rightLeg.rotation.x = 0;
      v.mesh.armsMesh.position.y = 0.88;
    }

    // Gravity & Ground Alignment
    if (collides(s, v.x, v.y, v.z)) {
      let escape: [number, number] | null = null;
      outer: for (let r = 1; r <= 5; r++) {
        for (let dz2 = -r; dz2 <= r; dz2++) for (let dx2 = -r; dx2 <= r; dx2++) {
          const ex = Math.floor(v.x) + dx2, ez = Math.floor(v.z) + dz2;
          if (!collides(s, ex + 0.5, v.y, ez + 0.5)) { escape = [ex + 0.5, ez + 0.5]; break outer; }
        }
      }
      if (escape) { v.x = Math.floor(v.x) + escape[0] - Math.floor(v.x); v.z = v.z + (escape[1] - v.z); }
      else { v.x = Math.floor(v.x) + 0.5; v.z = Math.floor(v.z) + 0.5; v.y += 1; }
    }

    const ivx = Math.floor(v.x), ivz = Math.floor(v.z);
    const feetY = Math.floor(v.y);
    if (v._lastGroundX !== ivx || v._lastGroundZ !== ivz || v._groundY === undefined || v._groundY > feetY + 2) {
      let gy = feetY + 1;
      while (gy > 0 && !BLOCK_MAP.get(getBlock(s, ivx, gy, ivz))?.solid) gy--;
      v._groundY = gy + 1;
      v._lastGroundX = ivx;
      v._lastGroundZ = ivz;
    }
    const groundY = v._groundY;
    if (Math.abs(v.y - groundY) > 2) v.y = groundY;
    if (v.y > groundY + 0.1) {
      v.vy = Math.max(-20, v.vy - GRAV * dt);
      v.y += v.vy * dt;
      if (v.y < groundY) { v.y = groundY; v.vy = 0; }
    } else {
      v.y = THREE.MathUtils.lerp(v.y, groundY, 0.25);
      v.vy = 0;
    }

    v.mesh.root.position.set(v.x, v.y, v.z);
    v.mesh.root.rotation.y = v.yaw;
  }

  const closestId = closestVillager ? `${closestVillager.x.toFixed(1)},${closestVillager.z.toFixed(1)}` : null;
  if (closestId !== s.lastNearVillagerId) {
    s.lastNearVillagerId = closestId;
    callbacks.setNearVillager(closestVillager);
  }
}
