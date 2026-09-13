/**
 * @file src/game/vehicles/vehiclePhysics.ts
 * Pure arcade vehicle physics (V0). No three.js — fully unit-testable.
 * Longitudinal forces: engine (linear falloff) - brake - handbrake - drag -
 * rolling resistance - slope gravity, scaled by mass. Lateral: steering yaw
 * integration + centrifugal slip damped by grip (handbrake kills grip).
 * Vertical: gravity + ground snap. Collision: voxel AABB push-out with velocity
 * damping (slide along walls).
 */

export interface VehicleInput {
  throttle: number;  // 0..1
  brake: number;     // 0..1
  handbrake: boolean;
  steer: number;     // -1..1 (left negative)
}

export interface VehicleTunables {
  mass: number;          // kg
  engineForce: number;   // N at wheels
  brakeForce: number;    // N
  handbrakeForce: number;// N
  reverseForce: number;  // N (reverse "gear")
  topSpeed: number;      // m/s
  reverseMax: number;    // m/s
  steerMax: number;      // rad
  wheelBase: number;     // m
  grip: number;          // /s lateral velocity damping
  gripHand: number;      // /s when handbrake
  dragC: number;         // kg/m
  rollingR: number;      // dimensionless
  wheelRadius: number;   // m
  halfWidth: number;     // m (collision box)
  halfLength: number;    // m
  bodyHeight: number;    // m (collision box height)
}

export interface VehiclePhysicsState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;      // forward velocity (m/s, negative = reversing)
  vy: number;         // vertical velocity
  steerAngle: number; // smoothed visual steer
  latVel: number;     // lateral slip velocity (m/s)
  wheelSpin: number;  // accumulated wheel rotation (rad)
  onGround: boolean;
  pitch: number;      // visual nose-dive/rise
  roll: number;       // visual body roll
}

export interface VehicleWorld {
  isSolidAt: (x: number, y: number, z: number) => boolean;
  groundYAt: (x: number, z: number) => number;
}

const G = 9.81;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function createVehiclePhysicsState(x: number, y: number, z: number, yaw = 0): VehiclePhysicsState {
  return { x, y, z, yaw, speed: 0, vy: 0, steerAngle: 0, latVel: 0, wheelSpin: 0, onGround: true, pitch: 0, roll: 0 };
}

const fwdX = (yaw: number) => -Math.sin(yaw);
const fwdZ = (yaw: number) => -Math.cos(yaw);
const rightX = (yaw: number) => Math.cos(yaw);
const rightZ = (yaw: number) => -Math.sin(yaw);

function resolveCollisions(s: VehiclePhysicsState, t: VehicleTunables, w: VehicleWorld) {
  for (let pass = 0; pass < 2; pass++) {
    const minX = s.x - t.halfWidth, maxX = s.x + t.halfWidth;
    const minZ = s.z - t.halfLength, maxZ = s.z + t.halfLength;
    const bx0 = Math.floor(minX), bx1 = Math.floor(maxX);
    const bz0 = Math.floor(minZ), bz1 = Math.floor(maxZ);
    const by0 = Math.floor(s.y), by1 = Math.floor(s.y + t.bodyHeight);
    for (let by = by0; by <= by1; by++) {
      for (let bz = bz0; bz <= bz1; bz++) {
        for (let bx = bx0; bx <= bx1; bx++) {
          if (!w.isSolidAt(bx, by, bz)) continue;
          const px1 = maxX - bx;      // push left by this
          const px2 = (bx + 1) - minX; // push right by this
          const pz1 = maxZ - bz;
          const pz2 = (bz + 1) - minZ;
          const px = Math.min(px1, px2);
          const pz = Math.min(pz1, pz2);
          if (px < pz) {
            s.x += px1 < px2 ? -px : px;
            s.speed *= 0.15;
            s.latVel *= 0.15;
          } else {
            s.z += pz1 < pz2 ? -pz : pz;
            s.speed *= 0.15;
            s.latVel *= 0.15;
          }
        }
      }
    }
  }
}

