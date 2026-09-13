import type { GameState } from "../state/gameState";
import type { ExposureModel, MeteringMode } from "./lightMeter";

export interface CinePose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
}

export const CINE_BASE_SPEED = 10.9;
export const CINE_MIN_SPEED = 0.1;
export const CINE_MAX_SPEED = 8;
export const CINE_EYE = 1.62;

export interface VideoProfile {
  vibrance: number;
  brightness: number;
  contrast: number;
  fov: number;
  renderDistance: number;
  shadows: boolean;
  shadowTier: "basic" | "detailed" | "advanced";
  shadowTierOverridden: boolean;
  dof: boolean;
  dofStrength: number;
  ca: boolean;
  caStrength: number;
  colorGamut: string;
  bokeh: boolean;
  specular: boolean;
  specularStrength: number;
  qualityPreset: "smooth" | "balanced" | "beautiful";
  maxFps: number;
  ev: number;
  metering: MeteringMode;
  evComp: number;
  exposureModel: ExposureModel;
}

export interface CineShot {
  playing: boolean;
  t: number;
  dur: number;
  a: CinePose;
  b: CinePose;
}

export interface CinePreload {
  active: boolean;
  queue: string[];
  idx: number;
  total: number;
}

export interface CineScene {
  id: string;
  name: string;
  createdAt: number;
  a: CinePose;
  b: CinePose;
  dur: number;
  video: VideoProfile;
}

const SCENES_KEY = "mc_cine_scenes";

let savedArmFirst = true;
let savedArmLeft = false;

export function enterCinematicPose(s: GameState): void {
  s.cine = {
    x: s.player.x,
    y: s.player.y + CINE_EYE,
    z: s.player.z,
    yaw: s.player.yaw,
    pitch: s.player.pitch,
    speed: 1,
  };
  applyCineCamera(s);
}

export function adjustCineSpeed(s: GameState, deltaY: number): void {
  const c = s.cine;
  if (!c) return;
  c.speed = Math.max(CINE_MIN_SPEED, Math.min(CINE_MAX_SPEED, c.speed * (deltaY > 0 ? 0.87 : 1.15)));
}

export function hideCineArms(s: GameState): void {
  savedArmFirst = s.firstPersonArm ? s.firstPersonArm.visible : true;
  savedArmLeft = s.leftArm ? s.leftArm.visible : false;
  if (s.firstPersonArm) s.firstPersonArm.visible = false;
  if (s.leftArm) s.leftArm.visible = false;
}

export function restoreCineArms(s: GameState): void {
  if (s.firstPersonArm) s.firstPersonArm.visible = savedArmFirst;
  if (s.leftArm) s.leftArm.visible = savedArmLeft;
}

export function applyCineCamera(s: GameState): void {
  const c = s.cine;
  const cam = s.camera;
  if (!c || !cam) return;
  cam.position.set(c.x, c.y, c.z);
  cam.rotation.y = c.yaw;
  cam.rotation.x = c.pitch;
  cam.rotation.z = 0;
  const wantFov = s.baseFov || 70;
  if (Math.abs(cam.fov - wantFov) > 0.01) {
    cam.fov = wantFov;
    cam.updateProjectionMatrix();
  }
}

export function stepCinematic(s: GameState, dt: number): void {
  const c = s.cine;
  if (!c || !s.camera) return;
  pumpPreload(s);
  const shot = s.cineShot;
  if (shot && shot.playing) {
    shot.t += dt;
    const k = smootherstep(Math.max(0, Math.min(1, shot.t / Math.max(0.1, shot.dur))));
    c.x = shot.a.x + (shot.b.x - shot.a.x) * k;
    c.y = shot.a.y + (shot.b.y - shot.a.y) * k;
    c.z = shot.a.z + (shot.b.z - shot.a.z) * k;
    let dy = shot.b.yaw - shot.a.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    c.yaw = shot.a.yaw + dy * k;
    c.pitch = shot.a.pitch + (shot.b.pitch - shot.a.pitch) * k;
    if (shot.t >= shot.dur) shot.playing = false;
    applyCineCamera(s);
    return;
  }
  const k = s.keys;
  const sp = CINE_BASE_SPEED * c.speed;
  const fwd = (k["KeyW"] || k["ArrowUp"] ? 1 : 0) - (k["KeyS"] || k["ArrowDown"] ? 1 : 0);
  const strafe = (k["KeyD"] || k["ArrowRight"] ? 1 : 0) - (k["KeyA"] || k["ArrowLeft"] ? 1 : 0);
  const up = (k["Space"] ? 1 : 0) - (k["ShiftLeft"] || k["ShiftRight"] ? 1 : 0);
  if (fwd || strafe || up) {
    const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
    const sp2 = Math.sin(c.pitch), cp2 = Math.cos(c.pitch);
    const step = Math.min(dt, 0.05) * sp;
    c.x += (-sy * cp2 * fwd + cy * strafe) * step;
    c.y += (sp2 * fwd + up * 0.85) * step;
    c.z += (-cy * cp2 * fwd - sy * strafe) * step;
  }
  applyCineCamera(s);
}

