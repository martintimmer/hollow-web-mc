import type { GameState } from "../state/gameState";
import { BLOCK_MAP, isOpaque } from "../blocks";
import { ttlSpotLin, ttlCenterLin, TTL_ZONES } from "./ttlMeter";
import { sampleAtlasMeanLuma } from "../particles";

export const METER_REF_LUX = 3000 / 16 / Math.pow(2, 0.7);

export type MeteringMode = "matrix" | "center" | "spot";
export const METERING_MODES: MeteringMode[] = ["matrix", "center", "spot"];
const MODE_ADAPT_SECONDS: Record<MeteringMode, number> = { matrix: 1.3, center: 0.8, spot: 0.15 };

export type ExposureModel = "legacy-sim" | "iso-ettl";
export const EXPOSURE_MODELS: ExposureModel[] = ["legacy-sim", "iso-ettl"];
export const ISO_K_REFLECTED = 12.5;
export const ISO_C_INCIDENT_FLAT = 250;
export const ISO_C_INCIDENT_HEMI = 330;
export const ISO_REF_LUX = 2.5;
export const ISO_PROGRAM_EV = 8.61;

export const METER_APERTURE = 2.8;
export const METER_SHUTTER = 1 / 50;
const ISO_STEPS = [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400, 8000, 10000, 12800];
const F_STOPS = [2.0, 2.8, 4, 5.6, 8];
const SHUTTERS = [1 / 30, 1 / 50, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000, 1 / 2000, 1 / 4000, 1 / 8000];

export function gainToISO(gain: number): number {
  const v = Math.max(100, Math.round(gain * 100));
  let best = ISO_STEPS[0];
  for (const s of ISO_STEPS) {
    if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  }
  return best;
}

function snapNearest(v: number, steps: number[]): number {
  let best = steps[0];
  for (const s of steps) {
    if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  }
  return best;
}

export function formatShutter(t: number): string {
  if (t >= 1) return `${t}s`;
  return `1/${Math.round(1 / t)}`;
}

export function fovToMM(vfovDeg: number): number {
  const v = Math.max(10, Math.min(120, vfovDeg)) * (Math.PI / 360);
  return Math.max(4, Math.round(12 / Math.tan(v)));
}

export function formatLux(lux: number): string {
  if (!Number.isFinite(lux)) return "?";
  if (lux >= 1000) return `${(lux / 1000).toFixed(1)}k`;
  return `${Math.round(lux)}`;
}

export const EV_MIN = 8;
export const EV_MAX = 17;

export function clampEv(ev: number): number {
  if (!Number.isFinite(ev)) return 12;
  return Math.max(EV_MIN, Math.min(EV_MAX, Math.round(ev)));
}

export function latitudeStops(ev: number): number {
  return clampEv(ev);
}

export function ev100FromLux(lux: number): number {
  return Math.log2(Math.max(1e-6, lux) / ISO_REF_LUX);
}

export function windowBounds(midLux: number, widthStops: number): [number, number] {
  const mid = Math.max(1e-6, midLux);
  const half = Math.max(0.5, widthStops) / 2;
  return [mid / Math.pow(2, half), mid * Math.pow(2, half)];
}

export function faceDirectWeight(
  nx: number, ny: number, nz: number,
  ldx: number, ldy: number, ldz: number
): number {
  return nx * ldx + ny * ldy + nz * ldz;
}

export function skyVisNy(ny: number): number {
  return 0.5 + 0.5 * Math.max(-1, Math.min(1, ny));
}

export function emitterFalloff(luxAt1m: number, d2: number): number {
  return Math.min(EMITTER_MAX_SINGLE_LUX, luxAt1m / (d2 + 0.5));
}

export function countWindowClipUp(s: GameState): number {
  try {
    const w = latitudeStops(s.ev || 12);
    const mid = s.meterExp > 0 ? s.meterExp : 0;
    if (!(mid > 0)) return 0;
    const hi = windowBounds(mid, w)[1];
    const g = s as unknown as { ttlHDR?: number[]; ttlAnchor?: number; ttlHDROk?: boolean };
    if (!g.ttlHDROk || !g.ttlHDR || !g.ttlAnchor || g.ttlAnchor <= 0) return 0;
    let n = 0;
    for (let i = 0; i < TTL_ZONES; i++) {
      if ((g.ttlHDR[i] || 0) * (g.ttlAnchor as number) > hi) n++;
    }
    return n;
  } catch {
    return 0;
  }
}

const GAIN_DOWN_HALF_STOPS = [4.5, 4.0, 3.5, 3.0, 2.2, 1.5, 1.0, 0.7, 0.5, 0.3];
const GAIN_UP_HALF_STOPS = [6.0, 5.5, 5.0, 4.5, 3.7, 3.5, 3.2, 3.0, 2.8, 2.5];
const ADAPT_SECONDS = 1.3;