export function stepVehiclePhysics(s: VehiclePhysicsState, input: VehicleInput, dt: number, t: VehicleTunables, w: VehicleWorld) {
  const throttle = clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);
  const hand = !!input.handbrake;
  const steer = clamp(input.steer, -1, 1);
  const v = s.speed;
  const signV = v > 0.001 ? 1 : (v < -0.001 ? -1 : 0);

  // slope gravity: sample ground ahead vs here — cache groundY per frame (1 lookup instead of 5)
  const fx = fwdX(s.yaw), fz = fwdZ(s.yaw);
  // tiny per-frame cache for groundYAt (flat terrain reuses same value)
  const _gCache = new Map<string, number>();
  const cachedGroundYAt = (x: number, z: number) => {
    const k = `${Math.floor(x)},${Math.floor(z)}`;
    let v = _gCache.get(k);
    if (v === undefined) { v = w.groundYAt(x, z); _gCache.set(k, v); }
    return v;
  };
  const gHere = cachedGroundYAt(s.x, s.z);
  const gAhead = cachedGroundYAt(s.x + fx * 1.2, s.z + fz * 1.2);
  const slope = Math.atan2(gAhead - gHere, 1.2);

  let F = 0;
  if (throttle > 0 && v < t.topSpeed) {
    F += t.engineForce * throttle * (1 - Math.max(0, v) / t.topSpeed);
  }
  // S acts as reverse gear when not moving forward
  if (brake > 0 && v <= 0.001 && throttle <= 0) {
    F -= t.reverseForce * brake * (1 + Math.min(0, v) / t.reverseMax);
  }
  if (brake > 0 && signV !== 0) F -= t.brakeForce * brake * signV;
  if (hand && signV !== 0) F -= t.handbrakeForce * signV;
  F -= t.dragC * v * Math.abs(v);
  F -= t.rollingR * t.mass * G * signV;
  F -= t.mass * G * Math.sin(slope); // uphill negative, downhill positive

  const a = F / t.mass;
  s.speed = clamp(s.speed + a * dt, -t.reverseMax, t.topSpeed);

  // steering: smooth & speed-sensitive — less twitch at high speed for corner correction
  const speedGate = clamp(Math.abs(v) / 4.0, 0, 1);
  const highSpeedDamp = 1 - clamp(Math.abs(v) / Math.max(1, t.topSpeed), 0, 1) * 0.45;
  const effSteer = steer * (v < -0.001 ? -1 : 1) * speedGate * highSpeedDamp;
  const targetSteer = effSteer * t.steerMax;
  // slower steering response = smoother left/right, stiffer suspension feel
  s.steerAngle += (targetSteer - s.steerAngle) * Math.min(1, dt * 3.2);
  const yawRate = (v / t.wheelBase) * Math.tan(s.steerAngle);
  s.yaw += yawRate * dt * (hand ? 0.80 : 1.0);

  // lateral slip — much stiffer suspension, handbrake still allows drift but less wild
  const aLat = (v * v / t.wheelBase) * Math.tan(s.steerAngle) * 0.22;
  s.latVel += aLat * dt;
  const grip = hand ? t.gripHand : t.grip;
  s.latVel *= Math.max(0, 1 - grip * dt);
  // hard clamp lateral velocity to prevent excessive slide
  s.latVel = clamp(s.latVel, -2.5, 2.5);

  // integrate position
  s.x += (fx * v + rightX(s.yaw) * s.latVel) * dt;
  s.z += (fz * v + rightZ(s.yaw) * s.latVel) * dt;

  // vertical: gravity + ground snap — sample 5 points (center + 4 wheel corners) so no tire sinks below grass
  const sampleGroundY = () => {
    const hw = t.halfWidth * 0.9;
    const hl = t.halfLength * 0.9;
    const pts: [number, number][] = [
      [s.x, s.z],
      [s.x + hw, s.z + hl],
      [s.x - hw, s.z + hl],
      [s.x + hw, s.z - hl],
      [s.x - hw, s.z - hl],
    ];
    let maxY = -Infinity;
    for (const [px, pz] of pts) {
      const gy = cachedGroundYAt(px, pz);
      if (gy > maxY) maxY = gy;
    }
    return maxY === -Infinity ? cachedGroundYAt(s.x, s.z) : maxY;
  };
  const gy = sampleGroundY();
  // hard clamp: never allow vehicle to go below highest sampled ground (prevents tire sinking)
  if (s.y < gy) { s.y = gy; s.vy = 0; }
  if (s.y > gy + 0.02) {
    s.vy -= G * dt * 1.8;
    s.y += s.vy * dt;
    if (s.y <= gy) { s.y = gy; s.vy = 0; }
    // additional hard clamp if still below due to large dt
    if (s.y < gy) s.y = gy;
  } else {
    s.y = gy;
    s.vy = 0;
  }
  s.onGround = s.y <= gy + 0.02;

  resolveCollisions(s, t, w);
  // post-collision vertical re-clamp (wall push may have moved onto higher ground)
  const gy2 = sampleGroundY();
  if (s.y < gy2) { s.y = gy2; s.vy = 0; }

  // visuals: wheel spin, pitch (accel raises the nose / engine bay, brake dives),
  // roll (cornering). Positive rotation.x lifts the front (-Z end). More rigid suspension.
  s.wheelSpin += (v / t.wheelRadius) * dt;
  const targetPitch = clamp(0.06 * (throttle - brake * 1.6) * t.engineForce / t.mass, -0.10, 0.12);
  s.pitch += (targetPitch - s.pitch) * Math.min(1, dt * 9);
  const targetRoll = clamp(-0.28 * s.steerAngle * clamp(Math.abs(v) / 9, 0, 1), -0.09, 0.09);
  s.roll += (targetRoll - s.roll) * Math.min(1, dt * 8);
}