function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function startShot(s: GameState, dur: number): boolean {
  const m = s.cineMarks;
  if (!m || !m.a || !m.b || !s.cine) return false;
  s.cineShot = {
    playing: true,
    t: 0,
    dur: Math.max(0.5, Math.min(120, dur || 5)),
    a: { ...m.a },
    b: { ...m.b },
  };
  return true;
}

export function stopShot(s: GameState): void {
  if (s.cineShot) s.cineShot.playing = false;
}

export function buildPreload(s: GameState): boolean {
  const m = s.cineMarks;
  const eng = s as unknown as { genChunk?: (cx: number, cz: number) => void; buildMesh?: (cx: number, cz: number) => void };
  if (!m || !m.a || !m.b || typeof eng.genChunk !== "function" || typeof eng.buildMesh !== "function") return false;
  const seen = new Set<string>();
  const queue: string[] = [];
  const dist = Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y, m.b.z - m.a.z);
  const samples = Math.max(2, Math.min(40, Math.ceil(dist / 24) + 1));
  for (let i = 0; i < samples && queue.length < 2500; i++) {
    const t = samples === 1 ? 0 : i / (samples - 1);
    const px = m.a.x + (m.b.x - m.a.x) * t;
    const pz = m.a.z + (m.b.z - m.a.z) * t;
    const ccx = Math.floor(px / 16), ccz = Math.floor(pz / 16);
    for (let dz = -3; dz <= 3 && queue.length < 2500; dz++) {
      for (let dx = -3; dx <= 3 && queue.length < 2500; dx++) {
        const key = (ccx + dx) + "," + (ccz + dz);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push(key);
        }
      }
    }
  }
  if (!queue.length) return false;
  s.cinePreload = { active: true, queue, idx: 0, total: queue.length };
  return true;
}

export function pumpPreload(s: GameState): void {
  const p = s.cinePreload;
  if (!p || !p.active) return;
  const eng = s as unknown as { genChunk?: (cx: number, cz: number) => void; buildMesh?: (cx: number, cz: number) => void };
  if (typeof eng.genChunk !== "function" || typeof eng.buildMesh !== "function") {
    p.active = false;
    return;
  }
  let n = 0;
  while (p.idx < p.queue.length && n < 4) {
    const key = p.queue[p.idx++];
    n++;
    const sep = key.indexOf(",");
    const cx = Number(key.slice(0, sep)), cz = Number(key.slice(sep + 1));
    try {
      eng.genChunk(cx, cz);
      eng.buildMesh(cx, cz);
    } catch {}
  }
  if (p.idx >= p.queue.length) {
    p.active = false;
    if (s.cineAutoPlay) {
      s.cineAutoPlay = false;
      startShot(s, s.cineShotDur || 5);
    }
  }
}

export function loadCineScenes(): CineScene[] {
  try {
    const raw = localStorage.getItem(SCENES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveCineScene(scene: CineScene): CineScene[] {
  const arr = loadCineScenes();
  arr.unshift(scene);
  try {
    localStorage.setItem(SCENES_KEY, JSON.stringify(arr.slice(0, 50)));
  } catch {}
  return arr.slice(0, 50);
}

export function deleteCineScene(id: string): CineScene[] {
  const arr = loadCineScenes().filter((x) => x.id !== id);
  try {
    localStorage.setItem(SCENES_KEY, JSON.stringify(arr));
  } catch {}
  return arr;
}