function evTableIdx(ev: number): number {
  return Math.max(0, Math.min(9, Math.round(ev) - EV_MIN));
}

export function evContrastFactor(ev: number): number {
  const table = [1.1, 1.08, 1.05, 1.0, 0.96, 0.92, 0.85, 0.82, 0.78, 0.75];
  return table[evTableIdx(ev)] ?? 1;
}

export function evBloomStrength(ev: number): number {
  const table = [1.5, 1.35, 1.2, 0.9, 0.6, 0.35, 0.15, 0.05, 0.03, 0.0];
  return table[evTableIdx(ev)] ?? 0.3;
}

export const EMITTER_DEFAULT_LUX = 40;
export const EMITTER_MAX_SINGLE_LUX = 1200;
export const EMITTER_MAX_TOTAL_LUX = 3000;
export const EMITTER_EXPOSURE_EMPHASIS = 6;
export const WB_NEUTRAL_K = 6500;
export const WB_ADAPT_SECONDS = 1.5;

const MOON_LIT = [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75];

export function moonLitFrac(s: GameState): number {
  const ph = ((s.dayCount || 0) % 8 + 8) % 8;
  return MOON_LIT[ph] ?? 1;
}

export function emitterVisibility(s: GameState): number {
  if (s.dimension !== "overworld") return 1;
  const a = ((s.time - 6000) / 24000) * Math.PI * 2;
  const sunUp = Math.max(0, Math.cos(a));
  let wx = 1;
  const wt = s.weatherType;
  if (wt === "rain") wx = 0.5;
  else if (wt === "thunder") wx = 0.35;
  else if (wt === "snow") wx = 0.6;
  const cw = s.cloudWeather;
  if (cw === "overcast") wx *= 0.4;
  else if (cw === "cloudy") wx *= 0.7;
  const dl = (40 + 1600 * Math.pow(sunUp, 1.2)) * wx + 9000 * sunUp * 0.3 * wx;
  return 1 - smooth01((dl - 800) / (4000 - 800));
}

const EMITTER_K: Record<number, number> = {
  80: 2700, 81: 12000, 82: 2700, 84: 2200, 102: 2700, 85: 2700, 86: 12000, 630: 12000,
  40: 1800, 136: 1800, 99: 2000, 96: 2400, 98: 6000, 100: 7000, 101: 3200, 132: 6000,
  46: 2800, 47: 3500, 48: 8000, 83: 3200, 87: 3000, 88: 3500, 89: 4500, 90: 4500,
  91: 4500, 92: 6500, 93: 5000, 94: 6500, 95: 8000, 33: 2200, 97: 6500,
  428: 3500, 486: 2700, 619: 2700, 601: 4500, 602: 4500, 603: 4500, 353: 5000,
  378: 5000, 347: 6000, 103: 2800,
};

export function emitterKelvin(id: number | undefined): number {
  if (id === undefined) return 2800;
  return EMITTER_K[id] ?? 2800;
}

export function kelvinToRGB(k: number): [number, number, number] {
  const t = Math.max(1500, Math.min(20000, k)) / 100;
  let r: number, g: number, b: number;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v: number) => Math.max(0, Math.min(1, v / 255));
  return [c(r), c(g), c(b)];
}

export function whiteBalanceGain(kelvin: number, strength = 0.75): [number, number, number] {
  const [r, g, b] = kelvinToRGB(kelvin);
  const [nr, ng, nb] = kelvinToRGB(WB_NEUTRAL_K);
  const cl = (v: number) => Math.max(0.7, Math.min(1.4, 1 + (v - 1) * strength));
  return [cl(r / nr), cl(g / ng), cl(b / nb)];
}

const EMITTER_LUX: Record<number, number> = {
  80: 60, 81: 45, 82: 110, 84: 25, 102: 260, 85: 260, 86: 170, 630: 170,
  40: 450, 136: 120, 99: 60, 96: 130, 98: 90, 100: 25, 101: 60, 132: 35,
  46: 150, 47: 170, 48: 150, 83: 150, 87: 140, 88: 140, 89: 160, 90: 160,
  91: 160, 92: 90, 93: 70, 94: 300, 95: 220, 33: 30, 97: 30,
  428: 20, 486: 15, 619: 10, 601: 110, 602: 110, 603: 110, 353: 20, 378: 10, 347: 5,
};

const EMITTER_OUT_MUL: Record<number, number> = {
  80: 0.75, 81: 0.8, 84: 0.8, 102: 0.8, 85: 0.9, 86: 0.9, 630: 0.9,
};

export function emitterLuxAt1m(id: number | undefined): number {
  if (id === undefined) return EMITTER_DEFAULT_LUX;
  return EMITTER_LUX[id] ?? EMITTER_DEFAULT_LUX;
}

export function emitterOutMul(id: number | undefined): number {
  if (id === undefined) return 1;
  return EMITTER_OUT_MUL[id] ?? 1;
}

export interface AimHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
}

function faceLabel(nx: number, ny: number, nz: number): string {
  if (ny > 0.5) return "+Y";
  if (ny < -0.5) return "-Y";
  if (nx > 0.5) return "+X";
  if (nx < -0.5) return "-X";
  if (nz > 0.5) return "+Z";
  if (nz < -0.5) return "-Z";
  return "?";
}

function heldLux(s: GameState, subjDist: number): [number, number] {
  let total = 0, klux = 0;
  try {
    const d2 = Math.max(0.25, Math.min(subjDist, 12) ** 2);
    const held = [s.hotbar?.[s.slot] || 0, s.offhandItem || 0];
    for (const id of held) {
      const b = BLOCK_MAP.get(id);
      if (b && (b.glow || (b as { lightPower?: number }).lightPower)) {
        const h = Math.min(400, emitterLuxAt1m(id) / d2);
        total += h;
        klux += h * emitterKelvin(id);
      }
    }
  } catch {}
  return [total, klux];
}

function pointEmitterLux(
  s: GameState,
  px: number, py: number, pz: number,
  nx: number, ny: number, nz: number,
  escale = 1
): number {
  const emitters = (s as unknown as { emitters?: Map<string, { x: number; y: number; z: number; col: number; dist: number; power: number; id?: number }> }).emitters;
  if (!emitters) return 0;
  const found: number[] = [];
  for (const em of emitters.values()) {
    const dx = em.x - px, dy = em.y - py, dz = em.z - pz;
    if (Math.abs(dx) > 48 || Math.abs(dy) > 48 || Math.abs(dz) > 48) continue;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > 2304 || d2 < 0.01) continue;
    const d = Math.sqrt(d2);
    const facing = (dx * nx + dy * ny + dz * nz) / d;
    const w = 0.2 + 0.8 * Math.max(0, facing);
    const contrib = emitterFalloff(emitterLuxAt1m(em.id), d2) * w;
    if (contrib > 1) found.push(contrib);
  }
  found.sort((a, b) => b - a);
  let total = 0;
  for (let i = 0; i < Math.min(4, found.length); i++) total += found[i];
  return Math.min(EMITTER_MAX_TOTAL_LUX, total) * escale;
}

function emitterLuxTerm(
  s: GameState,
  fx: number, fy: number, fz: number,
  now: number,
  escale = 1
): number {
  if (now - (s.meterEmitterAt || 0) < 300 && (s.meterEmitterLux || 0) > 0) return s.meterEmitterLux;
  const emitters = (s as unknown as { emitters?: Map<string, { x: number; y: number; z: number; col: number; dist: number; power: number; id?: number }> }).emitters;
  const cam = s.camera;
  const px = cam ? cam.position.x : s.player.x;
  const py = cam ? cam.position.y : s.player.y + 1.62;
  const pz = cam ? cam.position.z : s.player.z;
  const found: [number, number][] = [];
  if (emitters) {
    for (const em of emitters.values()) {
      const dx = em.x - px, dy = em.y - py, dz = em.z - pz;
      if (Math.abs(dx) > 48 || Math.abs(dy) > 48 || Math.abs(dz) > 48) continue;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 2304 || d2 < 0.04) continue;
      const d = Math.sqrt(d2);
      const dot = (dx * fx + dy * fy + dz * fz) / d;
      if (dot < 0.5) continue;
      const w = smooth01((dot - 0.5) / 0.44);
      const contrib = emitterFalloff(emitterLuxAt1m(em.id), d2) * w;
      if (contrib > 1) found.push([contrib, emitterKelvin(em.id)]);
    }
  }
  found.sort((a, b) => b[0] - a[0]);
  let total = 0;
  let klux = 0;
  for (let i = 0; i < Math.min(4, found.length); i++) { total += found[i][0]; klux += found[i][0] * found[i][1]; }
  const aimD = s.meterBlockId > 0 && s.meterBlockDist > 0 ? s.meterBlockDist : 3;
  const [heldTotal, heldKlux] = heldLux(s, aimD);
  total += heldTotal;
  klux += heldKlux;
  total = Math.min(EMITTER_MAX_TOTAL_LUX, total) * escale;
  s.meterEmitterLux = total;
  s.meterEmitterKlux = klux;
  s.meterEmitterAt = now;
  return total;
}

function albedoForBlock(id: number): number {
  switch (id) {
    case 51:
    case 54:
      return 0.8;
    case 10:
    case 11:
      return 0.45;
    case 1:
      return 0.22;
    case 2:
    case 3:
    case 55:
      return 0.18;
    case 5:
    case 6:
      return 0.28;
    case 18:
    case 21:
    case 24:
      return 0.14;
    case 39:
    case 685:
      return 0.08;
    default:
      return 0.25;
  }
}

const atlasAlbedoCache = new Map<string, number>();

function faceAlbedo(id: number, ny: number, atlasTex: GameState["atlasTex"]): number {
  try {
    if (!atlasTex) return albedoForBlock(id);
    const key = id + ":" + (ny > 0.5 ? 1 : ny < -0.5 ? -1 : 0);
    const hit = atlasAlbedoCache.get(key);
    if (hit !== undefined) return hit;
    if (atlasAlbedoCache.size > 512) atlasAlbedoCache.clear();
    let v = albedoForBlock(id);
    try {
      const b = BLOCK_MAP.get(id) as unknown as { side?: number; top?: number } | undefined;
      const tile = ny > 0.5 ? (b?.top ?? b?.side ?? 0) : (b?.side ?? 0);
      const luma = sampleAtlasMeanLuma(atlasTex, tile);
      if (luma !== null && Number.isFinite(luma)) v = Math.max(0.03, Math.min(0.95, luma));
    } catch {}
    atlasAlbedoCache.set(key, v);
    return v;
  } catch {
    return albedoForBlock(id);
  }
}

function smooth01(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
}

type GetBlock = (x: number, y: number, z: number) => number;

function rayHit(gb: GetBlock, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxD: number): { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const stx = dx > 0 ? 1 : -1, sty = dy > 0 ? 1 : -1, stz = dz > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx !== 0 ? (stx > 0 ? (x + 1 - ox) : (ox - x)) * tdx : Infinity;
  let tmy = dy !== 0 ? (sty > 0 ? (y + 1 - oy) : (oy - y)) * tdy : Infinity;
  let tmz = dz !== 0 ? (stz > 0 ? (z + 1 - oz) : (oz - z)) * tdz : Infinity;
  let t = 0, nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < 160; i++) {
    if (tmx < tmy && tmx < tmz) { x += stx; t = tmx; tmx += tdx; nx = -stx; ny = 0; nz = 0; }
    else if (tmy < tmz) { y += sty; t = tmy; tmy += tdy; nx = 0; ny = -sty; nz = 0; }
    else { z += stz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -stz; }
    if (t > maxD) return null;
    try {
      const id = gb(x, y, z);
      if (id && isOpaque(id)) return { x, y, z, nx, ny, nz };
    } catch { return null; }
  }
  return null;
}

function skyOpen(gb: GetBlock, x: number, y: number, z: number): boolean {
  try {
    for (let yy = y + 1; yy < Math.min(y + 64, 128); yy++) {
      const id = gb(x, yy, z);
      if (id && isOpaque(id)) return false;
    }
  } catch { return true; }
  return true;
}

function lightVisible(gb: GetBlock, x: number, y: number, z: number, ldx: number, ldy: number, ldz: number, steps = 100): boolean {
  try {
    const fx = x + 0.5, fy = y + 0.5, fz = z + 0.5;
    for (let i = 1; i <= steps; i++) {
      const px = Math.floor(fx + ldx * 0.7 * i);
      const py = Math.floor(fy + ldy * 0.7 * i);
      const pz = Math.floor(fz + ldz * 0.7 * i);
      if (py >= 128) return true;
      if (py < 0) return false;
      const id = gb(px, py, pz);
      if (id && isOpaque(id)) return false;
    }
  } catch { return true; }
  return true;
}

function estimateViewLux(
  s: GameState,
  getBlock: ((x: number, y: number, z: number) => number) | undefined,
  now: number,
  aim?: AimHit | null
): number {
  const isNether = s.dimension !== "overworld";
  if (isNether) s.wbTargetK = 3500;
  const a = ((s.time - 6000) / 24000) * Math.PI * 2;
  const sunY = Math.cos(a);
  const sunUp = isNether ? 0 : Math.max(0, sunY);
  const moonUp = isNether ? 0 : Math.max(0, -sunY) * moonLitFrac(s);

  let wx = 1;
  const wt = s.weatherType;
  if (wt === "rain") wx = 0.5;
  else if (wt === "thunder") wx = 0.35;
  else if (wt === "snow") wx = 0.6;
  const cw = s.cloudWeather;
  if (cw === "overcast") wx *= 0.4;
  else if (cw === "cloudy") wx *= 0.7;

  // L0 remodel: iso-ettl uses physical-ish scale (sun ~100k, moon ~0.3 lux)
  // + face-orientation sky/bounce; legacy-sim keeps legacy numbers exactly.
  const iso = (s as unknown as { exposureModel?: string }).exposureModel === "iso-ettl";
  const escale = iso ? 1 / 40 : 1;
  const moonAlbK = iso ? 2.6 : 920;

  const dayAmb = isNether ? 90 : iso
    ? (300 + 14000 * Math.pow(sunUp, 1.2)) * wx
    : (40 + 1600 * Math.pow(sunUp, 1.2)) * wx;
  const nightAmb = iso
    ? (0.02 + 0.45 * moonUp) * (0.4 + 0.6 * wx)
    : (1 + 138 * moonUp) * (0.4 + 0.6 * wx);
  const amb = Math.max(dayAmb, nightAmb);

  const zenithSky = isNether ? 260 : iso
    ? (200 + 15000 * Math.pow(sunUp, 1.1)) * wx + nightAmb
    : (80 + 6000 * Math.pow(sunUp, 1.1)) * wx + nightAmb;
  const horizonSky = isNether ? 260 : iso
    ? (150 + 6000 * Math.pow(sunUp, 1.1)) * wx + nightAmb
    : (60 + 2200 * Math.pow(sunUp, 1.1)) * wx + nightAmb;

  let direct = isNether ? 0 : (iso ? 100000 : 9000) * sunUp;
  if (wt === "rain" || wt === "snow") direct *= 0.15;
  else if (wt === "thunder") direct *= 0.08;
  if (cw === "overcast") direct *= 0.05;
  else if (cw === "cloudy") direct *= 0.35;

  if (now - (s.meterAlbedoAt || 0) > 500) {
    s.meterAlbedoAt = now;
    try {
      const gb = getBlock;
      if (gb) {
        const id = gb(Math.floor(s.player.x), Math.floor(s.player.y) - 1, Math.floor(s.player.z));
        s.meterAlbedo = albedoForBlock(id || 0);
      }
    } catch {}
  }
  const albedo = s.meterAlbedo > 0 ? s.meterAlbedo : 0.25;

  const cam = s.camera;
  const yaw = cam ? cam.rotation.y : s.player.yaw;
  const pitch = cam ? cam.rotation.x : s.player.pitch;  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  const fx = -sy * cp, fz = -cy * cp;
  const rx = cy, rz = -sy;
  const ux = sy * sp, uy = cp, uz = cy * sp;
  const sl = Math.hypot(-Math.sin(a) * 0.96, sunY, Math.sin(a) * 0.28) || 1;
  const sdx = (-Math.sin(a) * 0.96) / sl;
  const sdy = sunY / sl;
  const sdz = (Math.sin(a) * 0.28) / sl;
  const eyeX = cam ? cam.position.x : s.player.x;
  const eyeY = cam ? cam.position.y : s.player.y + 1.62;
  const eyeZ = cam ? cam.position.z : s.player.z;
  const gb = getBlock;
  const eyeBX = Math.floor(eyeX), eyeBY = Math.floor(eyeY), eyeBZ = Math.floor(eyeZ);
  const sunVisEye = gb && sunUp > 0.02
    ? lightVisible(gb, eyeBX, eyeBY, eyeBZ, sdx, sdy, sdz, 250)
    : false;
  const moonVisEye = gb && !sunVisEye && moonUp > 0.05
    ? lightVisible(gb, eyeBX, eyeBY, eyeBZ, -sdx, -sdy, -sdz, 250)
    : false;

  const T = 0.364;
  const circle = [
    [fx, sp, fz],
    [fx + rx * T, sp, fz + rz * T],
    [fx - rx * T, sp, fz - rz * T],
    [fx + ux * T, sp + uy * T, fz + uz * T],
    [fx - ux * T, sp - uy * T, fz - uz * T],
  ];
  const T2 = 0.65, TC = 0.55;
  const frame = [
    [fx, sp, fz],
    [fx + rx * T2, sp, fz + rz * T2],
    [fx - rx * T2, sp, fz - rz * T2],
    [fx + ux * T2, sp + uy * T2, fz + uz * T2],
    [fx - ux * T2, sp - uy * T2, fz - uz * T2],
    [fx + (rx + ux) * TC, sp + uy * TC, fz + (rz + uz) * TC],
    [fx + (rx - ux) * TC, sp - uy * TC, fz + (rz - uz) * TC],
    [fx - (rx - ux) * TC, sp + uy * TC, fz - (rz - uz) * TC],
    [fx - (rx + ux) * TC, sp - uy * TC, fz - (rz + uz) * TC],
  ];
  const tapLux = (t: number[]): number => {
    const tl = Math.hypot(t[0], t[1], t[2]) || 1;
    const dx = t[0] / tl, dy = t[1] / tl, dz = t[2] / tl;
    let sunM = 1, skyM = 1, ambShare = 0.5, albHit = albedo, skyVis = 0.5;
    if (gb) {
      const hit = rayHit(gb, eyeX, eyeY, eyeZ, dx, dy, dz, 48);
      if (hit) {
        const sx = Math.floor(hit.x + 0.5 - dx * 1.2);
        const sy = Math.floor(hit.y + 0.5 - dy * 1.2);
        const sz = Math.floor(hit.z + 0.5 - dz * 1.2);
        const enclosed = !skyOpen(gb, sx, sy, sz);
        skyM = enclosed ? (iso ? 0.15 : 0.35) : 1;
        if (Math.abs(hit.ny) < 0.5) ambShare = 0.3;
        if (iso) {
          try { albHit = faceAlbedo(gb(hit.x, hit.y, hit.z) || 0, hit.ny, s.atlasTex); } catch {}
          skyVis = skyVisNy(hit.ny);
        }
        const hasDirect = sunUp > 0.02 || moonUp > 0.05;
        if (hasDirect) {
          const ldx = sunUp > 0.02 ? sdx : -sdx;
          const ldy = sunUp > 0.02 ? sdy : -sdy;
          const ldz = sunUp > 0.02 ? sdz : -sdz;
          const facing = faceDirectWeight(hit.nx, hit.ny, hit.nz, ldx, ldy, ldz);
          const floor = iso ? 0.02 : 0.12;
          if (!lightVisible(gb, sx, sy, sz, ldx, ldy, ldz)) sunM = floor;
          else if (facing < 0.35) sunM = Math.max(floor, facing);
        }
      }
    }
    const up = smooth01((dy + 0.15) / 0.7);
    const skyView = (horizonSky + (zenithSky - horizonSky) * up) * skyM;
    const gnd = iso
      ? amb * skyVis * skyM + amb * albHit * 0.6 * (1 - skyM)
        + (direct * albHit * 1.15 + moonUp * albHit * moonAlbK * wx) * sunM
      : amb * ambShare + (direct * albedo * 1.15 + moonUp * albedo * 920 * wx) * sunM;
    let glare = 0;
    if (sunVisEye) {
      const dot = dx * sdx + dy * sdy + dz * sdz;
      if (dot > 0) glare = Math.pow(dot, 600) * 4100000 * wx;
    } else if (moonVisEye) {
      const mDot = -(dx * sdx + dy * sdy + dz * sdz);
      if (mDot > 0) glare = Math.pow(mDot, 700) * 6000 * (0.3 + 0.7 * Math.min(1, moonUp)) * wx;
    }
    return gnd + (skyView - gnd) * up + glare;
  };
  // Active surface: the engine-selected block + face under the crosshair.
  const aimSurf = aim && gb ? aim : null;
  const surfaceLux = (): number | null => {
    if (!aimSurf || !gb) return null;
    const cam0 = s.camera;
    const ex0 = cam0 ? cam0.position.x : s.player.x;
    const ey0 = cam0 ? cam0.position.y : s.player.y + 1.62;
    const ez0 = cam0 ? cam0.position.z : s.player.z;
    const aimD = Math.hypot(aimSurf.x + 0.5 - ex0, aimSurf.y + 0.5 - ey0, aimSurf.z + 0.5 - ez0);
    const noFace = !aimSurf.nx && !aimSurf.ny && !aimSurf.nz;
    s.meterBlockId = aimSurf.id || 0;
    s.meterBlockFace = faceLabel(aimSurf.nx, aimSurf.ny, aimSurf.nz);
    s.meterBlockDist = aimD;
    if (noFace || aimD < 0.4) return null;
    if (!isOpaque(aimSurf.id || 0) && aimD >= 3) return null;
    const alb = iso ? faceAlbedo(aimSurf.id || 0, aimSurf.ny, s.atlasTex) : albedoForBlock(aimSurf.id || 0);
    const px = aimSurf.x + 0.5, py = aimSurf.y + 0.5, pz = aimSurf.z + 0.5;
    const ox = Math.floor(px + aimSurf.nx * 0.6);
    const oy = Math.floor(py + aimSurf.ny * 0.6);
    const oz = Math.floor(pz + aimSurf.nz * 0.6);
    const hasDirect = sunUp > 0.02 || moonUp > 0.05;
    let sunM = 1;
    if (hasDirect) {
      const ldx = sunUp > 0.02 ? sdx : -sdx;
      const ldy = sunUp > 0.02 ? sdy : -sdy;
      const ldz = sunUp > 0.02 ? sdz : -sdz;
      const facing = faceDirectWeight(aimSurf.nx, aimSurf.ny, aimSurf.nz, ldx, ldy, ldz);
      const floor = iso ? 0.02 : 0.12;
      if (!lightVisible(gb, ox, oy, oz, ldx, ldy, ldz)) sunM = floor;
      else sunM = Math.max(floor, facing);
    }
    const share = Math.abs(aimSurf.ny) > 0.5 ? (aimSurf.ny > 0 ? 0.5 : 0.2) : 0.3;
    const enclosed = !skyOpen(gb, ox, oy, oz);
    const emit = pointEmitterLux(s, px, py, pz, aimSurf.nx, aimSurf.ny, aimSurf.nz, escale);
    if (!iso) {
      const ambPart = amb * share * (enclosed ? 0.25 : 1);
      return ambPart + (direct * alb * 1.15 + moonUp * alb * 920 * wx) * sunM + emit;
    }
    const skyVisN = skyVisNy(aimSurf.ny);
    const ambPart = amb * skyVisN * (enclosed ? 0.15 : 1) + amb * alb * 0.6 * (enclosed ? 1 : 0.15);
    return ambPart + (direct * alb * 1.15 + moonUp * alb * moonAlbK * wx) * sunM + emit;
  };
  const mode: MeteringMode = s.metering || "matrix";
  let sceneLux: number;
  const surf = surfaceLux();
  if (surf === null && !aimSurf) {
    s.meterBlockId = 0;
    s.meterBlockFace = "-";
    s.meterBlockDist = 0;
  }
  if (mode === "spot") {
    sceneLux = surf ?? tapLux(circle[0]);
    s.meterPeakLux = sceneLux;
  } else if (mode === "center") {
    const base = surf ?? tapLux(circle[0]);
    let sacc = 0;
    for (let i = 1; i < 5; i++) sacc += Math.log(Math.max(1, tapLux(circle[i])));
    const surr = Math.exp(sacc / 4);
    sceneLux = Math.exp(0.6 * Math.log(Math.max(1, base)) + 0.4 * Math.log(Math.max(1, surr)));
    s.meterPeakLux = sceneLux;
  } else {
    const vals = frame.map(tapLux);
    vals[0] = surf ?? vals[0];
    let acc = Math.log(Math.max(1, vals[0]));
    for (let i = 0; i < vals.length; i++) acc += Math.log(Math.max(1, vals[i]));
    const mean = Math.exp(acc / (vals.length + 1));
    let peak = vals[0];
    for (const v of vals) if (v > peak) peak = v;
    const center = Math.max(1, vals[0]);
    const w = smooth01((Math.log(Math.max(1, peak)) - Math.log(center) - Math.LN2) / Math.LN2);
    const blended = Math.exp((1 - w) * Math.log(mean) + w * Math.log(center));
    sceneLux = Math.min(blended, peak / 4);
    s.meterPeakLux = peak;
  }
  // P1 TTL fusion (iso-ettl only; legacy-sim stays bit-identical): the meter
  // RT measures the real view, so correct the analytic estimate by the
  // imaged distribution. Authority clamped to +-2 stops; the analytic model
  // keeps the absolute (incident-light analog). Matrix goes zonal in P2.
  if ((s as unknown as { exposureModel?: string }).exposureModel === "iso-ettl"
    && s.ttlReady && s.ttlFrameMean > 1e-4 && mode !== "matrix") {
    const zoneLin = mode === "spot" ? ttlSpotLin(s) : ttlCenterLin(s);
    const ratio = Math.max(0.25, Math.min(4, zoneLin / s.ttlFrameMean));
    sceneLux *= ratio;
    s.meterPeakLux = sceneLux;
  }
  // L0 HDR zone sweep (iso-ettl only, <=4 Hz): 63 analytic rays over the view
  // frustum give per-zone scene luminance with no 1.0 clip (unlike the LDR
  // meter RT). Feeds the window clip counter + P2 zonal matrix.
  if (iso && gb && now - (s.ttlZoneAt || 0) > 250) {
    s.ttlZoneAt = now;
    if (!s.ttlZoneLux || s.ttlZoneLux.length !== 63) s.ttlZoneLux = new Array(63).fill(1);
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 9; gx++) {
        const ox = ((gx - 4) / 4) * 0.9, oy = ((3 - gy) / 3) * 0.7;
        try {
          s.ttlZoneLux[gy * 9 + gx] = tapLux([
            fx + rx * ox + ux * oy,
            sp + uy * oy,
            fz + rz * ox + uz * oy,
          ]);
        } catch {
          s.ttlZoneLux[gy * 9 + gx] = 1;
        }
      }
    }
  }
  let lux = sceneLux;
  s.meterSceneLux = lux;
  lux += emitterLuxTerm(s, fx, sp, fz, now, escale);
  const dayLux = Math.max(0, dayAmb + direct * albedo);
  const moonLux = Math.max(0, nightAmb + moonUp * albedo * moonAlbK * wx * 0.5);
  const dayK = cw === "overcast" ? 7500 : 3200 + 3300 * Math.pow(Math.max(0, sunUp), 0.5);
  const emitLux = s.meterEmitterLux || 0;
  const emitK = emitLux > 0.5 ? (s.meterEmitterKlux || 0) / emitLux : 6500;
  const wSum = dayLux + moonLux + emitLux;
  s.wbTargetK = wSum > 0.5
    ? (dayLux * dayK + moonLux * 7500 + emitLux * emitK) / wSum
    : 6500;
  return Math.max(1, Math.min(5000000, lux));
}

export function stepLightMeter(
  s: GameState,
  dt: number,
  now: number,
  getBlock?: (x: number, y: number, z: number) => number,
  aim?: AimHit | null
): void {
  const evIdx = evTableIdx(s.ev || 12);
  const target = estimateViewLux(s, getBlock, now, aim) + (s.lastFlashEnv || 0) * 6000;
  const adaptS = MODE_ADAPT_SECONDS[s.metering || "matrix"] ?? ADAPT_SECONDS;
  const k = Math.min(1, Math.max(0, dt) / adaptS);
  const cur = s.meterLux > 0 ? s.meterLux : target;
  s.meterLux = cur + (target - cur) * k;
  const model: ExposureModel = (s as unknown as { exposureModel?: ExposureModel }).exposureModel || "legacy-sim";
  const emitterRaw = s.dimension === "nether" ? 0 : (s.meterEmitterLux || 0);
  const ambient = Math.max(1, target - (s.dimension === "nether" ? 0 : emitterRaw));
  let progLux: number;
  let refLux: number;
  let liftStops = 0;
  if (model === "iso-ettl") {
    progLux = ambient + Math.min(emitterRaw, EMITTER_MAX_TOTAL_LUX);
    refLux = ISO_REF_LUX * Math.pow(2, ISO_PROGRAM_EV);
  } else {
    const effective = ambient + Math.min(emitterRaw, EMITTER_MAX_TOTAL_LUX) * EMITTER_EXPOSURE_EMPHASIS;
    const nightness = 1 - smooth01(effective / 300);
    liftStops = 0.3 * nightness;
    progLux = effective / Math.pow(2, liftStops);
    refLux = METER_REF_LUX;
  }
  const curE = s.meterExp > 0 ? s.meterExp : progLux;
  s.meterExp = curE + (progLux - curE) * k;
  const comp = s.evComp || 0;
  const lo = Math.pow(2, -GAIN_DOWN_HALF_STOPS[evIdx]);
  const hi = Math.pow(2, GAIN_UP_HALF_STOPS[evIdx]);
  // Program Auto on the user's calibration: EV100 = log2(Lux*100/785), stops
  // relative to the (f/2.8, 1/50, ISO100) reference point. Shutter holds 1/50
  // while the iris travels f/2.0..f/8, then the shutter runs to 1/8000; below
  // f/2.0 the shutter drops to the 1/30 floor, then ISO climbs. Compensation
  // shifts the need directly (white-pillow rows prove the shift is exact).
  // METER_REF_LUX anchors the grade 4.7 stops under the meter-neutral point,
  // so comp 0 renders the requested dark-cinematic base look.
  // ISO-ETTL model: refLux = 2.5 * 2^8.61 (C=250 incident anchor, program ref
  // EV 8.61 = log2(2.8^2/(1/50))); emitters at 1x, no night lift. See
  // kb/mechanics/ettl-iso2721.md.
  const R = Math.log2(Math.max(1, s.meterExp) / refLux) - comp;
  const Av = Math.max(-1, Math.min(3, R));
  const rem = R - Av;
  const Tv = Math.max(-0.74, Math.min(7.4, rem));
  const Sv = Av + Tv - R;
  // Shockless gain: the RENDER gain runs on the continuous (unsnapped)
  // program so threshold crossings glide instead of stepping 1/3 stop.
  // Snapped values below are display-only (like a real top LCD).
  const Nc = METER_APERTURE * Math.pow(2, Av / 2);
  const tc = METER_SHUTTER / Math.pow(2, Tv);
  const Sc = Math.min(100 * Math.pow(2, Sv), hi * 100 * Math.pow(2, liftStops));
  const progRef = (METER_APERTURE * METER_APERTURE) / METER_SHUTTER;
  const gain = Math.max(lo, Math.min(hi * 8, (Sc / 100) * (progRef / ((Nc * Nc) / tc))));
  let N = METER_APERTURE, t = METER_SHUTTER, S: number;
  N = snapNearest(Nc, F_STOPS);
  t = snapNearest(tc, SHUTTERS);
  S = Math.min(gainToISO(Sc / 100), hi * 100 * 8);
  s.meterN = N;
  s.meterT = t;
  s.meterISO = S;
  s.meterGain = gain;
  const r = s.renderer;
  if (r) r.toneMappingExposure = gain;
}
